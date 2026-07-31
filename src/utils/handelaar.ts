// Herkennen dat twee boekingen bij DEZELFDE handelaar horen (ronde 43).
//
// Waarom dit naast `normaliseerHandelaar` in `categorieVoorstel.ts` staat, en die
// niet gewoon strenger geworden is. Die functie is de sleutel van de
// handelaarsindex: verander je haar, dan verandert bij elke bestaande gebruiker
// welke categorie de app voorstelt — en dat is een stille wijziging aan gedrag dat
// vandaag klopt. Deze sleutel wordt alleen gebruikt om prijzen over de tijd te
// volgen, en mag daarom veel agressiever opruimen.
//
// Wat een bankuittreksel ervan maakt:
//
//   "BETALING MAESTRO 6703 NETFLIX.COM 15/03 REF 1234567"  →  "netflix com"
//   "DOMICILIERING PROXIMUS NV 0987654321"                  →  "proximus nv"
//
// Bewust een HEURISTIEK en geen woordenboek van handelaars. Een lijst met namen
// veroudert, is landgebonden, en zou hier moeten meegroeien met elke bank. Deze
// regels halen weg wat bij de BANK hoort (kaartnummers, datums, referenties) en
// laten staan wat bij de winkel hoort.
//
// Zuiver: geen datum, geen database, geen React.

/**
 * Woorden die de bank ervoor zet en die niets over de handelaar zeggen.
 *
 * Alleen aan het BEGIN weggehaald: "kaart" midden in "kaartenwinkel jansens" is
 * gewoon een deel van de naam. Ze staan hier zonder accenten, want die zijn er in de
 * stap ervoor al af gehaald.
 */
const BANKWOORDEN = [
  'betaling',
  'betaald',
  'overschrijving',
  'domiciliering',
  'doorlopende opdracht',
  'europese domiciliering',
  'sepa',
  'sepa overschrijving',
  'aankoop',
  'maestro',
  'bancontact',
  'visa',
  'mastercard',
  'kaartbetaling',
  'contactloos',
  'terugbetaling',
]

/** Accenten weghalen, zodat "domiciliëring" en "domiciliering" hetzelfde zijn. */
function zonderAccenten(tekst: string): string {
  return tekst.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * De opgeschoonde naam, met de hoofdletters van de gebruiker intact.
 *
 * Wat er weggaat is wat de BANK erbij zet: kaartnummers, datums, referenties en de
 * woorden waarmee ze de soort betaling aanduidt. Wat blijft staan is de winkel.
 * Geeft een lege string wanneer er niets herkenbaars overblijft.
 */
export function handelaarNaam(omschrijving: string): string {
  let s = zonderAccenten(omschrijving)

  // Datums in elke gangbare vorm: 15/03, 15-03-2026, 2026/03/15.
  s = s.replace(/\b\d{1,4}[/.-]\d{1,2}([/.-]\d{2,4})?\b/g, ' ')
  // Uren.
  s = s.replace(/\b\d{2}:\d{2}\b/g, ' ')
  // Referenties en kaartnummers: alles met vier of meer cijfers op een rij, en de
  // labels die eromheen staan.
  s = s.replace(/\b(ref|referentie|nr|nummer|mededeling|bic|iban)\b[.:]?\s*\S*/gi, ' ')
  s = s.replace(/\b[a-z]{0,2}\d{4,}[a-z0-9]*\b/gi, ' ')
  // Leestekens worden spaties. Bewust ook '&': anders zou "H&M" één woord blijven
  // dat nergens mee overeenkomt.
  s = s.replace(/[^a-zA-Z0-9]+/g, ' ').trim()

  // De bankwoorden vooraan, zolang er nog woorden achter komen. Zonder die tweede
  // voorwaarde zou een boeking die letterlijk "Overschrijving" heet, leeg worden.
  let vorige = ''
  while (s !== vorige) {
    vorige = s
    const laag = s.toLowerCase()
    for (const woord of BANKWOORDEN) {
      if (laag === woord) break
      if (laag.startsWith(`${woord} `)) {
        s = s.slice(woord.length + 1).trim()
        break
      }
    }
  }

  // Alleen LANGE cijfergroepen weggooien. Korte getallen horen vaak bij de naam
  // ("Kind 1", "Q8", "K3"), en die weggooien maakte van "School Kind 1" en
  // "School Kind 2" één handelaar — met een prijsstijging die nooit bestaan heeft.
  // Losse letters blijven staan om dezelfde reden: zonder hen werden "H&M Gent" en
  // "C&A Gent" allebei gewoon "gent".
  s = s
    .split(' ')
    .filter((w) => w !== '' && !/^\d{3,}$/.test(w))
    .join(' ')

  return s
}

/**
 * De sleutel waarop twee boekingen dezelfde handelaar zijn.
 *
 * Geeft een lege string terug wanneer er niets herkenbaars overblijft — bijvoorbeeld
 * bij een omschrijving die alleen uit een referentienummer bestaat. De aanroeper
 * hoort zo'n groep over te slaan; een prijsvergelijking op "12345678" zegt niets.
 */
export function handelaarSleutel(omschrijving: string): string {
  return handelaarNaam(omschrijving).toLowerCase().replace(/\s+/g, ' ')
}

/** Dezelfde handelaar? Puur een gemakshulpje bovenop `handelaarSleutel`. */
export function zelfdeHandelaar(a: string, b: string): boolean {
  const sa = handelaarSleutel(a)
  return sa !== '' && sa === handelaarSleutel(b)
}
