import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactieFormulier } from './TransactieFormulier'
import { bouwHandelaarIndex } from '../utils/categorieVoorstel'
import type { Dossier, Garantie, Transactie } from '../data/schema'

const rekeningen = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]

function renderForm(onOpslaan = vi.fn(), handelaars: string[] = []) {
  render(
    <TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} handelaars={handelaars} />,
  )
  return onOpslaan
}

describe('TransactieFormulier', () => {
  it('bewaart met het juiste bedrag in centen en negatief teken voor een uitgave', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boekhandel')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ omschrijving: 'Boekhandel', bedrag: -1550, rekeningId: 'r1' }),
    )
  })

  it('maakt de velden leeg na het toevoegen', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boekhandel')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue('')
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('')
  })

  it('stelt eerder gebruikte handelaars voor vanaf twee letters', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn(), ['Colruyt', 'Delhaize'])

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'co')
    expect(await screen.findByRole('option', { name: 'Colruyt' })).toBeInTheDocument()
  })

  it('splitst het ticket over item-regels met een totaal', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '50')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    // Regel 1: item via autocomplete (op synoniem) + deelbedrag.
    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'witbrood')
    await user.keyboard('{Enter}')
    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '30')

    // Regel 2 toevoegen: vrije tekst + deelbedrag.
    await user.click(screen.getByRole('button', { name: '+ Regel toevoegen' }))
    await user.type(screen.getAllByLabelText('Item zoeken')[1], 'Wasmiddel')
    await user.type(screen.getAllByLabelText('Deelbedrag')[1], '20')

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        bedrag: -5000,
        regels: [
          expect.objectContaining({ categorieId: 'i-brood--wit-9238', omschrijving: 'Brood (wit)', bedrag: -3000 }),
          expect.objectContaining({ omschrijving: 'Wasmiddel', bedrag: -2000 }),
        ],
      }),
    )
  })

  it('maakt met Enter in het deelbedrag automatisch een nieuwe regel', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '50')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'brood')
    await user.keyboard('{Enter}')
    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '30')

    expect(screen.getAllByLabelText('Deelbedrag')).toHaveLength(1)
    await user.keyboard('{Enter}')
    expect(screen.getAllByLabelText('Deelbedrag')).toHaveLength(2)
  })

  it('tagt een ticketregel breed via een hoofdcategorie-chip', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'diversen')
    // Ronde 30: de hoofdcategorieën zitten achter één knop. Eerst openen.
    await user.click(screen.getAllByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' })[0])
    await user.click(screen.getAllByRole('button', { name: /Huishouden en Verzorging/ })[0])
    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '12')

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        regels: [expect.objectContaining({ categorieId: 'ov-huishouden-en-verzorging', omschrijving: 'diversen', bedrag: -1200 })],
      }),
    )
  })

  it('maakt vanuit de kassaticket-zoeker een nieuwe subcategorie en tagt de regel erop', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-kefir-9')
    render(
      <TransactieFormulier
        onOpslaan={onOpslaan}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '3')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'Kefir')
    await user.click(await screen.findByRole('option', { name: /Kefir.*toevoegen/ }))
    await user.selectOptions(screen.getByLabelText('Onder welke categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    // Het bewaren is asynchroon; pas daarna wordt de regel op het nieuwe id getagd.
    await waitFor(() => expect(onNieuweSubcategorie).toHaveBeenCalledWith('cat-zuivel-en-kaas', 'Kefir'))

    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '3')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        regels: [expect.objectContaining({ categorieId: 'sub-kefir-9', omschrijving: 'Kefir', bedrag: -300 })],
      }),
    )
  })
})

// Ronde 18: boekte je deze handelaar eerder, dan stelt het formulier die
// categorie voor. Bewust een voorstel, geen stille invulling.
describe('TransactieFormulier — categorie van de vorige keer', () => {
  const eerder: Transactie[] = [
    { id: 't1', datum: '2026-06-01', omschrijving: 'Colruyt', bedrag: -3200, rekeningId: 'r1', categorieId: 'ov-voeding' },
  ]

  function toonMetIndex() {
    return render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={[{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]}
        categorieen={[]}
        handelaars={['Colruyt']}
        handelaarIndex={bouwHandelaarIndex(eerder)}
      />,
    )
  }

  it('stelt niets voor zolang de handelaar leeg is', () => {
    toonMetIndex()
    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })

  it('stelt de categorie van de vorige keer voor, ook met andere hoofdletters', async () => {
    const user = userEvent.setup()
    toonMetIndex()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'colruyt')

    expect(await screen.findByText('Vorige keer bij deze handelaar:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gebruik Voeding, zoals de vorige keer' })).toBeInTheDocument()
  })

  it('stelt niets voor bij een onbekende handelaar', async () => {
    const user = userEvent.setup()
    toonMetIndex()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Delhaize')
    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })

  it('verdwijnt zodra je het voorstel overneemt', async () => {
    const user = userEvent.setup()
    toonMetIndex()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.click(await screen.findByRole('button', { name: 'Gebruik Voeding, zoals de vorige keer' }))

    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })

  it('doet niets wanneer er geen index meegegeven is', async () => {
    const user = userEvent.setup()
    render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={[{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]}
        categorieen={[]}
        handelaars={['Colruyt']}
      />,
    )
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })
})

// --- Ronde 22: de optionele velden, de dossierkoppeling en de bon ---

const dossiers: Dossier[] = [
  { id: 'dos-1', naam: 'Kinderen', aandeelJij: 50 },
  { id: 'dos-2', naam: 'Huis', aandeelJij: 60 },
]

// verkleinAfbeelding geeft niet-afbeeldingen ongewijzigd terug, dus een PDF werkt
// in jsdom zonder canvas.
function pdf(naam = 'bon.pdf') {
  return new File(['%PDF-1.4 bon'], naam, { type: 'application/pdf' })
}

function toonUitgebreid(over: Partial<React.ComponentProps<typeof TransactieFormulier>> = {}) {
  const onOpslaan = vi.fn()
  const onDossierKost = vi.fn()
  const onBon = vi.fn()
  render(
    <TransactieFormulier
      onOpslaan={onOpslaan}
      rekeningen={rekeningen}
      categorieen={[]}
      handelaars={[]}
      dossiers={dossiers}
      onDossierKost={onDossierKost}
      onBon={onBon}
      {...over}
    />,
  )
  return { onOpslaan, onDossierKost, onBon }
}

describe('TransactieFormulier — optionele velden', () => {
  it('houdt de optionele velden dicht tot je ze opent', async () => {
    const user = userEvent.setup()
    toonUitgebreid()

    expect(screen.queryByLabelText('Delen in een dossier (optioneel)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bon/factuur (optioneel)')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Meer opties' }))
    expect(screen.getByLabelText('Delen in een dossier (optioneel)')).toBeInTheDocument()
    expect(screen.getByLabelText('Bon/factuur (optioneel)')).toBeInTheDocument()
  })

  it('toont geen regel met opties wanneer er niets optioneels te kiezen valt', () => {
    render(
      <TransactieFormulier onOpslaan={vi.fn()} rekeningen={rekeningen} categorieen={[]} handelaars={[]} />,
    )
    expect(screen.queryByRole('button', { name: 'Meer opties' })).not.toBeInTheDocument()
  })

  it('opent het blok meteen bij het bewerken van een transactie met een bon', () => {
    const bewerken: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Colruyt', bedrag: -1000, rekeningId: 'r1' }
    toonUitgebreid({
      bewerken,
      bon: {
        id: 'doc-1',
        transactieId: 't1',
        naam: 'Kassaticket',
        soort: 'bon',
        bestand: 'data:application/pdf;base64,AA==',
        toegevoegdOp: '2026-07-01',
      },
    })
    // Zonder dit zou je de bon niet zien en hem bij het bewaren stil verliezen.
    // Er staat een voorbeeld in plaats van een bestandskiezer, dus zoeken we op het
    // label zelf en op de kijk-link.
    expect(screen.getByText('Bon/factuur (optioneel)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'bekijken' })).toBeInTheDocument()
  })
})

describe('TransactieFormulier — dossierkoppeling', () => {
  it('maakt naast de transactie een gedeelde kost met een positief bedrag', async () => {
    const user = userEvent.setup()
    const { onOpslaan, onDossierKost } = toonUitgebreid()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Apotheek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '24,50')
    await user.click(screen.getByRole('button', { name: 'Meer opties' }))
    await user.selectOptions(screen.getByLabelText('Delen in een dossier (optioneel)'), 'dos-1')
    await user.selectOptions(screen.getByLabelText('Soort kost'), 'buitengewoon')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    const transactie = onOpslaan.mock.calls[0][0] as Transactie
    expect(transactie.bedrag).toBe(-2450)
    await waitFor(() =>
      expect(onDossierKost).toHaveBeenCalledWith(
        expect.objectContaining({
          dossierId: 'dos-1',
          transactieId: transactie.id,
          // In een dossier is een kost altijd positief; de richting zit in betaaldDoor.
          bedrag: 2450,
          betaaldDoor: 'jij',
          kostenType: 'buitengewoon',
          omschrijving: 'Apotheek',
        }),
      ),
    )
  })

  it('maakt geen gedeelde kost wanneer je geen dossier kiest', async () => {
    const user = userEvent.setup()
    const { onDossierKost } = toonUitgebreid()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Bakker')
    await user.type(screen.getByLabelText('Bedrag (€)'), '5')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    await waitFor(() => expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue(''))
    expect(onDossierKost).not.toHaveBeenCalled()
  })

  it('haalt de koppeling weg wanneer je het dossier op "Niet delen" zet', async () => {
    const user = userEvent.setup()
    const bewerken: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Dokter', bedrag: -3000, rekeningId: 'r1' }
    const { onDossierKost } = toonUitgebreid({
      bewerken,
      gekoppeldeKost: {
        id: 'k1',
        dossierId: 'dos-1',
        transactieId: 't1',
        omschrijving: 'Dokter',
        bedrag: 3000,
        betaaldDoor: 'jij',
        datum: '2026-07-01',
      },
    })

    // Het blok staat al open omdat er een koppeling hangt.
    expect(screen.getByLabelText('Delen in een dossier (optioneel)')).toHaveValue('dos-1')
    await user.selectOptions(screen.getByLabelText('Delen in een dossier (optioneel)'), '')
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(() => expect(onDossierKost).toHaveBeenCalledWith(null))
  })

  it('behoudt het id van de bestaande kost in plaats van een tweede te maken', async () => {
    const user = userEvent.setup()
    const bewerken: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Dokter', bedrag: -3000, rekeningId: 'r1' }
    const { onDossierKost } = toonUitgebreid({
      bewerken,
      gekoppeldeKost: {
        id: 'k1',
        dossierId: 'dos-1',
        transactieId: 't1',
        omschrijving: 'Dokter',
        bedrag: 3000,
        betaaldDoor: 'jij',
        datum: '2026-07-01',
      },
    })

    await user.selectOptions(screen.getByLabelText('Delen in een dossier (optioneel)'), 'dos-2')
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(() =>
      expect(onDossierKost).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', dossierId: 'dos-2' })),
    )
  })

  it('raakt een kost die al in een afrekening zit niet meer aan', async () => {
    const user = userEvent.setup()
    const bewerken: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Dokter', bedrag: -3000, rekeningId: 'r1' }
    const { onDossierKost } = toonUitgebreid({
      bewerken,
      gekoppeldeKost: {
        id: 'k1',
        dossierId: 'dos-1',
        transactieId: 't1',
        omschrijving: 'Dokter',
        bedrag: 3000,
        betaaldDoor: 'jij',
        datum: '2026-07-01',
        verrekeningId: 'v1',
      },
    })

    expect(
      screen.getByText('Deze uitgave zit al in een afrekening van een dossier en wordt hier niet meer gewijzigd.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Delen in een dossier (optioneel)')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Wijzigen' })).toBeInTheDocument())
    expect(onDossierKost).not.toHaveBeenCalled()
  })

  it('biedt geen dossier aan bij een inkomst', async () => {
    const user = userEvent.setup()
    toonUitgebreid({ soort: 'inkomst' })
    await user.click(screen.getByRole('button', { name: 'Meer opties' }))
    expect(screen.queryByLabelText('Delen in een dossier (optioneel)')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Bon/factuur (optioneel)')).toBeInTheDocument()
  })
})

describe('TransactieFormulier — bon of factuur', () => {
  it('bewaart de bon als document dat naar de transactie wijst', async () => {
    const user = userEvent.setup()
    const { onOpslaan, onBon } = toonUitgebreid()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Garage')
    await user.type(screen.getByLabelText('Bedrag (€)'), '120')
    await user.click(screen.getByRole('button', { name: 'Meer opties' }))
    await user.upload(screen.getByLabelText('Bon/factuur (optioneel)'), pdf('factuur.pdf'))

    expect(await screen.findByRole('button', { name: 'bekijken' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    const transactie = onOpslaan.mock.calls[0][0] as Transactie
    await waitFor(() =>
      expect(onBon).toHaveBeenCalledWith(
        expect.objectContaining({ transactieId: transactie.id, soort: 'bon', bestandsnaam: 'factuur.pdf' }),
      ),
    )
  })

  it('weigert een te groot bestand en bewaart het niet', async () => {
    const user = userEvent.setup()
    toonUitgebreid()

    await user.click(screen.getByRole('button', { name: 'Meer opties' }))
    await user.upload(
      screen.getByLabelText('Bon/factuur (optioneel)'),
      new File(['x'.repeat(4_500_000)], 'groot.pdf', { type: 'application/pdf' }),
    )

    expect(
      await screen.findByText('Dit bestand is te groot (max. 4 MB). Kies een kleinere scan of foto.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'bekijken' })).not.toBeInTheDocument()
  })

  it('schrijft een ongewijzigde bon niet opnieuw weg', async () => {
    const user = userEvent.setup()
    const bewerken: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Garage', bedrag: -1000, rekeningId: 'r1' }
    const { onBon } = toonUitgebreid({
      bewerken,
      bon: {
        id: 'doc-1',
        transactieId: 't1',
        naam: 'Factuur',
        soort: 'bon',
        bestand: 'data:application/pdf;base64,AA==',
        toegevoegdOp: '2026-07-01',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))
    // Het logboek is append-only: dezelfde foto opnieuw wegschrijven bij elke
    // kleine tekstwijziging laat de back-up onnodig aandikken.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Wijzigen' })).toBeInTheDocument())
    expect(onBon).not.toHaveBeenCalled()
  })

  it('verwijdert de bon wanneer je hem weghaalt', async () => {
    const user = userEvent.setup()
    const bewerken: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Garage', bedrag: -1000, rekeningId: 'r1' }
    const { onBon } = toonUitgebreid({
      bewerken,
      bon: {
        id: 'doc-1',
        transactieId: 't1',
        naam: 'Factuur',
        soort: 'bon',
        bestand: 'data:application/pdf;base64,AA==',
        toegevoegdOp: '2026-07-01',
      },
    })

    await user.click(screen.getByRole('button', { name: 'verwijderen' }))
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))
    await waitFor(() => expect(onBon).toHaveBeenCalledWith(null))
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — wat er gebeurt als het NIET vlot loopt.
//
// Drie situaties die tot nu toe alleen in de code beschreven stonden en nergens
// werden bewaakt: te veel verdelen, twee keer tikken, en een bewaring die
// mislukt. Precies de gevallen waarin een gebruiker zijn invoer kan kwijtraken.
// ---------------------------------------------------------------------------

describe('TransactieFormulier — te veel verdeeld', () => {
  async function verdeelTeveel(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '50')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))
    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'Brood')
    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '40')
    await user.click(screen.getByRole('button', { name: '+ Regel toevoegen' }))
    await user.type(screen.getAllByLabelText('Item zoeken')[1], 'Zeep')
    await user.type(screen.getAllByLabelText('Deelbedrag')[1], '20')
  }

  it('weigert op te slaan en zegt waarom', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()
    await verdeelTeveel(user)

    expect(
      screen.getByText('De regels verdelen meer dan het totaalbedrag. Pas een regel of het totaal aan.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    // Zonder deze grendel werd het verschil een tegenboeking met omgekeerd teken:
    // € 60 uitgaven én € 10 inkomsten uit één ticket van € 50.
    expect(onOpslaan).not.toHaveBeenCalled()
  })

  it('zegt "te veel" in plaats van een bedrag met een minteken', async () => {
    const user = userEvent.setup()
    renderForm()
    await verdeelTeveel(user)

    // "(nog −€ 10,00)" was dubbel ontkennend en las niemand goed.
    expect(screen.getByText(/te veel/)).toBeInTheDocument()
    expect(screen.queryByText(/nog −/)).toBeNull()
    expect(screen.queryByText(/nog -/)).toBeNull()
  })

  it('slaat wel op zodra de regels binnen het totaal passen', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()
    await verdeelTeveel(user)
    // Van 20 naar 5: samen 45 van de 50, de rest wordt "zonder categorie".
    await user.clear(screen.getAllByLabelText('Deelbedrag')[1])
    await user.type(screen.getAllByLabelText('Deelbedrag')[1], '5')

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onOpslaan).toHaveBeenCalled()
  })
})

describe('TransactieFormulier — twee keer tikken', () => {
  it('boekt maar één keer wanneer je snel twee keer op Toevoegen tikt', async () => {
    const user = userEvent.setup()
    // Een trage bewaring nabootsen: op een telefoon duurt schrijven + herladen
    // merkbaar lang, en juist dan tikt iemand een tweede keer.
    let laatLos: () => void = () => {}
    const onOpslaan = vi.fn(() => new Promise<void>((r) => { laatLos = r }))
    render(
      <TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} handelaars={[]} />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12,50')

    const knop = screen.getByRole('button', { name: /Toevoegen|Bewaren/ })
    await user.click(knop)
    await user.click(screen.getByRole('button', { name: /Toevoegen|Bewaren/ }))
    expect(onOpslaan).toHaveBeenCalledTimes(1)

    laatLos()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Toevoegen' })).toBeInTheDocument())
  })

  it('zegt tijdens het bewaren dat hij bezig is', async () => {
    const user = userEvent.setup()
    let laatLos: () => void = () => {}
    const onOpslaan = vi.fn(() => new Promise<void>((r) => { laatLos = r }))
    render(
      <TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} handelaars={[]} />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    const bezig = screen.getByRole('button', { name: 'Bewaren…' })
    expect(bezig).toHaveAttribute('aria-busy', 'true')

    laatLos()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Toevoegen' })).toBeInTheDocument())
  })
})

describe('TransactieFormulier — een mislukte bewaring', () => {
  it('houdt je invoer vast en zegt wat er misging', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn(() => Promise.reject(new Error('QuotaExceededError: opslag vol')))
    render(
      <TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} handelaars={[]} />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    // Eerst de uitleg in gewone taal, dan pas de technische melding eronder.
    await waitFor(() =>
      expect(
        screen.getByText('De opslag van dit toestel zit vol. Verwijder een paar bonnetjes of foto’s en probeer opnieuw.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText(/QuotaExceededError/)).toBeInTheDocument()

    // En het belangrijkste: het formulier staat er nog, ingevuld.
    expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue('Colruyt')
    expect(screen.getByRole('button', { name: 'Toevoegen' })).toBeInTheDocument()
  })

  it('laat je gewoon opnieuw proberen', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi
      .fn()
      .mockRejectedValueOnce(new Error('mislukt'))
      .mockResolvedValueOnce(undefined)
    render(
      <TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} handelaars={[]} />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    await waitFor(() => expect(screen.getByText('Opslaan is niet gelukt. Je invoer staat er nog.')).toBeInTheDocument())

    // De grendel moet weer los zijn, anders kan je na één mislukking nooit meer
    // opslaan zonder de popup te sluiten — en dan ben je je invoer alsnog kwijt.
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onOpslaan).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue(''))
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — een achtergrondsync mag je invoer nooit aanraken.
//
// De app haalt elke 45 seconden stil nieuwe gegevens op en maakt daarbij alle
// lijsten opnieuw aan: dezelfde inhoud, maar als nieuwe voorwerpen. Keek het
// formulier daarnaar, dan vulde het zichzelf middenin het typen opnieuw in — en
// bij het bewerken bewaarde "Wijzigen" daarna stil de OUDE waarde.
// ---------------------------------------------------------------------------

describe('TransactieFormulier — een herlaadbeurt tijdens het invullen', () => {
  const bewerken: Transactie = {
    id: 't1',
    datum: '2026-07-01',
    omschrijving: 'Garage',
    bedrag: -9000,
    rekeningId: 'r1',
  }

  it('laat wat je getypt hebt staan wanneer de app opnieuw laadt', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <TransactieFormulier onOpslaan={vi.fn()} rekeningen={rekeningen} categorieen={[]} handelaars={[]} />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '42,30')

    // Precies wat `herlaad()` doet: dezelfde inhoud, verse arrays.
    rerender(
      <TransactieFormulier onOpslaan={vi.fn()} rekeningen={[...rekeningen]} categorieen={[]} handelaars={[]} />,
    )

    expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue('Colruyt')
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('42,30')
  })

  it('laat een gewijzigd bedrag niet terugspringen naar de opgeslagen waarde', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    const { rerender } = render(
      <TransactieFormulier
        onOpslaan={onOpslaan}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={bewerken}
      />,
    )

    await user.clear(screen.getByLabelText('Bedrag (€)'))
    await user.type(screen.getByLabelText('Bedrag (€)'), '95')

    rerender(
      <TransactieFormulier
        onOpslaan={onOpslaan}
        rekeningen={[...rekeningen]}
        categorieen={[]}
        handelaars={[]}
        bewerken={{ ...bewerken }}
      />,
    )

    // Sprong dit terug naar 90,00, dan bewaarde "Wijzigen" stil het oude bedrag.
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('95')
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ bedrag: -9500 }))
  })

  it('houdt je dossierkeuze vast wanneer de bon onderweg bewaard wordt', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    const { rerender } = render(
      <TransactieFormulier
        onOpslaan={onOpslaan}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        dossiers={dossiers}
        onDossierKost={vi.fn()}
        onBon={vi.fn()}
        bewerken={bewerken}
        bon={null}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Meer opties' }))
    await user.selectOptions(screen.getByLabelText('Delen in een dossier (optioneel)'), 'dos-1')

    // Tijdens het bewaren verschijnt het bondocument: een NIEUW id, terwijl je in
    // hetzelfde formulier staat. Zou het formulier daarop reageren, dan stond je
    // dossierkeuze daarna weer op "Niet delen" — en na een mislukking verdween de
    // gedeelde kost stilzwijgend.
    rerender(
      <TransactieFormulier
        onOpslaan={onOpslaan}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        dossiers={dossiers}
        onDossierKost={vi.fn()}
        onBon={vi.fn()}
        bewerken={bewerken}
        bon={{
          id: 'doc-nieuw',
          transactieId: 't1',
          naam: 'Bon',
          soort: 'bon',
          bestand: 'data:image/jpeg;base64,AA==',
          toegevoegdOp: '2026-07-01',
        }}
      />,
    )

    expect(screen.getByLabelText('Delen in een dossier (optioneel)')).toHaveValue('dos-1')
  })

  it('vult het formulier wél opnieuw wanneer je een ándere transactie opent', () => {
    const { rerender } = render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={bewerken}
      />,
    )
    expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue('Garage')

    rerender(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={{ ...bewerken, id: 't2', omschrijving: 'Colruyt', bedrag: -1250 }}
      />,
    )
    expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue('Colruyt')
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('12,50')
  })
})

// Ronde 35: twee toestellen. Hangt er bij het openen geen bon aan de transactie en
// komt er tijdens het invullen een binnen via de synchronisatie, dan mag het
// opslaan die net ontvangen bon niet wissen.
describe('TransactieFormulier — een bon die onderweg binnenkomt', () => {
  const bewerken: Transactie = {
    id: 't1',
    datum: '2026-07-01',
    omschrijving: 'Garage',
    bedrag: -9000,
    rekeningId: 'r1',
  }
  const binnengekomen = {
    id: 'doc-van-b',
    transactieId: 't1',
    naam: 'Factuur',
    soort: 'bon' as const,
    bestand: 'data:image/jpeg;base64,AA==',
    toegevoegdOp: '2026-07-01',
  }

  it('wist een bon niet die je zelf nooit weggehaald hebt', async () => {
    const user = userEvent.setup()
    const onBon = vi.fn()
    const { rerender } = render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={bewerken}
        bon={null}
        onBon={onBon}
      />,
    )

    rerender(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={bewerken}
        bon={binnengekomen}
        onBon={onBon}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))
    await waitFor(() => expect(onBon).not.toHaveBeenCalled())
  })

  it('wist de bon wél wanneer je hem zelf verwijdert', async () => {
    const user = userEvent.setup()
    const onBon = vi.fn()
    render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={bewerken}
        bon={binnengekomen}
        onBon={onBon}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'verwijderen' }))
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))
    await waitFor(() => expect(onBon).toHaveBeenCalledWith(null))
  })
})

// --- Ronde 36: vanuit een boeking meteen een garantiebewijs ---
//
// De brug bestond maar in één richting: op de Garanties-pagina kon je een boeking
// aanduiden. Maar het moment waarop je aan garantie dénkt, is het moment waarop je
// de aankoop inboekt.
describe('TransactieFormulier — garantiebewijs bij een aankoop', () => {
  function renderMetGarantie(gekoppeldeGarantie: Garantie | null = null, bewerken: Transactie | null = null) {
    const onOpslaan = vi.fn()
    const onGarantie = vi.fn()
    render(
      <TransactieFormulier
        onOpslaan={onOpslaan}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={bewerken}
        gekoppeldeGarantie={gekoppeldeGarantie}
        onGarantie={onGarantie}
      />,
    )
    return { onOpslaan, onGarantie }
  }

  it('maakt een garantiebewijs met de gegevens van de boeking', async () => {
    const user = userEvent.setup()
    const { onGarantie } = renderMetGarantie()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Media Markt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '899')
    await user.click(screen.getByRole('button', { name: /Meer opties/ }))
    await user.click(screen.getByLabelText(/Garantiebewijs bijhouden/))
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    await waitFor(() =>
      expect(onGarantie).toHaveBeenCalledWith(
        expect.objectContaining({ product: 'Media Markt', prijs: 89900, garantieMaanden: 24 }),
      ),
    )
  })

  it('neemt een andere garantieduur over', async () => {
    const user = userEvent.setup()
    const { onGarantie } = renderMetGarantie()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Fietsenwinkel')
    await user.type(screen.getByLabelText('Bedrag (€)'), '1200')
    await user.click(screen.getByRole('button', { name: /Meer opties/ }))
    await user.click(screen.getByLabelText(/Garantiebewijs bijhouden/))
    const maanden = screen.getByLabelText('Garantie (maanden)')
    await user.clear(maanden)
    await user.type(maanden, '60')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    await waitFor(() => expect(onGarantie).toHaveBeenCalledWith(expect.objectContaining({ garantieMaanden: 60 })))
  })

  it('maakt er geen wanneer het vinkje uit blijft', async () => {
    const user = userEvent.setup()
    const { onGarantie } = renderMetGarantie()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Bakker')
    await user.type(screen.getByLabelText('Bedrag (€)'), '5')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    await waitFor(() => expect(onGarantie).not.toHaveBeenCalled())
  })

  it('raakt bij een bestaand bewijs alleen de garantieduur aan', async () => {
    const user = userEvent.setup()
    const tx: Transactie = { id: 't1', datum: '2026-01-01', omschrijving: 'Media Markt', bedrag: -89900, rekeningId: 'r1' }
    const g: Garantie = {
      id: 'g1',
      product: 'Laptop Dell XPS',
      aankoopdatum: '2026-01-01',
      garantieMaanden: 24,
      winkel: 'Media Markt',
      transactieId: 't1',
    }
    const { onGarantie } = renderMetGarantie(g, tx)

    // "Meer opties" staat al open omdat er iets aan hangt.
    const maanden = await screen.findByLabelText('Garantie (maanden)')
    await user.clear(maanden)
    await user.type(maanden, '36')
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(() =>
      expect(onGarantie).toHaveBeenCalledWith(
        // De productnaam die je op de Garanties-pagina verfijnde, blijft staan.
        expect.objectContaining({ id: 'g1', product: 'Laptop Dell XPS', winkel: 'Media Markt', garantieMaanden: 36 }),
      ),
    )
  })

  it('haalt het bewijs weg wanneer je het vinkje uitzet', async () => {
    const user = userEvent.setup()
    const tx: Transactie = { id: 't1', datum: '2026-01-01', omschrijving: 'Media Markt', bedrag: -89900, rekeningId: 'r1' }
    const g: Garantie = { id: 'g1', product: 'Laptop', aankoopdatum: '2026-01-01', garantieMaanden: 24, transactieId: 't1' }
    const { onGarantie } = renderMetGarantie(g, tx)

    await user.click(await screen.findByLabelText(/Garantiebewijs bijhouden/))
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(() => expect(onGarantie).toHaveBeenCalledWith(null))
  })
})

// --- Ronde 36, na de verificatieronde: drie gaten die stil gegevens kostten ---
describe('TransactieFormulier — garantiebewijs, de scherpe randen', () => {
  const tx: Transactie = { id: 't1', datum: '2026-01-01', omschrijving: 'Media Markt', bedrag: -89900, rekeningId: 'r1' }
  const garantie: Garantie = {
    id: 'g1',
    product: 'Laptop',
    aankoopdatum: '2026-01-01',
    garantieMaanden: 24,
    winkel: 'Media Markt',
    transactieId: 't1',
  }

  it('wist geen garantiebewijs dat tijdens het bewerken via de synchronisatie binnenkomt', async () => {
    const user = userEvent.setup()
    const onGarantie = vi.fn()
    const props = {
      onOpslaan: vi.fn(),
      rekeningen,
      categorieen: [],
      handelaars: [],
      bewerken: tx,
      onGarantie,
    }
    const { rerender } = render(<TransactieFormulier {...props} gekoppeldeGarantie={null} />)

    // Zo ziet een stille sync eruit: hetzelfde record, maar er hangt nu een
    // garantiebewijs aan dat dit venster nooit gezien heeft. Het vuleffect draait
    // terecht niet opnieuw, dus het vinkje staat nog uit.
    rerender(<TransactieFormulier {...props} gekoppeldeGarantie={garantie} />)
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(() => expect(props.onOpslaan).toHaveBeenCalled())
    expect(onGarantie).not.toHaveBeenCalledWith(null)
  })

  it('houdt het bewijs in leven wanneer je de uitgave omboekt naar een inkomst', async () => {
    const user = userEvent.setup()
    const onGarantie = vi.fn()
    render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={tx}
        gekoppeldeGarantie={garantie}
        onGarantie={onGarantie}
      />,
    )

    await user.click(screen.getByLabelText('Inkomst'))
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    // Alleen de verwijzing gaat eraf; winkel en product blijven staan.
    await waitFor(() =>
      expect(onGarantie).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'g1', product: 'Laptop', winkel: 'Media Markt' }),
      ),
    )
    expect(onGarantie.mock.calls[0][0]).not.toHaveProperty('transactieId')
  })

  it('schrijft niets weg wanneer er aan het bewijs niets verandert', async () => {
    const user = userEvent.setup()
    const onGarantie = vi.fn()
    render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        bewerken={tx}
        gekoppeldeGarantie={garantie}
        onGarantie={onGarantie}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))
    // Het logboek is append-only: dezelfde regel opnieuw wegschrijven laat hem
    // bij elke bewerking aangroeien.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Wijzigen' })).toBeEnabled())
    expect(onGarantie).not.toHaveBeenCalled()
  })

  it('houdt de knop uit bij een onmogelijke garantieduur', async () => {
    const user = userEvent.setup()
    render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        onGarantie={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Media Markt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '899')
    await user.click(screen.getByRole('button', { name: /Meer opties/ }))
    await user.click(screen.getByLabelText(/Garantiebewijs bijhouden/))
    const maanden = screen.getByLabelText('Garantie (maanden)')
    await user.clear(maanden)

    // De app gebruikt bewust `aria-disabled` en niet `disabled`, zodat de knop
    // bereikbaar blijft en de reden voorgelezen kan worden.
    expect(screen.getByRole('button', { name: 'Toevoegen' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Vul een aantal maanden in, bijvoorbeeld 24.')).toBeInTheDocument()
  })

  it('maakt bij een tweede poging geen TWEEDE gedeelde kost', async () => {
    const user = userEvent.setup()
    const dossiers: Dossier[] = [{ id: 'd1', naam: 'Kinderen', aandeelJij: 50 }]
    const onDossierKost = vi
      .fn()
      .mockRejectedValueOnce(new Error('opslag vol'))
      .mockResolvedValue(undefined)

    render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        dossiers={dossiers}
        onDossierKost={onDossierKost}
      />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '30')
    await user.click(screen.getByRole('button', { name: /Meer opties/ }))
    await user.selectOptions(screen.getByLabelText('Delen in een dossier (optioneel)'), 'd1')

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    await screen.findByText(/opslag vol/)
    // De melding zegt "je invoer staat er nog" — dus dat is precies wat je doet.
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    await waitFor(() => expect(onDossierKost).toHaveBeenCalledTimes(2))
    // Zelfde id, dus één kost in het dossier en geen dubbeltelling in de afrekening.
    expect(onDossierKost.mock.calls[0][0].id).toBe(onDossierKost.mock.calls[1][0].id)
  })
})

