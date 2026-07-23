import { describe, it, expect } from 'vitest'
import { groepVanCategorie, labelVanCategorie } from './resolve'

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
    expect(g).toEqual({ sleutel: 'cat-eigen', naam: 'Mijn categorie', kleur: null })
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
