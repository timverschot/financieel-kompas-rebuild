import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Subtabs } from './Subtabs'

// Een klein testschermpje dat de subtabs echt bedient, zodat we het gedrag testen
// en niet alleen de vormgeving.
function Proef({ onKies }: { onKies?: (id: string) => void } = {}) {
  const [tab, setTab] = useState('een')
  return (
    <Subtabs
      naam="proef"
      label="Soort"
      actief={tab}
      onKies={(id) => {
        setTab(id)
        onKies?.(id)
      }}
      tabs={[
        { id: 'een', teken: '🅰️', label: 'Eén', telling: 2 },
        { id: 'twee', label: 'Twee', telling: 0 },
        { id: 'drie', label: 'Drie' },
      ]}
    >
      <p>inhoud van {tab}</p>
    </Subtabs>
  )
}

describe('Subtabs', () => {
  it('zet de tabs in één groep met de gekozen tab gemarkeerd', () => {
    render(<Proef />)
    const strook = screen.getByRole('tablist', { name: 'Soort' })
    expect(within(strook).getAllByRole('tab')).toHaveLength(3)
    expect(screen.getByRole('tab', { name: /Eén/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Twee/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('hangt de inhoud aan de gekozen tab', () => {
    render(<Proef />)
    const paneel = screen.getByRole('tabpanel')
    const tab = screen.getByRole('tab', { name: /Eén/ })
    // Het paneel moet naar dezelfde tab wijzen die aria-selected draagt; anders
    // leest hulpsoftware de inhoud voor onder een verkeerde kop.
    expect(paneel).toHaveAttribute('aria-labelledby', tab.id)
    expect(paneel).toHaveTextContent('inhoud van een')
  })

  it('wisselt van tab bij een klik', async () => {
    const user = userEvent.setup()
    render(<Proef />)
    await user.click(screen.getByRole('tab', { name: /Twee/ }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('inhoud van twee')
    expect(screen.getByRole('tab', { name: /Twee/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('toont het aantal per tab, maar niet als het nul is', () => {
    render(<Proef />)
    // 'Eén' heeft er twee; 'Twee' heeft er nul en 'Drie' geeft geen telling mee.
    expect(screen.getByRole('tab', { name: /Eén/ })).toHaveTextContent('2')
    expect(screen.getByRole('tab', { name: /Twee/ }).textContent).toBe('Twee')
    expect(screen.getByRole('tab', { name: /Drie/ }).textContent).toBe('Drie')
  })

  it('loopt met de pijltjestoetsen door de tabs en slaat om aan het einde', async () => {
    const user = userEvent.setup()
    render(<Proef />)
    screen.getByRole('tab', { name: /Eén/ }).focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Twee/ })).toHaveFocus()

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Eén/ })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: /Drie/ })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: /Eén/ })).toHaveFocus()

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: /Drie/ })).toHaveFocus()
  })

  it('houdt maar één tab in de tabvolgorde (rollende tabindex)', async () => {
    const user = userEvent.setup()
    render(<Proef />)
    // Eén keer tabben komt op de gekozen tab uit; nog eens tabben verlaat de
    // strook in plaats van naar de tweede tab te gaan.
    await user.tab()
    expect(screen.getByRole('tab', { name: /Eén/ })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('tab', { name: /Twee/ })).not.toHaveFocus()
  })

  it('meldt elke wissel één keer', async () => {
    const user = userEvent.setup()
    const onKies = vi.fn()
    render(<Proef onKies={onKies} />)
    await user.click(screen.getByRole('tab', { name: /Drie/ }))
    expect(onKies).toHaveBeenCalledTimes(1)
    expect(onKies).toHaveBeenCalledWith('drie')
  })
})
