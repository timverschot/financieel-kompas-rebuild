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
