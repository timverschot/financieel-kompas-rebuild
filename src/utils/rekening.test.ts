import { describe, it, expect } from 'vitest'
import type { Rekening } from '../data/schema'
import { nummerStaart, rekeningLabel } from './rekening'

const basis: Rekening = { id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }

describe('nummerStaart', () => {
  it('geeft de laatste vier tekens', () => {
    expect(nummerStaart('BE68539007547034')).toBe('7034')
  })

  it('negeert spaties in het nummer', () => {
    expect(nummerStaart('BE68 5390 0754 7034')).toBe('7034')
  })

  it('zwijgt bij een leeg of te kort nummer', () => {
    expect(nummerStaart(undefined)).toBeNull()
    expect(nummerStaart('')).toBeNull()
    expect(nummerStaart('123')).toBeNull()
  })
})

describe('rekeningLabel', () => {
  it('toont enkel de naam wanneer er niets anders ingevuld is', () => {
    expect(rekeningLabel(basis)).toBe('Betaalrekening')
  })

  it('zet de rubriek erachter', () => {
    // Precies waar het om ging: twee rekeningen die allebei "Betaalrekening"
    // heten, waren in een keuzelijst niet uit elkaar te houden.
    expect(rekeningLabel({ ...basis, rubriek: 'KBC' })).toBe('Betaalrekening · KBC')
  })

  it('zet de laatste vier cijfers van het rekeningnummer erachter', () => {
    expect(rekeningLabel({ ...basis, rekeningnummer: 'BE68 5390 0754 7034' })).toBe('Betaalrekening · …7034')
  })

  it('zet naam, rubriek en nummer in die volgorde', () => {
    const r: Rekening = { ...basis, rubriek: 'KBC', rekeningnummer: 'BE68539007547034' }
    expect(rekeningLabel(r)).toBe('Betaalrekening · KBC · …7034')
  })

  it('toont nooit het volledige rekeningnummer', () => {
    const r: Rekening = { ...basis, rekeningnummer: 'BE68539007547034' }
    expect(rekeningLabel(r)).not.toContain('BE68')
  })
})
