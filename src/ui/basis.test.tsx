import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { EersteStapKnop, Kaart, Leeg } from './basis'

// Ronde 66 — de eerste stap in een lege toestand.
//
// De doorlichting telde negentien lege toestanden die alleen een CONSTATERING
// toonden en niets zeiden over wat je dan moest doen. Voor wie de app al kent is dat
// genoeg; voor wie ze leert is het een doodlopend scherm.
describe('Leeg', () => {
  it('blijft één zin wanneer er niets te doen valt', () => {
    const { container } = render(<Leeg>Nog geen inkomsten deze maand.</Leeg>)
    // ⚠ Een knop die nergens heen gaat is erger dan geen knop: "Geen inkomsten deze
    // maand" is gewoon waar, en er is niets aan te doen.
    expect(container.querySelector('p.leeg')).not.toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('zet de eerste stap onder de zin wanneer er wél iets te doen valt', async () => {
    const user = userEvent.setup()
    const onKlik = vi.fn()
    const { container } = render(
      <Leeg actie={<EersteStapKnop onClick={onKlik}>Maak een rekening aan</EersteStapKnop>}>
        Nog geen rekeningen.
      </Leeg>,
    )
    expect(container.querySelector('.leeg-met-stap')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Maak een rekening aan' }))
    expect(onKlik).toHaveBeenCalled()
  })

  it('geeft elke eerste stap dezelfde vorm', () => {
    const { container } = render(<EersteStapKnop onClick={vi.fn()}>Doe dit</EersteStapKnop>)
    const knop = container.querySelector('button') as HTMLElement
    // Eén vorm, zodat je hem na één keer herkent — en nooit de gevulde knop, want
    // die is voor de hoofdactie van het scherm (DESIGN.md, regel 2).
    expect(knop).toHaveClass('knop-secundair')
    expect(knop).not.toHaveClass('knop-primair')
    expect(knop).toHaveAttribute('type', 'button')
  })
})

describe('Kaart', () => {
  it('toont een bijschrift ook zonder titel', () => {
    // ⚠ RONDE 66. De kop werd alleen gerenderd bij een titel of een actie, dus een
    // kaart met enkel een bijschrift slikte die zin geruisloos in. Dat gebeurde toen
    // een kaart haar titel afstond aan het tabblad erboven.
    render(<Kaart bijschrift="Zo werkt deze lade.">inhoud</Kaart>)
    expect(screen.getByText('Zo werkt deze lade.')).toBeInTheDocument()
  })

  it('laat de kop weg wanneer er niets in staat', () => {
    const { container } = render(<Kaart>inhoud</Kaart>)
    expect(container.querySelector('.kaart-kop')).toBeNull()
  })
})
