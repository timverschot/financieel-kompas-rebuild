import { describe, it, expect, vi, beforeEach } from 'vitest'
import { alleTekst, tekstVanBlad, wisNepPdf, type NepPdf } from '../test/nepPdf'
import { vertaal } from '../i18n'
import { formatEuro } from './format'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { ONDERGRENS, VOETTEKST_Y } from './pdfBlad'
import type { Categorie, Rekening, Transactie } from '../data/schema'

// Echte id's uit de ingebouwde boom. Verzonnen id's lossen naar "Onbekend" op, en dan
// heten twee categorieën in het rapport hetzelfde en meet een test op de
// categorietabel of de uitsplitsing niets.
const VOEDING = INGEBOUWDE_CATEGORIEEN.find((h) => /Voeding/i.test(h.naam))!
const HUISHOUDEN = INGEBOUWDE_CATEGORIEEN.find((h) => /Huishouden/i.test(h.naam))!
const BROOD = VOEDING.categorieen[0].items[0].id
const WASMIDDEL = HUISHOUDEN.categorieen[0].items[0].id

// jsPDF wordt vervangen door een notitieboekje: zie src/test/nepPdf.ts voor waarom.
const { nep } = vi.hoisted(() => ({
  nep: { teksten: [], afbeeldingen: [], bladen: 1, bewaardAls: null } as NepPdf,
}))
vi.mock('jspdf', async () => {
  const { nepJsPdfKlasse } = await import('../test/nepPdf')
  return { jsPDF: nepJsPdfKlasse(nep) }
})

const { exporteerPeriodePDF } = await import('./periodePdf')

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

const rekeningen: Rekening[] = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 100000 }]
const categorieen: Categorie[] = []

const transacties: Transactie[] = [
  { id: 'loon', datum: '2026-03-01', omschrijving: 'Loon', bedrag: 200000, rekeningId: 'r1' },
  { id: 'colruyt', datum: '2026-03-04', omschrijving: 'Colruyt', bedrag: -4120, rekeningId: 'r1', categorieId: BROOD },
  { id: 'q8', datum: '2026-11-09', omschrijving: 'Q8', bedrag: -6000, rekeningId: 'r1', categorieId: WASMIDDEL },
]

const NU = new Date(2026, 6, 29)

beforeEach(() => wisNepPdf(nep))

describe('exporteerPeriodePDF — een maand', () => {
  beforeEach(async () => {
    await exporteerPeriodePDF(t, '2026-03', transacties, categorieen, rekeningen, [], [], NU)
  })

  it('zet de maand voluit in de titel', () => {
    expect(alleTekst(nep)).toContain('Maandrapport maart 2026')
  })

  it('zegt wanneer het document is opgemaakt', () => {
    expect(alleTekst(nep)).toContain('Opgemaakt op: 2026-07-29')
  })

  it('toont de vier kengetallen', () => {
    const tekst = alleTekst(nep)
    for (const label of ['Inkomsten', 'Uitgaven', 'Netto', 'Saldo op 2026-03-31']) {
      expect(tekst).toContain(label)
    }
  })

  it('zet de boekingen van die maand in de lijst, en die van een andere maand niet', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Colruyt')
    expect(tekst).toContain('Loon')
    expect(tekst).not.toContain('Q8')
  })

  it('zet de categorietabel erin met de echte categorienaam en een aandeelkolom', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Uitgaven per categorie')
    expect(tekst).toContain('Aandeel')
    expect(tekst).toContain('100%')
    // De NAAM, niet enkel de kop: met een onbekend id zou hier "Onbekend" staan.
    expect(tekst).toContain('Voeding')
  })

  it('legt uit hoe een gesplitst ticket in de tabel terechtkomt', () => {
    // De uitleg wordt over meerdere regels afgebroken, dus zoeken we op het geheel
    // met de regeleindes eruit.
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('per categorie apart')
  })

  it('laat de maandtabel weg bij een maandrapport', () => {
    expect(alleTekst(nep)).not.toContain('Per maand')
  })

  it('zet op elk blad een voettekst met bladnummer', () => {
    expect(alleTekst(nep)).toContain('blad 1 van')
    expect(alleTekst(nep)).toContain('Financieel Kompas — maart 2026')
  })

  it('bewaart het bestand met de periode in de naam', () => {
    expect(nep.bewaardAls).toBe('maandrapport-2026-03.pdf')
  })
})

describe('exporteerPeriodePDF — een jaar', () => {
  beforeEach(async () => {
    await exporteerPeriodePDF(t, '2026', transacties, categorieen, rekeningen, [], [], NU)
  })

  it('noemt het jaarrapport bij zijn naam', () => {
    expect(alleTekst(nep)).toContain('Jaarrapport 2026')
  })

  it('zet de twaalf maanden in een tabel', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Per maand')
    expect(tekst).toContain('januari 2026')
    expect(tekst).toContain('december 2026')
  })

  it('neemt de boekingen van het hele jaar mee', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Colruyt')
    expect(tekst).toContain('Q8')
  })

  it('meet het saldo op 31 december', () => {
    expect(alleTekst(nep)).toContain('Saldo op 2026-12-31')
  })

  it('bewaart het bestand als jaarrapport', () => {
    expect(nep.bewaardAls).toBe('jaarrapport-2026.pdf')
  })
})

describe('exporteerPeriodePDF — grensgevallen', () => {
  it('zegt het wanneer er geen boekingen zijn in plaats van een leeg blad te geven', async () => {
    await exporteerPeriodePDF(t, '2019-01', transacties, categorieen, rekeningen, [], [], NU)
    expect(alleTekst(nep)).toContain('Er staan geen boekingen in deze periode.')
  })

  it('zet de bedragen als echte eurobedragen in het document', async () => {
    await exporteerPeriodePDF(t, '2026-03', transacties, categorieen, rekeningen, [], [], NU)
    expect(alleTekst(nep)).toContain(formatEuro(200000))
    expect(alleTekst(nep)).toContain(formatEuro(-4120))
  })

  it('rekent het saldo op het einde van de periode, niet op vandaag', async () => {
    await exporteerPeriodePDF(t, '2026-03', transacties, categorieen, rekeningen, [], [], NU)
    // 100.000 beginsaldo + 200.000 loon - 4.120 Colruyt; de novemberboeking telt niet.
    expect(alleTekst(nep)).toContain(formatEuro(100000 + 200000 - 4120))
  })

  it('splitst een lange lijst over meerdere bladen', async () => {
    const veel: Transactie[] = Array.from({ length: 120 }, (_, i) => ({
      id: `t${i}`,
      datum: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
      omschrijving: `Boeking ${i}`,
      bedrag: -1000,
      rekeningId: 'r1',
    }))
    await exporteerPeriodePDF(t, '2026-03', veel, categorieen, rekeningen, [], [], NU)
    expect(nep.bladen).toBeGreaterThan(1)
    // Elk blad krijgt zijn eigen nummer. Niet `blad n van n` op het laatste blad —
    // dat vergelijkt de teller met zichzelf en kan niet falen.
    for (let n = 1; n <= nep.bladen; n++) {
      expect(tekstVanBlad(nep, n)).toContain(`blad ${n} van ${nep.bladen}`)
    }
    // En niets loopt onder de ondergrens door — de voettekst uitgezonderd, die hoort
    // daar juist te staan.
    for (const r of nep.teksten) {
      if (r.y === VOETTEKST_Y) continue
      if (r.y > ONDERGRENS) expect.fail(`"${r.tekst}" staat op ${r.y} mm, onder de ondergrens ${ONDERGRENS}`)
    }
  })

  it('zet de uitsplitsing van een gesplitst ticket onder de regel', async () => {
    const gesplitst: Transactie[] = [
      {
        id: 'ticket',
        datum: '2026-03-04',
        omschrijving: 'Colruyt',
        bedrag: -5380,
        rekeningId: 'r1',
        regels: [
          { categorieId: BROOD, bedrag: -4120 },
          { categorieId: WASMIDDEL, bedrag: -1260 },
        ],
      },
    ]
    await exporteerPeriodePDF(t, '2026-03', gesplitst, categorieen, rekeningen, [], [], NU)
    // Op de REGEL zelf, niet ergens in het document: de bedragen staan ook in de
    // categorietabel, dus een zoektocht door alle tekst zou ook slagen wanneer de
    // uitsplitsing helemaal ontbreekt.
    const broodNaam = labelVanCategorie(BROOD, categorieen)!
    const wasNaam = labelVanCategorie(WASMIDDEL, categorieen)!
    // De regel kan over twee stukken afbreken; we voegen ze weer samen.
    const begin = nep.teksten.findIndex((r) => r.tekst.includes(broodNaam))
    expect(begin, 'geen uitsplitsingsregel gevonden').toBeGreaterThanOrEqual(0)
    const regel = nep.teksten
      .slice(begin, begin + 3)
      .map((r) => r.tekst)
      .join(' ')
    expect(regel).toContain(wasNaam)
    expect(regel).toContain('-41,20')
    expect(regel).toContain('-12,60')
  })

  it('valt terug op een tekst wanneer een boeking geen omschrijving heeft', async () => {
    const naamloos: Transactie[] = [
      { id: 'x', datum: '2026-03-04', omschrijving: '', bedrag: -1000, rekeningId: 'r1' },
    ]
    await exporteerPeriodePDF(t, '2026-03', naamloos, categorieen, rekeningen, [], [], NU)
    expect(alleTekst(nep)).toContain('zonder omschrijving')
  })
})
