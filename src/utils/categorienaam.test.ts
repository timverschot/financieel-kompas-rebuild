import { describe, it, expect } from 'vitest'
import { categorienaam } from './categorienaam'
import { vertaal } from '../i18n'

// Ronde 108. Een Frans jaarrapport toonde Franse kolomkoppen en Franse bedragen, met
// daartussen de Nederlandse woorden "Zonder categorie" en "Onbekend".

const fr = (s: string, p?: Record<string, string | number>) => vertaal('fr', s, p)
const en = (s: string, p?: Record<string, string | number>) => vertaal('en', s, p)

describe('categorienaam', () => {
  it('vertaalt de twee woorden van de app zelf', () => {
    expect(categorienaam(fr, 'Zonder categorie')).toBe('Sans catégorie')
    expect(categorienaam(fr, 'Onbekend')).toBe('Inconnu')
    expect(categorienaam(en, 'Zonder categorie')).toBe('Uncategorised')
    expect(categorienaam(en, 'Onbekend')).toBe('Unknown')
  })

  it('laat een echte categorienaam met rust', () => {
    // ⚠ DE TEGENCONTROLE, en ze is het halve punt: de namen van de ingebouwde categorieën
    // zijn in deze app app-breed Nederlands, ook op het scherm, en een eigen categorie is de
    // tekst die de gebruiker zelf tikte. Zou deze functie álles door de vertaaltabel halen,
    // dan zou een eigen categorie die toevallig "Datum" heet in het Frans "Date" worden.
    expect(categorienaam(fr, 'Diensten en Ontwikkeling')).toBe('Diensten en Ontwikkeling')
    expect(categorienaam(fr, 'Datum')).toBe('Datum')
    expect(categorienaam(en, 'Voeding')).toBe('Voeding')
  })

  it('laat een lege naam leeg', () => {
    expect(categorienaam(fr, '')).toBe('')
  })
})
