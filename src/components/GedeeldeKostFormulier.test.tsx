import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import type { GedeeldeKost, Kind } from '../data/schema'

const kinderen: Kind[] = [
  { id: 'k1', naam: 'Kind 1' },
  { id: 'k2', naam: 'Kind 2', gearchiveerd: true },
]

function toon(kinderenLijst: Kind[] = kinderen, bewerken: GedeeldeKost | null = null) {
  const onOpslaan = vi.fn()
  render(
    <GedeeldeKostFormulier
      dossierId="d1"
      kinderen={kinderenLijst}
      categorieen={[]}
      onOpslaan={onOpslaan}
      bewerken={bewerken}
    />,
  )
  return onOpslaan
}

describe('GedeeldeKostFormulier', () => {
  it('bewaart het gekozen gezinslid in kindIds', async () => {
    const user = userEvent.setup()
    const onOpslaan = toon()

    await user.type(screen.getByLabelText('Kostomschrijving'), 'Schoolreis')
    await user.type(screen.getByLabelText('Kostbedrag (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Kind 1' }))
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ omschrijving: 'Schoolreis', bedrag: 10000, kindIds: ['k1'] }),
    )
  })

  it('toont gearchiveerde gezinsleden niet, tenzij ze al gekoppeld zijn', async () => {
    toon()
    expect(screen.getByRole('button', { name: 'Kind 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kind 2' })).toBeNull()
  })

  it('houdt een al gekoppeld, intussen gearchiveerd gezinslid zichtbaar bij bewerken', () => {
    const kost: GedeeldeKost = {
      id: 'kost1',
      dossierId: 'd1',
      omschrijving: 'Turnpak',
      bedrag: 4000,
      betaaldDoor: 'jij',
      datum: '2026-03-01',
      kostenType: 'gewoon',
      kindIds: ['k2'],
    }
    toon(kinderen, kost)
    const chip = screen.getByRole('button', { name: 'Kind 2' })
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('laat het label weg wanneer er geen gezinsleden zijn', () => {
    toon([])
    expect(screen.queryByText('Voor wie? (optioneel)')).toBeNull()
  })

  // --- Ronde 36: gewoon versus buitengewoon, volgens de indicatieve lijst uit het
  // KB van 22 april 2019. Een VOORSTEL, nooit een automatisme. ---

  it('stelt buitengewoon voor zodra je een categorie uit de KB-lijst kiest', async () => {
    const user = userEvent.setup()
    toon()

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'Orthodontie')
    await user.click(await screen.findByRole('option', { name: /Orthodontie/ }))

    expect(screen.getByLabelText('Soort kost')).toHaveValue('buitengewoon')
    expect(screen.getByText(/Medische en paramedische kosten/)).toBeInTheDocument()
    expect(screen.getByText(/KB van 22 april 2019/)).toBeInTheDocument()
  })

  it('laat je het voorstel overrulen en houdt die keuze vast', async () => {
    const user = userEvent.setup()
    const onOpslaan = toon()

    await user.type(screen.getByLabelText('Zoek categorie of item'), 'Orthodontie')
    await user.click(await screen.findByRole('option', { name: /Orthodontie/ }))

    await user.selectOptions(screen.getByLabelText('Soort kost'), 'gewoon')
    expect(screen.getByText(/Je koos zelf/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Kostomschrijving'), 'Beugel')
    await user.type(screen.getByLabelText('Kostbedrag (€)'), '250')
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ kostenType: 'gewoon' }))
  })

  it('overschrijft de soort van een bestaande kost niet met het voorstel', () => {
    const kost: GedeeldeKost = {
      id: 'kost2',
      dossierId: 'd1',
      omschrijving: 'Tandarts',
      bedrag: 5000,
      betaaldDoor: 'jij',
      datum: '2026-03-01',
      kostenType: 'gewoon',
      categorieId: 'cat-x-tandzorg',
    }
    toon(kinderen, kost)
    // Het voorstel zegt 'buitengewoon', maar deze kost draagt al een keuze.
    expect(screen.getByLabelText('Soort kost')).toHaveValue('gewoon')
    expect(screen.getByText(/Je koos zelf/)).toBeInTheDocument()
  })
})
