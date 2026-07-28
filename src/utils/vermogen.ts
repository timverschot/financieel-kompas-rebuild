import type { Aflossing, Lening, Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { saldoOpDatum } from './saldo'
import { openstaandKapitaal } from './lening'

// Rekenkern voor het vermogen. Twee cijfers die je nooit door elkaar mag halen:
//
//   BEZIT   = de som van je rekeningsaldo's. Wat er op je rekeningen staat.
//   VERMOGEN = bezit + wat men jou nog schuldig is − wat jij nog schuldig bent.
//
// Tot ronde 38 kende de app alleen het eerste, en noemde dat "je totale vermogen".
// Dat was misleidend: je kon € 80.000 krediet hebben en toch een mooi positief
// cijfer zien. Nu bestaan beide, met elk hun eigen naam.
//
// Waarom leningen een APARTE laag zijn en niet in `totaalSaldoVan` verweven:
// een lening staat op geen enkele rekening. Ze heeft geen rekeningId, geen
// transacties en geen datumverloop per dag — alleen een hoofdsom en aflossingen.
// Ze in de saldofunctie duwen zou van "wat staat er op deze rekening" een
// halfslachtig begrip maken.

export type EvolutiePunt = { maand: string; totaal: number; perRekening: Record<string, number> }

// Saldo van één rekening op het einde van een maand ('JJJJ-MM'):
// beginsaldo (of de geldende waardering) + transacties + overboekingen.
export function saldoOpEinde(
  rekeningId: string,
  beginsaldo: number,
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
  eindeMaand: string,
): number {
  // 'JJJJ-MM-31' dekt als tekstvergelijking elke dag van die maand en eerder.
  return saldoOpDatum(rekeningId, beginsaldo, transacties, overboekingen, waarderingen, `${eindeMaand}-31`)
}

// Voor elke maand in 'maanden' het saldo per rekening en het totaal daarvan.
// Let op: 'totaal' is het BEZIT (som van de rekeningen), niet het netto vermogen —
// zie `nettoVermogen` hieronder.
export function vermogensEvolutie(
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
  maanden: string[],
): EvolutiePunt[] {
  return maanden.map((maand) => {
    const perRekening: Record<string, number> = {}
    let totaal = 0
    for (const r of rekeningen) {
      const s = saldoOpEinde(r.id, r.beginsaldo, transacties, overboekingen, waarderingen, maand)
      perRekening[r.id] = s
      totaal += s
    }
    return { maand, totaal, perRekening }
  })
}

/** Wat er per saldo nog openstaat in leningen: uitgeleend telt op, geleend telt af. */
export type Leningstand = {
  /** Wat men jou nog moet terugbetalen (positief). */
  teOntvangen: number
  /** Wat jij nog moet terugbetalen (positief). */
  teBetalen: number
  /** teOntvangen − teBetalen. Negatief wanneer je meer schuld hebt dan tegoed. */
  netto: number
}

/**
 * De leningstand op dit moment.
 *
 * Een manueel afgesloten lening telt niet meer mee — dezelfde regel als in
 * `totaalOpenstaand`: ze is bewust afgerond (kwijtgescholden, vervroegd afbetaald),
 * ook al staat er rekenkundig nog iets open.
 *
 * Let op het teken: `totaalOpenstaand` geeft voor béíde richtingen een POSITIEF
 * bedrag terug. Het teken van een schuld wordt hier aangebracht, en nergens anders.
 */
export function leningstand(leningen: Lening[], aflossingen: Aflossing[]): Leningstand {
  let teOntvangen = 0
  let teBetalen = 0
  for (const l of leningen) {
    if (l.afgesloten) continue
    const open = openstaandKapitaal(l, aflossingen)
    if (l.richting === 'geleend') teBetalen += open
    else teOntvangen += open
  }
  return { teOntvangen, teBetalen, netto: teOntvangen - teBetalen }
}

/**
 * Het netto vermogen: wat er op je rekeningen staat, plus wat men jou nog
 * schuldig is, min wat jij nog schuldig bent.
 *
 * 'bezit' geef je zelf mee (meestal `totaalSaldoVan(...)`), zodat deze functie
 * zuiver blijft en niet opnieuw over alle transacties hoeft te lopen.
 */
export function nettoVermogen(bezit: number, leningen: Lening[], aflossingen: Aflossing[]): number {
  return bezit + leningstand(leningen, aflossingen).netto
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
