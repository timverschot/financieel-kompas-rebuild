import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StaafGrafiek } from './StaafGrafiek'

describe('StaafGrafiek', () => {
  it('tekent een staaf per maand', () => {
    render(
      <StaafGrafiek
        data={[
          { maand: '2026-06', bedrag: 10000 },
          { maand: '2026-07', bedrag: 5000 },
        ]}
      />,
    )
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('toont niets zonder data', () => {
    const { container } = render(<StaafGrafiek data={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
