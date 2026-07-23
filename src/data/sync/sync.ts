import { db } from '../db'
import type { SyncBackend } from './backend'
import { LogregelSchema, type Logregel } from './events'
import { haalToestelId, herbouwStaat, leesMeta, schrijfMeta, verwerkOntvangenHlc } from './lokaal'

export type SyncResultaat = { gepusht: number; opgehaald: number; ongeldig: number }

// Eén synchronisatieronde: eerst eigen nieuwe wijzigingen versturen, dan
// wijzigingen van andere toestellen ophalen, valideren en de staat herbouwen.
export async function synchroniseer(backend: SyncBackend): Promise<SyncResultaat> {
  const toestelId = await haalToestelId()

  // --- PUSH: het volledige eigen logboek versturen zodra er iets nieuw is.
  // (Compactie: één bestand per toestel dat overschreven wordt, i.p.v. een nieuw
  // bestand per sync.) ---
  const laatstGepusht = (await leesMeta<number>('laatstGepushtVolgnummer')) ?? 0
  const eigen = await db.events.where('toestelId').equals(toestelId).sortBy('volgnummer')
  const nieuwEigen = eigen.filter((r) => r.volgnummer > laatstGepusht)

  if (nieuwEigen.length > 0) {
    await backend.stuur(toestelId, eigen)
    await schrijfMeta('laatstGepushtVolgnummer', eigen[eigen.length - 1].volgnummer)
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
    await verwerkOntvangenHlc(nieuw.map((r) => ({ l: r.hlcL ?? r.tijdstip, c: r.hlcC ?? 0 })))
    await herbouwStaat()
  }

  return { gepusht: nieuwEigen.length, opgehaald: nieuw.length, ongeldig }
}
