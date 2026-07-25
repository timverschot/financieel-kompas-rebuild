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
    expect(screen.getByRole('img', { name: 'uitgaven per categorie' })).toBeInTheDocument()
  })

  it('toont niets bij lege data', () => {
    const { container } = render(<Donut items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('toont percentages die samen exact 100% zijn', () => {
    render(
      <Donut
        items={[
          { naam: 'A', bedrag: 100, kleur: '#111' },
          { naam: 'B', bedrag: 100, kleur: '#222' },
          { naam: 'C', bedrag: 100, kleur: '#333' },
        ]}
      />,
    )
    // Apart afronden gaf drie keer 33% (samen 99%); nu 34 + 33 + 33 = 100.
    const percentages = screen.getAllByText(/^\d+%$/).map((el) => Number(el.textContent!.replace('%', '')))
    expect(percentages).toEqual([34, 33, 33])
    expect(percentages.reduce((s, p) => s + p, 0)).toBe(100)
  })

  it('toont twee gelijknamige schijven allebei (unieke sleutel per segment)', () => {
    render(
      <Donut
        items={[
          { naam: 'Onbekend', bedrag: 300, kleur: '#111' },
          { naam: 'Onbekend', bedrag: 100, kleur: '#222' },
        ]}
      />,
    )
    expect(screen.getAllByText('Onbekend')).toHaveLength(2)
  })
})
