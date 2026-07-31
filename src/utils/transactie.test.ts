import { describe, it, expect } from 'vitest'
import { categorieBedragen, vulCategorieAan } from './transactie'
import type { Transactie } from '../data/schema'

const basis: Transactie = {
  id: 't1',
  datum: '2026-07-01',
  omschrijving: 'Colruyt',
  bedrag: -5000,
  rekeningId: 'r1',
}

describe('categorieBedragen', () => {
  it('geeft één regel voor een gewone transactie', () => {
    expect(categorieBedragen({ ...basis, categorieId: 'ov-voeding' })).toEqual([
      { categorieId: 'ov-voeding', bedrag: -5000 },
    ])
  })

  it('geeft de deelregels voor een gesplitste transactie', () => {
    const gesplitst: Transactie = {
      ...basis,
      regels: [
        { categorieId: 'ov-voeding', bedrag: -3000 },
        { categorieId: 'ov-huishouden-en-verzorging', bedrag: -2000 },
      ],
    }
    expect(categorieBedragen(gesplitst)).toEqual([
      { categorieId: 'ov-voeding', bedrag: -3000 },
      { categorieId: 'ov-huishouden-en-verzorging', bedrag: -2000 },
    ])
  })

  it('vult een niet-verdeeld restbedrag aan als zonder categorie', () => {
    const partieel: Transactie = {
      ...basis, // totaal -5000
      regels: [{ categorieId: 'ov-voeding', bedrag: -3000 }],
    }
    expect(categorieBedragen(partieel)).toEqual([
      { categorieId: 'ov-voeding', bedrag: -3000 },
      { categorieId: undefined, bedrag: -2000 },
    ])
  })
})

// Ronde 35: verdelen de regels MEER dan het totaal (een typfout), dan draaide het
// restbedrag van teken om en verscheen er een INKOMST die nooit bestaan heeft.
describe('categorieBedragen — een over-verdeeld kassaticket', () => {
  it('verzint geen tegenboeking wanneer de regels meer dekken dan het totaal', () => {
    // Ticket van € 50 uitgave, met regels van € 40 en € 20 (de tweede is een
    // typfout). Vroeger kwam er een regel van +€ 10 bij: de app toonde dan € 60
    // uitgaven én € 10 inkomsten, met een schijf in de inkomstendonut.
    const tx: Transactie = {
      id: 't',
      datum: '2026-07-01',
      omschrijving: 'Colruyt',
      bedrag: -5000,
      rekeningId: 'r',
      regels: [{ bedrag: -4000 }, { bedrag: -2000 }],
    }
    const regels = categorieBedragen(tx)
    expect(regels).toHaveLength(2)
    expect(regels.every((r) => r.bedrag < 0)).toBe(true)
    // En even belangrijk: de regels tellen op tot precies het bedrag dat van de
    // rekening ging. Alleen de rest laten vallen gaf € 60 aan uitgaven bij een
    // rekeningbeweging van € 50 — het maandoverzicht en het saldo zeiden dan iets
    // anders over hetzelfde feit. De verhouding 40:20 blijft behouden.
    expect(regels.reduce((s, r) => s + r.bedrag, 0)).toBe(-5000)
    expect(regels.map((r) => r.bedrag)).toEqual([-3333, -1667])
    // Geen verzonnen categorie erbij: het blijven de twee regels die je intikte.
    expect(regels.every((r) => r.categorieId === undefined)).toBe(true)
  })

  it('houdt het totaal ook kloppend bij drie regels met afrondingscenten', () => {
    const tx: Transactie = {
      id: 't',
      datum: '2026-07-01',
      omschrijving: 'Delhaize',
      bedrag: -1000,
      rekeningId: 'r',
      regels: [
        { categorieId: 'a', bedrag: -1000 },
        { categorieId: 'b', bedrag: -1000 },
        { categorieId: 'c', bedrag: -1000 },
      ],
    }
    const regels = categorieBedragen(tx)
    expect(regels.reduce((s, r) => s + r.bedrag, 0)).toBe(-1000)
    // 333 + 333 + 333 = 999; de laatste cent gaat naar de grootste regel.
    expect(regels.map((r) => r.bedrag)).toEqual([-334, -333, -333])
    expect(regels.map((r) => r.categorieId)).toEqual(['a', 'b', 'c'])
  })

  it('vult een restbedrag nog steeds aan wanneer de regels TE WEINIG dekken', () => {
    // Het normale geval: € 50 uitgave, één regel van € 30. Het restant hoort er
    // als 'zonder categorie' bij, zodat de som van de regels het totaal blijft.
    const tx: Transactie = {
      id: 't',
      datum: '2026-07-01',
      omschrijving: 'Colruyt',
      bedrag: -5000,
      rekeningId: 'r',
      regels: [{ bedrag: -3000 }],
    }
    const regels = categorieBedragen(tx)
    expect(regels).toHaveLength(2)
    expect(regels[1]).toEqual({ categorieId: undefined, bedrag: -2000 })
    expect(regels.reduce((s, r) => s + r.bedrag, 0)).toBe(-5000)
  })
})

// Randgevallen die alleen kunnen ontstaan uit oude of binnengesynchroniseerde data;
// het formulier maakt ze niet meer. Ze mogen nooit een bedrag verzinnen.
describe('categorieBedragen — randgevallen bij kapotte tickets', () => {
  it('verzint geen inkomst bij een transactie van € 0 met regels erin', () => {
    const tx: Transactie = {
      id: 't',
      datum: '2026-07-01',
      omschrijving: 'Kapot',
      bedrag: 0,
      rekeningId: 'r',
      regels: [{ bedrag: -4000 }, { bedrag: -2000 }],
    }
    const regels = categorieBedragen(tx)
    // Vroeger kwam hier een regel van +€ 60 bij: het saldo klopte, maar je bruto
    // inkomsten én uitgaven waren allebei € 60 te hoog.
    expect(regels.some((r) => r.bedrag > 0)).toBe(false)
    expect(regels.reduce((s, r) => s + r.bedrag, 0)).toBe(0)
  })

  it('toont nooit een bedrag van min nul', () => {
    const tx: Transactie = {
      id: 't',
      datum: '2026-07-01',
      omschrijving: 'Scheef',
      bedrag: -100,
      rekeningId: 'r',
      regels: [{ categorieId: 'a', bedrag: -10000 }, { categorieId: 'b', bedrag: -1 }],
    }
    for (const r of categorieBedragen(tx)) expect(Object.is(r.bedrag, -0)).toBe(false)
  })
})

describe('vulCategorieAan (ronde 43)', () => {
  const basisTx: Transactie = {
    id: 't1',
    datum: '2026-06-07',
    omschrijving: 'Delhaize',
    bedrag: -5000,
    rekeningId: 'r1',
  }

  it('zet de categorie op het kopveld bij een gewone boeking', () => {
    expect(vulCategorieAan(basisTx, 'ov-voeding').categorieId).toBe('ov-voeding')
  })

  it('vult de lege regels van een gesplitst ticket', () => {
    // `{ ...tx, categorieId }` deed hier niets: de rekenkern negeert het kopveld
    // zodra er regels zijn. Je kon dus eindeloos kiezen zonder resultaat.
    const gesplitst: Transactie = {
      ...basisTx,
      regels: [
        { categorieId: 'ov-voeding', bedrag: -3000 },
        { bedrag: -2000 },
      ],
    }
    const uit = vulCategorieAan(gesplitst, 'ov-huishouden')
    expect(uit.regels?.map((r) => r.categorieId)).toEqual(['ov-voeding', 'ov-huishouden'])
    expect(categorieBedragen(uit).every((r) => r.categorieId)).toBe(true)
  })

  it('maakt een regel voor het restbedrag dat nergens hing', () => {
    const ondergedekt: Transactie = { ...basisTx, regels: [{ categorieId: 'ov-voeding', bedrag: -3000 }] }
    const uit = vulCategorieAan(ondergedekt, 'ov-huishouden')
    expect(uit.regels).toHaveLength(2)
    expect(uit.regels?.[1]).toEqual({ categorieId: 'ov-huishouden', bedrag: -2000 })
    expect(categorieBedragen(uit).every((r) => r.categorieId)).toBe(true)
  })

  it('laat een ticket waarvan de regels het totaal overschrijden met rust', () => {
    // Dan is het TOTAAL het getal dat niet klopt; een extra regel zou die fout
    // enkel vastleggen. Zie de uitleg in categorieBedragen.
    const teveel: Transactie = {
      ...basisTx,
      regels: [
        { categorieId: 'ov-voeding', bedrag: -4000 },
        { categorieId: 'ov-huishouden', bedrag: -2000 },
      ],
    }
    expect(vulCategorieAan(teveel, 'ov-vervoer-en-mobiliteit').regels).toHaveLength(2)
  })

  it('raakt regels die al een categorie hebben niet aan', () => {
    const volledig: Transactie = {
      ...basisTx,
      regels: [
        { categorieId: 'ov-voeding', bedrag: -3000 },
        { categorieId: 'ov-huishouden', bedrag: -2000 },
      ],
    }
    expect(vulCategorieAan(volledig, 'ov-vervoer-en-mobiliteit').regels).toEqual(volledig.regels)
  })
})
