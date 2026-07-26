import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { BESPARINGSDOMEINEN, domeinVanCategorie, uitgavenPerBesparingsdomein } from './besparen'

// Echte id's uit de ingebouwde boom (data/categorieen/ingebouwd.ts). Ze staan
// hier bewust letterlijk: zou er ooit een id verdwijnen, dan faalt deze test —
// wat precies de bedoeling is.
const ITEM_BROOD = 'i-brood--wit-9238' // Voeding > Broodwaren
const HOOFD_VOEDING = 'ov-voeding'
const CAT_ENERGIE = 'cat-energie-en-nutsvoorzieningen'
const CAT_VERZEKERINGEN = 'cat-verzekeringen'

function tx(datum: string, bedrag: number, categorieId?: string): Transactie {
  return { id: `t-${datum}-${bedrag}-${categorieId ?? 'x'}`, datum, omschrijving: 'x', bedrag, rekeningId: 'r1', categorieId }
}

describe('domeinVanCategorie', () => {
  it('rolt een ingebouwd item op naar zijn domein', () => {
    expect(domeinVanCategorie(ITEM_BROOD)).toBe('boodschappen')
  })

  it('herkent een hoofdcategorie', () => {
    expect(domeinVanCategorie(HOOFD_VOEDING)).toBe('boodschappen')
  })

  it('herkent een mid-categorie die zelf een domein is', () => {
    expect(domeinVanCategorie(CAT_ENERGIE)).toBe('energie')
    expect(domeinVanCategorie(CAT_VERZEKERINGEN)).toBe('verzekeringen')
  })

  it('geeft null voor geen, onbekende of eigen categorieën', () => {
    expect(domeinVanCategorie(undefined)).toBeNull()
    expect(domeinVanCategorie('eigen-categorie-van-timothy')).toBeNull()
    expect(domeinVanCategorie('ov-huisdieren')).toBeNull()
  })
})

describe('uitgavenPerBesparingsdomein', () => {
  it('geeft altijd alle vier de domeinen terug, in vaste volgorde', () => {
    const uit = uitgavenPerBesparingsdomein([], {})
    expect(uit.map((d) => d.sleutel)).toEqual(['boodschappen', 'energie', 'telecom', 'verzekeringen'])
    expect(uit.every((d) => d.bedrag === 0)).toBe(true)
    expect(uit).toHaveLength(BESPARINGSDOMEINEN.length)
  })

  it('telt uitgaven op per domein', () => {
    const uit = uitgavenPerBesparingsdomein(
      [tx('2026-07-02', -5000, ITEM_BROOD), tx('2026-07-03', -12000, CAT_ENERGIE), tx('2026-07-04', -2500, HOOFD_VOEDING)],
      {},
    )
    const perSleutel = Object.fromEntries(uit.map((d) => [d.sleutel, d.bedrag]))
    expect(perSleutel.boodschappen).toBe(7500)
    expect(perSleutel.energie).toBe(12000)
    expect(perSleutel.telecom).toBe(0)
  })

  it('negeert inkomsten', () => {
    const uit = uitgavenPerBesparingsdomein([tx('2026-07-02', 5000, ITEM_BROOD)], {})
    expect(uit.find((d) => d.sleutel === 'boodschappen')!.bedrag).toBe(0)
  })

  it('houdt zich aan de periode', () => {
    const transacties = [tx('2026-06-30', -5000, ITEM_BROOD), tx('2026-07-02', -3000, ITEM_BROOD)]
    const uit = uitgavenPerBesparingsdomein(transacties, { van: '2026-07-01', tot: '2026-07-31' })
    expect(uit.find((d) => d.sleutel === 'boodschappen')!.bedrag).toBe(3000)
  })

  it('splitst een gesplitst kassaticket uit over de domeinen', () => {
    const ticket: Transactie = {
      id: 'ticket',
      datum: '2026-07-04',
      omschrijving: 'Colruyt',
      bedrag: -8000,
      rekeningId: 'r1',
      regels: [
        { bedrag: -6000, categorieId: ITEM_BROOD },
        { bedrag: -2000, categorieId: 'ov-huisdieren' },
      ],
    }
    const uit = uitgavenPerBesparingsdomein([ticket], {})
    // Alleen de € 60 broodregel hoort bij boodschappen — niet de hele € 80.
    expect(uit.find((d) => d.sleutel === 'boodschappen')!.bedrag).toBe(6000)
  })

  it('draagt voor elk domein een kleur mee, uit hetzelfde object als het bedrag', () => {
    const uit = uitgavenPerBesparingsdomein([], {})
    expect(uit.every((d) => /^#[0-9A-F]{6}$/i.test(d.kleur))).toBe(true)
  })
})
