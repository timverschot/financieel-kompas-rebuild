import { describe, it, expect } from 'vitest'
import { vervaldatum, dagenTussen, garantieStatus, STANDAARD_GARANTIE_MAANDEN } from './garantie'

describe('vervaldatum', () => {
  it('telt maanden op bij de aankoopdatum', () => {
    expect(vervaldatum('2026-01-15', 24)).toBe('2028-01-15')
  })

  it('klemt de dag op de laatste dag van de doelmaand', () => {
    expect(vervaldatum('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('werkt over een jaargrens', () => {
    expect(vervaldatum('2026-11-10', 3)).toBe('2027-02-10')
  })

  it('gebruikt 24 maanden als Belgische standaard', () => {
    expect(STANDAARD_GARANTIE_MAANDEN).toBe(24)
  })
})

describe('dagenTussen', () => {
  it('telt hele dagen', () => {
    expect(dagenTussen('2026-01-01', '2026-01-31')).toBe(30)
  })

  it('is negatief bij omgekeerde volgorde', () => {
    expect(dagenTussen('2026-02-01', '2026-01-01')).toBe(-31)
  })
})

describe('garantieStatus', () => {
  it('toont een nog geldige garantie met resterende tijd', () => {
    const s = garantieStatus('2026-01-01', 24, '2026-07-01')
    expect(s.vervaldatum).toBe('2028-01-01')
    expect(s.verlopen).toBe(false)
    expect(s.bijnaVerlopen).toBe(false)
    expect(s.maandenResterend).toBeGreaterThan(0)
  })

  it('markeert een verlopen garantie', () => {
    const s = garantieStatus('2020-01-01', 24, '2026-07-01')
    expect(s.verlopen).toBe(true)
    expect(s.dagenResterend).toBeLessThan(0)
    expect(s.maandenResterend).toBe(0)
  })

  it('waarschuwt wanneer de garantie bijna verloopt (binnen 60 dagen)', () => {
    // vervaldatum 2026-08-01, vandaag 2026-07-15 -> 17 dagen resterend.
    const s = garantieStatus('2024-08-01', 24, '2026-07-15')
    expect(s.verlopen).toBe(false)
    expect(s.bijnaVerlopen).toBe(true)
  })
})
