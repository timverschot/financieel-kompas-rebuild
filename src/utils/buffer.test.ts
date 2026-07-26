import { describe, it, expect } from 'vitest'
import type { Overboeking, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { bepaalBuffer, BUFFERTYPES } from './buffer'

const spaar: Rekening = { id: 'sp', naam: 'Spaar', beginsaldo: 500000, type: 'spaar' }
const cash: Rekening = { id: 'ca', naam: 'Cash', beginsaldo: 20000, type: 'cash' }
const betaal: Rekening = { id: 'bt', naam: 'Zicht', beginsaldo: 300000, type: 'betaal' }
const termijn: Rekening = { id: 'tm', naam: 'Termijn', beginsaldo: 1000000, type: 'termijn' }

const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'bt', dag: 3 }
const energie: TerugkerendePost = { id: 'p2', omschrijving: 'Energie', bedrag: -18000, rekeningId: 'bt', dag: 5 }
const loon: TerugkerendePost = { id: 'p3', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'bt', dag: 25 }

function buffer(rekeningen: Rekening[], posten: TerugkerendePost[], tx: Transactie[] = [], ob: Overboeking[] = []) {
  return bepaalBuffer(rekeningen, tx, ob, posten, '2026-07-15')
}

describe('bepaalBuffer', () => {
  it('telt enkel spaar- en cash-rekeningen mee', () => {
    const b = buffer([spaar, cash, betaal, termijn], [huur])
    // € 5.000 spaar + € 200 cash. De betaalrekening en de termijnrekening blijven erbuiten.
    expect(b.beschikbaar).toBe(520000)
  })

  it('telt enkel de terugkerende UITGAVEN als vaste lasten, niet het loon', () => {
    const b = buffer([spaar], [huur, energie, loon])
    expect(b.vasteLastenPerMaand).toBe(113000)
  })

  it('rekent het aantal maanden uit dat je toekomt', () => {
    const b = buffer([spaar], [huur])
    // € 5.000 / € 950 = 5,26 maanden.
    expect(b.maanden).toBeCloseTo(5.263, 2)
    expect(b.bruikbaar).toBe(true)
  })

  it('houdt rekening met boekingen en overboekingen tot vandaag', () => {
    const tx: Transactie[] = [{ id: 't1', datum: '2026-07-01', omschrijving: 'opname', bedrag: -100000, rekeningId: 'sp' }]
    const ob: Overboeking[] = [{ id: 'o1', datum: '2026-07-02', vanRekeningId: 'bt', naarRekeningId: 'sp', bedrag: 50000 }]
    const b = buffer([spaar], [huur], tx, ob)
    expect(b.beschikbaar).toBe(450000)
  })

  it('negeert een boeking met een datum in de toekomst', () => {
    const tx: Transactie[] = [{ id: 't1', datum: '2026-09-01', omschrijving: 'later', bedrag: -400000, rekeningId: 'sp' }]
    expect(buffer([spaar], [huur], tx).beschikbaar).toBe(500000)
  })

  it('laat een gearchiveerde rekening buiten de buffer', () => {
    const oud: Rekening = { ...spaar, id: 'oud', gearchiveerd: true }
    expect(buffer([oud], [huur]).beschikbaar).toBe(0)
  })

  it('is niet bruikbaar zonder spaar- of cash-rekening', () => {
    const b = buffer([betaal], [huur])
    expect(b.bruikbaar).toBe(false)
  })

  it('is niet bruikbaar zonder vaste lasten — dan is er niets om tegen af te zetten', () => {
    const b = buffer([spaar], [])
    expect(b.bruikbaar).toBe(false)
    expect(b.maanden).toBeNull()
  })

  it('is niet bruikbaar wanneer de terugkerende posten enkel inkomsten zijn', () => {
    expect(buffer([spaar], [loon]).bruikbaar).toBe(false)
  })

  it('rekent de types niet zelf uit maar leest ze uit BUFFERTYPES', () => {
    expect(BUFFERTYPES).toEqual(['spaar', 'cash'])
  })
})

// Ronde 23: vaste lasten hoeven niet meer maandelijks te zijn. De buffer moet dan
// het OMGEREKENDE maandbedrag gebruiken. Zou ze het volle bedrag nemen, dan zou je
// buffer instorten zodra je een jaarpremie invoert — en dat is niet waar.
describe('bepaalBuffer — andere termijnen dan maandelijks', () => {
  const spaar: Rekening = { id: 's1', naam: 'Spaar', beginsaldo: 600000, type: 'spaar' }
  const jaarpremie: TerugkerendePost = {
    id: 'prem',
    omschrijving: 'Autoverzekering',
    bedrag: -120000, // € 1.200 per jaar
    rekeningId: 's1',
    dag: 5,
    frequentie: 'jaar',
    startMaand: '2026-08',
  }

  it('rekent een jaarlijkse kost om naar één maand', () => {
    const b = bepaalBuffer([spaar], [], [], [jaarpremie], '2026-07-15')
    // € 1.200 per jaar = € 100 per maand, dus € 6.000 spaargeld dekt 60 maanden.
    expect(b.vasteLastenPerMaand).toBe(10000)
    expect(b.maanden).toBe(60)
  })

  it('telt een kwartaalkost als een derde per maand', () => {
    const kwartaal: TerugkerendePost = { ...jaarpremie, bedrag: -30000, frequentie: 'kwartaal' }
    expect(bepaalBuffer([spaar], [], [], [kwartaal], '2026-07-15').vasteLastenPerMaand).toBe(10000)
  })
})
