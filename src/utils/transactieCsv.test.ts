import { describe, it, expect } from 'vitest'
import { transactieCsvBestand, transactieCsvBestandsnaam, transactieCsvRijen, telCsvRegels } from './transactieCsv'
import { splitsCsv } from './csv'
import { vertaal } from '../i18n'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { groepVanCategorie, labelVanCategorie } from '../data/categorieen/resolve'
import type { Categorie, Gezinslid, Rekening, Transactie } from '../data/schema'

// Echte id's uit de ingebouwde boom: met een verzonnen id lost elke categorienaam
// naar "Onbekend" op, en dan meet een test op de categoriekolommen niets.
const VOEDING = INGEBOUWDE_CATEGORIEEN.find((h) => /Voeding/i.test(h.naam))!
const HUISHOUDEN = INGEBOUWDE_CATEGORIEEN.find((h) => /Huishouden/i.test(h.naam))!
const BROOD = VOEDING.categorieen[0].items[0].id
const WASMIDDEL = HUISHOUDEN.categorieen[0].items[0].id

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

const rekeningen: Rekening[] = [
  { id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 },
  { id: 'r2', naam: 'Spaarrekening', beginsaldo: 0 },
]
const categorieen: Categorie[] = []

const tx = (over: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-07-04',
  omschrijving: 'Colruyt',
  bedrag: -4120,
  rekeningId: 'r1',
  ...over,
})

const gezinsleden: Gezinslid[] = [
  { id: 'g1', naam: 'Emma' },
  { id: 'g2', naam: 'Lucas' },
]

// Kolommen: datum, handelaar, toelichting, hoofdcategorie, categorie, rekening,
// gezinslid, bedrag, soort, ticket.
const GEZINSLID = 6
const BEDRAG = 7
const SOORT = 8
const TICKET = 9

describe('transactieCsvRijen', () => {
  it('begint met een rij kolomkoppen', () => {
    const rijen = transactieCsvRijen(t, [], categorieen, rekeningen, gezinsleden)
    expect(rijen).toHaveLength(1)
    expect(rijen[0][0]).toBe('Datum')
    expect(rijen[0]).toHaveLength(10)
  })

  it('schrijft het bedrag als kaal decimaal getal met een komma', () => {
    // NIET als "€ 41,20": dat leest Excel als tekst, en dan kan je er niet meer
    // mee rekenen. Het minteken blijft staan, want dat maakt het een uitgave.
    const rijen = transactieCsvRijen(t, [tx({ id: 't1' })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][BEDRAG]).toBe('-41,20')
    expect(rijen[1][SOORT]).toBe('uitgave')
  })

  it('noemt een positief bedrag een inkomst', () => {
    const rijen = transactieCsvRijen(t, [tx({ id: 't1', bedrag: 200000 })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][BEDRAG]).toBe('2000,00')
    expect(rijen[1][SOORT]).toBe('inkomst')
  })

  it('zet de rekeningnaam erbij, niet het id', () => {
    const rijen = transactieCsvRijen(t, [tx({ id: 't1', rekeningId: 'r2' })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][5]).toBe('Spaarrekening')
  })

  it('laat de rekeningkolom leeg wanneer de rekening niet meer bestaat', () => {
    const rijen = transactieCsvRijen(t, [tx({ id: 't1', rekeningId: 'weg' })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][5]).toBe('')
  })

  // Dit is de domeinregel: een gesplitst ticket mag nooit op de moedertransactie
  // aggregeren.
  it('geeft een gesplitst ticket één rij per ticketregel', () => {
    const gesplitst = tx({
      id: 't1',
      bedrag: -5380,
      regels: [
        { categorieId: BROOD, bedrag: -4120, omschrijving: 'brood en beleg' },
        { categorieId: WASMIDDEL, bedrag: -1260 },
      ],
    })
    const rijen = transactieCsvRijen(t, [gesplitst], categorieen, rekeningen, gezinsleden)
    expect(rijen).toHaveLength(3)
    expect(rijen[1][BEDRAG]).toBe('-41,20')
    expect(rijen[2][BEDRAG]).toBe('-12,60')
    // Beide rijen dragen hetzelfde ticketnummer, zodat je ze in Excel kan groeperen.
    expect(rijen[1][TICKET]).toBe('t1')
    expect(rijen[2][TICKET]).toBe('t1')
  })

  it('zet de toelichting van een ticketregel in haar eigen kolom', () => {
    const gesplitst = tx({
      id: 't1',
      bedrag: -5380,
      regels: [
        { categorieId: BROOD, bedrag: -4120, omschrijving: 'brood en beleg' },
        { categorieId: WASMIDDEL, bedrag: -1260 },
      ],
    })
    const rijen = transactieCsvRijen(t, [gesplitst], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][2]).toBe('brood en beleg')
    expect(rijen[2][2]).toBe('')
  })

  it('laat de toelichting leeg bij een gewone boeking', () => {
    // Anders staat de handelaarsnaam er twee keer, in twee kolommen naast elkaar.
    const rijen = transactieCsvRijen(t, [tx({ id: 't1' })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][2]).toBe('')
  })

  it('telt de bedragen van een gesplitst ticket exact op tot het totaal', () => {
    const gesplitst = tx({
      id: 't1',
      bedrag: -5000,
      // Regels die MEER verdelen dan het totaal: categorieBedragen schaalt die naar
      // verhouding terug. Het bestand mag daardoor nooit een ander totaal tonen dan
      // wat er van de rekening ging.
      regels: [
        { categorieId: BROOD, bedrag: -4000 },
        { categorieId: WASMIDDEL, bedrag: -2000 },
      ],
    })
    const rijen = transactieCsvRijen(t, [gesplitst], categorieen, rekeningen, gezinsleden)
    const som = rijen.slice(1).reduce((s, r) => s + Math.round(Number(r[BEDRAG].replace(',', '.')) * 100), 0)
    expect(som).toBe(-5000)
  })

  it('maakt een handelaarsnaam onschadelijk die Excel als formule zou lezen', () => {
    const rijen = transactieCsvRijen(t, [tx({ id: 't1', omschrijving: '=SOM(A1)' })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][1]).toBe("'=SOM(A1)")
  })

  it('houdt de volgorde van de meegegeven lijst aan', () => {
    // De export volgt het scherm; sorteren doet de lijst, niet dit bestand.
    const rijen = transactieCsvRijen(
      t,
      [tx({ id: 'b', datum: '2026-07-09' }), tx({ id: 'a', datum: '2026-07-01' })],
      categorieen,
      rekeningen,
      gezinsleden,
    )
    expect(rijen[1][TICKET]).toBe('b')
    expect(rijen[2][TICKET]).toBe('a')
  })
})

describe('transactieCsvBestand', () => {
  it('begint met een byte-volgordemarkering', () => {
    expect(transactieCsvBestand(t, [], categorieen, rekeningen, gezinsleden).charCodeAt(0)).toBe(0xfeff)
  })

  it('is met puntkomma als scheidingsteken te lezen en houdt de bedragen heel', () => {
    const bestand = transactieCsvBestand(t, [tx({ id: 't1', omschrijving: 'COLRUYT; HALLE' })], categorieen, rekeningen, gezinsleden)
    const rijen = splitsCsv(bestand.slice(1), ';')
    expect(rijen[1][1]).toBe('COLRUYT; HALLE')
    expect(rijen[1][BEDRAG]).toBe('-41,20')
  })
})

describe('transactieCsvBestandsnaam', () => {
  it('zegt "alles" wanneer er niets gefilterd is', () => {
    expect(transactieCsvBestandsnaam(t, {}, '2026-07-29')).toBe('boekingen-alle-boekingen-2026-07-29.csv')
  })

  it('zet het filter in de naam', () => {
    const naam = transactieCsvBestandsnaam(t, { maand: '2026-03', richting: 'uit' }, '2026-07-29')
    expect(naam).toBe('boekingen-uitgaven-maart-2026-2026-07-29.csv')
  })

  it('haalt tekens uit de naam die een bestandssysteem weigert', () => {
    const naam = transactieCsvBestandsnaam(t, { zoek: 'a/b:c' }, '2026-07-29')
    expect(naam).not.toContain('/')
    expect(naam).not.toContain(':')
    expect(naam.endsWith('.csv')).toBe(true)
  })
})

describe('de categoriekolommen', () => {
  it('zet de hoofdcategorie en de laagste categorie in twee aparte kolommen', () => {
    // Twee kolommen en niet één pad met '›': in Excel filter en draaitabel je per
    // niveau, en dat kan niet als beide in dezelfde cel staan.
    const rijen = transactieCsvRijen(t, [tx({ id: 't1', categorieId: BROOD })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][3]).toBe(groepVanCategorie(BROOD, categorieen).naam)
    expect(rijen[1][4]).toBe(labelVanCategorie(BROOD, categorieen))
    expect(rijen[1][3]).not.toBe(rijen[1][4])
  })

  it('geeft elke ticketregel haar eigen categorie', () => {
    const gesplitst = tx({
      id: 't1',
      bedrag: -5380,
      regels: [
        { categorieId: BROOD, bedrag: -4120 },
        { categorieId: WASMIDDEL, bedrag: -1260 },
      ],
    })
    const rijen = transactieCsvRijen(t, [gesplitst], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][4]).toBe(labelVanCategorie(BROOD, categorieen))
    expect(rijen[2][4]).toBe(labelVanCategorie(WASMIDDEL, categorieen))
  })

  it('laat de categoriekolom leeg bij een boeking zonder categorie', () => {
    const rijen = transactieCsvRijen(t, [tx({ id: 't1' })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][4]).toBe('')
  })
})

describe('de bestandsnaam bij het historiekvenster', () => {
  it('noemt de begindatum wanneer de lijst maar zes maanden toont', () => {
    // Zonder deze regel heette het bestand "alle transacties" terwijl er zes maanden
    // in zaten — en dat merk je pas als iemand naar de oudere boekingen vraagt.
    const naam = transactieCsvBestandsnaam(t, { van: '2026-02-01' }, '2026-07-29')
    expect(naam).toContain('2026-02-01')
    expect(naam).not.toContain('transacties')
  })
})

describe('de koppeling tussen een ticketregel en haar toelichting', () => {
  // `transactieCsvRijen` pakt `tx.regels[i].omschrijving` op positie i van de UITVOER
  // van `categorieBedragen`. Dat zijn twee verschillende functies; als de tweede ooit
  // zou sorteren of samenvoegen, schuift de toelichting naar de verkeerde rij.
  it('houdt de toelichting bij haar eigen regel wanneer er een restbedrag bijkomt', () => {
    const gesplitst = tx({
      id: 't1',
      bedrag: -5000,
      // De regels dekken maar € 30 van de € 50; `categorieBedragen` voegt achteraan een
      // restregel toe zonder categorie.
      regels: [
        { categorieId: BROOD, bedrag: -2000, omschrijving: 'brood' },
        { categorieId: WASMIDDEL, bedrag: -1000, omschrijving: 'wasmiddel' },
      ],
    })
    const rijen = transactieCsvRijen(t, [gesplitst], categorieen, rekeningen, gezinsleden)
    expect(rijen).toHaveLength(4)
    expect(rijen[1][2]).toBe('brood')
    expect(rijen[2][2]).toBe('wasmiddel')
    // De restregel heeft geen eigen toelichting en mag die van een andere regel niet
    // overnemen.
    expect(rijen[3][2]).toBe('')
    expect(rijen[3][BEDRAG]).toBe('-20,00')
  })

  it('houdt de toelichting bij haar regel wanneer de bedragen herschaald worden', () => {
    const gesplitst = tx({
      id: 't1',
      bedrag: -5000,
      regels: [
        { categorieId: BROOD, bedrag: -4000, omschrijving: 'brood' },
        { categorieId: WASMIDDEL, bedrag: -2000, omschrijving: 'wasmiddel' },
      ],
    })
    const rijen = transactieCsvRijen(t, [gesplitst], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][2]).toBe('brood')
    expect(rijen[2][2]).toBe('wasmiddel')
    expect(rijen[1][4]).toBe(labelVanCategorie(BROOD, categorieen))
    expect(rijen[2][4]).toBe(labelVanCategorie(WASMIDDEL, categorieen))
  })
})

describe('transactieCsvRijen — de kolom Gezinslid', () => {
  // Ronde 51. Je kan op een gezinslid FILTEREN, en die naam belandde ook in de
  // bestandsnaam — maar in het bestand zelf stond nergens wie waarbij hoorde.

  it('zet de namen van de gezinsleden in het bestand, niet hun id', () => {
    const rijen = transactieCsvRijen(t, [tx({ id: 't1', persoonIds: ['g1'] })], categorieen, rekeningen, gezinsleden)
    expect(rijen[0][GEZINSLID]).toBe('Gezinslid')
    expect(rijen[1][GEZINSLID]).toBe('Emma')
  })

  it('zet er meerdere naast elkaar wanneer een boeking aan twee leden hangt', () => {
    const rijen = transactieCsvRijen(
      t,
      [tx({ id: 't1', persoonIds: ['g1', 'g2'] })],
      categorieen,
      rekeningen,
      gezinsleden,
    )
    expect(rijen[1][GEZINSLID]).toBe('Emma, Lucas')
  })

  it('laat de kolom leeg bij een boeking die aan niemand hangt', () => {
    const rijen = transactieCsvRijen(t, [tx({ id: 't1' })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][GEZINSLID]).toBe('')
  })

  it('herhaalt de namen op elke regel van een gesplitst ticket', () => {
    // Net als de kolom Rekening: `persoonIds` staat op de boeking, niet per regel, en
    // zo blijft elke rij op zichzelf leesbaar in een draaitabel.
    const gesplitst = tx({
      id: 't1',
      bedrag: -5000,
      persoonIds: ['g1'],
      regels: [
        { categorieId: BROOD, bedrag: -2000 },
        { categorieId: WASMIDDEL, bedrag: -3000 },
      ],
    })
    const rijen = transactieCsvRijen(t, [gesplitst], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][GEZINSLID]).toBe('Emma')
    expect(rijen[2][GEZINSLID]).toBe('Emma')
  })

  it('verzwijgt een verwijderd gezinslid niet', () => {
    // Een lege cel zou lezen als "hangt aan niemand", en dat is iets anders dan
    // "hangt aan iemand die je intussen verwijderd hebt".
    const rijen = transactieCsvRijen(t, [tx({ id: 't1', persoonIds: ['weg'] })], categorieen, rekeningen, gezinsleden)
    expect(rijen[1][GEZINSLID]).toBe('Onbekend gezinslid')
  })
})

describe('telCsvRegels — het bestand heeft meer rijen dan boekingen (ronde 97)', () => {
  // ⚠ De melding na een download zei alleen hoeveel BOEKINGEN meegingen, terwijl het
  // bestand één rij per ticketregel schrijft. Wie het opende, vond er meer dan de app had
  // aangekondigd — en kon alleen maar denken dat er iets dubbel stond.
  const gewoon: Transactie = {
    id: 't1',
    datum: '2026-07-01',
    omschrijving: 'Boodschappen',
    bedrag: -5380,
    rekeningId: 'r1',
    categorieId: 'cat-voeding',
  }
  const gesplitst: Transactie = {
    id: 't2',
    datum: '2026-07-02',
    omschrijving: 'Colruyt',
    bedrag: -5380,
    rekeningId: 'r1',
    regels: [
      { bedrag: -3000, categorieId: 'cat-voeding' },
      { bedrag: -2380, categorieId: 'cat-huishouden' },
    ],
  }

  it('telt een gewone boeking als één rij', () => {
    expect(telCsvRegels([gewoon])).toBe(1)
  })

  it('telt een gesplitst kassaticket per regel', () => {
    expect(telCsvRegels([gesplitst])).toBe(2)
  })

  it('komt op hetzelfde uit als wat er werkelijk geschreven wordt', () => {
    // ⚠ DE ENIGE REGEL DIE ER ÉCHT TOE DOET. Een tweede telling die naast de schrijver
    // leeft, gaat er vroeg of laat van afwijken; deze bindt de twee aan elkaar.
    const alles = [gewoon, gesplitst]
    const rijen = transactieCsvRijen(t, alles, [], [], [])
    // ⚠ Min één: `transactieCsvRijen` zet de KOPPENRIJ vooraan. Die telt niet mee in wat
    // de melding belooft, want ze bevat geen boeking.
    expect(telCsvRegels(alles)).toBe(rijen.length - 1)
  })

  it('geeft nul op een lege lijst', () => {
    expect(telCsvRegels([])).toBe(0)
  })
})
