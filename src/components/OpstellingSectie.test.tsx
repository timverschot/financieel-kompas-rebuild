import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Aflossing, Lening, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { OpstellingSectie, type VeiligInvoer } from './OpstellingSectie'
import { formatEuro } from '../utils/format'
import { zetOpmaaktaal } from '../utils/opmaaktaal'

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
      {...(handlers as Record<string, never>)}
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

  // ⚠ RONDE 65. Tien van de voorstellen op dit scherm zijn jaarposten. Het veld
  // vroeg alleen om "bedrag": wie daar zijn maandbedrag intikte, kreeg een post die
  // twaalf keer te klein was, zonder één woord van waarschuwing.
  it('zegt bij elk veld of het om een bedrag per maand of per jaar gaat', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    expect(screen.getByRole('textbox', { name: 'Autoverzekering — bedrag per jaar' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Huur — bedrag per maand' })).toBeInTheDocument()
  })

  it('zet de periode ook in het veld zelf, voor wie geen schermlezer gebruikt', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    expect(screen.getByLabelText('Autoverzekering')).toHaveAttribute('placeholder', 'bedrag per jaar')
    expect(screen.getByLabelText('Huur')).toHaveAttribute('placeholder', 'bedrag per maand')
  })

  it('rekent een jaarbedrag in de bevestiging om naar per maand', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '620')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    // € 620 per jaar wordt € 51,67 per maand in de tegels en de buffer. Staat dat
    // getal er niet bij, dan ontdek je een factor-12-vergissing pas maanden later.
    const melding = await screen.findByText(/Autoverzekering toegevoegd/)
    expect(melding).toHaveTextContent('per jaar')
    expect(melding).toHaveTextContent('51,67')
  })

  it('zegt bij een maandpost gewoon "per maand", zonder omrekening', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    const melding = await screen.findByText(/Huur toegevoegd/)
    expect(melding).toHaveTextContent('per maand')
    expect(melding).not.toHaveTextContent('per jaar')
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

  // ⚠ RONDE 70. De lijst besliste de periodiciteit vóór je: de frequentie kwam uit
  // het voorstel en de eerste vervalmaand werd stil op VOLGENDE maand gezet. Wie een
  // driemaandelijkse factuur heeft die in februari valt, kreeg zo een ritme dat er
  // drie maanden naast zat — en zag dat pas wanneer de vooruitblik het bedrag in de
  // verkeerde maand zette.

  it('toont op elke rij hoe vaak de post terugkomt, met het voorstel als vertrekpunt', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    expect(screen.getByRole('button', { name: /Elke maand · wijzig — Huur/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Eén keer per jaar, vanaf .+ · wijzig — Autoverzekering/ })).toBeInTheDocument()
  })

  it('klapt de keuze pas open als je erom vraagt', async () => {
    // Het drukste scherm van de app: 37 rijen met elk een keuzelijst en een maandveld
    // ernaast zou precies het "te veel tegelijk" opleveren dat deze reeks wegwerkt.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    const knop = screen.getByRole('button', { name: /wijzig — Huur/ })
    expect(knop).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Hoe vaak?')).toBeNull()

    await gebruiker.click(knop)
    expect(knop).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Hoe vaak?')).toBeInTheDocument()
  })

  it('vraagt de eerste vervalmaand pas zodra de post niet meer maandelijks is', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))

    // Maandelijks: er is geen ritme te plaatsen, dus geen veld.
    expect(screen.queryByLabelText('Eerste betaling in')).toBeNull()

    await gebruiker.selectOptions(screen.getByLabelText('Hoe vaak?'), 'kwartaal')
    expect(screen.getByLabelText('Eerste betaling in')).toBeInTheDocument()
  })

  it('laat het woord bij het bedragveld de KEUZE volgen, niet het voorstel', async () => {
    // Anders tik je een kwartaalbedrag in een veld dat "per maand" belooft — dezelfde
    // factorfout die ronde 65 wegnam, alleen met een andere factor.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    await gebruiker.selectOptions(screen.getByLabelText('Hoe vaak?'), 'kwartaal')

    expect(screen.getByLabelText('Huur')).toHaveAttribute('placeholder', 'bedrag per kwartaal')
    expect(screen.getByRole('textbox', { name: 'Huur — bedrag per kwartaal' })).toBeInTheDocument()
  })

  it('bewaart de gekozen frequentie en de gekozen vervalmaand', async () => {
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    await gebruiker.selectOptions(screen.getByLabelText('Hoe vaak?'), 'kwartaal')
    await gebruiker.clear(screen.getByLabelText('Eerste betaling in'))
    await gebruiker.type(screen.getByLabelText('Eerste betaling in'), '2027-02')
    await gebruiker.type(screen.getByLabelText('Huur'), '300')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    // Februari, niet "volgende maand": vanaf hier telt het ritme door naar mei,
    // augustus en november. Dat is precies waarom dit veld bestaat.
    expect(onVastePost.mock.calls[0][0].frequentie).toBe('kwartaal')
    expect(onVastePost.mock.calls[0][0].startMaand).toBe('2027-02')
  })

  it('laat een maandelijkse keuze zonder frequentie en zonder startmaand weg', async () => {
    // Een maandpost heeft geen ritme te plaatsen; die twee velden horen dan niet in
    // het record te staan.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Autoverzekering/ }))
    await gebruiker.selectOptions(screen.getByLabelText('Hoe vaak?'), 'maand')
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '52')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(onVastePost.mock.calls[0][0].frequentie).toBeUndefined()
    expect(onVastePost.mock.calls[0][0].startMaand).toBeUndefined()
  })

  it('voegt niets toe zolang de vervalmaand leeg is', async () => {
    // Zonder startmaand kan `valtInMaand` het ritme niet plaatsen en gedraagt de post
    // zich als maandelijks — een kwartaalfactuur die elke maand meetelt.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    await gebruiker.selectOptions(screen.getByLabelText('Hoe vaak?'), 'kwartaal')
    await gebruiker.clear(screen.getByLabelText('Eerste betaling in'))
    await gebruiker.type(screen.getByLabelText('Huur'), '300')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(onVastePost).not.toHaveBeenCalled()
  })

  it('rekent de bevestiging om met de GEKOZEN frequentie', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    await gebruiker.selectOptions(screen.getByLabelText('Hoe vaak?'), 'semester')
    await gebruiker.type(screen.getByLabelText('Huur'), '300')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    // € 300 per half jaar is € 50 per maand — niet € 300, en niet gedeeld door twaalf.
    const melding = await screen.findByText(/Huur toegevoegd/)
    expect(melding).toHaveTextContent('per half jaar')
    expect(melding).toHaveTextContent('50,00')
  })

  it('leest het ritme van een AL bestaande post uit die post, niet uit het voorstel', async () => {
    // ⚠ De regel op de rij kwam uit de lokale keuze van die rij — ook op een rij waar
    // je niets gekozen had. Stond je autoverzekering al in de app als kwartaalpost
    // vanaf april 2026, dan beweerde het scherm "Eén keer per jaar, vanaf <volgende
    // maand>": een harde uitspraak over gegevens die het nooit gelezen had.
    const gebruiker = userEvent.setup()
    const bestaand: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -15000,
      rekeningId: 'r1',
      dag: 1,
      frequentie: 'kwartaal',
      startMaand: '2026-04',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    const rij = screen.getByText('Autoverzekering').closest('li') as HTMLElement
    expect(within(rij).getByText(/Om de 3 maanden, vanaf april 2026/)).toBeInTheDocument()
    expect(within(rij).queryByText(/Eén keer per jaar/)).toBeNull()
  })

  it('noemt de frequentie ook wanneer een bestaande post geen startmaand heeft', async () => {
    // ⚠ Hier stond eerst "Elke maand", omdat `valtInMaand` zonder startmaand terugvalt
    // op elke maand. Maar `maandbedrag` deelt dan wél door drie, en op Budget → Vast
    // heet diezelfde post "Om de 3 maanden" — twee schermen die iets anders zeggen over
    // één record. De app weet dat het een kwartaalpost is; alleen niet wélke maanden.
    const gebruiker = userEvent.setup()
    // ⚠ WEL een frequentie, GEEN startmaand — dat is precies het geval waarin
    // `valtInMaand` terugvalt op "elke maand". Een post zónder frequentie zou de
    // controle nooit bereiken en zou dus niets bewijzen.
    const bestaand: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Huur',
      bedrag: -95000,
      rekeningId: 'r1',
      dag: 1,
      frequentie: 'kwartaal',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    const rij = screen.getByText('Huur').closest('li') as HTMLElement
    expect(within(rij).getByText('Om de 3 maanden, vanaf een maand die je nog moet kiezen')).toBeInTheDocument()
    expect(within(rij).queryByText('Elke maand')).toBeNull()
  })

  it('laat óók het woord bij het bedrag de bestaande post volgen', async () => {
    // ⚠ De zin kwam uit het record, het woord ernaast nog uit het voorstel. Eén rij las
    // dan tegelijk "Elke maand" en "per jaar": het paneeltje is op een toegevoegde rij
    // verborgen, dus die lokale keuze werd nooit meer gecorrigeerd.
    const gebruiker = userEvent.setup()
    const bestaand: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -5200,
      rekeningId: 'r1',
      dag: 1,
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    const rij = screen.getByText('Autoverzekering').closest('li') as HTMLElement
    expect(within(rij).getByText('Elke maand')).toBeInTheDocument()
    expect(within(rij).getByText('per maand')).toBeInTheDocument()
    expect(within(rij).queryByText('per jaar')).toBeNull()
  })

  it('verwijst pas naar een reden wanneer er ook een staat', async () => {
    // Een `aria-describedby` naar een lege regel is geen beschrijving. Zelfde vorm als
    // in de elf formulieren die deze huisregel al volgen.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    expect(screen.getByRole('button', { name: 'Voeg Huur toe' })).not.toHaveAttribute('aria-describedby')
  })

  it('verzint geen jaartal wanneer je de vervalmaand leegmaakt', async () => {
    // `maandJaarLabel('-01')` maakte er "januari 1900" van: `Number('')` is 0, en nul
    // is een geldig getal, dus de vangregel in datum.ts sloeg niet aan.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    await gebruiker.selectOptions(screen.getByLabelText(/^Hoe vaak\?/), 'kwartaal')
    await gebruiker.clear(screen.getByLabelText(/^Eerste betaling in/))

    expect(screen.queryByText(/1900/)).toBeNull()
    expect(screen.getByRole('button', { name: /vanaf een maand die je nog moet kiezen/ })).toBeInTheDocument()
  })

  it('zegt waarom "Toevoegen" niet kan zolang de vervalmaand ontbreekt', async () => {
    // Huisregel sinds ronde 41: een knop die uitstaat omdat JOUW INVOER onvolledig
    // is, hoort te zeggen wát er ontbreekt — en die reden hoort aan de knop te hangen.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    await gebruiker.selectOptions(screen.getByLabelText(/^Hoe vaak\?/), 'kwartaal')
    await gebruiker.clear(screen.getByLabelText(/^Eerste betaling in/))
    await gebruiker.type(screen.getByLabelText('Huur'), '300')

    const knop = screen.getByRole('button', { name: 'Voeg Huur toe' })
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    const redenId = knop.getAttribute('aria-describedby') as string
    expect(document.getElementById(redenId)?.textContent).toBe('Kies eerst in welke maand de eerste betaling valt.')
  })

  it('geeft elke keuzelijst een eigen naam, ook met twee paneeltjes open', async () => {
    // Elke rij houdt haar eigen open/dicht bij, dus je kan er meerdere tegelijk
    // openzetten — en dan dragen twee keuzelijsten dezelfde toegankelijke naam.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Autoverzekering/ }))

    expect(screen.getByRole('combobox', { name: 'Hoe vaak? — Huur' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Hoe vaak? — Autoverzekering' })).toBeInTheDocument()
  })

  // --- RONDE 71: de dag, het opzijzetten, en een tweede van dezelfde soort ---

  async function openPaneel(gebruiker: ReturnType<typeof userEvent.setup>, naam: string) {
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: new RegExp(`wijzig — ${naam}`) }))
  }

  it('vraagt de dag van de maand in het paneeltje zelf', async () => {
    // ⚠ De dag werd hier stil op vandaag gezet, en wie hem wilde bijstellen moest naar
    // Budget → Vast. Dat is precies de omweg die dit scherm moet wegnemen.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })
    await openPaneel(gebruiker, 'Huur')

    const dagVeld = screen.getByLabelText(/^Dag van de maand/)
    expect(Number((dagVeld as HTMLInputElement).value)).toBeGreaterThanOrEqual(1)
    expect(Number((dagVeld as HTMLInputElement).value)).toBeLessThanOrEqual(28)

    await gebruiker.clear(dagVeld)
    await gebruiker.type(dagVeld, '12')
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(onVastePost.mock.calls[0][0].dag).toBe(12)
  })

  it('weigert een dag buiten 1 tot 28 en zegt waarom', async () => {
    // 29, 30 en 31 bestaan niet in februari; het schema laat ze daarom niet toe.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })
    await openPaneel(gebruiker, 'Huur')
    await gebruiker.clear(screen.getByLabelText(/^Dag van de maand/))
    await gebruiker.type(screen.getByLabelText(/^Dag van de maand/), '31')
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(onVastePost).not.toHaveBeenCalled()
    const knop = screen.getByRole('button', { name: 'Voeg Huur toe' })
    const redenId = knop.getAttribute('aria-describedby') as string
    expect(document.getElementById(redenId)?.textContent).toBe('De dag van de maand is een getal van 1 tot 28.')
  })

  it('biedt het opzijzetten alleen aan bij een kost die niet maandelijks is', async () => {
    // Bij een maandpost zet je niets opzij — je betaalt gewoon. Zelfde regel als op
    // Budget → Vast.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await openPaneel(gebruiker, 'Huur')
    expect(screen.queryByLabelText('Hier maandelijks voor opzijzetten')).toBeNull()

    await gebruiker.selectOptions(screen.getByLabelText(/^Hoe vaak\?/), 'kwartaal')
    expect(screen.getByLabelText('Hier maandelijks voor opzijzetten')).toBeInTheDocument()
  })

  it('bewaart het opzijzetten en zegt het in de bevestiging', async () => {
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })
    await openPaneel(gebruiker, 'Autoverzekering')
    await gebruiker.click(screen.getByLabelText('Hier maandelijks voor opzijzetten'))
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '600')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(onVastePost.mock.calls[0][0].opbouwen).toBe(true)
    expect(await screen.findByText(/per maand voor opzij/)).toBeInTheDocument()
  })

  it('schrijft geen opbouwen weg wanneer je het niet aanvinkt', async () => {
    // Een veld dat "nee" zegt, zegt niets: elk record hoort te dragen wat je écht koos.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '600')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(onVastePost.mock.calls[0][0].opbouwen).toBeUndefined()
  })

  it('zegt in de bevestiging vanaf wanneer een latere kost meetelt', async () => {
    // ⚠ Sinds ronde 71 telt een kost pas mee in de tegels vanaf zijn eerste betaling.
    // Voeg je iets toe dat pas later begint, dan beweegt er zichtbaar niets — en dan
    // lijkt het alsof je invoer niet aankwam.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await openPaneel(gebruiker, 'Autoverzekering')
    await gebruiker.clear(screen.getByLabelText(/^Eerste betaling in/))
    await gebruiker.type(screen.getByLabelText(/^Eerste betaling in/), '2029-03')
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '600')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(await screen.findByText(/per maand vanaf maart 2029/)).toBeInTheDocument()
  })

  it('biedt op een toegevoegde rij een tweede van dezelfde soort aan', async () => {
    // Twee auto's, twee autoverzekeringen. De rij zette zichzelf op slot zodra er één
    // stond, en er was geen weg naar een tweede.
    const gebruiker = userEvent.setup()
    const bestaand: TerugkerendePost = { id: 'p1', omschrijving: 'Autoverzekering', bedrag: -5000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    await gebruiker.click(screen.getByRole('button', { name: 'Voeg nog een Autoverzekering toe' }))
    // Het paneeltje gaat open mét een naamveld, voorgevuld met het voorstel.
    expect((screen.getByLabelText(/^Naam/) as HTMLInputElement).value).toBe('Autoverzekering')
  })

  it('bewaart die tweede kost onder de naam die jij eraan geeft', async () => {
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    const bestaand: TerugkerendePost = { id: 'p1', omschrijving: 'Autoverzekering', bedrag: -5000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] }, { onVastePost })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg nog een Autoverzekering toe' }))

    await gebruiker.clear(screen.getByLabelText(/^Naam/))
    await gebruiker.type(screen.getByLabelText(/^Naam/), 'Autoverzekering scooter')
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '180')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(onVastePost.mock.calls[0][0].omschrijving).toBe('Autoverzekering scooter')
  })

  it('weigert een tweede kost met dezelfde naam als een bestaande', async () => {
    // ⚠ Twee posten die allebei "Autoverzekering" heten zijn in je lijsten, je
    // grafieken en je belletje niet uit elkaar te houden — en de aanvinklijst zou de
    // tweede nooit meer terugvinden.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    const bestaand: TerugkerendePost = { id: 'p1', omschrijving: 'Autoverzekering', bedrag: -5000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] }, { onVastePost })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg nog een Autoverzekering toe' }))
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '180')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(onVastePost).not.toHaveBeenCalled()
    const knop = screen.getByRole('button', { name: 'Voeg Autoverzekering toe' })
    const redenId = knop.getAttribute('aria-describedby') as string
    expect(document.getElementById(redenId)?.textContent).toMatch(/al een vaste last met die naam/)
  })

  it('zegt onder de tegel wat er nog niet meetelt', async () => {
    // Een kost die pas later begint, raakt "Vaste lasten per maand" niet. Zonder deze
    // zin lijkt de tegel te laag zonder dat iets zegt waarom.
    const later: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -60000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'semester',
      startMaand: '2029-03',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [later] })
    const blok = screen.getByText('Vaste lasten per maand').closest('.stat') as HTMLElement
    expect(blok.querySelector('.getal-bron')?.textContent).toContain('telt hier nog niet mee')
  })

  it('zet een kost die pas later begint tóch op "toegevoegd" (ronde 71)', async () => {
    // ⚠ DE ZWAARSTE FOUT VAN DEZE RONDE. De begincontrole zat óók in de lijst die de
    // aanvinklijst voedt. Gevolg: elke jaarpost die je toevoegde — standaard "eerste
    // betaling volgende maand" — verdween meteen weer uit de lijst. Het bedragveld
    // bleef leeg en open, de badge kwam nooit, en wie het opnieuw intikte kreeg een
    // tweede identieke post zonder één waarschuwing.
    const gebruiker = userEvent.setup()
    const later: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -60000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      startMaand: '2029-03',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [later] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))

    const rij = screen.getByText('Autoverzekering').closest('li') as HTMLElement
    expect(within(rij).getByText('toegevoegd')).toBeInTheDocument()
    expect(within(rij).getByText(/Eén keer per jaar, vanaf maart 2029/)).toBeInTheDocument()
    // En dus ook bereikbaar voor een tweede van dezelfde soort.
    expect(screen.getByRole('button', { name: 'Voeg nog een Autoverzekering toe' })).toBeInTheDocument()
  })

  it('laat de rij zich tijdens "Nog een" als een verse rij gedragen (ronde 71)', async () => {
    // ⚠ `effectieveFrequentie` las de BESTAANDE post, ook in de extra-modus. Dan stond
    // de keuzelijst op "Eén keer per jaar" terwijl het bedragveld "per maand" beloofde
    // — en wie daar zijn maandbedrag intikte, kreeg een jaarpost die twaalf keer te
    // klein was.
    const gebruiker = userEvent.setup()
    const bestaand: TerugkerendePost = { id: 'p1', omschrijving: 'Autoverzekering', bedrag: -5000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg nog een Autoverzekering toe' }))

    // Het voorstel is een jaarpost, dus het woord bij het bedrag hoort "per jaar" te zijn.
    expect(screen.getByLabelText('Autoverzekering')).toHaveAttribute('placeholder', 'bedrag per jaar')
    // En je kan er weer uit: de wijzig-knop staat er nog.
    expect(screen.getByRole('button', { name: /wijzig — Autoverzekering/ })).toBeInTheDocument()
  })

  it('weigert een naam die bij een ándere rij van de lijst hoort (ronde 71)', async () => {
    // Noem je je tweede autoverzekering "Huur", dan zou de rij Huur die post daarna als
    // de hare herkennen — met de categorie van de autoverzekering in je grafieken.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    const bestaand: TerugkerendePost = { id: 'p1', omschrijving: 'Autoverzekering', bedrag: -5000, rekeningId: 'r1', dag: 1 }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] }, { onVastePost })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg nog een Autoverzekering toe' }))
    await gebruiker.clear(screen.getByLabelText(/^Naam/))
    await gebruiker.type(screen.getByLabelText(/^Naam/), 'Huur')
    await gebruiker.type(screen.getByLabelText('Autoverzekering'), '180')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Autoverzekering toe' }))

    expect(onVastePost).not.toHaveBeenCalled()
  })

  it('houdt het paneeltje open zolang er iets in ontbreekt (ronde 71)', async () => {
    // Een reden die verwijst naar een veld dat je niet ziet, is geen reden.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await openPaneel(gebruiker, 'Huur')
    await gebruiker.clear(screen.getByLabelText(/^Dag van de maand/))
    // Dichtklappen mag niet lukken zolang de dag ontbreekt.
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Huur/ }))
    expect(screen.getByLabelText(/^Dag van de maand/)).toBeInTheDocument()
  })

  it('geeft ook het vinkje een eigen naam met twee paneeltjes open (ronde 71)', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await openPaneel(gebruiker, 'Autoverzekering')
    await gebruiker.click(screen.getByRole('button', { name: /wijzig — Hospitalisatieverzekering/ }))

    expect(
      screen.getByRole('checkbox', { name: 'Hier maandelijks voor opzijzetten — Autoverzekering' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Hier maandelijks voor opzijzetten — Hospitalisatieverzekering' }),
    ).toBeInTheDocument()
  })

  it('vraagt geen spaarrekening die je al hebt (ronde 71)', async () => {
    // ⚠ `bruikbaar` is ook onwaar zonder lopende vaste lasten. Sinds deze ronde valt
    // een kost die pas later begint in die groep — en dan vroeg dit scherm je een
    // spaarrekening toe te voegen die er gewoon stond.
    const later: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -60000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      startMaand: '2029-03',
    }
    toon({ rekeningen: [rekening, spaar], terugkerendePosten: [later] })
    expect(screen.queryByText(/heeft de app een spaarrekening of cash nodig\. Voeg er een toe/)).toBeNull()
    expect(screen.getByText(/Je vaste lasten beginnen pas later/)).toBeInTheDocument()
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
    //
    // ⚠ RONDE 66, slotronde: deze test dwong de mislukking af door GEEN rekening te
    // geven. Dat kan niet meer — zonder rekening toont het blok nu de eerste stap in
    // plaats van invulvelden. De mislukking komt nu van de opslag zelf, wat het
    // eerlijkere geval is: een echte schrijffout, met je bedrag al ingetikt.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] }, { onVastePost: vi.fn().mockRejectedValue(new Error('schijf vol')) })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    expect(screen.getByLabelText('Huur')).toHaveValue('950')
  })

  it('zegt de reden in de rij zelf, niet bovenaan de pagina', async () => {
    // Bovenaan staat ze bij regel vijftien van de lijst volledig buiten beeld.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] }, { onVastePost: vi.fn().mockRejectedValue(new Error('schijf vol')) })
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    await gebruiker.type(screen.getByLabelText('Huur'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Voeg Huur toe' }))

    const rij = screen.getByLabelText('Huur').closest('li') as HTMLElement
    expect(within(rij).getByRole('alert')).toHaveTextContent(/Toevoegen is niet gelukt/)
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

  it('stelt volgende maand voor als eerste vervalmaand van een jaarpost', async () => {
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

  it('laat je zonder rekening niet eerst twintig bedragen intikken', async () => {
    // ⚠ RONDE 66, slotronde. Vroeger stonden hier gewoon de invulvelden, en kwam de
    // melding "Maak eerst een rekening aan bij Je geld" pas bij het aanvinken — een
    // zin die de bestemming noemt maar er niet heen brengt, en je invoer was weg.
    // Nu begint het blok er niet eens aan en staat de weg erheen er meteen bij.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({}, { onVastePost })

    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
    expect(screen.queryByLabelText('Huur')).toBeNull()
    expect(screen.getByText(/een vaste kost moet ergens vanaf gaan/)).toBeInTheDocument()

    await gebruiker.click(screen.getByRole('button', { name: 'Maak een rekening aan' }))
    await vi.waitFor(() => expect(document.activeElement).toBe(document.getElementById('opstelling-tab-rekeningen')))
    expect(onVastePost).not.toHaveBeenCalled()
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
    await gebruiker.click(screen.getByRole('button', { name: 'Naar je vaste lasten' }))
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

// --- Ronde 66, slotronde: de welkomstknop moet ook iets doen wanneer het blok al open staat ---
describe('OpstellingSectie — de eerste stap op de pagina zelf', () => {
  it('brengt de tab "Je geld" in beeld en geeft ze de focus', async () => {
    // ⚠ De knop riep `setBlok('rekeningen')` aan terwijl dat AL het standaardblok
    // is. Op een gloednieuwe app — precies waar deze kaart voor bestaat — gebeurde
    // er dus zichtbaar niets: het blok stond open, en de tabstrook staat onder de
    // vouw. Nu krijgt de tab de focus, zodat de knop altijd ergens toe leidt.
    const user = userEvent.setup()
    toon()
    const knop = screen.getByRole('button', { name: 'Begin bij "Je geld"' })
    await user.click(knop)
    const tab = document.getElementById('opstelling-tab-rekeningen')
    expect(tab).not.toBeNull()
    await vi.waitFor(() => expect(document.activeElement).toBe(tab))
  })

  it('toont de welkomstkaart niet meer zodra er een rekening is', () => {
    toon({ rekeningen: [rekening] })
    expect(screen.queryByRole('button', { name: 'Begin bij "Je geld"' })).toBeNull()
  })

  it('opent het blok waar de oproeper om vraagt', async () => {
    // ⚠ RONDE 66, slotronde. "Stel je gezinsleden in" op de pagina "Wat kost elk
    // gezinslid?" zette je hier neer met het REKENINGformulier voor je neus; het
    // blok "Je gezin" moest je zelf nog zoeken in een strook die onder de vouw
    // staat. Hetzelfde probleem dat `gaNaarBudget(tab)` voor Budget al oploste.
    toon({ rekeningen: [rekening] }, { naarBlok: 'gezin', naarBlokNr: 1 })
    expect(screen.getByRole('tab', { name: /Je gezin/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Je geld/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('wist je invoer niet wanneer een knop je naar het blok stuurt waar je al staat', async () => {
    // ⚠ DIT is waarom er een teller is en geen `key` op deze component. Met een
    // nieuwe sleutel hermonteert het hele scherm en is alles weg wat je net had
    // ingetikt. En dat gebeurt écht: de ➕ staat op élke pagina, en zonder rekening
    // wijst haar eerste stap hierheen — naar het blok waar je op dat moment al staat.
    const gebruiker = userEvent.setup()
    const { rerender } = toon({ rekeningen: [rekening] }, { naarBlok: 'rekeningen', naarBlokNr: 1 })
    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Spaarpot')

    rerender(
      <OpstellingSectie
        {...leeg}
        rekeningen={[rekening]}
        onRekening={vi.fn()}
        onLening={vi.fn()}
        onVastePost={vi.fn()}
        onKindToevoegen={vi.fn()}
        onKindWijzigen={vi.fn()}
        onKindVerwijderen={vi.fn()}
        onDossier={vi.fn()}
        onNaarPagina={vi.fn()}
        naarBlok="rekeningen"
        naarBlokNr={2}
      />,
    )
    expect(screen.getByRole('tab', { name: /Je geld/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Rekeningnaam')).toHaveValue('Spaarpot')
  })
})

// ---------------------------------------------------------------------------
// Ronde 69 — "Zo lang kom je toe": de telfout en de decimale komma
//
// Deze tegel toonde vroeger `t('{n} maanden', …)` zonder enkelvoudsgeval, dus las je
// tussen 1,0 en 1,09 maand "1 maanden". `BufferRegel` vangt exact dat geval al op,
// met exact dezelfde cijfers uit dezelfde `bepaalBuffer` — hetzelfde getal op twee
// schermen, twee uitkomsten. En `.replace('.', ',')` duwde er ook in het Engels een
// decimale komma in ("5,2 months"), terwijl `toLocaleString(opmaakLocale())` dat in
// elke taal juist doet. De tweelingtest staat in BufferRegel.test.tsx; zonder deze
// hier kon de fout op dit scherm ongemerkt terugkomen.

describe('OpstellingSectie — "Zo lang kom je toe" telt en schrijft juist', () => {
  // Dezelfde opstelling als in BufferRegel.test.tsx: één spaarrekening tegenover
  // één maandelijkse vaste last.
  const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }

  afterEach(() => zetOpmaaktaal('nl'))

  it('zegt "1 maand" en niet "1 maanden" bij precies één maand buffer', () => {
    // € 950 spaargeld tegenover € 950 vaste lasten = precies 1 maand.
    toon({ rekeningen: [{ ...spaar, beginsaldo: 95000 }], terugkerendePosten: [huur] })
    expect(tegel('Zo lang kom je toe')).toBe('1 maand')
  })

  it('schrijft de decimaal met het scheidingsteken van de gekozen taal', () => {
    // € 5.000 / € 950 = 5,26 → naar beneden op één decimaal: 5,2.
    toon({ rekeningen: [{ ...spaar, beginsaldo: 500000 }], terugkerendePosten: [huur] })
    expect(tegel('Zo lang kom je toe')).toBe('5,2 maanden')
  })

  it('gebruikt in het Engels een punt en dwingt er geen komma in', () => {
    // ⚠ Dit is de regressie die `.replace('.', ',')` maakte: een Engelstalig scherm
    // met "5,2" erin. De opmaaktaal staat los van de vertaling en stuurt hier de
    // `toLocaleString`; de rest van de zin blijft dus Nederlands, en dat is precies
    // wat deze test wil isoleren.
    zetOpmaaktaal('en')
    toon({ rekeningen: [{ ...spaar, beginsaldo: 500000 }], terugkerendePosten: [huur] })
    expect(tegel('Zo lang kom je toe')).toBe('5.2 maanden')
  })
})

// ---------------------------------------------------------------------------
// Ronde 69 — de vier herkomstzinnen op "Dit is je situatie"
//
// Elk van de vier tegels vertelt onder haar cijfer waar dat cijfer vandaan komt.
// Twee dingen moeten daarbij kloppen, en geen van beide werd bewaakt:
//
//  1. De zin hangt aan DEZELFDE voorwaarde als het cijfer. Dit is het eerste scherm
//     van een verse app: vier streepjes met samen ruim vijfhonderd tekens uitleg
//     over berekeningen die er nog niet zijn, is precies het "te veel op één scherm"
//     waar deze reeks vanaf wil.
//  2. "Netto vermogen" is de enige plek in de app die `bron` én `doorklik`
//     combineert. Op een knop vervangt `aria-label` ALLE tekst binnenin, dus zonder
//     `naamMetBron` ziet een ziende gebruiker de uitleg staan en hoort een
//     schermlezer ze niet — het cijfer zonder verantwoording, maar dan alleen voor
//     wie luistert (en in strijd met WCAG 2.5.3, "Label in Name").

describe('OpstellingSectie — elke tegel verantwoordt haar cijfer', () => {
  const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
  const netflix: TerugkerendePost = {
    id: 'p2',
    omschrijving: 'Netflix',
    bedrag: -1399,
    rekeningId: 'r1',
    dag: 1,
    categorieId: 'i-streaming-video-5157',
  }

  // De herkomstzin die onder één tegel staat, opgezocht via haar label.
  function bron(label: string): string {
    const blok = screen.getByText(label).closest('.stat') as HTMLElement
    return blok.querySelector('.getal-bron')?.textContent ?? ''
  }

  function situatie(): HTMLElement {
    return document.querySelector('[data-situatie]') as HTMLElement
  }

  it('zet onder elk van de vier cijfers een zin', () => {
    toon({ rekeningen: [rekening, spaar], terugkerendePosten: [huur, netflix] })
    // Vaste lasten: het verschil met het gelijknamige label op Budget ("deze maand"
    // in plaats van "gemiddeld per maand") stond alleen in de broncode.
    expect(bron('Vaste lasten per maand')).toContain('Omgerekend naar één maand')
    expect(bron('Waarvan sluipend')).toContain('Sluipende kosten')
    expect(bron('Zo lang kom je toe')).toContain('gedeeld door je vaste lasten per maand')
    expect(bron('Netto vermogen')).toContain('Alleen het openstaande kapitaal van een lening')
    // Vier tegels, vier zinnen — geen enkele die er stilletjes bij of af valt.
    expect(situatie().querySelectorAll('.getal-bron')).toHaveLength(4)
  })

  it('zwijgt op een lege app, waar alle vier de tegels een streepje tonen', () => {
    // ⚠ Vier streepjes mét ruim vijfhonderd tekens uitleg eronder is een muur van
    // tekst over cijfers die nog niet bestaan. Staat er een streepje, dan hoort er
    // geen uitleg onder.
    toon()
    expect(tegel('Vaste lasten per maand')).toBe('—')
    expect(tegel('Waarvan sluipend')).toBe('—')
    expect(tegel('Zo lang kom je toe')).toBe('—')
    expect(tegel('Netto vermogen')).toBe('—')
    expect(situatie().querySelectorAll('.getal-bron')).toHaveLength(0)
  })

  it('zet de zin van "Netto vermogen" ook in de naam van de knop', () => {
    // De enige tegel met een bestemming. Zonder `naamMetBron` leest een schermlezer
    // alleen "Netto vermogen € 14.500,00 — bekijk het op je overzicht" voor, zonder
    // één woord over wat er wel en niet in dat bedrag zit.
    toon({ rekeningen: [rekening, spaar], terugkerendePosten: [huur] })
    const knop = screen.getByRole('button', { name: /^Netto vermogen .* bekijk het op je overzicht/ })
    // De zichtbare zin staat er letterlijk achteraan; het scheidingsteken is de punt
    // die `naamMetBron` erbij zet.
    expect(knop.getAttribute('aria-label')).toBe(
      `Netto vermogen ${formatEuro(1450000)} — bekijk het op je overzicht. ` +
        'Je rekeningen, plus wat men jou nog schuldig is, min wat jij nog schuldig bent. ' +
        'Alleen het openstaande kapitaal van een lening; de interest komt daar nog bij.',
    )
  })
})
