import { describe, it, expect } from 'vitest'
import type { Gezinslid } from '../data/schema'
import {
  ROL_SLEUTELS,
  actieveGezinsleden,
  heeftKiesbareLeden,
  naamVanPersoon,
  uitgavenPerPersoon,
  verdeelBedrag,
} from './persoon'

const leden: Gezinslid[] = [
  { id: 'p1', naam: 'Emma', rol: 'kind' },
  { id: 'p2', naam: 'Noah', rol: 'kind' },
  { id: 'p3', naam: 'Sofie', rol: 'partner', gearchiveerd: true },
]
const labels = { nietToegewezen: 'Niet toegewezen', onbekend: 'Onbekend' }
const som = (n: number[]) => n.reduce((s, x) => s + x, 0)

describe('naamVanPersoon', () => {
  it('geeft de naam van een bestaand lid', () => {
    expect(naamVanPersoon('p1', leden)).toBe('Emma')
  })

  it('geeft undefined bij een leeg of onbekend id', () => {
    expect(naamVanPersoon(undefined, leden)).toBeUndefined()
    expect(naamVanPersoon('', leden)).toBeUndefined()
    expect(naamVanPersoon('weg', leden)).toBeUndefined()
  })
})

describe('actieveGezinsleden', () => {
  it('laat gearchiveerde leden weg', () => {
    expect(actieveGezinsleden(leden).map((l) => l.naam)).toEqual(['Emma', 'Noah'])
  })

  it('geeft een lege lijst terug bij lege invoer', () => {
    expect(actieveGezinsleden([])).toEqual([])
  })
})

describe('heeftKiesbareLeden', () => {
  it('is waar zodra er een actief lid is', () => {
    expect(heeftKiesbareLeden(leden)).toBe(true)
  })

  it('is onwaar zonder leden of met enkel gearchiveerde leden', () => {
    expect(heeftKiesbareLeden([])).toBe(false)
    expect(heeftKiesbareLeden([{ id: 'p3', naam: 'Sofie', gearchiveerd: true }])).toBe(false)
  })

  it('blijft waar wanneer er al iemand gekozen is, ook al is die gearchiveerd', () => {
    expect(heeftKiesbareLeden([{ id: 'p3', naam: 'Sofie', gearchiveerd: true }], 'p3')).toBe(true)
  })
})

describe('ROL_SLEUTELS', () => {
  it('heeft een weergavenaam voor elke rol', () => {
    expect(ROL_SLEUTELS.kind).toBe('Kind')
    expect(ROL_SLEUTELS.partner).toBe('Partner')
    expect(ROL_SLEUTELS.ikzelf).toBe('Ikzelf')
    expect(ROL_SLEUTELS.ander).toBe('Ander')
  })
})

describe('verdeelBedrag', () => {
  it('verdeelt gelijk wanneer het opgaat', () => {
    expect(verdeelBedrag(1000, 2)).toEqual([500, 500])
  })

  it('geeft het restje aan het laatste deel, zodat de som exact klopt', () => {
    const delen = verdeelBedrag(1000, 3)
    expect(delen).toEqual([333, 333, 334])
    expect(som(delen)).toBe(1000)
  })

  it('houdt de som exact bij elk aantal delen', () => {
    for (let n = 1; n <= 9; n++) expect(som(verdeelBedrag(9999, n))).toBe(9999)
  })

  it('geeft een lege lijst bij nul of minder delen', () => {
    expect(verdeelBedrag(1000, 0)).toEqual([])
    expect(verdeelBedrag(1000, -2)).toEqual([])
  })
})

describe('uitgavenPerPersoon', () => {
  it('geeft een lege lijst bij lege invoer', () => {
    expect(uitgavenPerPersoon([], leden, labels)).toEqual([])
    expect(uitgavenPerPersoon([], [], labels)).toEqual([])
  })

  it('telt op per persoon en sorteert van groot naar klein', () => {
    const rijen = uitgavenPerPersoon(
      [
        { bedrag: 1000, persoonIds: ['p1'] },
        { bedrag: 500, persoonIds: ['p2'] },
        { bedrag: 250, persoonIds: ['p1'] },
      ],
      leden,
      labels,
    )
    expect(rijen).toEqual([
      { id: 'p1', naam: 'Emma', bedrag: 1250 },
      { id: 'p2', naam: 'Noah', bedrag: 500 },
    ])
  })

  it('verdeelt een gedeelde post gelijk over de personen', () => {
    const rijen = uitgavenPerPersoon([{ bedrag: 1000, persoonIds: ['p1', 'p2'] }], leden, labels)
    expect(rijen.map((r) => r.bedrag)).toEqual([500, 500])
  })

  it('houdt het totaal exact bij een deling die niet opgaat', () => {
    const rijen = uitgavenPerPersoon([{ bedrag: 1000, persoonIds: ['p1', 'p2', 'p3'] }], leden, labels)
    expect(som(rijen.map((r) => r.bedrag))).toBe(1000)
    expect(rijen.map((r) => r.bedrag).sort((a, b) => a - b)).toEqual([333, 333, 334])
  })

  it('telt dezelfde persoon binnen één post maar één keer', () => {
    const rijen = uitgavenPerPersoon([{ bedrag: 1000, persoonIds: ['p1', 'p1'] }], leden, labels)
    expect(rijen).toEqual([{ id: 'p1', naam: 'Emma', bedrag: 1000 }])
  })

  it('zet posten zonder personen onder Niet toegewezen, altijd onderaan', () => {
    const rijen = uitgavenPerPersoon(
      [
        { bedrag: 300, persoonIds: ['p1'] },
        { bedrag: 900 },
        { bedrag: 100, persoonIds: [] },
      ],
      leden,
      labels,
    )
    expect(rijen).toEqual([
      { id: 'p1', naam: 'Emma', bedrag: 300 },
      { id: null, naam: 'Niet toegewezen', bedrag: 1000 },
    ])
  })

  it('laat het bedrag van een verdwenen lid niet stil vallen', () => {
    const rijen = uitgavenPerPersoon([{ bedrag: 400, persoonIds: ['weg'] }], leden, labels)
    expect(rijen).toEqual([{ id: 'weg', naam: 'Onbekend', bedrag: 400 }])
  })

  it('bewaart het volledige totaal over alle regels heen', () => {
    const posten = [
      { bedrag: 1000, persoonIds: ['p1', 'p2'] },
      { bedrag: 777, persoonIds: ['p1', 'p2', 'p3'] },
      { bedrag: 55 },
    ]
    const rijen = uitgavenPerPersoon(posten, leden, labels)
    expect(som(rijen.map((r) => r.bedrag))).toBe(1832)
  })
})
