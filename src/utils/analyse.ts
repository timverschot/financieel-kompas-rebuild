import type { Categorie, Transactie } from '../data/schema'
import { groepVanCategorie, labelVanCategorie } from '../data/categorieen/resolve'
import { categorieBedragen } from './transactie'

// Rekenkern voor de Analyse-pagina. Alles zuiver en los testbaar. Werkt over een
// vrije periode (van/tot, inclusief) i.p.v. één maand, en op regelniveau zodat
// gesplitste kassatickets overal correct meetellen bij hun eigen categorie.

export type Periode = { van?: string; tot?: string } // JJJJ-MM-DD, inclusief; leeg = open
export type Richting = 'uitgave' | 'inkomst'

export type AnalyseGroep = { sleutel: string; naam: string; bedrag: number; kleur: string | null }
export type AnalysePost = { naam: string; bedrag: number }
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

// Verdeling per product/subcategorie (het specifieke niveau dat gekozen werd).
export function perItem(
  transacties: Transactie[],
  categorieen: Categorie[],
  periode: Periode,
  richting: Richting,
): AnalysePost[] {
  const m = new Map<string, number>()
  for (const t of transacties) {
    if (!inPeriode(t.datum, periode)) continue
    for (const l of relevanteLijnen(t, richting)) {
      const naam = labelVanCategorie(l.categorieId, categorieen) ?? 'Zonder categorie'
      m.set(naam, (m.get(naam) ?? 0) + l.bedrag)
    }
  }
  return [...m.entries()].map(([naam, bedrag]) => ({ naam, bedrag })).sort((a, b) => b.bedrag - a.bedrag)
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
  const m = new Map<string, number>()
  for (const d of drill) {
    for (const l of d.lijnen) {
      const naam = labelVanCategorie(l.categorieId, categorieen) ?? 'Zonder categorie'
      m.set(naam, (m.get(naam) ?? 0) + l.bedrag)
    }
  }
  return [...m.entries()].map(([naam, bedrag]) => ({ naam, bedrag })).sort((a, b) => b.bedrag - a.bedrag)
}

export function totaalVan(posten: { bedrag: number }[]): number {
  return posten.reduce((s, p) => s + p.bedrag, 0)
}
