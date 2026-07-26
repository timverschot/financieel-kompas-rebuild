import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'
import {
  bewaarBudget,
  bewaarCategorie,
  bewaarDossier,
  bewaarDossierDocument,
  bewaarGarantie,
  bewaarGedeeldeKost,
  bewaarLening,
  bewaarRekening,
  bewaarTransactie,
} from './data/repository'
import { vandaag } from './utils/datum'

beforeEach(async () => {
  await Promise.all([
    db.transacties.clear(),
    db.rekeningen.clear(),
    db.categorieen.clear(),
    db.budgetten.clear(),
    db.dossiers.clear(),
    db.gedeeldeKosten.clear(),
    db.verrekeningen.clear(),
    db.terugkerendePosten.clear(),
    db.spaardoelen.clear(),
    db.subcategorieen.clear(),
    db.overboekingen.clear(),
    db.kinderen.clear(),
    db.dossierdocumenten.clear(),
    db.events.clear(),
    db.meta.clear(),
  ])
  await maakStartgegevens()
})

// De app start sinds ronde 16 volledig leeg — er wordt géén voorbeelddata meer
// aangemaakt. Deze tests gaan wél uit van een rekening met wat boekingen, dus
// zetten ze die hier zelf klaar. Precies dezelfde gegevens als de vroegere seed,
// zodat alle bestaande verwachtingen blijven kloppen.
async function maakStartgegevens() {
  await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })
  await bewaarCategorie({ id: 'cat-inkomsten', naam: 'Inkomsten' })
  await bewaarCategorie({ id: 'cat-wonen', naam: 'Huisvesting' })
  await bewaarCategorie({ id: 'cat-voeding', naam: 'Voeding' })
  // Bedragen in centen: €2400,00 / -€950,00 / -€320,00.
  await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', categorieId: 'cat-inkomsten' })
  await bewaarTransactie({ id: 't2', datum: '2026-07-03', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', categorieId: 'cat-wonen' })
  await bewaarTransactie({ id: 't3', datum: '2026-07-05', omschrijving: 'Boodschappen', bedrag: -32000, rekeningId: 'r1', categorieId: 'cat-voeding' })
}

// Zoekt het bedrag binnen de Saldo-tegel, zodat het niet verwart met andere
// bedragen elders op het scherm (zoals het netto in het maandoverzicht). De
// tegel is gemarkeerd met data-saldo, zodat de test niet breekt wanneer de
// vormgeving verandert.
function saldoRegel(): HTMLElement {
  return screen.getByText('Saldo').closest('[data-saldo]') as HTMLElement
}

// De app heeft aparte pagina's met een vaste navigatiebalk onderaan. Deze helper
// klikt naar een primaire pagina via haar tab-knop (aria-label = paginanaam).
type Gebruiker = ReturnType<typeof userEvent.setup>
async function ga(user: Gebruiker, pagina: string) {
  await user.click(screen.getByRole('button', { name: pagina }))
}

// Secundaire pagina's (Rekeningen, Budget, Dossiers, Categorieën, ...) zitten op
// mobiel achter de 'Meer'-knop: eerst de sheet openen, dan de pagina kiezen.
async function gaMeer(user: Gebruiker, pagina: string) {
  await user.click(screen.getByRole('button', { name: 'Meer' }))
  await user.click(screen.getByRole('button', { name: pagina }))
}

// Het percentageveld van een dossier start op 50 (de standaardverdeling), dus
// eerst leegmaken en dan typen — anders zou 'typen' er gewoon bij plakken.
async function zetAandeel(user: Gebruiker, waarde: string) {
  const veld = screen.getByLabelText('Aandeel jij (%)')
  await user.clear(veld)
  await user.type(veld, waarde)
}

// Toevoegen gaat sinds ronde 21 altijd via de invoerpopup (de centrale ➕), op
// welke pagina je ook staat. Deze helper opent ze en kiest de soort.
async function openBoeking(user: Gebruiker, soort = 'Uitgave') {
  await user.click(screen.getByRole('button', { name: 'Nieuwe transactie' }))
  await screen.findByRole('dialog')
  await user.click(screen.getByRole('button', { name: soort }))
}

describe('App', () => {
  it('laadt transacties en toont het juiste totaalsaldo (2400 - 950 - 320 = 1130)', async () => {
    render(<App />)
    await screen.findByText('Saldo')
    expect(saldoRegel()).toHaveTextContent(/1[.\s]?130/)
  })

  it('voegt een uitgave toe en verlaagt het saldo (1130 - 15 = 1115)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    // Vanuit het Overzicht, zonder eerst naar Transacties te navigeren: dat is
    // precies wat de popup mogelijk maakt.
    await openBoeking(user, 'Uitgave')
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    // De popup sluit na het opslaan.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await ga(user, 'Transacties')
    expect(await screen.findByText('Boek')).toBeInTheDocument()

    await ga(user, 'Overzicht')
    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?115/))
  })

  it('boekt een inkomst via de popup als een plusbedrag (1130 + 50 = 1180)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    // De soortknop bovenaan de popup bepaalt het teken. Stond die keuze óók nog
    // eens als bolletje onderaan het formulier, dan kon je hier een uitgave van
    // maken zonder het te merken; daarom is dat bolletje in de popup verborgen.
    await openBoeking(user, 'Inkomst')
    expect(screen.queryByLabelText('Uitgave')).toBeNull()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Terugbetaling')
    await user.type(screen.getByLabelText('Bedrag (€)'), '50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?180/))
  })

  it('houdt de popup open bij "Opslaan + volgende" en leegt de velden', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await openBoeking(user, 'Uitgave')
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Opslaan + volgende' }))

    // Nog steeds open, maar leeg: zo tik je een stapel bonnetjes achter elkaar in.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue(''))
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('')
  })

  it('boekt sparen via de popup als een overboeking, niet als uitgave', async () => {
    await bewaarRekening({ id: 'r2', naam: 'Spaarrekening', beginsaldo: 0 })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await openBoeking(user, 'Sparen')
    await user.selectOptions(screen.getByLabelText('Van rekening'), 'r1')
    await user.selectOptions(screen.getByLabelText('Naar rekening'), 'r2')
    await user.type(screen.getByLabelText('Over te boeken bedrag (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Overboeking toevoegen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Geld verschoven tussen eigen rekeningen: het totaalsaldo blijft gelijk.
    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?130/))
  })

  it('verwijdert een transactie en past het saldo aan (na wissen van Boodschappen: 1450)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await ga(user, 'Transacties')
    await screen.findByText('Boodschappen')
    await user.click(screen.getByRole('button', { name: 'Verwijder Boodschappen' }))
    await waitFor(() => expect(screen.queryByText('Boodschappen')).toBeNull())

    await ga(user, 'Overzicht')
    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?450/))
  })

  // Ronde 22: aan een transactie kunnen nu een gedeelde kost en een bon hangen.
  // Blijven die achter bij het verwijderen, dan telt die kost onzichtbaar mee in de
  // afrekening van het dossier en blijft de foto in elke back-up staan.
  it('verwijdert ook de gedeelde kost en de bon die aan een transactie hangen', async () => {
    const user = userEvent.setup()
    await bewaarDossier({ id: 'dos-1', naam: 'Kinderen', aandeelJij: 50 })
    await bewaarGedeeldeKost({
      id: 'k1',
      dossierId: 'dos-1',
      transactieId: 't3',
      omschrijving: 'Boodschappen',
      bedrag: 32000,
      betaaldDoor: 'jij',
      datum: '2026-07-05',
    })
    await bewaarDossierDocument({
      id: 'doc-1',
      transactieId: 't3',
      naam: 'Kassaticket',
      soort: 'bon',
      bestand: 'data:application/pdf;base64,AA==',
      toegevoegdOp: '2026-07-05',
    })

    render(<App />)
    await screen.findByText('Saldo')
    await ga(user, 'Transacties')
    await screen.findByText('Boodschappen')
    await user.click(screen.getByRole('button', { name: 'Verwijder Boodschappen' }))

    await waitFor(async () => expect(await db.gedeeldeKosten.get('k1')).toBeUndefined())
    expect(await db.dossierdocumenten.get('doc-1')).toBeUndefined()
  })

  it('bewerkt een bestaande transactie en past het saldo aan (Huur 950 -> 1000: saldo 1080)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await ga(user, 'Transacties')
    await screen.findByText('Huur')
    await user.click(screen.getByRole('button', { name: 'Bewerk Huur' }))
    const bedrag = screen.getByLabelText('Bedrag (€)')
    await user.clear(bedrag)
    await user.type(bedrag, '1000')
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await ga(user, 'Overzicht')
    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?080/))
  })

  it('voegt een nieuwe rekening toe en maakt ze beschikbaar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Rekeningen')
    await user.type(screen.getByLabelText('Rekeningnaam'), 'Vakantiepot')
    await user.type(screen.getByLabelText('Beginsaldo (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Rekening toevoegen' }))

    // Vakantiepot verschijnt nu als keuze in de rekening-selecties (overboekingen).
    // De keuzelijst toont sinds ronde 7 ook het saldo ("Vakantiepot — € 100,00"),
    // vandaar dat we op de naam zoeken en niet op de volledige tekst.
    expect((await screen.findAllByRole('option', { name: /Vakantiepot/ })).length).toBeGreaterThan(0)
  })

  // De Plan-pagina heeft sinds ronde 25 TWEE van deze kaarten (inkomsten en
  // lasten), elk met een eigen formulier. Deze helper zoekt binnen de juiste kaart.
  function kaart(titel: string): HTMLElement {
    return screen.getByText(titel).closest('section, .kaart') as HTMLElement
  }

  it('maakt een vaste post aan en boekt hem in voor de maand', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Budget')
    const lasten = kaart('Vaste lasten')
    await user.type(within(lasten).getByLabelText('Vaste omschrijving'), 'Netflix')
    await user.type(within(lasten).getByLabelText('Vast bedrag (€)'), '15')
    await user.click(within(lasten).getByRole('button', { name: 'Vaste post toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Boek in' }))

    expect(await screen.findByText('Geboekt ✓')).toBeInTheDocument()
  })

  it('boekt een vaste last in en maakt dat weer ongedaan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Budget')
    const lasten = kaart('Vaste lasten')
    await user.type(within(lasten).getByLabelText('Vaste omschrijving'), 'Netflix')
    await user.type(within(lasten).getByLabelText('Vast bedrag (€)'), '15')
    await user.click(within(lasten).getByRole('button', { name: 'Vaste post toevoegen' }))
    await user.click(await screen.findByRole('button', { name: 'Boek in' }))
    await screen.findByText('Geboekt ✓')

    // Inboeken maakt een echte transactie; die moet je hier weer los kunnen maken.
    await user.click(screen.getByRole('button', { name: /^Uitboeken/ }))
    expect(await screen.findByRole('button', { name: 'Boek in' })).toBeInTheDocument()
  })

  it('zet een vaste inkomst in de inkomstenkaart, niet bij de lasten', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Budget')
    const inkomsten = kaart('Vaste inkomsten')
    await user.type(within(inkomsten).getByLabelText('Vaste omschrijving'), 'Loon')
    await user.type(within(inkomsten).getByLabelText('Vast bedrag (€)'), '2400')
    await user.click(within(inkomsten).getByRole('button', { name: 'Vaste inkomst toevoegen' }))

    // Ze hoort bij de inkomsten te staan — de keuze uitgave/inkomst zit niet meer
    // onderaan het formulier, maar in de kaart waarin je typt.
    expect(await within(kaart('Vaste inkomsten')).findByText('Loon')).toBeInTheDocument()
    expect(within(kaart('Vaste lasten')).queryByText('Loon')).not.toBeInTheDocument()
  })

  it('voegt een nieuwe categorie toe en maakt ze beschikbaar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Categorieën')
    await user.type(screen.getByLabelText('Categorienaam'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Categorie toevoegen' }))

    // 'Vervoer' verschijnt nu als keuze in het budgetformulier.
    await gaMeer(user, 'Budget')
    expect((await screen.findAllByRole('option', { name: 'Vervoer' })).length).toBeGreaterThan(0)
  })

  it('toont een maandoverzicht met een netto-regel', async () => {
    render(<App />)
    expect(await screen.findByText('Netto')).toBeInTheDocument()
  })

  it('stelt een budget in en toont een voortgangsbalk voor de categorie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Budget')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))

    expect(await screen.findByRole('progressbar', { name: 'Voeding' })).toBeInTheDocument()
  })

  it('maakt een dossier, voegt een gedeelde kost toe en verrekent (50/50, jij betaalt 100 -> partner 50)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await zetAandeel(user, '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))

    // Het dossier wordt automatisch geselecteerd; het kostformulier verschijnt.
    await user.type(await screen.findByLabelText('Kostomschrijving'), 'Schoolreis')
    await user.type(screen.getByLabelText('Kostbedrag (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))

    const regels = await screen.findAllByText(/Partner is jou/)
    expect(regels[0]).toHaveTextContent(/50/)
  })

  it('genereert een afrekening en verrekent de open kosten na overmaken', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await zetAandeel(user, '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))

    await user.type(await screen.findByLabelText('Kostomschrijving'), 'Schoolreis')
    await user.type(screen.getByLabelText('Kostbedrag (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))
    await screen.findAllByText(/Partner is jou/)

    await user.click(screen.getByRole('button', { name: 'Genereer afrekening' }))
    expect(await screen.findByText('Afrekeningen')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Overgemaakt' }))
    await waitFor(() => expect(screen.getAllByText(/Niets te verrekenen/).length).toBeGreaterThan(0))
  })

  it('verwijdert een categorie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Categorieën')
    await user.type(screen.getByLabelText('Categorienaam'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Categorie toevoegen' }))
    // Sinds ronde 27 staat een eigen hoofdcategorie op twee plaatsen: in de lijst
    // én als tak in de boom eronder. We toetsen dus op de verwijderknop.
    expect(await screen.findByRole('button', { name: 'Verwijder categorie Vervoer' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Verwijder categorie Vervoer' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Verwijder categorie Vervoer' })).toBeNull())
  })

  it('hernoemt een bestaande categorie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Categorieën')
    await user.click(screen.getByRole('button', { name: 'Bewerk categorie Voeding' }))
    const naam = screen.getByLabelText('Categorienaam')
    await user.clear(naam)
    await user.type(naam, 'Eten')
    await user.click(screen.getByRole('button', { name: 'Categorie wijzigen' }))

    // Beschikbaar als keuze in het budgetformulier onder de nieuwe naam.
    await gaMeer(user, 'Budget')
    expect((await screen.findAllByRole('option', { name: 'Eten' })).length).toBeGreaterThan(0)
  })

  it('verwijdert een rekening', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Rekeningen')
    await user.type(screen.getByLabelText('Rekeningnaam'), 'Vakantiepot')
    await user.click(screen.getByRole('button', { name: 'Rekening toevoegen' }))
    expect((await screen.findAllByRole('option', { name: /Vakantiepot/ })).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Verwijder rekening Vakantiepot' }))
    await waitFor(() => expect(screen.queryAllByRole('option', { name: /Vakantiepot/ })).toHaveLength(0))
  })

  it('verwijdert een budget', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Budget')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    await screen.findByRole('progressbar', { name: 'Voeding' })

    await user.click(screen.getByRole('button', { name: 'Verwijder budget Voeding' }))
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Voeding' })).toBeNull())
  })

  it('bewerkt een vaste post', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Budget')
    const lasten = kaart('Vaste lasten')
    await user.type(within(lasten).getByLabelText('Vaste omschrijving'), 'Netflix')
    await user.type(within(lasten).getByLabelText('Vast bedrag (€)'), '15')
    await user.click(within(lasten).getByRole('button', { name: 'Vaste post toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Bewerk vaste post Netflix' }))
    const oms = within(kaart('Vaste lasten')).getByLabelText('Vaste omschrijving')
    await user.clear(oms)
    await user.type(oms, 'Disney')
    await user.click(within(kaart('Vaste lasten')).getByRole('button', { name: 'Vaste post wijzigen' }))

    expect(await screen.findByText('Disney')).toBeInTheDocument()
  })

  it('bewerkt een gedeelde kost', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await zetAandeel(user, '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))

    await user.type(await screen.findByLabelText('Kostomschrijving'), 'Schoolreis')
    await user.type(screen.getByLabelText('Kostbedrag (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Bewerk kost Schoolreis' }))
    const oms = screen.getByLabelText('Kostomschrijving')
    await user.clear(oms)
    await user.type(oms, 'Kamp')
    await user.click(screen.getByRole('button', { name: 'Kost wijzigen' }))

    expect(await screen.findByText('Kamp')).toBeInTheDocument()
  })

  it('verwijdert een dossier', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await zetAandeel(user, '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Verwijder dossier Kinderen' }))

    expect(await screen.findByText(/Nog geen dossiers/)).toBeInTheDocument()
  })

  it('wijst een lege app de weg naar de eerste rekening', async () => {
    // Een gloednieuwe app: geen rekening, geen boekingen.
    for (const tabel of db.tables) await tabel.clear()
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('Welkom bij Kompal')).toBeInTheDocument()

    // De knop brengt je meteen naar Rekeningen, waar je er een kan aanmaken.
    await user.click(screen.getByRole('button', { name: 'Maak je eerste rekening aan' }))
    expect(await screen.findByLabelText('Rekeningnaam')).toBeInTheDocument()

    // En de wegwijzer verdwijnt zodra er een rekening is.
    await user.type(screen.getByLabelText('Rekeningnaam'), 'Zichtrekening')
    await user.click(screen.getByRole('button', { name: 'Rekening toevoegen' }))
    await ga(user, 'Overzicht')
    await waitFor(() => expect(screen.queryByText('Welkom bij Kompal')).not.toBeInTheDocument())
  })

  it('zegt in de invoerpopup dat je eerst een rekening nodig hebt', async () => {
    for (const tabel of db.tables) await tabel.clear()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Welkom bij Kompal')

    // Deze uitleg stond op de Transacties-pagina, waar het formulier woonde. Nu
    // het formulier in de popup zit, moet ze mee verhuizen — anders duw je op de
    // ➕ en zie je een uitgeschakelde knop zonder te weten waarom.
    await openBoeking(user, 'Uitgave')
    expect(
      await screen.findByText('Maak eerst een rekening aan — een transactie moet ergens op geboekt worden.'),
    ).toBeInTheDocument()
  })
})

// Het belletje stond tot nu toe ALLEEN in de desktopweergave, met de drempel hard
// op 85% in App.tsx. Op een telefoon kreeg je dus nooit een signaal dat een budget
// bijna op was. Deze tests draaien in de mobiele weergave (de standaard in jsdom)
// en bewijzen dat het signaal daar nu wél staat.
describe('App — meldingen op een smal scherm', () => {
  // Alles op de dag van vandaag boeken, zodat de test niet afhangt van de maand
  // waarin ze gedraaid wordt.
  async function zetBudgetBijnaOp() {
    await bewaarCategorie({ id: 'cat-testpot', naam: 'Testpot' })
    await bewaarBudget({ id: 'bud-test', categorieId: 'cat-testpot', bedrag: 10000 })
    await bewaarTransactie({
      id: 'tx-testpot',
      datum: vandaag(),
      omschrijving: 'Testaankoop',
      bedrag: -9500,
      rekeningId: 'r1',
      categorieId: 'cat-testpot',
    })
  }

  it('heet gewoon "Meldingen" zolang er niets aan de hand is', async () => {
    render(<App />)
    await screen.findByText('Saldo')
    expect(screen.getByRole('button', { name: 'Meldingen' })).toBeInTheDocument()
  })

  it('toont het aantal meldingen in de kop van de mobiele weergave', async () => {
    await zetBudgetBijnaOp()
    render(<App />)
    await screen.findByText('Saldo')

    expect(await screen.findByRole('button', { name: 'Meldingen (1)' })).toBeInTheDocument()
  })

  it('vertelt in het paneel wélk budget bijna op is, en brengt je erheen', async () => {
    await zetBudgetBijnaOp()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(await screen.findByRole('button', { name: 'Meldingen (1)' }))
    await user.click(await screen.findByText('Budget Testpot is 95% verbruikt'))

    // We staan nu op de budgetpagina.
    expect(await screen.findByRole('heading', { level: 1, name: 'Budget' })).toBeInTheDocument()
  })
})

// De maandcijfers stonden er al; wat er ontbrak was de betekenis ervan.
describe('App — balans, overschot of tekort', () => {
  it('benoemt een overschot onder de kengetallen', async () => {
    await bewaarTransactie({ id: 'tx-in', datum: vandaag(), omschrijving: 'Loon', bedrag: 200000, rekeningId: 'r1' })
    await bewaarTransactie({ id: 'tx-uit', datum: vandaag(), omschrijving: 'Winkel', bedrag: -50000, rekeningId: 'r1' })
    render(<App />)
    await screen.findByText('Saldo')

    expect(await screen.findByText('Overschot')).toBeInTheDocument()
  })

  it('benoemt een tekort', async () => {
    for (const tabel of db.tables) await tabel.clear()
    await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })
    await bewaarTransactie({ id: 'tx-in', datum: vandaag(), omschrijving: 'Loon', bedrag: 50000, rekeningId: 'r1' })
    await bewaarTransactie({ id: 'tx-uit', datum: vandaag(), omschrijving: 'Winkel', bedrag: -80000, rekeningId: 'r1' })
    render(<App />)
    await screen.findByText('Saldo')

    expect(await screen.findByText('Tekort')).toBeInTheDocument()
  })

  it('zwijgt over de balans zolang er deze maand niets geboekt is', async () => {
    for (const tabel of db.tables) await tabel.clear()
    await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })
    render(<App />)
    await screen.findByText('Saldo')

    expect(document.querySelector('[data-balans]')).toBeNull()
  })
})

// Ronde 29 — Dossiers is één pagina met drie laden.
//
// Wat hiervoor bestond: 'Dossiers' was de pagina voor gedeelde kosten, en
// 'Leningen' was een tweede hoofdpagina die niets meer was dan twee secties onder
// elkaar (leningen én garanties). Je moest maar weten dat die laatste daar zat.
describe('App — Dossiers met subtabs', () => {
  beforeEach(async () => {
    await Promise.all([db.leningen.clear(), db.aflossingen.clear(), db.garanties.clear()])
  })

  it('heeft geen aparte pagina Leningen meer in de navigatie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(screen.getByRole('button', { name: 'Meer' }))
    expect(screen.queryByRole('button', { name: 'Leningen' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Dossiers' })).toBeInTheDocument()
  })

  it('toont de drie laden en opent standaard de gedeelde kosten', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Dossiers')

    const strook = await screen.findByRole('tablist', { name: 'Soort dossier' })
    expect(within(strook).getAllByRole('tab')).toHaveLength(3)
    expect(screen.getByRole('tab', { name: /Gedeelde kosten/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Dossiernaam')).toBeInTheDocument()
  })

  it('brengt je met één klik bij de leningen en bij de garanties', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Dossiers')

    await user.click(await screen.findByRole('tab', { name: /Leningen/ }))
    expect(await screen.findByText('Leningen & kredieten')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Facturen & garantiebewijzen/ }))
    expect(await screen.findByText('Garanties & facturen')).toBeInTheDocument()
    // De vorige lade is echt weg, niet alleen verborgen: anders scroll je nog
    // steeds langs alles wat je niet zocht.
    expect(screen.queryByText('Leningen & kredieten')).toBeNull()
  })

  it('zet het aantal per lade op de tab', async () => {
    await bewaarLening({ id: 'l1', naam: 'Aan broer', richting: 'uitgeleend', hoofdsom: 50000, startdatum: vandaag() })
    await bewaarGarantie({ id: 'g1', product: 'Koffiezet', aankoopdatum: vandaag(), garantieMaanden: 24 })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Dossiers')

    expect(await screen.findByRole('tab', { name: /Leningen 1/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Facturen & garantiebewijzen 1/ })).toBeInTheDocument()
  })

  it('wijst een lege app de weg, maar houdt daarmee op zodra er iets staat', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Dossiers')
    expect(await screen.findByText('Wat wil je bijhouden?')).toBeInTheDocument()

    // De keuze doet nu ook echt iets: vroeger bleef het scherm onbewogen staan.
    await user.click(screen.getByRole('button', { name: /Aankoop met garantie/ }))
    expect(await screen.findByText('Garanties & facturen')).toBeInTheDocument()

    unmount()
    await bewaarGarantie({ id: 'g1', product: 'Koffiezet', aankoopdatum: vandaag(), garantieMaanden: 24 })
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Dossiers')
    await screen.findByRole('tablist', { name: 'Soort dossier' })
    expect(screen.queryByText('Wat wil je bijhouden?')).toBeNull()
  })

  it('brengt een aflopende garantie meteen naar de juiste lade', async () => {
    // Een garantie die binnen twee weken verloopt: 23 maanden geleden gekocht met
    // 24 maanden garantie.
    const gekocht = new Date()
    gekocht.setMonth(gekocht.getMonth() - 24)
    gekocht.setDate(gekocht.getDate() + 7)
    const iso = `${gekocht.getFullYear()}-${String(gekocht.getMonth() + 1).padStart(2, '0')}-${String(gekocht.getDate()).padStart(2, '0')}`
    await bewaarGarantie({ id: 'g1', product: 'Koffiezet', aankoopdatum: iso, garantieMaanden: 24 })

    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(await screen.findByRole('button', { name: /^Meldingen \(/ }))
    await user.click(await screen.findByText(/Garantie op Koffiezet verloopt/))

    // Niet op de gedeelde kosten, maar meteen bij de garanties.
    expect(await screen.findByRole('tab', { name: /Facturen & garantiebewijzen/ })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Garanties & facturen')).toBeInTheDocument()
  })
})

// Ronde 29 — niet elk dossier gebruikt alle onderdelen.
//
// Let op bij het schrijven van deze tests: een kaarttitel en de chip om die kaart
// aan of uit te zetten dragen dezelfde tekst. Zoek dus altijd op de KOP.
function kaartkop(naam: string): HTMLElement {
  return screen.getByRole('heading', { name: naam })
}
function geenKaartkop(naam: string): boolean {
  return screen.queryByRole('heading', { name: naam }) === null
}

describe('App — onderdelen van een dossier aan- en uitzetten', () => {
  async function maakDossier(user: Gebruiker) {
    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await zetAandeel(user, '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))
    await screen.findByText('Verdeling per categorie')
  }

  it('toont standaard alles', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    // Op de KAARTKOP kijken, niet op de tekst: de chip om een onderdeel aan of uit
    // te zetten draagt exact dezelfde naam, dus getByText zou altijd iets vinden.
    expect(kaartkop('Verdeling per kostensoort')).toBeInTheDocument()
    expect(kaartkop('Kindrekening (gezamenlijke pot)')).toBeInTheDocument()
    expect(kaartkop('Documentkluis')).toBeInTheDocument()
    // Zolang er niets verborgen is, staat er geen aantal bij.
    expect(screen.getByRole('button', { name: 'Onderdelen' })).toBeInTheDocument()
  })

  it('verbergt een onderdeel en onthoudt dat, zonder iets weg te gooien', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    await user.click(screen.getByRole('button', { name: 'Onderdelen' }))
    await user.click(screen.getByRole('button', { name: 'Kindrekening (gezamenlijke pot)' }))

    await waitFor(() => expect(geenKaartkop('Kindrekening (gezamenlijke pot)')).toBe(true))
    expect(await screen.findByRole('button', { name: 'Onderdelen (1 verborgen)' })).toBeInTheDocument()
    // De rest blijft staan: je zet één kaart uit, geen halve pagina.
    expect(kaartkop('Verdeling per categorie')).toBeInTheDocument()

    // Het staat op het DOSSIER, niet in localStorage: zo klopt het ook op je gsm.
    const alle = await db.dossiers.toArray()
    expect(alle[0].verborgenOnderdelen).toEqual(['gezamenlijke-pot'])
  })

  it('zet een verborgen onderdeel weer aan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    await user.click(screen.getByRole('button', { name: 'Onderdelen' }))
    await user.click(screen.getByRole('button', { name: 'Documentkluis' }))
    await waitFor(() => expect(geenKaartkop('Documentkluis')).toBe(true))

    await user.click(screen.getByRole('button', { name: 'Documentkluis' }))
    await waitFor(() => expect(geenKaartkop('Documentkluis')).toBe(false))
    // Niets meer verborgen: het veld verdwijnt weer van het record.
    await waitFor(async () => {
      const alle = await db.dossiers.toArray()
      expect(alle[0].verborgenOnderdelen).toBeUndefined()
    })
  })
})

// Ronde 30 — de volgorde van de hoofdcategorieën.
//
// Uit de feedback van Timothy: een categorie die je net aanmaakte, sprong meteen
// bovenaan. De volgorde ligt nu bij de gebruiker, ze wordt bewaard op dezelfde
// manier als alle andere gegevens (dus ook op je gsm), en ze geldt overal waar de
// hoofdcategorieën verschijnen.
describe('App — volgorde van de hoofdcategorieën', () => {
  beforeEach(async () => {
    await db.ordeningen.clear()
  })

  // Alleen de hoofdcategorieën uit de categorieënboom, niet de rijtitels van
  // andere kaarten op die pagina.
  function hoofdnamen(): string[] {
    const kaart = screen.getByText('Alle categorieën').closest('section.kaart') as HTMLElement
    return [...kaart.querySelectorAll(':scope > ul > li > div > button .rij-titel')].map((el) => el.textContent ?? '')
  }

  it('bewaart een verplaatsing en houdt ze na een herstart', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Categorieën')

    await screen.findByRole('button', { name: 'Zet Drank hoger' })
    expect(hoofdnamen()[1]).toBe('Drank')

    await user.click(screen.getByRole('button', { name: 'Zet Drank hoger' }))
    await waitFor(() => expect(hoofdnamen()[0]).toBe('Drank'))

    // De volledige volgorde wordt weggeschreven, niet alleen wat je aanraakte:
    // zo kan een latere toevoeging de rest niet meer door elkaar schudden.
    const bewaard = await db.ordeningen.get('hoofdcategorieen')
    expect(bewaard?.ids[0]).toBe('ov-drank')
    expect(bewaard?.ids[1]).toBe('ov-voeding')
    expect(bewaard?.ids.length).toBeGreaterThan(2)

    unmount()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Categorieën')
    await screen.findByText('Alle categorieën')
    expect(hoofdnamen()[0]).toBe('Drank')
  })

  it('gebruikt dezelfde volgorde in de invoerpopup', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Categorieën')
    await user.click(await screen.findByRole('button', { name: 'Zet Drank hoger' }))
    await waitFor(() => expect(hoofdnamen()[0]).toBe('Drank'))

    await openBoeking(user, 'Uitgave')
    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie' }))
    const groep = screen.getByRole('group', { name: 'Hoofdcategorieën' })
    const knoppen = [...groep.querySelectorAll('button')]
    expect(knoppen[0].textContent).toContain('Drank')
    expect(knoppen[1].textContent).toContain('Voeding')
  })

  it('zet een nieuwe eigen categorie achteraan, niet vooraan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Categorieën')

    await user.type(screen.getByLabelText('Categorienaam'), 'Mijn hobby')
    await user.click(screen.getByRole('button', { name: 'Categorie toevoegen' }))

    const namen = await waitFor(() => {
      const n = hoofdnamen()
      expect(n).toContain('Mijn hobby')
      return n
    })
    // Er zijn veertien ingebouwde hoofdcategorieën; alles daarna is eigen werk.
    // Vroeger stonden de eigen categorieën vooraan, dus sprong een nieuwe meteen
    // bovenaan de lijst.
    expect(namen[0]).not.toBe('Mijn hobby')
    expect(namen.indexOf('Mijn hobby')).toBeGreaterThanOrEqual(14)
  })
})

// Ronde 31 — het Overzicht opnieuw ingedeeld.
//
// Wat er mis was: drie losse kaarten die alle drie over hetzelfde maandcijfer
// gingen (kengetallen, balans, buffer), een aparte kaart 'Maandoverzicht' op de
// telefoon met dezelfde drie bedragen nóg eens, een waslijst met alle categorieën
// onder elke donut, en je laatste boekingen die op een smal scherm helemaal
// nergens stonden.
describe('App — het Overzicht', () => {
  it('zet de kengetallen, de balans en de buffer in één blok', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    const blok = document.querySelector('[data-maandblok]') as HTMLElement
    expect(blok).not.toBeNull()
    // De vier cijfers staan er nu ook op een smal scherm; de aparte kaart
    // 'Maandoverzicht' met dezelfde drie bedragen is daardoor overbodig.
    const tegels = within(blok.querySelector('[data-kengetallen]') as HTMLElement)
    expect(tegels.getByText('Saldo')).toBeInTheDocument()
    expect(tegels.getByText('Inkomsten')).toBeInTheDocument()
    expect(tegels.getByText('Uitgaven')).toBeInTheDocument()
    expect(tegels.getByText('Netto')).toBeInTheDocument()
    expect(screen.queryByText('Maandoverzicht')).toBeNull()
    // En de balansuitspraak hoort in datzelfde blok, niet in een eigen kaartje.
    expect(blok.querySelector('[data-balans]')).not.toBeNull()
  })

  it('toont je laatste boekingen op een smal scherm', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    // Dit stond alleen in de zijkolom, en die bestaat pas vanaf 1024 px.
    expect(await screen.findByText('Recente transacties')).toBeInTheDocument()
    expect(screen.getByText('Boodschappen')).toBeInTheDocument()
  })

  it('zet onder de donut alleen de top drie, met een knop naar Analyse', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    const kaart = screen.getByText('Uitgaven per categorie').closest('section.kaart') as HTMLElement
    // Twee uitgavencategorieën in de startgegevens, dus geen 'alle {n}'-variant.
    expect(within(kaart).getByRole('button', { name: /Bekijk/ })).toBeInTheDocument()
    expect(kaart.querySelectorAll('.lijst .rij').length).toBeLessThanOrEqual(3)
  })

  it('opent Analyse op de inkomsten wanneer je dat vanuit de inkomstendonut vraagt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    const kaart = screen.getByText('Inkomsten per categorie').closest('section.kaart') as HTMLElement
    await user.click(within(kaart).getByRole('button', { name: /Bekijk/ }))

    // Niet op de uitgaven landen: dat is precies waar je NIET naar vroeg.
    expect(await screen.findByRole('heading', { level: 1, name: 'Analyse' })).toBeInTheDocument()
    expect(await screen.findByText('Verdeling inkomsten')).toBeInTheDocument()
  })

  it('toont de maandgrafiek met beide reeksen', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    expect(screen.getByText('Inkomsten en uitgaven per maand')).toBeInTheDocument()
    expect(screen.getByText('* Deze maand loopt nog, dus die staaf is nog niet volledig.')).toBeInTheDocument()
  })
})
