import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { bewaarTransactie, laadTransacties, verwijderTransactie } from './repository'
import type { Transactie } from './schema'

beforeEach(async () => {
  await db.transacties.clear()
  await db.rekeningen.clear()
  await db.events.clear()
  await db.meta.clear()
})

const t1: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' }

describe('repository', () => {
  it('bewaart en laadt een transactie (round-trip)', async () => {
    await bewaarTransactie(t1)
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(1)
    expect(res.geldig[0].omschrijving).toBe('Loon')
    expect(res.ongeldig).toBe(0)
  })

  it('weigert ongeldige data bij het schrijven', async () => {
    // @ts-expect-error - opzettelijk fout type om de validatie te testen
    await expect(bewaarTransactie({ id: 't1', bedrag: 'fout' })).rejects.toThrow()
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(0)
  })

  it('detecteert corrupte data bij het lezen en telt ze als ongeldig', async () => {
    // Schrijf bewust een corrupt record rechtstreeks in de database, buiten de validatie om.
    await db.transacties.put({ id: 'kapot', bedrag: 'geen getal' } as unknown as Transactie)
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(0)
    expect(res.ongeldig).toBe(1)
  })

  it('verwijdert een transactie', async () => {
    await bewaarTransactie(t1)
    await verwijderTransactie('t1')
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(0)
  })
})
