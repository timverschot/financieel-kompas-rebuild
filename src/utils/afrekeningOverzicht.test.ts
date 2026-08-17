import { describe, it, expect } from 'vitest'
import {
  aandeelUitleg,
  bouwAfrekeningOverzicht,
  centenVerdelen,
  ZONDER_KIND,
  type AfrekeningGroep,
} from './afrekeningOverzicht'
import { saldoVerrekeningDossier } from './dossier'
import type { Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 10000,
  betaaldDoor: 'jij',
  datum: '2026-07-15',
  ...over,
})

const kinderen: Kind[] = [
  { id: 'kind1', naam: 'Emma' },
  { id: 'kind2', naam: 'Lucas' },
  { id: 'kind3', naam: 'Noor' },
]

const afrekeningVoor = (kosten: GedeeldeKost[], over: Partial<Verrekening> = {}): Verrekening => ({
  id: 'v1',
  dossierId: 'd1',
  datum: '2026-07-31',
  bedrag: 0,
  kostIds: kosten.map((k) => k.id),
  ...over,
})

// Elke uitsplitsing moet exact optellen tot dezelfde totalen. Dit is de kern van
// de hele module: een uitsplitsing die niet optelt, is erger dan geen.
function controleerSluitendeGroepen(groepen: AfrekeningGroep[], o: ReturnType<typeof bouwAfrekeningOverzicht>) {
  const som = (f: (g: AfrekeningGroep) => number) => groepen.reduce((s, g) => s + f(g), 0)
  expect(som((g) => g.totaal)).toBe(o.totaal)
  expect(som((g) => g.jouwAandeel)).toBe(o.jouwAandeel)
  expect(som((g) => g.partnerAandeel)).toBe(o.partnerAandeel)
  expect(som((g) => g.betaaldDoorJou)).toBe(o.betaaldDoorJou)
  expect(som((g) => g.betaaldDoorPartner)).toBe(o.betaaldDoorPartner)
  expect(som((g) => g.netto)).toBe(o.netto)
  // En elke rij klopt ook overlangs.
  for (const g of groepen) {
    expect(g.jouwAandeel + g.partnerAandeel).toBe(g.totaal)
    expect(g.betaaldDoorJou + g.betaaldDoorPartner).toBe(g.totaal)
  }
}

describe('centenVerdelen', () => {
  it('rondt elke rij af maar houdt het totaal exact', () => {
    const uit = centenVerdelen([33.3333, 33.3333, 33.3334])
    expect(uit.reduce((a, b) => a + b, 0)).toBe(100)
    for (const v of uit) expect(Number.isInteger(v)).toBe(true)
  })

  it('werkt ook met negatieve bedragen', () => {
    const uit = centenVerdelen([-16.666, -16.667, -16.667])
    expect(uit.reduce((a, b) => a + b, 0)).toBe(-50)
  })

  it('komt exact op het opgegeven doel uit, ook bij een halve cent verschil', () => {
    const uit = centenVerdelen([0.5, 0.5, 0.5], 2)
    expect(uit.reduce((a, b) => a + b, 0)).toBe(2)
  })

  it('geeft een lege lijst terug zonder waarden', () => {
    expect(centenVerdelen([], 500)).toEqual([])
  })
})

describe('bouwAfrekeningOverzicht — de uitsplitsing telt op tot het totaal', () => {
  // Bewust lastige cijfers: oneven bedragen, een percentage dat niet netjes
  // deelt, kosten over drie kinderen, en kosten zonder kind.
  const dossier: Dossier = {
    id: 'd1',
    naam: 'Kinderen',
    aandeelJij: 66.67,
    typeAandelen: { buitengewoon: 50 },
    categorieAandelen: { 'ov-voeding': 40 },
  }
  const kosten: GedeeldeKost[] = [
    kost({ id: 'a', bedrag: 3333, betaaldDoor: 'jij', kindIds: ['kind1', 'kind2', 'kind3'] }),
    kost({ id: 'b', bedrag: 1717, betaaldDoor: 'partner', kindIds: ['kind2'], kostenType: 'buitengewoon' }),
    kost({ id: 'c', bedrag: 999, betaaldDoor: 'jij', categorieId: 'i-brood--wit-9238' }),
    kost({ id: 'd', bedrag: 12345, betaaldDoor: 'partner', kindIds: ['kind1', 'kind3'], aandeelJijOverride: 33.33 }),
    kost({ id: 'e', bedrag: 7, betaaldDoor: 'jij' }),
  ]
  const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)

  it('gebruikt exact hetzelfde netto als saldoVerrekeningDossier', () => {
    expect(o.netto).toBe(saldoVerrekeningDossier(dossier, kosten))
  })

  it('telt de kosten en de betalers exact op', () => {
    expect(o.totaal).toBe(3333 + 1717 + 999 + 12345 + 7)
    expect(o.betaaldDoorJou).toBe(3333 + 999 + 7)
    expect(o.betaaldDoorPartner).toBe(1717 + 12345)
    expect(o.jouwAandeel + o.partnerAandeel).toBe(o.totaal)
  })

  it('sluit per kind', () => controleerSluitendeGroepen(o.perKind, o))
  it('sluit per categorie', () => controleerSluitendeGroepen(o.perCategorie, o))
  it('sluit per kostensoort', () => controleerSluitendeGroepen(o.perKostensoort, o))

  it('sluit ook in de detaillijst', () => {
    const som = (f: (r: (typeof o.regels)[number]) => number) => o.regels.reduce((s, r) => s + f(r), 0)
    expect(som((r) => r.bedrag)).toBe(o.totaal)
    expect(som((r) => r.jouwAandeel)).toBe(o.jouwAandeel)
    expect(som((r) => r.partnerAandeel)).toBe(o.partnerAandeel)
    expect(som((r) => r.netto)).toBe(o.netto)
  })
})

describe('bouwAfrekeningOverzicht — blijft sluiten bij willekeurige gegevens', () => {
  // Een eenvoudige, herhaalbare pseudo-toevalsgenerator: zo testen we honderden
  // combinaties zonder dat de test bij elke run iets anders doet.
  function generator(zaad: number) {
    let s = zaad
    return (max: number) => {
      s = (s * 1103515245 + 12345) % 2147483648
      return Math.abs(s) % max
    }
  }

  it('telt in 200 willekeurige dossiers altijd exact op tot saldoVerrekeningDossier', () => {
    const rnd = generator(42)
    for (let ronde = 0; ronde < 200; ronde++) {
      const dossier: Dossier = {
        id: 'd1',
        naam: 'Test',
        aandeelJij: rnd(10001) / 100,
        ...(rnd(2) === 0 ? { typeAandelen: { buitengewoon: rnd(10001) / 100 } } : {}),
      }
      const aantal = 1 + rnd(12)
      const kosten: GedeeldeKost[] = []
      for (let i = 0; i < aantal; i++) {
        const kindAantal = rnd(4) // 0 = geen kind
        kosten.push(
          kost({
            id: `k${i}`,
            bedrag: 1 + rnd(500000),
            betaaldDoor: rnd(2) === 0 ? 'jij' : 'partner',
            datum: `2026-0${1 + rnd(9)}-1${rnd(9)}`,
            ...(kindAantal > 0 ? { kindIds: kinderen.slice(0, kindAantal).map((k) => k.id) } : {}),
            ...(rnd(3) === 0 ? { kostenType: 'buitengewoon' as const } : {}),
            ...(rnd(4) === 0 ? { aandeelJijOverride: rnd(10001) / 100 } : {}),
          }),
        )
      }
      const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)
      const verwacht = saldoVerrekeningDossier(dossier, kosten)
      expect(o.netto).toBe(verwacht)
      for (const groepen of [o.perKind, o.perCategorie, o.perKostensoort]) {
        expect(groepen.reduce((s, g) => s + g.netto, 0)).toBe(verwacht)
        expect(groepen.reduce((s, g) => s + g.totaal, 0)).toBe(o.totaal)
        expect(groepen.reduce((s, g) => s + g.jouwAandeel, 0)).toBe(o.jouwAandeel)
      }
      expect(o.regels.reduce((s, r) => s + r.netto, 0)).toBe(verwacht)
    }
  })
})

describe('bouwAfrekeningOverzicht — uitsplitsing per kind', () => {
  const dossier: Dossier = { id: 'd1', naam: 'Kinderen', aandeelJij: 50 }

  it('verdeelt een kost over meerdere kinderen gelijk', () => {
    const kosten = [kost({ id: 'a', bedrag: 3000, kindIds: ['kind1', 'kind2'] })]
    const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)
    expect(o.perKind.map((g) => [g.naam, g.totaal])).toEqual([
      ['Emma', 1500],
      ['Lucas', 1500],
    ])
  })

  it('zet een kost zonder kind onder een eigen noemer, achteraan', () => {
    const kosten = [kost({ id: 'a', bedrag: 1000, kindIds: ['kind1'] }), kost({ id: 'b', bedrag: 500 })]
    const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)
    const laatste = o.perKind[o.perKind.length - 1]
    expect(laatste.sleutel).toBe(ZONDER_KIND)
    expect(laatste.naam).toBe('Niet toegewezen aan een kind')
    expect(laatste.vertaalbaar).toBe(true)
    expect(laatste.totaal).toBe(500)
  })

  it('houdt de volgorde van de kinderenlijst aan', () => {
    const kosten = [kost({ id: 'a', bedrag: 100, kindIds: ['kind3'] }), kost({ id: 'b', bedrag: 100, kindIds: ['kind1'] })]
    const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)
    expect(o.perKind.map((g) => g.naam)).toEqual(['Emma', 'Noor'])
  })

  it('toont een onbekend kind-id in plaats van het stil weg te laten', () => {
    const kosten = [kost({ id: 'a', bedrag: 100, kindIds: ['weg'] })]
    const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)
    expect(o.perKind[0].naam).toBe('weg')
    expect(o.perKind[0].vertaalbaar).toBe(false)
  })
})

describe('bouwAfrekeningOverzicht — uitsplitsing per categorie en kostensoort', () => {
  const dossier: Dossier = { id: 'd1', naam: 'Kinderen', aandeelJij: 50 }

  it('rolt een subcategorie op naar haar hoofdcategorie', () => {
    const kosten = [
      kost({ id: 'a', bedrag: 1000, categorieId: 'i-brood--wit-9238' }),
      kost({ id: 'b', bedrag: 500, categorieId: 'ov-voeding' }),
      kost({ id: 'c', bedrag: 300 }),
    ]
    const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)
    const voeding = o.perCategorie.find((g) => g.sleutel === 'ov-voeding')
    expect(voeding?.naam).toBe('Voeding')
    expect(voeding?.totaal).toBe(1500)
    expect(o.perCategorie.find((g) => g.sleutel === '')?.naam).toBe('Zonder categorie')
  })

  it('gebruikt de naam van een eigen categorie van de gebruiker', () => {
    const kosten = [kost({ id: 'a', bedrag: 1000, categorieId: 'eigen1' })]
    const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen, [{ id: 'eigen1', naam: 'Hobby' }])
    expect(o.perCategorie[0].naam).toBe('Hobby')
  })

  it('splitst gewone en buitengewone kosten, met kosten zonder soort als gewoon', () => {
    const kosten = [
      kost({ id: 'a', bedrag: 1000 }),
      kost({ id: 'b', bedrag: 500, kostenType: 'buitengewoon' }),
      kost({ id: 'c', bedrag: 200, kostenType: 'gewoon' }),
    ]
    const o = bouwAfrekeningOverzicht(dossier, afrekeningVoor(kosten), kosten, kinderen)
    expect(o.perKostensoort.map((g) => [g.naam, g.totaal])).toEqual([
      ['Gewone kosten', 1200],
      ['Buitengewone kosten', 500],
    ])
  })
})

describe('aandeelUitleg', () => {
  const dossier: Dossier = {
    id: 'd1',
    naam: 'Kinderen',
    aandeelJij: 50,
    categorieAandelen: { 'ov-voeding': 40 },
    typeAandelen: { buitengewoon: 30 },
  }

  it('herkent een eigen percentage op de kost', () => {
    expect(aandeelUitleg(dossier, kost({ aandeelJijOverride: 80 }))).toMatchObject({ percentageJij: 80, herkomst: 'kost' })
  })

  it('herkent een categorie-afspraak, ook via een subcategorie', () => {
    const uitleg = aandeelUitleg(dossier, kost({ categorieId: 'i-brood--wit-9238' }))
    expect(uitleg).toMatchObject({ percentageJij: 40, herkomst: 'categorie', bron: 'Voeding' })
  })

  it('herkent een afspraak per kostensoort', () => {
    expect(aandeelUitleg(dossier, kost({ kostenType: 'buitengewoon' }))).toMatchObject({
      percentageJij: 30,
      herkomst: 'kostensoort',
      bron: 'buitengewoon',
    })
  })

  it('valt terug op de standaard van het dossier', () => {
    expect(aandeelUitleg(dossier, kost({}))).toMatchObject({ percentageJij: 50, herkomst: 'dossier' })
  })

  // Ronde 44 gaf een ingelezen kost een eigen herkomst, zodat het document niet
  // beweert dat jij dat percentage koos. Ronde 51 zorgt dat die bewering ook waar
  // blijft nadat je het percentage zelf aanpast.
  it('noemt een ingelezen percentage van de andere ouder', () => {
    const ingelezen = kost({ aandeelJijOverride: 60, uitwisselAandeel: 60, uitwisselId: 'u-1' })
    expect(aandeelUitleg(dossier, ingelezen)).toMatchObject({ percentageJij: 60, herkomst: 'uitwisseling' })
  })

  it('noemt het JOUW percentage zodra je het zelf aanpaste', () => {
    // De kost houdt haar `uitwisselId` — daaraan herkennen beide apps ze bij een
    // volgend heen-en-weer. Maar het cijfer komt niet meer van de andere ouder, en
    // dan mag de bewijsmap dat ook niet meer zeggen.
    const aangepast = kost({ aandeelJijOverride: 75, uitwisselAandeel: 60, uitwisselId: 'u-1' })
    expect(aandeelUitleg(dossier, aangepast)).toMatchObject({ percentageJij: 75, herkomst: 'kost' })
  })

  it('houdt het oude gedrag aan bij een kost van vóór deze ronde', () => {
    // Zo'n kost draagt geen `uitwisselAandeel`, dus kan de app het verschil niet
    // zien. Dan blijft staan wat er stond — dat klopt voor het gewone geval, waarin
    // je zo'n percentage gewoon laat staan, en het herstelt zich volledig zodra de
    // andere ouder die kost nog eens doorstuurt.
    const oud = kost({ aandeelJijOverride: 60, uitwisselId: 'u-1' })
    expect(aandeelUitleg(dossier, oud)).toMatchObject({ herkomst: 'uitwisseling' })
  })
})

describe('bouwAfrekeningOverzicht — kop en detail', () => {
  const dossier: Dossier = { id: 'd1', naam: 'Kinderen', aandeelJij: 50, typeAandelen: { buitengewoon: 30 } }
  const kosten: GedeeldeKost[] = [
    kost({ id: 'b', bedrag: 2000, datum: '2026-07-20', omschrijving: 'Tandarts', kostenType: 'buitengewoon', bonnetje: 'data:x' }),
    kost({ id: 'a', bedrag: 1000, datum: '2026-07-02', omschrijving: 'Schoolreis', betaaldDoor: 'partner' }),
  ]
  const afr = afrekeningVoor(kosten, { bedrag: 400, periodeVan: '2026-07-01', periodeTot: '2026-07-31', kindIds: ['kind1'] })
  const o = bouwAfrekeningOverzicht(dossier, afr, kosten, kinderen)

  it('vult de kop met periode, kinderen en bonnetjes', () => {
    expect(o.periodeVan).toBe('2026-07-01')
    expect(o.periodeTot).toBe('2026-07-31')
    expect(o.kindNamen).toEqual(['Emma'])
    expect(o.aantalKosten).toBe(2)
    expect(o.aantalMetBonnetje).toBe(1)
  })

  it('somt de gebruikte verdeelsleutels op', () => {
    expect(o.verdeelsleutels.map((s) => [s.percentageJij, s.herkomst, s.aantalKosten])).toEqual([
      [30, 'kostensoort', 1],
      [50, 'dossier', 1],
    ])
  })

  it('sorteert de detaillijst op datum en toont per regel wat nodig is', () => {
    expect(o.regels.map((r) => r.omschrijving)).toEqual(['Schoolreis', 'Tandarts'])
    expect(o.regels[0]).toMatchObject({ datum: '2026-07-02', bedrag: 1000, betaaldDoorJou: false, percentageJij: 50, heeftBonnetje: false })
    expect(o.regels[1]).toMatchObject({ percentageJij: 30, heeftBonnetje: true, kostenType: 'buitengewoon' })
  })

  it('meldt het wanneer het bewaarde saldo niet meer klopt met de huidige verdeling', () => {
    expect(o.netto).toBe(saldoVerrekeningDossier(dossier, kosten))
    expect(o.bewaardNetto).toBe(400)
    expect(o.wijktAf).toBe(o.netto !== 400)
  })

  it('geeft een leeg maar sluitend overzicht zonder kosten', () => {
    const leeg = bouwAfrekeningOverzicht(dossier, afrekeningVoor([]), [], kinderen)
    expect(leeg.totaal).toBe(0)
    expect(leeg.netto).toBe(0)
    expect(leeg.perKind).toEqual([])
    expect(leeg.regels).toEqual([])
  })
})
