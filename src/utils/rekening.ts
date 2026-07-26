import type { Rekening } from '../data/schema'

// Hoe een rekening heet in een keuzelijst.
//
// Waarom dit bestaat: in elke keuzelijst stond alleen `naam`. Heb je twee
// rekeningen die allebei "Betaalrekening" heten, of geef je ze een rubriek mee om
// ze uit elkaar te houden, dan zag je dat verschil nergens terug — alleen op de
// pagina Rekeningen. Je koos dus blind.
//
// Wat er nu bij komt, alleen wanneer het ingevuld is:
//  - de RUBRIEK (het veld met de tip "optionele groepsnaam"), want dat is precies
//    het veld waarmee je twee gelijknamige rekeningen scheidt;
//  - de LAATSTE VIER tekens van het rekeningnummer. Niet het volledige nummer: dat
//    maakt de regel onleesbaar lang, en de laatste vier volstaan om te herkennen
//    welke rekening je voor je hebt.
//
// De naam blijft altijd vooraan staan, zodat de lijst alfabetisch leesbaar blijft
// en niets van plaats verschuift voor wie geen rubriek gebruikt.

/** De laatste vier tekens van een rekeningnummer, spaties genegeerd. */
export function nummerStaart(nummer: string | undefined): string | null {
  const kaal = (nummer ?? '').replace(/\s+/g, '')
  if (kaal.length < 4) return null
  return kaal.slice(-4)
}

export function rekeningLabel(r: Rekening): string {
  const staart = nummerStaart(r.rekeningnummer)
  return [r.naam, r.rubriek, staart ? `…${staart}` : null].filter(Boolean).join(' · ')
}
