import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Aflossing, Lening } from '../data/schema'
import { VermogenRegel } from './VermogenRegel'

const len = (id: string, hoofdsom: number, richting: Lening['richting'], extra: Partial<Lening> = {}): Lening => ({
  id,
  naam: id,
  hoofdsom,
  richting,
  startdatum: '2026-01-01',
  ...extra,
})

describe('VermogenRegel', () => {
  it('toont niets zonder openstaande leningen', () => {
    // Zonder schuld is het netto vermogen exact het saldo; dat twee keer tonen is
    // alleen maar ruis.
    const { container } = render(<VermogenRegel bezit={100_000} leningen={[]} aflossingen={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('toont niets wanneer alle leningen afgesloten zijn', () => {
    const { container } = render(
      <VermogenRegel bezit={100_000} leningen={[len('a', 50_000, 'geleend', { afgesloten: true })]} aflossingen={[]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('trekt een schuld af en toont een negatief vermogen', () => {
    render(<VermogenRegel bezit={100_000} leningen={[len('a', 800_000, 'geleend')]} aflossingen={[]} />)
    // 1.000 − 8.000 = −7.000
    expect(screen.getByText(/Netto vermogen/)).toHaveTextContent('7.000')
    expect(screen.getByText(/nog te betalen/)).toBeInTheDocument()
  })

  it('telt uitgeleend geld op', () => {
    render(<VermogenRegel bezit={100_000} leningen={[len('a', 25_000, 'uitgeleend')]} aflossingen={[]} />)
    expect(screen.getByText(/Netto vermogen/)).toHaveTextContent('1.250')
    expect(screen.getByText(/nog te ontvangen/)).toBeInTheDocument()
  })

  it('markeert een negatief vermogen met de waarschuwingsbadge', () => {
    // De kleur is het enige verschil tussen "je bent 7.000 waard" en "je staat 7.000
    // in het rood". Zonder deze test bleef die ternary onbewaakt.
    const { container } = render(
      <VermogenRegel bezit={100_000} leningen={[len('a', 800_000, 'geleend')]} aflossingen={[]} />,
    )
    expect(container.querySelector('.badge-laat')).not.toBeNull()
    expect(screen.getByText(/Netto vermogen/).textContent).toContain('-')
  })

  it('gebruikt de neutrale badge zodra het vermogen positief is', () => {
    const { container } = render(
      <VermogenRegel bezit={1_000_000} leningen={[len('a', 800_000, 'geleend')]} aflossingen={[]} />,
    )
    expect(container.querySelector('.badge-laat')).toBeNull()
    expect(container.querySelector('.badge-neutraal')).not.toBeNull()
  })

  it('noemt beide richtingen in één zin wanneer je zowel tegoed als schuld hebt', () => {
    render(
      <VermogenRegel
        bezit={100_000}
        leningen={[len('a', 25_000, 'uitgeleend'), len('b', 800_000, 'geleend')]}
        aflossingen={[]}
      />,
    )
    const zin = screen.getByText(/Je rekeningen staan op/).textContent ?? ''
    expect(zin).toContain('nog te ontvangen')
    expect(zin).toContain('nog te betalen')
    // Geen dubbele spaties of een hangend voegwoord.
    expect(zin).not.toMatch(/\s{2}/)
  })

  it('houdt rekening met wat er al afgelost is', () => {
    const aflossingen: Aflossing[] = [{ id: 'x', leningId: 'a', datum: '2026-03-01', bedrag: 300_000 }]
    render(<VermogenRegel bezit={100_000} leningen={[len('a', 800_000, 'geleend')]} aflossingen={aflossingen} />)
    // 1.000 − (8.000 − 3.000) = −4.000
    expect(screen.getByText(/Netto vermogen/)).toHaveTextContent('4.000')
  })
})
