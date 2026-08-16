import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GarantieSectie } from './GarantieSectie'
import type { Garantie, Transactie } from '../data/schema'

function toon(garanties: Garantie[] = [], props: Record<string, unknown> = {}, transacties: Transactie[] = []) {
  const handlers = { onOpslaan: vi.fn(), onVerwijderen: vi.fn(), ...props }
  render(<GarantieSectie garanties={garanties} transacties={transacties} {...handlers} />)
  return handlers
}

describe('GarantieSectie', () => {
  it('voegt een aankoop toe met de standaard garantieperiode van 24 maanden', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon()
    await user.type(screen.getByLabelText('Product'), 'Wasmachine')
    await user.click(screen.getByRole('button', { name: 'Garantie toevoegen' }))
    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ product: 'Wasmachine', garantieMaanden: 24 }),
    )
  })

  it('toont het product en de vervaldatum van een bestaande garantie', () => {
    const g: Garantie = { id: 'g1', product: 'Laptop', aankoopdatum: '2026-01-01', garantieMaanden: 24 }
    toon([g])
    expect(screen.getByText('Laptop')).toBeInTheDocument()
    // vervaldatum = aankoop + 24 maanden = 2028-01-01
    expect(screen.getByText(/2028-01-01/)).toBeInTheDocument()
  })

  // Ronde 36: `transactieId` bestond al en werd bewaard, maar stond nergens op het
  // scherm. Je kon dus niet zien óf, laat staan aan wélke betaling een
  // garantiebewijs hing.
  it('toont de boeking waaruit de aankoop komt', () => {
    const tx: Transactie = {
      id: 't1',
      datum: '2026-01-01',
      omschrijving: 'Media Markt',
      bedrag: -89900,
      rekeningId: 'r1',
    }
    const g: Garantie = {
      id: 'g1',
      product: 'Laptop',
      aankoopdatum: '2026-01-01',
      garantieMaanden: 24,
      transactieId: 't1',
    }
    toon([g], {}, [tx])
    expect(screen.getByText(/Uit je boeking van .*: Media Markt/)).toBeInTheDocument()
  })

  it('zwijgt wanneer de gekoppelde boeking intussen verwijderd is', () => {
    const g: Garantie = {
      id: 'g1',
      product: 'Laptop',
      aankoopdatum: '2026-01-01',
      garantieMaanden: 24,
      transactieId: 'weg',
    }
    toon([g], {}, [])
    expect(screen.queryByText(/Uit je boeking/)).toBeNull()
  })
})

// --- Ronde 48: de weg van een garantie naar haar boeking ------------------------

describe('GarantieSectie — doorklikken naar de boeking', () => {
  const tx: Transactie = {
    id: 'tx1',
    datum: '2026-01-01',
    omschrijving: 'Media Markt',
    bedrag: -89900,
    rekeningId: 'r1',
  }
  const g: Garantie = {
    id: 'g1',
    product: 'Laptop',
    aankoopdatum: '2026-01-01',
    garantieMaanden: 24,
    transactieId: 'tx1',
  }

  it('maakt van de gekoppelde boeking een knop zodra de app ze kan openen', async () => {
    const gebruiker = userEvent.setup()
    const onBewerkTransactie = vi.fn()
    toon([g], { onBewerkTransactie }, [tx])
    await gebruiker.click(await screen.findByRole('button', { name: /^Uit je boeking van/ }))
    expect(onBewerkTransactie).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx1' }))
  })

  it('laat het gewone tekst wanneer er geen bestemming is', () => {
    // Een knop die niets doet, is erger dan geen knop.
    toon([g], {}, [tx])
    expect(screen.queryByRole('button', { name: /^Uit je boeking van/ })).toBeNull()
    expect(screen.getByText(/Uit je boeking van/)).toBeInTheDocument()
  })
})
