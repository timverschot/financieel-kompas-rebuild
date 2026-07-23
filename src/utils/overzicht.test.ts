import { describe, it, expect } from 'vitest'
import { maandInkomsten, maandUitgaven, uitgavenPerCategorie } from './overzicht'
import type { Categorie, Transactie } from '../data/schema'

const tx = (over: Partial<Transactie>): Transactie => ({
  id: 'x',
  datum: '2026-07-05',
  omschrijving: 't',
  bedrag: -10,
  rekeningId: 'r1',
  ...over,
})

const categorieen: Categorie[] = [
  { id: 'c1', naam: 'Voeding' },
  { id: 'c2', naam: 'Wonen' },
]

const lijst: Transactie[] = [
  tx({ id: 'a', bedrag: 2000, datum: '2026-07-01' }), // inkomst juli
  tx({ id: 'b', bedrag: -300, categorieId: 'c1', datum: '2026-07-04' }),
  tx({ id: 'c', bedrag: -200, categorieId: 'c2', datum: '2026-07-10' }),
  tx({ id: 'd', bedrag: -100, datum: '2026-07-12' }), // zonder categorie
  tx({ id: 'e', bedrag: -999, datum: '2026-06-30' }), // andere maand
]

describe('maandoverzicht', () => {
  it('telt de inkomsten van de maand', () => {
    expect(maandInkomsten(lijst, '2026-07')).toBe(2000)
  })

  it('telt de uitgaven van de maand', () => {
    expect(maandUitgaven(lijst, '2026-07')).toBe(600)
  })

  it('splitst uitgaven per categorie uit, gesorteerd van groot naar klein', () => {
    const resultaat = uitgavenPerCategorie(lijst, categorieen, '2026-07')
    expect(resultaat).toEqual([
      { naam: 'Voeding', bedrag: 300, kleur: null },
      { naam: 'Wonen', bedrag: 200, kleur: null },
      { naam: 'Zonder categorie', bedrag: 100, kleur: null },
    ])
  })

  it('splitst een gesplitste transactie uit over de juiste categorieën', () => {
    const gesplitst: Transactie = {
      id: 's',
      datum: '2026-07-08',
      omschrijving: 'Colruyt',
      bedrag: -500,
      rekeningId: 'r1',
      regels: [
        { categorieId: 'c1', bedrag: -300 },
        { categorieId: 'c2', bedrag: -200 },
      ],
    }
    expect(uitgavenPerCategorie([gesplitst], categorieen, '2026-07')).toEqual([
      { naam: 'Voeding', bedrag: 300, kleur: null },
      { naam: 'Wonen', bedrag: 200, kleur: null },
    ])
  })
})
