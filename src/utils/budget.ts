import type { Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'

// Zuivere functie: telt de uitgaven (negatieve bedragen) van één categorie in
// één maand op. 'maand' is in het formaat 'JJJJ-MM'. Inkomsten en andere
// categorieën/maanden tellen niet mee. Gesplitste transacties worden uitgesplitst
// via categorieBedragen, zodat enkel het deel voor déze categorie meetelt. Als
// aparte functie zodat ze los, deterministisch getest kan worden.
export function uitgavenInMaand(transacties: Transactie[], categorieId: string, maand: string): number {
  let som = 0
  for (const t of transacties) {
    if (!t.datum.startsWith(maand)) continue
    for (const regel of categorieBedragen(t)) {
      if (regel.categorieId === categorieId && regel.bedrag < 0) som += Math.abs(regel.bedrag)
    }
  }
  return som
}
