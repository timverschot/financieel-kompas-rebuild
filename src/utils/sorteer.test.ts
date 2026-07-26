import { describe, it, expect } from 'vitest'
import { gesorteerdNieuwsteEerst, nieuwsteEerst, oudsteEerst } from './sorteer'

describe('nieuwsteEerst', () => {
  it('zet de nieuwste datum vooraan', () => {
    const lijst = [
      { id: 'a', datum: '2026-01-01' },
      { id: 'b', datum: '2026-07-01' },
      { id: 'c', datum: '2026-03-15' },
    ]
    expect(gesorteerdNieuwsteEerst(lijst).map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('is een CONSISTENTE vergelijker: a↔b omdraaien geeft het omgekeerde teken', () => {
    // Dit is precies wat de oude vergelijker fout deed. Hij gaf voor gelijke datums
    // altijd -1, in beide richtingen, waardoor de sortering ongedefinieerd werd.
    const a = { id: 'a', datum: '2026-07-01', omschrijving: 'Colruyt' }
    const b = { id: 'b', datum: '2026-07-01', omschrijving: 'Delhaize' }
    expect(Math.sign(nieuwsteEerst(a, b))).toBe(-Math.sign(nieuwsteEerst(b, a)))
  })

  it('geeft 0 voor twee volledig gelijke records', () => {
    const a = { id: 'x', datum: '2026-07-01', omschrijving: 'Zelfde' }
    expect(nieuwsteEerst(a, { ...a })).toBe(0)
  })

  it('ordent dezelfde dag op omschrijving, niet willekeurig', () => {
    const lijst = [
      { id: 'z', datum: '2026-07-01', omschrijving: 'Zalando' },
      { id: 'a', datum: '2026-07-01', omschrijving: 'Aldi' },
      { id: 'c', datum: '2026-07-01', omschrijving: 'Colruyt' },
    ]
    expect(gesorteerdNieuwsteEerst(lijst).map((x) => x.omschrijving)).toEqual(['Aldi', 'Colruyt', 'Zalando'])
  })

  it('geeft dezelfde uitkomst, ongeacht de volgorde waarin de records aankomen', () => {
    const basis = [
      { id: 'a', datum: '2026-07-01', omschrijving: 'Aldi' },
      { id: 'b', datum: '2026-07-01', omschrijving: 'Aldi' },
      { id: 'c', datum: '2026-07-01', omschrijving: 'Aldi' },
    ]
    const heen = gesorteerdNieuwsteEerst(basis).map((x) => x.id)
    const terug = gesorteerdNieuwsteEerst([...basis].reverse()).map((x) => x.id)
    expect(heen).toEqual(terug)
  })

  it('werkt zonder omschrijving en zonder id', () => {
    const lijst = [{ datum: '2026-01-01' }, { datum: '2026-07-01' }]
    expect(gesorteerdNieuwsteEerst(lijst).map((x) => x.datum)).toEqual(['2026-07-01', '2026-01-01'])
  })

  it('laat de invoerlijst ongemoeid', () => {
    const lijst = [{ id: 'a', datum: '2026-01-01' }, { id: 'b', datum: '2026-07-01' }]
    gesorteerdNieuwsteEerst(lijst)
    expect(lijst.map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('oudsteEerst', () => {
  it('draait de volgorde om', () => {
    const lijst = [{ id: 'a', datum: '2026-01-01' }, { id: 'b', datum: '2026-07-01' }]
    expect([...lijst].sort(oudsteEerst).map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('blijft consistent bij gelijke datums', () => {
    const a = { id: 'a', datum: '2026-07-01', omschrijving: 'Aldi' }
    const b = { id: 'b', datum: '2026-07-01', omschrijving: 'Colruyt' }
    expect(Math.sign(oudsteEerst(a, b))).toBe(-Math.sign(oudsteEerst(b, a)))
  })
})

// Ronde 25: binnen dezelfde dag wint het laatst ingevoerde record. Tik je 's avonds
// vijf bonnetjes van vandaag in, dan hoort het laatste bovenaan te staan.
describe('nieuwsteEerst — invoervolgorde binnen dezelfde dag', () => {
  const dag = '2026-07-26'

  it('zet het laatst ingevoerde bovenaan', () => {
    const eerst = { datum: dag, id: 'a', omschrijving: 'Aldi', ingevoerdOp: '2026-07-26T19:00:00.000Z' }
    const later = { datum: dag, id: 'z', omschrijving: 'Zeeman', ingevoerdOp: '2026-07-26T19:05:00.000Z' }
    expect([eerst, later].sort(nieuwsteEerst).map((r) => r.id)).toEqual(['z', 'a'])
    // Zonder invoertijdstip zou 'Aldi' hier bovenaan staan, puur op alfabet.
    expect([later, eerst].sort(nieuwsteEerst).map((r) => r.id)).toEqual(['z', 'a'])
  })

  it('laat de datum altijd voorgaan op het invoermoment', () => {
    // Een boeking van gisteren die je zonet intikte, hoort onder die van vandaag.
    const gisteren = { datum: '2026-07-25', id: 'g', ingevoerdOp: '2026-07-26T20:00:00.000Z' }
    const vandaag = { datum: dag, id: 'v', ingevoerdOp: '2026-07-26T08:00:00.000Z' }
    expect([gisteren, vandaag].sort(nieuwsteEerst).map((r) => r.id)).toEqual(['v', 'g'])
  })

  it('zet een record mét invoertijdstip boven een record zonder', () => {
    // Alles van vóór ronde 25 heeft geen tijdstip; wat er wél een heeft, is later
    // ingevoerd.
    const oud = { datum: dag, id: 'oud', omschrijving: 'Aldi' }
    const nieuw = { datum: dag, id: 'nieuw', omschrijving: 'Zeeman', ingevoerdOp: '2026-07-26T19:00:00.000Z' }
    expect([oud, nieuw].sort(nieuwsteEerst).map((r) => r.id)).toEqual(['nieuw', 'oud'])
  })

  it('valt zonder invoertijdstip terug op het oude, stabiele gedrag', () => {
    const a = { datum: dag, id: 'a', omschrijving: 'Aldi' }
    const z = { datum: dag, id: 'z', omschrijving: 'Zeeman' }
    expect([z, a].sort(nieuwsteEerst).map((r) => r.id)).toEqual(['a', 'z'])
  })

  it('geeft dezelfde uitkomst bij exact hetzelfde invoertijdstip', () => {
    const stempel = '2026-07-26T19:00:00.000Z'
    const a = { datum: dag, id: 'a', omschrijving: 'Aldi', ingevoerdOp: stempel }
    const z = { datum: dag, id: 'z', omschrijving: 'Zeeman', ingevoerdOp: stempel }
    expect([a, z].sort(nieuwsteEerst).map((r) => r.id)).toEqual([a, z].reverse().sort(nieuwsteEerst).map((r) => r.id))
  })
})
