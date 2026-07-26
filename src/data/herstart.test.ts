import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { wisAlles } from './herstart'
import { GeheugenBackend } from './sync/backend'
import { bewaarRekening, bewaarTransactie, laadRekeningen, laadTransacties } from './repository'
import { synchroniseer } from './sync/sync'

beforeEach(async () => {
  for (const tabel of db.tables) await tabel.clear()
})

describe('wisAlles', () => {
  it('maakt alle tabellen leeg, ook het logboek', async () => {
    await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 1000, rekeningId: 'r1' })
    expect((await laadTransacties()).geldig).toHaveLength(1)
    expect(await db.events.count()).toBeGreaterThan(0)

    await wisAlles()

    expect((await laadRekeningen()).geldig).toHaveLength(0)
    expect((await laadTransacties()).geldig).toHaveLength(0)
    expect(await db.events.count()).toBe(0)
  })

  it('ruimt ook de back-up op, zodat een volgende sync niets terughaalt', async () => {
    const backend = new GeheugenBackend()
    await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 1000, rekeningId: 'r1' })
    await synchroniseer(backend)
    expect(await backend.haalOp()).not.toHaveLength(0)

    const res = await wisAlles(backend)
    expect(res.backupGewist).toBe(true)
    expect(await backend.haalOp()).toHaveLength(0)

    // De kern van de test: na een nieuwe sync blijft alles leeg.
    await synchroniseer(backend)
    expect((await laadTransacties()).geldig).toHaveLength(0)
  })

  it('wist lokaal tóch, en meldt het wanneer de back-up niet opgeruimd raakt', async () => {
    const stuk = new GeheugenBackend()
    stuk.wisAlles = async () => {
      throw new Error('geen internet')
    }
    await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })

    const res = await wisAlles(stuk)

    expect(res.backupGewist).toBe(false)
    expect(res.backupFout).toBe('geen internet')
    expect((await laadRekeningen()).geldig).toHaveLength(0)
  })
})
