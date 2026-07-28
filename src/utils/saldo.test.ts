import { describe, it, expect } from 'vitest'
import { geldendeWaardering, saldoOpDatum, totaalSaldoVan } from './saldo'
import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'

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
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, [], '2026-07-31')).toBe(700_00)
    // De spaarrekening krijgt de overboeking erbij: dit is precies het geval waar
    // een spaardoel vroeger op nul bleef staan.
    expect(saldoOpDatum('spaar', 0, transacties, overboekingen, [], '2026-07-31')).toBe(500_00)
  })

  it('laat alles na de opgegeven dag buiten beschouwing', () => {
    // De transactie van december telt nog niet mee eind juli.
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, [], '2026-07-31')).toBe(700_00)
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, [], '2026-12-31')).toBe(650_00)
  })

  it('telt zonder datumgrens alles mee', () => {
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, [])).toBe(650_00)
  })

  it('laat een overboeking het totale vermogen ongemoeid', () => {
    const zonder = totaalSaldoVan(rekeningen, transacties, [], [], '2026-07-31')
    const met = totaalSaldoVan(rekeningen, transacties, overboekingen, [], '2026-07-31')
    expect(met).toBe(zonder)
    expect(met).toBe(1_200_00) // 100 + 2000 - 900
  })
})

// --- Waarderingen (ronde 38) -------------------------------------------------
//
// Een waardering is geen term in de som maar een nieuw vertrekpunt: "op deze dag
// stond er dit". Alles van vóór die dag zit er al in verwerkt.

const waarderingen: Waardering[] = [
  { id: 'w1', rekeningId: 'betaal', datum: '2026-07-08', saldo: 5_000_00 },
]

describe('saldo — waarderingen', () => {
  it('vertrekt vanaf de waardering in plaats van het beginsaldo', () => {
    // Op 8 juli staat er 5.000. Daarna nog: huur −900 (10 juli) en de overboeking
    // van 500 naar spaar (15 juli). Het loon van 5 juli zit al in de 5.000.
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, waarderingen, '2026-07-31')).toBe(3_600_00)
  })

  it('laat alles van vóór en óp de waarderingsdag buiten beschouwing', () => {
    // Een waardering op dezelfde dag als een boeking: die boeking zit er al in.
    const opHuurdag: Waardering[] = [{ id: 'w', rekeningId: 'betaal', datum: '2026-07-10', saldo: 1_000_00 }]
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, opHuurdag, '2026-07-31')).toBe(500_00)
  })

  it('negeert een waardering die na de opgevraagde dag ligt', () => {
    // Op 7 juli bestaat de waardering van 8 juli nog niet: gewoon het beginsaldo
    // plus het loon van 5 juli.
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, waarderingen, '2026-07-07')).toBe(2_100_00)
  })

  it('raakt een andere rekening niet aan', () => {
    expect(saldoOpDatum('spaar', 0, transacties, overboekingen, waarderingen, '2026-07-31')).toBe(500_00)
  })

  it('neemt de laatste waardering, en bij dezelfde dag de hoogste id', () => {
    const twee: Waardering[] = [
      { id: 'a', rekeningId: 'betaal', datum: '2026-07-08', saldo: 1_000_00 },
      { id: 'b', rekeningId: 'betaal', datum: '2026-07-08', saldo: 2_000_00 },
      { id: 'c', rekeningId: 'betaal', datum: '2026-07-02', saldo: 9_999_00 },
    ]
    // 2000 (id 'b' wint op dezelfde dag) − 900 huur − 500 overboeking
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, twee, '2026-07-31')).toBe(600_00)
  })

  it('aanvaardt een negatieve stand — een kredietrekening staat negatief', () => {
    const krediet: Waardering[] = [{ id: 'k', rekeningId: 'betaal', datum: '2026-07-20', saldo: -1_200_00 }]
    expect(saldoOpDatum('betaal', 100_00, transacties, overboekingen, krediet, '2026-07-31')).toBe(-1_200_00)
  })

  it('geldendeWaardering geeft niets terug zonder waardering voor die rekening', () => {
    expect(geldendeWaardering('spaar', waarderingen, '2026-07-31')).toBeUndefined()
    expect(geldendeWaardering('betaal', waarderingen, '2026-07-01')).toBeUndefined()
    expect(geldendeWaardering('betaal', waarderingen, '2026-07-31')?.id).toBe('w1')
  })

  it('telt het totaal met een waardering mee in totaalSaldoVan', () => {
    // betaal 3600 + spaar 500
    expect(totaalSaldoVan(rekeningen, transacties, overboekingen, waarderingen, '2026-07-31')).toBe(4_100_00)
  })
})
