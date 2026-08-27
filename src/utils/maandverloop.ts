import type { Transactie } from '../data/schema'
import { maandInkomsten, maandUitgaven } from './overzicht'

export type MaandBedrag = { maand: string; bedrag: number }

/** Wat er in één maand binnenkwam en wat eruit ging. */
export type MaandPaar = { maand: string; inkomsten: number; uitgaven: number }

// Verschuift een maand ('JJJJ-MM') met een aantal maanden.
export function verschuifMaand(maand: string, delta: number): string {
  const [jaar, m] = maand.split('-').map(Number)
  const d = new Date(jaar, m - 1 + delta, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

// De totale uitgaven per maand voor de laatste 'aantal' maanden, eindigend op
// 'eindMaand' (oudste eerst). Gebruikt maandUitgaven, dus gesplitste kassatickets
// tellen correct als één totaal mee.
export function uitgavenPerMaand(transacties: Transactie[], eindMaand: string, aantal: number): MaandBedrag[] {
  const uit: MaandBedrag[] = []
  for (let i = aantal - 1; i >= 0; i--) {
    const maand = verschuifMaand(eindMaand, -i)
    uit.push({ maand, bedrag: maandUitgaven(transacties, maand) })
  }
  return uit
}

/**
 * Inkomsten ÉN uitgaven per maand, oudste eerst.
 *
 * Waarom naast `uitgavenPerMaand`: een grafiek met alleen uitgaven zegt niet of je
 * die maand overhield. Zes kale staafjes zonder bedrag en zonder referentie tonen
 * enkel dat de ene maand hoger is dan de andere — en omdat de LOPENDE maand nog
 * niet af is, staat die altijd te laag. Met beide reeksen naast elkaar lees je de
 * enige vraag die telt: kwam er meer binnen dan eruit ging?
 */
export function inkomstenUitgavenPerMaand(transacties: Transactie[], eindMaand: string, aantal: number): MaandPaar[] {
  const uit: MaandPaar[] = []
  for (let i = aantal - 1; i >= 0; i--) {
    const maand = verschuifMaand(eindMaand, -i)
    uit.push({
      maand,
      inkomsten: maandInkomsten(transacties, maand),
      uitgaven: maandUitgaven(transacties, maand),
    })
  }
  return uit
}

/**
 * Het gemiddelde over de VOLLE maanden in de reeks — de lopende maand telt niet mee.
 *
 * Die maand is nog niet af, dus haar bedrag is per definitie te laag; ze in het
 * gemiddelde meetellen zou de lat elke maand opnieuw verlagen. Is de lopende maand
 * de enige die je hebt, dan is er geen zinvol gemiddelde en geven we null terug.
 *
 * ⚠ RONDE 110 — EN ALLES NÁ DE LOPENDE MAAND EVENMIN. Hier stond `m.maand !== lopendeMaand`,
 * dus alleen díé ene maand viel weg. Blader je op het Overzicht met "›" naar een maand die nog
 * moet komen, dan schuift het venster van zes maanden mee de toekomst in — en die lege maanden
 * telden als volwaardige maanden. Eén keer duwen maakte van "gemiddeld € 2.000 uitgaven"
 * € 1.333, drie keer duwen € 800, terwijl het bijschrift eronder gewoon "met je gemiddelde als
 * lijn" bleef zeggen. Dezelfde redenering als de zin hierboven: een maand die niet af is, hoort
 * er niet in — en een maand die nog niet eens begonnen is al helemaal niet.
 */
export function gemiddeldeVolleMaanden(reeks: MaandPaar[], lopendeMaand: string): { inkomsten: number; uitgaven: number } | null {
  const zonderLopende = reeks.filter((m) => m.maand < lopendeMaand)
  // ⚠ RONDE 106 — DE MAANDEN VÓÓR JE EERSTE BOEKING TELLEN NIET MEE. Het venster is altijd
  // zes maanden breed, ook wanneer de app twee weken oud is. Eén boeking van € 1.800 in juli,
  // bekeken in augustus, werd dan gedeeld door maart t/m juli: "Gemiddeld € 360,00 per maand"
  // onder een maand waarin je € 1.800 uitgaf. De stippellijn lag op een vijfde van de enige
  // echte maand, dus élke maand met cijfers zag er ver boven gemiddeld uit.
  //
  // Alleen de LEIDENDE lege maanden vallen weg. Een lege maand middenin je historiek is een
  // maand waarin je werkelijk niets boekte, en die hoort het gemiddelde wél te drukken.
  const eerste = zonderLopende.findIndex((m) => m.inkomsten !== 0 || m.uitgaven !== 0)
  const vol = eerste === -1 ? [] : zonderLopende.slice(eerste)
  if (vol.length === 0) return null
  const som = vol.reduce((s, m) => ({ inkomsten: s.inkomsten + m.inkomsten, uitgaven: s.uitgaven + m.uitgaven }), {
    inkomsten: 0,
    uitgaven: 0,
  })
  return { inkomsten: Math.round(som.inkomsten / vol.length), uitgaven: Math.round(som.uitgaven / vol.length) }
}
