import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { EersteStap } from './EersteStap'

// Ronde 66: deze kaart stond alleen op Overzicht, terwijl een gloednieuwe app je op
// "Je situatie" laat landen. Ze werkt nu op allebei de plekken, met een knop die
// zich aanpast.
describe('EersteStap', () => {
  it('wijst op Overzicht naar Je situatie', async () => {
    const user = userEvent.setup()
    const onNaar = vi.fn()
    render(<EersteStap onNaarRekeningen={onNaar} />)

    expect(screen.getByText(/Loop "Je situatie" door/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Breng je situatie in kaart' }))
    expect(onNaar).toHaveBeenCalled()
  })

  it('wijst op Je situatie zelf naar het eerste blok', async () => {
    const user = userEvent.setup()
    const onNaar = vi.fn()
    render(<EersteStap hier onNaarRekeningen={onNaar} />)

    // ⚠ "Loop Je situatie door" terwijl je er staat, is een instructie die nergens
    // heen wijst.
    expect(screen.queryByText(/Loop "Je situatie" door/)).toBeNull()
    expect(screen.getByText(/Loop de blokken hieronder door/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Begin bij "Je geld"' }))
    expect(onNaar).toHaveBeenCalled()
  })

  it('laat de gevulde knop aan het formulier op de pagina waar je al staat', () => {
    // DESIGN.md, regel 2: hoogstens één gevulde knop per scherm. Op Je situatie
    // draagt het invulformulier die.
    const { rerender, container } = render(<EersteStap onNaarRekeningen={vi.fn()} />)
    expect(container.querySelector('.knop-primair')).not.toBeNull()

    rerender(<EersteStap hier onNaarRekeningen={vi.fn()} />)
    expect(container.querySelector('.knop-primair')).toBeNull()
    expect(container.querySelector('.knop-secundair')).not.toBeNull()
  })

  it('belooft alleen wat de app altijd waarmaakt', () => {
    // ⚠ De KERN van deze test is de tweede verwachting, niet de eerste. Ze stond er
    // eerst alleen positief in ("staat de belofte er?"), en die zin stond er sowieso
    // al — de test kon dus niet falen aan wat hij beweerde te bewaken. Wat de kaart
    // NIET meer mag zeggen is "hoelang je toekomt": daarvoor heb je een spaarpot of
    // cash nodig, en die heeft niet iedereen.
    const { container, rerender } = render(<EersteStap onNaarRekeningen={vi.fn()} />)
    expect(screen.getByText(/Na tien minuten weet je wat er elke maand vastligt/)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/hoelang je toekomt/i)

    rerender(<EersteStap hier onNaarRekeningen={vi.fn()} />)
    expect(screen.getByText(/Na tien minuten weet je wat er elke maand vastligt/)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/hoelang je toekomt/i)
  })
})
