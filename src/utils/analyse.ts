import type { Categorie, Transactie } from '../data/schema'
import { groepVanCategorie, labelVanCategorie } from '../data/categorieen/resolve'
import { itemPerId } from '../data/categorieen/zoek'
import { categorieBedragen } from './transactie'

// Rekenkern voor de Analyse-pagina. Alles zuiver en los testbaar. Werkt over een
// vrije periode (van/tot, inclusief) i.p.v. één maand, en op regelniveau zodat
// gesplitste kassatickets overal correct meetellen bij hun eigen categorie.

export type Periode = { van?: string; tot?: string } // JJJJ-MM-DD, inclusief; leeg = open
export type Richting = 'uitgave' | 'inkomst'

export type AnalyseGroep = { sleutel: string; naam: string; bedrag: number; kleur: string | null }
// `sleutel` is optioneel omdat niet elke uitsplitsing er een heeft: per winkel
// wordt op de omschrijving gegroepeerd, en daar bestaat geen id voor. Staat ze er
// wél (drilldown per subcategorie), dan kan je vanaf die rij doorklikken naar de
// onderliggende boekingen.
export type AnalysePost = { naam: string; bedrag: number; sleutel?: string }
export type DrillTransactie = { transactie: Transactie; bedrag: number; lijnen: { categorieId?: string; bedrag: number }[] }

export function inPeriode(datum: string, p: Periode): boolean {
  if (p.van && datum < p.van) return false
  if (p.tot && datum > p.tot) return false
  return true
}

// De relevante regels van een transactie voor de gekozen richting, met het bedrag
// als positief getal (absolute waarde). Uitgave = negatieve regels, inkomst =
// positieve regels.
function relevanteLijnen(t: Transactie, richting: Richting): { categorieId?: string; bedrag: number }[] {
  return categorieBedragen(t)
    .filter((r) => (richting === 'uitgave' ? r.bedrag < 0 : r.bedrag > 0))
    .map((r) => ({ categorieId: r.categorieId, bedrag: Math.abs(r.bedrag) }))
}

// Verdeling per hoofdcategorie (opgerold), gesorteerd van groot naar klein. De
// kleur komt uit de hoofdcategorie zelf (zelfde data-object als de cijfers).
export function perHoofdcategorie(
  transacties: Transactie[],
  categorieen: Categorie[],
  periode: Periode,
  richting: Richting,
): AnalyseGroep[] {
  const m = new Map<string, { naam: string; kleur: string | null; bedrag: number }>()
  for (const t of transacties) {
    if (!inPeriode(t.datum, periode)) continue
    for (const l of relevanteLijnen(t, richting)) {
      const g = groepVanCategorie(l.categorieId, categorieen)
      const e = m.get(g.sleutel)
      if (e) e.bedrag += l.bedrag
      else m.set(g.sleutel, { naam: g.naam, kleur: g.kleur, bedrag: l.bedrag })
    }
  }
  return [...m.entries()]
    .map(([sleutel, v]) => ({ sleutel, naam: v.naam, kleur: v.kleur, bedrag: v.bedrag }))
    .sort((a, b) => b.bedrag - a.bedrag)
}

/**
 * Verdeling per product/subcategorie (het specifieke niveau dat gekozen werd).
 *
 * Er wordt op NAAM gegroepeerd, niet op id, en dat blijft zo: dat is wat je op het
 * scherm wil zien. Maar om te kunnen doorklikken hoort er een sleutel bij, en die
 * mag er alleen komen wanneer ze aantoonbaar exact dezelfde boekingen aanwijst als
 * de rij (ronde 49). Twee voorwaarden:
 *
 *  1. **Eén naam, één id.** Twee categorieën kunnen dezelfde naam dragen, en een
 *     onbekend id wordt door `labelVanCategorie` 'Onbekend' genoemd — dan rollen er
 *     meerdere id's in één rij en wijst geen enkel filter die rij precies aan.
 *  2. **Het id is een ITEM**, geen middencategorie. Een filter op een
 *     middencategorie vangt ook alles wat eronder hangt (zie `raaktCategorie` in
 *     utils/transactieFilter.ts), terwijl deze telling alleen meeneemt wat
 *     rechtstreeks op die categorie geboekt staat. Boek je € 3 op "Elektriciteit"
 *     zelf en € 40 op de items eronder, dan staat hier € 3 en toonde het filter
 *     € 43.
 *
 * Wat een sleutel NIET belooft: dat het bedrag boven de gefilterde lijst gelijk is
 * aan het bedrag op de rij. Deze telling is op REGELniveau; de lijst toont hele
 * boekingen. Een kassaticket met brood én melk komt dus volledig in beeld. Dat is
 * hoe elke categorie-doorklik in deze app werkt (budgetten, de donut op het
 * Overzicht, de drilldown) en het is de enige zinnige keuze: een halve bon tonen is
 * erger.
 */
export function perItem(
  transacties: Transactie[],
  categorieen: Categorie[],
  periode: Periode,
  richting: Richting,
): AnalysePost[] {
  const m = new Map<string, number>()
  // Per naam: de id's die eraan bijdroegen. Meer dan één = geen sleutel.
  const idsPerNaam = new Map<string, Set<string>>()
  for (const t of transacties) {
    if (!inPeriode(t.datum, periode)) continue
    for (const l of relevanteLijnen(t, richting)) {
      const naam = labelVanCategorie(l.categorieId, categorieen) ?? 'Zonder categorie'
      m.set(naam, (m.get(naam) ?? 0) + l.bedrag)
      const ids = idsPerNaam.get(naam) ?? new Set<string>()
      ids.add(l.categorieId ?? '')
      idsPerNaam.set(naam, ids)
    }
  }
  return [...m.entries()]
    .map(([naam, bedrag]) => {
      const ids = [...(idsPerNaam.get(naam) ?? [])]
      const sleutel = ids.length === 1 && itemPerId(ids[0]) ? ids[0] : undefined
      return sleutel ? { naam, bedrag, sleutel } : { naam, bedrag }
    })
    .sort((a, b) => b.bedrag - a.bedrag)
}

// Verdeling per winkel/handelaar (de omschrijving van de transactie). De
// omschrijving hoort bij de hele transactie, dus we tellen haar totale bedrag in
// de gekozen richting.
export function perWinkel(transacties: Transactie[], periode: Periode, richting: Richting): AnalysePost[] {
  const m = new Map<string, number>()
  for (const t of transacties) {
    if (!inPeriode(t.datum, periode)) continue
    const naam = t.omschrijving.trim()
    if (!naam) continue
    let som = 0
    for (const l of relevanteLijnen(t, richting)) som += l.bedrag
    if (som > 0) m.set(naam, (m.get(naam) ?? 0) + som)
  }
  return [...m.entries()].map(([naam, bedrag]) => ({ naam, bedrag })).sort((a, b) => b.bedrag - a.bedrag)
}

// Alle transacties die (deels) onder een hoofdcategorie vallen, met het relevante
// bedrag en de bijhorende regels — voor het inzoom-scherm.
export function drillTransacties(
  transacties: Transactie[],
  categorieen: Categorie[],
  periode: Periode,
  richting: Richting,
  sleutel: string,
): DrillTransactie[] {
  const res: DrillTransactie[] = []
  for (const t of transacties) {
    if (!inPeriode(t.datum, periode)) continue
    const lijnen = categorieBedragen(t)
      .filter((r) => (richting === 'uitgave' ? r.bedrag < 0 : r.bedrag > 0))
      .filter((r) => groepVanCategorie(r.categorieId, categorieen).sleutel === sleutel)
      .map((r) => ({ categorieId: r.categorieId, bedrag: Math.abs(r.bedrag) }))
    if (lijnen.length === 0) continue
    const bedrag = lijnen.reduce((s, l) => s + l.bedrag, 0)
    res.push({ transactie: t, bedrag, lijnen })
  }
  return res.sort((a, b) => b.transactie.datum.localeCompare(a.transactie.datum))
}

// Verdeling per subcategorie binnen een ingezoomde hoofdcategorie.
export function drillPerItem(drill: DrillTransactie[], categorieen: Categorie[]): AnalysePost[] {
  // Naast het bedrag houden we het categorie-id bij, zodat een rij door kan
  // klikken naar haar boekingen. Twee verschillende id's kunnen dezelfde naam
  // dragen (een eigen categorie "Brood" naast het ingebouwde item); in dat geval
  // laten we de sleutel bewust weg — liever geen doorklik dan een die de helft
  // van het bedrag toont.
  const m = new Map<string, { bedrag: number; sleutel?: string; gemengd: boolean }>()
  for (const d of drill) {
    for (const l of d.lijnen) {
      const naam = labelVanCategorie(l.categorieId, categorieen) ?? 'Zonder categorie'
      const bestaand = m.get(naam)
      if (!bestaand) m.set(naam, { bedrag: l.bedrag, sleutel: l.categorieId, gemengd: false })
      else {
        bestaand.bedrag += l.bedrag
        if (bestaand.sleutel !== l.categorieId) bestaand.gemengd = true
      }
    }
  }
  return [...m.entries()]
    .map(([naam, v]) => ({ naam, bedrag: v.bedrag, ...(v.gemengd || !v.sleutel ? {} : { sleutel: v.sleutel }) }))
    .sort((a, b) => b.bedrag - a.bedrag)
}

export function totaalVan(posten: { bedrag: number }[]): number {
  return posten.reduce((s, p) => s + p.bedrag, 0)
}
