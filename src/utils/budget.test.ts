import { describe, it, expect } from 'vitest'
import { uitgavenInMaand } from './budget'
import type { Transactie } from '../data/schema'

const tx = (over: Partial<Transactie>): Transactie => ({
  id: 'x',
  datum: '2026-07-05',
  omschrijving: 't',
  bedrag: -10,
  rekeningId: 'r1',
  ...over,
})

describe('uitgavenInMaand', () => {
  it('telt enkel uitgaven van de juiste categorie en maand', () => {
    const lijst = [
      tx({ id: 'a', bedrag: -100, categorieId: 'c1', datum: '2026-07-03' }),
      tx({ id: 'b', bedrag: -50, categorieId: 'c1', datum: '2026-07-20' }),
      tx({ id: 'c', bedrag: -999, categorieId: 'c2', datum: '2026-07-10' }), // andere categorie
      tx({ id: 'd', bedrag: -999, categorieId: 'c1', datum: '2026-06-30' }), // andere maand
      tx({ id: 'e', bedrag: 200, categorieId: 'c1', datum: '2026-07-15' }), // inkomst
    ]
    expect(uitgavenInMaand(lijst, 'c1', '2026-07')).toBe(150)
  })

  it('geeft 0 wanneer er niets past', () => {
    expect(uitgavenInMaand([], 'c1', '2026-07')).toBe(0)
  })

  it('telt enkel het deel van een gesplitste transactie dat bij de categorie hoort', () => {
    const gesplitst = tx({
      id: 's',
      datum: '2026-07-08',
      bedrag: -500,
      regels: [
        { categorieId: 'c1', bedrag: -300 },
        { categorieId: 'c2', bedrag: -200 },
      ],
    })
    expect(uitgavenInMaand([gesplitst], 'c1', '2026-07')).toBe(300)
    expect(uitgavenInMaand([gesplitst], 'c2', '2026-07')).toBe(200)
  })
})
