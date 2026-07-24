import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LeningSectie } from './LeningSectie'
import type { Aflossing, Lening } from '../data/schema'

function toon(leningen: Lening[] = [], aflossingen: Aflossing[] = [], props: Record<string, unknown> = {}) {
  const handlers = {
    onOpslaan: vi.fn(),
    onVerwijderen: vi.fn(),
    onAflossingOpslaan: vi.fn(),
    onAflossingVerwijderen: vi.fn(),
    ...props,
  }
  render(<LeningSectie leningen={leningen} aflossingen={aflossingen} {...handlers} />)
  return handlers
}

describe('LeningSectie', () => {
  it('voegt een lening toe met het bedrag in centen', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.type(screen.getByLabelText('Naam'), 'Lening aan broer')
    await user.type(screen.getByLabelText('Startbedrag / openstaand kapitaal (€)'), '1000')
    await user.click(screen.getByRole('button', { name: 'Lening toevoegen' }))
    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Lening aan broer', hoofdsom: 100000, richting: 'uitgeleend' }),
    )
  })

  it('toont het openstaand kapitaal en een voortgangsbalk', () => {
    const l: Lening = { id: 'l1', naam: 'Autolening', richting: 'geleend', hoofdsom: 100000, startdatum: '2026-01-01' }
    toon([l], [{ id: 'a1', leningId: 'l1', datum: '2026-02-01', bedrag: 25000 }])
    // 100000 − 25000 = 75000 = € 750,00 nog te betalen
    expect(screen.getByText(/750,00/)).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Autolening' })
    expect(bar).toHaveAttribute('aria-valuenow', '25')
  })

  it('voegt een aflossing toe aan een openstaande lening', async () => {
    const user = userEvent.setup()
    const l: Lening = { id: 'l1', naam: 'Autolening', richting: 'geleend', hoofdsom: 100000, startdatum: '2026-01-01' }
    const { onAflossingOpslaan } = toon([l], [])
    await user.type(screen.getByLabelText('Aflossing (€)'), '200')
    await user.click(screen.getByRole('button', { name: 'Aflossing toevoegen' }))
    expect(onAflossingOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ leningId: 'l1', bedrag: 20000 }),
    )
  })
})
