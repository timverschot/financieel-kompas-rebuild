import { describe, it, expect } from 'vitest'
import { filterBeschrijving, filterDelen } from './filterTekst'
import { vertaal } from '../i18n'
import { naamVanBesparingsdomein } from './besparen'
import type { TxFilter } from './transactieFilter'

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

// Ronde 41: de chips boven de transactielijst, de kop van de CSV en de bestandsnaam
// moeten alle drie hetzelfde zeggen over waarop de lijst gefilterd staat. Deze
// tests leggen die ene formulering vast.

const namen = {
  categorieNaam: (id: string) => ({ 'ov-voeding': 'Voeding', 'cat-brood': 'Brood' })[id],
  rekeningNaam: (id: string) => ({ r1: 'Betaalrekening' })[id],
}

describe('filterDelen', () => {
  it('geeft niets terug zonder filter', () => {
    expect(filterDelen(t, {})).toEqual([])
  })

  it('houdt de volgorde van het scherm aan: de maand achteraan', () => {
    const filter: TxFilter = { maand: '2026-03', richting: 'uit', zoek: 'colruyt' }
    expect(filterDelen(t, filter).map((d) => d.sleutel)).toEqual(['zoek', 'richting', 'maand'])
  })

  it('gebruikt de meegegeven namen voor categorie en rekening', () => {
    const delen = filterDelen(t, { hoofdId: 'ov-voeding', rekeningId: 'r1' }, namen)
    expect(delen.map((d) => d.label)).toEqual(['Betaalrekening', 'Voeding'])
  })

  it('valt terug op het id wanneer een categorie niet gevonden wordt', () => {
    // Beter een onbegrijpelijk id dan een leeg chipje: dan zie je tenminste DAT er
    // gefilterd is.
    expect(filterDelen(t, { catId: 'i-onbekend' })).toEqual([{ sleutel: 'sub', label: 'i-onbekend' }])
  })

  it('zegt het wanneer een rekening niet meer bestaat', () => {
    expect(filterDelen(t, { rekeningId: 'weg' })).toEqual([{ sleutel: 'rekening', label: 'onbekende rekening' }])
  })

  it('schrijft de maand voluit in plaats van als 2026-03', () => {
    expect(filterDelen(t, { maand: '2026-03' })[0].label).toBe('maart 2026')
  })

  it('benoemt een besparingsdomein met zijn nette naam', () => {
    // Niet het kale interne sleutelwoord, maar de naam uit BESPARINGSDOMEINEN.
    const verwacht = naamVanBesparingsdomein('boodschappen')
    expect(verwacht).toBeTruthy()
    expect(filterDelen(t, { domein: 'boodschappen' })[0].label).toBe(verwacht)
  })

  it('valt terug op de sleutel bij een domein dat niet meer bestaat', () => {
    expect(filterDelen(t, { domein: 'weggehaald' })[0].label).toBe('weggehaald')
  })

  it('noemt een van-datum en een tot-datum apart', () => {
    const delen = filterDelen(t, { van: '2026-02-01', tot: '2026-03-31' })
    expect(delen).toEqual([
      { sleutel: 'van', label: 'Van 2026-02-01' },
      { sleutel: 'tot', label: 'Tot 2026-03-31' },
    ])
  })

  it('geeft elke sleutel hoogstens één keer terug', () => {
    const delen = filterDelen(
      t,
      { zoek: 'a', richting: 'uit', rekeningId: 'r1', hoofdId: 'ov-voeding', catId: 'cat-brood', domein: 'boodschappen', van: '2026-01-01', tot: '2026-12-31', maand: '2026-03' },
      namen,
    )
    const sleutels = delen.map((d) => d.sleutel)
    expect(new Set(sleutels).size).toBe(sleutels.length)
    expect(sleutels).toHaveLength(9)
  })

  it('noemt de richting in woorden', () => {
    expect(filterDelen(t, { richting: 'in' })[0].label).toBe('Inkomsten')
    expect(filterDelen(t, { richting: 'uit' })[0].label).toBe('Uitgaven')
  })
})

describe('filterBeschrijving', () => {
  it('zegt "alle transacties" wanneer er niets gefilterd is', () => {
    expect(filterBeschrijving(t, {})).toBe('alle transacties')
  })

  it('rijgt de delen aan elkaar', () => {
    const beschrijving = filterBeschrijving(t, { hoofdId: 'ov-voeding', maand: '2026-03' }, namen)
    expect(beschrijving).toBe('Voeding · maart 2026')
  })
})
