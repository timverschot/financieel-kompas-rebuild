import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { CategorieBoom } from './CategorieBoom'

describe('CategorieBoom', () => {
  it('toont de hoofdcategorieën', () => {
    render(<CategorieBoom />)
    expect(screen.getByRole('button', { name: /Voeding/ })).toBeInTheDocument()
  })

  it('vouwt open van hoofdcategorie naar categorie naar items', async () => {
    const user = userEvent.setup()
    render(<CategorieBoom />)

    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    expect(await screen.findByText('Eieren')).toBeInTheDocument()
  })
})
