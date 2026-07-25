import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { filterTransacties, heeftActiefFilter, grensDatumMaandenTerug, isOmgekeerdBereik } from './transactieFilter'

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

  it('kijkt bij richting naar de deelregels, niet naar het totaal', () => {
    // Kassaticket van −50€ met een statiegeldregel van +3€: dat is tegelijk een
    // uitgave én (voor 3€) een inkomst. Vroeger verdween dit ticket volledig
    // onder 'Inkomsten', terwijl de Analyse die 3€ wél als inkomst toonde.
    const ticket = tx({
      id: 'ticket',
      omschrijving: 'Colruyt',
      bedrag: -4700,
      regels: [{ bedrag: -5000 }, { bedrag: 300, omschrijving: 'statiegeld' }],
    })
    expect(filterTransacties([ticket], { richting: 'in' }).map((t) => t.id)).toEqual(['ticket'])
    expect(filterTransacties([ticket], { richting: 'uit' }).map((t) => t.id)).toEqual(['ticket'])
  })

  it('laat een niet-gesplitste transactie zich exact gedragen als vroeger', () => {
    const nul = tx({ id: 'nul', bedrag: 0 })
    expect(filterTransacties([nul], { richting: 'in' })).toEqual([])
    expect(filterTransacties([nul], { richting: 'uit' })).toEqual([])
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

describe('isOmgekeerdBereik', () => {
  it('herkent een einddatum die vóór de begindatum ligt', () => {
    expect(isOmgekeerdBereik('2026-07-31', '2026-07-01')).toBe(true)
  })

  it('is onwaar bij een gewoon bereik, één dag, of een half ingevuld bereik', () => {
    expect(isOmgekeerdBereik('2026-07-01', '2026-07-31')).toBe(false)
    expect(isOmgekeerdBereik('2026-07-05', '2026-07-05')).toBe(false)
    expect(isOmgekeerdBereik('2026-07-05', undefined)).toBe(false)
    expect(isOmgekeerdBereik(undefined, '2026-07-05')).toBe(false)
    expect(isOmgekeerdBereik('', '')).toBe(false)
  })

  it('werkt over de jaargrens', () => {
    expect(isOmgekeerdBereik('2026-01-01', '2025-12-31')).toBe(true)
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
