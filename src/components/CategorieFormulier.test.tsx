import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CategorieFormulier } from './CategorieFormulier'
import { CategorieSchema } from '../data/schema'

describe('CategorieFormulier', () => {
  it('slaat een categorie op zonder icoon en kleur (velden ontbreken dan)', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<CategorieFormulier onOpslaan={onOpslaan} />)

    await user.type(screen.getByLabelText('Naam hoofdcategorie'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Hoofdcategorie toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledTimes(1)
    const opgeslagen = onOpslaan.mock.calls[0][0]
    expect(opgeslagen.naam).toBe('Vervoer')
    // Geen lege strings in de database: de velden mogen er gewoon niet zijn.
    expect('icoon' in opgeslagen).toBe(false)
    expect('kleur' in opgeslagen).toBe(false)
    expect(CategorieSchema.safeParse(opgeslagen).success).toBe(true)
  })

  // Ronde 61. De opslaanknop stond op `disabled`, en dat haalt hem uit de
  // tab-volgorde: wie met een toetsenbord werkte, kwam hem nooit tegen en hoorde dus
  // ook nooit waarom er niets gebeurde. Bij dit formulier stond er zelfs niets op het
  // scherm — geen enkele aanwijzing dat er een naam ontbrak.
  it('houdt de knop bereikbaar en zegt wat er ontbreekt', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<CategorieFormulier onOpslaan={onOpslaan} />)

    const knop = screen.getByRole('button', { name: 'Hoofdcategorie toevoegen' })
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    expect(knop).not.toBeDisabled()

    // De knop wijst naar de regel die zegt wát er ontbreekt, zodat je die hoort zodra
    // je erop landt in plaats van alleen "niet-beschikbaar".
    const redenId = knop.getAttribute('aria-describedby') as string
    expect(document.getElementById(redenId)).toHaveTextContent('Geef een naam om op te slaan.')

    // En een klik doet niets zolang het formulier niet klopt.
    await user.click(knop)
    expect(onOpslaan).not.toHaveBeenCalled()

    // Zodra er een naam staat, verdwijnt de reden en werkt de knop.
    await user.type(screen.getByLabelText('Naam hoofdcategorie'), 'Vervoer')
    expect(screen.getByRole('button', { name: 'Hoofdcategorie toevoegen' })).toHaveAttribute('aria-disabled', 'false')
    expect(document.getElementById(redenId)).toHaveTextContent('')
  })

  it('slaat het gekozen icoon en de gekozen kleur mee op', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<CategorieFormulier onOpslaan={onOpslaan} />)

    await user.type(screen.getByLabelText('Naam hoofdcategorie'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Kies icoon Auto' }))
    await user.click(screen.getByRole('button', { name: 'Kies kleur Turkoois' }))
    await user.click(screen.getByRole('button', { name: 'Hoofdcategorie toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ naam: 'Vervoer', icoon: '🚗', kleur: '#0891B2' }),
    )
    expect(CategorieSchema.safeParse(onOpslaan.mock.calls[0][0]).success).toBe(true)
  })

  it('maakt zich leeg na een geslaagde opslag, ook het icoon en de kleur', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(<CategorieFormulier onOpslaan={onOpslaan} />)

    await user.type(screen.getByLabelText('Naam hoofdcategorie'), 'Vervoer')
    await user.click(screen.getByRole('button', { name: 'Kies icoon Auto' }))
    await user.click(screen.getByRole('button', { name: 'Kies kleur Turkoois' }))
    await user.click(screen.getByRole('button', { name: 'Hoofdcategorie toevoegen' }))

    await waitFor(() => expect(screen.getByLabelText('Naam hoofdcategorie')).toHaveValue(''))
    expect(screen.getByLabelText('Eigen teken')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Kies icoon Auto' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Kies kleur Turkoois' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('vult icoon en kleur in bij het bewerken van een bestaande categorie', () => {
    render(
      <CategorieFormulier
        onOpslaan={vi.fn()}
        onAnnuleer={vi.fn()}
        bewerken={{ id: 'c1', naam: 'Vervoer', icoon: '🚗', kleur: '#0891B2' }}
      />,
    )

    expect(screen.getByLabelText('Naam hoofdcategorie')).toHaveValue('Vervoer')
    expect(screen.getByLabelText('Eigen teken')).toHaveValue('🚗')
    expect(screen.getByRole('button', { name: 'Kies icoon Auto' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Kies kleur Turkoois' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('bewaart een gewijzigd icoon bij een bestaande categorie', async () => {
    const user = userEvent.setup()
    const onOpslaan = vi.fn()
    render(
      <CategorieFormulier onOpslaan={onOpslaan} bewerken={{ id: 'c1', naam: 'Vervoer', icoon: '🚗' }} />,
    )

    await user.click(screen.getByRole('button', { name: 'Kies icoon Fiets' }))
    await user.click(screen.getByRole('button', { name: 'Hoofdcategorie wijzigen' }))

    expect(onOpslaan).toHaveBeenCalledWith({ id: 'c1', naam: 'Vervoer', icoon: '🚲' })
  })
})
