import { describe, it, expect } from 'vitest'
import { saldoVerrekening, saldoVerrekeningDossier, effectiefAandeel, standaardWordtNogGebruikt } from './dossier'
import type { Dossier, GedeeldeKost } from '../data/schema'

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 100,
  betaaldDoor: 'jij',
  datum: '2026-07-01',
  ...over,
})

describe('saldoVerrekening', () => {
  it('partner is jou zijn aandeel verschuldigd wanneer jij betaalde (50/50)', () => {
    expect(saldoVerrekening(50, [kost({ bedrag: 100, betaaldDoor: 'jij' })])).toBe(50)
  })

  it('jij bent jouw aandeel verschuldigd wanneer de partner betaalde (50/50)', () => {
    expect(saldoVerrekening(50, [kost({ bedrag: 100, betaaldDoor: 'partner' })])).toBe(-50)
  })

  it('verrekent meerdere kosten samen met een niet-gelijke sleutel', () => {
    // aandeelJij 30%: jij betaalt 200 (partner is jou 70% = 140 verschuldigd),
    // partner betaalt 100 (jij bent 30% = 30 verschuldigd) -> netto 140 - 30 = 110
    const netto = saldoVerrekening(30, [
      kost({ id: 'a', bedrag: 200, betaaldDoor: 'jij' }),
      kost({ id: 'b', bedrag: 100, betaaldDoor: 'partner' }),
    ])
    expect(netto).toBeCloseTo(110)
  })

  it('geeft 0 zonder kosten', () => {
    expect(saldoVerrekening(50, [])).toBe(0)
  })
})

describe('effectiefAandeel (verdeel-hiërarchie)', () => {
  const dossier: Dossier = {
    id: 'd1',
    naam: 'Kinderen',
    aandeelJij: 52,
    categorieAandelen: { 'ov-gezondheid': 50, 'ov-kleding': 70 },
  }

  it('gebruikt de dossier-standaard als er niets anders is ingesteld', () => {
    expect(effectiefAandeel(dossier, kost({}))).toBe(52)
  })

  it('gebruikt het categorie-percentage wanneer de kost die categorie heeft', () => {
    expect(effectiefAandeel(dossier, kost({ categorieId: 'ov-kleding' }))).toBe(70)
  })

  it('laat een eigen percentage op de kost alles overschrijven', () => {
    expect(effectiefAandeel(dossier, kost({ categorieId: 'ov-kleding', aandeelJijOverride: 40 }))).toBe(40)
  })

  it('past een afspraak op de MIDDENcategorie toe op de items eronder (ronde 107)', () => {
    // ⚠ RONDE 107. De kiezer laat je "Kinderen en Gezin › Kinderen school" kiezen, en die
    // afspraak stond netjes in de lijst — maar een kost op *Schoolfactuur Kind 1* rolde in
    // één sprong door naar de hoofdcategorie en vond ze nooit. Je stelde 100% in, de app
    // rekende de standaard, en de PDF noemde als reden "standaardverdeling van het dossier".
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 50, categorieAandelen: { 'cat-kinderen-school': 100 } }
    expect(effectiefAandeel(d, kost({ categorieId: 'cat-kinderen-school' }))).toBe(100)
    expect(effectiefAandeel(d, kost({ categorieId: 'i-schoolfactuur-jasper-95' }))).toBe(100)
  })

  it('laat de middencategorie voorgaan op de hoofdcategorie', () => {
    // Staan er allebei, dan wint de fijnste afspraak — zoals overal in dit huis.
    const d: Dossier = {
      id: 'd1',
      naam: 'K',
      aandeelJij: 50,
      categorieAandelen: { 'ov-kinderen-en-gezin': 60, 'cat-kinderen-school': 100 },
    }
    expect(effectiefAandeel(d, kost({ categorieId: 'i-schoolfactuur-jasper-95' }))).toBe(100)
  })

  it('valt terug op de hoofdcategorie wanneer er voor de middenlaag niets staat', () => {
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 50, categorieAandelen: { 'ov-kinderen-en-gezin': 60 } }
    expect(effectiefAandeel(d, kost({ categorieId: 'i-schoolfactuur-jasper-95' }))).toBe(60)
  })

  it('rolt een kost op een item op naar de hoofdcategorie-verdeling', () => {
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 52, categorieAandelen: { 'ov-voeding': 60 } }
    // 'i-brood--wit-9238' is een item onder de hoofdcategorie Voeding (ov-voeding).
    expect(effectiefAandeel(d, kost({ categorieId: 'i-brood--wit-9238' }))).toBe(60)
  })
})

describe('effectiefAandeel — verdeelsleutel per kostensoort (typeAandelen)', () => {
  const dossier: Dossier = {
    id: 'd1',
    naam: 'Kinderen',
    aandeelJij: 52,
    typeAandelen: { buitengewoon: 50 },
  }

  it('gebruikt het percentage voor buitengewone kosten', () => {
    expect(effectiefAandeel(dossier, kost({ kostenType: 'buitengewoon' }))).toBe(50)
  })

  it('valt voor gewone kosten terug op de dossier-standaard als er geen sleutel voor gewoon is', () => {
    expect(effectiefAandeel(dossier, kost({ kostenType: 'gewoon' }))).toBe(52)
  })

  it('behandelt een kost zonder kostensoort als een gewone kost', () => {
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 52, typeAandelen: { gewoon: 60, buitengewoon: 50 } }
    expect(effectiefAandeel(d, kost({}))).toBe(60)
  })

  it('kan voor beide soorten een eigen sleutel hebben', () => {
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 52, typeAandelen: { gewoon: 60, buitengewoon: 50 } }
    expect(effectiefAandeel(d, kost({ kostenType: 'gewoon' }))).toBe(60)
    expect(effectiefAandeel(d, kost({ kostenType: 'buitengewoon' }))).toBe(50)
  })
})

describe('effectiefAandeel — volgorde van de volledige hiërarchie', () => {
  // Alle vier de niveaus tegelijk ingesteld, zodat elke test toont wie wint.
  const dossier: Dossier = {
    id: 'd1',
    naam: 'Kinderen',
    aandeelJij: 52, // 4. dossier-standaard
    categorieAandelen: { 'ov-gezondheid': 70 }, // 2. per categorie
    typeAandelen: { gewoon: 60, buitengewoon: 50 }, // 3. per kostensoort
  }

  it('1. een eigen percentage op de kost wint van categorie, kostensoort en standaard', () => {
    const k = kost({ categorieId: 'ov-gezondheid', kostenType: 'buitengewoon', aandeelJijOverride: 40 })
    expect(effectiefAandeel(dossier, k)).toBe(40)
  })

  it('2. de categorie wint van de kostensoort en de standaard', () => {
    const k = kost({ categorieId: 'ov-gezondheid', kostenType: 'buitengewoon' })
    expect(effectiefAandeel(dossier, k)).toBe(70)
  })

  it('3. de kostensoort wint van de standaard wanneer de categorie niets zegt', () => {
    const k = kost({ categorieId: 'ov-kleding', kostenType: 'buitengewoon' })
    expect(effectiefAandeel(dossier, k)).toBe(50)
  })

  it('4. zonder categorie- en soortsleutel blijft de dossier-standaard over', () => {
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 52 }
    expect(effectiefAandeel(d, kost({ categorieId: 'ov-kleding', kostenType: 'buitengewoon' }))).toBe(52)
  })
})

describe('saldoVerrekeningDossier', () => {
  it('rekent per kost met het juiste percentage (52/48 standaard, 70/30 voor kleding)', () => {
    const dossier: Dossier = { id: 'd1', naam: 'K', aandeelJij: 52, categorieAandelen: { 'ov-kleding': 70 } }
    // Jij betaalt 200 gewoon (partner is jou 48% = 96 verschuldigd) en 100 kleding
    // (partner is jou 30% = 30 verschuldigd) -> netto 126.
    const netto = saldoVerrekeningDossier(dossier, [
      kost({ id: 'a', bedrag: 200, betaaldDoor: 'jij' }),
      kost({ id: 'b', bedrag: 100, betaaldDoor: 'jij', categorieId: 'ov-kleding' }),
    ])
    expect(netto).toBe(126)
  })

  it('gebruikt de sleutel per kostensoort in het saldo (buitengewoon strikt 50/50)', () => {
    const dossier: Dossier = { id: 'd1', naam: 'K', aandeelJij: 60, typeAandelen: { buitengewoon: 50 } }
    // Jij betaalt 200 gewoon (partner is jou 40% = 80 verschuldigd) en 100
    // buitengewoon (partner is jou 50% = 50 verschuldigd) -> netto 130.
    const netto = saldoVerrekeningDossier(dossier, [
      kost({ id: 'a', bedrag: 200, betaaldDoor: 'jij', kostenType: 'gewoon' }),
      kost({ id: 'b', bedrag: 100, betaaldDoor: 'jij', kostenType: 'buitengewoon' }),
    ])
    expect(netto).toBe(130)
  })

  it('valt zonder overrides terug op de dossier-standaard (gelijk aan saldoVerrekening)', () => {
    const dossier: Dossier = { id: 'd1', naam: 'K', aandeelJij: 50 }
    const kosten = [kost({ bedrag: 100, betaaldDoor: 'jij' })]
    expect(saldoVerrekeningDossier(dossier, kosten)).toBe(saldoVerrekening(50, kosten))
  })
})

// Ronde 35: het afrekeningsoverzicht rondde JOUW AANDEEL af en leidde het aandeel
// van de partner daaruit af, terwijl deze kern het SALDO apart afrondde. Bij een
// bedrag dat exact op een halve cent uitkomt, gaven die twee een verschil van één
// cent — en dan zei hetzelfde document tegelijk twee dingen.
describe('afronding sluit aan bij het overzicht', () => {
  it('saldo = betaald door jou − jouw afgeronde aandeel, ook op een halve cent', () => {
    // € 123,45 bij 50/50 geeft exact 6172,5 cent. Precies het randgeval.
    const kosten: GedeeldeKost[] = [
      { id: 'k1', dossierId: 'd1', omschrijving: 'Tandarts', bedrag: 12345, betaaldDoor: 'jij', datum: '2026-07-01' },
    ]
    const dossier: Dossier = { id: 'd1', naam: 'Co-ouderschap', aandeelJij: 50 }

    const jouwAandeel = Math.round(12345 * 0.5) // 6173 — zo rekent het overzicht
    const partnerAandeel = 12345 - jouwAandeel // 6172
    const saldo = saldoVerrekeningDossier(dossier, kosten)

    // Wat de partner verschuldigd is, MOET zijn aandeel zijn. Vóór ronde 35 stond
    // hier 6173 tegenover een aandeel van 6172.
    expect(saldo).toBe(partnerAandeel)
    expect(jouwAandeel + partnerAandeel).toBe(12345)
  })

  it('doet hetzelfde wanneer de partner betaald heeft', () => {
    const kosten: GedeeldeKost[] = [
      { id: 'k1', dossierId: 'd1', omschrijving: 'Tandarts', bedrag: 12345, betaaldDoor: 'partner', datum: '2026-07-01' },
    ]
    const dossier: Dossier = { id: 'd1', naam: 'Co-ouderschap', aandeelJij: 50 }
    // Jij bent nu jouw eigen aandeel verschuldigd, dus negatief.
    expect(saldoVerrekeningDossier(dossier, kosten)).toBe(-Math.round(12345 * 0.5))
  })
})

describe('standaardWordtNogGebruikt (ronde 107)', () => {
  it('zegt nee zodra beide kostensoorten een eigen percentage hebben', () => {
    // Dan is élke kost ofwel gewoon ofwel buitengewoon, en komt `aandeelJij` nooit meer aan
    // bod — terwijl drie schermen hem bleven tonen als "Standaard draag jij 50%".
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 50, typeAandelen: { gewoon: 60, buitengewoon: 60 } }
    expect(standaardWordtNogGebruikt(d)).toBe(false)
    expect(effectiefAandeel(d, kost({}))).toBe(60)
    expect(effectiefAandeel(d, kost({ kostenType: 'buitengewoon' }))).toBe(60)
  })

  it('zegt ja wanneer er maar één kostensoort ingevuld is', () => {
    const d: Dossier = { id: 'd1', naam: 'K', aandeelJij: 50, typeAandelen: { gewoon: 60 } }
    expect(standaardWordtNogGebruikt(d)).toBe(true)
    expect(effectiefAandeel(d, kost({ kostenType: 'buitengewoon' }))).toBe(50)
  })

  it('zegt ja zonder verdeling per kostensoort', () => {
    expect(standaardWordtNogGebruikt({ id: 'd1', naam: 'K', aandeelJij: 50 })).toBe(true)
  })
})
