import { describe, it, expect } from 'vitest'
import { saldoVerrekening } from './dossier'
import type { GedeeldeKost } from '../data/schema'

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 100,
  betaaldDoor: 'jij',
  datum: '2026-07-01',
  ...over,
})

describe('saldoVerrekening', () => {
  it('partner is jou zijn aandeel verschuldigd wanneer jij betaalde (50/50)', () => {
    expect(saldoVerrekening(50, [kost({ bedrag: 100, betaaldDoor: 'jij' })])).toBe(50)
  })

  it('jij bent jouw aandeel verschuldigd wanneer de partner betaalde (50/50)', () => {
    expect(saldoVerrekening(50, [kost({ bedrag: 100, betaaldDoor: 'partner' })])).toBe(-50)
  })

  it('verrekent meerdere kosten samen met een niet-gelijke sleutel', () => {
    // aandeelJij 30%: jij betaalt 200 (partner is jou 70% = 140 verschuldigd),
    // partner betaalt 100 (jij bent 30% = 30 verschuldigd) -> netto 140 - 30 = 110
    const netto = saldoVerrekening(30, [
      kost({ id: 'a', bedrag: 200, betaaldDoor: 'jij' }),
      kost({ id: 'b', bedrag: 100, betaaldDoor: 'partner' }),
    ])
    expect(netto).toBeCloseTo(110)
  })

  it('geeft 0 zonder kosten', () => {
    expect(saldoVerrekening(50, [])).toBe(0)
  })
})
