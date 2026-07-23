import { describe, it, expect } from 'vitest'
import { lokaleStap, ontvangstStap, vergelijkStempel } from './hlc'

describe('lokaleStap', () => {
  it('springt mee met de fysieke tijd en zet de teller op nul', () => {
    expect(lokaleStap({ l: 100, c: 5 }, 200)).toEqual({ l: 200, c: 0 })
  })

  it('verhoogt de teller wanneer de tijd (nog) niet vooruit ging', () => {
    expect(lokaleStap({ l: 200, c: 0 }, 200)).toEqual({ l: 200, c: 1 })
    expect(lokaleStap({ l: 200, c: 3 }, 150)).toEqual({ l: 200, c: 4 })
  })
})

describe('ontvangstStap', () => {
  it('neemt de hoogste tijd over van een binnenkomende wijziging', () => {
    // Eigen klok loopt achter (100); er komt iets binnen met tijd 500.
    const na = ontvangstStap({ l: 100, c: 0 }, { l: 500, c: 2 }, 120)
    expect(na.l).toBe(500)
    expect(na.c).toBe(3) // inkomend was de max -> inkomend.c + 1
  })

  it('gebruikt de fysieke tijd als die vooroploopt', () => {
    const na = ontvangstStap({ l: 100, c: 0 }, { l: 200, c: 0 }, 900)
    expect(na).toEqual({ l: 900, c: 0 })
  })
})

describe('vergelijkStempel', () => {
  it('ordent op tijd, dan op teller', () => {
    expect(vergelijkStempel({ l: 1, c: 0 }, { l: 2, c: 0 })).toBeLessThan(0)
    expect(vergelijkStempel({ l: 2, c: 0 }, { l: 2, c: 1 })).toBeLessThan(0)
    expect(vergelijkStempel({ l: 2, c: 1 }, { l: 2, c: 1 })).toBe(0)
  })
})
