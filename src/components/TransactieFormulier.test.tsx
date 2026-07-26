import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactieFormulier } from './TransactieFormulier'
import { bouwHandelaarIndex } from '../utils/categorieVoorstel'
import type { Dossier, Transactie } from '../data/schema'

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
    await user.click(await screen.findByRole('button', { name: /Kefir.*toevoegen/ }))
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
    expect(screen.getByRole('link', { name: 'bekijken' })).toBeInTheDocument()
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

    expect(await screen.findByRole('link', { name: 'bekijken' })).toBeInTheDocument()
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
    expect(screen.queryByRole('link', { name: 'bekijken' })).not.toBeInTheDocument()
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
