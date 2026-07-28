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

  // Ronde 30: eigen hoofdcategorieën stonden vooraan, waardoor een categorie die
  // je pas aanmaakte meteen bovenaan sprong. Ze horen nu achter de ingebouwde —
  // en de gebruiker zet ze daarna zelf waar hij wil (utils/categorieVolgorde.ts).
  it('zet een eigen hoofdcategorie ACHTERAAN in de boom', () => {
    const boom = bouwEffectieveBoom([], [hoofd])
    expect(boom[boom.length - 1].id).toBe('eig-hoofd')
    expect(boom[boom.length - 1].eigen).toBe(true)
  })

  it('hangt een eigen middencategorie onder haar eigen hoofdcategorie', () => {
    const boom = bouwEffectieveBoom([], [hoofd, mid])
    const eigenHoofd = boom[boom.length - 1]
    expect(eigenHoofd.categorieen.map((c) => c.id)).toEqual(['eig-mid'])
    expect(eigenHoofd.categorieen[0].eigen).toBe(true)
  })

  it('hangt een subcategorie onder een eigen middencategorie', () => {
    // Dit kon vóór ronde 27 niet: zo'n item verdween stil uit elke telling omdat
    // de middenlaag alleen ingebouwde categorieën kende.
    const boom = bouwEffectieveBoom([item], [hoofd, mid])
    expect(boom[boom.length - 1].categorieen[0].items.map((i) => i.naam)).toEqual(['Snaren'])
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

// --- Ronde 36: wat je zelf toevoegt, staat alfabetisch ---
//
// De volgorde waarin deze records uit de database komen, is die van hun interne id
// en dus willekeurig. Een categorie die je net aanmaakte, belandde daardoor op een
// onvoorspelbare plek. De INGEBOUWDE volgorde blijft ongemoeid: die is gegroepeerd
// bedoeld, niet alfabetisch.
describe('bouwEffectieveBoom — eigen toevoegingen alfabetisch', () => {
  it('zet eigen middencategorieën alfabetisch onder hun hoofdcategorie', () => {
    const boom = bouwEffectieveBoom(
      [],
      [
        { id: 'm3', naam: 'Zuurdesem', ouderId: 'ov-voeding' },
        { id: 'm1', naam: 'Ambachtelijk', ouderId: 'ov-voeding' },
        { id: 'm2', naam: 'Meeneemmaaltijd', ouderId: 'ov-voeding' },
      ],
    )
    const voeding = boom.find((h) => h.id === 'ov-voeding')!
    const eigen = voeding.categorieen.filter((c) => c.eigen).map((c) => c.naam)
    expect(eigen).toEqual(['Ambachtelijk', 'Meeneemmaaltijd', 'Zuurdesem'])
    // De ingebouwde staan nog altijd vooraan én in hun eigen volgorde.
    expect(voeding.categorieen[0].id).toBe('cat-broodwaren')
  })

  it('zet eigen subcategorieën alfabetisch achter de ingebouwde items', () => {
    const items = itemsVan('Voeding', 'Zuivel en Kaas', [
      { id: 'x3', naam: 'Skyr', categorieId: 'cat-zuivel-en-kaas' },
      { id: 'x1', naam: 'Ayran', categorieId: 'cat-zuivel-en-kaas' },
      { id: 'x2', naam: 'Kefir', categorieId: 'cat-zuivel-en-kaas' },
    ])
    expect(items.filter((i) => i.eigen).map((i) => i.naam)).toEqual(['Ayran', 'Kefir', 'Skyr'])
    // En ze staan nog steeds ACHTER de ingebouwde items van die categorie.
    expect(items[0].eigen).toBe(false)
  })
})

