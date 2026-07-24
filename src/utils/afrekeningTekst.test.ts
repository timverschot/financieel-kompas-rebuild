import { describe, it, expect } from 'vitest'
import { afrekeningKosten, afrekeningSamenvatting, verrekenTekst } from './afrekeningTekst'
import { vertaal } from '../i18n'
import type { Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 10000,
  betaaldDoor: 'jij',
  datum: '2026-07-15',
  ...over,
})

describe('verrekenTekst', () => {
  it('toont wie wie verschuldigd is', () => {
    expect(verrekenTekst(t, 5000)).toContain('Partner is jou')
    expect(verrekenTekst(t, -5000)).toContain('Jij bent partner')
    expect(verrekenTekst(t, 0)).toBe('Niets te verrekenen')
  })
})

describe('afrekeningKosten', () => {
  it('selecteert enkel de kosten uit de momentopname', () => {
    const kosten = [kost({ id: 'a' }), kost({ id: 'b' }), kost({ id: 'c' })]
    const afr: Verrekening = { id: 'v1', dossierId: 'd1', datum: '2026-07-31', bedrag: 0, kostIds: ['a', 'c'] }
    expect(afrekeningKosten(afr, kosten).map((k) => k.id)).toEqual(['a', 'c'])
  })
})

describe('afrekeningSamenvatting', () => {
  const dossier: Dossier = { id: 'd1', naam: 'Kinderen', aandeelJij: 50 }
  const kinderen: Kind[] = [{ id: 'kind1', naam: 'Emma' }]
  const kosten: GedeeldeKost[] = [
    kost({ id: 'a', omschrijving: 'Schoolreis', bedrag: 10000, betaaldDoor: 'jij', kindIds: ['kind1'] }),
  ]
  const afr: Verrekening = {
    id: 'v1',
    dossierId: 'd1',
    datum: '2026-07-31',
    bedrag: 5000,
    periodeVan: '2026-07-01',
    periodeTot: '2026-07-31',
    kindIds: ['kind1'],
    kostIds: ['a'],
  }

  it('bevat de dossiernaam, periode, kind, kostregel en het resultaat', () => {
    const tekst = afrekeningSamenvatting(t, dossier, afr, kosten, kinderen)
    expect(tekst).toContain('Afrekening — Kinderen')
    expect(tekst).toContain('2026-07-01 – 2026-07-31')
    expect(tekst).toContain('Emma')
    expect(tekst).toContain('Schoolreis')
    expect(tekst).toContain('Partner is jou')
  })
})
