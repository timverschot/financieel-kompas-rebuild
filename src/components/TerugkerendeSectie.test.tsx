import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TerugkerendeSectie } from './TerugkerendeSectie'
import type { TerugkerendePost } from '../data/schema'

const rekeningen = [{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]

const huur: TerugkerendePost = { id: 'huur', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
const premie: TerugkerendePost = {
  id: 'prem',
  omschrijving: 'Autoverzekering',
  bedrag: -60000,
  rekeningId: 'r1',
  dag: 5,
  frequentie: 'semester',
  startMaand: '2026-08',
}

function toon(posten: TerugkerendePost[], maand = '2026-07') {
  const onBoek = vi.fn()
  render(
    <TerugkerendeSectie
      posten={posten}
      rekeningen={rekeningen}
      categorieen={[]}
      transacties={[]}
      maand={maand}
      maandLabel="juli 2026"
      onOpslaan={vi.fn()}
      onVerwijderen={vi.fn()}
      onBoek={onBoek}
    />,
  )
  return { onBoek }
}

describe('TerugkerendeSectie — andere termijnen', () => {
  it('biedt "Boek in" aan voor een maandelijkse post', () => {
    toon([huur])
    expect(screen.getByRole('button', { name: 'Boek in' })).toBeInTheDocument()
  })

  it('biedt geen "Boek in" aan in een maand waarin de post niet vervalt', () => {
    // Halfjaarlijks vanaf augustus: in juli valt er niets te boeken. Zonder deze
    // regel zou je dezelfde jaarpremie twaalf keer kunnen inboeken.
    toon([premie], '2026-07')
    expect(screen.queryByRole('button', { name: 'Boek in' })).not.toBeInTheDocument()
    expect(screen.getByText('Niet deze maand')).toBeInTheDocument()
  })

  it('biedt "Boek in" wél aan in de vervalmaand', () => {
    toon([premie], '2026-08')
    expect(screen.getByRole('button', { name: 'Boek in' })).toBeInTheDocument()
  })

  // De keuzelijst van het formulier eronder bevat dezelfde woorden, dus zoeken we
  // bewust binnen de lijst met posten.
  function lijst(): HTMLElement {
    return document.querySelector('ul.lijst') as HTMLElement
  }

  it('zet de frequentie en de volgende vervaldag bij een niet-maandelijkse post', () => {
    toon([premie], '2026-08')
    expect(within(lijst()).getByText(/Om de 6 maanden/)).toBeInTheDocument()
    expect(within(lijst()).getByText(/volgende keer/)).toBeInTheDocument()
  })

  it('zegt niets over frequentie bij een gewone maandelijkse post', () => {
    toon([huur])
    expect(within(lijst()).queryByText(/Om de/)).not.toBeInTheDocument()
    expect(within(lijst()).queryByText(/volgende keer/)).not.toBeInTheDocument()
  })
})
