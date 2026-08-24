import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Aflossing, Categorie, Lening, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { OpstellingSectie, type VeiligInvoer } from './OpstellingSectie'
import { formatEuro } from '../utils/format'
import { zetOpmaaktaal } from '../utils/opmaaktaal'

const leeg = {
  rekeningen: [] as Rekening[],
  transacties: [] as Transactie[],
  overboekingen: [],
  waarderingen: [],
  terugkerendePosten: [] as TerugkerendePost[],
  categorieen: [] as Categorie[],
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

describe('OpstellingSectie — de lijst met voorstellen', () => {
  // ⚠ RONDE 73. Deze lijst droeg per rij een invoerveld, een periodewoord, een
  // uitklappaneel met vier velden én een knop — zevenendertig keer onder elkaar.
  // Timothy: *"Nu zie ik daar een slordige pagina. Ik zie niet in waarom dat invulvak
  // nodig is."* Het invullen gebeurt nu in het volledige formulier van Budget → Vast,
  // in een venster. Wat híér getest wordt, is dus wat dit scherm nog zélf doet:
  // herkennen wat je al hebt, het venster juist voorinvullen, en de weg naar wijzigen
  // en verwijderen.

  async function naarVasteKosten(gebruiker: ReturnType<typeof userEvent.setup>) {
    await gebruiker.click(screen.getByRole('tab', { name: /Vaste kosten/ }))
  }

  it('laat de rij rustig: geen invoerveld en geen periodewoord meer', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await naarVasteKosten(gebruiker)

    expect(screen.queryByRole('textbox', { name: /bedrag per/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /wijzig — Huur/ })).toBeNull()
    // Wat er wél staat: de naam, wat je al hebt, en één knop.
    expect(screen.getByRole('button', { name: /^Huur/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toevoegen — Huur' })).toBeInTheDocument()
  })

  it('opent het volledige formulier, al ingevuld met het voorstel', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Autoverzekering' }))

    const venster = screen.getByRole('dialog')
    expect(within(venster).getByLabelText('Vaste omschrijving')).toHaveValue('Autoverzekering')
    // ⚠ Het ritme komt uit het voorstel: de autoverzekering is een jaarpost. Zonder deze
    // voorinvulling zou je hem als maandelijks wegschrijven en twaalf keer te veel in je
    // vaste lasten zetten.
    expect(within(venster).getByLabelText('Hoe vaak?')).toHaveValue('jaar')
  })

  it('schrijft weg uit welk voorstel de kost komt', async () => {
    // ⚠ Zonder dit veld herkent de lijst haar eigen kosten alleen aan hun NAAM, en dan
    // is een tweede kost met een eigen naam ("Autoverzekering bestelwagen") hier
    // onvindbaar — precies het gat dat ronde 71 openliet.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Huur' }))

    const venster = screen.getByRole('dialog')
    await gebruiker.type(within(venster).getByLabelText('Vast bedrag (€)'), '950')
    await gebruiker.click(within(venster).getByRole('button', { name: 'Vaste post toevoegen' }))

    expect(onVastePost).toHaveBeenCalledWith(
      expect.objectContaining({
        omschrijving: 'Huur',
        bedrag: -95000, // negatief: het is een uitgave
        rekeningId: 'r1',
        categorieId: 'i-huur-4062',
        bronVoorstel: 'huur',
      }),
    )
    // Maandelijks, dus géén frequentie en géén startmaand in het record.
    expect(onVastePost.mock.calls[0][0].frequentie).toBeUndefined()
  })

  it('herkent een hernoemde kost aan haar herkomst, niet aan haar naam', async () => {
    const gebruiker = userEvent.setup()
    const tweede: TerugkerendePost = {
      id: 'p2',
      omschrijving: 'Autoverzekering bestelwagen',
      bedrag: -62000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      startMaand: '2027-03',
      bronVoorstel: 'autoverzekering',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [tweede] })
    await naarVasteKosten(gebruiker)

    const rij = screen.getByRole('button', { name: /^Autoverzekering/ })
    await gebruiker.click(rij)
    expect(screen.getByText('Autoverzekering bestelwagen')).toBeInTheDocument()
  })

  it('blijft een post van vóór deze ronde herkennen aan haar naam', async () => {
    // Alles wat al in de app staat draagt geen herkomst. Zonder die terugval zou
    // iedereen die de app al gebruikte, zijn eigen kosten hier niet meer terugvinden.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening], terugkerendePosten: [{ id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }] })
    await naarVasteKosten(gebruiker)

    expect(screen.getByRole('button', { name: /^Huur/ })).toHaveTextContent(/950,00/)
  })

  it('herkent een post die onder een andere taal weggeschreven is', async () => {
    // De omschrijving die weggeschreven wordt is de VERTAALDE naam. Wie zijn huur ingaf
    // terwijl de app op Frans stond, heeft een post die "Loyer" heet; zet hij de app
    // daarna op Nederlands, dan moet die post nog steeds onder "Huur" verschijnen.
    // Zonder deze herkenning zag hij een lege rij en zette hij zijn huur een tweede keer
    // in zijn vaste lasten.
    //
    // ⚠ Bewust ZONDER `zetOpmaaktaal`: die zet alleen de opmaak van datums en bedragen,
    // niet de schermtaal (die komt uit `TaalContext`, en daar staat hier geen provider
    // boven). Met die regel erbij leek deze test iets te doen wat ze niet deed.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening], terugkerendePosten: [{ id: 'p1', omschrijving: 'Loyer', bedrag: -95000, rekeningId: 'r1', dag: 3 }] })
    await naarVasteKosten(gebruiker)

    expect(screen.getByRole('button', { name: /^Huur/ })).toHaveTextContent(/950,00/)
  })

  it('klapt open en zegt het wanneer er nog niets staat', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await naarVasteKosten(gebruiker)

    const rij = screen.getByRole('button', { name: /^Huur/ })
    expect(rij).toHaveAttribute('aria-expanded', 'false')
    await gebruiker.click(rij)
    expect(rij).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Hier heb je nog niets toegevoegd/)).toBeInTheDocument()
  })

  it('toont in de uitklap het bedrag, het ritme en de dag', async () => {
    const gebruiker = userEvent.setup()
    const post: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -62000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      startMaand: '2027-03',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [post] })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /^Autoverzekering/ }))

    const regel = screen.getByText('Autoverzekering', { selector: '.kost-eigen .rij-titel' }).closest('li') as HTMLElement
    expect(regel.textContent).toContain('620,00')
    expect(regel.textContent).toContain('maart 2027')
    expect(regel.textContent).toContain('dag 5')
  })

  it('opent een bestaande kost in hetzelfde venster', async () => {
    const gebruiker = userEvent.setup()
    const post: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
    toon({ rekeningen: [rekening], terugkerendePosten: [post] })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /^Huur/ }))
    await gebruiker.click(screen.getByRole('button', { name: /^Bewerken — Huur,/ }))

    const venster = screen.getByRole('dialog')
    expect(within(venster).getByLabelText('Vaste omschrijving')).toHaveValue('Huur')
    expect(within(venster).getByLabelText('Vast bedrag (€)')).toHaveValue('950,00')
  })

  it('verwijdert een kost vanuit de uitklap', async () => {
    const gebruiker = userEvent.setup()
    const onVastePostVerwijderen = vi.fn()
    const post: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
    toon({ rekeningen: [rekening], terugkerendePosten: [post] }, { onVastePostVerwijderen })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /^Huur/ }))
    await gebruiker.click(screen.getByRole('button', { name: /^Verwijderen — Huur,/ }))

    expect(onVastePostVerwijderen).toHaveBeenCalledWith('p1')
  })

  it('toont geen verwijderknop wanneer het scherm hem niet kan aansturen', async () => {
    // Dezelfde afspraak als bij "Veilig bewaren": een scherm dat de knop niet kan
    // aansturen, hoort hem niet te tonen.
    const gebruiker = userEvent.setup()
    const post: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
    toon({ rekeningen: [rekening], terugkerendePosten: [post] })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /^Huur/ }))

    expect(screen.getByRole('button', { name: /^Bewerken — Huur,/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Verwijderen — Huur,/ })).toBeNull()
  })

  it('klapt alles open en weer dicht', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await naarVasteKosten(gebruiker)

    await gebruiker.click(screen.getByRole('button', { name: /Klap alles open — Je vaste kosten/ }))
    expect(screen.getByRole('button', { name: /^Huur/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /^Hypotheek/ })).toHaveAttribute('aria-expanded', 'true')

    await gebruiker.click(screen.getByRole('button', { name: /Klap alles dicht — Je vaste kosten/ }))
    expect(screen.getByRole('button', { name: /^Huur/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('toont met de filter alleen wat je al hebt', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening], terugkerendePosten: [{ id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }] })
    await naarVasteKosten(gebruiker)

    const filter = screen.getByRole('button', { name: /Toon alleen wat ik al heb — Je vaste kosten/ })
    expect(filter).toHaveAttribute('aria-pressed', 'false')
    await gebruiker.click(filter)

    expect(screen.getByRole('button', { name: /^Huur/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Hypotheek/ })).toBeNull()
    expect(filter).toHaveAttribute('aria-pressed', 'true')
  })

  it('zegt het wanneer de filter niets overhoudt', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /Toon alleen wat ik al heb — Je vaste kosten/ }))

    expect(screen.getByText(/Zet de filter uit om alle voorstellen te zien/)).toBeInTheDocument()
  })

  it('telt hoeveel voorstellen je al ingevuld hebt', async () => {
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening], terugkerendePosten: [{ id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }] })
    await naarVasteKosten(gebruiker)

    expect(screen.getByText(/Je vulde er 1 van de \d+ in\./)).toBeInTheDocument()
  })

  it('telt niets zolang er geen rekening is', async () => {
    // "0 van 19" boven een leeg blok is een stand van iets wat er niet staat.
    const gebruiker = userEvent.setup()
    toon({})
    await naarVasteKosten(gebruiker)

    expect(screen.queryByText(/Je vulde er/)).toBeNull()
    expect(screen.getByText(/een vaste kost moet ergens vanaf gaan/)).toBeInTheDocument()
  })

  it('laat je niet beginnen zonder rekening, en brengt je naar het juiste blok', async () => {
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({}, { onVastePost })
    await naarVasteKosten(gebruiker)

    expect(screen.queryByRole('button', { name: 'Toevoegen — Huur' })).toBeNull()
    await gebruiker.click(screen.getByRole('button', { name: 'Maak een rekening aan' }))
    await vi.waitFor(() => expect(document.activeElement).toBe(document.getElementById('opstelling-tab-rekeningen')))
    expect(onVastePost).not.toHaveBeenCalled()
  })

  it('hangt een vaste kost aan een betaalrekening, niet aan je spaarboekje', async () => {
    // `standaardRekening` geeft de rekening terug waarop je het laatst boekte; deed je
    // dat toevallig op je spaarrekening, dan hingen hier je twintig vaste lasten aan je
    // spaarboekje.
    const gebruiker = userEvent.setup()
    const spaar: Rekening = { id: 'sp', naam: 'Spaar', beginsaldo: 0, type: 'spaar' }
    const betaal: Rekening = { id: 'bt', naam: 'Zicht', beginsaldo: 0, type: 'betaal' }
    toon({ rekeningen: [spaar, betaal] })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Huur' }))

    expect(within(screen.getByRole('dialog')).getByLabelText('Vaste rekening')).toHaveValue('bt')
  })

  it('hangt een vaste kost nooit aan een gearchiveerde rekening', async () => {
    // Een vaste last aan een afgesloten rekening wordt nooit als betaald herkend en
    // blijft elke maand achterstallig staan.
    const gebruiker = userEvent.setup()
    const oud: Rekening = { id: 'oud', naam: 'Oude', beginsaldo: 0, type: 'betaal', gearchiveerd: true }
    const nieuw: Rekening = { id: 'nw', naam: 'Nieuwe', beginsaldo: 0, type: 'betaal' }
    toon({ rekeningen: [oud, nieuw] })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Huur' }))

    expect(within(screen.getByRole('dialog')).getByLabelText('Vaste rekening')).toHaveValue('nw')
  })

  it('biedt een opgezegd abonnement gewoon opnieuw aan', async () => {
    // Een gestopte post telt niet als "ingevuld": anders kan je je nieuwe abonnement
    // hier niet meer ingeven terwijl de tegels er ook niets van meetellen.
    const gebruiker = userEvent.setup()
    const gestopt: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Netflix',
      bedrag: -1599,
      rekeningId: 'r1',
      dag: 5,
      eindMaand: '2020-01',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [gestopt] })
    await gebruiker.click(screen.getByRole('tab', { name: /Sluipende kosten/ }))

    expect(screen.getByRole('button', { name: /^Netflix/ })).toHaveTextContent('Nog niets toegevoegd')
  })

  it('zet een kost die pas later begint tóch als ingevuld (ronde 71)', async () => {
    // De lijst kijkt naar wat er BESTAAT, niet naar wat er deze maand meetelt. Zou ze
    // dat laatste doen, dan verdween elke jaarpost meteen weer uit beeld en maakte je er
    // ongemerkt een tweede bij.
    const gebruiker = userEvent.setup()
    const later: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -62000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      startMaand: '2099-03',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [later] })
    await naarVasteKosten(gebruiker)

    expect(screen.getByRole('button', { name: /^Autoverzekering/ })).toHaveTextContent(/620,00/)
  })

  // ---- Wat de doorlichting van deze ronde blootlegde ------------------------------

  it('springt met "Opslaan + volgende" naar het eerstvolgende lege voorstel', async () => {
    // ⚠ Deze hele ketting was ongetest: je kon `volgendVoorstel` op `null` zetten of de
    // `key` van het formulier weghalen en alle drieënzestig tests bleven groen.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Huur' }))

    const venster = screen.getByRole('dialog')
    await gebruiker.type(within(venster).getByLabelText('Vast bedrag (€)'), '950')
    await gebruiker.click(within(venster).getByRole('button', { name: 'Opslaan + volgende' }))

    // Het venster blijft open en staat nu op het VOLGENDE voorstel, met zijn eigen naam.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Vaste omschrijving')).toHaveValue('Hypotheek')
    // En het bedrag is leeg: anders schrijf je de huur nog eens weg onder een andere naam.
    expect(screen.getByLabelText('Vast bedrag (€)')).toHaveValue('')
  })

  it('houdt de cursor in het venster na "Opslaan + volgende"', async () => {
    // ⚠ Het formulier wordt hermonteerd bij de sprong, dus de knop waarop je net duwde
    // verdwijnt uit de pagina. De focus viel dan naar `<body>`, en één druk op Tab bracht
    // je op de pagina ACHTER het venster. Dit is dezelfde fout als in ronde 71 bij de
    // knop "Nog een", nu via een andere weg.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] }, { onVastePost: vi.fn() })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Huur' }))
    await gebruiker.type(screen.getByLabelText('Vast bedrag (€)'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Opslaan + volgende' }))

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    // En wel in het veld waar je meteen verder tikt.
    expect(document.activeElement).toBe(screen.getByLabelText('Vast bedrag (€)'))
  })

  it('bevestigt de opslag BINNEN het venster, niet alleen erachter', async () => {
    // ⚠ De melding stond alleen op de pagina. Een popup met `aria-modal` verbergt alles
    // erbuiten, dus je zag na "Opslaan + volgende" enkel een leeg bedragveld — precies
    // hoe "er is niets gebeurd" eruitziet. Dan tik je het bedrag een tweede keer in.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] }, { onVastePost: vi.fn() })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Huur' }))
    await gebruiker.type(screen.getByLabelText('Vast bedrag (€)'), '950')
    await gebruiker.click(screen.getByRole('button', { name: 'Opslaan + volgende' }))

    // ⚠ `within(dialog)`: buiten het venster staat dezelfde zin op de pagina, en die is
    // niet wat hier bewezen moet worden.
    expect(within(screen.getByRole('dialog')).getByText(/Huur bewaard/)).toBeInTheDocument()
  })

  it('sluit het venster wanneer er geen volgend leeg voorstel meer is', async () => {
    // Bleef het openstaan, dan stond er dezelfde titel met een leeg bedragveld — niet te
    // onderscheiden van een mislukking. Nu sluit het, en staat de bevestiging op de
    // pagina waar je ze ziet.
    const gebruiker = userEvent.setup()
    toon({ rekeningen: [rekening] }, { onVastePost: vi.fn() })
    // "Luisterboeken" is het LAATSTE voorstel van de sluipende lijst: daarna is er niets
    // meer om naar te springen.
    await gebruiker.click(screen.getByRole('tab', { name: /Sluipende kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Luisterboeken' }))
    await gebruiker.type(screen.getByLabelText('Vast bedrag (€)'), '9,99')
    await gebruiker.click(screen.getByRole('button', { name: 'Opslaan + volgende' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(/Luisterboeken bewaard/)).toBeInTheDocument()
  })

  it('houdt een hernoemde oude kost op haar plaats in plaats van haar te laten verdwijnen', async () => {
    // ⚠ Een post van vóór deze ronde draagt geen `bronVoorstel`. Hernoemde je hem via
    // "Bewerken", dan heette hij naar geen enkel voorstel meer en verdween hij uit deze
    // lijst — terwijl hij in je vaste lasten gewoon meetelde. Dan zet je hem er nog eens
    // bij. Het venster adopteert hem nu: het voorstel waaronder hij stond gaat mee.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    const oud: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
    toon({ rekeningen: [rekening], terugkerendePosten: [oud] }, { onVastePost })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /^Huur/ }))
    await gebruiker.click(screen.getByRole('button', { name: /^Bewerken — Huur,/ }))

    const venster = screen.getByRole('dialog')
    const naam = within(venster).getByLabelText('Vaste omschrijving')
    await gebruiker.clear(naam)
    await gebruiker.type(naam, 'Huur appartement')
    await gebruiker.click(within(venster).getByRole('button', { name: 'Vaste post wijzigen' }))

    expect(onVastePost).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', omschrijving: 'Huur appartement', bronVoorstel: 'huur' }),
    )
  })

  it('laat de naam winnen van een herkomst die naar iets anders wijst', async () => {
    // Klik je "Toevoegen" bij Huur maar tik je er Netflix van, dan hoort die post onder
    // Netflix te staan — niet voorgoed onder Huur omdat je op de verkeerde rij begon.
    const gebruiker = userEvent.setup()
    const verdwaald: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Netflix',
      bedrag: -1599,
      rekeningId: 'r1',
      dag: 8,
      bronVoorstel: 'huur',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [verdwaald] })
    await naarVasteKosten(gebruiker)
    expect(screen.getByRole('button', { name: /^Huur/ })).toHaveTextContent('Nog niets toegevoegd')

    await gebruiker.click(screen.getByRole('tab', { name: /Sluipende kosten/ }))
    expect(screen.getByRole('button', { name: /^Netflix/ })).toHaveTextContent(/15,99/)
  })

  it('verliest een post niet wanneer haar herkomst niet meer bestaat', async () => {
    // Wordt een `sleutel` in data/opstelling.ts ooit hernoemd, dan zouden alle posten met
    // de oude sleutel stil uit de lijst vallen. De naam vangt dat op.
    const gebruiker = userEvent.setup()
    const oudeSleutel: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Huur',
      bedrag: -95000,
      rekeningId: 'r1',
      dag: 3,
      bronVoorstel: 'huur-van-toen',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [oudeSleutel] })
    await naarVasteKosten(gebruiker)
    expect(screen.getByRole('button', { name: /^Huur/ })).toHaveTextContent(/950,00/)
  })

  it('geeft twee kosten met dezelfde naam een eigen knopnaam', async () => {
    // ⚠ De knop heet bewust altijd "Toevoegen", dus twee posten die allebei "Netflix"
    // heten zijn heel gewoon. Dragen hun knoppen dan dezelfde toegankelijke naam, dan
    // weet een schermlezergebruiker niet welke van de twee hij wist (regel van ronde 66).
    const gebruiker = userEvent.setup()
    const posten: TerugkerendePost[] = [
      { id: 'p1', omschrijving: 'Netflix', bedrag: -1599, rekeningId: 'r1', dag: 8, bronVoorstel: 'netflix' },
      { id: 'p2', omschrijving: 'Netflix', bedrag: -799, rekeningId: 'r1', dag: 20, bronVoorstel: 'netflix' },
    ]
    toon({ rekeningen: [rekening], terugkerendePosten: posten }, { onVastePostVerwijderen: vi.fn() })
    await gebruiker.click(screen.getByRole('tab', { name: /Sluipende kosten/ }))
    await gebruiker.click(screen.getByRole('button', { name: /^Netflix/ }))

    const namen = screen
      .getAllByRole('button', { name: /^Verwijderen — Netflix,/ })
      .map((k) => k.getAttribute('aria-label'))
    expect(namen).toHaveLength(2)
    expect(new Set(namen).size).toBe(2)
  })

  it('houdt een openstaande rij zichtbaar wanneer je haar laatste kost wist', async () => {
    // ⚠ Met de filter aan verdween de hele rij op het moment dat je hem leegmaakte — met
    // je focus erin, en zonder weg terug.
    const gebruiker = userEvent.setup()
    const onVastePostVerwijderen = vi.fn()
    const huurpost: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
    const { rerender } = toon({ rekeningen: [rekening], terugkerendePosten: [huurpost] }, { onVastePostVerwijderen })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /^Toon alleen wat ik al heb/ }))
    await gebruiker.click(screen.getByRole('button', { name: /^Huur/ }))
    await gebruiker.click(screen.getByRole('button', { name: /^Verwijderen — Huur,/ }))
    expect(onVastePostVerwijderen).toHaveBeenCalledWith('p1')

    // De app haalt de post weg; de rij hoort te blijven staan omdat ze openstaat.
    rerender(
      <OpstellingSectie
        {...leeg}
        rekeningen={[rekening]}
        terugkerendePosten={[]}
        onRekening={vi.fn()}
        onLening={vi.fn()}
        onVastePost={vi.fn()}
        onVastePostVerwijderen={onVastePostVerwijderen}
        onKindToevoegen={vi.fn()}
        onKindWijzigen={vi.fn()}
        onKindVerwijderen={vi.fn()}
        onDossier={vi.fn()}
        onNaarPagina={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /^Huur/ })).toBeInTheDocument()
  })

  it('zegt het wanneer een verwijdering mislukt', async () => {
    // Regel sinds ronde 68: een mislukte opslag mag nooit stil blijven. De rij bleef
    // staan en er verscheen geen letter.
    const gebruiker = userEvent.setup()
    const onVastePostVerwijderen = vi.fn().mockRejectedValue(new Error('schijf vol'))
    const huurpost: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
    toon({ rekeningen: [rekening], terugkerendePosten: [huurpost] }, { onVastePostVerwijderen })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: /^Huur/ }))
    await gebruiker.click(screen.getByRole('button', { name: /^Verwijderen — Huur,/ }))

    expect(await screen.findByText(/niet gelukt/)).toBeInTheDocument()
  })

  it('zet de eerste betaling van een jaarpost op de VOLGENDE maand', async () => {
    // ⚠ Op de lopende maand viel de volle jaarpremie meteen vandaag: ze stond op slag in
    // je vooruitblik en in het belletje als nog niet geboekt, voor een premie die je in
    // maart betaalt. Dit was ook de standaard vóór deze ronde.
    const gebruiker = userEvent.setup()
    const onVastePost = vi.fn()
    toon({ rekeningen: [rekening] }, { onVastePost })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Autoverzekering' }))
    await gebruiker.type(screen.getByLabelText('Vast bedrag (€)'), '620')
    await gebruiker.click(screen.getByRole('button', { name: 'Vaste post toevoegen' }))

    const nu = new Date()
    const volgende = new Date(nu.getFullYear(), nu.getMonth() + 1, 1)
    const verwacht = `${volgende.getFullYear()}-${String(volgende.getMonth() + 1).padStart(2, '0')}`
    expect(onVastePost.mock.calls[0][0].startMaand).toBe(verwacht)
  })

  it('waarschuwt wanneer er al een vaste last met die naam staat', async () => {
    // ⚠ Ronde 71 bouwde deze controle in het inline blok; met dat blok verdween ze. Ze
    // hoort in het formulier, want dat is sinds deze ronde de enige weg naar een vaste
    // last. Bewust een waarschuwing en geen blokkade: twee auto's bestaan echt.
    const gebruiker = userEvent.setup()
    const bestaand: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }
    toon({ rekeningen: [rekening], terugkerendePosten: [bestaand] }, { onVastePost: vi.fn() })
    await naarVasteKosten(gebruiker)
    await gebruiker.click(screen.getByRole('button', { name: 'Toevoegen — Huur' }))

    const venster = screen.getByRole('dialog')
    expect(within(venster).getByText(/al een vaste last die zo heet/)).toBeInTheDocument()
    // De opslaanknop blijft gewoon bruikbaar.
    await gebruiker.type(within(venster).getByLabelText('Vast bedrag (€)'), '400')
    expect(within(venster).getByRole('button', { name: 'Vaste post toevoegen' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('telt op het tabblad hetzelfde als in de lijst', async () => {
    // ⚠ De telling op de tab stond op "wat kost mij dit vandaag", de lijst op "heb ik dit
    // al ingegeven". Eén jaarpost die pas volgend jaar begint, en het blok zei "Je vulde
    // er 1 van de 19 in" terwijl de tab geen cijfer toonde en de voortgangsbalk het blok
    // niet aftikte.
    const gebruiker = userEvent.setup()
    const later: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -62000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'jaar',
      startMaand: '2099-03',
    }
    toon({ rekeningen: [rekening], terugkerendePosten: [later] })
    expect(screen.getByRole('tab', { name: /Vaste kosten/ })).toHaveTextContent('1')
    await naarVasteKosten(gebruiker)
    expect(screen.getByText(/Je vulde er 1 van de 19 in/)).toBeInTheDocument()
  })

  it('vat twee kosten samen als een aantal, niet als een opgeteld bedrag', async () => {
    // Twee bedragen met verschillende periodes optellen geeft een getal dat nergens op
    // slaat. Wie het detail wil, klapt open.
    const gebruiker = userEvent.setup()
    const posten: TerugkerendePost[] = [
      { id: 'p1', omschrijving: 'Autoverzekering', bedrag: -62000, rekeningId: 'r1', dag: 5, frequentie: 'jaar', startMaand: '2027-03', bronVoorstel: 'autoverzekering' },
      { id: 'p2', omschrijving: 'Autoverzekering bestelwagen', bedrag: -3000, rekeningId: 'r1', dag: 5, bronVoorstel: 'autoverzekering' },
    ]
    toon({ rekeningen: [rekening], terugkerendePosten: posten })
    await naarVasteKosten(gebruiker)

    const rij = screen.getByRole('button', { name: /^Autoverzekering/ })
    expect(rij).toHaveTextContent('2 kosten toegevoegd')
    expect(rij).not.toHaveTextContent(/650,00/)
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


describe('OpstellingSectie — de tegel volgt Budget (ronde 74)', () => {
  // ⚠ De zin onder "Vaste lasten per maand" zegt letterlijk "dat staat op Budget".
  // Sinds een spaardoel aan een vaste last kan hangen, komt dat bedrag daar uit het
  // doel. Rekende deze zin nog met de kale deling, dan noemde ze een bedrag dat op
  // Budget niet staat — en dan spreken twee schermen elkaar tegen over dezelfde kost.
  const later: TerugkerendePost = {
    id: 'vl1',
    omschrijving: 'Autoverzekering',
    bedrag: -62000,
    rekeningId: 'r1',
    dag: 5,
    frequentie: 'jaar',
    startMaand: '2099-03',
    opbouwen: true,
  }

  it('noemt het bedrag van het spaardoel, niet de kale deling', () => {
    toon({
      rekeningen: [rekening],
      terugkerendePosten: [later],
      spaardoelen: [{ id: 'd1', naam: 'Auto', doelbedrag: 62000, huidigBedrag: 0, vasteLastId: 'vl1', maandbedrag: 7500 }],
    } as never)
    expect(screen.getByText(/Je zet er wel al .*75,00 per maand voor opzij/)).toBeInTheDocument()
  })

  it('noemt de kale deling zolang er geen doel aan hangt', () => {
    toon({ rekeningen: [rekening], terugkerendePosten: [later] })
    expect(screen.getByText(/Je zet er wel al .*51,67 per maand voor opzij/)).toBeInTheDocument()
  })
})
