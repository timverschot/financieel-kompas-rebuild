// Eén plek voor "geef dit bestand aan de gebruiker".
//
// Waarom dit bestaat. Tot ronde 41 stond dit patroon drie keer los in de app: bij
// de JSON-back-up (App.tsx), bij het bewaren van een bon (Bonknop.tsx) en bij de
// afrekening-PDF (die het via jsPDF zelf doet). Die drie kopieën liepen al uit
// elkaar op twee punten die op een telefoon écht uitmaken:
//
//  1. `URL.revokeObjectURL` meteen na `a.click()` mag, maar niet overal. Sommige
//     browsers hebben het adres nog even nodig terwijl ze het bestand oppakken, en
//     dan breekt de download halverwege af. Bonknop wachtte tien seconden, de
//     back-up niet.
//  2. Een mislukte download stil doorslikken. Dan tik je op "Exporteer", gebeurt
//     er niets, en weet je niet of het aan jou of aan de app ligt. Deze functie
//     gooit de fout dóór, zodat het scherm iets kan zeggen.
//
// Bewust géén melding of state in dit bestand: dat hoort bij het scherm.

// Hoe lang het blob-adres blijft bestaan na de klik. Tien seconden is ruim; de
// browser heeft het normaal binnen milliseconden opgepakt.
const VRIJGEVEN_NA = 10_000

/**
 * Biedt een blob aan om te downloaden.
 *
 * Gooit een fout als de browser het weigert — de aanroeper hoort dat te tonen.
 */
export function downloadBlob(bestandsnaam: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = bestandsnaam
    // In het document hangen vóór de klik: Firefox negeert een klik op een anker
    // dat nergens staat.
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (fout) {
    URL.revokeObjectURL(url)
    throw fout
  }
  window.setTimeout(() => URL.revokeObjectURL(url), VRIJGEVEN_NA)
}

/**
 * Biedt tekst aan om te downloaden.
 *
 * De tekenset staat expliciet in het mimetype: zonder `charset=utf-8` opent Excel
 * een CSV op sommige systemen alsnog verkeerd, ook mét byte-volgordemarkering.
 */
export function downloadTekst(bestandsnaam: string, inhoud: string, mimetype = 'text/plain;charset=utf-8'): void {
  downloadBlob(bestandsnaam, new Blob([inhoud], { type: mimetype }))
}

/**
 * Zet een data-URL om naar een blob.
 *
 * Bonnen worden als data-URL bewaard (`data:image/jpeg;base64,…`). Safari negeert
 * een `download` op een data-URL, maar niet op een blob-adres — daarom deze stap.
 * Gooit een fout bij een data-URL die niet te ontcijferen is.
 */
export function dataUrlNaarBlob(dataUrl: string): { blob: Blob; soort: string } {
  const [kop, base64] = dataUrl.split(',')
  if (!kop || base64 === undefined) throw new Error('geen geldige data-URL')
  const soort = kop.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return { blob: new Blob([buffer], { type: soort }), soort }
}

/**
 * Maakt een stukje tekst geschikt voor een bestandsnaam.
 *
 * Alles wat geen letter of cijfer is wordt een streepje; accenten en tekens als
 * `›` of `·` verdwijnen. Dat is bewust streng: een bestandsnaam met een schuine
 * streep of een dubbelpunt erin wordt op Windows geweigerd, en dan krijg je geen
 * bestand maar een foutmelding.
 */
export function veiligeBestandsnaam(tekst: string, maxLengte = 60): string {
  const kaal = tekst
    .normalize('NFD')
    // De losse accenttekens die NFD achterlaat: "é" wordt "e" in plaats van "e-".
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return kaal.slice(0, maxLengte).replace(/-+$/, '')
}
