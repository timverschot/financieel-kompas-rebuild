import type { Rekening, Transactie } from '../schema'
import type { Logregel } from './events'

export type Staat = {
  rekeningen: Map<string, Rekening>
  transacties: Map<string, Transactie>
}

// Bepaalt de volgorde van twee logregels: eerst op tijd, dan op toestel, dan op
// volgnummer. Zo is de volgorde volledig bepaald (deterministisch) en verschilt
// ze nooit tussen toestellen.
function vergelijk(a: Logregel, b: Logregel): number {
  if (a.tijdstip !== b.tijdstip) return a.tijdstip - b.tijdstip
  if (a.toestelId !== b.toestelId) return a.toestelId < b.toestelId ? -1 : 1
  return a.volgnummer - b.volgnummer
}

// Zuivere functie: gegeven alle logregels (van alle toestellen), bereken de
// uiteindelijke staat. De regels worden op volgorde gezet en dan toegepast,
// zodat de laatste wijziging wint (last-writer-wins). Dezelfde invoer geeft
// altijd dezelfde uitkomst, ongeacht de volgorde van binnenkomst - de basis van
// conflictvrije synchronisatie tussen toestellen.
export function pasToe(regels: Logregel[]): Staat {
  const gesorteerd = [...regels].sort(vergelijk)
  const staat: Staat = { rekeningen: new Map(), transacties: new Map() }
  for (const r of gesorteerd) {
    const g = r.gebeurtenis
    switch (g.type) {
      case 'transactie.bewaard':
        staat.transacties.set(g.payload.id, g.payload)
        break
      case 'transactie.verwijderd':
        staat.transacties.delete(g.payload.id)
        break
      case 'rekening.bewaard':
        staat.rekeningen.set(g.payload.id, g.payload)
        break
      case 'rekening.verwijderd':
        staat.rekeningen.delete(g.payload.id)
        break
    }
  }
  return staat
}
