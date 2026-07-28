import { describe, it, expect } from 'vitest'
import { pasToe } from './replay'
import { STAAT_NAMEN, herbouwStaat } from './lokaal'
import { bewaarTransactie } from '../repository'
import { db } from '../db'
import type { Logregel } from './events'

function regel(over: Partial<Logregel> & { gebeurtenis: Logregel['gebeurtenis'] }): Logregel {
  return { id: Math.random().toString(36).slice(2), toestelId: 'A', volgnummer: 1, tijdstip: 1, ...over }
}

const tx = (id: string, omschrijving: string, bedrag: number) =>
  ({ id, datum: '2026-07-01', omschrijving, bedrag, rekeningId: 'r1' }) as const

describe('pasToe (samenvoegen / last-writer-wins)', () => {
  it('laat de laatste wijziging winnen (hoogste tijdstip)', () => {
    const regels: Logregel[] = [
      regel({ tijdstip: 1, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Oud', 100) } }),
      regel({ tijdstip: 2, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Nieuw', 200) } }),
    ]
    expect(pasToe(regels).transacties.get('t1')?.omschrijving).toBe('Nieuw')
  })

  it('een verwijdering na een toevoeging verwijdert het record', () => {
    const regels: Logregel[] = [
      regel({ tijdstip: 1, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'X', 100) } }),
      regel({ tijdstip: 2, gebeurtenis: { type: 'transactie.verwijderd', payload: { id: 't1' } } }),
    ]
    expect(pasToe(regels).transacties.has('t1')).toBe(false)
  })

  it('convergeert naar dezelfde staat, ongeacht de volgorde van binnenkomst', () => {
    const a = regel({ toestelId: 'A', tijdstip: 5, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Van A', 1) } })
    const b = regel({ toestelId: 'B', tijdstip: 9, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Van B', 2) } })
    expect(pasToe([a, b]).transacties.get('t1')?.omschrijving).toBe('Van B')
    expect(pasToe([b, a]).transacties.get('t1')?.omschrijving).toBe('Van B')
  })

  it('laat de causaal latere wijziging winnen, ook als haar wandklok achterloopt', () => {
    // Toestel X bewaart 'Eerst' met een HOGE wandklok (1000) maar een LAAG HLC-stempel (5).
    // Toestel Y had die wijziging al gezien en bewaart daarna 'Later' met een LAGERE
    // wandklok (50 — de klok van Y loopt achter) maar een HOGER HLC-stempel (6).
    const eerst = regel({
      toestelId: 'X',
      tijdstip: 1000,
      hlcL: 5,
      hlcC: 0,
      gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Eerst', 100) },
    })
    const later = regel({
      toestelId: 'Y',
      tijdstip: 50,
      hlcL: 6,
      hlcC: 0,
      gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Later', 200) },
    })
    // Op de pure wandklok zou 'Eerst' (1000) winnen — fout. Met de HLC wint 'Later' (6 > 5).
    expect(pasToe([eerst, later]).transacties.get('t1')?.omschrijving).toBe('Later')
    expect(pasToe([later, eerst]).transacties.get('t1')?.omschrijving).toBe('Later')
  })

  it('valt terug op tijdstip voor oude regels zonder HLC-stempel', () => {
    // Regels zonder hlcL/hlcC (bv. van vóór deze versie) moeten nog exact zoals
    // vroeger op tijdstip geordend worden.
    const oud = regel({ tijdstip: 1, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Oud', 1) } })
    const nieuw = regel({ tijdstip: 2, gebeurtenis: { type: 'transactie.bewaard', payload: tx('t1', 'Nieuw', 2) } })
    expect(pasToe([oud, nieuw]).transacties.get('t1')?.omschrijving).toBe('Nieuw')
  })
})

// Ronde 35: `herbouwStaat` leegde en herschreef élke tabel met twee handgeschreven
// regels, en één van de twintig was vergeten — `ordeningen`, de volgorde van je
// hoofdcategorieën. Die kwam daardoor nooit op een tweede toestel en overleefde
// geen herstel van een back-up. Deze twee tests bewaken dat het niet opnieuw
// gebeurt, ook niet bij een eenentwintigste recordsoort.
describe('herbouwStaat dekt élke tabel', () => {
  it('kent voor elke sleutel van de staat een echte tabel met dezelfde naam', () => {
    const staat = pasToe([])
    for (const naam of STAAT_NAMEN) {
      expect(Object.keys(staat)).toContain(naam)
      expect(db[naam]).toBeDefined()
    }
  })

  it('vergeet geen enkele sleutel van de staat', () => {
    const staat = pasToe([])
    const vergeten = Object.keys(staat).filter((k) => !(STAAT_NAMEN as readonly string[]).includes(k))
    expect(vergeten).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — herbouwStaat mag niets kwijtraken wat er ondertussen bij komt.
//
// De herbouw draait na élke synchronisatie die iets ophaalt, en de stille
// synchronisatie loopt elke 45 seconden. Dat is dus precies terwijl je zit te
// typen. Las de herbouw het logboek buiten zijn eigen transactie, dan verdween
// alles wat je in dat venster bewaarde weer uit beeld.
// ---------------------------------------------------------------------------

describe('herbouwStaat en gelijktijdig bewaren', () => {
  it('raakt een boeking die er tijdens de herbouw bij komt niet kwijt', async () => {
    await db.events.clear()
    await db.transacties.clear()
    await db.meta.clear()

    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'r1' })

    // Allebei tegelijk starten, zoals in de app: de sync herbouwt, jij bewaart.
    await Promise.all([
      herbouwStaat(),
      bewaarTransactie({ id: 't2', datum: '2026-07-02', omschrijving: 'Colruyt', bedrag: -4200, rekeningId: 'r1' }),
    ])

    const ids = (await db.transacties.toArray()).map((t) => t.id).sort()
    expect(ids).toEqual(['t1', 't2'])
  })

  it('laat een wijziging tijdens de herbouw niet terugspringen', async () => {
    await db.events.clear()
    await db.transacties.clear()
    await db.meta.clear()

    await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Garage', bedrag: -4000, rekeningId: 'r1' })
    await Promise.all([
      herbouwStaat(),
      bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Garage', bedrag: -8000, rekeningId: 'r1' }),
    ])

    expect((await db.transacties.get('t1'))?.bedrag).toBe(-8000)
  })
})

describe('pasToe — waarderingen (ronde 38)', () => {
  const w = { id: 'w1', rekeningId: 'r1', datum: '2026-07-15', saldo: 123456 }

  it('bewaart en verwijdert een waardering', () => {
    expect(pasToe([regel({ gebeurtenis: { type: 'waardering.bewaard', payload: w } })]).waarderingen.get('w1')).toEqual(w)
    const weg: Logregel[] = [
      regel({ tijdstip: 1, gebeurtenis: { type: 'waardering.bewaard', payload: w } }),
      regel({ tijdstip: 2, gebeurtenis: { type: 'waardering.verwijderd', payload: { id: 'w1' } } }),
    ]
    expect(pasToe(weg).waarderingen.has('w1')).toBe(false)
  })

  it('laat de laatste wijziging winnen', () => {
    const regels: Logregel[] = [
      regel({ tijdstip: 1, gebeurtenis: { type: 'waardering.bewaard', payload: { ...w, saldo: 1 } } }),
      regel({ tijdstip: 2, gebeurtenis: { type: 'waardering.bewaard', payload: { ...w, saldo: 2 } } }),
    ]
    expect(pasToe(regels).waarderingen.get('w1')?.saldo).toBe(2)
  })
})
