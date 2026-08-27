import type { Vertaler } from '../i18n'

/**
 * Eén zin voor "wat heeft deze synchronisatie gedaan" — op alle drie de plaatsen
 * dezelfde (opstarten, verbinden, handmatig synchroniseren).
 *
 * ⚠ TWEE DINGEN DIE HIER MIS WAREN, allebei zwijgpaden.
 *  1. De opstart-synchronisatie — de weg waarlangs Timothy dit tegenkwam — noemde de
 *     geweigerde regels NIET. De twee andere paden wel. Dezelfde regel hoort overal.
 *  2. `ongeldig` kwam in geen enkele zin voor. Bij vijf regels die de vorm niet halen,
 *     las je "0 verstuurd, 0 opgehaald" — alsof er niets aan de hand was.
 *
 * "Niet ingelezen" en niet "niet leesbaar": dat is wat er gebeurd is. Waarom het niet
 * lukte, staat in de melding op het Overzicht.
 *
 * ⚠ DIT GETAL EN HET GETAL IN DE MELDING ZIJN NIET HETZELFDE, met opzet. Deze zin gaat
 * over wat je NET gedaan hebt ("deze ronde viel er 4 af"). De melding op het Overzicht
 * gaat over wat er NIEUW te zeggen valt: heb je er drie weggeklikt, dan noemt ze er nog
 * één. Zou deze zin ook alleen het verse aantal tonen, dan zou "0 opgehaald, 0 niet
 * ingelezen" verschijnen terwijl er wel degelijk vier regels afvielen.
 */
export function synczin(
  r: { gepusht: number; opgehaald: number; ongeldig: number; verouderd: number; teNieuw: number },
  automatisch: boolean,
  t: Vertaler,
) {
  const nietIngelezen = r.ongeldig + r.verouderd + r.teNieuw
  if (nietIngelezen > 0) {
    return automatisch
      ? t('Automatisch gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet ingelezen.', {
          gepusht: r.gepusht,
          opgehaald: r.opgehaald,
          geweigerd: nietIngelezen,
        })
      : t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet ingelezen.', {
          gepusht: r.gepusht,
          opgehaald: r.opgehaald,
          geweigerd: nietIngelezen,
        })
  }
  return automatisch
    ? t('Automatisch gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald })
    : t('Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.', { gepusht: r.gepusht, opgehaald: r.opgehaald })
}
