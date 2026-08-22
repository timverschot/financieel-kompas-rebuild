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

    await user.click(screen.getByLabelText('Zoek een categorie of subcategorie'))
    // Ronde 30: de hoofdcategorieën zitten achter één knop. Openen, dan kiezen.
    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
    await user.click(screen.getByRole('button', { name: /Voeding/ }))
    expect(onKies).toHaveBeenCalledWith('ov-voeding')
  })

  it('herkent items vanaf twee letters en kiest met de muis', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'brood')
    await user.click(await screen.findByRole('option', { name: /Brood \(wit\)/ }))
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('kiest met Enter het bovenste voorstel (ook op synoniem)', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'witbrood')
    await user.keyboard('{Enter}')
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('navigeert met pijl omlaag en kiest met Enter', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'brood')
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

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'broodwaren')
    await user.click(await screen.findByRole('option', { name: /^Broodwaren · .*hele categorie/ }))
    expect(onKies).toHaveBeenCalledWith('cat-broodwaren')
  })

  it('toont het label van een gekozen middencategorie', () => {
    render(<CategorieKiezer waarde="cat-broodwaren" onKies={() => {}} gebruikerCategorieen={[]} />)
    // Sinds de trap (ronde 45) staat "Broodwaren" twee keer op het scherm: als
    // gekozen label bovenaan, en als actieve chip in de laag eronder. Beide horen
    // er te staan, dus de test wijst nu aan welke ze bedoelt.
    expect(screen.getByRole('strong')).toHaveTextContent('Broodwaren')
    expect(screen.getByRole('button', { name: 'Broodwaren', pressed: true })).toBeInTheDocument()
  })

  it('kiest met Tab het gemarkeerde voorstel', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde={undefined} onKies={onKies} gebruikerCategorieen={[]} />)

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'witbrood')
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

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'brood')
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

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'Kefir')
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

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'kefir')
    // Geen enkel bestaand item heet 'kefir': de toevoegen-regel staat bovenaan.
    await user.keyboard('{Enter}')
    expect(await screen.findByLabelText('Onder welke categorie')).toBeInTheDocument()
  })
})

// De trap: hoofdcategorie -> categorie -> subcategorie (ronde 45).
//
// Waarom ze er is: de boom heeft meer dan duizend items. Tot nu koos je een
// hoofdcategorie met één tik en moest je al de rest TYPEN. Wie de naam van een
// item niet precies kent, blijft dan zoeken.
describe('CategorieKiezer — doorklikken in plaats van typen', () => {
  it('toont niets onder de hoofdcategorie zolang er geen gekozen is', () => {
    render(<CategorieKiezer waarde={undefined} onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.queryByRole('group', { name: 'Categorie (optioneel)' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Subcategorie (optioneel)' })).toBeNull()
  })

  it('toont de categorieën zodra er een hoofdcategorie staat', () => {
    render(<CategorieKiezer waarde="ov-drank" onKies={() => {}} gebruikerCategorieen={[]} />)
    const laag = screen.getByRole('group', { name: 'Categorie (optioneel)' })
    expect(within(laag).getByRole('button', { name: 'Frisdrank' })).toBeInTheDocument()
    // De derde laag komt er pas bij zodra je een categorie kiest.
    expect(screen.queryByRole('group', { name: 'Subcategorie (optioneel)' })).toBeNull()
  })

  it('kiest een categorie met één tik', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde="ov-voeding" onKies={onKies} gebruikerCategorieen={[]} />)
    await user.click(screen.getByRole('button', { name: 'Broodwaren' }))
    expect(onKies).toHaveBeenCalledWith('cat-broodwaren')
  })

  it('toont de subcategorieën zodra er een categorie staat', () => {
    render(<CategorieKiezer waarde="cat-broodwaren" onKies={() => {}} gebruikerCategorieen={[]} />)
    const laag = screen.getByRole('group', { name: 'Subcategorie (optioneel)' })
    expect(within(laag).getByRole('button', { name: 'Brood (wit)' })).toBeInTheDocument()
  })

  it('kiest een subcategorie met één tik', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde="cat-broodwaren" onKies={onKies} gebruikerCategorieen={[]} />)
    await user.click(screen.getByRole('button', { name: 'Brood (wit)' }))
    expect(onKies).toHaveBeenCalledWith('i-brood--wit-9238')
  })

  it('gaat een laag terug wanneer je de actieve chip nog eens aantikt', async () => {
    // Anders kan je een te diepe keuze alleen met "wissen" rechtzetten en moet je
    // helemaal opnieuw beginnen.
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<CategorieKiezer waarde="cat-broodwaren" onKies={onKies} gebruikerCategorieen={[]} />)
    await user.click(screen.getByRole('button', { name: 'Broodwaren', pressed: true }))
    expect(onKies).toHaveBeenCalledWith('ov-voeding')
  })

  it('laat zien waar een item hangt dat je via het zoekveld koos', () => {
    // De trap heeft geen eigen geheugen: ze leidt alles af uit de keuze. Zoek je
    // "Brood (wit)", dan staan Voeding en Broodwaren daarna vanzelf aangeduid.
    render(<CategorieKiezer waarde="i-brood--wit-9238" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByRole('button', { name: /Hoofdcategorie: Voeding/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Broodwaren', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brood (wit)', pressed: true })).toBeInTheDocument()
  })

  it('klapt een lange laag in en op verzoek weer uit', async () => {
    // Voeding heeft 26 categorieën en sommige categorieën bijna negentig items.
    // Alles tonen maakt van een keuzerij een muur.
    const user = userEvent.setup()
    render(<CategorieKiezer waarde="ov-voeding" onKies={() => {}} gebruikerCategorieen={[]} />)
    const laag = () => screen.getByRole('group', { name: 'Categorie (optioneel)' })
    const aantal = laag().querySelectorAll('button').length
    expect(aantal).toBeLessThan(20)
    await user.click(within(laag()).getByRole('button', { name: /nog \d+/ }))
    expect(laag().querySelectorAll('button').length).toBeGreaterThan(aantal)
  })

  it('houdt de gekozen chip in beeld ook als die buiten de eerste twaalf valt', () => {
    // Anders lijkt je keuze verdwenen zodra de laag weer inklapt.
    // "Zuivel en Kaas" staat als laatste van de 26 categorieën van Voeding.
    render(<CategorieKiezer waarde="cat-zuivel-en-kaas" onKies={() => {}} gebruikerCategorieen={[]} />)
    const laag = screen.getByRole('group', { name: 'Categorie (optioneel)' })
    expect(within(laag).getByRole('button', { name: 'Zuivel en Kaas', pressed: true })).toBeInTheDocument()
  })
})

