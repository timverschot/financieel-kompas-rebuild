// Welke logregels uit de back-up geweigerd zijn, en of we dat al gezegd hebben.
//
// ⚠ RONDE 100 — WAAROM DIT BESTAAT. Timothy, 26 augustus 2026: hij synchroniseerde met
// Google Drive en kreeg de melding *"van 1 regel(s) kan de app niet zien in welke eenheid
// de bedragen staan"*. Hij klikte ze weg, drukte F5, en ze stond er weer. En:
// *"verder kan ik ook niets doen."*
//
// Allebei klopte het, en het was erger dan een schoonheidsfoutje:
//
//  1. **Een geweigerde regel wordt nooit aan je eigen logboek toegevoegd** — dat is juist,
//     want ze is niet te vertrouwen. Maar daardoor ziet de volgende synchronisatie haar
//     opnieuw als onbekend en telt ze haar opnieuw. **Dit blijft dus eeuwig duren.**
//  2. **Het wegklikken leefde in `useState`**, dus het overleefde geen herlaadbeurt.
//  3. **De raad die erbij stond, hielp niet.** "Komen die regels van een ander toestel,
//     werk de app daar dan ook bij" is goede raad bij een regel uit een TE NIEUWE versie.
//     Bij een regel uit de euro-tijd verandert er niets van: die staat al op Drive, en
//     geen enkel toestel schrijft hem opnieuw.
//
// Wat deze module doet: onthouden WELKE regels we al gemeld hebben. Zo verdwijnt de
// melding na één keer wegklikken, en komt ze terug zodra er een NIEUWE geweigerde regel
// bij komt — want dan is er weer iets nieuws te zeggen.

/** Waarom een regel niet ingelezen is. */
export type Weigering = 'te-oud' | 'te-nieuw'

/**
 * Eén geweigerde regel, met net genoeg erbij om te kunnen zeggen wélke het is.
 *
 * ⚠ Hier stond ook `toestelId`. Een doorlichting liet zien dat geen enkel scherm het las
 * en geen enkele beslissing ervan afhing — en een veld dat niets doet, hoort weg. Komt de
 * vraag "van welk toestel kwam die regel" ooit écht op het scherm, dan mag het terug.
 */
export type GeweigerdeRegel = {
  id: string
  /** Wanneer de regel geschreven is, als tijdstempel in milliseconden. */
  tijdstip: number
  reden: Weigering
}

/**
 * Hoeveel id's we hoogstens bewaren.
 *
 * ⚠ Zonder bovengrens groeit deze lijst voor altijd. Een toestel dat zijn lokale gegevens
 * kwijt was en een volledig oud logboek terughaalt, kan tienduizenden geweigerde regels
 * hebben — en `localStorage` deelt zijn (kleine) ruimte met het Drive-token, de
 * instellingen en het thema. Loopt die vol, dan mislukt het bewaren daar stil.
 *
 * Wat er gebeurt bij overschrijden: de OUDSTE id's vallen weg. Die zijn dan opnieuw
 * "nog niet gemeld", dus de app zegt hoogstens één keer te veel — de goede kant om op te
 * vallen bij een waarschuwing over geld.
 */
export const HOOGSTENS_ONTHOUDEN = 5000

/**
 * Waar we onthouden wat we al gemeld hebben.
 *
 * ⚠ In `localStorage` en niet in de database: dit gaat over wat DIT scherm al gezegd
 * heeft, niet over je gegevens. Het hoort niet mee te reizen naar je andere toestellen —
 * daar is de melding wél nieuw, en daar hoort ze dus wél te verschijnen.
 */
export const GEMELD_SLEUTEL = 'fk_geweigerde_regels_gemeld'

/**
 * De id's die we al gemeld hebben.
 *
 * Bij twijfel: een lege lijst. Dan meldt de app iets te veel in plaats van iets te
 * weinig, en dat is bij een waarschuwing de goede kant om op te vallen.
 */
export function leesGemeld(opslag: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Set<string> {
  try {
    const rauw = opslag.getItem(GEMELD_SLEUTEL)
    if (!rauw) return new Set()
    const gelezen = JSON.parse(rauw) as string[]
    return new Set(gelezen.filter((x): x is string => typeof x === 'string'))
  } catch {
    // Kapotte JSON, een browser die opslag weigert, of iets bewaards dat helemaal geen
    // lijst is (dan bestaat `.filter` niet en vliegen we hier binnen): dan weten we niets.
    //
    // ⚠ Hier stond ook een `Array.isArray`-controle. Een mutatietest liet zien dat geen
    // enkele test het verschil merkte als je die weghaalt — terecht, want een bewaarde
    // tekst of een object struikelt sowieso over `.filter` en komt hier terecht met
    // dezelfde uitkomst. Een tak die niets doet, hoort weg.
    return new Set()
  }
}

/** Onthoudt dat deze id's gemeld zijn. Mislukt het, dan gebeurt er verder niets. */
export function onthoudGemeld(
  ids: readonly string[],
  opslag: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): void {
  try {
    const samen = [...new Set([...leesGemeld(opslag), ...ids])]
    opslag.setItem(GEMELD_SLEUTEL, JSON.stringify(samen.slice(-HOOGSTENS_ONTHOUDEN)))
  } catch {
    // Dan komt de melding bij de volgende herlaadbeurt terug. Vervelend, niet erg.
  }
}

/**
 * Welke van deze geweigerde regels nog niet gemeld zijn.
 *
 * ⚠ Op ID en niet op AANTAL. Een teller kan niet zien of het om dezelfde regel gaat: één
 * geweigerde regel die elke ronde opnieuw langskomt, en één nieuwe geweigerde regel
 * geven allebei "1". Dat verschil is nu juist het hele punt.
 */
export function nogNietGemeld(
  regels: readonly GeweigerdeRegel[],
  opslag: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): GeweigerdeRegel[] {
  const gemeld = leesGemeld(opslag)
  return regels.filter((r) => !gemeld.has(r.id))
}

/**
 * Vergeet alles wat we gemeld hebben.
 *
 * ⚠ Voor "Begin opnieuw". `wisAlles` leegt de database, maar deze lijst staat in
 * `localStorage` en zou dus blijven staan: de app zou daarna zwijgen over regels die ze
 * vóór het wissen al eens gemeld had, terwijl je op dat moment juist opnieuw begint.
 */
export function vergeetGemeld(opslag: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): void {
  try {
    opslag.removeItem(GEMELD_SLEUTEL)
  } catch {
    // Een browser die opslag weigert: dan stond er sowieso niets.
  }
}
