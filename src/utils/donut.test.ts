import { describe, it, expect } from 'vitest'
import { donutSegmenten } from './donut'

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
