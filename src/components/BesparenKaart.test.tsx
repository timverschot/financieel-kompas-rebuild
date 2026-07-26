import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { BesparenKaart } from './BesparenKaart'

const ITEM_BROOD = 'i-brood--wit-9238'
const CAT_ENERGIE = 'cat-energie-en-nutsvoorzieningen'

function tx(datum: string, bedrag: number, categorieId: string): Transactie {
  return { id: `t-${datum}-${bedrag}`, datum, omschrijving: 'x', bedrag, rekeningId: 'r1', categorieId }
}

describe('BesparenKaart', () => {
  it('zegt het netjes wanneer er in deze vier domeinen nog niets geboekt is', () => {
    render(<BesparenKaart transacties={[]} periode={{}} />)
    expect(
      screen.getByText(
        'Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten.',
      ),
    ).toBeInTheDocument()
  })

  it('toont alle vier de domeinen met hun bedrag zodra er iets geboekt is', () => {
    render(
      <BesparenKaart transacties={[tx('2026-07-02', -5000, ITEM_BROOD), tx('2026-07-03', -12000, CAT_ENERGIE)]} periode={{}} />,
    )
    expect(screen.getByText('Boodschappen')).toBeInTheDocument()
    expect(screen.getByText('Energie')).toBeInTheDocument()
    expect(screen.getByText('Telecom en abonnementen')).toBeInTheDocument()
    expect(screen.getByText('Verzekeringen')).toBeInTheDocument()
    expect(screen.getByText('€ 50,00')).toBeInTheDocument()
    expect(screen.getByText('€ 120,00')).toBeInTheDocument()
  })

  it('geeft bij elk domein een concrete tip', () => {
    render(<BesparenKaart transacties={[tx('2026-07-02', -5000, ITEM_BROOD)]} periode={{}} />)
    expect(screen.getByText('Vergelijk de prijzen van de winkels in je buurt en overloop je kassabonnen.')).toBeInTheDocument()
    expect(screen.getByText('Pas je verbruik aan en vergelijk de contracten van de leveranciers.')).toBeInTheDocument()
  })

  it('geeft elke balk een leesbare naam en haar eigen bedrag mee', () => {
    render(<BesparenKaart transacties={[tx('2026-07-03', -12000, CAT_ENERGIE)]} periode={{}} />)
    const balk = screen.getByRole('progressbar', { name: 'Energie' })
    expect(balk).toHaveAttribute('aria-valuenow', '12000')
    // Het zwaarste domein bepaalt de schaal van alle vier de balken.
    expect(balk).toHaveAttribute('aria-valuemax', '12000')
  })
})
