import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RekeningFormulier } from './RekeningFormulier'

describe('RekeningFormulier — kredietrekening (ronde 38)', () => {
  it('toont de kredietvelden pas wanneer je het type krediet kiest', async () => {
    const gebruiker = userEvent.setup()
    render(<RekeningFormulier onOpslaan={vi.fn()} />)

    expect(screen.queryByLabelText('Kredietlimiet (€)')).not.toBeInTheDocument()
    await gebruiker.selectOptions(screen.getByLabelText('Type'), 'krediet')
    expect(screen.getByLabelText('Kredietlimiet (€)')).toBeInTheDocument()
    expect(screen.getByLabelText('Dag waarop de kaart wordt afgerekend')).toBeInTheDocument()
  })

  it('bewaart limiet en afrekendag bij een kredietrekening', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Visa')
    await gebruiker.selectOptions(screen.getByLabelText('Type'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Beginsaldo (€)'), '-120,50')
    await gebruiker.type(screen.getByLabelText('Kredietlimiet (€)'), '2500')
    await gebruiker.type(screen.getByLabelText('Dag waarop de kaart wordt afgerekend'), '15')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Visa', type: 'krediet', beginsaldo: -12050, kredietlimiet: 250000, afrekendag: 15 }),
    )
  })

  it('schrijft limiet en afrekendag NIET weg bij een gewone rekening', async () => {
    // Wissel je terug naar 'betaal', dan horen ze niet stilletjes te blijven staan.
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Zicht')
    await gebruiker.selectOptions(screen.getByLabelText('Type'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Kredietlimiet (€)'), '2500')
    await gebruiker.selectOptions(screen.getByLabelText('Type'), 'betaal')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    const opgeslagen = onOpslaan.mock.calls[0][0]
    expect(opgeslagen.kredietlimiet).toBeUndefined()
    expect(opgeslagen.afrekendag).toBeUndefined()
  })

  it('houdt het opslaan tegen bij een afrekendag buiten 1-28, met uitleg', async () => {
    // Stil laten vallen mocht niet: een rekening wordt bij het opslaan volledig
    // vervangen, dus een eerder bewaarde afrekendag zou zonder een woord verdwijnen.
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Visa')
    await gebruiker.selectOptions(screen.getByLabelText('Type'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Dag waarop de kaart wordt afgerekend'), '31')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(onOpslaan).not.toHaveBeenCalled()
    expect(screen.getByText('Kies een dag tussen 1 en 28, of laat het veld leeg.')).toBeInTheDocument()
  })

  it('houdt het opslaan tegen bij een ongeldige kredietlimiet, met uitleg', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Visa')
    await gebruiker.selectOptions(screen.getByLabelText('Type'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Kredietlimiet (€)'), '0')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(onOpslaan).not.toHaveBeenCalled()
    expect(screen.getByText('Geef een bedrag boven nul, of laat het veld leeg.')).toBeInTheDocument()
  })
})
