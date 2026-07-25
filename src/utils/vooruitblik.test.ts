import { describe, it, expect } from 'vitest'
import type { TerugkerendePost, Transactie, TransactieRegel } from '../data/schema'
import { spaarquote, maandVooruitblik, vasteLastTransactieId } from './vooruitblik'

function tx(id: string, datum: string, bedrag: number, regels?: TransactieRegel[]): Transactie {
  return { id, datum, omschrijving: '', bedrag, rekeningId: 'r', ...(regels ? { regels } : {}) }
}
function post(id: string, bedrag: number, dag = 1, extra: Partial<TerugkerendePost> = {}): TerugkerendePost {
  return { id, omschrijving: id, bedrag, rekeningId: 'r', dag, ...extra }
}
// Vaste 'vandaag' in de tests: de eerste van de maand, zodat een post van dag 1
// nog 'te komen' is. Zo hangt de test niet af van de dag waarop hij draait.
const EERSTE_JULI = '2026-07-01'

const JULI = { van: '2026-07-01', tot: '2026-07-31' }

describe('vooruitblik — spaarquote', () => {
  it('berekent inkomsten, uitgaven, saldo en het overgehouden percentage', () => {
    const txs = [tx('a', '2026-07-03', 200000), tx('b', '2026-07-10', -50000)]
    const r = spaarquote(txs, JULI)
    expect(r).toEqual({ inkomsten: 200000, uitgaven: 50000, saldo: 150000, quote: 75 })
  })

  it('telt op regelniveau, zodat een positieve regel in een gesplitst ticket apart meetelt', () => {
    // Uitgave van 30€ met een statiegeld-teruggave van 20€ ertussen: aan de kassa
    // 50€ uit, 20€ terug. Op regelniveau: 20000 inkomst, 50000 uitgave.
    const split = tx('s', '2026-07-05', -30000, [
      { bedrag: -50000 },
      { bedrag: 20000, omschrijving: 'statiegeld' },
    ])
    const r = spaarquote([split], JULI)
    expect(r.inkomsten).toBe(20000)
    expect(r.uitgaven).toBe(50000)
    expect(r.saldo).toBe(-30000)
    expect(r.quote).toBe(-150)
  })

  it('geeft quote null als er geen inkomsten zijn', () => {
    const r = spaarquote([tx('a', '2026-07-03', -50000)], JULI)
    expect(r.inkomsten).toBe(0)
    expect(r.quote).toBeNull()
  })

  it('respecteert de periode: een transactie erbuiten telt niet mee', () => {
    const txs = [tx('a', '2026-07-03', 200000), tx('oud', '2026-06-20', 999999)]
    expect(spaarquote(txs, JULI).inkomsten).toBe(200000)
  })
})

describe('vooruitblik — maandVooruitblik', () => {
  it('telt het geboekte van de maand plus de nog niet ingeboekte vaste lasten', () => {
    const txs = [
      tx('inkomen', '2026-07-01', 100000), // geboekt inkomen
      tx(vasteLastTransactieId('p1', '2026-07'), '2026-07-01', -60000), // p1 al ingeboekt
      tx('juni', '2026-06-15', -777777), // vorige maand: telt niet mee
    ]
    const posten = [
      post('p1', -60000), // al ingeboekt -> niet meer 'komend'
      post('p2', -40000), // nog te komen (uitgave)
      post('p3', 5000), // nog te komen (inkomst)
    ]
    const r = maandVooruitblik(txs, posten, '2026-07', EERSTE_JULI)
    expect(r.geboekt).toEqual({ inkomsten: 100000, uitgaven: 60000 })
    expect(r.komend).toEqual({ inkomsten: 5000, uitgaven: 40000 })
    expect(r.aantalKomend).toBe(2)
    expect(r.verwachteInkomsten).toBe(105000)
    expect(r.verwachteUitgaven).toBe(100000)
    expect(r.verwachtSaldo).toBe(5000)
    expect(r.verwachteQuote).toBeCloseTo((5000 / 105000) * 100, 5)
  })

  it('geeft alleen het geboekte terug wanneer alle vaste lasten al ingeboekt zijn', () => {
    const txs = [
      tx('inkomen', '2026-07-01', 100000),
      tx(vasteLastTransactieId('p1', '2026-07'), '2026-07-08', -60000),
    ]
    const r = maandVooruitblik(txs, [post('p1', -60000)], '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(0)
    expect(r.komend).toEqual({ inkomsten: 0, uitgaven: 0 })
    expect(r.verwachtSaldo).toBe(40000)
  })
})

describe('vooruitblik — handmatig geboekte vaste lasten', () => {
  // De kern van de fix: wie zijn huur gewoon zelf intikt, mag ze niet dubbel
  // zien meetellen (één keer geboekt + één keer 'nog te komen').
  const huur = post('huur', -90000, 1, { categorieId: 'c-wonen' })

  it('herkent een zelf ingetikte huur als geboekt (zelfde rekening, bedrag en categorie)', () => {
    const eigen: Transactie = {
      id: 'eigen-1',
      datum: '2026-07-02',
      omschrijving: 'Huur juli',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'c-wonen',
    }
    const r = maandVooruitblik([eigen], [huur], '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(0)
    expect(r.aantalAchterstallig).toBe(0)
    expect(r.komend).toEqual({ inkomsten: 0, uitgaven: 0 })
    // Vóór de fix was dit 180000 (één keer geboekt, één keer 'nog te komen').
    expect(r.verwachteUitgaven).toBe(90000)
  })

  it('gebruikt één transactie hoogstens één keer: twee gelijke posten, één betaling', () => {
    const eigen: Transactie = { id: 'eigen-1', datum: '2026-07-02', omschrijving: 'Abonnement', bedrag: -2000, rekeningId: 'r' }
    const posten = [post('a1', -2000), post('a2', -2000)]
    const r = maandVooruitblik([eigen], posten, '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(1)
    expect(r.komend.uitgaven).toBe(2000)
    expect(r.verwachteUitgaven).toBe(4000) // 2000 geboekt + 2000 nog te komen
  })

  it('is streng: ander bedrag, andere rekening of andere categorie telt niet als geboekt', () => {
    const anderBedrag: Transactie = { id: 'x1', datum: '2026-07-02', omschrijving: '', bedrag: -90001, rekeningId: 'r', categorieId: 'c-wonen' }
    const andereRekening: Transactie = { id: 'x2', datum: '2026-07-02', omschrijving: '', bedrag: -90000, rekeningId: 'ander', categorieId: 'c-wonen' }
    const andereCategorie: Transactie = { id: 'x3', datum: '2026-07-02', omschrijving: '', bedrag: -90000, rekeningId: 'r', categorieId: 'c-vervoer' }
    for (const t of [anderBedrag, andereRekening, andereCategorie]) {
      expect(maandVooruitblik([t], [huur], '2026-07', EERSTE_JULI).aantalKomend).toBe(1)
    }
  })

  it('negeert een gesplitst kassaticket, ook al klopt het totaal toevallig', () => {
    const ticket: Transactie = {
      id: 'ticket',
      datum: '2026-07-02',
      omschrijving: 'Colruyt',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'c-wonen',
      regels: [{ bedrag: -50000 }, { bedrag: -40000 }],
    }
    expect(maandVooruitblik([ticket], [huur], '2026-07', EERSTE_JULI).aantalKomend).toBe(1)
  })

  it('kijkt enkel binnen de maand zelf', () => {
    const vorigeMaand: Transactie = { id: 'juni', datum: '2026-06-30', omschrijving: '', bedrag: -90000, rekeningId: 'r', categorieId: 'c-wonen' }
    expect(maandVooruitblik([vorigeMaand], [huur], '2026-07', EERSTE_JULI).aantalKomend).toBe(1)
  })

  it('geeft de id-herkenning voorrang, zodat een losse gelijke uitgave niet opgesnoept wordt', () => {
    const geboekt: Transactie = {
      id: vasteLastTransactieId('huur', '2026-07'),
      datum: '2026-07-01',
      omschrijving: 'Huur',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'c-wonen',
    }
    const tweedePost = post('huur2', -90000, 1, { categorieId: 'c-wonen' })
    const r = maandVooruitblik([geboekt], [huur, tweedePost], '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(1) // huur2 blijft openstaan
    expect(r.komend.uitgaven).toBe(90000)
  })
})

describe('vooruitblik — achterstallige vaste lasten', () => {
  it('zet een post waarvan de dag voorbij is bij achterstallig, niet bij nog te komen', () => {
    const posten = [post('vroeg', -50000, 1), post('laat', -20000, 28)]
    const r = maandVooruitblik([], posten, '2026-08', '2026-08-15')
    expect(r.aantalAchterstallig).toBe(1)
    expect(r.achterstallig.uitgaven).toBe(50000)
    expect(r.aantalKomend).toBe(1)
    expect(r.komend.uitgaven).toBe(20000)
    // Achterstallig telt nog steeds mee in de verwachting: het moet nog gebeuren.
    expect(r.verwachteUitgaven).toBe(70000)
  })

  it('rekent de dag van vandaag zelf nog als nog te komen', () => {
    const r = maandVooruitblik([], [post('p', -10000, 15)], '2026-08', '2026-08-15')
    expect(r.aantalKomend).toBe(1)
    expect(r.aantalAchterstallig).toBe(0)
  })

  it('een maand in het verleden is helemaal voorbij, een maand in de toekomst nog niet', () => {
    const p = [post('p', -10000, 28)]
    expect(maandVooruitblik([], p, '2026-07', '2026-08-01').aantalAchterstallig).toBe(1)
    expect(maandVooruitblik([], p, '2026-09', '2026-08-01').aantalKomend).toBe(1)
  })
})
