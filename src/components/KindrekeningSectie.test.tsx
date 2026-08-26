import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { KindrekeningSectie } from './KindrekeningSectie'
import { indexcijfer, laatsteIndexmaand } from '../data/indexreeksen'
import type { Dossier, Kindrekening, Kindrekeningpost } from '../data/schema'

const dossier: Dossier = { id: 'd1', naam: 'Co-ouderschap', aandeelJij: 52 }

function toon(kindrekening: Kindrekening | null, posten: Kindrekeningpost[] = [], props: Record<string, unknown> = {}) {
  const handlers = {
    onOpslaan: vi.fn(),
    onVerwijderen: vi.fn(),
    onPostOpslaan: vi.fn(),
    onPostVerwijderen: vi.fn(),
    ...props,
  }
  render(
    <KindrekeningSectie
      dossier={dossier}
      kindrekening={kindrekening}
      posten={posten}
      kinderen={[]}
      categorieen={[]}
      {...handlers}
    />,
  )
  return handlers
}

describe('KindrekeningSectie', () => {
  it('zet een kindrekening aan voor het dossier', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon(null)
    await user.click(screen.getByRole('button', { name: 'Kindrekening aanzetten' }))
    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ dossierId: 'd1', beginsaldo: 0 }))
  })

  it('toont het saldo van de pot bij een bestaande kindrekening', () => {
    const kr: Kindrekening = { id: 'kr1', dossierId: 'd1', naam: 'Pot', beginsaldo: 5000 }
    const posten: Kindrekeningpost[] = [
      { id: 's1', kindrekeningId: 'kr1', datum: '2026-01-05', soort: 'storting', bedrag: 10000, door: 'jij' },
      { id: 'u1', kindrekeningId: 'kr1', datum: '2026-01-10', soort: 'uitgave', bedrag: 3000 },
    ]
    toon(kr, posten)
    // 5000 + 10000 − 3000 = 12000 centen = € 120,00
    expect(screen.getByText(/Saldo van de pot/)).toBeInTheDocument()
    expect(screen.getByText(/120,00/)).toBeInTheDocument()
  })

  // Probleem 3: de huidige index werd met terugwerkende kracht op alle voorbije
  // maanden toegepast, waardoor de achterstand structureel te hoog was.
  it('past de indexatie niet met terugwerkende kracht toe in de achterstand', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 10)) // 10 maart 2026
    try {
      const kr: Kindrekening = {
        id: 'kr1',
        dossierId: 'd1',
        naam: 'Pot',
        beginsaldo: 0,
        maandbijdrageJij: 20000, // € 200 basis, geïndexeerd € 220
        bijdrageStart: '2026-01-01',
        aanvangsindex: 100,
        huidigeIndex: 110,
      }
      toon(kr, [])
      // 3 termijnen: jan + feb aan € 200, maart aan € 220 = € 620 verwacht.
      expect(screen.getByText(/620,00/)).toBeInTheDocument()
      // Niet 3 × € 220 = € 660.
      expect(screen.queryByText(/660,00/)).not.toBeInTheDocument()
      // En het scherm legt uit hoe er geteld wordt.
      expect(screen.getByText(/niet-geïndexeerde bijdrage/)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('voegt een storting toe via het formulier', async () => {
    const user = userEvent.setup()
    const kr: Kindrekening = { id: 'kr1', dossierId: 'd1', naam: 'Pot', beginsaldo: 0 }
    const { onPostOpslaan } = toon(kr, [])
    await user.type(screen.getByLabelText('Bedrag (€)'), '50')
    await user.click(screen.getByRole('button', { name: 'Beweging toevoegen' }))
    expect(onPostOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ kindrekeningId: 'kr1', soort: 'storting', bedrag: 5000, door: 'jij' }),
    )
  })
})

// Ronde 65: deze twee velden slikten élk getal, terwijl de onderhoudsbijdrage één
// kaart hoger hetzelfde soort getal tegen reeks, basisjaar en een marge van tien
// procent houdt.
describe('KindrekeningSectie — de indexcijfers', () => {
  const kr: Kindrekening = { id: 'kr1', dossierId: 'd1', naam: 'Pot', beginsaldo: 0 }

  async function openAfspraak(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Maandbijdrage-afspraak instellen' }))
  }

  it('waarschuwt over basisjaren, net als bij de onderhoudsbijdrage', async () => {
    const user = userEvent.setup()
    toon(kr)
    await openAfspraak(user)
    expect(screen.getByText(/basis .* = 100/)).toBeInTheDocument()
  })

  it('merkt een huidige index uit een ander basisjaar op, maar houdt niets tegen', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon(kr)
    await openAfspraak(user)
    // Statbel publiceert sinds 2026 standaard in basis 2025 = 100; de app rekent in
    // basis 2013 = 100. Dit is het cijfer dat je vandaag opzoekt en overtikt.
    await user.type(screen.getByLabelText('Aanvangsindex (optioneel)'), '110')
    await user.type(screen.getByLabelText('Huidige index (optioneel)'), '103,60')

    // ⚠ Een OPMERKING, geen weigering: een paar dat volledig in basis 2025 staat is
    // even juist, en wie zijn eigen afspraak van jaren geleden niet meer kan
    // bewaren, is slechter af dan wie een waarschuwing leest.
    expect(screen.getByText(/Ter controle/)).toHaveTextContent('2025 = 100')
    await user.click(screen.getByRole('button', { name: 'Afspraak bewaren' }))
    expect(onOpslaan).toHaveBeenCalled()
  })

  it('zwijgt over een huidig cijfer dat gewoon bij de tabel van de app past', async () => {
    const user = userEvent.setup()
    toon(kr)
    await openAfspraak(user)
    const nu = indexcijfer(undefined, laatsteIndexmaand(undefined)) as number
    await user.type(screen.getByLabelText('Huidige index (optioneel)'), String(nu).replace('.', ','))
    expect(screen.queryByText(/Ter controle/)).toBeNull()
  })

  it('weigert onleesbare invoer in plaats van ze stil weg te gooien', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon(kr)
    await openAfspraak(user)
    await user.type(screen.getByLabelText('Aanvangsindex (optioneel)'), 'honderd')
    await user.click(screen.getByRole('button', { name: 'Afspraak bewaren' }))

    expect(screen.getByRole('alert')).toHaveTextContent('geen indexcijfer')
    expect(onOpslaan).not.toHaveBeenCalled()
  })

  it('vraagt allebei de cijfers wanneer je er maar één invult', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon(kr)
    await openAfspraak(user)
    await user.type(screen.getByLabelText('Aanvangsindex (optioneel)'), '110')
    await user.click(screen.getByRole('button', { name: 'Afspraak bewaren' }))

    expect(screen.getByRole('alert')).toHaveTextContent('allebei de cijfers')
    expect(onOpslaan).not.toHaveBeenCalled()
  })

  it('bewaart twee geldige cijfers gewoon', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon(kr)
    await openAfspraak(user)
    const nu = indexcijfer(undefined, laatsteIndexmaand(undefined)) as number
    await user.type(screen.getByLabelText('Aanvangsindex (optioneel)'), '110')
    await user.type(screen.getByLabelText('Huidige index (optioneel)'), String(nu).replace('.', ','))
    await user.click(screen.getByRole('button', { name: 'Afspraak bewaren' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ aanvangsindex: 110, huidigeIndex: nu }),
    )
  })

  it('bewaart zonder index wanneer je beide velden leeg laat', async () => {
    const user = userEvent.setup()
    const { onOpslaan } = toon(kr)
    await openAfspraak(user)
    await user.type(screen.getByLabelText('Bijdrage jij (€/maand)'), '200')
    await user.click(screen.getByRole('button', { name: 'Afspraak bewaren' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ maandbijdrageJij: 20000, aanvangsindex: undefined, huidigeIndex: undefined }),
    )
  })
})
