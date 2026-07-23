import { describe, it, expect } from 'vitest'
import { indexeerBedrag } from './indexatie'

describe('indexeerBedrag', () => {
  it('indexeert volgens de formule (500 × 110 / 100 = 550)', () => {
    expect(indexeerBedrag(500, 100, 110)).toBe(550)
  })

  it('rondt af op hele centen (500 × 132,55 / 128,34 = 516)', () => {
    expect(indexeerBedrag(500, 128.34, 132.55)).toBe(516)
  })

  it('geeft het basisbedrag terug bij een ongeldige aanvangsindex', () => {
    expect(indexeerBedrag(500, 0, 110)).toBe(500)
  })
})
