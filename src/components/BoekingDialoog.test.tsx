import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BoekingDialoog } from './BoekingDialoog'
import type { Overboeking, Rekening } from '../data/schema'

const REKENINGEN: Rekening[] = [
  { id: 'r1', naam: 'Betaalrekening', beginsaldo: 100000 },
  { id: 'r2', naam: 'Spaarrekening', beginsaldo: 500000 },
]

function toon(extra: Partial<Parameters<typeof BoekingDialoog>[0]> = {}) {
  const onTransactie = vi.fn()
  const onVastePost = vi.fn()
  const onOverboeking = vi.fn()
  const onSluiten = vi.fn()
  const overboekingen: Overboeking[] = []
  render(
    <BoekingDialoog
      open
      onSluiten={onSluiten}
      rekeningen={REKENINGEN}
      categorieen={[]}
      handelaars={[]}
      overboekingen={overboekingen}
      transacties={[]}
      onTransactie={onTransactie}
      onVastePost={onVastePost}
      onOverboeking={onOverboeking}
      {...extra}
    />,
  )
  return { onTransactie, onVastePost, onOverboeking, onSluiten }
}

describe('BoekingDialoog', () => {
  it('toont de vier soorten en begint op Uitgave', () => {
    toon()
    for (const naam of ['Uitgave', 'Inkomst', 'Vaste last', 'Sparen']) {
      expect(screen.getByRole('button', { name: naam })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Uitgave' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Uitgave toevoegen')
  })

  it('boekt een uitgave met een minteken', async () => {
    const user = userEvent.setup()
    const { onTransactie } = toon()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onTransactie).toHaveBeenCalledWith(expect.objectContaining({ bedrag: -1250, omschrijving: 'Colruyt' }))
  })

  it('boekt een inkomst met een plusbedrag na één klik op de soortknop', async () => {
    const user = userEvent.setup()
    const { onTransactie } = toon()
    await user.click(screen.getByRole('button', { name: 'Inkomst' }))
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Loon')
    await user.type(screen.getByLabelText('Bedrag (€)'), '2400')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onTransactie).toHaveBeenCalledWith(expect.objectContaining({ bedrag: 240000 }))
  })

  it('verbergt de radiobolletjes voor uitgave/inkomst, want de soortknoppen doen dat al', () => {
    toon()
    // Zou de keuze op twee plaatsen staan, dan kan ze uit elkaar lopen: je klikt
    // 'Inkomst' bovenaan en het bolletje onderaan staat nog op 'Uitgave'.
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('maakt bij "Vaste last" een terugkerende post en niet een transactie', async () => {
    const user = userEvent.setup()
    const { onVastePost, onTransactie } = toon()
    await user.click(screen.getByRole('button', { name: 'Vaste last' }))
    await user.type(screen.getByLabelText('Vaste omschrijving'), 'Huur')
    await user.type(screen.getByLabelText('Vast bedrag (€)'), '950')
    await user.click(screen.getByRole('button', { name: 'Vaste post toevoegen' }))
    expect(onVastePost).toHaveBeenCalledWith(expect.objectContaining({ omschrijving: 'Huur', bedrag: -95000, dag: 1 }))
    expect(onTransactie).not.toHaveBeenCalled()
  })

  it('maakt bij "Sparen" een overboeking en niet een uitgave', async () => {
    const user = userEvent.setup()
    const { onOverboeking, onTransactie } = toon()
    await user.click(screen.getByRole('button', { name: 'Sparen' }))
    await user.selectOptions(screen.getByLabelText('Van rekening'), 'r1')
    await user.selectOptions(screen.getByLabelText('Naar rekening'), 'r2')
    await user.type(screen.getByLabelText('Over te boeken bedrag (€)'), '200')
    await user.click(screen.getByRole('button', { name: 'Overboeking toevoegen' }))
    expect(onOverboeking).toHaveBeenCalledWith(
      expect.objectContaining({ vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 20000 }),
    )
    expect(onTransactie).not.toHaveBeenCalled()
  })

  it('sluit na het opslaan, maar niet na "Opslaan + volgende"', async () => {
    const user = userEvent.setup()
    const { onSluiten } = toon()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')

    await user.click(screen.getByRole('button', { name: 'Opslaan + volgende' }))
    expect(onSluiten).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Krant')
    await user.type(screen.getByLabelText('Bedrag (€)'), '3')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))
    expect(onSluiten).toHaveBeenCalled()
  })

  it('opent op de soort waarmee ze geopend werd', () => {
    toon({ beginSoort: 'sparen' })
    expect(screen.getByRole('button', { name: 'Sparen' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Van rekening')).toBeInTheDocument()
  })

  it('zegt bij Sparen dat het geen uitgave is', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Sparen' }))
    expect(screen.getByText(/geen uitgave/)).toBeInTheDocument()
  })
})
