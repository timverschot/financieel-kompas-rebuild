import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Categorie, Overboeking, Rekening, Transactie, Waardering } from '../data/schema'

// De PDF-bouwer wordt vervangen: deze tests gaan over de KNOP — wat ze zegt, dat ze
// de gekozen maand doorgeeft, dat ze tijdens het werk niet twee keer afgaat en dat
// een mislukking zichtbaar wordt. Wat er ín de PDF komt, staat in periodePdf.test.ts.
const { exporteer } = vi.hoisted(() => ({ exporteer: vi.fn() }))
vi.mock('../utils/periodePdf', () => ({ exporteerPeriodePDF: exporteer }))

const { RapportKaart } = await import('./RapportKaart')

const rekeningen: Rekening[] = [{ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 }]
const transacties: Transactie[] = [
  { id: 't1', datum: '2026-03-04', omschrijving: 'Colruyt', bedrag: -4120, rekeningId: 'r1' },
]
const categorieen: Categorie[] = [{ id: 'eigen-1', naam: 'Eigen categorie' }]
const overboekingen: Overboeking[] = [
  { id: 'ov1', datum: '2026-03-10', vanRekeningId: 'r1', naarRekeningId: 'r1', bedrag: 1000 },
]
const waarderingen: Waardering[] = [{ id: 'w1', rekeningId: 'r1', datum: '2026-03-15', saldo: 500000 }]

function toon(maand = '2026-03') {
  render(
    <RapportKaart
      maand={maand}
      transacties={transacties}
      categorieen={categorieen}
      rekeningen={rekeningen}
      overboekingen={overboekingen}
      waarderingen={waarderingen}
    />,
  )
}

beforeEach(() => {
  exporteer.mockReset()
  exporteer.mockResolvedValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

describe('RapportKaart', () => {
  it('noemt de maand voluit op de knop', () => {
    toon()
    expect(screen.getByRole('button', { name: 'maart 2026 als PDF' })).toBeInTheDocument()
  })

  it('biedt ook het hele jaar aan', () => {
    toon()
    expect(screen.getByRole('button', { name: 'Heel 2026 als PDF' })).toBeInTheDocument()
  })

  it('zegt in het bijschrift wat er in het document komt', () => {
    toon()
    // "geen grafieken" is de keuze van ronde 41 en die hoort te blijken vóór je klikt.
    expect(screen.getByText(/geen grafieken/)).toBeInTheDocument()
  })

  it('geeft de maand van de pagina door, niet de huidige maand', async () => {
    const user = userEvent.setup()
    toon('2026-03')
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(exporteer.mock.calls[0][1]).toBe('2026-03')
  })

  it('geeft ALLE gegevens door die het rapport nodig heeft', async () => {
    // Niet alleen de periode. Zou hier bijvoorbeeld `waarderingen` wegvallen, dan
    // toont elk rapport een verkeerd saldo — en dat is precies het soort fout dat
    // niemand opmerkt tot iemand het document naast zijn rekeninguittreksel legt.
    const user = userEvent.setup()
    toon('2026-03')
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(exporteer.mock.calls[0].slice(2)).toEqual([
      transacties,
      categorieen,
      rekeningen,
      overboekingen,
      waarderingen,
    ])
  })

  it('geeft bij de jaarknop het jaar door', async () => {
    const user = userEvent.setup()
    toon('2026-03')
    await user.click(screen.getByRole('button', { name: 'Heel 2026 als PDF' }))
    expect(exporteer.mock.calls[0][1]).toBe('2026')
  })

  it('volgt de maandschakelaar bovenaan de pagina', () => {
    toon('2025-11')
    expect(screen.getByRole('button', { name: 'november 2025 als PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heel 2025 als PDF' })).toBeInTheDocument()
  })

  it('zet de knoppen op slot terwijl het rapport gebouwd wordt, zonder de focus kwijt te spelen', async () => {
    // `aria-disabled` en niet `disabled`: dat laatste haalt de knop die je net
    // aanraakte uit de tab-volgorde en laat de focus naar de pagina vallen.
    let losmaken = () => {}
    exporteer.mockImplementation(() => new Promise<void>((klaar) => (losmaken = () => klaar())))
    const user = userEvent.setup()
    toon()
    const knop = screen.getByRole('button', { name: 'maart 2026 als PDF' })
    await user.click(knop)
    const bezig = screen.getByRole('button', { name: /bezig/i })
    expect(bezig).toHaveAttribute('aria-disabled', 'true')
    expect(bezig).toHaveTextContent('Bezig…')
    expect(screen.getByRole('button', { name: 'Heel 2026 als PDF' })).toHaveAttribute('aria-disabled', 'true')
    // De knop blijft bereikbaar: hij staat nog in de tab-volgorde en houdt de focus.
    expect(bezig).not.toBeDisabled()
    expect(document.activeElement).toBe(bezig)
    // Netjes losmaken binnen act(): anders komt de laatste toestandswijziging pas
    // ná de test binnen, en dat is precies het soort ruis dat een echte fout verbergt.
    await act(async () => {
      losmaken()
    })
    expect(screen.getByRole('button', { name: 'maart 2026 als PDF' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('gaat niet twee keer af wanneer je tijdens het bouwen nog eens tikt', async () => {
    // De knop is met `aria-disabled` nog echt aanklikbaar, dus de handler moet zelf
    // weigeren. Zonder die regel krijg je twee bestanden.
    let losmaken = () => {}
    exporteer.mockImplementation(() => new Promise<void>((klaar) => (losmaken = () => klaar())))
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    await user.click(screen.getByRole('button', { name: /bezig/i }))
    await user.click(screen.getByRole('button', { name: 'Heel 2026 als PDF' }))
    expect(exporteer).toHaveBeenCalledTimes(1)
    await act(async () => {
      losmaken()
    })
  })

  it('meldt dat het bestand gedownload is, zodat een schermlezer het hoort', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Het rapport van maart 2026 is gedownload.')
  })

  it('wist de geslaagd-melding bij een volgende poging', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(await screen.findByRole('status')).toHaveTextContent('gedownload')
    exporteer.mockRejectedValueOnce(new Error('stuk'))
    await user.click(screen.getByRole('button', { name: 'Heel 2026 als PDF' }))
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('toont een melding wanneer het rapport niet gemaakt kan worden', async () => {
    exporteer.mockRejectedValue(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Het rapport kon niet gemaakt worden.')
  })

  it('laat de knoppen weer los na een mislukking', async () => {
    exporteer.mockRejectedValue(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(await screen.findByRole('button', { name: 'maart 2026 als PDF' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('wist een oude melding bij een nieuwe poging', async () => {
    exporteer.mockRejectedValueOnce(new Error('stuk'))
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'maart 2026 als PDF' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('laat de browser printen zonder de app te bevragen', async () => {
    const printen = vi.fn()
    vi.stubGlobal('print', printen)
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Print deze pagina' }))
    expect(printen).toHaveBeenCalledTimes(1)
    expect(exporteer).not.toHaveBeenCalled()
  })
})
