import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'
import { bewaarBudget, bewaarCategorie, bewaarRekening, bewaarTransactie } from './data/repository'
import { herstelSchermbreedte, zetSchermbreedte } from './test/schermbreedte'
import { InstellingenProvider } from './instellingen'
import { huidigeMaand, vandaag } from './utils/datum'

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
  await bewaarTransactie({ id: 't1', datum: `${MAAND}-${dag(1)}`, omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1', categorieId: 'cat-inkomsten' })
  await bewaarTransactie({ id: 't2', datum: `${MAAND}-${dag(3)}`, omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', categorieId: 'cat-wonen' })
  await bewaarTransactie({ id: 't3', datum: `${MAAND}-${dag(5)}`, omschrijving: 'Boodschappen', bedrag: -32000, rekeningId: 'r1', categorieId: 'cat-voeding' })
}

afterEach(() => {
  herstelSchermbreedte()
})

describe('App op een breed scherm', () => {
  it('toont het zijpaneel in plaats van de onderbalk', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    // ⚠ Ronde 61: de NAAM "Hoofdnavigatie" hoort bij de <nav> en niet bij de <aside>
    // eromheen. Vóór die ronde verscheen het zijpaneel in de lijst van een
    // schermlezer als "aanvullende inhoud: Hoofdnavigatie", met daarnaast een
    // naamloze navigatie — twee ingangen die geen van beide klopten.
    const paneel = screen.getByRole('complementary')
    expect(paneel).not.toHaveAttribute('aria-label')
    expect(within(paneel).getByRole('navigation', { name: 'Hoofdnavigatie' })).toBeInTheDocument()
    // De onderbalk heeft een 'Meer'-knop; het zijpaneel toont alle pagina's. Dát is
    // waaraan we zien dat de smalle balk hier niet staat.
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
    expect(screen.getByRole('heading', { name: 'Recente boekingen' })).toBeInTheDocument()
    expect(screen.getByText('Budgetstatus')).toBeInTheDocument()
    // De voorbeelddata bevat een transactie 'Loon'.
    expect(await screen.findByText('Loon')).toBeInTheDocument()
  })

  it('springt vanuit de recente transacties naar de transactiepagina', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Recente boekingen' })

    // ⚠ RONDE 66, slotronde: deze knop heette gewoon "Alle", net als die in de
    // zijkolom ernaast — twee knoppen met exact dezelfde naam op één scherm. Ze heten
    // nu "Alle boekingen" en "Alle budgetten", dus de omweg via `within(kaart)` is
    // niet meer nodig om de juiste te vinden.
    await user.click(screen.getByRole('button', { name: 'Alle boekingen' }))
    // De pagina is nu puur overzicht: de knop die zoeken en filteren opent hoort
    // er te staan, en het invoerformulier niet meer (dat zit in de popup).
    //
    // Ronde 32: het zoekVELD zit achter die knop. Vandaar dat de test nu op de knop
    // zoekt en pas daarna op het veld — precies de weg die de gebruiker aflegt.
    await waitFor(() => expect(screen.getByRole('button', { name: /Zoeken en filteren/ })).toBeInTheDocument())
    expect(screen.queryByLabelText('Handelaar / winkel')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Zoeken en filteren/ }))
    expect(screen.getByLabelText('Zoek in je boekingen')).toBeInTheDocument()
  })

  it('opent de invoerpopup vanuit de bovenbalk, zonder de pagina te verlaten', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.click(screen.getByRole('button', { name: '+ Nieuwe boeking' }))
    const popup = await screen.findByRole('dialog')
    expect(within(popup).getByLabelText('Handelaar / winkel')).toBeInTheDocument()
    // We staan nog steeds op het Overzicht — deze knop verplaatste je vroeger.
    expect(screen.getByRole('heading', { name: 'Recente boekingen' })).toBeInTheDocument()
  })

  // Ronde 61. Tel eens mee wat je op een pc met het toetsenbord passeert vóór je bij
  // de inhoud bent: het merkteken, vijftien paginaknoppen en drie weergaveknoppen.
  it('zet een "ga naar de inhoud"-link vóór het zijpaneel', async () => {
    render(<App />)
    await screen.findByText('Saldo')

    const link = screen.getByRole('link', { name: 'Ga naar de inhoud' })
    expect(link).toHaveAttribute('href', '#inhoud')
    // Vóór de zijbalk, want anders kom je hem pas tegen ná wat hij moet overslaan.
    const paneel = screen.getByRole('complementary')
    expect(link.compareDocumentPosition(paneel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('heeft een echte hoofdinhoud waar die link naartoe wijst', async () => {
    // ⚠ De smalle weergave had al een <main>; de brede werkte met een kale <div>.
    // Juist op het toestel waar de zijbalk negentien knoppen vóór de inhoud zet,
    // ontbrak dus de landmark om erheen te springen.
    render(<App />)
    await screen.findByText('Saldo')

    const inhoud = screen.getByRole('main')
    expect(inhoud).toHaveAttribute('id', 'inhoud')
    // `tabIndex=-1` is nodig, anders verplaatst de browser de focus niet mee en tabt
    // je volgende druk weer vanaf de zijbalk verder.
    expect(inhoud).toHaveAttribute('tabindex', '-1')
  })

  it('zet op Budget de lijst vóór het formulier in de leesvolgorde', async () => {
    // ⚠ Ronde 61. Tot die ronde stond de formulierkolom EERST in de code en zette een
    // CSS-regel (`order`) haar op een smal scherm naar onderen. Wat je ZAG klopte dus,
    // maar de tab-toets en een schermlezer volgen de code: het formulier kreeg de focus
    // vóór je iets over je bestaande budgetten hoorde. Op een breed scherm staan de
    // kolommen nog steeds links en rechts — dat regelt het raster, niet de volgorde.
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')
    await user.click(screen.getByRole('button', { name: 'Budget' }))
    await screen.findByRole('heading', { name: 'Budget' })
    // Sinds ronde 64 staan de budgetten op hun eigen tabblad, samen met het
    // formulier waarmee je er een instelt.
    await user.click(await screen.findByRole('tab', { name: /Budgetten/ }))

    const lijst = document.querySelector('.kolom-lijst') as HTMLElement
    const formulier = document.querySelector('.kolom-formulier') as HTMLElement
    expect(lijst).toBeInTheDocument()
    expect(formulier).toBeInTheDocument()
    expect(lijst.compareDocumentPosition(formulier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
    await screen.findByRole('heading', { name: 'Recente boekingen' })

    // Ze stonden in de LINKERkolom van het hoofdraster, dus naast de zijkolom en
    // maar twee derde breed — met een leeg vak rechts ernaast. Nu staan ze buiten
    // dat raster.
    const volle = document.querySelector('[data-volle-breedte]') as HTMLElement
    expect(volle).not.toBeNull()
    expect(volle.closest('.raster-hoofd')).toBeNull()
    expect(within(volle).getByText('Recente boekingen')).toBeInTheDocument()
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
    await user.click(within(zijkolom).getByRole('button', { name: /^Bekijk de boekingen van Voeding in je budget —/ }))

    expect(await screen.findByText('Boodschappen')).toBeInTheDocument()
    expect(screen.queryByText('Huur')).toBeNull()
    expect(screen.getByRole('button', { name: 'Wis filter Voeding' })).toBeInTheDocument()
  })

  // ⚠ Ronde 62. Deze kolom stond ALTIJD op € 0,00 en 0 %, hoeveel je die maand ook
  // uitgaf: `App.tsx` gaf de maand door als leesbaar label ("augustus 2026") en de
  // rekenkern vergelijkt met `datum.startsWith(maand)`. Elke balk groen, en niets dat
  // het verried — de twee tests hierboven klikken alleen op een rij en keken nooit
  // naar een bedrag. Deze test kijkt wél naar het bedrag.
  it('toont in de zijkolom wat er ÉCHT uitgegeven is', async () => {
    await bewaarBudget({ id: 'b1', categorieId: 'cat-voeding', bedrag: 40000 })
    render(<App />)
    await screen.findByText('Saldo')

    const zijkolom = screen.getByText('Budgetstatus').closest('section.kaart') as HTMLElement
    // € 320 boodschappen van een budget van € 400 = 80 %.
    expect(within(zijkolom).getByRole('progressbar', { name: 'Voeding' })).toHaveAttribute('aria-valuenow', '32000')
    expect(within(zijkolom).getByRole('button', { name: /^Bekijk de boekingen van Voeding in je budget —/ })).toHaveAccessibleName(
      /320/,
    )
  })

  it('toont in de zijkolom één rij per categorie, ook met een uitzondering', async () => {
    // ⚠ Ronde 62. Van de vijf plaatsen die met budgetten rekenen was dit de enige
    // zonder één test — terwijl deze kolom op een breed scherm het eerste is wat je
    // ziet. Zonder `geldendeBudgetten` staat Voeding hier twee keer, en met vier
    // plaatsen duwen die twee de rest eruit.
    await bewaarBudget({ id: 'budget-cat-voeding', categorieId: 'cat-voeding', bedrag: 40000 })
    await bewaarBudget({
      id: `budget-cat-voeding-${huidigeMaand()}`,
      categorieId: 'cat-voeding',
      bedrag: 80000,
      maand: huidigeMaand(),
    })
    render(<App />)
    await screen.findByText('Saldo')

    const zijkolom = screen.getByText('Budgetstatus').closest('section.kaart') as HTMLElement
    expect(within(zijkolom).getAllByRole('progressbar', { name: 'Voeding' })).toHaveLength(1)
    // En de uitzondering telt: € 320 van € 800, niet van € 400.
    expect(within(zijkolom).getByRole('progressbar', { name: 'Voeding' })).toHaveAttribute('aria-valuemax', '80000')
  })

  it('laat de knop "Alle budgetten" gewoon naar de Budget-pagina gaan', async () => {
    const user = userEvent.setup()
    await bewaarBudget({ id: 'b1', categorieId: 'cat-voeding', bedrag: 40000 })
    render(<App />)
    await screen.findByText('Saldo')

    const zijkolom = screen.getByText('Budgetstatus').closest('section.kaart') as HTMLElement
    await user.click(within(zijkolom).getByRole('button', { name: 'Alle budgetten' }))
    expect(await screen.findByRole('heading', { name: 'Budget instellen' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Ronde 90 — de kaartkeuze op een BREED scherm
// ---------------------------------------------------------------------------
//
// ⚠ Deze twee tests kunnen alleen hier staan. Op een telefoon bestaat de zijkolom niet,
// dus de belofte "de zijkolom is bewust niet uitzetbaar" is in App.test.tsx niet waar te
// maken — daar verdwijnt ze sowieso.
describe('welke kaarten je op het Overzicht wil zien, op een breed scherm (ronde 90)', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  function staatOpen() {
    expect((document.querySelector('[data-kaartkeuze]') as HTMLDetailsElement).open).toBe(true)
  }

  it('laat de zijkolom staan, wat je ook uitzet', async () => {
    const user = userEvent.setup()
    await bewaarBudget({ id: 'b1', categorieId: 'cat-voeding', bedrag: 40000 })
    render(
      <InstellingenProvider>
        <App />
      </InstellingenProvider>,
    )
    await screen.findByText('Saldo')
    staatOpen()

    const groep = screen.getByRole('group', { name: 'Welke kaarten wil je hier zien?' })
    // ⚠ Geen chip voor de zijkolom: die bestaat alleen hier, en een schakelaar voor iets
    // wat op je telefoon niet bestaat, doet daar niets.
    expect(within(groep).queryByRole('button', { name: 'Budgetstatus' })).toBeNull()
    for (const chip of within(groep).getAllByRole('button')) await user.click(chip)

    expect(screen.getByRole('heading', { name: 'Budgetstatus' })).toBeInTheDocument()
    expect(document.querySelector('[data-maandblok]')).not.toBeNull()
  })

  it('geeft de zijkolom de volle breedte zodra allebei de donuts uitstaan', async () => {
    // ⚠ Dit raster is hier `2fr 1fr` met de zijkolom rechts. Zonder de twee donuts bleef
    // de linkerkolom van twee derde leeg naast een smalle zijkolom — zichtbaar het
    // tegenovergestelde van wat deze ronde wil.
    const user = userEvent.setup()
    render(
      <InstellingenProvider>
        <App />
      </InstellingenProvider>,
    )
    await screen.findByText('Saldo')
    staatOpen()
    const raster = document.querySelector('.raster-hoofd') as HTMLElement
    expect(raster.hasAttribute('data-hoofd-leeg')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Uitgaven per categorie' }))
    expect(raster.hasAttribute('data-hoofd-leeg')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Inkomsten per categorie' }))
    expect(raster.hasAttribute('data-hoofd-leeg')).toBe(true)

    // En terug.
    await user.click(screen.getByRole('button', { name: 'Uitgaven per categorie' }))
    expect(raster.hasAttribute('data-hoofd-leeg')).toBe(false)
  })
})

// Ronde 64: een bladwijzer naar een tabblad van Budget moet blijven werken.
describe('het adres van de Budget-tabbladen', () => {
  it('houdt het tabblad in het adres na een herstart', async () => {
    window.location.hash = '#/budget/vast'
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Budget' })

    // Het scherm staat op "Vast"...
    expect(await screen.findByText('Vaste lasten')).toBeInTheDocument()
    // ...en het ADRES ook. Zonder dat laatste landde de volgende herlaadbeurt of
    // een bladwijzer voorgoed op "Te verdelen".
    await waitFor(() => expect(window.location.hash).toBe('#/budget/vast'))
  })
})
