import { describe, it, expect } from 'vitest'
import { huidigeMaand, maandJaarLabel, naarDatumTekst, vandaag } from './datum'

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
