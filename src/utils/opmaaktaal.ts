import type { Taal } from '../i18n'

// In welke taal worden DATUMS en BEDRAGEN opgemaakt? (ronde 54)
//
// HET PROBLEEM. De app vertaalt sinds lang haar teksten, maar `formatEuro` en de
// datumhelpers hadden `'nl-BE'` hardgecodeerd. Een Franstalige gebruiker kreeg dus
// een Frans scherm met "juli 2026" erin, en een Engelstalige zag "€ 12,50" waar
// "€12.50" hoort. In een brief aan een advocaat of een blad voor een boekhouder
// staat dan een halve vertaling.
//
// WAAROM DIT EEN MODULEVARIABELE IS en geen parameter. `formatEuro` en
// `maandJaarLabel` worden op ruim driehonderd plaatsen aangeroepen, vaak diep in een
// rekenkern die zelf niets van talen weet. Ze allemaal een taal laten meegeven zou
// betekenen dat elk tussenliggend niveau die taal moet doorgeven — precies het soort
// wijziging waarbij er ergens één vergeten wordt en dat dan stil terugvalt op het
// Nederlands. Eén plek die de keuze bewaart, is hier het eerlijkere ontwerp.
//
// De functies blijven VOORSPELBAAR: bij dezelfde taal geven ze altijd hetzelfde
// terug, en een test kan de taal expliciet zetten. Ze zijn niet meer zuiver in de
// strikte zin, en dat is de prijs.
//
// WAT HIER NIET DOOR VERTAALD WORDT, en dat is essentieel:
//
//  * de opgeslagen datums `JJJJ-MM-DD` en `JJJJ-MM` — die worden met `padStart`
//    gebouwd, nooit met `Intl`, en zijn de sleutels van de hele app;
//  * `centenNaarInvoer`, dat de bedragen in een CSV-bestand schrijft. Dat is bewust
//    de Belgische Excel-notatie (komma als decimaalteken, puntkomma als
//    scheidingsteken, byte-volgordemarkering vooraan). Dat trio hoort bij elkaar;
//    er één van vertalen laat het bestand uit elkaar vallen.

/**
 * De volledige locale per taal.
 *
 * `en-GB` en niet `en-US`: deze app is Belgisch, en dan hoort 4 juli "4 Jul" te zijn
 * en niet "Jul 4". `fr-BE` en niet `fr-FR` om dezelfde reden — het scheidingsteken
 * voor duizendtallen verschilt.
 */
const LOCALES: Record<Taal, string> = { nl: 'nl-BE', en: 'en-GB', fr: 'fr-BE' }

export const TAAL_OPSLAG_SLEUTEL = 'fk_taal'

/** De bewaarde taalkeuze, of Nederlands wanneer er nog geen is. */
export function leesTaal(): Taal {
  try {
    const t = localStorage.getItem(TAAL_OPSLAG_SLEUTEL)
    if (t === 'nl' || t === 'en' || t === 'fr') return t
  } catch {
    // localStorage niet beschikbaar: stil terugvallen op Nederlands.
  }
  return 'nl'
}

// Meteen bij het laden ingesteld, niet pas wanneer React draait. Anders zou een PDF
// die vóór de eerste weergave gebouwd wordt (of een test die de opmaak rechtstreeks
// aanroept) altijd Nederlands opleveren.
let actief: Taal = leesTaal()

/** Zet de taal waarin datums en bedragen opgemaakt worden. */
export function zetOpmaaktaal(taal: Taal): void {
  actief = taal
}

/** De taal die nu geldt voor datums en bedragen. */
export function opmaaktaal(): Taal {
  return actief
}

/** De locale voor `Intl`, bv. 'fr-BE'. */
export function opmaakLocale(): string {
  return LOCALES[actief]
}
