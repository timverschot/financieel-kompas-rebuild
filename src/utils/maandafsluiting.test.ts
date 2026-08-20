import { describe, it, expect } from 'vitest'
import type { Budget, Maandafsluiting, TerugkerendePost, Transactie } from '../data/schema'
import { dagenNaMaand, maandStand, openMaanden, RIJPINGSDAGEN, vorigeMaand } from './maandafsluiting'

const tx = (id: string, datum: string, bedrag: number, categorieId?: string): Transactie => ({
  id,
  datum,
  omschrijving: id,
  bedrag,
  rekeningId: 'r1',
  ...(categorieId ? { categorieId } : {}),
})

const stand = (extra: Partial<Parameters<typeof maandStand>[0]> = {}) =>
  maandStand({
    maand: '2026-06',
    transacties: [],
    budgetten: [],
    terugkerendePosten: [],
    afsluitingen: [],
    vandaagISO: '2026-07-10',
    ...extra,
  })

describe('vorigeMaand', () => {
  it('telt een maand terug', () => {
    expect(vorigeMaand('2026-07')).toBe('2026-06')
  })

  it('gaat correct over de jaargrens', () => {
    expect(vorigeMaand('2026-01')).toBe('2025-12')
  })
})

describe('dagenNaMaand', () => {
  it('telt vanaf de eerste dag van de maand erna', () => {
    expect(dagenNaMaand('2026-06', '2026-07-01')).toBe(0)
    expect(dagenNaMaand('2026-06', '2026-07-06')).toBe(5)
  })

  it('is negatief zolang de maand nog loopt', () => {
    expect(dagenNaMaand('2026-07', '2026-07-10')).toBeLessThan(0)
  })

  it('gaat correct over de jaargrens', () => {
    expect(dagenNaMaand('2026-12', '2027-01-06')).toBe(5)
  })
})

describe('maandStand — de drie stappen', () => {
  it('zegt dat er nog niets geboekt is in een lege maand', () => {
    const s = stand()
    expect(s.boekingen).toBe(0)
    expect(s.stappen[0].klaar).toBe(false)
    expect(s.werkTeDoen).toBe(true)
  })

  it('vinkt de eerste stap af zodra er íets geboekt is', () => {
    // Meer kan de app niet weten: of jouw uittreksel volledig is, weet alleen jij.
    const s = stand({ transacties: [tx('t1', '2026-06-03', -2500, 'ov-voeding')] })
    expect(s.stappen[0].klaar).toBe(true)
    expect(s.stappen[0].aantal).toBe(1)
  })

  it('telt alleen de boekingen van die maand', () => {
    const s = stand({
      transacties: [tx('t1', '2026-06-03', -2500, 'ov-voeding'), tx('t2', '2026-07-03', -1000, 'ov-voeding')],
    })
    expect(s.boekingen).toBe(1)
  })

  it('telt wat er nog geen categorie heeft', () => {
    const s = stand({ transacties: [tx('t1', '2026-06-03', -2500), tx('t2', '2026-06-04', -1000, 'ov-voeding')] })
    expect(s.zonderCategorie).toBe(1)
    expect(s.stappen[1].klaar).toBe(false)
    expect(s.stappen[1].aantal).toBe(1)
  })

  it('is rond wanneer alles een categorie heeft', () => {
    const s = stand({ transacties: [tx('t1', '2026-06-03', -2500, 'ov-voeding')] })
    expect(s.stappen[1].klaar).toBe(true)
    expect(s.werkTeDoen).toBe(false)
  })
})

describe('maandStand — het oordeel', () => {
  const transacties = [
    tx('loon', '2026-06-01', 240000, 'ov-inkomsten'),
    tx('huur', '2026-06-03', -95000, 'cat-huisvesting'),
    tx('eten', '2026-06-05', -8000, 'ov-voeding'),
  ]

  it('telt inkomsten en uitgaven van die maand', () => {
    const s = stand({ transacties })
    expect(s.inkomsten).toBe(240000)
    expect(s.uitgaven).toBe(103000)
    expect(s.balans.stand).toBe('overschot')
  })

  it('telt de overschreden budgetten', () => {
    const budgetten: Budget[] = [
      { id: 'b1', categorieId: 'ov-voeding', bedrag: 5000 },
      { id: 'b2', categorieId: 'cat-huisvesting', bedrag: 200000 },
    ]
    expect(stand({ transacties, budgetten }).budgettenOver).toBe(1)
  })

  // Ronde 62: dit scherm heeft zijn eigen maandkeuze, en moet dus met het budget van
  // de maand die je AFSLUIT rekenen.
  it('telt een categorie niet dubbel wanneer ze een uitzondering heeft', () => {
    const budgetten: Budget[] = [
      { id: 'b1', categorieId: 'ov-voeding', bedrag: 5000 },
      { id: 'b1-maand', categorieId: 'ov-voeding', bedrag: 5000, maand: '2026-06' },
    ]
    expect(stand({ transacties, budgetten }).budgettenOver).toBe(1)
  })

  it('rekent met de uitzondering van de maand die je afsluit', () => {
    const budgetten: Budget[] = [
      { id: 'b1', categorieId: 'ov-voeding', bedrag: 5000 },
      // Deze maand mocht het meer zijn, dus is er niets over.
      { id: 'b1-maand', categorieId: 'ov-voeding', bedrag: 900000, maand: '2026-06' },
    ]
    expect(stand({ transacties, budgetten }).budgettenOver).toBe(0)
  })

  it('telt de vaste lasten die deze maand nog niet geboekt zijn', () => {
    const posten: TerugkerendePost[] = [
      { id: 'p1', omschrijving: 'Netflix', bedrag: -1399, rekeningId: 'r1', dag: 20 },
    ]
    // Op 10 juli is de 20e van juni allang voorbij en staat de post open.
    const s = stand({ transacties, terugkerendePosten: posten })
    expect(s.vasteLastenOpen).toBe(1)
    expect(s.werkTeDoen).toBe(true)
  })
})

describe('maandStand — afgesloten of niet', () => {
  const afsluiting: Maandafsluiting = { id: '2026-06', afgeslotenOp: '2026-07-06' }

  it('weet wanneer een maand afgesloten is', () => {
    const s = stand({ afsluitingen: [afsluiting] })
    expect(s.afgesloten).toBe(true)
    expect(s.afgeslotenOp).toBe('2026-07-06')
  })

  it('laat een andere maand ongemoeid', () => {
    const s = stand({ maand: '2026-05', afsluitingen: [afsluiting] })
    expect(s.afgesloten).toBe(false)
    expect(s.afgeslotenOp).toBeNull()
  })

  it('blijft afgesloten ook al is er nadien nog iets bijgekomen', () => {
    // Je mag een maand afsluiten met werk dat blijft liggen; de app houdt je niet
    // tegen en doet ook niet alsof het opgelost is.
    const s = stand({ transacties: [tx('t1', '2026-06-03', -2500)], afsluitingen: [afsluiting] })
    expect(s.afgesloten).toBe(true)
    expect(s.zonderCategorie).toBe(1)
    expect(s.werkTeDoen).toBe(true)
  })
})

describe('openMaanden', () => {
  const transacties = [
    tx('t1', '2026-05-03', -2500, 'ov-voeding'),
    tx('t2', '2026-06-03', -2500, 'ov-voeding'),
    tx('t3', '2026-07-03', -2500, 'ov-voeding'),
  ]

  it('noemt de afgelopen maanden waarin geboekt is, oudste eerst', () => {
    expect(openMaanden(transacties, [], '2026-07-10')).toEqual(['2026-05', '2026-06'])
  })

  it('laat de lopende maand met rust', () => {
    expect(openMaanden(transacties, [], '2026-07-10')).not.toContain('2026-07')
  })

  it('zwijgt over een maand waarin je niets geboekt hebt', () => {
    // Daar valt niets na te kijken; een herinnering eraan is enkel ruis.
    expect(openMaanden([tx('t1', '2026-06-03', -2500)], [], '2026-07-10')).toEqual(['2026-06'])
  })

  it('laat een afgesloten maand weg', () => {
    const afgesloten: Maandafsluiting[] = [{ id: '2026-05', afgeslotenOp: '2026-06-08' }]
    expect(openMaanden(transacties, afgesloten, '2026-07-10')).toEqual(['2026-06'])
  })

  it('wacht tot de maand gerijpt is', () => {
    // Op 1 juli staan de laatste boekingen van juni vaak nog niet op je uittreksel.
    expect(openMaanden(transacties, [], '2026-07-01')).toEqual(['2026-05'])
    expect(openMaanden(transacties, [], `2026-07-0${RIJPINGSDAGEN + 1}`)).toEqual(['2026-05', '2026-06'])
  })

  it('kijkt niet eindeloos terug', () => {
    const oud = Array.from({ length: 30 }, (_, i) => {
      const maand = 12 - (i % 12)
      return tx(`o${i}`, `20${20 + Math.floor(i / 12)}-${String(maand).padStart(2, '0')}-05`, -1000)
    })
    expect(openMaanden(oud, [], '2026-07-10', 3).length).toBeLessThanOrEqual(3)
  })
})
