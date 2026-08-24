import { describe, it, expect } from 'vitest'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { boekingVoorVasteLast, vasteLastVoorBoeking, KOPPEL_MARGE } from './vastelastkoppeling'

const MAAND = '2026-08'

function post(over: Partial<TerugkerendePost> = {}): TerugkerendePost {
  return {
    id: 'p-water',
    omschrijving: 'Water',
    bedrag: -3000,
    rekeningId: 'r1',
    dag: 5,
    categorieId: 'i-water-voorschotten',
    ...over,
  }
}

function tx(over: Partial<Transactie> = {}): Transactie {
  return {
    id: 't1',
    datum: `${MAAND}-07`,
    omschrijving: 'De Watergroep',
    bedrag: -3200,
    rekeningId: 'r1',
    categorieId: 'i-water-voorschotten',
    ...over,
  }
}

describe('vasteLastVoorBoeking', () => {
  // Het geval waarvoor deze module bestaat: € 32 tegenover een vaste last van € 30.
  it('herkent een boeking die net iets anders is dan de vaste last', () => {
    expect(vasteLastVoorBoeking(tx(), [post()], [tx()], MAAND)?.id).toBe('p-water')
  })

  it('vraagt niets wanneer het bedrag exact klopt — dat herkent de app zelf al', () => {
    const t = tx({ bedrag: -3000 })
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)).toBeNull()
  })

  it('vraagt niets over een vaste last die deze maand al afgedekt is', () => {
    const betaald = tx({ id: 't-betaald', bedrag: -3000 })
    const anders = tx({ id: 't2', bedrag: -3300 })
    expect(vasteLastVoorBoeking(anders, [post()], [betaald, anders], MAAND)).toBeNull()
  })

  it('vraagt niets bij een andere categorie', () => {
    const t = tx({ categorieId: 'i-brood' })
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)).toBeNull()
  })

  it('vraagt niets bij een andere rekening', () => {
    const t = tx({ rekeningId: 'r2' })
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)).toBeNull()
  })

  it('vraagt niets over een vaste last zonder categorie', () => {
    const p = post({ categorieId: undefined })
    const t = tx({ categorieId: undefined })
    expect(vasteLastVoorBoeking(t, [p], [t], MAAND)).toBeNull()
  })

  it('vraagt niets over een gesplitst kassaticket', () => {
    const t = tx({ regels: [{ bedrag: -3200, categorieId: 'i-water-voorschotten' }] })
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)).toBeNull()
  })

  it('vraagt niets over een boeking uit een andere maand', () => {
    const t = tx({ datum: '2026-07-07' })
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)).toBeNull()
  })

  // Een inkomst ligt per definitie buiten de marge van een uitgave: het verschil
  // tussen +€ 32 en −€ 30 is € 62, ruim meer dan de helft van € 30.
  it('vraagt niets wanneer een inkomst op een vaste last lijkt', () => {
    const t = tx({ bedrag: 3200 })
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)).toBeNull()
  })

  // ⚠ Een vaste INKOMST is geen vaste last (nakijkronde ronde 64). De vraag zou het
  // over "je vaste last Loon" hebben, en zeg je ja, dan zakt "te verdelen" met het
  // verschil zonder dat er iets misging.
  it('vraagt niets over een vaste inkomst', () => {
    const loon = post({ id: 'p-loon', omschrijving: 'Loon', bedrag: 200000, categorieId: 'cat-inkomsten' })
    const bonus = tx({ bedrag: 150000, categorieId: 'cat-inkomsten' })
    expect(vasteLastVoorBoeking(bonus, [loon], [bonus], MAAND)).toBeNull()
  })

  // ⚠ Een post die deze maand niet vervalt, staat niet "nog open" — en dat is wél
  // wat de vraag beweert.
  it('vraagt niets over een opgezegde vaste last', () => {
    const gestopt = post({ eindMaand: '2026-07' })
    expect(vasteLastVoorBoeking(tx(), [gestopt], [tx()], MAAND)).toBeNull()
  })

  it('vraagt niets over een jaarpremie die deze maand niet vervalt', () => {
    const jaarlijks = post({ frequentie: 'jaar', startMaand: '2026-01' })
    expect(vasteLastVoorBoeking(tx(), [jaarlijks], [tx()], MAAND)).toBeNull()
  })

  // Het gevaarlijke geval uit de nakijkronde: van twee posten in dezelfde
  // categorie lag de OPGEZEGDE toevallig dichter bij het bedrag.
  it('slaat een opgezegde post over en kiest de lopende', () => {
    const opgezegd = post({ id: 'p-fitness', omschrijving: 'Fitness', bedrag: -3000, eindMaand: '2026-07' })
    const lopend = post({ id: 'p-club', omschrijving: 'Sportclub', bedrag: -3500 })
    expect(vasteLastVoorBoeking(tx(), [opgezegd, lopend], [tx()], MAAND)?.id).toBe('p-club')
  })

  // ⚠ De grens houdt de vraag bruikbaar: een broodje van € 3 in dezelfde categorie
  // als een vaste last van € 400 mag niet elke keer een vraag opleveren.
  it('vraagt niets wanneer het bedrag te ver afligt', () => {
    const t = tx({ bedrag: -300 })
    expect(vasteLastVoorBoeking(t, [post({ bedrag: -40000 })], [t], MAAND)).toBeNull()
  })

  it('vraagt nog net wél op de grens zelf', () => {
    // Precies de helft erboven: € 45 tegenover € 30.
    const t = tx({ bedrag: -4500 })
    expect(KOPPEL_MARGE).toBe(0.5)
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)?.id).toBe('p-water')
  })

  it('kiest de vaste last die het dichtst bij het bedrag ligt', () => {
    const dichtbij = post({ id: 'p-dichtbij', bedrag: -3300 })
    const verder = post({ id: 'p-verder', bedrag: -2200 })
    expect(vasteLastVoorBoeking(tx(), [verder, dichtbij], [tx()], MAAND)?.id).toBe('p-dichtbij')
  })

  // ⚠ Een verkeerd gestelde vraag levert een verkeerd antwoord op.
  it('vraagt niets bij een gelijkspel tussen twee vaste lasten', () => {
    const laag = post({ id: 'p-laag', bedrag: -3100 })
    const hoog = post({ id: 'p-hoog', bedrag: -3300 })
    expect(vasteLastVoorBoeking(tx(), [laag, hoog], [tx()], MAAND)).toBeNull()
  })

  it('vraagt niets over een boeking die al aan een BESTAANDE vaste last hangt', () => {
    const ander = post({ id: 'p-ander', omschrijving: 'Elektriciteit' })
    const t = tx({ vasteLastId: 'p-ander' })
    expect(vasteLastVoorBoeking(t, [post(), ander], [t], MAAND)).toBeNull()
  })

  it('vraagt WÉL opnieuw wanneer die vaste last niet meer bestaat', () => {
    // ⚠ Ronde 76. Verwijder je de vaste last waarnaar het antwoord wijst, dan is de
    // boeking weer een gewone boeking. Zonder deze regel bleef die aanduiding voor
    // altijd in de weg staan — "Losmaken" hangt aan de rij van de post, en die rij is
    // er niet meer — en maakte "Boek in" er ondertussen stil een tweede boeking bij.
    const t = tx({ vasteLastId: 'p-weg' })
    expect(vasteLastVoorBoeking(t, [post()], [t], MAAND)?.id).toBe('p-water')
  })
})

describe('boekingVoorVasteLast', () => {
  it('vindt de betaling die je zelf intikte met een ander bedrag', () => {
    expect(boekingVoorVasteLast(post(), [tx()], [post()], MAAND)?.id).toBe('t1')
  })

  it('zwijgt wanneer de vaste last al afgedekt is', () => {
    const betaald = tx({ id: 't-betaald', bedrag: -3000 })
    expect(boekingVoorVasteLast(post(), [betaald], [post()], MAAND)).toBeNull()
  })

  it('stelt de vraag opnieuw wanneer de gekoppelde post verwijderd is', () => {
    // ⚠ Ronde 76, de andere kant op: "Boek in" mag geen tweede boeking bijmaken omdat
    // een wees de herkenning blokkeerde. € 32 tegenover een post van € 30, met een
    // aanduiding naar een post die niet meer bestaat.
    const t = tx({ vasteLastId: 'p-weg' })
    expect(boekingVoorVasteLast(post(), [t], [post()], MAAND)?.id).toBe('t1')
  })

  it('zwijgt wanneer er niets in de buurt staat', () => {
    const t = tx({ bedrag: -19900, categorieId: 'i-brood' })
    expect(boekingVoorVasteLast(post(), [t], [post()], MAAND)).toBeNull()
  })

  it('kiest de boeking die het dichtst bij het bedrag ligt', () => {
    const dichtbij = tx({ id: 't-dichtbij', bedrag: -3100 })
    const verder = tx({ id: 't-verder', bedrag: -4400 })
    expect(boekingVoorVasteLast(post(), [verder, dichtbij], [post()], MAAND)?.id).toBe('t-dichtbij')
  })
})

// Ronde 64: een uitgesproken antwoord telt zwaarder dan elke gok — maar alleen in
// zijn eigen maand, en alleen zolang de post bestaat.
describe('een gekoppelde boeking dekt haar vaste last af', () => {
  it('geldt als geboekt, ook met een heel ander bedrag', async () => {
    const { geboekteVasteLasten } = await import('./vooruitblik')
    const t = tx({ bedrag: -12500, vasteLastId: 'p-water' })
    expect(geboekteVasteLasten([t], [post()], MAAND).has('p-water')).toBe(true)
  })

  // ⚠ De zwaarste fout van de eerste versie: één gekoppelde augustusbetaling
  // dekte die vaste last in élke volgende maand af. De vooruitblik telde het bedrag
  // nooit meer mee, het belletje zweeg voorgoed, en "Boek in" weigerde met "lijkt al
  // geboekt op 7 augustus".
  it('geldt ALLEEN in de maand van de boeking', async () => {
    const { geboekteVasteLasten } = await import('./vooruitblik')
    const t = tx({ bedrag: -3200, vasteLastId: 'p-water' })
    expect(geboekteVasteLasten([t], [post()], MAAND).has('p-water')).toBe(true)
    expect(geboekteVasteLasten([t], [post()], '2026-09').has('p-water')).toBe(false)
    expect(geboekteVasteLasten([t], [post()], '2026-07').has('p-water')).toBe(false)
  })

  // ⚠ Een antwoord dat naar een verdwenen post wijst, mag de boeking niet
  // onzichtbaar maken: dan zag geen enkel vangnet haar nog, en maakte "Boek in" er
  // zonder waarschuwing een tweede bij.
  it('gedraagt zich weer als een gewone boeking wanneer de post verdwenen is', async () => {
    const { geboekteVasteLasten, boekingDieDezePostAfdekt } = await import('./vooruitblik')
    const nieuw = post({ id: 'p-water-nieuw' })
    const t = tx({ bedrag: -3000, vasteLastId: 'p-water-oud' })
    expect(geboekteVasteLasten([t], [nieuw], MAAND).has('p-water-nieuw')).toBe(true)
    expect(boekingDieDezePostAfdekt([t], [nieuw], nieuw, MAAND)?.id).toBe('t1')
  })

  it('dekt geen ándere vaste last af', async () => {
    const { geboekteVasteLasten } = await import('./vooruitblik')
    const ander = post({ id: 'p-ander', bedrag: -3200 })
    const t = tx({ bedrag: -3200, vasteLastId: 'p-water' })
    const geboekt = geboekteVasteLasten([t], [post(), ander], MAAND)
    expect(geboekt.has('p-water')).toBe(true)
    expect(geboekt.has('p-ander')).toBe(false)
  })
})
