import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wisNepPdf, type NepPdf } from '../test/nepPdf'
import { vertaal } from '../i18n'
import { formatEuro } from './format'
import { fiscaalJaaroverzicht } from './fiscaal'
import type { DossierDocument, Onderhoudsbetaling, Onderhoudsbijdrage, Transactie } from '../data/schema'

// Ronde 50. Dit blad gaat naar een boekhouder, en daar staat het scherm niet meer
// omheen. Elke test hieronder bewaakt of het voorbehoud mee op papier komt — een
// document met de cijfers maar zonder hun voorbehoud leest als een berekening, en
// dat is het niet.

const { nep } = vi.hoisted(() => ({
  nep: { teksten: [], afbeeldingen: [], bladen: 1, bewaardAls: null } as NepPdf,
}))
vi.mock('jspdf', async () => {
  const { nepJsPdfKlasse } = await import('../test/nepPdf')
  return { jsPDF: nepJsPdfKlasse(nep) }
})

const { exporteerFiscaalPDF } = await import('./fiscaalPdf')

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)
const NU = new Date(2026, 7, 16)

const tx = (over: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-03-10',
  omschrijving: 'Crèche De Zonnebloem',
  bedrag: -25000,
  rekeningId: 'r1',
  categorieId: 'i-cr-che-9817',
  ...over,
})

const bijdrage: Onderhoudsbijdrage = {
  id: 'ob1',
  dossierId: 'd1',
  richting: 'jij-betaalt',
  basisbedrag: 30000,
  datumRegeling: '2022-06-15',
}
const betaling: Onderhoudsbetaling = { id: 'p1', bijdrageId: 'ob1', datum: '2026-02-05', bedrag: 30000 }

// De tekst van het hele document als ÉÉN regel. `alleTekst` plakt de regels met een
// regeleinde aan elkaar, en `pdfBlad` breekt een alinea af op de bladbreedte — dus een
// zin van twee regels is daar nooit als geheel terug te vinden. Voor een test over de
// INHOUD is dat een valstrik: hij zou slagen of falen naargelang de bladbreedte.
//
// Let op de tekenklasse: BEWUST niet `\s`. Die vangt ook de vaste spatie, en `formatEuro`
// zet er juist één na de €. Met `\s` werd "€ 250,00" hier stil "€ 250,00" met een gewone
// spatie, en dan faalde elke bedragtest zonder dat er iets aan het document scheelde.
function plat(): string {
  return nep.teksten
    .map((r) => r.tekst)
    .join(' ')
    .replace(/[ \n\r\t]+/g, ' ')
}

async function maak(over: Parameters<typeof fiscaalJaaroverzicht>[0]) {
  await exporteerFiscaalPDF(t, fiscaalJaaroverzicht(over), NU)
  return plat()
}

beforeEach(() => wisNepPdf(nep))

describe('exporteerFiscaalPDF — de kop', () => {
  it('zet het inkomstenjaar in de titel en het aanslagjaar in de zin eronder', async () => {
    // De meest gemaakte fout in dit onderwerp. Op een blad zonder scherm eromheen is
    // dat het eerste wat vast moet staan.
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toContain('Fiscaal jaaroverzicht 2026')
    expect(tekst).toContain('aangifte van aanslagjaar 2027')
  })

  it('zegt wanneer het document is opgemaakt', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toContain('Opgemaakt op: 2026-08-16')
  })

  it('zet de grens van de app op het blad, en niet achteraan', async () => {
    await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    const posities = nep.teksten.map((r) => r.tekst)
    const grens = posities.findIndex((r) => r.includes('belastingadvies'))
    const eerstePost = posities.findIndex((r) => r.includes('kinderoppas'))
    expect(grens).toBeGreaterThan(-1)
    // Wie enkel het begin van het blad leest, moet ze gezien hebben.
    expect(grens).toBeLessThan(eerstePost)
  })

  it('noemt voor welk land en welk gewest de lijst geldt', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toContain('Vlaanderen')
  })
})

describe('exporteerFiscaalPDF — één post', () => {
  it('zet het bedrag, het vak en de code op het blad', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toContain('Uitgaven voor kinderoppas')
    expect(tekst).toContain('Vak X · code 1384')
    expect(tekst).toContain(formatEuro(25000))
  })

  it('zet het voorbehoud VÓÓR de boekingen', async () => {
    // Op papier is de volgorde het enige wat nog stuurt: wie de lijst eerst leest,
    // heeft de bedragen al overgenomen voor hij bij het voorbehoud komt.
    await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    const regels = nep.teksten.map((r) => r.tekst)
    const let_op = regels.findIndex((r) => r.includes('OPVANGDAG'))
    const boeking = regels.findIndex((r) => r.includes('Crèche'))
    expect(let_op).toBeGreaterThan(-1)
    expect(let_op).toBeLessThan(boeking)
  })

  it('noemt de bron, zodat de regel niet op gezag van de app staat', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toContain('Bron: https://www.wikifin.be')
  })

  it('zet elke boeking met haar datum en bedrag op het blad', async () => {
    const tekst = await maak({
      inkomstenjaar: 2026,
      transacties: [tx({ id: 'a' }), tx({ id: 'b', datum: '2026-09-02', bedrag: -18000 })],
    })
    expect(tekst).toContain('2026-09-02')
    expect(tekst).toContain(formatEuro(18000))
  })
})

describe('exporteerFiscaalPDF — betaalde onderhoudsuitkeringen', () => {
  it('noemt het percentage van het betalingsjaar en houdt het voorwaardelijk', async () => {
    const tekst = await maak({
      inkomstenjaar: 2026,
      transacties: [],
      onderhoudsbijdragen: [bijdrage],
      onderhoudsbetalingen: [betaling],
    })
    expect(tekst).toContain('60%')
    expect(tekst).toContain(formatEuro(18000))
    expect(tekst).toContain('hangt af van de voorwaarden')
  })

  it('belooft geen verdere verlaging zodra de wet er geen meer vastlegt', async () => {
    const tekst = await maak({
      inkomstenjaar: 2027,
      transacties: [],
      onderhoudsbijdragen: [bijdrage],
      onderhoudsbetalingen: [{ ...betaling, datum: '2027-02-05' }],
    })
    expect(tekst).toContain('50%')
    expect(tekst).not.toContain('daalt de komende jaren')
  })

  it('noemt ze betalingen en geen boekingen (ronde 101)', async () => {
    // ⚠ Deze lijst komt niet uit je boekingen maar uit je betalingen op een
    // onderhoudsbijdrage in Dossiers. Ronde 96 zette dat op het SCHERM recht; dit blad — het
    // blad dat naar je boekhouder gaat — deed de splitsing niet mee. Daar las je
    // "1 boeking(en)" en ging je die in je boekingenlijst zoeken, waar er geen enkele van
    // staat. (De rijen eronder dragen hun eigen omschrijving, en heten "Betaling" alleen
    // wanneer die leeg is — dus ook dáár stond het woord "boeking" nergens.)
    const tekst = await maak({
      inkomstenjaar: 2026,
      transacties: [],
      onderhoudsbijdragen: [bijdrage],
      onderhoudsbetalingen: [betaling],
    })
    expect(tekst).toContain('1 betaling(en)')
    expect(tekst).not.toContain('1 boeking(en)')
  })

  it('zet de co-ouderschapswaarschuwing op het blad', async () => {
    // De zwaarste van allemaal: die kan de aftrek helemaal wegnemen.
    const tekst = await maak({
      inkomstenjaar: 2026,
      transacties: [],
      onderhoudsbijdragen: [bijdrage],
      onderhoudsbetalingen: [betaling],
    })
    expect(tekst).toContain('co-ouderschap')
  })
})

describe('exporteerFiscaalPDF — een gewone post', () => {
  it('noemt zijn regels wél boekingen (ronde 101)', async () => {
    // ⚠ De positieve tegencontrole bij de test hierboven: zonder haar zou "noem ze overal
    // betalingen" ook groen zijn, en dan klopt het op elke andere post niet meer.
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'dc', categorieId: 'i-dienstencheques-9094', bedrag: -9000 })] })
    expect(tekst).toContain('1 boeking(en)')
  })
})

describe('exporteerFiscaalPDF — posten die niet meer bestaan', () => {
  const dienstencheque = tx({ id: 'dc', categorieId: 'i-dienstencheques-9094', bedrag: -9000 })

  it('merkt ze als vervallen en laat de codes weg', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [dienstencheque] })
    expect(tekst).toContain('Dienstencheques — Vervallen')
    expect(tekst).not.toContain('3364')
  })

  it('zegt niet "Niets gevonden" boven een post die wél een bedrag draagt (ronde 108)', async () => {
    // ⚠ RONDE 108. `overzicht.vervallen` is een APARTE lijst, dus met alleen boekingen onder
    // een vervallen post was `metIets` leeg: het blad drukte de ontkenning én drie regels
    // lager "Dienstencheques — Vervallen ... € 90,00 ... 1 boeking(en)".
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [dienstencheque] })
    expect(tekst).not.toContain('Niets gevonden')
    expect(tekst).toContain(formatEuro(9000))
  })

  it('draagt de zin van het scherm mee', async () => {
    // Op het scherm staat boven dit blok waaróm er niets meer in te vullen valt; in de PDF
    // volgde "Dienstencheques — Vervallen" kaal op de vorige post.
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [dienstencheque] })
    expect(tekst).toContain('Dit bestaat niet meer')
    expect(tekst).toContain('voor aanslagjaar 2027 valt er niets meer in te vullen')
  })

  it('blijft "Niets gevonden" zeggen wanneer er werkelijk niets is', async () => {
    // De tegencontrole: zonder boekingen hoort de zin er gewoon te staan.
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [] })
    expect(tekst).toContain('Niets gevonden')
  })
})

describe('exporteerFiscaalPDF — de bonteller (ronde 108)', () => {
  it('zet de bonteller achter het aantal, net als op het scherm', async () => {
    // Het scherm zegt "1 boeking(en) · 1 met bon" en de CSV heeft er een kolom voor; van de
    // drie weergaven liet uitgerekend de PDF het weg — terwijl bewijs bij één van deze posten
    // een wettelijke voorwaarde is, en dit het blad is dat naar de boekhouder gaat.
    const documenten: DossierDocument[] = [
      {
        id: 'doc1',
        transactieId: 'a',
        naam: 'Bon crèche',
        soort: 'bon',
        bestand: 'data:application/pdf;base64,AA==',
        toegevoegdOp: '2026-03-10',
      },
    ]
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })], documenten })
    expect(tekst).toContain('1 boeking(en) · 1 met bon')
  })

  it('laat de bonteller weg wanneer er geen bon is', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toContain('1 boeking(en)')
    expect(tekst).not.toContain('met bon')
  })
})

describe('exporteerFiscaalPDF — waar de app nog gekeken heeft', () => {
  it('noemt de categorieën bij naam', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toMatch(/Kijkt in: .*Pensioensparen/i)
    expect(tekst).not.toContain('i-pensioensparen')
  })

  it('zegt welke twee soorten geld het overzicht nooit ziet', async () => {
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(tekst).toContain('overboeking tussen je eigen rekeningen')
  })
})

describe('exporteerFiscaalPDF — een jaar dat de app niet beschrijft', () => {
  it('zegt dat, in plaats van een kort en geruststellend blad af te leveren', async () => {
    const tekst = await maak({ inkomstenjaar: 2023, transacties: [tx({ id: 'a', datum: '2023-03-10' })] })
    expect(tekst).toContain('Dit jaar staat niet in de app')
    expect(tekst).not.toContain('Uitgaven voor kinderoppas')
  })
})

describe('exporteerFiscaalPDF — het bestand', () => {
  it('draagt allebei de jaartallen in zijn naam', async () => {
    await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(nep.bewaardAls).toBe('fiscaal-2026-aanslagjaar-2027.pdf')
  })

  it('zet op elk blad een voettekst met de bladnummering', async () => {
    const documenten: DossierDocument[] = []
    const tekst = await maak({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })], documenten })
    expect(tekst).toContain('Financieel Kompas — 2026')
    expect(tekst).toMatch(/blad 1 van \d+/)
  })
})
