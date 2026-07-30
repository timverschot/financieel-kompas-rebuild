// De Belgische gezondheidsindex, als GEGEVENS.
//
// Waarom dit bestand bestaat (ronde 42). De app kon al indexeren — de formule
// staat sinds ronde 21 in `utils/indexatie.ts` — maar ze kende geen enkel
// indexcijfer. Je moest er twee zelf gaan opzoeken en intikken. Dat is precies het
// opzoekwerk dat deze ronde hoort weg te nemen.
//
// Bewust een gegevensbestand en geen logica: indexcijfers zijn een feit dat elke
// maand verandert, en zulke feiten horen niet als aanname in code te zitten. Eén
// regel per maand bijzetten is het volledige onderhoud.
//
// BRON: Statbel (de officiële publicatie), overgenomen via drie bronnen die elkaar
// op de overlap bevestigen — zie `claude/Kompal_indexcijfers-gezondheidsindex.md`
// in het projectdossier voor de verantwoording en de links.

/**
 * Het basisjaar van deze reeks.
 *
 * Dit is geen sierlijk detail maar de belangrijkste valkuil van het hele
 * onderwerp. Statbel herbaseert de index om de zoveel jaar; alle cijfers worden
 * dan door dezelfde constante gedeeld.
 *
 * Gevolg: de VERHOUDING tussen twee cijfers uit dezelfde reeks klopt altijd, ook
 * over een herbasering heen. Maar een aanvangsindex die letterlijk in een vonnis
 * uit 2010 staat, is uitgedrukt in de basis van tóén (2004 = 100). Wie dat getal
 * combineert met een nieuw cijfer uit deze tabel, rekent met twee verschillende
 * maatstaven en krijgt een verschil van tientallen procenten — zonder foutmelding.
 *
 * De regel die daaruit volgt en die het scherm hoort te bewaken: ofwel komen beide
 * cijfers uit deze tabel, ofwel tikt de gebruiker ze allebei zelf in. Nooit één van
 * elk.
 */
export const INDEX_BASISJAAR = 2013

/**
 * De gezondheidsindex per maand, in basis 2013 = 100.
 *
 * Twaalf cijfers per jaar, in maandvolgorde (januari eerst). Het laatste jaar mag
 * korter zijn dan twaalf: Statbel publiceert een maand pas rond het einde van die
 * maand.
 */
const REEKS: Record<number, number[]> = {
  2015: [100.61, 100.89, 100.73, 101.12, 101.16, 101.33, 101.37, 101.61, 101.85, 102.27, 102.28, 102.23],
  2016: [102.42, 102.53, 103.47, 103.53, 103.77, 103.74, 103.93, 103.97, 103.68, 103.86, 103.97, 104.05],
  2017: [104.65, 105.06, 105.32, 105.46, 105.42, 105.29, 105.63, 105.68, 105.51, 105.84, 105.85, 106.15],
  2018: [106.37, 106.54, 106.71, 106.89, 106.99, 107.01, 107.44, 107.55, 107.52, 108.26, 108.48, 108.45],
  2019: [108.5, 108.78, 109.04, 108.98, 108.89, 109.02, 109.07, 109.07, 108.58, 108.98, 109.0, 109.18],
  2020: [109.72, 109.87, 109.96, 110.22, 110.1, 110.05, 110.16, 110.2, 109.78, 110.11, 109.91, 109.88],
  2021: [110.35, 110.39, 110.56, 110.93, 110.99, 111.31, 112.18, 112.74, 112.29, 113.94, 115.2, 115.6],
  2022: [118.21, 118.74, 119.05, 119.59, 120.25, 121.02, 122.35, 123.68, 124.92, 127.92, 127.44, 127.89],
  2023: [128.0, 126.86, 127.8, 126.7, 127.35, 127.09, 128.22, 128.82, 127.52, 128.3, 128.55, 129.53],
  2024: [130.19, 130.95, 131.75, 130.85, 131.42, 131.92, 132.84, 132.94, 132.41, 132.96, 133.22, 133.73],
  2025: [135.52, 135.79, 135.91, 134.77, 134.54, 135.04, 135.6, 135.64, 135.26, 135.76, 136.49, 136.69],
  2026: [137.37, 138.06, 137.78, 139.33, 139.22, 139.08],
}

/** De maanden waarvoor de app een cijfer kent, als 'JJJJ-MM', oudste eerst. */
export function bekendeIndexmaanden(): string[] {
  const uit: string[] = []
  for (const jaar of Object.keys(REEKS)
    .map(Number)
    .sort((a, b) => a - b)) {
    REEKS[jaar].forEach((_, i) => uit.push(`${jaar}-${String(i + 1).padStart(2, '0')}`))
  }
  return uit
}

/** De eerste maand waarvoor de app een cijfer kent, als 'JJJJ-MM'. */
export function eersteIndexmaand(): string {
  return bekendeIndexmaanden()[0]
}

/**
 * De laatste maand waarvoor de app een cijfer kent, als 'JJJJ-MM'.
 *
 * Hoort op het scherm te staan. Zonder dat cijfer weet je niet of de app een
 * berekening niet kán maken of ze gewoon niet maakt.
 */
export function laatsteIndexmaand(): string {
  const maanden = bekendeIndexmaanden()
  return maanden[maanden.length - 1]
}

/**
 * Het indexcijfer van één maand ('JJJJ-MM'), of `undefined` wanneer de app die
 * maand niet kent.
 *
 * Bewust `undefined` en niet een benadering: een verzonnen indexcijfer levert een
 * bedrag op dat er juist uitziet en het niet is, en dát is in een dossier tussen
 * twee ouders het gevaarlijkste wat een app kan doen.
 */
export function gezondheidsindex(maand: string): number | undefined {
  const [jaar, m] = maand.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(m) || m < 1 || m > 12) return undefined
  return REEKS[jaar]?.[m - 1]
}

/** Kent de app deze maand? */
export function kentIndexmaand(maand: string): boolean {
  return gezondheidsindex(maand) !== undefined
}
