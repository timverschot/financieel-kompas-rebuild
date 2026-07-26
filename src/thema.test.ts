import { describe, it, expect, beforeEach } from 'vitest'
import { isDonkerActief, systeemVerkiestDonker, THEMAKEUZES } from './thema'

function zetSysteem(donker: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: donker && query.includes('dark'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  zetSysteem(false)
})

describe('thema', () => {
  it('licht is nooit donker', () => {
    expect(isDonkerActief('licht')).toBe(false)
  })

  it('donker is altijd donker', () => {
    expect(isDonkerActief('donker')).toBe(true)
  })

  it('biedt twee keuzes aan — "systeem" is weg', () => {
    expect(THEMAKEUZES.map((k) => k.waarde)).toEqual(['licht', 'donker'])
  })
})

// De voorkeur van het toestel wordt alleen bij de allereerste start gebruikt: daarna
// is het jouw keuze. Deze functie is de enige plek die er nog naar kijkt.
describe('systeemVerkiestDonker', () => {
  it('leest de systeemvoorkeur', () => {
    zetSysteem(true)
    expect(systeemVerkiestDonker()).toBe(true)
    zetSysteem(false)
    expect(systeemVerkiestDonker()).toBe(false)
  })

  it('valt terug op licht wanneer matchMedia niet bestaat', () => {
    // @ts-expect-error — bewust weghalen om de terugval te testen
    window.matchMedia = undefined
    expect(systeemVerkiestDonker()).toBe(false)
  })
})
