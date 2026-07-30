import { describe, it, expect } from 'vitest'
import { bouwPeriodeOverzicht, uitsplitsingRegel } from './periodeOverzicht'
import { kengetallenVan } from './overzicht'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { labelVanCategorie } from '../data/categorieen/resolve'
import type { Categorie, Rekening, Transactie } from '../data/schema'

// Echte categorie-id's uit de ingebouwde boom, uit het bestand zelf gehaald in
// plaats van hier verzonnen. Met een verzonnen id lost `labelVanCategorie` naar
// "Onbekend" op, en dan lijkt een test te slagen terwijl hij niets meet — dat
// gebeurde bij het schrijven van deze tests dan ook.
const VOEDING = INGEBOUWDE_CATEGORIEEN.find((h) => /Voeding/i.test(h.naam))!
const HUISHOUDEN = INGEBOUWDE_CATEGORIEEN.find((h) => /Huishouden/i.test(h.naam))!
const BROOD = VOEDING.categorieen[0].items[0].id
const WASMIDDEL = HUISHOUDEN.categorieen[0].items[0].id

// Ronde 41. De harde eis aan dit rapport: het mag geen ander getal tonen dan het
// scherm. Daarom staan hieronder twee soorten tests: de gewone (klopt het cijfer)
// en de sluitingstests (telt de tabel op tot het kengetal erboven).

const rekeningen: Rekening[] = [
  { id: 'r1', naam: 'Betaalrekening', beginsaldo: 100000 },
  { id: 'r2', naam: 'Spaarrekening', beginsaldo: 500000 },
]
const categorieen: Categorie[] = []

const tx = (over: Partial<Transactie> & { id: string; datum: string; bedrag: number }): Transactie => ({
  omschrijving: 'Colruyt',
  rekeningId: 'r1',
  ...over,
})

const maart: Transactie[] = [
  tx({ id: 'loon', datum: '2026-03-01', bedrag: 200000, omschrijving: 'Loon' }),
  tx({ id: 'colruyt', datum: '2026-03-04', bedrag: -4120, categorieId: BROOD }),
  tx({ id: 'q8', datum: '2026-03-09', bedrag: -6000, omschrijving: 'Q8', categorieId: WASMIDDEL }),
]
const juli: Transactie[] = [tx({ id: 'juli', datum: '2026-07-02', bedrag: -1000, omschrijving: 'Netflix' })]
const alles = [...maart, ...juli]

describe('bouwPeriodeOverzicht — een maand', () => {
  const o = bouwPeriodeOverzicht('2026-03', alles, categorieen, rekeningen)

  it('neemt alleen de boekingen van die maand mee', () => {
    expect(o.aantal).toBe(3)
    expect(o.regels.map((r) => r.id)).toEqual(['loon', 'colruyt', 'q8'])
  })

  it('zet de boekingen chronologisch, oudste eerst', () => {
    expect(o.regels.map((r) => r.datum)).toEqual(['2026-03-01', '2026-03-04', '2026-03-09'])
  })

  it('rekent inkomsten, uitgaven en netto uit', () => {
    expect(o.inkomsten).toBe(200000)
    expect(o.uitgaven).toBe(10120)
    expect(o.netto).toBe(189880)
  })

  it('meet het saldo op de laatste dag van de maand, niet op vandaag', () => {
    // Anders leest een rapport over maart het saldo van vandaag, en sluit er niets
    // meer op elkaar aan. 31 maart is de peildatum; de juli-boeking telt dus niet mee.
    expect(o.saldoDatum).toBe('2026-03-31')
    expect(o.saldo).toBe(100000 + 500000 + 200000 - 4120 - 6000)
  })

  it('schrijft de periode voluit', () => {
    expect(o.label).toBe('maart 2026')
    expect(o.soort).toBe('maand')
  })

  it('laat de maandtabel weg bij een maandrapport', () => {
    expect(o.perMaand).toEqual([])
  })

  it('zet de rekeningnaam bij elke boeking', () => {
    expect(o.regels[0].rekening).toBe('Betaalrekening')
  })

  // De sluitingstest: wat in de categorietabel staat, telt op tot het kengetal.
  it('laat de uitgaventabel exact optellen tot het uitgavenkengetal', () => {
    const som = o.perCategorieUitgaven.reduce((s, p) => s + p.bedrag, 0)
    expect(som).toBe(o.uitgaven)
  })

  it('laat de inkomstentabel exact optellen tot het inkomstenkengetal', () => {
    const som = o.perCategorieInkomsten.reduce((s, p) => s + p.bedrag, 0)
    expect(som).toBe(o.inkomsten)
  })

  it('geeft dezelfde cijfers als de kengetallen van het scherm over dezelfde rijen', () => {
    const cijfers = kengetallenVan(maart)
    expect({ inkomsten: o.inkomsten, uitgaven: o.uitgaven }).toEqual({
      inkomsten: cijfers.inkomsten,
      uitgaven: cijfers.uitgaven,
    })
  })
})

describe('bouwPeriodeOverzicht — een jaar', () => {
  const o = bouwPeriodeOverzicht('2026', alles, categorieen, rekeningen)

  it('telt het hele jaar samen', () => {
    expect(o.aantal).toBe(4)
    expect(o.uitgaven).toBe(10120 + 1000)
  })

  it('geeft twaalf maanden terug, ook de lege', () => {
    expect(o.perMaand).toHaveLength(12)
    expect(o.perMaand[0].maand).toBe('2026-01')
    expect(o.perMaand[11].maand).toBe('2026-12')
    expect(o.perMaand[0].inkomsten).toBe(0)
  })

  it('laat de maanden optellen tot het jaartotaal', () => {
    const inkomsten = o.perMaand.reduce((s, m) => s + m.inkomsten, 0)
    const uitgaven = o.perMaand.reduce((s, m) => s + m.uitgaven, 0)
    expect(inkomsten).toBe(o.inkomsten)
    expect(uitgaven).toBe(o.uitgaven)
  })

  it('meet het saldo op 31 december', () => {
    expect(o.saldoDatum).toBe('2026-12-31')
  })

  it('noemt het jaar als label', () => {
    expect(o.label).toBe('2026')
    expect(o.soort).toBe('jaar')
  })
})

describe('een gesplitst ticket', () => {
  const gesplitst = tx({
    id: 'ticket',
    datum: '2026-03-04',
    bedrag: -5380,
    regels: [
      { categorieId: BROOD, bedrag: -4120 },
      { categorieId: WASMIDDEL, bedrag: -1260 },
    ],
  })
  const o = bouwPeriodeOverzicht('2026-03', [gesplitst], categorieen, rekeningen)

  it('staat als één regel in de lijst, met het volledige ticketbedrag', () => {
    expect(o.regels).toHaveLength(1)
    expect(o.regels[0].bedrag).toBe(-5380)
  })

  it('laat de categoriekolom leeg en zet de uitsplitsing eronder', () => {
    // Eén categorienaam zou liegen over waar het geld naartoe ging.
    expect(o.regels[0].categorie).toBe('')
    expect(o.regels[0].uitsplitsing).toContain('41,20')
    expect(o.regels[0].uitsplitsing).toContain('12,60')
  })

  it('wordt in de categorietabel wél uitgesplitst', () => {
    // Dit is de domeinregel: aggregeren op de moedertransactie is de bekende fout.
    expect(o.perCategorieUitgaven.length).toBeGreaterThan(1)
    expect(o.perCategorieUitgaven.reduce((s, p) => s + p.bedrag, 0)).toBe(5380)
  })
})

describe('uitsplitsingRegel', () => {
  it('geeft niets terug bij een gewone boeking', () => {
    expect(uitsplitsingRegel(tx({ id: 't', datum: '2026-03-01', bedrag: -1000 }), categorieen)).toBe('')
  })

  it('schrijft de bedragen zonder euroteken, met een komma', () => {
    // Bewust zonder €: deze tekst gaat naar een PDF, en jsPDF kan niet elk teken.
    const regel = uitsplitsingRegel(
      tx({
        id: 't',
        datum: '2026-03-01',
        bedrag: -5380,
        regels: [
          { categorieId: BROOD, bedrag: -4120 },
          { categorieId: WASMIDDEL, bedrag: -1260 },
        ],
      }),
      categorieen,
    )
    expect(regel).not.toContain('€')
    expect(regel).toContain('41,20')
  })
})

describe('een lege periode', () => {
  const o = bouwPeriodeOverzicht('2019-01', alles, categorieen, rekeningen)

  it('blijft overeind met nul boekingen', () => {
    expect(o.aantal).toBe(0)
    expect(o.regels).toEqual([])
    expect(o.inkomsten).toBe(0)
    expect(o.uitgaven).toBe(0)
    expect(o.netto).toBe(0)
    expect(o.perCategorieUitgaven).toEqual([])
  })

  it('toont nog steeds het saldo van dat moment', () => {
    // De beginsaldi van de rekeningen bestonden toen al.
    expect(o.saldo).toBe(600000)
  })
})

describe('een gesplitst ticket met een positieve regel', () => {
  // Statiegeld of een korting op een kassaticket. Dit is de fout die de review
  // vond: de uitsplitsing telde niet meer op tot het bedrag van de rij, omdat de
  // tekens werden weggegooid.
  const ticket = tx({
    id: 'statiegeld',
    datum: '2026-03-04',
    bedrag: -5380,
    regels: [
      { categorieId: BROOD, bedrag: -5680 },
      { categorieId: WASMIDDEL, bedrag: 300 },
    ],
  })

  it('laat de uitsplitsing optellen tot het bedrag van de rij', () => {
    const regel = uitsplitsingRegel(ticket, categorieen)
    const som = [...regel.matchAll(/(-?\d+,\d\d)/g)].reduce(
      (s, m) => s + Math.round(Number(m[1].replace(',', '.')) * 100),
      0,
    )
    expect(som).toBe(-5380)
  })

  it('houdt het minteken bij de negatieve regel', () => {
    expect(uitsplitsingRegel(ticket, categorieen)).toContain('-56,80')
  })
})

describe('twee ticketregels in dezelfde categorie', () => {
  it('worden één post in plaats van twee keer dezelfde naam', () => {
    const ticket = tx({
      id: 'dubbel',
      datum: '2026-03-04',
      bedrag: -3500,
      regels: [
        { categorieId: BROOD, bedrag: -2000 },
        { categorieId: BROOD, bedrag: -1500 },
      ],
    })
    const regel = uitsplitsingRegel(ticket, categorieen)
    const naam = labelVanCategorie(BROOD, categorieen)!
    expect(regel.split(naam)).toHaveLength(2)
    expect(regel).toContain('-35,00')
  })
})

describe('een ticket met één ingevulde regel en geen categorie op de transactie', () => {
  // Zo bewaart het transactieformulier een kassaticket waarop je één regel invulde:
  // alleen `regels`, geen `categorieId`. De boekingenlijst zei dan "Zonder
  // categorie" terwijl de categorietabel in hetzelfde rapport de echte naam gaf.
  const ticket = tx({
    id: 'een-regel',
    datum: '2026-03-04',
    bedrag: -1200,
    regels: [{ categorieId: WASMIDDEL, bedrag: -1200 }],
  })
  const o = bouwPeriodeOverzicht('2026-03', [ticket], categorieen, rekeningen)

  it('noemt in de lijst dezelfde categorie als in de tabel', () => {
    expect(o.regels[0].categorie).toBe(o.perCategorieUitgaven[0].naam)
    expect(o.regels[0].categorie).not.toBe('Zonder categorie')
  })

  it('laat de uitsplitsing weg: er is niets te splitsen', () => {
    expect(o.regels[0].uitsplitsing).toBe('')
  })
})

describe('overboekingen en waarderingen in het saldo', () => {
  it('laat een overboeking het totaal onaangeroerd', () => {
    // Geld van de ene eigen rekening naar de andere maakt je niet rijker of armer.
    const o = bouwPeriodeOverzicht('2026-03', maart, categorieen, rekeningen, [
      { id: 'ov1', datum: '2026-03-10', vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 50000 },
    ])
    const zonder = bouwPeriodeOverzicht('2026-03', maart, categorieen, rekeningen)
    expect(o.saldo).toBe(zonder.saldo)
  })

  it('laat een overboeking geen inkomst of uitgave worden', () => {
    const o = bouwPeriodeOverzicht('2026-03', maart, categorieen, rekeningen, [
      { id: 'ov1', datum: '2026-03-10', vanRekeningId: 'r1', naarRekeningId: 'r2', bedrag: 50000 },
    ])
    expect(o.inkomsten).toBe(200000)
    expect(o.uitgaven).toBe(10120)
  })

  it('neemt een waardering als nieuw vertrekpunt voor het saldo', () => {
    const o = bouwPeriodeOverzicht('2026-03', maart, categorieen, rekeningen, [], [
      { id: 'w1', rekeningId: 'r2', datum: '2026-03-15', saldo: 900000 },
    ])
    // r2 vertrekt vanaf 15 maart van 900.000 in plaats van 500.000.
    expect(o.saldo).toBe(900000 + 100000 + 200000 - 4120 - 6000)
  })
})
