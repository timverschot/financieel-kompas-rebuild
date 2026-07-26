import { describe, it, expect } from 'vitest'
import { vertaal, vertaalSleutels } from './i18n'

describe('vertaal', () => {
  it('geeft de Nederlandse sleutel ongewijzigd terug voor taal nl', () => {
    expect(vertaal('nl', 'Rekeningen')).toBe('Rekeningen')
  })

  it('vertaalt naar het Engels en Frans wanneer de vertaling bestaat', () => {
    expect(vertaal('en', 'Rekeningen')).toBe('Accounts')
    expect(vertaal('fr', 'Budgetten')).toBe('Budgets')
  })

  it('valt terug op het Nederlands als een vertaling nog ontbreekt', () => {
    expect(vertaal('en', 'Een niet-vertaalde tekst')).toBe('Een niet-vertaalde tekst')
    expect(vertaal('fr', 'Een niet-vertaalde tekst')).toBe('Een niet-vertaalde tekst')
  })

  it('vult parameters in de tekst in', () => {
    expect(vertaal('nl', 'Verwijder rekening {naam}', { naam: 'Zicht' })).toBe('Verwijder rekening Zicht')
  })

  it('laat een onbekende parameter-plaatshouder ongemoeid', () => {
    expect(vertaal('nl', 'Hallo {x}')).toBe('Hallo {x}')
  })
})

// Drietalig blijven vraagt discipline: een sleutel die je alleen in het Engels
// invult, geeft in het Frans stille Nederlandse tekst. Deze test merkt dat op.
describe('vertaaltabellen', () => {
  it('heeft voor elke Engelse sleutel ook een Franse, en omgekeerd', () => {
    const en = new Set(vertaalSleutels('en'))
    const fr = new Set(vertaalSleutels('fr'))
    expect([...en].filter((k) => !fr.has(k))).toEqual([])
    expect([...fr].filter((k) => !en.has(k))).toEqual([])
  })

  it('vertaalt de nieuwe teksten van ronde 21', () => {
    expect(vertaal('en', 'Vaste last')).toBe('Fixed cost')
    expect(vertaal('fr', 'Sparen')).toBe('Épargner')
    expect(vertaal('en', 'Opslaan + volgende')).toBe('Save + next')
    expect(vertaal('fr', 'Wat wil je boeken?')).toBe('Que voulez-vous enregistrer ?')
  })

  it('vertaalt de nieuwe teksten van ronde 22', () => {
    expect(vertaal('en', 'Meer opties')).toBe('More options')
    expect(vertaal('fr', 'Minder opties')).toBe("Moins d'options")
    expect(vertaal('en', 'Delen in een dossier (optioneel)')).toBe('Share in a case (optional)')
    expect(vertaal('fr', 'Niet delen')).toBe('Ne pas partager')
    expect(vertaal('en', 'Meer opties ({n} ingevuld)', { n: 2 })).toBe('More options (2 filled in)')
  })

  it('vertaalt de nieuwe teksten van ronde 18', () => {
    expect(vertaal('en', 'Op schema')).toBe('On track')
    expect(vertaal('fr', 'Achter op schema')).toBe('En retard')
    expect(vertaal('en', '{n} maanden buffer', { n: '5,2' })).toBe('5,2 months of buffer')
    expect(vertaal('fr', 'Vorige keer bij deze handelaar:')).toBe('La dernière fois chez ce commerçant :')
  })

  it('vertaalt de nieuwe teksten van ronde 17', () => {
    expect(vertaal('en', 'Je gegevens en je privacy')).toBe('Your data and your privacy')
    expect(vertaal('fr', 'Waar kan je besparen?')).toBe('Où pouvez-vous économiser ?')
    expect(vertaal('en', 'Budget {naam} is {pct}% verbruikt', { naam: 'Food', pct: 92 })).toBe('Budget Food is 92% used')
    expect(vertaal('fr', 'Overschot')).toBe('Excédent')
  })
})
