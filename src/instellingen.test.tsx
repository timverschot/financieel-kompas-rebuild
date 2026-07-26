import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { InstellingenProvider, useInstellingen } from './instellingen'
import { STANDAARD_BUDGETDREMPEL } from './utils/meldingen'

function Proef() {
  const { budgetDrempel, zetBudgetDrempel } = useInstellingen()
  return (
    <>
      <span data-testid="drempel">{budgetDrempel}</span>
      <button onClick={() => zetBudgetDrempel(70)}>zet 70</button>
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('budgetdrempel', () => {
  it('start op de standaarddrempel', () => {
    render(
      <InstellingenProvider>
        <Proef />
      </InstellingenProvider>,
    )
    expect(screen.getByTestId('drempel').textContent).toBe(String(STANDAARD_BUDGETDREMPEL))
  })

  it('bewaart een gewijzigde drempel en leest ze terug', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <InstellingenProvider>
        <Proef />
      </InstellingenProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'zet 70' }))
    expect(screen.getByTestId('drempel').textContent).toBe('70')
    unmount()

    render(
      <InstellingenProvider>
        <Proef />
      </InstellingenProvider>,
    )
    expect(screen.getByTestId('drempel').textContent).toBe('70')
  })

  it('valt terug op de standaard bij een onzinnige bewaarde waarde', () => {
    localStorage.setItem('fk_budgetdrempel', 'heel veel')
    render(
      <InstellingenProvider>
        <Proef />
      </InstellingenProvider>,
    )
    expect(screen.getByTestId('drempel').textContent).toBe(String(STANDAARD_BUDGETDREMPEL))
  })

  it('werkt ook zonder Provider (standaardwaarde)', () => {
    render(<Proef />)
    expect(screen.getByTestId('drempel').textContent).toBe(String(STANDAARD_BUDGETDREMPEL))
  })
})
