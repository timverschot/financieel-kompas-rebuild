import {
  INGEBOUWDE_CATEGORIEEN,
  type Hoofdtype,
} from './ingebouwd'

// Een item uit de boom, "plat" gemaakt met al zijn context (categorie +
// hoofdcategorie). Handig om te tonen, te zoeken en op te tellen, zonder telkens
// door de drie lagen te moeten navigeren.
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

// De volledige boom één keer platgeslagen (module-niveau: berekend bij het laden).
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

const PER_ID = new Map(PLATTE_ITEMS.map((i) => [i.id, i]))

// Zoekt een item op zijn id. Snelle opzoeking via een vooraf gebouwde index.
export function itemPerId(id: string): PlatItem | undefined {
  return PER_ID.get(id)
}

// Zoekt items op naam of synoniem (hoofdletterongevoelig). Rangschikt op
// relevantie: exacte match eerst, dan begint-met, dan bevat, dan synoniem.
export function zoekItems(term: string, limiet = 25): PlatItem[] {
  const t = term.trim().toLowerCase()
  if (!t) return []

  const gescoord: { item: PlatItem; score: number }[] = []
  for (const item of PLATTE_ITEMS) {
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
