import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CONTROLE_PAUZE_MS,
  ModuleNietGeladen,
  exportFoutmelding,
  isModuleFout,
  isNieuweVersieKlaar,
  laadOnderdeel,
  meldNieuweVersie,
  vergeetNieuweVersie,
  volgNieuweVersie,
  volgServiceWorker,
} from './appVersie'
import { vertaal } from '../i18n'

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

// Ronde 56. Dit bestand bestaat door een échte melding: na een publicatie kreeg
// Timothy een foutscherm bij het opzoeken van een product, en het brokje in de
// foutmelding gaf 404. Dezelfde val staat nog onder de PDF-bibliotheek — en die
// maakt de afrekening voor de andere ouder en de bewijsmap voor een advocaat.

beforeEach(() => {
  vergeetNieuweVersie()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Zo schrijven de browsers het op. Ze staan hier niet omdat de code ze herkent — dat
// doet ze bewust NIET meer — maar om vast te leggen dat het er zoveel verschillende
// zijn dat herkennen geen begaanbare weg is.
const ECHTE_IMPORTFOUTEN = [
  'Failed to fetch dynamically imported module: https://timverschot.github.io/financieel-kompas-rebuild/assets/jspdf.es.min-CxnS4d52.js',
  'error loading dynamically imported module',
  'Importing a module script failed.',
  'Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".',
  'Load failed',
]

describe('laadOnderdeel', () => {
  it('geeft de module gewoon terug wanneer het lukt', async () => {
    expect(await laadOnderdeel(async () => ({ jsPDF: 'ok' }))).toEqual({ jsPDF: 'ok' })
  })

  it('probeert NIET opnieuw', async () => {
    // Een mislukte import blijft in de browser als mislukt genoteerd: een tweede
    // poging levert dezelfde fout op zonder ook maar één nieuw verzoek. Ze kost
    // alleen tijd — gemeten 304 ms in plaats van 150.
    let pogingen = 0
    await laadOnderdeel(async () => {
      pogingen += 1
      throw new TypeError(ECHTE_IMPORTFOUTEN[0])
    }).catch(() => {})
    expect(pogingen).toBe(1)
  })

  it('behandelt élke mislukking als "niet geladen", hoe de browser het ook opschrijft', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    for (const melding of ECHTE_IMPORTFOUTEN) {
      const fout = await laadOnderdeel(async () => {
        throw new TypeError(melding)
      }).catch((e) => e)
      expect({ melding, herkend: isModuleFout(fout) }).toEqual({ melding, herkend: true })
      expect((fout as ModuleNietGeladen).soort).toBe('onbekend')
    }
  })

  it('beweert NIET dat de app bijgewerkt is', async () => {
    // Dit was de vondst van de nakijkronde: één hapering in een lift zette een balk
    // aan die zei dat er gepubliceerd was, en die bleef staan tot je herlaadde. De
    // app kan dat niet weten, dus zegt ze het niet.
    vi.stubGlobal('navigator', { onLine: true })
    await laadOnderdeel(async () => {
      throw new TypeError(ECHTE_IMPORTFOUTEN[0])
    }).catch(() => {})
    expect(isNieuweVersieKlaar()).toBe(false)
  })

  it('zegt "je bent offline" wanneer de browser dat zeker weet', async () => {
    // `navigator.onLine` liegt de andere kant op (hij zegt "ja" op een wifi zonder
    // internet), maar een NEE is betrouwbaar. En dan is wachten de juiste raad.
    vi.stubGlobal('navigator', { onLine: false })
    const fout = await laadOnderdeel(async () => {
      throw new TypeError(ECHTE_IMPORTFOUTEN[0])
    }).catch((e) => e)
    expect((fout as ModuleNietGeladen).soort).toBe('offline')
  })

  it('bewaart de oorspronkelijke fout', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const oorspronkelijk = new TypeError(ECHTE_IMPORTFOUTEN[0])
    const fout = (await laadOnderdeel(async () => {
      throw oorspronkelijk
    }).catch((e) => e)) as ModuleNietGeladen
    expect(fout.oorzaak).toBe(oorspronkelijk)
  })
})

describe('de melding dat er een nieuwe versie klaarstaat', () => {
  it('waarschuwt elke luisteraar, precies één keer', () => {
    const a = vi.fn()
    const b = vi.fn()
    volgNieuweVersie(a)
    volgNieuweVersie(b)
    meldNieuweVersie()
    meldNieuweVersie()
    expect([a.mock.calls.length, b.mock.calls.length]).toEqual([1, 1])
    expect(isNieuweVersieKlaar()).toBe(true)
  })

  it('laat een luisteraar zich afmelden', () => {
    const a = vi.fn()
    const stop = volgNieuweVersie(a)
    stop()
    meldNieuweVersie()
    expect(a).not.toHaveBeenCalled()
  })
})

describe('volgServiceWorker', () => {
  function nepServiceWorker(metBaas: boolean) {
    const luisteraars: Record<string, (() => void)[]> = {}
    const update = vi.fn()
    const sw = {
      controller: metBaas ? {} : null,
      getRegistration: () => Promise.resolve({ update }),
      addEventListener: (naam: string, cb: () => void) => {
        luisteraars[naam] = [...(luisteraars[naam] ?? []), cb]
      },
      removeEventListener: (naam: string, cb: () => void) => {
        luisteraars[naam] = (luisteraars[naam] ?? []).filter((x) => x !== cb)
      },
    }
    vi.stubGlobal('navigator', { serviceWorker: sw })
    return { wissel: () => (luisteraars['controllerchange'] ?? []).forEach((cb) => cb()), update }
  }

  it('meldt een nieuwe versie zodra een andere service worker het overneemt', () => {
    const { wissel } = nepServiceWorker(true)
    volgServiceWorker()
    wissel()
    expect(isNieuweVersieKlaar()).toBe(true)
  })

  it('zwijgt bij het ALLEREERSTE bezoek', () => {
    // Dan neemt de service worker ook het roer over, en er is niets bijgewerkt: er
    // was gewoon nog niets. Zonder deze uitzondering kreeg iedereen bij zijn eerste
    // bezoek meteen "er is een nieuwe versie".
    const { wissel } = nepServiceWorker(false)
    volgServiceWorker()
    wissel()
    expect(isNieuweVersieKlaar()).toBe(false)
  })

  it('laat de service worker opnieuw kijken wanneer je naar de app terugkeert', async () => {
    // Zonder dit krijgt een tabblad dat uren openstaat NOOIT te horen dat er iets
    // nieuws is — en dat is net het geval waarvoor de balk bedoeld is.
    let klok = 0
    const { update } = nepServiceWorker(true)
    volgServiceWorker(() => klok)
    klok += CONTROLE_PAUZE_MS + 1
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('vraagt hooguit één keer per kwartier', async () => {
    // Van tabblad wisselen doe je tientallen keren per uur; dit is een verzoek naar
    // de server.
    let klok = 0
    const { update } = nepServiceWorker(true)
    volgServiceWorker(() => klok)
    klok += 60_000
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(update).not.toHaveBeenCalled()
  })

  it('doet niets in een omgeving zonder service worker', () => {
    vi.stubGlobal('navigator', {})
    expect(() => volgServiceWorker()()).not.toThrow()
    expect(isNieuweVersieKlaar()).toBe(false)
  })
})

describe('exportFoutmelding', () => {
  it('geeft de gewone zin bij een gewone fout', () => {
    expect(exportFoutmelding(t, new Error('boem'), 'De brief kon niet gemaakt worden.')).toBe(
      'De brief kon niet gemaakt worden.',
    )
  })

  it('raadt herladen aan wanneer het onderdeel niet geladen raakte', () => {
    // Dit is de kern van de ronde: "probeer het opnieuw" kan hier NOOIT lukken.
    const zin = exportFoutmelding(t, new ModuleNietGeladen('onbekend', null), 'De brief kon niet gemaakt worden.')
    expect(zin).toContain('Herlaad de pagina')
    expect(zin).not.toContain('kon niet gemaakt worden')
    // En geen bewering over een publicatie die de app niet kan waarmaken.
    expect(zin).not.toMatch(/bijgewerkt|nieuwe versie/i)
  })

  it('raadt wachten aan wanneer je offline bent', () => {
    const zin = exportFoutmelding(t, new ModuleNietGeladen('offline', null), 'De brief kon niet gemaakt worden.')
    expect(zin).toContain('verbinding')
  })
})
