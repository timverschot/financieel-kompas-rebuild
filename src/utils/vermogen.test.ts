import { describe, it, expect } from 'vitest'
import type { Overboeking, Rekening, Transactie } from '../data/schema'
import { saldoOpEinde, vermogensEvolutie, laatsteMaanden } from './vermogen'

const rek = (id: string, beginsaldo: number): Rekening => ({ id, naam: id, beginsaldo })
const tx = (rekeningId: string, datum: string, bedrag: number): Transactie => ({
  id: `${rekeningId}-${datum}-${bedrag}`,
  datum,
  omschrijving: '',
  bedrag,
  rekeningId,
})
const ob = (van: string, naar: string, datum: string, bedrag: number): Overboeking => ({
  id: `${van}-${naar}-${datum}`,
  datum,
  vanRekeningId: van,
  naarRekeningId: naar,
  bedrag,
})

describe('vermogen — saldoOpEinde', () => {
  const txs = [tx('a', '2026-07-05', 5000), tx('a', '2026-07-20', -2000)]
  const obs = [ob('b', 'a', '2026-07-10', 3000), ob('a', 'c', '2026-07-15', 1000)]

  it('telt transacties en overboekingen t/m het maandeinde', () => {
    // 10000 + 5000 - 2000 + 3000 (in) - 1000 (uit) = 15000
    expect(saldoOpEinde('a', 10000, txs, obs, '2026-07')).toBe(15000)
  })

  it('negeert alles ná het maandeinde', () => {
    // Einde juni: nog niets gebeurd → enkel beginsaldo.
    expect(saldoOpEinde('a', 10000, txs, obs, '2026-06')).toBe(10000)
  })
})

describe('vermogen — vermogensEvolutie', () => {
  it('geeft per maand het saldo per rekening en het totaal', () => {
    const rekeningen = [rek('a', 10000), rek('b', 4000)]
    const txs = [tx('a', '2026-07-05', 5000)]
    const punten = vermogensEvolutie(rekeningen, txs, [], ['2026-06', '2026-07'])
    expect(punten[0]).toMatchObject({ maand: '2026-06', totaal: 14000 })
    expect(punten[1].perRekening.a).toBe(15000)
    expect(punten[1].totaal).toBe(19000)
  })
})

describe('vermogen — laatsteMaanden', () => {
  it('geeft oplopende maanden inclusief de huidige', () => {
    expect(laatsteMaanden('2026-07', 3)).toEqual(['2026-05', '2026-06', '2026-07'])
  })
  it('rolt correct over een jaargrens', () => {
    expect(laatsteMaanden('2026-01', 3)).toEqual(['2025-11', '2025-12', '2026-01'])
  })
})
