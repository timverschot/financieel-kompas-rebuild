import type { Categorie, Transactie } from '../data/schema'
import { perHoofdcategorie, type Periode, type Richting } from './analyse'

// Trends & vergelijking. Bouwt voort op perHoofdcategorie zodat splitsingen en
// oprolling identiek behandeld worden als op de rest van de Analyse-pagina.

export type Beweger = {
  sleutel: string
  naam: string
  kleur: string | null
  huidig: number
  vorig: number
  delta: number
}

// Vergelijkt het bedrag per hoofdcategorie in de huidige periode met de vorige.
// Gesorteerd op de grootte van het verschil (grootste beweging eerst).
export function stijgersDalers(
  transacties: Transactie[],
  categorieen: Categorie[],
  huidige: Periode,
  vorige: Periode,
  richting: Richting,
): Beweger[] {
  const h = new Map(perHoofdcategorie(transacties, categorieen, huidige, richting).map((g) => [g.sleutel, g]))
  const v = new Map(perHoofdcategorie(transacties, categorieen, vorige, richting).map((g) => [g.sleutel, g]))
  const sleutels = new Set([...h.keys(), ...v.keys()])
  const res: Beweger[] = []
  for (const s of sleutels) {
    const gh = h.get(s)
    const gv = v.get(s)
    const naam = gh?.naam ?? gv?.naam ?? 'Onbekend'
    const kleur = gh?.kleur ?? gv?.kleur ?? null
    const huidig = gh?.bedrag ?? 0
    const vorig = gv?.bedrag ?? 0
    if (huidig === 0 && vorig === 0) continue
    res.push({ sleutel: s, naam, kleur, huidig, vorig, delta: huidig - vorig })
  }
  return res.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export type CategorieReeks = { sleutel: string; naam: string; kleur: string | null; waarden: number[]; totaal: number }

// Voor elke hoofdcategorie het bedrag per maand (in de volgorde van 'maanden'),
// gesorteerd op het totaal over de hele reeks (grootste eerst).
export function maandreeksPerHoofd(
  transacties: Transactie[],
  categorieen: Categorie[],
  maanden: string[],
  richting: Richting,
): CategorieReeks[] {
  const reeksen = new Map<string, { naam: string; kleur: string | null; waarden: number[] }>()
  maanden.forEach((maand, index) => {
    const periode: Periode = { van: `${maand}-01`, tot: `${maand}-31` }
    for (const g of perHoofdcategorie(transacties, categorieen, periode, richting)) {
      let r = reeksen.get(g.sleutel)
      if (!r) {
        r = { naam: g.naam, kleur: g.kleur, waarden: new Array(maanden.length).fill(0) }
        reeksen.set(g.sleutel, r)
      }
      r.waarden[index] = g.bedrag
    }
  })
  return [...reeksen.entries()]
    .map(([sleutel, r]) => ({ sleutel, naam: r.naam, kleur: r.kleur, waarden: r.waarden, totaal: r.waarden.reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.totaal - a.totaal)
}
