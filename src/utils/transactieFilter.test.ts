import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { filterTransacties, heeftActiefFilter, grensDatumMaandenTerug } from './transactieFilter'

const tx = (extra: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-06-01',
  omschrijving: 'Winkel',
  bedrag: -1000,
  rekeningId: 'r1',
  ...extra,
})

describe('filterTransacties', () => {
  const lijst = [
    tx({ id: '1', omschrijving: 'Colruyt', bedrag: -5000, datum: '2026-01-10', rekeningId: 'r1', categorieId: 'i-brood--wit-9238' }),
    tx({ id: '2', omschrijving: 'Loon', bedrag: 200000, datum: '2026-02-01', rekeningId: 'r2' }),
    tx({ id: '3', omschrijving: 'Delhaize', bedrag: -3000, datum: '2026-03-15', rekeningId: 'r1' }),
  ]

  it('filtert op richting inkomst/uitgave', () => {
    expect(filterTransacties(lijst, { richting: 'in' }).map((t) => t.id)).toEqual(['2'])
    expect(filterTransacties(lijst, { richting: 'uit' }).map((t) => t.id)).toEqual(['1', '3'])
  })

  it('filtert op rekening', () => {
    expect(filterTransacties(lijst, { rekeningId: 'r2' }).map((t) => t.id)).toEqual(['2'])
  })

  it('filtert op periode (van/tot, inclusief)', () => {
    expect(filterTransacties(lijst, { van: '2026-02-01', tot: '2026-03-31' }).map((t) => t.id)).toEqual(['2', '3'])
  })

  it('zoekt in de omschrijving (hoofdletterongevoelig)', () => {
    expect(filterTransacties(lijst, { zoek: 'colr' }).map((t) => t.id)).toEqual(['1'])
  })

  it('filtert op hoofdcategorie via het item (brood -> Voeding)', () => {
    // i-brood--wit-9238 rolt op naar hoofdcategorie ov-voeding.
    expect(filterTransacties(lijst, { hoofdId: 'ov-voeding' }).map((t) => t.id)).toEqual(['1'])
  })

  it('combineert filters (AND)', () => {
    expect(filterTransacties(lijst, { richting: 'uit', rekeningId: 'r1', van: '2026-03-01' }).map((t) => t.id)).toEqual(['3'])
  })
})

describe('heeftActiefFilter', () => {
  it('is onwaar bij een leeg filter', () => {
    expect(heeftActiefFilter({})).toBe(false)
    expect(heeftActiefFilter({ zoek: '  ' })).toBe(false)
  })

  it('is waar zodra er iets ingesteld is', () => {
    expect(heeftActiefFilter({ richting: 'in' })).toBe(true)
    expect(heeftActiefFilter({ zoek: 'x' })).toBe(true)
  })
})

describe('grensDatumMaandenTerug', () => {
  it('geeft de eerste dag van de maand, n maanden terug (n telt de huidige maand mee)', () => {
    // 6 maanden terug vanaf juni 2026 = januari 2026.
    expect(grensDatumMaandenTerug('2026-06-15', 6)).toBe('2026-01-01')
  })

  it('werkt over de jaargrens', () => {
    expect(grensDatumMaandenTerug('2026-02-10', 6)).toBe('2025-09-01')
  })
})
