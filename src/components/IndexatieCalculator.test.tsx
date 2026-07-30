import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { IndexatieCalculator } from './IndexatieCalculator'
import type { Dossier } from '../data/schema'

describe('IndexatieCalculator', () => {
  it('berekent het geïndexeerde bedrag live (500, 100, 110 -> 550)', async () => {
    const user = userEvent.setup()
    render(<IndexatieCalculator />)

    await user.type(screen.getByLabelText('Basisbedrag (€)'), '500')
    await user.type(screen.getByLabelText('Aanvangsindex'), '100')
    await user.type(screen.getByLabelText('Nieuwe index'), '110')

    expect(await screen.findByText(/Geïndexeerd bedrag:/)).toHaveTextContent(/550/)
  })

  // Ronde 32: de kaarttitel wisselde mee met de gekozen tab ("Huurindexatie" /
  // "Alimentatie-indexatie"), terwijl die tabs er vlak onder al staan. De kop
  // herhaalde dus wat je zelf net had aangeklikt.
  it('houdt één vaste titel en laat de tabs het verschil maken', async () => {
    const user = userEvent.setup()
    render(<IndexatieCalculator />)

    expect(screen.getByText('Indexatie-tools')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alimentatie' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Huur' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Huur' }))
    expect(screen.getByText('Indexatie-tools')).toBeInTheDocument()
    expect(screen.queryByText('Huurindexatie')).toBeNull()
  })
})

describe('IndexatieCalculator — de uitkomst bewaren', () => {
  const dossiers: Dossier[] = [
    { id: 'd1', naam: 'Kinderen', aandeelJij: 60 },
    { id: 'd2', naam: 'Tweede dossier', aandeelJij: 50 },
  ]

  async function vulIn(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Basisbedrag (€)'), '250')
    await user.type(screen.getByLabelText('Aanvangsindex'), '112,74')
    await user.type(screen.getByLabelText('Nieuwe index'), '135,64')
  }

  it('biedt niets aan zonder de mogelijkheid om te bewaren', async () => {
    // Zonder de prop gedraagt de rekenhulp zich zoals voorheen.
    const user = userEvent.setup()
    render(<IndexatieCalculator />)
    await vulIn(user)
    expect(screen.queryByRole('button', { name: 'Bewaar als onderhoudsbijdrage' })).not.toBeInTheDocument()
  })

  it('maakt een echte onderhoudsbijdrage van de berekening', async () => {
    // Het werkplan vroeg dit met zoveel woorden: de rekenhulp mag geen eiland zijn.
    const user = userEvent.setup()
    const onBewaarBijdrage = vi.fn()
    render(<IndexatieCalculator dossiers={dossiers} onBewaarBijdrage={onBewaarBijdrage} />)
    await vulIn(user)

    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    await user.type(screen.getByLabelText('Datum vonnis of overeenkomst'), '2021-09-15')
    await user.selectOptions(screen.getByLabelText('In welk dossier'), 'd2')
    await user.selectOptions(screen.getByLabelText('Richting'), 'jij-ontvangt')
    await user.click(screen.getByRole('button', { name: 'Bewaar in dossier' }))

    expect(onBewaarBijdrage).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierId: 'd2',
        basisbedrag: 25000,
        datumRegeling: '2021-09-15',
        richting: 'jij-ontvangt',
      }),
    )
    // 112,74 is precies wat de app zélf voor augustus 2021 kent. Het dan als
    // "uit de akte" bewaren bevriest een getal dat ze uit de datum kan afleiden.
    expect(onBewaarBijdrage.mock.calls[0][0].aanvangsindexHandmatig).toBeUndefined()
  })

  it('bewaart de aanvangsindex wél wanneer ze afwijkt van wat de app kent', async () => {
    const user = userEvent.setup()
    const onBewaarBijdrage = vi.fn()
    render(<IndexatieCalculator dossiers={dossiers} onBewaarBijdrage={onBewaarBijdrage} />)
    await user.type(screen.getByLabelText('Basisbedrag (€)'), '250')
    await user.type(screen.getByLabelText('Aanvangsindex'), '100')
    await user.type(screen.getByLabelText('Nieuwe index'), '135,64')
    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    await user.type(screen.getByLabelText('Datum vonnis of overeenkomst'), '2021-09-15')

    // En het verschil staat op het scherm vóór je bewaart: dat is precies de val
    // van een ouder basisjaar.
    expect(screen.getByText(/kent de app zelf het cijfer 112,74/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bewaar in dossier' }))
    expect(onBewaarBijdrage).toHaveBeenCalledWith(expect.objectContaining({ aanvangsindexHandmatig: 100 }))
  })

  it('bewaart twee keer na elkaar in het dossier dat op het scherm staat', async () => {
    // Zonder de controle op de keuzelijst wees de knop nog naar het vorige dossier:
    // je maakte dan een tweede bijdrage in een dossier dat er al één had.
    const user = userEvent.setup()
    const bewaard: { dossierId: string }[] = []
    const onBewaarBijdrage = vi.fn((b: { dossierId: string }) => {
      bewaard.push(b)
    })
    const { rerender } = render(
      <IndexatieCalculator dossiers={dossiers} bestaandeBijdragen={[]} onBewaarBijdrage={onBewaarBijdrage} />,
    )
    await vulIn(user)
    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    await user.type(screen.getByLabelText('Datum vonnis of overeenkomst'), '2021-09-15')
    await user.click(screen.getByRole('button', { name: 'Bewaar in dossier' }))
    expect(bewaard[0].dossierId).toBe('d1')

    // De app heeft nu een bijdrage in d1; de lijst toont enkel nog d2.
    rerender(
      <IndexatieCalculator
        dossiers={dossiers}
        bestaandeBijdragen={[
          { id: 'ob1', dossierId: 'd1', richting: 'jij-betaalt', basisbedrag: 25000, datumRegeling: '2021-09-15' },
        ]}
        onBewaarBijdrage={onBewaarBijdrage}
      />,
    )
    const keuze = screen.getByLabelText('In welk dossier') as HTMLSelectElement
    expect(keuze.value).toBe('d2')
    await user.type(screen.getByLabelText('Datum vonnis of overeenkomst'), '2022-01-10')
    await user.click(screen.getByRole('button', { name: 'Bewaar in dossier' }))
    expect(bewaard[1].dossierId).toBe('d2')
  })

  it('houdt je invoer vast wanneer het bewaren mislukt', async () => {
    const user = userEvent.setup()
    const onBewaarBijdrage = vi.fn(() => {
      throw new Error('stuk')
    })
    render(<IndexatieCalculator dossiers={dossiers} onBewaarBijdrage={onBewaarBijdrage} />)
    await vulIn(user)
    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    await user.type(screen.getByLabelText('Datum vonnis of overeenkomst'), '2021-09-15')
    await user.click(screen.getByRole('button', { name: 'Bewaar in dossier' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Bewaren is niet gelukt')
    expect(screen.getByLabelText('Datum vonnis of overeenkomst')).toHaveValue('2021-09-15')
    expect(screen.getByLabelText('Basisbedrag (€)')).toHaveValue('250')
  })

  it('neemt de nieuwe index NIET mee', async () => {
    // Die hoort bij één bepaalde maand, en welke maand dat was weet dit scherm niet.
    const user = userEvent.setup()
    const onBewaarBijdrage = vi.fn()
    render(<IndexatieCalculator dossiers={dossiers} onBewaarBijdrage={onBewaarBijdrage} />)
    await vulIn(user)
    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    await user.type(screen.getByLabelText('Datum vonnis of overeenkomst'), '2021-09-15')
    await user.click(screen.getByRole('button', { name: 'Bewaar in dossier' }))

    const bewaard = onBewaarBijdrage.mock.calls[0][0]
    expect(bewaard.eigenIndexcijfers).toBeUndefined()
  })

  it('bewaart niets zonder datum van de regeling', async () => {
    // Die datum bepaalt op welke dag er elk jaar geïndexeerd wordt; zonder haar
    // klopt er niets van de opbouw.
    const user = userEvent.setup()
    const onBewaarBijdrage = vi.fn()
    render(<IndexatieCalculator dossiers={dossiers} onBewaarBijdrage={onBewaarBijdrage} />)
    await vulIn(user)
    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    await user.click(screen.getByRole('button', { name: 'Bewaar in dossier' }))

    expect(onBewaarBijdrage).not.toHaveBeenCalled()
    expect(screen.getByText(/Vul de datum van het vonnis of de overeenkomst in/)).toBeInTheDocument()
  })

  it('waarschuwt over basisjaren voor je bewaart', async () => {
    // De valkuil van het hele onderwerp: een aanvangsindex uit een oud vonnis staat
    // in een andere maatstaf dan de tabel van de app.
    const user = userEvent.setup()
    render(<IndexatieCalculator dossiers={dossiers} onBewaarBijdrage={vi.fn()} />)
    await vulIn(user)
    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    expect(screen.getByText(/basis 2013 = 100/)).toBeInTheDocument()
  })

  it('biedt een dossier dat al een regeling heeft niet nog eens aan', async () => {
    const user = userEvent.setup()
    render(
      <IndexatieCalculator
        dossiers={dossiers}
        bestaandeBijdragen={[
          { id: 'ob1', dossierId: 'd1', richting: 'jij-betaalt', basisbedrag: 25000, datumRegeling: '2021-09-15' },
        ]}
        onBewaarBijdrage={vi.fn()}
      />,
    )
    await vulIn(user)
    await user.click(screen.getByRole('button', { name: 'Bewaar als onderhoudsbijdrage' }))
    const keuze = screen.getByLabelText('In welk dossier') as HTMLSelectElement
    expect([...keuze.options].map((o) => o.value)).toEqual(['d2'])
  })

  it('zegt het wanneer er nog geen dossier is', async () => {
    const user = userEvent.setup()
    render(<IndexatieCalculator dossiers={[]} onBewaarBijdrage={vi.fn()} />)
    await vulIn(user)
    expect(screen.getByText(/maak dan eerst een dossier aan/)).toBeInTheDocument()
  })

  it('biedt het niet aan bij huur', async () => {
    const user = userEvent.setup()
    render(<IndexatieCalculator dossiers={dossiers} onBewaarBijdrage={vi.fn()} />)
    await vulIn(user)
    await user.click(screen.getByRole('button', { name: 'Huur' }))
    expect(screen.queryByRole('button', { name: 'Bewaar als onderhoudsbijdrage' })).not.toBeInTheDocument()
  })
})
