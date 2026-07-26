import { describe, it, expect } from 'vitest'
import type { Budget, Garantie, TerugkerendePost, Transactie } from '../data/schema'
import { bouwMeldingen, STANDAARD_BUDGETDREMPEL } from './meldingen'

const naamVanCategorie = (id: string) => (id === 'ov-voeding' ? 'Voeding' : id)

function tx(datum: string, bedrag: number, categorieId?: string): Transactie {
  return { id: `t-${datum}-${bedrag}`, datum, omschrijving: 'x', bedrag, rekeningId: 'r1', categorieId }
}

function basis(extra: Partial<Parameters<typeof bouwMeldingen>[0]> = {}) {
  return bouwMeldingen({
    budgetten: [],
    transacties: [],
    maand: '2026-07',
    garanties: [],
    terugkerendePosten: [],
    vandaagISO: '2026-07-15',
    naamVanCategorie,
    ...extra,
  })
}

describe('bouwMeldingen — budgetten', () => {
  const budget: Budget = { id: 'b1', categorieId: 'ov-voeding', bedrag: 10000 }

  it('zwijgt zolang een budget onder de drempel blijft', () => {
    // 84% van € 100 = € 84 — net onder de standaarddrempel van 85%.
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -8400, 'ov-voeding')] })
    expect(meldingen).toHaveLength(0)
  })

  it('waarschuwt vanaf de drempel', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -8500, 'ov-voeding')] })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('budget-bijna')
    expect(meldingen[0].params).toEqual({ naam: 'Voeding', pct: 85 })
    expect(meldingen[0].dringend).toBe(false)
    expect(meldingen[0].pagina).toBe('budget')
  })

  it('respecteert een eigen drempel', () => {
    const transacties = [tx('2026-07-02', -7000, 'ov-voeding')]
    expect(basis({ budgetten: [budget], transacties })).toHaveLength(0)
    expect(basis({ budgetten: [budget], transacties, drempel: 70 })).toHaveLength(1)
  })

  it('meldt een overschrijding als dringend', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -12000, 'ov-voeding')] })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('budget-over')
    expect(meldingen[0].dringend).toBe(true)
    expect(meldingen[0].params).toEqual({ naam: 'Voeding', pct: 120 })
  })

  it('telt exact 100% als "bijna op", niet als overschreden', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -10000, 'ov-voeding')] })
    expect(meldingen[0].soort).toBe('budget-bijna')
  })

  it('negeert uitgaven buiten de gekozen maand', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-06-30', -20000, 'ov-voeding')] })
    expect(meldingen).toHaveLength(0)
  })

  it('splitst een gesplitst kassaticket uit over de categorieën', () => {
    // € 90 in Voeding + € 40 elders. Alleen de Voeding-regel mag het budget van
    // € 100 raken: 90% ligt boven de drempel, 130% zou ze overschrijden.
    const ticket: Transactie = {
      id: 'ticket',
      datum: '2026-07-04',
      omschrijving: 'Colruyt',
      bedrag: -13000,
      rekeningId: 'r1',
      regels: [
        { bedrag: -9000, categorieId: 'ov-voeding' },
        { bedrag: -4000, categorieId: 'ov-drank' },
      ],
    }
    const meldingen = basis({ budgetten: [budget], transacties: [ticket] })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('budget-bijna')
    expect(meldingen[0].params?.pct).toBe(90)
  })
})

describe('bouwMeldingen — garanties', () => {
  // Aankoop 1 juni 2026, 2 maanden garantie: verloopt 1 augustus 2026.
  const garantie: Garantie = { id: 'g1', product: 'Koffiezet', aankoopdatum: '2026-06-01', garantieMaanden: 2 }

  it('zwijgt zolang de garantie nog ruim geldig is (meer dan 60 dagen)', () => {
    // Dezelfde aankoop, maar met de wettelijke 24 maanden: verloopt pas in 2028.
    const lang: Garantie = { ...garantie, garantieMaanden: 24 }
    expect(basis({ garanties: [lang], vandaagISO: '2026-06-02' })).toHaveLength(0)
  })

  it('meldt een garantie die binnen 60 dagen verloopt', () => {
    const meldingen = basis({ garanties: [garantie], vandaagISO: '2026-07-15' })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('garantie')
    expect(meldingen[0].params).toEqual({ product: 'Koffiezet', n: 17 })
    expect(meldingen[0].pagina).toBe('leningen')
    expect(meldingen[0].dringend).toBe(false)
  })

  it('maakt de melding dringend binnen twee weken', () => {
    const meldingen = basis({ garanties: [garantie], vandaagISO: '2026-07-25' })
    expect(meldingen[0].dringend).toBe(true)
  })

  it('zwijgt over een garantie die al verlopen is', () => {
    expect(basis({ garanties: [garantie], vandaagISO: '2026-08-02' })).toHaveLength(0)
  })
})

describe('bouwMeldingen — vaste lasten', () => {
  const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }

  it('meldt een vaste last waarvan de dag voorbij is en die nog niet geboekt is', () => {
    const meldingen = basis({ terugkerendePosten: [huur], vandaagISO: '2026-07-15' })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('vastelast')
    expect(meldingen[0].params).toEqual({ n: 1 })
    expect(meldingen[0].pagina).toBe('budget')
  })

  it('zwijgt zolang de dag nog niet voorbij is', () => {
    expect(basis({ terugkerendePosten: [huur], vandaagISO: '2026-07-01' })).toHaveLength(0)
  })

  it('zwijgt zodra de vaste last geboekt is', () => {
    const geboekt = tx('2026-07-03', -95000)
    expect(basis({ terugkerendePosten: [huur], transacties: [geboekt], vandaagISO: '2026-07-15' })).toHaveLength(0)
  })
})

describe('bouwMeldingen — volgorde', () => {
  it('zet dringende meldingen bovenaan', () => {
    const meldingen = basis({
      budgetten: [
        { id: 'b1', categorieId: 'ov-voeding', bedrag: 10000 },
        { id: 'b2', categorieId: 'ov-drank', bedrag: 10000 },
      ],
      transacties: [tx('2026-07-02', -9000, 'ov-voeding'), tx('2026-07-03', -15000, 'ov-drank')],
    })
    expect(meldingen.map((m) => m.soort)).toEqual(['budget-over', 'budget-bijna'])
  })

  it('gebruikt 85% als standaarddrempel', () => {
    expect(STANDAARD_BUDGETDREMPEL).toBe(85)
  })
})
