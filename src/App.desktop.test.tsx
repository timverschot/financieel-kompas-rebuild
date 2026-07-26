import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'
import { bewaarCategorie, bewaarRekening, bewaarTransactie } from './data/repository'
import { herstelSchermbreedte, zetSchermbreedte } from './test/schermbreedte'

// De desktopweergave (zijpaneel + brede rasters) werd tot nu toe nooit getest:
// jsdom kende geen matchMedia, dus de app viel altijd terug op de mobiele
// weergave. Met de nabootsing uit test/schermbreedte kan dat wél.

beforeEach(async () => {
  await Promise.all([
    db.transacties.clear(),
    db.rekeningen.clear(),
    db.categorieen.clear(),
    db.budgetten.clear(),
    db.overboekingen.clear(),
    db.events.clear(),
    db.meta.clear(),
  ])
  await maakStartgegevens()
  zetSchermbreedte(1440)
})

// De app start sinds ronde 16 volledig leeg — er wordt géén voorbeelddata meer
// aangemaakt. Deze tests gaan wél uit van een rekening met wat boekingen, dus
// zetten ze die hier zelf klaar (dezelfde gegevens als de vroegere seed).
async function maakStartgegevens() {
  await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })
  await bewaarCategorie({ id: 'cat-inkomsten', naam: 'Inkomsten' })
  await bewaarCategorie({ id: 'cat-wonen', naam: 'Huisvesting' })
  await bewaarCategorie({ id: 'cat-voeding', naam: 'Voeding' })
  await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', categorieId: 'cat-inkomsten' })
  await bewaarTransactie({ id: 't2', datum: '2026-07-03', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', categorieId: 'cat-wonen' })
  await bewaarTransactie({ id: 't3', datum: '2026-07-05', omschrijving: 'Boodschappen', bedrag: -32000, rekeningId: 'r1', categorieId: 'cat-voeding' })
}

afterEach(() => {
  herstelSchermbreedte()
})

describe('App op een breed scherm', () => {
  it('toont het zijpaneel in plaats van de onderbalk', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    // Het zijpaneel is een <aside> (rol 'complementary'); de onderbalk is een
    // <nav>. Op een breed scherm hoort enkel het zijpaneel er te staan.
    expect(screen.getByRole('complementary', { name: 'Hoofdnavigatie' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Hoofdnavigatie' })).not.toBeInTheDocument()
    // De onderbalk heeft een 'Meer'-knop; het zijpaneel toont alle pagina's.
    expect(screen.queryByRole('button', { name: 'Meer' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Instellingen' })).toBeInTheDocument()
  })

  it('toont de kengetallen naast het saldo, zonder de maandoverzicht-kaart te herhalen', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    // De vier cijfers staan als tegels bovenaan. We zoeken binnen dat blok, want
    // 'Inkomsten' is ook een categorienaam in de grafieklegende.
    const tegels = within(document.querySelector('[data-kengetallen]') as HTMLElement)
    expect(tegels.getByText('Saldo')).toBeInTheDocument()
    expect(tegels.getByText('Inkomsten')).toBeInTheDocument()
    expect(tegels.getByText('Uitgaven')).toBeInTheDocument()
    expect(tegels.getByText('Netto')).toBeInTheDocument()
    // De kaart 'Maandoverzicht' is op desktop overbodig: die zou dezelfde drie
    // cijfers een tweede keer tonen.
    expect(screen.queryByText('Maandoverzicht')).not.toBeInTheDocument()
  })

  it('toont de zijkolom met recente transacties en budgetstatus', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    expect(screen.getByText('Recente transacties')).toBeInTheDocument()
    expect(screen.getByText('Budgetstatus')).toBeInTheDocument()
    // De voorbeelddata bevat een transactie 'Loon'.
    expect(await screen.findByText('Loon')).toBeInTheDocument()
  })

  it('springt vanuit de zijkolom naar de transactiepagina', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Recente transacties')

    // De eerste 'Alle'-knop hoort bij de kaart met recente transacties.
    await user.click(screen.getAllByRole('button', { name: 'Alle' })[0])
    // De pagina is nu puur overzicht: de zoekbalk van de lijst hoort er te staan,
    // en het invoerformulier niet meer (dat zit in de popup).
    await waitFor(() => expect(screen.getByLabelText('Zoek in transacties')).toBeInTheDocument())
    expect(screen.queryByLabelText('Handelaar / winkel')).toBeNull()
  })

  it('opent de invoerpopup vanuit de bovenbalk, zonder de pagina te verlaten', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(screen.getByRole('button', { name: '+ Nieuwe transactie' }))
    const popup = await screen.findByRole('dialog')
    expect(within(popup).getByLabelText('Handelaar / winkel')).toBeInTheDocument()
    // We staan nog steeds op het Overzicht — deze knop verplaatste je vroeger.
    expect(screen.getByText('Recente transacties')).toBeInTheDocument()
  })

  it('valt terug op de mobiele weergave zodra het scherm smal wordt', async () => {
    render(<App />)
    await screen.findByText('Saldo')
    expect(screen.queryByRole('button', { name: 'Meer' })).not.toBeInTheDocument()

    zetSchermbreedte(390)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Meer' })).toBeInTheDocument())
  })
})
