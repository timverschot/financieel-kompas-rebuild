import { describe, it, expect } from 'vitest'
import {
  dagKort,
  huidigeMaand,
  maandJaarLabel,
  maandKort,
  maandVoluit,
  naarDatumTekst,
  vandaag,
  dagJaar,
  periodeSoort,
  periodeLabel,
  laatsteDagVanPeriode,
  jaarVan,
  maandenVanJaar,
} from './datum'

describe('datum', () => {
  it('zet een datum om naar JJJJ-MM-DD met voorloopnullen', () => {
    expect(naarDatumTekst(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(naarDatumTekst(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('rekent met de lokale kalender, niet met de wereldtijd', () => {
    // 1 augustus 2026 om 01:30 lokale tijd. In UTC is het dan (in de Belgische
    // zomertijd) nog 31 juli — de oude aanpak gaf daardoor de verkeerde dag.
    const nacht = new Date(2026, 7, 1, 1, 30)
    expect(vandaag(nacht)).toBe('2026-08-01')
    expect(huidigeMaand(nacht)).toBe('2026-08')
  })

  it('geeft de maand als JJJJ-MM', () => {
    expect(huidigeMaand(new Date(2026, 2, 9))).toBe('2026-03')
  })
})

describe('maandJaarLabel', () => {
  it('schrijft een maand en jaar leesbaar uit', () => {
    expect(maandJaarLabel('2028-07-26')).toBe('juli 2028')
    expect(maandJaarLabel('2026-01')).toBe('januari 2026')
  })

  it('laat onleesbare invoer ongemoeid in plaats van iets te verzinnen', () => {
    expect(maandJaarLabel('geen datum')).toBe('geen datum')
  })
})

// Ronde 20: de vijf plaatsen die elk hun eigen Intl-regel schreven, gebruiken nu
// deze helpers. Zo staat er één plek waar de maandnamen vandaan komen.
describe('maandnamen', () => {
  it('schrijft een korte maandnaam voor aslabels', () => {
    expect(maandKort('2026-07')).toBe('jul')
    expect(maandKort('2026-01-15')).toBe('jan')
  })

  it('schrijft een maandnaam voluit', () => {
    expect(maandVoluit('2026-07')).toBe('juli')
  })

  it('schrijft een korte dag met maand', () => {
    expect(dagKort('2026-07-04')).toBe('04 jul')
  })

  it('laat onleesbare invoer ongemoeid in plaats van iets te verzinnen', () => {
    expect(maandKort('geen maand')).toBe('geen maand')
    expect(maandVoluit('x')).toBe('x')
    expect(dagKort('x')).toBe('x')
  })
})

describe('dagJaar', () => {
  it('toont dag, maand én jaar', () => {
    // Een waardering leg je vaak één keer per jaar vast; zonder jaartal zijn twee
    // regels "01 jan" niet uit elkaar te houden.
    expect(dagJaar('2026-01-04')).toContain('2026')
    expect(dagJaar('2026-01-04')).toContain('4')
  })

  it('geeft onleesbare invoer ongewijzigd terug in plaats van "Invalid Date"', () => {
    expect(dagJaar('geen datum')).toBe('geen datum')
  })
})

// ---------------------------------------------------------------------------
// PERIODES (ronde 41)
// ---------------------------------------------------------------------------

describe('periodeSoort', () => {
  it('herkent een jaar en een maand', () => {
    expect(periodeSoort('2026')).toBe('jaar')
    expect(periodeSoort('2026-07')).toBe('maand')
  })
})

describe('periodeLabel', () => {
  it('laat een jaar staan zoals het is', () => {
    expect(periodeLabel('2026')).toBe('2026')
  })

  it('schrijft een maand voluit', () => {
    expect(periodeLabel('2026-07')).toBe('juli 2026')
  })
})

describe('laatsteDagVanPeriode', () => {
  it('geeft 31 december bij een jaar', () => {
    expect(laatsteDagVanPeriode('2026')).toBe('2026-12-31')
  })

  it('kent het aantal dagen van elke maand', () => {
    expect(laatsteDagVanPeriode('2026-01')).toBe('2026-01-31')
    expect(laatsteDagVanPeriode('2026-04')).toBe('2026-04-30')
    expect(laatsteDagVanPeriode('2026-12')).toBe('2026-12-31')
  })

  it('kent schrikkeljaren', () => {
    // 2028 is een schrikkeljaar, 2026 niet.
    expect(laatsteDagVanPeriode('2026-02')).toBe('2026-02-28')
    expect(laatsteDagVanPeriode('2028-02')).toBe('2028-02-29')
  })

  it('geeft onzin ongewijzigd terug in plaats van een NaN-datum', () => {
    expect(laatsteDagVanPeriode('geen-datum')).toBe('geen-datum')
  })
})

describe('jaarVan', () => {
  it('pikt het jaar uit een maand of een datum', () => {
    expect(jaarVan('2026-07')).toBe('2026')
    expect(jaarVan('2026-07-04')).toBe('2026')
    expect(jaarVan('2026')).toBe('2026')
  })
})

describe('maandenVanJaar', () => {
  it('geeft twaalf maanden met een nul vooraan waar nodig', () => {
    const maanden = maandenVanJaar('2026')
    expect(maanden).toHaveLength(12)
    expect(maanden[0]).toBe('2026-01')
    expect(maanden[8]).toBe('2026-09')
    expect(maanden[11]).toBe('2026-12')
  })
})
