import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ItemZoeker } from './ItemZoeker'
import { stelCategorieboomIn } from '../data/categorieen/zoek'
import { TaalProvider } from '../i18n'

// De zoeker van één kassaticketregel. Ze deelt het toevoegpaneeltje met
// `CategorieKiezer`, maar monteert het met andere gegevens — en tot ronde 67 was er
// voor dit bestand geen enkele test, waardoor precies dezelfde valkuilen hier
// onopgemerkt bleven.
afterEach(() => {
  localStorage.removeItem('fk_taal')
  stelCategorieboomIn([], [])
})

type Props = Parameters<typeof ItemZoeker>[0]

function zetNeer(extra: Partial<Props> = {}) {
  const props: Props = {
    waarde: '',
    onTekst: vi.fn(),
    onKiesItem: vi.fn(),
    onNieuweSubcategorie: vi.fn(),
    ...extra,
  }
  render(<ItemZoeker {...props} />)
  return props
}

describe('ItemZoeker', () => {
  it('vindt een item vanaf twee letters en geeft alleen id en naam door', async () => {
    const user = userEvent.setup()
    const onKiesItem = vi.fn()
    zetNeer({ waarde: 'brood', onKiesItem })

    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /Brood \(wit\)/ }))

    expect(onKiesItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'i-brood--wit-9238', naam: 'Brood (wit)' }))
  })

  it('kiest en verzendt niets meer zolang het toevoegpaneeltje openstaat', async () => {
    // ⚠ Dezelfde val als in CategorieKiezer, in twee lagen: eerst koos Enter een
    // voorstel dat je niet zag, en daarna — toen Enter genegeerd werd — verzond de
    // browser gewoon het formulier eromheen. Vandaar het echte <form> hier.
    const user = userEvent.setup()
    const onKiesItem = vi.fn()
    const onVerzenden = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onVerzenden}>
        <ItemZoeker waarde="brood" onTekst={vi.fn()} onKiesItem={onKiesItem} onNieuweSubcategorie={vi.fn()} />
        <button type="submit">Bewaren</button>
      </form>,
    )

    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), '__nieuw__')
    await user.type(screen.getByLabelText('Naam van de nieuwe hoofdcategorie'), 'Huisraad')

    // ⚠ ArrowUp en niet ArrowDown: de markering staat na het aanklikken van de
    // toevoegen-regel al onderaan, en ArrowDown zou daar gewoon blijven staan. Met
    // ArrowUp mikken we op een écht voorstel — precies wat vroeger stil gekozen werd.
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.keyboard('{ArrowUp}{Enter}')

    expect(onKiesItem).not.toHaveBeenCalled()
    expect(onVerzenden).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Naam van de nieuwe hoofdcategorie') as HTMLInputElement).value).toBe('Huisraad')
  })

  it('sluit met Escape alleen het paneeltje, ook vanuit het zoekveld', async () => {
    const user = userEvent.setup()
    const opEscape = vi.fn()
    render(
      <div
        onKeyDown={(e) => {
          if (e.key === 'Escape') opEscape()
        }}
      >
        <ItemZoeker waarde="brood" onTekst={vi.fn()} onKiesItem={vi.fn()} onNieuweSubcategorie={vi.fn()} />
      </div>,
    )
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Hoofdcategorie')).toBeNull()
    expect(opEscape).not.toHaveBeenCalled()
  })

  it('zet de focus terug in het veld na Annuleer', async () => {
    // ⚠ De focus stond dan op de PAGINA zelf: met het toetsenbord was je je plek in
    // het kassaticket kwijt. Bewust met de Annuleer-knop en niet met Escape: bij
    // Escape staat de focus al in het veld, en dan bewijst de test niets.
    const user = userEvent.setup()
    zetNeer({ waarde: 'brood' })
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    expect(screen.getByLabelText('Subcategorie zoeken')).not.toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Annuleer' }))

    expect(screen.getByLabelText('Subcategorie zoeken')).toHaveFocus()
  })

  it('laat je eigen hoofdcategorienaam staan zoals je ze intikte', async () => {
    // ⚠ De buurtest hierboven bewijst alleen de INGEBOUWDE kant. Noem je een eigen
    // hoofdcategorie "Auto", dan heette ze in het Engels ineens "Car".
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
        <ItemZoeker
          waarde="bandenwissel"
          onTekst={vi.fn()}
          onKiesItem={vi.fn()}
          eigenCategorieen={[
            { id: 'eigen-auto', naam: 'Auto' },
            { id: 'eigen-mid-1', naam: 'Onderhoud', ouderId: 'eigen-auto' },
          ]}
        />
      </TaalProvider>,
    )
    await user.click(screen.getByLabelText('Search subcategory'))
    const regel = await screen.findByRole('option', { name: /Bandenwissel/ })
    expect(regel).toHaveTextContent('Auto')
    expect(regel).not.toHaveTextContent('Car')
  })

  it('houdt de chiprij en de voorstellenlijst buiten bereik zolang het paneeltje openstaat', async () => {
    // ⚠ Vier van de vijf afschermingen uit deze ronde stonden in twee bestanden maar
    // werden er maar in één getest. Dit is de andere.
    const user = userEvent.setup()
    zetNeer({ waarde: 'brood', onKiesHoofdcategorie: vi.fn() })
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    expect(screen.getByRole('button', { name: /Selecteer hoofdcategorie/ })).toBeInTheDocument()

    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))

    // ⚠ Hier ECHT weg, anders begint het paneeltje zestig pixels lager met een lege
    // strook ertussen: deze chiprij staat binnen het laagje waaraan het paneeltje
    // zich ophangt. In CategorieKiezer ligt dat andersom — daar blijft de plaats staan.
    expect(document.querySelector('.hoofdkiezer')).toBeNull()
    // En de voorstellenlijst is ook weg.
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('meldt geen keuzelijst meer aan voorleessoftware zolang het paneeltje openstaat', async () => {
    const user = userEvent.setup()
    zetNeer({ waarde: 'brood' })
    const veld = screen.getByLabelText('Subcategorie zoeken')
    await user.click(veld)
    expect(veld).toHaveAttribute('aria-expanded', 'true')

    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    await user.click(veld)

    expect(veld).toHaveAttribute('aria-expanded', 'false')
    expect(veld).not.toHaveAttribute('aria-controls')
    expect(veld).not.toHaveAttribute('aria-activedescendant')
  })

  it('toont de hoofdcategorie in de taal van de app, maar laat eigen namen staan', async () => {
    // ⚠ De chiprij vertaalde een ingebouwde hoofdcategorie wél en deze regel niet: in
    // het Engels stond er een knop "Drinks" met daaronder "Cola · Drank". Dezelfde
    // hoofdcategorie, twee namen, twee regels uit elkaar. Een naam die de gebruiker
    // zelf intikte blijft natuurlijk staan zoals hij ze intikte.
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
        <ItemZoeker
          waarde="cola"
          onTekst={vi.fn()}
          onKiesItem={vi.fn()}
          eigenCategorieen={[
            { id: 'eigen-auto', naam: 'Auto' },
            { id: 'eigen-mid-1', naam: 'Onderhoud', ouderId: 'eigen-auto' },
          ]}
        />
      </TaalProvider>,
    )
    await user.click(screen.getByLabelText('Search subcategory'))
    const cola = await screen.findByRole('option', { name: /Cola/ })
    expect(cola).toHaveTextContent('Drinks')
    expect(cola).not.toHaveTextContent('Drank')
  })

  it('vult de categorie van deze regel al in bij het toevoegen', async () => {
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-1')
    const onKiesItem = vi.fn()
    render(
      <ItemZoeker
        waarde="roggebrood"
        onTekst={vi.fn()}
        onKiesItem={onKiesItem}
        categorieId="i-brood--wit-9238"
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))

    expect((screen.getByLabelText('Hoofdcategorie') as HTMLSelectElement).value).toBe('ov-voeding')
    expect((screen.getByLabelText('Categorie') as HTMLSelectElement).value).toBe('cat-broodwaren')

    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))
    await waitFor(() =>
      expect(onNieuweSubcategorie).toHaveBeenCalledWith({ subnaam: 'roggebrood', categorie: { id: 'cat-broodwaren' } }),
    )
    // De regel wordt meteen op het nieuwe id getagd, met de naam uit het plan: de
    // boom is op dat moment nog niet herbouwd, dus opzoeken kan hier niet.
    await waitFor(() => expect(onKiesItem).toHaveBeenCalledWith({ id: 'sub-1', naam: 'roggebrood' }))
  })

  it('biedt na een gelukte toevoeging niet meteen aan om hetzelfde nog eens te maken', async () => {
    // ⚠ De focus terugzetten opende de voorstellenlijst weer — en omdat dit veld zijn
    // tekst houdt (het is tegelijk de omschrijving van de ticketregel), stond daar
    // bovenaan "+ … toevoegen aan …" voor de naam die je zonet had toegevoegd.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-1')
    render(
      <ItemZoeker
        waarde="kefir"
        onTekst={vi.fn()}
        onKiesItem={vi.fn()}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    await waitFor(() => expect(onNieuweSubcategorie).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
    expect(screen.getByLabelText('Subcategorie zoeken')).toHaveFocus()
  })
})

// ---------------------------------------------------------------------------
// Ronde 78 — een afgemaakte keuze is ook op een ticketregel geen vraag meer
// ---------------------------------------------------------------------------
describe('ItemZoeker — de keuzeknop naast een gekozen subcategorie', () => {
  const BROOD = 'i-brood--wit-9238'

  it('haalt de keuzeknop weg en zet er de vermelding voor in de plaats', async () => {
    // ⚠ DE FOUT DIE DEZE RONDE RECHTZET, uit Timothy's eigen gebruik. Naast een
    // gekozen "Brood (wit)" bleef de knop "Hoofdcategorie: …" staan, hij bleef
    // aanklikbaar, en één tik erop verving zijn subcategorie stil door de brede
    // hoofdcategorie "Drank": omschrijving ongewijzigd, categorie verkeerd, geen woord.
    zetNeer({ waarde: 'Brood (wit)', categorieId: BROOD, onKiesHoofdcategorie: vi.fn(), onWis: vi.fn() })

    expect(screen.queryByRole('button', { name: /hoofdcategorie/i })).toBeNull()
    expect(screen.getByText('Voeding › Broodwaren')).toBeInTheDocument()
  })

  it('houdt de keuzeknop bij een BREDE keuze, want daaronder valt nog te kiezen', () => {
    // Een hoofdcategorie is geen afgemaakte keuze: de laag eronder is de logische
    // volgende stap. Dezelfde regel als op het gewone boekingsformulier.
    zetNeer({ waarde: '', categorieId: 'ov-voeding', onKiesHoofdcategorie: vi.fn(), onWis: vi.fn() })

    expect(screen.getByRole('button', { name: /hoofdcategorie/i })).toBeInTheDocument()
    expect(screen.queryByText(/›/)).toBeNull()
  })

  it('houdt de keuzeknop zonder keuze', () => {
    zetNeer({ onKiesHoofdcategorie: vi.fn(), onWis: vi.fn() })
    expect(screen.getByRole('button', { name: /hoofdcategorie/i })).toBeInTheDocument()
  })

  it('geeft met "wissen" de weg terug, en houdt je getypte tekst', async () => {
    // ⚠ Zonder deze knop zou "een afgemaakte keuze is geen vraag meer" veranderd zijn
    // in "een afgemaakte keuze is definitief": breed taggen kon dan niet meer.
    const user = userEvent.setup()
    const onWis = vi.fn()
    const onTekst = vi.fn()
    zetNeer({ waarde: 'Brood (wit)', categorieId: BROOD, onKiesHoofdcategorie: vi.fn(), onWis, onTekst })

    await user.click(screen.getByRole('button', { name: 'wissen' }))

    expect(onWis).toHaveBeenCalled()
    // De omschrijving is jouw eigen tekst en blijft staan.
    expect(onTekst).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Subcategorie zoeken')).toHaveValue('Brood (wit)')
  })

  it('zet de cursor na "wissen" meteen terug in het zoekveld', async () => {
    const user = userEvent.setup()
    zetNeer({ waarde: 'Brood (wit)', categorieId: BROOD, onKiesHoofdcategorie: vi.fn(), onWis: vi.fn() })

    await user.click(screen.getByRole('button', { name: 'wissen' }))

    expect(document.activeElement).toBe(screen.getByLabelText('Subcategorie zoeken'))
  })

  it('houdt de keuzeknop wanneer het scherm NIET kan wissen', () => {
    // ⚠ Liever een knop te veel dan een gebruiker die vastzit: zonder weg terug mag de
    // enige andere uitweg niet verdwijnen.
    zetNeer({ waarde: 'Brood (wit)', categorieId: BROOD, onKiesHoofdcategorie: vi.fn() })

    expect(screen.getByRole('button', { name: /hoofdcategorie/i })).toBeInTheDocument()
    expect(screen.getByText('Voeding › Broodwaren')).toBeInTheDocument()
  })

  it('koppelt de vermelding aan het zoekveld, en ALLEEN de vermelding', () => {
    // ⚠ `toBe` en niet `toContain`. Wees de koppeling naar de alinea in plaats van naar
    // de tekst, dan las voorleessoftware dit veld voor als "… Voeding › Broodwaren
    // wissen": het woord van de knop plakte aan de vermelding vast.
    zetNeer({ waarde: 'Brood (wit)', categorieId: BROOD, onKiesHoofdcategorie: vi.fn(), onWis: vi.fn(), nummer: 1 })
    const veld = screen.getByLabelText('Subcategorie zoeken')
    const id = veld.getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    expect(document.getElementById(id as string)?.textContent).toBe('Voeding › Broodwaren')
  })

  it('beschrijft het veld NIET wanneer er geen vermelding staat', () => {
    zetNeer({ onKiesHoofdcategorie: vi.fn(), onWis: vi.fn() })
    expect(screen.getByLabelText('Subcategorie zoeken')).not.toHaveAttribute('aria-describedby')
  })

  it('geeft elke ticketregel een eigen naam voor "wissen"', () => {
    // ⚠ Huisregel sinds ronde 66: twee bedieningen met dezelfde toegankelijke naam op
    // één scherm zijn een fout. Een gesplitst kassaticket heeft er meerdere onder
    // elkaar, en de buren op dezelfde rij dragen hun nummer al.
    render(
      <>
        <ItemZoeker waarde="Brood (wit)" categorieId={BROOD} nummer={1} onTekst={vi.fn()} onKiesItem={vi.fn()} onWis={vi.fn()} onKiesHoofdcategorie={vi.fn()} />
        <ItemZoeker waarde="Brood (wit)" categorieId={BROOD} nummer={2} onTekst={vi.fn()} onKiesItem={vi.fn()} onWis={vi.fn()} onKiesHoofdcategorie={vi.fn()} />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Categorie van regel 1 wissen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Categorie van regel 2 wissen' })).toBeInTheDocument()
  })

  it('haalt de vermelding weg zolang het toevoegpaneeltje openstaat', async () => {
    // ⚠ Zwevend is niet hetzelfde als weg. Het paneeltje zweeft over deze regel heen,
    // en één tik op "wissen" die je niet meer zag, haalt je categorie weg terwijl je
    // een nieuwe aan het maken bent.
    const user = userEvent.setup()
    zetNeer({ waarde: 'roggebrood', categorieId: BROOD, nummer: 1, onWis: vi.fn(), onKiesHoofdcategorie: vi.fn() })

    expect(screen.getByText('Voeding › Broodwaren')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))

    expect(screen.queryByText('Voeding › Broodwaren')).toBeNull()
    expect(screen.queryByRole('button', { name: /wissen/ })).toBeNull()
  })
})

describe('ItemZoeker — de voorstellenlijst bij een afgemaakte keuze (ronde 78)', () => {
  const BROOD = 'i-brood--wit-9238'

  it('gaat niet vanzelf open wanneer het veld precies je keuze toont', async () => {
    // ⚠ Twee stille gevolgen als ze dat wél deed. (1) Je kreeg onder je eigen keuze een
    // lijst met diezelfde "Brood (wit)" én "+ toevoegen aan …" — een uitnodiging om een
    // duplicaat van jezelf te maken. (2) Tab KIEST in een open lijst; de eerste Tab op
    // weg naar "wissen" veranderde dus je categorie.
    const user = userEvent.setup()
    zetNeer({ waarde: 'Brood (wit)', categorieId: BROOD, nummer: 1, onWis: vi.fn(), onKiesHoofdcategorie: vi.fn() })

    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('gaat WÉL open wanneer de tekst van je keuze afwijkt', async () => {
    // Dan ben je iets anders aan het zoeken, en hoort de lijst er te zijn.
    const user = userEvent.setup()
    zetNeer({ waarde: 'roggebrood', categorieId: BROOD, nummer: 1, onWis: vi.fn(), onKiesHoofdcategorie: vi.fn() })

    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
  })

  it('brengt Tab naar "wissen" in plaats van je keuze te veranderen', async () => {
    const user = userEvent.setup()
    const onKiesItem = vi.fn()
    zetNeer({ waarde: 'Brood (wit)', categorieId: BROOD, nummer: 1, onKiesItem, onWis: vi.fn(), onKiesHoofdcategorie: vi.fn() })

    screen.getByLabelText('Subcategorie zoeken').focus()
    await user.tab()

    expect(onKiesItem).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Categorie van regel 1 wissen' }))
  })

  it('sluit met "wissen" ook een lijst die al openstond', async () => {
    // Wijkt je tekst af van je keuze, dan staat de lijst open. Bleef ze na "wissen"
    // staan, dan koos de eerstvolgende Tab er alsnog iets uit.
    const user = userEvent.setup()
    function Schil() {
      const [categorieId, setCategorieId] = useState<string | undefined>(BROOD)
      return (
        <ItemZoeker
          waarde="brood"
          categorieId={categorieId}
          nummer={1}
          onTekst={vi.fn()}
          onKiesItem={vi.fn()}
          onWis={() => setCategorieId(undefined)}
          onKiesHoofdcategorie={vi.fn()}
        />
      )
    }
    render(<Schil />)

    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    expect(await screen.findByRole('listbox')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Categorie van regel 1 wissen' }))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('toont de vermelding meteen na een NIEUWE subcategorie', async () => {
    // ⚠ De vermelding leest uit de categorieboom, en die wordt buiten React opgebouwd.
    // Was ze op dat moment nog niet bij, dan stond de keuzeknop die deze ronde weghaalt
    // gewoon terug op een regel die wél een subcategorie draagt — precies terwijl je nog
    // aan het klikken bent.
    const user = userEvent.setup()
    const onNieuweSubcategorie = vi.fn().mockImplementation(async () => {
      stelCategorieboomIn([{ id: 'sub-rogge', naam: 'roggebrood', categorieId: 'cat-broodwaren' }], [])
      return 'sub-rogge'
    })
    function Schil() {
      const [categorieId, setCategorieId] = useState<string | undefined>(undefined)
      const [tekst, setTekst] = useState('roggebrood')
      return (
        <ItemZoeker
          waarde={tekst}
          categorieId={categorieId}
          nummer={1}
          onTekst={setTekst}
          onKiesItem={(item) => {
            setCategorieId(item.id)
            setTekst(item.naam)
          }}
          onWis={() => setCategorieId(undefined)}
          onKiesHoofdcategorie={vi.fn()}
          onNieuweSubcategorie={onNieuweSubcategorie}
        />
      )
    }
    render(<Schil />)

    await user.click(screen.getByLabelText('Subcategorie zoeken'))
    await user.click(await screen.findByRole('option', { name: /toevoegen/ }))
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    await user.selectOptions(screen.getByLabelText('Categorie'), 'cat-broodwaren')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    expect(await screen.findByText('Voeding › Broodwaren')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hoofdcategorie/i })).toBeNull()
  })

  it('zet na "wissen" niet meteen terug wat je net wiste', async () => {
    // ⚠ "wissen" zet de cursor terug in het veld. Opende dat de lijst weer, dan koos de
    // eerstvolgende Tab precies het item dat je zonet had weggehaald — en dan is de weg
    // terug geen weg terug.
    //
    // ⚠ Mét een ECHTE toestand, niet met een `vi.fn()` dat niets wist: bleef de
    // categorie op de regel staan, dan hield de regel "het veld toont je keuze" de lijst
    // sowieso dicht en bewees deze test niets.
    const user = userEvent.setup()
    const onKiesItem = vi.fn()
    function Schil() {
      const [categorieId, setCategorieId] = useState<string | undefined>(BROOD)
      return (
        <ItemZoeker
          waarde="Brood (wit)"
          categorieId={categorieId}
          nummer={1}
          onTekst={vi.fn()}
          onKiesItem={onKiesItem}
          onWis={() => setCategorieId(undefined)}
          onKiesHoofdcategorie={vi.fn()}
          onNieuweSubcategorie={vi.fn()}
        />
      )
    }
    render(<Schil />)

    await user.click(screen.getByRole('button', { name: 'Categorie van regel 1 wissen' }))
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.tab()
    expect(onKiesItem).not.toHaveBeenCalled()
  })
})
