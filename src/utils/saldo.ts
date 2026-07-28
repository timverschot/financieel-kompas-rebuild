import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'

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
//
// SINDS RONDE 38 is er een derde bron: de WAARDERING. Die is geen term in de som
// maar een nieuw VERTREKPUNT — "op deze dag stond er dit". Daarom is 'waarderingen'
// een verplichte parameter en staat hij vóór het optionele 'totDatum': zo faalt het
// bouwen bij elke oproep die hem vergeet, in plaats van stilzwijgend een verouderd
// saldo terug te geven. Heb je geen waarderingen, geef dan expliciet `[]` mee.

/**
 * De waardering die op 'totDatum' geldt voor deze rekening, of undefined.
 *
 * De laatste waardering op of vóór die dag wint. Staan er twee op dezelfde dag,
 * dan beslist de id — niet omdat dat inhoudelijk juist is, maar omdat de uitkomst
 * dan tenminste op elk toestel dezelfde is. (Een gebeurtenissenlogboek dat op twee
 * toestellen een ander saldo oplevert, is erger dan een willekeurige keuze.)
 */
export function geldendeWaardering(
  rekeningId: string,
  waarderingen: Waardering[],
  totDatum?: string,
): Waardering | undefined {
  let beste: Waardering | undefined
  for (const w of waarderingen) {
    if (w.rekeningId !== rekeningId) continue
    if (totDatum !== undefined && w.datum > totDatum) continue
    if (!beste || w.datum > beste.datum || (w.datum === beste.datum && w.id > beste.id)) beste = w
  }
  return beste
}

// Het saldo van één rekening op een bepaalde dag (t.e.m. die dag, formaat
// JJJJ-MM-DD). Zonder 'totDatum' telt alles mee.
export function saldoOpDatum(
  rekeningId: string,
  beginsaldo: number,
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
  totDatum?: string,
): number {
  // Geldt er een waardering, dan begint de telling daar in plaats van bij het
  // beginsaldo. Alles van vóór of óp die dag zit al in dat bedrag verwerkt: een
  // waardering is de EINDSTAND van haar dag, net zoals 'totDatum' inclusief is.
  const w = geldendeWaardering(rekeningId, waarderingen, totDatum)
  const vanaf = w?.datum
  let saldo = w ? w.saldo : beginsaldo
  for (const t of transacties) {
    if (t.rekeningId !== rekeningId) continue
    if (totDatum !== undefined && t.datum > totDatum) continue
    if (vanaf !== undefined && t.datum <= vanaf) continue
    saldo += t.bedrag
  }
  for (const o of overboekingen) {
    if (totDatum !== undefined && o.datum > totDatum) continue
    if (vanaf !== undefined && o.datum <= vanaf) continue
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
  waarderingen: Waardering[],
  totDatum?: string,
): number {
  return saldoOpDatum(rekening.id, rekening.beginsaldo, transacties, overboekingen, waarderingen, totDatum)
}

// Het totaal over alle meegegeven rekeningen. Gearchiveerde rekeningen horen hier
// gewoon bij: dat geld bestaat nog steeds.
export function totaalSaldoVan(
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
  totDatum?: string,
): number {
  return rekeningen.reduce(
    (som, r) => som + saldoVanRekening(r, transacties, overboekingen, waarderingen, totDatum),
    0,
  )
}
