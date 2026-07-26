// Kleine hulpjes voor tests die over "deze maand" en "vorige maand" gaan.
//
// Waarom niet gewoon '2026-07' hardcoderen: verschillende schermen rekenen met de
// ECHTE huidige maand (de sparklines op de Analyse-pagina bijvoorbeeld kijken altijd
// zes maanden terug vanaf vandaag). Een test met een vaste maand slaagt dan wel in
// juli 2026 en faalt in augustus — een tijdbom in de testsuite.

export function huidigeMaand(nu: Date = new Date()): string {
  return nu.getFullYear() + '-' + String(nu.getMonth() + 1).padStart(2, '0')
}

/** Verschuift een maand ('JJJJ-MM') met een aantal maanden. */
export function verschuifMaandVoorTest(maand: string, delta: number): string {
  const [jaar, m] = maand.split('-').map(Number)
  const d = new Date(jaar, m - 1 + delta, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}
