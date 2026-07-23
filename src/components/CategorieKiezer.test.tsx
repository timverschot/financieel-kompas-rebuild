import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategorieKiezer } from './CategorieKiezer'

describe('CategorieKiezer', () => {
  it('toont hoofdcategorieën bij focus en laat er een kiezen', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.click(screen.getByLabelText('Zoek categorie of item'))
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    expect(onKies).toHaveBeenCalledWith('ov-voeding')
  })

  it('herkent items vanaf twee letters en kiest met de muis', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'brood')
    await user.click(await screen.findByRole('button', { name: /Brood \(wit\)/ }))
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('kiest met Enter het bovenste voorstel (ook op synoniem)', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'witbrood')
    await user.keyboard('{Enter}')
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('navigeert met pijl omlaag en kiest met Enter', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'brood')
    await user.keyboard('{ArrowDown}{Enter}') // van 'Brood (bruin)' naar 'Brood (wit)'
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('kiest met Tab het gemarkeerde voorstel', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'witbrood')
    await user.keyboard('{Tab}')
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('toont het gekozen label', () => {
    render(<CategorieKiezer waarde="ov-drank" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByText('Drank')).toBeInTheDocument()
  })
})
