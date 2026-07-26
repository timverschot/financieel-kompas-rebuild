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

// De filters zitten voortaan achter de knop 'Filters'. Deze helper doet wat de
// gebruiker doet: eerst openklappen, dan pas een veld gebruiken.
async function klapFiltersOpen(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Filters/ }))
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
    await klapFiltersOpen(user)
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

describe('TransactieLijst — de inklapbare filterbalk', () => {
  it('houdt de filters dicht tot je op Filters klikt, en klapt weer dicht', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1' })])
    // Het zoekveld blijft altijd zichtbaar; de rest zit weg.
    expect(screen.getByLabelText('Zoek in transacties')).toBeInTheDocument()
    expect(screen.queryByLabelText('Richting')).not.toBeInTheDocument()

    await klapFiltersOpen(user)
    expect(screen.getByLabelText('Richting')).toBeInTheDocument()
    expect(screen.getByLabelText('Rekening')).toBeInTheDocument()
    expect(screen.getByLabelText('Van')).toBeInTheDocument()

    await klapFiltersOpen(user)
    expect(screen.queryByLabelText('Richting')).not.toBeInTheDocument()
  })

  it('telt de actieve filters op de knop en toont ze als chips', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 })])
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()

    await klapFiltersOpen(user)
    await user.selectOptions(screen.getByLabelText('Richting'), 'in')
    await user.selectOptions(screen.getByLabelText('Rekening'), 'r1')

    expect(screen.getByRole('button', { name: 'Filters · 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wis filter Inkomsten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wis filter Betaal' })).toBeInTheDocument()
  })

  it('wist met de × van een chip enkel dat ene filter', async () => {
    const user = userEvent.setup()
    toon([tx({ id: '1', omschrijving: 'Loon', bedrag: 200000 })])
    await klapFiltersOpen(user)
    await user.selectOptions(screen.getByLabelText('Richting'), 'in')
    await user.selectOptions(screen.getByLabelText('Rekening'), 'r1')

    await user.click(screen.getByRole('button', { name: 'Wis filter Inkomsten' }))

    expect(screen.queryByRole('button', { name: 'Wis filter Inkomsten' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wis filter Betaal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters · 1' })).toBeInTheDocument()
  })

  it('staat al open wanneer er bij het laden filters actief zijn', () => {
    render(
      <TransactieLijst
        transacties={[tx({ id: '1' })]}
        categorieen={[]}
        rekeningen={rekeningen}
        onBewerk={vi.fn()}
        onVerwijder={vi.fn()}
        beginFilter={{ richting: 'uit' }}
      />,
    )
    expect(screen.getByLabelText('Richting')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters · 1' })).toBeInTheDocument()
  })

  it('aantalActieveFilters telt het zoekveld niet mee', () => {
    expect(aantalActieveFilters({})).toBe(0)
    expect(aantalActieveFilters({ zoek: 'colruyt' })).toBe(0)
    expect(aantalActieveFilters({ richting: 'uit', van: '2026-01-01' })).toBe(2)
    expect(aantalActieveFilters({ richting: 'uit', rekeningId: 'r1', hoofdId: 'ov-voeding', catId: 'cat-x', van: '2026-01-01', tot: '2026-02-01' })).toBe(6)
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
