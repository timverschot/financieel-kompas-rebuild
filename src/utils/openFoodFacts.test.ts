import { describe, it, expect, vi, afterEach } from 'vitest'
import { zoekOpenFoodFacts, zoekProduct, zoekProductenOpNaam } from './openFoodFacts'

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

// Zoeken op NAAM in plaats van op streepjescode (ronde 45). Op een iPhone heeft
// Safari geen ingebouwde streepjescodelezer, dus de camera is daar de zwakke
// schakel — en dezelfde gegevens zijn ook op naam op te halen.
describe('zoekProductenOpNaam', () => {
  function nepAntwoord(producten: unknown[]) {
    return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: producten }) })
  }

  it('geeft niets terug bij een te korte term, zonder het net op te gaan', async () => {
    const fetchMock = nepAntwoord([])
    vi.stubGlobal('fetch', fetchMock)
    expect(await zoekProductenOpNaam('ch')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('zet naam, merk en Nutri-Score om, net als bij een scan', async () => {
    vi.stubGlobal(
      'fetch',
      nepAntwoord([{ code: '123', product_name_nl: 'Choco', brands: 'Kwatta', nutriscore_grade: 'D' }]),
    )
    expect(await zoekProductenOpNaam('choco')).toEqual([{ code: '123', naam: 'Choco (Kwatta)', nutriScore: 'd' }])
  })

  it('gooit dezelfde naam maar één keer in de lijst', async () => {
    // De databank bevat dezelfde naam soms tientallen keren (per land, per
    // verpakking). Twintig keer "Choco" in een keuzelijst helpt niemand.
    vi.stubGlobal(
      'fetch',
      nepAntwoord([
        { code: '1', product_name: 'Choco' },
        { code: '2', product_name: 'choco' },
        { code: '3', product_name: 'Choco light' },
      ]),
    )
    const uit = await zoekProductenOpNaam('choco')
    expect(uit.map((p) => p.naam)).toEqual(['Choco', 'Choco light'])
  })

  it('laat een product zonder naam of zonder code weg', async () => {
    vi.stubGlobal('fetch', nepAntwoord([{ code: '1' }, { product_name: 'Naamloos' }, { code: '2', product_name: 'Melk' }]))
    expect(await zoekProductenOpNaam('melk')).toEqual([{ code: '2', naam: 'Melk' }])
  })

  it('geeft een lege lijst wanneer de opzoeking mislukt', async () => {
    // Offline of geblokkeerd: dit is een hulpje, geen kritieke stap.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await zoekProductenOpNaam('melk')).toEqual([])
  })

  it('stuurt alleen de zoekterm mee', async () => {
    const fetchMock = nepAntwoord([])
    vi.stubGlobal('fetch', fetchMock)
    await zoekProductenOpNaam('volle melk')
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('search_terms=volle%20melk')
    expect(url).toContain('openfoodfacts.org')
  })

  it('kijkt ook in de zusterdatabanken wanneer voeding niets oplevert', async () => {
    // Sinds de knop bij élke boeking staat, is "shampoo" een normale zoekterm.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ products: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ products: [{ code: '7', product_name: 'Shampoo' }] }) })
    vi.stubGlobal('fetch', fetchMock)
    expect(await zoekProductenOpNaam('shampoo')).toEqual([{ code: '7', naam: 'Shampoo' }])
    expect(String(fetchMock.mock.calls[1][0])).toContain('openbeautyfacts')
  })

  it('kost één verzoek wanneer voeding meteen antwoordt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ products: [{ code: '1', product_name: 'Melk' }] }) })
    vi.stubGlobal('fetch', fetchMock)
    await zoekProductenOpNaam('melk')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
