import { describe, it, expect } from 'vitest'
import type { Kindrekening, Kindrekeningpost } from '../data/schema'
import {
  potSaldo,
  gestortPerOuder,
  totaalUitgaven,
  geindexeerdeBijdrage,
  aantalTermijnen,
  standPerOuder,
} from './kindrekening'

const kr = (extra: Partial<Kindrekening> = {}): Kindrekening => ({
  id: 'kr1',
  dossierId: 'd1',
  naam: 'Pot',
  beginsaldo: 0,
  ...extra,
})

const storting = (bedrag: number, door: 'jij' | 'partner', datum = '2026-01-05'): Kindrekeningpost => ({
  id: `s-${bedrag}-${door}-${datum}`,
  kindrekeningId: 'kr1',
  datum,
  soort: 'storting',
  bedrag,
  door,
})

const uitgave = (bedrag: number, datum = '2026-01-10'): Kindrekeningpost => ({
  id: `u-${bedrag}-${datum}`,
  kindrekeningId: 'kr1',
  datum,
  soort: 'uitgave',
  bedrag,
})

describe('potSaldo', () => {
  it('is startsaldo + stortingen − uitgaven', () => {
    const posten = [storting(10000, 'jij'), storting(10000, 'partner'), uitgave(3000)]
    expect(potSaldo(kr({ beginsaldo: 5000 }), posten)).toBe(5000 + 20000 - 3000)
  })

  it('is het startsaldo als er geen bewegingen zijn', () => {
    expect(potSaldo(kr({ beginsaldo: 2500 }), [])).toBe(2500)
  })
})

describe('gestortPerOuder', () => {
  it('telt per ouder op; uitgaven tellen niet mee', () => {
    const posten = [storting(10000, 'jij'), storting(4000, 'jij'), storting(8000, 'partner'), uitgave(9999)]
    expect(gestortPerOuder(posten)).toEqual({ jij: 14000, partner: 8000 })
  })
})

describe('totaalUitgaven', () => {
  it('telt enkel de uitgaven', () => {
    expect(totaalUitgaven([storting(10000, 'jij'), uitgave(3000), uitgave(2000)])).toBe(5000)
  })
})

describe('geindexeerdeBijdrage', () => {
  it('geeft het basisbedrag terug zonder indexen', () => {
    expect(geindexeerdeBijdrage(kr(), 20000)).toBe(20000)
  })

  it('indexeert wanneer aanvangs- en huidige index gezet zijn (200 × 110/100 = 220)', () => {
    expect(geindexeerdeBijdrage(kr({ aanvangsindex: 100, huidigeIndex: 110 }), 20000)).toBe(22000)
  })

  it('is 0 zonder basisbedrag', () => {
    expect(geindexeerdeBijdrage(kr(), undefined)).toBe(0)
  })
})

describe('aantalTermijnen', () => {
  it('telt de startmaand mee (zelfde maand = 1)', () => {
    expect(aantalTermijnen('2026-01-01', '2026-01-20')).toBe(1)
  })

  it('telt hele maanden over een jaargrens', () => {
    expect(aantalTermijnen('2025-11-01', '2026-02-15')).toBe(4) // nov, dec, jan, feb
  })

  it('is 0 vóór de startdatum', () => {
    expect(aantalTermijnen('2026-06-01', '2026-01-01')).toBe(0)
  })
})

describe('standPerOuder', () => {
  it('berekent verwacht = geïndexeerde maandbijdrage × termijnen, en het verschil', () => {
    const rekening = kr({
      maandbijdrageJij: 20000,
      maandbijdragePartner: 20000,
      bijdrageStart: '2026-01-01',
    })
    // 3 termijnen (jan, feb, mrt), verwacht 60000 per ouder.
    const posten = [storting(60000, 'jij'), storting(40000, 'partner')]
    const stand = standPerOuder(rekening, posten, '2026-03-10')
    expect(stand.jij).toEqual({ gestort: 60000, verwacht: 60000, verschil: 0 })
    expect(stand.partner).toEqual({ gestort: 40000, verwacht: 60000, verschil: -20000 })
  })

  it('past de indexatie toe op de verwachte bijdrage', () => {
    const rekening = kr({
      maandbijdrageJij: 20000,
      bijdrageStart: '2026-01-01',
      aanvangsindex: 100,
      huidigeIndex: 110,
    })
    // 1 termijn, geïndexeerd 22000.
    const stand = standPerOuder(rekening, [], '2026-01-15')
    expect(stand.jij.verwacht).toBe(22000)
    expect(stand.jij.verschil).toBe(-22000)
  })

  it('verwacht 0 zonder startdatum (geen achterstand)', () => {
    const stand = standPerOuder(kr({ maandbijdrageJij: 20000 }), [storting(5000, 'jij')], '2026-05-01')
    expect(stand.jij.verwacht).toBe(0)
    expect(stand.jij.verschil).toBe(5000)
  })
})
