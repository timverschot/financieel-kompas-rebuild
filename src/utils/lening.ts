import type { Aflossing, Lening, LeningRichting, Transactie } from '../data/schema'

// Rekenlaag voor de leningen/kredieten-module. Zuivere functies in gehele centen,
// zodat ze los en deterministisch getest kunnen worden. De richting ('uitgeleend'
// vs 'geleend') verandert niets aan de rekenkunde: in beide gevallen daalt een
// openstaand kapitaal met elke gelogde aflossing. Ze bepaalt enkel de weergave.

// Alle aflossingen van één lening, oplopend gesorteerd op datum.
export function aflossingenVan(leningId: string, aflossingen: Aflossing[]): Aflossing[] {
  return aflossingen.filter((a) => a.leningId === leningId).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0))
}

// Som van de afgeloste bedragen.
export function totaalAfgelost(leningId: string, aflossingen: Aflossing[]): number {
  return aflossingenVan(leningId, aflossingen).reduce((s, a) => s + a.bedrag, 0)
}

// Het openstaand kapitaal: hoofdsom − afgelost, nooit onder nul.
export function openstaandKapitaal(lening: Lening, aflossingen: Aflossing[]): number {
  return Math.max(0, lening.hoofdsom - totaalAfgelost(lening.id, aflossingen))
}

// De voortgang als fractie 0..1 (hoeveel van de hoofdsom is afgelost).
export function voortgang(lening: Lening, aflossingen: Aflossing[]): number {
  if (lening.hoofdsom <= 0) return 1
  const afgelost = totaalAfgelost(lening.id, aflossingen)
  return Math.min(1, Math.max(0, afgelost / lening.hoofdsom))
}

// Is de lening volledig afgelost (of manueel afgesloten)?
export function isAfbetaald(lening: Lening, aflossingen: Aflossing[]): boolean {
  return !!lening.afgesloten || openstaandKapitaal(lening, aflossingen) === 0
}

// Wat er in totaal nog openstaat. Een manueel afgesloten lening telt niet meer
// mee: ze is bewust afgerond (kwijtgescholden, vervroegd afbetaald, …), ook al
// staat er rekenkundig nog een saldo open. Zonder 'richting' worden beide
// richtingen samengeteld.
export function totaalOpenstaand(leningen: Lening[], aflossingen: Aflossing[], richting?: LeningRichting): number {
  return leningen
    .filter((l) => !l.afgesloten && (richting === undefined || l.richting === richting))
    .reduce((som, l) => som + openstaandKapitaal(l, aflossingen), 0)
}

export type EvolutiePunt = { datum: string; openstaand: number }

// De evolutie van het openstaand kapitaal in de tijd: begint bij de startdatum op
// de volledige hoofdsom en daalt bij elke aflossing. Handig voor een
// geschiedenis-lijst of een eenvoudige grafiek.
export function evolutie(lening: Lening, aflossingen: Aflossing[]): EvolutiePunt[] {
  const punten: EvolutiePunt[] = [{ datum: lening.startdatum, openstaand: lening.hoofdsom }]
  let saldo = lening.hoofdsom
  for (const a of aflossingenVan(lening.id, aflossingen)) {
    saldo = Math.max(0, saldo - a.bedrag)
    punten.push({ datum: a.datum, openstaand: saldo })
  }
  return punten
}

function jaarMaand(iso: string): { j: number; m: number } {
  const [j, m] = iso.split('-').map(Number)
  return { j, m }
}

// Hele maanden tot de einddatum (negatief = de termijn is al verstreken). Enkel
// zinvol als er een einddatum is ingesteld. 'vandaag' wordt meegegeven zodat de
// berekening deterministisch blijft.
export function maandenTotEinde(einddatumISO: string, vandaagISO: string): number {
  const e = jaarMaand(einddatumISO)
  const v = jaarMaand(vandaagISO)
  return (e.j - v.j) * 12 + (e.m - v.m)
}

/**
 * Staat er al een boeking die deze aflossing zou kunnen zijn? (ronde 38)
 *
 * Waarom dit bestaat: een maandaflossing werd tot nu toe twee keer ingegeven —
 * één keer als transactie op je rekening en één keer als aflossing op de lening —
 * en niets vergeleek die twee. Je zag dus twee keer hetzelfde geld vertrekken
 * zonder dat de app er iets over zei.
 *
 * De criteria zijn bewust dezelfde als bij het inlezen van een bankuittreksel
 * (`markeerDubbels` in utils/bankimport.ts): dezelfde dag en hetzelfde bedrag tot
 * op de cent. De omschrijving speelt geen rol — bij een bank staat daar zelden
 * hetzelfde als wat jij intikt.
 *
 * Een aflossing is altijd een POSITIEF bedrag, maar de bijbehorende boeking niet:
 * los je een krediet af, dan is dat een UITGAVE (negatief); krijg je geld terug dat
 * je had uitgeleend, dan is dat een INKOMST (positief). Daarom bepaalt de richting
 * van de lening welk teken we zoeken. Zonder dat onderscheid stelde de app een
 * terugbetaling van bol.com van € 250 voor als "dit is je afbetaling van € 250".
 *
 * Het blijft een vermoeden. De app markeert, ze beslist niet — een aflossing kan
 * best van een rekening komen die je niet in Kompal hebt staan.
 */
export function boekingVoorAflossing(
  datum: string,
  bedrag: number,
  transacties: Transactie[],
  richting: LeningRichting,
  alGekoppeld: Aflossing[] = [],
): Transactie | undefined {
  const bezet = new Set(alGekoppeld.map((a) => a.transactieId).filter((id): id is string => !!id))
  const gezocht = richting === 'geleend' ? -Math.abs(bedrag) : Math.abs(bedrag)
  return transacties.find((t) => t.datum === datum && t.bedrag === gezocht && !bezet.has(t.id))
}
