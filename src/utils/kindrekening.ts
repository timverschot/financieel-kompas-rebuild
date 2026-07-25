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

// Wat er over alle voorbije termijnen samen verwacht wordt van één ouder.
//
// Waarom niet simpelweg "geïndexeerde bijdrage × termijnen"? Dan zou de index van
// vandaag met terugwerkende kracht gelden voor maanden waarin nog de oude, lagere
// bijdrage gold — de getoonde achterstand wordt daardoor structureel te hoog.
// Uit wat we bewaren (aanvangsindex + huidige index) valt niet af te leiden vanáf
// welke maand welke index gold; we weten enkel dat de huidige index nú geldt.
// Daarom, zonder een datum te verzinnen: de lopende termijn telt aan de
// geïndexeerde bijdrage, alle eerdere termijnen aan de niet-geïndexeerde
// basisbijdrage. Zo is de getoonde achterstand nooit hoger dan wat met zekerheid
// verschuldigd is (het scherm zegt erbij hoe er geteld wordt).
export function verwachtTotaal(kr: Kindrekening, basis: number | undefined, termijnen: number): number {
  if (!basis || basis <= 0 || termijnen <= 0) return 0
  return basis * (termijnen - 1) + geindexeerdeBijdrage(kr, basis)
}

// Waar wanneer het verwachte bedrag deels met de niet-geïndexeerde basisbijdrage
// geteld wordt: er is een indexatie ingesteld én er zijn eerdere termijnen dan de
// lopende. Het scherm zet er dan één regel bij die dat uitlegt.
export function teltVerledenZonderIndex(kr: Kindrekening, vandaagISO: string): boolean {
  const heeftIndex = !!(kr.aanvangsindex && kr.huidigeIndex && kr.huidigeIndex !== kr.aanvangsindex)
  const heeftBijdrage = !!(kr.maandbijdrageJij || kr.maandbijdragePartner)
  const termijnen = kr.bijdrageStart ? aantalTermijnen(kr.bijdrageStart, vandaagISO) : 0
  return heeftIndex && heeftBijdrage && termijnen > 1
}

export type OuderStand = { gestort: number; verwacht: number; verschil: number }

// Per ouder: hoeveel gestort, hoeveel verwacht (zie verwachtTotaal) en het
// verschil. Verschil < 0 = achterstand; > 0 = vooruit.
// Zonder maandbijdrage of startdatum is 'verwacht' 0 (dan tonen we geen achterstand).
export function standPerOuder(
  kr: Kindrekening,
  posten: Kindrekeningpost[],
  vandaagISO: string,
): { jij: OuderStand; partner: OuderStand } {
  const gestort = gestortPerOuder(posten)
  const termijnen = kr.bijdrageStart ? aantalTermijnen(kr.bijdrageStart, vandaagISO) : 0
  const verwachtJij = verwachtTotaal(kr, kr.maandbijdrageJij, termijnen)
  const verwachtPartner = verwachtTotaal(kr, kr.maandbijdragePartner, termijnen)
  return {
    jij: { gestort: gestort.jij, verwacht: verwachtJij, verschil: gestort.jij - verwachtJij },
    partner: { gestort: gestort.partner, verwacht: verwachtPartner, verschil: gestort.partner - verwachtPartner },
  }
}
