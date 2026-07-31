import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PrijsstijgingenKaart } from './PrijsstijgingenKaart'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { formatEuro } from '../utils/format'
import { filterTransacties } from '../utils/transactieFilter'

const VANDAAG = '2026-07-15'
const MAANDEN = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

const reeks = (naam: string, bedragen: number[]): Transactie[] =>
  MAANDEN.map((m, i) => ({
    id: `${naam}-${m}`,
    datum: `${m}-05`,
    omschrijving: naam,
    bedrag: -bedragen[i],
    rekeningId: 'r1',
  }))

function toon(opties: { transacties?: Transactie[]; posten?: TerugkerendePost[] } = {}) {
  const onToonHandelaar = vi.fn()
  const resultaat = render(
    <PrijsstijgingenKaart
      transacties={opties.transacties ?? []}
      terugkerendePosten={opties.posten ?? []}
      onToonHandelaar={onToonHandelaar}
      vandaagISO={VANDAAG}
    />,
  )
  return { ...resultaat, onToonHandelaar }
}

const netflix = reeks('Netflix', [1199, 1199, 1399, 1399, 1399, 1399, 1399])

describe('PrijsstijgingenKaart', () => {
  it('zegt in één regel wat het samen per maand kost', () => {
    const { container } = toon({ transacties: netflix })
    expect(container.textContent).toContain(`${formatEuro(200)} per maand duurder`)
  })

  it('blijft ingeklapt tot je ze opent', async () => {
    const gebruiker = userEvent.setup()
    const { container } = toon({ transacties: netflix })
    expect(container.textContent).not.toContain('sinds')
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(container.textContent).toContain(`${formatEuro(1199)} → ${formatEuro(1399)} sinds`)
  })

  it('zegt het eerlijk wanneer er nog niets te melden valt', () => {
    const { container } = toon()
    expect(container.textContent).toContain('Nog niets gevonden')
    // En dan is er ook niets om open te klappen.
    expect(screen.queryByRole('button', { name: 'Toon' })).not.toBeInTheDocument()
  })

  it('markeert een vaste last als vaste last', async () => {
    const gebruiker = userEvent.setup()
    const post: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -6200,
      rekeningId: 'r1',
      dag: 12,
    }
    toon({
      transacties: reeks('Autoverzekering', [6200, 6200, 7100, 7100, 7100, 7100, 7100]),
      posten: [post],
    })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(screen.getByText('vaste last')).toBeInTheDocument()
    // En de vaste last staat nog op het oude bedrag: dat is een eigen handeling.
    expect(screen.getByText(/Je vaste last staat op een ander bedrag/)).toBeInTheDocument()
  })

  it('zwijgt over een verouderde vaste last zodra die bijgewerkt is', async () => {
    const gebruiker = userEvent.setup()
    const post: TerugkerendePost = {
      id: 'p1',
      omschrijving: 'Autoverzekering',
      bedrag: -7100,
      rekeningId: 'r1',
      dag: 12,
    }
    toon({
      transacties: reeks('Autoverzekering', [6200, 6200, 7100, 7100, 7100, 7100, 7100]),
      posten: [post],
    })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(screen.queryByText(/Je vaste last staat op een ander bedrag/)).not.toBeInTheDocument()
  })

  it('noemt een wijziging met maar twee betalingen erna nog onzeker', async () => {
    const gebruiker = userEvent.setup()
    toon({ transacties: reeks('Netflix', [1199, 1199, 1199, 1199, 1199, 1399, 1399]) })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(screen.getByText('nog onzeker')).toBeInTheDocument()
  })

  it('toont een opgeschoonde naam in plaats van de kale bankregel', async () => {
    // "BETALING MAESTRO 6703 NETFLIX.COM 05/07 REF 9000006" herken je niet.
    const gebruiker = userEvent.setup()
    const bank = MAANDEN.map((m, i) => ({
      id: `b-${m}`,
      datum: `${m}-05`,
      omschrijving: `BETALING MAESTRO 6703 NETFLIX.COM ${m.slice(5)}/07 REF 900000${i}`,
      bedrag: -[1199, 1199, 1399, 1399, 1399, 1399, 1399][i],
      rekeningId: 'r1',
    }))
    toon({ transacties: bank })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(screen.getByRole('button', { name: /NETFLIX COM/ })).toBeInTheDocument()
  })

  it('geeft een doorklik die de boekingen ook echt terugvindt', async () => {
    // De zoekterm deed een letterlijke match op de omschrijving, en die verschilt
    // per boeking door datum en referentie: je vond er één van de zeven.
    const gebruiker = userEvent.setup()
    const bank = MAANDEN.map((m, i) => ({
      id: `b-${m}`,
      datum: `${m}-05`,
      omschrijving: `BETALING MAESTRO 6703 NETFLIX.COM ${m.slice(5)}/07 REF 900000${i}`,
      bedrag: -[1199, 1199, 1399, 1399, 1399, 1399, 1399][i],
      rekeningId: 'r1',
    }))
    const { onToonHandelaar } = toon({ transacties: bank })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.click(screen.getByRole('button', { name: /NETFLIX COM/ }))
    const naam = onToonHandelaar.mock.calls[0][0]
    expect(filterTransacties(bank, { handelaar: naam })).toHaveLength(7)
  })

  it('brengt je naar de boekingen van die handelaar', async () => {
    const gebruiker = userEvent.setup()
    const { onToonHandelaar } = toon({ transacties: netflix })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    await gebruiker.click(screen.getByRole('button', { name: /Netflix/ }))
    expect(onToonHandelaar).toHaveBeenCalledWith('Netflix')
  })

  it('vermeldt hoe ze te werk gaat, zodat het cijfer navolgbaar is', async () => {
    const gebruiker = userEvent.setup()
    const { container } = toon({ transacties: netflix })
    await gebruiker.click(screen.getByRole('button', { name: 'Toon' }))
    expect(container.textContent).toContain('achttien maanden terug')
  })

  it('zet zowel het duurdere als het goedkopere in één regel', () => {
    const { container } = toon({
      transacties: [...netflix, ...reeks('Sportclub', [4000, 4000, 3000, 3000, 3000, 3000, 3000])],
    })
    expect(container.textContent).toContain('duurder')
    expect(container.textContent).toContain('goedkoper')
  })
})
