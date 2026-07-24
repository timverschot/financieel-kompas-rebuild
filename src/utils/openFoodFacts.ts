// Zoekt een product op via de gratis Open-databanken van Open Food Facts. Naast
// voeding bestaan er zusterdatabanken voor cosmetica/verzorging (Open Beauty Facts)
// en algemene non-food (Open Products Facts), met exact dezelfde API. We proberen ze
// in volgorde: voeding → beauty → producten, en nemen de eerste treffer. Enkel de
// barcode wordt verstuurd — geen persoonlijke gegevens. Zuiver genoeg om met een
// gemockte fetch te testen. Nutri-Score bestaat enkel voor voeding.

export type OFFProduct = { naam: string; nutriScore?: string }

const VOEDING = 'https://world.openfoodfacts.org/api/v2/product'
const BEAUTY = 'https://world.openbeautyfacts.org/api/v2/product'
const PRODUCTEN = 'https://world.openproductsfacts.org/api/v2/product'

type OFFAntwoord = {
  status?: number
  product?: {
    product_name?: string
    product_name_nl?: string
    brands?: string
    nutriscore_grade?: string
  }
}

async function haalUitDatabank(basis: string, code: string, metNutri: boolean, signal?: AbortSignal): Promise<OFFProduct | null> {
  try {
    const velden = metNutri ? 'product_name,product_name_nl,brands,nutriscore_grade' : 'product_name,product_name_nl,brands'
    const res = await fetch(`${basis}/${encodeURIComponent(code)}.json?fields=${velden}`, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as OFFAntwoord
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const naam = (p.product_name_nl || p.product_name || '').trim()
    if (!naam) return null
    const merk = (p.brands || '').split(',')[0].trim()
    const volledig = merk && !naam.toLowerCase().includes(merk.toLowerCase()) ? `${naam} (${merk})` : naam
    const nutri = metNutri && p.nutriscore_grade && /^[a-e]$/i.test(p.nutriscore_grade) ? p.nutriscore_grade.toLowerCase() : undefined
    return { naam: volledig, ...(nutri ? { nutriScore: nutri } : {}) }
  } catch {
    // Offline, geblokkeerd of ongeldig antwoord: stil teruggeven.
    return null
  }
}

// Zoekt enkel in de voedingsdatabank (met Nutri-Score).
export function zoekOpenFoodFacts(code: string, signal?: AbortSignal): Promise<OFFProduct | null> {
  return haalUitDatabank(VOEDING, code, true, signal)
}

// Zoekt een product op over alle Open-databanken heen: eerst voeding (met Nutri-
// Score), dan cosmetica/verzorging, dan algemene producten. Geeft de eerste treffer
// terug, of null als niets gevonden is of de opzoeking mislukt/offline is.
export async function zoekProduct(code: string, signal?: AbortSignal): Promise<OFFProduct | null> {
  const bronnen: [string, boolean][] = [
    [VOEDING, true],
    [BEAUTY, false],
    [PRODUCTEN, false],
  ]
  for (const [basis, metNutri] of bronnen) {
    const gevonden = await haalUitDatabank(basis, code, metNutri, signal)
    if (gevonden) return gevonden
  }
  return null
}
