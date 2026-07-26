import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { bouwHandelaarIndex, normaliseerHandelaar, voorstelCategorie } from './categorieVoorstel'

function tx(id: string, datum: string, omschrijving: string, categorieId?: string, regels?: Transactie['regels']): Transactie {
  return {
    id,
    datum,
    omschrijving,
    bedrag: -1000,
    rekeningId: 'r1',
    ...(categorieId ? { categorieId } : {}),
    ...(regels ? { regels } : {}),
  }
}

describe('normaliseerHandelaar', () => {
  it('negeert hoofdletters, spaties eromheen en dubbele spaties', () => {
    expect(normaliseerHandelaar('  COLRUYT   Halle ')).toBe('colruyt halle')
    expect(normaliseerHandelaar('Colruyt')).toBe(normaliseerHandelaar('colruyt'))
  })
})

describe('bouwHandelaarIndex', () => {
  it('onthoudt de categorie van de laatste boeking per handelaar', () => {
    const index = bouwHandelaarIndex([
      tx('t1', '2026-05-01', 'Colruyt', 'ov-voeding'),
      tx('t2', '2026-06-01', 'Colruyt', 'ov-drank'),
    ])
    expect(index.get('colruyt')).toBe('ov-drank')
  })

  it('hangt niet af van de volgorde waarin de transacties aankomen', () => {
    const a = bouwHandelaarIndex([tx('t2', '2026-06-01', 'Colruyt', 'ov-drank'), tx('t1', '2026-05-01', 'Colruyt', 'ov-voeding')])
    expect(a.get('colruyt')).toBe('ov-drank')
  })

  it('slaat transacties zonder categorie over', () => {
    const index = bouwHandelaarIndex([tx('t1', '2026-05-01', 'Onbekend')])
    expect(index.has('onbekend')).toBe(false)
  })

  it('slaat gesplitste kassatickets over — die hebben geen enkele juiste categorie', () => {
    const index = bouwHandelaarIndex([
      tx('t1', '2026-06-01', 'Colruyt', 'ov-voeding', [
        { bedrag: -600, categorieId: 'ov-voeding' },
        { bedrag: -400, categorieId: 'ov-drank' },
      ]),
    ])
    expect(index.has('colruyt')).toBe(false)
  })

  it('laat een oudere gewone boeking wél staan naast een nieuwer ticket', () => {
    // Het ticket wordt overgeslagen, dus de gewone boeking van mei blijft het voorstel.
    const index = bouwHandelaarIndex([
      tx('t1', '2026-05-01', 'Colruyt', 'ov-voeding'),
      tx('t2', '2026-06-01', 'Colruyt', 'ov-drank', [
        { bedrag: -600, categorieId: 'ov-voeding' },
        { bedrag: -400, categorieId: 'ov-drank' },
      ]),
    ])
    expect(index.get('colruyt')).toBe('ov-voeding')
  })

  it('slaat een lege omschrijving over', () => {
    const index = bouwHandelaarIndex([tx('t1', '2026-05-01', '   ', 'ov-voeding')])
    expect(index.size).toBe(0)
  })
})

describe('voorstelCategorie', () => {
  const index = bouwHandelaarIndex([
    tx('t1', '2026-05-01', 'Colruyt', 'ov-voeding'),
    tx('t2', '2026-05-02', 'Q8', 'ov-vervoer-en-mobiliteit'),
  ])

  it('vindt de categorie ongeacht hoofdletters of spaties', () => {
    expect(voorstelCategorie(' colruyt ', index)).toBe('ov-voeding')
    expect(voorstelCategorie('Q8', index)).toBe('ov-vervoer-en-mobiliteit')
  })

  it('geeft null voor een onbekende of lege handelaar', () => {
    expect(voorstelCategorie('Delhaize', index)).toBeNull()
    expect(voorstelCategorie('', index)).toBeNull()
    expect(voorstelCategorie('   ', index)).toBeNull()
  })
})
