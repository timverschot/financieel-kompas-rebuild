import type { Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { groepVanCategorie } from '../data/categorieen/resolve'
import { itemPerId, midPerId } from '../data/categorieen/zoek'

// Zuivere functies voor de budgetopvolging. 'maand' is 'JJJJ-MM'.
//
// Sinds ronde 25 kan een budget op DRIE niveaus staan, en dat is de kern van deze
// module. Daarvóór rolde elke transactieregel op naar haar groep (de
// hoofdcategorie) en werd die met het budget vergeleken. Gevolg: een budget op
// "Persoonlijke verzorging" of op "Brood (wit)" zou nooit één transactie
// herkennen en eeuwig op € 0 verbruikt blijven staan. De keuzelijst bood die
// niveaus daarom niet eens aan — maar "€ 800 voor Huishouden en Verzorging"
// stuurt niets, en "€ 150 voor Persoonlijke verzorging" wel.
//
// De regel is nu: een regel telt mee wanneer het budgetniveau in haar eigen keten
// voorkomt.
//
//   budget op een HOOFDcategorie (ov-*) of een EIGEN categorie
//     → alles eronder telt mee (het oude gedrag, ongewijzigd)
//   budget op een MIDDENcategorie (cat-*)
//     → enkel items die onder díé middencategorie hangen
//   budget op een ITEM (i-*)
//     → enkel dat ene item
//
// Een boeking die rechtstreeks op een hoofdcategorie getagd staat ("dit was gewoon
// Huishouden"), telt bewust NIET mee in een budget op een middencategorie
// eronder. Je weet niet of die € 40 naar verzorging of naar poetsproducten ging,
// en ze stilzwijgend toewijzen zou het budget laten kloppen met iets wat niemand
// gezegd heeft.

/** Op welk niveau staat dit budget? */
export type Budgetniveau = 'hoofd' | 'midden' | 'item'

export function niveauVanBudget(categorieId: string): Budgetniveau {
  if (midPerId(categorieId)) return 'midden'
  if (itemPerId(categorieId)) return 'item'
  return 'hoofd'
}

/**
 * Telt een transactieregel mee voor dit budget? Zuiver, zodat elk niveau apart
 * getest kan worden.
 */
export function regelHoortBijBudget(regelCategorieId: string | undefined, budgetCategorieId: string): boolean {
  // Exact hetzelfde niveau telt altijd: een budget op een item vangt dat item, een
  // budget op een hoofdcategorie vangt een boeking die er rechtstreeks op staat.
  if (regelCategorieId === budgetCategorieId) return true

  switch (niveauVanBudget(budgetCategorieId)) {
    case 'item':
      // Alleen het item zelf, en dat is hierboven al afgehandeld.
      return false
    case 'midden': {
      const item = itemPerId(regelCategorieId ?? '')
      return item?.categorieId === budgetCategorieId
    }
    default:
      // Hoofdcategorie of eigen categorie: oprollen zoals voorheen.
      return groepVanCategorie(regelCategorieId, []).sleutel === budgetCategorieId
  }
}

// Het NETTO-verbruik voor één budget in één maand. Gesplitste kassatickets worden
// uitgesplitst. Een terugbetaling (positieve regel) op hetzelfde niveau VERLAAGT
// het verbruik; het resultaat wordt nooit negatief.
export function uitgavenInMaand(transacties: Transactie[], categorieId: string, maand: string): number {
  let som = 0
  for (const t of transacties) {
    if (!t.datum.startsWith(maand)) continue
    for (const regel of categorieBedragen(t)) {
      if (regelHoortBijBudget(regel.categorieId, categorieId)) {
        // Uitgave (negatief) telt op als verbruik; terugbetaling (positief) trekt af.
        som += -regel.bedrag
      }
    }
  }
  return Math.max(0, som)
}

/**
 * De kleur van een budgetbalk: groen, amber of terracotta.
 *
 * Waarom dit een eigen functie is (ronde 35): de grens stond hard op 80 % op twee
 * plaatsen in de code, terwijl je in Instellingen een drempel tussen 70 en 100 %
 * kan kiezen. De meldingen gebruikten die keuze wél. Zette je hem op 95 %, dan
 * kleurde je balk toch al oranje bij 80 % — de app zei dus iets anders dan wat je
 * had ingesteld.
 *
 * `drempel` is een percentage (70–100), net zoals het in de instellingen staat.
 */
export function budgetKleur(uitgegeven: number, bedrag: number, drempel: number): string {
  if (bedrag <= 0) return 'var(--positive)'
  if (uitgegeven > bedrag) return 'var(--negative)'
  if (uitgegeven >= (bedrag * drempel) / 100) return 'var(--warn)'
  return 'var(--positive)'
}
