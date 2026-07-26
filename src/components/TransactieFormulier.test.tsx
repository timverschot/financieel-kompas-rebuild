import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactieFormulier } from './TransactieFormulier'
import { bouwHandelaarIndex } from '../utils/categorieVoorstel'
import type { Transactie } from '../data/schema'

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

  it('tagt een ticketregel breed via een hoofdcategorie-chip', async () => {
    const user = userEvent.setup()
    const onOpslaan = renderForm()

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '12')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'diversen')
    await user.click(screen.getAllByRole('button', { name: /Huishouden en Verzorging/ })[0])
    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '12')

    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        regels: [expect.objectContaining({ categorieId: 'ov-huishouden-en-verzorging', omschrijving: 'diversen', bedrag: -1200 })],
      }),
    )
  })

  it('maakt vanuit de kassaticket-zoeker een nieuwe subcategorie en tagt de regel erop', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    const onNieuweSubcategorie = vi.fn().mockResolvedValue('sub-kefir-9')
    render(
      <TransactieFormulier
        onOpslaan={onOpslaan}
        rekeningen={rekeningen}
        categorieen={[]}
        handelaars={[]}
        onNieuweSubcategorie={onNieuweSubcategorie}
      />,
    )

    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.type(screen.getByLabelText('Bedrag (€)'), '3')
    await user.click(screen.getByLabelText(/Kassaticket splitsen/))

    await user.type(screen.getAllByLabelText('Item zoeken')[0], 'Kefir')
    await user.click(await screen.findByRole('button', { name: /Kefir.*toevoegen/ }))
    await user.selectOptions(screen.getByLabelText('Onder welke categorie'), 'cat-zuivel-en-kaas')
    await user.click(screen.getByRole('button', { name: 'Subcategorie toevoegen' }))

    // Het bewaren is asynchroon; pas daarna wordt de regel op het nieuwe id getagd.
    await waitFor(() => expect(onNieuweSubcategorie).toHaveBeenCalledWith('cat-zuivel-en-kaas', 'Kefir'))

    await user.type(screen.getAllByLabelText('Deelbedrag')[0], '3')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({
        regels: [expect.objectContaining({ categorieId: 'sub-kefir-9', omschrijving: 'Kefir', bedrag: -300 })],
      }),
    )
  })
})

// Ronde 18: boekte je deze handelaar eerder, dan stelt het formulier die
// categorie voor. Bewust een voorstel, geen stille invulling.
describe('TransactieFormulier — categorie van de vorige keer', () => {
  const eerder: Transactie[] = [
    { id: 't1', datum: '2026-06-01', omschrijving: 'Colruyt', bedrag: -3200, rekeningId: 'r1', categorieId: 'ov-voeding' },
  ]

  function toonMetIndex() {
    return render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={[{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]}
        categorieen={[]}
        handelaars={['Colruyt']}
        handelaarIndex={bouwHandelaarIndex(eerder)}
      />,
    )
  }

  it('stelt niets voor zolang de handelaar leeg is', () => {
    toonMetIndex()
    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })

  it('stelt de categorie van de vorige keer voor, ook met andere hoofdletters', async () => {
    const user = userEvent.setup()
    toonMetIndex()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'colruyt')

    expect(await screen.findByText('Vorige keer bij deze handelaar:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gebruik Voeding, zoals de vorige keer' })).toBeInTheDocument()
  })

  it('stelt niets voor bij een onbekende handelaar', async () => {
    const user = userEvent.setup()
    toonMetIndex()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Delhaize')
    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })

  it('verdwijnt zodra je het voorstel overneemt', async () => {
    const user = userEvent.setup()
    toonMetIndex()
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    await user.click(await screen.findByRole('button', { name: 'Gebruik Voeding, zoals de vorige keer' }))

    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })

  it('doet niets wanneer er geen index meegegeven is', async () => {
    const user = userEvent.setup()
    render(
      <TransactieFormulier
        onOpslaan={vi.fn()}
        rekeningen={[{ id: 'r1', naam: 'Zicht', beginsaldo: 0 }]}
        categorieen={[]}
        handelaars={['Colruyt']}
      />,
    )
    await user.type(screen.getByLabelText('Handelaar / winkel'), 'Colruyt')
    expect(screen.queryByText('Vorige keer bij deze handelaar:')).not.toBeInTheDocument()
  })
})
