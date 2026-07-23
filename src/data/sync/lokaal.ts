import { db } from '../db'
import { pasToe } from './replay'
import { GebeurtenisSchema, type Gebeurtenis, type Logregel } from './events'
import { nieuwId } from './id'

// --- Sleutel/waarde-opslag (meta) ---
export async function leesMeta<T>(sleutel: string): Promise<T | undefined> {
  const r = await db.meta.get(sleutel)
  return r ? (r.waarde as T) : undefined
}

export async function schrijfMeta(sleutel: string, waarde: unknown): Promise<void> {
  await db.meta.put({ sleutel, waarde })
}

// Haalt de unieke id van dit toestel op, of maakt ze aan bij de eerste keer.
export async function haalToestelId(): Promise<string> {
  let id = await leesMeta<string>('toestelId')
  if (!id) {
    id = nieuwId()
    await schrijfMeta('toestelId', id)
  }
  return id
}

// Past één gebeurtenis toe op de huidige staat (voor eigen, nieuwe wijzigingen).
async function pasStaatToe(regel: Logregel): Promise<void> {
  const g = regel.gebeurtenis
  switch (g.type) {
    case 'transactie.bewaard':
      await db.transacties.put(g.payload)
      break
    case 'transactie.verwijderd':
      await db.transacties.delete(g.payload.id)
      break
    case 'rekening.bewaard':
      await db.rekeningen.put(g.payload)
      break
    case 'rekening.verwijderd':
      await db.rekeningen.delete(g.payload.id)
      break
    case 'categorie.bewaard':
      await db.categorieen.put(g.payload)
      break
    case 'categorie.verwijderd':
      await db.categorieen.delete(g.payload.id)
      break
    case 'budget.bewaard':
      await db.budgetten.put(g.payload)
      break
    case 'budget.verwijderd':
      await db.budgetten.delete(g.payload.id)
      break
    case 'dossier.bewaard':
      await db.dossiers.put(g.payload)
      break
    case 'dossier.verwijderd':
      await db.dossiers.delete(g.payload.id)
      break
    case 'gedeeldekost.bewaard':
      await db.gedeeldeKosten.put(g.payload)
      break
    case 'gedeeldekost.verwijderd':
      await db.gedeeldeKosten.delete(g.payload.id)
      break
  }
}

// Elke lokale wijziging loopt hierlangs: de gebeurtenis wordt gevalideerd, als
// logregel bewaard (append-only) én toegepast op de huidige staat - alles in één
// database-transactie, zodat logboek en staat nooit uit elkaar lopen.
export async function pasGebeurtenisToe(gebeurtenis: Gebeurtenis): Promise<void> {
  const geldig = GebeurtenisSchema.parse(gebeurtenis)
  await db.transaction(
    'rw',
    [db.events, db.transacties, db.rekeningen, db.categorieen, db.budgetten, db.dossiers, db.gedeeldeKosten, db.meta],
    async () => {
      const toestelId = await haalToestelId()
      const volg = ((await leesMeta<number>('volgnummer')) ?? 0) + 1
      await schrijfMeta('volgnummer', volg)
      const regel: Logregel = {
        id: nieuwId(),
        toestelId,
        volgnummer: volg,
        tijdstip: Date.now(),
        gebeurtenis: geldig,
      }
      await db.events.put(regel)
      await pasStaatToe(regel)
    },
  )
}

// Herbouwt de volledige staat uit het logboek. Nodig na het binnenhalen van
// wijzigingen van andere toestellen.
export async function herbouwStaat(): Promise<void> {
  const regels = await db.events.toArray()
  const staat = pasToe(regels)
  await db.transaction(
    'rw',
    [db.rekeningen, db.transacties, db.categorieen, db.budgetten, db.dossiers, db.gedeeldeKosten],
    async () => {
      await db.rekeningen.clear()
      await db.transacties.clear()
      await db.categorieen.clear()
      await db.budgetten.clear()
      await db.dossiers.clear()
      await db.gedeeldeKosten.clear()
      await db.rekeningen.bulkPut([...staat.rekeningen.values()])
      await db.transacties.bulkPut([...staat.transacties.values()])
      await db.categorieen.bulkPut([...staat.categorieen.values()])
      await db.budgetten.bulkPut([...staat.budgetten.values()])
      await db.dossiers.bulkPut([...staat.dossiers.values()])
      await db.gedeeldeKosten.bulkPut([...staat.gedeeldeKosten.values()])
    },
  )
}
