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
    // 'Broodwaren' staat bovenaan, 'Broodwaren (zoet)' er net onder.
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onKies).toHaveBeenCalledWith('cat-broodwaren--zoet')
  })

  // Ronde 28: de MIDDENlaag is kiesbaar geworden. Dat mocht pas nadat ronde 27
  // ervoor zorgde dat zo'n id netjes oprolt naar zijn hoofdcategorie — anders was
  // de transactie uit elke grafiek gevallen.
  it('stelt ook de hele categorie voor, niet enkel losse items', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'broodwaren')
    await user.click(await screen.findByRole('button', { name: /^Broodwaren · .*hele categorie/ }))
    expect(onKies).toHaveBeenCalledWith('cat-broodwaren')
  })

  it('toont het label van een gekozen middencategorie', () => {
    render(<CategorieKiezer waarde="cat-broodwaren" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByText('Broodwaren')).toBeInTheDocument()
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

  // Ronde 28: de chiprij schoof vroeger zijwaarts weg. Nu breekt ze af, en zit de
  // staart achter één knop in plaats van achter een onzichtbare schuifbeweging.
  it('houdt de chiprij kort en klapt de rest pas open op vraag', async () => {
    const user = userEvent.setup()
    render(<CategorieKiezer waarde={undefined} onKies={() => {}} gebruikerCategorieen={[]} />)

    expect(screen.queryByRole('button', { name: /Huisdieren/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Nog \d+/ }))
    expect(screen.getByRole('button', { name: /Huisdieren/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Minder tonen' }))
    expect(screen.queryByRole('button', { name: /Huisdieren/ })).toBeNull()
  })

  it('toont de gekozen categorie ook als ze buiten de korte rij valt', () => {
    render(<CategorieKiezer waarde="ov-huisdieren" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByRole('button', { name: /Huisdieren/ })).toBeInTheDocument()
  })

  it('zet een voorkeurcategorie vooraan', () => {
    render(
      <CategorieKiezer waarde={undefined} onKies={() => {}} gebruikerCategorieen={[]} voorkeurId="ov-inkomsten" />,
    )
    const groep = screen.getByRole('group', { name: 'Hoofdcategorieën' })
    expect(groep.querySelectorAll('button')[0].textContent).toContain('Inkomsten')
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
