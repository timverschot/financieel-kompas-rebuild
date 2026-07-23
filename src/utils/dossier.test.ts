import { describe, it, expect } from 'vitest'
import { saldoVerrekening, saldoVerrekeningDossier, effectiefAandeel } from './dossier'
import type { Dossier, GedeeldeKost } from '../data/schema'

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 100,
  betaaldDoor: 'jij',
  datum: '2026-07-01',
  ...over,
})

describe('saldoVerrekening', () => {
  it('partner is jou zijn aandeel verschuldigd wanneer jij betaalde (50/50)', () => {
    expect(saldoVerrekening(50, [kost({ bedrag: 100, betaaldDoor: 'jij' })])).toBe(50)
  })

  it('jij bent jouw aandeel verschuldigd wanneer de partner betaalde (50/50)', () => {
    expect(saldoVerrekening(50, [kost({ bedrag: 100, betaaldDoor: 'partner' })])).toBe(-50)
  })

  it('verrekent meerdere kosten samen met een niet-gelijke sleutel', () => {
    // aandeelJij 30%: jij betaalt 200 (partner is jou 70% = 140 verschuldigd),
    // partner betaalt 100 (jij bent 30% = 30 verschuldigd) -> netto 140 - 30 = 110
    const netto = saldoVerrekening(30, [
      kost({ id: 'a', bedrag: 200, betaaldDoor: 'jij' }),
      kost({ id: 'b', bedrag: 100, betaaldDoor: 'partner' }),
    ])
    expect(netto).toBeCloseTo(110)
  })

  it('geeft 0 zonder kosten', () => {
    expect(saldoVerrekening(50, [])).toBe(0)
  })
})

describe('effectiefAandeel (verdeel-hiërarchie)', () => {
  const dossier: Dossier = {
    id: 'd1',
    naam: 'Kinderen',
    aandeelJij: 52,
    categorieAandelen: { 'ov-gezondheid': 50, 'ov-kleding': 70 },
  }

  it('gebruikt de dossier-standaard als er niets anders is ingesteld', () => {
    expect(effectiefAandeel(dossier, kost({}))).toBe(52)
  })

  it('gebruikt het categorie-percentage wanneer de kost die categorie heeft', () => {
    expect(effectiefAandeel(dossier, kost({ categorieId: 'ov-kleding' }))).toBe(70)
  })

  it('laat een eigen percentage op de kost alles overschrijven', () => {
    expect(effectiefAandeel(dossier, kost({ categorieId: 'ov-kleding', aandeelJijOverride: 40 }))).toBe(40)
  })
})

describe('saldoVerrekeningDossier', () => {
  it('rekent per kost met het juiste percentage (52/48 standaard, 70/30 voor kleding)', () => {
    const dossier: Dossier = { id: 'd1', naam: 'K', aandeelJij: 52, categorieAandelen: { 'ov-kleding': 70 } }
    // Jij betaalt 200 gewoon (partner is jou 48% = 96 verschuldigd) en 100 kleding
    // (partner is jou 30% = 30 verschuldigd) -> netto 126.
    const netto = saldoVerrekeningDossier(dossier, [
      kost({ id: 'a', bedrag: 200, betaaldDoor: 'jij' }),
      kost({ id: 'b', bedrag: 100, betaaldDoor: 'jij', categorieId: 'ov-kleding' }),
    ])
    expect(netto).toBe(126)
  })

  it('valt zonder overrides terug op de dossier-standaard (gelijk aan saldoVerrekening)', () => {
    const dossier: Dossier = { id: 'd1', naam: 'K', aandeelJij: 50 }
    const kosten = [kost({ bedrag: 100, betaaldDoor: 'jij' })]
    expect(saldoVerrekeningDossier(dossier, kosten)).toBe(saldoVerrekening(50, kosten))
  })
})
