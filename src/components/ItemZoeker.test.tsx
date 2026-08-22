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
