import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'

beforeEach(async () => {
  await db.transacties.clear()
  await db.rekeningen.clear()
  await db.categorieen.clear()
  await db.budgetten.clear()
  await db.events.clear()
  await db.meta.clear()
})

// Zoekt het bedrag binnen de Saldo-regel, zodat het niet verwart met andere
// bedragen elders op het scherm (zoals het netto in het maandoverzicht).
function saldoRegel(): HTMLElement {
  return screen.getByText('Saldo').closest('p') as HTMLElement
}

describe('App', () => {
  it('laadt transacties en toont het juiste totaalsaldo (2400 - 950 - 320 = 1130)', async () => {
    render(<App />)
    await screen.findByText('Saldo')
    expect(saldoRegel()).toHaveTextContent(/1[.\s]?130/)
  })

  it('voegt een uitgave toe en verlaagt het saldo (1130 - 15 = 1115)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.type(screen.getByLabelText('Omschrijving'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(await screen.findByText('Boek')).toBeInTheDocument()
    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?115/))
  })

  it('verwijdert een transactie en past het saldo aan (na wissen van Boodschappen: 1450)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Boodschappen')

    await user.click(screen.getByRole('button', { name: 'Verwijder Boodschappen' }))

    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?450/))
    expect(screen.queryByText('Boodschappen')).toBeNull()
  })

  it('bewerkt een bestaande transactie en past het saldo aan (Huur 950 -> 1000: saldo 1080)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Huur')

    await user.click(screen.getByRole('button', { name: 'Bewerk Huur' }))
    const bedrag = screen.getByLabelText('Bedrag (€)')
    await user.clear(bedrag)
    await user.type(bedrag, '1000')
    await user.click(screen.getByRole('button', { name: 'Wijzigen' }))

    await waitFor(() => expect(saldoRegel()).toHaveTextContent(/1[.\s]?080/))
  })

  it('voegt een nieuwe rekening toe en maakt ze beschikbaar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.type(screen.getByLabelText('Rekeningnaam'), 'Spaarrekening')
    await user.type(screen.getByLabelText('Beginsaldo (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Rekening toevoegen' }))

    expect(await screen.findByRole('option', { name: 'Spaarrekening' })).toBeInTheDocument()
  })

  it('voegt een nieuwe categorie toe en maakt ze beschikbaar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.type(screen.getByLabelText('Categorienaam'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Categorie toevoegen' }))

    // 'Vervoer' verschijnt nu als keuze (in het transactie- én budgetformulier).
    expect((await screen.findAllByRole('option', { name: 'Vervoer' })).length).toBeGreaterThan(0)
  })

  it('toont een maandoverzicht met een netto-regel', async () => {
    render(<App />)
    expect(await screen.findByText('Netto')).toBeInTheDocument()
  })

  it('stelt een budget in en toont een voortgangsbalk voor de categorie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.selectOptions(screen.getByLabelText('Budgetcategorie'), 'cat-voeding')
    await user.type(screen.getByLabelText('Maandbudget (€)'), '400')
    await user.click(screen.getByRole('button', { name: 'Budget instellen' }))

    expect(await screen.findByRole('progressbar', { name: 'Voeding' })).toBeInTheDocument()
  })
})
