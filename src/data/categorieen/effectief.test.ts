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
