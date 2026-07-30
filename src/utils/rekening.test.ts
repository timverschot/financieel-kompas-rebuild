import { describe, it, expect } from 'vitest'
import type { Rekening } from '../data/schema'
import { nummerStaart, rekeningLabel, rekeningStandTekst } from './rekening'
import { formatEuro } from './format'
import { vertaal } from '../i18n'

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

describe('rekeningStandTekst', () => {
  const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)
  const kaart: Rekening = { id: 'k1', naam: 'Mastercard', type: 'krediet', beginsaldo: 0 }

  it('laat een gewone rekening gewoon haar bedrag houden', () => {
    const zicht: Rekening = { id: 'r1', naam: 'Zicht', type: 'betaal', beginsaldo: 0 }
    expect(rekeningStandTekst(t, zicht, -12345)).toBe(formatEuro(-12345))
    expect(rekeningStandTekst(t, zicht, 12345)).toBe(formatEuro(12345))
  })

  it('zegt bij een kaart wat er openstaat in plaats van een negatief saldo', () => {
    // "€ -1.631,00" in een keuzelijst leest als een fout, niet als een schuld.
    expect(rekeningStandTekst(t, kaart, -163100)).toBe(`${formatEuro(163100)} open`)
  })

  it('benoemt een tegoed op een kaart als tegoed', () => {
    expect(rekeningStandTekst(t, kaart, 5000)).toBe(`${formatEuro(5000)} tegoed`)
  })

  it('zegt bij nul dat er niets openstaat', () => {
    expect(rekeningStandTekst(t, kaart, 0)).toBe('niets open')
  })
})
