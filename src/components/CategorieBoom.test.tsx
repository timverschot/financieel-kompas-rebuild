import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategorieBoom } from './CategorieBoom'

function renderBoom(props: Partial<Parameters<typeof CategorieBoom>[0]> = {}) {
  const fns = { onToevoegen: vi.fn(), onWijzigen: vi.fn(), onVerwijderen: vi.fn() }
  render(<CategorieBoom aanpassingen={[]} {...fns} {...props} />)
  return fns
}

describe('CategorieBoom', () => {
  it('vouwt open van hoofdcategorie naar categorie naar items', async () => {
    const user = userEvent.setup()
    renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    expect(await screen.findByText('Eieren')).toBeInTheDocument()
  })

  it('voegt een subcategorie toe onder een categorie', async () => {
    const user = userEvent.setup()
    const fns = renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    await user.click(screen.getByRole('button', { name: 'Voeg subcategorie toe aan Zuivel en Kaas' }))
    await user.type(screen.getByLabelText('Nieuwe subcategorie in Zuivel en Kaas'), 'Kefir')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(fns.onToevoegen).toHaveBeenCalledWith('cat-zuivel-en-kaas', 'Kefir')
  })

  it('hernoemt een bestaande (ingebouwde) subcategorie', async () => {
    const user = userEvent.setup()
    const fns = renderBoom()
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    await user.click(await screen.findByRole('button', { name: /Zuivel en Kaas/ }))
    await user.click(screen.getByRole('button', { name: 'Wijzig Eieren' }))
    const input = screen.getByLabelText('Nieuwe naam voor Eieren')
    await user.clear(input)
    await user.type(input, 'Bio-eieren')
    await user.click(screen.getByRole('button', { name: 'Bewaar' }))
    expect(fns.onWijzigen).toHaveBeenCalledWith('i-eieren-4688', 'cat-zuivel-en-kaas', 'Bio-eieren')
  })

  it('toont een eigen toevoeging met verwijderknop', () => {
    const fns = renderBoom({ aanpassingen: [{ id: 'x1', naam: 'Kefir', categorieId: 'cat-zuivel-en-kaas' }] })
    expect(fns.onToevoegen).not.toHaveBeenCalled()
  })
})
