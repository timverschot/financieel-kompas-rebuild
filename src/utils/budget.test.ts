import { describe, it, expect } from 'vitest'
import {
  budgetId,
  budgetKleur,
  geldendeBudgetten,
  maandenMetEigenBudget,
  niveauVanBudget,
  regelHoortBijBudget,
  uitgavenInMaand,
} from './budget'
import { PLATTE_ITEMS } from '../data/categorieen/zoek'
import type { Budget, Transactie } from '../data/schema'

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

// Ronde 35: de grens stond hard op 80 % in de code, terwijl je in Instellingen een
// drempel tussen 70 en 100 % kan kiezen. De meldingen gebruikten die keuze wél, de
// kleuren niet — zette je hem op 95 %, dan kleurde de balk toch al oranje bij 80 %.
describe('budgetKleur volgt de ingestelde drempel', () => {
  it('kleurt pas amber vanaf de drempel die je zelf koos', () => {
    // Budget van € 100, verbruikt € 85.
    expect(budgetKleur(8500, 10000, 80)).toBe('var(--warn)')
    expect(budgetKleur(8500, 10000, 95)).toBe('var(--positive)')
    expect(budgetKleur(9500, 10000, 95)).toBe('var(--warn)')
  })

  it('kleurt rood zodra je erover gaat, ongeacht de drempel', () => {
    expect(budgetKleur(10001, 10000, 70)).toBe('var(--negative)')
    expect(budgetKleur(10001, 10000, 100)).toBe('var(--negative)')
    // Exact op het budget is nog niet erover.
    expect(budgetKleur(10000, 10000, 100)).toBe('var(--warn)')
  })

  it('blijft rustig bij een budget van nul', () => {
    expect(budgetKleur(500, 0, 80)).toBe('var(--positive)')
  })
})

// Ronde 62. Een budget kan sinds deze ronde een eigen maand dragen: ontbreekt die,
// dan is het je standaard en geldt het elke maand; staat er een maand in, dan geldt
// het alleen dán. Deze functie beslist welk record waar telt — en ze is de ENIGE
// beveiliging tegen dubbeltelling op de vijf plaatsen die met budgetten rekenen.
const bud = (over: Partial<Budget>): Budget => ({ id: 'b', categorieId: 'ov-voeding', bedrag: 40000, ...over })

describe('geldendeBudgetten', () => {
  it('geeft een budget zonder maand in elke maand terug', () => {
    const standaard = bud({ id: 'budget-ov-voeding' })
    expect(geldendeBudgetten([standaard], '2026-08')).toEqual([standaard])
    expect(geldendeBudgetten([standaard], '2027-03')).toEqual([standaard])
  })

  it('laat de uitzondering vóórgaan in háár maand', () => {
    const standaard = bud({ id: 'budget-ov-voeding', bedrag: 40000 })
    const december = bud({ id: 'budget-ov-voeding-2026-12', bedrag: 60000, maand: '2026-12' })
    expect(geldendeBudgetten([standaard, december], '2026-12')).toEqual([december])
  })

  it('laat de standaard staan in elke ándere maand', () => {
    const standaard = bud({ id: 'budget-ov-voeding', bedrag: 40000 })
    const december = bud({ id: 'budget-ov-voeding-2026-12', bedrag: 60000, maand: '2026-12' })
    expect(geldendeBudgetten([standaard, december], '2026-11')).toEqual([standaard])
    expect(geldendeBudgetten([standaard, december], '2027-01')).toEqual([standaard])
  })

  it('geeft NOOIT twee records voor dezelfde categorie', () => {
    // ⚠ Dit is de kern. Geen van de vijf rekenplekken kan twee budgetten voor
    // dezelfde categorie aan: de Budget-pagina zou twee balken tonen, het belletje
    // twee meldingen, de maandafsluiting zou dubbel tellen — en de planregel TELT OP,
    // dus die zou je standaard én je uitzondering samen vragen.
    const lijst = [
      bud({ id: 'budget-ov-voeding', bedrag: 40000 }),
      bud({ id: 'budget-ov-voeding-2026-12', bedrag: 60000, maand: '2026-12' }),
    ]
    const uit = geldendeBudgetten(lijst, '2026-12')
    expect(uit).toHaveLength(1)
    expect(uit[0].bedrag).toBe(60000)
  })

  it('toont een uitzondering ook zonder standaardbudget', () => {
    // "Deze ene maand hou ik Kleding in de gaten" mag, zonder dat je er een vast
    // budget voor moet zetten.
    const alleen = bud({ id: 'budget-ov-kleding-2026-12', categorieId: 'ov-kleding', bedrag: 15000, maand: '2026-12' })
    expect(geldendeBudgetten([alleen], '2026-12')).toEqual([alleen])
    expect(geldendeBudgetten([alleen], '2026-11')).toEqual([])
  })

  it('houdt de volgorde van de categorie aan, niet die van de id', () => {
    // Vóór ronde 62 was de volgorde die van de database: alfabetisch op de id, en de
    // id was `budget-<categorieId>`. Met een maand achter de id zou een categorie van
    // plaats springen zodra je er een uitzondering voor zet. Sorteren op de categorie
    // houdt de lijst stil.
    const lijst = [
      bud({ id: 'budget-ov-wonen', categorieId: 'ov-wonen', bedrag: 90000 }),
      bud({ id: 'budget-ov-voeding-2026-12', categorieId: 'ov-voeding', bedrag: 60000, maand: '2026-12' }),
      bud({ id: 'budget-ov-kleding', categorieId: 'ov-kleding', bedrag: 15000 }),
    ]
    expect(geldendeBudgetten(lijst, '2026-12').map((b) => b.categorieId)).toEqual([
      'ov-kleding',
      'ov-voeding',
      'ov-wonen',
    ])
  })

  it('laat de lijst waarmee ze rekent ongemoeid', () => {
    const lijst = [bud({ id: 'budget-ov-voeding' })]
    geldendeBudgetten(lijst, '2026-12')
    expect(lijst).toHaveLength(1)
  })
})

describe('maandenMetEigenBudget', () => {
  it('noemt de maanden waarvoor er iets apart klaarstaat, van vroeg naar laat', () => {
    const lijst = [
      bud({ id: 'a', bedrag: 40000 }),
      bud({ id: 'b', bedrag: 60000, maand: '2026-12' }),
      bud({ id: 'c', categorieId: 'ov-kleding', bedrag: 10000, maand: '2026-09' }),
      bud({ id: 'd', categorieId: 'ov-wonen', bedrag: 10000, maand: '2026-12' }),
    ]
    expect(maandenMetEigenBudget(lijst, '2026-08', '2026-08')).toEqual(['2026-09', '2026-12'])
  })

  it('laat de maand die je nu bekijkt weg', () => {
    // Die staat al in de lijst erboven; hem er nog eens bij zetten leest als een
    // tweede budget.
    const lijst = [bud({ id: 'b', bedrag: 60000, maand: '2026-12' })]
    expect(maandenMetEigenBudget(lijst, '2026-12', '2026-08')).toEqual([])
  })

  it('laat maanden uit het verleden weg', () => {
    // Zonder deze regel groeit het rijtje knoppen alleen maar aan, en een voorbije
    // maand kan je toch niet meer bijsturen.
    const lijst = [
      bud({ id: 'oud', bedrag: 10000, maand: '2019-03' }),
      bud({ id: 'nieuw', categorieId: 'ov-kleding', bedrag: 10000, maand: '2026-12' }),
    ]
    expect(maandenMetEigenBudget(lijst, '2026-08', '2026-08')).toEqual(['2026-12'])
  })

  it('zwijgt wanneer er alleen standaardbudgetten zijn', () => {
    expect(maandenMetEigenBudget([bud({ id: 'a' })], '2026-08', '2026-08')).toEqual([])
  })
})

describe('budgetId', () => {
  it('houdt de id van een standaardbudget exact zoals ze altijd was', () => {
    // ⚠ Daar hangt aan vast dat opnieuw instellen je bestaande budget BIJWERKT in
    // plaats van er een tweede naast te zetten. Verandert dit patroon, dan krijgt elk
    // bestaand budget er stil een tweede naast.
    expect(budgetId('ov-voeding')).toBe('budget-ov-voeding')
  })

  it('zet de maand achter de id van een uitzondering', () => {
    expect(budgetId('ov-voeding', '2026-12')).toBe('budget-ov-voeding-2026-12')
  })

  it('geeft de twee soorten nooit dezelfde id', () => {
    expect(budgetId('ov-voeding')).not.toBe(budgetId('ov-voeding', '2026-12'))
  })
})
