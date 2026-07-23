import type { Categorie, Transactie } from '../data/schema'
import { groepVanCategorie } from '../data/categorieen/resolve'

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

export type CategorieUitgave = { naam: string; bedrag: number; kleur: string | null }

// Uitgaven per (hoofd)categorie in één maand, gesorteerd van groot naar klein.
// Elke transactie wordt opgerold naar haar groep: een ingebouwd item telt mee
// onder zijn hoofdcategorie, een hoofdcategorie onder zichzelf, een eigen
// categorie onder zichzelf, en transacties zonder categorie onder 'Zonder
// categorie'. De kleur (van de hoofdcategorie) komt uit hetzelfde data-object,
// zodat grafieken later dezelfde kleur als de cijfers gebruiken.
export function uitgavenPerCategorie(
  transacties: Transactie[],
  categorieen: Categorie[],
  maand: string,
): CategorieUitgave[] {
  const perGroep = new Map<string, { naam: string; kleur: string | null; bedrag: number }>()
  for (const t of transacties) {
    if (t.bedrag < 0 && t.datum.startsWith(maand)) {
      const groep = groepVanCategorie(t.categorieId, categorieen)
      const bestaand = perGroep.get(groep.sleutel)
      if (bestaand) bestaand.bedrag += Math.abs(t.bedrag)
      else perGroep.set(groep.sleutel, { naam: groep.naam, kleur: groep.kleur, bedrag: Math.abs(t.bedrag) })
    }
  }

  return [...perGroep.values()]
    .map((g) => ({ naam: g.naam, bedrag: g.bedrag, kleur: g.kleur }))
    .sort((a, b) => b.bedrag - a.bedrag)
}
