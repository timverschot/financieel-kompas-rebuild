import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FiscaalSectie } from './FiscaalSectie'
import type { Onderhoudsbetaling, Onderhoudsbijdrage, Transactie } from '../data/schema'
import { formatEuro } from '../utils/format'
import { downloadTekst } from '../utils/download'
import { exporteerFiscaalPDF } from '../utils/fiscaalPdf'

// De download zelf wordt nagebootst; alleen de bestandsnaam-hulp blijft echt, want
// die bepaalt mee wat de gebruiker straks op zijn schijf ziet staan.
vi.mock('../utils/download', async (echt) => ({
  ...(await echt<typeof import('../utils/download')>()),
  downloadTekst: vi.fn(),
}))

// De PDF zelf wordt in `fiscaalPdf.test.ts` nagelezen; hier telt alleen of de knop
// hem opvraagt en wat het scherm daarna zegt.
vi.mock('../utils/fiscaalPdf', () => ({ exporteerFiscaalPDF: vi.fn(async () => {}) }))

// Ronde 50. Dit scherm toont cijfers waarmee iemand zijn belastingaangifte invult.
// De tests hieronder bewaken vooral de GRENS: wat het scherm wél en niet beweert.

const VANDAAG = '2026-08-16'

const tx = (over: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-03-10',
  omschrijving: 'Crèche De Zonnebloem',
  bedrag: -25000,
  rekeningId: 'r1',
  categorieId: 'i-cr-che-9817',
  ...over,
})

function toon(over: Partial<Parameters<typeof FiscaalSectie>[0]> = {}) {
  const onBewerkTransactie = vi.fn()
  render(
    <FiscaalSectie transacties={[]} vandaagISO={VANDAAG} onBewerkTransactie={onBewerkTransactie} {...over} />,
  )
  return { onBewerkTransactie }
}

function kaartVan(postId: string): HTMLElement {
  return document.querySelector(`[data-post="${postId}"]`) as HTMLElement
}

beforeEach(() => {
  vi.mocked(downloadTekst).mockReset()
  vi.mocked(exporteerFiscaalPDF).mockReset()
  vi.mocked(exporteerFiscaalPDF).mockResolvedValue(undefined)
})

describe('FiscaalSectie — het jaartal', () => {
  it('zegt in één zin welk inkomstenjaar bij welk aanslagjaar hoort', () => {
    // De meest gemaakte fout in dit onderwerp, dus ze staat bovenaan het scherm.
    toon({ transacties: [tx({ id: 'a' })] })
    expect(screen.getByText(/Wat je in 2026 betaalde, geef je aan in de aangifte van aanslagjaar 2027/)).toBeInTheDocument()
  })
})

describe('FiscaalSectie — de grens van wat de app beweert', () => {
  it('zegt met zoveel woorden dat ze niet uitrekent wat je terugkrijgt', () => {
    toon({ transacties: [tx({ id: 'a' })] })
    expect(screen.getByText(/Ze rekent niet uit wat je terugkrijgt/)).toBeInTheDocument()
    expect(screen.getByText(/geen belastingadvies/)).toBeInTheDocument()
  })

  it('waarschuwt bij een post waar het attest het bedrag bepaalt', () => {
    toon({ transacties: [tx({ id: 'a' })] })
    const kaart = kaartVan('kinderopvang')
    expect(kaart.querySelector('[data-attest]')?.textContent).toMatch(/PER OPVANGDAG/)
  })

  it('noemt geen aftrekbaar deel bij een post waar de wet er geen vastlegt', () => {
    toon({ transacties: [tx({ id: 'a' })] })
    expect(kaartVan('kinderopvang').querySelector('[data-aftrekbaar]')).toBeNull()
  })
})

describe('FiscaalSectie — het vak en de code', () => {
  it('zet het vak en de code onder de titel, want dat is wat je overtypt', () => {
    toon({ transacties: [tx({ id: 'a' })] })
    expect(within(kaartVan('kinderopvang')).getByText(/Vak X · code 1384/)).toBeInTheDocument()
  })

  it('zegt het wanneer de code van je eigen situatie afhangt', () => {
    // Bij de woonlening verschilt de code per leningjaar; een verkeerde code in een
    // aangifte is erger dan geen code.
    toon({ transacties: [tx({ id: 'h', categorieId: 'i-hypotheek-8607', bedrag: -95000 })] })
    expect(within(kaartVan('woonlening')).getByText(/de code hangt af van je situatie/)).toBeInTheDocument()
  })
})

describe('FiscaalSectie — betaalde onderhoudsuitkeringen', () => {
  const bijdrage: Onderhoudsbijdrage = {
    id: 'ob1',
    dossierId: 'd1',
    richting: 'jij-betaalt',
    basisbedrag: 30000,
    datumRegeling: '2022-06-15',
  }
  const betaling: Onderhoudsbetaling = { id: 'p1', bijdrageId: 'ob1', datum: '2026-02-05', bedrag: 30000 }

  it('noemt het aftrekbare deel met het percentage van dat betalingsjaar', () => {
    toon({ onderhoudsbijdragen: [bijdrage], onderhoudsbetalingen: [betaling] })
    const regel = kaartVan('onderhoudsuitkeringen').querySelector('[data-aftrekbaar]')
    expect(regel?.textContent).toContain('60%')
    expect(regel?.textContent).toContain(formatEuro(18000))
  })
})

describe('FiscaalSectie — de boekingen erachter', () => {
  it('houdt de lijst dicht tot je erom vraagt, en opent dan een boeking', async () => {
    const gebruiker = userEvent.setup()
    const boeking = tx({ id: 'a' })
    const { onBewerkTransactie } = toon({ transacties: [boeking] })
    const kaart = kaartVan('kinderopvang')
    expect(kaart.querySelector('.lijst')).toBeNull()
    await gebruiker.click(within(kaart).getByRole('button', { name: /Toon de 1 boeking/ }))
    await gebruiker.click(within(kaart).getByRole('button', { name: /^Crèche De Zonnebloem/ }))
    expect(onBewerkTransactie).toHaveBeenCalledWith(boeking)
  })
})

describe('FiscaalSectie — posten die niet meer bestaan', () => {
  it('toont ze apart zodra je er nog boekingen onder hebt', () => {
    // Wie jarenlang dienstencheques inbracht, zoekt anders naar een vak dat weg is.
    toon({ transacties: [tx({ id: 'dc', categorieId: 'i-dienstencheques-9094', bedrag: -9000 })] })
    const blok = document.querySelector('[data-vervallen]') as HTMLElement
    expect(blok).not.toBeNull()
    expect(within(blok).getByText('Dienstencheques')).toBeInTheDocument()
  })

  it('zwijgt erover wanneer je er niets onder hebt', () => {
    toon({ transacties: [tx({ id: 'a' })] })
    expect(document.querySelector('[data-vervallen]')).toBeNull()
  })
})

describe('FiscaalSectie — wat de app NIET vond', () => {
  it('somt de posten op waar ze niets vond, in plaats van ze te laten verdwijnen', () => {
    // Anders zie je niet dat de app ergens gekeken heeft, en denk je dat een post
    // niet bestaat terwijl je hem alleen anders geboekt hebt.
    toon({ transacties: [tx({ id: 'a' })] })
    const blok = document.querySelector('[data-leegeposten]') as HTMLElement
    expect(within(blok).getByText('Giften')).toBeInTheDocument()
  })
})

describe('FiscaalSectie — een jaar dat de app niet beschrijft', () => {
  it('zegt dat, in plaats van een korte lijst te tonen', async () => {
    const gebruiker = userEvent.setup()
    toon({ transacties: [tx({ id: 'a' }), tx({ id: 'oud', datum: '2019-05-05' })] })
    // 2019 valt buiten het bestand, dus die staat niet eens in de keuzelijst.
    const keuze = screen.queryByLabelText('Inkomstenjaar')
    expect(keuze).toBeNull()
    await gebruiker.click(screen.getByRole('button', { name: 'Exporteer als CSV' }))
  })
})

describe('FiscaalSectie — het jaar kiezen', () => {
  it('rekent het hele scherm om naar het gekozen jaar', async () => {
    // Zonder deze test blijft de keuzelijst onaangeroerd, en dan zou een scherm dat
    // altijd het huidige jaar toont er precies even goed uitzien.
    const gebruiker = userEvent.setup()
    toon({ transacties: [tx({ id: 'a' }), tx({ id: 'v', datum: '2025-04-01', bedrag: -12000 })] })
    expect(kaartVan('kinderopvang').querySelector('.bedrag-groot')?.textContent).toBe(formatEuro(25000))

    await gebruiker.selectOptions(screen.getByLabelText('Inkomstenjaar'), '2025')

    expect(
      screen.getByText(/Wat je in 2025 betaalde, geef je aan in de aangifte van aanslagjaar 2026/),
    ).toBeInTheDocument()
    expect(kaartVan('kinderopvang').querySelector('.bedrag-groot')?.textContent).toBe(formatEuro(12000))
  })

  it('waarschuwt dat het lopende jaar nog niet af is', () => {
    // Wie in augustus zijn aangifte invult, heeft het jaar ervóór nodig. Het scherm
    // opent op het lopende jaar omdat je daar vandaag in boekt, dus moet het dat
    // erbij zeggen.
    toon({ transacties: [tx({ id: 'a' }), tx({ id: 'v', datum: '2025-04-01' })] })
    expect(document.querySelector('[data-loopendjaar]')?.textContent).toMatch(/kies dan het jaar ervóór/)
  })
})

describe('FiscaalSectie — het bestand', () => {
  it('bevestigt de download met de naam van allebei de jaartallen', async () => {
    const gebruiker = userEvent.setup()
    toon({ transacties: [tx({ id: 'a' })] })
    await gebruiker.click(screen.getByRole('button', { name: 'Exporteer als CSV' }))
    expect(vi.mocked(downloadTekst).mock.calls[0][0]).toBe('fiscaal-2026-aanslagjaar-2027.csv')
    expect(screen.getByText('Het bestand is gedownload.')).toBeInTheDocument()
  })

  it('zegt het wanneer de download mislukt, in plaats van niets te doen', async () => {
    const gebruiker = userEvent.setup()
    vi.mocked(downloadTekst).mockImplementationOnce(() => {
      throw new Error('geen schijfruimte')
    })
    toon({ transacties: [tx({ id: 'a' })] })
    await gebruiker.click(screen.getByRole('button', { name: 'Exporteer als CSV' }))
    expect(screen.getByRole('alert').textContent).toMatch(/kon niet gemaakt worden/)
  })
})

describe('FiscaalSectie — waar de app kijkt', () => {
  it('noemt de categorieën bij naam, niet hun id', () => {
    // De kop belooft "hieronder staat per post waar ze kijkt". Zonder de namen zie je
    // wél dát ze keek maar niet waar — en juist dat heb je nodig om je boeking te
    // verplaatsen.
    toon({ transacties: [tx({ id: 'a' })] })
    const blok = document.querySelector('[data-leegeposten]') as HTMLElement
    const regels = [...blok.querySelectorAll('[data-kijktin]')].map((e) => e.textContent ?? '')
    expect(regels.join(' ')).toMatch(/Kijkt in: .*Pensioensparen/i)
    expect(regels.join(' ')).not.toMatch(/i-pensioensparen/)
  })

  it('zegt welke twee soorten geld dit scherm nooit ziet', () => {
    toon({ transacties: [tx({ id: 'a' })] })
    expect(document.querySelector('[data-onzichtbaar]')?.textContent).toMatch(/overboeking tussen je eigen rekeningen/)
  })
})

describe('FiscaalSectie — het gewicht van een waarschuwing', () => {
  it('geeft de co-ouderschapswaarschuwing hetzelfde gewicht als een attestwaarschuwing', () => {
    // Dit is de zwaarste waarschuwing van allemaal — je kan de aftrek hélemaal kwijt
    // zijn — en ze stond in de lichtste opmaak van de kaart, omdat de opmaak keek
    // naar `afleidbaarheid` in plaats van naar belang.
    const bijdrage: Onderhoudsbijdrage = {
      id: 'ob1',
      dossierId: 'd1',
      richting: 'jij-betaalt',
      basisbedrag: 30000,
      datumRegeling: '2022-06-15',
    }
    toon({
      transacties: [tx({ id: 'a' })],
      onderhoudsbijdragen: [bijdrage],
      onderhoudsbetalingen: [{ id: 'p1', bijdrageId: 'ob1', datum: '2026-02-05', bedrag: 30000 }],
    })
    const alimentatie = kaartVan('onderhoudsuitkeringen').querySelector('[data-waarschuwing]') as HTMLElement
    const opvang = kaartVan('kinderopvang').querySelector('[data-waarschuwing]') as HTMLElement
    expect(alimentatie.textContent).toMatch(/co-ouderschap/)
    expect(alimentatie.className).toBe(opvang.className)
  })

  it('houdt rood voorbehouden aan een échte fout', () => {
    // `foutregel` is de opmaak van een mislukte handeling. Kreeg elke attestpost die
    // opmaak, dan betekent rood op dit scherm niets meer.
    toon({ transacties: [tx({ id: 'a' })] })
    expect(kaartVan('kinderopvang').querySelector('.foutregel')).toBeNull()
  })
})

describe('FiscaalSectie — hoe ver de wet vandaag reikt', () => {
  const bijdrage: Onderhoudsbijdrage = {
    id: 'ob1',
    dossierId: 'd1',
    richting: 'jij-betaalt',
    basisbedrag: 30000,
    datumRegeling: '2022-06-15',
  }

  it('belooft geen verdere verlaging zodra de wet er geen meer vastlegt', async () => {
    // 2026 daalt nog naar 50 %; ná 2027 legt de wet niets meer vast. "Wordt verder
    // afgebouwd" is dan een bewering zonder bron.
    const gebruiker = userEvent.setup()
    toon({
      transacties: [tx({ id: 'a' }), tx({ id: 'b', datum: '2027-03-01' })],
      onderhoudsbijdragen: [bijdrage],
      onderhoudsbetalingen: [
        { id: 'p1', bijdrageId: 'ob1', datum: '2026-02-05', bedrag: 30000 },
        { id: 'p2', bijdrageId: 'ob1', datum: '2027-02-05', bedrag: 30000 },
      ],
      vandaagISO: '2027-08-16',
    })
    const zin = () => kaartVan('onderhoudsuitkeringen').querySelector('[data-aftrekbaar]')?.textContent ?? ''
    expect(zin()).toContain('50%')
    expect(zin()).not.toMatch(/daalt de komende jaren/)

    await gebruiker.selectOptions(screen.getByLabelText('Inkomstenjaar'), '2026')
    expect(zin()).toContain('60%')
    expect(zin()).toMatch(/daalt de komende jaren/)
  })
})

describe('FiscaalSectie — het document voor de boekhouder', () => {
  it('vraagt de PDF op voor het gekozen jaar en bevestigt de download', async () => {
    const gebruiker = userEvent.setup()
    toon({ transacties: [tx({ id: 'a' })] })
    await gebruiker.click(screen.getByRole('button', { name: 'PDF voor je boekhouder' }))
    const overzicht = vi.mocked(exporteerFiscaalPDF).mock.calls[0][1]
    expect(overzicht.inkomstenjaar).toBe(2026)
    expect(overzicht.aanslagjaar).toBe(2027)
    expect(screen.getByText('Het document is gedownload.')).toBeInTheDocument()
  })

  it('zegt het wanneer het document niet gemaakt kan worden', async () => {
    const gebruiker = userEvent.setup()
    vi.mocked(exporteerFiscaalPDF).mockRejectedValueOnce(new Error('stuk'))
    toon({ transacties: [tx({ id: 'a' })] })
    await gebruiker.click(screen.getByRole('button', { name: 'PDF voor je boekhouder' }))
    expect(screen.getByRole('alert').textContent).toMatch(/kon niet gemaakt worden/)
  })

  it('houdt maar één gevulde knop op het scherm', () => {
    // DESIGN.md. De PDF is het blad dat je doorgeeft; de CSV staat ernaast als tweede
    // knop en niet als tweede gevulde knop.
    toon({ transacties: [tx({ id: 'a' })] })
    expect(document.querySelectorAll('.knop-primair')).toHaveLength(1)
  })
})
