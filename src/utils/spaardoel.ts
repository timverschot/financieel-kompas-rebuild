import type { Overboeking, Rekening, Spaardoel, Transactie } from '../data/schema'
import { saldoOpDatum } from './saldo'

// Het huidige saldo van een rekening. Gebruikt bewust dezelfde rekenkern als de
// vermogensevolutie (utils/saldo.ts), zodat een spaardoel en de grafiek nooit meer
// een ander getal tonen. Sinds ronde 7 tellen ook OVERBOEKINGEN mee: geld dat je
// van je betaal- naar je spaarrekening boekt is de normale manier van sparen, en
// bleef vroeger onzichtbaar in je spaardoel.
export function rekeningSaldo(
  rekeningId: string,
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[] = [],
): number {
  const begin = rekeningen.find((r) => r.id === rekeningId)?.beginsaldo ?? 0
  return saldoOpDatum(rekeningId, begin, transacties, overboekingen)
}

export type SpaardoelVoortgang = { huidig: number; doel: number; resterend: number; fractie: number }

// De voortgang van een spaardoel. Is er een rekening aan gekoppeld, dan komt het
// huidige bedrag uit het saldo van die rekening; anders uit het manueel
// bijgehouden bedrag. Alles in centen. 'fractie' zit tussen 0 en 1.
export function spaardoelVoortgang(
  doel: Spaardoel,
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[] = [],
): SpaardoelVoortgang {
  const huidig = doel.gekoppeldeRekeningId
    ? rekeningSaldo(doel.gekoppeldeRekeningId, rekeningen, transacties, overboekingen)
    : doel.huidigBedrag
  const resterend = Math.max(doel.doelbedrag - huidig, 0)
  const fractie = doel.doelbedrag > 0 ? Math.min(Math.max(huidig / doel.doelbedrag, 0), 1) : 0
  return { huidig, doel: doel.doelbedrag, resterend, fractie }
}
