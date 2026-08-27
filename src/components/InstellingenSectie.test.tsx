import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import { InstellingenSectie } from './InstellingenSectie'
import { InstellingenProvider } from '../instellingen'

function toon(props: Partial<ComponentProps<typeof InstellingenSectie>> = {}) {
  const handlers = {
    taal: 'nl' as const,
    zetTaal: vi.fn(),
    verbonden: false,
    bezig: false,
    statusTekst: null,
    onVerbind: vi.fn(),
    onSynchroniseer: vi.fn(),
    backupTekst: null,
    onExporteer: vi.fn(),
    onHerstel: vi.fn(),
    kinderen: [],
    onKindToevoegen: vi.fn(),
    onKindWijzigen: vi.fn(),
    onKindVerwijderen: vi.fn(),
    onBeginOpnieuw: vi.fn(async () => ({ backupGewist: true })),
    ...props,
  }
  // Mét de Provider, zodat het scherm zich net zo gedraagt als in de app: een
  // gewijzigde waarschuwingsgrens blijft staan.
  render(
    <InstellingenProvider>
      <InstellingenSectie {...(handlers as ComponentProps<typeof InstellingenSectie>)} />
    </InstellingenProvider>,
  )
  return handlers
}

beforeEach(() => {
  localStorage.clear()
})

// ⚠ De versiekaart haalt `versie.json` op. Zonder deze opruiming lekt een gestubde
// `fetch` naar de volgende test — en dan slaagt een test om de verkeerde reden.
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InstellingenSectie', () => {
  it('wijzigt de taal', async () => {
    const user = userEvent.setup()
    const { zetTaal } = toon()
    await user.selectOptions(screen.getByLabelText('Taal'), 'en')
    expect(zetTaal).toHaveBeenCalledWith('en')
  })

  it('toont "Verbind met Google Drive" wanneer niet verbonden', () => {
    toon({ verbonden: false })
    expect(screen.getByRole('button', { name: 'Verbind met Google Drive' })).toBeInTheDocument()
  })

  it('toont "Synchroniseer nu" wanneer verbonden', () => {
    toon({ verbonden: true })
    expect(screen.getByRole('button', { name: 'Synchroniseer nu' })).toBeInTheDocument()
  })

  it('exporteert een back-up bij klik', async () => {
    const user = userEvent.setup()
    const { onExporteer } = toon()
    await user.click(screen.getByRole('button', { name: 'Exporteer back-up' }))
    expect(onExporteer).toHaveBeenCalled()
  })
})

// "Begin opnieuw": alles wissen kan pas na een bevestiging waarin je het woord
// WISSEN typt. Zo kost één misklik je nooit je gegevens.
describe('InstellingenSectie — begin opnieuw', () => {
  async function openBevestiging(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Begin opnieuw…' }))
  }

  it('toont "Alles wissen" pas na een klik op "Begin opnieuw…"', async () => {
    const user = userEvent.setup()
    toon()
    expect(screen.queryByRole('button', { name: 'Alles wissen' })).not.toBeInTheDocument()

    await openBevestiging(user)
    expect(screen.getByRole('button', { name: 'Alles wissen' })).toBeInTheDocument()
    expect(screen.getByLabelText('Typ WISSEN om te bevestigen')).toBeInTheDocument()
  })

  it('houdt "Alles wissen" uit tot het bevestigwoord klopt', async () => {
    const user = userEvent.setup()
    toon()
    await openBevestiging(user)

    const knop = screen.getByRole('button', { name: 'Alles wissen' })
    const veld = screen.getByLabelText('Typ WISSEN om te bevestigen')
    // ⚠ `aria-disabled` en niet `disabled` (ronde 61): met een echt uitgeschakelde
    // knop kwam je met een toetsenbord nooit langs deze knop, en hoorde je dus ook
    // nooit dát er een bevestiging nodig is. De handler houdt het wissen tegen.
    expect(knop).toHaveAttribute('aria-disabled', 'true')
    expect(knop).not.toBeDisabled()
    expect(knop).toHaveAttribute('aria-describedby', 'begin-opnieuw-reden')

    await user.type(veld, 'wis')
    expect(knop).toHaveAttribute('aria-disabled', 'true')

    // Kleine letters en spaties eromheen mogen: we vergelijken na trim + hoofdletters.
    await user.clear(veld)
    await user.type(veld, ' wissen ')
    expect(knop).toHaveAttribute('aria-disabled', 'false')

    // En een klik terwijl het woord NIET klopt, wist niets.
    await user.clear(veld)
    await user.click(knop)
    expect(screen.getByRole('button', { name: 'Alles wissen' })).toBeInTheDocument()
  })

  it('wist alles na bevestigen en meldt de schone lei', async () => {
    const user = userEvent.setup()
    const { onBeginOpnieuw } = toon({ onBeginOpnieuw: vi.fn(async () => ({ backupGewist: true })) })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(onBeginOpnieuw).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Alles is gewist. Je begint met een schone lei.')).toBeInTheDocument()
    // De bevestiging klapt weer dicht.
    expect(screen.queryByRole('button', { name: 'Alles wissen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Begin opnieuw…' })).toBeInTheDocument()
  })

  it('waarschuwt wanneer de back-up niet opgeruimd raakte terwijl Drive verbonden is', async () => {
    const user = userEvent.setup()
    toon({ verbonden: true, onBeginOpnieuw: vi.fn(async () => ({ backupGewist: false, backupFout: 'offline' })) })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(
      await screen.findByText(
        'Lokaal is alles gewist, maar de back-up kon niet opgeruimd worden. Verbind opnieuw en probeer het nog eens, anders komt je oude data bij de volgende synchronisatie terug.',
      ),
    ).toBeInTheDocument()
  })

  it('meldt enkel dit toestel wanneer er geen Drive-back-up verbonden is', async () => {
    const user = userEvent.setup()
    toon({ verbonden: false, onBeginOpnieuw: vi.fn(async () => ({ backupGewist: false })) })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(await screen.findByText('Alles is gewist op dit toestel.')).toBeInTheDocument()
  })

  it('meldt dat er niets gewist is wanneer het misloopt', async () => {
    const user = userEvent.setup()
    toon({
      onBeginOpnieuw: vi.fn(async () => {
        throw new Error('stuk')
      }),
    })
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Alles wissen' }))

    expect(await screen.findByText('Wissen is mislukt. Er is niets gewist.')).toBeInTheDocument()
  })

  it('sluit de bevestiging met "Annuleer" zonder te wissen', async () => {
    const user = userEvent.setup()
    const { onBeginOpnieuw } = toon()
    await openBevestiging(user)

    await user.type(screen.getByLabelText('Typ WISSEN om te bevestigen'), 'WISSEN')
    await user.click(screen.getByRole('button', { name: 'Annuleer' }))

    expect(onBeginOpnieuw).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Alles wissen' })).not.toBeInTheDocument()

    // Opnieuw openen begint met een leeg veld.
    await openBevestiging(user)
    expect(screen.getByLabelText('Typ WISSEN om te bevestigen')).toHaveValue('')
  })
})

// Ronde 17: de waarschuwingsgrens voor budgetten is instelbaar, en de app legt
// nu uit waar je gegevens staan.
describe('InstellingenSectie — meldingen en privacy', () => {
  it('laat de waarschuwingsgrens kiezen', async () => {
    const user = userEvent.setup()
    toon()
    const veld = screen.getByLabelText('Waarschuw vanaf')
    // Standaard staat ze op 85% — precies het gedrag van voorheen.
    expect(veld).toHaveValue('85')

    await user.selectOptions(veld, '70')
    expect(veld).toHaveValue('70')
  })

  it('zegt welke meldingen los van die grens staan', () => {
    toon()
    expect(
      screen.getByText(
        'Een overschreden budget, een garantie die bijna verloopt en een vaste last die nog niet geboekt is, meldt de app altijd — die staan los van deze keuze.',
      ),
    ).toBeInTheDocument()
  })

  it('legt in klare taal uit waar de gegevens staan', () => {
    toon()
    expect(screen.getByText('Je gegevens en je privacy')).toBeInTheDocument()
    expect(screen.getByText('Alles staat op dit toestel')).toBeInTheDocument()
    expect(screen.getByText('De back-up staat in jouw Google Drive')).toBeInTheDocument()
    expect(screen.getByText('Wat er wél het toestel verlaat')).toBeInTheDocument()
    expect(screen.getByText('Geen advertenties, geen doorverkoop')).toBeInTheDocument()
  })

  it('verzwijgt niet dat de Drive-back-up niet extra versleuteld is', () => {
    toon()
    expect(screen.getByText(/niet extra versleuteld/)).toBeInTheDocument()
  })
})


describe('InstellingenSectie — "Wat wil je zien?" (ronde 75)', () => {
  it('zet de kaart op de pagina', () => {
    // ⚠ Dit is de ENIGE plek waar je een uitgezette pagina kan terugzetten. Haalde
    // iemand de kaart hier weg, dan had de gebruiker geen weg terug — precies de val
    // die deze ronde moest uitroeien. En geen enkele test merkte het.
    toon()
    expect(screen.getByRole('heading', { name: 'Wat wil je zien?' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Analyse' })).toBeInTheDocument()
  })

  it('bewaart een uitgezette pagina, ook na hertekenen', async () => {
    // De volledige lus: vinkje uit → de context schrijft het weg → de kaart leest het
    // terug. Zonder deze test was de hele bedrading van deze ronde ongedekt.
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('checkbox', { name: 'Analyse' }))
    expect(screen.getByRole('checkbox', { name: 'Analyse' })).not.toBeChecked()
    expect(JSON.parse(localStorage.getItem('fk_verborgen_paginas') ?? '[]')).toEqual(['analyse'])
  })

  // --- Ronde 99: welke versie draai je? ------------------------------------
  //
  // ⚠ De bouwdatum komt uit `versie.json`, dat de bouwstap maakt. In de testomgeving
  // draait die stap niet, dus moet een test hem zelf aanreiken. Dat is meteen het bewijs
  // dat de kaart écht van dat bestand afhangt.
  function stubVersieBestand(inhoud: unknown | null) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        inhoud === null
          ? ({ ok: false, json: async () => ({}) } as unknown as Response)
          : ({ ok: true, json: async () => inhoud } as unknown as Response),
      ),
    )
  }

  it('zegt wanneer deze versie gebouwd is', async () => {
    // ⚠ Timothy zag na een publicatie nog de oude app en had geen enkele manier om na te
    // kijken waar hij stond. Een balk die zegt "er is een nieuwe versie" is pas te
    // vertrouwen wanneer je ook kan zien wélke je nu hebt.
    stubVersieBestand({ gebouwd: '2026-08-27T01:12:00.000Z' })
    toon()
    expect(await screen.findByRole('heading', { name: 'Deze versie' })).toBeInTheDocument()
    expect(screen.getByText(/^Deze versie is van /)).toHaveTextContent('2026')
  })

  it('laat de kaart WEG wanneer er geen versiebestand is', async () => {
    // ⚠ De ontwikkelserver draait de bouwstap niet, en offline is het bestand er vóór de
    // eerste cache evenmin. Liever niets tonen dan een lege of verzonnen datum.
    //
    // ⚠ Deze tak was in mijn eerste opzet ONBEREIKBAAR — de bouwtijd zat toen via een
    // `define` in de code en was dus altijd ingevuld, ook in de tests. Een doorlichting
    // wees dat aan: het commentaar verantwoordde een geval dat niet kon voorkomen.
    stubVersieBestand(null)
    toon()
    await screen.findByRole('heading', { name: 'Begin opnieuw' })
    expect(screen.queryByRole('heading', { name: 'Deze versie' })).toBeNull()
  })

  it('zet die kaart NIET onder "Begin opnieuw"', async () => {
    // ⚠ De zin boven deze pagina belooft dat de knop die alles wist helemaal onderaan
    // staat (ronde 66, en ronde 75 liep tegen precies die belofte aan). Een nieuwe kaart
    // eronder maakt die zin onwaar — en dat is de fout die deze pagina al twee keer
    // gemaakt heeft.
    stubVersieBestand({ gebouwd: '2026-08-27T01:12:00.000Z' })
    toon()
    const versie = await screen.findByRole('heading', { name: 'Deze versie' })
    const opnieuw = screen.getByRole('heading', { name: 'Begin opnieuw' })
    expect(versie.compareDocumentPosition(opnieuw) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('noemt de nieuwe kaart ook in de wegwijzer bovenaan', async () => {
    // ⚠ Diezelfde zin is al twee keer onwaar geworden doordat er een kaart bijkwam
    // (ronde 66 en 75). Een wegwijzer die een kaart overslaat, is dezelfde fout.
    stubVersieBestand({ gebouwd: '2026-08-27T01:12:00.000Z' })
    toon()
    expect(screen.getByText(/welke versie je draait/)).toBeInTheDocument()
  })

  it('noemt de kaart in de zin onder de titel', () => {
    // ⚠ Ronde 66 zette die zin al eens recht ("een wegwijzer die zelf de weg kwijt is,
    // is erger dan geen wegwijzer") en ronde 75 brak hem opnieuw door er een kaart
    // vóór te zetten. Deze test is het vangnet daartegen.
    toon()
    expect(screen.getByText(/kies je wat je in de app wil zien/)).toBeInTheDocument()
  })
})
