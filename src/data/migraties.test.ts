import { describe, it, expect } from 'vitest'
import { euroNaarCenten, gebeurtenisNaarCenten, transactieNaarCenten } from './migraties'

describe('euroNaarCenten', () => {
  it('zet euro om naar centen', () => {
    expect(euroNaarCenten(12.5)).toBe(1250)
    expect(euroNaarCenten(2400)).toBe(240000)
    expect(euroNaarCenten(-950)).toBe(-95000)
  })

  it('rondt af, zodat drijvende-komma-ruis verdwijnt', () => {
    expect(euroNaarCenten(0.1 + 0.2)).toBe(30) // 0,30 en niet 30,000000004
  })
})

describe('gebeurtenisNaarCenten', () => {
  it('zet het bedrag van een transactie om', () => {
    const g = { type: 'transactie.bewaard', payload: { id: 't1', bedrag: 24 } }
    expect(gebeurtenisNaarCenten(g).payload.bedrag).toBe(2400)
  })

  it('zet het beginsaldo van een rekening om (ander geldveld)', () => {
    const g = { type: 'rekening.bewaard', payload: { id: 'r1', beginsaldo: 5 } }
    expect(gebeurtenisNaarCenten(g).payload.beginsaldo).toBe(500)
  })

  it('laat een verwijder-gebeurtenis (zonder bedrag) onveranderd', () => {
    const g = { type: 'transactie.verwijderd', payload: { id: 't1' } }
    // Zelfde referentie terug = niet aangeraakt.
    expect(gebeurtenisNaarCenten(g)).toBe(g)
  })

  it('raakt het origineel niet aan (maakt een kopie)', () => {
    const g = { type: 'budget.bewaard', payload: { id: 'b1', bedrag: 40 } }
    gebeurtenisNaarCenten(g)
    expect(g.payload.bedrag).toBe(40) // origineel ongewijzigd
  })

  it('zet ook de split-regels van een gesplitste transactie om', () => {
    const g = {
      type: 'transactie.bewaard',
      payload: {
        id: 't1',
        bedrag: -50,
        regels: [
          { categorieId: 'c1', bedrag: -30 },
          { categorieId: 'c2', bedrag: -20 },
        ],
      },
    }
    const om = gebeurtenisNaarCenten(g)
    expect(om.payload.bedrag).toBe(-5000)
    expect(om.payload.regels).toEqual([
      { categorieId: 'c1', bedrag: -3000 },
      { categorieId: 'c2', bedrag: -2000 },
    ])
    // Origineel ongemoeid.
    expect(g.payload.regels[0].bedrag).toBe(-30)
  })
})

describe('transactieNaarCenten', () => {
  it('zet het totaalbedrag én de regels om', () => {
    const t = {
      id: 't1',
      bedrag: -50,
      regels: [
        { categorieId: 'c1', bedrag: -30 },
        { categorieId: 'c2', bedrag: -20 },
      ],
    }
    const om = transactieNaarCenten(t)
    expect(om.bedrag).toBe(-5000)
    expect(om.regels).toEqual([
      { categorieId: 'c1', bedrag: -3000 },
      { categorieId: 'c2', bedrag: -2000 },
    ])
    expect(t.bedrag).toBe(-50) // origineel ongewijzigd
  })

  it('werkt ook voor een transactie zonder regels', () => {
    const t = { id: 't2', bedrag: 24 }
    expect(transactieNaarCenten(t).bedrag).toBe(2400)
  })
})
