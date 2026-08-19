import type { Vertaler } from '../i18n'

// Wat er gebeurt wanneer de app opnieuw gepubliceerd wordt terwijl jij ze open hebt
// staan (ronde 56).
//
// HET PROBLEEM, en het is echt gebeurd. De app wordt in stukken gebouwd. Het
// grootste stuk — de PDF-bibliotheek, 390 kB — wordt pas opgehaald op het moment dat
// je een document maakt. Elk stuk draagt een code in zijn naam
// (`jspdf.es.min-CxnS4d52.js`), en die code verandert bij elke publicatie.
//
// Zolang de OUDE service worker de baas is, komt dat stuk gewoon uit de cache en merk
// je niets. Maar zodra de nieuwe het overneemt, gooit hij de oude bestanden weg — en
// vanaf dat moment vraagt jouw scherm, dat nog de oude code draait, een bestand op dat
// nergens meer bestaat. In ronde 55 gebeurde dat met de barcodescanner en kreeg
// Timothy een foutscherm plus een crashmail. Bij een PDF was het stiller en erger: de
// app ving de fout netjes op en zei "kon niet gemaakt worden, probeer het opnieuw" —
// een raad die tot in de eeuwigheid hetzelfde verdwenen bestand ophaalt.
//
// ⚠ WAT DIT BESTAND BEWUST NIET DOET, en dat is de les van de nakijkronde:
//
//  - **Het raadt niet WAAROM het misging.** De eerste versie las de foutmelding van de
//    browser om "de app is bijgewerkt" van "je hebt een hapering" te onderscheiden.
//    Dat kan niet: elke browser schrijft het anders op, er zijn zeker vijf vormen
//    (waaronder een MIME-fout wanneer de server een 404-pagina teruggeeft), en zeggen
//    "de app is bijgewerkt" terwijl je gewoon door een tunnel reed, is een bewering
//    die de app niet kan waarmaken. Nu zegt ze wat ze wél weet: dit stuk is niet
//    geladen, en herladen helpt — in allebei de gevallen.
//  - **Het probeert niet stiekem opnieuw.** Een mislukte import blijft in de browser
//    als mislukt genoteerd, dus een tweede poging levert dezelfde fout op zonder ook
//    maar één nieuw verzoek. Gemeten kostte die herkansing alleen tijd: 304 ms in
//    plaats van 150.
//  - **Het herlaadt niet uit zichzelf.** Een pagina die uit zichzelf herlaadt terwijl
//    je een boeking zit in te tikken, gooit precies weg wat ronde 55 net beschermd
//    heeft. Jij drukt.

/**
 * De fout die zegt: dit stuk van de app is niet geladen.
 *
 * `soort` maakt het enige onderscheid dat de app ECHT kan maken. Zegt de browser dat
 * je offline bent, dan is dat zeker en is wachten de juiste raad. In alle andere
 * gevallen weten we alleen dat het niet lukte — en dan is herladen de juiste raad,
 * of er nu gepubliceerd is of niet.
 */
export class ModuleNietGeladen extends Error {
  readonly soort: 'offline' | 'onbekend'
  /** De oorspronkelijke fout, voor wie ze in de console wil naslaan. */
  readonly oorzaak: unknown

  constructor(soort: 'offline' | 'onbekend', oorzaak: unknown) {
    super(soort === 'offline' ? 'Onderdeel niet geladen: geen verbinding' : 'Onderdeel niet geladen')
    this.name = 'ModuleNietGeladen'
    this.soort = soort
    this.oorzaak = oorzaak
  }
}

/** Is dit de fout van een onderdeel dat niet geladen raakte? */
export function isModuleFout(e: unknown): e is ModuleNietGeladen {
  return e instanceof ModuleNietGeladen
}

/**
 * Laadt een onderdeel van de app dat pas bij gebruik opgehaald wordt.
 *
 * ELKE mislukking telt hier als "niet geladen", en dat is met opzet. Deze functie
 * omhult uitsluitend het OPHALEN van een module — niet het gebruik ervan — dus een
 * echte fout in de PDF-code of in jouw gegevens komt hier nooit langs. Wat er wél
 * langskomt, is een verzoek dat niet aankwam, en daarvoor bestaat maar één goede
 * raad. Zinnen van browsers proberen te herkennen leverde alleen gaten op.
 */
export async function laadOnderdeel<T>(laden: () => Promise<T>): Promise<T> {
  try {
    return await laden()
  } catch (fout) {
    // `navigator.onLine` is niet waterdicht — hij zegt "ja" op een wifi zonder
    // internet — maar hij zegt wél betrouwbaar NEE. Dat is de kant die we nodig
    // hebben: staat hij op nee, dan is "je bent offline" zeker het betere antwoord.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    throw new ModuleNietGeladen(offline ? 'offline' : 'onbekend', fout)
  }
}

/**
 * De juiste zin bij een mislukte export.
 *
 * Vijf plaatsen in de app maken een PDF, en alle vijf zeiden bij een mislukking
 * "probeer het opnieuw". Dat is goede raad bij een hapering in de opmaak, maar het is
 * de VERKEERDE raad wanneer het onderdeel zelf niet geladen raakte: opnieuw duwen
 * verandert daar niets. Vandaar deze ene functie in plaats van vijf keer dezelfde
 * `if` — er komt vast nog een zesde document, en dan hoort het vanzelf te kloppen.
 *
 * De CSV-uitvoer van het fiscaal overzicht gebruikt haar ook. Die laadt niets bij, dus
 * ze krijgt altijd de gewone zin terug; het staat er zodat niemand later hoeft uit te
 * zoeken waarom die ene knop het anders doet.
 */
export function exportFoutmelding(t: Vertaler, fout: unknown, standaard: string): string {
  if (!isModuleFout(fout)) return standaard
  return fout.soort === 'offline'
    ? t('Dit onderdeel kon niet geladen worden omdat je geen verbinding hebt. Probeer het opnieuw zodra je weer online bent.')
    : t('Dit onderdeel kon niet geladen worden. Herlaad de pagina en probeer het opnieuw.')
}

// ---------------------------------------------------------------------------
// "Er staat een nieuwe versie klaar"
//
// ⚠ Alleen de SERVICE WORKER mag dit beweren. Een mislukte import zette dit vroeger
// ook aan, en dat was een bewering die de app niet kon waarmaken: één hapering in een
// lift leverde een balk op die zei dat de app bijgewerkt was, en die bleef staan tot
// je herlaadde. De mislukte import zegt nu alleen iets over die ene poging.
// ---------------------------------------------------------------------------

let nieuweVersie = false
const luisteraars = new Set<() => void>()

/** Staat er een nieuwe versie klaar die pas na een herlaadbeurt gebruikt wordt? */
export function isNieuweVersieKlaar(): boolean {
  return nieuweVersie
}

/** Meldt dat er een nieuwe versie klaarstaat. Twee keer melden verandert niets. */
export function meldNieuweVersie(): void {
  if (nieuweVersie) return
  nieuweVersie = true
  for (const l of [...luisteraars]) l()
}

/** Luistert mee. Geeft de opzegfunctie terug. */
export function volgNieuweVersie(luisteraar: () => void): () => void {
  luisteraars.add(luisteraar)
  return () => {
    luisteraars.delete(luisteraar)
  }
}

/** Alleen voor tests: alles terug op nul. */
export function vergeetNieuweVersie(): void {
  nieuweVersie = false
  luisteraars.clear()
}

/** Hoe lang we minstens wachten voor we de service worker opnieuw laten kijken. */
export const CONTROLE_PAUZE_MS = 15 * 60 * 1000

/**
 * Luistert naar de service worker, en vraagt hem af en toe om te gaan kijken.
 *
 * `controllerchange` is het moment waarop een NIEUWE service worker het overneemt van
 * de oude. De bouwinstelling van deze app (`registerType: 'autoUpdate'`, met
 * `skipWaiting` en `clientsClaim`) laat dat vanzelf gebeuren zodra hij een nieuwe
 * versie gevonden heeft — en op datzelfde moment gooit hij de oude bestanden weg.
 * Vanaf dan draait jouw scherm code die niet meer bij de rest past.
 *
 * ⚠ MAAR HIJ GAAT NIET UIT ZICHZELF KIJKEN. Een tabblad dat uren openstaat, krijgt die
 * melding nooit — en dat is net het geval waarvoor deze balk bedoeld is. Vandaar de
 * tweede helft: telkens wanneer je naar de app terugkeert (`visibilitychange`), vragen
 * we de service worker om te controleren. Hooguit één keer per kwartier, want dit is
 * een verzoek naar de server en van tabblad wisselen doe je vaak.
 *
 * Geeft een opzegfunctie terug, en doet niets in een omgeving zonder service worker
 * (de testomgeving, of een browser die ze niet ondersteunt).
 */
export function volgServiceWorker(nu: () => number = () => Date.now()): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}
  const sw = navigator.serviceWorker
  // Bij het ALLEREERSTE bezoek neemt de service worker ook het roer over, en dan is er
  // niets bijgewerkt: er was gewoon nog niets. Daarom kijken we of er al een baas was.
  const hadAlEenBaas = sw.controller !== null
  let laatsteControle = nu()

  function opWissel() {
    if (hadAlEenBaas) meldNieuweVersie()
  }

  function opZichtbaar() {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
    if (nu() - laatsteControle < CONTROLE_PAUZE_MS) return
    laatsteControle = nu()
    // Stil: lukt het niet, dan verandert er niets en merkt de gebruiker het pas
    // wanneer een onderdeel niet geladen raakt.
    try {
      void sw.getRegistration?.().then((r) => r?.update()).catch(() => {})
    } catch {
      // Een browser die dit niet kent, laat de rest gewoon werken.
    }
  }

  sw.addEventListener('controllerchange', opWissel)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', opZichtbaar)
  return () => {
    sw.removeEventListener('controllerchange', opWissel)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', opZichtbaar)
  }
}

/** Herlaadt de pagina. Apart, zodat een test hem kan vervangen. */
export function herlaadApp(): void {
  window.location.reload()
}
