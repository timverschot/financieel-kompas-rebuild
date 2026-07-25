// Rekenkern van de pagina "Rekenhulpen".
//
// Alles hier is een ZUIVERE functie: dezelfde invoer geeft altijd dezelfde
// uitkomst, er wordt niets bewaard en er is geen scherm nodig. Zo kunnen de
// berekeningen los getest worden (zie rekenhulp.test.ts) en blijven de
// schermcomponenten dom: die tonen enkel wat hier uitkomt.
//
// Twee vaste afspraken van deze app:
//  1. Geld is ALTIJD een geheel aantal centen (€ 12,50 = 1250). Zie utils/format.ts.
//  2. Datums zijn tekst in het formaat JJJJ-MM-DD. Zie utils/datum.ts.
//
// Randgevallen (nul, negatief, een datum in het verleden, een deling door nul)
// geven nooit NaN of Infinity terug, maar een duidelijke foutcode. Het scherm
// zet die code om in een leesbare zin.

import { naarDatumTekst } from './datum'
import { indexeerBedrag } from './indexatie'

// ---------------------------------------------------------------------------
// Uitkomst: gelukt-met-waarde of mislukt-met-reden
// ---------------------------------------------------------------------------

/** Alle redenen waarom een berekening niet kan. Het scherm vertaalt deze code. */
export type Rekenfout =
  | 'bedrag-ontbreekt'
  | 'bedrag-nul'
  | 'index-ongeldig'
  | 'rente-ongeldig'
  | 'looptijd-ongeldig'
  | 'extra-ontbreekt'
  | 'aflossing-te-klein'
  | 'datum-ongeldig'
  | 'datum-verleden'
  | 'inleg-ontbreekt'
  | 'duurt-te-lang'
  | 'hoeveelheid-ongeldig'
  | 'gemengde-eenheden'
  | 'te-weinig-aanbiedingen'

/** Het antwoord van een rekenhulp: ofwel een waarde, ofwel een reden waarom niet. */
export type Resultaat<T> = { ok: true; waarde: T } | { ok: false; fout: Rekenfout }

function gelukt<T>(waarde: T): Resultaat<T> {
  return { ok: true, waarde }
}

function mislukt<T>(fout: Rekenfout): Resultaat<T> {
  return { ok: false, fout }
}

// ---------------------------------------------------------------------------
// Invoer lezen
// ---------------------------------------------------------------------------

/**
 * Leest een getypt getal (geen geld): "7,5" en "7.5" geven allebei 7,5.
 * Duizendtalpunten samen met een decimale komma ("1.234,5") worden begrepen.
 * Rommel zoals "7abc" of een lege tekst geeft NaN, zodat de aanroeper kan
 * valideren — precies zoals invoerNaarCenten dat voor geld doet.
 */
export function tekstNaarGetal(tekst: string): number {
  let s = tekst.trim().replace(/\s/g, '')
  if (s === '') return Number.NaN
  const heeftKomma = s.includes(',')
  const heeftPunt = s.includes('.')
  if (heeftKomma && heeftPunt) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (heeftKomma) {
    s = s.replace(',', '.')
  }
  if (!/^-?\d*\.?\d+$/.test(s)) return Number.NaN
  const waarde = Number.parseFloat(s)
  return Number.isFinite(waarde) ? waarde : Number.NaN
}

/** Toont een percentage in Belgische notatie, bv. 7.35 -> "7,35 %". */
export function formatProcent(waarde: number, decimalen = 1): string {
  if (!Number.isFinite(waarde)) return '—'
  return waarde.toFixed(decimalen).replace('.', ',') + ' %'
}

// ---------------------------------------------------------------------------
// 1. Indexatie (alimentatie en huur — exact dezelfde Belgische formule)
// ---------------------------------------------------------------------------

/**
 * Waarvoor indexeren we? De formule is identiek; enkel de uitleg en de namen op
 * het scherm verschillen (onderhoudsgeld gebruikt meestal de gewone index,
 * huur de gezondheidsindex).
 */
export type IndexatieSoort = 'alimentatie' | 'huur'

export type IndexatieUitkomst = {
  /** Het geïndexeerde bedrag, in centen. */
  nieuwBedragCenten: number
  /** Hoeveel het bedrag stijgt (of daalt) tegenover het basisbedrag, in centen. */
  verschilCenten: number
  /** Diezelfde stijging als percentage, bv. 7,35. */
  stijgingProcent: number
}

/**
 * Belgische indexatieformule: nieuw bedrag = basisbedrag × nieuwe index / aanvangsindex.
 * Rekent bovenop het kale bedrag ook het verschil en het stijgingspercentage uit,
 * want dat is wat mensen willen weten ("hoeveel meer wordt het?").
 */
export function indexatie(basisbedragCenten: number, aanvangsindex: number, nieuweIndex: number): Resultaat<IndexatieUitkomst> {
  if (!Number.isFinite(basisbedragCenten)) return mislukt('bedrag-ontbreekt')
  if (basisbedragCenten <= 0) return mislukt('bedrag-nul')
  if (!Number.isFinite(aanvangsindex) || !Number.isFinite(nieuweIndex)) return mislukt('index-ongeldig')
  // Een aanvangsindex van nul zou een deling door nul zijn; negatieve indexcijfers bestaan niet.
  if (aanvangsindex <= 0 || nieuweIndex <= 0) return mislukt('index-ongeldig')

  const nieuwBedragCenten = indexeerBedrag(basisbedragCenten, aanvangsindex, nieuweIndex)
  const verschilCenten = nieuwBedragCenten - basisbedragCenten
  const stijgingProcent = (nieuweIndex / aanvangsindex - 1) * 100
  return gelukt({ nieuwBedragCenten, verschilCenten, stijgingProcent })
}

// ---------------------------------------------------------------------------
// 2. Lening en aflossing
// ---------------------------------------------------------------------------

export type LeningUitkomst = {
  /** Wat je elke maand betaalt (kapitaal + interest samen), in centen. */
  maandlastCenten: number
  /** Alle maandlasten opgeteld, in centen. */
  totaalBetaaldCenten: number
  /** Wat je bovenop het geleende bedrag betaalt, in centen. */
  totaleInterestCenten: number
}

/**
 * De klassieke annuïteitsformule: elke maand exact dezelfde last.
 *
 *   maandlast = hoofdsom × i / (1 − (1 + i)^−n)     met i = maandrente
 *
 * Randgeval: bij 0 % rente deelt die formule door nul. Dan is het gewoon de
 * hoofdsom gedeeld door het aantal maanden.
 */
export function maandlast(hoofdsomCenten: number, jaarrenteProcent: number, looptijdMaanden: number): Resultaat<LeningUitkomst> {
  if (!Number.isFinite(hoofdsomCenten)) return mislukt('bedrag-ontbreekt')
  if (hoofdsomCenten <= 0) return mislukt('bedrag-nul')
  if (!Number.isFinite(jaarrenteProcent) || jaarrenteProcent < 0) return mislukt('rente-ongeldig')
  if (!Number.isFinite(looptijdMaanden) || looptijdMaanden < 1 || !Number.isInteger(looptijdMaanden)) {
    return mislukt('looptijd-ongeldig')
  }

  const i = jaarrenteProcent / 100 / 12
  const ruw = i === 0 ? hoofdsomCenten / looptijdMaanden : (hoofdsomCenten * i) / (1 - Math.pow(1 + i, -looptijdMaanden))
  if (!Number.isFinite(ruw)) return mislukt('rente-ongeldig')

  const maandlastCenten = Math.round(ruw)
  const totaalBetaaldCenten = maandlastCenten * looptijdMaanden
  return gelukt({
    maandlastCenten,
    totaalBetaaldCenten,
    totaleInterestCenten: Math.max(0, totaalBetaaldCenten - hoofdsomCenten),
  })
}

// Veiligheidsgrens: een aflossingsplan van meer dan 100 jaar is geen realistische
// lening meer, en beschermt tegen een eindeloze lus.
const MAX_MAANDEN = 1200

/**
 * Speelt een aflossingsplan maand per maand af, in centen.
 * Elke maand: interest op het openstaand saldo, de rest gaat naar kapitaal.
 * Geeft null terug als de betaling de maandelijkse interest niet dekt — dan
 * daalt het saldo nooit en zou de lus eeuwig draaien.
 */
function speelPlanAf(hoofdsomCenten: number, maandrente: number, betalingCenten: number): { maanden: number; interestCenten: number } | null {
  let saldo = hoofdsomCenten
  let interestCenten = 0
  let maanden = 0
  while (saldo > 0) {
    const rente = Math.round(saldo * maandrente)
    const naarKapitaal = betalingCenten - rente
    if (naarKapitaal <= 0) return null
    saldo -= naarKapitaal
    interestCenten += rente
    maanden += 1
    if (maanden > MAX_MAANDEN) return null
  }
  return { maanden, interestCenten }
}

export type ExtraAflossingUitkomst = {
  maandlastCenten: number
  /** Wat je effectief elke maand overmaakt: maandlast + extra. */
  totaleMaandbetalingCenten: number
  maandenOrigineel: number
  maandenNieuw: number
  /** Hoeveel maanden vroeger je klaar bent. */
  maandenKorter: number
  interestOrigineelCenten: number
  interestNieuwCenten: number
  /** Hoeveel interest je uitspaart. */
  interestBespaardCenten: number
}

/**
 * "Wat bespaar ik door € X extra per maand af te lossen?"
 *
 * Beide plannen (met en zonder extra) worden met dezelfde motor afgespeeld, zodat
 * de vergelijking eerlijk is: het verschil komt echt van de extra aflossing en
 * niet van een andere afrondingswijze.
 */
export function extraAflossing(
  hoofdsomCenten: number,
  jaarrenteProcent: number,
  looptijdMaanden: number,
  extraPerMaandCenten: number,
): Resultaat<ExtraAflossingUitkomst> {
  const basis = maandlast(hoofdsomCenten, jaarrenteProcent, looptijdMaanden)
  if (!basis.ok) return basis
  if (!Number.isFinite(extraPerMaandCenten) || extraPerMaandCenten <= 0) return mislukt('extra-ontbreekt')

  const i = jaarrenteProcent / 100 / 12
  const zonder = speelPlanAf(hoofdsomCenten, i, basis.waarde.maandlastCenten)
  const met = speelPlanAf(hoofdsomCenten, i, basis.waarde.maandlastCenten + extraPerMaandCenten)
  if (!zonder || !met) return mislukt('aflossing-te-klein')

  return gelukt({
    maandlastCenten: basis.waarde.maandlastCenten,
    totaleMaandbetalingCenten: basis.waarde.maandlastCenten + extraPerMaandCenten,
    maandenOrigineel: zonder.maanden,
    maandenNieuw: met.maanden,
    maandenKorter: zonder.maanden - met.maanden,
    interestOrigineelCenten: zonder.interestCenten,
    interestNieuwCenten: met.interestCenten,
    interestBespaardCenten: zonder.interestCenten - met.interestCenten,
  })
}

// ---------------------------------------------------------------------------
// 3. Spaardoel (bewust zonder rente — net als de spaardoelen in de app)
// ---------------------------------------------------------------------------

const DATUM_PATROON = /^\d{4}-\d{2}-\d{2}$/

function leesDatum(iso: string): { jaar: number; maand: number; dag: number } | null {
  if (!DATUM_PATROON.test(iso)) return null
  const [jaar, maand, dag] = iso.split('-').map(Number)
  if (maand < 1 || maand > 12 || dag < 1 || dag > 31) return null
  return { jaar, maand, dag }
}

/**
 * Telt maanden bij een datum op, met de gewone kalenderafspraak: 31 januari + 1
 * maand is 28 (of 29) februari, niet 3 maart.
 */
export function voegMaandenToe(datumISO: string, maanden: number): string {
  const d = leesDatum(datumISO)
  if (!d || !Number.isFinite(maanden)) return datumISO
  const totaal = d.maand - 1 + Math.trunc(maanden)
  const jaar = d.jaar + Math.floor(totaal / 12)
  const maandIndex = ((totaal % 12) + 12) % 12
  const laatsteDag = new Date(jaar, maandIndex + 1, 0).getDate()
  return naarDatumTekst(new Date(jaar, maandIndex, Math.min(d.dag, laatsteDag)))
}

/**
 * Het aantal maandstortingen dat nog tussen vandaag en de streefdatum past.
 * Een aangebroken maand telt volledig mee (naar boven afgerond): loopt de datum
 * over 2 maanden en 5 dagen af, dan reken je met 3 stortingen.
 * Geeft 0 of negatief terug als de datum niet meer in de toekomst ligt.
 */
export function maandenTussen(vanISO: string, totISO: string): number | null {
  const a = leesDatum(vanISO)
  const b = leesDatum(totISO)
  if (!a || !b) return null
  const volle = (b.jaar - a.jaar) * 12 + (b.maand - a.maand)
  return volle + (b.dag > a.dag ? 1 : 0)
}

export type SpaarplanUitkomst = {
  /** Wat er nog bij moet, in centen (nooit negatief). */
  resterendCenten: number
  /** Het aantal maandstortingen tot de streefdatum. */
  maanden: number
  /** Wat je elke maand opzij moet zetten, in centen (naar boven afgerond). */
  perMaandCenten: number
  /** Het doel is nu al gehaald: er hoeft niets meer bij. */
  alBereikt: boolean
}

/** "Hoeveel moet ik per maand opzijzetten om € X te halen tegen die datum?" */
export function maandbedragVoorDoel(
  doelbedragCenten: number,
  alGespaardCenten: number,
  streefdatumISO: string,
  vandaagISO: string,
): Resultaat<SpaarplanUitkomst> {
  if (!Number.isFinite(doelbedragCenten)) return mislukt('bedrag-ontbreekt')
  if (doelbedragCenten <= 0) return mislukt('bedrag-nul')
  const gespaard = Number.isFinite(alGespaardCenten) ? alGespaardCenten : 0
  const maanden = maandenTussen(vandaagISO, streefdatumISO)
  if (maanden === null) return mislukt('datum-ongeldig')
  if (maanden <= 0) return mislukt('datum-verleden')

  const resterendCenten = Math.max(0, doelbedragCenten - gespaard)
  if (resterendCenten === 0) {
    return gelukt({ resterendCenten: 0, maanden, perMaandCenten: 0, alBereikt: true })
  }
  // Naar boven afronden: met een cent te weinig per maand haal je het doel net niet.
  return gelukt({ resterendCenten, maanden, perMaandCenten: Math.ceil(resterendCenten / maanden), alBereikt: false })
}

export type SpaarduurUitkomst = {
  resterendCenten: number
  /** Aantal maandstortingen dat je nog nodig hebt. */
  maanden: number
  /** De datum waarop het doel gehaald is, als JJJJ-MM-DD. */
  datumISO: string
  alBereikt: boolean
}

/** "Wanneer haal ik € X als ik € Y per maand spaar?" */
export function datumVoorDoel(
  doelbedragCenten: number,
  alGespaardCenten: number,
  perMaandCenten: number,
  vandaagISO: string,
): Resultaat<SpaarduurUitkomst> {
  if (!Number.isFinite(doelbedragCenten)) return mislukt('bedrag-ontbreekt')
  if (doelbedragCenten <= 0) return mislukt('bedrag-nul')
  if (leesDatum(vandaagISO) === null) return mislukt('datum-ongeldig')
  const gespaard = Number.isFinite(alGespaardCenten) ? alGespaardCenten : 0
  const resterendCenten = Math.max(0, doelbedragCenten - gespaard)
  if (resterendCenten === 0) {
    return gelukt({ resterendCenten: 0, maanden: 0, datumISO: vandaagISO, alBereikt: true })
  }
  // Zonder maandbedrag zou dit een deling door nul zijn: je komt er nooit.
  if (!Number.isFinite(perMaandCenten) || perMaandCenten <= 0) return mislukt('inleg-ontbreekt')

  const maanden = Math.ceil(resterendCenten / perMaandCenten)
  if (maanden > MAX_MAANDEN) return mislukt('duurt-te-lang')
  return gelukt({ resterendCenten, maanden, datumISO: voegMaandenToe(vandaagISO, maanden), alBereikt: false })
}

// ---------------------------------------------------------------------------
// 4. Prijs per eenheid
// ---------------------------------------------------------------------------

/** De eenheden die je op een prijskaartje tegenkomt. */
export type Eenheid = 'g' | 'kg' | 'ml' | 'l' | 'stuk'

/** Waarop we uiteindelijk vergelijken: per kilo, per liter of per stuk. */
export type Basiseenheid = 'kg' | 'l' | 'stuk'

export type Aanbieding = {
  id: string
  naam: string
  prijsCenten: number
  hoeveelheid: number
  eenheid: Eenheid
}

export type PrijsVergelijking = {
  id: string
  naam: string
  /** De prijs per kilo / liter / stuk, afgerond op hele centen (om te tonen). */
  perEenheidCenten: number
  /** Dezelfde prijs zonder afronding — hiermee wordt vergeleken en gesorteerd. */
  perEenheidRuw: number
  basis: Basiseenheid
  goedkoopste: boolean
  /** Hoeveel procent duurder dan de goedkoopste (0 voor de goedkoopste zelf). */
  procentDuurder: number
}

// Gram en milliliter worden omgerekend, zodat 750 g eerlijk tegen 1 kg vergelijkt.
const NAAR_BASIS: Record<Eenheid, { basis: Basiseenheid; factor: number }> = {
  g: { basis: 'kg', factor: 0.001 },
  kg: { basis: 'kg', factor: 1 },
  ml: { basis: 'l', factor: 0.001 },
  l: { basis: 'l', factor: 1 },
  stuk: { basis: 'stuk', factor: 1 },
}

/**
 * Vergelijkt twee of meer aanbiedingen op prijs per eenheid, van goedkoop naar duur.
 *
 * Alle aanbiedingen moeten op dezelfde basis liggen: gewicht met gewicht (g/kg),
 * inhoud met inhoud (ml/l) of stuks met stuks. Een kilo tegen een liter afwegen
 * heeft geen betekenis en geeft daarom een duidelijke fout in plaats van een getal.
 */
export function vergelijkPrijzen(aanbiedingen: Aanbieding[]): Resultaat<PrijsVergelijking[]> {
  if (aanbiedingen.length < 2) return mislukt('te-weinig-aanbiedingen')

  for (const a of aanbiedingen) {
    if (!Number.isFinite(a.prijsCenten) || a.prijsCenten <= 0) return mislukt('bedrag-nul')
    // Hoeveelheid nul zou een deling door nul zijn.
    if (!Number.isFinite(a.hoeveelheid) || a.hoeveelheid <= 0) return mislukt('hoeveelheid-ongeldig')
  }

  const basis = NAAR_BASIS[aanbiedingen[0].eenheid].basis
  if (aanbiedingen.some((a) => NAAR_BASIS[a.eenheid].basis !== basis)) return mislukt('gemengde-eenheden')

  const ruw = aanbiedingen.map((a) => {
    const omgerekend = a.hoeveelheid * NAAR_BASIS[a.eenheid].factor
    return { a, perEenheidRuw: a.prijsCenten / omgerekend }
  })

  const goedkoopsteWaarde = Math.min(...ruw.map((r) => r.perEenheidRuw))
  const gesorteerd = [...ruw].sort((x, y) => x.perEenheidRuw - y.perEenheidRuw)

  return gelukt(
    gesorteerd.map((r) => ({
      id: r.a.id,
      naam: r.a.naam,
      perEenheidCenten: Math.round(r.perEenheidRuw),
      perEenheidRuw: r.perEenheidRuw,
      basis,
      goedkoopste: r.perEenheidRuw === goedkoopsteWaarde,
      procentDuurder: (r.perEenheidRuw / goedkoopsteWaarde - 1) * 100,
    })),
  )
}
