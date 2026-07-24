import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { KindrekeningSectie } from './KindrekeningSectie'
import type { Dossier, Kindrekening, Kindrekeningpost } from '../data/schema'

const dossier: Dossier = { id: 'd1', naam: 'Co-ouderschap', aandeelJij: 52 }

function toon(kindrekening: Kindrekening | null, posten: Kindrekeningpost[] = [], props: Record<string, unknown> = {}) {
  const handlers = {
    onOpslaan: vi.fn(),
    onVerwijderen: vi.fn(),
    onPostOpslaan: vi.fn(),
    onPostVerwijderen: vi.fn(),
    ...props,
  }
  render(
    <KindrekeningSectie
      dossier={dossier}
      kindrekening={kindrekening}
      posten={posten}
      kinderen={[]}
      categorieen={[]}
      {...handlers}
    />,
  )
  return handlers
}

describe('KindrekeningSectie', () => {
  it('zet een kindrekening aan voor het dossier', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon(null)
    await user.click(screen.getByRole('button', { name: 'Kindrekening aanzetten' }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ dossierId: 'd1', beginsaldo: 0 }))
  })

  it('toont het saldo van de pot bij een bestaande kindrekening', () => {
    const kr: Kindrekening = { id: 'kr1', dossierId: 'd1', naam: 'Pot', beginsaldo: 5000 }
    const posten: Kindrekeningpost[] = [
      { id: 's1', kindrekeningId: 'kr1', datum: '2026-01-05', soort: 'storting', bedrag: 10000, door: 'jij' },
      { id: 'u1', kindrekeningId: 'kr1', datum: '2026-01-10', soort: 'uitgave', bedrag: 3000 },
    ]
    toon(kr, posten)
    // 5000 + 10000 − 3000 = 12000 centen = € 120,00
    expect(screen.getByText(/Saldo van de pot/)).toBeInTheDocument()
    expect(screen.getByText(/120,00/)).toBeInTheDocument()
  })

  it('voegt een storting toe via het formulier', async () => {
    const user = userEvent.setup()
    const kr: Kindrekening = { id: 'kr1', dossierId: 'd1', naam: 'Pot', beginsaldo: 0 }
    const { onPostOpslaan } = toon(kr, [])
    await user.type(screen.getByLabelText('Bedrag pot (€)'), '50')
    await user.click(screen.getByRole('button', { name: 'Beweging toevoegen' }))
    expect(onPostOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ kindrekeningId: 'kr1', soort: 'storting', bedrag: 5000, door: 'jij' }),
    )
  })
})
