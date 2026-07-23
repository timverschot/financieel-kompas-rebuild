import { INGEBOUWDE_CATEGORIEEN, type Hoofdtype } from './ingebouwd'
import type { Subcategorie } from '../schema'

// Een item uit de boom, "plat" gemaakt met al zijn context (categorie +
// hoofdcategorie). Handig om te tonen, te zoeken en op te tellen.
export type PlatItem = {
  id: string
  naam: string
  synoniemen: string[]
  eenheid: string | null
  categorieId: string
  categorieNaam: string
  hoofdId: string
  hoofdNaam: string
  hoofdtype: Hoofdtype
  kleur: string
  icoon: string
}

// De vaste, ingebouwde boom één keer platgeslagen (de basis).
export const PLATTE_ITEMS: PlatItem[] = (() => {
  const uit: PlatItem[] = []
  for (const hoofd of INGEBOUWDE_CATEGORIEEN) {
    for (const cat of hoofd.categorieen) {
      for (const item of cat.items) {
        uit.push({
          id: item.id,
          naam: item.naam,
          synoniemen: item.synoniemen,
          eenheid: item.eenheid,
          categorieId: cat.id,
          categorieNaam: cat.naam,
          hoofdId: hoofd.id,
          hoofdNaam: hoofd.naam,
          hoofdtype: hoofd.hoofdtype,
          kleur: hoofd.kleur,
          icoon: hoofd.icoon,
        })
      }
    }
  }
  return uit
})()

// De context (categorie + hoofdcategorie) van elke mid-categorie (cat-*), zodat
// een toegevoegde subcategorie zijn plaats in de boom kent.
type CatContext = { categorieNaam: string; hoofdId: string; hoofdNaam: string; hoofdtype: Hoofdtype; kleur: string; icoon: string }
const CONTEXT_PER_CAT = new Map<string, CatContext>()
for (const hoofd of INGEBOUWDE_CATEGORIEEN) {
  for (const cat of hoofd.categorieen) {
    CONTEXT_PER_CAT.set(cat.id, {
      categorieNaam: cat.naam,
      hoofdId: hoofd.id,
      hoofdNaam: hoofd.naam,
      hoofdtype: hoofd.hoofdtype,
      kleur: hoofd.kleur,
      icoon: hoofd.icoon,
    })
  }
}

// Bouwt de effectieve platte lijst: de basis, met daarbovenop de gebruikers-
// aanpassingen (nieuwe items toegevoegd, of bestaande hernoemd/overschreven).
export function bouwEffectieveItems(aanpassingen: Subcategorie[]): PlatItem[] {
  const perId = new Map(PLATTE_ITEMS.map((i) => [i.id, i]))
  for (const a of aanpassingen) {
    const context = CONTEXT_PER_CAT.get(a.categorieId)
    const bestaand = perId.get(a.id)
    if (!context && !bestaand) continue // onbekende plaats en geen basis: overslaan
    const basis = context ?? {
      categorieNaam: bestaand!.categorieNaam,
      hoofdId: bestaand!.hoofdId,
      hoofdNaam: bestaand!.hoofdNaam,
      hoofdtype: bestaand!.hoofdtype,
      kleur: bestaand!.kleur,
      icoon: bestaand!.icoon,
    }
    perId.set(a.id, {
      id: a.id,
      naam: a.naam,
      synoniemen: a.synoniemen ?? [],
      eenheid: null,
      categorieId: a.categorieId,
      categorieNaam: basis.categorieNaam,
      hoofdId: basis.hoofdId,
      hoofdNaam: basis.hoofdNaam,
      hoofdtype: basis.hoofdtype,
      kleur: basis.kleur,
      icoon: basis.icoon,
    })
  }
  return [...perId.values()]
}

// --- Register: de app stelt de actuele aanpassingen in, waarna zoeken en
// opzoeken die automatisch meenemen (zonder overal parameters door te geven). ---
let huidigeItems: PlatItem[] = PLATTE_ITEMS
let perIdRegister = new Map(PLATTE_ITEMS.map((i) => [i.id, i]))

export function stelSubcategorieenIn(aanpassingen: Subcategorie[]): void {
  huidigeItems = bouwEffectieveItems(aanpassingen)
  perIdRegister = new Map(huidigeItems.map((i) => [i.id, i]))
}

// Zoekt een item op zijn id (inclusief gebruikersaanpassingen).
export function itemPerId(id: string): PlatItem | undefined {
  return perIdRegister.get(id)
}

// Zoekt items op naam of synoniem (hoofdletterongevoelig), inclusief
// gebruikersaanpassingen. Rangschikt op relevantie.
export function zoekItems(term: string, limiet = 25): PlatItem[] {
  const t = term.trim().toLowerCase()
  if (!t) return []

  const gescoord: { item: PlatItem; score: number }[] = []
  for (const item of huidigeItems) {
    const naam = item.naam.toLowerCase()
    let score = -1
    if (naam === t) score = 0
    else if (naam.startsWith(t)) score = 1
    else if (naam.includes(t)) score = 2
    else if (item.synoniemen.some((s) => s.toLowerCase().includes(t))) score = 3
    if (score >= 0) gescoord.push({ item, score })
  }

  gescoord.sort((a, b) => a.score - b.score || a.item.naam.localeCompare(b.item.naam, 'nl'))
  return gescoord.slice(0, limiet).map((g) => g.item)
}
