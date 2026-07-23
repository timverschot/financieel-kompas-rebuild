import { describe, it, expect } from 'vitest'
import { INGEBOUWDE_CATEGORIEEN } from './ingebouwd'
import { PLATTE_ITEMS, itemPerId, zoekItems } from './zoek'

describe('ingebouwde categorieboom', () => {
  it('heeft 14 hoofdcategorieën', () => {
    expect(INGEBOUWDE_CATEGORIEEN).toHaveLength(14)
  })

  it('heeft uitsluitend unieke item-id\'s', () => {
    const ids = PLATTE_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('heeft voor elk item een geldig hoofdtype', () => {
    const geldig = new Set(['Vaste Uitgaven', 'Variabele Uitgaven', 'Sparen', 'Inkomsten'])
    expect(PLATTE_ITEMS.every((i) => geldig.has(i.hoofdtype))).toBe(true)
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
