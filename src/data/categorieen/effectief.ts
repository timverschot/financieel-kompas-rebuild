import { INGEBOUWDE_CATEGORIEEN } from './ingebouwd'
import type { Subcategorie } from '../schema'

// De boom zoals hij effectief getoond wordt: de vaste basis, met de gebruikers-
// aanpassingen erin verwerkt. Items dragen 'eigen' zodat de UI weet welke items
// door de gebruiker zijn toegevoegd (en dus verwijderbaar zijn).
export type EffectiefItem = { id: string; naam: string; eenheid: string | null; eigen: boolean }
export type EffectieveCategorie = { id: string; naam: string; items: EffectiefItem[] }
export type EffectieveHoofd = { id: string; naam: string; icoon: string; categorieen: EffectieveCategorie[] }

export function bouwEffectieveBoom(aanpassingen: Subcategorie[]): EffectieveHoofd[] {
  const basisIds = new Set<string>()
  for (const h of INGEBOUWDE_CATEGORIEEN) for (const c of h.categorieen) for (const it of c.items) basisIds.add(it.id)

  const overrideNaam = new Map<string, string>()
  const toevoegingenPerCat = new Map<string, Subcategorie[]>()
  for (const a of aanpassingen) {
    if (basisIds.has(a.id)) {
      overrideNaam.set(a.id, a.naam)
    } else {
      const lijst = toevoegingenPerCat.get(a.categorieId) ?? []
      lijst.push(a)
      toevoegingenPerCat.set(a.categorieId, lijst)
    }
  }

  return INGEBOUWDE_CATEGORIEEN.map((hoofd) => ({
    id: hoofd.id,
    naam: hoofd.naam,
    icoon: hoofd.icoon,
    categorieen: hoofd.categorieen.map((cat) => ({
      id: cat.id,
      naam: cat.naam,
      items: [
        ...cat.items.map((it) => ({
          id: it.id,
          naam: overrideNaam.get(it.id) ?? it.naam,
          eenheid: it.eenheid,
          eigen: false,
        })),
        ...(toevoegingenPerCat.get(cat.id) ?? []).map((a) => ({
          id: a.id,
          naam: a.naam,
          eenheid: null,
          eigen: true,
        })),
      ],
    })),
  }))
}
