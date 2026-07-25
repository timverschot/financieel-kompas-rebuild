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
