import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'
import { bewaarBudget, bewaarCategorie, bewaarRekening, bewaarTransactie } from './data/repository'
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

  it('toont de recente transacties en de budgetstatus', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    // De recente transacties staan sinds ronde 31 in de HOOFDkolom (ze waren op een
    // telefoon anders nergens te zien); de zijkolom houdt de budgetstatus.
    expect(screen.getByText('Recente transacties')).toBeInTheDocument()
    expect(screen.getByText('Budgetstatus')).toBeInTheDocument()
    // De voorbeelddata bevat een transactie 'Loon'.
    expect(await screen.findByText('Loon')).toBeInTheDocument()
  })

  it('springt vanuit de recente transacties naar de transactiepagina', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Recente transacties')

    // De 'Alle'-knop ván de kaart met recente transacties. Bewust niet "de eerste
    // Alle-knop op de pagina": sinds ronde 32 staat die kaart onder het raster,
    // dus komt de zijkolom (die ook een 'Alle' heeft) er in de DOM vóór.
    const kop = screen.getByText('Recente transacties').closest('.kaart') as HTMLElement
    await user.click(within(kop).getByRole('button', { name: 'Alle' }))
    // De pagina is nu puur overzicht: de knop die zoeken en filteren opent hoort
    // er te staan, en het invoerformulier niet meer (dat zit in de popup).
    //
    // Ronde 32: het zoekVELD zit achter die knop. Vandaar dat de test nu op de knop
    // zoekt en pas daarna op het veld — precies de weg die de gebruiker aflegt.
    await waitFor(() => expect(screen.getByRole('button', { name: /Zoeken en filteren/ })).toBeInTheDocument())
    expect(screen.queryByLabelText('Handelaar / winkel')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Zoeken en filteren/ }))
    expect(screen.getByLabelText('Zoek in transacties')).toBeInTheDocument()
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

  // --- Ronde 32 ---

  it('brengt je met het merkteken linksboven terug naar Overzicht', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(screen.getByRole('button', { name: 'Instellingen' }))
    await screen.findByText('Taal')
    // Het logo linksboven doet op zowat elke website hetzelfde; hier deed het niets.
    await user.click(screen.getByRole('button', { name: 'Naar Overzicht' }))
    expect(await screen.findByText('Saldo')).toBeInTheDocument()
  })

  it('zet de recente transacties en de maandgrafiek over de volle breedte', async () => {
    render(<App />)
    await screen.findByText('Recente transacties')

    // Ze stonden in de LINKERkolom van het hoofdraster, dus naast de zijkolom en
    // maar twee derde breed — met een leeg vak rechts ernaast. Nu staan ze buiten
    // dat raster.
    const volle = document.querySelector('[data-volle-breedte]') as HTMLElement
    expect(volle).not.toBeNull()
    expect(volle.closest('.raster-hoofd')).toBeNull()
    expect(within(volle).getByText('Recente transacties')).toBeInTheDocument()
    expect(within(volle).getByText('Inkomsten en uitgaven per maand')).toBeInTheDocument()
  })

  it('laat de pagina bij elke tabwissel opnieuw in beeld komen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    // De `key` op dit vlak is wat de overgang laat werken: zonder key hergebruikt
    // React hetzelfde element en speelt de animatie maar één keer, bij het laden.
    const vlak = () => document.querySelector('.pagina-in') as HTMLElement
    const eerste = vlak()
    expect(eerste).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Instellingen' }))
    await screen.findByText('Taal')
    expect(vlak()).not.toBe(eerste)
  })
})

// --- Ronde 40: de budgetrijen in de desktopzijkolom -----------------------------
//
// Deze kolom bestaat alleen vanaf 1024 px, en op een breed scherm is het de EERSTE
// plek waar je een budgetcijfer ziet. De rijen liepen dood: de knop "Alle" bracht je
// naar de Budget-pagina waar je dezelfde rij dan opnieuw moest zoeken.

describe('App (desktop) — doorklikken vanaf de budgetstatus in de zijkolom', () => {
  it('brengt je van een budgetrij in de zijkolom naar precies die boekingen', async () => {
    const user = userEvent.setup()
    await bewaarBudget({ id: 'b1', categorieId: 'cat-voeding', bedrag: 40000 })
    render(<App />)
    await screen.findByText('Saldo')

    const zijkolom = screen.getByText('Budgetstatus').closest('section.kaart') as HTMLElement
    await user.click(within(zijkolom).getByRole('button', { name: /^Bekijk de boekingen van Voeding —/ }))

    expect(await screen.findByText('Boodschappen')).toBeInTheDocument()
    expect(screen.queryByText('Huur')).toBeNull()
    expect(screen.getByRole('button', { name: 'Wis filter Voeding' })).toBeInTheDocument()
  })

  it('laat de knop "Alle" gewoon naar de Budget-pagina gaan', async () => {
    const user = userEvent.setup()
    await bewaarBudget({ id: 'b1', categorieId: 'cat-voeding', bedrag: 40000 })
    render(<App />)
    await screen.findByText('Saldo')

    const zijkolom = screen.getByText('Budgetstatus').closest('section.kaart') as HTMLElement
    await user.click(within(zijkolom).getByRole('button', { name: 'Alle' }))
    expect(await screen.findByRole('heading', { name: 'Budget instellen' })).toBeInTheDocument()
  })
})
