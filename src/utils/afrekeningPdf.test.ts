import { describe, it, expect, vi, beforeEach } from 'vitest'
import { alleTekst, tekstVanBlad, wisNepPdf, type NepPdf } from '../test/nepPdf'
import { ONDERGRENS, VOETTEKST_Y } from './pdfBlad'
import { vertaal } from '../i18n'
import { formatEuro } from './format'
import type { Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'

// Ronde 41 verhuisde de opmaak van dit document naar `pdfBlad.ts`, dat ze met twee
// nieuwe documenten deelt. Dat was een verbouwing zonder vangnet: er bestond geen
// enkele test op deze PDF, dus een regel die tijdens de verhuizing wegviel zou
// niemand hebben opgemerkt. Deze tests zijn dat vangnet — ze leggen vast wat er in
// het document hóórt te staan.

const { nep } = vi.hoisted(() => ({
  nep: { teksten: [], afbeeldingen: [], bladen: 1, bewaardAls: null } as NepPdf,
}))
vi.mock('jspdf', async () => {
  const { nepJsPdfKlasse } = await import('../test/nepPdf')
  return { jsPDF: nepJsPdfKlasse(nep) }
})

const { exporteerAfrekeningPDF } = await import('./afrekeningPdf')

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

const dossier: Dossier = { id: 'd1', naam: 'Kinderen 2026', aandeelJij: 60 }
const kinderen: Kind[] = [{ id: 'k1', naam: 'Kind 1' }]

const kosten: GedeeldeKost[] = [
  {
    id: 'k1',
    dossierId: 'd1',
    omschrijving: 'Schoolrekening',
    bedrag: 12000,
    betaaldDoor: 'jij',
    datum: '2026-03-04',
    kindIds: ['k1'],
  },
  {
    id: 'k2',
    dossierId: 'd1',
    omschrijving: 'Dokter',
    bedrag: 4500,
    betaaldDoor: 'partner',
    datum: '2026-03-11',
    kostenType: 'buitengewoon',
  },
]

const afrekening: Verrekening = {
  id: 'v1',
  dossierId: 'd1',
  datum: '2026-04-01',
  bedrag: 3380,
  periodeVan: '2026-03-01',
  periodeTot: '2026-03-31',
  kostIds: ['k1', 'k2'],
}

const NU = new Date(2026, 6, 29)

beforeEach(async () => {
  wisNepPdf(nep)
  await exporteerAfrekeningPDF(t, dossier, afrekening, kosten, kinderen, [], NU)
})

describe('exporteerAfrekeningPDF', () => {
  it('zet de dossiernaam in de titel', () => {
    expect(alleTekst(nep)).toContain('Afrekening — Kinderen 2026')
  })

  it('noemt de periode en de datum', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Periode: 2026-03-01 – 2026-03-31')
    expect(tekst).toContain('Datum: 2026-04-01')
  })

  it('toont de gebruikte verdeelsleutel', () => {
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('jij 60% / partner 40%')
  })

  it('toont alle zes totaalregels', () => {
    const tekst = alleTekst(nep)
    for (const label of [
      'Totaal kosten',
      'Aantal kosten',
      'Jij betaalde',
      'Partner betaalde',
      'Jouw aandeel',
      'Aandeel partner',
    ]) {
      expect(tekst).toContain(label)
    }
  })

  it('zegt in klare taal wie wie verschuldigd is', () => {
    expect(alleTekst(nep)).toContain('Partner is jou')
  })

  it('zet de drie uitsplitsingen erin', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Per kind')
    expect(tekst).toContain('Per categorie')
    expect(tekst).toContain('Per kostensoort')
  })

  it('legt de saldokolom één keer uit, onder de eerste tabel', () => {
    const uitleg = nep.teksten.filter((r) => r.tekst.includes('plus = partner betaalt jou'))
    expect(uitleg).toHaveLength(1)
  })

  it('zet de detaillijst met elke kost erin', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Schoolrekening')
    expect(tekst).toContain('Dokter')
    expect(tekst).toContain(formatEuro(12000))
  })

  it('legt bij elke kost uit wie betaalde en wat jouw aandeel is', () => {
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('betaald door jou')
    expect(doorlopend).toContain('betaald door partner')
    expect(doorlopend).toContain('jouw aandeel')
  })

  it('markeert een buitengewone kost als zodanig', () => {
    expect(alleTekst(nep)).toContain('buitengewoon')
  })

  it('zet op elk blad een voettekst met de dossiernaam en het bladnummer', () => {
    for (let blad = 1; blad <= nep.bladen; blad++) {
      expect(tekstVanBlad(nep, blad)).toContain('Kinderen 2026 — Opgemaakt op: 2026-07-29')
      expect(tekstVanBlad(nep, blad)).toContain(`blad ${blad} van ${nep.bladen}`)
    }
  })

  it('bewaart het bestand met een veilige naam', () => {
    expect(nep.bewaardAls).toBe('afrekening-kinderen-2026-2026-04-01.pdf')
  })

  it('houdt alle tekst boven de voettekst', () => {
    for (const r of nep.teksten) {
      if (r.y === VOETTEKST_Y) continue
      if (r.y > ONDERGRENS) expect.fail(`"${r.tekst}" staat op ${r.y} mm, onder ${ONDERGRENS}`)
    }
  })
})

describe('exporteerAfrekeningPDF — grensgevallen', () => {
  it('waarschuwt wanneer het saldo van vandaag afwijkt van wat er bewaard is', async () => {
    wisNepPdf(nep)
    await exporteerAfrekeningPDF(t, dossier, { ...afrekening, bedrag: 999 }, kosten, kinderen, [], NU)
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('de verdeling van het dossier is sindsdien gewijzigd')
  })

  it('blijft overeind bij een afrekening zonder kosten', async () => {
    wisNepPdf(nep)
    await exporteerAfrekeningPDF(t, dossier, { ...afrekening, bedrag: 0, kostIds: [] }, [], kinderen, [], NU)
    expect(alleTekst(nep)).toContain('Afrekening — Kinderen 2026')
    expect(alleTekst(nep)).not.toContain('Detail')
  })

  it('verdeelt een lange kostenlijst over meerdere bladen', async () => {
    wisNepPdf(nep)
    const veel: GedeeldeKost[] = Array.from({ length: 90 }, (_, i) => ({
      id: `k${i}`,
      dossierId: 'd1',
      omschrijving: `Kost ${i}`,
      bedrag: 1000,
      betaaldDoor: 'jij' as const,
      datum: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
    }))
    await exporteerAfrekeningPDF(
      t,
      dossier,
      { ...afrekening, kostIds: veel.map((k) => k.id) },
      veel,
      kinderen,
      [],
      NU,
    )
    expect(nep.bladen).toBeGreaterThan(1)
    // Elk blad zijn eigen nummer. `blad n van n` op het laatste blad vergelijkt de
    // teller met zichzelf en kan niet falen.
    for (let n = 1; n <= nep.bladen; n++) {
      expect(tekstVanBlad(nep, n)).toContain(`blad ${n} van ${nep.bladen}`)
    }
    // En geen tekst onder de ondergrens, de voettekst uitgezonderd.
    for (const r of nep.teksten) {
      if (r.y === VOETTEKST_Y) continue
      if (r.y > ONDERGRENS) expect.fail(`"${r.tekst}" staat op ${r.y} mm, onder ${ONDERGRENS}`)
    }
  })

  it('vindt ook de bon die aan de transactie hangt, net als de bewijsmap', async () => {
    // Vóór de review zei dit document "geen bon" bij een kost waarvan de bon in de
    // documentkluis onder de transactie zit — terwijl de bewijsmap hem wél als bijlage
    // meenam. Twee documenten over dezelfde afrekening die elkaar tegenspreken.
    wisNepPdf(nep)
    const viaTransactie: GedeeldeKost[] = [
      { id: 'kx', dossierId: 'd1', omschrijving: 'Turnles', bedrag: 6000, betaaldDoor: 'jij', datum: '2026-03-04', transactieId: 'tx1' },
    ]
    await exporteerAfrekeningPDF(
      t,
      dossier,
      { ...afrekening, kostIds: ['kx'] },
      viaTransactie,
      kinderen,
      [],
      NU,
      [
        {
          id: 'doc1',
          transactieId: 'tx1',
          naam: 'Bon turnles',
          soort: 'bon',
          bestand: 'data:image/jpeg;base64,AAAA',
          toegevoegdOp: '2026-03-05',
        },
      ],
    )
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('bon toegevoegd')
    expect(doorlopend).not.toContain('geen bon')
    expect(doorlopend).toContain('waarvan 1 met bon')
  })
})
