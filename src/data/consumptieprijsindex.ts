// De Belgische INDEX VAN DE CONSUMPTIEPRIJZEN, als GEGEVENS (ronde 58).
//
// ⚠ WAAROM DIT BESTAND ER KOMT, EN WAAROM DAT GEEN DETAIL IS.
//
// Tot ronde 58 rekende de app een onderhoudsbijdrage met de GEZONDHEIDSINDEX, en
// de brief zei dat ook met zoveel woorden. Dat is de verkeerde reeks. Artikel
// 203quater oud BW bindt de bijdrage aan "het indexcijfer van de CONSUMPTIEPRIJZEN
// van de maand die voorafgaat aan de maand waarin het vonnis wordt uitgesproken",
// en past ze om de twaalf maanden van rechtswege aan "in verhouding tot de
// verhoging of de verlaging van het indexcijfer van de consumptieprijzen van de
// overeenstemmende maand".
//
// Het verschil is echt geld. De gezondheidsindex is dezelfde korf MIN tabak,
// alcohol, benzine en diesel; de twee reeksen lopen uiteen en dat verschil stapelt
// jaar na jaar op. Het bedrag uit deze berekening belandt in een brief die naar de
// andere ouder of naar een advocaat kan gaan — een tegenpartij die de verkeerde
// reeks opmerkt, heeft gelijk.
//
// ⚠ EN LET OP WAT "IEDEREEN WEET". Bij het uitzoeken kwam meermaals de bewering
// langs dat alimentatie op de gezondheidsindex loopt. Dat is een wijdverbreide
// verwarring met HUUR en LONEN, waar de gezondheidsindex wél de juiste is. Drie
// onafhankelijke bronnen zeggen het tegendeel voor onderhoudsbijdragen: de
// wettekst zelf, familierecht.vlaanderen ("In de regel de consumptieprijsindex")
// en de rechtspraktijk. Zie `claude/Kompal_evaluatie-en-marktpositie-augustus2026.md`
// (deel 0) en `claude/Kompal_indexcijfers-consumptieprijsindex.md`.
//
// De akte mag hiervan afwijken — de wet zegt "tenzij anders overeengekomen". Staat
// er in jouw vonnis uitdrukkelijk "gezondheidsindex", dan is die de juiste. Daarom
// kiest de app niet vóór jou maar toont ze wélke reeks ze gebruikt, met de
// wettelijke standaard voorgeselecteerd. Zie `data/indexreeksen.ts`.
//
// BRONNEN. De reeks is opgebouwd uit Statbel (be.STAT), het Federaal Planbureau,
// Securex, Kluwer ImmoSpector, indexatwork.be en essenscia, telkens met minstens
// twee bronnen per maand. De verantwoording staat in
// `claude/Kompal_indexcijfers-consumptieprijsindex.md`.

/**
 * Het basisjaar van deze reeks.
 *
 * Dezelfde valkuil als bij de gezondheidsindex, en sinds 2026 erger. Statbel
 * publiceert de consumptieprijsindex **sinds januari 2026 in basis 2025 = 100**, en
 * blijft de basis 2013 ernaast publiceren. Er zijn dus drie basissen in omloop
 * (2004, 2013, 2025).
 *
 * Deze tabel staat volledig in basis 2013. Een cijfer dat de gebruiker vandaag uit
 * de krant of van een website overtikt, kan in basis 2025 staan — en dat is
 * ruim een kwart kleiner (nagerekend: 1 / 1,35298 = 0,739). `indexBasisjaar` op de regeling bestaat precies daarvoor.
 *
 * De omrekening van basis 2013 naar basis 2025 is delen door 1,35298 (het
 * jaargemiddelde 2025 in basis 2013). ⚠ Voor de gezondheidsindex geldt een ANDER
 * getal (1,35566): de jaargemiddelden van de twee reeksen verschillen. Reken die
 * twee dus nooit met dezelfde factor om.
 */
export const CPI_BASISJAAR = 2013

/**
 * De consumptieprijsindex per maand, in basis 2013 = 100.
 *
 * Twaalf cijfers per jaar, in maandvolgorde (januari eerst). Het laatste jaar mag
 * korter zijn: Statbel publiceert een maand pas rond het einde van die maand.
 *
 * Elke maand is door minstens twee onafhankelijke bronnen bevestigd; de nakijkronde
 * heeft er nog eens 24 nagerekend via de omrekening uit basis 1988. Zie de nota in
 * het projectdossier voor de volledige verantwoording per jaar.
 */
const REEKS: Record<number, number[]> = {
  2015: [99.85, 100.26, 100.32, 100.7, 100.86, 101.01, 101.01, 101.08, 101.15, 101.5, 101.61, 101.48],
  2016: [101.59, 101.65, 102.57, 102.75, 103.08, 103.19, 103.31, 103.26, 103.04, 103.34, 103.41, 103.54],
  2017: [104.28, 104.67, 104.91, 105.09, 105.0, 104.84, 105.15, 105.22, 105.11, 105.41, 105.55, 105.75],
  2018: [106.06, 106.22, 106.37, 106.69, 106.91, 107.02, 107.43, 107.58, 107.58, 108.31, 108.48, 108.22],
  2019: [108.17, 108.52, 108.85, 108.91, 108.93, 108.87, 108.96, 108.94, 108.44, 108.83, 108.9, 109.04],
  2020: [109.69, 109.71, 109.53, 109.53, 109.45, 109.52, 109.76, 109.83, 109.42, 109.64, 109.46, 109.49],
  2021: [109.97, 110.21, 110.51, 110.88, 111.05, 111.3, 112.25, 112.83, 112.55, 114.2, 115.63, 115.74],
  2022: [118.32, 119.07, 119.69, 120.09, 121.01, 122.04, 123.05, 124.05, 125.24, 128.21, 127.92, 127.72],
  2023: [127.84, 126.95, 127.67, 126.82, 127.3, 127.11, 128.14, 129.12, 128.23, 128.67, 128.89, 129.45],
  2024: [130.08, 131.01, 131.73, 131.1, 131.58, 131.87, 132.81, 132.81, 132.15, 132.79, 133.01, 133.54],
  2025: [135.39, 135.66, 135.56, 134.44, 134.23, 134.7, 135.36, 135.35, 134.95, 135.44, 136.2, 136.29],
  2026: [136.88, 137.63, 137.79, 139.82, 139.71, 139.29, 140.17],
}

/** De maanden waarvoor de app een cijfer kent, als 'JJJJ-MM', oudste eerst. */
export function bekendeCpiMaanden(): string[] {
  const uit: string[] = []
  for (const jaar of Object.keys(REEKS)
    .map(Number)
    .sort((a, b) => a - b)) {
    REEKS[jaar].forEach((_, i) => uit.push(`${jaar}-${String(i + 1).padStart(2, '0')}`))
  }
  return uit
}

/**
 * Het indexcijfer van één maand ('JJJJ-MM'), of `undefined` wanneer de app die
 * maand niet kent.
 *
 * Bewust `undefined` en niet een benadering: een verzonnen indexcijfer levert een
 * bedrag op dat er juist uitziet en het niet is.
 */
export function consumptieprijsindex(maand: string): number | undefined {
  const [jaar, m] = maand.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(m) || m < 1 || m > 12) return undefined
  return REEKS[jaar]?.[m - 1]
}
