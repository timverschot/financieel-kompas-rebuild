import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Categorie, Dossier, DossierDocument, GedeeldeKost, Kind, Verrekening } from '../data/schema'

// Ronde 41 gaf het dossier een derde exportknop: de bewijsmap. Er was voor deze
// component nog geen enkele test, dus deze eerste ronde tests dekt precies de rij
// waarin die knop staat: wat ze doet, welke gegevens ze doorgeeft, dat ze niet
// dubbel afgaat, en dat een mislukking te zien is in plaats van stil te blijven.
//
// De twee PDF-bouwers worden vervangen. Wat er ín de documenten komt, staat in
// bewijsmapPdf.test.ts en afrekeningPdf.test.ts.
const { bewijsmap, afrekeningPdf } = vi.hoisted(() => ({ bewijsmap: vi.fn(), afrekeningPdf: vi.fn() }))
vi.mock('../utils/bewijsmapPdf', () => ({ exporteerBewijsmapPDF: bewijsmap }))
vi.mock('../utils/afrekeningPdf', () => ({ exporteerAfrekeningPDF: afrekeningPdf }))

const { DossierSectie } = await import('./DossierSectie')

const dossier: Dossier = { id: 'd1', naam: 'Kinderen 2026', aandeelJij: 60 }
const kinderen: Kind[] = [{ id: 'k1', naam: 'Kind 1' }]
const categorieen: Categorie[] = [{ id: 'eigen-1', naam: 'Eigen categorie' }]

const kosten: GedeeldeKost[] = [
  {
    id: 'k1',
    dossierId: 'd1',
    omschrijving: 'Schoolrekening',
    bedrag: 12000,
    betaaldDoor: 'jij',
    datum: '2026-03-04',
    bonnetje: 'data:image/jpeg;base64,AAAA',
    verrekeningId: 'v1',
  },
]

const afrekening: Verrekening = {
  id: 'v1',
  dossierId: 'd1',
  datum: '2026-04-01',
  bedrag: 7200,
  kostIds: ['k1'],
}

const documenten: DossierDocument[] = [
  { id: 'doc1', dossierId: 'd1', naam: 'Overeenkomst', soort: 'overeenkomst', bestand: 'data:image/jpeg;base64,AAAA', toegevoegdOp: '2026-01-15' },
]

function toon(extra: Partial<Parameters<typeof DossierSectie>[0]> = {}) {
  render(
    <DossierSectie
      dossiers={[dossier]}
      kosten={kosten}
      verrekeningen={[afrekening]}
      kinderen={kinderen}
      categorieen={categorieen}
      kindrekeningen={[]}
      kindrekeningposten={[]}
      documenten={documenten}
      onDossierOpslaan={vi.fn()}
      onDossierVerwijderen={vi.fn()}
      onKostOpslaan={vi.fn()}
      onKostVerwijderen={vi.fn()}
      onGenereer={vi.fn()}
      onMarkeerOvergemaakt={vi.fn()}
      onVerwijderAfrekening={vi.fn()}
      onKindrekeningOpslaan={vi.fn()}
      onKindrekeningVerwijderen={vi.fn()}
      onKindrekeningPostOpslaan={vi.fn()}
      onKindrekeningPostVerwijderen={vi.fn()}
      onDocumentOpslaan={vi.fn()}
      onDocumentVerwijderen={vi.fn()}
      {...extra}
    />,
  )
}

const bewijsmapKnop = () => screen.getByRole('button', { name: /Bewijsmap met bonnen/ })

beforeEach(() => {
  bewijsmap.mockReset()
  bewijsmap.mockResolvedValue(undefined)
  afrekeningPdf.mockReset()
  afrekeningPdf.mockResolvedValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

describe('DossierSectie — de bewijsmap', () => {
  it('zet een knop bij elke afrekening', () => {
    toon()
    expect(bewijsmapKnop()).toBeInTheDocument()
  })

  it('zegt bij welke afrekening de knop hoort, voor wie met een schermlezer werkt', () => {
    toon()
    // De zichtbare tekst is kort ("Bewijsmap"); het label noemt de datum erbij,
    // want er kunnen meerdere afrekeningen onder elkaar staan.
    expect(bewijsmapKnop()).toHaveAccessibleName('Bewijsmap met bonnen van de afrekening van 2026-04-01')
    expect(bewijsmapKnop()).toHaveTextContent('Bewijsmap')
  })

  it('legt in de kaart uit wat het verschil is met de gewone PDF', () => {
    toon()
    expect(screen.getByText(/volledige dossier/)).toBeInTheDocument()
  })

  it('geeft het dossier, de afrekening en de documentkluis mee', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(bewijsmapKnop())
    expect(bewijsmap).toHaveBeenCalledTimes(1)
    const argumenten = bewijsmap.mock.calls[0]
    expect(argumenten[1]).toEqual(dossier)
    expect(argumenten[2]).toEqual(afrekening)
    expect(argumenten[3]).toEqual(kosten)
    // `Kind` en `Categorie` zijn structureel bijna gelijk, dus TypeScript merkt het
    // niet als deze twee verwisseld of vergeten worden. Zonder kinderen zou de
    // bewijsmap de uitsplitsing per kind kwijt zijn en zonder categorieën de namen van
    // eigen categorieën.
    expect(argumenten[4]).toEqual(kinderen)
    expect(argumenten[5]).toEqual(categorieen)
    // De kluisdocumenten horen erbij: die zijn de tweede bron van bijlagen.
    expect(argumenten[6]).toEqual(documenten)
  })

  it('bouwt niet de gewone afrekening-PDF maar de bewijsmap', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(bewijsmapKnop())
    expect(afrekeningPdf).not.toHaveBeenCalled()
  })

  it('houdt de gewone PDF-knop naast de bewijsmap', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'PDF' }))
    expect(afrekeningPdf).toHaveBeenCalledTimes(1)
    expect(bewijsmap).not.toHaveBeenCalled()
  })

  it('zet de knop op slot terwijl de bewijsmap gebouwd wordt, zonder de focus kwijt te spelen', async () => {
    // Een bewijsmap met afbeeldingen duurt langer dan de gewone PDF; zonder dit tik
    // je drie keer en krijg je drie bestanden. Maar `disabled` zou de focus naar de
    // pagina laten vallen, dus het is `aria-disabled` plus een weigering in de handler.
    let losmaken = () => {}
    bewijsmap.mockImplementation(() => new Promise<void>((klaar) => (losmaken = () => klaar())))
    const user = userEvent.setup()
    toon()
    await user.click(bewijsmapKnop())
    const bezig = screen.getByRole('button', { name: /bezig/i })
    expect(bezig).toHaveAttribute('aria-disabled', 'true')
    expect(bezig).toHaveTextContent('Bezig…')
    expect(bezig).not.toBeDisabled()
    expect(document.activeElement).toBe(bezig)
    // Een tweede tik mag niets doen.
    await user.click(bezig)
    expect(bewijsmap).toHaveBeenCalledTimes(1)
    await act(async () => {
      losmaken()
    })
    expect(bewijsmapKnop()).toHaveAttribute('aria-disabled', 'false')
  })

  it('meldt dat de bewijsmap gedownload is, met de datum erbij', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(bewijsmapKnop())
    expect(await screen.findByRole('status')).toHaveTextContent('De bewijsmap van 2026-04-01 is gedownload.')
  })

  it('meldt ook wanneer de gewone PDF mislukt', async () => {
    // Die knop liep tot ronde 41 geluidloos stuk.
    afrekeningPdf.mockRejectedValue(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('De PDF van 2026-04-01 kon niet gemaakt worden.')
  })

  it('meldt een mislukking in plaats van niets te doen', async () => {
    bewijsmap.mockRejectedValue(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(bewijsmapKnop())
    // De datum staat erbij: bij acht afrekeningen onder elkaar wist je anders niet
    // welke faalde.
    expect(await screen.findByRole('alert')).toHaveTextContent('De bewijsmap van 2026-04-01 kon niet gemaakt worden.')
  })

  it('laat de knop na een mislukking weer los', async () => {
    bewijsmap.mockRejectedValue(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(bewijsmapKnop())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(bewijsmapKnop()).toHaveAttribute('aria-disabled', 'false')
  })

  it('wist een oude melding bij een nieuwe poging', async () => {
    bewijsmap.mockRejectedValueOnce(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(bewijsmapKnop())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await user.click(bewijsmapKnop())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('verdwijnt mee wanneer het onderdeel Verrekeningen verborgen is', () => {
    toon({ dossiers: [{ ...dossier, verborgenOnderdelen: ['verrekeningen'] }] })
    expect(screen.queryByRole('button', { name: /Bewijsmap/ })).toBeNull()
  })
})

describe('DossierSectie — waarop de verdeling steunt', () => {
  // Ronde 52. De bewijsmap kan pas naar de overeenkomst verwijzen wanneer je hier
  // aanduidt welke dat is.

  it('biedt de documenten van dít dossier aan, met hun soort erbij', () => {
    // Een attest dat aan een lening of een garantie hangt, legt geen verdeling vast
    // en hoort dus niet in deze lijst.
    toon({
      documenten: [
        ...documenten,
        { id: 'doc2', leningId: 'l1', naam: 'Kredietakte', soort: 'ander', bestand: 'data:image/jpeg;base64,AAAA', toegevoegdOp: '2026-02-01' },
        { id: 'doc3', dossierId: 'ander', naam: 'Vonnis van iemand anders', soort: 'vonnis', bestand: 'data:image/jpeg;base64,AAAA', toegevoegdOp: '2026-02-01' },
      ],
    })
    const keuze = screen.getByLabelText('Document') as HTMLSelectElement
    const opties = [...keuze.options].map((o) => o.textContent)
    expect(opties).toEqual(['Geen document aangeduid', 'Overeenkomst: Overeenkomst'])
  })

  it('toont de kaart zodra er een document in de kluis staat', () => {
    // De tegenhanger van de test hieronder: zonder deze zou "geen keuzelijst" ook
    // slagen wanneer de hele kaart nooit gebouwd wordt.
    toon()
    expect(screen.getByLabelText('Document')).toBeInTheDocument()
  })

  it('bewaart je keuze op het dossier', async () => {
    const gebruiker = userEvent.setup()
    const opslaan = vi.fn()
    toon({ onDossierOpslaan: opslaan })
    await gebruiker.selectOptions(screen.getByLabelText('Document'), 'doc1')
    expect(opslaan).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', grondslagDocumentId: 'doc1' }))
  })

  it('haalt het veld weg wanneer je de keuze wist, in plaats van een lege waarde te bewaren', async () => {
    const gebruiker = userEvent.setup()
    const opslaan = vi.fn()
    toon({ dossiers: [{ ...dossier, grondslagDocumentId: 'doc1' }], onDossierOpslaan: opslaan })
    await gebruiker.selectOptions(screen.getByLabelText('Document'), '')
    expect(opslaan).toHaveBeenCalledTimes(1)
    expect(Object.keys(opslaan.mock.calls[0][0])).not.toContain('grondslagDocumentId')
  })

  it('zegt het wanneer het aangeduide document niet meer in de kluis staat', () => {
    // Stil terugvallen op "geen" zou de indruk wekken dat je nooit iets koos.
    toon({ dossiers: [{ ...dossier, grondslagDocumentId: 'weg' }] })
    expect(document.querySelector('[data-grondslag-weg]')?.textContent).toMatch(/staat niet meer in de kluis/)
    expect((screen.getByLabelText('Document') as HTMLSelectElement).value).toBe('')
  })

  it('houdt de kaart weg zolang er niets te kiezen valt', () => {
    // Een lege keuzelijst zou alleen meescrollen; de bewijsmap zegt zelf wat er
    // ontbreekt en hoe je het oplost.
    toon({ documenten: [] })
    expect(screen.queryByLabelText('Document')).toBeNull()
  })

  it('zegt erbij dat de app het document niet gelezen heeft', () => {
    toon()
    expect(screen.getByText(/leest dit document niet/)).toBeInTheDocument()
  })
})

describe('DossierSectie — de grondslagkaart en de chips', () => {
  it('verdwijnt mee met de documentkluis', async () => {
    // Haar bijschrift en haar foutregel verwijzen allebei naar die kluis. Wie de
    // kluis uitzet, zou hier een verwijzing houden naar iets wat op zijn scherm niet
    // meer bestaat.
    toon({ dossiers: [{ ...dossier, verborgenOnderdelen: ['documentkluis'] }] })
    expect(screen.queryByLabelText('Document')).toBeNull()
  })
})
