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

// ---------------------------------------------------------------------------
// Zoeken op NAAM in plaats van op streepjescode (ronde 45)
//
// Waarom dit erbij komt. Op een iPhone is de camera de zwakke schakel: Safari
// heeft geen ingebouwde streepjescodelezer, dus de app moet elk beeld zelf
// ontcijferen, en dat lukt niet altijd. Maar de gegevens die we uit de camera
// halen — productnaam en Nutri-Score — zijn ook op naam op te zoeken. Wie
// "choco" typt, heeft de camera helemaal niet nodig.
//
// Dit is de klassieke zoek-URL van Open Food Facts (`/cgi/search.pl`). De v2-API
// heeft geen vrije tekstzoekopdracht; deze wel, en ze is publiek en zonder sleutel.
// ---------------------------------------------------------------------------

export type OFFTreffer = OFFProduct & { code: string }

/**
 * Is dit een streepjescode zoals ze op een winkelproduct staat?
 *
 * 8, 12, 13 of 14 cijfers (EAN-8, UPC-A, EAN-13, ITF-14). Alles daarbuiten is een
 * typfout, en die meteen melden is vriendelijker dan een opzoeking die stil niets
 * vindt. Spaties tellen niet mee: wie een lange code overtikt, groepeert vanzelf.
 */
export function geldigeStreepjescode(tekst: string): boolean {
  const cijfers = tekst.replace(/\s/g, '')
  return /^\d+$/.test(cijfers) && [8, 12, 13, 14].includes(cijfers.length)
}

// Dezelfde drie databanken als bij het opzoeken op code. Nu de knop bij élke
// boeking staat en niet meer alleen bij een kassaticket, zou alleen in voeding
// zoeken de belofte breder maken dan de dekking: "shampoo" of "boormachine" gaf
// dan "niets gevonden" terwijl het product gewoon in een zusterdatabank staat.
const ZOEK_BRONNEN = [
  'https://world.openfoodfacts.org/cgi/search.pl',
  'https://world.openbeautyfacts.org/cgi/search.pl',
  'https://world.openproductsfacts.org/cgi/search.pl',
]

/** Minimum aantal letters vóór we het net op gaan. Korter geeft alleen ruis. */
export const ZOEK_VANAF_LETTERS = 3

type OFFZoekAntwoord = {
  products?: {
    code?: string
    product_name?: string
    product_name_nl?: string
    brands?: string
    nutriscore_grade?: string
  }[]
}

// Maakt van één ruw product uit de databank een bruikbare treffer, of null.
// Bewust dezelfde regels als bij een scan: de Nederlandse naam wint, het merk komt
// erbij als het er nog niet in staat, en een Nutri-Score telt alleen als ze een
// letter a-e is.
function naarTreffer(p: NonNullable<OFFZoekAntwoord['products']>[number]): OFFTreffer | null {
  const code = (p.code || '').trim()
  const naam = (p.product_name_nl || p.product_name || '').trim()
  if (!code || !naam) return null
  const merk = (p.brands || '').split(',')[0].trim()
  const volledig = merk && !naam.toLowerCase().includes(merk.toLowerCase()) ? `${naam} (${merk})` : naam
  const nutri = p.nutriscore_grade && /^[a-e]$/i.test(p.nutriscore_grade) ? p.nutriscore_grade.toLowerCase() : undefined
  return { code, naam: volledig, ...(nutri ? { nutriScore: nutri } : {}) }
}

/**
 * Zoekt producten op naam in de voedingsdatabank. Geeft een lege lijst bij een
 * te korte term, offline, of wanneer er niets gevonden is — nooit een fout, want
 * dit is een hulpje en geen kritieke stap.
 *
 * Alleen de zoekterm gaat over de lijn. Geen bedragen, geen namen, geen locatie.
 */
export async function zoekProductenOpNaam(term: string, aantal = 8, signal?: AbortSignal): Promise<OFFTreffer[]> {
  const t = term.trim()
  if (t.length < ZOEK_VANAF_LETTERS) return []
  const vraag = `search_terms=${encodeURIComponent(t)}&search_simple=1&action=process&json=1` +
    `&page_size=${aantal}&fields=code,product_name,product_name_nl,brands,nutriscore_grade`
  // Voeding eerst: dat is de grootste databank en de enige met een Nutri-Score.
  // Pas wanneer die niets oplevert, gaan we bij de zusters kijken — zo kost een
  // gewone zoekopdracht één verzoek en geen drie.
  for (const basis of ZOEK_BRONNEN) {
    try {
      const res = await fetch(`${basis}?${vraag}`, { signal })
      if (!res.ok) continue
      const data = (await res.json()) as OFFZoekAntwoord
      const uit: OFFTreffer[] = []
      const gezien = new Set<string>()
      for (const p of data.products ?? []) {
        const treffer = naarTreffer(p)
        // De databank bevat dezelfde naam soms tientallen keren (per land, per
        // verpakking). Twintig keer "Choco" in een keuzelijst helpt niemand.
        if (!treffer || gezien.has(treffer.naam.toLowerCase())) continue
        gezien.add(treffer.naam.toLowerCase())
        uit.push(treffer)
      }
      if (uit.length > 0) return uit
    } catch {
      // Offline of afgebroken: geen enkele bron zal nog antwoorden.
      return []
    }
  }
  return []
}

