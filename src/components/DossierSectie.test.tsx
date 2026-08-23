import { useState } from 'react'
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

type Eigenschappen = Parameters<typeof DossierSectie>[0]

// De vaste eigenschappen op één plek, zodat een test die zelf `render`/`rerender`
// nodig heeft (om iets van buitenaf te laten veranderen) niet de hele lijst hoeft
// over te tikken.
function eigenschappen(extra: Partial<Eigenschappen> = {}): Eigenschappen {
  return {
    dossiers: [dossier],
    kosten,
    verrekeningen: [afrekening],
    kinderen,
    categorieen,
    kindrekeningen: [],
    kindrekeningposten: [],
    documenten,
    onDossierOpslaan: vi.fn(),
    onDossierVerwijderen: vi.fn(),
    onKostOpslaan: vi.fn(),
    onKostVerwijderen: vi.fn(),
    onGenereer: vi.fn(),
    onMarkeerOvergemaakt: vi.fn(),
    onVerwijderAfrekening: vi.fn(),
    onKindrekeningOpslaan: vi.fn(),
    onKindrekeningVerwijderen: vi.fn(),
    onKindrekeningPostOpslaan: vi.fn(),
    onKindrekeningPostVerwijderen: vi.fn(),
    onDocumentOpslaan: vi.fn(),
    onDocumentVerwijderen: vi.fn(),
    ...extra,
  }
}

function toon(extra: Partial<Eigenschappen> = {}) {
  render(<DossierSectie {...eigenschappen(extra)} />)
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
    await user.click(screen.getByRole('button', { name: /^PDF van de afrekening/ }))
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
    // ⚠ Niet meer "de enige status op het scherm" (ronde 61): sinds de redenregels
    // onder de uitgezette knoppen er altijd staan — ook leeg — zijn er meerdere. We
    // zoeken de melding nu op haar tekst en controleren dát ze een levend gebied is.
    const melding = await screen.findByText('De bewijsmap van 2026-04-01 is gedownload.')
    expect(melding).toHaveAttribute('role', 'status')
  })

  it('meldt ook wanneer de gewone PDF mislukt', async () => {
    // Die knop liep tot ronde 41 geluidloos stuk.
    afrekeningPdf.mockRejectedValue(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: /^PDF van de afrekening/ }))
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

describe('DossierSectie — de chips voor de onderdelen', () => {
  it('toont je tik meteen, zonder op het opslaan te wachten', async () => {
    // Een chip die pas van kleur verandert nadat het dossier weggeschreven is, laat
    // je op een trage telefoon twijfelen of je tik wel aankwam (ronde 60).
    const user = userEvent.setup()
    let laatOpslaanDoorgaan = () => {}
    const opslaan = vi.fn(() => new Promise<void>((res) => { laatOpslaanDoorgaan = res }))
    toon({ onDossierOpslaan: opslaan })

    const kluis = screen.getByRole('button', { name: 'Documentkluis' })
    expect(kluis).toHaveAttribute('aria-pressed', 'true')
    await user.click(kluis)
    expect(screen.getByRole('button', { name: 'Documentkluis' })).toHaveAttribute('aria-pressed', 'false')

    await act(async () => { laatOpslaanDoorgaan() })
  })

  it('zet je tik terug wanneer het opslaan mislukt', async () => {
    // Anders blijft de bedoeling hangen: het scherm zegt "uit", het dossier zegt
    // "aan", en de volgende geslaagde tik zet er twee tegelijk om (ronde 60).
    const user = userEvent.setup()
    const opslaan = vi.fn().mockRejectedValue(new Error('schijf vol'))
    // De fout mag de test niet doen omvallen; we kijken naar wat het scherm doet.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    toon({ onDossierOpslaan: opslaan })

    await user.click(screen.getByRole('button', { name: 'Documentkluis' }))
    expect(opslaan).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Documentkluis' })).toHaveAttribute('aria-pressed', 'true')
    // En het zegt het ook: een chip die stil terugspringt lijkt een haperend scherm.
    expect(screen.getByText(/Dat is niet bewaard/)).toBeInTheDocument()
  })

  it('zwijgt over een mislukte opslag waarvan de wijziging al meelift op een latere', async () => {
    // ⚠ Mislukt tik 1 terwijl tik 2 al onderweg is, dan draagt tik 2 de wijziging van
    // tik 1 al mee: er gaat niets verloren. Zou de app dan tóch "Dat is niet bewaard"
    // zeggen, dan tik je nog eens — en zet je juist iets om dat goed stond.
    const user = userEvent.setup()
    const doorgaan: { ok: () => void; fout: () => void }[] = []
    const opslaan = vi.fn(() => new Promise<void>((res, rej) => {
      doorgaan.push({ ok: () => res(), fout: () => rej(new Error('schijf vol')) })
    }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    toon({ onDossierOpslaan: opslaan })

    await user.click(screen.getByRole('button', { name: 'Documentkluis' }))
    await user.click(screen.getByRole('button', { name: 'Uitwisselen met de andere ouder' }))
    // Tik 1 mislukt, tik 2 lukt.
    await act(async () => { doorgaan[0].fout() })
    await act(async () => { doorgaan[1].ok() })

    expect(screen.queryByText(/Dat is niet bewaard/)).toBeNull()
  })

  it('zet de focus na "Toon het" op de chip van datzelfde onderdeel', async () => {
    // Anders verdwijnt de regel mét de knop erin en valt de focus terug naar het begin
    // van de pagina. De knop draagt ook de naam van het onderdeel: staan er twee van
    // die regels, dan heten ze anders allebei enkel "Toon het".
    const user = userEvent.setup()
    toon({
      dossiers: [{ ...dossier, verborgenOnderdelen: ['verdeling-kostensoort'], typeAandelen: { gewoon: 70 } }],
    })

    await user.click(screen.getByRole('button', { name: 'Toon Verdeling per kostensoort' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Verdeling per kostensoort' }))
  })

  it('rekent bij twee snelle tikken door op de vorige tik, niet op het dossier', async () => {
    // ⚠ De fout die dit voorkomt: elke tik schrijft het dossier weg en de app leest
    // daarna opnieuw. Rekende de tweede tik vanaf het dossier zoals het NU op het
    // scherm staat, dan zou hij de eerste wijziging spoorloos overschrijven.
    const user = userEvent.setup()
    const laatDoorgaan: (() => void)[] = []
    const bewaard: Dossier[] = []
    const opslaan = vi.fn((d: Dossier) => new Promise<void>((res) => {
      bewaard.push(d)
      laatDoorgaan.push(res)
    }))
    toon({ onDossierOpslaan: opslaan })

    await user.click(screen.getByRole('button', { name: 'Documentkluis' }))
    await user.click(screen.getByRole('button', { name: 'Uitwisselen met de andere ouder' }))

    expect(bewaard[1].verborgenOnderdelen).toEqual(['documentkluis', 'uitwisseling'])

    await act(async () => { laatDoorgaan.forEach((f) => f()) })
  })

  it('neemt een wijziging over die van een ander toestel binnenkomt', async () => {
    // ⚠ Het scherm houdt tijdens een opslag zijn eigen lijst vast. Zonder de teller
    // die bijhoudt of er nog iets onderweg is, zou het die lijst blijven vasthouden
    // tot je van dossier wisselt — en draaide je eerstvolgende tik de wijziging van je
    // gsm gewoon terug.
    const { rerender } = render(
      <DossierSectie {...eigenschappen({ dossiers: [dossier] })} />,
    )
    expect(screen.getByRole('button', { name: 'Documentkluis' })).toHaveAttribute('aria-pressed', 'true')

    const opslaan = vi.fn()
    const vanGsm = { ...dossier, verborgenOnderdelen: ['documentkluis'] }
    rerender(<DossierSectie {...eigenschappen({ dossiers: [vanGsm], onDossierOpslaan: opslaan })} />)
    expect(screen.getByRole('button', { name: 'Documentkluis' })).toHaveAttribute('aria-pressed', 'false')

    // En — dit is het punt — de eerstvolgende tik op een ándere chip mag die
    // wijziging niet terugdraaien: ze hoort er gewoon bij te komen.
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Uitwisselen met de andere ouder' }))
    expect(opslaan.mock.calls[0][0].verborgenOnderdelen).toEqual(['documentkluis', 'uitwisseling'])
  })

  it('waarschuwt wanneer een uitgezette verdeling nog een sleutel bevat', () => {
    // Een verdeelsleutel die uitstaat, deelt je geld gewoon verder. Zonder deze regel
    // zie je een afrekening waarvan de cijfers niet kloppen met het scherm.
    toon({
      dossiers: [{ ...dossier, verborgenOnderdelen: ['verdeling-kostensoort'], typeAandelen: { gewoon: 70 } }],
    })
    expect(screen.getByText(/Verdeling per kostensoort staat uit, maar er staat wel iets in/)).toBeInTheDocument()
  })
})

describe('DossierSectie — een nieuw dossier', () => {
  it('kiest het nieuwe dossier meteen', async () => {
    // ⚠ Vóór ronde 60 bleef de keuzelijst op het vorige dossier staan. De chips en
    // de kaarten eronder gingen dus nog over dat oude dossier, terwijl je net iets
    // nieuws had aangemaakt — en wie dan een onderdeel aanzette, zette het bij het
    // verkeerde dossier aan.
    const user = userEvent.setup()

    function Proef() {
      const [lijst, setLijst] = useState<Dossier[]>([dossier])
      return (
        <DossierSectie
          dossiers={lijst}
          kosten={[]}
          verrekeningen={[]}
          kinderen={kinderen}
          categorieen={categorieen}
          kindrekeningen={[]}
          kindrekeningposten={[]}
          documenten={[]}
          onDossierOpslaan={(d: Dossier) => { setLijst((v) => [...v.filter((x) => x.id !== d.id), d]) }}
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
        />
      )
    }
    render(<Proef />)

    await user.type(screen.getByLabelText('Dossiernaam'), 'Dossier Emma')
    await user.click(screen.getByRole('button', { name: 'Dossier toevoegen' }))

    const keuze = screen.getByLabelText('Gekozen dossier') as HTMLSelectElement
    expect(keuze.selectedOptions[0].textContent).toContain('Dossier Emma')
  })
})

describe('DossierSectie — een afrekening verwijderen', () => {
  // De datum staat voluit, net als in de venstertitel: dezelfde afrekening hoort
  // niet op twee manieren te klinken (ronde 65).
  const kruisje = () => screen.getByRole('button', { name: 'Verwijder afrekening 1 apr 2026' })

  it('wist niet meteen, maar vraagt eerst', async () => {
    const user = userEvent.setup()
    const onVerwijderAfrekening = vi.fn()
    toon({ onVerwijderAfrekening })
    await user.click(kruisje())
    // ⚠ Dit is de kern: één tik op het kruisje mag géén afrekening wissen.
    expect(onVerwijderAfrekening).not.toHaveBeenCalled()
    expect(await screen.findByText('De afrekening van 1 apr 2026 verwijderen?')).toBeInTheDocument()
  })

  it('telt in de vraag wat er weg gaat, in plaats van "weet je het zeker?"', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(kruisje())
    expect(await screen.findByText(/Het bedrag van/)).toHaveTextContent('€ 72,00')
    expect(screen.getByText(/1 gedeelde kost\(en\) blijven bestaan/)).toBeInTheDocument()
  })

  it('zegt erbij welke kosten weer op "nog niet afgerekend" komen', async () => {
    const user = userEvent.setup()
    toon({
      verrekeningen: [{ ...afrekening, overgemaakt: true }],
      kosten: [{ ...kosten[0], afgerekend: true }],
    })
    await user.click(kruisje())
    expect(await screen.findByText(/1 kost\(en\) komen weer op/)).toBeInTheDocument()
  })

  it('zwijgt over heropenen zolang de afrekening niets dichtzette', async () => {
    const user = userEvent.setup()
    // Zonder de oude `verrekeningId`-koppeling en zonder 'overgemaakt' heeft deze
    // afrekening geen enkele kost dichtgezet.
    toon({ kosten: [{ ...kosten[0], verrekeningId: undefined }] })
    await user.click(kruisje())
    await screen.findByText(/Het bedrag van/)
    expect(screen.queryByText(/komen weer op/)).not.toBeInTheDocument()
  })

  it('meldt ook de oude verrekeningId-koppeling als heropening', async () => {
    // ⚠ Dossiers van vóór het niet-blokkerende model koppelden kosten met
    // `verrekeningId`. Die telt even zwaar als 'afgerekend': bleef ze staan, dan
    // bleef die kost voorgoed buiten je saldo.
    const user = userEvent.setup()
    toon()
    await user.click(kruisje())
    expect(await screen.findByText(/1 kost\(en\) komen weer op/)).toBeInTheDocument()
  })

  it('laat de afrekening staan wanneer je de vraag met nee beantwoordt', async () => {
    const user = userEvent.setup()
    const onVerwijderAfrekening = vi.fn()
    toon({ onVerwijderAfrekening })
    await user.click(kruisje())
    await user.click(await screen.findByRole('button', { name: 'Nee, behouden' }))
    expect(onVerwijderAfrekening).not.toHaveBeenCalled()
  })

  it('verwijdert pas na "Ja, verwijder"', async () => {
    const user = userEvent.setup()
    const onVerwijderAfrekening = vi.fn()
    toon({ onVerwijderAfrekening })
    await user.click(kruisje())
    await user.click(await screen.findByRole('button', { name: 'Ja, verwijder' }))
    expect(onVerwijderAfrekening).toHaveBeenCalledWith('v1')
  })
})

// --- Ronde 66, slotronde: geen oordeel over nul kosten ---
describe('DossierSectie — een vers dossier', () => {
  it('zegt niet "Niets te verrekenen" wanneer er nog geen enkele kost is', () => {
    // ⚠ "Niets te verrekenen" leest als "jullie staan quitte", terwijl er nog nooit
    // iets ingegeven is. Dezelfde valse geruststelling die `BalansRegel` bij nul
    // boekingen afvangt en die ronde 65 uit de maandafsluiting gehaald heeft.
    toon({ kosten: [] })
    expect(screen.getByText(/Nog geen kosten in dit dossier/)).toBeInTheDocument()
    // De stat met het saldo staat er niet; de filterregel eronder telt gewoon nul.
    expect(screen.queryByText('Te verrekenen')).toBeNull()
  })

  it('toont het te verrekenen bedrag wél zodra er een open kost staat', () => {
    // Zonder `verrekeningId`: dan staat de kost nog open en telt ze mee.
    toon({
      kosten: [
        { id: 'k9', dossierId: 'd1', omschrijving: 'Schoolreis', bedrag: 10000, betaaldDoor: 'jij', datum: '2026-03-04' },
      ],
    })
    expect(screen.queryByText(/Nog geen kosten in dit dossier/)).toBeNull()
    expect(screen.getByText('Te verrekenen')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Ronde 69 — elk getal verantwoordt zich.
//
// "Te verrekenen" telt ALLE open kosten van het dossier, ongeacht de periode die
// je in de afrekening hieronder instelt. En een betwiste kost telt gewoon mee —
// dat is een bewuste keuze (stil geld uit een saldo laten vallen is erger dan het
// zichtbaar te houden), maar dan moet het scherm het wél zeggen. Anders staat er
// een bedrag dat er zeker uitziet terwijl de andere ouder er net bezwaar tegen
// maakte. Zo'n cijfer belandt bij een bemiddelaar of een advocaat.
// ---------------------------------------------------------------------------
describe('DossierSectie — waar "Te verrekenen" vandaan komt', () => {
  const openKost: GedeeldeKost = {
    id: 'k9',
    dossierId: 'd1',
    omschrijving: 'Schoolreis',
    bedrag: 10000,
    betaaldDoor: 'jij',
    datum: '2026-03-04',
  }

  const bron = () => document.querySelector('.getal-bron')?.textContent ?? ''

  // Eén keer opschrijven: vier tests hangen aan exact deze zin, en hij is te lang om
  // vier keer over te tikken zonder tikfout.
  const BASISZIN =
    'Alle kosten in dit dossier die nog niet afgerekend zijn, ongeacht de periode. ' +
    'Wat ingetrokken is telt niet mee; wat al in een afrekening staat die je nog niet ' +
    'als overgemaakt aanvinkte, telt hier nog wel mee.'

  it('zegt dat het over alle open kosten gaat, ongeacht de periode', () => {
    toon({ kosten: [openKost] })
    expect(bron()).toBe(BASISZIN)
  })

  it('zegt erbij wanneer een van die kosten betwist is', () => {
    // ⚠ De afrekening zegt het wél en dit scherm zweeg erover. Het bedrag ziet er
    // dan even vast uit als een bedrag waarover iedereen akkoord is.
    toon({
      kosten: [{ ...openKost, reactie: { soort: 'betwist', op: '2026-03-10', bedrag: 10000, datum: '2026-03-04' } }],
    })
    expect(bron()).toContain(BASISZIN)
    expect(bron()).toContain('Eén ervan is betwist door de andere ouder en telt hier toch mee.')
  })

  it('telt hoeveel er betwist zijn wanneer het er meer dan één zijn', () => {
    toon({
      kosten: [
        { ...openKost, reactie: { soort: 'betwist', op: '2026-03-10', bedrag: 10000, datum: '2026-03-04' } },
        {
          ...openKost,
          id: 'k10',
          omschrijving: 'Turnpak',
          bedrag: 4000,
          reactie: { soort: 'betwist', op: '2026-03-11', bedrag: 4000, datum: '2026-03-04' },
        },
      ],
    })
    expect(bron()).toContain('2 ervan zijn betwist door de andere ouder en tellen hier toch mee.')
  })

  it('zwijgt over een betwisting die vervallen is doordat de kost nadien wijzigde', () => {
    // ⚠ Een bezwaar tegen € 40 is geen bezwaar tegen € 400. `reactieVervallen`
    // merkt dat het antwoord op een ánder bedrag sloeg; `afrekeningOverzicht`
    // hanteert diezelfde regel, en de twee mogen niet uit elkaar lopen — anders
    // meldt dit scherm een betwisting die in de afrekening niet meer bestaat.
    toon({
      kosten: [{ ...openKost, bedrag: 40000, reactie: { soort: 'betwist', op: '2026-03-10', bedrag: 10000, datum: '2026-03-04' } }],
    })
    expect(bron()).toBe(BASISZIN)
  })

  // --- Het merkteken op de rij zelf ---
  //
  // Het cijfer eronder zegt DÁT er een kost betwist is; zonder merkteken op de rij
  // wist je niet WELKE, en dan is de mededeling onbruikbaar zodra er meer dan een
  // handvol kosten staat.

  // De badge in de rij van een kost, of null. Bewust binnen de rij gezocht: het
  // woord "betwist" staat ook in de zin onder het bedrag.
  const badgeVan = (omschrijving: string) => {
    const rij = screen.getByText(omschrijving, { selector: '.rij-titel' }).closest('li') as HTMLElement
    return rij.querySelector('.badge-laat')
  }

  it('zet een merkteken op de betwiste rij zelf', () => {
    toon({
      kosten: [{ ...openKost, reactie: { soort: 'betwist', op: '2026-03-10', bedrag: 10000, datum: '2026-03-04' } }],
    })
    expect(badgeVan('Schoolreis')).not.toBeNull()
    expect(badgeVan('Schoolreis')?.textContent).toBe('betwist')
  })

  it('laat een rij ongemerkt waarmee de andere ouder akkoord ging', () => {
    toon({
      kosten: [{ ...openKost, reactie: { soort: 'akkoord', op: '2026-03-10', bedrag: 10000, datum: '2026-03-04' } }],
    })
    expect(badgeVan('Schoolreis')).toBeNull()
  })

  it('laat een rij ongemerkt waarvan de betwisting vervallen is', () => {
    // ⚠ Dezelfde regel als bij het cijfer eronder: een bezwaar tegen € 100 is geen
    // bezwaar tegen € 400. Zouden de badge en de zin hier uit elkaar lopen, dan
    // wijst het merkteken naar een rij die in het bedrag niet als betwist telt.
    toon({
      kosten: [{ ...openKost, bedrag: 40000, reactie: { soort: 'betwist', op: '2026-03-10', bedrag: 10000, datum: '2026-03-04' } }],
    })
    expect(badgeVan('Schoolreis')).toBeNull()
  })

  it('meldt niets bij een kost waarmee de andere ouder akkoord ging', () => {
    toon({
      kosten: [{ ...openKost, reactie: { soort: 'akkoord', op: '2026-03-10', bedrag: 10000, datum: '2026-03-04' } }],
    })
    // Bewust de volledige regel: zou de bronregel helemaal verdwijnen, dan zou een
    // toets op de afwezigheid van "betwist" nog altijd slagen zonder iets te bewaken.
    expect(bron()).toBe(BASISZIN)
  })
})
