import { describe, it, expect } from 'vitest'
import { BudgetSchema, TransactieSchema } from './schema'

const geldig = { id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' }

describe('TransactieSchema', () => {
  it('aanvaardt een geldige transactie zonder categorie (optioneel)', () => {
    expect(TransactieSchema.safeParse(geldig).success).toBe(true)
  })

  it('aanvaardt een geldige transactie mét categorie', () => {
    expect(TransactieSchema.safeParse({ ...geldig, categorieId: 'cat-1' }).success).toBe(true)
  })

  it('weigert een bedrag dat geen getal is', () => {
    expect(TransactieSchema.safeParse({ ...geldig, bedrag: 'tweeduizend' }).success).toBe(false)
  })

  it('weigert een ontbrekend veld', () => {
    const { rekeningId: _weg, ...zonderRekening } = geldig
    expect(TransactieSchema.safeParse(zonderRekening).success).toBe(false)
  })

  it('weigert een datum in het verkeerde formaat', () => {
    expect(TransactieSchema.safeParse({ ...geldig, datum: '01/07/2026' }).success).toBe(false)
  })
})

describe('TransactieSchema - splitsing', () => {
  const gesplitst = {
    id: 't1',
    datum: '2026-07-01',
    omschrijving: 'Colruyt',
    bedrag: -500,
    rekeningId: 'r1',
    regels: [
      { categorieId: 'ov-voeding', bedrag: -300 },
      { bedrag: -200 },
    ],
  }

  it('aanvaardt een splitsing waarvan de regels optellen tot het totaal', () => {
    expect(TransactieSchema.safeParse(gesplitst).success).toBe(true)
  })

  it('aanvaardt ook een gedeeltelijke splitsing (het restbedrag wordt later aangevuld)', () => {
    const partieel = { ...gesplitst, regels: [{ categorieId: 'ov-voeding', bedrag: -300 }] }
    expect(TransactieSchema.safeParse(partieel).success).toBe(true)
  })

  it('aanvaardt een deelregel met enkel een omschrijving (vrije tekst, geen categorie)', () => {
    const vrij = { ...gesplitst, regels: [{ omschrijving: 'Brood', bedrag: -500 }] }
    expect(TransactieSchema.safeParse(vrij).success).toBe(true)
  })
})

describe('BudgetSchema', () => {
  it('aanvaardt een geldig budget', () => {
    expect(BudgetSchema.safeParse({ id: 'b1', categorieId: 'c1', bedrag: 400 }).success).toBe(true)
  })

  it('weigert een budget met een negatief of nul bedrag', () => {
    expect(BudgetSchema.safeParse({ id: 'b1', categorieId: 'c1', bedrag: 0 }).success).toBe(false)
    expect(BudgetSchema.safeParse({ id: 'b1', categorieId: 'c1', bedrag: -5 }).success).toBe(false)
  })
})
