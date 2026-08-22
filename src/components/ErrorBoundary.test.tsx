import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { TaalProvider, useT, vertaalSleutels } from '../i18n'
import { zetOpmaaktaal } from '../utils/opmaaktaal'

// Het schermpje dat verschijnt wanneer één onderdeel vastloopt.
//
// ⚠ RONDE 66, slotronde. De naam van het onderdeel ging hier RAUW in de zin. Die
// zin werd keurig vertaald, maar het woord erin bleef in elke taal Nederlands: een
// Franstalige las "Er ging iets mis in Instellingen" met de rest in het Frans.

function Knalt(): never {
  throw new Error('kapot')
}

function Taalknop() {
  const { zetTaal } = useT()
  return (
    <button type="button" onClick={() => zetTaal('fr')}>
      Frans
    </button>
  )
}

// React schrijft een gevangen fout altijd naar de console; die ruis hoort niet in
// de testuitvoer thuis en zegt niets over het gedrag dat we hier toetsen.
let stil: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  stil = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  stil.mockRestore()
  // `opmaaktaal` is modulestaat: laat je ze op Frans staan, dan lekt dat naar de
  // volgende test. Dezelfde afspraak als in i18nOpmaak.test.tsx.
  zetOpmaaktaal('nl')
})

describe('ErrorBoundary', () => {
  it('noemt het onderdeel in de taal van de gebruiker', async () => {
    const gebruiker = userEvent.setup()
    render(
      <TaalProvider>
        <Taalknop />
        <ErrorBoundary naam="Instellingen">
          <Knalt />
        </ErrorBoundary>
      </TaalProvider>,
    )
    expect(screen.getByRole('alert').textContent).toContain('Instellingen')

    await gebruiker.click(screen.getByRole('button', { name: 'Frans' }))
    const tekst = screen.getByRole('alert').textContent ?? ''
    expect(tekst).toContain('Paramètres')
    expect(tekst).not.toContain('Instellingen')
  })

  it('valt terug op het Nederlands voor een naam zonder vertaling', async () => {
    const gebruiker = userEvent.setup()
    render(
      <TaalProvider>
        <Taalknop />
        <ErrorBoundary naam="Zelfverzonnen onderdeel">
          <Knalt />
        </ErrorBoundary>
      </TaalProvider>,
    )
    await gebruiker.click(screen.getByRole('button', { name: 'Frans' }))
    // Geen lege plek en geen sleutel-achtige tekst: gewoon de naam zoals hij is.
    expect(screen.getByRole('alert').textContent).toContain('Zelfverzonnen onderdeel')
  })
})

// --- Het vangnet dat ontbrak ---
//
// ⚠ `naam="Instellingen"` is een JSX-attribuut, geen `t('…')`-letterlijke. Geen
// enkele bestaande test zag het daarom: i18nDekking.test.ts leest alleen `t('…')`,
// woordenschat.test.ts alleen de tabel, en i18n.test.ts alleen de gelijkheid van
// en en fr. Haalde je een naam uit de tabellen, dan bleef alles groen en las een
// Franstalige bij een crash weer Nederlands. Deze test sluit dat gat.
describe('ErrorBoundary — elke naam die de app meegeeft, is vertaald', () => {
  const bron = Object.entries(
    import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  )

  it('vindt de bron van de namen', () => {
    expect(bron).toHaveLength(1)
    expect(namen().length).toBeGreaterThan(10)
  })

  function namen(): string[] {
    const inhoud = bron[0]?.[1] ?? ''
    return [...new Set([...inhoud.matchAll(/<ErrorBoundary\s+naam="([^"]+)"/g)].map((m) => m[1]))]
  }

  it('staat in beide vertaaltabellen', () => {
    const en = new Set(vertaalSleutels('en'))
    const fr = new Set(vertaalSleutels('fr'))
    const ontbreekt = namen().filter((n) => !en.has(n) || !fr.has(n))
    expect(ontbreekt).toEqual([])
  })
})

// --- Het geval waar geen enkele test naar keek ---
describe('ErrorBoundary — zonder TaalProvider erboven', () => {
  it('vertaalt tóch, want zo staat ze in main.tsx', () => {
    // ⚠ Dit is de zwaarste crash die bestaat: de hele app valt weg, inclusief de
    // vertaalcontext. Het vangnet staat daarom buitenom — en moet zijn taal dus
    // ergens anders halen dan uit die context.
    zetOpmaaktaal('fr')
    render(
      <ErrorBoundary naam="Instellingen">
        <Knalt />
      </ErrorBoundary>,
    )
    const tekst = screen.getByRole('alert').textContent ?? ''
    expect(tekst).toContain('Paramètres')
    expect(tekst).toContain('tes données sont en sécurité')
  })
})
