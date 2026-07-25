import { render, screen, waitFor } from '@testing-library/react'
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

  it('tagt breed via een hoofdcategorie-chip, ook tijdens het typen', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'brood')
    // De chips blijven zichtbaar terwijl de voorstellen getoond worden.
    await user.click(screen.getByRole('button', { name: /Huishouden en Verzorging/ }))
    expect(onKies).toHaveBeenCalledWith('ov-huishouden-en-verzorging')
  })

  it('maakt ter plekke een nieuwe subcategorie en tagt meteen op het nieuwe id', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-kefir-1')
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={onKies}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'Kefir')
    await user.click(await screen.findByRole('button', { name: /Kefir.*toevoegen/ }))

    await user.selectOptions(screen.getByLabelText('Onder welke categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    // Het bewaren is asynchroon; pas daarna wordt de regel op het nieuwe id getagd.
    await waitFor(() => expect(onNieuweSubcategorie).toHaveBeenCalledWith('cat-zuivel-en-kaas', 'Kefir'))
    await waitFor(() => expect(onKies).toHaveBeenCalledWith('sub-kefir-1'))
  })

  it('bereikt de toevoegen-regel met de pijltjes (ze telt mee in de navigatie)', async () => {
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-1')
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={() => {}}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'kefir')
    // Geen enkel bestaand item heet 'kefir': de toevoegen-regel staat bovenaan.
    await user.keyboard('{Enter}')
    expect(await screen.findByLabelText('Onder welke categorie')).toBeInTheDocument()
  })
})
