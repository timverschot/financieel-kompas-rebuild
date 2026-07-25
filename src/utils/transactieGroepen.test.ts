import { describe, it, expect } from 'vitest'
import { groepenVanTransactie, isGesplitstOverCategorieen } from './transactie'
import type { Transactie } from '../data/schema'

// 'i-brood--wit-9238' hoort onder de hoofdcategorie Voeding; we zoeken het echte
// id niet hard af, maar gebruiken de hoofdcategorie-id's die stabiel zijn.
const voeding = 'ov-voeding'
const wonen = 'ov-woning-en-vaste-lasten'

describe('groepenVanTransactie', () => {
  it('geeft één groep met icoon voor een gewone transactie', () => {
    const t: Transactie = { id: '1', datum: '2026-07-01', omschrijving: 'Bakker', bedrag: -3_20, rekeningId: 'r1', categorieId: voeding }
    const g = groepenVanTransactie(t, [])
    expect(g).toHaveLength(1)
    expect(g[0].naam).toBe('Voeding')
    expect(g[0].icoon).toBe('🍽️')
    expect(g[0].bedrag).toBe(-3_20)
    expect(isGesplitstOverCategorieen(t, [])).toBe(false)
  })

  it('telt de deelregels per hoofdcategorie op en sorteert van groot naar klein', () => {
    const t: Transactie = {
      id: '2',
      datum: '2026-07-02',
      omschrijving: 'Colruyt',
      bedrag: -53_80,
      rekeningId: 'r1',
      regels: [
        { categorieId: voeding, bedrag: -21_20, omschrijving: 'brood' },
        { categorieId: wonen, bedrag: -12_60, omschrijving: 'lamp' },
        { categorieId: voeding, bedrag: -20_00, omschrijving: 'groenten' },
      ],
    }
    const g = groepenVanTransactie(t, [])
    expect(g.map((x) => x.naam)).toEqual(['Voeding', 'Woning en vaste lasten'])
    expect(g[0].bedrag).toBe(-41_20)
    expect(g[1].bedrag).toBe(-12_60)
    expect(isGesplitstOverCategorieen(t, [])).toBe(true)
  })

  it('telt een niet-verdeeld restbedrag mee als "zonder categorie"', () => {
    const t: Transactie = {
      id: '3',
      datum: '2026-07-03',
      omschrijving: 'Winkel',
      bedrag: -30_00,
      rekeningId: 'r1',
      regels: [{ categorieId: voeding, bedrag: -10_00 }],
    }
    const g = groepenVanTransactie(t, [])
    expect(g).toHaveLength(2)
    expect(g[0].naam).toBe('Zonder categorie')
    expect(g[0].bedrag).toBe(-20_00)
    expect(g[0].icoon).toBeNull()
  })

  it('geeft geen icoon voor een eigen categorie', () => {
    const t: Transactie = { id: '4', datum: '2026-07-04', omschrijving: 'X', bedrag: -5_00, rekeningId: 'r1', categorieId: 'eigen-1' }
    const g = groepenVanTransactie(t, [{ id: 'eigen-1', naam: 'Hobby' }])
    expect(g[0].naam).toBe('Hobby')
    expect(g[0].icoon).toBeNull()
  })
})
