import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
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

function toon(
  posten: TerugkerendePost[],
  budgetten: Budget[] = [],
  maand = '2026-07',
  inkomsten = 240000,
  geboekt = 0,
  onGaNaarTransacties?: (filter: { maand: string; richting: 'in' }) => void,
) {
  render(
    <PlanRegels
      posten={posten}
      budgetten={budgetten}
      maand={maand}
      verwachteInkomsten={inkomsten}
      geboekteInkomsten={geboekt}
      onGaNaarTransacties={onGaNaarTransacties}
    />,
  )
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
      <PlanRegels posten={[]} budgetten={[]} maand="2026-07" verwachteInkomsten={0} geboekteInkomsten={0} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

// --- Ronde 25: geen misleidend cijfer, en de vergelijking met wat er binnenkwam ---

const loon: TerugkerendePost = { id: 'loon', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', dag: 25 }

describe('PlanRegels — zonder bekende inkomsten', () => {
  it('toont geen negatief "te verdelen" maar zegt wat er ontbreekt', () => {
    // Wel vaste lasten, geen vaste inkomst en nog niets geboekt: een groot rood
    // bedrag zou hier een oordeel lijken over je situatie, terwijl het gewoon
    // betekent dat er nog niets ingevuld is.
    toon([huur], [], '2026-07', 0)
    expect(document.querySelector('[data-te-verdelen]')).toBeNull()
    expect(screen.getByText(/Vul hieronder je vaste inkomsten in/)).toBeInTheDocument()
  })

  it('toont het cijfer wél zodra er een vaste inkomst is', () => {
    toon([huur, loon], [], '2026-07', 240000)
    expect(document.querySelector('[data-te-verdelen]')).not.toBeNull()
  })
})

describe('PlanRegels — verwacht tegenover werkelijk binnengekomen', () => {
  function vergelijking(): string {
    return document.querySelector('[data-inkomstenvergelijking]')?.textContent ?? ''
  }

  it('zwijgt zolang er nog niets binnengekomen is', () => {
    toon([huur, loon], [], '2026-07', 240000, 0)
    expect(vergelijking()).toBe('')
  })

  it('meldt hoeveel er méér binnenkwam', () => {
    // € 2.530 gekregen tegenover € 2.400 vaste inkomsten = € 130 meer.
    toon([huur, loon], [], '2026-07', 253000, 253000)
    expect(vergelijking()).toMatch(/meer dan je vaste inkomsten/)
    expect(vergelijking()).toMatch(/130,00/)
  })

  it('meldt hoeveel er minder binnenkwam', () => {
    toon([huur, loon], [], '2026-07', 230000, 230000)
    expect(vergelijking()).toMatch(/minder dan je vaste inkomsten/)
    expect(vergelijking()).toMatch(/100,00/)
  })

  it('zegt het ook wanneer het precies klopt', () => {
    toon([huur, loon], [], '2026-07', 240000, 240000)
    expect(vergelijking()).toMatch(/precies je vaste inkomsten/)
  })
})

// --- Ronde 48: van een cijfer naar de boekingen --------------------------------

describe('PlanRegels — doorklikken', () => {
  const MAAND = '2026-07'
  // De vergelijkingsregel verschijnt pas met een vaste INKOMST én iets geboekt.
  const loon: TerugkerendePost = { id: 'loon', omschrijving: 'Loon', bedrag: 200000, rekeningId: 'r1', dag: 25 }

  it('laat alleen het GEBOEKTE bedrag doorklikken, niet het verwachte', async () => {
    // "Verwachte inkomsten" telt ook vaste posten mee die nog niet geboekt zijn —
    // daar bestaat geen transactie voor. Wie daarop klikt, zou een lege lijst
    // krijgen. Het geboekte bedrag telt regel voor regel exact hetzelfde op als de
    // lijst zelf.
    const gebruiker = userEvent.setup()
    const onGaNaarTransacties = vi.fn()
    toon([huur, loon], [], MAAND, 240000, 200000, onGaNaarTransacties)
    expect(screen.queryByRole('button', { name: /Verwachte inkomsten/ })).toBeNull()
    const knop = screen.getByRole('button', { name: /^Bekijk die boekingen/ })
    await gebruiker.click(knop)
    expect(onGaNaarTransacties).toHaveBeenCalledWith({ maand: MAAND, richting: 'in' })
  })

  it('maakt geen knop wanneer de app er niets mee kan', () => {
    toon([huur, loon], [], MAAND, 240000, 200000)
    expect(screen.queryByRole('button', { name: /^Bekijk die boekingen/ })).toBeNull()
  })
})
