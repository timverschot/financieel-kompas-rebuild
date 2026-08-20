import { describe, it, expect, afterEach, vi } from 'vitest'
import { vraagBlijvendeOpslag } from './opslag'

// `navigator.storage` bestaat niet in de testomgeving; we zetten hem er zelf op en
// halen hem daarna weer weg, zodat de tests elkaar niet beïnvloeden.
function zetOpslag(waarde: unknown) {
  Object.defineProperty(navigator, 'storage', { value: waarde, configurable: true })
}

afterEach(() => {
  Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'storage')
  vi.restoreAllMocks()
})

describe('vraagBlijvendeOpslag', () => {
  it('zegt "onbekend" wanneer de browser de vraag niet kent', async () => {
    zetOpslag(undefined)
    expect(await vraagBlijvendeOpslag()).toBe('onbekend')
  })

  it('zegt "onbekend" wanneer er wel een storage is maar geen persist', async () => {
    zetOpslag({})
    expect(await vraagBlijvendeOpslag()).toBe('onbekend')
  })

  it('vraagt niets meer wanneer het al blijvend is', async () => {
    const persist = vi.fn()
    zetOpslag({ persisted: () => Promise.resolve(true), persist })
    expect(await vraagBlijvendeOpslag()).toBe('blijvend')
    expect(persist).not.toHaveBeenCalled()
  })

  it('vraagt het aan wanneer het nog niet blijvend is, en meldt de toezegging', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    zetOpslag({ persisted: () => Promise.resolve(false), persist })
    expect(await vraagBlijvendeOpslag()).toBe('blijvend')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('zegt "tijdelijk" wanneer de browser weigert', async () => {
    zetOpslag({ persisted: () => Promise.resolve(false), persist: () => Promise.resolve(false) })
    expect(await vraagBlijvendeOpslag()).toBe('tijdelijk')
  })

  it('werkt ook zonder persisted()', async () => {
    zetOpslag({ persist: () => Promise.resolve(true) })
    expect(await vraagBlijvendeOpslag()).toBe('blijvend')
  })

  // ⚠ Een mislukte vraag mag het opstarten van de app niet raken.
  it('geeft "onbekend" wanneer de browser een fout gooit', async () => {
    zetOpslag({
      persisted: () => Promise.reject(new Error('geweigerd')),
      persist: () => Promise.resolve(true),
    })
    expect(await vraagBlijvendeOpslag()).toBe('onbekend')
  })
})
