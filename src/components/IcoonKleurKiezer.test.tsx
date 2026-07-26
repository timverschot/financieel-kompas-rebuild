import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { IcoonKleurKiezer, ICOON_KEUZES, KLEUR_KEUZES, voorbeeldTeken } from './IcoonKleurKiezer'

// Kleine wikkel die de keuzes echt vasthoudt, zoals het formulier dat doet.
function Proef({ naam = 'Vervoer' }: { naam?: string }) {
  const [icoon, setIcoon] = useState<string | undefined>(undefined)
  const [kleur, setKleur] = useState<string | undefined>(undefined)
  return <IcoonKleurKiezer icoon={icoon} kleur={kleur} onIcoon={setIcoon} onKleur={setKleur} naam={naam} />
}

describe('IcoonKleurKiezer', () => {
  it('kiest een icoon en klikt het weer weg', async () => {
    const user = userEvent.setup()
    render(<Proef />)

    const auto = screen.getByRole('button', { name: 'Kies icoon Auto' })
    expect(auto).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Nog geen icoon gekozen.')).toBeInTheDocument()

    await user.click(auto)
    expect(auto).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Eigen teken')).toHaveValue('🚗')
    expect(screen.getByText('Gekozen icoon: Auto')).toBeInTheDocument()

    // Nog eens tikken = weer leeg.
    await user.click(auto)
    expect(auto).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('Eigen teken')).toHaveValue('')
    expect(screen.getByText('Nog geen icoon gekozen.')).toBeInTheDocument()
  })

  it('kiest een kleur en klikt ze weer weg', async () => {
    const user = userEvent.setup()
    render(<Proef />)

    const turkoois = screen.getByRole('button', { name: 'Kies kleur Turkoois' })
    expect(turkoois).toHaveAttribute('aria-pressed', 'false')

    await user.click(turkoois)
    expect(turkoois).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Gekozen kleur: Turkoois')).toBeInTheDocument()

    await user.click(turkoois)
    expect(turkoois).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByText('Nog geen kleur gekozen — de grafiek gebruikt dan haar standaardkleur.'),
    ).toBeInTheDocument()
  })

  it('aanvaardt een eigen teken van hoogstens 8 tekens', async () => {
    const user = userEvent.setup()
    render(<Proef />)

    const veld = screen.getByLabelText('Eigen teken')
    await user.type(veld, '★')
    expect(veld).toHaveValue('★')
    expect(veld).toHaveAttribute('maxLength', '8')
  })

  it('toont de twaalf kleuren van de ingebouwde hoofdcategorieën, elk maar één keer', () => {
    render(<Proef />)
    expect(KLEUR_KEUZES).toHaveLength(12)
    expect(new Set(KLEUR_KEUZES.map((k) => k.kleur)).size).toBe(12)
    expect(KLEUR_KEUZES.every((k) => /^#[0-9A-Fa-f]{6}$/.test(k.kleur))).toBe(true)
    expect(new Set(ICOON_KEUZES.map((i) => i.icoon)).size).toBe(ICOON_KEUZES.length)
  })

  it('valt in het voorbeeld terug op de beginletter van de naam', () => {
    expect(voorbeeldTeken(undefined, 'Vervoer')).toBe('V')
    expect(voorbeeldTeken('🚗', 'Vervoer')).toBe('🚗')
    expect(voorbeeldTeken(undefined, '')).toBe('?')
  })
})
