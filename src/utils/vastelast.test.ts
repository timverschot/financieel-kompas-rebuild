import { describe, it, expect } from 'vitest'
import type { TerugkerendePost } from '../data/schema'
import { frequentieVan, intervalVan, maandVerschil, maandbedrag, opzijPerMaand, plancijfers, valtInMaand, volgendeVervaldag, isGestopt, verschuifMaand } from './vastelast'

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

  it('rekent met het streefbedrag van het spaardoel in plaats van met de kale deling', () => {
    // ⚠ RONDE 74 — de kern van die ronde, en de val waar de eerste opzet in liep. Het
    // bedrag wordt VERVANGEN, niet weggelaten: `Spaardoel.maandbedrag` komt in geen
    // enkele rekenkern die Budget voedt, dus zou weglaten "Te verdelen" te HOOG zetten.
    // September: de premie is begonnen (augustus) en valt deze maand niet, dus zonder
    // koppeling staat hier de kale deling van € 100.
    expect(plancijfers([huur, opbouw], '2026-09').opzij).toBe(10000)
    const sept = plancijfers([huur, opbouw], '2026-09', new Map([[opbouw.id, 7500]]))
    expect(sept.opzij).toBe(7500)
    // ⚠ En wat er NIET verandert: sparen verandert niets aan wat een kost je kost.
    expect(sept.gemiddeldPerMaand).toBe(105000)
    expect(sept.vastDezeMaand).toBe(95000)
  })

  it('betaalt de kost gewoon in de maand van de vervaldag, ook mét een spaardoel', () => {
    // Het geld gaat nog steeds van je rekening; alleen het bedrag dat je vooraf
    // reserveert komt uit het doel. Zou dit meeveranderen, dan verdween een echte
    // uitgave uit je plan.
    const augustus = plancijfers([huur, opbouw], '2026-08', new Map([[opbouw.id, 7500]]))
    expect(augustus.vastDezeMaand).toBe(95000 + 60000)
    expect(augustus.opzij).toBe(0)
  })

  it('reserveert ook voor een kost waar het vinkje NIET aanstaat', () => {
    // Het spaardoel is nu net het alternatief voor dat vinkje. Zonder deze regel zou
    // je € 75 per maand wegzetten en zou je plan er geen cent voor opzij houden.
    const zonderVinkje = { ...premie, opbouwen: false }
    expect(plancijfers([zonderVinkje], '2026-09').opzij).toBe(0)
    expect(plancijfers([zonderVinkje], '2026-09', new Map([[zonderVinkje.id, 7500]])).opzij).toBe(7500)
  })

  it('raakt de opzij van de ANDERE posten niet aan', () => {
    const tweede = post({ id: 'tweede', omschrijving: 'Brandverzekering', bedrag: -24000, dag: 9, frequentie: 'jaar', startMaand: '2026-08', opbouwen: true })
    const juli = plancijfers([opbouw, tweede], '2026-07', new Map([[opbouw.id, 7500]]))
    expect(juli.opzij).toBe(7500 + 2000)
  })

  it('gedraagt zich zonder die kaart precies zoals vroeger', () => {
    expect(plancijfers([huur, opbouw], '2026-07')).toEqual(plancijfers([huur, opbouw], '2026-07', new Map()))
  })

  it('geeft het gemiddelde per maand los van de gekozen maand', () => {
    // € 950 huur + € 100 omgerekende premie, in élke maand hetzelfde.
    // ⚠ Vanaf de startmaand van de premie (2026-08); zie de test hieronder voor de
    // maanden dáárvoor.
    expect(plancijfers([huur, premie], '2026-08').gemiddeldPerMaand).toBe(105000)
    expect(plancijfers([huur, premie], '2026-09').gemiddeldPerMaand).toBe(105000)
    expect(plancijfers([huur, premie], '2027-03').gemiddeldPerMaand).toBe(105000)
  })

  it('telt een post die nog niet begonnen is niet mee in het gemiddelde (ronde 71)', () => {
    // De premie begint pas in augustus. In juli kost ze je nog niets, dus hoort ze
    // niet in "wat kosten mijn vaste lasten mij eigenlijk" te zitten. Vóór ronde 71
    // stond dit gemiddelde vóór élke controle, dus telde een kost die pas over jaren
    // begint vandaag al mee.
    expect(plancijfers([huur, premie], '2026-07').gemiddeldPerMaand).toBe(95000)
    expect(plancijfers([huur, premie], '2020-01').gemiddeldPerMaand).toBe(95000)
  })

  it('zet er WEL al voor opzij vóór de eerste betaling (ronde 71)', () => {
    // ⚠ De keerzijde van de test hierboven, en het hele punt van "opbouwen": geld
    // opzijzetten voor een kost die er nog niet is, is precies wat je wil. Zou de
    // begincontrole ook op `opzij` slaan, dan begon je pas te sparen in de maand dat
    // je moest betalen.
    const c = plancijfers([opbouw], '2026-07')
    expect(c.opzij).toBe(10000)
    expect(c.gemiddeldPerMaand).toBe(0)
  })

  it('rekent een terugkerende inkomst niet mee als last', () => {
    expect(plancijfers([loon], '2026-07').gemiddeldPerMaand).toBe(0)
  })
})

// --- Einddatum op een vaste last (ronde 38) ----------------------------------

describe('isGestopt', () => {
  it('is onwaar zonder eindmaand', () => {
    expect(isGestopt(post(), '2030-01')).toBe(false)
  })

  it('is waar vanaf de eindmaand zelf', () => {
    const p = post({ eindMaand: '2026-09' })
    expect(isGestopt(p, '2026-08')).toBe(false)
    expect(isGestopt(p, '2026-09')).toBe(true)
    expect(isGestopt(p, '2026-10')).toBe(true)
  })
})

describe('valtInMaand met een eindmaand', () => {
  it('sluit een MAANDELIJKSE post uit vanaf de eindmaand', () => {
    // Dit is de belangrijkste: de eindmaand-controle moet vóór de kortsluiting
    // voor maandelijkse posten staan, anders werkt ze net niet voor het meest
    // voorkomende geval (een opgezegde huur, een gestopt abonnement).
    const huur = post({ eindMaand: '2026-09' })
    expect(valtInMaand(huur, '2026-08')).toBe(true)
    expect(valtInMaand(huur, '2026-09')).toBe(false)
  })

  it('sluit ook een periodieke post uit vanaf de eindmaand', () => {
    // premie: halfjaarlijks vanaf 2026-08, dus augustus en februari.
    const gestopt = { ...premie, eindMaand: '2027-01' }
    expect(valtInMaand(gestopt, '2026-08')).toBe(true)
    expect(valtInMaand(gestopt, '2027-02')).toBe(false)
  })

  it('verandert niets aan een post zonder eindmaand', () => {
    expect(valtInMaand(post(), '2099-12')).toBe(true)
  })
})

describe('volgendeVervaldag met een eindmaand', () => {
  it('geeft null zodra de post gestopt is', () => {
    expect(volgendeVervaldag(post({ eindMaand: '2026-07' }), '2026-07-01')).toBeNull()
  })

  it('geeft nog een datum in de laatste lopende maand', () => {
    expect(volgendeVervaldag(post({ eindMaand: '2026-08' }), '2026-07-01')).toBe('2026-07-05')
  })
})

describe('plancijfers met een eindmaand', () => {
  it('telt een gestopte post nergens meer mee', () => {
    const gestopt = post({ id: 'weg', bedrag: -50_00, eindMaand: '2026-07' })
    const cijfers = plancijfers([post({ bedrag: -95000 }), gestopt], '2026-07')
    expect(cijfers.vastDezeMaand).toBe(95000)
    // Ook niet in het gemiddelde — dat cijfer staat buiten valtInMaand.
    expect(cijfers.gemiddeldPerMaand).toBe(95000)
  })

  it('vraagt niet langer om geld opzij te zetten voor een gestopte post', () => {
    // Een opbouwende periodieke post landt normaal in de else-tak en levert 'opzij'
    // op. Gestopt hoort dat nul te zijn.
    const gestopt = { ...premie, opbouwen: true, eindMaand: '2026-07' }
    expect(plancijfers([gestopt], '2026-07').opzij).toBe(0)
  })
})

describe('verschuifMaand', () => {
  it('schuift vooruit en achteruit over een jaargrens', () => {
    expect(verschuifMaand('2026-12', 1)).toBe('2027-01')
    expect(verschuifMaand('2026-01', -1)).toBe('2025-12')
    expect(verschuifMaand('2026-07', 0)).toBe('2026-07')
  })
})

describe('volgendeVervaldag springt niet over de eindmaand heen', () => {
  // Het geval dat de verificatieronde vond: een driemaandelijkse post die in
  // september stopt, gaf in juli nog "volgende keer 5 november" — twee maanden ná
  // de opzegging.
  const kwartaal = post({ frequentie: 'kwartaal', startMaand: '2026-03', dag: 5 })

  it('geeft null wanneer de volgende beurt buiten de looptijd valt', () => {
    expect(volgendeVervaldag({ ...kwartaal, eindMaand: '2026-09' }, '2026-07-01')).toBeNull()
  })

  it('geeft de datum wel wanneer die nog binnen de looptijd valt', () => {
    expect(volgendeVervaldag({ ...kwartaal, eindMaand: '2026-10' }, '2026-07-01')).toBe('2026-09-05')
  })

  it('doet hetzelfde bij een jaarlijkse post', () => {
    const jaar = post({ frequentie: 'jaar', startMaand: '2026-04', dag: 5 })
    expect(volgendeVervaldag({ ...jaar, eindMaand: '2027-04' }, '2026-07-01')).toBeNull()
    expect(volgendeVervaldag({ ...jaar, eindMaand: '2027-05' }, '2026-07-01')).toBe('2027-04-05')
  })

  it('doet hetzelfde bij een maandelijkse post over een jaargrens', () => {
    expect(volgendeVervaldag(post({ dag: 5, eindMaand: '2027-01' }), '2026-12-10')).toBeNull()
    expect(volgendeVervaldag(post({ dag: 5, eindMaand: '2027-02' }), '2026-12-10')).toBe('2027-01-05')
  })

  it('geeft ook niets voor een contract dat pas ná zijn eindmaand zou beginnen', () => {
    // Het formulier maakt dit onbereikbaar, maar de rekenkern hoort zich niet op de
    // vorm van een scherm te verlaten.
    const raar = post({ frequentie: 'kwartaal', startMaand: '2026-11', eindMaand: '2026-09', dag: 5 })
    expect(volgendeVervaldag(raar, '2026-07-01')).toBeNull()
  })
})
