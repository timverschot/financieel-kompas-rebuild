import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import {
  bewaarDossier,
  bewaarDossierDocument,
  bewaarGedeeldeKost,
  bewaarOrdening,
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
})
