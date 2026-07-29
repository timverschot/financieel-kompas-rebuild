import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TrendsSectie } from './TrendsSectie'
import type { Transactie } from '../data/schema'
import { formatEuro } from '../utils/format'
import { huidigeMaand, verschuifMaandVoorTest } from '../test/maandhulp'

// Ronde 31: hier stonden twee kaarten die dezelfde vraag beantwoordden — "wat
// beweegt er?" — met een andere tijdsbasis. De tweede negeerde bovendien stil de
// periode die je bovenaan koos. Nu is het één kaart met beide dingen per rij.

const dezeMaand = huidigeMaand()
const vorigeMaand = verschuifMaandVoorTest(dezeMaand, -1)

function tx(id: string, maand: string, bedrag: number, categorieId: string): Transactie {
  return { id, datum: `${maand}-05`, omschrijving: 'x', bedrag, rekeningId: 'r1', categorieId }
}

const transacties = [
  tx('a', dezeMaand, -12000, 'ov-voeding'),
  tx('b', vorigeMaand, -8000, 'ov-voeding'),
  tx('c', dezeMaand, -3000, 'ov-drank'),
  tx('d', vorigeMaand, -5000, 'ov-drank'),
]

function toon(metVorige = true) {
  render(
    <TrendsSectie
      transacties={transacties}
      categorieen={[]}
      richting="uitgave"
      huidige={{ van: `${dezeMaand}-01`, tot: `${dezeMaand}-31` }}
      vorige={metVorige ? { van: `${vorigeMaand}-01`, tot: `${vorigeMaand}-31` } : null}
      periodeLabel="Deze maand"
    />,
  )
}

describe('TrendsSectie', () => {
  it('staat in één kaart in plaats van twee', () => {
    toon()
    expect(screen.getByText('Verloop per categorie')).toBeInTheDocument()
    expect(screen.queryByText('Stijgers en dalers')).toBeNull()
    expect(screen.queryByText('Per categorie per maand')).toBeNull()
  })

  it('zegt in de kop welke twee tijdvakken je ziet', () => {
    toon()
    // Precies het probleem van voorheen: de sparkline loopt over zes maanden en
    // het verschil over de gekozen periode, en nergens stond dat er.
    const bijschrift = document.querySelector('.kaart-bijschrift')?.textContent ?? ''
    expect(bijschrift).toContain('Het lijntje loopt over')
    expect(bijschrift).toContain('deze maand')
  })

  it('zet per rij het verloop én het verschil met de vorige periode', () => {
    toon()
    const rijen = [...document.querySelectorAll('.lijst .rij')]
    const voeding = rijen.find((r) => r.textContent?.includes('Voeding'))!
    // € 80 vorige maand, € 120 nu = € 40 meer.
    expect(voeding.textContent).toContain(formatEuro(4000))
    expect(voeding.textContent).toContain('▲')
    // En het lijntje van zes maanden staat op dezelfde rij.
    expect(voeding.querySelector('svg')).not.toBeNull()
  })

  it('toont een daling met een pijl naar beneden', () => {
    toon()
    const rijen = [...document.querySelectorAll('.lijst .rij')]
    const drank = rijen.find((r) => r.textContent?.includes('Drank'))!
    expect(drank.textContent).toContain('▼')
    expect(drank.textContent).toContain(formatEuro(2000))
  })

  it('laat de verschilkolom leeg wanneer er geen vorige periode is', () => {
    toon(false)
    const rijen = [...document.querySelectorAll('.lijst .rij')]
    expect(rijen.some((r) => r.textContent?.includes('▲') || r.textContent?.includes('▼'))).toBe(false)
    expect(document.querySelector('.kaart-bijschrift')?.textContent).toContain('Kies een periode')
  })

  it('geeft elk lijntje een leesbare naam mee', () => {
    toon()
    expect(screen.getByRole('img', { name: /Verloop van Voeding over/ })).toBeInTheDocument()
  })
})

// --- Ronde 40 -----------------------------------------------------------------

describe('TrendsSectie — de klok en het doorklikken', () => {
  it('laat het lijntje eindigen op de maand die je meegeeft, niet op vandaag', () => {
    // Zonder ankerMaand rekende deze kaart vanuit new Date(): bladerde je bovenaan
    // naar maart, dan bleef het lijntje over de laatste zes maanden vanaf vandaag
    // gaan, zonder dat ergens te zeggen.
    render(
      <TrendsSectie
        transacties={transacties}
        categorieen={[]}
        richting="uitgave"
        huidige={{ van: '2026-03-01', tot: '2026-03-31' }}
        vorige={null}
        periodeLabel="maart 2026"
        ankerMaand="2026-03"
      />,
    )
    const bijschrift = document.querySelector('.kaart-bijschrift')?.textContent ?? ''
    expect(bijschrift).toContain('okt')
    expect(bijschrift).toContain('mrt')
  })

  it('maakt elke rij aanklikbaar zodra de app kan doorklikken', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(
      <TrendsSectie
        transacties={transacties}
        categorieen={[]}
        richting="uitgave"
        huidige={{ van: `${dezeMaand}-01`, tot: `${dezeMaand}-31` }}
        vorige={null}
        periodeLabel="Deze maand"
        onKies={onKies}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^Bekijk de boekingen van Voeding —/ }))
    expect(onKies).toHaveBeenCalledWith('ov-voeding', 'Voeding')
  })

  it('maakt geen knoppen wanneer de app niets kan doen met een klik', () => {
    toon()
    expect(screen.queryByRole('button', { name: /Bekijk de boekingen/ })).toBeNull()
  })
})
