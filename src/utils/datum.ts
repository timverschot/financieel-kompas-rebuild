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
