import { describe, it, expect } from 'vitest'
import { isOpenKost, kostenVoorAfrekening } from './afrekening'
import type { GedeeldeKost } from '../data/schema'

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 100,
  betaaldDoor: 'jij',
  datum: '2026-07-15',
  ...over,
})

describe('isOpenKost', () => {
  it('een gewone kost is open', () => {
    expect(isOpenKost(kost({}))).toBe(true)
  })
  it('een afgerekende kost is niet open', () => {
    expect(isOpenKost(kost({ afgerekend: true }))).toBe(false)
  })
  it('een oude vergrendelde kost (verrekeningId) telt als afgerekend', () => {
    expect(isOpenKost(kost({ verrekeningId: 'v1' }))).toBe(false)
  })
})

describe('kostenVoorAfrekening', () => {
  const kosten: GedeeldeKost[] = [
    kost({ id: 'a', datum: '2026-06-10', kindIds: ['kind1'] }),
    kost({ id: 'b', datum: '2026-07-15', kindIds: ['kind2'] }),
    kost({ id: 'c', datum: '2026-07-20' }), // geen kind
    kost({ id: 'd', datum: '2026-07-25', afgerekend: true }), // al afgerekend
    kost({ id: 'e', datum: '2026-08-01', dossierId: 'ander' }), // ander dossier
  ]

  it('filtert op periode', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', { periodeVan: '2026-07-01', periodeTot: '2026-07-31' })
    expect(r.map((k) => k.id)).toEqual(['b', 'c'])
  })

  it('filtert op kind', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', { kindIds: ['kind2'] })
    expect(r.map((k) => k.id)).toEqual(['b'])
  })

  it('laat afgerekende kosten en andere dossiers weg', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', {})
    expect(r.map((k) => k.id)).toEqual(['a', 'b', 'c'])
  })
})
