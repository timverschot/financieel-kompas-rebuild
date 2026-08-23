import {
  basisjaarVan,
  indexcijfer,
  laatsteIndexmaand,
  reeksVan,
  type Indexreeks,
} from '../data/indexreeksen'
import { indexeerBedrag } from './indexatie'

/**
 * Hoeveel een zelf ingetikte aanvangsindex van het cijfer in de tabel mag afwijken
 * en toch als "hetzelfde cijfer" gelden: een half procent.
 *
 * Waarom er speling nodig is: wie het cijfer uit zijn akte overtikt, kan afronden
 * (110,1 in plaats van 110,05). Waarom de speling klein mag blijven: een
 * herbasering schuift de hele reeks met tientallen procenten op, dus die valt er
 * nooit binnen. Een tikfout van een factor tien evenmin.
 *
 * ⚠ WAT DEZE TOLERANTIE NIET KAN (nakijkronde ronde 58). Ze kan de twee INDEXREEKSEN
 * niet uit elkaar houden: in 113 van de 138 gemeenschappelijke maanden liggen de
 * consumptieprijsindex en de gezondheidsindex minder dan een half procent uit elkaar.
 * Aan het getal zelf is dus niet te zien uit welke korf het komt. Daarvoor bestaat
 * `eigenIndexreeks` — een stempel op het gegeven, niet een controle achteraf.
 */
export const AKTE_TOLERANTIE = 0.005

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
//   * de AANVANGSINDEX is het indexcijfer van de maand VÓÓR de maand waarin het
//     bedrag werd vastgelegd (de datum van het vonnis of de overeenkomst);
//   * de NIEUWE INDEX is die van de maand VÓÓR de maand van de aanpassing;
//   * de aanpassing gebeurt JAARLIJKS, van rechtswege, op de verjaardag van de
//     regeling — tenzij de akte iets anders bepaalt.
//
// ⚠ WELKE INDEXREEKS (ronde 58, en dit was een echte fout). Tot deze ronde rekende
// de module altijd met de GEZONDHEIDSINDEX. De wet zegt CONSUMPTIEPRIJZEN; de
// gezondheidsindex is de reeks voor huur en lonen. Een akte mag wél uitdrukkelijk
// de gezondheidsindex opleggen, dus de reeks reist nu mee als gegeven in plaats van
// vast te staan in de code. Zie `data/indexreeksen.ts`.
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
   * Welke indexreeks. Ontbreekt ze, dan geldt de wettelijke standaard
   * (consumptieprijzen). Zie `data/indexreeksen.ts` voor waarom dit een keuze is.
   */
  indexreeks?: Indexreeks
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
   * Het basisjaar waarin de EIGEN MAANDCIJFERS hierboven uitgedrukt staan.
   *
   * Waarom dit veld bestaat (ronde 47). Een indexcijfer is een kaal getal; wat het
   * betekent, hangt volledig af van de basis waarin het staat. Statbel herbaseert
   * om de zoveel jaar: alle cijfers worden dan door dezelfde constante gedeeld.
   * Zolang beide cijfers uit dezelfde reeks komen, klopt de verhouding — maar zodra
   * er één van elk gebruikt wordt, rekent de app met twee maatstaven en zit het
   * bedrag er tientallen procenten naast. Zonder foutmelding.
   *
   * Dit veld gaat NIET over `aanvangsindexHandmatig`. Dat cijfer komt uit een akte
   * van jaren geleden en niemand kan van de gebruiker verwachten dat hij weet in
   * welke basis het staat — de app leidt dat zelf af, door het te vergelijken met
   * haar eigen tabel. Zie `indexConflict`.
   *
   * De maandcijfers die de gebruiker zelf bijzet, tikt hij vandaag over uit de
   * lopende publicatie, dus in de basis die vandaag geldt. Ontbreekt het veld, dan
   * is dat basis 2013 — de enige basis die deze app ooit gehad heeft. Na een
   * volgende herbasering vertelt het veld dat die cijfers verouderd zijn.
   */
  indexBasisjaar?: number
  /**
   * In welke REEKS die eigen cijfers staan. Ontbreekt ze, dan is dat de reeks van
   * de regeling zelf. Zie `eigenIndexreeks` in `data/schema.ts`.
   */
  eigenIndexreeks?: Indexreeks
  /**
   * De dag waarop de regeling ophoudt (bv. bij het einde van de studies).
   *
   * Vanaf die dag komt er geen indexatie meer bij en telt er geen maand meer mee.
   * Zonder deze grens bleef de app op een afgelopen regeling jaar na jaar
   * doorindexeren en bovenaan een bedrag tonen dat al jaren niet meer bestond.
   */
  eindDatum?: string
}

/**
 * Een bewaarde onderhoudsbijdrage omzetten naar wat de rekenkern vraagt.
 *
 * Waarom dit hier staat en niet in het scherm: deze velden werden op drie plekken
 * met de hand overgetikt (het dossierscherm, de meldingen, de PDF-brief), en toen er
 * in ronde 47 één veld bijkwam, vergat de meldingenlijst het. Gevolg: het
 * dossierscherm weigerde een bedrag te tonen terwijl de startpagina er wél eentje
 * meldde. Eén functie, drie aanroepers.
 */
export function alsBijdrageInvoer(b: {
  basisbedrag: number
  datumRegeling: string
  geindexeerd?: boolean
  indexreeks?: Indexreeks
  aanvangsindexHandmatig?: number
  eigenIndexcijfers?: Record<string, number>
  eigenIndexreeks?: Indexreeks
  indexBasisjaar?: number
  eindDatum?: string
}): BijdrageInvoer {
  return {
    basisbedrag: b.basisbedrag,
    datumRegeling: b.datumRegeling,
    geindexeerd: b.geindexeerd,
    indexreeks: b.indexreeks,
    aanvangsindexHandmatig: b.aanvangsindexHandmatig,
    eigenIndexcijfers: b.eigenIndexcijfers,
    eigenIndexreeks: b.eigenIndexreeks,
    indexBasisjaar: b.indexBasisjaar,
    eindDatum: b.eindDatum,
  }
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

/**
 * De twee manieren waarop een berekening cijfers uit verschillende indexreeksen
 * door elkaar zou halen.
 *
 * - `akte-met-tabel`: de gebruiker tikte de aanvangsindex uit zijn akte in, maar de
 *   jaarlijkse cijfers zouden uit de meegeleverde tabel komen. De akte kan van vóór
 *   een herbasering dateren; dan staan die twee getallen in een andere maatstaf.
 * - `ander-basisjaar`: de eigen maandcijfers zijn ingetikt toen de app nog een
 *   andere basis gebruikte dan nu.
 */
export type IndexConflict = 'akte-met-tabel' | 'ander-basisjaar' | 'andere-reeks'

export type BijdrageOpbouw = {
  /** De aanvangsindex die gebruikt is, of null wanneer ze onbekend is. */
  aanvangsindex: number | null
  /** Komt de aanvangsindex uit de akte in plaats van uit de tabel? */
  aanvangsindexUitAkte: boolean
  /**
   * Het cijfer dat de gebruiker letterlijk intikte, ook wanneer de berekening
   * geweigerd is. Zonder dit veld kan het scherm bij een conflict niet zeggen wélk
   * getal het over heeft — `aanvangsindex` is dan namelijk null.
   */
  aanvangsindexIngetikt: number | null
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
  /**
   * Zou deze berekening cijfers uit twee verschillende indexreeksen door elkaar
   * halen? Dan rekent deze functie niets uit: het basisbedrag blijft staan, en het
   * scherm legt uit waarom. Een bedrag dat er tientallen procenten naast zit maar er
   * geloofwaardig uitziet, is het gevaarlijkste wat deze app kan tonen.
   *
   * `null` betekent: geen vermenging, de uitkomst mag gebruikt worden.
   */
  indexConflict: IndexConflict | null
  /** Het basisjaar van de meegeleverde tabel, voor de uitleg op het scherm. */
  basisjaarTabel: number
  /**
   * De indexreeks waarmee gerekend is (ronde 58).
   *
   * Reist mee met de uitkomst zodat het scherm en de brief kunnen zeggen wélke
   * reeks gebruikt is. Zonder dat is een bedrag een kaal getal, en dan kan een
   * tegenpartij niet nakijken of het uit de juiste korf komt.
   */
  reeks: Indexreeks
  /**
   * De reeks waarin de EIGEN cijfers staan, voor de uitleg bij een conflict.
   * Gelijk aan `reeks` zolang er niets aan de hand is.
   */
  eigenReeks: Indexreeks
  /** Het basisjaar waarin de eigen maandcijfers staan, voor de uitleg op het scherm. */
  basisjaarEigen: number
  /**
   * Wat de tabel van de app zelf voor de aanvangsmaand kent, of null wanneer ze die
   * maand niet heeft. Hiermee kan het scherm zeggen: "de app kent dit cijfer al —
   * laat het veld leeg" in plaats van enkel te weigeren.
   */
  aanvangsindexTabel: number | null
  /**
   * De verjaardagsmaanden waarvoor deze berekening de tabel van de app zou
   * gebruiken. Bij `akte-met-tabel` zijn dit precies de maanden die de gebruiker
   * zelf moet invullen om de vermenging op te heffen.
   */
  tabelMaanden: string[]
}

/**
 * Het indexcijfer van een maand, met de eigen toevoegingen van de gebruiker erbij.
 *
 * De reeks staat vooraan omdat ze het antwoord bepaalt: dezelfde maand geeft in de
 * consumptieprijsindex een ander getal dan in de gezondheidsindex.
 */
export function indexVan(
  maand: string,
  eigen?: Record<string, number>,
  reeks?: Indexreeks,
): number | undefined {
  // De eigen invoer gaat vóór: wie een cijfer zelf bijzet, corrigeert bewust.
  const eigenCijfer = eigen?.[maand]
  if (typeof eigenCijfer === 'number' && eigenCijfer > 0) return eigenCijfer
  return indexcijfer(reeks, maand)
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
  const reeks = reeksVan(invoer.indexreeks)
  const aanvangsmaand = maandVoor(invoer.datumRegeling)
  const uitAkte = typeof invoer.aanvangsindexHandmatig === 'number' && invoer.aanvangsindexHandmatig > 0
  const eigen = invoer.eigenIndexcijfers ?? {}

  // Indexeren uitgezet in de akte: dan is er geen enkele stap en blijft het
  // basisbedrag gelden. Dat mag: het is een geldige afspraak.
  // Na de einddatum verandert er niets meer: dan telt de laatste dag van de
  // regeling, niet vandaag.
  const peildatum = invoer.eindDatum && invoer.eindDatum < vandaagISO ? invoer.eindDatum : vandaagISO
  const jarenMogelijk =
    invoer.geindexeerd === false ? 0 : Math.min(jarenTussen(invoer.datumRegeling, peildatum), MAX_JAREN)

  // --- Zouden er cijfers uit twee verschillende reeksen in één breuk komen? ---
  //
  // De regel staat in `data/gezondheidsindex.ts` en in het projectdossier: ofwel
  // komen beide cijfers uit de tabel van de app, ofwel tikt de gebruiker ze allebei
  // zelf in. Nooit één van elk. Een aanvangsindex die letterlijk in een vonnis uit
  // 2010 staat, is uitgedrukt in de basis van tóén; delen door een cijfer uit de
  // huidige tabel geeft een verschil van tientallen procenten.
  //
  // Belangrijk: we VRAGEN de gebruiker niets. Hij weet doorgaans niet in welke basis
  // zijn akte staat, en een antwoord dat hij moet raden is erger dan geen antwoord.
  // De app leidt het af uit wat ze zelf weet.

  // Voor welke verjaardagsmaanden zou de app haar eigen tabel raadplegen?
  const tabelMaanden: string[] = []
  for (let n = 1; n <= jarenMogelijk; n++) {
    const maand = maandVoor(verjaardag(invoer.datumRegeling, n))
    const eigenCijfer = eigen[maand]
    if (typeof eigenCijfer === 'number' && eigenCijfer > 0) continue
    if (indexcijfer(reeks, maand) === undefined) continue
    if (!tabelMaanden.includes(maand)) tabelMaanden.push(maand)
  }

  // Kent de tabel de aanvangsmaand, en is het ingetikte cijfer daaraan gelijk? Dan
  // is bewezen dat de akte in dezelfde reeks staat en is er niets aan de hand — dat
  // is het gewone geval van een recente regeling die de gebruiker letterlijk
  // overtikt.
  const aanvangsindexTabel = indexcijfer(reeks, aanvangsmaand) ?? null
  const akteVolgtTabel =
    uitAkte &&
    aanvangsindexTabel !== null &&
    Math.abs((invoer.aanvangsindexHandmatig as number) - aanvangsindexTabel) <=
      aanvangsindexTabel * AKTE_TOLERANTIE

  // Vult de gebruiker élke verjaardagsmaand zelf in, dan komt de tabel er niet aan
  // te pas en mag zijn akte in gelijk welke reeks staan. Dat is de uitweg voor een
  // oud vonnis: alle cijfers uit dezelfde oude reeks.
  const conflictAkte = uitAkte && !akteVolgtTabel && tabelMaanden.length > 0

  // De tweede vermenging: eigen maandcijfers uit de tijd dat de app een andere basis
  // gebruikte. Dat kan pas gebeuren na een volgende herbasering van de meegeleverde
  // tabel. Wordt er niet geïndexeerd, dan komt er ook geen breuk aan te pas.
  const basisjaarTabel = basisjaarVan(reeks)
  const basisjaarEigen = invoer.indexBasisjaar ?? basisjaarTabel
  const heeftEigen = Object.keys(eigen).length > 0
  const conflictBasisjaar = invoer.geindexeerd !== false && heeftEigen && basisjaarEigen !== basisjaarTabel

  // De DERDE vermenging, gevonden in de nakijkronde van ronde 58: eigen maandcijfers
  // die in de ándere reeks staan. Wie 140,17 uit de consumptieprijsindex overtikt en
  // de regeling daarna op de gezondheidsindex zet, krijgt anders een brief die
  // "volgt de gezondheidsindex" beweert met een getal dat in die reeks niet bestaat.
  //
  // ⚠ Dit kan de tolerantie van `akteVolgtTabel` NIET vangen: de twee reeksen liggen
  // in de meeste maanden minder dan een half procent uit elkaar. Alleen een stempel
  // op het gegeven zelf werkt.
  const conflictReeks =
    invoer.geindexeerd !== false && heeftEigen && (invoer.eigenIndexreeks ?? reeks) !== reeks

  const indexConflict: IndexConflict | null = conflictBasisjaar
    ? 'ander-basisjaar'
    : conflictReeks
      ? 'andere-reeks'
      : conflictAkte
        ? 'akte-met-tabel'
        : null

  const aanvangsindex = indexConflict
    ? null
    : uitAkte
      ? (invoer.aanvangsindexHandmatig as number)
      : (indexVan(aanvangsmaand, invoer.eigenIndexcijfers, reeks) ?? null)

  const ontbrekende: string[] = []
  if (aanvangsindex === null && !indexConflict) ontbrekende.push(aanvangsmaand)

  const stappen: IndexatieStap[] = []
  let bedrag = invoer.basisbedrag

  const jaren = indexConflict ? 0 : jarenMogelijk

  for (let n = 1; n <= jaren; n++) {
    const datum = verjaardag(invoer.datumRegeling, n)
    const indexmaand = maandVoor(datum)
    // ⚠ Dezelfde reeks als de aanvangsindex, anders staan er twee verschillende
    // korven in één breuk — precies de fout die deze module elders bewaakt.
    const nieuweIndex = indexVan(indexmaand, invoer.eigenIndexcijfers, reeks) ?? null
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
    aanvangsindexIngetikt: uitAkte ? (invoer.aanvangsindexHandmatig as number) : null,
    aanvangsmaand,
    stappen,
    huidigBedrag: bedrag,
    ontbrekendeMaanden: ontbrekende,
    laatsteBekendeMaand: laatsteIndexmaand(reeks),
    indexConflict,
    basisjaarTabel,
    reeks,
    eigenReeks: invoer.eigenIndexreeks ?? reeks,
    basisjaarEigen,
    aanvangsindexTabel,
    tabelMaanden,
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
  /** Wat er betaald is EN bij de getelde maanden hoort, in centen. */
  betaald: number
  /** Positief = er staat nog iets open. Negatief = er is te veel betaald. */
  open: number
  /** Het aantal maanden waarover geteld is. */
  maanden: number
  /**
   * Hoeveel betalingen er in `betaald` zitten (ronde 69).
   *
   * WAAROM DIT ERBIJ MOEST. Het scherm zette naast het bedrag "{n} betaling(en)
   * geregistreerd" met `betalingen.length` — ALLE betalingen — terwijl het bedrag
   * ernaast alleen de betalingen binnen de getelde maanden optelt. Bij een regeling
   * die in 2018 afliep las je dan "14 betalingen geregistreerd" bij een bedrag dat
   * er negen telde, en het verschil leek een rekenfout van de app.
   */
  aantalBetalingen: number
  /** Hoeveel betalingen er buiten de getelde maanden vielen en dus NIET meegeteld zijn. */
  aantalBuitenPeriode: number
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
  return {
    verschuldigd,
    betaald,
    open: verschuldigd - betaald,
    maanden: regels.length,
    aantalBetalingen: meetellend.length,
    aantalBuitenPeriode: betalingen.length - meetellend.length,
  }
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
