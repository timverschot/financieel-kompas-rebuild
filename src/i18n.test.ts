import { describe, it, expect } from 'vitest'
import { vertaal } from './i18n'

describe('vertaal', () => {
  it('geeft de Nederlandse sleutel ongewijzigd terug voor taal nl', () => {
    expect(vertaal('nl', 'Rekeningen')).toBe('Rekeningen')
  })

  it('valt terug op het Nederlands als een vertaling nog ontbreekt', () => {
    expect(vertaal('en', 'Rekeningen')).toBe('Rekeningen')
    expect(vertaal('fr', 'Budgetten')).toBe('Budgetten')
  })

  it('vult parameters in de tekst in', () => {
    expect(vertaal('nl', 'Verwijder rekening {naam}', { naam: 'Zicht' })).toBe('Verwijder rekening Zicht')
  })

  it('laat een onbekende parameter-plaatshouder ongemoeid', () => {
    expect(vertaal('nl', 'Hallo {x}')).toBe('Hallo {x}')
  })
})
