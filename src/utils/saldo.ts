import type { Overboeking, Rekening, Transactie } from '../data/schema'

// Eén plek voor "wat staat er op een rekening".
//
// Waarom dit bestaat: dit werd op drie plaatsen anders berekend. De
// vermogensevolutie telde beginsaldo + transacties + overboekingen, de
// spaardoelen alleen beginsaldo + transacties (waardoor geld dat je naar je
// spaarrekening overboekte niet meetelde in je spaardoel), en het grote
// saldo-cijfer telde alle transacties zonder datumgrens (waardoor een transactie
// met een datum in de toekomst nu al meetelde). Sinds ronde 7 gebruiken ze
// alledrie deze functies.
//
// Overboekingen zijn verschuivingen tussen je eigen rekeningen: ze veranderen het
// saldo van elke rekening apart, maar niet je totale vermogen. Dat klopt dus ook
// automatisch wanneer je hieronder over alle rekeningen optelt.

// Het saldo van één rekening op een bepaalde dag (t.e.m. die dag, formaat
// JJJJ-MM-DD). Zonder 'totDatum' telt alles mee.
export function saldoOpDatum(
  rekeningId: string,
  beginsaldo: number,
  transacties: Transactie[],
  overboekingen: Overboeking[],
  totDatum?: string,
): number {
  let saldo = beginsaldo
  for (const t of transacties) {
    if (t.rekeningId !== rekeningId) continue
    if (totDatum !== undefined && t.datum > totDatum) continue
    saldo += t.bedrag
  }
  for (const o of overboekingen) {
    if (totDatum !== undefined && o.datum > totDatum) continue
    if (o.naarRekeningId === rekeningId) saldo += o.bedrag
    if (o.vanRekeningId === rekeningId) saldo -= o.bedrag
  }
  return saldo
}

// Hetzelfde, maar met de rekening zelf als vertrekpunt.
export function saldoVanRekening(
  rekening: Rekening,
  transacties: Transactie[],
  overboekingen: Overboeking[],
  totDatum?: string,
): number {
  return saldoOpDatum(rekening.id, rekening.beginsaldo, transacties, overboekingen, totDatum)
}

// Het totaal over alle meegegeven rekeningen. Gearchiveerde rekeningen horen hier
// gewoon bij: dat geld bestaat nog steeds.
export function totaalSaldoVan(
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  totDatum?: string,
): number {
  return rekeningen.reduce((som, r) => som + saldoVanRekening(r, transacties, overboekingen, totDatum), 0)
}
