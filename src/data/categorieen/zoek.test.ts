import { describe, it, expect, afterEach } from 'vitest'
import { INGEBOUWDE_CATEGORIEEN } from './ingebouwd'
import { PLATTE_ITEMS, itemPerId, zoekItems, stelSubcategorieenIn } from './zoek'

describe('ingebouwde categorieboom', () => {
  it('heeft 14 hoofdcategorieën', () => {
    expect(INGEBOUWDE_CATEGORIEEN).toHaveLength(14)
  })

  it('heeft uitsluitend unieke item-id\'s', () => {
    const ids = PLATTE_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Elke hoofdcategorie droeg vroeger een etiket 'Vaste Uitgaven' /
  // 'Variabele Uitgaven'. Dat is in ronde 23 geschrapt: er werd nergens mee
  // gerekend, en het was inhoudelijk fout — een lamp kopen viel onder "Woning en
  // vaste lasten" en gold dus als vaste last, tanken onder "Vervoer en Mobiliteit"
  // idem. Of iets vastligt, bepaalt de gebruiker per contract (TerugkerendePost),
  // niet de categorie waarin het valt.
  it('draagt geen vast/variabel-etiket meer', () => {
    expect(INGEBOUWDE_CATEGORIEEN.every((h) => !('hoofdtype' in h))).toBe(true)
    expect(PLATTE_ITEMS.every((i) => !('hoofdtype' in i))).toBe(true)
  })
})

describe('itemPerId', () => {
  it('vindt een bestaand item met al zijn context', () => {
    const item = itemPerId('i-brood--wit-9238')
    expect(item?.naam).toBe('Brood (wit)')
    expect(item?.hoofdNaam).toBe('Voeding')
    expect(item?.categorieNaam).toBe('Broodwaren')
  })

  it('geeft undefined voor een onbekende id', () => {
    expect(itemPerId('bestaat-niet')).toBeUndefined()
  })
})

describe('zoekItems', () => {
  it('geeft niets terug bij een lege zoekterm', () => {
    expect(zoekItems('')).toEqual([])
  })

  it('vindt items op naam', () => {
    const namen = zoekItems('brood').map((i) => i.naam)
    expect(namen).toContain('Brood (wit)')
  })

  it('zet een exacte/begint-met match vooraan', () => {
    const eerste = zoekItems('melk')[0]
    expect(eerste.naam.toLowerCase().startsWith('melk')).toBe(true)
  })

  it('vindt ook op synoniem (pampers -> Luiers)', () => {
    const namen = zoekItems('pampers').map((i) => i.naam)
    expect(namen).toContain('Luiers')
  })

  it('respecteert de limiet', () => {
    expect(zoekItems('e', 5).length).toBeLessThanOrEqual(5)
  })
})

describe('gebruikersaanpassingen (register)', () => {
  afterEach(() => stelSubcategorieenIn([])) // register terugzetten naar de basis

  it('vindt een toegevoegde subcategorie via zoeken en via id', () => {
    stelSubcategorieenIn([{ id: 'x1', naam: 'Kefir', categorieId: 'cat-zuivel-en-kaas' }])
    expect(itemPerId('x1')?.hoofdNaam).toBe('Voeding')
    expect(zoekItems('kefir').map((i) => i.naam)).toContain('Kefir')
  })

  it('toont een hernoeming van een ingebouwd item', () => {
    stelSubcategorieenIn([{ id: 'i-eieren-4688', naam: 'Bio-eieren', categorieId: 'cat-zuivel-en-kaas' }])
    expect(itemPerId('i-eieren-4688')?.naam).toBe('Bio-eieren')
  })
})
