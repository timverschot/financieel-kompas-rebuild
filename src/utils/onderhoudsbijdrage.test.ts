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
import { gezondheidsindex } from '../data/gezondheidsindex'
import { consumptieprijsindex } from '../data/consumptieprijsindex'
import { basisjaarVan, laatsteIndexmaand } from '../data/indexreeksen'

// Ronde 42. Dit zijn bedragen waarover twee ouders het oneens kunnen worden, dus
// elke regel hieronder is met de hand na te rekenen met de cijfers uit
// `data/consumptieprijsindex.ts`.
//
// ⚠ RONDE 58: de cijfers in dit bestand zijn veranderd, en niet omdat de rekensom
// veranderde. De app rekende tot dan met de GEZONDHEIDSINDEX; artikel 203quater oud
// BW noemt de CONSUMPTIEPRIJZEN. Augustus 2021 gaat daardoor van 112,74 naar 112,83
// en augustus 2022 van 123,68 naar 124,05. Wie deze getallen ooit terugzet zonder
// de reeks mee terug te zetten, brengt de fout terug.

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
  it('haalt het cijfer uit de meegeleverde tabel, standaard de consumptieprijzen', () => {
    expect(indexVan('2021-08')).toBe(112.83)
    expect(indexVan('2021-08')).toBe(consumptieprijsindex('2021-08'))
  })

  it('geeft een ANDER cijfer wanneer de akte de gezondheidsindex noemt', () => {
    // Dit is de kern van ronde 58: dezelfde maand, twee korven, twee getallen.
    expect(indexVan('2021-08', undefined, 'gezondheid')).toBe(112.74)
    expect(indexVan('2021-08', undefined, 'gezondheid')).toBe(gezondheidsindex('2021-08'))
    expect(indexVan('2021-08', undefined, 'consumptieprijzen')).not.toBe(
      indexVan('2021-08', undefined, 'gezondheid'),
    )
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
    expect(indexVan('2021-08', { '2021-08': 0 })).toBe(112.83)
  })
})

describe('bouwOpbouw — een regeling van september 2021', () => {
  const o = bouwOpbouw(bijdrage(), VANDAAG)

  it('neemt de aanvangsindex uit de maand vóór het vonnis', () => {
    expect(o.aanvangsmaand).toBe('2021-08')
    expect(o.aanvangsindex).toBe(consumptieprijsindex('2021-08'))
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
    // € 250,00 x 124,05 / 112,83 = € 274,86
    const verwacht = Math.round((25000 * 124.05) / 112.83)
    expect(o.stappen[0].bedrag).toBe(verwacht)
    expect(o.stappen[0].bedrag).toBe(27486)
  })

  it('rekent elke stap vanaf het BASISBEDRAG, niet vanaf het bedrag van vorig jaar', () => {
    // Jaar na jaar herindexeren stapelt afrondingen op elkaar. De akte zegt
    // "basisbedrag maal nieuwe index gedeeld door aanvangsindex", en dat is wat er
    // moet gebeuren.
    const aanvang = 112.83
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
    expect(o.laatsteBekendeMaand).toBe(laatsteIndexmaand('consumptieprijzen'))
  })
})

// ---------------------------------------------------------------------------
describe('bouwOpbouw — welke indexreeks (ronde 58)', () => {
  it('rekent standaard met de CONSUMPTIEPRIJZEN, want dat zegt de wet', () => {
    // Artikel 203quater oud BW: "het indexcijfer van de consumptieprijzen". Tot
    // ronde 58 stond hier de gezondheidsindex — de reeks voor huur en lonen.
    const o = bouwOpbouw(bijdrage(), VANDAAG)
    expect(o.reeks).toBe('consumptieprijzen')
    expect(o.aanvangsindex).toBe(consumptieprijsindex('2021-08'))
  })

  it('volgt de akte wanneer die uitdrukkelijk de gezondheidsindex noemt', () => {
    // De wet zegt "tenzij anders overeengekomen". Een akte die de gezondheidsindex
    // oplegt, is bindend — dus mag de app niet de wet opdringen.
    const o = bouwOpbouw(bijdrage({ indexreeks: 'gezondheid' }), VANDAAG)
    expect(o.reeks).toBe('gezondheid')
    expect(o.aanvangsindex).toBe(gezondheidsindex('2021-08'))
  })

  it('geeft een ANDER bedrag per reeks — dit is geen theoretisch verschil', () => {
    const cpi = bouwOpbouw(bijdrage(), VANDAAG)
    const gez = bouwOpbouw(bijdrage({ indexreeks: 'gezondheid' }), VANDAAG)
    expect(cpi.huidigBedrag).not.toBe(gez.huidigBedrag)
  })

  it('haalt NOOIT twee reeksen door één breuk', () => {
    // De aanvangsindex en elke nieuwe index moeten uit dezelfde korf komen. Kwam de
    // teller uit de ene reeks en de noemer uit de andere, dan zou het bedrag er een
    // paar procent naast zitten zonder één foutmelding.
    for (const reeks of ['consumptieprijzen', 'gezondheid'] as const) {
      const o = bouwOpbouw(bijdrage({ indexreeks: reeks }), VANDAAG)
      const tabel = reeks === 'gezondheid' ? gezondheidsindex : consumptieprijsindex
      expect({ reeks, aanvang: o.aanvangsindex }).toEqual({ reeks, aanvang: tabel(o.aanvangsmaand) })
      for (const stap of o.stappen) {
        expect({ reeks, maand: stap.indexmaand, index: stap.nieuweIndex }).toEqual({
          reeks,
          maand: stap.indexmaand,
          index: tabel(stap.indexmaand) ?? null,
        })
      }
    }
  })

  it('weigert te rekenen wanneer je eigen cijfers uit de ÁNDERE reeks komen', () => {
    // ⚠ De vondst van de nakijkronde van ronde 58, en de gevaarlijkste van de hele
    // ronde. Tik je 139,22 over (de gezondheidsindex van mei 2026) en staat de
    // regeling op de consumptieprijzen, dan drukte de brief "volgt de
    // consumptieprijsindex" af met een getal dat in die reeks niet bestaat. Een
    // tegenpartij die het natelt, vindt het nergens terug.
    //
    // Waarom een stempel en geen slimme controle: de twee reeksen liggen in de meeste
    // maanden minder dan een half procent uit elkaar. Aan het getal zelf is niet te
    // zien uit welke korf het komt.
    const gemengd = bouwOpbouw(
      bijdrage({ eigenIndexcijfers: { '2026-08': 140.5 }, eigenIndexreeks: 'gezondheid' }),
      VANDAAG,
    )
    expect(gemengd.indexConflict).toBe('andere-reeks')
    expect(gemengd.eigenReeks).toBe('gezondheid')
    expect(gemengd.reeks).toBe('consumptieprijzen')
    // En dan staat er geen bedrag, maar het basisbedrag.
    expect(gemengd.huidigBedrag).toBe(25000)
  })

  it('rekent gewoon wanneer de eigen cijfers uit dezelfde reeks komen', () => {
    const zelfde = bouwOpbouw(
      bijdrage({ eigenIndexcijfers: { '2026-08': 140.5 }, eigenIndexreeks: 'consumptieprijzen' }),
      VANDAAG,
    )
    expect(zelfde.indexConflict).toBeNull()
  })

  it('gaat ervan uit dat eigen cijfers zonder stempel in de reeks van de regeling staan', () => {
    // Elk bestaand record mist het stempel. Die cijfers zijn ingetikt toen de app nog
    // met de gezondheidsindex rekende — maar ze blokkeren betekent dat élke bestaande
    // regeling stilvalt. De keuze is bewust: doorrekenen, en het scherm zegt dat de
    // reeks veranderd is (zie de melding in utils/meldingen.ts).
    const zonderStempel = bouwOpbouw(bijdrage({ eigenIndexcijfers: { '2026-08': 140.5 } }), VANDAAG)
    expect(zonderStempel.indexConflict).toBeNull()
  })

  it('behandelt een regeling zonder gekozen reeks als de wettelijke reeks', () => {
    // Elk bestaand record mist dit veld. De keuze is bewust: liever de wettelijke
    // reeks dan de reeks die de app vroeger per vergissing gebruikte. Het scherm
    // zegt er dan wél bij dat dit veranderd is.
    const zonder = bouwOpbouw(bijdrage(), VANDAAG)
    const expliciet = bouwOpbouw(bijdrage({ indexreeks: 'consumptieprijzen' }), VANDAAG)
    expect(zonder.huidigBedrag).toBe(expliciet.huidigBedrag)
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

  it('gebruikt de aanvangsindex uit de akte wanneer de gebruiker ook de rest invult', () => {
    // Vanaf ronde 47 mag een zelf ingetikte aanvangsindex niet meer gecombineerd
    // worden met cijfers uit de tabel van de app: die kunnen uit een andere reeks
    // komen. Vult de gebruiker élke verjaardagsmaand zelf in, dan komt de tabel er
    // niet aan te pas en klopt de verhouding weer. Dit is dus de akte-index in
    // gebruik, langs de weg die overblijft.
    const o = bouwOpbouw(
      bijdrage({ aanvangsindexHandmatig: 100, eigenIndexcijfers: { '2022-08': 124.05 } }),
      '2023-01-15',
    )
    expect(o.indexConflict).toBeNull()
    expect(o.aanvangsindex).toBe(100)
    expect(o.aanvangsindexUitAkte).toBe(true)
    // € 250,00 x 124,05 / 100 = € 310,13
    expect(o.stappen[0].bedrag).toBe(31013)
  })

  it('laat het bedrag staan bij een verjaardag waarvan de index ontbreekt, en zegt welke maand', () => {
    // Een regeling van september: de verjaardag van 2026 heeft de index van
    // augustus 2026 nodig, en die kent de app nog niet (Statbel publiceert een
    // maand pas op het einde van die maand).
    const o = bouwOpbouw(bijdrage({ datumRegeling: '2021-09-10' }), '2026-09-20')
    const laatste = o.stappen[o.stappen.length - 1]
    expect(laatste.indexmaand).toBe('2026-08')
    expect(laatste.nieuweIndex).toBeNull()
    expect(laatste.berekend).toBe(false)
    // Het bedrag van de vorige verjaardag blijft staan — geen schatting.
    expect(laatste.bedrag).toBe(o.stappen[o.stappen.length - 2].bedrag)
    expect(o.ontbrekendeMaanden).toContain('2026-08')
  })

  it('rekent die verjaardag wél uit zodra je het cijfer zelf bijzet', () => {
    const o = bouwOpbouw(
      bijdrage({ datumRegeling: '2021-09-10', eigenIndexcijfers: { '2026-08': 140.5 } }),
      '2026-09-20',
    )
    const laatste = o.stappen[o.stappen.length - 1]
    expect(laatste.nieuweIndex).toBe(140.5)
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

// Twee indexreeksen door elkaar (ronde 47).
//
// Een indexcijfer is een kaal getal; wat het betekent hangt volledig af van de
// basis waarin het staat. Statbel herbaseert om de zoveel jaar. Zolang beide
// cijfers uit dezelfde reeks komen klopt de verhouding — maar één van elk geeft
// een bedrag dat er tientallen procenten naast zit, zonder foutmelding. Dezelfde
// ziekte als de euro's die als centen gelezen werden (ronde 46).
//
// De regel die de app bewaakt staat in `data/gezondheidsindex.ts`: ofwel komen
// beide cijfers uit de tabel, ofwel tikt de gebruiker ze allebei zelf in.
describe('bouwOpbouw — cijfers uit twee verschillende indexreeksen', () => {
  const basis = {
    basisbedrag: 30000,
    datumRegeling: '2020-06-15',
  }
  // De aanvangsmaand van deze regeling is mei 2020; de tabel kent die.
  // Uit de reeks waarmee de app standaard rekent (de consumptieprijzen), want dat
  // is wat `bouwOpbouw` hier zonder gekozen reeks raadpleegt.
  const TABEL_MEI_2020 = consumptieprijsindex('2020-05') as number

  it('rekent gewoon wanneer alles uit de tabel van de app komt', () => {
    const o = bouwOpbouw({ ...basis }, '2026-08-16')
    expect(o.indexConflict).toBeNull()
    expect(o.stappen.length).toBeGreaterThan(0)
    expect(o.huidigBedrag).toBeGreaterThan(30000)
  })

  it('rekent gewoon wanneer de ingetikte aanvangsindex gelijk is aan de tabel', () => {
    // Het gewone geval: een recente regeling waarvan de gebruiker het cijfer
    // letterlijk overtikt. Dat mag hem niet blokkeren.
    const o = bouwOpbouw({ ...basis, aanvangsindexHandmatig: TABEL_MEI_2020 }, '2026-08-16')
    expect(o.indexConflict).toBeNull()
    expect(o.aanvangsindex).toBe(TABEL_MEI_2020)
    expect(o.stappen.length).toBeGreaterThan(0)
  })

  it('laat afronden toe: een half procent verschil is nog hetzelfde cijfer', () => {
    const o = bouwOpbouw(
      { ...basis, aanvangsindexHandmatig: Math.round(TABEL_MEI_2020 * 10) / 10 },
      '2026-08-16',
    )
    expect(o.indexConflict).toBeNull()
  })

  it('weigert te rekenen wanneer het ingetikte cijfer uit een andere reeks komt', () => {
    // Basis 2004 = 100 ligt zo'n kwart hoger dan basis 2013 = 100. Dit is het
    // geval van een vonnis van vóór de laatste herbasering.
    const o = bouwOpbouw({ ...basis, aanvangsindexHandmatig: TABEL_MEI_2020 * 1.24 }, '2026-08-16')
    expect(o.indexConflict).toBe('akte-met-tabel')
    expect(o.aanvangsindex).toBeNull()
    expect(o.stappen).toEqual([])
    expect(o.huidigBedrag).toBe(30000)
  })

  it('BEDRAG: zonder de blokkade zou hier een bedrag staan dat er ver naast zit', () => {
    // De eigenlijke belofte van deze ronde, in centen. Rekent de app door met een
    // aanvangsindex uit een oudere reeks, dan valt het bedrag naast de werkelijkheid
    // omdat er door een te groot getal gedeeld wordt. Dat bedrag ziet er
    // geloofwaardig uit — en dat is precies het gevaar.
    //
    // ⚠ Naam en commentaar spraken hier tot ronde 58 de meting tegen ("fors te hoog"
    // tegenover "een vijfde te laag", terwijl er 7,6 % te laag uitkomt). Nu meet de
    // test wat ze beweert: hoeveel het scheelt, met een ondergrens én een bovengrens.
    const zonderBlokkade = bouwOpbouw(
      { ...basis, aanvangsindexHandmatig: TABEL_MEI_2020 * 1.24, eigenIndexcijfers: eigenVoorAlleVerjaardagen() },
      '2026-08-16',
    )
    const metBlokkade = bouwOpbouw(
      { ...basis, aanvangsindexHandmatig: TABEL_MEI_2020 * 1.24 },
      '2026-08-16',
    )
    // Links: de gebruiker vulde alles zelf in, dus de app rekent — en komt op een
    // ander bedrag uit dan het basisbedrag.
    expect(zonderBlokkade.indexConflict).toBeNull()
    expect(zonderBlokkade.huidigBedrag).not.toBe(30000)
    // Rechts: gemengd, dus geen bedrag. Het verschil tussen die twee is precies
    // wat een gebruiker anders zonder waarschuwing te zien kreeg.
    expect(metBlokkade.huidigBedrag).toBe(30000)
    // Het juiste bedrag (alles uit dezelfde reeks) tegenover het bedrag dat je zou
    // krijgen met een aanvangsindex uit een oudere basis: enkele procenten te laag,
    // en dat op elke maand van elk jaar.
    const juist = bouwOpbouw({ ...basis, eigenIndexcijfers: eigenVoorAlleVerjaardagen() }, '2026-08-16')
    const afwijking = (juist.huidigBedrag - zonderBlokkade.huidigBedrag) / juist.huidigBedrag
    expect(afwijking).toBeGreaterThan(0.05)
    expect(afwijking).toBeLessThan(0.2)
  })

  it('rekent wél wanneer de gebruiker ELKE verjaardagsmaand zelf invult', () => {
    // De uitweg voor een oud vonnis: alle cijfers uit dezelfde oude reeks, dus de
    // tabel komt er niet aan te pas en de verhouding klopt weer.
    const o = bouwOpbouw(
      { ...basis, aanvangsindexHandmatig: 139.0, eigenIndexcijfers: eigenVoorAlleVerjaardagen() },
      '2026-08-16',
    )
    expect(o.indexConflict).toBeNull()
    expect(o.tabelMaanden).toEqual([])
    expect(o.stappen.length).toBeGreaterThan(0)
  })

  it('noemt precies de maanden die de gebruiker nog zelf moet invullen', () => {
    const o = bouwOpbouw({ ...basis, aanvangsindexHandmatig: 999 }, '2026-08-16')
    // De verjaardagen vallen op 15 juni; de index komt telkens uit mei ervoor.
    expect(o.tabelMaanden).toEqual(['2021-05', '2022-05', '2023-05', '2024-05', '2025-05', '2026-05'])
  })

  it('geeft het cijfer dat de app zelf kent, zodat het scherm kan zeggen "laat leeg"', () => {
    const o = bouwOpbouw({ ...basis, aanvangsindexHandmatig: 999 }, '2026-08-16')
    expect(o.aanvangsindexTabel).toBe(TABEL_MEI_2020)
  })

  it('meldt geen ontbrekende maand wanneer de reeksen het probleem zijn', () => {
    // Anders zegt het scherm "de app kent die maand niet", en dan gaat iemand een
    // cijfer bijtikken dat het probleem juist verergert.
    const o = bouwOpbouw({ ...basis, aanvangsindexHandmatig: 999 }, '2026-08-16')
    expect(o.ontbrekendeMaanden).toEqual([])
  })

  it('slaat geen alarm wanneer de akte indexatie uitsluit', () => {
    // Wordt er niet geïndexeerd, dan komt er geen breuk aan te pas en kan er niets
    // fout gaan. Een rode waarschuwing zou hier vals alarm zijn.
    const o = bouwOpbouw(
      { ...basis, geindexeerd: false, aanvangsindexHandmatig: 999 },
      '2026-08-16',
    )
    expect(o.indexConflict).toBeNull()
    expect(o.huidigBedrag).toBe(30000)
  })

  it('weigert wanneer de eigen maandcijfers uit een oudere basis komen', () => {
    // Kan pas gebeuren nadat deze app ooit een nieuwe basis meelevert; het veld
    // legt vast in welke maatstaf de gebruiker zijn cijfers intikte.
    const o = bouwOpbouw(
      { ...basis, eigenIndexcijfers: { '2026-05': 141.2 }, indexBasisjaar: 2004 },
      '2026-08-16',
    )
    expect(o.indexConflict).toBe('ander-basisjaar')
    expect(o.basisjaarEigen).toBe(2004)
    expect(o.basisjaarTabel).toBe(basisjaarVan('consumptieprijzen'))
    expect(o.huidigBedrag).toBe(30000)
  })

  it('behandelt een record zonder basisjaar als de basis die de app altijd had', () => {
    // Elk bestaand record mist dit veld, en die maandcijfers zijn in basis 2013
    // ingetikt — de enige basis die deze app ooit gehad heeft. Zonder deze regel
    // zou de reparatie elke bestaande regeling stilleggen.
    // Een cijfer uit de reeks waarmee de regeling rekent (de consumptieprijzen):
    // mei 2026 = 139,71. Tot de nakijkronde van ronde 58 stond hier 139,22 — het
    // GEZONDHEIDSINDEXcijfer van diezelfde maand — en legde deze test dus precies de
    // vermenging vast die de app hoort te weigeren.
    const o = bouwOpbouw({ ...basis, eigenIndexcijfers: { '2026-05': 139.71 } }, '2026-08-16')
    expect(o.indexConflict).toBeNull()
  })

  it('telt de achterstand niet door alsof er niets aan de hand is', () => {
    // Bij een conflict staat elke maand aan het basisbedrag. Het cijfer is dan
    // structureel te laag; het scherm hoort dat te zeggen in plaats van het te
    // tonen. Deze test legt vast dát het te laag is, zodat het scherm zich niet
    // ongemerkt kan bedenken.
    const invoer = { ...basis, aanvangsindexHandmatig: 999 }
    const o = bouwOpbouw(invoer, '2026-08-16')
    const regels = verschuldigdPerMaand(invoer, o, '2026-08-16')
    expect(regels.every((r) => r.verschuldigd === 30000)).toBe(true)
  })
})

/** Een eigen cijfer voor elke verjaardagsmaand van de regeling van juni 2020. */
function eigenVoorAlleVerjaardagen(): Record<string, number> {
  const uit: Record<string, number> = {}
  for (const jaar of [2021, 2022, 2023, 2024, 2025, 2026]) {
    // Willekeurige, maar onderling consistente cijfers uit "een andere reeks".
    uit[`${jaar}-05`] = 140 + (jaar - 2021) * 4
  }
  return uit
}
