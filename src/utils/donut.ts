// Zuivere berekening voor een donutgrafiek. Los gehouden zodat de wiskunde
// (fracties, cumulatieve hoeken, kleurtoewijzing) deterministisch getest kan
// worden, apart van het tekenen.

export type DonutInvoer = { naam: string; bedrag: number; kleur: string | null }
export type DonutSegment = {
  naam: string
  bedrag: number
  kleur: string
  fractie: number
  start: number // cumulatieve fractie waar het segment begint (0..1)
  eind: number // ... en eindigt (0..1)
}

// Terugvalkleuren voor groepen zonder eigen kleur (bv. eigen categorieën of
// 'Zonder categorie'). De ingebouwde hoofdcategorieën dragen hun eigen kleur.
const PALET = [
  '#E69544',
  '#3F8A58',
  '#2C6CB0',
  '#C0392B',
  '#8E44AD',
  '#16A085',
  '#E67E22',
  '#7F8C8D',
  '#D35400',
  '#2980B9',
]

// Zet bedragen om naar donutsegmenten. De kleur komt uit hetzelfde data-object
// als het bedrag (belangrijke v1-les: nooit een losse kleurenlijst die uit de pas
// kan lopen); enkel groepen zonder kleur krijgen een terugvalkleur.
// Percentages die samen exact 100 zijn ("grootste-restmethode").
//
// Waarom dit bestaat: rond je elk percentage apart af, dan telt de kolom op tot
// 99% of 101% — de gebruiker ziet dat meteen en vertrouwt de cijfers niet meer.
// Werkwijze: eerst iedereen zijn hele procenten (naar beneden afgerond), daarna
// worden de resterende procenten één voor één weggegeven aan de rijen met de
// grootste "rest" (het afgeknipte stukje). Bij gelijke rest wint de rij die
// bovenaan staat, zodat dezelfde invoer altijd hetzelfde resultaat geeft.
//
// Randgevallen: een totaal van 0 (of negatief) geeft overal 0 — er valt dan niets
// te verdelen. Negatieve deelbedragen horen hier niet thuis (een taartpunt kan
// niet negatief zijn); die worden als 0 behandeld.
export function afgerondePercentages(bedragen: number[]): number[] {
  const veilig = bedragen.map((b) => (b > 0 ? b : 0))
  const totaal = veilig.reduce((s, b) => s + b, 0)
  if (totaal <= 0) return bedragen.map(() => 0)

  const exact = veilig.map((b) => (b / totaal) * 100)
  const heel = exact.map((p) => Math.floor(p))
  let teVerdelen = 100 - heel.reduce((s, p) => s + p, 0)

  // Volgorde: grootste rest eerst; bij gelijkspel de laagste index eerst.
  const volgorde = exact
    .map((p, i) => ({ i, rest: p - Math.floor(p) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)

  const uit = [...heel]
  for (const { i } of volgorde) {
    if (teVerdelen <= 0) break
    uit[i] += 1
    teVerdelen--
  }
  return uit
}

export function donutSegmenten(items: DonutInvoer[]): DonutSegment[] {
  const totaal = items.reduce((s, i) => s + i.bedrag, 0)
  if (totaal <= 0) return []
  let cum = 0
  return items.map((it, i) => {
    const fractie = it.bedrag / totaal
    const start = cum
    cum += fractie
    return {
      naam: it.naam,
      bedrag: it.bedrag,
      kleur: it.kleur ?? PALET[i % PALET.length],
      fractie,
      start,
      eind: cum,
    }
  })
}

// Hoeveel tekens er in het gat van de donut passen, per regel.
//
// SVG-tekst breekt niet vanzelf af: één lange naam als "Woning en vaste lasten"
// loopt gewoon dwars over de ring heen. We knippen ze daarom zelf in hoogstens
// twee regels, op een spatie, en korten de rest in met een beletselteken.
const TEKENS_PER_REGEL = 16
const MAX_REGELS = 2

export function splitsLabel(naam: string, perRegel = TEKENS_PER_REGEL): string[] {
  if (naam.length <= perRegel) return [naam]

  const regels: string[] = []
  let huidig = ''
  for (const woord of naam.split(' ')) {
    // Past het woord er nog bij? Zo ja, aanvullen; zo nee, regel afsluiten.
    const kandidaat = huidig ? `${huidig} ${woord}` : woord
    if (kandidaat.length <= perRegel) {
      huidig = kandidaat
      continue
    }
    if (huidig) regels.push(huidig)
    huidig = woord
    if (regels.length === MAX_REGELS) break
  }
  if (huidig && regels.length < MAX_REGELS) regels.push(huidig)

  const zichtbaar = regels.slice(0, MAX_REGELS)
  const restVolgt = zichtbaar.join(' ').length < naam.length
  return zichtbaar.map((r, i) => {
    const laatste = i === zichtbaar.length - 1
    if (r.length > perRegel) return r.slice(0, perRegel - 1) + '…'
    return laatste && restVolgt ? r.slice(0, perRegel - 1) + '…' : r
  })
}
