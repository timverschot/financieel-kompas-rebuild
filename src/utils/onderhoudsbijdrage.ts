import { gezondheidsindex, laatsteIndexmaand } from '../data/gezondheidsindex'
import { indexeerBedrag } from './indexatie'

// De rekenkern van de onderhoudsbijdrage (ronde 42).
//
// Zuiver: geen React, geen database, geen `new Date()` zonder dat de aanroeper hem
// meegeeft. Zo valt elk cijfer los na te rekenen — en dat moet ook, want dit zijn
// bedragen waarover twee ouders het oneens kunnen zijn.
//
// De regels komen uit `claude/domeinonderzoek_kinderkosten_alimentatie_belgie.md`
// (sectie 4) en staan hier samengevat omdat de code ze moet volgen:
//
//   Nieuw bedrag = basisbedrag x (nieuwe index / aanvangsindex)
//
//   * de AANVANGSINDEX is de gezondheidsindex van de maand VÓÓR de maand waarin
//     het bedrag werd vastgelegd (de datum van het vonnis of de overeenkomst);
//   * de NIEUWE INDEX is die van de maand VÓÓR de maand van de aanpassing;
//   * de aanpassing gebeurt JAARLIJKS, van rechtswege, op de verjaardag van de
//     regeling — tenzij de akte iets anders bepaalt.
//
// Wat deze module bewust NIET doet: iets zeggen over verjaringstermijnen, of over
// wie gelijk heeft. Ze rekent uit wat er volgens de regeling verschuldigd was en
// wat er betaald is. Het verschil is een feit; wat je ermee doet niet.

/**
 * Hoeveel verjaardagen de app hoogstens uitrekent.
 *
 * Een vangnet tegen een vertikte datum: een datumveld laat "0221-09-15" toe, en dan
 * zou de opbouw achttienhonderd regels lang worden — op het scherm én in de PDF.
 * Honderd jaar is ruimer dan elke echte regeling.
 */
export const MAX_JAREN = 100

/** Hoeveel maanden de achterstandsberekening hoogstens telt. */
export const MAX_MAANDEN = MAX_JAREN * 12

/** De maand vóór een datum, als 'JJJJ-MM'. */
export function maandVoor(datumISO: string): string {
  const [jaar, maand] = datumISO.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand)) return datumISO.slice(0, 7)
  const vorige = maand === 1 ? { j: jaar - 1, m: 12 } : { j: jaar, m: maand - 1 }
  return `${vorige.j}-${String(vorige.m).padStart(2, '0')}`
}

/** De gegevens die deze rekenkern van een bijdrage nodig heeft. */
export type BijdrageInvoer = {
  /** Het bedrag zoals het in het vonnis of de overeenkomst staat, in centen. */
  basisbedrag: number
  /** De datum van het vonnis of de overeenkomst, 'JJJJ-MM-DD'. */
  datumRegeling: string
  /** Wordt er geïndexeerd? Een akte kan het uitsluiten. */
  geindexeerd?: boolean
  /**
   * De aanvangsindex zoals ze letterlijk in de akte staat.
   *
   * Alleen invullen wanneer de akte een ander cijfer noemt dan wat de app voor die
   * maand kent — bijvoorbeeld omdat het vonnis van vóór de laatste herbasering
   * dateert en dus een andere maatstaf gebruikt. Staat dit veld ingevuld, dan
   * horen ALLE cijfers van de gebruiker te komen; zie `INDEX_BASISJAAR`.
   */
  aanvangsindexHandmatig?: number
  /**
   * Extra indexcijfers die de gebruiker zelf toevoegde, als 'JJJJ-MM' -> cijfer.
   *
   * Nodig omdat de meegeleverde tabel per definitie veroudert: de index van deze
   * maand verschijnt pas op het einde van de maand, en de app op je toestel is
   * ouder dan dat. Zonder deze mogelijkheid staat iemand met een verjaardag in een
   * te recente maand stil.
   */
  eigenIndexcijfers?: Record<string, number>
  /**
   * De dag waarop de regeling ophoudt (bv. bij het einde van de studies).
   *
   * Vanaf die dag komt er geen indexatie meer bij en telt er geen maand meer mee.
   * Zonder deze grens bleef de app op een afgelopen regeling jaar na jaar
   * doorindexeren en bovenaan een bedrag tonen dat al jaren niet meer bestond.
   */
  eindDatum?: string
}

/** Eén aanpassing op een verjaardag van de regeling. */
export type IndexatieStap = {
  /** De datum waarop deze aanpassing ingaat, 'JJJJ-MM-DD'. */
  datum: string
  /** Het hoeveelste jaar sinds de regeling (1 = de eerste verjaardag). */
  jaar: number
  /** De maand waaruit de nieuwe index komt, 'JJJJ-MM'. */
  indexmaand: string
  /** De nieuwe index, of null wanneer de app die maand niet kent. */
  nieuweIndex: number | null
  /** Het bedrag vanaf deze datum, in centen. Bij een onbekende index: het vorige bedrag. */
  bedrag: number
  /** Is dit bedrag berekend, of bleef het staan omdat de index ontbreekt? */
  berekend: boolean
}

export type BijdrageOpbouw = {
  /** De aanvangsindex die gebruikt is, of null wanneer ze onbekend is. */
  aanvangsindex: number | null
  /** Komt de aanvangsindex uit de akte in plaats van uit de tabel? */
  aanvangsindexUitAkte: boolean
  /** De maand waaruit de aanvangsindex komt, 'JJJJ-MM'. */
  aanvangsmaand: string
  /** Elke verjaardag tot en met vandaag, oudste eerst. */
  stappen: IndexatieStap[]
  /** Wat de bijdrage vandaag hoort te zijn, in centen. */
  huidigBedrag: number
  /** Maanden die de app niet kent en die de berekening blokkeren. */
  ontbrekendeMaanden: string[]
  /** De laatste maand waarvoor de app een cijfer kent. */
  laatsteBekendeMaand: string
}

/** Het indexcijfer van een maand, met de eigen toevoegingen van de gebruiker erbij. */
export function indexVan(maand: string, eigen?: Record<string, number>): number | undefined {
  // De eigen invoer gaat vóór: wie een cijfer zelf bijzet, corrigeert bewust.
  const eigenCijfer = eigen?.[maand]
  if (typeof eigenCijfer === 'number' && eigenCijfer > 0) return eigenCijfer
  return gezondheidsindex(maand)
}

/** Het aantal volledige jaren tussen twee datums. */
export function jarenTussen(vanISO: string, totISO: string): number {
  const [vj, vm, vd] = vanISO.split('-').map(Number)
  const [tj, tm, td] = totISO.split('-').map(Number)
  if (![vj, vm, vd, tj, tm, td].every(Number.isFinite)) return 0
  let jaren = tj - vj
  if (tm < vm || (tm === vm && td < vd)) jaren -= 1
  return Math.max(0, jaren)
}

/** De datum van de n-de verjaardag van een regeling, 'JJJJ-MM-DD'. */
export function verjaardag(datumRegeling: string, n: number): string {
  const [jaar, maand, dag] = datumRegeling.split('-').map(Number)
  if (![jaar, maand, dag].every(Number.isFinite)) return datumRegeling
  // 29 februari bestaat niet elk jaar; `new Date` schuift dan naar 1 maart, en dat
  // is ook wat er in de praktijk gebeurt — de aanpassing gaat niet verloren.
  const d = new Date(jaar + n, maand - 1, dag)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Bouwt de volledige geschiedenis van de bijdrage op: wat ze op elke verjaardag
 * werd, en wat ze vandaag hoort te zijn.
 *
 * Elke stap rekent vanaf het BASISBEDRAG, niet vanaf het bedrag van vorig jaar.
 * Dat is niet hetzelfde: jaar na jaar herindexeren stapelt afrondingen op elkaar en
 * geeft na tien jaar een ander bedrag dan de formule uit de akte. De akte zegt
 * "basisbedrag maal nieuwe index gedeeld door aanvangsindex", en dat is wat hier
 * staat.
 */
export function bouwOpbouw(invoer: BijdrageInvoer, vandaagISO: string): BijdrageOpbouw {
  const aanvangsmaand = maandVoor(invoer.datumRegeling)
  const uitAkte = typeof invoer.aanvangsindexHandmatig === 'number' && invoer.aanvangsindexHandmatig > 0
  const aanvangsindex = uitAkte
    ? (invoer.aanvangsindexHandmatig as number)
    : (indexVan(aanvangsmaand, invoer.eigenIndexcijfers) ?? null)

  const ontbrekende: string[] = []
  if (aanvangsindex === null) ontbrekende.push(aanvangsmaand)

  const stappen: IndexatieStap[] = []
  let bedrag = invoer.basisbedrag

  // Indexeren uitgezet in de akte: dan is er geen enkele stap en blijft het
  // basisbedrag gelden. Dat mag: het is een geldige afspraak.
  // Na de einddatum verandert er niets meer: dan telt de laatste dag van de
  // regeling, niet vandaag.
  const peildatum = invoer.eindDatum && invoer.eindDatum < vandaagISO ? invoer.eindDatum : vandaagISO
  const jaren = invoer.geindexeerd === false ? 0 : Math.min(jarenTussen(invoer.datumRegeling, peildatum), MAX_JAREN)

  for (let n = 1; n <= jaren; n++) {
    const datum = verjaardag(invoer.datumRegeling, n)
    const indexmaand = maandVoor(datum)
    const nieuweIndex = indexVan(indexmaand, invoer.eigenIndexcijfers) ?? null
    if (nieuweIndex === null) {
      if (!ontbrekende.includes(indexmaand)) ontbrekende.push(indexmaand)
      // Zonder cijfer geen nieuw bedrag: het vorige blijft staan, en het scherm
      // zegt waarom. Een geschat bedrag zou hier het gevaarlijkste zijn wat we
      // kunnen doen.
      stappen.push({ datum, jaar: n, indexmaand, nieuweIndex: null, bedrag, berekend: false })
      continue
    }
    bedrag =
      aanvangsindex === null ? bedrag : indexeerBedrag(invoer.basisbedrag, aanvangsindex, nieuweIndex)
    stappen.push({
      datum,
      jaar: n,
      indexmaand,
      nieuweIndex,
      bedrag,
      berekend: aanvangsindex !== null,
    })
  }

  return {
    aanvangsindex,
    aanvangsindexUitAkte: uitAkte,
    aanvangsmaand,
    stappen,
    huidigBedrag: bedrag,
    ontbrekendeMaanden: ontbrekende,
    laatsteBekendeMaand: laatsteIndexmaand(),
  }
}

/**
 * Het bedrag dat op een gegeven dag verschuldigd was, in centen.
 *
 * De laatste verjaardag die op of vóór die dag viel, bepaalt het bedrag.
 */
export function bedragOp(opbouw: BijdrageOpbouw, basisbedrag: number, datumISO: string): number {
  let bedrag = basisbedrag
  for (const stap of opbouw.stappen) {
    if (stap.datum <= datumISO) bedrag = stap.bedrag
  }
  return bedrag
}

/** Eén maand in de achterstandsberekening. */
export type MaandRegel = { maand: string; verschuldigd: number }

/**
 * Wat er maand na maand verschuldigd was, vanaf de regeling tot en met de maand van
 * `vandaagISO`.
 *
 * Waarom per maand en niet "bedrag maal aantal maanden": tussen de eerste en de
 * laatste maand liggen meestal meerdere indexaanpassingen. Vermenigvuldigen met het
 * bedrag van vandaag maakt de achterstand structureel te hoog — precies de
 * verontschuldiging die in `utils/kindrekening.ts` staat opgeschreven en die deze
 * module niet meer nodig heeft, omdat de datum van de regeling nu bewaard wordt.
 */
export function verschuldigdPerMaand(
  invoer: BijdrageInvoer,
  opbouw: BijdrageOpbouw,
  vandaagISO: string,
): MaandRegel[] {
  // De einddatum van de regeling gaat vóór op vandaag: loopt ze al af sinds 2018,
  // dan telt er sindsdien geen maand meer mee.
  const grens = invoer.eindDatum && invoer.eindDatum < vandaagISO ? invoer.eindDatum : vandaagISO
  const eindMaand = grens.slice(0, 7)
  const start = invoer.datumRegeling.slice(0, 7)
  if (eindMaand < start) return []

  const regels: MaandRegel[] = []
  let [jaar, maand] = start.split('-').map(Number)
  for (let i = 0; i < MAX_MAANDEN; i++) {
    // Het jaartal met nullen aangevuld: zonder dat is '221-09' groter dan '2026-07'
    // als tekst, en dan stopt de lus meteen — met nul maanden naast een opbouw vol
    // verjaardagen.
    const huidige = `${String(jaar).padStart(4, '0')}-${String(maand).padStart(2, '0')}`
    if (huidige > eindMaand) break
    // De eerste dag van de maand als peildatum: een aanpassing die halverwege de
    // maand ingaat, telt pas vanaf de maand erna. Dat is de eenvoudigste regel die
    // niemand benadeelt, en het scherm zegt hoe er geteld wordt.
    regels.push({ maand: huidige, verschuldigd: bedragOp(opbouw, invoer.basisbedrag, `${huidige}-01`) })
    maand += 1
    if (maand > 12) {
      maand = 1
      jaar += 1
    }
  }
  return regels
}

export type Achterstand = {
  /** Alles wat er sinds de regeling verschuldigd was, in centen. */
  verschuldigd: number
  /** Alles wat er betaald is, in centen. */
  betaald: number
  /** Positief = er staat nog iets open. Negatief = er is te veel betaald. */
  open: number
  /** Het aantal maanden waarover geteld is. */
  maanden: number
}

/**
 * Wat er nog openstaat: het verschuldigde min het betaalde.
 *
 * Bewust geen oordeel in de naam of in de uitkomst. Een negatief getal betekent dat
 * er meer betaald is dan berekend, en dat is geen fout — vooruitbetalen mag.
 */
export function berekenAchterstand(
  regels: MaandRegel[],
  betalingen: { bedrag: number; datum?: string; voorMaand?: string }[],
): Achterstand {
  const verschuldigd = regels.reduce((som, r) => som + r.verschuldigd, 0)
  // Alleen de betalingen die bij de getelde maanden horen.
  //
  // Waarom dat nodig is: is de regeling in 2018 afgelopen, dan telt het
  // verschuldigde tot 2018 — maar een storting van 2020 werd toch afgetrokken, en
  // dan meldde de app "te veel betaald" voor geld dat nooit bij deze periode hoorde.
  //
  // `voorMaand` gaat vóór op de datum: wie een oude maand inhaalt, boekt de betaling
  // vandaag maar bedoelt een maand van toen. Zonder dat veld valt de app terug op de
  // datum van de overschrijving.
  const maanden = new Set(regels.map((r) => r.maand))
  const meetellend = betalingen.filter((b) => {
    const maand = b.voorMaand ?? b.datum?.slice(0, 7)
    // Zonder datum én zonder maand telt ze mee: liever meetellen dan stil weglaten.
    if (!maand) return true
    return maanden.has(maand)
  })
  const betaald = meetellend.reduce((som, b) => som + b.bedrag, 0)
  return { verschuldigd, betaald, open: verschuldigd - betaald, maanden: regels.length }
}

/**
 * Staat er een indexatie te wachten, en sinds wanneer?
 *
 * Geeft de eerstvolgende verjaardag terug die al voorbij is en waarvan het bedrag
 * verschilt van wat er vóór die dag gold. Dat is het moment waarop er een melding
 * hoort te komen: de aanpassing gebeurt van rechtswege, maar de betalende ouder
 * past zijn overschrijving niet vanzelf aan.
 */
export function laatsteAanpassing(opbouw: BijdrageOpbouw, basisbedrag: number): IndexatieStap | null {
  const berekend = opbouw.stappen.filter((s) => s.berekend)
  if (berekend.length === 0) return null
  const laatste = berekend[berekend.length - 1]
  const vorige = berekend.length > 1 ? berekend[berekend.length - 2].bedrag : basisbedrag
  return laatste.bedrag === vorige ? null : laatste
}

/** De eerstvolgende verjaardag ná vandaag, 'JJJJ-MM-DD'. */
export function volgendeVerjaardag(datumRegeling: string, vandaagISO: string): string {
  return verjaardag(datumRegeling, jarenTussen(datumRegeling, vandaagISO) + 1)
}
