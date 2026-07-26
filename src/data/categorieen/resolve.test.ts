import { describe, it, expect } from 'vitest'
import { groepVanCategorie, labelVanCategorie, padVanCategorie } from './resolve'

const eigen = [{ id: 'cat-eigen', naam: 'Mijn categorie' }]

describe('groepVanCategorie', () => {
  it('rolt een ingebouwd item op naar zijn hoofdcategorie', () => {
    const g = groepVanCategorie('i-brood--wit-9238', [])
    expect(g.sleutel).toBe('ov-voeding')
    expect(g.naam).toBe('Voeding')
    expect(g.kleur).toBeTruthy()
  })

  it('houdt een hoofdcategorie als haar eigen groep', () => {
    const g = groepVanCategorie('ov-drank', [])
    expect(g.sleutel).toBe('ov-drank')
    expect(g.naam).toBe('Drank')
  })

  it('behoudt een eigen (gebruiker-)categorie', () => {
    const g = groepVanCategorie('cat-eigen', eigen)
    // Een eigen categorie heeft geen kleur en geen icoon: die bestaan enkel op de
    // ingebouwde hoofdcategorieën.
    expect(g).toEqual({ sleutel: 'cat-eigen', naam: 'Mijn categorie', kleur: null, icoon: null })
  })

  it('geeft "Zonder categorie" bij geen id', () => {
    expect(groepVanCategorie(undefined, []).naam).toBe('Zonder categorie')
  })

  it('geeft "Onbekend" bij een onbekende id', () => {
    expect(groepVanCategorie('bestaat-niet', []).naam).toBe('Onbekend')
  })
})

describe('labelVanCategorie', () => {
  it('toont het specifieke item-niveau', () => {
    expect(labelVanCategorie('i-brood--wit-9238', [])).toBe('Brood (wit)')
  })

  it('toont de hoofdcategorie-naam', () => {
    expect(labelVanCategorie('ov-voeding', [])).toBe('Voeding')
  })

  it('toont de naam van een eigen categorie', () => {
    expect(labelVanCategorie('cat-eigen', eigen)).toBe('Mijn categorie')
  })

  it('geeft undefined zonder id', () => {
    expect(labelVanCategorie(undefined, [])).toBeUndefined()
  })
})

// Ronde 24: in de transactielijst staat de categorie als pad, zodat je weet waar
// "Brood (wit)" of "Persoonlijke verzorging" onder valt.
describe('padVanCategorie', () => {
  it('zet een item onder zijn hoofdcategorie', () => {
    expect(padVanCategorie('i-brood--wit-9238', [])).toBe('Voeding › Brood (wit)')
  })

  it('geeft een hoofdcategorie gewoon haar eigen naam — er is niets boven', () => {
    expect(padVanCategorie('ov-voeding', [])).toBe('Voeding')
  })

  it('geeft een eigen categorie haar eigen naam', () => {
    expect(padVanCategorie('eigen-1', [{ id: 'eigen-1', naam: 'Hobby' }])).toBe('Hobby')
  })

  it('geeft niets zonder categorie', () => {
    expect(padVanCategorie(undefined, [])).toBeUndefined()
  })
})

// --- Ronde 27: de middenlaag rolt op naar haar hoofdcategorie ---
describe('groepVanCategorie op de middenlaag', () => {
  it('rolt een ingebouwde middencategorie op naar haar hoofdcategorie', () => {
    // Hierdoor kan een vaste last of een boeking rechtstreeks op "Elektriciteit"
    // staan zonder uit de grafieken te vallen — vóór ronde 27 gaf dit 'Onbekend'.
    expect(groepVanCategorie('cat-broodwaren', []).sleutel).toBe('ov-voeding')
    expect(groepVanCategorie('cat-broodwaren', []).naam).toBe('Voeding')
  })

  it('geeft de middencategorie haar eigen naam als label, en het pad met de ouder', () => {
    expect(labelVanCategorie('cat-broodwaren', [])).toBe('Broodwaren')
    expect(padVanCategorie('cat-broodwaren', [])).toBe('Voeding › Broodwaren')
  })
})
