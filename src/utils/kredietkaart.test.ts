import { describe, it, expect } from 'vitest'
import {
  afboekdatumVan,
  kaartStand,
  kaartbedragNaarOpslag,
  kaartbedragUitOpslag,
  laatsteAfsluiting,
  volgendeAfsluiting,
} from './kredietkaart'
import type { Overboeking, Rekening, Transactie } from '../data/schema'

const kaart: Rekening = {
  id: 'k1',
  naam: 'Mastercard',
  type: 'krediet',
  // Een schuld staat negatief in de opslag; het scherm draait dat om.
  beginsaldo: -100000,
  kredietlimiet: 400000,
  afrekendag: 26,
  afboekdag: 5,
}

const tx = (id: string, datum: string, bedrag: number, rekeningId = 'k1'): Transactie => ({
  id,
  datum,
  omschrijving: id,
  bedrag,
  rekeningId,
})

const ob = (id: string, datum: string, bedrag: number, van = 'b1', naar = 'k1'): Overboeking => ({
  id,
  datum,
  bedrag,
  vanRekeningId: van,
  naarRekeningId: naar,
})

describe('laatsteAfsluiting en volgendeAfsluiting', () => {
  it('neemt deze maand zodra de afsluitdag geweest is', () => {
    expect(laatsteAfsluiting(26, '2026-07-30')).toBe('2026-07-26')
    expect(volgendeAfsluiting(26, '2026-07-30')).toBe('2026-08-26')
  })

  it('neemt vorige maand zolang de afsluitdag nog moet komen', () => {
    expect(laatsteAfsluiting(26, '2026-07-10')).toBe('2026-06-26')
    expect(volgendeAfsluiting(26, '2026-07-10')).toBe('2026-07-26')
  })

  it('telt de afsluitdag zelf mee als afgesloten', () => {
    expect(laatsteAfsluiting(26, '2026-07-26')).toBe('2026-07-26')
    expect(volgendeAfsluiting(26, '2026-07-26')).toBe('2026-08-26')
  })

  it('gaat correct over de jaargrens', () => {
    expect(laatsteAfsluiting(26, '2026-01-05')).toBe('2025-12-26')
    expect(volgendeAfsluiting(26, '2026-12-30')).toBe('2027-01-26')
  })
})

describe('afboekdatumVan', () => {
  it('boekt af in de maand na de afsluiting wanneer de dag vroeger valt', () => {
    expect(afboekdatumVan('2026-07-26', 5)).toBe('2026-08-05')
    expect(afboekdatumVan('2026-12-26', 5)).toBe('2027-01-05')
  })

  it('boekt af in dezelfde maand wanneer de dag later valt', () => {
    expect(afboekdatumVan('2026-07-05', 26)).toBe('2026-07-26')
  })

  it('schuift een gelijke dag naar de volgende maand', () => {
    // Afboeken op de dag van de afsluiting zelf bestaat niet; dan zou de lopende
    // periode meteen leeg zijn.
    expect(afboekdatumVan('2026-07-26', 26)).toBe('2026-08-26')
  })
})

describe('kaartStand — het teken', () => {
  it('geeft een schuld als positief openstaand bedrag', () => {
    const s = kaartStand(kaart, [], [], [], '2026-07-30')
    expect(s.saldo).toBe(-100000)
    expect(s.openstaand).toBe(100000)
    expect(s.tegoed).toBe(0)
  })

  it('trekt het openstaande bedrag af van de limiet', () => {
    // Dit was de fout die Timothy meldde: met een positief ingevoerd saldo bleef er
    // "4.000 van 4.000" staan terwijl er 1.000 openstond.
    const s = kaartStand(kaart, [], [], [], '2026-07-30')
    expect(s.beschikbaar).toBe(300000)
  })

  it('benoemt een tegoed apart, want dat is meestal een tekenfout', () => {
    const fout = { ...kaart, beginsaldo: 100000 }
    const s = kaartStand(fout, [], [], [], '2026-07-30')
    expect(s.tegoed).toBe(100000)
    expect(s.openstaand).toBe(0)
    // Een tegoed vergroot je krediet niet: je mag nog altijd hoogstens je limiet op.
    expect(s.beschikbaar).toBe(400000)
  })

  it('laat beschikbaar op null zonder limiet', () => {
    const zonder = { ...kaart, kredietlimiet: undefined }
    expect(kaartStand(zonder, [], [], [], '2026-07-30').beschikbaar).toBeNull()
  })

  it('gaat nooit onder nul, ook niet boven je limiet', () => {
    const over = { ...kaart, beginsaldo: -500000 }
    expect(kaartStand(over, [], [], [], '2026-07-30').beschikbaar).toBe(0)
  })
})

describe('kaartStand — de afsluiting', () => {
  // Aankopen vóór de afsluiting van 26 juli, en daarna.
  const transacties = [
    tx('t1', '2026-07-10', -20000),
    tx('t2', '2026-07-26', -5000), // de afsluitdag zelf telt nog mee in de afsluiting
    tx('t3', '2026-07-28', -3000), // dit is al de volgende periode
    tx('t4', '2026-07-29', -1500, 'b1'), // andere rekening: telt niet mee
  ]

  it('rekent het afgesloten bedrag op de afsluitdatum, niet op vandaag', () => {
    const s = kaartStand(kaart, transacties, [], [], '2026-07-30')
    expect(s.afsluitdatum).toBe('2026-07-26')
    // 1.000 begin + 200 + 50 = 1.250 openstaand op 26 juli.
    expect(s.afgesloten).toBe(125000)
  })

  it('houdt de aankopen van de lopende periode apart', () => {
    const s = kaartStand(kaart, transacties, [], [], '2026-07-30')
    expect(s.lopend).toBe(3000)
  })

  it('telt boekingen van een andere rekening niet mee', () => {
    const s = kaartStand(kaart, transacties, [], [], '2026-07-30')
    expect(s.openstaand).toBe(128000)
  })

  it('telt een boeking met een datum in de toekomst nog niet mee', () => {
    const s = kaartStand(kaart, [...transacties, tx('t5', '2026-08-02', -9900)], [], [], '2026-07-30')
    expect(s.lopend).toBe(3000)
    expect(s.openstaand).toBe(128000)
  })

  it('zegt wanneer het afgesloten bedrag van de betaalrekening gaat', () => {
    const s = kaartStand(kaart, transacties, [], [], '2026-07-30')
    expect(s.afboekdatum).toBe('2026-08-05')
    expect(s.volgendeAfsluitdatum).toBe('2026-08-26')
    expect(s.teLaat).toBe(false)
  })

  it('laat de afsluiting leeg zonder afsluitdag', () => {
    const zonder = { ...kaart, afrekendag: undefined }
    const s = kaartStand(zonder, transacties, [], [], '2026-07-30')
    expect(s.afsluitdatum).toBeNull()
    expect(s.afgesloten).toBe(0)
    expect(s.lopend).toBe(0)
    expect(s.afboekdatum).toBeNull()
  })

  it('laat de afboekdatum leeg zonder afboekdag', () => {
    const zonder = { ...kaart, afboekdag: undefined }
    const s = kaartStand(zonder, transacties, [], [], '2026-07-30')
    expect(s.afsluitdatum).toBe('2026-07-26')
    expect(s.afboekdatum).toBeNull()
    expect(s.teLaat).toBe(false)
  })
})

describe('kaartStand — betalen', () => {
  const transacties = [tx('t1', '2026-07-10', -20000), tx('t3', '2026-07-28', -3000)]

  it('houdt het volledige bedrag te betalen zolang er niets overgeboekt is', () => {
    const s = kaartStand(kaart, transacties, [], [], '2026-07-30')
    expect(s.betaaldSindsdien).toBe(0)
    expect(s.nogTeBetalen).toBe(120000)
  })

  it('trekt een overboeking naar de kaart van het te betalen bedrag af', () => {
    const s = kaartStand(kaart, transacties, [ob('o1', '2026-08-05', 120000)], [], '2026-08-06')
    // Op 6 augustus is 26 juli nog altijd de laatste afsluiting.
    expect(s.afsluitdatum).toBe('2026-07-26')
    expect(s.betaaldSindsdien).toBe(120000)
    expect(s.nogTeBetalen).toBe(0)
    // En het krediet is weer vrij: alleen de aankoop van 28 juli weegt nog.
    expect(s.openstaand).toBe(3000)
    expect(s.beschikbaar).toBe(397000)
  })

  it('telt een overboeking van vóór de afsluiting niet als betaling van deze afsluiting', () => {
    // Die zit al verrekend in het saldo van de afsluitdatum zelf.
    const s = kaartStand(kaart, transacties, [ob('o1', '2026-07-05', 50000)], [], '2026-07-30')
    expect(s.betaaldSindsdien).toBe(0)
    expect(s.afgesloten).toBe(70000)
  })

  it('telt een terugbetaling op de kaart niet als betaling van je afschrift', () => {
    // Een positieve transactie is een gecrediteerde aankoop. Ze verlaagt je schuld,
    // maar ze zegt niet dat je je afrekening betaald hebt.
    const s = kaartStand(kaart, [...transacties, tx('t9', '2026-07-29', 5000)], [], [], '2026-07-30')
    expect(s.betaaldSindsdien).toBe(0)
    expect(s.nogTeBetalen).toBe(120000)
    expect(s.openstaand).toBe(118000)
  })

  it('meldt het wanneer de afboekdag voorbij is en er nog iets openstaat', () => {
    const s = kaartStand(kaart, transacties, [], [], '2026-08-10')
    expect(s.afboekdatum).toBe('2026-08-05')
    expect(s.nogTeBetalen).toBe(120000)
    expect(s.teLaat).toBe(true)
  })

  it('meldt niets te laat wanneer er wél betaald is', () => {
    const s = kaartStand(kaart, transacties, [ob('o1', '2026-08-05', 120000)], [], '2026-08-10')
    expect(s.teLaat).toBe(false)
  })

  it('gaat niet onder nul wanneer je meer betaalt dan er afgesloten was', () => {
    const s = kaartStand(kaart, transacties, [ob('o1', '2026-08-05', 200000)], [], '2026-08-06')
    expect(s.nogTeBetalen).toBe(0)
  })
})

describe('kaartStand — met een waardering', () => {
  it('vertrekt vanaf de waardering in plaats van het beginsaldo', () => {
    // Je leest de stand van je kaart af en zet ze bij: vanaf die dag telt de app
    // verder vanaf dát bedrag.
    const s = kaartStand(
      kaart,
      [tx('t1', '2026-07-28', -3000)],
      [],
      [{ id: 'w1', rekeningId: 'k1', datum: '2026-07-27', saldo: -50000 }],
      '2026-07-30',
    )
    expect(s.openstaand).toBe(53000)
    expect(s.beschikbaar).toBe(347000)
  })
})

describe('kredietkaart — de punten uit de review', () => {
  it('maakt van nul geen min-nul', () => {
    // `-0` komt door elke controle heen en wordt dan als "€ -0,00" afgedrukt op het
    // scherm van iemand die netjes 0 invulde.
    expect(Object.is(kaartbedragNaarOpslag(0), 0)).toBe(true)
    expect(Object.is(kaartbedragUitOpslag(0), 0)).toBe(true)
    expect(kaartbedragNaarOpslag(100000)).toBe(-100000)
    expect(kaartbedragUitOpslag(-100000)).toBe(100000)
  })

  it('houdt een reeds geboekte afrekening met een datum in de toekomst apart', () => {
    // Afsluiting de 26e, afboeking de 5e: die datum ligt op 30 juli in de toekomst
    // en telt dus nergens mee. Zonder dit veld bleef de knop staan en boekte je het
    // bedrag een tweede keer.
    const s = kaartStand(kaart, [], [ob('o1', '2026-08-05', 100000)], [], '2026-07-30')
    expect(s.geplandeBetaling).toBe(100000)
    expect(s.betaaldSindsdien).toBe(0)
    // Wat er vandaag openstaat verandert niet: die dag is er nog niet.
    expect(s.openstaand).toBe(100000)
    expect(s.nogTeBetalen).toBe(100000)
  })

  it('telt de drie cijfers van het blok op', () => {
    // nog te betalen + wat er sindsdien bij kwam = wat er vandaag openstaat.
    const s = kaartStand(
      kaart,
      [tx('t1', '2026-07-10', -20000), tx('t2', '2026-07-28', -3000), tx('t3', '2026-07-29', 500)],
      [],
      [],
      '2026-07-30',
    )
    expect(s.nogTeBetalen + s.lopend).toBe(s.openstaand)
  })

  it('haalt een terugbetaling na de afsluiting weer van de lopende periode af', () => {
    const s = kaartStand(kaart, [tx('t1', '2026-07-28', -3000), tx('t2', '2026-07-29', 500)], [], [], '2026-07-30')
    expect(s.lopend).toBe(2500)
  })

  it('telt een opname van de kaart mee in de lopende periode', () => {
    // Een overboeking WEG van de kaart verhoogt je schuld; ze hoort dus in het
    // cijfer van de lopende periode te zitten, anders klopt de som niet meer.
    const s = kaartStand(kaart, [], [ob('o1', '2026-07-28', 5000, 'k1', 'b1')], [], '2026-07-30')
    expect(s.lopend).toBe(5000)
    expect(s.nogTeBetalen + s.lopend).toBe(s.openstaand)
  })
})
