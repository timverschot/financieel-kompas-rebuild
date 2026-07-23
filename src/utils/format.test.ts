import { describe, it, expect } from 'vitest'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from './format'

describe('formatEuro', () => {
  it('toont centen als eurobedrag (950 centen -> 9,50)', () => {
    expect(formatEuro(-950)).toContain('9,50')
  })

  it('toont een groot bedrag met duizendtal (123456 centen -> 1.234,56)', () => {
    expect(formatEuro(123456)).toContain('1.234,56')
  })
})

describe('invoerNaarCenten', () => {
  it('leest een komma-bedrag in als centen', () => {
    expect(invoerNaarCenten('12,50')).toBe(1250)
  })

  it('leest ook een punt-bedrag in als centen', () => {
    expect(invoerNaarCenten('12.5')).toBe(1250)
  })

  it('geeft NaN bij ongeldige invoer', () => {
    expect(Number.isNaN(invoerNaarCenten('abc'))).toBe(true)
  })
})

describe('centenNaarInvoer', () => {
  it('toont centen als bewerkbare invoerstring met twee decimalen', () => {
    expect(centenNaarInvoer(1250)).toBe('12,50')
    expect(centenNaarInvoer(1200)).toBe('12,00')
  })
})
