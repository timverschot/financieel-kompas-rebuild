import type { Transactie } from '../data/schema'

export type CategorieBedrag = { categorieId?: string; bedrag: number }

// Geeft de (categorie, bedrag)-regels van een transactie. Bij een gesplitste
// transactie zijn dat de deelregels; anders één regel met het hele bedrag.
//
// BELANGRIJK: élke telling, grafiek en budget hoort dit te gebruiken. Zo wordt een
// splitsing overal correct uitgesplitst en telt niets ooit dubbel op de
// moedertransactie (een bekende valkuil uit v1).
export function categorieBedragen(t: Transactie): CategorieBedrag[] {
  if (t.regels && t.regels.length > 0) {
    return t.regels.map((r) => ({ categorieId: r.categorieId, bedrag: r.bedrag }))
  }
  return [{ categorieId: t.categorieId, bedrag: t.bedrag }]
}
