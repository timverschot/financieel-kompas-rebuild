import type { Vertaler } from '../i18n'

/** Hoeveel namen er hoogstens uitgeschreven worden voor de rest samengevat wordt. */
export const MAX_NAMEN = 3

/**
 * Een opsomming van namen met een bovengrens.
 *
 * ⚠ Zonder grens somde de zin over ontbrekende posten er veertig achter elkaar op —
 * gemeten: 1.845 tekens in één alinea — en één lijstrij kon met zestig kwartaalposten
 * 2.731 tekens breed worden, waardoor het bedrag rechts de kaart uit geduwd werd. Wat
 * wegvalt wordt geteld en genoemd; stil afkappen zou lezen als "dit is alles".
 *
 * De grens ligt op het AANTAL namen, niet op hun lengte. Eén omschrijving van
 * driehonderd tekens zonder spatie loopt nog steeds uit de rij — maar dat is een
 * eigenschap van de hele app (geen enkel omschrijvingsveld heeft een maximum) en geen
 * probleem van één kaart alleen.
 *
 * ⚠ HIER EN NIET IN ÉÉN SCHERM (ronde 80). Deze functie stond in
 * components/ToekomstLasten.tsx. Ronde 80 kreeg dezelfde behoefte op de Budget-pagina,
 * en een tweede kopie zou betekenen dat de grens er maar op één van de twee plekken is
 * — precies de fout die de opmerking hierboven beschrijft, dan opnieuw gemaakt.
 */
export function namenlijst(t: Vertaler, namen: string[]): string {
  if (namen.length <= MAX_NAMEN) return namen.join(', ')
  return t('{namen} en {n} andere', {
    namen: namen.slice(0, MAX_NAMEN).join(', '),
    n: namen.length - MAX_NAMEN,
  })
}
