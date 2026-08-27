import type { Vertaler } from '../i18n'

/**
 * De naam van een categorie of categoriegroep zoals ze op het scherm of in een document hoort
 * te staan (ronde 108).
 *
 * ⚠ TWEE VAN DIE NAMEN ZIJN GEEN GEBRUIKERSDATA. "Zonder categorie" en "Onbekend" zijn woorden
 * van de app zelf — `groepVanCategorie` en `labelVanCategorie` geven ze terug wanneer er niets
 * te vinden valt. Ze staan allebei gewoon in de vertaaltabel, en de Analyse-pagina gebruikt
 * die ook. De PDF-rapporten en de CSV-export deden dat niet: een Frans jaarrapport toonde
 * Franse kolomkoppen en Franse bedragen met daartussen "Zonder categorie" en "Onbekend".
 *
 * ⚠ EN DE REST BLIJFT ONVERTAALD, met opzet. De namen van de ingebouwde categorieën
 * ("Diensten en Ontwikkeling") zijn in deze app app-breed Nederlands — ook op het scherm — en
 * een eigen categorie is per definitie de tekst die de gebruiker zelf tikte. Alleen deze twee
 * woorden hebben een vertaling, dus alleen deze twee gaan erdoor.
 */
export function categorienaam(t: Vertaler, naam: string): string {
  return naam === 'Zonder categorie' || naam === 'Onbekend' ? t(naam) : naam
}
