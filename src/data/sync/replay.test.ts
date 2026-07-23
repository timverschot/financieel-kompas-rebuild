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
})
