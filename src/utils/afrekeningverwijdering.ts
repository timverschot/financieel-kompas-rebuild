import type { GedeeldeKost, Verrekening } from '../data/schema'
import type { Vertaler } from '../i18n'
import { formatEuro } from './format'
import { dagJaar } from './datum'

// Wat gaat er precies weg met deze afrekening? (ronde 65)
//
// ⚠ WAAROM DEZE FUNCTIE BESTAAT. Het kruisje naast een afrekening wiste ze zonder
// vraag én zonder ongedaan-balk. En het ergste stond niet op het scherm: is de
// afrekening als 'overgemaakt' gemarkeerd, dan staan de kosten die ze dekt op
// 'afgerekend'. Verdween de afrekening, dan bleven die kosten afgerekend — buiten
// het openstaande saldo, zonder dat er nog iets bestond dat uitlegde waarom.
// Geld dat stil uit een saldo valt, is precies wat een dossier onbruikbaar maakt
// als bewijs.
//
// Ze TELT, net als bij het verwijderen van een dossier: het verschil tussen een
// afrekening van nul euro en een van 1.240 euro over veertig kosten is wat je op
// dat moment moet weten. "Weet je het zeker" leert een mens wegklikken.

/** De kosten die deze afrekening dekt en die nog bestaan. */
export function kostenVanAfrekening(afrekening: Verrekening, kosten: GedeeldeKost[]): GedeeldeKost[] {
  const ids = new Set(afrekening.kostIds ?? [])
  return (kosten ?? []).filter((k) => ids.has(k.id))
}

/**
 * Welke kosten gaan weer open wanneer deze afrekening verdwijnt?
 *
 * Twee gevallen, en alleen die twee:
 *
 *  1. De afrekening is als OVERGEMAAKT gemarkeerd. Dan heeft zij de kosten die ze
 *     dekt op `afgerekend` gezet (zie `markeerOvergemaakt`), en verdwijnt zij, dan
 *     hoort dat terug open te gaan. Staat ze nog open, dan heeft ze niets
 *     dichtgezet en blijft een kost die om een ándere reden afgerekend is, gewoon
 *     afgerekend.
 *  2. De kost draagt de oude `verrekeningId`-koppeling naar déze afrekening
 *     (dossiers van vóór het niet-blokkerende model). Die telt in `isOpenKost` even
 *     zwaar als `afgerekend`; bleef ze staan, dan bleef die kost voorgoed buiten je
 *     saldo met een verwijzing naar iets wat niet meer bestaat.
 */
export function kostenOmTeHeropenen(afrekening: Verrekening, kosten: GedeeldeKost[]): GedeeldeKost[] {
  const gedekt = new Set(kostenVanAfrekening(afrekening, kosten).map((k) => k.id))
  // ⚠ Het tweede geval kijkt NIET naar `kostIds`. Dat veld is optioneel, en juist de
  // oude dossiers waarvoor `verrekeningId` bestaat, hebben het niet — dan zou de
  // koppeling buiten schot blijven en de kost voorgoed buiten je saldo vallen met
  // een verwijzing naar een afrekening die niet meer bestaat.
  return (kosten ?? []).filter(
    (k) =>
      (afrekening.overgemaakt === true && k.afgerekend === true && gedekt.has(k.id)) ||
      k.verrekeningId === afrekening.id,
  )
}

/**
 * De regels voor het vraagvenster. Alleen wat er ECHT is, en de zin over het
 * openzetten van kosten alleen wanneer dat ook gebeurt.
 */
export function telAfrekeningVerwijderen(
  t: Vertaler,
  afrekening: Verrekening,
  kosten: GedeeldeKost[],
): string[] {
  // ⚠ De eerste regel telt ALLES wat aan deze afrekening hangt: via `kostIds` én via
  // de oude `verrekeningId`-koppeling. Telde ze alleen `kostIds`, dan zei het venster
  // bij een oud dossier "3 kost(en) komen weer open" zonder ooit gezegd te hebben
  // dat er kosten aan hingen — of erger: "2 blijven bestaan" boven "3 komen weer
  // open". De tweede regel telt daarvan een deelverzameling: wat er ook echt weer
  // in je saldo terechtkomt.
  const gedekt = [
    ...new Set([
      ...kostenVanAfrekening(afrekening, kosten).map((k) => k.id),
      ...kostenOmTeHeropenen(afrekening, kosten).map((k) => k.id),
    ]),
  ]
  const regels: string[] = [
    t('Het bedrag van {bedrag} en de opbouw erachter — welke kosten, welke periode, welk aandeel.', {
      bedrag: formatEuro(Math.abs(afrekening.bedrag)),
    }),
  ]
  if (gedekt.length > 0) {
    regels.push(t('{n} gedeelde kost(en) blijven bestaan; alleen hun plek in deze afrekening verdwijnt.', { n: gedekt.length }))
  }
  // ⚠ Een INGETROKKEN kost telt sowieso niet mee in het saldo (de andere ouder
  // haalde ze uit haar dossier, ronde 44). Ze gaat wel mee open, maar over haar mag
  // hier niet beweerd worden dat ze "weer meetelt".
  const terugInSaldo = kostenOmTeHeropenen(afrekening, kosten).filter((k) => !k.ingetrokken).length
  if (terugInSaldo > 0) {
    regels.push(t('{n} kost(en) komen weer op "nog niet afgerekend" te staan en tellen dus opnieuw mee in je saldo.', { n: terugInSaldo }))
  }
  return regels
}

/** De titelzin van het vraagvenster, met de dag erin. */
export function afrekeningTitel(t: Vertaler, afrekening: Verrekening): string {
  return t('De afrekening van {datum} verwijderen?', { datum: dagJaar(afrekening.datum) })
}
