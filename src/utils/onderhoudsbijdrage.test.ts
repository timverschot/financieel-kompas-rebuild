import { describe, it, expect } from 'vitest'
import {
  bedragOp,
  berekenAchterstand,
  bouwOpbouw,
  indexVan,
  jarenTussen,
  laatsteAanpassing,
  MAX_JAREN,
  maandVoor,
  verjaardag,
  verschuldigdPerMaand,
  volgendeVerjaardag,
  type BijdrageInvoer,
} from './onderhoudsbijdrage'
import { gezondheidsindex, laatsteIndexmaand } from '../data/gezondheidsindex'

// Ronde 42. Dit zijn bedragen waarover twee ouders het oneens kunnen worden, dus
// elke regel hieronder is met de hand na te rekenen met de cijfers uit
// `data/gezondheidsindex.ts`.

const VANDAAG = '2026-07-30'

const bijdrage = (over: Partial<BijdrageInvoer> = {}): BijdrageInvoer => ({
  basisbedrag: 25000, // € 250,00
  datumRegeling: '2021-09-15',
  ...over,
})

describe('maandVoor', () => {
  it('geeft de maand vóór een datum', () => {
    expect(maandVoor('2021-09-15')).toBe('2021-08')
  })

  it('springt over de jaargrens', () => {
    // Dit is de fout die je maar één keer maakt: januari min één is december van
    // het vórige jaar.
    expect(maandVoor('2022-01-05')).toBe('2021-12')
  })
})

describe('jarenTussen', () => {
  it('telt alleen volledige jaren', () => {
    expect(jarenTussen('2021-09-15', '2022-09-14')).toBe(0)
    expect(jarenTussen('2021-09-15', '2022-09-15')).toBe(1)
    expect(jarenTussen('2021-09-15', '2026-07-30')).toBe(4)
  })

  it('gaat niet onder nul bij een datum in de toekomst', () => {
    expect(jarenTussen('2030-01-01', '2026-07-30')).toBe(0)
  })
})

describe('verjaardag', () => {
  it('geeft dezelfde dag, n jaar later', () => {
    expect(verjaardag('2021-09-15', 1)).toBe('2022-09-15')
    expect(verjaardag('2021-09-15', 5)).toBe('2026-09-15')
  })

  it('schuift 29 februari naar 1 maart in een gewoon jaar', () => {
    // De aanpassing gaat niet verloren; ze valt één dag later.
    expect(verjaardag('2024-02-29', 1)).toBe('2025-03-01')
    expect(verjaardag('2024-02-29', 4)).toBe('2028-02-29')
  })
})

describe('indexVan', () => {
  it('haalt het cijfer uit de meegeleverde tabel', () => {
    expect(indexVan('2021-08')).toBe(112.74)
  })

  it('laat een eigen cijfer voorgaan op de tabel', () => {
    // Wie een cijfer zelf bijzet, corrigeert bewust.
    expect(indexVan('2021-08', { '2021-08': 999 })).toBe(999)
  })

  it('gebruikt een eigen cijfer voor een maand die de app niet kent', () => {
    expect(indexVan('2026-09')).toBeUndefined()
    expect(indexVan('2026-09', { '2026-09': 140.5 })).toBe(140.5)
  })

  it('negeert een eigen cijfer van nul of minder', () => {
    expect(indexVan('2021-08', { '2021-08': 0 })).toBe(112.74)
  })
})

describe('bouwOpbouw — een regeling van september 2021', () => {
  const o = bouwOpbouw(bijdrage(), VANDAAG)

  it('neemt de aanvangsindex uit de maand vóór het vonnis', () => {
    expect(o.aanvangsmaand).toBe('2021-08')
    expect(o.aanvangsindex).toBe(gezondheidsindex('2021-08'))
    expect(o.aanvangsindexUitAkte).toBe(false)
  })

  it('geeft één stap per voorbije verjaardag', () => {
    // Vonnis september 2021, vandaag juli 2026 → verjaardagen in 2022, 2023, 2024, 2025.
    expect(o.stappen.map((s) => s.datum)).toEqual(['2022-09-15', '2023-09-15', '2024-09-15', '2025-09-15'])
  })

  it('neemt per verjaardag de index van de maand ervóór', () => {
    expect(o.stappen.map((s) => s.indexmaand)).toEqual(['2022-08', '2023-08', '2024-08', '2025-08'])
  })

  it('rekent elk bedrag na te rekenen uit', () => {
    // € 250,00 x 123,68 / 112,74 = € 274,26
    const verwacht = Math.round((25000 * 123.68) / 112.74)
    expect(o.stappen[0].bedrag).toBe(verwacht)
    expect(o.stappen[0].bedrag).toBe(27426)
  })

  it('rekent elke stap vanaf het BASISBEDRAG, niet vanaf het bedrag van vorig jaar', () => {
    // Jaar na jaar herindexeren stapelt afrondingen op elkaar. De akte zegt
    // "basisbedrag maal nieuwe index gedeeld door aanvangsindex", en dat is wat er
    // moet gebeuren.
    const aanvang = 112.74
    for (const stap of o.stappen) {
      expect(stap.bedrag).toBe(Math.round((25000 * (stap.nieuweIndex as number)) / aanvang))
    }
  })

  it('geeft het bedrag van de laatste verjaardag als het huidige bedrag', () => {
    expect(o.huidigBedrag).toBe(o.stappen[o.stappen.length - 1].bedrag)
  })

  it('mist geen enkele maand', () => {
    expect(o.ontbrekendeMaanden).toEqual([])
  })

  it('zegt tot welke maand de app cijfers kent', () => {
    expect(o.laatsteBekendeMaand).toBe(laatsteIndexmaand())
  })
})

describe('bouwOpbouw — grensgevallen', () => {
  it('geeft geen enkele stap wanneer de eerste verjaardag nog moet komen', () => {
    const o = bouwOpbouw(bijdrage({ datumRegeling: '2026-03-01' }), VANDAAG)
    expect(o.stappen).toEqual([])
    expect(o.huidigBedrag).toBe(25000)
  })

  it('indexeert niet wanneer de akte dat uitsluit', () => {
    const o = bouwOpbouw(bijdrage({ geindexeerd: false }), VANDAAG)
    expect(o.stappen).toEqual([])
    expect(o.huidigBedrag).toBe(25000)
  })

  it('gebruikt de aanvangsindex uit de akte wanneer die ingevuld is', () => {
    const o = bouwOpbouw(bijdrage({ aanvangsindexHandmatig: 100 }), VANDAAG)
    expect(o.aanvangsindex).toBe(100)
    expect(o.aanvangsindexUitAkte).toBe(true)
    // € 250,00 x 123,68 / 100 = € 309,20
    expect(o.stappen[0].bedrag).toBe(30920)
  })

  it('laat het bedrag staan bij een verjaardag waarvan de index ontbreekt, en zegt welke maand', () => {
    // Een regeling van augustus: de verjaardag van 2026 heeft de index van juli
    // 2026 nodig, en die kent de app nog niet.
    const o = bouwOpbouw(bijdrage({ datumRegeling: '2021-08-10' }), '2026-08-20')
    const laatste = o.stappen[o.stappen.length - 1]
    expect(laatste.indexmaand).toBe('2026-07')
    expect(laatste.nieuweIndex).toBeNull()
    expect(laatste.berekend).toBe(false)
    // Het bedrag van de vorige verjaardag blijft staan — geen schatting.
    expect(laatste.bedrag).toBe(o.stappen[o.stappen.length - 2].bedrag)
    expect(o.ontbrekendeMaanden).toContain('2026-07')
  })

  it('rekent die verjaardag wél uit zodra je het cijfer zelf bijzet', () => {
    const o = bouwOpbouw(
      bijdrage({ datumRegeling: '2021-08-10', eigenIndexcijfers: { '2026-07': 139.5 } }),
      '2026-08-20',
    )
    const laatste = o.stappen[o.stappen.length - 1]
    expect(laatste.nieuweIndex).toBe(139.5)
    expect(laatste.berekend).toBe(true)
    expect(o.ontbrekendeMaanden).toEqual([])
  })

  it('meldt een onbekende aanvangsmaand in plaats van te gokken', () => {
    // Een vonnis uit 1998: daar heeft de meegeleverde tabel geen cijfer voor.
    const o = bouwOpbouw(bijdrage({ datumRegeling: '1998-05-10' }), VANDAAG)
    expect(o.aanvangsindex).toBeNull()
    expect(o.ontbrekendeMaanden).toContain('1998-04')
    // En dan blijft het basisbedrag staan: liever geen cijfer dan een verzonnen cijfer.
    expect(o.huidigBedrag).toBe(25000)
  })
})

describe('bedragOp', () => {
  const invoer = bijdrage()
  const o = bouwOpbouw(invoer, VANDAAG)

  it('geeft het basisbedrag vóór de eerste verjaardag', () => {
    expect(bedragOp(o, invoer.basisbedrag, '2022-09-14')).toBe(25000)
  })

  it('geeft het nieuwe bedrag vanaf de dag van de verjaardag zelf', () => {
    expect(bedragOp(o, invoer.basisbedrag, '2022-09-15')).toBe(o.stappen[0].bedrag)
  })

  it('geeft het laatste bedrag voor een dag van vandaag', () => {
    expect(bedragOp(o, invoer.basisbedrag, VANDAAG)).toBe(o.huidigBedrag)
  })
})

describe('verschuldigdPerMaand', () => {
  const invoer = bijdrage()
  const o = bouwOpbouw(invoer, VANDAAG)
  const regels = verschuldigdPerMaand(invoer, o, VANDAAG)

  it('begint in de maand van de regeling en eindigt in de huidige maand', () => {
    expect(regels[0].maand).toBe('2021-09')
    expect(regels[regels.length - 1].maand).toBe('2026-07')
  })

  it('telt elke maand precies één keer', () => {
    // September 2021 tot juli 2026 = 59 maanden.
    expect(regels).toHaveLength(59)
    expect(new Set(regels.map((r) => r.maand)).size).toBe(regels.length)
  })

  it('gebruikt per maand het bedrag dat toen gold, niet dat van vandaag', () => {
    // Dit is de kern: vermenigvuldigen met het bedrag van vandaag maakt de
    // achterstand structureel te hoog.
    const eerste = regels[0].verschuldigd
    const laatste = regels[regels.length - 1].verschuldigd
    expect(eerste).toBe(25000)
    expect(laatste).toBe(o.huidigBedrag)
    expect(laatste).toBeGreaterThan(eerste)
  })

  it('telt op tot minder dan het aantal maanden maal het huidige bedrag', () => {
    const totaal = regels.reduce((s, r) => s + r.verschuldigd, 0)
    expect(totaal).toBeLessThan(regels.length * o.huidigBedrag)
  })

  it('geeft niets terug wanneer de regeling nog moet ingaan', () => {
    const later = bijdrage({ datumRegeling: '2030-01-01' })
    expect(verschuldigdPerMaand(later, bouwOpbouw(later, VANDAAG), VANDAAG)).toEqual([])
  })

  it('loopt niet vast op een onmogelijk oude regeling', () => {
    const oud = bijdrage({ datumRegeling: '1900-01-01' })
    const uit = verschuldigdPerMaand(oud, bouwOpbouw(oud, VANDAAG), VANDAAG)
    expect(uit.length).toBeLessThanOrEqual(1200)
  })
})

describe('berekenAchterstand', () => {
  const invoer = bijdrage()
  const o = bouwOpbouw(invoer, VANDAAG)
  const regels = verschuldigdPerMaand(invoer, o, VANDAAG)

  it('trekt het betaalde af van het verschuldigde', () => {
    const uit = berekenAchterstand(regels, [{ bedrag: 100000 }, { bedrag: 50000 }])
    expect(uit.betaald).toBe(150000)
    expect(uit.open).toBe(uit.verschuldigd - 150000)
    expect(uit.maanden).toBe(regels.length)
  })

  it('geeft een negatief getal wanneer er te veel betaald is', () => {
    // Vooruitbetalen mag; dat is geen fout en hoort dus geen fout te heten.
    const uit = berekenAchterstand([{ maand: '2026-07', verschuldigd: 25000 }], [{ bedrag: 30000 }])
    expect(uit.open).toBe(-5000)
  })

  it('blijft overeind zonder betalingen en zonder maanden', () => {
    expect(berekenAchterstand([], [])).toEqual({ verschuldigd: 0, betaald: 0, open: 0, maanden: 0 })
  })
})

describe('laatsteAanpassing', () => {
  it('geeft de laatste verjaardag waarop het bedrag echt veranderde', () => {
    const invoer = bijdrage()
    const o = bouwOpbouw(invoer, VANDAAG)
    const stap = laatsteAanpassing(o, invoer.basisbedrag)
    expect(stap?.datum).toBe('2025-09-15')
  })

  it('geeft niets terug wanneer er nog geen verjaardag geweest is', () => {
    const invoer = bijdrage({ datumRegeling: '2026-03-01' })
    expect(laatsteAanpassing(bouwOpbouw(invoer, VANDAAG), invoer.basisbedrag)).toBeNull()
  })

  it('geeft niets terug wanneer het bedrag niet veranderde', () => {
    // Een index die gelijk bleef: dan is er niets te melden.
    const invoer = bijdrage({
      datumRegeling: '2021-09-15',
      aanvangsindexHandmatig: 100,
      eigenIndexcijfers: { '2022-08': 100, '2023-08': 100, '2024-08': 100, '2025-08': 100 },
    })
    expect(laatsteAanpassing(bouwOpbouw(invoer, VANDAAG), invoer.basisbedrag)).toBeNull()
  })
})

describe('volgendeVerjaardag', () => {
  it('geeft de eerstvolgende verjaardag na vandaag', () => {
    expect(volgendeVerjaardag('2021-09-15', VANDAAG)).toBe('2026-09-15')
  })

  it('springt naar volgend jaar wanneer die van dit jaar al geweest is', () => {
    expect(volgendeVerjaardag('2021-03-10', VANDAAG)).toBe('2027-03-10')
  })
})

// ---------------------------------------------------------------------------
// Na de review
// ---------------------------------------------------------------------------

describe('een regeling met een einddatum', () => {
  const gestopt = bijdrage({ datumRegeling: '2015-06-01', eindDatum: '2018-06-30' })

  it('indexeert niet door na de einddatum', () => {
    // Zonder deze grens rekende de app elf verjaardagen door en toonde ze bovenaan
    // een bedrag voor een regeling die in 2018 stopte.
    const o = bouwOpbouw(gestopt, VANDAAG)
    expect(o.stappen.map((s) => s.datum)).toEqual(['2016-06-01', '2017-06-01', '2018-06-01'])
  })

  it('bevriest het bedrag op dat van de laatste verjaardag', () => {
    const o = bouwOpbouw(gestopt, VANDAAG)
    expect(o.huidigBedrag).toBe(o.stappen[o.stappen.length - 1].bedrag)
  })

  it('telt geen maanden meer na de einddatum', () => {
    const o = bouwOpbouw(gestopt, VANDAAG)
    const regels = verschuldigdPerMaand(gestopt, o, VANDAAG)
    // Juni 2015 tot en met juni 2018 = 37 maanden.
    expect(regels).toHaveLength(37)
    expect(regels[regels.length - 1].maand).toBe('2018-06')
  })

  it('negeert een einddatum die nog moet komen', () => {
    const loopt = bijdrage({ datumRegeling: '2021-09-15', eindDatum: '2030-01-01' })
    const o = bouwOpbouw(loopt, VANDAAG)
    expect(o.stappen).toHaveLength(4)
  })
})

describe('berekenAchterstand — betalingen buiten de periode', () => {
  const gestopt = bijdrage({ datumRegeling: '2015-06-01', eindDatum: '2018-06-30' })
  const regels = verschuldigdPerMaand(gestopt, bouwOpbouw(gestopt, VANDAAG), VANDAAG)

  it('telt een betaling van ná de regeling niet mee', () => {
    // Anders meldde de app "te veel betaald" voor geld dat nooit bij deze periode
    // hoorde: het verschuldigde stopte in 2018, de betaling niet.
    const uit = berekenAchterstand(regels, [{ bedrag: 100000, datum: '2020-01-15' }])
    expect(uit.betaald).toBe(0)
  })

  it('telt een betaling binnen de periode wél mee', () => {
    const uit = berekenAchterstand(regels, [{ bedrag: 100000, datum: '2017-03-10' }])
    expect(uit.betaald).toBe(100000)
  })

  it('laat `voorMaand` voorgaan op de datum van de overschrijving', () => {
    // Wie een oude maand inhaalt, boekt vandaag maar bedoelt een maand van toen.
    const uit = berekenAchterstand(regels, [{ bedrag: 100000, datum: '2020-01-15', voorMaand: '2017-03' }])
    expect(uit.betaald).toBe(100000)
  })

  it('telt een betaling zonder datum en zonder maand gewoon mee', () => {
    // Liever meetellen dan stil weglaten.
    expect(berekenAchterstand(regels, [{ bedrag: 5000 }]).betaald).toBe(5000)
  })
})

describe('vangnetten tegen een vertikte datum', () => {
  it('rekent hoogstens honderd verjaardagen uit', () => {
    // Een datumveld laat "0221-09-15" toe; zonder grens werden dat achttienhonderd
    // regels op het scherm en in de PDF.
    const onzin = bijdrage({ datumRegeling: '0221-09-15' })
    expect(bouwOpbouw(onzin, VANDAAG).stappen.length).toBeLessThanOrEqual(MAX_JAREN)
  })

  it('telt de maanden met een jaartal van vier cijfers', () => {
    // Zonder nullen vooraan is '221-09' als tekst groter dan '2026-07', en dan stopte
    // de lus meteen: nul maanden naast een opbouw vol verjaardagen.
    const onzin = bijdrage({ datumRegeling: '0221-09-15' })
    const regels = verschuldigdPerMaand(onzin, bouwOpbouw(onzin, VANDAAG), VANDAAG)
    expect(regels.length).toBeGreaterThan(0)
    expect(regels[0].maand).toBe('0221-09')
  })
})

describe('de achterstand in cijfers', () => {
  // Het meest betwiste getal van de module, hier vastgepind op een uitkomst die met
  // de hand na te rekenen is.
  const invoer = bijdrage({ datumRegeling: '2024-09-15' })
  const o = bouwOpbouw(invoer, '2025-12-31')
  const regels = verschuldigdPerMaand(invoer, o, '2025-12-31')

  it('telt de juiste maanden', () => {
    // September 2024 tot en met december 2025 = 16 maanden.
    expect(regels).toHaveLength(16)
  })

  it('gebruikt het oude bedrag tot en met de maand van de verjaardag', () => {
    // De verjaardag valt op 15 september 2025; de peildatum is de eerste van de
    // maand, dus september telt nog aan het oude bedrag.
    const sept2025 = regels.find((r) => r.maand === '2025-09')
    expect(sept2025?.verschuldigd).toBe(25000)
    const okt2025 = regels.find((r) => r.maand === '2025-10')
    expect(okt2025?.verschuldigd).toBe(o.stappen[0].bedrag)
  })

  it('telt op tot een bedrag dat met de hand klopt', () => {
    // 13 maanden aan € 250,00 (sep 2024 t.e.m. sep 2025) + 3 maanden aan het
    // geïndexeerde bedrag (okt t.e.m. dec 2025).
    const nieuw = o.stappen[0].bedrag
    expect(berekenAchterstand(regels, []).verschuldigd).toBe(13 * 25000 + 3 * nieuw)
  })
})
