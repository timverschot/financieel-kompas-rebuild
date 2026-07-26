import { describe, it, expect } from 'vitest'
import { gemiddeldeVolleMaanden, inkomstenUitgavenPerMaand, uitgavenPerMaand, verschuifMaand } from './maandverloop'
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

// Ronde 31: de maandgrafiek toonde alleen uitgaven. Zes kale staafjes zonder
// bedrag zeggen niet of je die maand overhield — daarvoor heb je beide reeksen
// nodig.
describe('inkomstenUitgavenPerMaand', () => {
  const lijst = [
    tx({ id: 'a', datum: '2026-06-10', bedrag: -10000 }),
    tx({ id: 'b', datum: '2026-06-25', bedrag: 200000 }),
    tx({ id: 'c', datum: '2026-07-03', bedrag: -30000 }),
    tx({ id: 'd', datum: '2026-07-25', bedrag: 240000 }),
  ]

  it('geeft per maand wat er binnenkwam en wat eruit ging, oudste eerst', () => {
    expect(inkomstenUitgavenPerMaand(lijst, '2026-07', 3)).toEqual([
      { maand: '2026-05', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-06', inkomsten: 200000, uitgaven: 10000 },
      { maand: '2026-07', inkomsten: 240000, uitgaven: 30000 },
    ])
  })
})

describe('gemiddeldeVolleMaanden', () => {
  const reeks = [
    { maand: '2026-05', inkomsten: 200000, uitgaven: 100000 },
    { maand: '2026-06', inkomsten: 200000, uitgaven: 140000 },
    { maand: '2026-07', inkomsten: 50000, uitgaven: 20000 },
  ]

  it('laat de lopende maand buiten het gemiddelde', () => {
    // Zou juli meetellen, dan zakte het gemiddelde van € 1.200 naar € 866 —
    // precies omdat die maand nog niet af is. De lat zou dus elke maand opnieuw
    // verlaagd worden door een halve maand.
    expect(gemiddeldeVolleMaanden(reeks, '2026-07')).toEqual({ inkomsten: 200000, uitgaven: 120000 })
  })

  it('rondt af op hele centen', () => {
    const r = [
      { maand: '2026-05', inkomsten: 0, uitgaven: 100 },
      { maand: '2026-06', inkomsten: 0, uitgaven: 101 },
      { maand: '2026-07', inkomsten: 0, uitgaven: 0 },
    ]
    expect(gemiddeldeVolleMaanden(r, '2026-07')?.uitgaven).toBe(101)
  })

  it('zwijgt wanneer er geen enkele volle maand is', () => {
    expect(gemiddeldeVolleMaanden([{ maand: '2026-07', inkomsten: 1, uitgaven: 1 }], '2026-07')).toBeNull()
  })
})
