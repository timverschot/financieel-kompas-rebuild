import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './db'
import {
  bewaarDossier,
  bewaarDossierDocument,
  bewaarGedeeldeKost,
  bewaarOrdening,
  bewaarWaardering,
  laadWaarderingen,
  bewaarTransactie,
  laadDossierDocumenten,
  laadDossiers,
  laadGedeeldeKosten,
  laadOrdeningen,
  laadTransacties,
} from './repository'
import { exporteerBackup, importeerBackup } from './backup'

beforeEach(async () => {
  await Promise.all([
    db.transacties.clear(),
    db.rekeningen.clear(),
    db.categorieen.clear(),
    db.budgetten.clear(),
    db.dossiers.clear(),
    db.gedeeldeKosten.clear(),
    db.verrekeningen.clear(),
    db.terugkerendePosten.clear(),
    db.events.clear(),
    db.meta.clear(),
  ])
})

const loon = { id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1' }

describe('backup', () => {
  it('exporteert en herstelt de volledige data (round-trip na wissen)', async () => {
    await bewaarTransactie(loon)
    const json = await exporteerBackup()

    // Simuleer dat de browseropslag gewist werd: staat én logboek leeg.
    await db.transacties.clear()
    await db.events.clear()
    expect((await laadTransacties()).geldig).toHaveLength(0)

    const r = await importeerBackup(json)
    expect(r.toegevoegd).toBe(1)
    const tx = (await laadTransacties()).geldig
    expect(tx).toHaveLength(1)
    expect(tx[0].omschrijving).toBe('Loon')
    expect(tx[0].bedrag).toBe(240000)
  })

  it('voegt niets dubbel toe bij een tweede herstel (append-only)', async () => {
    await bewaarTransactie(loon)
    const json = await exporteerBackup()
    const r = await importeerBackup(json)
    expect(r.toegevoegd).toBe(0) // alles zat er al
    expect(r.overgeslagen).toBeGreaterThan(0)
  })

  it('telt ongeldige gebeurtenissen en laat de geldige rest door', async () => {
    await bewaarTransactie(loon)
    const data = JSON.parse(await exporteerBackup())
    data.events.push({ id: 'kapot', rommel: true }) // corrupte regel toevoegen
    await db.transacties.clear()
    await db.events.clear()

    const r = await importeerBackup(JSON.stringify(data))
    expect(r.ongeldig).toBe(1)
    expect(r.toegevoegd).toBe(1)
  })

  it('weigert een bestand dat geen geldige JSON is', async () => {
    await expect(importeerBackup('geen json {')).rejects.toThrow()
  })

  it('weigert een JSON zonder back-up-gegevens', async () => {
    await expect(importeerBackup('{"iets":1}')).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — de back-up moet ALLE tabellen dragen, niet alleen transacties.
//
// De bestaande tests keken uitsluitend naar transacties. Daardoor was er geen
// enkel vangnet voor een tabel die bij het herstellen vergeten wordt: je haalt je
// back-up binnen, alles lijkt te kloppen, en pas weken later merk je dat je eigen
// volgorde van de hoofdcategorieën of je documentkluis leeg is.
// ---------------------------------------------------------------------------

describe('backup draagt ook de andere tabellen', () => {
  it('herstelt de eigen volgorde van de hoofdcategorieën', async () => {
    await db.ordeningen.clear()
    await bewaarOrdening({ id: 'hoofdcategorieen', ids: ['ov-wonen', 'ov-voeding', 'ov-vervoer'] })
    const json = await exporteerBackup()

    await db.ordeningen.clear()
    await db.events.clear()
    expect((await laadOrdeningen()).geldig).toHaveLength(0)

    await importeerBackup(json)
    const ord = (await laadOrdeningen()).geldig
    expect(ord).toHaveLength(1)
    expect(ord[0].ids).toEqual(['ov-wonen', 'ov-voeding', 'ov-vervoer'])
  })

  it('herstelt een dossier met zijn gedeelde kosten en een bewaard document', async () => {
    await db.dossiers.clear()
    await db.gedeeldeKosten.clear()
    await db.dossierdocumenten.clear()
    await bewaarDossier({ id: 'd1', naam: 'Co-ouderschap', aandeelJij: 60 })
    await bewaarGedeeldeKost({
      id: 'k1',
      dossierId: 'd1',
      omschrijving: 'Schoolrekening',
      bedrag: 12000,
      datum: '2026-07-01',
      betaaldDoor: 'jij',
      kostenType: 'gewoon',
    })
    await bewaarDossierDocument({
      id: 'doc1',
      dossierId: 'd1',
      naam: 'Ouderschapsovereenkomst',
      soort: 'overeenkomst',
      bestand: 'data:application/pdf;base64,AA==',
      toegevoegdOp: '2026-07-01',
    })
    const json = await exporteerBackup()

    await Promise.all([db.dossiers.clear(), db.gedeeldeKosten.clear(), db.dossierdocumenten.clear(), db.events.clear()])
    await importeerBackup(json)

    expect((await laadDossiers()).geldig.map((d) => d.aandeelJij)).toEqual([60])
    expect((await laadGedeeldeKosten()).geldig.map((k) => k.bedrag)).toEqual([12000])
    expect((await laadDossierDocumenten()).geldig.map((d) => d.naam)).toEqual(['Ouderschapsovereenkomst'])
  })

  it('herstelt een waardering', async () => {
    // Ronde 38: dezelfde valkuil als bij de ordeningen. Een tabel die bij het
    // herstellen vergeten wordt, merk je pas weken later — en dan staat je
    // beleggingsrekening ineens weer op haar beginsaldo van jaren geleden.
    await db.waarderingen.clear()
    await bewaarWaardering({ id: 'w1', rekeningId: 'r1', datum: '2026-07-15', saldo: -123456, notitie: 'Visa' })
    const json = await exporteerBackup()

    await db.waarderingen.clear()
    await db.events.clear()
    expect((await laadWaarderingen()).geldig).toHaveLength(0)

    await importeerBackup(json)
    const wrd = (await laadWaarderingen()).geldig
    expect(wrd).toHaveLength(1)
    expect(wrd[0].saldo).toBe(-123456)
  })
})

// De eenheid van een logregel (ronde 46). Zie de uitleg bij LOG_FORMAAT in
// sync/events.ts: een regel uit de euro-tijd draagt geen eenheid, en haar bedragen
// als centen lezen maakt van € 2.400 stil € 24.
describe('backup — een bestand uit de euro-tijd', () => {
  const euroTijd = JSON.stringify({
    app: 'financieel-kompas',
    soort: 'backup',
    versie: 1,
    gemaaktOp: '2026-01-01T10:00:00.000Z',
    events: [
      {
        id: 'oud-1',
        toestelId: 'toestel-oud',
        volgnummer: 1,
        tijdstip: 1735725600000,
        gebeurtenis: {
          type: 'transactie.bewaard',
          payload: { id: 'oud-tx', datum: '2026-01-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' },
        },
      },
    ],
  })

  it('leest zo een bestand niet in, en zegt hoeveel regels het betreft', async () => {
    const r = await importeerBackup(euroTijd)
    expect(r.verouderd).toBe(1)
    expect(r.toegevoegd).toBe(0)
    expect((await laadTransacties()).geldig).toHaveLength(0)
  })

  it('laat wat er al staat volledig met rust', async () => {
    await bewaarTransactie(loon)
    await importeerBackup(euroTijd)
    const tx = (await laadTransacties()).geldig
    expect(tx).toHaveLength(1)
    expect(tx[0].bedrag).toBe(240000)
  })

  it('herstelt een bestand van DEZE versie gewoon', async () => {
    await bewaarTransactie(loon)
    const json = await exporteerBackup()
    await db.transacties.clear()
    await db.events.clear()

    const r = await importeerBackup(json)
    expect(r.verouderd).toBe(0)
    expect(r.toegevoegd).toBe(1)
    expect((await laadTransacties()).geldig[0].bedrag).toBe(240000)
  })
})

// ---------------------------------------------------------------------------
// Ronde 68 — een back-up van een NIEUWERE versie van de app.
//
// `importeerBackup` telde dit geval altijd al mee, maar de melding op het scherm
// noemde het niet: je las "Hersteld: 0 toegevoegd, 0 al aanwezig, 0 ongeldig" terwijl
// élke regel geweigerd was. Dat klinkt alsof het bestand leeg was.
// ---------------------------------------------------------------------------
describe('backup — een bestand van een nieuwere versie', () => {
  const teNieuw = JSON.stringify({
    app: 'financieel-kompas',
    soort: 'backup',
    versie: 2,
    gemaaktOp: '2026-08-01T10:00:00.000Z',
    events: [
      {
        id: 'nieuw-1',
        toestelId: 'toestel-nieuw',
        volgnummer: 1,
        tijdstip: 1754040000000,
        formaat: 99,
        gebeurtenis: {
          type: 'transactie.bewaard',
          payload: { id: 'nw-tx', datum: '2026-08-01', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1' },
        },
      },
    ],
  })

  it('telt de geweigerde regels apart, zodat het scherm het kan zeggen', async () => {
    const r = await importeerBackup(teNieuw)
    expect(r.teNieuw).toBe(1)
    expect(r.toegevoegd).toBe(0)
    expect(r.ongeldig).toBe(0)
    // ⚠ Vooral dit: het is GEEN ongeldige regel. Zou ze als "ongeldig" geteld worden,
    // dan las je "1 ongeldig" — en dan denk je dat je bestand stuk is in plaats van
    // dat je app te oud is.
    expect((await laadTransacties()).geldig).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Ronde 109 — een herstel dat halverwege afbreekt, mag niet onherstelbaar zijn
// ---------------------------------------------------------------------------

describe('importeerBackup — het schrijven en het herbouwen horen samen', () => {
  it('houdt de regels NIET wanneer het toepassen stukloopt', async () => {
    // ⚠ RONDE 109. Hier stonden een `bulkPut` en een `herbouwStaat()` als twee losse stappen.
    // Brak de tweede af, dan stonden je regels wél in het logboek maar niet in je lijsten — en
    // dat herstelde zich nooit meer: een tweede herstel met hetzelfde bestand slaat elke regel
    // over als "al aanwezig", en niets bouwt de staat daarna nog op. Je gegevens waren dan
    // voorgoed onbereikbaar terwijl ze er gewoon stonden.
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Colruyt', bedrag: -4200, rekeningId: 'r1' })
    const bestand = await exporteerBackup()
    await db.transacties.clear()
    await db.events.clear()

    const stuk = vi.spyOn(db.transacties, 'bulkPut').mockImplementation(() => {
      throw new Error('opslag vol')
    })
    await expect(importeerBackup(bestand)).rejects.toThrow()
    stuk.mockRestore()

    expect(await db.events.get(JSON.parse(bestand).events[0].id)).toBeUndefined()
  })

  it('brengt bij een tweede poging alles gewoon terug', async () => {
    // De tegencontrole: na de mislukte poging hierboven hoort hetzelfde bestand het gewoon te
    // doen. Vóór deze ronde gaf die tweede poging "0 toegevoegd, 1 overgeslagen".
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Colruyt', bedrag: -4200, rekeningId: 'r1' })
    const bestand = await exporteerBackup()
    await db.transacties.clear()
    await db.events.clear()

    const stuk = vi.spyOn(db.transacties, 'bulkPut').mockImplementation(() => {
      throw new Error('opslag vol')
    })
    await expect(importeerBackup(bestand)).rejects.toThrow()
    stuk.mockRestore()

    const r = await importeerBackup(bestand)
    expect(r.toegevoegd).toBe(1)
    expect((await laadTransacties()).geldig.map((t) => t.id)).toContain('t1')
  })
})
