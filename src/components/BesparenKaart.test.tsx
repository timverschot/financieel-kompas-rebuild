import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { Transactie } from '../data/schema'
import type { Periode } from '../utils/analyse'
import { BesparenKaart } from './BesparenKaart'
import { formatEuro } from '../utils/format'

const ITEM_BROOD = 'i-brood--wit-9238'
const CAT_ENERGIE = 'cat-energie-en-nutsvoorzieningen'

const JULI: Periode = { van: '2026-07-01', tot: '2026-07-31' }
const JUNI: Periode = { van: '2026-06-01', tot: '2026-06-30' }

function tx(datum: string, bedrag: number, categorieId: string): Transactie {
  return { id: `t-${datum}-${bedrag}-${categorieId}`, datum, omschrijving: 'x', bedrag, rekeningId: 'r1', categorieId }
}

function toon(transacties: Transactie[], opties: { vorige?: Periode | null; perMaand?: boolean } = {}) {
  return render(
    <BesparenKaart
      transacties={transacties}
      periode={JULI}
      vorigePeriode={opties.vorige === undefined ? JUNI : opties.vorige}
      perMaand={opties.perMaand ?? true}
    />,
  )
}

// Ronde 31: de kaart toonde vier bedragen met een algemene tip — informatie die je
// ook uit de ranglijst haalt. Ze vergelijkt nu met de vorige even lange periode en
// staat ingeklapt bovenaan.
describe('BesparenKaart', () => {
  it('staat dicht en vat het belangrijkste samen in één regel', () => {
    toon([tx('2026-07-03', -12000, CAT_ENERGIE), tx('2026-06-03', -8000, CAT_ENERGIE)])
    // Dicht: de vier domeinen staan er niet, wel de samenvatting.
    expect(screen.queryByText('Boodschappen')).toBeNull()
    expect(screen.getByText('Samen € 120,00. Sterkst gestegen: Energie, € 40,00 meer.')).toBeInTheDocument()
  })

  it('toont na het openklappen de vier domeinen met hun bedrag', async () => {
    const user = userEvent.setup()
    toon([tx('2026-07-02', -5000, ITEM_BROOD), tx('2026-07-03', -12000, CAT_ENERGIE)])
    await user.click(screen.getByRole('button', { name: 'Toon details' }))

    expect(screen.getByText('Boodschappen')).toBeInTheDocument()
    expect(screen.getByText('Energie')).toBeInTheDocument()
    expect(screen.getByText('Telecom en abonnementen')).toBeInTheDocument()
    expect(screen.getByText('Verzekeringen')).toBeInTheDocument()
    expect(screen.getByText('€ 50,00')).toBeInTheDocument()
    expect(screen.getByText('€ 120,00')).toBeInTheDocument()
  })

  it('zet het verschil met de vorige periode erbij, met het percentage', async () => {
    const user = userEvent.setup()
    // Energie: € 80 in juni, € 120 in juli = € 40 meer, oftewel 50%.
    toon([tx('2026-07-03', -12000, CAT_ENERGIE), tx('2026-06-03', -8000, CAT_ENERGIE)])
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    expect(screen.getByText('▲ € 40,00 (50%)')).toBeInTheDocument()
  })

  it('rekent het verschil om naar een jaar bij een maandperiode', async () => {
    const user = userEvent.setup()
    toon([tx('2026-07-03', -12000, CAT_ENERGIE), tx('2026-06-03', -8000, CAT_ENERGIE)])
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    // € 40 per maand × 12 = € 480. Dát is het getal waar je iets mee kan.
    expect(screen.getByText(/€ 480,00 extra/)).toBeInTheDocument()
  })

  it('zwijgt over het jaarbedrag wanneer de periode geen maand is', async () => {
    const user = userEvent.setup()
    toon([tx('2026-07-03', -12000, CAT_ENERGIE), tx('2026-06-03', -8000, CAT_ENERGIE)], { perMaand: false })
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    // × 12 op een jaarperiode zou een verzonnen getal zijn.
    expect(screen.queryByText(/per jaar|extra/)).toBeNull()
    expect(screen.getByText(/Vorige periode: € 80,00/)).toBeInTheDocument()
  })

  it('toont enkel de tip wanneer er geen vorige periode is', async () => {
    const user = userEvent.setup()
    toon([tx('2026-07-03', -12000, CAT_ENERGIE)], { vorige: null })
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    expect(screen.getByText('Pas je verbruik aan en vergelijk de contracten van de leveranciers.')).toBeInTheDocument()
    expect(screen.queryByText(/▲|▼/)).toBeNull()
  })

  it('zegt het netjes wanneer er in deze vier domeinen nog niets geboekt is', async () => {
    const user = userEvent.setup()
    toon([])
    expect(screen.getByText('Nog geen uitgaven in deze vier domeinen.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    expect(screen.getByText(/Zodra je boodschappen, energie, telecom of verzekeringen boekt/)).toBeInTheDocument()
  })
})

// --- Ronde 40: doorklikken naar de boekingen van een domein --------------------

describe('BesparenKaart — doorklikken', () => {
  function toonMetKies(transacties: Transactie[]) {
    const onKies = vi.fn()
    render(
      <BesparenKaart transacties={transacties} periode={JULI} vorigePeriode={JUNI} perMaand onKies={onKies} />,
    )
    return { onKies }
  }

  it('maakt de bovenste regel van een domein aanklikbaar', async () => {
    const user = userEvent.setup()
    const { onKies } = toonMetKies([tx('2026-07-03', -12000, CAT_ENERGIE)])
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    await user.click(await screen.findByRole('button', { name: /^Bekijk de boekingen van Energie —/ }))
    // De sleutel is het DOMEIN, niet een categorie: een domein bundelt meerdere
    // categorieën, en met één hoofdId zou de lijst minder tonen dan het bedrag.
    expect(onKies).toHaveBeenCalledWith('energie', 'Energie')
  })

  it('blijft zonder de prop een gewone regel', async () => {
    const user = userEvent.setup()
    toon([tx('2026-07-03', -12000, CAT_ENERGIE)])
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    expect(screen.queryByRole('button', { name: /Bekijk de boekingen/ })).toBeNull()
  })

  it('zet het bedrag ín het label, want de inhoud van een knop wordt niet apart voorgelezen', async () => {
    const user = userEvent.setup()
    toonMetKies([tx('2026-07-05', -6000, ITEM_BROOD)])
    await user.click(screen.getByRole('button', { name: 'Toon details' }))
    // formatEuro zet een VASTE spatie tussen teken en getal, dus we bouwen de
    // verwachting met dezelfde functie in plaats van ze over te typen.
    const knop = await screen.findByRole('button', { name: /^Bekijk de boekingen van Boodschappen —/ })
    expect(knop.getAttribute('aria-label')).toContain(formatEuro(6000))
  })
})
