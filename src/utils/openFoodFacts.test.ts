import { describe, it, expect, vi, afterEach } from 'vitest'
import { zoekOpenFoodFacts } from './openFoodFacts'

function res(data: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 404, json: async () => data } as unknown as Response
}

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
