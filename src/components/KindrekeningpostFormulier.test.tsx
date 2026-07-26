import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { KindrekeningpostFormulier } from './KindrekeningpostFormulier'
import type { Kind, Kindrekeningpost } from '../data/schema'

const kinderen: Kind[] = [
  { id: 'k1', naam: 'Kind 1' },
  { id: 'k2', naam: 'Kind 2', gearchiveerd: true },
]

function toon(kinderenLijst: Kind[] = kinderen, bewerken: Kindrekeningpost | null = null) {
  const onOpslaan = vi.fn()
  render(
    <KindrekeningpostFormulier
      kindrekeningId="kr1"
      kinderen={kinderenLijst}
      categorieen={[]}
      onOpslaan={onOpslaan}
      bewerken={bewerken}
    />,
  )
  return onOpslaan
}

describe('KindrekeningpostFormulier', () => {
  it('bewaart het gekozen gezinslid in kindIds bij een uitgave', async () => {
    const user = userEvent.setup()
    const onOpslaan = toon()

    await user.selectOptions(screen.getByLabelText('Soort beweging'), 'uitgave')
    await user.type(screen.getByLabelText('Bedrag pot (€)'), '25')
    await user.click(screen.getByRole('button', { name: 'Kind 1' }))
    await user.click(screen.getByRole('button', { name: 'Beweging toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ kindrekeningId: 'kr1', soort: 'uitgave', bedrag: 2500, kindIds: ['k1'] }),
    )
  })

  it('toont de kiezer enkel bij een uitgave, en zonder gearchiveerde gezinsleden', async () => {
    const user = userEvent.setup()
    toon()

    // Een storting hangt aan een ouder, niet aan een gezinslid: geen kiezer.
    expect(screen.queryByText('Voor wie? (optioneel)')).toBeNull()

    await user.selectOptions(screen.getByLabelText('Soort beweging'), 'uitgave')
    expect(screen.getByText('Voor wie? (optioneel)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kind 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kind 2' })).toBeNull()
  })

  it('laat het label weg wanneer er geen gezinsleden zijn', async () => {
    const user = userEvent.setup()
    toon([])

    await user.selectOptions(screen.getByLabelText('Soort beweging'), 'uitgave')
    expect(screen.queryByText('Voor wie? (optioneel)')).toBeNull()
  })
})
