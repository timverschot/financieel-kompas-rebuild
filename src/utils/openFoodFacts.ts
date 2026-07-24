// Zoekt een product op via de gratis Open Food Facts-database (vooral voeding).
// Geeft de productnaam en (optioneel) de Nutri-Score terug, of null als er niets
// gevonden is of de opzoeking mislukt/offline is. Enkel de barcode wordt verstuurd
// — geen persoonlijke gegevens. Zuiver genoeg om met een gemockte fetch te testen.

export type OFFProduct = { naam: string; nutriScore?: string }

const BASIS = 'https://world.openfoodfacts.org/api/v2/product'

type OFFAntwoord = {
  status?: number
  product?: {
    product_name?: string
    product_name_nl?: string
    brands?: string
    nutriscore_grade?: string
  }
}

export async function zoekOpenFoodFacts(code: string, signal?: AbortSignal): Promise<OFFProduct | null> {
  try {
    const url = `${BASIS}/${encodeURIComponent(code)}.json?fields=product_name,product_name_nl,brands,nutriscore_grade`
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as OFFAntwoord
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const naam = (p.product_name_nl || p.product_name || '').trim()
    if (!naam) return null
    const merk = (p.brands || '').split(',')[0].trim()
    const volledig = merk && !naam.toLowerCase().includes(merk.toLowerCase()) ? `${naam} (${merk})` : naam
    const nutri = p.nutriscore_grade && /^[a-e]$/i.test(p.nutriscore_grade) ? p.nutriscore_grade.toLowerCase() : undefined
    return { naam: volledig, ...(nutri ? { nutriScore: nutri } : {}) }
  } catch {
    // Offline, geblokkeerd of ongeldig antwoord: stil teruggeven, de scan valt dan
    // terug op wat lokaal onthouden is of op handmatig invullen.
    return null
  }
}
