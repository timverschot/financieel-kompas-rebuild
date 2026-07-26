import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PlanRegels } from './PlanRegels'
import type { Budget, TerugkerendePost } from '../data/schema'

const huur: TerugkerendePost = { id: 'huur', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
const premie: TerugkerendePost = {
  id: 'prem',
  omschrijving: 'Autoverzekering',
  bedrag: -60000,
  rekeningId: 'r1',
  dag: 5,
  frequentie: 'semester',
  startMaand: '2026-08',
  opbouwen: true,
}

function toon(posten: TerugkerendePost[], budgetten: Budget[] = [], maand = '2026-07', inkomsten = 240000) {
  render(<PlanRegels posten={posten} budgetten={budgetten} maand={maand} verwachteInkomsten={inkomsten} />)
}

function teVerdelen(): string {
  return document.querySelector('[data-te-verdelen] .bedrag')?.textContent ?? ''
}

describe('PlanRegels', () => {
  it('trekt de vaste lasten van de verwachte inkomsten af', () => {
    toon([huur])
    // € 2.400 − € 950 = € 1.450
    expect(teVerdelen()).toMatch(/1[.\s]?450/)
  })

  it('zet in een maand zonder betaling het maandelijkse deel opzij', () => {
    toon([huur, premie], [], '2026-07')
    expect(screen.getByText('Opzij voor later')).toBeInTheDocument()
    // € 2.400 − € 950 − € 100 = € 1.350
    expect(teVerdelen()).toMatch(/1[.\s]?350/)
  })

  it('betaalt in de vervalmaand het volle bedrag en zet dan niets opzij', () => {
    toon([huur, premie], [], '2026-08')
    expect(screen.queryByText('Opzij voor later')).not.toBeInTheDocument()
    // € 2.400 − € 950 − € 600 = € 850
    expect(teVerdelen()).toMatch(/850/)
  })

  it('waarschuwt wanneer de budgetten samen meer vragen dan er overblijft', () => {
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 200000 }])
    expect(
      screen.getByText(/dat is meer dan er te verdelen valt/),
    ).toBeInTheDocument()
  })

  it('meldt gewoon hoeveel de budgetten opeisen wanneer het past', () => {
    toon([huur], [{ id: 'b1', categorieId: 'ov-voeding', bedrag: 40000 }])
    expect(screen.getByText(/Je budgetten vragen samen/)).toBeInTheDocument()
    expect(screen.queryByText(/meer dan er te verdelen valt/)).not.toBeInTheDocument()
  })

  it('toont het jaargemiddelde apart van het bedrag van deze maand', () => {
    toon([huur, premie], [], '2026-07')
    // € 950 + € 100 omgerekende premie = € 1.050 gemiddeld per maand.
    expect(screen.getByText(/gemiddeld.*1[.\s]?050/)).toBeInTheDocument()
  })

  it('toont niets op een lege app', () => {
    const { container } = render(
      <PlanRegels posten={[]} budgetten={[]} maand="2026-07" verwachteInkomsten={0} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
