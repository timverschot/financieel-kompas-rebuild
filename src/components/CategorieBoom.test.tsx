import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategorieBoom } from './CategorieBoom'
import { CategorieVolgordeProvider } from '../categorievolgorde'

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

// Ronde 30: de volgorde van de hoofdcategorieën is instelbaar — maar ALLEEN hier.
// In de invoerpopup ben je aan het boeken, en dan wil je kiezen, niet inrichten.
describe('CategorieBoom — volgorde van de hoofdcategorieën', () => {
  function namen(): string[] {
    return [...document.querySelectorAll('.rij-titel')].map((el) => el.textContent ?? '')
  }

  it('toont geen pijltjes zolang de app er geen handler voor meegeeft', () => {
    renderBoom()
    expect(screen.queryByRole('button', { name: /Zet Voeding/ })).toBeNull()
  })

  it('zet een hoofdcategorie een plaats lager', async () => {
    const user = userEvent.setup()
    const onVerplaats = vi.fn()
    renderBoom({ onVerplaats })
    await user.click(screen.getByRole('button', { name: 'Zet Voeding lager' }))
    expect(onVerplaats).toHaveBeenCalledWith('ov-voeding', 1)
  })

  it('zet een hoofdcategorie een plaats hoger', async () => {
    const user = userEvent.setup()
    const onVerplaats = vi.fn()
    renderBoom({ onVerplaats })
    await user.click(screen.getByRole('button', { name: 'Zet Drank hoger' }))
    expect(onVerplaats).toHaveBeenCalledWith('ov-drank', -1)
  })

  it('schakelt het pijltje uit aan de randen van de lijst', () => {
    renderBoom({ onVerplaats: vi.fn() })
    // De eerste kan niet omhoog.
    expect(screen.getByRole('button', { name: 'Zet Voeding hoger' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Zet Voeding lager' })).toBeEnabled()
  })

  it('volgt de bewaarde volgorde', () => {
    const fns = { onToevoegen: vi.fn(), onWijzigen: vi.fn(), onVerwijderen: vi.fn() }
    render(
      <CategorieVolgordeProvider volgorde={['ov-drank']}>
        <CategorieBoom aanpassingen={[]} {...fns} />
      </CategorieVolgordeProvider>,
    )
    expect(namen()[0]).toBe('Drank')
    expect(namen()[1]).toBe('Voeding')
  })
})
