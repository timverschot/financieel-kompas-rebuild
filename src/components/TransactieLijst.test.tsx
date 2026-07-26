import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactieLijst, aantalActieveFilters, uitsplitsingTekst } from './TransactieLijst'
import type { Transactie } from '../data/schema'
import { vandaag } from '../utils/datum'

const rekeningen = [
  { id: 'r1', naam: 'Betaal', beginsaldo: 0 },
  { id: 'r2', naam: 'Spaar', beginsaldo: 0 },
]

// Een 'recente' datum (vandaag) zodat de transactie zeker binnen het historiek-
// venster van 6 maanden valt, ongeacht de systeemklok waarop de test draait.
const recent = vandaag()

const tx = (extra: Partial<Transactie> & { id: string }): Transactie => ({
  datum: recent,
  omschrijving: 'Winkel',
  bedrag: -1000,
  rekeningId: 'r1',
  ...extra,
})

function toon(transacties: Transactie[]) {
  const onBewerk = vi.fn()
  const onVerwijder = vi.fn()
  render(<TransactieLijst transacties={transacties} categorieen={[]} rekeningen={rekeningen} onBewerk={onBewerk} onVerwijder={onVerwijder} />)
  return { onBewerk, onVerwijder }
}

// Zoek, richting, rekening, sortering en de maandschakelaar staan sinds ronde 24
// altijd open. Categorie en het datumbereik zitten achter 'Meer filters'; deze
// helper doet wat de gebruiker dan doet.
async function klapFiltersOpen(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Meer filters/ }))
}

// De meta-regel (datum · categorie · rekening, of de uitsplitsing) van een rij.
function metaVan(omschrijving: string): string {
  const rij = screen.getByText(omschrijving).closest('li') as HTMLElement
  return rij.querySelector('.rij-meta')?.textContent ?? ''
}

// Het vierkantje links in de rij (icoon of beginletter).
function tekenVan(omschrijving: string): string {
  const rij = screen.getByText(omschrijving).closest('li') as HTMLElement
  return rij.querySelector('.rij-teken')?.textContent ?? ''
}

describe('TransactieLijst', () => {
  it('zoekt op omschrijving', async () => {
    const user = userEvent.setup()
    toon([
      tx({ id: '1', omschrijving: 'Colruyt' }),
      tx({ id: '2', omschrijving: 'Delhaize' }),
    ])
    expect(screen.getByText('Colruyt')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Zoek in transacties'), 'delh')
    expect(screen.queryByText('Colruyt')).not.toBeInTheDocument()
    expect(screen.getByText('Delhaize')).toBeInTheDocument()
  })

  it('filtert op richting inkomsten', async () => {
    const user = userEvent.setup()
    toon([
      tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 }),
      tx({ id: '2', omschrijving: 'Winkel', bedrag: -3000 }),
    ])
    // De richting staat nu meteen in de balk: geen klik om ze te vinden.
    await user.selectOptions(screen.getByLabelText('Richting'), 'in')
    expect(screen.getByText('Loon')).toBeInTheDocument()
    expect(screen.queryByText('Winkel')).not.toBeInTheDocument()
  })

  it('verbergt oude transacties standaard en toont ze op aanvraag', async () => {
    const user = userEvent.setup()
    // Een heel oude transactie (2019) valt buiten het venster van 6 maanden.
    toon([
      tx({ id: 'oud', omschrijving: 'AntiekeAankoop', datum: '2019-01-01' }),
      tx({ id: 'nieuw', omschrijving: 'RecenteAankoop' }),
    ])
    expect(screen.queryByText('AntiekeAankoop')).not.toBeInTheDocument()
    const knop = screen.getByRole('button', { name: /Toon oudere transacties/ })
    await user.click(knop)
    expect(screen.getByText('AntiekeAankoop')).toBeInTheDocument()
  })

  it('roept onVerwijder aan met het juiste id', async () => {
    const user = userEvent.setup()
    const { onVerwijder } = toon([tx({ id: '1', omschrijving: 'Colruyt' })])
    const rij = screen.getByText('Colruyt').closest('li') as HTMLElement
    await user.click(within(rij).getByRole('button', { name: 'Verwijder Colruyt' }))
    expect(onVerwijder).toHaveBeenCalledWith('1')
  })
})

describe('TransactieLijst — het teken links in de rij', () => {
  it('toont het icoon van de hoofdcategorie bij een gewone transactie', () => {
    toon([tx({ id: '1', omschrijving: 'Colruyt', categorieId: 'ov-voeding' })])
    expect(tekenVan('Colruyt')).toBe('🍽️')
  })

  it('toont het winkelkar-icoon bij een gesplitst kassaticket', () => {
    toon([
      tx({
        id: '1',
        omschrijving: 'Colruyt',
        bedrag: -5380,
        regels: [
          { categorieId: 'ov-voeding', bedrag: -4120 },
          { categorieId: 'ov-huishouden-en-verzorging', bedrag: -1260 },
        ],
      }),
    ])
    expect(tekenVan('Colruyt')).toBe('🛒')
  })

  it('behandelt een ticket met regels binnen één hoofdcategorie als gewoon', () => {
    toon([
      tx({
        id: '1',
        omschrijving: 'Colruyt',
        bedrag: -3000,
        regels: [
          { categorieId: 'ov-voeding', bedrag: -2000 },
          { categorieId: 'ov-voeding', bedrag: -1000 },
        ],
      }),
    ])
    expect(tekenVan('Colruyt')).toBe('🍽️')
  })

  it('valt terug op de beginletter zonder categorie', () => {
    toon([tx({ id: '1', omschrijving: 'winkelke' })])
    expect(tekenVan('winkelke')).toBe('W')
  })

  it('valt terug op de beginletter bij een eigen categorie zonder icoon', () => {
    const onBewerk = vi.fn()
    const onVerwijder = vi.fn()
    render(
      <TransactieLijst
        transacties={[tx({ id: '1', omschrijving: 'Poetsvrouw', categorieId: 'eigen-1' })]}
        categorieen={[{ id: 'eigen-1', naam: 'Hulp in huis' }]}
        rekeningen={rekeningen}
        onBewerk={onBewerk}
        onVerwijder={onVerwijder}
      />,
    )
    expect(tekenVan('Poetsvrouw')).toBe('P')
  })
})

describe('TransactieLijst — de meta-regel', () => {
  it('toont datum, categorie en rekening bij een gewone transactie', () => {
    toon([tx({ id: '1', omschrijving: 'Colruyt', categorieId: 'ov-voeding' })])
    const meta = metaVan('Colruyt')
    expect(meta).toContain(recent)
    expect(meta).toContain('Voeding')
    expect(meta).toContain('Betaal')
  })

  it('toont de uitsplitsing met bedragen bij een gesplitst ticket', () => {
    toon([
      tx({
        id: '1',
        omschrijving: 'Colruyt',
        bedrag: -5380,
        regels: [
          { categorieId: 'ov-voeding', bedrag: -4120 },
          { categorieId: 'ov-huishouden-en-verzorging', bedrag: -1260 },
        ],
      }),
    ])
    const meta = metaVan('Colruyt')
    expect(meta).toContain('🍽️ Voeding')
    expect(meta).toContain('41,20')
    expect(meta).toContain('🧹 Huishouden en Verzorging')
    expect(meta).toContain('12,60')
    // Twee groepen: niets af te kappen.
    expect(meta).not.toContain('+1')
  })

  it('kapt af met +n vanaf drie groepen', () => {
    toon([
      tx({
        id: '1',
        omschrijving: 'Colruyt',
        bedrag: -6380,
        regels: [
          { categorieId: 'ov-voeding', bedrag: -4120 },
          { categorieId: 'ov-huishouden-en-verzorging', bedrag: -1260 },
          { categorieId: 'ov-huisdieren', bedrag: -1000 },
        ],
      }),
    ])
    expect(metaVan('Colruyt')).toContain('+1')
  })

  it('uitsplitsingTekst zet de bedragen zonder minteken en kapt af', () => {
    const groepen = [
      { sleutel: 'a', naam: 'Voeding', kleur: '#F59E0B', icoon: '🍽️', bedrag: -4120 },
      { sleutel: 'b', naam: 'Huishouden', kleur: '#6B7280', icoon: '🧹', bedrag: -1260 },
      { sleutel: 'c', naam: 'Huisdieren', kleur: '#92400E', icoon: '🐾', bedrag: -1000 },
    ]
    const tekst = uitsplitsingTekst(groepen)
    expect(tekst).not.toContain('-')
    expect(tekst).toContain('🍽️ Voeding')
    expect(tekst).toContain('🧹 Huishouden')
    expect(tekst).not.toContain('Huisdieren')
    expect(tekst.endsWith('+1')).toBe(true)
  })
})

describe('TransactieLijst — de open filterbalk', () => {
  it('zet zoeken, richting, rekening en sorteren meteen op het scherm', () => {
    toon([tx({ id: '1' })])
    // Voorheen zaten deze drie achter een knop "Filters": twee klikken vóór je
    // zag wat je kon.
    expect(screen.getByLabelText('Zoek in transacties')).toBeInTheDocument()
    expect(screen.getByLabelText('Richting')).toBeInTheDocument()
    expect(screen.getByLabelText('Rekening')).toBeInTheDocument()
    expect(screen.getByLabelText('Sorteer op')).toBeInTheDocument()
  })

  it('houdt categorie en datumbereik achter "Meer filters"', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1' })])
    expect(screen.queryByLabelText('Van')).not.toBeInTheDocument()

    await klapFiltersOpen(user)
    expect(screen.getByLabelText('Hoofdcategorie')).toBeInTheDocument()
    expect(screen.getByLabelText('Van')).toBeInTheDocument()

    await klapFiltersOpen(user)
    expect(screen.queryByLabelText('Van')).not.toBeInTheDocument()
  })

  it('toont elk actief filter als chip, ook de altijd zichtbare', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 })])

    await user.selectOptions(screen.getByLabelText('Richting'), 'in')
    await user.selectOptions(screen.getByLabelText('Rekening'), 'r1')

    expect(screen.getByRole('button', { name: 'Wis filter Inkomsten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wis filter Betaal' })).toBeInTheDocument()
  })

  it('wist met de × van een chip enkel dat ene filter', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 })])
    await user.selectOptions(screen.getByLabelText('Richting'), 'in')
    await user.selectOptions(screen.getByLabelText('Rekening'), 'r1')

    await user.click(screen.getByRole('button', { name: 'Wis filter Inkomsten' }))

    expect(screen.queryByRole('button', { name: 'Wis filter Inkomsten' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wis filter Betaal' })).toBeInTheDocument()
  })

  it('telt op de knop alleen de filters die eronder verstopt zitten', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1' })])
    // Richting staat zichtbaar in de balk, dus die hoort niet in de teller.
    await user.selectOptions(screen.getByLabelText('Richting'), 'in')
    expect(screen.getByRole('button', { name: 'Meer filters' })).toBeInTheDocument()

    await klapFiltersOpen(user)
    await user.selectOptions(screen.getByLabelText('Hoofdcategorie'), 'ov-voeding')
    expect(screen.getByRole('button', { name: 'Meer filters · 1' })).toBeInTheDocument()
  })

  it('staat al open wanneer er bij het laden een verborgen filter actief is', () => {
    render(
      <TransactieLijst
        transacties={[tx({ id: '1' })]}
        categorieen={[]}
        rekeningen={rekeningen}
        onBewerk={vi.fn()}
        onVerwijder={vi.fn()}
        beginFilter={{ hoofdId: 'ov-voeding' }}
      />,
    )
    expect(screen.getByLabelText('Van')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Meer filters · 1' })).toBeInTheDocument()
  })

  it('aantalActieveFilters telt enkel wat achter de knop zit', () => {
    expect(aantalActieveFilters({})).toBe(0)
    expect(aantalActieveFilters({ zoek: 'colruyt' })).toBe(0)
    // Zoek, richting, rekening en maand staan zichtbaar in de balk.
    expect(aantalActieveFilters({ richting: 'uit', rekeningId: 'r1', maand: '2026-07' })).toBe(0)
    expect(aantalActieveFilters({ hoofdId: 'ov-voeding', catId: 'cat-x', van: '2026-01-01', tot: '2026-02-01' })).toBe(4)
  })
})

// Het venster van zes maanden verborg oudere boekingen zonder dat te zeggen, en de
// knop om het uit te klappen stond onderaan een lange lijst. Boek je iets van vorig
// jaar, dan leek het alsof je invoer niet bewaard was.
describe('TransactieLijst — het venster van zes maanden', () => {
  const lang = '2020-03-04' // ruim buiten elk venster

  it('meldt bovenaan hoeveel boekingen erbuiten vallen', () => {
    toon([tx({ id: 'nieuw' }), tx({ id: 'oud', datum: lang })])
    const melding = document.querySelector('[data-venstermelding]') as HTMLElement
    expect(melding).not.toBeNull()
    expect(melding.textContent).toContain('1 oudere boeking(en) vallen buiten dit venster van 6 maanden.')
  })

  it('zwijgt wanneer alles binnen het venster valt', () => {
    toon([tx({ id: 'nieuw' })])
    expect(document.querySelector('[data-venstermelding]')).toBeNull()
  })

  it('toont de oudere boekingen na een klik op "Toon ze ook"', async () => {
    const user = userEvent.setup()
    toon([tx({ id: 'nieuw', omschrijving: 'Vandaag' }), tx({ id: 'oud', datum: lang, omschrijving: 'Lang geleden' })])
    expect(screen.queryByText('Lang geleden')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toon ze ook' }))
    expect(screen.getByText('Lang geleden')).toBeInTheDocument()
  })

  it('klapt het venster ZELF open zodra er een oudere boeking bijkomt', () => {
    const eerste = [tx({ id: 'nieuw', omschrijving: 'Vandaag' })]
    const { rerender } = render(
      <TransactieLijst transacties={eerste} categorieen={[]} rekeningen={rekeningen} onBewerk={vi.fn()} onVerwijder={vi.fn()} />,
    )
    expect(screen.queryByText('Lang geleden')).not.toBeInTheDocument()

    // Nu komt er een boeking bij met een datum buiten het venster.
    rerender(
      <TransactieLijst
        transacties={[...eerste, tx({ id: 'oud', datum: lang, omschrijving: 'Lang geleden' })]}
        categorieen={[]}
        rekeningen={rekeningen}
        onBewerk={vi.fn()}
        onVerwijder={vi.fn()}
      />,
    )
    expect(screen.getByText('Lang geleden')).toBeInTheDocument()
  })

  it('klapt NIET open wanneer een oudere boeking er al bij de eerste weergave stond', () => {
    // Anders zou het venster altijd meteen opengaan en had het geen zin.
    toon([tx({ id: 'nieuw', omschrijving: 'Vandaag' }), tx({ id: 'oud', datum: lang, omschrijving: 'Lang geleden' })])
    expect(screen.queryByText('Lang geleden')).not.toBeInTheDocument()
  })
})

// --- Ronde 24: kengetallen, maandschakelaar, sorteren, selectie, badges ---

function toonUitgebreid(transacties: Transactie[], over: Partial<React.ComponentProps<typeof TransactieLijst>> = {}) {
  const onVerwijderMeerdere = vi.fn()
  const onCategoriseerMeerdere = vi.fn()
  render(
    <TransactieLijst
      transacties={transacties}
      categorieen={[]}
      rekeningen={rekeningen}
      onBewerk={vi.fn()}
      onVerwijder={vi.fn()}
      onVerwijderMeerdere={onVerwijderMeerdere}
      onCategoriseerMeerdere={onCategoriseerMeerdere}
      {...over}
    />,
  )
  return { onVerwijderMeerdere, onCategoriseerMeerdere }
}

// De woorden "Inkomsten" en "Uitgaven" staan ook in de richting-keuzelijst, dus
// zoeken we bewust binnen het kengetallenblok.
function kengetal(label: string): string {
  const blok = document.querySelector('[data-kengetallen]') as HTMLElement
  const stat = within(blok).getByText(label).closest('.stat') as HTMLElement
  return stat?.textContent ?? ''
}

describe('TransactieLijst — kengetallen', () => {
  it('telt inkomsten, uitgaven en saldo van de getoonde rijen', () => {
    toon([
      tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 }),
      tx({ id: '2', omschrijving: 'Winkel', bedrag: -3000 }),
    ])
    expect(kengetal('Inkomsten')).toMatch(/2[.\s]?000/)
    expect(kengetal('Uitgaven')).toMatch(/30,00/)
    expect(kengetal('Saldo')).toMatch(/1[.\s]?970/)
  })

  it('volgt het filter, zodat de cijfers en de lijst nooit iets anders zeggen', async () => {
    const user = userEvent.setup()
    toon([
      tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 }),
      tx({ id: '2', omschrijving: 'Winkel', bedrag: -3000 }),
    ])
    await user.selectOptions(screen.getByLabelText('Richting'), 'uit')
    expect(kengetal('Inkomsten')).toMatch(/0,00/)
    expect(kengetal('Uitgaven')).toMatch(/30,00/)
  })

  it('splitst een kassaticket uit, net als de rest van de app', () => {
    // € 50 uitgave met een statiegeldregel van € 3 erin.
    toon([
      tx({
        id: '1',
        omschrijving: 'Colruyt',
        bedrag: -5000,
        regels: [{ bedrag: -5300 }, { bedrag: 300 }],
      }),
    ])
    expect(kengetal('Inkomsten')).toMatch(/3,00/)
    expect(kengetal('Uitgaven')).toMatch(/53,00/)
  })
})

describe('TransactieLijst — maandschakelaar', () => {
  it('begint op alle maanden en filtert zodra je een maand kiest', async () => {
    const user = userEvent.setup()
    const dezeMaand = recent.slice(0, 7)
    toon([tx({ id: '1', omschrijving: 'Nu' }), tx({ id: '2', omschrijving: 'Toen', datum: '2020-03-05' })])
    expect(screen.getByText('Alle maanden')).toBeInTheDocument()

    // Eén klik terug vanaf de huidige maand: 'Nu' valt weg.
    await user.click(screen.getByRole('button', { name: 'Vorige maand' }))
    expect(screen.queryByText('Nu')).not.toBeInTheDocument()
    expect(screen.queryByText(dezeMaand)).not.toBeInTheDocument()
  })

  it('toont de gekozen maand als chip en laat ze weer los', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1' })])
    await user.click(screen.getByRole('button', { name: 'Vorige maand' }))
    // De maand staat nu als filter; de knop 'Alle maanden' zet hem weer af.
    await user.click(screen.getByRole('button', { name: 'Alle maanden' }))
    expect(screen.getByText('Winkel')).toBeInTheDocument()
  })
})

describe('TransactieLijst — sorteren', () => {
  it('zet standaard de nieuwste bovenaan', () => {
    toon([
      tx({ id: 'oud', omschrijving: 'Oud', datum: '2026-07-01' }),
      tx({ id: 'nieuw', omschrijving: 'Nieuw', datum: '2026-07-20' }),
    ])
    const titels = screen.getAllByText(/Oud|Nieuw/)
    expect(titels[0].textContent).toBe('Nieuw')
  })

  it('sorteert op bedrag van groot naar klein, ongeacht het teken', async () => {
    const user = userEvent.setup()
    toon([
      tx({ id: 'a', omschrijving: 'Klein', bedrag: -500 }),
      tx({ id: 'b', omschrijving: 'Groot', bedrag: -90000 }),
      tx({ id: 'c', omschrijving: 'Midden', bedrag: 2000 }),
    ])
    await user.selectOptions(screen.getByLabelText('Sorteer op'), 'bedrag-af')
    const titels = screen.getAllByText(/Klein|Groot|Midden/).map((el) => el.textContent)
    expect(titels).toEqual(['Groot', 'Midden', 'Klein'])
  })

  it('sorteert op handelaar van A naar Z', async () => {
    const user = userEvent.setup()
    toon([tx({ id: 'a', omschrijving: 'Zeeman' }), tx({ id: 'b', omschrijving: 'Aldi' })])
    await user.selectOptions(screen.getByLabelText('Sorteer op'), 'omschrijving-op')
    const titels = screen.getAllByText(/Zeeman|Aldi/).map((el) => el.textContent)
    expect(titels).toEqual(['Aldi', 'Zeeman'])
  })
})

describe('TransactieLijst — meerdere rijen tegelijk', () => {
  it('toont geen selectievakjes zonder bulkacties', () => {
    toon([tx({ id: '1' })])
    expect(screen.queryByLabelText('Alles selecteren')).not.toBeInTheDocument()
  })

  it('verwijdert de aangevinkte rijen pas na een bevestiging', async () => {
    const user = userEvent.setup()
    const { onVerwijderMeerdere } = toonUitgebreid([
      tx({ id: '1', omschrijving: 'Een' }),
      tx({ id: '2', omschrijving: 'Twee' }),
    ])

    await user.click(screen.getByLabelText('Selecteer Een'))
    await user.click(screen.getByLabelText('Selecteer Twee'))
    expect(screen.getByText('2 geselecteerd')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Verwijderen' }))
    expect(onVerwijderMeerdere).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Ja, verwijder 2' }))
    expect(onVerwijderMeerdere).toHaveBeenCalledWith(['1', '2'])
  })

  it('vinkt alles aan en weer uit met de kop', async () => {
    const user = userEvent.setup()
    toonUitgebreid([tx({ id: '1', omschrijving: 'Een' }), tx({ id: '2', omschrijving: 'Twee' })])
    await user.click(screen.getByLabelText('Alles selecteren'))
    expect(screen.getByText('2 geselecteerd')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Alles selecteren'))
    expect(screen.queryByText('2 geselecteerd')).not.toBeInTheDocument()
  })

  it('laat een gesplitst kassaticket buiten de bulk-categorisering en zegt dat', async () => {
    const user = userEvent.setup()
    const { onCategoriseerMeerdere } = toonUitgebreid([
      tx({ id: 'gewoon', omschrijving: 'Gewoon' }),
      tx({ id: 'ticket', omschrijving: 'Ticket', regels: [{ bedrag: -500 }, { bedrag: -500 }] }),
    ])

    await user.click(screen.getByLabelText('Alles selecteren'))
    // Nooit stil overslaan: de gebruiker leest waarom.
    expect(
      screen.getByText('1 gesplitst(e) kassaticket(s) krijgen geen categorie: die hebben er een per regel.'),
    ).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Categorie voor de selectie'), 'ov-voeding')
    await user.click(screen.getByRole('button', { name: 'Categorie toekennen' }))
    expect(onCategoriseerMeerdere).toHaveBeenCalledWith(['gewoon'], 'ov-voeding')
  })
})

describe('TransactieLijst — wat een rij toont', () => {
  it('zet de categorie als pad, met haar hoofdcategorie erbij', () => {
    toon([tx({ id: '1', categorieId: 'i-brood--wit-9238' })])
    expect(metaVan('Winkel')).toContain('Voeding › Brood (wit)')
  })

  it('zet de rekening als badge', () => {
    toon([tx({ id: '1' })])
    const rij = screen.getByText('Winkel').closest('li') as HTMLElement
    expect(rij.querySelector('.tx-rekening')?.textContent).toBe('Betaal')
  })

  it('merkt een boeking die in een dossier gedeeld wordt', () => {
    toonUitgebreid([tx({ id: '1' })], {
      gedeeldeKosten: [
        {
          id: 'k1',
          dossierId: 'dos-1',
          transactieId: '1',
          omschrijving: 'Winkel',
          bedrag: 1000,
          betaaldDoor: 'jij',
          datum: recent,
        },
      ],
    })
    expect(screen.getByText('gedeeld')).toBeInTheDocument()
  })

  it('zwijgt over dossiers wanneer er geen koppeling is', () => {
    toonUitgebreid([tx({ id: '1' })])
    expect(screen.queryByText('gedeeld')).not.toBeInTheDocument()
  })
})
