import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { OverzichtZijkolom } from './OverzichtZijkolom'
import type { Budget, Transactie } from '../data/schema'

// De zijkolom van het Overzicht op brede schermen. Deze tests gaan over ronde 66,
// slotronde: de lege toestand noemde de Budget-pagina maar liet je er zelf naartoe
// zoeken — terwijl de kaart de knop ernaartoe al binnenkreeg voor "Alle".

function toon(budgetten: Budget[], transacties: Transactie[] = []) {
  const onGaNaarBudget = vi.fn()
  render(
    <OverzichtZijkolom
      transacties={transacties}
      budgetten={budgetten}
      maand="2026-08"
      categorieNaam={(id) => (id === 'cat1' ? 'Voeding' : undefined)}
      onGaNaarBudget={onGaNaarBudget}
    />,
  )
  return { onGaNaarBudget }
}

describe('OverzichtZijkolom — nog geen budgetten', () => {
  it('zegt wat er ontbreekt én brengt je erheen', async () => {
    const user = userEvent.setup()
    const { onGaNaarBudget } = toon([])
    expect(screen.getByText(/Nog geen budgetten ingesteld/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zet je eerste budget' }))
    expect(onGaNaarBudget).toHaveBeenCalledTimes(1)
  })

  it('laat die knop weg zodra er wél een budget staat', () => {
    toon([{ id: 'b1', categorieId: 'cat1', bedrag: 40000 }])
    expect(screen.queryByRole('button', { name: 'Zet je eerste budget' })).toBeNull()
    expect(screen.getByText('Voeding')).toBeInTheDocument()
  })
})

// --- Ronde 66, slotronde: geen tegenspraak met de Budget-pagina ---
describe('OverzichtZijkolom — budgetten die voor een andere maand gelden', () => {
  it('zegt niet "zet je eerste budget" wanneer je er al hebt', async () => {
    // ⚠ De lijst komt uit `geldendeBudgetten(budgetten, maand)`. Had je enkel een
    // budget voor januari en blaadde je naar augustus, dan stond hier "Nog geen
    // budgetten ingesteld — zet je eerste budget", terwijl de Budget-pagina in
    // diezelfde maand het tegenovergestelde zei. Ronde 62 heeft die tegenspraak
    // daar rechtgezet; deze kolom was toen vergeten.
    const gebruiker = userEvent.setup()
    const { onGaNaarBudget } = toon([{ id: 'b1', categorieId: 'cat1', bedrag: 40000, maand: '2026-01' }])
    expect(screen.getByText(/Je budgetten gelden voor een andere maand/)).toBeInTheDocument()
    expect(screen.queryByText(/Nog geen budgetten ingesteld/)).toBeNull()
    await gebruiker.click(screen.getByRole('button', { name: 'Bekijk je budgetten' }))
    expect(onGaNaarBudget).toHaveBeenCalledTimes(1)
  })
})
