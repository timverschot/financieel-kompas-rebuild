import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { Gezinslid } from '../data/schema'
import { GezinsledenKiezer } from './GezinslidKiezer'

const leden: Gezinslid[] = [
  { id: 'p1', naam: 'Emma', rol: 'kind' },
  { id: 'p2', naam: 'Noah', rol: 'kind' },
]

describe('GezinsledenKiezer', () => {
  it('toont niets wanneer er geen gezinsleden zijn', () => {
    const { container } = render(
      <GezinsledenKiezer label="Voor wie?" waarden={[]} onWijzig={() => {}} gezinsleden={[]} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('schakelt een gezinslid aan en uit', async () => {
    const user = userEvent.setup()
    const onWijzig = vi.fn()
    render(<GezinsledenKiezer label="Voor wie?" waarden={[]} onWijzig={onWijzig} gezinsleden={leden} />)

    await user.click(screen.getByRole('button', { name: 'Emma' }))
    expect(onWijzig).toHaveBeenCalledWith(['p1'])
  })

  // Ronde 28: "geen gezinslid gekozen" betekende altijd al "voor het gezin", maar
  // dat stond nergens. Zonder metGezin blijft de chip weg — in een dossier of op
  // een kindrekening is een kost per definitie van iemand.
  describe('de chip "Het gezin"', () => {
    it('staat er niet zonder metGezin', () => {
      render(<GezinsledenKiezer label="Voor wie?" waarden={[]} onWijzig={() => {}} gezinsleden={leden} />)
      expect(screen.queryByRole('button', { name: 'Het gezin' })).toBeNull()
    })

    it('staat standaard aan zolang er niemand apart aangeduid is', () => {
      render(<GezinsledenKiezer label="Voor wie?" waarden={[]} onWijzig={() => {}} gezinsleden={leden} metGezin />)
      expect(screen.getByRole('button', { name: 'Het gezin' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('gaat uit zodra je iemand aanduidt', () => {
      render(<GezinsledenKiezer label="Voor wie?" waarden={['p1']} onWijzig={() => {}} gezinsleden={leden} metGezin />)
      expect(screen.getByRole('button', { name: 'Het gezin' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: 'Emma' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('zet de keuze weer op het gezin wanneer je erop klikt', async () => {
      const user = userEvent.setup()
      const onWijzig = vi.fn()
      render(
        <GezinsledenKiezer label="Voor wie?" waarden={['p1', 'p2']} onWijzig={onWijzig} gezinsleden={leden} metGezin />,
      )
      await user.click(screen.getByRole('button', { name: 'Het gezin' }))
      expect(onWijzig).toHaveBeenCalledWith([])
    })
  })
})
