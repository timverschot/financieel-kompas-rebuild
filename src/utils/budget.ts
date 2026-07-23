import type { Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { groepVanCategorie } from '../data/categorieen/resolve'

// Zuivere functie: telt het NETTO-verbruik voor één budget in één maand op.
// 'categorieId' is de categorie van het budget (meestal een hoofdcategorie). Er
// wordt OPGEROLD: elke regel telt mee als ze onder die categorie valt — dus een
// budget op 'Voeding' vangt ook alle onderliggende subcategorieën/items.
// Gesplitste kassatickets worden uitgesplitst. Een terugbetaling (positieve regel)
// in dezelfde categorie VERLAAGT het verbruik; het resultaat wordt nooit negatief.
// 'maand' is 'JJJJ-MM'. Zuiver, dus los deterministisch te testen.
export function uitgavenInMaand(transacties: Transactie[], categorieId: string, maand: string): number {
  let som = 0
  for (const t of transacties) {
    if (!t.datum.startsWith(maand)) continue
    for (const regel of categorieBedragen(t)) {
      if (groepVanCategorie(regel.categorieId, []).sleutel === categorieId) {
        // Uitgave (negatief) telt op als verbruik; terugbetaling (positief) trekt af.
        som += -regel.bedrag
      }
    }
  }
  return Math.max(0, som)
}
