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

  // Probleem 1: een lening moet afgerond kunnen worden (kwijtgescholden geld,
  // een vervroegd afbetaald krediet), anders blijft ze eeuwig openstaan.
  it('sluit een lening af via dezelfde opslagweg', async () => {
    const user = userEvent.setup()
    const l: Lening = { id: 'l1', naam: 'Autolening', richting: 'geleend', hoofdsom: 100000, startdatum: '2026-01-01' }
    const { onOpslaan } = toon([l], [])
    await user.click(screen.getByRole('button', { name: 'Sluit lening Autolening af' }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1', afgesloten: true }))
  })

  it('heropent een afgesloten lening', async () => {
    const user = userEvent.setup()
    const l: Lening = { id: 'l1', naam: 'Autolening', richting: 'geleend', hoofdsom: 100000, startdatum: '2026-01-01', afgesloten: true }
    const { onOpslaan } = toon([l], [])
    await user.click(screen.getByRole('button', { name: 'Heropen lening Autolening' }))
    expect(onOpslaan).toHaveBeenCalledWith({
      id: 'l1',
      naam: 'Autolening',
      richting: 'geleend',
      hoofdsom: 100000,
      startdatum: '2026-01-01',
    })
  })

  it('toont een afgesloten lening rustiger en telt ze niet mee in wat openstaat', () => {
    const open: Lening = { id: 'l1', naam: 'Autolening', richting: 'geleend', hoofdsom: 100000, startdatum: '2026-01-01' }
    const dicht: Lening = { id: 'l2', naam: 'Broer', richting: 'uitgeleend', hoofdsom: 50000, startdatum: '2026-01-01', afgesloten: true }
    toon([open, dicht], [])
    expect(screen.getByText('afgesloten')).toBeInTheDocument()
    // Enkel de openstaande lening krijgt nog een aflossingsformulier.
    expect(screen.getAllByLabelText('Aflossing (€)')).toHaveLength(1)
    // € 500 uitgeleend staat wel nog in de rij, maar telt niet meer mee in het totaal.
    expect(screen.getByText('Nog te ontvangen').parentElement).toHaveTextContent('€ 0,00')
    expect(screen.getByText('Nog te betalen').parentElement).toHaveTextContent('€ 1.000,00')
  })

  // Probleem 2: te veel aflossen werd stil afgekapt op 0.
  it('waarschuwt wanneer de aflossing groter is dan wat er nog openstaat', async () => {
    const user = userEvent.setup()
    const l: Lening = { id: 'l1', naam: 'Autolening', richting: 'geleend', hoofdsom: 10000, startdatum: '2026-01-01' }
    const { onAflossingOpslaan } = toon([l], [])
    await user.type(screen.getByLabelText('Aflossing (€)'), '300')
    expect(screen.getByText(/Dit is meer dan er nog openstaat/)).toBeInTheDocument()
    // De keuze blijft bij de gebruiker: de knop werkt gewoon.
    expect(screen.getByRole('button', { name: 'Aflossing toevoegen' })).toBeEnabled()
    // Eén klik zet het bedrag gelijk aan wat er nog openstaat.
    await user.click(screen.getByRole('button', { name: /Zet op/ }))
    expect(screen.queryByText(/Dit is meer dan er nog openstaat/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aflossing toevoegen' }))
    expect(onAflossingOpslaan).toHaveBeenCalledWith(expect.objectContaining({ leningId: 'l1', bedrag: 10000 }))
  })
})
