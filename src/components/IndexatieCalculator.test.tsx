import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { IndexatieCalculator } from './IndexatieCalculator'

describe('IndexatieCalculator', () => {
  it('berekent het geïndexeerde bedrag live (500, 100, 110 -> 550)', async () => {
    const user = userEvent.setup()
    render(<IndexatieCalculator />)

    await user.type(screen.getByLabelText('Basisbedrag (€)'), '500')
    await user.type(screen.getByLabelText('Aanvangsindex'), '100')
    await user.type(screen.getByLabelText('Nieuwe index'), '110')

    expect(await screen.findByText(/Geïndexeerd bedrag:/)).toHaveTextContent(/550/)
  })

  // Ronde 32: de kaarttitel wisselde mee met de gekozen tab ("Huurindexatie" /
  // "Alimentatie-indexatie"), terwijl die tabs er vlak onder al staan. De kop
  // herhaalde dus wat je zelf net had aangeklikt.
  it('houdt één vaste titel en laat de tabs het verschil maken', async () => {
    const user = userEvent.setup()
    render(<IndexatieCalculator />)

    expect(screen.getByText('Indexatie-tools')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alimentatie' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Huur' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Huur' }))
    expect(screen.getByText('Indexatie-tools')).toBeInTheDocument()
    expect(screen.queryByText('Huurindexatie')).toBeNull()
  })
})
