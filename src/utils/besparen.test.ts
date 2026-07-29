import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { BESPARINGSDOMEINEN, domeinVanCategorie, uitgavenPerBesparingsdomein, vergelijkBesparingsdomeinen, naamVanBesparingsdomein } from './besparen'

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

// Ronde 31: een bedrag alleen zegt niets. Pas een vergelijking met de vorige even
// lange periode maakt er informatie van waar je iets mee kan.
describe('vergelijkBesparingsdomeinen', () => {
  const juli = { van: '2026-07-01', tot: '2026-07-31' }
  const juni = { van: '2026-06-01', tot: '2026-06-30' }
  const energie = (datum: string, centen: number): Transactie => ({
    id: `e-${datum}`,
    datum,
    omschrijving: 'x',
    bedrag: -centen,
    rekeningId: 'r1',
    categorieId: 'cat-energie-en-nutsvoorzieningen',
  })

  function domein(uit: ReturnType<typeof vergelijkBesparingsdomeinen>, sleutel: string) {
    return uit.find((d) => d.sleutel === sleutel)!
  }

  it('rekent het verschil en het percentage uit', () => {
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 12000), energie('2026-06-03', 8000)], juli, juni)
    const e = domein(uit, 'energie')
    expect(e.bedrag).toBe(12000)
    expect(e.vorig).toBe(8000)
    expect(e.verschil).toBe(4000)
    expect(e.procent).toBe(50)
  })

  it('meldt een daling met een negatief verschil', () => {
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 6000), energie('2026-06-03', 8000)], juli, juni)
    expect(domein(uit, 'energie').verschil).toBe(-2000)
    expect(domein(uit, 'energie').procent).toBe(-25)
  })

  it('zwijgt over het percentage wanneer er vorige periode niets was', () => {
    // "Oneindig procent meer" is geen bruikbaar getal; dan tonen we enkel het bedrag.
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 6000)], juli, juni)
    expect(domein(uit, 'energie').verschil).toBe(6000)
    expect(domein(uit, 'energie').procent).toBeNull()
  })

  it('geeft geen vergelijking wanneer er geen vorige periode is', () => {
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 6000)], juli, null)
    expect(domein(uit, 'energie').bedrag).toBe(6000)
    expect(domein(uit, 'energie').vorig).toBeNull()
    expect(domein(uit, 'energie').verschil).toBeNull()
  })

  it('houdt de vaste volgorde van de vier domeinen aan', () => {
    const uit = vergelijkBesparingsdomeinen([], juli, juni)
    expect(uit.map((d) => d.sleutel)).toEqual(['boodschappen', 'energie', 'telecom', 'verzekeringen'])
  })
})

// --- Ronde 40: het domeinfilter in de transactielijst heeft een naam nodig -----

describe('naamVanBesparingsdomein', () => {
  it('geeft de naam van een bestaand domein', () => {
    expect(naamVanBesparingsdomein('boodschappen')).toBe('Boodschappen')
    expect(naamVanBesparingsdomein('energie')).toBe('Energie')
  })

  it('geeft null bij een onbekende sleutel, zodat de aanroeper zelf kan terugvallen', () => {
    expect(naamVanBesparingsdomein('bestaat-niet')).toBeNull()
  })

  it('haalt de naam uit dezelfde tabel als de rekenkern', () => {
    // Eén bron: zo kan de chip in de transactielijst niet uit de pas lopen met het
    // bedrag op de kaart "Waar loopt het op?".
    for (const d of BESPARINGSDOMEINEN) expect(naamVanBesparingsdomein(d.sleutel)).toBe(d.naam)
  })
})
