import { describe, it, expect } from 'vitest'
import { pasToe } from './replay'
import type { Logregel } from './events'

function regel(over: Partial<Logregel> & { gebeurtenis: Logregel['gebeurtenis'] }): Logregel {
  return { id: Math.random().toString(36).slice(2), toestelId: 'A', volgnummer: 1, tijdstip: 1, ...over }
}

const tx = (id: string, omschrijving: string, bedrag: number) =>
  ({ id, datum: '2026-07-01', omschrijving, bedrag, rekeningId: 'r1' }) as const

describe('pasToe (samenvoegen / last-writer-wins)', () => {
  it('laat de laatste wijziging winnen (hoogste tijdstip)', () => {
    const regels: Logregel[] = [
      regel({ tijdstip: 1, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Oud', 100) } }),
      regel({ tijdstip: 2, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Nieuw', 200) } }),
    ]
    expect(pasToe(regels).transacties.get('t1')?.omschrijving).toBe('Nieuw')
  })

  it('een verwijdering na een toevoeging verwijdert het record', () => {
    const regels: Logregel[] = [
      regel({ tijdstip: 1, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'X', 100) } }),
      regel({ tijdstip: 2, gebeurtenis: { type: 'transactie.verwijderd', payload: { id: 't1' } } }),
    ]
    expect(pasToe(regels).transacties.has('t1')).toBe(false)
  })

  it('convergeert naar dezelfde staat, ongeacht de volgorde van binnenkomst', () => {
    const a = regel({ toestelId: 'A', tijdstip: 5, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Van A', 1) } })
    const b = regel({ toestelId: 'B', tijdstip: 9, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Van B', 2) } })
    expect(pasToe([a, b]).transacties.get('t1')?.omschrijving).toBe('Van B')
    expect(pasToe([b, a]).transacties.get('t1')?.omschrijving).toBe('Van B')
  })

  it('laat de causaal latere wijziging winnen, ook als haar wandklok achterloopt', () => {
    // Toestel X bewaart 'Eerst' met een HOGE wandklok (1000) maar een LAAG HLC-stempel (5).
    // Toestel Y had die wijziging al gezien en bewaart daarna 'Later' met een LAGERE
    // wandklok (50 — de klok van Y loopt achter) maar een HOGER HLC-stempel (6).
    const eerst = regel({
      toestelId: 'X',
      tijdstip: 1000,
      hlcL: 5,
      hlcC: 0,
      gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Eerst', 100) },
    })
    const later = regel({
      toestelId: 'Y',
      tijdstip: 50,
      hlcL: 6,
      hlcC: 0,
      gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Later', 200) },
    })
    // Op de pure wandklok zou 'Eerst' (1000) winnen — fout. Met de HLC wint 'Later' (6 > 5).
    expect(pasToe([eerst, later]).transacties.get('t1')?.omschrijving).toBe('Later')
    expect(pasToe([later, eerst]).transacties.get('t1')?.omschrijving).toBe('Later')
  })

  it('valt terug op tijdstip voor oude regels zonder HLC-stempel', () => {
    // Regels zonder hlcL/hlcC (bv. van vóór deze versie) moeten nog exact zoals
    // vroeger op tijdstip geordend worden.
    const oud = regel({ tijdstip: 1, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Oud', 1) } })
    const nieuw = regel({ tijdstip: 2, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Nieuw', 2) } })
    expect(pasToe([oud, nieuw]).transacties.get('t1')?.omschrijving).toBe('Nieuw')
  })
})
