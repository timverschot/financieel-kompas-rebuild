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
  return new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(new Date(jaar, maand - 1, 1))
}

// 'JJJJ-MM' of 'JJJJ-MM-DD' als korte maandnaam, bv. "jul". Voor aslabels in
// grafieken, waar de volle naam niet past.
export function maandKort(maandOfDatum: string): string {
  const [jaar, maand] = maandOfDatum.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand)) return maandOfDatum
  return new Intl.DateTimeFormat('nl-BE', { month: 'short' }).format(new Date(jaar, maand - 1, 1))
}

// Alleen de maandnaam voluit, bv. "juli". Voor een zin die het jaar niet nodig heeft.
export function maandVoluit(maandOfDatum: string): string {
  const [jaar, maand] = maandOfDatum.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand)) return maandOfDatum
  return new Intl.DateTimeFormat('nl-BE', { month: 'long' }).format(new Date(jaar, maand - 1, 1))
}

// 'JJJJ-MM-DD' als korte dag + maand, bv. "04 jul". Voor lijstjes met veel regels.
export function dagKort(datumISO: string): string {
  const [jaar, maand, dag] = datumISO.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand) || !Number.isFinite(dag)) return datumISO
  return new Intl.DateTimeFormat('nl-BE', { day: '2-digit', month: 'short' }).format(new Date(jaar, maand - 1, dag))
}

// 'JJJJ-MM-DD' als dag + maand + jaar, bv. "4 jul 2026". Voor lijstjes waar het
// jaar wél uitmaakt: een waardering van een pensioenspaarplan leg je één keer per
// jaar vast, en dan zijn twee regels "01 jan" niet uit elkaar te houden.
export function dagJaar(datumISO: string): string {
  const [jaar, maand, dag] = datumISO.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(maand) || !Number.isFinite(dag)) return datumISO
  return new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(jaar, maand - 1, dag),
  )
}
