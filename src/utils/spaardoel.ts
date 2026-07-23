import type { Rekening, Spaardoel, Transactie } from '../data/schema'

// Het huidige saldo van een rekening: beginsaldo plus al haar transacties.
export function rekeningSaldo(rekeningId: string, rekeningen: Rekening[], transacties: Transactie[]): number {
  const begin = rekeningen.find((r) => r.id === rekeningId)?.beginsaldo ?? 0
  const mutaties = transacties.filter((t) => t.rekeningId === rekeningId).reduce((s, t) => s + t.bedrag, 0)
  return begin + mutaties
}

export type SpaardoelVoortgang = { huidig: number; doel: number; resterend: number; fractie: number }

// De voortgang van een spaardoel. Is er een rekening aan gekoppeld, dan komt het
// huidige bedrag uit het saldo van die rekening; anders uit het manueel
// bijgehouden bedrag. Alles in centen. 'fractie' zit tussen 0 en 1.
export function spaardoelVoortgang(
  doel: Spaardoel,
  rekeningen: Rekening[],
  transacties: Transactie[],
): SpaardoelVoortgang {
  const huidig = doel.gekoppeldeRekeningId
    ? rekeningSaldo(doel.gekoppeldeRekeningId, rekeningen, transacties)
    : doel.huidigBedrag
  const resterend = Math.max(doel.doelbedrag - huidig, 0)
  const fractie = doel.doelbedrag > 0 ? Math.min(Math.max(huidig / doel.doelbedrag, 0), 1) : 0
  return { huidig, doel: doel.doelbedrag, resterend, fractie }
}
