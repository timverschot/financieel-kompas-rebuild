import { describe, it, expect } from 'vitest'
import { fiscaalCsvBestand, fiscaalCsvBestandsnaam, fiscaalCsvKoppen } from './fiscaalCsv'
import { fiscaalJaaroverzicht } from './fiscaal'
import { splitsCsv } from './csv'
import { vertaal } from '../i18n'
import type { DossierDocument, Onderhoudsbetaling, Onderhoudsbijdrage, Transactie } from '../data/schema'

// Ronde 50. Dit bestand gaat naar een boekhouder, en daar staat het scherm niet meer
// omheen. Alles wat de app op het scherm nuanceert, moet dus mee in het bestand — en
// geen enkele kolom mag een som opleveren die niet klopt.

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

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

function rijen(over: Parameters<typeof fiscaalJaaroverzicht>[0]) {
  const overzicht = fiscaalJaaroverzicht(over)
  // De byte-volgordemarkering hoort erin voor Excel, maar niet in de ontleding.
  const tekst = fiscaalCsvBestand(t, overzicht).replace(/^\uFEFF/, '')
  return splitsCsv(tekst, ';')
}

function kolom(naam: string): number {
  return fiscaalCsvKoppen(t).indexOf(naam)
}

function tabel(alle: string[][]): string[][] {
  const kop = alle.findIndex((r) => r[0] === 'Soort')
  return alle.slice(kop + 1).filter((r) => r.length > 1)
}

describe('fiscaalCsvBestand — wat er vóór de tabel staat', () => {
  it('neemt de twee jaartallen en de grens van de app mee het bestand in', () => {
    // Zonder deze regels leest een boekhouder een kolom bedragen zonder te weten
    // welk aanslagjaar het is, of dat de app niets berekend heeft.
    const alle = rijen({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    const kop = alle.slice(0, 5).map((r) => r[0]).join(' | ')
    expect(kop).toContain('aanslagjaar 2027')
    expect(kop).toContain('geen belastingadvies')
    expect(kop).toContain('Vlaanderen')
  })
})

describe('fiscaalCsvBestand — de bedragen', () => {
  it('zet een posttotaal en een boeking in VERSCHILLENDE kolommen', () => {
    // Anders telt =SOM() over die ene kolom alles dubbel, en wie in Excel een som
    // onder een kolom zet, controleert die niet.
    const alle = rijen({
      inkomstenjaar: 2026,
      transacties: [tx({ id: 'a' }), tx({ id: 'b', bedrag: -18000, datum: '2026-09-02' })],
    })
    const t_ = tabel(alle)
    const totaalKol = kolom('Totaal per post')
    const bedragKol = kolom('Bedrag')

    const totaalRij = t_.find((r) => r[0] === 'Totaal')!
    expect(totaalRij[totaalKol]).toBe('430,00')
    expect(totaalRij[bedragKol]).toBe('')

    const boekingen = t_.filter((r) => r[0] === 'Boeking')
    expect(boekingen.map((r) => r[bedragKol])).toEqual(['180,00', '250,00'])
    expect(boekingen.every((r) => r[totaalKol] === '')).toBe(true)
  })

  it('zet het aftrekbare deel in zijn eigen kolom, niet bij de omschrijving', () => {
    const t_ = tabel(
      rijen({
        inkomstenjaar: 2026,
        transacties: [],
        onderhoudsbijdragen: [bijdrage],
        onderhoudsbetalingen: [betaling],
      }),
    )
    const totaalRij = t_.find((r) => r[0] === 'Totaal')!
    expect(totaalRij[kolom('Komt in aanmerking')]).toContain('60%')
    expect(totaalRij[kolom('Omschrijving')]).toBe('')
  })
})

describe('fiscaalCsvBestand — de bonnen', () => {
  const bon: DossierDocument = {
    id: 'doc1',
    transactieId: 'a',
    naam: 'Attest crèche',
    soort: 'attest',
    bestand: 'data:application/pdf;base64,AAA=',
    toegevoegdOp: '2026-03-11',
  }

  it('houdt het aantal en het ja/nee uit elkaar', () => {
    // Eén kolom die op de ene rij "3" bevat en op de andere "ja" is niet te filteren
    // en niet te tellen.
    const t_ = tabel(rijen({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })], documenten: [bon] }))
    const totaalRij = t_.find((r) => r[0] === 'Totaal')!
    const boeking = t_.find((r) => r[0] === 'Boeking')!
    expect(totaalRij[kolom('Aantal met bon')]).toBe('1')
    expect(totaalRij[kolom('Bon')]).toBe('')
    expect(boeking[kolom('Bon')]).toBe('ja')
    expect(boeking[kolom('Aantal met bon')]).toBe('')
  })

  it('laat de bonkolom leeg waar de app het niet kán weten', () => {
    // Een alimentatiebetaling staat in Dossiers en heeft daar geen documentkluis;
    // "nee" zou daar onwaar zijn, en net bij deze post is bewijs een voorwaarde.
    const t_ = tabel(
      rijen({
        inkomstenjaar: 2026,
        transacties: [],
        onderhoudsbijdragen: [bijdrage],
        onderhoudsbetalingen: [betaling],
      }),
    )
    // ⚠ RONDE 101 — DE RIJ HEET "BETALING". Ze heette hier "Boeking", en dat was precies de
    // fout: deze rijen komen uit je betalingen op een onderhoudsbijdrage in Dossiers, niet
    // uit je boekingen. Wie het bestand opende, zocht ze in zijn boekingenlijst — waar er
    // geen enkele van staat. Het bestand wist het zelf al (vandaar de lege bon-kolom
    // hieronder); alleen het etiket volgde niet mee.
    expect(t_.find((r) => r[0] === 'Betaling')![kolom('Bon')]).toBe('')
    expect(t_.find((r) => r[0] === 'Boeking')).toBeUndefined()
    expect(t_.find((r) => r[0] === 'Totaal')![kolom('Aantal met bon')]).toBe('')
  })
})

describe('fiscaalCsvBestand — posten die niet meer bestaan', () => {
  const dienstencheque = tx({ id: 'dc', categorieId: 'i-dienstencheques-9094', bedrag: -9000 })

  it('geeft ze geen code mee', () => {
    // Het scherm toont die codes bewust niet: er valt niets meer in te vullen. Een
    // code in een bestand is een uitnodiging om ze toch over te typen.
    const t_ = tabel(rijen({ inkomstenjaar: 2026, transacties: [dienstencheque] }))
    const vervallen = t_.find((r) => r[0] === 'Vervallen')!
    expect(vervallen[kolom('Code')]).toBe('')
    expect(vervallen[kolom('Totaal per post')]).toBe('90,00')
  })

  it('zet hun boekingen er wél bij', () => {
    // Zonder die lijst zie je het bedrag maar niet welke uitgaven het waren.
    const t_ = tabel(rijen({ inkomstenjaar: 2026, transacties: [dienstencheque] }))
    const boekingen = t_.filter((r) => r[0] === 'Boeking')
    expect(boekingen).toHaveLength(1)
    expect(boekingen[0][kolom('Post')]).toBe('Dienstencheques')
    expect(boekingen[0][kolom('Code')]).toBe('')
  })
})

describe('fiscaalCsvBestand — de waarschuwing', () => {
  it('reist mee per post', () => {
    const t_ = tabel(rijen({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] }))
    expect(t_.find((r) => r[0] === 'Totaal')![kolom('Let op')]).toContain('PER OPVANGDAG')
  })

  it('laat een post zonder boekingen helemaal weg', () => {
    // Een bestand met zes lege posten leest als "er valt niets af te trekken"; het
    // scherm zegt dat wél netjes, met de categorieën erbij.
    const t_ = tabel(rijen({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] }))
    expect(t_.some((r) => r[kolom('Post')] === 'Giften')).toBe(false)
  })
})

describe('fiscaalCsvBestandsnaam', () => {
  it('draagt allebei de jaartallen, want die worden makkelijk verward', () => {
    const overzicht = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [] })
    expect(fiscaalCsvBestandsnaam(overzicht)).toBe('fiscaal-2026-aanslagjaar-2027.csv')
  })
})
