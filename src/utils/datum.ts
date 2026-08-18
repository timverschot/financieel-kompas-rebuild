// Eén plek voor "wat is vandaag" en "welke maand is het nu".
//
// Waarom dit bestaat: verspreid over de app stond `new Date().toISOString()`,
// en dat is de WERELDTIJD (UTC), niet de Belgische tijd. In de zomer loopt
// België één of twee uur voor op UTC. Gevolg: op 1 augustus om 01:30 was het in
// UTC nog 31 juli — het overzicht opende dan op juli, de analyse op augustus, en
// een nieuwe transactie kreeg gisteren als datum. Deze helpers rekenen altijd met
// de lokale tijd van het toestel, zodat elk scherm dezelfde dag en maand ziet.
//
// De datum wordt als tekst bewaard in het formaat JJJJ-MM-DD (zie schema.ts);
// die tekstvorm is bewust taal- en tijdzone-onafhankelijk.

import { opmaakLocale } from './opmaaktaal'

// Zet een Date om naar 'JJJJ-MM-DD' volgens de lokale kalender.
export function naarDatumTekst(d: Date): string {
  const jaar = d.getFullYear()
  const maand = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${jaar}-${maand}-${dag}`
}

// Vandaag, als 'JJJJ-MM-DD'. De parameter is er enkel om te kunnen testen.
export function vandaag(nu: Date = new Date()): string {
  return naarDatumTekst(nu)
}

// De huidige maand, als 'JJJJ-MM'. De parameter is er enkel om te kunnen testen.
export function huidigeMaand(nu: Date = new Date()): string {
  return naarDatumTekst(nu).slice(0, 7)
}

// 'JJJJ-MM-DD' of 'JJJJ-MM' als leesbare maand + jaar, bv. "juli 2028".
//
// Voor een SCHATTING is dit de juiste vorm: een exacte dag ("2028-07-26")
// suggereert een precisie die een berekening op maandbasis niet heeft.
// Een datum die de gebruiker zélf koos, hoort wél volledig getoond te worden.
//
// De maandnaam is Nederlands, net als in de vijf andere plaatsen waar de app een
// maand schrijft (staafgrafiek, vermogensevolutie, vooruitblik, analyse en de
// maandschakelaar). Zouden die ooit met de taalkeuze mee moeten gaan, dan is dit
// de plek om dat één keer te regelen.
export function maandJaarLabel(datumISO: string): string {
  const [jaar, maand] = datumISO.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand)) return datumISO
  return new Intl.DateTimeFormat(opmaakLocale(), { month: 'long', year: 'numeric' }).format(new Date(jaar, maand - 1, 1))
}

// 'JJJJ-MM' of 'JJJJ-MM-DD' als korte maandnaam, bv. "jul". Voor aslabels in
// grafieken, waar de volle naam niet past.
export function maandKort(maandOfDatum: string): string {
  const [jaar, maand] = maandOfDatum.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand)) return maandOfDatum
  return new Intl.DateTimeFormat(opmaakLocale(), { month: 'short' }).format(new Date(jaar, maand - 1, 1))
}

// Alleen de maandnaam voluit, bv. "juli". Voor een zin die het jaar niet nodig heeft.
export function maandVoluit(maandOfDatum: string): string {
  const [jaar, maand] = maandOfDatum.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand)) return maandOfDatum
  return new Intl.DateTimeFormat(opmaakLocale(), { month: 'long' }).format(new Date(jaar, maand - 1, 1))
}

// 'JJJJ-MM-DD' als korte dag + maand, bv. "04 jul". Voor lijstjes met veel regels.
export function dagKort(datumISO: string): string {
  const [jaar, maand, dag] = datumISO.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand) || !Number.isFinite(dag)) return datumISO
  return new Intl.DateTimeFormat(opmaakLocale(), { day: '2-digit', month: 'short' }).format(new Date(jaar, maand - 1, dag))
}

// 'JJJJ-MM-DD' als dag + maand + jaar, bv. "4 jul 2026". Voor lijstjes waar het
// jaar wél uitmaakt: een waardering van een pensioenspaarplan leg je één keer per
// jaar vast, en dan zijn twee regels "01 jan" niet uit elkaar te houden.
export function dagJaar(datumISO: string): string {
  const [jaar, maand, dag] = datumISO.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand) || !Number.isFinite(dag)) return datumISO
  return new Intl.DateTimeFormat(opmaakLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(jaar, maand - 1, dag),
  )
}

// ---------------------------------------------------------------------------
// PERIODES (ronde 41)
//
// Een export kan over één maand ('2026-07') of over een heel jaar ('2026') gaan.
// Beide vormen zijn een PREFIX van een datum, dus `datum.startsWith(periode)`
// werkt voor allebei — daar hoeft niets aan de tellingen te veranderen. Wat
// ontbrak, was de tekst: `maandJaarLabel('2026')` gaf de kale invoer terug.
// ---------------------------------------------------------------------------

/** Is dit een jaar ('JJJJ') of een maand ('JJJJ-MM')? */
export function periodeSoort(periode: string): 'jaar' | 'maand' {
  return /^\d{4}$/.test(periode) ? 'jaar' : 'maand'
}

/** 'JJJJ' -> "2026", 'JJJJ-MM' -> "juli 2026". */
export function periodeLabel(periode: string): string {
  return periodeSoort(periode) === 'jaar' ? periode : maandJaarLabel(periode)
}

/** Het jaar van een periode of datum, als 'JJJJ'. */
export function jaarVan(periodeOfDatum: string): string {
  return periodeOfDatum.slice(0, 4)
}

/**
 * De laatste kalenderdag van een periode, als 'JJJJ-MM-DD'.
 *
 * Waarvoor: het saldo in een maandrapport hoort de stand op het EINDE van die
 * maand te zijn, niet de stand van vandaag. Anders leest een rapport over maart
 * met het saldo van juli erin, en dan sluit niets op elkaar aan.
 *
 * `new Date(jaar, maand, 0)` is de laatste dag van de vorige maand — zo hoeven we
 * schrikkeljaren niet zelf te kennen.
 */
export function laatsteDagVanPeriode(periode: string): string {
  if (periodeSoort(periode) === 'jaar') return `${periode}-12-31`
  const [jaar, maand] = periode.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand)) return periode
  return naarDatumTekst(new Date(jaar, maand, 0))
}


/**
 * Hoeveel kalenderdagen liggen er tussen twee datums? Altijd positief (ronde 54).
 *
 * WAAROM MET UTC en niet met de gewone lokale tijd, terwijl de rest van dit bestand
 * juist bewust lokaal rekent: hier tellen we een VERSCHIL, geen dag. Op de nacht van
 * de zomer- of wintertijd is een lokale dag 23 of 25 uur lang, en dan geeft delen
 * door 24 uur 0,958 of 1,042 in plaats van 1. Met UTC-middernacht is elke dag exact
 * 24 uur en klopt het verschil altijd. De datums zelf zijn tijdzone-onafhankelijke
 * tekst ('JJJJ-MM-DD'), dus er gaat niets verloren.
 *
 * Alles wat geen volledige 'JJJJ-MM-DD' is, geeft `Infinity` — dan valt het buiten
 * elke marge in plaats van er per ongeluk binnen. Die vormcontrole is er echt nodig
 * en niet uit voorzichtigheid: zonder haar leest `Date.parse` een maandwaarde als
 * '2026-07' gewoon als 1 juli, en dan zou een budgetperiode zich stilzwijgend als een
 * dag gedragen en op drie dagen van een boeking kunnen "liggen". In deze app wordt op
 * veel plaatsen met 'JJJJ-MM' gewerkt, dus dat is geen bedacht geval.
 */
export function dagenTussen(a: string, b: string): number {
  const ta = alsDagstempel(a)
  const tb = alsDagstempel(b)
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY
  return Math.abs(tb - ta) / 86400000
}

/**
 * 'JJJJ-MM-DD' als tijdstempel, of NaN wanneer het geen echte kalenderdag is.
 *
 * Drie zeven, en alle drie nodig. De vorm ('2026-07' zou anders als 1 juli gelezen
 * worden), `Date.parse` zelf (die weigert '2026-13-45'), en de TERUGREKENING: een
 * dertig februari weigert `Date.parse` NIET — die rolt stil door naar 2 maart. Zonder
 * die derde controle zou een boeking van 5 maart op drie dagen van "30 februari"
 * liggen en als vermoedelijk duplicaat gelden.
 */
function alsDagstempel(datum: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return Number.NaN
  const t = Date.parse(`${datum}T00:00:00Z`)
  if (Number.isNaN(t)) return Number.NaN
  return new Date(t).toISOString().slice(0, 10) === datum ? t : Number.NaN
}

/** De twaalf maanden van een jaar, als 'JJJJ-MM'. */
export function maandenVanJaar(jaar: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${jaar}-${String(i + 1).padStart(2, '0')}`)
}
