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
  startVersiewacht,
  bouwdatumTekst,
  haalBouwdatum,
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
  // ⚠ RONDE 99 — DEZE NEPSERVICEWORKER KENT NU OOK `waiting`, `installing` EN
  // `updatefound`. Zonder die drie kon geen enkele test de wedloop bij een F5 naspelen:
  // de nieuwe service worker neemt het roer dan over vóór er iemand luistert, dus
  // `controllerchange` valt in het niets.
  function nepServiceWorker(
    metBaas: boolean,
    registratie: { waiting?: unknown; installing?: { state: string } } = {},
  ) {
    const luisteraars: Record<string, (() => void)[]> = {}
    const regLuisteraars: Record<string, (() => void)[]> = {}
    const installLuisteraars: Record<string, (() => void)[]> = {}
    const update = vi.fn()
    const reg = {
      ...registratie,
      update,
      addEventListener: (naam: string, cb: () => void) => {
        regLuisteraars[naam] = [...(regLuisteraars[naam] ?? []), cb]
      },
    }
    if (registratie.installing) {
      Object.assign(registratie.installing, {
        addEventListener: (naam: string, cb: () => void) => {
          installLuisteraars[naam] = [...(installLuisteraars[naam] ?? []), cb]
        },
      })
    }
    const sw = {
      controller: metBaas ? {} : null,
      getRegistration: () => Promise.resolve(reg),
      addEventListener: (naam: string, cb: () => void) => {
        luisteraars[naam] = [...(luisteraars[naam] ?? []), cb]
      },
      removeEventListener: (naam: string, cb: () => void) => {
        luisteraars[naam] = (luisteraars[naam] ?? []).filter((x) => x !== cb)
      },
    }
    vi.stubGlobal('navigator', { serviceWorker: sw })
    return {
      wissel: () => (luisteraars['controllerchange'] ?? []).forEach((cb) => cb()),
      updatefound: () => (regLuisteraars['updatefound'] ?? []).forEach((cb) => cb()),
      installKlaar: () => {
        if (registratie.installing) registratie.installing.state = 'installed'
        ;(installLuisteraars['statechange'] ?? []).forEach((cb) => cb())
      },
      update,
      aantalUpdatefoundLuisteraars: () => (regLuisteraars['updatefound'] ?? []).length,
    }
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

  it('⚠ zwijgt daarna NIET de hele sessie (ronde 99)', () => {
    // ⚠ DE ZWAARSTE VAN DE DRIE FOUTEN. `hadAlEenBaas` werd ÉÉN keer bepaald, bij het
    // aankoppelen, en stond op `const`. Start een pagina ONgecontroleerd — het
    // allereerste bezoek, maar óók na een harde herlaadbeurt (Ctrl+Shift+R) — dan stond
    // de vlag op `false` en was de balk voor de HELE sessie uitgeschakeld. Gemeten in een
    // echte browser: na zo'n start verscheen ze niet meer, ook niet toen er wél een
    // nieuwe versie kwam.
    const { wissel } = nepServiceWorker(false)
    volgServiceWorker()
    wissel() // de eerste overname: dat is de installatie, geen update
    expect(isNieuweVersieKlaar()).toBe(false)
    wissel() // en dít is er wél een
    expect(isNieuweVersieKlaar()).toBe(true)
  })

  it('kijkt METEEN bij het aankoppelen (ronde 99)', async () => {
    // ⚠ Tot deze ronde was een TABBLADWISSEL de enige aanleiding, met bovendien een
    // ondergrens van een kwartier waarvan de klok bij het opstarten begint. Wie zijn
    // tabblad nooit verlaat — precies de gebruiker voor wie deze balk bedoeld is — liet
    // de app dus nooit kijken.
    const { update } = nepServiceWorker(true)
    volgServiceWorker()
    await Promise.resolve()
    await Promise.resolve()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('meldt een versie die al KLAARSTAAT bij het opstarten (ronde 99)', async () => {
    // ⚠ De wedloop bij een F5: de nieuwe service worker kan het roer al overgenomen
    // hebben vóór er iemand luistert. Dan is `controllerchange` voorbij en helpt alleen
    // nog rechtstreeks aan de browser vragen wat er klaarstaat.
    nepServiceWorker(true, { waiting: {} })
    volgServiceWorker()
    await Promise.resolve()
    await Promise.resolve()
    expect(isNieuweVersieKlaar()).toBe(true)
  })

  it('volgt er ook eentje die nog aan het INSTALLEREN is (ronde 99)', async () => {
    const { installKlaar } = nepServiceWorker(true, { installing: { state: 'installing' } })
    volgServiceWorker()
    await Promise.resolve()
    await Promise.resolve()
    expect(isNieuweVersieKlaar()).toBe(false)
    installKlaar()
    expect(isNieuweVersieKlaar()).toBe(true)
  })

  it('meldt niets bij een EERSTE installatie, ook niet via updatefound (ronde 99)', async () => {
    // ⚠ Dezelfde uitzondering als bij `controllerchange`: op het allereerste bezoek
    // installeert er ook eentje, en dan is er niets bijgewerkt.
    const { installKlaar } = nepServiceWorker(false, { installing: { state: 'installing' } })
    volgServiceWorker()
    await Promise.resolve()
    await Promise.resolve()
    installKlaar()
    expect(isNieuweVersieKlaar()).toBe(false)
  })

  it('zet de updatefound-luisteraar er maar ÉÉN keer op (ronde 99)', async () => {
    // ⚠ `kijkNu` draait bij het opstarten én bij elke tabbladwissel. Zonder een vlag kwam
    // er telkens een luisteraar bij, en meldde de app dezelfde versie tien keer.
    let klok = 0
    const nep = nepServiceWorker(true)
    volgServiceWorker(() => klok)
    await Promise.resolve()
    await Promise.resolve()
    klok += CONTROLE_PAUZE_MS + 1
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    await Promise.resolve()
    expect(nep.aantalUpdatefoundLuisteraars()).toBe(1)
  })

  it('laat de service worker opnieuw kijken wanneer je naar de app terugkeert', async () => {
    // Zonder dit krijgt een tabblad dat uren openstaat NOOIT te horen dat er iets
    // nieuws is — en dat is net het geval waarvoor de balk bedoeld is.
    let klok = 0
    const { update } = nepServiceWorker(true)
    volgServiceWorker(() => klok)
    await Promise.resolve()
    // ⚠ Eén keer bij het aankoppelen (ronde 99); de tabbladwissel maakt er twee van.
    expect(update).toHaveBeenCalledTimes(1)
    klok += CONTROLE_PAUZE_MS + 1
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('vraagt hooguit één keer per kwartier', async () => {
    // Van tabblad wisselen doe je tientallen keren per uur; dit is een verzoek naar
    // de server.
    let klok = 0
    const { update } = nepServiceWorker(true)
    volgServiceWorker(() => klok)
    await Promise.resolve()
    expect(update).toHaveBeenCalledTimes(1)
    klok += 60_000
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('meldt een installatie die al KLAAR is, zonder op statechange te wachten', async () => {
    // ⚠ De synchrone tak van `volgInstallatie`. Geen enkele test raakte hem: de nepworker
    // ging altijd via `statechange`. En juist dit is het geval waar de ronde over gaat —
    // er stond al iets klaar toen wij begonnen te kijken.
    nepServiceWorker(true, { installing: { state: 'installed' } })
    volgServiceWorker()
    await Promise.resolve()
    await Promise.resolve()
    expect(isNieuweVersieKlaar()).toBe(true)
  })

  it('overleeft een browser die (nog) geen registratie heeft', async () => {
    // ⚠ Het ALLEREERSTE bezoek: `registerSW.js` registreert pas op `window.load`, dus bij
    // het opstarten bestaat er nog niets om te bevragen. Dat mag niet gooien.
    const sw = {
      controller: {},
      getRegistration: () => Promise.resolve(undefined),
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    vi.stubGlobal('navigator', { serviceWorker: sw })
    expect(() => volgServiceWorker()).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    expect(isNieuweVersieKlaar()).toBe(false)
  })

  it('zwijgt nadat er opgezegd is', async () => {
    // ⚠ De luisteraars op een installerende worker en op `updatefound` zijn niet met
    // `removeEventListener` af te halen. Zonder een controle op `gestopt` kon
    // `meldNieuweVersie()` dus nog afgaan ná het opzeggen — gemeten door een doorlichting.
    const { installKlaar, wissel } = nepServiceWorker(true, { installing: { state: 'installing' } })
    const stop = volgServiceWorker()
    await Promise.resolve()
    await Promise.resolve()
    stop()
    installKlaar()
    wissel()
    expect(isNieuweVersieKlaar()).toBe(false)
  })

  it('doet niets in een omgeving zonder service worker', () => {
    vi.stubGlobal('navigator', {})
    expect(() => volgServiceWorker()()).not.toThrow()
    expect(isNieuweVersieKlaar()).toBe(false)
  })
})

describe('startVersiewacht', () => {
  it('start hooguit één keer', () => {
    // ⚠ `main.tsx` roept dit aan bij het opstarten. Zou een tweede aanroep er nóg een set
    // luisteraars bij zetten, dan meldde de app dezelfde versie twee keer.
    const luisteraars: Record<string, (() => void)[]> = {}
    const sw = {
      controller: {},
      getRegistration: () => Promise.resolve({ update: vi.fn(), addEventListener: () => {} }),
      addEventListener: (naam: string, cb: () => void) => {
        luisteraars[naam] = [...(luisteraars[naam] ?? []), cb]
      },
      removeEventListener: () => {},
    }
    vi.stubGlobal('navigator', { serviceWorker: sw })
    startVersiewacht()
    startVersiewacht()
    expect((luisteraars['controllerchange'] ?? []).length).toBe(1)
  })
})

describe('haalBouwdatum', () => {
  const antwoord = (ok: boolean, json: unknown) =>
    ({ ok, json: async () => json }) as unknown as Response

  it('leest de bouwdatum uit versie.json', async () => {
    const ophalen = vi.fn(async () => antwoord(true, { gebouwd: '2026-08-27T01:12:00.000Z' }))
    expect(await haalBouwdatum(ophalen as unknown as typeof fetch)).toBe('2026-08-27T01:12:00.000Z')
    // ⚠ ZONDER `cache: 'no-store'`, en dat is de hele truc: het antwoord hoort uit de
    // cache van de service worker te komen, want dát is de versie die je draait.
    expect(ophalen).toHaveBeenCalledWith('./versie.json')
  })

  it('geeft null wanneer het bestand er niet is', async () => {
    // ⚠ De ontwikkelserver draait de bouwstap niet, dus daar bestaat het bestand niet.
    // Dan hoort de kaart weg te blijven in plaats van een lege datum te tonen.
    //
    // ⚠ MET EEN GELDIGE INHOUD ERIN, en dat is met opzet (mutatietest). Met een leeg
    // antwoord kon deze test niet falen: dan viel de inhoudscontrole er tóch al over, en
    // bleef de regel `if (!antwoord.ok)` ongedekt. De regel die hier vastligt is: een
    // MISLUKT antwoord wordt nooit gebruikt, wat er ook in staat.
    const ophalen = vi.fn(async () => antwoord(false, { gebouwd: '2026-08-27T01:12:00.000Z' }))
    expect(await haalBouwdatum(ophalen as unknown as typeof fetch)).toBeNull()
  })

  it('geeft null bij een antwoord zonder bruikbare datum', async () => {
    for (const inhoud of [{}, { gebouwd: '' }, { gebouwd: 42 }, null]) {
      const ophalen = vi.fn(async () => antwoord(true, inhoud))
      expect(await haalBouwdatum(ophalen as unknown as typeof fetch)).toBeNull()
    }
  })

  it('geeft null wanneer het ophalen zelf mislukt', async () => {
    // Offline vóór de eerste cache. Een fout hier mag het scherm niet raken.
    const ophalen = vi.fn(async () => {
      throw new Error('geen netwerk')
    })
    expect(await haalBouwdatum(ophalen as unknown as typeof fetch)).toBeNull()
  })
})

describe('bouwdatumTekst', () => {
  it('zet een ISO-tekst om naar gewone taal, mét het uur', () => {
    // ⚠ Mét het uur: dit project publiceert soms drie keer op één dag, en dan zou een
    // kale datum bij drie versies hetzelfde zeggen.
    const tekst = bouwdatumTekst('2026-08-27T01:12:00.000Z', 'nl-BE')
    expect(tekst).toContain('2026')
    expect(tekst).toMatch(/\d{2}:\d{2}/)
  })

  it('geeft onleesbare tekst onveranderd terug', () => {
    // Een datum verzinnen is erger dan een rare tekst tonen.
    expect(bouwdatumTekst('geen datum', 'nl-BE')).toBe('geen datum')
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
