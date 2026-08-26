import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { OverzichtKaartkeuze } from './OverzichtKaartkeuze'
import { InstellingenProvider } from '../instellingen'
import { OVERZICHT_KAART_IDS, type OverzichtKaartId } from '../utils/overzichtkaarten'

const ALLES: Record<OverzichtKaartId, boolean> = {
  uitgaven: true,
  inkomsten: true,
  recent: true,
  maandgrafiek: true,
  toekomst: true,
  rapport: true,
}

function toon(gevuld: Record<OverzichtKaartId, boolean> = ALLES) {
  render(
    <InstellingenProvider>
      <OverzichtKaartkeuze gevuld={gevuld} />
    </InstellingenProvider>,
  )
}

function blok(): HTMLDetailsElement | null {
  return document.querySelector('[data-kaartkeuze]')
}

/**
 * Controleert dat het blok OPEN staat voor de test een chip aanraakt.
 *
 * ⚠ ONMISBAAR IN ELKE TEST DIE EEN CHIP AANRAAKT. jsdom kent wél `<details>`, maar
 * VERBERGT de inhoud van een dicht blok niet — `getByRole` vindt de chips daar dus ook
 * wanneer een echte browser ze niet toont. Zonder deze controle zou een test die per
 * ongeluk op een dicht blok draait, groen staan op knoppen die niemand kan zien.
 */
function staatOpen() {
  expect(blok()?.open).toBe(true)
}

describe('OverzichtKaartkeuze (ronde 90)', () => {
  // ⚠ In een `beforeEach`, niet aan het einde van een testbody (les van ronde 75):
  // faalt een test halverwege, dan lekt de voorkeur anders naar de volgende.
  beforeEach(() => {
    localStorage.clear()
  })

  it('staat standaard OPEN, en is dicht te klappen', async () => {
    // ⚠ OPEN is een beslissing van Timothy (26 augustus 2026), niet de eerste opzet van
    // deze ronde. Die stond dicht, want opgemeten beslaat de rij op een telefoon van
    // 360 px 269 px tegenover 46 px. Draait die keuze ooit terug, dan hoort deze test
    // mee te draaien — daarom staat de meting er hier bij.
    const user = userEvent.setup()
    toon()
    expect(blok()?.open).toBe(true)
    // En wie de rij toch wég wil, klapt ze dicht: het blijft een echte `<details>`.
    await user.click(screen.getByText('Welke kaarten wil je hier zien?'))
    expect(blok()?.open).toBe(false)
  })

  it('geeft elke kaart die er kán staan een chip', () => {
    toon()
    staatOpen()
    const groep = screen.getByRole('group', { name: 'Welke kaarten wil je hier zien?' })
    expect(within(groep).getAllByRole('button')).toHaveLength(OVERZICHT_KAART_IDS.length)
    for (const naam of [
      'Uitgaven per categorie',
      'Inkomsten per categorie',
      'Recente boekingen',
      'Per maand',
      'Wat komt eraan',
      'Rapport',
    ]) {
      expect(within(groep).getByRole('button', { name: naam })).toBeInTheDocument()
    }
  })

  it('biedt GEEN chip voor het maandblok of de zijkolom', () => {
    // Saldo, Inkomsten, Uitgaven en Netto zijn waarvoor deze pagina bestaat; de
    // zijkolom bestaat alleen op een breed scherm.
    toon()
    staatOpen()
    const groep = screen.getByRole('group', { name: 'Welke kaarten wil je hier zien?' })
    for (const naam of ['Saldo', 'Netto', 'Zijkolom']) {
      expect(within(groep).queryByRole('button', { name: naam })).toBeNull()
    }
  })

  it('staat standaard alles aan', () => {
    toon()
    staatOpen()
    for (const knop of within(
      screen.getByRole('group', { name: 'Welke kaarten wil je hier zien?' }),
    ).getAllByRole('button')) {
      expect(knop).toHaveAttribute('aria-pressed', 'true')
    }
  })

  it('houdt de chip staan zodra je hem uitzet', async () => {
    const user = userEvent.setup()
    toon()
    staatOpen()
    const chip = () => screen.getByRole('button', { name: 'Rapport' })
    await user.click(chip())
    // ⚠ Anders verdwijnt de knop waarmee je hem terugzet precies op het moment dat
    // je hem indrukt.
    expect(chip()).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip())
    expect(chip()).toHaveAttribute('aria-pressed', 'true')
  })

  it('zegt wat er net veranderde', async () => {
    const user = userEvent.setup()
    // De kaart die verschijnt of verdwijnt staat ONDER deze rij, op een telefoon dus
    // buiten beeld. Het live-gebied staat er altijd, ook leeg (les van ronde 56).
    toon()
    staatOpen()
    const melding = () => (blok() as HTMLElement).querySelector('[role="status"]')?.textContent
    expect(melding()).toBe('')
    await user.click(screen.getByRole('button', { name: 'Wat komt eraan' }))
    expect(melding()).toBe('De kaart Wat komt eraan staat nu uit.')
    await user.click(screen.getByRole('button', { name: 'Wat komt eraan' }))
    expect(melding()).toBe('De kaart Wat komt eraan staat nu aan.')
  })

  it('hangt de belofte aan élke chip', () => {
    // Wie de app hóórt, kreeg anders alleen "Rapport, knop, ingedrukt".
    toon()
    staatOpen()
    const groep = screen.getByRole('group', { name: 'Welke kaarten wil je hier zien?' })
    for (const chip of within(groep).getAllByRole('button')) {
      const id = chip.getAttribute('aria-describedby') as string
      expect(document.getElementById(id)?.textContent).toBe(
        'Wat je uitzet, verdwijnt alleen uit beeld — er gaat niets verloren, en je zet het hier met één tik terug.',
      )
    }
  })

  it('laat een kaart zonder gegevens weg, en NOEMT ZE BIJ NAAM', () => {
    // ⚠ Zonder die zin doet deze ronde precies wat ronde 75 opruimde: een kaart die
    // STIL wegblijft, zodat je nooit ontdekt dat de app iets kón. En bij naam, in het
    // enkelvoud: er kan er hier maar één ontbreken.
    toon({ ...ALLES, toekomst: false })
    staatOpen()
    expect(screen.queryByRole('button', { name: 'Wat komt eraan' })).toBeNull()
    expect(document.querySelector('[data-niet-kiesbaar]')?.textContent).toBe(
      'De kaart Wat komt eraan staat er niet bij: daar valt nu nog niets te tonen.',
    )
  })

  it('zwijgt over weggelaten kaarten zodra ze er allemaal zijn', () => {
    toon()
    staatOpen()
    expect(document.querySelector('[data-niet-kiesbaar]')).toBeNull()
  })

  it('blijft helemaal weg wanneer er niets te kiezen valt', () => {
    const niets = Object.fromEntries(OVERZICHT_KAART_IDS.map((id) => [id, false])) as Record<
      OverzichtKaartId,
      boolean
    >
    toon(niets)
    expect(blok()).toBeNull()
  })

  it('onthoudt je keuze op dit toestel', async () => {
    const user = userEvent.setup()
    toon()
    staatOpen()
    await user.click(screen.getByRole('button', { name: 'Recente boekingen' }))
    cleanup()
    toon()
    staatOpen()
    expect(screen.getByRole('button', { name: 'Recente boekingen' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('trekt zich niets aan van een bewaarde voorkeur die geen lijst is', () => {
    // ⚠ Zonder `keurVerborgenOverzichtKaarten` zou de kale tekst "rapport" hier als
    // lijst gelezen worden — `'rapport'.includes('rapport')` is waar — en dan
    // verdwijnt die kaart door een waarde die nooit een keuze van jou was.
    localStorage.setItem('fk_verborgen_overzichtkaarten', '"rapport"')
    toon()
    staatOpen()
    expect(screen.getByRole('button', { name: 'Rapport' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('toont alles wanneer de bewaarde voorkeur kapot is', () => {
    // ⚠ De veilige kant op: bij twijfel toont de app alles.
    localStorage.setItem('fk_verborgen_overzichtkaarten', '{kapot')
    toon()
    staatOpen()
    for (const knop of within(
      screen.getByRole('group', { name: 'Welke kaarten wil je hier zien?' }),
    ).getAllByRole('button')) {
      expect(knop).toHaveAttribute('aria-pressed', 'true')
    }
  })

  it('raakt de voorkeur van de Analyse-kaarten niet aan', async () => {
    // ⚠ Drie aparte sleutels in localStorage (ronde 75, 81, 90). Deelden ze er één,
    // dan zou een chip hier een kaart daar uitzetten.
    const user = userEvent.setup()
    localStorage.setItem('fk_verborgen_analysekaarten', '["winkel"]')
    toon()
    staatOpen()
    await user.click(screen.getByRole('button', { name: 'Rapport' }))
    expect(localStorage.getItem('fk_verborgen_analysekaarten')).toBe('["winkel"]')
    expect(JSON.parse(localStorage.getItem('fk_verborgen_overzichtkaarten') as string)).toEqual([
      'rapport',
    ])
  })
})
