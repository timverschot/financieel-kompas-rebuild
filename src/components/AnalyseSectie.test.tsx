import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { AnalyseSectie } from './AnalyseSectie'
import type { Transactie } from '../data/schema'
import { vandaag } from '../utils/datum'

const rekeningen = [{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]
const recent = vandaag()

const tx = (id: string, categorieId: string, bedrag: number, omschrijving = 'Winkel'): Transactie => ({
  id,
  datum: recent,
  omschrijving,
  bedrag,
  rekeningId: 'r1',
  categorieId,
})

function toon(transacties: Transactie[]) {
  render(
    <AnalyseSectie
      transacties={transacties}
      categorieen={[]}
      rekeningen={rekeningen}
      overboekingen={[]}
      terugkerendePosten={[]}
    />,
  )
}

// 'i-brood--wit-9238' valt onder Voeding; we nemen daarnaast een uitgave op een
// andere hoofdcategorie zodat de ranglijst twee rijen heeft.
const boodschappen = tx('a', 'i-brood--wit-9238', -7500, 'Colruyt')
const tanken = tx('b', 'ov-vervoer-en-mobiliteit', -2500, 'Q8')

function kaart(titel: string): HTMLElement {
  return screen.getByText(titel).closest('section.kaart') as HTMLElement
}

describe('AnalyseSectie — verdeling en ranglijst', () => {
  it('zet de donut en de ranglijst in twee aparte kaarten', () => {
    toon([boodschappen, tanken])
    // Voorheen stonden ze in één kaart onder elkaar, waardoor je op een breed
    // scherm moest scrollen van de grafiek naar de cijfers.
    expect(kaart('Verdeling uitgaven')).toBeInTheDocument()
    expect(kaart('Ranglijst')).toBeInTheDocument()
    expect(kaart('Verdeling uitgaven')).not.toBe(kaart('Ranglijst'))
  })

  it('zet het totaal bij de donut, niet bij de ranglijst', () => {
    toon([boodschappen, tanken])
    expect(within(kaart('Verdeling uitgaven')).getByText('Totaal')).toBeInTheDocument()
  })

  it('toont per rij het aandeel als een eigen kolom', () => {
    toon([boodschappen, tanken])
    // € 75 van € 100 = 75%, € 25 = 25%. Samen exact 100%.
    const pcts = kaart('Ranglijst').querySelectorAll('.rij-pct')
    expect([...pcts].map((el) => el.textContent)).toEqual(['75%', '25%'])
  })

  it('geeft elke ranglijstrij een zichtbare chevron', () => {
    toon([boodschappen, tanken])
    expect(kaart('Ranglijst').querySelectorAll('.rij-chevron')).toHaveLength(2)
  })

  it('klikt een rij open naar het detail', async () => {
    const user = userEvent.setup()
    toon([boodschappen, tanken])
    await user.click(screen.getByRole('button', { name: 'Toon details van Voeding' }))
    expect(await screen.findByRole('button', { name: /Terug/ })).toBeInTheDocument()
  })

  it('toont één kaart met een lege toestand wanneer er niets is', () => {
    toon([])
    expect(screen.getByText('Geen uitgaven in deze periode')).toBeInTheDocument()
    expect(screen.queryByText('Ranglijst')).not.toBeInTheDocument()
  })
})

describe('AnalyseSectie — legende naast de donut', () => {
  it('zet de legende in hetzelfde raster als de donut', () => {
    toon([boodschappen, tanken])
    // De kaart per product/dienst gebruikt .donut-naast: op een breed scherm
    // staat de legende ernaast in plaats van eronder.
    const perProduct = kaart('Verdeling per product/dienst')
    expect(perProduct.querySelector('.donut-naast')).not.toBeNull()
    expect(perProduct.querySelectorAll('.donut-naast .rij-pct').length).toBeGreaterThan(0)
  })
})
