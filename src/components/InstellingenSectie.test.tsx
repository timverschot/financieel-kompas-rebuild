import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { InstellingenSectie } from './InstellingenSectie'

function toon(props: Record<string, unknown> = {}) {
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
    ...props,
  }
  render(<InstellingenSectie {...(handlers as never)} />)
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
