import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { bewaarTransactie, laadTransacties } from './repository'
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
