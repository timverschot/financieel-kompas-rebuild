import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
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
    // ⚠ RONDE 91 heeft deze zin BEWUST niet samengevoegd met "over {n} maand(en)" van
    // de onderhoudsbijdrage. Daar kan het aantal 1 zijn en is de haakjesvorm nodig; hier
    // is het altijd twaalf, en dan is "over 12 maand(en)" alleen maar lelijker.
    expect(metas.some((m) => m.includes('over 12 maanden'))).toBe(true)
  })

  it('blijft staan met een lege toestand wanneer er nog geen rekeningen zijn', () => {
    render(
      <Vermogensevolutie rekeningen={[]} transacties={[]} overboekingen={[]} waarderingen={[]} ankerMaand="2026-07" />,
    )
    expect(screen.getByText('Zodra je een rekening hebt toegevoegd, zie je hier hoe je bezit evolueert.')).toBeInTheDocument()
  })

  // Ronde 66: de zin zei wat er ontbrak, maar niet waar je het maakt.
  it('biedt een weg naar een rekening wanneer er nog geen is', async () => {
    const user = userEvent.setup()
    const onNaarRekeningen = vi.fn()
    render(
      <Vermogensevolutie
        rekeningen={[]}
        transacties={[]}
        overboekingen={[]}
        waarderingen={[]}
        onNaarRekeningen={onNaarRekeningen}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Maak een rekening aan' }))
    expect(onNaarRekeningen).toHaveBeenCalled()
  })

  it('laat de knop weg wanneer de kaart nergens heen kan wijzen', () => {
    // Een knop die nergens heen gaat is erger dan geen knop.
    render(<Vermogensevolutie rekeningen={[]} transacties={[]} overboekingen={[]} waarderingen={[]} />)
    expect(screen.queryByRole('button', { name: 'Maak een rekening aan' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Ronde 69 — waarom dit bedrag kan verschillen van de saldotegel.
//
// Het laatste punt van de lijn is de stand aan het EINDE van de maand; de
// saldotegel op het Overzicht telt tot en met VANDAAG. Staat er een huurbetaling
// op de 28ste klaar en is het de 15de, dan staat hier een lager bedrag dan die
// tegel — twee cijfers over hetzelfde geld, zonder dat iets het verschil benoemt.
//
// De tests zetten de klok vast: of er "later deze maand" nog iets ligt, hangt af
// van de dag van vandaag, en op de laatste dag van een maand bestaat "later deze
// maand" niet. Zonder vaste klok zou deze test een tijdbom zijn.
// ---------------------------------------------------------------------------
describe('Vermogensevolutie — het verschil met de saldotegel', () => {
  const bron = () => document.querySelector('[data-evolutiebron]') as HTMLElement | null

  function toonOp(datum: Date, extra: Partial<Parameters<typeof Vermogensevolutie>[0]> = {}) {
    vi.useFakeTimers()
    vi.setSystemTime(datum)
    try {
      render(
        <Vermogensevolutie
          rekeningen={rekeningen}
          transacties={[]}
          overboekingen={[]}
          waarderingen={[]}
          {...extra}
        />,
      )
    } finally {
      vi.useRealTimers()
    }
  }

  it('legt het verschil uit wanneer er later deze maand nog een boeking staat', () => {
    // 15 juni 2026; de huur valt op de 28ste. Die zit al in het laatste punt van de
    // lijn, maar nog niet in het saldo bovenaan.
    toonOp(new Date(2026, 5, 15), {
      transacties: [{ id: 'huur', datum: '2026-06-28', omschrijving: 'Huur', bedrag: -90000, rekeningId: 'r1' }],
    })
    expect(bron()?.textContent).toBe(
      'Het laatste punt is de stand aan het einde van de maand. Eén boeking of overboeking van later deze maand telt er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.',
    )
  })

  it('zwijgt wanneer er niets meer komt deze maand', () => {
    // ⚠ Anders verklaart de zin een verschil dat er niet is: staat er niets klaar,
    // dan zegt de lijn hetzelfde als de saldotegel en is er niets te verantwoorden.
    toonOp(new Date(2026, 5, 15), {
      transacties: [{ id: 'loon', datum: '2026-06-01', omschrijving: 'Loon', bedrag: 200000, rekeningId: 'r1' }],
    })
    expect(bron()).toBeNull()
  })

  it('telt ook een overboeking mee die nog moet vallen', () => {
    // Een overboeking verschuift óók het saldo van een rekening, en de grafiek toont
    // saldo's per rekening. Telde ze niet mee, dan bleef precies hetzelfde verschil
    // onverklaard bij wie zijn spaargeld op een vaste dag doorstort.
    toonOp(new Date(2026, 5, 15), {
      overboekingen: [{ id: 'o1', datum: '2026-06-28', vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 50000 }],
    })
    expect(bron()?.textContent).toContain('Eén boeking of overboeking van later deze maand')
  })

  it('telt hoeveel boekingen er nog komen wanneer het er meer dan één zijn', () => {
    toonOp(new Date(2026, 5, 15), {
      transacties: [
        { id: 'huur', datum: '2026-06-28', omschrijving: 'Huur', bedrag: -90000, rekeningId: 'r1' },
        { id: 'gsm', datum: '2026-06-20', omschrijving: 'Gsm', bedrag: -2000, rekeningId: 'r1' },
      ],
    })
    expect(bron()?.textContent).toBe(
      'Het laatste punt is de stand aan het einde van de maand. 2 boekingen en overboekingen van later deze maand tellen er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.',
    )
  })

  it('zwijgt wanneer je naar een andere maand bladert dan de huidige', () => {
    // Dan gaat het laatste punt niet over deze maand en heeft "later deze maand"
    // geen betekenis meer voor wat de grafiek toont.
    toonOp(new Date(2026, 5, 15), {
      ankerMaand: '2026-05',
      transacties: [{ id: 'huur', datum: '2026-06-28', omschrijving: 'Huur', bedrag: -90000, rekeningId: 'r1' }],
    })
    expect(bron()).toBeNull()
  })
})
