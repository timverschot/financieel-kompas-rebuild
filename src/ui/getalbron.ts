// Eén regel die gedeeld wordt door `Stat` en `Kengetal` (ronde 69).
//
// Waarom een eigen bestand: `basis.tsx` exporteert componenten, en een losse
// functie ernaast laat de fast-refresh-regel van ESLint waarschuwen — dezelfde
// reden waarom `opslagpoging.ts` en `palet.ts` apart staan.

/**
 * Plakt de herkomstzin achter de toegankelijke naam van een doorklikbaar cijfer.
 *
 * WAAROM DIT MOET. Op een knop vervangt `aria-label` ALLE tekst binnenin. Zet je
 * de herkomstzin zichtbaar in de knop maar niet in de naam, dan ziet een ziende
 * gebruiker "alleen terugkerende posten" staan en hoort een schermlezer het niet —
 * precies het cijfer zonder uitleg dat deze ronde wil uitroeien, maar dan alleen
 * voor wie luistert. Bovendien eist WCAG 2.5.3 dat de zichtbare tekst in de naam zit.
 *
 * De punt komt er alleen bij als de naam er nog geen leesteken heeft; anders
 * krijg je "… bekijk de boekingen.. Alleen terugkerende posten."
 *
 * De eerste (en voorlopig enige) plek waar dit echt gebeurt, is de tegel "Netto
 * vermogen" op `OpstellingSectie`. Die leest voluit als:
 *
 *   "Netto vermogen € 12.400,00 — bekijk het op je overzicht. Je rekeningen, plus wat
 *    men jou nog schuldig is, min wat jij nog schuldig bent. Alleen het openstaande
 *    kapitaal van een lening; de interest komt daar nog bij."
 *
 * Lang, maar volledig — en niets wordt dubbel voorgelezen: `aria-label` vervangt de
 * inhoud van de knop, dus de zichtbare zin klinkt niet nog een tweede keer.
 */
export function naamMetBron(naam: string, bron?: string): string {
  if (!bron) return naam
  const kaal = naam.trim()
  const leesteken = /[.!?…:;]$/.test(kaal)
  return leesteken ? kaal + ' ' + bron : kaal + '. ' + bron
}
