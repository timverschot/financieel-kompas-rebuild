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

/**
 * Alleen voor tests: alles terug op nul.
 *
 * ⚠ ZE ZET OOK DE VERSIEWACHT AF (doorlichting ronde 99). Roep haar dus niet aan vanuit
 * app-code — bijvoorbeeld vanuit "Begin opnieuw", waar ze op het eerste gezicht past. De
 * balk zou daarna dood zijn zolang ze gekoppeld blijft: `main.tsx` roept
 * `startVersiewacht()` maar één keer aan. (Sinds deze ronde start de balk hem óók zelf bij
 * elke mount, als vangnet — maar ze hermount niet vanzelf, dus dat redt je niet.)
 */
export function vergeetNieuweVersie(): void {
  nieuweVersie = false
  luisteraars.clear()
  stopWacht?.()
  stopWacht = null
}

let stopWacht: (() => void) | null = null

/**
 * Begin te wachten op een nieuwe versie. Twee keer starten doet niets extra.
 *
 * ⚠ RONDE 99 — DIT MOET BIJ HET OPSTARTEN GEBEUREN, NIET WANNEER DE BALK GETEKEND WORDT.
 *
 * Tot deze ronde riep `NieuweVersieBalk` `volgServiceWorker()` aan in haar eigen effect.
 * Dat is te laat: `registerSW.js` registreert zich op `window.load`, dus op het moment dat dat
 * effect draait bestaat de registratie vaak nog niet — en dan komt de app nooit bij
 * `registration.waiting`/`.installing`, terwijl daar juist de nieuwe versie klaarstaat.
 * `main.tsx` roept dit nu aan vóór het renderen; de balk luistert alleen nog mee.
 *
 * ⚠ De verklaring "bij een F5 heeft de service worker het roer al overgenomen vóór React iets
 * tekende" stond hier eerst als feit. Ze is NIET reproduceerbaar gebleken — zie de eerlijke
 * vaststelling verderop in dit bestand. De reden hierboven is wél nagemeten.
 */
export function startVersiewacht(nu?: () => number): void {
  if (stopWacht) return
  stopWacht = volgServiceWorker(nu)
}

/** Hoe lang we minstens wachten voor we de service worker opnieuw laten kijken. */
export const CONTROLE_PAUZE_MS = 15 * 60 * 1000

/**
 * Van wanneer deze versie is — opgehaald uit `versie.json`.
 *
 * ⚠ Het is de datum van de laatste COMMIT, niet van de build (zie `vite.config.ts`). Met
 * een bouwtijd verschilde het bestand bij elke build, verschilde de service worker mee, en
 * riep de app "er is een nieuwe versie" na een CI-run die niets veranderde. Een commit is
 * bovendien het antwoord waar je iets aan hebt: je kan ernaar wijzen in je geschiedenis.
 *
 * ⚠ WAAROM EEN BESTAND EN GEEN `define` (doorlichting ronde 99). Een `define` vervangt de
 * naam letterlijk in de code, dus de bouwtijd belandde in het JS-brok — en dan kreeg élk
 * bestand bij élke build een andere naam, ook bij een build van byte-identieke broncode.
 * Gemeten. Daarmee verloor iedereen die de app open had staan het PDF-brok van 390 kB bij
 * elke publicatie, en dat is precies wat ronde 56 kwam voorkomen. Een versieregel mag geen
 * publicatie duurder maken dan ze is.
 *
 * ⚠ HET BESTAND KOMT UIT DE CACHE VAN DE SERVICE WORKER, en dat MOET zo. Leest de app het
 * rechtstreeks van de server, dan zegt de kaart "gebouwd op <vandaag>" terwijl je scherm
 * nog de app van gisteren draait — precies het misverstand dat deze ronde wegneemt.
 * Vandaar `json` in `globPatterns` (vite.config.ts) en bewust GEEN `cache: 'no-store'`:
 * dat laatste zou de cache overslaan en het verkeerde antwoord geven.
 *
 * Geeft `null` terug wanneer het bestand er niet is of niet te lezen valt — in de
 * ontwikkelserver (daar draait de bouwstap niet), in de testomgeving, en offline vóór de
 * eerste cache. De kaart in Instellingen blijft dan gewoon weg. Liever niets dan een
 * verzonnen datum.
 */
export async function haalBouwdatum(ophalen: typeof fetch = fetch): Promise<string | null> {
  try {
    const antwoord = await ophalen('./versie.json')
    if (!antwoord.ok) return null
    const inhoud: unknown = await antwoord.json()
    const gebouwd = (inhoud as { gebouwd?: unknown } | null)?.gebouwd
    return typeof gebouwd === 'string' && gebouwd !== '' ? gebouwd : null
  } catch {
    // Geen bestand, geen netwerk, geen geldige JSON: dan zegt de app hier niets.
    return null
  }
}

/**
 * De versiedatum in gewone taal, in de opmaaktaal van de gebruiker.
 *
 * ⚠ MÉT het uur, en dat is geen detail: dit project publiceert soms drie keer op één
 * dag. "27 augustus 2026" zou dan bij drie verschillende versies hetzelfde zeggen — en
 * dan is de regel er wel, maar beantwoordt ze de vraag niet.
 *
 * ⚠ Het uur staat in de tijdzone van je TOESTEL. Dat is de juiste kant: je vergelijkt dit
 * met "wanneer heb ik gecommit", en dat weet je in je eigen klok.
 *
 * Is de tekst geen leesbare tijd, dan geeft deze functie hem onveranderd terug. Een
 * datum verzinnen is erger dan een rare tekst tonen.
 */
export function bouwdatumTekst(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Luistert naar de service worker, en vraagt hem te gaan kijken.
 *
 * `controllerchange` is het moment waarop een NIEUWE service worker het overneemt van
 * de oude. De bouwinstelling van deze app (`registerType: 'autoUpdate'`, met
 * `skipWaiting` en `clientsClaim`) laat dat vanzelf gebeuren zodra hij een nieuwe
 * versie gevonden heeft — en op datzelfde moment gooit hij de oude bestanden weg.
 * Vanaf dan draait jouw scherm code die niet meer bij de rest past.
 *
 * ⚠ RONDE 99 — DEZE BALK IS BIJ TIMOTHY NOOIT AANGEKOMEN. Er zaten drie dingen onder,
 * en ze zijn niet alle drie even hard. Ik schrijf er daarom bij wat ik van elk ECHT
 * gemeten heb (Chromium, twee echte builds, een nagebootste publicatie).
 *
 * **1. De app ging alleen kijken bij een TABBLADWISSEL — aantoonbaar.** `visibilitychange`
 * was de enige aanleiding, met bovendien een ondergrens van een kwartier waarvan de klok
 * bij het opstarten begint. Nu kijkt ze meteen bij het aankoppelen één keer.
 * ⚠ Dat lost het geval "tabblad staat acht uur zichtbaar open" NIET op: dan blijft het bij
 * die ene controle tot je van tabblad wisselt. Een periodieke controle staat op de open
 * lijst; ze hier stil invoeren zou een verzoek per kwartier naar de server sturen zonder
 * dat iemand daarom gevraagd heeft.
 *
 * **2. Bij een F5 kwam de ontdekking te laat — NIET REPRODUCEERBAAR.** De voortgangsnota
 * schreef dat een F5 geen balk gaf. Ik heb dat in een echte browser nagespeeld en de balk
 * verscheen er wél, zowel vóór als ná deze ronde. Sterker: `registerSW.js` registreert de
 * service worker op `window.load`, en dat is ruim ná de eerste render — een
 * `controllerchange` uit die registratie kán onze luisteraar niet inhalen. **De bewering
 * uit de nota is dus niet bewezen, en ik laat ze hier niet als feit staan.**
 * Wat er wél gebeurd is: we vragen bij het opstarten nu óók rechtstreeks aan de browser
 * wat er klaarstaat (`registration.waiting` en `.installing`) en luisteren naar
 * `updatefound`. Dat is een echte extra weg, ook al is de wedloop die hem rechtvaardigde
 * niet aangetoond.
 *
 * **3. `hadAlEenBaas` schakelde de balk een hele sessie uit — AANTOONBAAR, en dit is de
 * zware.** De vlag werd ÉÉN keer bepaald, bij het aankoppelen, en stond op `const`. Start
 * een pagina ONgecontroleerd (het allereerste bezoek, of na een harde herlaadbeurt met
 * Ctrl+Shift+R), dan stond ze op `false` en zweeg de balk de rest van de sessie — ook toen
 * er wél een nieuwe versie kwam. Gemeten, vóór en ná: vóór geen balk, ná wél.
 * Nu schuift de vlag mee: de eerste OVERNAME telt niet (er was nog niets), elke volgende
 * wél. ⚠ Eén randgeval blijft: begint de pagina ongecontroleerd en komt de eerste update
 * binnen vóór die eerste overname, dan wordt ze nog steeds ingeslikt. Dat is verdedigbaar
 * (je hebt net verse bestanden van het net gehaald) maar het is een keuze, geen wet.
 *
 * Geeft een opzegfunctie terug, en doet niets in een omgeving zonder service worker
 * (de testomgeving, of een browser die ze niet ondersteunt).
 */
export function volgServiceWorker(nu: () => number = () => Date.now()): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}
  const sw = navigator.serviceWorker
  // Bij het ALLEREERSTE bezoek neemt de service worker ook het roer over, en dan is er
  // niets bijgewerkt: er was gewoon nog niets. Daarom kijken we of er al een baas was.
  //
  // ⚠ EN DEZE VLAG SCHUIFT MEE (fout 3 hierboven). Ze stond op `const`, dus een pagina
  // die ongecontroleerd startte, kreeg de rest van haar leven geen enkele melding meer.
  let hadAlEenBaas = sw.controller !== null
  let laatsteControle = nu()
  let gestopt = false
  // De `updatefound`-luisteraar hoort er maar één keer op te staan. Zonder deze vlag kwam
  // er bij elke tabbladwissel een tweede bij. ⚠ De kost daarvan is GEEN dubbele melding —
  // `meldNieuweVersie` is idempotent — maar een lek van luisteraars die nooit opgeruimd
  // worden. Die correctie komt uit een doorlichting; ik had het eerst te sterk opgeschreven.
  let registratieGevolgd = false
  // Welke installerende workers we al volgen; zie `volgInstallatie`.
  const gevolgdeInstallaties = new WeakSet<ServiceWorker>()

  /**
   * Melden, maar alleen wanneer er iets te VERVANGEN viel.
   *
   * ⚠ HIER STOND OOK EEN CONTROLE OP `gestopt`, EN DIE WAS DOOD. Een mutatietest beet er
   * niet op, en dat bleek terecht: élk pad hiernaartoe kijkt zelf al naar `gestopt` (de
   * `.then` van `kijkNu`, de ingang van `volgInstallatie`, en de `statechange`-luisteraar).
   * Weggehaald in plaats van bewaakt — een mutatie die niet bijt, is even vaak een dode
   * tak als een testgat (regel sinds ronde 73).
   */
  function meldAlsUpdate() {
    if (hadAlEenBaas) meldNieuweVersie()
  }

  function opWissel() {
    if (hadAlEenBaas) meldNieuweVersie()
    // De eerste overname is geen update — maar vanaf nu telt elke volgende er wél een.
    else hadAlEenBaas = true
  }

  /**
   * Volgt een service worker die aan het installeren is tot hij klaarstaat.
   *
   * ⚠ `gestopt` wordt hier OOK gelezen (doorlichting ronde 99). Deze luisteraar en die op
   * `updatefound` worden nooit met `removeEventListener` afgehaald — een service worker
   * die aan het installeren is, is geen element dat je netjes kan opruimen. Zonder deze
   * controle kon `meldNieuweVersie()` dus nog afgaan ná het opzeggen. In de app doet dat
   * niets (er wordt nooit opgezegd), maar het is een val voor elke volgende aanroeper.
   */
  function volgInstallatie(wachtende: ServiceWorker | null | undefined) {
    if (!wachtende || gestopt || gevolgdeInstallaties.has(wachtende)) return
    if (wachtende.state === 'installed') {
      meldAlsUpdate()
      return
    }
    // ⚠ En hooguit één luisteraar per worker. `kijkNu` draait bij elke tabbladwissel; drie
    // wissels tijdens één installatie gaven vier luisteraars op dezelfde worker.
    gevolgdeInstallaties.add(wachtende)
    wachtende.addEventListener?.('statechange', () => {
      if (!gestopt && wachtende.state === 'installed') meldAlsUpdate()
    })
  }

  /** Vraag de browser wat er klaarstaat, en laat hem opnieuw kijken. */
  function kijkNu() {
    try {
      const belofte = sw.getRegistration?.()
      if (!belofte) return
      void belofte
        .then((r) => {
          if (!r || gestopt) return undefined
          // Staat er al eentje te wachten of te installeren? Dan hoeft niemand op een
          // gebeurtenis te wachten die misschien al voorbij is.
          if (r.waiting) meldAlsUpdate()
          volgInstallatie(r.installing)
          if (!registratieGevolgd) {
            registratieGevolgd = true
            r.addEventListener?.('updatefound', () => {
              if (!gestopt) volgInstallatie(r.installing)
            })
          }
          return r.update?.()
        })
        .catch(() => {})
    } catch {
      // Een browser die dit niet kent, laat de rest gewoon werken.
    }
  }

  function opZichtbaar() {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
    if (nu() - laatsteControle < CONTROLE_PAUZE_MS) return
    laatsteControle = nu()
    // Stil: lukt het niet, dan verandert er niets en merkt de gebruiker het pas
    // wanneer een onderdeel niet geladen raakt.
    kijkNu()
  }

  sw.addEventListener('controllerchange', opWissel)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', opZichtbaar)
  // ⚠ METEEN ÉÉN KEER (fout 1 hierboven). Niet pas na een kwartier én een tabbladwissel.
  kijkNu()
  return () => {
    gestopt = true
    sw.removeEventListener('controllerchange', opWissel)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', opZichtbaar)
  }
}

/** Herlaadt de pagina. Apart, zodat een test hem kan vervangen. */
export function herlaadApp(): void {
  window.location.reload()
}
