import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactieFormulier } from './TransactieFormulier'

const rekeningen = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]

describe('TransactieFormulier', () => {
  it('bewaart met het juiste bedrag in centen en negatief teken voor een uitgave', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} />)

    await user.type(screen.getByLabelText('Omschrijving'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15,50')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ omschrijving: 'Boek', bedrag: -1550, rekeningId: 'r1' }),
    )
  })

  it('maakt de velden leeg na het toevoegen (klaar voor de volgende invoer)', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} />)

    await user.type(screen.getByLabelText('Omschrijving'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(screen.getByLabelText('Omschrijving')).toHaveValue('')
    expect(screen.getByLabelText('Bedrag (€)')).toHaveValue('')
  })

  it('splitst een transactie over twee deelbedragen', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} />)

    await user.type(screen.getByLabelText('Omschrijving'), 'Colruyt')
    await user.click(screen.getByLabelText(/Splitsen over meerdere categorieën/))

    const deel = screen.getAllByLabelText('Deelbedrag')
    await user.type(deel[0], '30')
    await user.type(deel[1], '20')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        bedrag: -5000,
        regels: [expect.objectContaining({ bedrag: -3000 }), expect.objectContaining({ bedrag: -2000 })],
      }),
    )
  })

  it('laat per deelregel een subcategorie (item) kiezen via de autocomplete', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<TransactieFormulier onOpslaan={onOpslaan} rekeningen={rekeningen} categorieen={[]} />)

    await user.type(screen.getByLabelText('Omschrijving'), 'Colruyt')
    await user.click(screen.getByLabelText(/Splitsen over meerdere categorieën/))

    const deel = screen.getAllByLabelText('Deelbedrag')
    await user.type(deel[0], '30')
    await user.type(deel[1], '20')

    // In de eerste deelregel een subcategorie kiezen met het toetsenbord.
    const zoekvakken = screen.getAllByLabelText('Zoek categorie of item')
    await user.type(zoekvakken[0], 'witbrood')
    await user.keyboard('{Enter}')

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        regels: [
          expect.objectContaining({ categorieId: 'i-brood--wit-9238', bedrag: -3000 }),
          expect.objectContaining({ bedrag: -2000 }),
        ],
      }),
    )
  })
})
