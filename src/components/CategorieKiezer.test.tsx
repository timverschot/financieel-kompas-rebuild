import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CategorieKiezer, NieuweSubcategoriePaneel } from './CategorieKiezer'
import { CategorieVolgordeProvider } from '../categorievolgorde'
import { stelCategorieboomIn } from '../data/categorieen/zoek'
import { TaalProvider } from '../i18n'

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

    // ⚠ RONDE 67: twee lagen. Eerst de hoofdcategorie, dan pas de categorie —
    // want de tweede lijst hangt van de eerste af.
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    // Het bewaren is asynchroon; pas daarna wordt de regel op het nieuwe id getagd.
    await waitFor(() =>
      expect(onNieuweSubcategorie).toHaveBeenCalledWith({ subnaam: 'Kefir', categorie: { id: 'cat-zuivel-en-kaas' } }),
    )
    await waitFor(() => expect(onKies).toHaveBeenCalledWith('sub-kefir-1'))
  })

  it('maakt in één keer een nieuwe hoofdcategorie, categorie én subcategorie', async () => {
    // ⚠ RONDE 67 — DIT KON HELEMAAL NIET. Het paneeltje bood één keuzelijst met de
    // INGEBOUWDE categorieën: je eigen boom stond er niet in, en iets nieuws maken
    // evenmin. Wie een televisie kocht en daar "Huisraad" voor wilde, moest zijn
    // boeking verlaten, naar Categorieën, twee lagen aanmaken en terugkomen.
    const user = userEvent.setup()
    const onKies = vi.fn()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-tv-1')
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={onKies}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'televisietoestel')
    await user.click(await screen.findByRole('option', { name: /televisietoestel.*toevoegen/ }))

    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe hoofdcategorie'), 'Huisraad')
    // Onder een nieuwe hoofdcategorie valt niets te kiezen: er staat meteen een
    // naamveld in plaats van een keuzelijst met één optie erin.
    expect(screen.queryByLabelText('Categorie')).toBeNull()
    await user.type(screen.getByLabelText('Naam van de nieuwe categorie'), 'Meubels en toestellen')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    await waitFor(() =>
      expect(onNieuweSubcategorie).toHaveBeenCalledWith({
        subnaam: 'televisietoestel',
        categorie: { naam: 'Meubels en toestellen', hoofd: { naam: 'Huisraad' } },
      }),
    )
    await waitFor(() => expect(onKies).toHaveBeenCalledWith('sub-tv-1'))
  })

  it('biedt je eigen hoofdcategorieën ook aan, en laat er een nieuwe categorie onder maken', async () => {
    // ⚠ Je kon een eigen hoofdcategorie op de Categorieën-pagina maken, maar er
    // vanuit een boeking niets in hangen: het paneeltje somde alleen de ingebouwde
    // boom op.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-2')
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[{ id: 'eigen-huisraad', naam: 'Huisraad' }]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )

    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'televisietoestel')
    await user.click(await screen.findByRole('option', { name: /televisietoestel.*toevoegen/ }))

    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'eigen-huisraad')
    await user.selectOptions(screen.getByLabelText('Categorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe categorie'), 'Meubels')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    await waitFor(() =>
      expect(onNieuweSubcategorie).toHaveBeenCalledWith({
        subnaam: 'televisietoestel',
        categorie: { naam: 'Meubels', hoofd: { id: 'eigen-huisraad' } },
      }),
    )
  })

  it('zegt waarom de knop uitligt, laag per laag', async () => {
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'kefir')
    await user.click(await screen.findByRole('option', { name: /kefir.*toevoegen/ }))

    expect(screen.getByText('Kies eerst een hoofdcategorie.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    expect(screen.getByText('Kies eerst een categorie.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Categorie'), '__nieuw__')
    expect(screen.getByText('Geef je nieuwe categorie een naam.')).toBeInTheDocument()
  })

  it('meldt het wanneer het bewaren niet lukt, en houdt je invoer vast', async () => {
    // ⚠ RONDE 67: hier stond niets. Mislukte het bewaren, dan bleef het paneeltje
    // gewoon staan en gebeurde er zichtbaar niets.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockRejectedValue(new Error('schijf vol'))
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'kefir')
    await user.click(await screen.findByRole('option', { name: /kefir.*toevoegen/ }))
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Toevoegen is niet gelukt')
    // De keuze staat er nog, dus één tik op de knop volstaat om het opnieuw te proberen.
    expect((screen.getByLabelText('Categorie') as HTMLSelectElement).value).toBe('cat-zuivel-en-kaas')
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

    // ⚠ Met een term die NIETS oplevert stond de toevoegen-regel vanzelf bovenaan en
    // bewees Enter niets over de navigatie. "brood" levert een volle lijst op, dus de
    // regel is alleen met de pijltjes te bereiken.
    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'brood')
    const regels = await screen.findAllByRole('option')
    expect(regels.length).toBeGreaterThan(1)
    expect(regels[regels.length - 1]).toHaveTextContent('toevoegen')

    for (let i = 1; i < regels.length; i++) await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(await screen.findByLabelText('Hoofdcategorie')).toBeInTheDocument()
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
    // ⚠ RONDE 67. Hier stonden vroeger de knop met de hoofdcategorie én twee rijen
    // chips. Dat leest als een uitnodiging om nog iets te kiezen, terwijl je onderaan
    // de boom staat en er niets meer te kiezen valt. Nu staat er één regel die zegt
    // waar je keuze hangt.
    render(<CategorieKiezer waarde="i-brood--wit-9238" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(document.querySelector('[data-categoriepad]')?.textContent).toBe('Voeding › Broodwaren')
    expect(screen.queryByRole('button', { name: /Hoofdcategorie: Voeding/ })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Categorie (optioneel)' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Subcategorie (optioneel)' })).toBeNull()
  })

  it('houdt de keuzefunctie wél bij een hoofdcategorie of een categorie', () => {
    // Daar is de laag eronder juist de logische volgende stap.
    const { rerender } = render(<CategorieKiezer waarde="ov-voeding" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByRole('group', { name: 'Categorie (optioneel)' })).toBeInTheDocument()
    expect(document.querySelector('[data-categoriepad]')).toBeNull()

    rerender(<CategorieKiezer waarde="cat-broodwaren" onKies={() => {}} gebruikerCategorieen={[]} />)
    expect(screen.getByRole('group', { name: 'Subcategorie (optioneel)' })).toBeInTheDocument()
    expect(document.querySelector('[data-categoriepad]')).toBeNull()
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

// ---------------------------------------------------------------------------
// Ronde 67 — wat de doorlichting van het toevoegpaneeltje boven water haalde.
//
// Elke test hieronder staat voor één manier waarop het paneeltje je invoer kon
// kosten of je op het verkeerde been zette. Ze zijn bewust apart gehouden van de
// tests hierboven: die beschrijven wát het paneeltje doet, deze beschrijven wat er
// misging toen het voor het eerst in een échte boeking gebruikt werd.
// ---------------------------------------------------------------------------
describe('CategorieKiezer — het toevoegpaneeltje in een echt formulier', () => {
  afterEach(() => {
    localStorage.removeItem('fk_taal')
    // De boom staat globaal geregistreerd; zet hem terug op de ingebouwde basis.
    stelCategorieboomIn([], [])
  })

  /** Opent het paneeltje voor een naam die nergens bestaat. */
  async function open(user: ReturnType<typeof userEvent.setup>, naam = 'kefir') {
    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), naam)
    await user.click(await screen.findByRole('option', { name: new RegExp(`toevoegen`) }))
  }

  it('voegt toe met Enter in plaats van de hele boeking te verzenden', async () => {
    // ⚠ GEMETEN VOOR DE FIX: Enter in een van de twee naamvelden verzond het
    // formulier eromheen. De boeking werd bewaard ZONDER categorie, het paneeltje
    // verdween, en je invoer was weg. Het zoekveld erboven ving Enter al af; deze
    // vier velden zijn er in ronde 67 bijgekomen en deden dat niet.
    const user = userEvent.setup()
    const onVerzenden = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-tv-1')
    render(
      <form onSubmit={onVerzenden}>
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[]}
          onNieuweSubcategorie={onNieuweSubcategorie}
        />
        <button type="submit">Bewaren</button>
      </form>,
    )
    await open(user, 'televisietoestel')
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe hoofdcategorie'), 'Huisraad')
    await user.type(screen.getByLabelText('Naam van de nieuwe categorie'), 'Meubels{Enter}')

    await waitFor(() =>
      expect(onNieuweSubcategorie).toHaveBeenCalledWith({
        subnaam: 'televisietoestel',
        categorie: { naam: 'Meubels', hoofd: { naam: 'Huisraad' } },
      }),
    )
    expect(onVerzenden).not.toHaveBeenCalled()
  })

  it('sluit met Escape alleen zichzelf, en laat het venster eromheen met rust', async () => {
    // ⚠ Escape liep door tot het boekingsvenster, dat dan vroeg "Je invoer is nog
    // niet opgeslagen. Wil je ze weggooien?" — over de héle boeking, terwijl je
    // alleen dit paneeltje wilde sluiten.
    const user = userEvent.setup()
    const opEscape = vi.fn()
    render(
      <div
        onKeyDown={(e) => {
          if (e.key === 'Escape') opEscape()
        }}
      >
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[]}
          onNieuweSubcategorie={vi.fn()}
        />
      </div>,
    )
    await open(user)
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Hoofdcategorie')).toBeNull()
    expect(opEscape).not.toHaveBeenCalled()
  })

  it('zet de focus terug in het zoekveld na Annuleer', async () => {
    // ⚠ De focus landde op de pagina zelf: met het toetsenbord was je je plek kwijt
    // en wie de app laat voorlezen hoorde niets meer.
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Annuleer' }))

    expect(screen.getByLabelText('Zoek een categorie of subcategorie')).toHaveFocus()
  })

  it('hangt onder het zoekveld en niet onderaan het hele venster', async () => {
    // ⚠ Het paneeltje stond BUITEN het laagje met een eigen positie, dus `top: 100%`
    // mat zich aan het eerstvolgende blok daarboven — in een boekingsvenster is dat
    // het venster zelf. Het verscheen dan onderaan de popup, ver van het veld waar je
    // net stond te typen.
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await open(user)

    const veld = screen.getByLabelText('Zoek een categorie of subcategorie')
    const laagje = veld.parentElement as HTMLElement
    const paneel = document.querySelector('[data-toevoegpaneel]')
    expect(laagje).toContainElement(paneel as HTMLElement)
    // ⚠ En dat laagje moet ook echt een eigen positie hebben: zonder `relative` meet
    // `top: 100%` zich alsnog aan het venster en staat het paneeltje weer onderaan.
    expect(laagje.style.position).toBe('relative')
  })

  it('haalt de chips en de trap weg zolang het paneeltje openstaat', async () => {
    // ⚠ Het paneeltje zweefde eroverheen, maar zwevend is niet weg: één tik op een
    // chip die je niet meer zag koos een categorie, sloot het paneeltje en gooide je
    // invoer weg — zonder een woord. En er stonden dan twee bedieningen met bijna
    // dezelfde naam tegelijk op het scherm, wat voorleessoftware onbruikbaar maakt.
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde="ov-voeding"
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    expect(screen.getByRole('group', { name: 'Categorie (optioneel)' })).toBeInTheDocument()

    await open(user)

    expect(screen.queryByRole('group', { name: 'Categorie (optioneel)' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Hoofdcategorie: / })).toBeNull()
    // Precies één bediening met de naam "Hoofdcategorie": die in het paneeltje.
    expect(screen.getAllByLabelText(/^Hoofdcategorie$/)).toHaveLength(1)
  })

  it('neemt een hoofdcategorie die niet meer bestaat niet stil over', async () => {
    // ⚠ DIT MAAKTE JE NIEUWE TAK ONZICHTBAAR. Het paneeltje vertrouwde de
    // hoofdcategorie "in beeld", maar die functie geeft een onbekend id ongewijzigd
    // terug. De keuzelijst stond dan zichtbaar leeg terwijl de regel eronder zei
    // "Kies eerst een categorie", en bevestigen schreef een categorie weg met een
    // ouder die niet bestaat — een wees, die stil uit de boom valt samen met de
    // subcategorie die je net maakte.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn()
    render(
      <CategorieKiezer
        waarde="eigen-verwijderd-123"
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user)

    expect(screen.getByText('Kies eerst een hoofdcategorie.')).toBeInTheDocument()
    // En het echte gevaar: bevestigen mag niets wegschrijven. Deed het dat wel, dan
    // kwam er een categorie in de database met een ouder die niet bestaat — een wees,
    // die stil uit de boom valt samen met de subcategorie die je net maakte.
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    expect(onNieuweSubcategorie).not.toHaveBeenCalled()
  })

  it('houdt een tweede subcategorie met dezelfde naam op dezelfde plek tegen', async () => {
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await open(user, 'Brood (wit)')
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-broodwaren')

    expect(
      screen.getByText('Er bestaat hier al een subcategorie “Brood (wit)”. Annuleer en kies ze uit de lijst.'),
    ).toBeInTheDocument()
  })

  it('houdt een tweede hoofdcategorie met dezelfde naam tegen', async () => {
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await open(user)
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe hoofdcategorie'), 'voeding')

    // De melding noemt de categorie zoals ze in de LIJST staat, niet zoals jij ze
    // intikte: anders wijst ze naar iets wat je nergens op het scherm terugvindt.
    expect(screen.getByText('Er bestaat al een hoofdcategorie “Voeding”.')).toBeInTheDocument()
  })

  it('herkent een dubbele hoofdcategorie ook aan de naam zoals die op het scherm staat', async () => {
    // ⚠ De controle vergeleek met de Nederlandse naam terwijl de lijst de vertaalde
    // toont. In het Engels heet de ingebouwde "Drank" gewoon "Drinks"; typte je
    // "Drinks", dan liet de app dat door en stonden er daarna twee regels "Drinks" in
    // dezelfde lijst, met verschillende id's en niet uit elkaar te houden.
    localStorage.setItem('fk_taal', 'en')
    const user = userEvent.setup()
    render(
      <TaalProvider>
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[]}
          onNieuweSubcategorie={vi.fn()}
        />
      </TaalProvider>,
    )
    await user.type(screen.getByLabelText('Search a category or subcategory'), 'kefir')
    await user.click(await screen.findByRole('option', { name: /Add/ }))
    await user.selectOptions(screen.getByLabelText('Main category'), '__nieuw__')
    await user.type(screen.getByLabelText('Name of the new main category'), 'Drinks')

    expect(screen.getByText('A main category “Drinks” already exists.')).toBeInTheDocument()
  })

  it('houdt je getypte categorienaam vast als je van hoofdcategorie wisselt', async () => {
    // ⚠ De naam werd meegewist met de keuze. Merkte je dat je de verkeerde
    // hoofdcategorie had aangetikt, dan kostte dat je je typewerk.
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await open(user)
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe categorie'), 'Meubels')

    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-drank')
    // De KEUZE hoort bij de vorige hoofdcategorie en is dus terecht leeg…
    expect((screen.getByLabelText('Categorie') as HTMLSelectElement).value).toBe('')
    // …maar de naam die jij intikte hangt nergens aan vast en staat er nog.
    await user.selectOptions(screen.getByLabelText('Categorie'), '__nieuw__')
    expect((screen.getByLabelText('Naam van de nieuwe categorie') as HTMLInputElement).value).toBe('Meubels')
  })

  it('vertaalt je eigen categorienamen niet, ook niet als het toevallig een woord van de app is', async () => {
    // ⚠ Noemde je een eigen hoofdcategorie "Auto", dan heette ze in het Engels
    // ineens "Car": haar naam liep door de vertaaltabel omdat die het woord toevallig
    // ook als sleutel gebruikt. Een naam die jij intikt, blijft staan zoals jij ze
    // intikte — in elke taal.
    localStorage.setItem('fk_taal', 'en')
    const user = userEvent.setup()
    render(
      <TaalProvider>
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[{ id: 'eigen-auto', naam: 'Auto' }]}
          onNieuweSubcategorie={vi.fn()}
        />
      </TaalProvider>,
    )
    await user.type(screen.getByLabelText('Search a category or subcategory'), 'kefir')
    await user.click(await screen.findByRole('option', { name: /Add/ }))

    const opties = [...document.querySelectorAll('option')].map((o) => o.textContent ?? '')
    expect(opties.some((o) => o.includes('Auto'))).toBe(true)
    expect(opties.some((o) => o.includes('Car'))).toBe(false)
  })

  it('zegt op de knop dat het bezig is, en telt een tweede tik niet mee', async () => {
    // ⚠ Er gebeurde zichtbaar niets zolang het bewaren liep. Op een trage telefoon
    // denk je dan dat je te zacht getikt hebt.
    //
    // ⚠ Wat deze test NIET aantoont: dat de `bezigRef` naast de state nodig is. Die
    // vangt twee tikken binnen één tekening op, en `user-event` wacht elke tekening
    // netjes af — dat geval is hier niet na te bootsen.
    const user = userEvent.setup()
    let losmaken: (id: string) => void = () => {}
    const onNieuweSubcategorie = vi.fn(
      () =>
        new Promise<string>((res) => {
          losmaken = res
        }),
    )
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user)
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    expect(await screen.findByRole('button', { name: 'Bezig met toevoegen…' })).toBeInTheDocument()
    // En een tweede tik doet niets extra.
    await user.click(screen.getByRole('button', { name: 'Bezig met toevoegen…' }))
    expect(onNieuweSubcategorie).toHaveBeenCalledTimes(1)

    losmaken('sub-1')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Bezig met toevoegen…' })).toBeNull())
  })

  it('haalt de foutmelding weg zodra je iets anders kiest', async () => {
    // ⚠ De melding bleef staan nadat je je keuze had aangepast, alsof de nieuwe
    // keuze ook al mislukt was.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockRejectedValue(new Error('schijf vol'))
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user)
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Toevoegen is niet gelukt')

    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-broodwaren')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('kiest en verzendt niets meer zolang het paneeltje openstaat', async () => {
    // ⚠ HIER GING JE INVOER STIL VERLOREN, op twee manieren na elkaar.
    // Eerst: de voorstellenlijst verdween wel van het scherm, maar de toetsafhandeling
    // van het zoekveld bleef erop doorwerken — Enter koos dan een voorstel dat je niet
    // zag en gooide je nieuwe tak weg. En toen dat gerepareerd werd door Enter gewoon
    // te negeren, deed de browser wat hij standaard doet: hij VERZOND het formulier,
    // dus de boeking werd bewaard zonder categorie. Daarom staat er hier een echt
    // formulier omheen; zonder dat is de tweede fout onzichtbaar.
    const user = userEvent.setup()
    const onKies = vi.fn()
    const onVerzenden = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onVerzenden}>
        <CategorieKiezer
          waarde={undefined}
          onKies={onKies}
          gebruikerCategorieen={[]}
          onNieuweSubcategorie={vi.fn()}
        />
        <button type="submit">Bewaren</button>
      </form>,
    )
    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'brood')
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe hoofdcategorie'), 'Huisraad')

    // Terug in het zoekveld, nog een letter, en dan de twee toetsen die vroeger alles
    // wegvaagden.
    await user.click(screen.getByLabelText('Zoek een categorie of subcategorie'))
    await user.keyboard('j{ArrowDown}{Enter}')

    expect(onKies).not.toHaveBeenCalled()
    expect(onVerzenden).not.toHaveBeenCalled()
    // Het paneeltje staat er nog, mét wat je erin had staan.
    expect((screen.getByLabelText('Naam van de nieuwe hoofdcategorie') as HTMLInputElement).value).toBe('Huisraad')
  })

  it('haalt ook de knop "wissen" weg zolang het paneeltje openstaat', async () => {
    // ⚠ De chips en de trap werden verborgen, maar déze knop niet — terwijl hij
    // precies hetzelfde doet: één tik en je nieuwe tak is weg, plus je zoekterm, en
    // er wordt niets gezegd.
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde="cat-broodwaren"
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'wissen' })).toBeInTheDocument()

    await open(user, 'roggebrood')

    expect(screen.queryByRole('button', { name: 'wissen' })).toBeNull()
  })

  it('sluit met Escape vanuit het zoekveld ook alleen het paneeltje', async () => {
    // ⚠ De Escape-afhandeling zat alleen op het paneeltje zelf. Stond de focus in het
    // zoekveld erboven — één Shift+Tab volstaat — dan liep Escape door naar het
    // boekingsvenster, dat vroeg of je je hele boeking mocht weggooien.
    const user = userEvent.setup()
    const opEscape = vi.fn()
    render(
      <div
        onKeyDown={(e) => {
          if (e.key === 'Escape') opEscape()
        }}
      >
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[]}
          onNieuweSubcategorie={vi.fn()}
        />
      </div>,
    )
    await open(user)
    await user.click(screen.getByLabelText('Zoek een categorie of subcategorie'))
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Hoofdcategorie')).toBeNull()
    expect(opEscape).not.toHaveBeenCalled()
  })

  it('meldt geen keuzelijst meer aan voorleessoftware zolang het paneeltje openstaat', async () => {
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), 'brood')
    const veld = screen.getByLabelText('Zoek een categorie of subcategorie')
    expect(veld).toHaveAttribute('aria-expanded', 'true')

    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    // Terug in het zoekveld: dan zou de app zonder deze afscherming opnieuw een
    // uitgeklapte keuzelijst melden die niet meer op het scherm staat.
    await user.click(veld)

    expect(veld).toHaveAttribute('aria-expanded', 'false')
    expect(veld).not.toHaveAttribute('aria-controls')
    expect(veld).not.toHaveAttribute('aria-activedescendant')
  })

  it('laat een keuze los zodra die categorie verdwijnt terwijl het paneeltje openstaat', async () => {
    // ⚠ De controle "bestaat deze hoofdcategorie écht?" liep alleen bij het openen.
    // Verdween ze daarna — een ander toestel dat via Drive iets verwijdert — dan
    // schreef bevestigen een categorie weg met een ouder die niet meer bestond. Die
    // wees valt stil uit de boom: de app zei "gelukt", je boeking stond erop getagd,
    // en je vond de subcategorie nergens meer terug.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn()
    const eigen = [{ id: 'eigen-huisraad', naam: 'Huisraad' }]
    const { rerender } = render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={eigen}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user, 'televisietoestel')
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'eigen-huisraad')
    await user.selectOptions(screen.getByLabelText('Categorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe categorie'), 'Meubels')

    // En nu verdwijnt "Huisraad" onder je handen weg.
    rerender(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )

    expect(screen.getByText('Kies eerst een hoofdcategorie.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    expect(onNieuweSubcategorie).not.toHaveBeenCalled()
  })

  it('vult de categorie waar je in stond meteen in', async () => {
    // ⚠ Alleen de hoofdcategorie werd voorgevuld. Stond je op "Voeding › Broodwaren"
    // en maakte je daar een subcategorie bij, dan moest je "Broodwaren" opnieuw
    // aanduiden — een keuze die je net gemaakt had.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-1')
    render(
      <CategorieKiezer
        waarde="cat-broodwaren"
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user, 'roggebrood')

    expect((screen.getByLabelText('Hoofdcategorie') as HTMLSelectElement).value).toBe('ov-voeding')
    expect((screen.getByLabelText('Categorie') as HTMLSelectElement).value).toBe('cat-broodwaren')
    // En dus is één tik genoeg.
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    await waitFor(() =>
      expect(onNieuweSubcategorie).toHaveBeenCalledWith({
        subnaam: 'roggebrood',
        categorie: { id: 'cat-broodwaren' },
      }),
    )
  })

  it('houdt een naam tegen die alleen uit onzichtbare tekens bestaat', async () => {
    // ⚠ trim() haalt een zero-width space niet weg. Zo'n naam is niet leeg voor de
    // computer maar wel voor het oog: je krijgt een categorie die in elke lijst als
    // een lege regel staat en die je nooit meer terugvindt.
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Zoek een categorie of subcategorie'), '\u200B\u200B')
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))

    expect(screen.getByText('Typ hierboven een naam voor je nieuwe subcategorie.')).toBeInTheDocument()
  })

  it('vertaalt je eigen hoofdcategorie ook niet in de voorstellenlijst', async () => {
    // ⚠ Dezelfde categorie kreeg twee namen op één scherm: de chiprij zei "Auto", de
    // voorstelregel eronder "Car".
    localStorage.setItem('fk_taal', 'en')
    stelCategorieboomIn(
      [{ id: 'eigen-sub-1', naam: 'Bandenwissel', categorieId: 'eigen-mid-1' }],
      [
        { id: 'eigen-auto', naam: 'Auto' },
        { id: 'eigen-mid-1', naam: 'Onderhoud', ouderId: 'eigen-auto' },
      ],
    )
    const user = userEvent.setup()
    render(
      <TaalProvider>
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[
            { id: 'eigen-auto', naam: 'Auto' },
            { id: 'eigen-mid-1', naam: 'Onderhoud', ouderId: 'eigen-auto' },
          ]}
        />
      </TaalProvider>,
    )
    await user.type(screen.getByLabelText('Search a category or subcategory'), 'bandenwissel')
    const regel = await screen.findByRole('option', { name: /Bandenwissel/ })

    expect(regel).toHaveTextContent('Auto')
    expect(regel).not.toHaveTextContent('Car')
  })

  it('laat het formulier eromheen niet verzenden zolang het paneeltje openstaat', async () => {
    // ⚠ HET GAT ZAT NIET IN HET ZOEKVELD MAAR IN HET FORMULIER. Enter in élk tekstveld
    // verzendt een formulier — dat doet de browser vanzelf. Stond dit paneeltje open
    // en drukte je Enter in "Bedrag", of tikte je op "Toevoegen", dan werd de boeking
    // bewaard ZONDER categorie en waren je twee getypte namen weg.
    const user = userEvent.setup()
    const onVerzenden = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onVerzenden}>
        <label htmlFor="bedrag">Bedrag</label>
        <input id="bedrag" />
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[]}
          onNieuweSubcategorie={vi.fn()}
        />
        <button type="submit">Toevoegen</button>
      </form>,
    )
    await open(user, 'televisietoestel')
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe hoofdcategorie'), 'Huisraad')

    // (1) Enter in een BUURVELD.
    await user.type(screen.getByLabelText('Bedrag'), '12,50{Enter}')
    expect(onVerzenden).not.toHaveBeenCalled()

    // (2) En met de muis op de opslaanknop.
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onVerzenden).not.toHaveBeenCalled()

    // Er wordt ook gezégd waarom er niets gebeurt, en je invoer staat er nog.
    expect(await screen.findByRole('alert')).toHaveTextContent('Rond eerst je nieuwe categorie af')
    expect((screen.getByLabelText('Naam van de nieuwe hoofdcategorie') as HTMLInputElement).value).toBe('Huisraad')
  })

  it('laat Annuleer niet meer meetellen zodra het bewaren begonnen is', async () => {
    // ⚠ Het paneeltje sloot wél, maar het wegschrijven liep door: je kreeg een
    // hoofdcategorie, een categorie én een subcategorie die je net geannuleerd had, en
    // je boeking stond erop getagd.
    const user = userEvent.setup()
    const onKies = vi.fn()
    let losmaken: (id: string) => void = () => {}
    const onNieuweSubcategorie = vi.fn(
      () =>
        new Promise<string>((res) => {
          losmaken = res
        }),
    )
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={onKies}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user)
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Annuleer' }))
    // Het paneeltje blijft staan: annuleren kan op dit punt niet meer eerlijk.
    expect(screen.getByLabelText('Hoofdcategorie')).toBeInTheDocument()

    losmaken('sub-1')
    await waitFor(() => expect(onKies).toHaveBeenCalledWith('sub-1'))
  })

  it('maakt de naam aan die op dat moment in het zoekveld staat', async () => {
    // ⚠ De naam werd vastgelegd bij het openen, maar het zoekveld bleef bewerkbaar.
    // Je kon dus "televisietoesXYZ" zien staan terwijl er stil "televisietoestel"
    // aangemaakt werd.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-1')
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user, 'televisie')
    // Terug in het zoekveld en de naam afmaken.
    await user.click(screen.getByLabelText('Zoek een categorie of subcategorie'))
    await user.keyboard('toestel')

    expect(screen.getByText('Nieuwe subcategorie “televisietoestel”')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    await waitFor(() =>
      expect(onNieuweSubcategorie).toHaveBeenCalledWith({
        subnaam: 'televisietoestel',
        categorie: { id: 'cat-zuivel-en-kaas' },
      }),
    )
  })

  it('meldt een gelukte toevoeging ook aan wie de app laat voorlezen', async () => {
    // ⚠ Een MISLUKTE poging werd gemeld, een gelukte niet. Wie meekijkt ziet de naam
    // verschijnen; wie dat niet doet, hoorde niets.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-1')
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user, 'kefir')
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    // ⚠ Op tekst en niet op `findByRole('status')`: zolang het paneeltje openstaat
    // zijn er twee status-gebieden (de reden-regel en deze melding), en dan zou de
    // test op "meerdere gevonden" breken in plaats van op de echte reden.
    const melding = await screen.findByText(/is toegevoegd en staat nu op deze boeking/)
    expect(melding).toHaveAttribute('role', 'status')
    expect(melding).toHaveTextContent('“kefir” is toegevoegd')
  })

  it('laat Escape niet afbreken zodra het bewaren begonnen is', async () => {
    // ⚠ De knop Annuleer kreeg die grendel wél, Escape niet — op geen van de plaatsen
    // waar Escape dit paneeltje sluit. Je kon dus met één toets "annuleren" terwijl het
    // wegschrijven doorliep, en dan stond je categorie er achteraf toch, met je boeking
    // erop getagd.
    const user = userEvent.setup()
    const onKies = vi.fn()
    let losmaken: (id: string) => void = () => {}
    const onNieuweSubcategorie = vi.fn(
      () =>
        new Promise<string>((res) => {
          losmaken = res
        }),
    )
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={onKies}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await open(user)
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    await screen.findByRole('button', { name: 'Bezig met toevoegen…' })

    // Escape vanuit het paneeltje…
    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Hoofdcategorie')).toBeInTheDocument()
    // …én Escape vanuit het zoekveld erboven.
    await user.click(screen.getByLabelText('Zoek een categorie of subcategorie'))
    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Hoofdcategorie')).toBeInTheDocument()

    losmaken('sub-1')
    await waitFor(() => expect(onKies).toHaveBeenCalledWith('sub-1'))
  })

  it('zet de focus in het paneeltje wanneer het verzenden tegengehouden wordt', async () => {
    // Zonder dat weet je niet waar je moet kijken: de melding staat in een vlak dat
    // kan schuiven, en de knop waarop je duwde staat elders op het scherm.
    const user = userEvent.setup()
    render(
      <form onSubmit={(e) => e.preventDefault()}>
        <CategorieKiezer
          waarde={undefined}
          onKies={vi.fn()}
          gebruikerCategorieen={[]}
          onNieuweSubcategorie={vi.fn()}
        />
        <button type="submit">Toevoegen</button>
      </form>,
    )
    await open(user)
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(screen.getByLabelText('Hoofdcategorie')).toHaveFocus()
  })

  it('zegt geen lege naam in de kop wanneer je het zoekveld leegmaakt', async () => {
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde={undefined}
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    await open(user, 'kefir')
    expect(screen.getByText('Nieuwe subcategorie “kefir”')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Zoek een categorie of subcategorie'))

    expect(screen.getByText('Nieuwe subcategorie')).toBeInTheDocument()
    expect(screen.getByText('Typ hierboven een naam voor je nieuwe subcategorie.')).toBeInTheDocument()
  })

  it('houdt de plaats van de chips vrij in plaats van het formulier te laten springen', async () => {
    // ⚠ De chips en de traplagen werden echt uit de pagina gehaald. Dat is tot
    // driehonderd pixels die dichtklappen op het moment dat het paneeltje opengaat —
    // het hele formulier eronder schuift dan omhoog en bij Annuleer weer terug.
    const user = userEvent.setup()
    render(
      <CategorieKiezer
        waarde="ov-voeding"
        onKies={vi.fn()}
        gebruikerCategorieen={[]}
        onNieuweSubcategorie={vi.fn()}
      />,
    )
    const vak = () => document.querySelector('[data-keuzevak]') as HTMLElement
    expect(vak().style.visibility).toBe('visible')

    await open(user)

    // Onzichtbaar — en dus ook onbereikbaar voor muis, toetsenbord en voorleessoftware.
    expect(screen.queryByRole('group', { name: 'Categorie (optioneel)' })).toBeNull()
    // ⚠ En dat gebeurt met `visibility`, niet met `display: none` of door de chips weg
    // te halen: alleen `visibility` laat de plaats staan. Zonder dat klapt hier tot
    // driehonderd pixels dicht en schuift het hele formulier eronder mee.
    expect(vak().style.visibility).toBe('hidden')
    expect(vak().style.display).not.toBe('none')
    expect(vak().querySelector('.chiprooster')).not.toBeNull()
  })

  it('vertaalt ook de regel die zegt waar je subcategorie hangt niet', async () => {
    localStorage.setItem('fk_taal', 'en')
    stelCategorieboomIn(
      [{ id: 'eigen-sub-1', naam: 'Bandenwissel', categorieId: 'eigen-mid-1' }],
      [
        { id: 'eigen-auto', naam: 'Auto' },
        { id: 'eigen-mid-1', naam: 'Verzekeringen', ouderId: 'eigen-auto' },
      ],
    )
    render(
      <TaalProvider>
        <CategorieKiezer
          waarde="eigen-sub-1"
          onKies={vi.fn()}
          gebruikerCategorieen={[
            { id: 'eigen-auto', naam: 'Auto' },
            { id: 'eigen-mid-1', naam: 'Verzekeringen', ouderId: 'eigen-auto' },
          ]}
        />
      </TaalProvider>,
    )
    // Niet "Car › ...": de hoofdcategorie is er een die de gebruiker zelf maakte. De
    // categorienaam staat er sowieso ruw; die is nooit door de vertaaltabel gegaan.
    expect(document.querySelector('[data-categoriepad]')?.textContent).toBe('Auto › Verzekeringen')
  })
})

// Het paneeltje op zichzelf. De zoekers eromheen dekken het meeste af, maar twee
// grendels zitten in het paneeltje zélf — en dat is de enige plek waar ze nog werken
// wanneer iemand het paneeltje ooit zonder die zoekers gebruikt.
describe('NieuweSubcategoriePaneel — op zichzelf', () => {
  it('laat zich niet met Escape of Annuleer sluiten zodra het bewaren begonnen is', async () => {
    const user = userEvent.setup()
    const onAnnuleer = vi.fn()
    let losmaken: () => void = () => {}
    const onBevestig = vi.fn(
      () =>
        new Promise<void>((res) => {
          losmaken = res
        }),
    )
    render(<NieuweSubcategoriePaneel naam="kefir" onBevestig={onBevestig} onAnnuleer={onAnnuleer} />)

    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    await screen.findByRole('button', { name: 'Bezig met toevoegen…' })

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Annuleer' }))
    expect(onAnnuleer).not.toHaveBeenCalled()

    losmaken()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Subcategorie toevoegen' })).toBeInTheDocument())
    // En daarna kan het weer gewoon.
    await user.click(screen.getByRole('button', { name: 'Annuleer' }))
    expect(onAnnuleer).toHaveBeenCalled()
  })
})
