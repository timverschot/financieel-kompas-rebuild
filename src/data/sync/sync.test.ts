import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { bewaarTransactie, laadTransacties } from '../repository'
import { GeheugenBackend } from './backend'
import { synchroniseer } from './sync'
import type { Logregel } from './events'

beforeEach(async () => {
  await db.transacties.clear()
  await db.rekeningen.clear()
  await db.events.clear()
  await db.meta.clear()
})

// Een logregel afkomstig van een fictief ander toestel ('toestel-B'), met een
// laat tijdstip zodat het bij een conflict wint.
function vreemdeRegel(id: string, gebeurtenis: Logregel['gebeurtenis']): Logregel {
  return { id, toestelId: 'toestel-B', volgnummer: 1, tijdstip: Date.now() + 1000, gebeurtenis }
}

describe('synchroniseer', () => {
  it('haalt een transactie van een ander toestel op en voegt ze lokaal toe', async () => {
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' })

    const backend = new GeheugenBackend()
    await backend.stuur('toestel-B', [
      vreemdeRegel('ev-b1', {
        type: 'transactie.bewaard',
        payload: { id: 't2', datum: '2026-07-02', omschrijving: 'Cadeau', bedrag: 50, rekeningId: 'r1' },
      }),
    ])

    await synchroniseer(backend)

    const ids = (await laadTransacties()).geldig.map((t) => t.id).sort()
    expect(ids).toEqual(['t1', 't2'])
  })

  it('pusht eigen wijzigingen naar de backend', async () => {
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' })

    const backend = new GeheugenBackend()
    const res = await synchroniseer(backend)

    expect(res.gepusht).toBeGreaterThan(0)
    const opgehaald = await backend.haalOp()
    expect(opgehaald.some((r) => r.gebeurtenis.type === 'transactie.bewaard')).toBe(true)
  })

  it('laat een wijziging van een ander toestel winnen bij een later tijdstip', async () => {
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Lokaal', bedrag: 100, rekeningId: 'r1' })

    const backend = new GeheugenBackend()
    await backend.stuur('toestel-B', [
      vreemdeRegel('ev-b2', {
        type: 'transactie.bewaard',
        payload: { id: 't1', datum: '2026-07-01', omschrijving: 'Van B', bedrag: 999, rekeningId: 'r1' },
      }),
    ])

    await synchroniseer(backend)

    const t1 = (await laadTransacties()).geldig.find((t) => t.id === 't1')
    expect(t1?.omschrijving).toBe('Van B')
  })

  it('negeert een ongeldige (corrupte) regel van de backend', async () => {
    const backend = new GeheugenBackend()
    // Een corrupt record rechtstreeks in de backend, buiten de validatie om.
    await backend.stuur('toestel-B', [{ id: 'kapot', rommel: true } as unknown as Logregel])

    const res = await synchroniseer(backend)

    expect(res.ongeldig).toBe(1)
    expect((await laadTransacties()).geldig).toHaveLength(0)
  })
})
