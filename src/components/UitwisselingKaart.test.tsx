import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UitwisselingKaart } from './UitwisselingKaart'
import type { Dossier, GedeeldeKost, Kind } from '../data/schema'
import { bouwUitwisselBestand, naarEigenKost } from '../utils/uitwisseling'
import { formatEuro } from '../utils/format'

const VANDAAG = '2026-08-12'

const dossier: Dossier = { id: 'd1', naam: 'Kinderen', aandeelJij: 50 }
const kinderen: Kind[] = [{ id: 'kind-a', naam: 'Lena' }]

const kost = (over: Partial<GedeeldeKost> = {}): GedeeldeKost => ({
  id: 'k1',
  dossierId: 'd1',
  omschrijving: 'Turnpak',
  bedrag: 4000,
  betaaldDoor: 'jij',
  datum: '2026-07-03',
  ...over,
})

function toon(kosten: GedeeldeKost[] = [], over: Partial<Dossier> = {}) {
  const onKostenBewaren = vi.fn().mockResolvedValue(undefined)
  const resultaat = render(
    <UitwisselingKaart
      dossier={{ ...dossier, ...over }}
      dossiers={[dossier]}
      kosten={kosten}
      verrekeningen={[]}
      kinderen={kinderen}
      categorieen={[]}
      onKostenBewaren={onKostenBewaren}
      vandaagISO={VANDAAG}
    />,
  )
  return { ...resultaat, onKostenBewaren }
}

// Bouwt een bestand alsof de ANDERE ouder het klaarzette, en maakt er een File van.
function bestandVanAndereOuder(kosten: GedeeldeKost[], keuze = {}): File {
  const anderDossier: Dossier = { id: 'ander', naam: 'Kinderen', aandeelJij: 50 }
  const { bestand } = bouwUitwisselBestand(
    anderDossier,
    kosten.map((k) => ({ ...k, dossierId: 'ander' })),
    [],
    [],
    `${VANDAAG}T09:00:00.000Z`,
    keuze,
  )
  return new File([JSON.stringify(bestand)], 'uitwisseling.json', { type: 'application/json' })
}

let download: ReturnType<typeof vi.fn>

beforeEach(() => {
  download = vi.fn()
  // jsdom kent createObjectURL niet; we vangen de download af op de klik.
  Object.defineProperty(HTMLAnchorElement.prototype, 'click', { value: download, configurable: true })
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:nep')
  globalThis.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UitwisselingKaart — doorsturen', () => {
  it('zegt dicht al wat er zou meegaan', () => {
    const { container } = toon([kost()])
    expect(container.textContent).toContain('1 kost(en) klaar om door te sturen')
    expect(container.textContent).toContain(formatEuro(4000))
  })

  it('telt standaard alleen wat jij betaalde', () => {
    // Twee ouders die elk hun eigen uitgaven sturen, hebben samen het volledige
    // dossier en niets dubbel.
    const { container } = toon([kost({ id: 'k1' }), kost({ id: 'k2', betaaldDoor: 'partner' })])
    expect(container.textContent).toContain('1 kost(en) klaar om door te sturen')
  })

  it('telt de kosten van de partner mee zodra je dat aanvinkt', async () => {
    const gebruiker = userEvent.setup()
    const { container } = toon([kost({ id: 'k1' }), kost({ id: 'k2', betaaldDoor: 'partner' })])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.click(screen.getByLabelText(/Ook de kosten meesturen/))
    expect(container.textContent).toContain('Er gaan 2 kost(en) mee')
  })

  it('zegt het eerlijk wanneer er niets door te sturen valt', () => {
    const { container } = toon([])
    expect(container.textContent).toContain('Niets om door te sturen')
  })
})

describe('UitwisselingKaart — inlezen', () => {
  it('verandert niets voor je bevestigt', async () => {
    const gebruiker = userEvent.setup()
    const { onKostenBewaren, container } = toon([])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(bestandInvoer(), bestandVanAndereOuder([kost({ id: 'a-1' })]))

    expect(container.textContent).toContain('Nieuw voor jou')
    expect(onKostenBewaren).not.toHaveBeenCalled()
  })

  it('keert het perspectief om bij het overnemen', async () => {
    // De kost die de andere ouder betaalde, staat bij jou als 'betaald door partner'.
    const gebruiker = userEvent.setup()
    const { onKostenBewaren } = toon([])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(bestandInvoer(), bestandVanAndereOuder([kost({ id: 'a-1' })]))
    await gebruiker.click(screen.getByRole('button', { name: 'Neem over' }))

    const bewaard: GedeeldeKost[] = onKostenBewaren.mock.calls[0][0]
    expect(bewaard).toHaveLength(1)
    expect(bewaard[0].betaaldDoor).toBe('partner')
    expect(bewaard[0].uitwisselId).toBe('a-1')
    expect(bewaard[0].id).not.toBe('a-1')
    expect(bewaard[0].dossierId).toBe('d1')
  })

  it('vinkt een vermoedelijke dubbel NIET vooraf aan', async () => {
    // Hem stil overnemen zou hetzelfde geld twee keer tellen.
    const gebruiker = userEvent.setup()
    const { onKostenBewaren, container } = toon([kost({ id: 'eigen', betaaldDoor: 'partner' })])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(bestandInvoer(), bestandVanAndereOuder([kost({ id: 'a-1' })]))

    expect(container.textContent).toContain('Lijkt op een kost die je al hebt')
    await gebruiker.click(screen.getByRole('button', { name: 'Neem over' }))
    expect(onKostenBewaren).not.toHaveBeenCalled()
  })

  it('legt de twee saldo-uitkomsten naast elkaar', async () => {
    const gebruiker = userEvent.setup()
    const { container } = toon([])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(bestandInvoer(), bestandVanAndereOuder([kost({ id: 'a-1', bedrag: 2501 })]))
    expect(container.textContent).toContain('Eén cent verschil')
  })

  it('weigert een bestand dat geen uitwisseling is', async () => {
    const gebruiker = userEvent.setup()
    const { container } = toon([])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    const rommel = new File(['{"app":"iets anders"}'], 'x.json', { type: 'application/json' })
    await gebruiker.upload(bestandInvoer(), rommel)
    expect(container.textContent).toContain('geen uitwisselbestand')
    expect(screen.queryByRole('button', { name: 'Neem over' })).not.toBeInTheDocument()
  })

  it('meldt een afwijkende verdeelsleutel in plaats van hem stil over te nemen', async () => {
    const gebruiker = userEvent.setup()
    const anderDossier: Dossier = { id: 'ander', naam: 'Kinderen', aandeelJij: 60 }
    const { bestand } = bouwUitwisselBestand(
      anderDossier,
      [kost({ id: 'a-1', dossierId: 'ander' })],
      [],
      [],
      `${VANDAAG}T09:00:00.000Z`,
    )
    const { container } = toon([])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(
      bestandInvoer(),
      new File([JSON.stringify(bestand)], 'u.json', { type: 'application/json' }),
    )
    expect(container.textContent).toContain('andere verdeelsleutel')
  })
})

describe('UitwisselingKaart — antwoorden', () => {
  const ingelezen = () =>
    naarEigenKost(
      {
        id: 'a-1',
        omschrijving: 'Schoolreis',
        bedrag: 6000,
        datum: '2026-07-10',
        betaaldDoorAfzender: true,
        aandeelAfzender: 50,
      },
      'd1',
      [],
      'b-1',
    )

  it('bewaart een betwisting met de reden erbij', async () => {
    const gebruiker = userEvent.setup()
    const { onKostenBewaren } = toon([ingelezen()])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.type(screen.getByLabelText(/Reden om Schoolreis te betwisten/), 'Dit betaalde ik zelf')
    await gebruiker.click(screen.getByRole('button', { name: 'Betwist' }))

    const bewaard: GedeeldeKost[] = onKostenBewaren.mock.calls[0][0]
    expect(bewaard[0].reactie).toMatchObject({ soort: 'betwist', reden: 'Dit betaalde ik zelf', op: VANDAAG })
    // Waarop het antwoord sloeg, zodat het vervalt als de kost nadien wijzigt.
    expect(bewaard[0].reactie?.bedrag).toBe(6000)
  })

  it('vraagt geen reden bij een akkoord', async () => {
    const gebruiker = userEvent.setup()
    const { onKostenBewaren } = toon([ingelezen()])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.click(screen.getByRole('button', { name: 'Akkoord' }))
    expect(onKostenBewaren.mock.calls[0][0][0].reactie).toMatchObject({ soort: 'akkoord' })
  })

  it('zegt dicht al dat er iets op je antwoord wacht', () => {
    const { container } = toon([ingelezen()])
    expect(container.textContent).toContain('wachten op je antwoord')
  })

  it('meldt het bovenaan wanneer de andere ouder iets betwist', () => {
    const betwist = kost({
      id: 'k1',
      reactie: { soort: 'betwist', op: VANDAAG, bedrag: 4000, datum: '2026-07-03' },
    })
    const { container } = toon([betwist])
    expect(container.textContent).toContain('betwist 1 kost(en)')
  })

  it('raadt aan te betwisten in plaats van te verwijderen', async () => {
    // Verwijderen helpt niet: bij de volgende uitwisseling komt de kost terug.
    const gebruiker = userEvent.setup()
    const { container } = toon([ingelezen()])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(container.textContent).toContain('liever dan hem te verwijderen')
  })
})

describe('UitwisselingKaart — intrekkingen en antwoorden komen altijd mee', () => {
  it('neemt een antwoord van de andere ouder over zonder dat je iets moet aanvinken', async () => {
    const gebruiker = userEvent.setup()
    const eigen = kost({ id: 'k1' })

    // De andere ouder heeft jouw kost ingelezen en betwist.
    const bijHem = naarEigenKost(
      { id: 'k1', omschrijving: 'Turnpak', bedrag: 4000, datum: '2026-07-03', betaaldDoorAfzender: true, aandeelAfzender: 50 },
      'ander',
      [],
      'hun-1',
    )
    const metAntwoord: GedeeldeKost = {
      ...bijHem,
      reactie: { soort: 'betwist', op: VANDAAG, reden: 'Niet afgesproken', bedrag: 4000, datum: '2026-07-03' },
    }
    const { bestand } = bouwUitwisselBestand(
      { id: 'ander', naam: 'Kinderen', aandeelJij: 50 },
      [metAntwoord],
      [],
      [],
      `${VANDAAG}T09:00:00.000Z`,
    )

    const { onKostenBewaren, container } = toon([eigen])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(
      bestandInvoer(),
      new File([JSON.stringify(bestand)], 'u.json', { type: 'application/json' }),
    )
    expect(container.textContent).toContain('1 antwoord(en) op jouw kosten')

    await gebruiker.click(screen.getByRole('button', { name: 'Neem over' }))
    const bewaard: GedeeldeKost[] = onKostenBewaren.mock.calls[0][0]
    expect(bewaard).toHaveLength(1)
    expect(bewaard[0].id).toBe('k1')
    expect(bewaard[0].reactie).toMatchObject({ soort: 'betwist', reden: 'Niet afgesproken' })
  })
})

describe('UitwisselingKaart — één gevulde knop', () => {
  it('heeft hoogstens één knop-primair op het scherm', async () => {
    // DESIGN.md: hoogstens één gevulde knop per scherm.
    const gebruiker = userEvent.setup()
    const { container } = toon([kost()])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(bestandInvoer(), bestandVanAndereOuder([kost({ id: 'a-1' })]))
    expect(within(container).queryAllByRole('button').filter((b) => b.className.includes('knop-primair'))).toHaveLength(1)
  })
})

function bestandInvoer(): HTMLInputElement {
  const invoer = document.querySelector('input[type="file"]')
  if (!invoer) throw new Error('geen bestandsveld gevonden')
  return invoer as HTMLInputElement
}

describe('UitwisselingKaart — wat de review na het bouwen ving', () => {
  it('schrijft per kost ÉÉN eindtoestand weg', async () => {
    // Een wijziging én een antwoord op dezelfde kost werden allebei vanaf de
    // OORSPRONKELIJKE kost gebouwd. Het logboek is last-writer-wins per id, dus de
    // tweede gooide het werk van de eerste weg: het scherm beloofde € 50 en in de
    // database stond € 40.
    const gebruiker = userEvent.setup()
    const eigen = kost({ id: 'k1', bedrag: 4000, betaaldDoor: 'partner' })

    const bijHem = naarEigenKost(
      { id: 'k1', omschrijving: 'Turnpak', bedrag: 5000, datum: '2026-07-03', betaaldDoorAfzender: false, aandeelAfzender: 50 },
      'ander',
      [],
      'hun-1',
    )
    const metAntwoord: GedeeldeKost = {
      ...bijHem,
      bedrag: 5000,
      reactie: { soort: 'betwist', op: VANDAAG, reden: 'Te duur', bedrag: 5000, datum: '2026-07-03' },
    }
    const { bestand } = bouwUitwisselBestand(
      { id: 'ander', naam: 'Kinderen', aandeelJij: 50 },
      [metAntwoord],
      [],
      [],
      `${VANDAAG}T09:00:00.000Z`,
      { ookVanPartner: true },
    )

    const { onKostenBewaren } = toon([eigen])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(
      bestandInvoer(),
      new File([JSON.stringify(bestand)], 'u.json', { type: 'application/json' }),
    )
    await gebruiker.click(screen.getByRole('button', { name: 'Neem over' }))

    const bewaard: GedeeldeKost[] = onKostenBewaren.mock.calls[0][0]
    const voorK1 = bewaard.filter((k) => k.id === 'k1')
    expect(voorK1).toHaveLength(1)
    // Allebei aanwezig: het nieuwe bedrag én het antwoord.
    expect(voorK1[0].bedrag).toBe(5000)
    expect(voorK1[0].reactie).toMatchObject({ soort: 'betwist' })
  })

  it('vinkt een wijziging op een kost die JIJ betaalde niet vooraf aan', async () => {
    // Over een kost die jij betaalde en waarvan jij de bon hebt, is de andere
    // ouder niet de bron van waarheid: een bestand mocht € 400 niet stil op € 1
    // kunnen zetten.
    const gebruiker = userEvent.setup()
    const eigen = kost({ id: 'k1', bedrag: 40000, betaaldDoor: 'jij' })
    const { bestand } = bouwUitwisselBestand(
      { id: 'ander', naam: 'Kinderen', aandeelJij: 50 },
      [{ ...eigen, dossierId: 'ander', bedrag: 100 }],
      [],
      [],
      `${VANDAAG}T09:00:00.000Z`,
    )
    const { onKostenBewaren, container } = toon([eigen])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(
      bestandInvoer(),
      new File([JSON.stringify(bestand)], 'u.json', { type: 'application/json' }),
    )
    expect(container.textContent).toContain('Gewijzigd door de andere ouder')
    await gebruiker.click(screen.getByRole('button', { name: 'Neem over' }))
    expect(onKostenBewaren).not.toHaveBeenCalled()
  })

  it('koppelt een dubbel in plaats van er een tweede kost bij te zetten', async () => {
    const gebruiker = userEvent.setup()
    const eigen = kost({ id: 'b-eigen', betaaldDoor: 'partner' })
    const { onKostenBewaren } = toon([eigen])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(bestandInvoer(), bestandVanAndereOuder([kost({ id: 'a-1' })]))
    await gebruiker.click(screen.getByRole('button', { name: 'Dit is dezelfde' }))
    await gebruiker.click(screen.getByRole('button', { name: 'Neem over' }))

    const bewaard: GedeeldeKost[] = onKostenBewaren.mock.calls[0][0]
    expect(bewaard).toHaveLength(1)
    expect(bewaard[0].id).toBe('b-eigen')
    expect(bewaard[0].uitwisselId).toBe('a-1')
  })

  it('laat een ingetrokken kost zien en terugdraaien', async () => {
    // Uit isOpenKost vallen betekent uit de lijst en uit het saldo vallen. Zonder
    // dit blok is er geld weg zonder dat je ziet waarheen, en zonder weg terug.
    const gebruiker = userEvent.setup()
    const ingetrokken: GedeeldeKost = { ...kost({ id: 'k1' }), uitwisselId: 'a-1', ingetrokken: true }
    const { onKostenBewaren, container } = toon([ingetrokken])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(container.textContent).toContain('telt niet mee in het saldo')
    await gebruiker.click(screen.getByRole('button', { name: 'Terugdraaien' }))
    expect(onKostenBewaren.mock.calls[0][0][0].ingetrokken).toBeUndefined()
  })

  it('laat je een eigen kost intrekken in plaats van hem te verwijderen', async () => {
    const gebruiker = userEvent.setup()
    const beantwoord = kost({
      id: 'k1',
      reactie: { soort: 'betwist', op: VANDAAG, reden: 'Niet afgesproken', bedrag: 4000, datum: '2026-07-03' },
    })
    const { onKostenBewaren, container } = toon([beantwoord])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(container.textContent).toContain('Niet afgesproken')
    await gebruiker.click(screen.getByRole('button', { name: 'Intrekken' }))
    expect(onKostenBewaren.mock.calls[0][0][0].ingetrokken).toBe(true)
  })

  it('zegt erbij dat het saldo alleen over dit bestand gaat', async () => {
    const gebruiker = userEvent.setup()
    const { container } = toon([])
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.upload(bestandInvoer(), bestandVanAndereOuder([kost({ id: 'a-1' })]))
    expect(container.textContent).toContain('Je eigen kosten zitten er niet in')
  })
})

