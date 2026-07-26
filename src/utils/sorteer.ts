// Eén plek voor "zet dit op datum, nieuwste eerst".
//
// Waarom dit bestaat: op zes plaatsen stond de vergelijker
// `(a, b) => (a.datum < b.datum ? 1 : -1)`. Die geeft **nooit 0**, ook niet wanneer
// twee datums gelijk zijn — bij gelijke datums antwoordt hij "b eerst", en na het
// omdraaien van a en b antwoordt hij dát ook. Zo'n vergelijker is inconsistent, dus
// de uitkomst voor rijen op dezelfde dag is niet gedefinieerd.
//
// Dat viel op in gebruik: `laadTransacties()` haalt de records op met `toArray()`
// zonder sortering, en de primaire sleutel is een willekeurige UUID. De invoer­orde
// is dus willekeurig, en na elke herlaad kon de onderlinge volgorde van boekingen
// van vandaag wisselen. Het leek alsof er iets verschoof.
//
// De oplossing is een echte vergelijking met tiebreakers, zoals
// `utils/afrekeningOverzicht.ts` al deed: eerst de datum, dan een tekst die de
// gebruiker ziet, en als laatste de id — die is altijd verschillend, dus de
// uitkomst is volledig bepaald.

/** Het minimum dat we nodig hebben om te kunnen sorteren. */
export type OpDatum = {
  datum: string // JJJJ-MM-DD, dus tekstvergelijking = chronologisch
  id?: string
  omschrijving?: string
}

/**
 * Vergelijkt twee records op datum, NIEUWSTE EERST, met een vaste uitkomst bij
 * gelijke datums. Bedoeld voor `Array.prototype.sort`.
 */
export function nieuwsteEerst(a: OpDatum, b: OpDatum): number {
  if (a.datum !== b.datum) return a.datum < b.datum ? 1 : -1
  // Zelfde dag: op iets vergelijken dat de gebruiker ziet, zodat de volgorde
  // leesbaar én stabiel is.
  const oa = a.omschrijving ?? ''
  const ob = b.omschrijving ?? ''
  if (oa !== ob) return oa.localeCompare(ob, 'nl')
  return (a.id ?? '').localeCompare(b.id ?? '')
}

/** Hetzelfde, oudste eerst. */
export function oudsteEerst(a: OpDatum, b: OpDatum): number {
  return -nieuwsteEerst(a, b)
}

/** Kopieert en sorteert, nieuwste eerst. Laat de invoerlijst ongemoeid. */
export function gesorteerdNieuwsteEerst<T extends OpDatum>(lijst: T[]): T[] {
  return [...lijst].sort(nieuwsteEerst)
}
