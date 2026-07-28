import { describe, it, expect } from 'vitest'
import type { Aflossing, Lening, Transactie } from '../data/schema'
import {
  aflossingenVan,
  totaalAfgelost,
  openstaandKapitaal,
  totaalOpenstaand,
  voortgang,
  isAfbetaald,
  evolutie,
  maandenTotEinde,
  boekingVoorAflossing,
} from './lening'

const lening = (extra: Partial<Lening> = {}): Lening => ({
  id: 'l1',
  naam: 'Lening aan broer',
  richting: 'uitgeleend',
  hoofdsom: 100000, // € 1000
  startdatum: '2026-01-01',
  ...extra,
})

const afl = (bedrag: number, datum: string, leningId = 'l1'): Aflossing => ({
  id: `a-${bedrag}-${datum}`,
  leningId,
  datum,
  bedrag,
})

describe('aflossingenVan', () => {
  it('filtert op lening en sorteert oplopend op datum', () => {
    const alle = [afl(1000, '2026-03-01'), afl(2000, '2026-02-01'), afl(500, '2026-01-15', 'ander')]
    const r = aflossingenVan('l1', alle)
    expect(r.map((a) => a.datum)).toEqual(['2026-02-01', '2026-03-01'])
  })
})

describe('totaalAfgelost / openstaandKapitaal', () => {
  it('telt af en trekt van de hoofdsom af', () => {
    const alle = [afl(30000, '2026-02-01'), afl(20000, '2026-03-01')]
    expect(totaalAfgelost('l1', alle)).toBe(50000)
    expect(openstaandKapitaal(lening(), alle)).toBe(50000)
  })

  it('gaat nooit onder nul, ook bij te veel aflossen', () => {
    const alle = [afl(120000, '2026-02-01')]
    expect(openstaandKapitaal(lening(), alle)).toBe(0)
  })
})

describe('totaalOpenstaand', () => {
  const uitgeleend = lening({ id: 'l1', richting: 'uitgeleend', hoofdsom: 100000 })
  const geleend = lening({ id: 'l2', naam: 'Autolening', richting: 'geleend', hoofdsom: 200000 })

  it('telt op wat er nog openstaat, per richting en samen', () => {
    const alle = [afl(25000, '2026-02-01', 'l1')]
    expect(totaalOpenstaand([uitgeleend, geleend], alle, 'uitgeleend')).toBe(75000)
    expect(totaalOpenstaand([uitgeleend, geleend], alle, 'geleend')).toBe(200000)
    expect(totaalOpenstaand([uitgeleend, geleend], alle)).toBe(275000)
  })

  it('laat een manueel afgesloten lening buiten beschouwing', () => {
    const dicht = lening({ id: 'l1', richting: 'uitgeleend', hoofdsom: 100000, afgesloten: true })
    expect(totaalOpenstaand([dicht, geleend], [])).toBe(200000)
    expect(totaalOpenstaand([dicht], [], 'uitgeleend')).toBe(0)
  })
})

describe('voortgang', () => {
  it('is de fractie afgelost van de hoofdsom', () => {
    expect(voortgang(lening(), [afl(25000, '2026-02-01')])).toBe(0.25)
  })

  it('is begrensd op 1', () => {
    expect(voortgang(lening(), [afl(200000, '2026-02-01')])).toBe(1)
  })
})

describe('isAfbetaald', () => {
  it('is waar wanneer het openstaand kapitaal 0 is', () => {
    expect(isAfbetaald(lening(), [afl(100000, '2026-02-01')])).toBe(true)
  })

  it('is waar wanneer de lening manueel is afgesloten', () => {
    expect(isAfbetaald(lening({ afgesloten: true }), [])).toBe(true)
  })

  it('is onwaar zolang er nog openstaat', () => {
    expect(isAfbetaald(lening(), [afl(10000, '2026-02-01')])).toBe(false)
  })
})

describe('evolutie', () => {
  it('start op de hoofdsom en daalt bij elke aflossing', () => {
    const punten = evolutie(lening(), [afl(40000, '2026-02-01'), afl(10000, '2026-03-01')])
    expect(punten).toEqual([
      { datum: '2026-01-01', openstaand: 100000 },
      { datum: '2026-02-01', openstaand: 60000 },
      { datum: '2026-03-01', openstaand: 50000 },
    ])
  })
})

describe('maandenTotEinde', () => {
  it('telt hele maanden tot de einddatum', () => {
    expect(maandenTotEinde('2026-10-01', '2026-07-01')).toBe(3)
  })

  it('is negatief wanneer de termijn verstreken is', () => {
    expect(maandenTotEinde('2026-05-01', '2026-07-01')).toBe(-2)
  })
})

// --- De brug aflossing ↔ boeking (ronde 38) ----------------------------------

describe('boekingVoorAflossing', () => {
  const boeking = (id: string, datum: string, bedrag: number): Transactie => ({
    id,
    datum,
    omschrijving: 'Bank',
    bedrag,
    rekeningId: 'r1',
  })

  it('herkent bij een KREDIET een uitgave van hetzelfde bedrag op dezelfde dag', () => {
    const tx = [boeking('t1', '2026-07-05', -250_00)]
    expect(boekingVoorAflossing('2026-07-05', 250_00, tx, 'geleend')?.id).toBe('t1')
  })

  it('herkent bij UITGELEEND geld juist een inkomst', () => {
    // Krijg je terugbetaald wat je uitleende, dan is dat een inkomst. Tekenblind
    // vergelijken zou hier het verkeerde antwoord geven.
    const tx = [boeking('t1', '2026-07-05', 250_00)]
    expect(boekingVoorAflossing('2026-07-05', 250_00, tx, 'uitgeleend')?.id).toBe('t1')
  })

  it('wijst een INKOMST niet aan als afbetaling van een krediet', () => {
    // Het geval dat de verificatieronde vond: op de dag van je aflossing van € 250
    // staat er ook een terugbetaling van € 250 op je rekening.
    const tx = [boeking('t1', '2026-07-05', 250_00)]
    expect(boekingVoorAflossing('2026-07-05', 250_00, tx, 'geleend')).toBeUndefined()
  })

  it('zwijgt bij een ander bedrag of een andere dag', () => {
    const tx = [boeking('t1', '2026-07-05', -250_00)]
    expect(boekingVoorAflossing('2026-07-05', 250_01, tx, 'geleend')).toBeUndefined()
    expect(boekingVoorAflossing('2026-07-06', 250_00, tx, 'geleend')).toBeUndefined()
  })

  it('slaat een boeking over die al aan een andere aflossing hangt', () => {
    // Twee aflossingen van hetzelfde bedrag op dezelfde dag horen niet allebei naar
    // dezelfde boeking te wijzen.
    const tx = [boeking('t1', '2026-07-05', -250_00), boeking('t2', '2026-07-05', -250_00)]
    const al: Aflossing[] = [{ id: 'a1', leningId: 'l1', datum: '2026-07-05', bedrag: 250_00, transactieId: 't1' }]
    expect(boekingVoorAflossing('2026-07-05', 250_00, tx, 'geleend', al)?.id).toBe('t2')
  })

  it('geeft niets terug wanneer alle kandidaten al gekoppeld zijn', () => {
    const tx = [boeking('t1', '2026-07-05', -250_00)]
    const al: Aflossing[] = [{ id: 'a1', leningId: 'l1', datum: '2026-07-05', bedrag: 250_00, transactieId: 't1' }]
    expect(boekingVoorAflossing('2026-07-05', 250_00, tx, 'geleend', al)).toBeUndefined()
  })
})
