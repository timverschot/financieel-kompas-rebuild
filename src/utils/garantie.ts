// Rekenlaag voor het garantiebeheer. Zuivere, deterministische functies: de
// "vandaag"-datum wordt altijd meegegeven. Datums zijn ISO-strings (JJJJ-MM-DD).
import { dagenVerschil, isDagstempel, verschuifDatumMaanden } from './datum'

// De standaard Belgische wettelijke garantie: 2 jaar = 24 maanden.
export const STANDAARD_GARANTIE_MAANDEN = 24

// De vervaldatum: aankoopdatum + aantal maanden. De dag wordt geklemd op de
// laatste dag van de doelmaand (bv. 31 jan + 1 maand = 28/29 feb).
//
// Sinds ronde 57 rekent deze functie niet meer zelf: dezelfde som stond toen op twee
// plaatsen, en die in `utils/datum.ts` vult het jaartal netjes aan tot vier tekens —
// wat hier ontbrak. Wie het antwoord `null` moet kunnen zien, gebruikt
// `verschuifDatumMaanden` rechtstreeks; hier geeft een onleesbare datum een lege
// tekst, en `garantieStatus` vangt dat hierboven al af.
export function vervaldatum(aankoopISO: string, maanden: number): string {
  return verschuifDatumMaanden(aankoopISO, maanden) ?? ''
}

// Hele dagen tussen twee datums (tot − van). Negatief als 'tot' vóór 'van' ligt,
// en 0 wanneer een van beide geen echte kalenderdag is.
//
// Sinds ronde 55 rekent deze functie niet meer zelf: er stonden drie eigen versies
// van dezelfde som in de app, elk met een ander antwoord op een onleesbare datum.
// Er is er nu één, in `utils/datum.ts`. Wie moet WETEN of een datum leesbaar was,
// gebruikt `dagenVerschil` rechtstreeks; hier is 0 goed genoeg, want `garantieStatus`
// vangt dat geval hierboven al af.
export function dagenTussen(vanISO: string, totISO: string): number {
  return dagenVerschil(vanISO, totISO) ?? 0
}

export type GarantieStatus = {
  vervaldatum: string
  verlopen: boolean
  dagenResterend: number // negatief als verlopen
  maandenResterend: number // hele maanden resterend (>= 0), voor weergave
  bijnaVerlopen: boolean // nog geldig maar binnen 60 dagen
  // Is de aankoopdatum onleesbaar? Dan is er niets te zeggen, en zegt de app dat
  // ook (ronde 55). Vóór die ronde rekende ze stil door met NaN: 'verlopen' werd
  // dan false en 'nog NaN dagen' stond klaar om getoond te worden.
  onbekend: boolean
}

// De status van een garantie t.o.v. vandaag: vervaldatum, of ze verlopen is,
// hoeveel er nog rest, en of ze bijna verloopt (waarschuwing in de app).
export function garantieStatus(aankoopISO: string, maanden: number, vandaagISO: string): GarantieStatus {
  // De AANKOOPDATUM zelf keuren, niet de uitkomst. `vervaldatum()` maakt van een
  // 30 februari netjes een 28 februari twee jaar later: een geldige dag uit een
  // datum die nooit bestaan heeft, en dan zou de keuring niets meer opmerken.
  const verval = isDagstempel(aankoopISO) ? vervaldatum(aankoopISO, maanden) : ''
  const rest = verval === '' ? null : dagenVerschil(vandaagISO, verval)
  if (rest === null) {
    return { vervaldatum: '', verlopen: false, dagenResterend: 0, maandenResterend: 0, bijnaVerlopen: false, onbekend: true }
  }
  const dagenResterend = rest
  const verlopen = dagenResterend < 0
  const maandenResterend = Math.max(0, Math.floor(dagenResterend / 30))
  const bijnaVerlopen = !verlopen && dagenResterend <= 60
  return { vervaldatum: verval, verlopen, dagenResterend, maandenResterend, bijnaVerlopen, onbekend: false }
}
