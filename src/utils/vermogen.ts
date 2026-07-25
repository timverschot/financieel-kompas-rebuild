import type { Overboeking, Rekening, Transactie } from '../data/schema'

// Rekenkern voor de vermogensevolutie: het saldo van elke rekening op het einde
// van een reeks maanden, en het totale vermogen (som over alle rekeningen).
// Zuiver en los testbaar.

export type EvolutiePunt = { maand: string; totaal: number; perRekening: Record<string, number> }

// Saldo van één rekening op het einde van een maand ('JJJJ-MM'):
// beginsaldo + alle transacties t/m die maand + overboekingen erin − eruit.
export function saldoOpEinde(
  rekeningId: string,
  beginsaldo: number,
  transacties: Transactie[],
  overboekingen: Overboeking[],
  eindeMaand: string,
): number {
  const grens = `${eindeMaand}-31` // JJJJ-MM-31 dekt elke dag van die maand en eerder
  let saldo = beginsaldo
  for (const t of transacties) if (t.rekeningId === rekeningId && t.datum <= grens) saldo += t.bedrag
  for (const o of overboekingen) {
    if (o.datum > grens) continue
    if (o.naarRekeningId === rekeningId) saldo += o.bedrag
    if (o.vanRekeningId === rekeningId) saldo -= o.bedrag
  }
  return saldo
}

// Voor elke maand in 'maanden' het saldo per rekening en het totale vermogen.
export function vermogensEvolutie(
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  maanden: string[],
): EvolutiePunt[] {
  return maanden.map((maand) => {
    const perRekening: Record<string, number> = {}
    let totaal = 0
    for (const r of rekeningen) {
      const s = saldoOpEinde(r.id, r.beginsaldo, transacties, overboekingen, maand)
      perRekening[r.id] = s
      totaal += s
    }
    return { maand, totaal, perRekening }
  })
}

// De laatste 'aantal' maanden t/m 'huidigeMaand' ('JJJJ-MM'), oplopend.
export function laatsteMaanden(huidigeMaand: string, aantal: number): string[] {
  const [j, m] = huidigeMaand.split('-').map(Number)
  const res: string[] = []
  for (let i = aantal - 1; i >= 0; i--) {
    const d = new Date(j, m - 1 - i, 1)
    res.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
  }
  return res
}
