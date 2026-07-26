import { describe, it, expect } from 'vitest'
import { niveauVanBudget, regelHoortBijBudget, uitgavenInMaand } from './budget'
import { PLATTE_ITEMS } from '../data/categorieen/zoek'
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

// --- Ronde 25: budgetten op drie niveaus ---
//
// 'i-brood--wit-9238' is het item "Brood (wit)"; het hangt onder de middencategorie
// 'cat-broodwaren', die onder de hoofdcategorie 'ov-voeding' hangt.
describe('niveauVanBudget', () => {
  it('herkent de drie niveaus', () => {
    expect(niveauVanBudget('ov-voeding')).toBe('hoofd')
    expect(niveauVanBudget('cat-broodwaren')).toBe('midden')
    expect(niveauVanBudget('i-brood--wit-9238')).toBe('item')
  })

  it('ziet een eigen categorie als hoofdniveau — die rolt naar zichzelf op', () => {
    expect(niveauVanBudget('eigen-hobby')).toBe('hoofd')
  })
})

describe('regelHoortBijBudget', () => {
  it('laat een hoofdcategoriebudget alles eronder vangen', () => {
    expect(regelHoortBijBudget('i-brood--wit-9238', 'ov-voeding')).toBe(true)
    expect(regelHoortBijBudget('ov-voeding', 'ov-voeding')).toBe(true)
  })

  it('laat een middenbudget alleen items van díé middencategorie vangen', () => {
    expect(regelHoortBijBudget('i-brood--wit-9238', 'cat-broodwaren')).toBe(true)
    // Een item uit een andere middencategorie van dezelfde hoofdcategorie niet.
    const anderItem = PLATTE_ITEMS.find((i) => i.hoofdId === 'ov-voeding' && i.categorieId !== 'cat-broodwaren')
    expect(regelHoortBijBudget(anderItem?.id, 'cat-broodwaren')).toBe(false)
  })

  it('telt een boeking op de hoofdcategorie NIET mee in een middenbudget', () => {
    // "Dit was gewoon Voeding" zegt niet of het brood of vlees was. Ze toch
    // toewijzen zou het budget laten kloppen met iets wat niemand gezegd heeft.
    expect(regelHoortBijBudget('ov-voeding', 'cat-broodwaren')).toBe(false)
  })

  it('laat een itembudget alleen dat ene item vangen', () => {
    expect(regelHoortBijBudget('i-brood--wit-9238', 'i-brood--wit-9238')).toBe(true)
    expect(regelHoortBijBudget('ov-voeding', 'i-brood--wit-9238')).toBe(false)
    expect(regelHoortBijBudget(undefined, 'i-brood--wit-9238')).toBe(false)
  })
})

describe('uitgavenInMaand op de middenlaag en op items', () => {
  const tx = (id: string, categorieId: string, bedrag: number): Transactie => ({
    id,
    datum: '2026-07-05',
    omschrijving: 'Winkel',
    bedrag,
    rekeningId: 'r1',
    categorieId,
  })

  const brood = 'i-brood--wit-9238'
  const anderVoedingItem = PLATTE_ITEMS.find((i) => i.hoofdId === 'ov-voeding' && i.categorieId !== 'cat-broodwaren')!

  const lijst = [tx('a', brood, -300), tx('b', anderVoedingItem.id, -2000), tx('c', 'ov-voeding', -1000)]

  it('telt op hoofdniveau alles samen', () => {
    expect(uitgavenInMaand(lijst, 'ov-voeding', '2026-07')).toBe(3300)
  })

  it('telt op middenniveau enkel wat eronder hangt', () => {
    expect(uitgavenInMaand(lijst, 'cat-broodwaren', '2026-07')).toBe(300)
  })

  it('telt op itemniveau enkel dat item', () => {
    expect(uitgavenInMaand(lijst, brood, '2026-07')).toBe(300)
  })

  it('splitst een kassaticket ook op de middenlaag uit', () => {
    const ticket: Transactie = {
      id: 't',
      datum: '2026-07-05',
      omschrijving: 'Colruyt',
      bedrag: -5000,
      rekeningId: 'r1',
      regels: [
        { categorieId: brood, bedrag: -800 },
        { categorieId: anderVoedingItem.id, bedrag: -4200 },
      ],
    }
    expect(uitgavenInMaand([ticket], 'cat-broodwaren', '2026-07')).toBe(800)
  })
})
