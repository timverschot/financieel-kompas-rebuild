import type { Aflossing, Lening } from '../data/schema'

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
