import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../db'
import { bewaarTransactie, laadTransacties } from '../repository'
import { GeheugenBackend, type SyncBackend } from './backend'
import { synchroniseer } from './sync'
import { voegRegelsToeEnHerbouw } from './lokaal'
import { LOG_FORMAAT, type Logregel } from './events'

beforeEach(async () => {
  await db.transacties.clear()
  await db.rekeningen.clear()
  await db.events.clear()
  await db.meta.clear()
})

// Een logregel afkomstig van een fictief ander toestel ('toestel-B'), met een
// laat tijdstip zodat het bij een conflict wint.
function vreemdeRegel(id: string, gebeurtenis: Logregel['gebeurtenis']): Logregel {
  return { id, toestelId: 'toestel-B', volgnummer: 1, tijdstip: Date.now() + 1000, formaat: LOG_FORMAAT, gebeurtenis }
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
    // ⚠ Deze nepback-up geeft terug wat ze bewaarde (ronde 63). Deed ze dat niet,
    // dan zou `synchroniseer` terecht vaststellen dat het eigen logboek NIET in de
    // back-up staat en de pushteller terugzetten — en dan meet deze test niet meer
    // de compactie maar het herstelmechanisme.
    let bewaard: Logregel[] = []
    const backend: SyncBackend = {
      async haalOp() {
        return bewaard
      },
      async stuur(_toestelId, regels) {
        verstuurd.push(regels)
        bewaard = regels
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
      formaat: LOG_FORMAAT,
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
      formaat: LOG_FORMAAT,
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

// ---------------------------------------------------------------------------
// De eenheid van een logregel (ronde 46)
//
// Wat er misging. De app bewaarde geld eerst als euro's en stapte later over op
// gehele centen. Die overstap was een database-migratie: ze zette om wat op dat
// moment in het LOKALE logboek stond. Maar het logboek staat ook op Drive en in
// back-upbestanden, en een regel die van daar binnenkomt NA die migratie wordt
// door niemand meer omgezet — er is geen tweede migratie die haar ziet.
//
// En een bedrag is gewoon een getal: van buiten kan je niet zien of `2400` nu
// € 24,00 of € 2.400,00 betekent. Wie de app opnieuw met Drive verbond op een
// toestel waarvan de browser de lokale gegevens had opgeruimd, kreeg zijn oudste
// bedragen dus honderd keer te klein terug. Stil, en precies bij de cijfers waar
// het om gaat.
// ---------------------------------------------------------------------------
describe('synchroniseer — de eenheid van de bedragen', () => {
  // Een regel zoals de app ze vóór deze versie schreef: zonder eenheid, en met
  // een bedrag dat toen euro's betekende.
  function euroTijdRegel(id: string, bedrag: number): Logregel {
    return {
      id,
      toestelId: 'toestel-oud',
      volgnummer: 1,
      tijdstip: Date.now() + 1000,
      gebeurtenis: {
        type: 'transactie.bewaard',
        payload: { id: 'oud-1', datum: '2026-01-05', omschrijving: 'Loon', bedrag, rekeningId: 'r1' },
      },
    } as Logregel
  }

  it('leest een regel uit de euro-tijd NIET in', async () => {
    // Zou ze wel ingelezen worden, dan stond € 2.400 er als € 24,00.
    const backend = new GeheugenBackend()
    await backend.stuur('toestel-oud', [euroTijdRegel('oud-r1', 2400)])

    const uit = await synchroniseer(backend)
    expect(uit.verouderd).toBe(1)
    expect(uit.opgehaald).toBe(0)
    expect((await laadTransacties()).geldig).toEqual([])
  })

  it('raakt bestaande gegevens niet aan wanneer zo een regel binnenkomt', async () => {
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1' })
    const backend = new GeheugenBackend()
    await synchroniseer(backend)
    await backend.stuur('toestel-oud', [euroTijdRegel('oud-r1', 2400)])

    await synchroniseer(backend)
    const tx = (await laadTransacties()).geldig
    expect(tx).toHaveLength(1)
    expect(tx[0].bedrag).toBe(240000)
  })

  it('zet de eenheid op elke regel die deze versie schrijft', async () => {
    // Zonder dit veld is de fout over een paar jaar precies zo terug.
    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1' })
    const regels = await db.events.toArray()
    expect(regels).toHaveLength(1)
    expect(regels[0].formaat).toBe(LOG_FORMAAT)
  })

  it('laat een regel MET de juiste eenheid gewoon door', async () => {
    const backend = new GeheugenBackend()
    await backend.stuur('toestel-B', [
      vreemdeRegel('b1', {
        type: 'transactie.bewaard',
        payload: { id: 'b-tx', datum: '2026-07-02', omschrijving: 'Colruyt', bedrag: -4500, rekeningId: 'r1' },
      }),
    ])
    const uit = await synchroniseer(backend)
    expect(uit.verouderd).toBe(0)
    expect(uit.opgehaald).toBe(1)
    expect((await laadTransacties()).geldig[0].bedrag).toBe(-4500)
  })
})


// Ronde 63: het belletje moet weten wanneer je gegevens voor het laatst ergens
// anders dan in deze browser stonden.
describe('synchroniseer — de dag van de laatste geslaagde ronde', () => {
  it('noteert de dag zodra het eigen logboek in de back-up staat', async () => {
    await bewaarTransactie({ id: 't5', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' })
    const backend = new GeheugenBackend()
    await synchroniseer(backend, '2026-08-20')
    expect((await db.meta.get('laatsteSyncOp'))?.waarde).toBe('2026-08-20')
  })

  it('werkt de dag bij bij een volgende ronde', async () => {
    await bewaarTransactie({ id: 't6', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' })
    const backend = new GeheugenBackend()
    await synchroniseer(backend, '2026-08-20')
    await synchroniseer(backend, '2026-09-02')
    expect((await db.meta.get('laatsteSyncOp'))?.waarde).toBe('2026-09-02')
  })

  // ⚠ Dit is het geval waarvoor de controle bestaat (nakijkronde ronde 63).
  // Hernoem je in Drive de back-upmap, dan maakt de app een nieuwe, lege map aan.
  // Er valt dan niets meer te pushen — je volgnummer staat al hoog — en er komt
  // niets terug: een ronde die niets doet en toch niet faalt. Zou die dag genoteerd
  // worden, dan zwijgt het belletje voorgoed over gegevens die nergens staan.
  it('noteert niets wanneer het eigen logboek uit de back-up verdwenen is', async () => {
    await bewaarTransactie({ id: 't7', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' })
    const backend = new GeheugenBackend()
    await synchroniseer(backend, '2026-08-20')
    expect((await db.meta.get('laatsteSyncOp'))?.waarde).toBe('2026-08-20')

    // Een verse, lege back-up: precies wat een hernoemde map oplevert.
    const leeg = new GeheugenBackend()
    await synchroniseer(leeg, '2026-09-30')
    expect((await db.meta.get('laatsteSyncOp'))?.waarde).toBe('2026-08-20')
  })

  // Een toestel dat helemaal niets in zijn logboek heeft, kan ook niets verliezen.
  it('noteert de dag wel voor een leeg toestel', async () => {
    const backend = new GeheugenBackend()
    await synchroniseer(backend, '2026-08-20')
    expect((await db.meta.get('laatsteSyncOp'))?.waarde).toBe('2026-08-20')
  })

  // ⚠ Zet je op een nieuw toestel een back-upBESTAND terug, dan draagt je hele
  // geschiedenis het toestel-id van je oude telefoon. `stuur()` verstuurt alleen je
  // eigen regels, dus die geschiedenis komt nooit op Drive. Een controle die alleen
  // naar je eigen volgnummer keek, keurde dat elke ronde goed en liet het belletje
  // voorgoed zwijgen over een geschiedenis die nergens anders staat.
  it('noteert niets wanneer alleen regels van een ander toestel lokaal staan', async () => {
    await voegRegelsToeEnHerbouw([
      vreemdeRegel('ev-oud', {
        type: 'transactie.bewaard',
        payload: { id: 't-oud', datum: '2026-01-02', omschrijving: 'Oud', bedrag: 100, rekeningId: 'r1' },
      }),
    ])
    const backend = new GeheugenBackend()
    await synchroniseer(backend, '2026-08-20')
    expect(await db.meta.get('laatsteSyncOp')).toBeUndefined()
  })

  // ⚠ Vaststellen is niet genoeg: zonder deze reparatie valt er na een verdwenen
  // back-up nooit meer iets te pushen (het volgnummer staat al hoog) en blijft de
  // app tot in de eeuwigheid "0 verstuurd, 0 opgehaald" melden.
  it('duwt na een verdwenen back-up alles opnieuw naar boven', async () => {
    await bewaarTransactie({ id: 't8', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' })
    const backend = new GeheugenBackend()
    await synchroniseer(backend, '2026-08-20')

    const leeg = new GeheugenBackend()
    await synchroniseer(leeg, '2026-09-30')
    // Eerste ronde tegen de lege back-up: niets te pushen, dus de dag blijft staan
    // op die van de vorige, geslaagde ronde…
    expect((await db.meta.get('laatsteSyncOp'))?.waarde).toBe('2026-08-20')
    // …maar de tweede ronde zet alles er wél weer op, en dán pas telt de dag.
    const r = await synchroniseer(leeg, '2026-10-01')
    expect(r.gepusht).toBeGreaterThan(0)
    expect((await db.meta.get('laatsteSyncOp'))?.waarde).toBe('2026-10-01')
  })

  // ⚠ De dag is een BEWERING dat je gegevens elders staan. Loopt de ronde vast —
  // geen internet, een geweigerde map — dan mag die bewering er niet komen, want
  // dan zwijgt het belletje dertig dagen lang over gegevens die nergens staan.
  it('noteert niets wanneer de ronde mislukt', async () => {
    const stuk: SyncBackend = {
      stuur: () => Promise.reject(new Error('geen internet')),
      haalOp: () => Promise.reject(new Error('geen internet')),
      wisAlles: () => Promise.resolve(),
    }
    await bewaarTransactie({ id: 't9', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' })
    await expect(synchroniseer(stuk, '2026-08-20')).rejects.toThrow()
    expect(await db.meta.get('laatsteSyncOp')).toBeUndefined()
  })
})
