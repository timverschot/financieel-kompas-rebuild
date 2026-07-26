import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Meldingenbel } from './Meldingenbel'
import type { Melding } from '../utils/meldingen'

const budgetMelding: Melding = {
  id: 'budget-bijna-b1',
  soort: 'budget-bijna',
  sleutel: 'Budget {naam} is {pct}% verbruikt',
  params: { naam: 'Voeding', pct: 92 },
  pagina: 'budget',
  dringend: false,
}

const garantieMelding: Melding = {
  id: 'garantie-g1',
  soort: 'garantie',
  sleutel: 'Garantie op {product} verloopt binnen {n} dag(en)',
  params: { product: 'Koffiezet', n: 9 },
  pagina: 'leningen',
  dringend: true,
}

describe('Meldingenbel', () => {
  it('noemt het aantal meldingen in het toegankelijke label', () => {
    render(<Meldingenbel meldingen={[budgetMelding, garantieMelding]} onGaNaar={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Meldingen (2)' })).toBeInTheDocument()
  })

  it('heet gewoon "Meldingen" wanneer er niets is', () => {
    render(<Meldingenbel meldingen={[]} onGaNaar={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Meldingen' })).toBeInTheDocument()
  })

  it('toont het paneel pas na een klik', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[budgetMelding]} onGaNaar={vi.fn()} />)
    expect(document.querySelector('[data-meldingen]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    expect(screen.getByText('Budget Voeding is 92% verbruikt')).toBeInTheDocument()
  })

  it('zegt het expliciet wanneer er niets te melden is', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[]} onGaNaar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen' }))
    expect(screen.getByText('Niets om te melden. Al je budgetten en garanties zijn in orde.')).toBeInTheDocument()
  })

  it('brengt je naar de pagina van de melding waarop je klikt, niet altijd naar Budget', async () => {
    const user = userEvent.setup()
    const onGaNaar = vi.fn()
    render(<Meldingenbel meldingen={[budgetMelding, garantieMelding]} onGaNaar={onGaNaar} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen (2)' }))

    await user.click(screen.getByText('Garantie op Koffiezet verloopt binnen 9 dag(en)'))
    expect(onGaNaar).toHaveBeenCalledWith('leningen')
  })

  it('sluit het paneel na een keuze', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[budgetMelding]} onGaNaar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    await user.click(screen.getByText('Budget Voeding is 92% verbruikt'))
    expect(document.querySelector('[data-meldingen]')).toBeNull()
  })
})
