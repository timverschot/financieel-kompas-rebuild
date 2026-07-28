// Een CSV-bestand inlezen. Zuiver: tekst erin, rijen eruit.
//
// Waarom niet gewoon `tekst.split(',')`: een bankuittreksel is precies het geval
// waar dat stukloopt. Een omschrijving als "COLRUYT, HALLE" bevat het scheidings-
// teken zelf, en dan schuift elke kolom erna één plaats op — je bedrag komt in de
// kolom van de valuta terecht en je saldo klopt niet meer. Zonder één foutmelding.
//
// Deze lezer volgt de gewone CSV-afspraken (RFC 4180): een veld tussen dubbele
// aanhalingstekens mag het scheidingsteken, een regeleinde én aanhalingstekens
// bevatten, waarbij "" staat voor één aanhalingsteken.

/** Het scheidingsteken van een CSV-bestand. */
export type Scheider = ';' | ',' | '\t' | '|'

const KANDIDATEN: Scheider[] = [';', ',', '\t', '|']

/**
 * Raadt het scheidingsteken.
 *
 * Belgische banken gebruiken bijna altijd de puntkomma (omdat de komma hier het
 * decimaalteken is), maar niet allemaal. In plaats van te tellen welk teken het
 * vaakst voorkomt — dan wint de komma zodra er bedragen in staan — kijken we welk
 * teken over de eerste regels het MEEST CONSTANTE aantal kolommen oplevert. Een
 * echt scheidingsteken geeft op elke rij hetzelfde aantal kolommen; een teken dat
 * toevallig in de tekst staat, niet.
 */
export function raadScheider(tekst: string): Scheider {
  // Alleen het begin van het bestand bekijken; bij een uittreksel van vijfduizend
  // regels hoeven we het niet vier keer helemaal te ontleden.
  const begin = tekst.split('\n').slice(0, 30).join('\n')
  let beste: Scheider = ';'
  let besteScore = -1
  for (const s of KANDIDATEN) {
    const rijen = splitsCsv(begin, s).filter((r) => r.length > 0)
    if (rijen.length === 0) continue
    // Bewust de VAAKST voorkomende rijbreedte en niet die van de eerste rij.
    // Banken zetten regelmatig een paar regels rekeninginfo bovenaan het bestand;
    // die eerste regel heeft dan één kolom, en op die manier werd het juiste
    // scheidingsteken afgekeurd en het bestand in stukken geknipt op een teken dat
    // toevallig in een bedrag stond.
    const kolommen = meestVoorkomendeBreedte(rijen)
    if (kolommen < 2) continue
    const gelijk = rijen.filter((r) => r.length === kolommen).length / rijen.length
    const score = gelijk * 100 + Math.min(kolommen, 30)
    if (score > besteScore) {
      besteScore = score
      beste = s
    }
  }
  return beste
}

/** De rijbreedte die het vaakst voorkomt. Bij gelijkspel wint de grootste. */
export function meestVoorkomendeBreedte(rijen: string[][]): number {
  const tel = new Map<number, number>()
  for (const r of rijen) tel.set(r.length, (tel.get(r.length) ?? 0) + 1)
  let beste = 0
  let besteAantal = 0
  for (const [breedte, aantal] of tel) {
    if (aantal > besteAantal || (aantal === besteAantal && breedte > beste)) {
      beste = breedte
      besteAantal = aantal
    }
  }
  return beste
}

/**
 * Gooit de regels weg die niet bij de tabel horen.
 *
 * Belgische banken zetten vaak een paar regels rekeninginformatie boven het
 * eigenlijke uittreksel ("Rekening: BE.., EUR, Zichtrekening"). Die regels hebben
 * een andere breedte dan de rest. Lieten we ze staan, dan telde de app één kolom
 * en kon je in het scherm niet eens de juiste kolom aanduiden — een doodlopend
 * straatje, precies bij het bestand dat je wilde inlezen.
 */
export function zonderRommelregels(rijen: string[][]): string[][] {
  const breedte = meestVoorkomendeBreedte(rijen)
  if (breedte < 2) return rijen
  return rijen.filter((r) => r.length === breedte)
}

/**
 * Ziet dit er überhaupt uit als een CSV-bestand?
 *
 * Een PDF of een Excel-bestand levert bij het lezen tekenbrij op in plaats van een
 * foutmelding: de tekenset-terugval maakt van élke byte een leesbaar teken. Zonder
 * deze controle kreeg je "Kloppen de kolommen?" met onzin erin, en de vraag om een
 * datumkolom aan te duiden die er niet is.
 */
export function lijktOpCsv(tekst: string, rijen: string[][]): boolean {
  if (rijen.length === 0) return false
  if (meestVoorkomendeBreedte(rijen) < 2) return false
  // Stuurtekens (behalve tab en regeleinde) horen niet in een tekstbestand.
  const proef = tekst.slice(0, 4000)
  // eslint-disable-next-line no-control-regex
  const stuurtekens = (proef.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) ?? []).length
  return stuurtekens / Math.max(proef.length, 1) < 0.01
}

/**
 * Splitst CSV-tekst in rijen en velden.
 *
 * Lege regels vallen weg: bankbestanden eindigen vaak op een regeleinde, en een
 * lege slotrij zou als een boeking zonder bedrag verschijnen.
 */
export function splitsCsv(tekst: string, scheider: Scheider = ';'): string[][] {
  const rijen: string[][] = []
  let rij: string[] = []
  let veld = ''
  let inAanhalingstekens = false
  let ietsGezien = false

  const sluitVeld = () => {
    rij.push(veld.trim())
    veld = ''
  }
  const sluitRij = () => {
    sluitVeld()
    // Een rij van één leeg veld is een lege regel, geen boeking.
    if (!(rij.length === 1 && rij[0] === '')) rijen.push(rij)
    rij = []
    ietsGezien = false
  }

  for (let i = 0; i < tekst.length; i++) {
    const teken = tekst[i]

    if (inAanhalingstekens) {
      if (teken === '"') {
        // Twee aanhalingstekens na elkaar betekenen één echt aanhalingsteken.
        if (tekst[i + 1] === '"') {
          veld += '"'
          i++
        } else {
          inAanhalingstekens = false
        }
      } else {
        veld += teken
      }
      continue
    }

    if (teken === '"' && !ietsGezien) {
      inAanhalingstekens = true
      ietsGezien = true
      continue
    }
    if (teken === scheider) {
      sluitVeld()
      ietsGezien = false
      continue
    }
    if (teken === '\r') continue
    if (teken === '\n') {
      sluitRij()
      continue
    }
    if (teken.trim() !== '') ietsGezien = true
    veld += teken
  }

  // De laatste rij, als het bestand niet op een regeleinde eindigt.
  if (veld !== '' || rij.length > 0) sluitRij()
  return rijen
}

/**
 * Leest een bestand als tekst, met de juiste tekenset.
 *
 * Dit is geen detail. Belgische banken exporteren vaak in Windows-1252 in plaats
 * van UTF-8, en dan wordt "Café Piano" bij het lezen als UTF-8 stil "Caf<?>
 * Piano". Je omschrijvingen zijn dan voorgoed beschadigd — ook in de back-up.
 */
export async function leesTekstbestand(bestand: Blob): Promise<string> {
  return decodeerTekst(await alsBuffer(bestand))
}

/**
 * De tekenset-logica apart, zodat ze zonder browser na te rekenen valt.
 *
 * Eerst als UTF-8 lezen met `fatal: true`. Zit er één byte in die geen geldige
 * UTF-8 is, dan gooit de decoder zelf een fout en lezen we opnieuw als
 * Windows-1252. Een byte-volgordemarkering (BOM) vooraan halen we weg: die hoort
 * bij niemand, maar zou anders in de naam van je eerste kolom belanden.
 */
export function decodeerTekst(buffer: ArrayBuffer): string {
  let tekst: string
  try {
    tekst = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    tekst = new TextDecoder('windows-1252').decode(buffer)
  }
  return tekst.charCodeAt(0) === 0xfeff ? tekst.slice(1) : tekst
}

// `Blob.arrayBuffer` bestaat pas vanaf Safari 14. Deze app draait op telefoons die
// jaren mee gaan, dus houden we de oude weg erbij in plaats van er stil op te
// vertrouwen — een importscherm dat op één toestel niets doet is erger dan zes
// regels code.
function alsBuffer(bestand: Blob): Promise<ArrayBuffer> {
  if (typeof bestand.arrayBuffer === 'function') return bestand.arrayBuffer()
  return new Promise((klaar, mislukt) => {
    const lezer = new FileReader()
    lezer.onload = () => klaar(lezer.result as ArrayBuffer)
    lezer.onerror = () => mislukt(lezer.error ?? new Error('bestand niet leesbaar'))
    lezer.readAsArrayBuffer(bestand)
  })
}
