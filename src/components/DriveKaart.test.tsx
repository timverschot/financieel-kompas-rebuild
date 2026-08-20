import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DriveKaart } from './DriveKaart'

const basis = {
  bezig: false,
  onVerbind: vi.fn(),
  onSynchroniseer: vi.fn(),
}

describe('DriveKaart', () => {
  it('zegt dat je niet verbonden bent, en biedt de verbinding aan', () => {
    render(<DriveKaart {...basis} verbonden={false} />)
    expect(screen.getByText('Niet verbonden. Je gegevens staan alleen in deze browser, op dit toestel.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verbind met Google Drive' })).toBeInTheDocument()
  })

  // ⚠ Verbonden zijn is geen bewijs dat er iets aankwam (nakijkronde ronde 63).
  it('zegt het eerlijk wanneer er nog niets naar Drive ging', () => {
    render(<DriveKaart {...basis} verbonden />)
    expect(screen.getByText('Verbonden, maar er ging nog niets naar Drive.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Synchroniseer nu' })).toBeInTheDocument()
  })

  it('toont de dag van de laatste geslaagde synchronisatie', () => {
    render(<DriveKaart {...basis} verbonden laatsteSyncOp="2026-06-04" />)
    expect(screen.getByText(/Laatste synchronisatie:/)).toHaveTextContent('2026')
  })

  // Precies het geval dat het belletje meldt: de schakelaar staat aan, maar er
  // vertrok al maanden niets. De kaart mag dat dan niet tegenspreken.
  it('belooft niets wanneer de laatste synchronisatie lang geleden is', () => {
    render(<DriveKaart {...basis} verbonden laatsteSyncOp="2025-01-01" />)
    expect(screen.queryByText(/dat is meteen je back-up/)).not.toBeInTheDocument()
    expect(screen.getByText(/Laatste synchronisatie:/)).toHaveTextContent('2025')
  })

  it('zet ook de synchroniseerknop uit terwijl de app bezig is', () => {
    render(<DriveKaart {...basis} bezig verbonden />)
    expect(screen.getByRole('button', { name: 'Bezig…' })).toBeDisabled()
  })

  // ⚠ De combinatie die de eerste versie miste: je bent NIET verbonden, maar er is
  // ooit gesynchroniseerd. Toen won de datum en las je alleen "Laatste
  // synchronisatie: 4 jun 2026" — geen woord over het feit dat er nu niets vertrekt.
  it('zegt dat je niet verbonden bent, ook wanneer er ooit gesynchroniseerd is', () => {
    render(<DriveKaart {...basis} verbonden={false} laatsteSyncOp="2026-06-04" />)
    expect(screen.getByText(/^Niet verbonden\./)).toHaveTextContent('2026')
    expect(screen.getByRole('button', { name: 'Verbind met Google Drive' })).toBeInTheDocument()
  })

  it('verbindt op de knop', async () => {
    const user = userEvent.setup()
    const onVerbind = vi.fn()
    render(<DriveKaart {...basis} onVerbind={onVerbind} verbonden={false} />)
    await user.click(screen.getByRole('button', { name: 'Verbind met Google Drive' }))
    expect(onVerbind).toHaveBeenCalledTimes(1)
  })

  // De knop staat uit omdat de APP bezig is, niet omdat jouw invoer onvolledig is
  // — dan hoort `disabled` (huisregel sinds ronde 41).
  it('zet de knop uit terwijl er gesynchroniseerd wordt', () => {
    render(<DriveKaart {...basis} bezig verbonden={false} />)
    expect(screen.getByRole('button', { name: 'Bezig…' })).toBeDisabled()
  })
})
