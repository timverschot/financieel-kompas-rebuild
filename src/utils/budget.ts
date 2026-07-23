import type { Transactie } from '../data/schema'

// Zuivere functie: telt de uitgaven (negatieve bedragen) van één categorie in
// één maand op. 'maand' is in het formaat 'JJJJ-MM'. Inkomsten en andere
// categorieën/maanden tellen niet mee. Als aparte functie zodat ze los,
// deterministisch getest kan worden.
export function uitgavenInMaand(transacties: Transactie[], categorieId: string, maand: string): number {
  return transacties
    .filter((t) => t.categorieId === categorieId && t.bedrag < 0 && t.datum.startsWith(maand))
    .reduce((som, t) => som + Math.abs(t.bedrag), 0)
}
