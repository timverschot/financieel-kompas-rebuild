import type { Transactie } from '../data/schema'
import { groepVanCategorie } from '../data/categorieen/resolve'

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

export type TransactieGroep = {
  sleutel: string
  naam: string
  kleur: string | null
  icoon: string | null
  bedrag: number
}

// De deelregels van een transactie opgerold naar hun hoofdcategorie, met per
// groep het opgetelde bedrag, gesorteerd van groot naar klein (op absolute
// grootte). Zo kan de transactielijst tonen: "🍽️ Voeding € 41,20 · 🧹 Huishouden
// € 12,60", en kan ze het icoon van de belangrijkste groep gebruiken.
export function groepenVanTransactie(
  t: Transactie,
  gebruikerCategorieen: { id: string; naam: string }[],
): TransactieGroep[] {
  const per = new Map<string, TransactieGroep>()
  for (const regel of categorieBedragen(t)) {
    const g = groepVanCategorie(regel.categorieId, gebruikerCategorieen)
    const bestaand = per.get(g.sleutel)
    if (bestaand) bestaand.bedrag += regel.bedrag
    else per.set(g.sleutel, { sleutel: g.sleutel, naam: g.naam, kleur: g.kleur, icoon: g.icoon, bedrag: regel.bedrag })
  }
  return [...per.values()].sort((a, b) => Math.abs(b.bedrag) - Math.abs(a.bedrag))
}

// Is dit een gesplitst kassaticket, d.w.z. verdeeld over meer dan één categorie?
// Enkel dan verdient het het winkelkar-icoon.
export function isGesplitstOverCategorieen(
  t: Transactie,
  gebruikerCategorieen: { id: string; naam: string }[],
): boolean {
  return groepenVanTransactie(t, gebruikerCategorieen).length > 1
}
