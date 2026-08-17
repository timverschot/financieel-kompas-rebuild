import type { Transactie } from '../data/schema'
import { itemPerId, midPerId } from '../data/categorieen/zoek'
import { categorieBedragen } from './transactie'
import { domeinVanCategorie } from './besparen'
import { handelaarSleutel } from './handelaar'

// Filter- en zoeklaag voor de transactielijst. Zuivere functies zodat ze los
// getest kunnen worden. De filters zijn allemaal optioneel en werken samen (AND).

export type TxFilter = {
  zoek?: string // vrije tekst op omschrijving (+ split-regels)
  richting?: 'in' | 'uit' // inkomst vs uitgave
  hoofdId?: string // hoofdcategorie (ov-*) of eigen categorie-id
  catId?: string // mid-categorie (cat-*)
  rekeningId?: string
  van?: string // JJJJ-MM-DD (inclusief)
  tot?: string // JJJJ-MM-DD (inclusief)
  // Eén kalendermaand ('JJJJ-MM'). Bewust een eigen filter en geen van/tot-paar:
  // de maandschakelaar bovenaan de lijst moet met één pijl een maand op kunnen
  // schuiven, en dat kan niet met twee losse datums zonder ze allebei te
  // herberekenen. Staat er ook een van/tot bereik aan, dan gelden ze samen (AND),
  // net als alle andere filters.
  maand?: string
  /**
   * Eén besparingsdomein ('boodschappen', 'energie', …).
   *
   * Waarom dit een eigen filter is en geen hoofdcategorie: een domein bundelt
   * MEERDERE categorieën (Boodschappen = voeding + drank + huishouden), en
   * `hoofdId` neemt er maar één. Wie vanaf het blok "Waar loopt het op?"
   * doorklikt, hoort exact dezelfde verzameling terug te zien als het bedrag
   * waarop hij klikte — daarom gebruikt dit filter letterlijk dezelfde matcher
   * (`domeinVanCategorie`) als de rekenkern van dat blok.
   */
  domein?: string
  /**
   * Alleen wat nog GEEN categorie heeft.
   *
   * Waarom een eigen vlag en niet een lege `hoofdId`: een lege `hoofdId` betekent
   * "geen categoriefilter", dus die kon nooit "zonder categorie" betekenen. Tot nu
   * toe was "Zonder categorie" daardoor een doodlopend pad — je zag het cijfer in de
   * analyse en in de import, maar je kon de boekingen zelf niet opvragen. Precies
   * die lijst is de tweede stap van de maandafsluiting (ronde 43).
   *
   * Op REGELNIVEAU, net als de rest van dit bestand: een gesplitst kassaticket
   * waarvan één regel nog geen categorie heeft, hoort erbij — want dat deel van het
   * bedrag telt nergens mee. Zonder die regel zou je een ticket nooit terugvinden
   * omdat de eerste regel wél ingevuld is.
   */
  zonderCategorie?: boolean
  /**
   * Alle boekingen bij DEZELFDE handelaar, ook al schrijft de bank de omschrijving
   * elke maand anders.
   *
   * Waarom dit niet met `zoek` kan. De vrije zoekterm doet een letterlijke
   * substring-match op de omschrijving, en die bevat bij een bankexport het
   * kaartnummer, de datum en een referentie — allemaal anders per boeking. Klikte je
   * vanaf een prijsstijging door, dan vond je één van de zeven betalingen terug. Dit
   * filter gebruikt dezelfde opschoning als de prijsdetectie, dus je ziet precies de
   * boekingen waarop dat cijfer gebaseerd is.
   */
  handelaar?: string
  /**
   * Eén EXACTE omschrijving, precies zoals ze op de boeking staat.
   *
   * Waarom dit naast `handelaar` bestaat en niet in de plaats. De kaart
   * "Uitgaven per winkel" op Analyse groepeert op de letterlijke omschrijving
   * (`perWinkel` in `utils/analyse.ts`), inclusief hoofdletters en het
   * kaartnummer dat de bank erbij zet. `handelaar` schoont dat juist op en zou
   * dus MEER boekingen teruggeven dan het bedrag waarop je klikte — en `zoek` is
   * een substring-vergelijking die "Colruyt" ook in "Colruyt Collect" vindt.
   *
   * Hoofdlettergevoelig, om dezelfde reden: de rekenkern groepeert dat ook zo,
   * dus "Colruyt" en "colruyt" zijn daar twee rijen. Zou dit filter ze samen
   * nemen, dan toonde elk van die twee rijen de som van allebei.
   */
  omschrijving?: string
  /**
   * Alle boekingen die aan één gezinslid hangen (ronde 49).
   *
   * `persoonIds` staat op de TRANSACTIE, niet per regel, dus dit filter selecteert
   * hele boekingen — precies wat de kaart "Uitgaven per gezinslid" op Analyse
   * optelt, zolang die kost aan één persoon hing. Hing ze aan meerdere, dan toont
   * die kaart een BEREKEND aandeel en bestaat het getal nergens als boeking; daar
   * hoort dan ook geen doorklik te staan (zie `gedeeld` in utils/persoon.ts).
   */
  persoonId?: string
  /**
   * Alleen wat aan GEEN ENKEL gezinslid hangt: de groep "Het gezin".
   *
   * Naar het model van `zonderCategorie` hierboven, en om dezelfde reden: een lege
   * `persoonId` betekent "geen persoonsfilter" en kon dus nooit "zonder persoon"
   * betekenen. Dit is de enige regel van die kaart die altijd zuiver is — daar wordt
   * nooit iets verdeeld.
   */
  zonderPersoon?: boolean
}

// Alle categorie-id's waar een transactie naar verwijst: de hoofd-categorieId en
// die van elke split-regel.
function categorieIdsVan(tx: Transactie): string[] {
  const ids: string[] = []
  if (tx.categorieId) ids.push(tx.categorieId)
  for (const r of tx.regels ?? []) if (r.categorieId) ids.push(r.categorieId)
  return ids
}

// Behoort een transactie tot de gekozen hoofd- en/of mid-categorie? Een item
// (i-*) rolt op naar zijn hoofd- en mid-categorie; een rechtstreeks getagde
// hoofd- of eigen categorie matcht op id.
function raaktCategorie(tx: Transactie, hoofdId?: string, catId?: string, richting?: 'in' | 'uit'): boolean {
  if (!hoofdId && !catId) return true
  // Met een richting erbij wordt er op REGELniveau gekeken: dezelfde regel moet
  // zowel bij de categorie horen als het juiste teken hebben (ronde 49).
  //
  // Waarom dat nodig is. Categorie en richting werden los beoordeeld, dus een
  // kassaticket met een RETOUR op brood (+ € 3) en melk (− € 23) kwam onder
  // "Voeding, uitgaven" in beeld — terwijl het aan de uitgave op brood nul cent
  // bijdroeg. De rekenkernen van de Analyse tellen wél per regel, en dus toonde de
  // lijst boekingen die niet in het bedrag zaten waarop je klikte.
  const lijnen = richting
    ? categorieBedragen(tx).filter((r) => (richting === 'in' ? r.bedrag > 0 : r.bedrag < 0))
    : null
  const ids = lijnen ? lijnen.map((r) => r.categorieId ?? '') : categorieIdsVan(tx)
  return ids.some((id) => hoortBij(id, hoofdId) && hoortBijCat(id, catId))
}

/**
 * Valt één categorie-id onder een gekozen HOOFDcategorie?
 *
 * Sinds ronde 27 kan een boeking ook op de MIDDENLAAG staan (bv. rechtstreeks op
 * 'Elektriciteit'). Die hoort dan bij haar eigen hoofdcategorie te vallen, net als
 * een item — anders vind je zo'n boeking niet terug met het filter op
 * hoofdcategorie.
 */
function hoortBij(id: string, hoofdId?: string): boolean {
  if (!hoofdId) return true
  return id === hoofdId || itemPerId(id)?.hoofdId === hoofdId || midPerId(id)?.hoofdId === hoofdId
}

/** Valt één categorie-id onder een gekozen MIDDENcategorie (of is het die zelf)? */
function hoortBijCat(id: string, catId?: string): boolean {
  if (!catId) return true
  return id === catId || itemPerId(id)?.categorieId === catId
}

/**
 * Valt één categorie-id onder een andere categorie, op welk niveau die ook staat?
 *
 * Dezelfde regel als `filterVoorCategorie` hierboven, maar dan voor één losse
 * regel in plaats van een hele boeking. Bestaat opdat het fiscale jaaroverzicht
 * (ronde 50) niet zijn eigen versie van deze logica hoeft te schrijven — zoiets
 * loopt na één wijziging uiteen, en dan telt het ene scherm iets anders dan het
 * andere.
 */
export function categorieValtOnder(categorieId: string, doelId: string): boolean {
  if (midPerId(doelId) || itemPerId(doelId)) return hoortBijCat(categorieId, doelId)
  return hoortBij(categorieId, doelId)
}

// Raakt een transactie het gekozen besparingsdomein? Op REGELNIVEAU, net als
// `uitgavenPerBesparingsdomein`: één regel van een gesplitst kassaticket volstaat.
function raaktDomein(tx: Transactie, domein: string): boolean {
  return categorieIdsVan(tx).some((id) => domeinVanCategorie(id) === domein)
}

/**
 * Het filter dat hoort bij één opgeslagen categorie-id, op welk niveau ze ook
 * staat. Spiegelt `regelHoortBijBudget` uit utils/budget.ts: een hoofdcategorie
 * (of een eigen categorie) vangt alles eronder, een middencategorie enkel haar
 * eigen items, en een item enkel zichzelf.
 *
 * Zonder deze helper zou elke aanroeper zelf moeten raden of een id een
 * `hoofdId` of een `catId` is — en dan toont de lijst iets anders dan het cijfer
 * waarop je klikte.
 */
export function filterVoorCategorie(categorieId: string): TxFilter {
  if (midPerId(categorieId) || itemPerId(categorieId)) return { catId: categorieId }
  return { hoofdId: categorieId }
}

// Hoort een transactie bij "Inkomsten" of "Uitgaven"? Dat wordt op REGELNIVEAU
// beoordeeld, net als in de Analyse (utils/transactie.ts → categorieBedragen).
//
// Waarom: een kassaticket van −€ 50 met een statiegeldregel van +€ 3 heeft een
// negatief totaal, maar bevat wel degelijk een inkomst van € 3. Keek het filter
// enkel naar het totaal, dan verdween dat ticket volledig onder "Inkomsten",
// terwijl de Analyse die € 3 wél als inkomst toonde — twee schermen die elkaar
// tegenspraken. Een transactie hoort dus bij "Inkomsten" zodra minstens één regel
// positief is, en bij "Uitgaven" zodra minstens één regel negatief is. Een
// niet-gesplitste transactie heeft één regel (het volledige bedrag) en gedraagt
// zich daardoor precies zoals vroeger.
function raaktRichting(tx: Transactie, richting: 'in' | 'uit'): boolean {
  const regels = categorieBedragen(tx)
  if (richting === 'in') return regels.some((r) => r.bedrag > 0)
  return regels.some((r) => r.bedrag < 0)
}

/**
 * Ontbreekt er ergens in deze boeking nog een categorie?
 *
 * Drie gevallen, en alle drie horen ze in de lijst thuis:
 *  - geen categorie en geen splitsing → het hele bedrag hangt nergens;
 *  - een splitsing waarvan minstens één regel geen categorie heeft;
 *  - een splitsing die het totaal niet volledig dekt: `categorieBedragen` maakt
 *    van dat restbedrag zelf een regel zonder categorie, dus die wordt hier gratis
 *    meegevangen.
 */
export function mistCategorie(tx: Transactie): boolean {
  return categorieBedragen(tx).some((r) => r.categorieId === undefined || r.categorieId === '')
}

// Vrije-tekst-zoek op omschrijving en de omschrijvingen van split-regels.
function raaktZoek(tx: Transactie, zoek: string): boolean {
  const t = zoek.trim().toLowerCase()
  if (!t) return true
  if (tx.omschrijving.toLowerCase().includes(t)) return true
  return (tx.regels ?? []).some((r) => (r.omschrijving ?? '').toLowerCase().includes(t))
}

// Past alle actieve filters toe.
export function filterTransacties(transacties: Transactie[], filter: TxFilter): Transactie[] {
  return transacties.filter((tx) => {
    if (filter.richting && !raaktRichting(tx, filter.richting)) return false
    if (filter.rekeningId && tx.rekeningId !== filter.rekeningId) return false
    if (filter.van && tx.datum < filter.van) return false
    if (filter.tot && tx.datum > filter.tot) return false
    if (filter.maand && !tx.datum.startsWith(filter.maand)) return false
    // De richting gaat hier BEWUST mee naar binnen. Staan er een categorie én een
    // richting aan, dan moet één en dezelfde regel aan allebei voldoen; anders komen
    // er boekingen in beeld die aan het bedrag niets bijdroegen.
    if (!raaktCategorie(tx, filter.hoofdId, filter.catId, filter.richting)) return false
    if (filter.domein && !raaktDomein(tx, filter.domein)) return false
    if (filter.zonderCategorie && !mistCategorie(tx)) return false
    if (filter.handelaar && handelaarSleutel(tx.omschrijving) !== handelaarSleutel(filter.handelaar)) return false
    // Op waarheid en niet op `!== undefined`: een lege string zou anders wél
    // filteren maar géén chip krijgen, niet meetellen in het aantal en het
    // zesmaandsvenster laten staan — een onzichtbaar filter zonder wisknop.
    if (filter.omschrijving && tx.omschrijving.trim() !== filter.omschrijving.trim()) return false
    if (filter.persoonId && !(tx.persoonIds ?? []).includes(filter.persoonId)) return false
    if (filter.zonderPersoon && (tx.persoonIds ?? []).filter((id) => id).length > 0) return false
    if (filter.zoek && !raaktZoek(tx, filter.zoek)) return false
    return true
  })
}

// Ligt de einddatum vóór de begindatum? Zo'n bereik kan per definitie geen enkele
// transactie bevatten. Wie dit niet apart opvangt, toont een leeg scherm zonder
// uitleg — en rekent bij een vergelijking met "de vorige periode" zelfs met een
// negatief aantal dagen. Beide datums zijn 'JJJJ-MM-DD', dus een gewone
// tekstvergelijking volstaat. Een half ingevuld bereik is niet omgekeerd, enkel
// nog niet af.
export function isOmgekeerdBereik(van?: string, tot?: string): boolean {
  if (!van || !tot) return false
  return tot < van
}

// Is er een actief filter (buiten de standaardweergave)? Dan zoekt de gebruiker
// bewust in de volledige historiek en mag het historiek-venster niet beperken.
export function heeftActiefFilter(filter: TxFilter): boolean {
  return !!(
    filter.zoek?.trim() ||
    filter.richting ||
    filter.hoofdId ||
    filter.catId ||
    filter.domein ||
    filter.rekeningId ||
    filter.van ||
    filter.tot ||
    filter.maand ||
    filter.zonderCategorie ||
    filter.handelaar ||
    filter.omschrijving ||
    filter.persoonId ||
    filter.zonderPersoon
  )
}

// De grensdatum (JJJJ-MM-DD) van 'n maanden terug' t.o.v. een referentiedatum:
// de eerste dag van de maand, n maanden geleden. Gebruikt voor het historiek-
// venster (standaardweergave toont enkel de recente maanden).
export function grensDatumMaandenTerug(referentieISO: string, maanden: number): string {
  const [j, m] = referentieISO.split('-').map(Number)
  const totaal = j * 12 + (m - 1) - (maanden - 1)
  const nj = Math.floor(totaal / 12)
  const nm = (totaal % 12) + 1
  return `${nj}-${String(nm).padStart(2, '0')}-01`
}
