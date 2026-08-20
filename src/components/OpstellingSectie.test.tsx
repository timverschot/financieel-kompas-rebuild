import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Aflossing, Lening, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { OpstellingSectie, type VeiligInvoer } from './OpstellingSectie'
import { formatEuro } from '../utils/format'

const leeg = {
  rekeningen: [] as Rekening[],
  transacties: [] as Transactie[],
  overboekingen: [],
  waarderingen: [],
  terugkerendePosten: [] as TerugkerendePost[],
  leningen: [] as Lening[],
  aflossingen: [] as Aflossing[],
  gezinsleden: [],
  dossiers: [],
}

function toon(over: Partial<typeof leeg> = {}, handlers: Record<string, unknown> = {}) {
  const onVastePost = (handlers.onVastePost as ReturnType<typeof vi.fn>) ?? vi.fn()
  const onNaarPagina = (handlers.onNaarPagina as ReturnType<typeof vi.fn>) ?? vi.fn()
  const resultaat = render(
    <OpstellingSectie
      {...leeg}
      {...over}
      onRekening={vi.fn()}
      onLening={vi.fn()}
      onVastePost={onVastePost}
      onKindToevoegen={vi.fn()}
      onKindWijzigen={vi.fn()}
      onKindVerwijderen={vi.fn()}
      onDossier={vi.fn()}
      onNaarPagina={onNaarPagina}
    />,
  )
  return { ...resultaat, onVastePost, onNaarPagina }
}

const rekening: Rekening = { id: 'r1', naam: 'Zichtrekening', beginsaldo: 250000, type: 'betaal' }
const spaar: Rekening = { id: 'r2', naam: 'Spaarrekening', beginsaldo: 1200000, type: 'spaar' }

// Een tegel uit de kaart "Dit is je situatie" opzoeken op haar label.
function tegel(label: string): string {
  const blok = screen.getByText(label).closest('.stat') as HTMLElement
  return blok.querySelector('.stat-waarde')?.textContent ?? ''
}

describe('OpstellingSectie — het slotscherm staat bovenaan en groeit mee', () => {
  it('toont streepjes zolang er nog niets is, in plaats van nullen', () => {
    // Vier keer € 0,00 zegt niets; een streepje zegt "hier komt nog iets".
    toon()
    expect(tegel('Vaste lasten per maand')).toBe('—')
    expect(tegel('Netto vermogen')).toBe('—')
  })

  it('rekent de vaste lasten en het vermogen uit ZONDER één transactie', () => {
    // Dit is het hele punt van dit scherm: het eerste bruikbare cijfer mag geen
    // boekingen nodig hebben.
    const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening, spaar], terugkerendePosten: [huur] })
    expect(tegel('Vaste lasten per maand')).toBe(formatEuro(95000))
    expect(tegel('Netto vermogen')).toBe(formatEuro(1450000))
  })

  it('trekt een openstaande lening van het vermogen af', () => {
    const lening: Lening = { id: 'l1', naam: 'Hypotheek', hoofdsom: 8000000, richting: 'geleend', startdatum: '2020-01-01' }
    toon({ rekeningen: [rekening], leningen: [lening] })
    expect(tegel('Netto vermogen')).toContain('77.500')
    expect(tegel('Netto vermogen')).toContain('-')
  })

  it('telt de sluipende kosten apart en zet ze om naar een jaarbedrag', () => {
    // Netflix hangt aan een categorie uit de sluipende lijst; huur niet.
    const netflix: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Netflix',
      bedrag: -1399,
      rekeningId: 'r1',
      dag: 1,
      categorieId: 'i-streaming-video-5157',
    }
    const huur: TerugkerendePost = { id: 'p2', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [netflix, huur] })
    expect(tegel('Waarvan sluipend')).toBe(formatEuro(1399))
    expect(screen.getByText(/oftewel/)).toHaveTextContent('167,88')
  })

  it('telt een opgezegd abonnement niet meer mee bij "waarvan sluipend"', () => {
    // Anders noemt de tegel een bedrag dat niet in het totaal erboven zit.
    const opgezegd: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Netflix',
      bedrag: -1399,
      rekeningId: 'r1',
      dag: 1,
      categorieId: 'i-streaming-video-5157',
      eindMaand: '2020-01',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [opgezegd] })
    expect(tegel('Waarvan sluipend')).toBe('—')
  })

  it('rekent het jaarbedrag uit de originele bedragen, niet uit het afgeronde maandbedrag', () => {
    // Een jaarabonnement van € 100 werd € 8,33 × 12 = € 99,96 — vier cent te weinig.
    const jaarpost: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Domeinnaam of webhosting',
      bedrag: -10000,
      rekeningId: 'r1',
      dag: 1,
      frequentie: 'jaar',
      categorieId: 'i-x-domeinnaam-en-hosting',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [jaarpost] })
    expect(screen.getByText(/oftewel/)).toHaveTextContent('100,00')
  })

  it('toont het vermogen ook wanneer er alleen een lening is', () => {
    const lening: Lening = { id: 'l1', naam: 'Hypotheek', hoofdsom: 8000000, richting: 'geleend', startdatum: '2020-01-01' }
    toon({ leningen: [lening] })
    expect(tegel('Netto vermogen')).not.toBe('—')
    expect(tegel('Netto vermogen')).toContain('80.000')
  })

  it('telt hoeveel blokken ingevuld zijn', () => {
    toon({ rekeningen: [rekening] })
    const balk = screen.getByRole('progressbar', { name: 'Ingevulde blokken' })
    expect(balk).toHaveAttribute('aria-valuenow', '1')
    expect(balk).toHaveAttribute('aria-valuemax', '7')
    expect(screen.getByText(/1 van 7 blokken ingevuld/)).toBeInTheDocument()
  })

  it('biedt pas een weg naar het overzicht zodra er een rekening is', () => {
    toon()
    expect(screen.queryByRole('button', { name: 'Naar je overzicht' })).not.toBeInTheDocument()
    toon({ rekeningen: [rekening] })
    expect(screen.getByRole('button', { name: 'Naar je overzicht' })).toBeInTheDocument()
  })
})

describe('OpstellingSectie — de aanvinklijsten', () => {
  it('maakt een vaste last met de juiste categorie, het juiste teken en de juiste frequentie', async () => {
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(onVastePost).toHaveBeenCalledWith(
      expect.objectContaining({
        omschrijving: 'Huur',
        bedrag: -95000, // negatief: het is een uitgave
        rekeningId: 'r1',
        categorieId: 'i-huur-4062',
      }),
    )
    // Maandelijks, dus géén frequentie en géén startmaand in het record.
    expect(onVastePost.mock.calls[0][0].frequentie).toBeUndefined()
  })

  it('zet een jaarlijkse post met haar frequentie en startmaand weg', async () => {
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '620')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(onVastePost.mock.calls[0][0].frequentie).toBe('jaar')
    expect(onVastePost.mock.calls[0][0].startMaand).toMatch(/^\d{4}-\d{2}$/)
  })

  it('markeert wat je al hebt en biedt daar geen tweede invoer meer aan', async () => {
    const gebruiker = userEvent.setup()
    const bestaand: TerugkerendePost = { id: 'p1', omschrijving: 'Netflix', bedrag: -1399, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] })

    await gebruiker.click(screen.getByRole('tab', { name: /Sluipende kosten/ }))
    const rij = screen.getByText('Netflix').closest('li') as HTMLElement
    expect(within(rij).getByText('toegevoegd')).toBeInTheDocument()
    expect(within(rij).queryByRole('button', { name: /Voeg Netflix toe/ })).not.toBeInTheDocument()
  })

  it('weigert een lege of nul-invoer zonder iets te bewaren', async () => {
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))
    expect(onVastePost).not.toHaveBeenCalled()

    await gebruiker.type(screen.getByLabelText('Huur'), '0')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))
    expect(onVastePost).not.toHaveBeenCalled()
  })

  it('houdt je bedrag vast wanneer het opslaan niet lukt', async () => {
    // Regel 7 van de projectinstructies: een mislukte opslag mag de gebruiker nooit
    // zijn invoer kosten. Vroeger maakte het veld zich hoe dan ook leeg.
    const gebruiker = userEvent.setup()
    toon({}, { onVastePost: vi.fn() })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(screen.getByLabelText('Huur')).toHaveValue('950')
  })

  it('zegt de reden in de rij zelf, niet bovenaan de pagina', async () => {
    // Bovenaan staat ze bij regel vijftien van de lijst volledig buiten beeld.
    const gebruiker = userEvent.setup()
    toon()
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    const rij = screen.getByLabelText('Huur').closest('li') as HTMLElement
    expect(within(rij).getByRole('alert')).toHaveTextContent(/Maak eerst een rekening aan/)
  })

  it('herkent een post ook wanneer de app in een andere taal staat', async () => {
    // De omschrijving wordt vertaald weggeschreven. Vergeleken we alleen met de
    // Nederlandse naam, dan zag een Franstalige gebruiker "Loyer" niet terug onder
    // "Huur" en voegde hij zijn huur een tweede keer toe.
    const frans: TerugkerendePost = { id: 'p1', omschrijving: 'Loyer', bedrag: -95000, rekeningId: 'r1', dag: 1 }
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening], terugkerendePosten: [frans] })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    const rij = screen.getByText('Huur').closest('li') as HTMLElement
    expect(within(rij).getByText('toegevoegd')).toBeInTheDocument()
  })

  it('zet een nieuwe post niet meteen op achterstallig', async () => {
    // Met dag 1 stond élke post die je hier invulde onmiddellijk als achterstallig
    // in je vooruitblik en in het belletje — je doet dit zelden op de eerste.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    const vandaagDag = Math.min(new Date().getDate(), 28)
    expect(onVastePost.mock.calls[0][0].dag).toBe(vandaagDag)
  })

  it('laat een jaarlijkse post pas volgende maand beginnen', async () => {
    // Anders valt het volle jaarbedrag meteen in je lopende maand: een
    // autoverzekering van € 620 die er nooit is geweest.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '620')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    const nu = new Date()
    const volgende = new Date(nu.getFullYear(), nu.getMonth() + 1, 1)
    const verwacht = `${volgende.getFullYear()}-${String(volgende.getMonth() + 1).padStart(2, '0')}`
    expect(onVastePost.mock.calls[0][0].startMaand).toBe(verwacht)
  })

  it('hangt een vaste kost nooit aan een gearchiveerde rekening', async () => {
    // Een post op een afgesloten rekening wordt nooit als betaald herkend en blijft
    // elke maand achterstallig staan.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    const oud: Rekening = { id: 'oud', naam: 'ING (gesloten)', beginsaldo: 0, type: 'betaal', gearchiveerd: true }
    toon({ rekeningen: [oud, rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(onVastePost.mock.calls[0][0].rekeningId).toBe('r1')
  })

  it('springt na Enter naar het volgende veld ONDER de rij, niet terug naar boven', async () => {
    // Wie geen huur betaalt en bij Hypotheek begint, sprong terug naar het huurveld
    // bovenaan — en tikte zijn volgende bedrag daar in. Zo ontstond stil een vaste
    // last "Huur" bij iemand zonder huur, die daarna gewoon meetelt in zijn buffer.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Hypotheek'), '1150')
    await gebruiker.keyboard('{Enter}')

    // Elektriciteit en gas staat ONDER Hypotheek; Huur staat erboven.
    expect(document.activeElement).toBe(screen.getByLabelText('Elektriciteit en gas'))
  })

  it('biedt een opgezegd abonnement gewoon opnieuw aan', async () => {
    // Netflix met een eindmaand in het verleden telt nergens meer mee: de tegel
    // "Waarvan sluipend" laat hem weg en het blok geldt niet als ingevuld. Zetten we
    // de rij dan tóch op "toegevoegd", dan spreekt het scherm zichzelf tegen én kan
    // wie zich opnieuw abonneert zijn abonnement hier niet meer ingeven.
    const gebruiker = userEvent.setup()
    const gestopt: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Netflix',
      bedrag: -1399,
      rekeningId: 'r1',
      dag: 1,
      eindMaand: '2020-01',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [gestopt] })

    await gebruiker.click(screen.getByRole('tab', { name: /Sluipende kosten/ }))
    const rij = screen.getByText('Netflix').closest('li') as HTMLElement
    expect(within(rij).queryByText('toegevoegd')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Netflix')).toBeEnabled()
  })

  it('laat een terugkerende ínkomst met dezelfde naam de kost niet blokkeren', async () => {
    // Kotgeld of onderverhuur komt binnen onder "Huur". Telden we die mee als "al
    // toegevoegd", dan kon je je eigen huur hier niet meer ingeven.
    const gebruiker = userEvent.setup()
    const inkomst: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: 75000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [inkomst] })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    const rij = screen.getByText('Huur').closest('li') as HTMLElement
    expect(within(rij).queryByText('toegevoegd')).not.toBeInTheDocument()
  })

  it('hangt een vaste kost aan een betaalrekening, niet aan je spaarboekje', async () => {
    // `standaardRekening` geeft de rekening terug waarop je het laatst boekte. Was
    // dat toevallig je spaarrekening, dan hingen hier twintig vaste lasten aan je
    // spaargeld. Vaste lasten gaan van een betaalrekening.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [spaar, rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(onVastePost.mock.calls[0][0].rekeningId).toBe('r1')
    // En het scherm zegt erbij van welke rekening het gaat — het vraagt dat bewust
    // niet, dus zonder deze regel zou je het nergens zien.
    expect(await screen.findByText(/Zichtrekening/)).toBeInTheDocument()
  })

  it('zegt waarom het niet lukt wanneer er nog geen rekening is', async () => {
    // Een vaste kost moet ergens vanaf gaan; zonder rekening kan de app dat niet
    // invullen, en dan hoort ze dat te zeggen in plaats van stil te falen.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({}, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(onVastePost).not.toHaveBeenCalled()
    expect(await screen.findByText(/Maak eerst een rekening aan/)).toBeInTheDocument()
  })
})

describe('OpstellingSectie — de blokken', () => {
  it('toont zeven blokken met hun tellingen', () => {
    toon({ rekeningen: [rekening, spaar] })
    expect(screen.getAllByRole('tab')).toHaveLength(7)
    const tab = screen.getByRole('tab', { name: /Je geld/ })
    expect(tab).toHaveTextContent('2')
  })

  it('laat elk blok overslaan — er is geen enkele blokkade', async () => {
    const gebruiker = userEvent.setup()
    toon()
    // Rechtstreeks naar het laatste blok springen moet gewoon werken.
    await gebruiker.click(screen.getByRole('tab', { name: /Delen/ }))
    expect(screen.getByText('Deel je kosten met iemand?')).toBeInTheDocument()
  })

  it('hergebruikt het echte rekeningformulier in plaats van een tweede te maken', () => {
    toon()
    expect(screen.getByLabelText('Rekeningnaam')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
  })

  it('zet het rekeningformulier per blok op het juiste type', async () => {
    // Stond het overal op "Betaalrekening", dan belandde de beleggingsrekening van
    // wie het keuzemenu overslaat stil bij "Je geld" — het blok bleef leeg en er was
    // geen woord uitleg.
    const gebruiker = userEvent.setup()
    toon()

    expect(screen.getByLabelText('Type')).toHaveValue('betaal')

    await gebruiker.click(screen.getByRole('tab', { name: /Voor later/ }))
    expect(screen.getByLabelText('Type')).toHaveValue('effecten')

    await gebruiker.click(screen.getByRole('tab', { name: /Openstaand/ }))
    expect(screen.getAllByLabelText('Type')[0]).toHaveValue('krediet')
  })

  it('legt uit waarom "Zo lang kom je toe" een streepje blijft', async () => {
    // Dat cijfer heeft een spaarrekening of cash nodig. Zonder uitleg lijkt een
    // streepje op een fout in de app.
    const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [huur] })

    expect(tegel('Zo lang kom je toe')).toBe('—')
    expect(screen.getByText(/spaarrekening of cash nodig/)).toBeInTheDocument()
  })

  it('laat de uitleg weg zodra er wel een spaarrekening is', () => {
    const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening, spaar], terugkerendePosten: [huur] })

    expect(screen.queryByText(/spaarrekening of cash nodig/)).not.toBeInTheDocument()
    expect(tegel('Zo lang kom je toe')).not.toBe('—')
  })

  it('toont in de lijstjes wat er NU staat, niet wat er ooit begon', async () => {
    // De tegel "Netto vermogen" rekent met het huidige saldo en het openstaande
    // kapitaal. Toonden de rijen `beginsaldo` en `hoofdsom`, dan zei het blok
    // "€ 20.000 lening" terwijl de tegel er nog € 5.000 van meetelde — twee cijfers
    // over hetzelfde, op één scherm.
    const gebruiker = userEvent.setup()
    const lening: Lening = {
      id: 'l1',
      naam: 'Hypotheek',
      hoofdsom: 2000000,
      richting: 'geleend',
      startdatum: '2020-01-01',
    }
    toon({
      rekeningen: [rekening],
      transacties: [
        { id: 't1', datum: '2026-01-05', omschrijving: 'Loon', bedrag: 300000, rekeningId: 'r1' },
      ],
      leningen: [lening],
      aflossingen: [{ id: 'a1', leningId: 'l1', datum: '2026-01-10', bedrag: 1500000 }],
    })

    // Let op: `Intl` zet een vaste spatie tussen € en het getal, dus vergelijken met
    // een zelf getikte string mislukt. Daarom textContent tegen formatEuro().
    const bedragVan = (naam: string) =>
      (screen.getByText(naam).closest('li') as HTMLElement).querySelector('.rij-acties')?.textContent

    // € 2.500 beginsaldo + € 3.000 loon = € 5.500 — niet € 2.500.
    expect(bedragVan('Zichtrekening')).toBe(formatEuro(550000))

    await gebruiker.click(screen.getByRole('tab', { name: /Openstaand/ }))
    // € 20.000 hoofdsom − € 15.000 afgelost = € 5.000 — niet € 20.000.
    expect(bedragVan('Hypotheek')).toBe(formatEuro(500000))
  })

  it('telt een afgesloten lening niet meer als "openstaand"', async () => {
    // `leningstand()` slaat een afgesloten lening over, dus de tegel Netto vermogen
    // doet dat ook. Telde het blok ze wél, dan stond het op "1 openstaand" terwijl er
    // niets meer openstond.
    const gebruiker = userEvent.setup()
    const afbetaald: Lening = {
      id: 'l1',
      naam: 'Autolening',
      hoofdsom: 800000,
      richting: 'geleend',
      startdatum: '2020-01-01',
      afgesloten: true,
    }
    toon({ rekeningen: [rekening], leningen: [afbetaald] })

    const tab = screen.getByRole('tab', { name: /Openstaand/ })
    expect(tab).not.toHaveTextContent('1')

    await gebruiker.click(tab)
    expect(screen.getByText('Nog geen leningen ingegeven.')).toBeInTheDocument()
  })

  it('zet maar één gevulde knop op het blok "Openstaand", ook al staan er twee formulieren', async () => {
    // DESIGN.md, regel 2: hoogstens één gevulde knop per scherm. Dit blok toont het
    // rekeningformulier én het leningformulier tegelijk; zonder deze regel schreeuwen
    // twee amberkleurige knoppen tegelijk om aandacht en weet je niet welke de
    // hoofdactie is. Een meting in de browser ving dit; de test houdt het vast.
    const gebruiker = userEvent.setup()
    const { container } = toon()
    await gebruiker.click(screen.getByRole('tab', { name: /Openstaand/ }))
    expect(container.querySelectorAll('.knop-primair')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Rekening toevoegen' })).toHaveClass('knop-primair')
    expect(screen.getByRole('button', { name: 'Lening toevoegen' })).toHaveClass('knop-secundair')
  })

  it('brengt je vanuit de lijsten naar de Budget-pagina', async () => {
    const gebruiker = userEvent.setup()
    const onNaarPagina = vi.fn()
    toon({ rekeningen: [rekening] }, { onNaarPagina })

    await gebruiker.click(screen.getByRole('tab', { name: /Sluipende kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: 'Naar Budget' }))
    expect(onNaarPagina).toHaveBeenCalledWith('budget')
  })
})

// --- Ronde 48: doorklikken vanaf de tegels -------------------------------------

describe('OpstellingSectie — de tegels van "Dit is je situatie"', () => {
  it('laat netto vermogen doorklikken naar het overzicht, waar dat cijfer staat', async () => {
    const gebruiker = userEvent.setup()
    const props = toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('button', { name: /^Netto vermogen/ }))
    expect(props.onNaarPagina).toHaveBeenCalledWith('overzicht')
  })

  it('maakt GEEN knop van de vaste lasten en het sluipende deel', () => {
    // De blokken hieronder zijn aanvinklijsten met voorstellen, geen uitsplitsing
    // met bedragen — en op Budget staat een gelijkaardig label met een ander getal.
    // Een knop die belooft te tonen waaruit een bedrag bestaat en dat niet doet, is
    // erger dan geen knop.
    toon({ terugkerendePosten: [{ id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }] })
    expect(screen.queryByRole('button', { name: /^Vaste lasten per maand/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Waarvan sluipend/ })).toBeNull()
  })

  it('maakt geen knop van een tegel die een streepje toont', () => {
    toon()
    expect(screen.queryByRole('button', { name: /^Netto vermogen/ })).toBeNull()
  })
})

// Ronde 63: het achtste blok. Het bestaat alleen wanneer het scherm de knoppen
// ook echt kan aansturen — daarom moeten alle tests hierboven, die géén `veilig`
// meegeven, zeven blokken blijven zien.
describe('OpstellingSectie — Veilig bewaren', () => {
  const veilig: VeiligInvoer = {
    verbonden: false,
    bezig: false,
    onVerbind: vi.fn(),
    onSynchroniseer: vi.fn(),
    backupTekst: null,
    onExporteer: vi.fn(),
    onHerstel: vi.fn(),
    vandaagISO: '2026-08-20',
  }

  function toonMetVeilig(over: Partial<typeof veilig> = {}, rest: Partial<typeof leeg> = {}) {
    return render(
      <OpstellingSectie
        {...leeg}
        {...rest}
        onRekening={vi.fn()}
        onLening={vi.fn()}
        onVastePost={vi.fn()}
        onKindToevoegen={vi.fn()}
        onKindWijzigen={vi.fn()}
        onKindVerwijderen={vi.fn()}
        onDossier={vi.fn()}
        onNaarPagina={vi.fn()}
        veilig={{ ...veilig, ...over }}
      />,
    )
  }

  it('bestaat niet zonder de knoppen erachter', () => {
    toon()
    expect(screen.queryByRole('tab', { name: /Veilig bewaren/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(7)
  })

  it('komt erbij als achtste blok', () => {
    toonMetVeilig()
    expect(screen.getAllByRole('tab')).toHaveLength(8)
    expect(screen.getByRole('progressbar', { name: 'Ingevulde blokken' })).toHaveAttribute('aria-valuemax', '8')
  })

  it('zet de drie kaarten bij elkaar, zodat je er niet vijf tikken diep voor moet', async () => {
    const user = userEvent.setup()
    toonMetVeilig()
    await user.click(screen.getByRole('tab', { name: /Veilig bewaren/ }))
    // Op het beginscherm zetten, Drive, en het back-upbestand — op één plek.
    expect(screen.getByRole('button', { name: 'Verbind met Google Drive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exporteer back-up' })).toBeInTheDocument()
    expect(screen.getByText('Waar staan je gegevens?')).toBeInTheDocument()
  })

  // ⚠ Het blok telt VANGNETTEN, geen ingevulde regels. Eén volstaat om het af te
  // vinken; blijvende opslag telt niet mee, want die houdt je gegevens vast in
  // déze browser.
  it('telt niets zolang er geen vangnet is', () => {
    toonMetVeilig()
    const tab = screen.getByRole('tab', { name: /Veilig bewaren/ })
    expect(tab.textContent).not.toMatch(/[12]/)
    expect(screen.getByRole('progressbar', { name: 'Ingevulde blokken' })).toHaveAttribute('aria-valuenow', '0')
  })

  // ⚠ Geteld op wat er GEBEURD is, niet op wat er aanstaat (nakijkronde ronde 63).
  it('telt "verbonden" niet als vangnet zolang er niets vertrok', () => {
    toonMetVeilig({ verbonden: true })
    expect(screen.getByRole('progressbar', { name: 'Ingevulde blokken' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('telt een geslaagde synchronisatie als vangnet', () => {
    toonMetVeilig({ verbonden: true, laatsteSyncOp: '2026-08-15' })
    expect(screen.getByRole('progressbar', { name: 'Ingevulde blokken' })).toHaveAttribute('aria-valuenow', '1')
  })

  it('telt een synchronisatie en een back-upbestand allebei', () => {
    toonMetVeilig({ verbonden: true, laatsteSyncOp: '2026-08-15', laatsteBackupOp: '2026-08-01' })
    expect(screen.getByRole('tab', { name: /Veilig bewaren/ })).toHaveTextContent('2')
  })

  // ⚠ Een vangnet van vorig jaar is geen vangnet. Zou het blok afgevinkt blijven,
  // dan zegt de opstelling "je hebt alle blokken ingevuld" terwijl het belletje
  // ernaast roept dat je laatste back-up zevenhonderd dagen oud is.
  it('telt een oud vangnet niet meer mee', () => {
    toonMetVeilig({ laatsteBackupOp: '2024-08-01' })
    expect(screen.getByRole('progressbar', { name: 'Ingevulde blokken' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('exporteert vanuit de opstelling met dezelfde knop als in Instellingen', async () => {
    const user = userEvent.setup()
    const onExporteer = vi.fn()
    toonMetVeilig({ onExporteer })
    await user.click(screen.getByRole('tab', { name: /Veilig bewaren/ }))
    await user.click(screen.getByRole('button', { name: 'Exporteer back-up' }))
    expect(onExporteer).toHaveBeenCalledTimes(1)
  })
})
