import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategorieKiezer } from './CategorieKiezer'

describe('CategorieKiezer', () => {
  it('toont de hoofdcategorieën en laat er een kiezen', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    expect(onKies).toHaveBeenCalledWith('ov-voeding')
  })

  it('zoekt een specifiek item en kiest het', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'brood')
    await user.click(await screen.findByRole('button', { name: /Brood \(wit\)/ }))
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('toont het gekozen label', () => {
    render(<CategorieKiezer waarde="ov-drank" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByText('Drank')).toBeInTheDocument()
  })
})
