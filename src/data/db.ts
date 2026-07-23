import Dexie, { type Table } from 'dexie'
import type { Categorie, Rekening, Transactie } from './schema'
import type { Logregel, MetaRegel } from './sync/events'
import { nieuwId } from './sync/id'

// De echte database in de browser (IndexedDB), via Dexie. Dit is de bron van
// waarheid op je toestel: snel, offline, en met echte garanties.
export class FinancieelKompasDB extends Dexie {
  rekeningen!: Table<Rekening, string>
  transacties!: Table<Transactie, string>
  events!: Table<Logregel, string>
  meta!: Table<MetaRegel, string>
  categorieen!: Table<Categorie, string>

  constructor() {
    super('financieel-kompas')

    // Versie 1 - Fase 1: de eerste tabellen (huidige staat).
    this.version(1).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum',
    })

    // Versie 2 - Fase 2: het append-only logboek (events) en een
    // sleutel/waarde-opslag (meta). Bij de upgrade krijgen bestaande records uit
    // Fase 1 alsnog een gebeurtenis, zodat het logboek de volledige geschiedenis
    // bevat en er niets verloren gaat.
    this.version(2)
      .stores({
        rekeningen: 'id, naam',
        transacties: 'id, rekeningId, datum',
        events: 'id, toestelId, volgnummer',
        meta: 'sleutel',
      })
      .upgrade(async (trans) => {
        const toestelId = nieuwId()
        await trans.table('meta').put({ sleutel: 'toestelId', waarde: toestelId })
        let volg = 0
        const nu = Date.now()
        for (const r of await trans.table('rekeningen').toArray()) {
          volg++
          await trans.table('events').put({
            id: nieuwId(),
            toestelId,
            volgnummer: volg,
            tijdstip: nu,
            gebeurtenis: { type: 'rekening.bewaard', payload: r },
          })
        }
        for (const t of await trans.table('transacties').toArray()) {
          volg++
          await trans.table('events').put({
            id: nieuwId(),
            toestelId,
            volgnummer: volg,
            tijdstip: nu,
            gebeurtenis: { type: 'transactie.bewaard', payload: t },
          })
        }
        await trans.table('meta').put({ sleutel: 'volgnummer', waarde: volg })
      })

    // Versie 3 - categorieën. Nieuwe tabel + een index op categorieId bij
    // transacties. Bestaande transacties hebben nog geen categorie; dat mag
    // (het veld is optioneel), dus er is geen omzetting van data nodig.
    this.version(3).stores({
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum, categorieId',
      events: 'id, toestelId, volgnummer',
      meta: 'sleutel',
      categorieen: 'id, naam',
    })
  }
}

export const db = new FinancieelKompasDB()
