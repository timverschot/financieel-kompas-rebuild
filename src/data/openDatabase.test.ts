import { describe, it, expect, vi, afterEach } from 'vitest'
import { db, openDatabase } from './db'

// Ronde 35. De app toont sinds kort een uitlegscherm wanneer de opslag niet
// opengaat. Maar het geval dat dat scherm bij naam noemt — "deze pagina draait
// nog een oudere versie" — kwam er nooit in terecht: IndexedDB blokkeert dan
// zonder ooit te lukken of te mislukken, en de app bleef eeuwig op "Laden…".
// Deze tests bewaken beide vangnetten.

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('openDatabase', () => {
  it('gaat gewoon open wanneer er niets in de weg zit', async () => {
    await expect(openDatabase()).resolves.toBeUndefined()
    expect(db.isOpen()).toBe(true)
  })

  it('geeft een leesbare fout wanneer een ander tabblad de weg verspert', async () => {
    // Doe alsof het openen blijft hangen (zo gedraagt IndexedDB zich echt) en
    // laat Dexie melden dat er geblokkeerd wordt.
    vi.spyOn(db, 'open').mockReturnValue(new Promise(() => {}) as ReturnType<typeof db.open>)
    let meldGeblokkeerd: (() => void) | undefined
    vi.spyOn(db, 'on').mockImplementation(((naam: string, fn: () => void) => {
      if (naam === 'blocked') meldGeblokkeerd = fn
    }) as unknown as typeof db.on)

    const bezig = openDatabase()
    meldGeblokkeerd?.()
    await expect(bezig).rejects.toThrow(/ander tabblad/)
  })

  it('blijft niet eeuwig wachten wanneer er niets gebeurt', async () => {
    vi.useFakeTimers()
    vi.spyOn(db, 'open').mockReturnValue(new Promise(() => {}) as ReturnType<typeof db.open>)
    vi.spyOn(db, 'on').mockImplementation((() => {}) as unknown as typeof db.on)

    const bezig = openDatabase(10000)
    // Bewust een verwachting koppelen vóór we de klok vooruitzetten, anders is de
    // afwijzing even ongevangen.
    const uitkomst = expect(bezig).rejects.toThrow(/reageert niet/)
    await vi.advanceTimersByTimeAsync(10001)
    await uitkomst
  })

  it('zet de wachttimer stop zodra de database open is', async () => {
    // Zonder deze opruiming blijft er een timer van tien seconden lopen ná elke
    // gelukte start. Dat is geen fout die je ziet, maar in de tests houdt hij de
    // nepklok bezig en in de app houdt hij een verwijzing vast.
    vi.useFakeTimers()
    const wis = vi.spyOn(globalThis, 'clearTimeout')
    await openDatabase()
    expect(wis).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('laat een late blokkade de start niet alsnog omkeren', async () => {
    let meldGeblokkeerd: (() => void) | undefined
    vi.spyOn(db, 'on').mockImplementation(((naam: string, fn: () => void) => {
      if (naam === 'blocked') meldGeblokkeerd = fn
    }) as unknown as typeof db.on)

    await expect(openDatabase()).resolves.toBeUndefined()
    expect(meldGeblokkeerd).toBeTypeOf('function')

    // De echte controle: de grendel moet DICHT staan, zodat een blocked-melding
    // die na een gelukte start binnenkomt niets meer probeert af te handelen. Dat
    // meten we aan het gedrag: er mag geen tweede timer of afhandeling volgen.
    vi.useFakeTimers()
    meldGeblokkeerd?.()
    expect(vi.getTimerCount()).toBe(0)
    // En de database is en blijft gewoon open.
    expect(db.isOpen()).toBe(true)
  })
})
