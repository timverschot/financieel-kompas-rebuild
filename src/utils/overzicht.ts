import type { Categorie, Transactie } from '../data/schema'

// Zuivere functies voor het maandoverzicht. 'maand' is in het formaat 'JJJJ-MM'.
// Los gehouden zodat ze deterministisch getest kunnen worden.

export function maandInkomsten(transacties: Transactie[], maand: string): number {
  return transacties
    .filter((t) => t.bedrag > 0 && t.datum.startsWith(maand))
    .reduce((som, t) => som + t.bedrag, 0)
}

export function maandUitgaven(transacties: Transactie[], maand: string): number {
  return transacties
    .filter((t) => t.bedrag < 0 && t.datum.startsWith(maand))
    .reduce((som, t) => som + Math.abs(t.bedrag), 0)
}

export type CategorieUitgave = { naam: string; bedrag: number }

// Uitgaven per categorie in één maand, gesorteerd van groot naar klein.
// Transacties zonder categorie komen samen onder 'Zonder categorie'.
export function uitgavenPerCategorie(
  transacties: Transactie[],
  categorieen: Categorie[],
  maand: string,
): CategorieUitgave[] {
  const perId = new Map<string, number>()
  for (const t of transacties) {
    if (t.bedrag < 0 && t.datum.startsWith(maand)) {
      const sleutel = t.categorieId ?? ''
      perId.set(sleutel, (perId.get(sleutel) ?? 0) + Math.abs(t.bedrag))
    }
  }
  const naamVan = (id: string) =>
    id === '' ? 'Zonder categorie' : (categorieen.find((c) => c.id === id)?.naam ?? 'Onbekend')

  return [...perId.entries()]
    .map(([id, bedrag]) => ({ naam: naamVan(id), bedrag }))
    .sort((a, b) => b.bedrag - a.bedrag)
}
