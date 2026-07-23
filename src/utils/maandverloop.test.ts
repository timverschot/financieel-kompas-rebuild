import { describe, it, expect } from 'vitest'
import { uitgavenPerMaand, verschuifMaand } from './maandverloop'
import type { Transactie } from '../data/schema'

const tx = (over: Partial<Transactie>): Transactie => ({
  id: 'x',
  datum: '2026-07-05',
  omschrijving: 't',
  bedrag: -100,
  rekeningId: 'r1',
  ...over,
})

describe('verschuifMaand', () => {
  it('gaat correct over een jaargrens', () => {
    expect(verschuifMaand('2026-01', -1)).toBe('2025-12')
    expect(verschuifMaand('2026-12', 1)).toBe('2027-01')
  })
})

describe('uitgavenPerMaand', () => {
  it('geeft de laatste maanden, oudste eerst, met de juiste totalen', () => {
    const lijst = [
      tx({ id: 'a', datum: '2026-05-10', bedrag: -100 }),
      tx({ id: 'b', datum: '2026-07-03', bedrag: -300 }),
      tx({ id: 'c', datum: '2026-07-20', bedrag: -200 }),
      tx({ id: 'd', datum: '2026-07-15', bedrag: 500 }), // inkomst telt niet mee
    ]
    const r = uitgavenPerMaand(lijst, '2026-07', 3)
    expect(r).toEqual([
      { maand: '2026-05', bedrag: 100 },
      { maand: '2026-06', bedrag: 0 },
      { maand: '2026-07', bedrag: 500 },
    ])
  })
})
