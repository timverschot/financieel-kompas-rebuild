import type { Transactie } from '../data/schema'
import { maandUitgaven } from './overzicht'

export type MaandBedrag = { maand: string; bedrag: number }

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
