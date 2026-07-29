import { describe, it, expect } from 'vitest'
import { donutSegmenten, afgerondePercentages } from './donut'

describe('donutSegmenten', () => {
  it('berekent fracties en cumulatieve hoeken', () => {
    const segs = donutSegmenten([
      { naam: 'Voeding', bedrag: 300, kleur: '#111' },
      { naam: 'Wonen', bedrag: 100, kleur: '#222' },
    ])
    expect(segs).toHaveLength(2)
    expect(segs[0].fractie).toBeCloseTo(0.75)
    expect(segs[0].start).toBeCloseTo(0)
    expect(segs[0].eind).toBeCloseTo(0.75)
    expect(segs[1].start).toBeCloseTo(0.75)
    expect(segs[1].eind).toBeCloseTo(1)
  })

  it('behoudt de kleur uit het data-object', () => {
    const segs = donutSegmenten([{ naam: 'Voeding', bedrag: 100, kleur: '#abc' }])
    expect(segs[0].kleur).toBe('#abc')
  })

  it('geeft een terugvalkleur aan groepen zonder kleur', () => {
    const segs = donutSegmenten([{ naam: 'Zonder categorie', bedrag: 100, kleur: null }])
    expect(segs[0].kleur).toMatch(/^#/)
  })

  it('geeft een lege lijst bij een totaal van nul', () => {
    expect(donutSegmenten([])).toEqual([])
    expect(donutSegmenten([{ naam: 'x', bedrag: 0, kleur: null }])).toEqual([])
  })
})

describe('afgerondePercentages', () => {
  const som = (n: number[]) => n.reduce((s, x) => s + x, 0)

  it('telt op tot exact 100 waar apart afronden 101 zou geven', () => {
    // Drie gelijke delen: apart afgerond wordt elk 33% (samen 99).
    expect(afgerondePercentages([1, 1, 1])).toEqual([34, 33, 33])
  })

  it('telt op tot exact 100 bij een lastige verdeling', () => {
    // Elk deel is 16,66…%: apart afgerond 17% × 6 = 102.
    const p = afgerondePercentages([1, 1, 1, 1, 1, 1])
    expect(som(p)).toBe(100)
    expect(p).toEqual([17, 17, 17, 17, 16, 16])
  })

  it('geeft de extra procenten aan de grootste resten', () => {
    // 3000/7000 = 42,857 (rest ,857), 2500/7000 = 35,714 (rest ,714), 1500/7000 = 21,428 (rest ,428).
    const p = afgerondePercentages([3000, 2500, 1500])
    expect(p).toEqual([43, 36, 21])
    expect(som(p)).toBe(100)
  })

  it('blijft kloppen bij veel kleine posten', () => {
    const bedragen = Array.from({ length: 37 }, (_, i) => 100 + i * 7)
    const p = afgerondePercentages(bedragen)
    expect(som(p)).toBe(100)
    expect(p).toHaveLength(37)
  })

  it('geeft overal 0 bij een totaal van nul of een lege lijst', () => {
    expect(afgerondePercentages([])).toEqual([])
    expect(afgerondePercentages([0, 0])).toEqual([0, 0])
    expect(afgerondePercentages([-5])).toEqual([0])
  })

  it('geeft 100 aan één enkele post', () => {
    expect(afgerondePercentages([250])).toEqual([100])
  })
})

// --- Ronde 40 -----------------------------------------------------------------

describe('donutSegmenten — de sleutel reist mee', () => {
  it('geeft de sleutel van de invoer door aan het segment', () => {
    const segmenten = donutSegmenten([
      { naam: 'Voeding', bedrag: 300, kleur: '#111', sleutel: 'ov-voeding' },
      { naam: 'Wonen', bedrag: 200, kleur: '#222', sleutel: 'ov-woning-en-vaste-lasten' },
    ])
    expect(segmenten.map((s) => s.sleutel)).toEqual(['ov-voeding', 'ov-woning-en-vaste-lasten'])
  })

  it('laat de sleutel WEG wanneer de invoer er geen heeft', () => {
    // De uitsplitsing per winkel groepeert op naam en heeft geen id. Een lege
    // string zou daar een filter suggereren dat niet bestaat, dus het veld hoort
    // helemaal niet in het segment te staan.
    const segmenten = donutSegmenten([{ naam: 'Colruyt', bedrag: 100, kleur: null }])
    expect('sleutel' in segmenten[0]).toBe(false)
  })

  it('houdt een lege sleutel als lege sleutel, niet als "geen sleutel"', () => {
    // 'Zonder categorie' heeft groepeersleutel ''. De aanroeper beslist of daar
    // doorgeklikt mag worden; de rekenkern verzint niets.
    const segmenten = donutSegmenten([{ naam: 'Zonder categorie', bedrag: 100, kleur: null, sleutel: '' }])
    expect(segmenten[0].sleutel).toBe('')
  })
})
