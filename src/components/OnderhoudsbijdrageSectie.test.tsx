import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Dossier, Kind, Onderhoudsbetaling, Onderhoudsbijdrage } from '../data/schema'
import { formatEuro } from '../utils/format'

// De PDF-bouwer wordt vervangen: deze tests gaan over het SCHERM. Wat er in het
// document komt, staat in indexatiebriefPdf.test.ts.
const { brief } = vi.hoisted(() => ({ brief: vi.fn() }))
vi.mock('../utils/indexatiebriefPdf', () => ({ exporteerIndexatiebriefPDF: brief }))

const { OnderhoudsbijdrageSectie } = await import('./OnderhoudsbijdrageSectie')

const dossier: Dossier = { id: 'd1', naam: 'Kinderen 2026', aandeelJij: 60 }
const kinderen: Kind[] = [{ id: 'k1', naam: 'Kind 1' }]
const VANDAAG = '2026-07-30'

const bijdrage: Onderhoudsbijdrage = {
  id: 'ob1',
  dossierId: 'd1',
  richting: 'jij-ontvangt',
  basisbedrag: 25000,
  datumRegeling: '2021-09-15',
}

function toon(over: Partial<Parameters<typeof OnderhoudsbijdrageSectie>[0]> = {}) {
  const props = {
    onOpslaan: vi.fn(),
    onVerwijderen: vi.fn(),
    onBetalingOpslaan: vi.fn(),
    onBetalingVerwijderen: vi.fn(),
  }
  render(
    <OnderhoudsbijdrageSectie
      dossier={dossier}
      bijdrage={bijdrage}
      betalingen={[]}
      kinderen={kinderen}
      vandaagISO={VANDAAG}
      {...props}
      {...over}
    />,
  )
  return props
}

beforeEach(() => {
  brief.mockReset()
  brief.mockResolvedValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

describe('OnderhoudsbijdrageSectie — nog niets ingesteld', () => {
  it('biedt één knop om te beginnen', () => {
    toon({ bijdrage: null })
    expect(screen.getByRole('button', { name: 'Onderhoudsbijdrage instellen' })).toBeInTheDocument()
  })

  it('legt uit wat de module doet vóór je begint', () => {
    toon({ bijdrage: null })
    expect(screen.getByText(/jaarlijkse indexatie bijhoudt|jaarlijkse indexatie bij/)).toBeInTheDocument()
  })

  it('maakt een bijdrage aan voor dit dossier', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon({ bijdrage: null })
    await user.click(screen.getByRole('button', { name: 'Onderhoudsbijdrage instellen' }))
    expect(onOpslaan).toHaveBeenCalledTimes(1)
    expect(onOpslaan.mock.calls[0][0]).toMatchObject({ dossierId: 'd1', datumRegeling: VANDAAG })
  })
})

describe('OnderhoudsbijdrageSectie — het bedrag van vandaag', () => {
  it('zet het geïndexeerde bedrag bovenaan', () => {
    toon()
    // € 250,00 x 135,35 (aug 2025) / 112,83 (aug 2021) = € 299,90
    // Consumptieprijzen, niet gezondheidsindex: zie ronde 58.
    const verwacht = Math.round((25000 * 135.35) / 112.83)
    // `<Bedrag>` verdeelt het bedrag over meerdere elementen; daarom op de tekst
    // van het blok zoeken en niet op één element.
    const stat = document.querySelector('.stat') as HTMLElement
    expect(stat.textContent).toContain(formatEuro(verwacht))
  })

  it('zegt erbij dat het geïndexeerd is en wat er in de regeling stond', () => {
    toon()
    expect(screen.getByText(/in de regeling van 2021-09-15 stond/)).toBeInTheDocument()
  })

  it('waarschuwt dat een betaling op het oude bedrag elke maand scheelt', () => {
    // Dit is waarom mensen geld mislopen: de indexatie geldt van rechtswege, maar
    // niemand past de overschrijving vanzelf aan.
    toon()
    expect(document.querySelector('[data-aanpassing]')?.textContent).toMatch(/Sinds 2025-09-15/)
  })

  it('zegt niets over een aanpassing wanneer die er niet is', () => {
    toon({ bijdrage: { ...bijdrage, datumRegeling: '2026-05-01' } })
    expect(document.querySelector('[data-aanpassing]')).toBeNull()
  })

  it('toont het kale basisbedrag wanneer de regeling indexatie uitsluit', () => {
    toon({ bijdrage: { ...bijdrage, geindexeerd: false } })
    const stat = document.querySelector('.stat') as HTMLElement
    expect(stat.textContent).toContain(formatEuro(25000))
    expect(stat.textContent).toContain('gelijk aan het bedrag uit de regeling')
  })
})

describe('OnderhoudsbijdrageSectie — de opbouw', () => {
  it('staat dichtgeklapt: wie het bedrag komt halen, hoeft niet te scrollen', () => {
    toon()
    expect(screen.getByRole('button', { name: 'Toon de opbouw' })).toHaveAttribute('aria-expanded', 'false')
    expect(document.querySelector('[data-opbouw]')).toBeNull()
  })

  it('toont per verjaardag de berekening', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Toon de opbouw' }))
    const blok = document.querySelector('[data-opbouw]') as HTMLElement
    expect(blok).toBeInTheDocument()
    expect(within(blok).getByText('2022-09-15')).toBeInTheDocument()
    // De formule met beide indexcijfers, zodat het na te rekenen is.
    expect(blok.textContent).toContain('124,05')
    expect(blok.textContent).toContain('112,83')
  })

  it('zegt waar de aanvangsindex vandaan komt', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Toon de opbouw' }))
    expect(document.querySelector('[data-opbouw]')?.textContent).toContain('de maand vóór de regeling')
  })

  it('zegt tot welke maand de app cijfers kent', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Toon de opbouw' }))
    expect(document.querySelector('[data-opbouw]')?.textContent).toMatch(/kent cijfers tot/)
    // En met welke reeks ze rekent — een kaal indexcijfer zegt niets (ronde 58).
    expect(document.querySelector('[data-opbouw]')?.textContent).toMatch(/consumptieprijsindex/)
  })

  it('zegt wanneer de eerste verjaardag nog moet komen', async () => {
    const user = userEvent.setup()
    toon({ bijdrage: { ...bijdrage, datumRegeling: '2026-05-01' } })
    await user.click(screen.getByRole('button', { name: 'Toon de opbouw' }))
    expect(document.querySelector('[data-opbouw]')?.textContent).toContain('2027-05-01')
  })
})

describe('OnderhoudsbijdrageSectie — een ontbrekend indexcijfer', () => {
  // Een regeling van september: de verjaardag van 2026 heeft augustus 2026 nodig, en
  // dat cijfer verschijnt pas op het einde van die maand.
  const september: Onderhoudsbijdrage = { ...bijdrage, datumRegeling: '2021-09-10' }

  it('zegt welke maand ontbreekt in plaats van stil een oud bedrag te tonen', () => {
    toon({ bijdrage: september, vandaagISO: '2026-09-20' })
    expect(document.body.textContent).toContain('kent nog geen indexcijfer')
    expect(document.body.textContent).toContain('augustus 2026')
  })

  it('verdwijnt zodra het cijfer zelf is bijgezet', () => {
    toon({
      bijdrage: { ...september, eigenIndexcijfers: { '2026-08': 140.5 } },
      vandaagISO: '2026-09-20',
    })
    expect(document.body.textContent).not.toContain('kent nog geen indexcijfer')
  })
})

describe('OnderhoudsbijdrageSectie — wat er betaald is', () => {
  const betalingen: Onderhoudsbetaling[] = [
    { id: 'b1', bijdrageId: 'ob1', datum: '2026-07-01', bedrag: 30079 },
    { id: 'b2', bijdrageId: 'ob1', datum: '2026-06-01', bedrag: 30079 },
  ]

  it('staat dichtgeklapt — het is een gevoelig getal', () => {
    toon({ betalingen })
    expect(document.querySelector('[data-achterstand]')).toBeNull()
  })

  it('toont verschuldigd, betaald en het verschil', async () => {
    const user = userEvent.setup()
    toon({ betalingen })
    await user.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    const blok = document.querySelector('[data-achterstand]') as HTMLElement
    expect(within(blok).getByText('Verschuldigd')).toBeInTheDocument()
    expect(within(blok).getByText('Betaald')).toBeInTheDocument()
    expect(blok.textContent).toContain('open')
  })

  it('zegt hoe er geteld is', async () => {
    // Zonder die zin is het getal niet te plaatsen.
    const user = userEvent.setup()
    toon({ betalingen })
    await user.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    expect(document.querySelector('[data-achterstand]')?.textContent).toContain('Per maand geteld')
  })

  it('noemt te veel betaald geen achterstand', async () => {
    // Ruim meer dan het totaal over 59 maanden, zodat het saldo zeker positief is
    // voor de betaler.
    const user = userEvent.setup()
    toon({ betalingen: [{ id: 'b1', bijdrageId: 'ob1', datum: '2026-07-01', bedrag: 50_000_00 }] })
    await user.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    // Vooruitbetalen mag; dat is geen fout en hoort dus geen fout te heten.
    expect(document.querySelector('[data-open]')?.textContent).toContain('meer ontvangen dan berekend')
  })

  it('registreert een nieuwe betaling', async () => {
    const user = userEvent.setup()
    const { onBetalingOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    await user.type(screen.getByLabelText('Bedrag'), '300,79')
    await user.click(screen.getByRole('button', { name: 'Betaling toevoegen' }))
    expect(onBetalingOpslaan).toHaveBeenCalledTimes(1)
    expect(onBetalingOpslaan.mock.calls[0][0]).toMatchObject({ bijdrageId: 'ob1', bedrag: 30079 })
  })

  it('weigert een leeg of nul-bedrag met een zichtbare melding', async () => {
    const user = userEvent.setup()
    const { onBetalingOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    await user.click(screen.getByRole('button', { name: 'Betaling toevoegen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Vul een bedrag groter dan nul in.')
    expect(onBetalingOpslaan).not.toHaveBeenCalled()
  })

  it('laat een betaling verwijderen', async () => {
    const user = userEvent.setup()
    const { onBetalingVerwijderen } = toon({ betalingen })
    await user.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    await user.click(screen.getByRole('button', { name: 'Verwijder betaling van 2026-07-01' }))
    expect(onBetalingVerwijderen).toHaveBeenCalledWith('b1')
  })
})

describe('OnderhoudsbijdrageSectie — de regeling wijzigen', () => {
  it('bewaart bedrag, datum en richting', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    const bedrag = screen.getByLabelText('Bedrag in de regeling')
    await user.clear(bedrag)
    await user.type(bedrag, '300,00')
    await user.selectOptions(screen.getByLabelText('Richting'), 'jij-betaalt')
    await user.click(screen.getByRole('button', { name: 'Bewaar de regeling' }))
    expect(onOpslaan.mock.calls[0][0]).toMatchObject({ basisbedrag: 30000, richting: 'jij-betaalt' })
  })

  it('waarschuwt over basisjaren bij de aanvangsindex', async () => {
    // Dit is de valkuil van het hele onderwerp; ze hoort op het scherm te staan en
    // niet enkel in de documentatie.
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    expect(document.querySelector('[data-regeling]')?.textContent).toContain('basis 2013 = 100')
  })

  it('laat indexeren uitzetten wanneer de akte dat bepaalt', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.click(screen.getByLabelText(/Jaarlijks indexeren/))
    await user.click(screen.getByRole('button', { name: 'Bewaar de regeling' }))
    expect(onOpslaan.mock.calls[0][0].geindexeerd).toBe(false)
  })

  it('voegt een eigen indexcijfer toe voor een maand die de app niet kent', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.type(screen.getByLabelText('Maand'), '2026-08')
    await user.type(screen.getByLabelText('Consumptieprijsindex'), '140,50')
    await user.click(screen.getByRole('button', { name: 'Indexcijfer toevoegen' }))
    expect(onOpslaan.mock.calls[0][0].eigenIndexcijfers).toEqual({ '2026-08': 140.5 })
  })

  it('schrijft de gekozen indexreeks weg', async () => {
    // ⚠ Niets bewees dit tot de nakijkronde van ronde 58, terwijl het het hele punt
    // van de ronde is: een akte die de gezondheidsindex noemt, moet die ook krijgen.
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.selectOptions(screen.getByLabelText('Welke index staat er in je akte?'), 'gezondheid')
    await user.click(screen.getByRole('button', { name: 'Bewaar de regeling' }))
    expect(onOpslaan.mock.calls[0][0].indexreeks).toBe('gezondheid')
  })

  it('stempelt de reeks op een eigen indexcijfer', async () => {
    // Zonder dat stempel is een eigen cijfer een kaal getal, en dan kan de brief een
    // reeks noemen met een getal dat er niet in staat.
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.type(screen.getByLabelText('Maand'), '2026-08')
    await user.type(screen.getByLabelText('Consumptieprijsindex'), '140,50')
    await user.click(screen.getByRole('button', { name: 'Indexcijfer toevoegen' }))
    expect(onOpslaan.mock.calls[0][0].eigenIndexreeks).toBe('consumptieprijzen')
  })

  it('weigert een eigen indexcijfer dat uit een ander basisjaar lijkt te komen', async () => {
    // ⚠ Statbel publiceert sinds januari 2026 standaard in basis 2025 = 100, en dit
    // scherm stuurt je naar Statbel. Wie daar juli 2026 opzoekt, ziet 103,60 in plaats
    // van 140,17 — een kwart lager. Zonder deze controle rekende de app een bijdrage
    // van € 383 om naar € 283, met een geloofwaardige brief eronder.
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.type(screen.getByLabelText('Maand'), '2026-08')
    await user.type(screen.getByLabelText('Consumptieprijsindex'), '103,60')
    await user.click(screen.getByRole('button', { name: 'Indexcijfer toevoegen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('basis 2025')
    expect(onOpslaan).not.toHaveBeenCalled()
  })

  it('weigert een eigen indexcijfer zonder maand', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.type(screen.getByLabelText('Consumptieprijsindex'), '140,50')
    await user.click(screen.getByRole('button', { name: 'Indexcijfer toevoegen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Kies een maand')
    expect(onOpslaan).not.toHaveBeenCalled()
  })
})

describe('OnderhoudsbijdrageSectie — met welke reeks (ronde 58)', () => {
  it('zegt op de kaart zelf met welke reeks er gerekend is', () => {
    // ⚠ Niet alleen achter "Toon de opbouw": dit is het bedrag dat mensen
    // overschrijven en in een brief zetten. Een kaal getal is niet na te rekenen.
    toon({ bijdrage: { ...bijdrage, indexreeks: 'consumptieprijzen' } })
    expect(document.querySelector('[data-reeks]')?.textContent).toContain('consumptieprijsindex')
  })

  it('waarschuwt bij een regeling die nog geen reeks gekozen heeft', () => {
    // Vóór ronde 58 rekende de app met de gezondheidsindex. Het bedrag kan dus
    // veranderd zijn zonder dat de gebruiker iets deed — en dat mag niet stil.
    toon({ bijdrage: { ...bijdrage, indexreeks: undefined } })
    expect(document.querySelector('[data-reeks]')?.textContent).toContain('gezondheidsindex')
  })

  it('zwijgt erover wanneer de akte indexatie uitsluit', () => {
    toon({ bijdrage: { ...bijdrage, geindexeerd: false } })
    expect(document.querySelector('[data-reeks]')).toBeNull()
  })
})

describe('OnderhoudsbijdrageSectie — het overzicht als PDF', () => {
  it('geeft het dossier, de bijdrage en de opbouw mee', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Brief met de berekening' }))
    expect(brief).toHaveBeenCalledTimes(1)
    const argumenten = brief.mock.calls[0]
    expect(argumenten[1]).toEqual(dossier)
    expect(argumenten[2]).toEqual(bijdrage)
    // De opbouw, niet opnieuw berekend in de PDF: scherm en document horen exact
    // hetzelfde te tonen.
    expect(argumenten[3]).toMatchObject({ aanvangsindex: 112.83 })
    expect(argumenten[4]).toEqual(kinderen)
  })

  it('meldt dat het bestand gedownload is', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Brief met de berekening' }))
    // Er staan twee status-regels op het scherm (die over ontbrekende indexcijfers
    // is er altijd, ook leeg); zoeken op de tekst is dus preciezer dan op de rol.
    const regels = await screen.findAllByRole('status')
    expect(regels.map((r) => r.textContent).join(' ')).toContain('De brief is gedownload.')
  })

  it('meldt een mislukking in plaats van niets te doen', async () => {
    brief.mockRejectedValue(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Brief met de berekening' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('De brief kon niet gemaakt worden.')
  })
})

describe('OnderhoudsbijdrageSectie — verwijderen', () => {
  it('geeft een knop met een duidelijk label', async () => {
    const user = userEvent.setup()
    const { onVerwijderen } = toon()
    await user.click(screen.getByRole('button', { name: 'Onderhoudsbijdrage verwijderen' }))
    expect(onVerwijderen).toHaveBeenCalledWith('ob1')
  })
})

describe('OnderhoudsbijdrageSectie — een afgelopen regeling', () => {
  const gestopt: Onderhoudsbijdrage = {
    ...bijdrage,
    datumRegeling: '2015-06-01',
    eindDatum: '2018-06-30',
  }

  it('noemt de kop niet "vandaag" maar het einde van de regeling', () => {
    toon({ bijdrage: gestopt })
    expect(document.querySelector('.stat')?.textContent).toContain('Bijdrage bij het einde van de regeling')
  })

  it('zegt tot wanneer de regeling liep', () => {
    toon({ bijdrage: gestopt })
    expect(document.querySelector('[data-gestopt]')?.textContent).toContain('2018-06-30')
  })

  it('indexeert niet door na de einddatum', async () => {
    // Zonder deze grens toonde het scherm elf verjaardagen en een bedrag van 2025
    // voor een regeling die in 2018 stopte.
    const user = userEvent.setup()
    toon({ bijdrage: gestopt })
    await user.click(screen.getByRole('button', { name: 'Toon de opbouw' }))
    const blok = document.querySelector('[data-opbouw]') as HTMLElement
    expect(blok.textContent).toContain('2018-06-01')
    expect(blok.textContent).not.toContain('2019-06-01')
  })

  it('telt geen maanden meer na de einddatum', async () => {
    const user = userEvent.setup()
    toon({ bijdrage: gestopt })
    await user.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    // Juni 2015 tot en met juni 2018 = 37 maanden.
    expect(document.querySelector('[data-achterstand]')?.textContent).toContain('over 37 maand(en)')
  })

  it('laat de einddatum instellen', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.type(screen.getByLabelText('Loopt tot (optioneel)'), '2030-06-30')
    await user.click(screen.getByRole('button', { name: 'Bewaar de regeling' }))
    expect(onOpslaan.mock.calls[0][0].eindDatum).toBe('2030-06-30')
  })
})

describe('OnderhoudsbijdrageSectie — een ongeldige aanvangsindex', () => {
  it('weigert onleesbare invoer in plaats van ze stil weg te gooien', async () => {
    // Stil weggooien liet de berekening terugvallen op de tabel — precies de
    // vermenging van basisjaren waar de waarschuwing ernaast voor bestaat.
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.type(screen.getByLabelText('Aanvangsindex uit de akte (optioneel)'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Bewaar de regeling' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('geen geldig getal')
    expect(onOpslaan).not.toHaveBeenCalled()
  })

  it('aanvaardt een leeg veld gewoon', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await user.click(screen.getByRole('button', { name: 'Bewaar de regeling' }))
    expect(onOpslaan).toHaveBeenCalledTimes(1)
    expect(onOpslaan.mock.calls[0][0].aanvangsindexHandmatig).toBeUndefined()
  })
})

// Twee indexreeksen door elkaar (ronde 47).
//
// De rekenkern weigert dan te rekenen; deze tests leggen vast dat het SCHERM dat
// ook laat zien. De eerste versie van deze reparatie had de waarschuwing wel, maar
// toonde er onderaan nog een openstaand bedrag bij en liet de brief gewoon maken.
describe('OnderhoudsbijdrageSectie — indexcijfers uit twee reeksen', () => {
  // De aanvangsmaand is augustus 2021; de app kent daarvoor 112,83. Een cijfer dat
  // daar ver naast ligt, wijst op een oudere reeks.
  const gemengd: Onderhoudsbijdrage = { ...bijdrage, aanvangsindexHandmatig: 88.5 }

  it('waarschuwt bovenaan, vóór het bedrag', () => {
    toon({ bijdrage: gemengd })
    const waarschuwing = document.querySelector('[data-basisjaar]')
    expect(waarschuwing).not.toBeNull()
    expect(waarschuwing?.textContent).toContain('112,83')
    expect(waarschuwing?.textContent).toContain('88,50')
  })

  it('toont het bedrag uit de regeling en zegt dat er niet geïndexeerd is', () => {
    toon({ bijdrage: gemengd })
    const stat = document.querySelector('.stat') as HTMLElement
    expect(stat.textContent).toContain(formatEuro(25000))
    expect(stat.textContent).toContain('de indexatie is niet berekend')
  })

  it('maakt geen brief zolang het conflict er is', async () => {
    const gebruiker = userEvent.setup()
    toon({ bijdrage: gemengd })
    const knop = screen.getByRole('button', { name: 'Brief met de berekening' })
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    await gebruiker.click(knop)
    expect(brief).not.toHaveBeenCalled()
    // En de knop zegt waarom, in plaats van enkel niet te reageren.
    expect(screen.getByText(/De brief staat uit zolang/)).toBeInTheDocument()
  })

  it('noemt geen openstaand bedrag bij de achterstand', async () => {
    const gebruiker = userEvent.setup()
    toon({ bijdrage: gemengd })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon wat er betaald is' }))
    const open = document.querySelector('[data-open]')
    expect(open?.textContent).toContain('niet te berekenen')
  })

  it('beweert niet dat de eerste verjaardag nog moet komen', async () => {
    const gebruiker = userEvent.setup()
    toon({ bijdrage: gemengd })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon de opbouw' }))
    expect(screen.queryByText(/De eerste verjaardag van de regeling moet nog komen/)).toBeNull()
    expect(screen.getByText(/De opbouw is niet berekend/)).toBeInTheDocument()
  })

  it('stempelt geen basisjaar op een aanvangsindex uit de akte', async () => {
    // Het cijfer komt uit een akte van jaren geleden; in welke reeks het staat weet
    // niemand. Een stempel zou dat als vaststaand vastleggen — precies de fout van
    // de euro's die als centen gelezen werden.
    const gebruiker = userEvent.setup()
    const props = toon()
    await gebruiker.click(screen.getByRole('button', { name: 'Bewerk de regeling' }))
    await gebruiker.type(screen.getByLabelText('Aanvangsindex uit de akte (optioneel)'), '112,83')
    await gebruiker.click(screen.getByRole('button', { name: 'Bewaar de regeling' }))
    expect(props.onOpslaan).toHaveBeenCalled()
    const bewaard = props.onOpslaan.mock.calls[0][0] as Onderhoudsbijdrage
    expect(bewaard.aanvangsindexHandmatig).toBe(112.83)
    expect(bewaard.indexBasisjaar).toBeUndefined()
  })
})
