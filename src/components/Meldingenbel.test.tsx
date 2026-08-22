import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Meldingenbel } from './Meldingenbel'
import type { Melding } from '../utils/meldingen'

const budgetMelding: Melding = {
  id: 'budget-bijna-b1',
  soort: 'budget-bijna',
  sleutel: 'Budget {naam} is {pct}% verbruikt',
  params: { naam: 'Voeding', pct: 92 },
  pagina: 'budget',
  dringend: false,
}

const garantieMelding: Melding = {
  id: 'garantie-g1',
  soort: 'garantie',
  sleutel: 'Garantie op {product} verloopt binnen {n} dag(en)',
  params: { product: 'Koffiezet', n: 9 },
  // Sinds ronde 29 wonen de garanties als subtab op de Dossiers-pagina.
  pagina: 'dossiers',
  subtab: 'garantie',
  dringend: true,
}

describe('Meldingenbel', () => {
  it('noemt het aantal meldingen in het toegankelijke label', () => {
    render(<Meldingenbel meldingen={[budgetMelding, garantieMelding]} onGaNaar={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Meldingen (2)' })).toBeInTheDocument()
  })

  it('heet gewoon "Meldingen" wanneer er niets is', () => {
    render(<Meldingenbel meldingen={[]} onGaNaar={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Meldingen' })).toBeInTheDocument()
  })

  it('toont het paneel pas na een klik', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[budgetMelding]} onGaNaar={vi.fn()} />)
    expect(document.querySelector('[data-meldingen]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    expect(screen.getByText('Budget Voeding is 92% verbruikt')).toBeInTheDocument()
  })

  it('zegt het expliciet wanneer er niets te melden is', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[]} onGaNaar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen' }))
    expect(screen.getByText(/Zodra er iets je aandacht nodig heeft/)).toBeInTheDocument()
  })

  // Ronde 64: de Budget-pagina heeft drie tabbladen, dus "naar Budget" is niet
  // genoeg meer. Zonder deze doorgifte land je op "Te verdelen" en mag je zelf gaan
  // zoeken waar de melding over ging.
  it('geeft het tabblad van de Budget-pagina mee', async () => {
    const user = userEvent.setup()
    const onGaNaar = vi.fn()
    render(
      <Meldingenbel
        meldingen={[{ ...budgetMelding, budgettab: 'budgetten' }]}
        onGaNaar={onGaNaar}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    await user.click(screen.getByText('Budget Voeding is 92% verbruikt'))
    expect(onGaNaar).toHaveBeenCalledWith('budget', undefined, undefined, 'budgetten')
  })

  it('brengt je naar de pagina van de melding waarop je klikt, niet altijd naar Budget', async () => {
    const user = userEvent.setup()
    const onGaNaar = vi.fn()
    render(<Meldingenbel meldingen={[budgetMelding, garantieMelding]} onGaNaar={onGaNaar} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen (2)' }))

    await user.click(screen.getByText('Garantie op Koffiezet verloopt binnen 9 dag(en)'))
    // Niet alleen de pagina, ook de lade: anders land je op de gedeelde kosten en
    // mag je zelf gaan zoeken waar die aflopende garantie staat.
    // De derde parameter is het dossier dat geopend moet worden; een garantie
    // hangt niet aan één dossier, dus die blijft leeg. De vierde is sinds ronde 64
    // het tabblad van de Budget-pagina, en dat zegt hier niets.
    expect(onGaNaar).toHaveBeenCalledWith('dossiers', 'garantie', undefined, undefined)
  })

  it('sluit het paneel na een keuze', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[budgetMelding]} onGaNaar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    await user.click(screen.getByText('Budget Voeding is 92% verbruikt'))
    expect(document.querySelector('[data-meldingen]')).toBeNull()
  })
})

// Ronde 23: inboeken is een maandelijkse handeling. Ze moet vanuit het paneel
// kunnen, zonder eerst naar de Plan-pagina te navigeren.
describe('Meldingenbel — een vaste last meteen inboeken', () => {
  const melding: Melding = {
    id: 'vastelast-p1',
    soort: 'vastelast',
    sleutel: '{naam} staat nog niet ingeboekt deze maand',
    params: { naam: 'Huur' },
    pagina: 'budget',
    dringend: false,
    actie: { soort: 'boek-vastelast', postId: 'p1' },
  }

  it('boekt de post in zonder de pagina te verlaten', async () => {
    const user = userEvent.setup()
    const onGaNaar = vi.fn()
    const onBoekVasteLast = vi.fn()
    render(<Meldingenbel meldingen={[melding]} onGaNaar={onGaNaar} onBoekVasteLast={onBoekVasteLast} />)

    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    await user.click(screen.getByRole('button', { name: 'Boek in' }))

    expect(onBoekVasteLast).toHaveBeenCalledWith('p1')
    // Navigeren is precies wat we wilden vermijden.
    expect(onGaNaar).not.toHaveBeenCalled()
  })

  it('toont geen knop wanneer de app er geen meegeeft', async () => {
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[melding]} onGaNaar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Meldingen (1)' }))
    expect(screen.queryByRole('button', { name: 'Boek in' })).not.toBeInTheDocument()
  })

  // Ronde 32 — "het alarmbelicoontje moet duidelijker zijn. Nu is het te klein en
  // te onopvallend." Het stipje van 8 px is een tellertje geworden en de knop
  // kleurt amber zodra er iets staat.
  it('sluit met Escape en geeft de focus terug aan het belletje', async () => {
    // ⚠ Ronde 61. Escape sloot het paneel wel, maar de focus viel terug naar het begin
    // van de pagina — je was kwijt waar je was. De 'Meer'-lade doet dit al goed.
    const user = userEvent.setup()
    render(<Meldingenbel meldingen={[budgetMelding]} onGaNaar={vi.fn()} />)
    const bel = screen.getByRole('button', { name: 'Meldingen (1)' })
    await user.click(bel)
    expect(screen.getByText('Budget Voeding is 92% verbruikt')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText('Budget Voeding is 92% verbruikt')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Meldingen (1)' }))
  })

  it('belooft geen venster en geen menu, want wat opengaat is geen van beide', () => {
    // `aria-haspopup="dialog"` kondigt een venster met een focusval aan, en `"true"` is
    // volgens de norm hetzelfde als `"menu"`. Dit is bewust een informatief lijstje, dus
    // allebei zouden een belofte zijn die de app niet nakomt. `aria-expanded` zegt al
    // wat er gebeurt.
    render(<Meldingenbel meldingen={[budgetMelding]} onGaNaar={vi.fn()} />)
    const bel = screen.getByRole('button', { name: 'Meldingen (1)' })
    expect(bel).not.toHaveAttribute('aria-haspopup')
    expect(bel).toHaveAttribute('aria-expanded', 'false')
  })

  it('zet het aantal als tellertje op de bel', () => {
    render(<Meldingenbel meldingen={[budgetMelding, garantieMelding]} onGaNaar={vi.fn()} />)
    const knop = screen.getByRole('button', { name: 'Meldingen (2)' })
    expect(knop.querySelector('.bel-teller')?.textContent).toBe('2')
    expect(knop.className).toContain('bel-actief')
  })

  it('kapt het tellertje af op 9+', () => {
    const veel = Array.from({ length: 12 }, (_, i) => ({ ...budgetMelding, id: `b${i}` }))
    render(<Meldingenbel meldingen={veel} onGaNaar={vi.fn()} />)
    expect(document.querySelector('.bel-teller')?.textContent).toBe('9+')
  })

  it('blijft rustig wanneer er niets te melden is', () => {
    render(<Meldingenbel meldingen={[]} onGaNaar={vi.fn()} />)
    const knop = screen.getByRole('button', { name: 'Meldingen' })
    expect(knop.querySelector('.bel-teller')).toBeNull()
    expect(knop.className).not.toContain('bel-actief')
  })
})

describe('Meldingenbel — een melding met een dossier', () => {
  it('geeft het dossier mee, zodat je niet in een ander dossier landt', async () => {
    const user = userEvent.setup()
    const onGaNaar = vi.fn()
    render(
      <Meldingenbel
        meldingen={[
          {
            id: 'bijdrage-ob1',
            soort: 'bijdrage',
            sleutel: 'De bijdrage is geïndexeerd',
            pagina: 'dossiers',
            subtab: 'coouderschap',
            dossierId: 'd7',
            dringend: false,
          },
        ]}
        onGaNaar={onGaNaar}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Meldingen/ }))
    await user.click(screen.getByText('De bijdrage is geïndexeerd'))
    expect(onGaNaar).toHaveBeenCalledWith('dossiers', 'coouderschap', 'd7', undefined)
  })
})

// --- Ronde 66, slotronde: geen bevestiging van wat de app niet gekeken heeft ---
describe('Meldingenbel — niets te melden', () => {
  it('bevestigt niets en belooft niets', async () => {
    // ⚠ De zin zei "Al je budgetten en garanties zijn in orde": een oordeel over nul
    // garanties zodra je één budget had, en stil over de zes andere dingen die deze
    // bel bekijkt. Een tweede versie wisselde van zin op basis van wat er ingesteld
    // was, maar beloofde dan stilte over dingen die de bel wél in het oog houdt.
    const gebruiker = userEvent.setup()
    render(<Meldingenbel meldingen={[]} onGaNaar={vi.fn()} />)
    await gebruiker.click(screen.getByRole('button', { name: /Meldingen/ }))
    expect(screen.getByText(/Zodra er iets je aandacht nodig heeft/)).toBeInTheDocument()
    expect(screen.queryByText(/zijn in orde/)).toBeNull()
  })
})
