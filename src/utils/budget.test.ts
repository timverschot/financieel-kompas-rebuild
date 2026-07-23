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
    ]
    expect(uitgavenInMaand(lijst, 'c1', '2026-07')).toBe(150)
  })

  it('een terugbetaling (positieve regel) in dezelfde categorie verlaagt het verbruik', () => {
    const lijst = [
      tx({ id: 'a', bedrag: -300, categorieId: 'c1', datum: '2026-07-03' }),
      tx({ id: 'b', bedrag: 100, categorieId: 'c1', datum: '2026-07-10' }), // terugbetaling
    ]
    expect(uitgavenInMaand(lijst, 'c1', '2026-07')).toBe(200)
  })

  it('gaat nooit onder nul, ook al is er meer terugbetaald dan uitgegeven', () => {
    const lijst = [
      tx({ id: 'a', bedrag: -100, categorieId: 'c1', datum: '2026-07-03' }),
      tx({ id: 'b', bedrag: 300, categorieId: 'c1', datum: '2026-07-10' }),
    ]
    expect(uitgavenInMaand(lijst, 'c1', '2026-07')).toBe(0)
  })

  it('geeft 0 wanneer er niets past', () => {
    expect(uitgavenInMaand([], 'c1', '2026-07')).toBe(0)
  })

  it('rolt op: een budget op een hoofdcategorie vangt de onderliggende items', () => {
    const lijst = [
      tx({ id: 'a', bedrag: -500, categorieId: 'i-brood--wit-9238', datum: '2026-07-03' }), // item onder Voeding
      tx({ id: 'b', bedrag: -300, categorieId: 'ov-voeding', datum: '2026-07-05' }), // de hoofdcategorie zelf
      tx({ id: 'c', bedrag: -200, categorieId: 'ov-drank', datum: '2026-07-06' }), // andere hoofdcategorie
    ]
    expect(uitgavenInMaand(lijst, 'ov-voeding', '2026-07')).toBe(800)
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
