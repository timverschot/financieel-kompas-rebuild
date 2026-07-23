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
})
