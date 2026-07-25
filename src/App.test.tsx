import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'

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
    db.events.clear(),
    db.meta.clear(),
  ])
})

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

    await ga(user, 'Transacties')
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(await screen.findByText('Boek')).toBeInTheDocument()

    await ga(user, 'Overzicht')
    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?115/))
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
    expect((await screen.findAllByRole('option', { name: 'Vakantiepot' })).length).toBeGreaterThan(0)
  })

  it('maakt een vaste post aan en boekt hem in voor de maand', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Budget')
    await user.type(screen.getByLabelText('Vaste omschrijving'), 'Netflix')
    await user.type(screen.getByLabelText('Vast bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Vaste post toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Boek in' }))

    expect(await screen.findByText('Geboekt ✓')).toBeInTheDocument()
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
    await user.type(screen.getByLabelText('Aandeel jij (%)'), '50')
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
    await user.type(screen.getByLabelText('Aandeel jij (%)'), '50')
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
    expect(await screen.findByText('Vervoer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Verwijder categorie Vervoer' }))
    await waitFor(() => expect(screen.queryByText('Vervoer')).toBeNull())
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
    expect((await screen.findAllByRole('option', { name: 'Vakantiepot' })).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Verwijder rekening Vakantiepot' }))
    await waitFor(() => expect(screen.queryAllByRole('option', { name: 'Vakantiepot' })).toHaveLength(0))
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
    await user.type(screen.getByLabelText('Vaste omschrijving'), 'Netflix')
    await user.type(screen.getByLabelText('Vast bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Vaste post toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Bewerk vaste post Netflix' }))
    const oms = screen.getByLabelText('Vaste omschrijving')
    await user.clear(oms)
    await user.type(oms, 'Disney')
    await user.click(screen.getByRole('button', { name: 'Vaste post wijzigen' }))

    expect(await screen.findByText('Disney')).toBeInTheDocument()
  })

  it('bewerkt een gedeelde kost', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await gaMeer(user, 'Dossiers')
    await user.type(screen.getByLabelText('Dossiernaam'), 'Kinderen')
    await user.type(screen.getByLabelText('Aandeel jij (%)'), '50')
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
    await user.type(screen.getByLabelText('Aandeel jij (%)'), '50')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))

    await user.click(await screen.findByRole('button', { name: 'Verwijder dossier Kinderen' }))

    expect(await screen.findByText(/Nog geen dossiers/)).toBeInTheDocument()
  })
})
