import type { Kindrekening, Kindrekeningpost } from '../data/schema'
import { indexeerBedrag } from './indexatie'

// Rekenlaag voor de kindrekening (de gezamenlijke pot). Alle functies zijn zuiver
// en werken in gehele centen, zodat ze los en deterministisch getest kunnen worden.
// De "vandaag"-datum wordt altijd meegegeven (geen verborgen klok), zodat de
// achterstand-berekening voorspelbaar blijft.

function stortingen(posten: Kindrekeningpost[]): Kindrekeningpost[] {
  return posten.filter((p) => p.soort === 'storting')
}

function uitgaven(posten: Kindrekeningpost[]): Kindrekeningpost[] {
  return posten.filter((p) => p.soort === 'uitgave')
}

// Het saldo van de pot: startsaldo + alle stortingen − alle uitgaven.
export function potSaldo(kr: Kindrekening, posten: Kindrekeningpost[]): number {
  const bij = stortingen(posten).reduce((s, p) => s + p.bedrag, 0)
  const af = uitgaven(posten).reduce((s, p) => s + p.bedrag, 0)
  return kr.beginsaldo + bij - af
}

// Hoeveel elke ouder in totaal gestort heeft.
export function gestortPerOuder(posten: Kindrekeningpost[]): { jij: number; partner: number } {
  let jij = 0
  let partner = 0
  for (const p of stortingen(posten)) {
    if (p.door === 'partner') partner += p.bedrag
    else jij += p.bedrag // standaard/onbekend telt als 'jij'
  }
  return { jij, partner }
}

// Totaal dat vanuit de pot is uitgegeven.
export function totaalUitgaven(posten: Kindrekeningpost[]): number {
  return uitgaven(posten).reduce((s, p) => s + p.bedrag, 0)
}

// De (eventueel geïndexeerde) maandbijdrage voor één basisbedrag. Zijn er geen
// indexen ingesteld, dan is het gewoon het basisbedrag.
export function geindexeerdeBijdrage(kr: Kindrekening, basis: number | undefined): number {
  if (!basis || basis <= 0) return 0
  if (kr.aanvangsindex && kr.huidigeIndex) return indexeerBedrag(basis, kr.aanvangsindex, kr.huidigeIndex)
  return basis
}

function jaarMaandDag(iso: string): { j: number; m: number; d: number } {
  const [j, m, d] = iso.split('-').map(Number)
  return { j, m, d }
}

// Het aantal maandtermijnen sinds de startdatum, de startmaand meegeteld. Zo staat
// er in de startmaand zelf al één termijn open. Vóór de start: 0.
export function aantalTermijnen(startISO: string, vandaagISO: string): number {
  const s = jaarMaandDag(startISO)
  const v = jaarMaandDag(vandaagISO)
  const maanden = (v.j - s.j) * 12 + (v.m - s.m)
  return Math.max(0, maanden + 1)
}

export type OuderStand = { gestort: number; verwacht: number; verschil: number }

// Per ouder: hoeveel gestort, hoeveel verwacht (geïndexeerde maandbijdrage ×
// aantal termijnen) en het verschil. Verschil < 0 = achterstand; > 0 = vooruit.
// Zonder maandbijdrage of startdatum is 'verwacht' 0 (dan tonen we geen achterstand).
export function standPerOuder(
  kr: Kindrekening,
  posten: Kindrekeningpost[],
  vandaagISO: string,
): { jij: OuderStand; partner: OuderStand } {
  const gestort = gestortPerOuder(posten)
  const termijnen = kr.bijdrageStart ? aantalTermijnen(kr.bijdrageStart, vandaagISO) : 0
  const verwachtJij = geindexeerdeBijdrage(kr, kr.maandbijdrageJij) * termijnen
  const verwachtPartner = geindexeerdeBijdrage(kr, kr.maandbijdragePartner) * termijnen
  return {
    jij: { gestort: gestort.jij, verwacht: verwachtJij, verschil: gestort.jij - verwachtJij },
    partner: { gestort: gestort.partner, verwacht: verwachtPartner, verschil: gestort.partner - verwachtPartner },
  }
}
