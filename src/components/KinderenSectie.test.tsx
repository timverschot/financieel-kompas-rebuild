import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { Kind } from '../data/schema'
import { KinderenSectie } from './KinderenSectie'

// Er was voor deze kaart nog geen enkele test, terwijl er een kaal kruisje in
// stond dat een gezinslid meteen wiste (ronde 65). Deze ronde dekt precies dat:
// de vraag ervóór, wat ze telt, en de zachte weg ernaast.

const leden: Kind[] = [
  { id: 'k1', naam: 'Ella', rol: 'kind' },
  { id: 'k2', naam: 'Sam', rol: 'kind' },
]

function toon(extra: Partial<Parameters<typeof KinderenSectie>[0]> = {}) {
  const fns = {
    onToevoegen: vi.fn(),
    onWijzigen: vi.fn(),
    onVerwijderen: vi.fn(),
  }
  render(<KinderenSectie kinderen={leden} {...fns} {...extra} />)
  return fns
}

const kruisje = () => screen.getByRole('button', { name: 'Verwijder gezinslid Ella' })

describe('KinderenSectie — een gezinslid verwijderen', () => {
  it('wist niet meteen, maar vraagt eerst', async () => {
    const user = userEvent.setup()
    const fns = toon()
    await user.click(kruisje())
    expect(fns.onVerwijderen).not.toHaveBeenCalled()
    expect(await screen.findByText('Ella verwijderen?')).toBeInTheDocument()
  })

  it('toont waar de naam nog gebruikt wordt', async () => {
    const user = userEvent.setup()
    toon({ telGebruik: () => ['3 gedeelde kost(en) in een dossier', '1 afrekening(en)'] })
    await user.click(kruisje())
    expect(await screen.findByText('3 gedeelde kost(en) in een dossier')).toBeInTheDocument()
    expect(screen.getByText('1 afrekening(en)')).toBeInTheDocument()
  })

  it('vraagt het lid dat je aanwees, niet het eerste in de lijst', async () => {
    const user = userEvent.setup()
    const telGebruik = vi.fn(() => ['1 boeking(en)'])
    toon({ telGebruik })
    await user.click(screen.getByRole('button', { name: 'Verwijder gezinslid Sam' }))
    expect(await screen.findByText('Sam verwijderen?')).toBeInTheDocument()
    expect(telGebruik).toHaveBeenCalledWith('k2')
  })

  it('biedt archiveren als zachte weg, en archiveert dan ook echt', async () => {
    const user = userEvent.setup()
    const fns = toon()
    await user.click(kruisje())
    await user.click(await screen.findByRole('button', { name: 'Liever archiveren' }))
    expect(fns.onWijzigen).toHaveBeenCalledWith({ id: 'k1', naam: 'Ella', rol: 'kind', gearchiveerd: true })
    expect(fns.onVerwijderen).not.toHaveBeenCalled()
  })

  it('laat het lid staan wanneer je de vraag met nee beantwoordt', async () => {
    const user = userEvent.setup()
    const fns = toon()
    await user.click(kruisje())
    await user.click(await screen.findByRole('button', { name: 'Nee, behouden' }))
    expect(fns.onVerwijderen).not.toHaveBeenCalled()
    expect(fns.onWijzigen).not.toHaveBeenCalled()
  })

  it('verwijdert pas na "Ja, verwijder"', async () => {
    const user = userEvent.setup()
    const fns = toon()
    await user.click(kruisje())
    await user.click(await screen.findByRole('button', { name: 'Ja, verwijder' }))
    expect(fns.onVerwijderen).toHaveBeenCalledWith('k1')
  })
})
