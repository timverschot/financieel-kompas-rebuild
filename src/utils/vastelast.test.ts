import { describe, it, expect } from 'vitest'
import type { TerugkerendePost } from '../data/schema'
import {
  frequentieVan,
  intervalVan,
  maandVerschil,
  maandbedrag,
  opzijPerMaand,
  plancijfers,
  valtInMaand,
  volgendeVervaldag,
} from './vastelast'

function post(over: Partial<TerugkerendePost> = {}): TerugkerendePost {
  return { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 5, ...over }
}

// Een halfjaarlijkse autoverzekering van € 600, voor het eerst betaald op
// 5 augustus 2026. Dit is precies het voorbeeld waar het ritme níét het
// kalenderhalfjaar volgt: de volgende vervaldag is februari, niet januari.
const premie = post({
  id: 'prem',
  omschrijving: 'Autoverzekering',
  bedrag: -60000,
  dag: 5,
  frequentie: 'semester',
  startMaand: '2026-08',
})

describe('frequentie en interval', () => {
  it('behandelt een post zonder frequentie als maandelijks', () => {
    expect(frequentieVan(post())).toBe('maand')
    expect(intervalVan(post())).toBe(1)
  })

  it('kent het aantal maanden per frequentie', () => {
    expect(intervalVan(post({ frequentie: 'kwartaal' }))).toBe(3)
    expect(intervalVan(post({ frequentie: 'semester' }))).toBe(6)
    expect(intervalVan(post({ frequentie: 'jaar' }))).toBe(12)
  })
})

describe('maandVerschil', () => {
  it('telt over een jaargrens heen', () => {
    expect(maandVerschil('2026-08', '2027-02')).toBe(6)
    expect(maandVerschil('2026-08', '2026-08')).toBe(0)
    expect(maandVerschil('2026-08', '2026-07')).toBe(-1)
  })
})

describe('valtInMaand', () => {
  it('laat een maandelijkse post in elke maand vallen', () => {
    expect(valtInMaand(post(), '2026-07')).toBe(true)
    expect(valtInMaand(post(), '2027-01')).toBe(true)
  })

  it('volgt het ritme vanaf de eerste betaling, niet vanaf de kalender', () => {
    // Augustus is de start; dan februari, dan augustus.
    expect(valtInMaand(premie, '2026-08')).toBe(true)
    expect(valtInMaand(premie, '2027-02')).toBe(true)
    expect(valtInMaand(premie, '2027-08')).toBe(true)
    // Januari en juli zijn kalenderhalfjaren, maar niet de vervaldagen van dit contract.
    expect(valtInMaand(premie, '2027-01')).toBe(false)
    expect(valtInMaand(premie, '2027-07')).toBe(false)
  })

  it('valt niet vóór de eerste betaling', () => {
    expect(valtInMaand(premie, '2026-02')).toBe(false)
    expect(valtInMaand(premie, '2026-07')).toBe(false)
  })

  it('gedraagt zich als maandelijks wanneer de startmaand ontbreekt', () => {
    // Zonder startmaand is het ritme niet te plaatsen. Dan gokken we niet, maar
    // vallen we terug op het gedrag van vóór deze uitbreiding.
    const zonderStart = post({ frequentie: 'jaar' })
    expect(valtInMaand(zonderStart, '2026-03')).toBe(true)
  })
})

describe('maandbedrag', () => {
  it('laat een maandelijks bedrag ongemoeid', () => {
    expect(maandbedrag(post({ bedrag: -95000 }))).toBe(-95000)
  })

  it('rekent een halfjaarlijkse en een jaarlijkse kost om naar één maand', () => {
    expect(maandbedrag(premie)).toBe(-10000) // € 600 per halfjaar = € 100 per maand
    expect(maandbedrag(post({ bedrag: -120000, frequentie: 'jaar' }))).toBe(-10000)
    expect(maandbedrag(post({ bedrag: -30000, frequentie: 'kwartaal' }))).toBe(-10000)
  })

  it('rondt af in plaats van centen te laten verdwijnen', () => {
    expect(maandbedrag(post({ bedrag: -10000, frequentie: 'jaar' }))).toBe(-833)
  })
})

describe('opzijPerMaand', () => {
  it('is nul zolang je niet gekozen hebt om op te bouwen', () => {
    expect(opzijPerMaand(premie)).toBe(0)
  })

  it('geeft het maandelijkse deel als positief bedrag zodra je opbouwt', () => {
    expect(opzijPerMaand({ ...premie, opbouwen: true })).toBe(10000)
  })

  it('is nul voor een maandelijkse post — die betaal je gewoon', () => {
    expect(opzijPerMaand(post({ opbouwen: true }))).toBe(0)
  })

  it('is nul voor een terugkerende inkomst', () => {
    expect(opzijPerMaand({ ...premie, bedrag: 60000, opbouwen: true })).toBe(0)
  })
})

describe('volgendeVervaldag', () => {
  it('geeft deze maand zolang de dag nog niet voorbij is', () => {
    expect(volgendeVervaldag(post({ dag: 20 }), '2026-07-15')).toBe('2026-07-20')
  })

  it('springt naar volgende maand zodra de dag voorbij is', () => {
    expect(volgendeVervaldag(post({ dag: 3 }), '2026-07-15')).toBe('2026-08-03')
  })

  it('springt over de jaargrens bij een maandelijkse post', () => {
    expect(volgendeVervaldag(post({ dag: 3 }), '2026-12-15')).toBe('2027-01-03')
  })

  it('geeft de eerste betaling wanneer het contract nog moet beginnen', () => {
    expect(volgendeVervaldag(premie, '2026-03-01')).toBe('2026-08-05')
  })

  it('geeft de volgende in het ritme, niet gewoon de volgende maand', () => {
    // Augustus is net voorbij → februari, niet september.
    expect(volgendeVervaldag(premie, '2026-08-20')).toBe('2027-02-05')
    // Midden in de cyclus → de eerstvolgende vervalmaand.
    expect(volgendeVervaldag(premie, '2026-11-10')).toBe('2027-02-05')
  })

  it('geeft deze maand wanneer de vervaldag nog moet komen', () => {
    expect(volgendeVervaldag(premie, '2027-02-01')).toBe('2027-02-05')
  })
})

describe('plancijfers', () => {
  const huur = post({ id: 'huur', bedrag: -95000, dag: 3 })
  const loon = post({ id: 'loon', omschrijving: 'Loon', bedrag: 240000, dag: 25 })
  const opbouw = { ...premie, opbouwen: true }

  it('telt de vaste lasten van deze maand met hun volle bedrag', () => {
    const c = plancijfers([huur, loon], '2026-07')
    expect(c.vastDezeMaand).toBe(95000)
    expect(c.vasteInkomsten).toBe(240000)
    expect(c.opzij).toBe(0)
  })

  it('zet opzij in de maanden zonder betaling, en betaalt in de maand van de vervaldag', () => {
    // Juli: de premie valt niet, dus € 100 opzij.
    const juli = plancijfers([huur, opbouw], '2026-07')
    expect(juli.vastDezeMaand).toBe(95000)
    expect(juli.opzij).toBe(10000)

    // Augustus: de premie valt wél. Dan betaal je ze — je zet er niet óók voor opzij.
    const augustus = plancijfers([huur, opbouw], '2026-08')
    expect(augustus.vastDezeMaand).toBe(95000 + 60000)
    expect(augustus.opzij).toBe(0)
  })

  it('geeft het gemiddelde per maand los van de gekozen maand', () => {
    // € 950 huur + € 100 omgerekende premie, in élke maand hetzelfde.
    expect(plancijfers([huur, premie], '2026-07').gemiddeldPerMaand).toBe(105000)
    expect(plancijfers([huur, premie], '2026-08').gemiddeldPerMaand).toBe(105000)
  })

  it('rekent een terugkerende inkomst niet mee als last', () => {
    expect(plancijfers([loon], '2026-07').gemiddeldPerMaand).toBe(0)
  })
})
