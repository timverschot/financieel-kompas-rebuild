import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { Categorie } from '../data/schema'
import { CategorieSelect, STANDAARD_CATEGORIE_ID } from './CategorieSelect'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'

const eigen: Categorie[] = [{ id: 'eig-1', naam: 'Vakantiepot', icoon: '🏖️' }]

function toon(props: Partial<ComponentProps<typeof CategorieSelect>> = {}) {
  const onKies = vi.fn()
  render(<CategorieSelect id="proef" waarde={STANDAARD_CATEGORIE_ID} onKies={onKies} categorieen={[]} {...props} />)
  return { onKies }
}

describe('CategorieSelect', () => {
  it('biedt alle ingebouwde hoofdcategorieën aan', () => {
    toon()
    const veld = screen.getByRole('combobox') as HTMLSelectElement
    for (const h of INGEBOUWDE_CATEGORIEEN) {
      expect([...veld.options].some((o) => o.value === h.id)).toBe(true)
    }
  })

  it('biedt de eigen categorieën aan naast de ingebouwde', () => {
    toon({ categorieen: eigen })
    const veld = screen.getByRole('combobox') as HTMLSelectElement
    expect([...veld.options].some((o) => o.value === 'eig-1')).toBe(true)
    expect([...veld.options].some((o) => o.value === INGEBOUWDE_CATEGORIEEN[0].id)).toBe(true)
  })

  it('biedt de middenlaag (cat-*) NIET aan — die valt uit alle analyses', () => {
    toon()
    const veld = screen.getByRole('combobox') as HTMLSelectElement
    expect([...veld.options].some((o) => o.value.startsWith('cat-'))).toBe(false)
  })

  it('heeft standaard geen lege keuze', () => {
    toon()
    const veld = screen.getByRole('combobox') as HTMLSelectElement
    expect([...veld.options].some((o) => o.value === '')).toBe(false)
  })

  it('voegt op verzoek "Geen categorie" toe', () => {
    toon({ metGeenKeuze: true })
    expect(screen.getByRole('option', { name: 'Geen categorie' })).toBeInTheDocument()
  })

  it('meldt de gekozen categorie', async () => {
    const user = userEvent.setup()
    const { onKies } = toon({ categorieen: eigen })
    await user.selectOptions(screen.getByRole('combobox'), 'eig-1')
    expect(onKies).toHaveBeenCalledWith('eig-1')
  })
})
