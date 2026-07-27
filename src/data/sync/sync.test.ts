import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../db'
import { bewaarTransactie, laadTransacties } from '../repository'
import { GeheugenBackend, type SyncBackend } from './backend'
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

  it('stuurt bij elke push het volledige eigen logboek (compactie)', async () => {
    const verstuurd: Logregel[][] = []
    const backend: SyncBackend = {
      async haalOp() {
        return []
      },
      async stuur(_toestelId, regels) {
        verstuurd.push(regels)
      },
      async wisAlles() {},
    }

    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Een', bedrag: 100, rekeningId: 'r1' })
    await synchroniseer(backend)
    await bewaarTransactie({ id: 't2', datum: '2026-07-02', omschrijving: 'Twee', bedrag: 200, rekeningId: 'r1' })
    const res = await synchroniseer(backend)

    // Tweede push telt enkel de nieuwe wijziging, maar stuurt het VOLLEDIGE
    // logboek (t1 + t2), niet enkel t2 - zodat één bestand het geheel bevat.
    expect(res.gepusht).toBe(1)
    expect(verstuurd[0]).toHaveLength(1)
    expect(verstuurd[1]).toHaveLength(2)
  })
})

// Ronde 35: het schema controleert of een logregel deugt, maar knipt ook alles weg
// wat het niet kent. Werd de GEPARSTE regel bewaard, dan bewaarde een toestel met
// een oudere app-versie de regels van een nieuwere versie zonder de velden die het
// niet begrijpt — en schreef het die verminkte versie terug naar de back-up.
describe('synchroniseer bewaart een logregel ongeschonden', () => {
  it('houdt velden die deze versie van de app nog niet kent', async () => {
    const vanElders = {
      id: 'r-nieuw',
      toestelId: 'ander-toestel',
      volgnummer: 1,
      tijdstip: 1,
      gebeurtenis: { type: 'rekening.bewaard', payload: { id: 'r1', naam: 'Zicht', beginsaldo: 0 } },
      // Een veld uit een toekomstige versie van de app.
      hlcL: 1,
      hlcC: 0,
      veldVanMorgen: 'moet blijven staan',
    } as unknown as Logregel

    await synchroniseer({
      async stuur() {},
      async haalOp() {
        return [vanElders]
      },
      async wisAlles() {},
    })

    const bewaard = await db.events.get('r-nieuw')
    expect(bewaard).toBeDefined()
    expect((bewaard as unknown as { veldVanMorgen?: string }).veldVanMorgen).toBe('moet blijven staan')
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — binnenhalen en toepassen horen bij elkaar.
//
// Waren het twee losse stappen en mislukte het toepassen, dan stonden de regels
// van je andere toestel wél in het logboek maar nergens in je lijsten — en dat
// herstelde zich nooit meer, want de volgende ronde ziet ze als "al bekend".
// ---------------------------------------------------------------------------

describe('een mislukte verwerking laat niets half achter', () => {
  it('haalt de regels opnieuw op wanneer het toepassen de eerste keer misging', async () => {
    await db.events.clear()
    await db.transacties.clear()
    await db.meta.clear()

    const regel = {
      id: 'ev-van-b',
      toestelId: 'B',
      volgnummer: 1,
      tijdstip: 1000,
      hlcL: 1000,
      hlcC: 0,
      gebeurtenis: {
        type: 'transactie.bewaard' as const,
        payload: { id: 't-van-b', datum: '2026-07-02', omschrijving: 'Colruyt', bedrag: -4200, rekeningId: 'r1' },
      },
    }
    const backend = new GeheugenBackend()
    await backend.stuur('B', [regel])

    // Eerste poging: het toepassen loopt stuk.
    const stuk = vi.spyOn(db.transacties, 'bulkPut').mockImplementation(() => {
      throw new Error('opslag vol')
    })
    await expect(synchroniseer(backend)).rejects.toThrow()
    stuk.mockRestore()

    // Het logboek mag die regel dan óók niet houden — anders wordt ze nooit meer
    // opgehaald en blijft de boeking van het andere toestel voorgoed onzichtbaar.
    expect(await db.events.get('ev-van-b')).toBeUndefined()

    // Tweede poging: nu lukt het gewoon.
    const r = await synchroniseer(backend)
    expect(r.opgehaald).toBe(1)
    expect((await db.transacties.get('t-van-b'))?.bedrag).toBe(-4200)
  })
})
