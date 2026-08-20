import { PAGINAS, type Pagina } from '../components/OnderNavigatie'
import { DOSSIER_SOORTEN, type DossierSoort } from './dossiersoort'

// Waar sta ik, en hoe kom ik terug? (ronde 59)
//
// ⚠ WAT ER VÓÓR DEZE RONDE MISTE, en waarom het meer is dan een gemak. De pagina
// zat in gewone React-state en nergens in het adres. Vier dingen waren daardoor
// stuk, en ze horen allemaal bij "dit voelt als een app":
//
//  1. **De terugknop van Android sloot de app.** Er was geen enkele stap om naar
//     terug te gaan, dus de eerste druk op terug verliet Kompal. Op een telefoon is
//     dat dé manier om een scherm te verlaten; je moet het niet afleren.
//  2. **Herladen bracht je altijd op het begin.** Ook na een publicatie, ook na een
//     hapering — precies de momenten waarop je net iets aan het doen was.
//  3. **Niets was te bewaren of door te sturen.** Geen bladwijzer naar Dossiers,
//     geen snelkoppeling op je beginscherm naar één pagina.
//  4. **Een popup en de terugknop vochten om hetzelfde gebaar.** Zie `ui/Dialoog.tsx`.
//
// ⚠ WAAROM MET EEN HEKJE (`#/budget`) EN NIET MET EEN GEWOON PAD (`/budget`).
// De app draait op GitHub Pages, en dat is een gewone bestandsserver: vraag je
// `/budget` op, dan zoekt hij een map die er niet is en geeft hij een 404. Een
// echt pad vereist serverinstellingen die we daar niet hebben. Alles na het hekje
// gaat nooit naar de server, dus dit werkt overal — ook wanneer je de app als
// bestand opent.
//
// ⚠ WAT ER BEWUST NIET IN HET ADRES STAAT: geen bedragen, geen namen, geen
// dossier-id's. Een adres komt in de geschiedenis van de browser, in een
// gedeelde link en soms in een screenshot. Wat er wél in staat, is waar je stond —
// en dat is geen persoonsgegeven.

/** De actie die een adres kan meedragen. Vandaag maar één, bewust. */
export type Routeactie = 'nieuw'

export type Route = {
  pagina: Pagina
  /** Alleen zinvol op de Dossiers-pagina. */
  subtab?: DossierSoort
  /**
   * Iets wat meteen moet opengaan. `nieuw` op Transacties opent de boekingspopup;
   * dat is wat de snelkoppeling "Uitgave toevoegen" op je beginscherm gebruikt.
   */
  actie?: Routeactie
}

const GELDIGE_PAGINAS = new Set<string>(PAGINAS.map((p) => p.id))
const GELDIGE_SUBTABS = new Set<string>(DOSSIER_SOORTEN)

/**
 * Een adres omzetten naar een route, of `null` wanneer het er geen is.
 *
 * Streng, en dat is met opzet: alles wat niet exact een bekende pagina is, geeft
 * `null` en dan valt de app terug op haar gewone startgedrag. Een half herkende
 * route zou je op een pagina zetten die niet bestaat.
 */
export function hashNaarRoute(hash: string): Route | null {
  const kaal = hash.replace(/^#\/?/, '')
  if (kaal === '') return null
  const delen = kaal.split('/').filter((d) => d !== '')
  const pagina = delen[0]
  if (!pagina || !GELDIGE_PAGINAS.has(pagina)) return null
  const route: Route = { pagina: pagina as Pagina }
  const tweede = delen[1]
  if (tweede !== undefined) {
    if (pagina === 'dossiers' && GELDIGE_SUBTABS.has(tweede)) route.subtab = tweede as DossierSoort
    else if (pagina === 'transacties' && tweede === 'nieuw') route.actie = 'nieuw'
    // Een tweede deel dat we niet kennen, negeren we. De pagina zelf klopt, en dat
    // is het enige wat telt; een onbekende subtab is geen reden om iemand op het
    // Overzicht te zetten.
  }
  return route
}

/** Een route omzetten naar het adres dat erbij hoort. */
export function routeNaarHash(route: Route): string {
  if (route.pagina === 'dossiers' && route.subtab) return `#/dossiers/${route.subtab}`
  if (route.pagina === 'transacties' && route.actie === 'nieuw') return '#/transacties/nieuw'
  return `#/${route.pagina}`
}

/** Wijzen twee routes naar dezelfde plek? */
export function zelfdeRoute(a: Route | null, b: Route | null): boolean {
  if (a === null || b === null) return a === b
  return routeNaarHash(a) === routeNaarHash(b)
}

/** De route die nu in het adres staat, of `null`. */
export function huidigeRoute(): Route | null {
  if (typeof window === 'undefined') return null
  return hashNaarRoute(window.location.hash)
}

/**
 * De route in het adres zetten.
 *
 * `vervang` gebruik je voor iets wat GEEN stap in de geschiedenis verdient: de
 * eerste keer dat de app haar startpagina kiest, of een subtab die je binnen
 * dezelfde pagina omzet. Zonder dat onderscheid moet je vijf keer op terug drukken
 * om één pagina terug te gaan, en dat is precies de klacht die deze ronde oplost.
 */
export function zetRoute(route: Route, vervang = false): void {
  if (typeof window === 'undefined') return
  const doel = routeNaarHash(route)
  // Ligt er nog een EXTRA STAP bovenop (zie `zetExtraStap`), dan gebruiken we die
  // in plaats van er nog een bij te zetten. Zo groeit de geschiedenis niet met een
  // stap per popup die je opent.
  if (!vervang && heeftExtraStap()) {
    window.history.replaceState({ kompal: doel }, '', doel)
    return
  }
  // Niets doen wanneer we er al staan. Anders levert elke hertekening een extra
  // stap op en werkt de terugknop niet meer.
  if (!vervang && window.location.hash === doel) return
  // ⚠ De popup-stempel NIET meekopiëren (nakijkronde ronde 59). Staat er een popup
  // open, dan draagt de huidige stap `kompalPopup`. Namen we die mee naar deze
  // nieuwe paginastap, dan zou de popup bij het sluiten dénken dat die stap van
  // háár is en hem weghalen — en dan draait de app je navigatie meteen weer terug.
  const { kompalPopup: _weg, ...rest } = (window.history.state ?? {}) as { kompalPopup?: number }
  void _weg
  const stand = { ...rest, kompal: doel }
  if (vervang) window.history.replaceState(stand, '', doel)
  else window.history.pushState(stand, '', doel)
}

/**
 * Luisteren naar de terugknop. Geeft de opzegfunctie terug.
 *
 * Ook `hashchange`, want niet elke manier om van adres te veranderen geeft een
 * `popstate`: typ je zelf een ander hekje in de adresbalk, dan komt alleen
 * `hashchange` langs.
 */
export function volgRoute(luisteraar: (route: Route | null) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const opWissel = () => luisteraar(huidigeRoute())
  window.addEventListener('popstate', opWissel)
  window.addEventListener('hashchange', opWissel)
  return () => {
    window.removeEventListener('popstate', opWissel)
    window.removeEventListener('hashchange', opWissel)
  }
}

// ---------------------------------------------------------------------------
// DE EXTRA STAP VOOR EEN OPEN POPUP (nakijkronde ronde 59)
//
// ⚠ WAT DE METING IN DE BROWSER LIET ZIEN, en wat geen enkele test in jsdom kon
// vangen: open je een popup meteen na het starten van de app en druk je dan op
// terug, dan is er niets om terug te gaan — en dan VERLAAT DE BROWSER DE APP, met
// je halve boeking erin. Precies de pijn die ronde 55 wegnam, langs een andere weg
// terug binnen. Het gebeurt in het meest gewone geval dat er is: app openen, ➕
// tikken, terug drukken. En met de snelkoppeling op het beginscherm land je zelfs
// meteen in dat formulier.
//
// De oplossing is één extra stap in de geschiedenis zodra er een popup opengaat.
// Terug heeft dan altijd iets om op te landen; de app sluit de popup en blijft
// staan.
//
// ⚠ WAAROM DIE STAP NIET WEER WEGGEHAALD WORDT bij het sluiten, wat de eerste
// opzet wél deed. `history.back()` is ASYNCHROON: valt er ondertussen een navigatie
// tussen, dan haalt die terugsprong de verkeerde stap weg. Gemeten gevolg: één test
// op de tien viel om, zonder dat er iets veranderd was. Dat is precies het soort
// fout dat een bouwstraat onbetrouwbaar maakt.
//
// De prijs die we daarvoor betalen, eerlijk gezegd: sluit je een popup met het
// kruisje en druk je dán op terug, dan gebeurt er één keer niets zichtbaars. Er ligt
// hooguit ÉÉN zo'n stap tegelijk — de volgende popup hergebruikt hem, en de eerste
// echte navigatie ook (zie `zetRoute` hierboven).

/** Ligt er een extra stap bovenop? */
function heeftExtraStap(): boolean {
  if (typeof window === 'undefined') return false
  return (window.history.state as { kompalExtra?: boolean } | null)?.kompalExtra === true
}

/**
 * Zorgt dat er een stap is die een druk op terug kan opvangen.
 *
 * Doet niets wanneer er al zo'n stap ligt. De stap wijst naar dezelfde plek, dus er
 * verandert niets aan het adres of aan wat je ziet.
 */
export function zetExtraStap(): void {
  if (typeof window === 'undefined' || !window.history) return
  if (heeftExtraStap()) return
  window.history.pushState({ ...(window.history.state ?? {}), kompalExtra: true }, '', window.location.hash || undefined)
}
