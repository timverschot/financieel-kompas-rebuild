import type { Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { groepVanCategorie } from '../data/categorieen/resolve'

// Zuivere functie: telt de uitgaven (negatieve bedragen) voor één budget in één
// maand op. 'categorieId' is de categorie van het budget (meestal een
// hoofdcategorie). Er wordt OPGEROLD: elke uitgavenregel telt mee als ze onder
// die categorie valt — dus een budget op 'Voeding' vangt ook alle onderliggende
// subcategorieën/items. Gesplitste kassatickets worden uitgesplitst. 'maand' is
// 'JJJJ-MM'. Zuiver, dus los deterministisch te testen.
export function uitgavenInMaand(transacties: Transactie[], categorieId: string, maand: string): number {
  let som = 0
  for (const t of transacties) {
    if (!t.datum.startsWith(maand)) continue
    for (const regel of categorieBedragen(t)) {
      if (regel.bedrag < 0 && groepVanCategorie(regel.categorieId, []).sleutel === categorieId) {
        som += Math.abs(regel.bedrag)
      }
    }
  }
  return som
}
