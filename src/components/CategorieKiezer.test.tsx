import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategorieKiezer } from './CategorieKiezer'
import { CategorieVolgordeProvider } from '../categorievolgorde'

describe('CategorieKiezer', () => {
  it('toont hoofdcategorieën bij focus en laat er een kiezen', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.click(screen.getByLabelText('Zoek categorie of item'))
    // Ronde 30: de hoofdcategorieën zitten achter één knop. Openen, dan kiezen.
    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    expect(onKies).toHaveBeenCalledWith('ov-voeding')
  })

  it('herkent items vanaf twee letters en kiest met de muis', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'brood')
    await user.click(await screen.findByRole('option', { name: /Brood \(wit\)/ }))
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
    await user.click(await screen.findByRole('option', { name: /^Broodwaren · .*hele categorie/ }))
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
    // De knop blijft bereikbaar terwijl de voorstellen getoond worden.
    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
    await user.click(screen.getByRole('button', { name: /Huishouden en Verzorging/ }))
    expect(onKies).toHaveBeenCalledWith('ov-huishouden-en-verzorging')
  })

  // Ronde 30: geen halve rij met "Nog 6 …" meer. Eén knop, en daarachter ALLE
  // hoofdcategorieën in één keer — zichtbaar én aanklikbaar.
  it('toont in rust alleen de knop, en daarachter alle veertien hoofdcategorieën', async () => {
    const user = userEvent.setup()
    render(<CategorieKiezer waarde={undefined} onKies={() => {}} gebruikerCategorieen={[]} />)

    expect(screen.queryByRole('group', { name: 'Hoofdcategorieën' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Huisdieren/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
    const groep = screen.getByRole('group', { name: 'Hoofdcategorieën' })
    expect(groep.querySelectorAll('button')).toHaveLength(14)
    // Ook de staart van de lijst staat er nu bij; die zat vroeger achter "Nog 6 …".
    expect(within(groep).getByRole('button', { name: /Huisdieren/ })).toBeInTheDocument()
  })

  it('sluit het rooster na een keuze en zet die keuze op de knop', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
    await user.click(screen.getByRole('button', { name: /Huisdieren/ }))
    expect(onKies).toHaveBeenCalledWith('ov-huisdieren')
    expect(screen.queryByRole('group', { name: 'Hoofdcategorieën' })).toBeNull()
  })

  it('zet de gekozen categorie op de knop, ook zonder het rooster te openen', () => {
    render(<CategorieKiezer waarde="ov-huisdieren" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByRole('button', { name: /Hoofdcategorie: Huisdieren/ })).toBeInTheDocument()
  })

  it('zet een voorkeurcategorie vooraan in het rooster', async () => {
    const user = userEvent.setup()
    render(
      <CategorieKiezer waarde={undefined} onKies={() => {}} gebruikerCategorieen={[]} voorkeurId="ov-inkomsten" />,
    )
    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
    const groep = screen.getByRole('group', { name: 'Hoofdcategorieën' })
    expect(groep.querySelectorAll('button')[0].textContent).toContain('Inkomsten')
  })

  // Ronde 30: de volgorde die je op de Categorieën-pagina koos, geldt ook hier.
  it('volgt de volgorde uit de context', async () => {
    const user = userEvent.setup()
    render(
      <CategorieVolgordeProvider volgorde={['ov-huisdieren', 'ov-drank']}>
        <CategorieKiezer waarde={undefined} onKies={() => {}} gebruikerCategorieen={[]} />
      </CategorieVolgordeProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
    const knoppen = [...screen.getByRole('group', { name: 'Hoofdcategorieën' }).querySelectorAll('button')]
    expect(knoppen[0].textContent).toContain('Huisdieren')
    expect(knoppen[1].textContent).toContain('Drank')
    // En de rest volgt gewoon achteraan in de standaardvolgorde.
    expect(knoppen[2].textContent).toContain('Voeding')
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
    await user.click(await screen.findByRole('option', { name: /Kefir.*toevoegen/ }))

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
