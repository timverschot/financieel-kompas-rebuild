import Dexie, { type Table } from 'dexie'
import type { Rekening, Transactie } from './schema'

// De echte database in de browser (IndexedDB), via Dexie. Dit is de bron van
// waarheid op je toestel: snel, offline, en met echte garanties. Eén transactie
// wijzigen raakt alleen dat ene record - de "scheurende blob" van vroeger bestaat
// hier niet meer.
export class FinancieelKompasDB extends Dexie {
  rekeningen!: Table<Rekening, string>
  transacties!: Table<Transactie, string>

  constructor() {
    super('financieel-kompas')

    // --- Migratiesysteem ---
    // Versie 1 is het huidige schema. Wijzigt de datavorm ooit, dan voeg je
    // hieronder een nieuwe versie toe, bijvoorbeeld:
    //
    //   this.version(2).stores({ transacties: 'id, rekeningId, datum' })
    //     .upgrade(async (trans) => {
    //       await trans.table('transacties').toCollection().modify((t) => {
    //         if (t.valuta === undefined) t.valuta = 'EUR'
    //       })
    //     })
    //
    // Dexie zet bestaande data dan automatisch en veilig om. Dit vervangt de
    // oude, fragiele 'x || []'-trucs. Zie migration.test.ts voor een bewijs dat
    // dit werkt.
    this.version(1).stores({
      // De string somt de geïndexeerde velden op (voor snel zoeken).
      rekeningen: 'id, naam',
      transacties: 'id, rekeningId, datum',
    })
  }
}

export const db = new FinancieelKompasDB()
