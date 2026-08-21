import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  bewaarTerugkerendePost,
  bewaarTransactie,
} from './data/repository'
import { huidigeMaand, vandaag } from './utils/datum'
import { vorigeMaand } from './utils/maandafsluiting'
import { DOSSIER_ONDERDELEN } from './utils/dossieronderdelen'

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
    db.waarderingen.clear(),
    db.events.clear(),
    db.meta.clear(),
  ])
  await maakStartgegevens()
})

// De app start sinds ronde 16 volledig leeg — er wordt géén voorbeelddata meer
// aangemaakt. Deze tests gaan wél uit van een rekening met wat boekingen, dus
// zetten ze die hier zelf klaar. Precies dezelfde gegevens als de vroegere seed,
// zodat alle bestaande verwachtingen blijven kloppen.
// De boekingen staan in de HUIDIGE maand, niet op een vaste datum.
//
// Ze stonden hardgecodeerd op juli 2026. Zolang de CI in die maand draaide viel dat
// niet op, maar het Overzicht, de budgetten, de donuts en het belletje gaan allemaal
// over DEZE maand — dus vanaf 1 augustus zou de helft van deze tests rood staan
// zonder dat er iets aan de app veranderd was. Nagerekend met `faketime`: negen
// tests over drie bestanden.
const MAAND = huidigeMaand()
// ... en nooit ná vandaag. Het saldo telt bewust geen boekingen met een datum in
// de toekomst, dus op de 1e of de 3e van een maand vielen de tweede en de derde
// boeking weg en klopte "2400 - 950 - 320 = 1130" niet meer.
const DAG_VANDAAG = Number(vandaag().slice(8, 10))
const dag = (n: number) => String(Math.min(n, DAG_VANDAAG)).padStart(2, '0')

async function maakStartgegevens() {
  await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })
  await bewaarCategorie({ id: 'cat-inkomsten', naam: 'Inkomsten' })
  await bewaarCategorie({ id: 'cat-wonen', naam: 'Huisvesting' })
  await bewaarCategorie({ id: 'cat-voeding', naam: 'Voeding' })
  // Bedragen in centen: €2400,00 / -€950,00 / -€320,00.
  await bewaarTransactie({ id: 't1', datum: `${MAAND}-${dag(1)}`, omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', categorieId: 'cat-inkomsten' })
  await bewaarTransactie({ id: 't2', datum: `${MAAND}-${dag(3)}`, omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', categorieId: 'cat-wonen' })
  await bewaarTransactie({ id: 't3', datum: `${MAAND}-${dag(5)}`, omschrijving: 'Boodschappen', bedrag: -32000, rekeningId: 'r1', categorieId: 'cat-voeding' })
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

// Secundaire pagina's (Rekeningen, Dossiers, Categorieën, Analyse, ...) zitten op
// mobiel achter de 'Meer'-knop: eerst de lade openen, dan de pagina kiezen.
//
// ⚠ Niet gebruiken voor Overzicht, Transacties of Budget: die staan sinds ronde 60
// in de balk zelf. De lade openen en er dan langs klikken werkte toevallig nog wel,
// maar liep niet meer langs de weg die een gebruiker aflegt — en liet de lade
// bovendien openstaan.
// De Budget-pagina heeft sinds ronde 64 drie tabbladen. Deze hulpjes brengen je
// naar het tabblad waar het onderdeel staat waarover de test gaat, langs dezelfde
// weg als een gebruiker: eerst de pagina, dan het tabblad.
async function gaBudget(user: Gebruiker, tab: 'Te verdelen' | 'Vast' | 'Budgetten') {
  await ga(user, 'Budget')
  await user.click(await screen.findByRole('tab', { name: new RegExp(tab) }))
}

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
      datum: `${MAAND}-${dag(5)}`,
    })
    await bewaarDossierDocument({
      id: 'doc-1',
      transactieId: 't3',
      naam: 'Kassaticket',
      soort: 'bon',
      bestand: 'data:application/pdf;base64,AA==',
      toegevoegdOp: `${MAAND}-${dag(5)}`,
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
    // Sinds ronde 45 opent de HELE rij de boeking, met datum en bedrag in het
    // label — er is geen apart potloodknopje meer.
    await user.click(screen.getByRole('button', { name: /^Bewerk Huur/ }))
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

    await gaBudget(user, 'Vast')
    const lasten = kaart('Vaste lasten')
    await user.type(within(lasten).getByLabelText('Vaste omschrijving'), 'Netflix')
    await user.type(within(lasten).getByLabelText('Vast bedrag (€)'), '15')
    await user.click(within(lasten).getByRole('button', { name: 'Vaste post toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Boek in' }))

    expect(await screen.findByText('Geboekt ✓')).toBeInTheDocument()
  })

  it('biedt geen "Boek in" meer aan zodra een vaste last is opgezegd', async () => {
    // Ronde 38. Deze test bewaakt wat de gebruiker ziet: bij een opgezegde post
    // verschijnt "Gestopt" en verdwijnt de knop. De controle in App.boekTerugkerend
    // is daarnaast een vangnet voor het meldingenpaneel; die is via de UI niet te
    // bereiken, want bouwMeldingen filtert gestopte posten al weg.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Vast')
    const lasten = kaart('Vaste lasten')
    await user.type(within(lasten).getByLabelText('Vaste omschrijving'), 'Netflix')
    await user.type(within(lasten).getByLabelText('Vast bedrag (€)'), '15')
    // "Loopt tot en met" de maand vóór deze: de post is dus nu al gestopt.
    //
    // Bewust via `vorigeMaand` en NIET via `new Date().setMonth(m - 1)`. Dat laatste
    // rolt door wanneer de dag van vandaag niet in de vorige maand bestaat: op 31
    // juli wordt "30 juni" stil 1 juli, en dan zette deze test de einddatum op de
    // HUIDIGE maand — de post was dan niet gestopt en de test faalde. Alleen op de
    // 29e, 30e en 31e van een maand na een kortere maand, dus jarenlang groen en
    // dan plots rood in de CI.
    const maandwaarde = vorigeMaand(huidigeMaand())
    fireEvent.change(within(lasten).getByLabelText('Loopt tot en met'), { target: { value: maandwaarde } })
    await user.click(within(lasten).getByRole('button', { name: 'Vaste post toevoegen' }))

    expect(await screen.findByText('Gestopt')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Boek in' })).not.toBeInTheDocument()
  })

  it('boekt een vaste last in en maakt dat weer ongedaan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Vast')
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

    await gaBudget(user, 'Vast')
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
    await gaBudget(user, 'Budgetten')
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

    await gaBudget(user, 'Budgetten')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))

    expect(await screen.findByRole('progressbar', { name: 'Voeding' })).toBeInTheDocument()
  })

  // Ronde 62. December mag duurder zijn zonder dat je in januari je gewone bedrag
  // moet terugzetten — en zonder dat je standaardbudget iets merkt.
  it('zet een budget voor één maand, en laat je standaard staan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Budgetten')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    expect(await screen.findByRole('progressbar', { name: 'Voeding' })).toBeInTheDocument()

    // Eén maand vooruit, en daar een ander bedrag zetten.
    await user.click(screen.getByRole('button', { name: 'Volgende maand' }))
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.click(screen.getByRole('button', { name: /^Alleen / }))
    const veld = screen.getByLabelText('Maandbudget (€)')
    await user.clear(veld)
    await user.type(veld, '600')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))

    // In die maand geldt € 600, en er staat bij dat het een uitzondering is.
    expect(await screen.findByText(/normaal is dit/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Voeding' }).closest('li')).toHaveTextContent(/600/)
    // ⚠ En precies ÉÉN balk: twee records voor dezelfde categorie mogen nooit twee
    // regels opleveren.
    expect(screen.getAllByRole('progressbar', { name: 'Voeding' })).toHaveLength(1)

    // Terug naar de vorige maand: daar staat je gewone budget nog, ongewijzigd.
    await user.click(screen.getByRole('button', { name: 'Vorige maand' }))
    expect((await screen.findByRole('progressbar', { name: 'Voeding' })).closest('li')).toHaveTextContent(/400/)
    expect(screen.queryByText(/normaal is dit/)).toBeNull()
  })

  it('zegt op de budgetpagina dat er voor een andere maand iets klaarstaat', async () => {
    // ⚠ Een budget voor september zie je in augustus nergens — en dat hoort ook zo.
    // Maar dan weet je ook niet meer dát je het gezet hebt.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Budgetten')
    await user.click(screen.getByRole('button', { name: 'Volgende maand' }))
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.click(screen.getByRole('button', { name: /^Alleen / }))
    await user.type(screen.getByLabelText('Maandbudget (€)'), '600')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    await screen.findByRole('progressbar', { name: 'Voeding' })

    await user.click(screen.getByRole('button', { name: 'Vorige maand' }))
    expect(await screen.findByText('Je hebt ook een apart budget voor:')).toBeInTheDocument()
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

  // Ronde 61. De ongedaan-balk was er in de praktijk alleen voor wie een muis heeft:
  // ze verdween na acht seconden, en met een toetsenbord moest je eerst tot voorbij de
  // laatste knop van de pagina tabben om erbij te komen.
  it('draait een verwijdering terug met Ctrl+Z', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Categorieën')
    await user.type(screen.getByLabelText('Categorienaam'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Categorie toevoegen' }))
    await user.click(await screen.findByRole('button', { name: 'Verwijder categorie Vervoer' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Verwijder categorie Vervoer' })).toBeNull())

    await user.keyboard('{Control>}z{/Control}')
    expect(await screen.findByRole('button', { name: 'Verwijder categorie Vervoer' })).toBeInTheDocument()
  })

  it('laat Ctrl+Z met rust terwijl je in een veld typt', async () => {
    // ⚠ Daar betekent Ctrl+Z "maak mijn laatste typwerk ongedaan". Dat is de taak van
    // de browser, en die mogen we niet afpakken — anders krijg je je categorie terug
    // terwijl je dacht een letter te wissen.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Categorieën')
    await user.type(screen.getByLabelText('Categorienaam'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Categorie toevoegen' }))
    await user.click(await screen.findByRole('button', { name: 'Verwijder categorie Vervoer' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Verwijder categorie Vervoer' })).toBeNull())

    const veld = screen.getByLabelText('Categorienaam')
    veld.focus()
    await user.keyboard('{Control>}z{/Control}')
    expect(screen.queryByRole('button', { name: 'Verwijder categorie Vervoer' })).toBeNull()
  })

  it('laat je de ongedaan-balk meteen wegdoen', async () => {
    // Twintig seconden is lang genoeg om er met een toetsenbord bij te raken, maar dan
    // moet je hem ook meteen weg kunnen als je hem niet nodig hebt.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Categorieën')
    await user.type(screen.getByLabelText('Categorienaam'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Categorie toevoegen' }))
    await user.click(await screen.findByRole('button', { name: 'Verwijder categorie Vervoer' }))

    const ongedaan = await screen.findByRole('button', { name: 'Ongedaan maken' })
    const balk = ongedaan.closest('div') as HTMLElement
    await user.click(within(balk).getByRole('button', { name: 'Melding sluiten' }))
    expect(screen.queryByRole('button', { name: 'Ongedaan maken' })).toBeNull()
    // En de categorie blijft verwijderd: wegklikken is niet hetzelfde als herstellen.
    expect(screen.queryByRole('button', { name: 'Verwijder categorie Vervoer' })).toBeNull()
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
    await gaBudget(user, 'Budgetten')
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

    await gaBudget(user, 'Budgetten')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    await screen.findByRole('progressbar', { name: 'Voeding' })

    await user.click(screen.getByRole('button', { name: 'Verwijder budget Voeding' }))
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Voeding' })).toBeNull())
  })

  it('wist bij het kruisje de UITZONDERING en laat je standaard staan', async () => {
    // ⚠ Ronde 62. Het kruisje wist het record dat op de regel staat. Zou het het
    // verkeerde wissen, dan ben je stil je vaste budget kwijt terwijl het scherm er nog
    // een toont — en dat merk je pas de maand erna. De nakijkronde heeft aangetoond dat
    // geen enkele test dit ving.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Budgetten')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    await screen.findByRole('progressbar', { name: 'Voeding' })

    // Voor deze maand een ander bedrag.
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.click(screen.getByRole('button', { name: /^Alleen / }))
    const veld = screen.getByLabelText('Maandbudget (€)')
    await user.clear(veld)
    await user.type(veld, '600')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    expect(await screen.findByText(/normaal is dit/)).toBeInTheDocument()

    // Het kruisje haalt de uitzondering weg…
    await user.click(screen.getByRole('button', { name: /^Verwijder het budget van Voeding voor/ }))
    await waitFor(() => expect(screen.queryByText(/normaal is dit/)).toBeNull())
    // …en je vaste budget van € 400 staat er nog.
    expect((await screen.findByRole('progressbar', { name: 'Voeding' })).closest('li')).toHaveTextContent(/400/)
  })

  it('bewerkt een vaste post', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Vast')
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

    // ⚠ Sinds ronde 59 wist dat kruisje niet meer meteen. Het stond naast een
    // KEUZELIJST — waar je juist heen gaat om van dossier te wisselen — en wiste
    // het hele dossier met alle kosten, verrekeningen én de documentkluis, zonder
    // één vraag. Nu telt de app eerst op wat er weg gaat.
    expect(await screen.findByText('Dit dossier verwijderen?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ja, verwijder' }))

    expect(await screen.findByText(/Nog geen dossiers/)).toBeInTheDocument()
  })

  it('toont in de vraag wát er precies weg gaat', async () => {
    // ⚠ `telVoorVerwijderen` is los getest, maar niets legde vast dat de juiste
    // lijsten er ook echt aan doorgegeven worden. Dat is precies het soort gat
    // waardoor een venster "er staat nog niets in dit dossier" zegt over een dossier
    // vol bewijsmateriaal.
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
    await screen.findByText('Schoolreis')

    await user.click(screen.getByRole('button', { name: 'Verwijder dossier Kinderen' }))
    expect(await screen.findByText('1 gedeelde kost(en)')).toBeInTheDocument()
  })

  it('laat een dossier staan wanneer je de vraag met nee beantwoordt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await zetAandeel(user, '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Verwijder dossier Kinderen' }))
    await user.click(await screen.findByRole('button', { name: 'Nee, behouden' }))

    expect(screen.queryByText(/Nog geen dossiers/)).toBeNull()
    expect(await screen.findByRole('button', { name: 'Verwijder dossier Kinderen' })).toBeInTheDocument()
  })

  it('laat een gloednieuwe app in De Opstelling landen in plaats van op een leeg Overzicht', async () => {
    // Ronde 39. Vroeger kwam je op een Overzicht met vier keer € 0,00 en één
    // wegwijzer; nu begin je met het scherm dat je situatie opneemt.
    for (const tabel of db.tables) await tabel.clear()
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('Je situatie')).toBeInTheDocument()
    expect(screen.getByText('Dit is je situatie')).toBeInTheDocument()

    // Het rekeningformulier staat er meteen in — geen extra tik nodig.
    await user.type(await screen.findByLabelText('Rekeningnaam'), 'Zichtrekening')
    await user.click(screen.getByRole('button', { name: 'Rekening toevoegen' }))

    // En dan verschijnt de knop naar het overzicht.
    expect(await screen.findByRole('button', { name: 'Naar je overzicht' })).toBeInTheDocument()
  })

  it('landt op het Overzicht zodra er al een rekening bestaat', async () => {
    // De keuze mag alleen bij het OPSTARTEN gemaakt worden. Stond ze in herlaad(),
    // dan sprong je bij elke bewaaractie terug naar De Opstelling.
    render(<App />)
    expect(await screen.findByText('Saldo')).toBeInTheDocument()
    expect(screen.queryByText('Dit is je situatie')).not.toBeInTheDocument()
  })

  it('zegt in de invoerpopup dat je eerst een rekening nodig hebt', async () => {
    for (const tabel of db.tables) await tabel.clear()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Dit is je situatie')

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
    // Sinds ronde 59 komt de app terug waar ze stond, dus zou ze hier meteen op
    // Dossiers openen. Deze test wil het gewone startgedrag zien: adres leeg.
    window.history.replaceState(null, '', '#')
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
// Ronde 36 — de knop "Onderdelen" is weg: de vakjes staan meteen open, en
// "Verrekeningen" kwam erbij.
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
    await screen.findByRole('heading', { name: 'Nieuwe afrekening' })
  }

  it('begint een nieuw dossier met de kern, niet met acht kaarten tegelijk', async () => {
    // ⚠ Ronde 60. Vóór die ronde opende een vers dossier met acht lege kaarten onder
    // elkaar — verdelingen, een kindrekening, een documentkluis, een uitwisseling —
    // terwijl je net kwam om kosten bij te houden.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    // Op de KAARTKOP kijken, niet op de tekst: de chip om een onderdeel aan of uit
    // te zetten draagt exact dezelfde naam, dus getByText zou altijd iets vinden.
    expect(kaartkop('Nieuwe afrekening')).toBeInTheDocument()
    expect(geenKaartkop('Kindrekening (gezamenlijke pot)')).toBe(true)
    expect(geenKaartkop('Documentkluis')).toBe(true)
    expect(geenKaartkop('Verdeling per kostensoort')).toBe(true)

    // En je zet ze er met één tik bij: de chips staan meteen open, er is geen knop
    // "Onderdelen" meer om eerst te vinden.
    expect(screen.queryByRole('button', { name: /^Onderdelen/ })).toBeNull()
    expect(screen.getByRole('group', { name: 'Wat toon je in dit dossier?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verrekeningen' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Documentkluis' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('zet een onderdeel erbij en onthoudt dat, zonder iets weg te gooien', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    await user.click(screen.getByRole('button', { name: 'Kindrekening (gezamenlijke pot)' }))
    await waitFor(() => expect(kaartkop('Kindrekening (gezamenlijke pot)')).toBeInTheDocument())

    // Het staat op het DOSSIER, niet in localStorage: zo klopt het ook op je gsm.
    const alle = await db.dossiers.toArray()
    expect(alle[0].verborgenOnderdelen).not.toContain('gezamenlijke-pot')
    // En de rest blijft staan zoals ze stond: je zet één kaart aan, geen halve pagina.
    expect(alle[0].verborgenOnderdelen).toContain('documentkluis')
  })

  it('zet het verrekenen uit, inclusief de kaart om er een te maken', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    await user.click(screen.getByRole('button', { name: 'Verrekeningen' }))

    await waitFor(() => expect(geenKaartkop('Nieuwe afrekening')).toBe(true))
    const alle = await db.dossiers.toArray()
    expect(alle[0].verborgenOnderdelen).toContain('verrekeningen')
  })

  it('zet een onderdeel weer uit nadat je het aanzette', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    await user.click(screen.getByRole('button', { name: 'Documentkluis' }))
    await waitFor(() => expect(geenKaartkop('Documentkluis')).toBe(false))

    await user.click(screen.getByRole('button', { name: 'Documentkluis' }))
    await waitFor(() => expect(geenKaartkop('Documentkluis')).toBe(true))
  })

  it('haalt het veld van het record zodra je álles aanzet', async () => {
    // Een lege lijst bewaren zou betekenen dat elk dossier voor altijd een veld
    // meedraagt dat niets zegt.
    //
    // ⚠ Deze test klikt zes chips vlak na elkaar aan, en dát legde een echte fout
    // bloot: elke klik rekende vanaf de OPGESLAGEN lijst, en die loopt achter tot de
    // app opnieuw geladen heeft. Twee snelle klikken overschreven elkaar dus, en één
    // van je keuzes verdween spoorloos. Zie `verborgenRef` in DossierSectie.tsx.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakDossier(user)

    const uit = await db.dossiers.toArray().then((d) => d[0].verborgenOnderdelen ?? [])
    for (const id of uit) {
      const label = DOSSIER_ONDERDELEN.find((o) => o.id === id)?.label
      if (label) await user.click(screen.getByRole('button', { name: label }))
    }
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
    window.history.replaceState(null, '', '#')
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
    await user.click(screen.getByRole('button', { name: 'Selecteer hoofdcategorie (optioneel)' }))
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
    // Bewust op 'in Analyse': sinds ronde 40 draagt elke top-drie-regel óók een
    // knop die met "Bekijk de boekingen van …" begint.
    expect(within(kaart).getByRole('button', { name: /in Analyse/ })).toBeInTheDocument()
    expect(kaart.querySelectorAll('.lijst .rij').length).toBeLessThanOrEqual(3)
  })

  it('opent Analyse op de inkomsten wanneer je dat vanuit de inkomstendonut vraagt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    const kaart = screen.getByText('Inkomsten per categorie').closest('section.kaart') as HTMLElement
    await user.click(within(kaart).getByRole('button', { name: /in Analyse/ }))

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

  // Ronde 32
  it('brengt je met het merkteken bovenaan terug naar Overzicht', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(screen.getByRole('button', { name: 'Meer' }))
    await user.click(screen.getByRole('button', { name: 'Instellingen' }))
    await screen.findByText('Taal')

    await user.click(screen.getByRole('button', { name: 'Naar Overzicht' }))
    expect(await screen.findByText('Saldo')).toBeInTheDocument()
  })
})

// --- Ronde 40: van een cijfer naar de boekingen eronder ------------------------
//
// Vóór deze ronde eindigde bijna elk cijfer blind: je zag € 320 bij Voeding staan
// en de enige weg naar de bijhorende boekingen was zelf naar Transacties gaan en
// daar hetzelfde filter met de hand opnieuw instellen.

describe('App — doorklikken van een cijfer naar zijn boekingen', () => {
  it('brengt je van een budgetregel naar precies die boekingen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Budgetten')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    await screen.findByRole('progressbar', { name: 'Voeding' })

    await user.click(screen.getByRole('button', { name: /^Bekijk de boekingen van Voeding —/ }))

    // We staan op de Transacties-pagina, gefilterd op Voeding: 'Boodschappen'
    // hoort erbij, 'Huur' niet.
    expect(await screen.findByText('Boodschappen')).toBeInTheDocument()
    expect(screen.queryByText('Huur')).toBeNull()
    expect(screen.getByRole('button', { name: 'Wis filter Voeding' })).toBeInTheDocument()
  })

  // Ronde 48
  it('brengt je van het kengetal Uitgaven naar de uitgaven van die maand', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(screen.getByRole('button', { name: /^Uitgaven / }))

    // De lijst staat op uitgaven van deze maand: 'Boodschappen' hoort erbij, en het
    // filter is zichtbaar zodat je het weer kan wegklikken.
    expect(await screen.findByText('Boodschappen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wis filter Uitgaven' })).toBeInTheDocument()
  })

  it('maakt van het totale saldo GEEN knop', async () => {
    // Bewust: dat is de som over álle rekeningen, en die som staat nergens op de
    // Rekeningen-pagina. Dan klik je op een cijfer en kom je op een scherm waar het
    // niet voorkomt.
    render(<App />)
    await screen.findByText('Saldo')
    expect(screen.queryByRole('button', { name: /^Saldo/ })).toBeNull()
  })

  it('wist het doorklik-filter zodra je gewoon naar Transacties navigeert', async () => {
    // Anders opent Transacties de volgende keer opnieuw met een filter van een klik
    // die je een half uur geleden deed, zonder dat je weet waar het vandaan komt.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaBudget(user, 'Budgetten')
    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))
    await screen.findByRole('progressbar', { name: 'Voeding' })
    await user.click(screen.getByRole('button', { name: /^Bekijk de boekingen van Voeding —/ }))
    await screen.findByText('Boodschappen')

    // Weg en terug via de gewone navigatie.
    await user.click(screen.getByRole('button', { name: 'Overzicht' }))
    await user.click(screen.getByRole('button', { name: 'Transacties' }))
    expect(await screen.findByText('Huur')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Wis filter Voeding' })).toBeNull()
  })

  it('opent een boeking rechtstreeks vanaf de recente transacties op Overzicht', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(await screen.findByRole('button', { name: /^Bewerk Boodschappen —/ }))
    expect(await screen.findByRole('heading', { name: 'Transactie bewerken' })).toBeInTheDocument()
  })
})

// --- Ronde 40: de opbouw van een afrekening op het scherm ---------------------

describe('App — de opbouw van een afrekening', () => {
  async function maakAfrekening(user: Gebruiker) {
    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await zetAandeel(user, '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))
    await user.type(await screen.findByLabelText('Kostomschrijving'), 'Schoolreis')
    await user.type(screen.getByLabelText('Kostbedrag (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))
    await screen.findAllByText(/Partner is jou/)
    await user.click(screen.getByRole('button', { name: 'Genereer afrekening' }))
    await screen.findByText('Afrekeningen')
  }

  it('legt op het scherm uit waar het bedrag vandaan komt', async () => {
    // De rekenkern hiervoor bestond al, maar werd alleen door de PDF-export en de
    // tekstkopie gebruikt: op het scherm zag je enkel het bedrag.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakAfrekening(user)

    await user.click(screen.getByRole('button', { name: 'Toon opbouw' }))
    expect(await screen.findByText('Verdeelsleutel')).toBeInTheDocument()
    expect(screen.getByText('Totalen')).toBeInTheDocument()
    expect(screen.getByText('Detail')).toBeInTheDocument()
    // De kost staat óók nog in de lijst met open kosten, dus bewust binnen de
    // opbouw zoeken in plaats van op het hele scherm.
    const opbouw = screen.getByText('Detail').closest('.kaart') as HTMLElement
    expect(within(opbouw).getByText('Schoolreis')).toBeInTheDocument()
    // Het aandeel van elk: € 100 gedeeld 50/50.
    expect(screen.getByText('Jouw aandeel')).toBeInTheDocument()
  })

  it('klapt de opbouw weer dicht', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakAfrekening(user)

    await user.click(screen.getByRole('button', { name: 'Toon opbouw' }))
    await screen.findByText('Verdeelsleutel')
    await user.click(screen.getByRole('button', { name: 'Verberg opbouw' }))
    expect(screen.queryByText('Verdeelsleutel')).toBeNull()
  })

  it('is een eigen onderdeel dat je kan uitzetten zonder het afrekenen te verliezen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await maakAfrekening(user)

    // De chip staat in de rij "Wat toon je in dit dossier?".
    await user.click(screen.getByRole('button', { name: 'Opbouw van een afrekening' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Toon opbouw' })).toBeNull())
    // De kaart om een afrekening te maken blijft wél staan: de sleutel hangt niet
    // aan de vlag 'verrekeningen'.
    expect(screen.getByRole('heading', { name: 'Nieuwe afrekening' })).toBeInTheDocument()
    expect(await db.dossiers.toArray().then((d) => d[0].verborgenOnderdelen)).toContain('afrekening-detail')
  })
})

// ---------------------------------------------------------------------------
// DE APP GEDRAAGT ZICH ALS EEN APP (ronde 59)
//
// Vóór deze ronde zat de pagina alleen in het geheugen van het scherm. Gevolg op
// een telefoon: de terugknop van Android SLOOT DE APP in plaats van een scherm
// terug te gaan, en herladen bracht je altijd op het begin — ook na een publicatie,
// precies wanneer je net ergens mee bezig was.
// ---------------------------------------------------------------------------
describe('App — de terugknop en het adres', () => {
  beforeEach(async () => {
    for (const tabel of db.tables) await tabel.clear()
    await bewaarRekening({ id: 'r1', naam: 'Zicht', beginsaldo: 100000 })
  })

  it('zet de pagina in het adres zodra je navigeert', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    expect(window.location.hash).toBe('#/overzicht')

    await gaMeer(user, 'Spaardoelen')
    await waitFor(() => expect(window.location.hash).toBe('#/spaardoelen'))
  })

  it('brengt de terugknop je naar de vorige pagina in plaats van de app te sluiten', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Spaardoelen')
    await waitFor(() => expect(window.location.hash).toBe('#/spaardoelen'))

    window.history.back()

    await waitFor(() => expect(window.location.hash).toBe('#/overzicht'))
    expect(await screen.findByText('Saldo')).toBeInTheDocument()
  })

  it('opent na een herlaadbeurt de pagina waar je stond', async () => {
    // Dit is het geval dat het vaakst pijn deed: na een publicatie of een hapering
    // herlaad je, en dan sta je weer helemaal vooraan.
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Spaardoelen')
    await waitFor(() => expect(window.location.hash).toBe('#/spaardoelen'))

    unmount()
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Spaardoelen' })).toBeInTheDocument()
  })

  it('opent de juiste lade van de dossierpagina uit het adres', async () => {
    window.history.replaceState(null, '', '#/dossiers/garantie')
    render(<App />)
    expect(await screen.findByRole('tab', { name: /Facturen & garantiebewijzen/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('opent de boekingspopup vanaf de snelkoppeling op het beginscherm', async () => {
    // Dit is wat `shortcuts` in het manifest aanroept: één tik op het beginscherm
    // van je telefoon en je staat meteen in het invoerformulier.
    window.history.replaceState(null, '', '#/transacties/nieuw')
    render(<App />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('laat na een gesloten popup hoogstens ÉÉN stap liggen, en hergebruikt die', async () => {
    // ⚠ Eerlijk over wat deze ronde NIET oplost. Een popup zet een stap in de
    // geschiedenis zodat de terugknop iets heeft om op te landen — anders verlaat de
    // browser de app met je halve boeking erin (gemeten in een echte browser; jsdom
    // liet dat niet zien). Sluit je de popup met het kruisje, dan blijft die stap
    // liggen: één druk op terug doet dan niets zichtbaars.
    //
    // Wat wél gegarandeerd is, en wat deze test bewaakt: er ligt er hooguit ÉÉN. De
    // volgende popup hergebruikt hem, en de eerste echte navigatie ook.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'Nieuwe transactie' }))
      await screen.findByRole('dialog')
      await user.click(screen.getByRole('button', { name: 'Sluiten' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    }

    // Drie keer openen en sluiten, en dan navigeren: de navigatie gebruikt de
    // liggende stap, dus je staat na één druk op terug gewoon weer op Overzicht.
    await gaMeer(user, 'Spaardoelen')
    await waitFor(() => expect(window.location.hash).toBe('#/spaardoelen'))
    window.history.back()
    await waitFor(() => expect(window.location.hash).toBe('#/overzicht'))
  })


  it('houdt het doorklik-filter vast wanneer je een popup opent en weer sluit', async () => {
    // ⚠ De zwaarste vondst van de nakijkronde. De luisteraar op de terugknop wiste
    // het filter bij élke routewissel — en een popup die sluit ziet er voor die
    // luisteraar uit als een routewissel. Je filterde op een categorie, opende een
    // boeking, sloot ze, en stond weer naar álle boekingen te kijken zonder dat er
    // iets gezegd werd.
    await bewaarTransactie({
      id: 'tx-voeding',
      datum: vandaag(),
      omschrijving: 'Bakker',
      bedrag: -1500,
      rekeningId: 'r1',
      categorieId: 'ov-voeding',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await ga(user, 'Transacties')
    await user.click(await screen.findByRole('button', { name: 'Nieuwe transactie' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sluiten' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // De pagina is niet verschoven en de lijst is niet opnieuw opgebouwd.
    expect(window.location.hash).toBe('#/transacties')
    expect(await screen.findByText('Bakker')).toBeInTheDocument()
  })

  it('valt terug op het gewone startgedrag bij een adres dat niet bestaat', async () => {
    window.history.replaceState(null, '', '#/bestaatniet')
    render(<App />)
    expect(await screen.findByText('Saldo')).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/overzicht'))
  })

  it('laat de terugknop een popup sluiten in plaats van de pagina eronder te verwisselen', async () => {
    // ⚠ Zonder deze regel zou terug de PAGINA ACHTER de popup verwisselen terwijl
    // de popup gewoon open blijft staan — je kijkt dan naar een boekingsformulier
    // met een andere pagina eronder.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await user.click(screen.getByRole('button', { name: 'Nieuwe transactie' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    window.history.back()

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // En de pagina eronder is niet verschoven.
    expect(window.location.hash).toBe('#/overzicht')
    expect(screen.getByText('Saldo')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// DE NAVIGATIE SCHAALT MEE (ronde 60)
//
// Uit de evaluatie van augustus 2026: twaalf van de vijftien pagina's zaten achter
// één ⋯, en de Analyse-pagina zette negen kaarten onder elkaar. Deze tests bewaken
// het gedrag, niet de opmaak.
// ---------------------------------------------------------------------------
describe('App — de navigatie na ronde 60', () => {
  beforeEach(async () => {
    for (const tabel of db.tables) await tabel.clear()
    await bewaarRekening({ id: 'r1', naam: 'Zicht', beginsaldo: 100000 })
  })

  it('brengt je met één tik naar Budget, zonder de lade te openen', async () => {
    // Budget is de reden dat iemand een budget-app installeert; het zat op de vierde
    // regel van een lade met twaalf pagina's.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(screen.getByRole('button', { name: 'Budget' }))
    expect(await screen.findByRole('heading', { name: 'Budget' })).toBeInTheDocument()
    // Sinds ronde 64 draagt het adres ook het tabblad, net als bij Analyse: zo open
    // je na een herlaadbeurt weer waar je stond.
    await waitFor(() => expect(window.location.hash).toBe('#/budget/plan'))
  })

  it('splitst de Analyse-pagina in drie vragen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Analyse')

    const strook = await screen.findByRole('tablist', { name: 'Onderdeel van de analyse' })
    expect(within(strook).getByRole('tab', { name: /Verdeling/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(strook).getByRole('tab', { name: /Wat verandert/ })).toBeInTheDocument()
    expect(within(strook).getByRole('tab', { name: /Vooruit/ })).toBeInTheDocument()
  })

  it('zet het gekozen onderdeel van de analyse in het adres', async () => {
    // Zodat een herlaadbeurt je op hetzelfde tabblad terugzet — dezelfde afspraak als
    // bij de lade van de Dossiers-pagina.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Analyse')

    await user.click(await screen.findByRole('tab', { name: /Vooruit/ }))
    await waitFor(() => expect(window.location.hash).toBe('#/analyse/vooruit'))
  })

  it('opent de analyse op het onderdeel uit het adres', async () => {
    window.history.replaceState(null, '', '#/analyse/verandering')
    render(<App />)
    const strook = await screen.findByRole('tablist', { name: 'Onderdeel van de analyse' })
    expect(within(strook).getByRole('tab', { name: /Wat verandert/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('houdt het gekozen onderdeel vast wanneer het adres onzin wordt', async () => {
    // ⚠ Een zelf ingetikt of oud adres zet de app het adres recht. Vergat ze daarbij
    // het tabblad, dan bleef het scherm op "Vooruit" staan terwijl het adres alleen
    // nog `#/analyse` zei — en landde je na een herlaadbeurt op "Verdeling", zonder
    // te begrijpen waarom (nakijkronde ronde 60).
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaMeer(user, 'Analyse')
    await user.click(await screen.findByRole('tab', { name: /Vooruit/ }))
    await waitFor(() => expect(window.location.hash).toBe('#/analyse/vooruit'))

    window.location.hash = '#/bestaatnietmeer'
    await waitFor(() => expect(window.location.hash).toBe('#/analyse/vooruit'))
  })
})

// Ronde 63: het belletje herinnert je eraan dat je gegevens alleen hier staan.
describe('de back-upherinnering', () => {
  // Het vertrekpunt zetten we zelf in de meta-tabel; de app schrijft het alleen de
  // allereerste keer, dus daarna blijft dít staan. Zo hoeft er geen klok stilgezet
  // te worden — neptijd en de nep-IndexedDB gaan niet samen (ronde 61).
  async function begonOp(dagISO: string) {
    await db.meta.put({ sleutel: 'eersteGebruikOp', waarde: dagISO })
  }

  function langGeleden(dagen: number): string {
    const d = new Date(`${vandaag()}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - dagen)
    return d.toISOString().slice(0, 10)
  }

  it('zwijgt zolang je pas begonnen bent', async () => {
    await begonOp(langGeleden(29))
    render(<App />)
    await screen.findByText('Saldo')
    expect(screen.getByRole('button', { name: 'Meldingen' })).toBeInTheDocument()
  })

  it('meldt het na dertig dagen zonder vangnet, en brengt je naar Instellingen', async () => {
    await begonOp(langGeleden(31))
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(await screen.findByRole('button', { name: 'Meldingen (1)' }))
    await user.click(
      await screen.findByText('Je maakte nog nooit een back-up. Je gegevens staan alleen in deze browser.'),
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Instellingen' })).toBeInTheDocument()
  })

  // ⚠ Een geslaagde synchronisatie telt als vangnet: dan staan je gegevens al
  // ergens anders en is een tweede vraag om een bestand alleen maar ruis.
  it('zwijgt wanneer er onlangs met Drive gesynchroniseerd is', async () => {
    await begonOp(langGeleden(400))
    await db.meta.put({ sleutel: 'laatsteSyncOp', waarde: langGeleden(2) })
    render(<App />)
    await screen.findByText('Saldo')
    expect(screen.getByRole('button', { name: 'Meldingen' })).toBeInTheDocument()
  })

  // ⚠ Zonder deze regel begint een NIEUWE gebruiker nooit te tellen en komt de
  // herinnering er nooit. Het lezen was gedekt, het schrijven niet.
  it('zet bij het opstarten een vertrekpunt wanneer er nog geen is', async () => {
    await db.meta.delete('eersteGebruikOp')
    render(<App />)
    await screen.findByText('Saldo')
    await waitFor(async () => {
      expect((await db.meta.get('eersteGebruikOp'))?.waarde).toBe(vandaag())
    })
  })

  it('onthoudt de dag zodra je een back-up downloadt', async () => {
    // jsdom kent `createObjectURL` niet; zonder deze vervanger valt de download om
    // en test dit geval alleen de foutafhandeling.
    const echteMaak = URL.createObjectURL
    const echteVrij = URL.revokeObjectURL
    URL.createObjectURL = (() => 'blob:test') as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = (() => {}) as unknown as typeof URL.revokeObjectURL
    try {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await user.click(screen.getByRole('button', { name: 'Meer' }))
    await user.click(await screen.findByRole('button', { name: /Instellingen/ }))
    await user.click(await screen.findByRole('button', { name: 'Exporteer back-up' }))

    await waitFor(async () => {
      expect((await db.meta.get('laatsteBackupOp'))?.waarde).toBe(vandaag())
    })
    // En je ziet het meteen terug in de kaart.
    expect(await screen.findByText(/Laatste back-up op dit toestel:/)).toBeInTheDocument()
    } finally {
      URL.createObjectURL = echteMaak
      URL.revokeObjectURL = echteVrij
    }
  })

  // ⚠ Zonder deze test kon punt 1 van de ronde stil ongedaan gemaakt worden: de
  // app deed dan weer de goede vraag en gooide het antwoord weg.
  it('toont wat de browser met je gegevens mag doen', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: () => Promise.resolve(false), persist: () => Promise.resolve(false) },
      configurable: true,
    })
    try {
      const user = userEvent.setup()
      render(<App />)
      await screen.findByText('Saldo')
      await user.click(screen.getByRole('button', { name: 'Meer' }))
      await user.click(await screen.findByRole('button', { name: /Instellingen/ }))
      expect(
        await screen.findByText(/Je browser mag deze gegevens wissen wanneer je toestel plaats nodig heeft/),
      ).toBeInTheDocument()
    } finally {
      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'storage')
    }
  })

  // ⚠ Een mislukte back-up moet als ALARM voorgelezen worden, niet als een gewone
  // statusregel — anders denkt wie de app laat voorlezen dat het gelukt is. jsdom
  // kent `URL.createObjectURL` niet, dus de download mislukt hier vanzelf.
  it('meldt een mislukte back-up als alarm', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await user.click(screen.getByRole('button', { name: 'Meer' }))
    await user.click(await screen.findByRole('button', { name: /Instellingen/ }))
    await user.click(await screen.findByRole('button', { name: 'Exporteer back-up' }))

    const alarm = await screen.findByRole('alert')
    expect(alarm).toHaveTextContent('De back-up kon niet gedownload worden. Probeer het opnieuw.')
    // En de dag wordt dan NIET genoteerd.
    expect(await db.meta.get('laatsteBackupOp')).toBeUndefined()
  })

  // ⚠ Na "Begin opnieuw" is de meta-tabel leeg. Wordt het vertrekpunt dan niet
  // meteen opnieuw gezet, dan begint de app pas bij de volgende herstart te tellen
  // en komt de herinnering dertig dagen te laat.
  it('begint na "Begin opnieuw" meteen opnieuw te tellen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await user.click(screen.getByRole('button', { name: 'Meer' }))
    await user.click(await screen.findByRole('button', { name: /Instellingen/ }))
    await user.click(await screen.findByRole('button', { name: 'Begin opnieuw…' }))
    await user.type(await screen.findByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    await waitFor(async () => {
      expect((await db.meta.get('eersteGebruikOp'))?.waarde).toBe(vandaag())
    })
  })

  // ⚠ Een dossiergebruiker heeft geen enkele boeking en toch alles te verliezen:
  // de foto's van zijn kastickets staan alleen in deze browser.
  it('waarschuwt ook wie de app alleen voor een dossier gebruikt', async () => {
    await db.transacties.clear()
    await db.rekeningen.clear()
    await bewaarDossier({ id: 'd1', naam: 'Co-ouderschap', aandeelJij: 50 })
    await begonOp(langGeleden(45))
    render(<App />)
    await screen.findByRole('button', { name: 'Meldingen (1)' })
  })
})

// Ronde 64 — de Budget-pagina legt zichzelf uit, en het afpunten van een vaste
// last is een vraag geworden in plaats van een stille (verkeerde) beslissing.
describe('de Budget-pagina na ronde 64', () => {
  it('splitst de pagina in drie vragen, met het tabblad in het adres', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await ga(user, 'Budget')
    expect(await screen.findByRole('tab', { name: /Te verdelen/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Vast/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Budgetten/ })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Budgetten/ }))
    await waitFor(() => expect(window.location.hash).toBe('#/budget/budgetten'))
    // En het formulier staat op hetzelfde tabblad als de lijst waar het bij hoort —
    // niet vijf blokken lager, zoals vóór deze ronde.
    expect(screen.getByLabelText('Budgetcategorie')).toBeInTheDocument()
  })

  // ⚠ De teller op "Budgetten" volgt de maandschakelaar; deze hoort dat ook te doen,
  // anders staan er twee tellingen naast elkaar met twee verschillende regels.
  it('telt opgezegde vaste lasten niet mee op de tab', async () => {
    await bewaarTerugkerendePost({
      id: 'p-actief',
      omschrijving: 'Netflix',
      bedrag: -1500,
      rekeningId: 'r1',
      dag: 3,
    })
    await bewaarTerugkerendePost({
      id: 'p-gestopt',
      omschrijving: 'Oude sportclub',
      bedrag: -3000,
      rekeningId: 'r1',
      dag: 3,
      eindMaand: vorigeMaand(MAAND),
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await ga(user, 'Budget')

    const tab = await screen.findByRole('tab', { name: /Vast/ })
    expect(tab).toHaveTextContent('1')
    expect(tab).not.toHaveTextContent('2')
  })

  it('legt op elk tabblad uit hoe het werkt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await ga(user, 'Budget')
    expect(await screen.findByText('Wat blijft er over? — zo werkt dit')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Vast/ }))
    expect(await screen.findByText('Wat ligt vast? — zo werkt dit')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Budgetten/ }))
    expect(await screen.findByText('Wat wil je beperken? — zo werkt dit')).toBeInTheDocument()
  })

  // ⚠ Dít is het geval uit de feedback van Timothy: vaste last Water € 30, en jij
  // tikt € 32 in. Vóór deze ronde gebeurde er niets — en maakte "Boek in" er
  // daarna een tweede boeking van € 30 bij, zodat je maand € 62 op Water telde
  // terwijl er € 32 van je rekening ging.
  async function waterMetAfwijkendeBoeking() {
    await bewaarTerugkerendePost({
      id: 'p-water',
      omschrijving: 'Water',
      bedrag: -3000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-wonen',
    })
    await bewaarTransactie({
      id: 't-water',
      datum: `${MAAND}-${dag(6)}`,
      omschrijving: 'De Watergroep',
      bedrag: -3200,
      rekeningId: 'r1',
      categorieId: 'cat-wonen',
    })
  }

  it('vraagt bij "Boek in" of de bestaande boeking je vaste last is, en punt hem af bij ja', async () => {
    await waterMetAfwijkendeBoeking()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaBudget(user, 'Vast')

    await user.click(await screen.findByRole('button', { name: 'Boek in' }))

    // De app maakt niets bij, maar legt de twee naast elkaar.
    const vraag = await screen.findByRole('dialog')
    expect(within(vraag).getByText(/Er staat deze maand al een boeking van/)).toBeInTheDocument()
    await user.click(within(vraag).getByRole('button', { name: 'Ja, dit is die betaling' }))

    // De vaste last staat nu afgepunt, en er is GEEN tweede boeking bijgekomen.
    expect(await screen.findByText('Geboekt ✓')).toBeInTheDocument()
    expect(await db.transacties.count()).toBe(4)
    expect((await db.transacties.get('t-water'))?.vasteLastId).toBe('p-water')
  })

  it('boekt alsnog in wanneer je zegt dat het een aparte uitgave is', async () => {
    await waterMetAfwijkendeBoeking()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaBudget(user, 'Vast')

    await user.click(await screen.findByRole('button', { name: 'Boek in' }))
    const vraag = await screen.findByRole('dialog')
    await user.click(within(vraag).getByRole('button', { name: /^Nee, boek/ }))

    // Nu is er wél een boeking bijgemaakt — want dat is wat je vroeg.
    await waitFor(async () => expect(await db.transacties.count()).toBe(5))
    expect((await db.transacties.get('t-water'))?.vasteLastId).toBeUndefined()
  })

  // De andere richting: je tikt de betaling zélf in en de app vraagt achteraf of
  // ze bij een openstaande vaste last hoort. Zonder deze vraag bleef de vaste last
  // eeuwig "nog te boeken" — het gedrag waar Timothy over viel.
  it('vraagt na een boeking of ze bij een openstaande vaste last hoort', async () => {
    await bewaarTerugkerendePost({
      id: 'p-boodschappen',
      omschrijving: 'Voedselpakket',
      bedrag: -30000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-voeding',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    // 't3' staat op € 320 in dezelfde categorie: dat is binnen de marge van € 300.
    await ga(user, 'Transacties')
    await screen.findByText('Boodschappen')
    await user.click(screen.getByRole('button', { name: /^Bewerk Boodschappen/ }))
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    expect(await screen.findByText(/lijkt op je vaste last Voedselpakket/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ja, dit is die betaling' }))

    await waitFor(async () => expect((await db.transacties.get('t3'))?.vasteLastId).toBe('p-boodschappen'))
    // En er is niets bijgemaakt.
    expect(await db.transacties.count()).toBe(3)
  })

  it('laat de boeking met rust wanneer je zegt dat het een aparte uitgave is', async () => {
    await bewaarTerugkerendePost({
      id: 'p-boodschappen',
      omschrijving: 'Voedselpakket',
      bedrag: -30000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-voeding',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await ga(user, 'Transacties')
    await screen.findByText('Boodschappen')
    await user.click(screen.getByRole('button', { name: /^Bewerk Boodschappen/ }))
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await user.click(await screen.findByRole('button', { name: 'Nee, aparte uitgave' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await db.transacties.get('t3'))?.vasteLastId).toBeUndefined()
    expect(await db.transacties.count()).toBe(3)
  })

  // ⚠ De knop in "Je situatie" wees naar een PAGINA en niet naar een plek: je
  // landde bovenaan Budget terwijl het formulier dat de zin belooft het vijfde blok
  // naar beneden stond. Timothy: "ik zie niet waar ik dan iets moet invullen."
  it('brengt je vanuit Je situatie op het tabblad waar je een vaste kost toevoegt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Je situatie')
    await user.click(await screen.findByRole('tab', { name: /Vaste kosten/ }))
    await user.click(await screen.findByRole('button', { name: 'Naar je vaste lasten' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Budget' })).toBeInTheDocument()
    // Met het formulier van je vaste LASTEN in beeld, niet vijf blokken lager.
    const lasten = (await screen.findByText('Vaste lasten')).closest('section, .kaart') as HTMLElement
    expect(within(lasten).getByLabelText('Vaste omschrijving')).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/budget/vast'))
  })

  // ⚠ De zwaarste fout uit de nakijkronde: een koppeling gold in élke volgende
  // maand. Eén "ja" in augustus en het water verdween voorgoed uit je plan.
  it('laat een koppeling alleen in haar eigen maand gelden', async () => {
    await bewaarTerugkerendePost({
      id: 'p-water',
      omschrijving: 'Water',
      bedrag: -3000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-wonen',
    })
    // Een gekoppelde betaling in de VORIGE maand.
    await bewaarTransactie({
      id: 't-water-oud',
      datum: `${vorigeMaand(MAAND)}-05`,
      omschrijving: 'De Watergroep',
      bedrag: -3200,
      rekeningId: 'r1',
      categorieId: 'cat-wonen',
      vasteLastId: 'p-water',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaBudget(user, 'Vast')

    // Deze maand staat Water gewoon weer open.
    expect(await screen.findByRole('button', { name: 'Boek in' })).toBeInTheDocument()
    expect(screen.queryByText('Geboekt ✓')).not.toBeInTheDocument()
  })

  // ⚠ Het antwoord van de gebruiker moet een bewerking overleven. Zonder deze test
  // wist elke correctie van een typfout de koppeling stil uit.
  it('houdt de koppeling wanneer je de boeking daarna bewerkt', async () => {
    await bewaarTerugkerendePost({
      id: 'p-boodschappen',
      omschrijving: 'Voedselpakket',
      bedrag: -30000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-voeding',
    })
    await db.transacties.update('t3', { vasteLastId: 'p-boodschappen' })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await ga(user, 'Transacties')
    await screen.findByText('Boodschappen')
    await user.click(screen.getByRole('button', { name: /^Bewerk Boodschappen/ }))
    const veld = screen.getByLabelText('Handelaar / winkel')
    await user.clear(veld)
    await user.type(veld, 'Colruyt')
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(async () => expect((await db.transacties.get('t3'))?.omschrijving).toBe('Colruyt'))
    expect((await db.transacties.get('t3'))?.vasteLastId).toBe('p-boodschappen')
  })

  // Een verkeerd antwoord moet je kunnen rechtzetten. "Uitboeken" kan dat niet: dat
  // wist een transactie, en deze boeking tikte je zelf in.
  it('laat je een koppeling weer losmaken', async () => {
    await bewaarTerugkerendePost({
      id: 'p-water',
      omschrijving: 'Water',
      bedrag: -3000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-wonen',
    })
    await bewaarTransactie({
      id: 't-water',
      datum: `${MAAND}-${dag(6)}`,
      omschrijving: 'De Watergroep',
      bedrag: -3200,
      rekeningId: 'r1',
      categorieId: 'cat-wonen',
      vasteLastId: 'p-water',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaBudget(user, 'Vast')

    await user.click(await screen.findByRole('button', { name: /^Losmaken/ }))

    await waitFor(async () => expect((await db.transacties.get('t-water'))?.vasteLastId).toBeUndefined())
    // De boeking zelf blijft staan — losmaken is geen wissen.
    expect(await db.transacties.get('t-water')).toBeDefined()
    expect(await screen.findByRole('button', { name: 'Boek in' })).toBeInTheDocument()
  })

  // ⚠ De hele wegwijzer-belofte hing aan één ongeteste regel in App.
  it('zet een melding over een budget op het tabblad Budgetten af', async () => {
    await bewaarBudget({ id: 'b-voeding', categorieId: 'cat-voeding', bedrag: 30000 })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(await screen.findByRole('button', { name: /^Meldingen \(/ }))
    await user.click(await screen.findByText(/^Budget Voeding is/))

    expect(await screen.findByRole('heading', { level: 1, name: 'Budget' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toBe('#/budget/budgetten'))
    expect(screen.getByLabelText('Budgetcategorie')).toBeInTheDocument()
  })

  // ⚠ Zonder dit is het standaardtabblad van de pagina op een verse app helemaal
  // leeg — uitgerekend de pagina die begrijpelijker moest worden.
  it('wijst de weg wanneer er nog niets te verdelen valt', async () => {
    await db.transacties.clear()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await ga(user, 'Budget')

    expect(await screen.findByText('Nog niets om te verdelen')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Naar je vaste inkomsten en lasten' }))
    expect(await screen.findByText('Vaste lasten')).toBeInTheDocument()
  })

  // ⚠ Wegklikken is geen antwoord (tweede nakijkronde ronde 64). "Nee" betekent bij
  // "Boek in" *boek die vaste last alsnog bij* — en dat hing aan dezelfde weg als
  // Escape en het kruisje. Wie de vraag wegklikte, kreeg dus een boeking van € 30
  // bovenop zijn betaling van € 32: precies de fout die deze ronde wegneemt.
  it('boekt niets bij wanneer je de vraag wegklikt', async () => {
    await bewaarTerugkerendePost({
      id: 'p-water',
      omschrijving: 'Water',
      bedrag: -3000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-wonen',
    })
    await bewaarTransactie({
      id: 't-water',
      datum: `${MAAND}-${dag(6)}`,
      omschrijving: 'De Watergroep',
      bedrag: -3200,
      rekeningId: 'r1',
      categorieId: 'cat-wonen',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaBudget(user, 'Vast')

    await user.click(await screen.findByRole('button', { name: 'Boek in' }))
    await screen.findByText(/Er staat deze maand al een boeking van/)
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByText(/Er staat deze maand al een boeking van/)).not.toBeInTheDocument())
    // Niets bijgemaakt en niets gekoppeld: de vier startboekingen plus deze ene.
    expect(await db.transacties.count()).toBe(4)
    expect((await db.transacties.get('t-water'))?.vasteLastId).toBeUndefined()
  })

  // ⚠ De ongedaan-maken-knop van "Ja" zocht de boeking opnieuw op in een lijst die
  // haar nog niet kende, en deed daardoor aantoonbaar niets.
  it('maakt het koppelen echt ongedaan', async () => {
    await bewaarTerugkerendePost({
      id: 'p-water',
      omschrijving: 'Water',
      bedrag: -3000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-wonen',
    })
    await bewaarTransactie({
      id: 't-water',
      datum: `${MAAND}-${dag(6)}`,
      omschrijving: 'De Watergroep',
      bedrag: -3200,
      rekeningId: 'r1',
      categorieId: 'cat-wonen',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaBudget(user, 'Vast')

    await user.click(await screen.findByRole('button', { name: 'Boek in' }))
    await user.click(await screen.findByRole('button', { name: 'Ja, dit is die betaling' }))
    await waitFor(async () => expect((await db.transacties.get('t-water'))?.vasteLastId).toBe('p-water'))

    await user.click(await screen.findByRole('button', { name: 'Ongedaan maken' }))
    await waitFor(async () => expect((await db.transacties.get('t-water'))?.vasteLastId).toBeUndefined())
  })

  // ⚠ Een gekoppelde boeking die je omzet naar een gesplitst kassaticket of naar een
  // inkomst, is niet meer de betaling van die vaste last.
  it('laat de koppeling los wanneer de boeking een inkomst wordt', async () => {
    await bewaarTerugkerendePost({
      id: 'p-boodschappen',
      omschrijving: 'Voedselpakket',
      bedrag: -30000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-voeding',
    })
    await db.transacties.update('t3', { vasteLastId: 'p-boodschappen' })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await ga(user, 'Transacties')
    await screen.findByText('Boodschappen')
    await user.click(screen.getByRole('button', { name: /^Bewerk Boodschappen/ }))
    await user.click(screen.getByLabelText('Inkomst'))
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(async () => expect((await db.transacties.get('t3'))?.bedrag).toBeGreaterThan(0))
    expect((await db.transacties.get('t3'))?.vasteLastId).toBeUndefined()
  })

  // Zonder deze test kan de koppeling stil verdwijnen: dan staat de vaste last
  // opnieuw als "nog te boeken" en meldt het belletje hem alsnog.
  it('houdt een afgepunte vaste last afgepunt', async () => {
    await bewaarTerugkerendePost({
      id: 'p-water',
      omschrijving: 'Water',
      bedrag: -3000,
      rekeningId: 'r1',
      dag: 5,
      categorieId: 'cat-wonen',
    })
    await bewaarTransactie({
      id: 't-water',
      datum: `${MAAND}-${dag(6)}`,
      omschrijving: 'De Watergroep',
      bedrag: -3200,
      rekeningId: 'r1',
      categorieId: 'cat-wonen',
      vasteLastId: 'p-water',
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await gaBudget(user, 'Vast')

    expect(await screen.findByText('Geboekt ✓')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Boek in' })).not.toBeInTheDocument()
  })
})
