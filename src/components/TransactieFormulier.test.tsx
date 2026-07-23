import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactieFormulier } from './TransactieFormulier'

const rekeningen = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]

function renderForm(onOpslaan = vi.fn(), handelaars: string[] = []) {
  render(
    <TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} handelaars={handelaars} />,
  )
  return onOpslaan
}

describe('TransactieFormulier', () => {
  it('bewaart met het juiste bedrag in centen en negatief teken voor een uitgave', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boekhandel')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ omschrijving: 'Boekhandel', bedrag: -1550, rekeningId: 'r1' }),
    )
  })

  it('maakt de velden leeg na het toevoegen', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Boekhandel')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(screen.getByLabelText('Handelaar / winkel')).toHaveValue('')
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('')
  })

  it('stelt eerder gebruikte handelaars voor vanaf twee letters', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn(), ['Colruyt', 'Delhaize'])

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'co')
    expect(await screen.findByRole('option', { name: 'Colruyt' })).toBeInTheDocument()
  })

  it('splitst het ticket over item-regels met een totaal', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '50')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    // Regel 1: item via autocomplete (op synoniem) + deelbedrag.
    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'witbrood')
    await user.keyboard('{Enter}')
    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '30')

    // Regel 2 toevoegen: vrije tekst + deelbedrag.
    await user.click(screen.getByRole('button', { name: '+ Regel toevoegen' }))
    await user.type(screen.getAllByLabelText('Item zoeken')[1], 'Wasmiddel')
    await user.type(screen.getAllByLabelText('Deelbedrag')[1], '20')

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        bedrag: -5000,
        regels: [
          expect.objectContaining({ categorieId: 'i-brood--wit-9238', omschrijving: 'Brood (wit)', bedrag: -3000 }),
          expect.objectContaining({ omschrijving: 'Wasmiddel', bedrag: -2000 }),
        ],
      }),
    )
  })

  it('maakt met Enter in het deelbedrag automatisch een nieuwe regel', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '50')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'brood')
    await user.keyboard('{Enter}')
    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '30')

    expect(screen.getAllByLabelText('Deelbedrag')).toHaveLength(1)
    await user.keyboard('{Enter}')
    expect(screen.getAllByLabelText('Deelbedrag')).toHaveLength(2)
  })
})
