import { describe, it, expect, vi, afterEach } from 'vitest'
import { zoekOpenFoodFacts, zoekProduct } from './openFoodFacts'

function res(data: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 404, json: async () => data } as unknown as Response
}

const nietGevonden = { status: 0 }

describe('zoekOpenFoodFacts', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('geeft naam en Nutri-Score terug bij een gevonden product', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ status: 1, product: { product_name: 'Choco', nutriscore_grade: 'e' } })))
    expect(await zoekOpenFoodFacts('123')).toEqual({ naam: 'Choco', nutriScore: 'e' })
  })

  it('verkiest de Nederlandse naam en voegt het merk toe', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ status: 1, product: { product_name: 'Cola', product_name_nl: 'Frisdrank', brands: 'Merk X, Ander' } })))
    expect(await zoekOpenFoodFacts('123')).toEqual({ naam: 'Frisdrank (Merk X)' })
  })

  it('geeft null bij een niet-gevonden product (status 0)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ status: 0 })))
    expect(await zoekOpenFoodFacts('000')).toBeNull()
  })

  it('geeft null bij een netwerkfout (offline)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await zoekOpenFoodFacts('123')).toBeNull()
  })

  it('negeert een ongeldige Nutri-Score', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res({ status: 1, product: { product_name: 'X', nutriscore_grade: 'unknown' } })))
    expect(await zoekOpenFoodFacts('123')).toEqual({ naam: 'X' })
  })
})

describe('zoekProduct (alle Open-databanken)', () => {
  afterEach(() => vi.unstubAllGlobals())

  // Antwoordt per databank op basis van het domein in de URL.
  function stub(map: { voeding?: unknown; beauty?: unknown; producten?: unknown }) {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('openfoodfacts.org')) return res(map.voeding ?? nietGevonden)
      if (url.includes('openbeautyfacts.org')) return res(map.beauty ?? nietGevonden)
      if (url.includes('openproductsfacts.org')) return res(map.producten ?? nietGevonden)
      return res(nietGevonden)
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('vindt voeding meteen en stopt daar (één oproep)', async () => {
    const f = stub({ voeding: { status: 1, product: { product_name: 'Yoghurt', nutriscore_grade: 'b' } } })
    expect(await zoekProduct('123')).toEqual({ naam: 'Yoghurt', nutriScore: 'b' })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('valt terug op de beauty-databank voor verzorgingsproducten (geen Nutri-Score)', async () => {
    const f = stub({ beauty: { status: 1, product: { product_name: 'Shampoo' } } })
    expect(await zoekProduct('123')).toEqual({ naam: 'Shampoo' })
    expect(f).toHaveBeenCalledTimes(2) // voeding (mis) -> beauty (treffer)
  })

  it('valt terug op de algemene producten-databank', async () => {
    const f = stub({ producten: { status: 1, product: { product_name: 'Vaatwastabletten' } } })
    expect(await zoekProduct('123')).toEqual({ naam: 'Vaatwastabletten' })
    expect(f).toHaveBeenCalledTimes(3)
  })

  it('geeft null als geen enkele databank het product kent', async () => {
    stub({})
    expect(await zoekProduct('000')).toBeNull()
  })
})
