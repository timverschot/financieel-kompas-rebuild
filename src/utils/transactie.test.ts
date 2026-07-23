import { describe, it, expect } from 'vitest'
import { categorieBedragen } from './transactie'
import type { Transactie } from '../data/schema'

const basis: Transactie = {
  id: 't1',
  datum: '2026-07-01',
  omschrijving: 'Colruyt',
  bedrag: -5000,
  rekeningId: 'r1',
}

describe('categorieBedragen', () => {
  it('geeft één regel voor een gewone transactie', () => {
    expect(categorieBedragen({ ...basis, categorieId: 'ov-voeding' })).toEqual([
      { categorieId: 'ov-voeding', bedrag: -5000 },
    ])
  })

  it('geeft de deelregels voor een gesplitste transactie', () => {
    const gesplitst: Transactie = {
      ...basis,
      regels: [
        { categorieId: 'ov-voeding', bedrag: -3000 },
        { categorieId: 'ov-huishouden-en-verzorging', bedrag: -2000 },
      ],
    }
    expect(categorieBedragen(gesplitst)).toEqual([
      { categorieId: 'ov-voeding', bedrag: -3000 },
      { categorieId: 'ov-huishouden-en-verzorging', bedrag: -2000 },
    ])
  })

  it('vult een niet-verdeeld restbedrag aan als zonder categorie', () => {
    const partieel: Transactie = {
      ...basis, // totaal -5000
      regels: [{ categorieId: 'ov-voeding', bedrag: -3000 }],
    }
    expect(categorieBedragen(partieel)).toEqual([
      { categorieId: 'ov-voeding', bedrag: -3000 },
      { categorieId: undefined, bedrag: -2000 },
    ])
  })
})
