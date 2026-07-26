import { describe, it, expect } from 'vitest'
import { isOpenKost, kostenVoorAfrekening, kostIdsInOpenAfrekening } from './afrekening'
import type { GedeeldeKost, Verrekening } from '../data/schema'

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 100,
  betaaldDoor: 'jij',
  datum: '2026-07-15',
  ...over,
})

const afrekening = (over: Partial<Verrekening>): Verrekening => ({
  id: 'v',
  dossierId: 'd1',
  datum: '2026-07-26',
  bedrag: 0,
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
    const r = kostenVoorAfrekening(kosten, 'd1', { periodeVan: '2026-07-01', periodeTot: '2026-07-31' }, [])
    expect(r.map((k) => k.id)).toEqual(['b', 'c'])
  })

  it('filtert op kind en houdt kosten zonder kind erbij (standaard)', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', { kindIds: ['kind2'] }, [])
    expect(r.map((k) => k.id)).toEqual(['b', 'c'])
  })

  it('laat kosten zonder kind weg als je daar expliciet voor kiest', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', { kindIds: ['kind2'], zonderKindMeetellen: false }, [])
    expect(r.map((k) => k.id)).toEqual(['b'])
  })

  it('houdt kosten zonder kind erbij wanneer dat expliciet aan staat', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', { kindIds: ['kind1'], zonderKindMeetellen: true }, [])
    expect(r.map((k) => k.id)).toEqual(['a', 'c'])
  })

  it('de kind-keuze doet niets zolang er geen kinderen gekozen zijn', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', { zonderKindMeetellen: false }, [])
    expect(r.map((k) => k.id)).toEqual(['a', 'b', 'c'])
  })

  it('laat afgerekende kosten en andere dossiers weg', () => {
    const r = kostenVoorAfrekening(kosten, 'd1', {}, [])
    expect(r.map((k) => k.id)).toEqual(['a', 'b', 'c'])
  })

  it('slaat kosten over die al in een nog niet overgemaakte afrekening zitten', () => {
    const verrekeningen = [afrekening({ id: 'v1', kostIds: ['a', 'b'], overgemaakt: false })]
    const r = kostenVoorAfrekening(kosten, 'd1', {}, verrekeningen)
    expect(r.map((k) => k.id)).toEqual(['c'])
  })

  it('een reeds overgemaakte afrekening blokkeert niets extra', () => {
    const verrekeningen = [afrekening({ id: 'v1', kostIds: ['a'], overgemaakt: true })]
    const r = kostenVoorAfrekening(kosten, 'd1', {}, verrekeningen)
    expect(r.map((k) => k.id)).toEqual(['a', 'b', 'c'])
  })

  it('een afrekening van een ander dossier blokkeert niets', () => {
    const verrekeningen = [afrekening({ id: 'v1', dossierId: 'ander', kostIds: ['a', 'b'] })]
    const r = kostenVoorAfrekening(kosten, 'd1', {}, verrekeningen)
    expect(r.map((k) => k.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('kostIdsInOpenAfrekening', () => {
  it('verzamelt de kosten uit alle open afrekeningen van dat dossier', () => {
    const ids = kostIdsInOpenAfrekening(
      [
        afrekening({ id: 'v1', kostIds: ['a', 'b'] }),
        afrekening({ id: 'v2', kostIds: ['b', 'c'] }),
        afrekening({ id: 'v3', kostIds: ['d'], overgemaakt: true }),
        afrekening({ id: 'v4', dossierId: 'ander', kostIds: ['e'] }),
      ],
      'd1',
    )
    expect([...ids].sort()).toEqual(['a', 'b', 'c'])
  })

  it('geeft een lege verzameling zonder afrekeningen', () => {
    expect(kostIdsInOpenAfrekening([], 'd1').size).toBe(0)
  })
})
