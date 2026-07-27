import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OnderNavigatie } from './OnderNavigatie'

// Ronde 34. Twee dingen die op een echte iPhone misgingen en die je in jsdom wél
// kan vastleggen: de balk die tijdens het scrollen verdween en niet terugkwam, en
// de 'Meer'-lade die niet meer sloot wanneer je ernaast tikte.

function toon(over: Partial<React.ComponentProps<typeof OnderNavigatie>> = {}) {
  const onKies = vi.fn()
  const onNieuweTransactie = vi.fn()
  render(<OnderNavigatie actief="overzicht" onKies={onKies} onNieuweTransactie={onNieuweTransactie} {...over} />)
  return { onKies, onNieuweTransactie }
}

const balk = () => document.querySelector('.kompal-bottombar') as HTMLElement
const weggeschoven = () => balk().style.transform.includes('110%')

// Scrollen nabootsen: jsdom verplaatst niets, dus zetten we scrollY zelf en
// sturen we de gebeurtenis die de browser ook zou sturen.
async function scrollNaar(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
  await act(async () => {
    window.dispatchEvent(new Event('scroll'))
  })
}

// Tijd is hier lastig: de balk komt vanzelf terug na 260 ms stilte. Zou de
// nepklok meelopen met de echte (`shouldAdvanceTime`), dan kan die timer op een
// trage machine tússen twee controles door vuren en wordt de build willekeurig
// rood. Vandaar: de klok staat standaard STIL, en alleen de tests die echt tijd
// nodig hebben zetten hem zelf vooruit.
//
// `userEvent` heeft wél een lopende klok nodig, dus die twee tests draaien op de
// echte tijd — ze meten daar toch niets aan.
//
// Ronde 35: ÉLKE scroll-test zet de nepklok nu zelf aan. Drie ervan deden dat nog
// niet, en die keken naar de balk terwijl de timer van 260 ms op de echte klok
// liep. Op een trage of drukke machine kon die timer tussen twee regels door
// vuren — dan was de balk al teruggekomen en ging de build rood zonder dat er
// iets veranderd was. Precies de valkuil die hierboven beschreven staat.
beforeEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
})

afterEach(() => {
  vi.useRealTimers()
})

/** Doe alsof er zoveel milliseconden voorbijgaan, zonder de echte klok.
 *  Zet vóór het renderen `vi.useFakeTimers()` aan, anders staat de timer die je
 *  vooruit wil spoelen al op de echte klok. */
async function wacht(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

describe('OnderNavigatie — wegschuiven en terugkomen', () => {
  it('staat er gewoon zolang je niet scrolt', () => {
    toon()
    expect(weggeschoven()).toBe(false)
  })

  it('schuift weg wanneer je naar beneden scrolt', async () => {
    vi.useFakeTimers()
    toon()
    await scrollNaar(200)
    await scrollNaar(400)
    expect(weggeschoven()).toBe(true)
  })

  it('komt terug zodra je stopt met scrollen', async () => {
    vi.useFakeTimers()
    toon()
    await scrollNaar(400)
    expect(weggeschoven()).toBe(true)

    // "Stoppen met scrollen" is: er komt 260 ms lang geen gebeurtenis meer.
    await wacht(300)
    expect(weggeschoven()).toBe(false)
  })

  it('komt ook terug wanneer je weer omhoog scrolt', async () => {
    vi.useFakeTimers()
    toon()
    await scrollNaar(600)
    expect(weggeschoven()).toBe(true)
    await scrollNaar(500)
    expect(weggeschoven()).toBe(false)
  })

  it('blijft staan bij rustig scrollen in kleine stapjes onder de drempel', async () => {
    // Dit is de valkuil: een scroll-gebeurtenis vuurt per beeldframe, en bij
    // normaal leestempo is dat maar een paar pixels. Zou de drempel per
    // gebeurtenis gelden, dan verdween de balk enkel bij een snelle veeg.
    vi.useFakeTimers()
    toon()
    await scrollNaar(200)
    await wacht(300)
    expect(weggeschoven()).toBe(false)

    // Vijf stapjes van 5 px halen samen de drempel van 24 px niet.
    for (const y of [205, 210, 215, 220]) await scrollNaar(y)
    expect(weggeschoven()).toBe(false)
    // Nog twee stapjes erbij en de opgetelde afstand is er wél.
    for (const y of [226, 232]) await scrollNaar(y)
    expect(weggeschoven()).toBe(true)
  })

  it('staat altijd bovenaan de pagina, ook als je daar naar beneden scrolt', async () => {
    vi.useFakeTimers()
    toon()
    await scrollNaar(400)
    expect(weggeschoven()).toBe(true)
    // Terug naar boven. Let op: dit alléén bewijst de regel niet — een grote
    // sprong omhoog haalt sowieso de drempel. Vandaar de tweede helft.
    await scrollNaar(10)
    expect(weggeschoven()).toBe(false)

    // Nu naar BENEDEN scrollen, maar binnen de bovenste 80 px. Zonder de
    // `y < 80`-regel zou de balk hier wegschuiven.
    await scrollNaar(50)
    await scrollNaar(75)
    expect(weggeschoven()).toBe(false)
  })

  it('blijft staan zolang de Meer-lade open is', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Meer' }))
    await scrollNaar(600)
    expect(weggeschoven()).toBe(false)
  })
})

describe('OnderNavigatie — de Meer-lade', () => {
  it('sluit wanneer je naast de lade tikt', async () => {
    const user = userEvent.setup()
    toon()
    await user.click(screen.getByRole('button', { name: 'Meer' }))
    expect(screen.getByRole('button', { name: 'Rekeningen' })).toBeInTheDocument()

    // Het donkere vlak MOET buiten de <nav> staan: die draagt sinds ronde 34 een
    // `transform`, en daarmee wordt zij het referentiekader voor alles wat
    // erbinnen `position: fixed` is. Een vlak binnenin bedekte dan alleen de balk
    // zelf, en dan sluit een tik ernaast de lade niet meer.
    const vlak = document.querySelector('[data-meer-laag]') as HTMLElement
    expect(vlak).toBeTruthy()
    expect(balk().contains(vlak)).toBe(false)

    await user.click(vlak)
    expect(screen.queryByRole('button', { name: 'Rekeningen' })).toBeNull()
  })

  it('brengt je naar de gekozen pagina en sluit daarna', async () => {
    const user = userEvent.setup()
    const { onKies } = toon()
    await user.click(screen.getByRole('button', { name: 'Meer' }))
    await user.click(screen.getByRole('button', { name: 'Spaardoelen' }))
    expect(onKies).toHaveBeenCalledWith('spaardoelen')
    expect(screen.queryByRole('button', { name: 'Rekeningen' })).toBeNull()
  })
})
