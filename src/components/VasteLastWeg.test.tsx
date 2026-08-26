import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VasteLastWeg } from './VasteLastWeg'
import type { TerugkerendePost } from '../data/schema'

const water: TerugkerendePost = { id: 'p1', omschrijving: 'Water', bedrag: -3000, rekeningId: 'r1', dag: 5 }

function toon(over: Partial<Parameters<typeof VasteLastWeg>[0]> = {}) {
  const onVerwijderen = vi.fn()
  const onSluiten = vi.fn()
  const onOpzeggen = vi.fn()
  render(
    <VasteLastWeg
      post={water}
      onSluiten={onSluiten}
      onVerwijderen={onVerwijderen}
      onOpzeggen={onOpzeggen}
      telGebruik={() => [{ kop: '2 boekingen', uitleg: 'Ze blijven staan.' }]}
      {...over}
    />,
  )
  return { onVerwijderen, onSluiten, onOpzeggen }
}

describe('VasteLastWeg', () => {
  it('noemt de post bij naam in de titel', () => {
    toon()
    expect(screen.getByRole('heading', { name: /^Water verwijderen\?/ })).toBeInTheDocument()
  })

  it('toont niets wanneer er geen post is', () => {
    toon({ post: null })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toont de regels van de telfunctie, met een kop erboven', () => {
    toon()
    expect(screen.getByText('Hier hangt nog dit aan:')).toBeInTheDocument()
    expect(screen.getByText('2 boekingen')).toBeInTheDocument()
    expect(screen.getByText('Ze blijven staan.')).toBeInTheDocument()
  })

  it('laat de kop weg wanneer de telfunctie niets vindt', () => {
    // ⚠ Anders leest het scherm "Hier hangt nog dit aan: • er hangt niets aan".
    toon({ telGebruik: () => [] })
    expect(screen.queryByText('Hier hangt nog dit aan:')).not.toBeInTheDocument()
    expect(screen.getByText('Er hangt niets aan deze vaste last.')).toBeInTheDocument()
  })

  it('beweert NIETS wanneer het niet kan nakijken', () => {
    // ⚠ Niet weten en niets vinden zijn twee verschillende dingen (ronde 65).
    toon({ telGebruik: undefined })
    expect(screen.queryByText('Er hangt niets aan deze vaste last.')).not.toBeInTheDocument()
    expect(screen.getByText('De app kan hier niet nakijken wat er aan deze vaste last hangt.')).toBeInTheDocument()
  })

  it('verwijdert pas na "Ja, verwijder", en sluit dan', async () => {
    const { onVerwijderen, onSluiten } = toon()
    await userEvent.click(screen.getByRole('button', { name: 'Ja, verwijder' }))
    expect(onVerwijderen).toHaveBeenCalledWith('p1')
    expect(onSluiten).toHaveBeenCalled()
  })

  it('verwijdert NIETS bij "Nee, behouden"', async () => {
    const { onVerwijderen, onSluiten } = toon()
    await userEvent.click(screen.getByRole('button', { name: 'Nee, behouden' }))
    expect(onVerwijderen).not.toHaveBeenCalled()
    expect(onSluiten).toHaveBeenCalled()
  })

  it('houdt het venster OPEN wanneer het wegschrijven mislukt, en zegt het', async () => {
    // ⚠ Dezelfde fout als in ronde 68: het venster viel weg en het record stond er nog.
    const onSluiten = vi.fn()
    render(
      <VasteLastWeg
        post={water}
        onSluiten={onSluiten}
        onVerwijderen={() => {
          throw new Error('schijf vol')
        }}
        telGebruik={() => []}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ja, verwijder' }))
    expect(onSluiten).not.toHaveBeenCalled()
    expect(screen.getByText(/Dat is niet gelukt/)).toBeInTheDocument()
  })

  it('biedt de zachte weg aan: opzeggen in plaats van verwijderen', async () => {
    const { onOpzeggen, onVerwijderen } = toon()
    await userEvent.click(screen.getByRole('button', { name: 'Liever opzeggen' }))
    expect(onOpzeggen).toHaveBeenCalledWith(water)
    expect(onVerwijderen).not.toHaveBeenCalled()
  })

  it('biedt opzeggen NIET aan wanneer de post al een einddatum heeft', () => {
    // Een knop die je naar een veld stuurt dat je zelf al invulde, doet niets.
    toon({ post: { ...water, eindMaand: '2026-09' } })
    expect(screen.queryByRole('button', { name: 'Liever opzeggen' })).not.toBeInTheDocument()
    // En ook de zin niet: die zachte weg is hier al genomen.
    expect(screen.queryByText(/Loopt tot en met/)).not.toBeInTheDocument()
  })

  it('biedt de KNOP niet aan zonder handler, maar houdt de ZIN', () => {
    // ⚠ De zin en de knop deelden eerst één voorwaarde, en dan verdween de hele zachte
    // weg uit beeld zodra het scherm de knop niet kon aanbieden — terwijl opzeggen
    // gewoon mogelijk blijft.
    toon({ onOpzeggen: undefined })
    expect(screen.queryByRole('button', { name: 'Liever opzeggen' })).not.toBeInTheDocument()
    expect(screen.getByText(/Loopt tot en met/)).toBeInTheDocument()
  })

  it('zegt dat de ingevulde maand de LAATSTE keer is, niet de eerste die wegvalt', () => {
    // ⚠ Het veld heet "Loopt tot en met": de maand die je invult telt nog wél mee. Het
    // formulier zegt het al zo ("De laatste keer is …"); twee schermen over hetzelfde
    // veld horen niet iets anders te zeggen.
    toon()
    expect(screen.getByText(/de laatste keer dat hij meetelt/)).toBeInTheDocument()
  })

  it('belooft dat ongedaan maken de koppelingen terugzet', () => {
    toon()
    expect(screen.getByText(/mét al deze koppelingen/)).toBeInTheDocument()
  })
})
