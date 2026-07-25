import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { stijgersDalers, maandreeksPerHoofd } from './trends'

const VOEDING = 'ov-voeding'
const BROOD = 'i-brood--wit-9238'

function tx(id: string, datum: string, bedrag: number, categorieId?: string): Transactie {
  return { id, datum, omschrijving: '', bedrag, rekeningId: 'r', ...(categorieId ? { categorieId } : {}) }
}

describe('trends — stijgersDalers', () => {
  it('berekent het verschil per hoofdcategorie tussen twee periodes', () => {
    const txs = [
      tx('a', '2026-07-05', -500, BROOD), // juli: Voeding 500
      tx('b', '2026-06-05', -200, BROOD), // juni: Voeding 200
    ]
    const juli = { van: '2026-07-01', tot: '2026-07-31' }
    const juni = { van: '2026-06-01', tot: '2026-06-30' }
    const r = stijgersDalers(txs, [], juli, juni, 'uitgave')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ sleutel: VOEDING, huidig: 500, vorig: 200, delta: 300 })
  })

  it('sorteert op de grootte van de beweging en negeert dubbele nullen', () => {
    const txs = [tx('a', '2026-07-05', -1000, BROOD)]
    const juli = { van: '2026-07-01', tot: '2026-07-31' }
    const juni = { van: '2026-06-01', tot: '2026-06-30' }
    const r = stijgersDalers(txs, [], juli, juni, 'uitgave')
    expect(r[0].delta).toBe(1000) // nieuw in juli, was 0 in juni
  })
})

describe('trends — maandreeksPerHoofd', () => {
  it('geeft per hoofdcategorie het bedrag per maand in volgorde', () => {
    const txs = [
      tx('a', '2026-06-05', -200, BROOD),
      tx('b', '2026-07-05', -500, BROOD),
    ]
    const r = maandreeksPerHoofd(txs, [], ['2026-06', '2026-07'], 'uitgave')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ sleutel: VOEDING, waarden: [200, 500], totaal: 700 })
  })
})
