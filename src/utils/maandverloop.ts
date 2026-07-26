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
 */
export function gemiddeldeVolleMaanden(reeks: MaandPaar[], lopendeMaand: string): { inkomsten: number; uitgaven: number } | null {
  const vol = reeks.filter((m) => m.maand !== lopendeMaand)
  if (vol.length === 0) return null
  const som = vol.reduce((s, m) => ({ inkomsten: s.inkomsten + m.inkomsten, uitgaven: s.uitgaven + m.uitgaven }), {
    inkomsten: 0,
    uitgaven: 0,
  })
  return { inkomsten: Math.round(som.inkomsten / vol.length), uitgaven: Math.round(som.uitgaven / vol.length) }
}
