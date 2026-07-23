// Belgische indexatie van onderhoudsgeld (alimentatie):
//   geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex
// De aanvangsindex is de index bij het vastleggen van het bedrag; de nieuwe
// index is die van de maand vóór de verjaardag van de regeling. Het basisbedrag
// is in centen (zie schema.ts); het resultaat wordt afgerond op hele centen.
// Zuivere functie, zodat ze los en deterministisch getest kan worden.
export function indexeerBedrag(basisbedrag: number, aanvangsindex: number, nieuweIndex: number): number {
  if (aanvangsindex <= 0) return basisbedrag
  const ruw = (basisbedrag * nieuweIndex) / aanvangsindex
  return Math.round(ruw)
}
