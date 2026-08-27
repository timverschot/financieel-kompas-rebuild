import { describe, it, expect } from 'vitest'
import { synczin } from './synczin'
import { vertaal } from '../i18n'

// Ronde 100. Twee zwijgpaden zaten hier: de synchronisatie bij het opstarten noemde de
// geweigerde regels helemaal niet, en regels die de VORM niet haalden (`ongeldig`) kwamen
// in geen enkele zin voor. Bij vijf zulke regels las je "0 verstuurd, 0 opgehaald" — een
// zin die klinkt alsof er niets aan de hand was.

const nl = (sleutel: string, params?: Record<string, string | number>) => vertaal('nl', sleutel, params)

const uitkomst = (over: Partial<Parameters<typeof synczin>[0]> = {}) => ({
  gepusht: 0,
  opgehaald: 0,
  ongeldig: 0,
  verouderd: 0,
  teNieuw: 0,
  ...over,
})

describe('synczin', () => {
  it('houdt de zin kort wanneer alles gelukt is', () => {
    expect(synczin(uitkomst({ gepusht: 2, opgehaald: 3 }), false, nl)).toBe(
      'Gesynchroniseerd: 2 verstuurd, 3 opgehaald.',
    )
  })

  it('telt élke regel die niet ingelezen is', () => {
    // ⚠ De drie soorten samen: te oud, te nieuw, én de regels die de vorm niet haalden.
    // Die laatste stonden in géén enkele zin.
    expect(synczin(uitkomst({ opgehaald: 1, ongeldig: 5, verouderd: 2, teNieuw: 1 }), false, nl)).toBe(
      'Gesynchroniseerd: 0 verstuurd, 1 opgehaald, 8 niet ingelezen.',
    )
  })

  it('zwijgt niet over regels die alleen de vorm niet haalden', () => {
    // ⚠ Dit was het stilste geval: "0 verstuurd, 0 opgehaald" terwijl er vijf regels
    // weggevallen waren.
    expect(synczin(uitkomst({ ongeldig: 5 }), false, nl)).toBe(
      'Gesynchroniseerd: 0 verstuurd, 0 opgehaald, 5 niet ingelezen.',
    )
  })

  it('zegt hetzelfde bij de synchronisatie die vanzelf gebeurt', () => {
    // ⚠ DIT WAS HET ANDERE ZWIJGPAD, en net de weg waarlangs Timothy het tegenkwam: de
    // synchronisatie bij het opstarten noemde de geweigerde regels helemaal niet.
    expect(synczin(uitkomst({ gepusht: 1, verouderd: 3 }), true, nl)).toBe(
      'Automatisch gesynchroniseerd: 1 verstuurd, 0 opgehaald, 3 niet ingelezen.',
    )
    expect(synczin(uitkomst({ gepusht: 1 }), true, nl)).toBe('Automatisch gesynchroniseerd: 1 verstuurd, 0 opgehaald.')
  })

  it('zegt het ook in het Frans, met de vaste spatie vóór de dubbele punt', () => {
    const fr = (sleutel: string, params?: Record<string, string | number>) => vertaal('fr', sleutel, params)
    expect(synczin(uitkomst({ verouderd: 2 }), false, fr)).toBe(
      `Synchronisé${String.fromCharCode(0xa0)}: 0 envoyée(s), 0 récupérée(s), 2 non importée(s).`,
    )
  })
})
