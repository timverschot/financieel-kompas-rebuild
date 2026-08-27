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

  it('deelt niet door maanden waarin de app nog niet bestond (ronde 106)', () => {
    // Het venster is altijd zes maanden breed. Eén boeking van € 1.800 in juli, bekeken in
    // augustus: het gemiddelde deelde door maart t/m juli en gaf € 360,00 — een stippellijn
    // op een vijfde van de enige echte maand.
    const nieuw = [
      { maand: '2026-03', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-04', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-05', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-06', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-07', inkomsten: 0, uitgaven: 180000 },
      { maand: '2026-08', inkomsten: 0, uitgaven: 5000 },
    ]
    expect(gemiddeldeVolleMaanden(nieuw, '2026-08')).toEqual({ inkomsten: 0, uitgaven: 180000 })
  })

  it('telt een lege maand MIDDENIN je historiek wel gewoon mee', () => {
    // De tegencontrole: augustus zonder boekingen is een maand waarin je werkelijk niets
    // uitgaf, en die hoort het gemiddelde te drukken. Alleen de maanden vóór je eerste
    // boeking vallen weg.
    const metGat = [
      { maand: '2026-05', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-06', inkomsten: 0, uitgaven: 120000 },
      { maand: '2026-07', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-08', inkomsten: 0, uitgaven: 60000 },
      { maand: '2026-09', inkomsten: 0, uitgaven: 3000 },
    ]
    // juni, juli en augustus: (120000 + 0 + 60000) / 3.
    expect(gemiddeldeVolleMaanden(metGat, '2026-09')).toEqual({ inkomsten: 0, uitgaven: 60000 })
  })

  it('geeft null wanneer er buiten de lopende maand nog niets geboekt is', () => {
    const alleenNu = [
      { maand: '2026-07', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-08', inkomsten: 0, uitgaven: 5000 },
    ]
    expect(gemiddeldeVolleMaanden(alleenNu, '2026-08')).toBeNull()
  })

  it('telt maanden die nog moeten komen niet mee (ronde 110)', () => {
    // ⚠ RONDE 110. Blader je met "›" naar een maand die nog moet komen, dan schuift het venster
    // van zes maanden mee de toekomst in. Die lege maanden telden als volwaardige maanden: één
    // keer duwen maakte van "gemiddeld € 2.000 uitgaven" € 1.333.
    const vooruit = [
      { maand: '2026-06', inkomsten: 300000, uitgaven: 200000 },
      { maand: '2026-07', inkomsten: 300000, uitgaven: 200000 },
      { maand: '2026-08', inkomsten: 300000, uitgaven: 200000 },
      { maand: '2026-09', inkomsten: 0, uitgaven: 0 },
      { maand: '2026-10', inkomsten: 0, uitgaven: 0 },
    ]
    // Vandaag is augustus 2026: juni en juli tellen, augustus is nog niet af, en september en
    // oktober bestaan nog niet.
    expect(gemiddeldeVolleMaanden(vooruit, '2026-08')).toEqual({ inkomsten: 300000, uitgaven: 200000 })
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
