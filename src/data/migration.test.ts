import { describe, it, expect } from 'vitest'
import Dexie from 'dexie'

// Bewijst het migratiemechanisme: bestaande data wordt bij een versieverhoging
// veilig omgezet naar de nieuwe vorm, zonder verlies.
describe('migraties', () => {
  it('zet oude transacties bij een upgrade om naar een nieuwe vorm', async () => {
    const naam = 'migratie-test-' + Math.random().toString(36).slice(2)

    // Versie 1: oude vorm, een transactie zonder 'valuta'-veld.
    const dbV1 = new Dexie(naam)
    dbV1.version(1).stores({ transacties: 'id' })
    await dbV1.open()
    await dbV1.table('transacties').put({ id: 't1', bedrag: 100 })
    dbV1.close()

    // Versie 2: voegt 'valuta' toe en vult bestaande records met een standaardwaarde.
    const dbV2 = new Dexie(naam)
    dbV2.version(1).stores({ transacties: 'id' })
    dbV2
      .version(2)
      .stores({ transacties: 'id' })
      .upgrade(async (trans) => {
        await trans
          .table('transacties')
          .toCollection()
          .modify((t: { valuta?: string }) => {
            if (t.valuta === undefined) t.valuta = 'EUR'
          })
      })
    await dbV2.open()

    const omgezet = await dbV2.table('transacties').get('t1')
    expect(omgezet.valuta).toBe('EUR')
    expect(omgezet.bedrag).toBe(100) // bestaande data blijft behouden

    dbV2.close()
    await Dexie.delete(naam)
  })
})
