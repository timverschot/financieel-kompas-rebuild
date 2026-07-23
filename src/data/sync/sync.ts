import { db } from '../db'
import type { SyncBackend } from './backend'
import { LogregelSchema, type Logregel } from './events'
import { haalToestelId, herbouwStaat, leesMeta, schrijfMeta } from './lokaal'

export type SyncResultaat = { gepusht: number; opgehaald: number; ongeldig: number }

// Eén synchronisatieronde: eerst eigen nieuwe wijzigingen versturen, dan
// wijzigingen van andere toestellen ophalen, valideren en de staat herbouwen.
export async function synchroniseer(backend: SyncBackend): Promise<SyncResultaat> {
  const toestelId = await haalToestelId()

  // --- PUSH: eigen regels die nog niet verstuurd zijn ---
  const laatstGepusht = (await leesMeta<number>('laatstGepushtVolgnummer')) ?? 0
  const teVersturen = await db.events
    .where('toestelId')
    .equals(toestelId)
    .and((r) => r.volgnummer > laatstGepusht)
    .sortBy('volgnummer')

  if (teVersturen.length > 0) {
    await backend.stuur(toestelId, teVersturen)
    await schrijfMeta('laatstGepushtVolgnummer', teVersturen[teVersturen.length - 1].volgnummer)
  }

  // --- PULL: alle regels ophalen, nieuwe eruit halen, valideren en toepassen ---
  const alle = await backend.haalOp()
  const bestaandeIds = new Set((await db.events.toArray()).map((e) => e.id))

  let ongeldig = 0
  const nieuw: Logregel[] = []
  for (const regel of alle) {
    if (bestaandeIds.has(regel.id)) continue
    const check = LogregelSchema.safeParse(regel)
    if (check.success) nieuw.push(check.data)
    else ongeldig++
  }

  if (nieuw.length > 0) {
    await db.events.bulkPut(nieuw)
    await herbouwStaat()
  }

  return { gepusht: teVersturen.length, opgehaald: nieuw.length, ongeldig }
}
