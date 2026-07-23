import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Donut } from './Donut'

describe('Donut', () => {
  it('toont de categorieën in de legende en een grafiek', () => {
    render(
      <Donut
        items={[
          { naam: 'Voeding', bedrag: 300, kleur: '#111' },
          { naam: 'Wonen', bedrag: 200, kleur: null },
        ]}
      />,
    )
    expect(screen.getByText('Voeding')).toBeInTheDocument()
    expect(screen.getByText('Wonen')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Uitgaven per categorie' })).toBeInTheDocument()
  })

  it('toont niets bij lege data', () => {
    const { container } = render(<Donut items={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
