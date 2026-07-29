import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Vermogensevolutie } from './Vermogensevolutie'
import type { Rekening, Transactie } from '../data/schema'
import { huidigeMaand } from '../utils/datum'

// Ronde 40: deze grafiek rekende met `new Date()` en eindigde dus altijd op vandaag,
// ook wanneer de maandschakelaar bovenaan naar een andere maand stond. En het
// bijschrift zei "de laatste 12 maanden" zonder ooit te noemen wélke.

const rekeningen: Rekening[] = [
  { id: 'r1', naam: 'Betaalrekening', beginsaldo: 100000 },
  { id: 'r2', naam: 'Spaarrekening', beginsaldo: 500000 },
]

const transacties: Transactie[] = [
  { id: 't1', datum: '2026-03-05', omschrijving: 'Loon', bedrag: 200000, rekeningId: 'r1' },
]

function toon(ankerMaand?: string) {
  render(
    <Vermogensevolutie
      rekeningen={rekeningen}
      transacties={transacties}
      overboekingen={[]}
      waarderingen={[]}
      ankerMaand={ankerMaand}
    />,
  )
}

const bijschrift = () => document.querySelector('.kaart-bijschrift')?.textContent ?? ''

describe('Vermogensevolutie', () => {
  it('zegt over welk tijdvak de lijn gaat', () => {
    toon('2026-07')
    // Twaalf maanden t.e.m. juli 2026 = augustus 2025 tot juli 2026.
    expect(bijschrift()).toContain('aug')
    expect(bijschrift()).toContain('jul')
  })

  it('volgt de gekozen maand in plaats van vandaag', () => {
    toon('2026-03')
    expect(bijschrift()).toContain('apr')
    expect(bijschrift()).toContain('mrt')
    // Juli hoort dan NIET meer in het venster te zitten.
    expect(bijschrift()).not.toContain('aug')
  })

  it('valt zonder ankerMaand terug op de huidige maand, zoals vroeger', () => {
    toon()
    const nu = huidigeMaand()
    const maandKortNu = new Intl.DateTimeFormat('nl-BE', { month: 'short' })
      .format(new Date(Number(nu.slice(0, 4)), Number(nu.slice(5, 7)) - 1, 1))
      .replace('.', '')
    expect(bijschrift().toLowerCase()).toContain(maandKortNu.toLowerCase())
  })

  it('noemt het aantal maanden bij het verschil', () => {
    toon('2026-07')
    const metas = [...document.querySelectorAll('.rij-meta')].map((el) => el.textContent ?? '')
    expect(metas.some((m) => m.includes('over 12 maanden'))).toBe(true)
  })

  it('blijft staan met een lege toestand wanneer er nog geen rekeningen zijn', () => {
    render(
      <Vermogensevolutie rekeningen={[]} transacties={[]} overboekingen={[]} waarderingen={[]} ankerMaand="2026-07" />,
    )
    expect(screen.getByText('Zodra je een rekening hebt toegevoegd, zie je hier hoe je bezit evolueert.')).toBeInTheDocument()
  })
})
