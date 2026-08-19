import { INDEX_BASISJAAR, bekendeIndexmaanden, gezondheidsindex } from './gezondheidsindex'
import { CPI_BASISJAAR, bekendeCpiMaanden, consumptieprijsindex } from './consumptieprijsindex'

// Welke indexreeks geldt voor deze regeling? (ronde 58)
//
// De app kent er twee, en het verschil is geen technisch detail:
//
//   * de CONSUMPTIEPRIJSINDEX — de volledige korf. Dit is de wettelijke standaard
//     voor een onderhoudsbijdrage (art. 203quater oud BW: "het indexcijfer van de
//     consumptieprijzen").
//   * de GEZONDHEIDSINDEX — dezelfde korf min tabak, alcohol, benzine en diesel.
//     Dit is de juiste reeks voor HUUR en voor LONEN, en ze is óók juist voor een
//     onderhoudsbijdrage wanneer de akte haar uitdrukkelijk noemt.
//
// ⚠ WAAROM DE APP NIET GEWOON DE WET VOLGT EN KLAAR. De wet zegt "tenzij anders
// overeengekomen of anders beslist door de rechtbank". Een akte die "gezondheidsindex"
// zegt, is bindend. De app kan dus niet één reeks opleggen; ze kan alleen de
// wettelijke standaard voorstellen, tonen wélke ze gebruikt, en jou laten wisselen.
// Een app die stil de verkeerde reeks gebruikt — wat deze app tot ronde 58 deed —
// produceert een bedrag dat er juist uitziet en het niet is.
//
// ⚠ EN DE REGEL DIE OVER BEIDE REEKSEN GAAT: nooit twee reeksen of twee basisjaren
// in één breuk. Zie `bouwOpbouw` in `utils/onderhoudsbijdrage.ts` — die bewaakt dat
// al voor het basisjaar, en sinds deze ronde ook voor de reeks.

/** De reeksen die de app kent. Taal-onafhankelijke sleutels, zoals overal. */
export const INDEXREEKSEN = ['consumptieprijzen', 'gezondheid'] as const
export type Indexreeks = (typeof INDEXREEKSEN)[number]

/**
 * De reeks die de app gebruikt wanneer er niets gekozen is.
 *
 * De wettelijke standaard, en dus de veilige kant: wie niets kiest, krijgt wat de
 * wet zegt. Wie een akte heeft die iets anders bepaalt, kiest bewust.
 */
export const STANDAARD_INDEXREEKS: Indexreeks = 'consumptieprijzen'

export type Indexreeksinfo = {
  reeks: Indexreeks
  /** De naam zoals ze op het scherm komt, als kop. Vertaalbaar via `t()`. */
  naam: string
  /**
   * Dezelfde naam zoals ze middenin een zin staat ("volgt de consumptieprijsindex").
   *
   * Apart, omdat een kop en een zin niet dezelfde hoofdletter dragen — en omdat het
   * Frans er "l'indice des prix à la consommation" van maakt, wat in een kop iets
   * anders leest dan in een zin. Beide vormen zijn dus vertaalbaar, elk apart.
   */
  naamInZin: string
  /** Eén zin over waar deze reeks voor dient. Vertaalbaar. */
  uitleg: string
  /**
   * Waar de cijfers vandaan komen. Staat vandaag nergens op het scherm; het veld
   * bestaat zodat de reeks haar eigen verantwoording meedraagt, net als
   * `data/opzegregels.ts` en `data/fiscalePosten.ts` dat doen.
   */
  bron: string
  nagekekenOp: string
}

export const INDEXREEKS_INFO: Indexreeksinfo[] = [
  {
    reeks: 'consumptieprijzen',
    naam: 'Consumptieprijsindex',
    naamInZin: 'consumptieprijsindex',
    uitleg:
      'De wettelijke standaard voor een onderhoudsbijdrage. Artikel 203quater van het oud Burgerlijk Wetboek bindt de bijdrage aan het indexcijfer van de consumptieprijzen.',
    bron: 'https://statbel.fgov.be/nl/themas/consumptieprijsindex/consumptieprijsindex',
    nagekekenOp: '2026-08-19',
  },
  {
    reeks: 'gezondheid',
    naam: 'Gezondheidsindex',
    naamInZin: 'gezondheidsindex',
    uitleg:
      'Dezelfde korf min tabak, alcohol, benzine en diesel. Kies deze alleen wanneer je akte haar uitdrukkelijk noemt; voor huur is zij wél de juiste.',
    bron: 'https://statbel.fgov.be/nl/themas/consumptieprijsindex/gezondheidsindex',
    nagekekenOp: '2026-08-19',
  },
]

/** De beschrijving van één reeks. */
export function reeksinfo(reeks: Indexreeks | undefined): Indexreeksinfo {
  return INDEXREEKS_INFO.find((r) => r.reeks === (reeks ?? STANDAARD_INDEXREEKS)) ?? INDEXREEKS_INFO[0]
}

/** De reeks van een regeling, met de standaard erin verwerkt. */
export function reeksVan(reeks: Indexreeks | undefined): Indexreeks {
  return reeks ?? STANDAARD_INDEXREEKS
}

/** Het indexcijfer van één maand uit de gevraagde reeks, of `undefined`. */
export function indexcijfer(reeks: Indexreeks | undefined, maand: string): number | undefined {
  return reeksVan(reeks) === 'gezondheid' ? gezondheidsindex(maand) : consumptieprijsindex(maand)
}

/** Kent de app deze maand in deze reeks? */
export function kentIndexmaand(reeks: Indexreeks | undefined, maand: string): boolean {
  return indexcijfer(reeks, maand) !== undefined
}

/** De maanden die de app in deze reeks kent, oudste eerst. */
export function bekendeMaanden(reeks: Indexreeks | undefined): string[] {
  return reeksVan(reeks) === 'gezondheid' ? bekendeIndexmaanden() : bekendeCpiMaanden()
}

/** De laatste maand waarvoor de app in deze reeks een cijfer kent. */
export function laatsteIndexmaand(reeks: Indexreeks | undefined): string {
  const maanden = bekendeMaanden(reeks)
  return maanden[maanden.length - 1]
}

/** De eerste maand waarvoor de app in deze reeks een cijfer kent. */
export function eersteIndexmaand(reeks: Indexreeks | undefined): string {
  return bekendeMaanden(reeks)[0]
}

/**
 * Het basisjaar van de gevraagde reeks.
 *
 * Vandaag staan beide tabellen in basis 2013, maar dat hoeft niet zo te blijven:
 * Statbel herbaseerde de consumptieprijsindex in januari 2026 naar 2025 = 100 en
 * publiceert beide bases naast elkaar. Vraagt de app het basisjaar per reeks op, dan
 * kan één tabel later meeverhuizen zonder de andere.
 */
export function basisjaarVan(reeks: Indexreeks | undefined): number {
  return reeksVan(reeks) === 'gezondheid' ? INDEX_BASISJAAR : CPI_BASISJAAR
}
