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
    const lijnen = t.regels.map((r) => ({ categorieId: r.categorieId, bedrag: r.bedrag }))
    // Dekt de itemisatie niet het volledige totaal, dan telt het restbedrag mee
    // als 'zonder categorie', zodat de som van de regels altijd het totaal is.
    const som = lijnen.reduce((s, r) => s + r.bedrag, 0)
    const rest = t.bedrag - som
    if (rest !== 0) lijnen.push({ categorieId: undefined, bedrag: rest })
    return lijnen
  }
  return [{ categorieId: t.categorieId, bedrag: t.bedrag }]
}
