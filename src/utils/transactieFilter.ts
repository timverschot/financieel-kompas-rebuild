import type { Transactie } from '../data/schema'
import { itemPerId } from '../data/categorieen/zoek'
import { categorieBedragen } from './transactie'

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
function raaktCategorie(tx: Transactie, hoofdId?: string, catId?: string): boolean {
  if (!hoofdId && !catId) return true
  const ids = categorieIdsVan(tx)
  return ids.some((id) => {
    const item = itemPerId(id)
    const hoofdOk = !hoofdId || id === hoofdId || item?.hoofdId === hoofdId
    const catOk = !catId || id === catId || item?.categorieId === catId
    return hoofdOk && catOk
  })
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
    if (!raaktCategorie(tx, filter.hoofdId, filter.catId)) return false
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
  return !!(filter.zoek?.trim() || filter.richting || filter.hoofdId || filter.catId || filter.rekeningId || filter.van || filter.tot)
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
