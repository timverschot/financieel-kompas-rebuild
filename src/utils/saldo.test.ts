import { describe, it, expect } from 'vitest'
import { saldoOpDatum, totaalSaldoVan } from './saldo'
import type { Overboeking, Rekening, Transactie } from '../data/schema'

const rekeningen: Rekening[] = [
  { id: 'betaal', naam: 'Betaalrekening', beginsaldo: 100_00 },
  { id: 'spaar', naam: 'Spaarrekening', beginsaldo: 0 },
]

const transacties: Transactie[] = [
  { id: 't1', datum: '2026-07-05', omschrijving: 'Loon', bedrag: 2_000_00, rekeningId: 'betaal' },
  { id: 't2', datum: '2026-07-10', omschrijving: 'Huur', bedrag: -900_00, rekeningId: 'betaal' },
  { id: 't3', datum: '2026-12-01', omschrijving: 'Later', bedrag: -50_00, rekeningId: 'betaal' },
]

const overboekingen: Overboeking[] = [
  { id: 'o1', datum: '2026-07-15', vanRekeningId: 'betaal', naarRekeningId: 'spaar', bedrag: 500_00 },
]

describe('saldo', () => {
  it('telt beginsaldo, transacties én overboekingen mee', () => {
    // 100 + 2000 - 900 - 500 (overgeboekt naar spaar) = 700
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, '2026-07-31')).toBe(700_00)
    // De spaarrekening krijgt de overboeking erbij: dit is precies het geval waar
    // een spaardoel vroeger op nul bleef staan.
    expect(saldoOpDatum('spaar', 0, transacties, overboekingen, '2026-07-31')).toBe(500_00)
  })

  it('laat alles na de opgegeven dag buiten beschouwing', () => {
    // De transactie van december telt nog niet mee eind juli.
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, '2026-07-31')).toBe(700_00)
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, '2026-12-31')).toBe(650_00)
  })

  it('telt zonder datumgrens alles mee', () => {
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen)).toBe(650_00)
  })

  it('laat een overboeking het totale vermogen ongemoeid', () => {
    const zonder = totaalSaldoVan(rekeningen, transacties, [], '2026-07-31')
    const met = totaalSaldoVan(rekeningen, transacties, overboekingen, '2026-07-31')
    expect(met).toBe(zonder)
    expect(met).toBe(1_200_00) // 100 + 2000 - 900
  })
})
