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

    await user.type(screen.getByLabelText('Omschrijving'), 'Schoolreis')
    await user.type(screen.getByLabelText('Bedrag (€)'), '100')
    await user.click(screen.getByRole('button', { name: 'Kind 1 (gedeelde kost)' }))
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(
      expect.objectContaining({ omschrijving: 'Schoolreis', bedrag: 10000, kindIds: ['k1'] }),
    )
  })

  it('weigert een ongeldig eigen percentage in plaats van het stil te wissen (ronde 107)', async () => {
    // ⚠ RONDE 107. Wie bij een kost van € 400 met 100% eigen verdeling per ongeluk "110"
    // tikte, bewaarde die kost terug op de standaardverdeling van het dossier — € 200
    // verschil in het saldo naar de andere ouder, zonder één woord op het scherm.
    const user = userEvent.setup()
    const bestaand: GedeeldeKost = {
      id: 'k1',
      dossierId: 'd1',
      omschrijving: 'Fiets',
      bedrag: 40000,
      betaaldDoor: 'jij',
      datum: '2026-03-04',
      kostenType: 'gewoon',
      aandeelJijOverride: 100,
    }
    const onOpslaan = toon(kinderen, bestaand)

    const veld = screen.getByLabelText('Eigen verdeling (% jij, optioneel)')
    await user.clear(veld)
    await user.type(veld, '110')

    const knop = screen.getByRole('button', { name: 'Kost wijzigen' })
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Geef een percentage van 0 tot 100, of laat het veld leeg.')).toBeInTheDocument()

    await user.click(knop)
    expect(onOpslaan).not.toHaveBeenCalled()
  })

  it('bewaart een geldig eigen percentage gewoon', async () => {
    // De tegencontrole: 80 hoort er wél door.
    const user = userEvent.setup()
    const onOpslaan = toon()

    await user.type(screen.getByLabelText('Omschrijving'), 'Fiets')
    await user.type(screen.getByLabelText('Bedrag (€)'), '400')
    await user.type(screen.getByLabelText('Eigen verdeling (% jij, optioneel)'), '80')
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ aandeelJijOverride: 80 }))
  })

  it('leest een eigen percentage met een komma', async () => {
    const user = userEvent.setup()
    const onOpslaan = toon()

    await user.type(screen.getByLabelText('Omschrijving'), 'Fiets')
    await user.type(screen.getByLabelText('Bedrag (€)'), '400')
    await user.type(screen.getByLabelText('Eigen verdeling (% jij, optioneel)'), '66,6')
    await user.click(screen.getByRole('button', { name: 'Kost toevoegen' }))

    expect(onOpslaan).toHaveBeenCalledWith(expect.objectContaining({ aandeelJijOverride: 66.6 }))
  })

  it('toont gearchiveerde gezinsleden niet, tenzij ze al gekoppeld zijn', async () => {
    toon()
    expect(screen.getByRole('button', { name: 'Kind 1 (gedeelde kost)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kind 2 (gedeelde kost)' })).toBeNull()
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
    const chip = screen.getByRole('button', { name: 'Kind 2 (gedeelde kost)' })
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

    await user.type(screen.getByLabelText(/^Zoek een categorie of subcategorie/), 'Orthodontie')
    await user.click(await screen.findByRole('option', { name: /Orthodontie/ }))

    expect(screen.getByLabelText('Soort kost')).toHaveValue('buitengewoon')
    expect(screen.getByText(/Medische en paramedische kosten/)).toBeInTheDocument()
    expect(screen.getByText(/KB van 22 april 2019/)).toBeInTheDocument()
  })

  it('laat je het voorstel overrulen en houdt die keuze vast', async () => {
    const user = userEvent.setup()
    const onOpslaan = toon()

    await user.type(screen.getByLabelText(/^Zoek een categorie of subcategorie/), 'Orthodontie')
    await user.click(await screen.findByRole('option', { name: /Orthodontie/ }))

    await user.selectOptions(screen.getByLabelText('Soort kost'), 'gewoon')
    expect(screen.getByText(/Je koos zelf/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Omschrijving'), 'Beugel')
    await user.type(screen.getByLabelText('Bedrag (€)'), '250')
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

describe('GedeeldeKostFormulier — velden die het formulier niet kent (ronde 44)', () => {
  it('houdt uitwisselId, reactie en ingetrokken vast bij een bewerking', async () => {
    // Dit is precies één keer eerder misgegaan, met transactieId: het formulier
    // bouwde een nieuw object uit een witte lijst, en alles wat er niet in stond
    // verdween bij de eerste bewerking. Toen kwam er een tweede kost bij en stond
    // dezelfde rekening twee keer in de afrekening. Met de uitwisseling erbij zou
    // een typfout verbeteren de betwisting van de andere ouder wissen.
    const user = userEvent.setup()
    const bestaand: GedeeldeKost = {
      id: 'k9',
      dossierId: 'd1',
      omschrijving: 'Turnpak',
      bedrag: 4000,
      betaaldDoor: 'partner',
      datum: '2026-07-03',
      uitwisselId: 'a-1',
      reactie: { soort: 'betwist', op: '2026-08-12', reden: 'Niet afgesproken', bedrag: 4000, datum: '2026-07-03' },
      transactieId: 'tx-1',
    }
    const onOpslaan = toon(kinderen, bestaand)

    await user.clear(screen.getByLabelText('Omschrijving'))
    await user.type(screen.getByLabelText('Omschrijving'), 'Turnpak Lena')
    await user.click(screen.getByRole('button', { name: 'Kost wijzigen' }))

    const bewaard = onOpslaan.mock.calls[0][0] as GedeeldeKost
    expect(bewaard.omschrijving).toBe('Turnpak Lena')
    expect(bewaard.uitwisselId).toBe('a-1')
    expect(bewaard.reactie).toMatchObject({ soort: 'betwist', reden: 'Niet afgesproken' })
    expect(bewaard.transactieId).toBe('tx-1')
  })

  it('haalt een veld dat het formulier WEL bestuurt wel degelijk weg', async () => {
    // De keerzijde: leeggemaakt betekent hier weg, niet "laat maar staan".
    const user = userEvent.setup()
    const bestaand: GedeeldeKost = {
      id: 'k9',
      dossierId: 'd1',
      omschrijving: 'Turnpak',
      bedrag: 4000,
      betaaldDoor: 'jij',
      datum: '2026-07-03',
      kindIds: ['k1'],
    }
    const onOpslaan = toon(kinderen, bestaand)
    await user.click(screen.getByRole('button', { name: 'Kind 1 (gedeelde kost)' }))
    await user.click(screen.getByRole('button', { name: 'Kost wijzigen' }))

    const bewaard = onOpslaan.mock.calls[0][0] as GedeeldeKost
    expect(bewaard.kindIds).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Ronde 111 — een bon heeft een grootte-grens, en die zegt het
// ---------------------------------------------------------------------------

describe('de bon bij een gedeelde kost', () => {
  function groteFile(bytes: number) {
    // Een PDF wordt met opzet ONVERKLEIND bewaard, dus de data-URL is ruwweg 4/3 van het
    // bestand. Hier maken we hem gewoon zelf groot genoeg.
    return new File(['%PDF-1.4 ' + 'x'.repeat(bytes)], 'vonnis.pdf', { type: 'application/pdf' })
  }

  it('weigert een bestand boven 4 MB en zegt waarom', async () => {
    // ⚠ RONDE 111. Deze kiezer had geen enkele grens, terwijl hij PDF's aanvaardt die
    // onverkleind bewaard worden — die belanden dan in je database én in élke synchronisatie.
    // En de `catch` zweeg volledig, dus een mislukte bon zag je nergens.
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bon/factuur (optioneel)'), groteFile(5_000_000))
    expect(await screen.findByRole('alert')).toHaveTextContent('te groot')
  })

  it('laat een gewone bon gewoon door', async () => {
    const user = userEvent.setup()
    toon()
    await user.upload(screen.getByLabelText('Bon/factuur (optioneel)'), groteFile(100))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
