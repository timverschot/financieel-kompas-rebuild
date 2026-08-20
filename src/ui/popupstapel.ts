import { createContext } from 'react'

// De stapel van open popups (afgesplitst in ronde 59).
//
// Waarom dit een eigen bestand is: `sluitBovenstePopup` is geen component maar wordt
// wél door `App.tsx` aangeroepen (bij een druk op de terugknop). Stond ze in
// Dialoog.tsx, dan zou dat bestand naast componenten ook een functie exporteren, en
// dat breekt het live herladen tijdens het ontwikkelen.

export type Wegklikuitkomst = 'gesloten' | 'vraagt' | 'ingetrokken'
export type Knoop = { ouder: Knoop | null; wegklikken?: () => Wegklikuitkomst }
export const openePopups: Knoop[] = []

/**
 * Sluit de bovenste popup, alsof je op Escape drukte. (ronde 59)
 *
 * ⚠ WAARVOOR. Sinds de app een geschiedenis heeft (`utils/route.ts`), is de
 * terugknop van de telefoon een gebaar dat érgens moet landen. Zonder deze functie
 * zou terug de PAGINA ACHTER de popup verwisselen terwijl de popup gewoon open
 * blijft staan — je kijkt dan naar een boekingsformulier met een andere pagina
 * eronder.
 *
 * ⚠ EN WAAROM DE POPUP GEEN EIGEN STAP IN DE GESCHIEDENIS ZET, wat de eerste
 * opzet wél deed. Zo'n stap moet bij het sluiten weer weggehaald worden met
 * `history.back()`, en dat is een ASYNCHRONE handeling: valt er ondertussen een
 * navigatie tussen, dan haalt die terugsprong de verkeerde stap weg. In de
 * testsuite leverde dat een test op die één keer op de tien omviel — het soort
 * fout dat je bouwstraat op willekeurige momenten rood maakt zonder dat er iets
 * veranderd is. Nu zet de popup niets en ruimt ze niets op: de aanroeper vangt de
 * terugdruk op en zet de route terug. Zie `App.tsx`.
 *
 * Geeft terug wat er gebeurd is, zodat de aanroeper weet of hij de route moet
 * herstellen:
 *  - `geen` — er stond geen popup open; behandel de terugdruk gewoon.
 *  - `gesloten` — de bovenste popup is dicht.
 *  - `vraagt` — er stond invoer in; de vraag "weggooien?" staat nu op het scherm en
 *    de popup blijft staan (de bewaking uit ronde 55).
 *  - `ingetrokken` — die vraag stond al open en is nu weg; de popup blijft staan.
 */
export function sluitBovenstePopup(): Wegklikuitkomst | 'geen' {
  const bovenste = openePopups.filter((p) => !openePopups.some((q) => isAfstammeling(q, p))).pop()
  if (!bovenste?.wegklikken) return 'geen'
  return bovenste.wegklikken()
}

/**
 * Wie is de popup waar je NU in staat? Elke popup geeft zichzelf door, zodat een
 * popup die binnenin getekend wordt weet wie haar ouder is.
 *
 * Waarom niet gewoon kijken wie wie bevat, zoals eerst (ronde 35): sinds elke
 * popup rechtstreeks aan de pagina gehangen wordt (zie de `createPortal` onderaan)
 * staan ze in de HTML naast elkaar in plaats van in elkaar. De familieband moeten
 * we dus zelf bijhouden. Een `useRef`-voorwerp is per popup uniek en blijft
 * bestaan zolang de component leeft; dat is genoeg om ze uit elkaar te houden.
 */
export const PopupContext = createContext<Knoop | null>(null)

/**
 * Oplopend nummer per geopende popup (ronde 59).
 *
 * Staat in de geschiedenisstap die een popup bij het openen zet, zodat ze bij het
 * sluiten kan nagaan of die stap nog van háár is. Zonder dat zou een popup die als
 * tweede sluit de stap van een andere weghalen.
 */

function isAfstammeling(kind: Knoop, van: Knoop): boolean {
  for (let k = kind.ouder; k; k = k.ouder) if (k === van) return true
  return false
}

/**
 * Is DEZE popup de bovenste — dus degene die op Escape mag reageren?
 *
 * Twee regels, in deze volgorde:
 *  1. een popup met een open popup ín zich is nooit de bovenste;
 *  2. van wie overblijft, wint de laatst geopende.
 *
 * Regel 1 is er omdat je anders met één druk op Escape ook het formulier eronder
 * sluit — met je halve boeking erin. En bewust niet "de laatst aangemelde wint":
 * React voert de effecten van een KIND uit vóór die van de ouder, dus de binnenste
 * popup meldt zich als eerste aan. Regel 2 vangt het geval van twee popups die
 * naast elkaar staan; zonder die regel voelden ze zich allebei de bovenste en sloot
 * één druk op Escape ze allebei.
 */
export function isBovenste(mij: Knoop): boolean {
  const zonderKinderen = openePopups.filter((p) => !openePopups.some((q) => isAfstammeling(q, p)))
  return zonderKinderen[zonderKinderen.length - 1] === mij
}
