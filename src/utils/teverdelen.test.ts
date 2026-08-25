import { describe, it, expect } from 'vitest'
import { vasteLastenInEenBudget } from './teverdelen'
import type { Budget, TerugkerendePost } from '../data/schema'

const post = (over: Partial<TerugkerendePost>): TerugkerendePost => ({
  id: 'p',
  omschrijving: 'Huur',
  bedrag: -95000,
  rekeningId: 'r1',
  dag: 3,
  ...over,
})

const budget = (over: Partial<Budget>): Budget => ({
  id: 'b',
  categorieId: 'ov-woning-en-vaste-lasten',
  bedrag: 100000,
  ...over,
})

describe('vasteLastenInEenBudget', () => {
  it('meldt een vaste last die onder een van je budgetten valt', () => {
    const huur = post({ categorieId: 'ov-woning-en-vaste-lasten' })
    expect(vasteLastenInEenBudget([huur], [budget({})], '2026-07')).toEqual([huur])
  })

  it('zwijgt wanneer geen enkel budget die categorie raakt', () => {
    const huur = post({ categorieId: 'ov-woning-en-vaste-lasten' })
    expect(vasteLastenInEenBudget([huur], [budget({ categorieId: 'ov-voeding' })], '2026-07')).toEqual([])
  })

  it('zwijgt zonder budgetten', () => {
    expect(vasteLastenInEenBudget([post({ categorieId: 'ov-woning-en-vaste-lasten' })], [], '2026-07')).toEqual([])
  })

  it('zwijgt over een vaste last zonder categorie', () => {
    // De app weet dan niet waar die kost hoort, en verzint dat niet.
    expect(vasteLastenInEenBudget([post({ categorieId: undefined })], [budget({})], '2026-07')).toEqual([])
  })

  it('telt een vaste INKOMST niet mee', () => {
    // Loon staat aan de andere kant van de som; een uitgavenbudget raakt het nooit.
    const loon = post({ id: 'loon', omschrijving: 'Loon', bedrag: 240000, categorieId: 'ov-woning-en-vaste-lasten' })
    expect(vasteLastenInEenBudget([loon], [budget({})], '2026-07')).toEqual([])
  })

  it('telt een opgezegde post niet mee', () => {
    const gestopt = post({ categorieId: 'ov-woning-en-vaste-lasten', eindMaand: '2026-07' })
    expect(vasteLastenInEenBudget([gestopt], [budget({})], '2026-07')).toEqual([])
    // ... maar in de maand vóór het einde nog wél
    expect(vasteLastenInEenBudget([gestopt], [budget({})], '2026-06')).toEqual([gestopt])
  })

  it('telt een post die deze maand niet vervalt niet mee', () => {
    // Een jaarpremie zit deze maand in "Opzij voor later", niet in "Vaste lasten
    // deze maand" — er is deze maand geen betaling die een budget zou opeten.
    const premie = post({
      id: 'prem',
      omschrijving: 'Autoverzekering',
      bedrag: -60000,
      frequentie: 'jaar',
      startMaand: '2026-08',
      opbouwen: true,
      categorieId: 'ov-woning-en-vaste-lasten',
    })
    expect(vasteLastenInEenBudget([premie], [budget({})], '2026-07')).toEqual([])
    expect(vasteLastenInEenBudget([premie], [budget({})], '2026-08')).toEqual([premie])
  })

  it('herkent een vaste last op de middenlaag onder een hoofdbudget', () => {
    const elek = post({ id: 'e', omschrijving: 'Elektriciteit', categorieId: 'cat-energie-en-nutsvoorzieningen' })
    const treffers = vasteLastenInEenBudget([elek], [budget({ categorieId: 'ov-woning-en-vaste-lasten' })], '2026-07')
    // Slaagt deze test niet, dan hangt 'cat-energie-en-nutsvoorzieningen' niet meer
    // onder 'ov-woning-en-vaste-lasten' en is de test fout, niet de code.
    expect(treffers).toEqual([elek])
  })

  it('laat een hoofdbudget een vaste last op een ANDERE hoofdcategorie met rust', () => {
    const elek = post({ id: 'e', omschrijving: 'Elektriciteit', categorieId: 'cat-energie-en-nutsvoorzieningen' })
    expect(vasteLastenInEenBudget([elek], [budget({ categorieId: 'ov-voeding' })], '2026-07')).toEqual([])
  })

  it('geeft alle treffers terug, niet alleen de eerste', () => {
    const huur = post({ id: 'h', categorieId: 'ov-woning-en-vaste-lasten' })
    const elek = post({ id: 'e', omschrijving: 'Elektriciteit', categorieId: 'cat-energie-en-nutsvoorzieningen' })
    expect(vasteLastenInEenBudget([huur, elek], [budget({})], '2026-07')).toEqual([huur, elek])
  })
})
