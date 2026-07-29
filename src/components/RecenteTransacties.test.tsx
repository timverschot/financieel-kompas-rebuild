import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RecenteTransacties } from './RecenteTransacties'
import type { Transactie } from '../data/schema'

// Ronde 40: dit lijstje was een doodloper. Je zag "Colruyt € 43,20" staan, merkte
// dat er een categorie ontbrak, en moest dan via Transacties zelf teruggaan zoeken.

const tx = (over: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-07-05',
  omschrijving: 'Colruyt',
  bedrag: -4320,
  rekeningId: 'r1',
  ...over,
})

const lijst = [tx({ id: 'a' }), tx({ id: 'b', omschrijving: 'Delhaize', datum: '2026-07-04' })]

describe('RecenteTransacties', () => {
  it('toont de laatste boekingen met hun datum', () => {
    render(<RecenteTransacties transacties={lijst} categorieen={[]} onAlle={vi.fn()} />)
    expect(screen.getByText('Colruyt')).toBeInTheDocument()
    expect(screen.getByText('Delhaize')).toBeInTheDocument()
  })

  it('opent een boeking wanneer je erop klikt', async () => {
    const user = userEvent.setup()
    const onBewerk = vi.fn()
    render(<RecenteTransacties transacties={lijst} categorieen={[]} onAlle={vi.fn()} onBewerk={onBewerk} />)
    await user.click(screen.getByRole('button', { name: /^Bewerk Colruyt —/ }))
    expect(onBewerk).toHaveBeenCalledWith(lijst[0])
  })

  it('blijft een gewone lijst wanneer de app geen bewerken aanbiedt', () => {
    render(<RecenteTransacties transacties={lijst} categorieen={[]} onAlle={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Bewerk/ })).toBeNull()
    // De knop 'Alle' blijft wel bestaan.
    expect(screen.getByRole('button', { name: 'Alle' })).toBeInTheDocument()
  })

  it('zet datum en bedrag ín het label van de knop', async () => {
    // Een <button> biedt zijn inhoud niet apart aan hulpsoftware aan. Zonder de
    // datum en het bedrag in het label werd dit voor een schermlezer een lijst
    // namen zonder cijfers.
    const user = userEvent.setup()
    const onBewerk = vi.fn()
    render(<RecenteTransacties transacties={lijst} categorieen={[]} onAlle={vi.fn()} onBewerk={onBewerk} />)
    await user.click(screen.getByRole('button', { name: /^Bewerk Delhaize —/ }))
    expect(onBewerk).toHaveBeenCalledWith(lijst[1])
  })

  it('zegt het wanneer er nog niets geboekt is', () => {
    render(<RecenteTransacties transacties={[]} categorieen={[]} onAlle={vi.fn()} onBewerk={vi.fn()} />)
    expect(screen.getByText('Nog geen transacties.')).toBeInTheDocument()
  })
})
