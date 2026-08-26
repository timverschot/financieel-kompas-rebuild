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

// ---------------------------------------------------------------------------
// Ronde 68 — elke mislukking zegt het.
//
// Deze kaart wiste het naamveld en sloot de bewerkrij vóór er iets geschreven was.
// Mislukte het wegschrijven (volle opslag, privémodus), dan was de ingetikte naam
// weg, stond er niemand bij, en zei niets iets.
// ---------------------------------------------------------------------------
describe('KinderenSectie — een mislukte opslag', () => {
  it('houdt de ingetikte naam vast en zegt wat er misging', async () => {
    const user = userEvent.setup()
    const onToevoegen = vi.fn().mockRejectedValue(new Error('QuotaExceededError'))
    toon({ onToevoegen })

    await user.type(screen.getByLabelText('Naam gezinslid'), 'Noor')
    await user.click(screen.getByRole('button', { name: 'Gezinslid toevoegen' }))

    expect(onToevoegen).toHaveBeenCalled()
    // De naam staat er nog…
    expect((screen.getByLabelText('Naam gezinslid') as HTMLInputElement).value).toBe('Noor')
    // …en er staat waarom er niets gebeurde, met de raad die bij een volle schijf hoort.
    expect(await screen.findByRole('alert')).toHaveTextContent('De opslag van dit toestel zit vol')
  })

  it('houdt de bewerkrij open wanneer hernoemen mislukt', async () => {
    const user = userEvent.setup()
    toon({ onWijzigen: vi.fn().mockRejectedValue(new Error('database geweigerd')) })

    await user.click(screen.getByRole('button', { name: 'Bewerk gezinslid Ella' }))
    const veld = screen.getByLabelText('Nieuwe naam voor Ella')
    await user.clear(veld)
    await user.type(veld, 'Elise')
    await user.click(screen.getByRole('button', { name: 'Bewaar' }))

    expect((screen.getByLabelText('Nieuwe naam voor Ella') as HTMLInputElement).value).toBe('Elise')
    expect(await screen.findByRole('alert')).toHaveTextContent('database geweigerd')
  })

  it('laat het bevestigingsvenster staan wanneer verwijderen mislukt', async () => {
    // ⚠ Het venster ging dicht vóór er iets gebeurd was. Je las hier net waar de naam
    // van je kind overal nog gebruikt wordt, drukte op "Ja, verwijder", zag het venster
    // wegvallen — en het lid stond er gewoon nog.
    const user = userEvent.setup()
    toon({ onVerwijderen: vi.fn().mockRejectedValue(new Error('geweigerd')) })

    await user.click(kruisje())
    await user.click(screen.getByRole('button', { name: 'Ja, verwijder' }))

    expect(screen.getByRole('button', { name: 'Ja, verwijder' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Dat is niet gelukt. Er is niets veranderd.')
  })
})

