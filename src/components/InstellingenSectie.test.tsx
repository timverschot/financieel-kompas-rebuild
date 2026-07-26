import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { InstellingenSectie } from './InstellingenSectie'

function toon(props: Partial<ComponentProps<typeof InstellingenSectie>> = {}) {
  const handlers = {
    taal: 'nl' as const,
    zetTaal: vi.fn(),
    verbonden: false,
    bezig: false,
    statusTekst: null,
    onVerbind: vi.fn(),
    onSynchroniseer: vi.fn(),
    backupTekst: null,
    onExporteer: vi.fn(),
    onHerstel: vi.fn(),
    kinderen: [],
    onKindToevoegen: vi.fn(),
    onKindWijzigen: vi.fn(),
    onKindVerwijderen: vi.fn(),
    onBeginOpnieuw: vi.fn(async () => ({ backupGewist: true })),
    ...props,
  }
  render(<InstellingenSectie {...(handlers as ComponentProps<typeof InstellingenSectie>)} />)
  return handlers
}

describe('InstellingenSectie', () => {
  it('wijzigt de taal', async () => {
    const user = userEvent.setup()
    const { zetTaal } = toon()
    await user.selectOptions(screen.getByLabelText('Taal'), 'en')
    expect(zetTaal).toHaveBeenCalledWith('en')
  })

  it('toont "Verbind met Google Drive" wanneer niet verbonden', () => {
    toon({ verbonden: false })
    expect(screen.getByRole('button', { name: 'Verbind met Google Drive' })).toBeInTheDocument()
  })

  it('toont "Synchroniseer nu" wanneer verbonden', () => {
    toon({ verbonden: true })
    expect(screen.getByRole('button', { name: 'Synchroniseer nu' })).toBeInTheDocument()
  })

  it('exporteert een back-up bij klik', async () => {
    const user = userEvent.setup()
    const { onExporteer } = toon()
    await user.click(screen.getByRole('button', { name: 'Exporteer back-up' }))
    expect(onExporteer).toHaveBeenCalled()
  })
})

// "Begin opnieuw": alles wissen kan pas na een bevestiging waarin je het woord
// WISSEN typt. Zo kost één misklik je nooit je gegevens.
describe('InstellingenSectie — begin opnieuw', () => {
  async function openBevestiging(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Begin opnieuw…' }))
  }

  it('toont "Alles wissen" pas na een klik op "Begin opnieuw…"', async () => {
    const user = userEvent.setup()
    toon()
    expect(screen.queryByRole('button', { name: 'Alles wissen' })).not.toBeInTheDocument()

    await openBevestiging(user)
    expect(screen.getByRole('button', { name: 'Alles wissen' })).toBeInTheDocument()
    expect(screen.getByLabelText('Typ WISSEN om te bevestigen')).toBeInTheDocument()
  })

  it('houdt "Alles wissen" uit tot het bevestigwoord klopt', async () => {
    const user = userEvent.setup()
    toon()
    await openBevestiging(user)

    const knop = screen.getByRole('button', { name: 'Alles wissen' })
    const veld = screen.getByLabelText('Typ WISSEN om te bevestigen')
    expect(knop).toBeDisabled()

    await user.type(veld, 'wis')
    expect(knop).toBeDisabled()

    // Kleine letters en spaties eromheen mogen: we vergelijken na trim + hoofdletters.
    await user.clear(veld)
    await user.type(veld, ' wissen ')
    expect(knop).toBeEnabled()
  })

  it('wist alles na bevestigen en meldt de schone lei', async () => {
    const user = userEvent.setup()
    const { onBeginOpnieuw } = toon({ onBeginOpnieuw: vi.fn(async () => ({ backupGewist: true })) })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(onBeginOpnieuw).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Alles is gewist. Je begint met een schone lei.')).toBeInTheDocument()
    // De bevestiging klapt weer dicht.
    expect(screen.queryByRole('button', { name: 'Alles wissen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Begin opnieuw…' })).toBeInTheDocument()
  })

  it('waarschuwt wanneer de back-up niet opgeruimd raakte terwijl Drive verbonden is', async () => {
    const user = userEvent.setup()
    toon({ verbonden: true, onBeginOpnieuw: vi.fn(async () => ({ backupGewist: false, backupFout: 'offline' })) })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(
      await screen.findByText(
        'Lokaal is alles gewist, maar de back-up kon niet opgeruimd worden. Verbind opnieuw en probeer het nog eens, anders komt je oude data bij de volgende synchronisatie terug.',
      ),
    ).toBeInTheDocument()
  })

  it('meldt enkel dit toestel wanneer er geen Drive-back-up verbonden is', async () => {
    const user = userEvent.setup()
    toon({ verbonden: false, onBeginOpnieuw: vi.fn(async () => ({ backupGewist: false })) })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(await screen.findByText('Alles is gewist op dit toestel.')).toBeInTheDocument()
  })

  it('meldt dat er niets gewist is wanneer het misloopt', async () => {
    const user = userEvent.setup()
    toon({
      onBeginOpnieuw: vi.fn(async () => {
        throw new Error('stuk')
      }),
    })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(await screen.findByText('Wissen is mislukt. Er is niets gewist.')).toBeInTheDocument()
  })

  it('sluit de bevestiging met "Annuleer" zonder te wissen', async () => {
    const user = userEvent.setup()
    const { onBeginOpnieuw } = toon()
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Annuleer' }))

    expect(onBeginOpnieuw).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Alles wissen' })).not.toBeInTheDocument()

    // Opnieuw openen begint met een leeg veld.
    await openBevestiging(user)
    expect(screen.getByLabelText('Typ WISSEN om te bevestigen')).toHaveValue('')
  })
})
