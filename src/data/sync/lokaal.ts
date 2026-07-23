import { db } from '../db'
import { pasToe } from './replay'
import { GebeurtenisSchema, type Gebeurtenis, type Logregel } from './events'
import { nieuwId } from './id'
import { lokaleStap, ontvangstStap, type Stempel } from './hlc'

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

// De tabellen die bij een schrijfactie betrokken zijn.
const SCHRIJF_TABELLEN = () => [
  db.events,
  db.transacties,
  db.rekeningen,
  db.categorieen,
  db.budgetten,
  db.dossiers,
  db.gedeeldeKosten,
  db.verrekeningen,
  db.terugkerendePosten,
  db.spaardoelen,
  db.subcategorieen,
  db.overboekingen,
  db.kinderen,
  db.meta,
]

// De tabellen die de huidige staat bevatten (afgeleid uit het logboek).
const STAAT_TABELLEN = () => [
  db.rekeningen,
  db.transacties,
  db.categorieen,
  db.budgetten,
  db.dossiers,
  db.gedeeldeKosten,
  db.verrekeningen,
  db.terugkerendePosten,
  db.spaardoelen,
  db.subcategorieen,
  db.overboekingen,
  db.kinderen,
]

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
    case 'verrekening.bewaard':
      await db.verrekeningen.put(g.payload)
      break
    case 'verrekening.verwijderd':
      await db.verrekeningen.delete(g.payload.id)
      break
    case 'terugkerendepost.bewaard':
      await db.terugkerendePosten.put(g.payload)
      break
    case 'terugkerendepost.verwijderd':
      await db.terugkerendePosten.delete(g.payload.id)
      break
    case 'spaardoel.bewaard':
      await db.spaardoelen.put(g.payload)
      break
    case 'spaardoel.verwijderd':
      await db.spaardoelen.delete(g.payload.id)
      break
    case 'subcategorie.bewaard':
      await db.subcategorieen.put(g.payload)
      break
    case 'subcategorie.verwijderd':
      await db.subcategorieen.delete(g.payload.id)
      break
    case 'overboeking.bewaard':
      await db.overboekingen.put(g.payload)
      break
    case 'overboeking.verwijderd':
      await db.overboekingen.delete(g.payload.id)
      break
    case 'kind.bewaard':
      await db.kinderen.put(g.payload)
      break
    case 'kind.verwijderd':
      await db.kinderen.delete(g.payload.id)
      break
  }
}

// Elke lokale wijziging loopt hierlangs: de gebeurtenis wordt gevalideerd, als
// logregel bewaard (append-only) én toegepast op de huidige staat - alles in één
// database-transactie, zodat logboek en staat nooit uit elkaar lopen.
export async function pasGebeurtenisToe(gebeurtenis: Gebeurtenis): Promise<void> {
  const geldig = GebeurtenisSchema.parse(gebeurtenis)
  await db.transaction('rw', SCHRIJF_TABELLEN(), async () => {
    const toestelId = await haalToestelId()
    const volg = ((await leesMeta<number>('volgnummer')) ?? 0) + 1
    await schrijfMeta('volgnummer', volg)
    const nu = Date.now()
    const vorigeHlc = (await leesMeta<Stempel>('hlc')) ?? { l: 0, c: 0 }
    const stempel = lokaleStap(vorigeHlc, nu)
    await schrijfMeta('hlc', stempel)
    const regel: Logregel = {
      id: nieuwId(),
      toestelId,
      volgnummer: volg,
      tijdstip: nu,
      hlcL: stempel.l,
      hlcC: stempel.c,
      gebeurtenis: geldig,
    }
    await db.events.put(regel)
    await pasStaatToe(regel)
  })
}

// Werk de eigen hybride logische klok bij nadat wijzigingen van andere toestellen
// zijn binnengekomen, zodat volgende eigen wijzigingen er zeker ná geordend worden.
export async function verwerkOntvangenHlc(stempels: Stempel[]): Promise<void> {
  if (stempels.length === 0) return
  const nu = Date.now()
  let state = (await leesMeta<Stempel>('hlc')) ?? { l: 0, c: 0 }
  for (const s of stempels) state = ontvangstStap(state, s, nu)
  await schrijfMeta('hlc', state)
}

// Herbouwt de volledige staat uit het logboek. Nodig na het binnenhalen van
// wijzigingen van andere toestellen.
export async function herbouwStaat(): Promise<void> {
  const regels = await db.events.toArray()
  const staat = pasToe(regels)
  await db.transaction('rw', STAAT_TABELLEN(), async () => {
    await db.rekeningen.clear()
    await db.transacties.clear()
    await db.categorieen.clear()
    await db.budgetten.clear()
    await db.dossiers.clear()
    await db.gedeeldeKosten.clear()
    await db.verrekeningen.clear()
    await db.terugkerendePosten.clear()
    await db.spaardoelen.clear()
    await db.subcategorieen.clear()
    await db.overboekingen.clear()
    await db.kinderen.clear()
    await db.rekeningen.bulkPut([...staat.rekeningen.values()])
    await db.transacties.bulkPut([...staat.transacties.values()])
    await db.categorieen.bulkPut([...staat.categorieen.values()])
    await db.budgetten.bulkPut([...staat.budgetten.values()])
    await db.dossiers.bulkPut([...staat.dossiers.values()])
    await db.gedeeldeKosten.bulkPut([...staat.gedeeldeKosten.values()])
    await db.verrekeningen.bulkPut([...staat.verrekeningen.values()])
    await db.terugkerendePosten.bulkPut([...staat.terugkerendePosten.values()])
    await db.spaardoelen.bulkPut([...staat.spaardoelen.values()])
    await db.subcategorieen.bulkPut([...staat.subcategorieen.values()])
    await db.overboekingen.bulkPut([...staat.overboekingen.values()])
    await db.kinderen.bulkPut([...staat.kinderen.values()])
  })
}
