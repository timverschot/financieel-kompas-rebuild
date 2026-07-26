import { describe, it, expect } from 'vitest'
import { bepaalBalans } from './balans'

describe('bepaalBalans', () => {
  it('noemt het een overschot wanneer er meer binnenkomt dan er weggaat', () => {
    expect(bepaalBalans(240000, 127000)).toEqual({ stand: 'overschot', verschil: 113000, leeg: false })
  })

  it('noemt het een tekort wanneer er meer weggaat dan er binnenkomt', () => {
    expect(bepaalBalans(100000, 130000)).toEqual({ stand: 'tekort', verschil: 30000, leeg: false })
  })

  it('noemt het in balans bij exact gelijk', () => {
    expect(bepaalBalans(100000, 100000)).toEqual({ stand: 'balans', verschil: 0, leeg: false })
  })

  it('merkt op dat er niets geboekt is', () => {
    expect(bepaalBalans(0, 0)).toEqual({ stand: 'balans', verschil: 0, leeg: true })
  })

  it('is niet leeg zodra er iets geboekt is, ook al is het netto nul', () => {
    expect(bepaalBalans(5000, 5000).leeg).toBe(false)
  })
})
