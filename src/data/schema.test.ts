import { describe, it, expect } from 'vitest'
import {
  AflossingSchema,
  BudgetSchema,
  DossierDocumentSchema,
  GedeeldeKostSchema,
  OverboekingSchema,
  RekeningSchema,
  TerugkerendePostSchema,
  TransactieSchema,
  WaarderingSchema,
} from './schema'

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

describe('RekeningSchema', () => {
  it('aanvaardt een eenvoudige rekening (zonder de nieuwe velden) — bestaande data blijft geldig', () => {
    expect(RekeningSchema.safeParse({ id: 'r1', naam: 'Zicht', beginsaldo: 1000 }).success).toBe(true)
  })

  it('aanvaardt een rekening met type, rekeningnummer, rubriek en archiefvlag', () => {
    const r = {
      id: 'r1',
      naam: 'Spaar',
      beginsaldo: 500000,
      type: 'spaar',
      rekeningnummer: 'BE68 5390 0754 7034',
      rubriek: 'Reserve',
      gearchiveerd: false,
    }
    expect(RekeningSchema.safeParse(r).success).toBe(true)
  })

  it('weigert een onbekend type', () => {
    expect(RekeningSchema.safeParse({ id: 'r1', naam: 'X', beginsaldo: 0, type: 'crypto' }).success).toBe(false)
  })
})

describe('OverboekingSchema', () => {
  const geldigeOverboeking = {
    id: 'o1',
    datum: '2026-07-01',
    vanRekeningId: 'r1',
    naarRekeningId: 'r2',
    bedrag: 5000,
  }

  it('aanvaardt een geldige overboeking', () => {
    expect(OverboekingSchema.safeParse(geldigeOverboeking).success).toBe(true)
  })

  it('weigert een negatief of nul bedrag', () => {
    expect(OverboekingSchema.safeParse({ ...geldigeOverboeking, bedrag: 0 }).success).toBe(false)
    expect(OverboekingSchema.safeParse({ ...geldigeOverboeking, bedrag: -100 }).success).toBe(false)
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

// Ronde 22: de twee nieuwe koppelingen zijn allebei OPTIONEEL, precies zodat
// bestaande records geldig blijven en er geen migratie nodig is.
describe('koppelingen aan een transactie (ronde 22)', () => {
  const kost = {
    id: 'k1',
    dossierId: 'dos-1',
    omschrijving: 'Dokter',
    bedrag: 3000,
    betaaldDoor: 'jij',
    datum: '2026-07-01',
  }

  it('aanvaardt een gedeelde kost met én zonder transactieId', () => {
    expect(GedeeldeKostSchema.safeParse(kost).success).toBe(true)
    expect(GedeeldeKostSchema.safeParse({ ...kost, transactieId: 't1' }).success).toBe(true)
  })

  it('weigert een leeg transactieId op een gedeelde kost', () => {
    expect(GedeeldeKostSchema.safeParse({ ...kost, transactieId: '' }).success).toBe(false)
  })

  const document = {
    id: 'doc-1',
    naam: 'Kassaticket',
    soort: 'bon',
    bestand: 'data:application/pdf;base64,AA==',
    toegevoegdOp: '2026-07-01',
  }

  it('aanvaardt een document dat aan een transactie hangt', () => {
    expect(DossierDocumentSchema.safeParse({ ...document, transactieId: 't1' }).success).toBe(true)
    // En een document van vóór deze uitbreiding blijft gewoon geldig.
    expect(DossierDocumentSchema.safeParse({ ...document, dossierId: 'dos-1' }).success).toBe(true)
  })
})

// --- Ronde 38: kredietrekening, waardering, einddatum, aflossingsbrug --------

describe('RekeningSchema — kredietrekening', () => {
  it('aanvaardt het type krediet met limiet en afrekendag', () => {
    const r = RekeningSchema.safeParse({
      id: 'k1',
      naam: 'Visa',
      beginsaldo: -120_000,
      type: 'krediet',
      kredietlimiet: 250_000,
      afrekendag: 15,
    })
    expect(r.success).toBe(true)
  })

  it('weigert een afrekendag buiten 1-28', () => {
    const basis = { id: 'k1', naam: 'Visa', beginsaldo: 0, type: 'krediet' as const }
    expect(RekeningSchema.safeParse({ ...basis, afrekendag: 0 }).success).toBe(false)
    expect(RekeningSchema.safeParse({ ...basis, afrekendag: 29 }).success).toBe(false)
    expect(RekeningSchema.safeParse({ ...basis, afrekendag: 28 }).success).toBe(true)
  })

  it('weigert een limiet van nul of negatief — een limiet is een positief bedrag', () => {
    const basis = { id: 'k1', naam: 'Visa', beginsaldo: 0, type: 'krediet' as const }
    expect(RekeningSchema.safeParse({ ...basis, kredietlimiet: 0 }).success).toBe(false)
    expect(RekeningSchema.safeParse({ ...basis, kredietlimiet: -1 }).success).toBe(false)
  })

  it('laat een bestaande rekening zonder de nieuwe velden geldig — geen migratie', () => {
    expect(RekeningSchema.safeParse({ id: 'r1', naam: 'Zicht', beginsaldo: 100 }).success).toBe(true)
  })
})

describe('WaarderingSchema', () => {
  it('aanvaardt een geldige waardering', () => {
    const r = WaarderingSchema.safeParse({
      id: 'w1',
      rekeningId: 'r1',
      datum: '2026-07-15',
      saldo: 1_234_56,
      notitie: 'jaaroverzicht',
    })
    expect(r.success).toBe(true)
  })

  it('aanvaardt een NEGATIEVE stand — een kredietrekening staat negatief', () => {
    expect(
      WaarderingSchema.safeParse({ id: 'w1', rekeningId: 'r1', datum: '2026-07-15', saldo: -50_000 }).success,
    ).toBe(true)
  })

  it('weigert een verkeerde datumvorm en een niet-geheel bedrag', () => {
    expect(WaarderingSchema.safeParse({ id: 'w', rekeningId: 'r', datum: '15-07-2026', saldo: 0 }).success).toBe(false)
    expect(WaarderingSchema.safeParse({ id: 'w', rekeningId: 'r', datum: '2026-07-15', saldo: 1.5 }).success).toBe(false)
  })
})

describe('TerugkerendePostSchema — eindMaand', () => {
  const basis = { id: 'p1', omschrijving: 'Huur', bedrag: -95_000, rekeningId: 'r1', dag: 5 }

  it('aanvaardt een eindmaand in de vorm JJJJ-MM', () => {
    expect(TerugkerendePostSchema.safeParse({ ...basis, eindMaand: '2026-09' }).success).toBe(true)
  })

  it('weigert een andere vorm', () => {
    expect(TerugkerendePostSchema.safeParse({ ...basis, eindMaand: '2026-09-01' }).success).toBe(false)
  })

  it('blijft geldig zonder eindmaand — geen migratie', () => {
    expect(TerugkerendePostSchema.safeParse(basis).success).toBe(true)
  })
})

describe('AflossingSchema — transactieId', () => {
  const basis = { id: 'a1', leningId: 'l1', datum: '2026-07-05', bedrag: 250_00 }

  it('aanvaardt een gekoppelde boeking', () => {
    expect(AflossingSchema.safeParse({ ...basis, transactieId: 't1' }).success).toBe(true)
  })

  it('blijft geldig zonder koppeling', () => {
    expect(AflossingSchema.safeParse(basis).success).toBe(true)
  })

  it('weigert een lege koppeling', () => {
    expect(AflossingSchema.safeParse({ ...basis, transactieId: '' }).success).toBe(false)
  })
})
