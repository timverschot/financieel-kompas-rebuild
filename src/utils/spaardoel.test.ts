import { describe, it, expect } from 'vitest'
import { rekeningSaldo, spaardoelVoortgang } from './spaardoel'
import type { Rekening, Spaardoel, Transactie } from '../data/schema'

const rekeningen: Rekening[] = [{ id: 'spaar', naam: 'Spaarrekening', beginsaldo: 100000 }]
const transacties: Transactie[] = [
  { id: 't1', datum: '2026-07-01', omschrijving: 'storting', bedrag: 50000, rekeningId: 'spaar' },
  { id: 't2', datum: '2026-07-02', omschrijving: 'ander', bedrag: 9999, rekeningId: 'andere' },
]

const doel = (over: Partial<Spaardoel>): Spaardoel => ({
  id: 'd1',
  naam: 'Buffer',
  doelbedrag: 300000,
  huidigBedrag: 0,
  ...over,
})

describe('rekeningSaldo', () => {
  it('telt beginsaldo en enkel de eigen transacties op', () => {
    expect(rekeningSaldo('spaar', rekeningen, transacties)).toBe(150000)
  })
})

describe('spaardoelVoortgang', () => {
  it('gebruikt het manueel bijgehouden bedrag zonder gekoppelde rekening', () => {
    const v = spaardoelVoortgang(doel({ huidigBedrag: 150000 }), rekeningen, transacties)
    expect(v.huidig).toBe(150000)
    expect(v.resterend).toBe(150000)
    expect(v.fractie).toBeCloseTo(0.5)
  })

  it('leidt het huidige bedrag af uit de gekoppelde rekening', () => {
    const v = spaardoelVoortgang(doel({ gekoppeldeRekeningId: 'spaar' }), rekeningen, transacties)
    expect(v.huidig).toBe(150000)
  })

  it('begrenst de fractie op 1 en het resterende op 0 wanneer het doel bereikt is', () => {
    const v = spaardoelVoortgang(doel({ huidigBedrag: 400000 }), rekeningen, transacties)
    expect(v.fractie).toBe(1)
    expect(v.resterend).toBe(0)
  })
})
