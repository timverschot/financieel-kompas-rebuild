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
  // Sinds ronde 29 wonen de garanties als subtab op de Dossiers-pagina.
  pagina: 'dossiers',
  subtab: 'garantie',
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
    // Niet alleen de pagina, ook de lade: anders land je op de gedeelde kosten en
    // mag je zelf gaan zoeken waar die aflopende garantie staat.
    expect(onGaNaar).toHaveBeenCalledWith('dossiers', 'garantie')
  })

  it('sluit het paneel na een keuze', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[budgetMelding]} onGaNaar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    await user.click(screen.getByText('Budget Voeding is 92% verbruikt'))
    expect(document.querySelector('[data-meldingen]')).toBeNull()
  })
})

// Ronde 23: inboeken is een maandelijkse handeling. Ze moet vanuit het paneel
// kunnen, zonder eerst naar de Plan-pagina te navigeren.
describe('Meldingenbel — een vaste last meteen inboeken', () => {
  const melding: Melding = {
    id: 'vastelast-p1',
    soort: 'vastelast',
    sleutel: '{naam} staat nog niet ingeboekt deze maand',
    params: { naam: 'Huur' },
    pagina: 'budget',
    dringend: false,
    actie: { soort: 'boek-vastelast', postId: 'p1' },
  }

  it('boekt de post in zonder de pagina te verlaten', async () => {
    const user = userEvent.setup()
    const onGaNaar = vi.fn()
    const onBoekVasteLast = vi.fn()
    render(<Meldingenbel meldingen={[melding]} onGaNaar={onGaNaar} onBoekVasteLast={onBoekVasteLast} />)

    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    await user.click(screen.getByRole('button', { name: 'Boek in' }))

    expect(onBoekVasteLast).toHaveBeenCalledWith('p1')
    // Navigeren is precies wat we wilden vermijden.
    expect(onGaNaar).not.toHaveBeenCalled()
  })

  it('toont geen knop wanneer de app er geen meegeeft', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[melding]} onGaNaar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    expect(screen.queryByRole('button', { name: 'Boek in' })).not.toBeInTheDocument()
  })
})
