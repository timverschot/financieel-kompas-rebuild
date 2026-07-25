import { describe, it, expect } from 'vitest'
import type { TerugkerendePost, Transactie, TransactieRegel } from '../data/schema'
import { spaarquote, maandVooruitblik, vasteLastTransactieId } from './vooruitblik'

function tx(id: string, datum: string, bedrag: number, regels?: TransactieRegel[]): Transactie {
  return { id, datum, omschrijving: '', bedrag, rekeningId: 'r', ...(regels ? { regels } : {}) }
}
function post(id: string, bedrag: number, dag = 1): TerugkerendePost {
  return { id, omschrijving: id, bedrag, rekeningId: 'r', dag }
}

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
    const r = maandVooruitblik(txs, posten, '2026-07')
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
    const r = maandVooruitblik(txs, [post('p1', -60000)], '2026-07')
    expect(r.aantalKomend).toBe(0)
    expect(r.komend).toEqual({ inkomsten: 0, uitgaven: 0 })
    expect(r.verwachtSaldo).toBe(40000)
  })
})
