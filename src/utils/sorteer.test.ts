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
