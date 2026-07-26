import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Dialoog } from './Dialoog'

function toon(open = true, onSluiten = vi.fn()) {
  render(
    <>
      <button type="button">Opener</button>
      <Dialoog titel="Nieuwe boeking" open={open} onSluiten={onSluiten} voet={<button type="button">Opslaan</button>}>
        <input aria-label="Bedrag" />
        <button type="button">Iets</button>
      </Dialoog>
    </>,
  )
  return { onSluiten }
}

describe('Dialoog', () => {
  it('toont niets zolang ze dicht staat', () => {
    toon(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is een echte modale dialoog met een naam', () => {
    toon()
    const d = screen.getByRole('dialog')
    expect(d).toHaveAttribute('aria-modal', 'true')
    expect(d).toHaveAccessibleName('Nieuwe boeking')
  })

  it('zet de focus op het eerste veld, niet op de sluitknop', () => {
    // De sluitknop staat in de HTML vóór de inhoud. Zou de focus daar landen, dan
    // sluit een druk op Enter de popup meteen weer.
    toon()
    expect(screen.getByLabelText('Bedrag')).toHaveFocus()
  })

  it('slaat knoppen vóór het eerste veld over', () => {
    // De boekingspopup begint met vier keuzeknoppen. Landt de focus daarop, dan moet
    // je alsnog gaan tabben voor je kan typen.
    render(
      <Dialoog titel="X" open onSluiten={vi.fn()}>
        <button type="button">Uitgave</button>
        <button type="button">Inkomst</button>
        <input aria-label="Handelaar" />
      </Dialoog>,
    )
    expect(screen.getByLabelText('Handelaar')).toHaveFocus()
  })

  it('valt terug op een knop als er geen veld is', () => {
    render(
      <Dialoog titel="X" open onSluiten={vi.fn()}>
        <button type="button">Ja</button>
        <button type="button">Nee</button>
      </Dialoog>,
    )
    expect(screen.getByRole('button', { name: 'Ja' })).toHaveFocus()
  })

  it('sluit met Escape, ook vanuit een invoerveld', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.type(screen.getByLabelText('Bedrag'), '12')
    await user.keyboard('{Escape}')
    expect(onSluiten).toHaveBeenCalled()
  })

  it('sluit met de kruisknop', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    expect(onSluiten).toHaveBeenCalled()
  })

  it('sluit bij een klik naast de popup', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.click(document.querySelector('.dialoog-laag') as HTMLElement)
    expect(onSluiten).toHaveBeenCalled()
  })

  it('sluit NIET bij een klik in de popup zelf', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.click(screen.getByRole('button', { name: 'Iets' }))
    expect(onSluiten).not.toHaveBeenCalled()
  })

  it('houdt de focus binnen: Tab vanaf het laatste element gaat naar het eerste', async () => {
    const user = userEvent.setup()
    toon()
    // Tab-volgorde volgt de HTML: sluitknop, velden, voetknop. Vanaf de voetknop
    // moet je dus rond naar de sluitknop, en niet naar de pagina eronder.
    screen.getByRole('button', { name: 'Opslaan' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sluiten' })).toHaveFocus()
  })

  it('houdt de focus binnen: Shift+Tab vanaf het eerste gaat naar het laatste', async () => {
    const user = userEvent.setup()
    toon()
    screen.getByRole('button', { name: 'Sluiten' }).focus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Opslaan' })).toHaveFocus()
  })

  it('laat de focus niet ontsnappen naar de knop achter de popup', async () => {
    const user = userEvent.setup()
    toon()
    // Vier keer tabben brengt je langs alle vier de focusbare elementen en terug
    // aan het begin — nooit op de opener die achter de popup staat.
    for (let i = 0; i < 4; i++) await user.tab()
    expect(screen.getByRole('button', { name: 'Opener' })).not.toHaveFocus()
  })

  it('blokkeert het scrollen van de pagina eronder, en geeft het terug', () => {
    const { unmount } = render(
      <Dialoog titel="X" open onSluiten={vi.fn()}>
        <input aria-label="A" />
      </Dialoog>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
