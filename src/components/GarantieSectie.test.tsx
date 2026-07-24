import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GarantieSectie } from './GarantieSectie'
import type { Garantie } from '../data/schema'

function toon(garanties: Garantie[] = [], props: Record<string, unknown> = {}) {
  const handlers = { onOpslaan: vi.fn(), onVerwijderen: vi.fn(), ...props }
  render(<GarantieSectie garanties={garanties} transacties={[]} {...handlers} />)
  return handlers
}

describe('GarantieSectie', () => {
  it('voegt een aankoop toe met de standaard garantieperiode van 24 maanden', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.type(screen.getByLabelText('Product'), 'Wasmachine')
    await user.click(screen.getByRole('button', { name: 'Garantie toevoegen' }))
    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ product: 'Wasmachine', garantieMaanden: 24 }),
    )
  })

  it('toont het product en de vervaldatum van een bestaande garantie', () => {
    const g: Garantie = { id: 'g1', product: 'Laptop', aankoopdatum: '2026-01-01', garantieMaanden: 24 }
    toon([g])
    expect(screen.getByText('Laptop')).toBeInTheDocument()
    // vervaldatum = aankoop + 24 maanden = 2028-01-01
    expect(screen.getByText(/2028-01-01/)).toBeInTheDocument()
  })
})
