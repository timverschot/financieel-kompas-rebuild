import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './App'
import { db } from './data/db'

beforeEach(async () => {
  await db.transacties.clear()
  await db.rekeningen.clear()
  await db.categorieen.clear()
  await db.events.clear()
  await db.meta.clear()
})

describe('App', () => {
  it('laadt transacties uit de database en toont het juiste saldo (2400 - 950 - 320 = 1130)', async () => {
    render(<App />)
    expect(await screen.findByText('Saldo')).toBeInTheDocument()
    expect(await screen.findByText(/1[.\s]?130/)).toBeInTheDocument()
  })

  it('voegt een uitgave toe en verlaagt het saldo (1130 - 15 = 1115)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Saldo')

    await user.type(screen.getByLabelText('Omschrijving'), 'Boek')
    await user.type(screen.getByLabelText('Bedrag (€)'), '15')
    await user.click(screen.getByRole('button', { name: 'Toevoegen' }))

    expect(await screen.findByText('Boek')).toBeInTheDocument()
    expect(await screen.findByText(/1[.\s]?115/)).toBeInTheDocument()
  })

  it('verwijdert een transactie en past het saldo aan (na wissen van Boodschappen: 1450)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Boodschappen')

    await user.click(screen.getByRole('button', { name: 'Verwijder Boodschappen' }))

    expect(await screen.findByText(/1[.\s]?450/)).toBeInTheDocument()
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

    expect(await screen.findByText(/1[.\s]?080/)).toBeInTheDocument()
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

    expect(await screen.findByRole('option', { name: 'Vervoer' })).toBeInTheDocument()
  })
})
