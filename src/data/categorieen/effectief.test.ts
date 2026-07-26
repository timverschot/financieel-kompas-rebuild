import { describe, it, expect } from 'vitest'
import { bouwEffectieveBoom, type EffectiefItem } from './effectief'

function itemsVan(hoofdNaam: string, catNaam: string, aanpassingen: Parameters<typeof bouwEffectieveBoom>[0]): EffectiefItem[] {
  const boom = bouwEffectieveBoom(aanpassingen)
  const h = boom.find((x) => x.naam === hoofdNaam)
  const c = h?.categorieen.find((x) => x.naam === catNaam)
  return c?.items ?? []
}

describe('bouwEffectieveBoom', () => {
  it('voegt een nieuwe subcategorie toe onder de juiste categorie (gemarkeerd als eigen)', () => {
    const items = itemsVan('Voeding', 'Zuivel en Kaas', [{ id: 'x1', naam: 'Kefir', categorieId: 'cat-zuivel-en-kaas' }])
    const kefir = items.find((i) => i.naam === 'Kefir')
    expect(kefir).toBeTruthy()
    expect(kefir!.eigen).toBe(true)
  })

  it('hernoemt een bestaand ingebouwd item via een override', () => {
    const items = itemsVan('Voeding', 'Zuivel en Kaas', [
      { id: 'i-eieren-4688', naam: 'Bio-eieren', categorieId: 'cat-zuivel-en-kaas' },
    ])
    expect(items.some((i) => i.naam === 'Bio-eieren' && !i.eigen)).toBe(true)
    expect(items.some((i) => i.naam === 'Eieren')).toBe(false)
  })
})

// --- Ronde 27: een eigen boom onder een eigen hoofdcategorie ---
describe('bouwEffectieveBoom met eigen categorieën', () => {
  const hoofd = { id: 'eig-hoofd', naam: 'Hobby' }
  const mid = { id: 'eig-mid', naam: 'Muziek', ouderId: 'eig-hoofd' }
  const item = { id: 'eig-item', naam: 'Snaren', categorieId: 'eig-mid' }

  it('zet een eigen hoofdcategorie vooraan in de boom', () => {
    const boom = bouwEffectieveBoom([], [hoofd])
    expect(boom[0].id).toBe('eig-hoofd')
    expect(boom[0].eigen).toBe(true)
  })

  it('hangt een eigen middencategorie onder haar eigen hoofdcategorie', () => {
    const boom = bouwEffectieveBoom([], [hoofd, mid])
    expect(boom[0].categorieen.map((c) => c.id)).toEqual(['eig-mid'])
    expect(boom[0].categorieen[0].eigen).toBe(true)
  })

  it('hangt een subcategorie onder een eigen middencategorie', () => {
    // Dit kon vóór ronde 27 niet: zo'n item verdween stil uit elke telling omdat
    // de middenlaag alleen ingebouwde categorieën kende.
    const boom = bouwEffectieveBoom([item], [hoofd, mid])
    expect(boom[0].categorieen[0].items.map((i) => i.naam)).toEqual(['Snaren'])
  })

  it('kan een eigen middencategorie ook onder een INGEBOUWDE hoofdcategorie hangen', () => {
    const onderVoeding = { id: 'eig-2', naam: 'Streekproducten', ouderId: 'ov-voeding' }
    const boom = bouwEffectieveBoom([], [onderVoeding])
    const voeding = boom.find((h) => h.id === 'ov-voeding')
    expect(voeding?.categorieen.some((c) => c.id === 'eig-2')).toBe(true)
  })

  it('laat de ingebouwde boom onaangeroerd wanneer er niets eigens is', () => {
    const zonder = bouwEffectieveBoom([])
    const met = bouwEffectieveBoom([], [])
    expect(zonder).toEqual(met)
    expect(zonder.every((h) => !h.eigen)).toBe(true)
  })
})
