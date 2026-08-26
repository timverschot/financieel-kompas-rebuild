import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RekeningFormulier } from './RekeningFormulier'

describe('RekeningFormulier — kredietrekening (ronde 38)', () => {
  it('toont de kredietvelden pas wanneer je het type krediet kiest', async () => {
    const gebruiker = userEvent.setup()
    render(<RekeningFormulier onOpslaan={vi.fn()} />)

    expect(screen.queryByLabelText('Kredietlimiet (€)')).not.toBeInTheDocument()
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    expect(screen.getByLabelText('Kredietlimiet (€)')).toBeInTheDocument()
    expect(screen.getByLabelText('Afsluitdag van de kaart')).toBeInTheDocument()
    expect(screen.getByLabelText('Dag waarop het bedrag afgeboekt wordt')).toBeInTheDocument()
  })

  it('bewaart limiet en afrekendag bij een kredietrekening', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Visa')
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    // Bij een kaart typ je wat er OPENSTAAT; de opslag houdt dat negatief.
    await gebruiker.type(screen.getByLabelText('Openstaand bij de start (€)'), '120,50')
    await gebruiker.type(screen.getByLabelText('Kredietlimiet (€)'), '2500')
    await gebruiker.type(screen.getByLabelText('Afsluitdag van de kaart'), '15')
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
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Kredietlimiet (€)'), '2500')
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'betaal')
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
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Afsluitdag van de kaart'), '31')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(onOpslaan).not.toHaveBeenCalled()
    expect(screen.getByText('Kies een dag tussen 1 en 28, of laat het veld leeg.')).toBeInTheDocument()
  })

  it('houdt het opslaan tegen bij een ongeldige kredietlimiet, met uitleg', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Visa')
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Kredietlimiet (€)'), '0')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(onOpslaan).not.toHaveBeenCalled()
    expect(screen.getByText('Geef een bedrag boven nul, of laat het veld leeg.')).toBeInTheDocument()
  })
})

describe('RekeningFormulier — het teken van een kaart (ronde 43)', () => {
  it('bewaart wat je als openstaand intikt als een schuld', async () => {
    // De fout die Timothy meldde: hij vulde 1000 in als "wat er nog openstaat", de
    // app las er "er staat 1000 op deze kaart" in, en zijn volledige limiet bleef
    // beschikbaar.
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Mastercard')
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Openstaand bij de start (€)'), '1000')
    await gebruiker.type(screen.getByLabelText('Kredietlimiet (€)'), '4000')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ beginsaldo: -100000, kredietlimiet: 400000 }),
    )
  })

  it('zet het bedrag bij het bewerken weer positief op het scherm', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <RekeningFormulier
        onOpslaan={onOpslaan}
        bewerken={{ id: 'k1', naam: 'Mastercard', type: 'krediet', beginsaldo: -100000 }}
      />,
    )

    expect(screen.getByLabelText('Openstaand bij de start (€)')).toHaveValue('1000,00')
    // En na een rondje bewerken staat er weer hetzelfde in de opslag.
    await gebruiker.click(screen.getByRole('button', { name: /bewaar|opslaan|wijzig/i }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ beginsaldo: -100000 }))
  })

  it('laat een gewone rekening ongemoeid', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Zicht')
    await gebruiker.type(screen.getByLabelText('Beginsaldo (€)'), '2000')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ beginsaldo: 200000 }))
  })

  it('bewaart de afboekdag en houdt een ongeldige tegen', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Visa')
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Dag waarop het bedrag afgeboekt wordt'), '31')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))
    expect(onOpslaan).not.toHaveBeenCalled()

    await gebruiker.clear(screen.getByLabelText('Dag waarop het bedrag afgeboekt wordt'))
    await gebruiker.type(screen.getByLabelText('Dag waarop het bedrag afgeboekt wordt'), '5')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ afboekdag: 5 }))
  })
})

describe('RekeningFormulier — van type wisselen (ronde 43)', () => {
  it('laat het bewaarde bedrag ongemoeid bij een typewissel', async () => {
    // Anders wordt een schuld van € 1.000 bij het bewaren een tegoed van € 1.000 en
    // springt het netto vermogen € 2.000 omhoog zonder één woord uitleg.
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <RekeningFormulier
        onOpslaan={onOpslaan}
        bewerken={{ id: 'k1', naam: 'Mastercard', type: 'krediet', beginsaldo: -100000 }}
      />,
    )

    expect(screen.getByLabelText('Openstaand bij de start (€)')).toHaveValue('1000,00')
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'betaal')
    expect(screen.getByLabelText('Beginsaldo (€)')).toHaveValue('-1000,00')
    await gebruiker.click(screen.getByRole('button', { name: /bewaar|opslaan|wijzig/i }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ beginsaldo: -100000, type: 'betaal' }))
  })

  it('zegt het wanneer er een tegoed in het veld staat', async () => {
    // Precies wat een kaart van vóór deze ronde toont: ze werd met een positief
    // saldo bewaard, dus op het scherm staat er nu een minteken.
    render(
      <RekeningFormulier
        onOpslaan={vi.fn()}
        bewerken={{ id: 'k1', naam: 'Mastercard', type: 'krediet', beginsaldo: 100000 }}
      />,
    )
    expect(screen.getByLabelText('Openstaand bij de start (€)')).toHaveValue('-1000,00')
    expect(screen.getByText(/Hier staat nu een tegoed, geen schuld/)).toBeInTheDocument()
  })

  it('maakt van een leeg of nul bedrag geen min-nul', async () => {
    const gebruiker = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<RekeningFormulier onOpslaan={onOpslaan} />)

    await gebruiker.type(screen.getByLabelText('Rekeningnaam'), 'Visa')
    await gebruiker.selectOptions(screen.getByLabelText('Soort'), 'krediet')
    await gebruiker.type(screen.getByLabelText('Openstaand bij de start (€)'), '0')
    await gebruiker.click(screen.getByRole('button', { name: /toevoegen/i }))

    expect(Object.is(onOpslaan.mock.calls[0][0].beginsaldo, 0)).toBe(true)
  })
})
