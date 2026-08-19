import { describe, it, expect } from 'vitest'
import type { TerugkerendePost } from '../data/schema'
import { BESLISVENSTER_DAGEN, contractstand, tebeslissenContracten, volgendeVerlenging } from './contract'
import { OPZEGREGELS, opzegregelVan } from '../data/opzegregels'

// Ronde 57. Deze module rekent één ding uit: wanneer je uiterlijk moet beslissen als je
// niet wil dat de volgende contractperiode nog aan de nieuwe prijs loopt. Elke test
// hieronder is met de hand na te rekenen.
//
// De wettelijke termijnen komen uit `data/opzegregels.ts`, met hun bron. Zie
// `claude/domeinonderzoek_opzegtermijnen_belgie.md`.

const post = (over: Partial<TerugkerendePost> & { id: string }): TerugkerendePost => ({
  omschrijving: 'Energie',
  bedrag: -8000,
  rekeningId: 'r1',
  dag: 5,
  ...over,
})

describe('de gegevens zelf', () => {
  it('geeft elke soort precies één regel', () => {
    const soorten = OPZEGREGELS.map((r) => r.soort)
    expect(new Set(soorten).size).toBe(soorten.length)
  })

  it('draagt bij elke soort met een termijn ook een bron', () => {
    // Een termijn zonder bron is een bewering die de app niet kan waarmaken, en dit
    // getal bepaalt een datum die je een contract kan kosten.
    for (const r of OPZEGREGELS) {
      if (r.standaardTermijnMaanden === null) continue
      expect({ soort: r.soort, bron: r.bron.startsWith('http') }).toEqual({ soort: r.soort, bron: true })
      expect(r.nagekekenOp).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('kent voor "ander" bewust GEEN termijn', () => {
    expect(opzegregelVan('ander')?.standaardTermijnMaanden).toBeNull()
  })

  it('gebruikt voor energie één maand en voor de rest twee', () => {
    expect(opzegregelVan('energie')?.standaardTermijnMaanden).toBe(1)
    expect(opzegregelVan('telecom')?.standaardTermijnMaanden).toBe(2)
    expect(opzegregelVan('verzekering')?.standaardTermijnMaanden).toBe(2)
    expect(opzegregelVan('abonnement')?.standaardTermijnMaanden).toBe(2)
  })

  it('bewaart de termijn in MAANDEN en niet in dagen', () => {
    // De nakijkronde van ronde 57 vond hier een fout die geld kost: één maand als
    // 30 dagen terugrekenen vanaf 15 april geeft 16 maart, terwijl de wettelijke
    // uiterste dag 15 maart is. Eén dag te laat.
    //
    // Deze test meet dat aan de UITKOMST en niet aan het getal: zou iemand ooit weer
    // dagen in dit veld zetten (30 in plaats van 1), dan verschuift de beslisdatum en
    // valt hij hier om. Alleen "is het getal klein" zou dat niet vangen.
    for (const r of OPZEGREGELS) {
      if (r.standaardTermijnMaanden === null) continue
      const s = contractstand(post({ id: 'p1', contractsoort: r.soort, verlengtOp: '2026-04-15' }), '2026-01-01')
      const verwacht = ['2026-04-15', '2026-03-15', '2026-02-15', '2026-01-15'][r.standaardTermijnMaanden]
      expect({ soort: r.soort, beslis: s.beslisUiterlijk }).toEqual({ soort: r.soort, beslis: verwacht })
    }
  })
})

describe('volgendeVerlenging', () => {
  it('geeft de datum zelf terug wanneer die nog moet komen', () => {
    expect(volgendeVerlenging('2026-12-01', 12, '2026-08-18')).toBe('2026-12-01')
    // Vandaag is ook "nog niet voorbij".
    expect(volgendeVerlenging('2026-08-18', 12, '2026-08-18')).toBe('2026-08-18')
  })

  it('rolt een voorbije datum door met de periode', () => {
    expect(volgendeVerlenging('2024-03-01', 12, '2026-08-18')).toBe('2027-03-01')
    expect(volgendeVerlenging('2026-02-01', 3, '2026-08-18')).toBe('2026-11-01')
  })

  it('rolt door zonder de dag te laten wegglijden', () => {
    // 31 januari + 1 maand is 28 februari, niet 3 maart. Rolt de teller daarna door,
    // dan moet hij wéér van de 31e vertrekken.
    expect(volgendeVerlenging('2025-01-31', 1, '2025-04-15')).toBe('2025-04-30')
    expect(volgendeVerlenging('2025-01-31', 1, '2025-05-01')).toBe('2025-05-31')
  })

  it('geeft null wanneer ze niet weet om de hoeveel maanden er verlengd wordt', () => {
    // Dit is de kern: liever geen datum dan een verzonnen datum. Of een verlopen
    // contract voor één, twee of drie jaar verlengd is, kan de app niet weten.
    expect(volgendeVerlenging('2024-03-01', undefined, '2026-08-18')).toBeNull()
  })

  it('geeft null bij een datum die geen echte kalenderdag is', () => {
    expect(volgendeVerlenging('2026-02-30', 12, '2026-08-18')).toBeNull()
    expect(volgendeVerlenging('2026-08', 12, '2026-08-18')).toBeNull()
  })
})

describe('contractstand', () => {
  it('zwijgt over een vaste last die geen contract is', () => {
    expect(contractstand(post({ id: 'p1' }), '2026-08-18').fase).toBe('geen')
  })

  it('zwijgt wanneer er wel een soort maar geen datum is', () => {
    expect(contractstand(post({ id: 'p1', contractsoort: 'energie' }), '2026-08-18').fase).toBe('geen')
  })

  it('rekent de beslisdatum uit met de wettelijke termijn', () => {
    // Energie: één maand. Verlengt op 1 december, dus beslissen vóór 1 november.
    const s = contractstand(post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-12-01' }), '2026-08-18')
    expect(s.beslisUiterlijk).toBe('2026-11-01')
    expect(s.termijn).toEqual({ aantal: 1, eenheid: 'maand' })
    expect(s.termijnUitWet).toBe(true)
    expect(s.fase).toBe('rustig')
  })

  it('laat JOUW termijn winnen van de wettelijke', () => {
    // Wat in jouw overeenkomst staat kan korter zijn dan het wettelijke maximum.
    const s = contractstand(
      post({ id: 'p1', contractsoort: 'telecom', verlengtOp: '2026-12-01', opzegtermijnDagen: 14 }),
      '2026-08-18',
    )
    expect(s.beslisUiterlijk).toBe('2026-11-17')
    expect(s.termijn).toEqual({ aantal: 14, eenheid: 'dag' })
    expect(s.termijnUitWet).toBe(false)
  })

  it('rekent de wettelijke termijn in KALENDERMAANDEN, niet in dertig dagen', () => {
    // Dit is de fout uit de nakijkronde, met de cijfers erbij. Energie verlengt op
    // 15 april; wettelijk moet je uiterlijk 15 maart opzeggen. Dertig dagen
    // terugtellen gaf 16 maart — één dag te laat. Bij twee maanden hangt het van de
    // maand af hoe erg het wordt: vóór 15 april valt 60 dagen toevallig een dag te
    // VROEG (14 februari), maar vóór 15 september twee dagen te LAAT (17 juli in
    // plaats van 15 juli). Zie de test hieronder.
    const energie = contractstand(post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-04-15' }), '2026-01-01')
    expect(energie.beslisUiterlijk).toBe('2026-03-15')
    const verzekering = contractstand(
      post({ id: 'p2', contractsoort: 'verzekering', verlengtOp: '2026-04-15' }),
      '2026-01-01',
    )
    expect(verzekering.beslisUiterlijk).toBe('2026-02-15')
    // Het geval waarin dagen rekenen ECHT te laat uitkomt: 15 september min twee
    // maanden is 15 juli, min zestig dagen is 17 juli.
    const september = contractstand(
      post({ id: 'p3', contractsoort: 'verzekering', verlengtOp: '2026-09-15' }),
      '2026-01-01',
    )
    expect(september.beslisUiterlijk).toBe('2026-07-15')
  })

  it('klemt de dag wanneer de maand ervoor korter is', () => {
    // 31 maart min één maand is 28 februari, niet 3 maart.
    const s = contractstand(post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-03-31' }), '2026-01-01')
    expect(s.beslisUiterlijk).toBe('2026-02-28')
  })

  it('slaat alarm zodra de beslisdatum binnen het venster valt', () => {
    // Beslisvenster is 30 dagen. Verlengt 2026-10-01, termijn één maand → beslissen
    // vóór 2026-09-01. Op 2026-08-18 is dat 14 dagen weg.
    const s = contractstand(post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-10-01' }), '2026-08-18')
    expect(s.fase).toBe('beslissen')
    expect(s.dagenTotBeslissing).toBe(14)
  })

  it('zit precies op de grens van het venster nog in "beslissen"', () => {
    const opDeGrens = contractstand(
      post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-10-17' }),
      '2026-08-18',
    )
    expect({ dagen: opDeGrens.dagenTotBeslissing, fase: opDeGrens.fase }).toEqual({
      dagen: BESLISVENSTER_DAGEN,
      fase: 'beslissen',
    })
    const eenDagVerder = contractstand(
      post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-10-18' }),
      '2026-08-18',
    )
    expect(eenDagVerder.fase).toBe('rustig')
  })

  it('zegt "verlengd" wanneer de beslisdatum voorbij is — niet "te laat"', () => {
    // Je zit niet vast: voor bijna elk Belgisch consumentencontract kan je nadien nog
    // altijd opzeggen. Alleen loopt het dan nog de opzegtermijn door.
    const s = contractstand(
      post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-09-01', verlengtElkeMaanden: 12 }),
      '2026-08-18',
    )
    expect(s.fase).toBe('verlengd')
    expect(s.dagenTotBeslissing).toBeLessThan(0)
  })

  it('vraagt de nieuwe datum wanneer ze de oude niet kan doorrollen', () => {
    const s = contractstand(post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2024-03-01' }), '2026-08-18')
    expect(s.fase).toBe('verlopen')
    expect(s.beslisUiterlijk).toBeNull()
    // De opgeslagen datum blijft zichtbaar, zodat je weet wat er bij te werken valt.
    expect(s.verlengtOp).toBe('2024-03-01')
  })

  it('zegt bij een verlopen datum zonder wettelijke termijn niet dat de wet het zegt', () => {
    // In de nakijkronde stond `termijnUitWet` hier op waar, ook bij soort 'ander' —
    // waarvoor de app juist GEEN wettelijke termijn kent. Het scherm zou dan een
    // wet aanhalen die er niet is.
    const s = contractstand(post({ id: 'p1', contractsoort: 'ander', verlengtOp: '2024-03-01' }), '2026-08-18')
    expect({ fase: s.fase, termijn: s.termijn, uitWet: s.termijnUitWet }).toEqual({
      fase: 'verlopen',
      termijn: null,
      uitWet: false,
    })
  })

  it('klapt niet om op een jaartal van drie cijfers', () => {
    // Uit de nakijkronde: een doorgerolde datum werd als '901-06-15' geschreven, en
    // in een tekstvergelijking is '9' groter dan '2', dus die datum gold als
    // TOEKOMST. Daarna liep de app door op een datum die nergens op sloeg.
    const s = contractstand(
      post({ id: 'p1', contractsoort: 'energie', verlengtOp: '0900-06-15', verlengtElkeMaanden: 12 }),
      '2026-08-18',
    )
    expect(s.fase).toBe('verlopen')
    expect(s.beslisUiterlijk).toBeNull()
  })

  it('toont de datum maar rekent niets uit bij een soort zonder termijn', () => {
    const s = contractstand(post({ id: 'p1', contractsoort: 'ander', verlengtOp: '2026-12-01' }), '2026-08-18')
    expect(s.fase).toBe('zonder-termijn')
    expect(s.beslisUiterlijk).toBeNull()
    expect(s.verlengtOp).toBe('2026-12-01')
  })

  it('rekent wél uit wanneer je bij "ander" zelf een termijn invult', () => {
    const s = contractstand(
      post({ id: 'p1', contractsoort: 'ander', verlengtOp: '2026-12-01', opzegtermijnDagen: 90 }),
      '2026-08-18',
    )
    // 90 dagen terug vanaf 1 december is 2 september: dat is 15 dagen weg, dus binnen
    // het beslisvenster van 30 dagen.
    expect(s.beslisUiterlijk).toBe('2026-09-02')
    expect(s.fase).toBe('beslissen')
  })

  it('zegt het wanneer de opgeslagen datum geen echte kalenderdag is', () => {
    // Tweede nakijkronde van ronde 57. Hiervoor gaf dit `fase: 'geen'`, en dan zwegen
    // de rij én het belletje volledig — terwijl er wel degelijk contractgegevens
    // opgeslagen waren. Zo'n datum kan uit het Drive-logboek of van een ouder toestel
    // komen; de datumkiezer op het scherm laat hem niet toe.
    const s = contractstand(post({ id: 'p1', contractsoort: 'energie', verlengtOp: '2026-02-30' }), '2026-08-18')
    expect(s.fase).toBe('onleesbaar')
    expect(s.verlengtOp).toBe('2026-02-30')
    expect(s.beslisUiterlijk).toBeNull()
  })

  it('rekent met JOUW termijn in maanden, in kalendermaanden', () => {
    // De reparatie uit de tweede nakijkronde. Drie maanden opzeg vóór een vervaldag op
    // 15 januari is 15 oktober. Vulde je diezelfde drie maanden als 90 dagen in — het
    // enige wat vroeger kon — dan zei de app 17 oktober: twee dagen te laat.
    const inMaanden = contractstand(
      post({ id: 'p1', contractsoort: 'verzekering', verlengtOp: '2027-01-15', opzegtermijnMaanden: 3 }),
      '2026-08-18',
    )
    expect(inMaanden.beslisUiterlijk).toBe('2026-10-15')
    expect(inMaanden.termijn).toEqual({ aantal: 3, eenheid: 'maand' })
    expect(inMaanden.termijnUitWet).toBe(false)
    const inDagen = contractstand(
      post({ id: 'p2', contractsoort: 'verzekering', verlengtOp: '2027-01-15', opzegtermijnDagen: 90 }),
      '2026-08-18',
    )
    expect(inDagen.beslisUiterlijk).toBe('2026-10-17')
  })

  it('neemt nul maanden serieus: beslissen kan tot op de verlengdatum zelf', () => {
    // Nul is een geldige keuze en geen "leeg". Een waarheidscontrole in plaats van
    // `!== undefined` zou hem stil vervangen door de wettelijke twee maanden, en dan
    // waarschuwde de app twee maanden te vroeg over iets wat je nog kan doen.
    const s = contractstand(
      post({ id: 'p1', contractsoort: 'verzekering', verlengtOp: '2027-01-15', opzegtermijnMaanden: 0 }),
      '2026-08-18',
    )
    expect(s.beslisUiterlijk).toBe('2027-01-15')
    expect(s.termijnUitWet).toBe(false)
  })

  it('laat maanden winnen wanneer er per ongeluk twee eigen termijnen staan', () => {
    // Kan niet via het formulier, wél via een ouder logboekbestand. Eén voorspelbaar
    // antwoord is beter dan "hangt ervan af".
    const s = contractstand(
      post({
        id: 'p1',
        contractsoort: 'verzekering',
        verlengtOp: '2027-01-15',
        opzegtermijnMaanden: 3,
        opzegtermijnDagen: 90,
      }),
      '2026-08-18',
    )
    expect(s.termijn).toEqual({ aantal: 3, eenheid: 'maand' })
  })

  it('rekent over een jaargrens heen', () => {
    const s = contractstand(
      post({ id: 'p1', contractsoort: 'verzekering', verlengtOp: '2027-01-15' }),
      '2026-11-20',
    )
    // Twee kalendermaanden terug vanaf 15 januari 2027 → 15 november 2026.
    expect(s.beslisUiterlijk).toBe('2026-11-15')
    expect(s.fase).toBe('verlengd')
  })
})

describe('tebeslissenContracten', () => {
  const rustig = post({ id: 'rustig', contractsoort: 'energie', verlengtOp: '2027-06-01' })
  const dichtbij = post({ id: 'dichtbij', contractsoort: 'energie', verlengtOp: '2026-10-01' })
  const verlopen = post({ id: 'verlopen', contractsoort: 'telecom', verlengtOp: '2024-01-01' })

  it('neemt alleen wat aandacht vraagt', () => {
    const uit = tebeslissenContracten([rustig, dichtbij, verlopen], '2026-08-18')
    expect(uit.map((r) => r.post.id)).toEqual(['verlopen', 'dichtbij'])
  })

  it('laat een post die stopt vóór zijn eigen verlenging met rust', () => {
    // Zeg je in augustus op tegen september, terwijl het contract pas in oktober zou
    // verlengen, dan hoef je over die verlenging niets meer te beslissen. Zonder deze
    // regel bleef de app je herinneren aan een beslissing die je net genomen had.
    const gestopt = post({ ...dichtbij, id: 'gestopt', eindMaand: '2026-09' })
    expect(tebeslissenContracten([gestopt], '2026-08-18')).toEqual([])
  })

  it('telt een post die pas ná de verlenging stopt nog wél mee', () => {
    const stoptLater = post({ ...dichtbij, id: 'later', eindMaand: '2026-12' })
    expect(tebeslissenContracten([stoptLater], '2026-08-18')).toHaveLength(1)
  })

  it('laat een verlopen contract dat intussen gestopt is vallen', () => {
    // Uit de nakijkronde. Bij 'verlopen' staat er in `verlengtOp` de OUDE datum
    // (2024-01-01). Daarmee vergelijken zei "eindMaand 2025-06 ligt ná 2024-01, dus
    // hij loopt nog" — over een post die al meer dan een jaar gestopt is.
    const gestopt = post({ ...verlopen, id: 'gestopt', eindMaand: '2025-06' })
    expect(tebeslissenContracten([gestopt], '2026-08-18')).toEqual([])
    const loopt = post({ ...verlopen, id: 'loopt', eindMaand: '2026-12' })
    expect(tebeslissenContracten([loopt], '2026-08-18')).toHaveLength(1)
  })

  it('geeft dezelfde volgorde ongeacht hoe de gegevens binnenkomen', () => {
    // Dexie levert op id, niet op datum. Twee toestellen moeten hetzelfde tonen.
    const heen = tebeslissenContracten([rustig, dichtbij, verlopen], '2026-08-18').map((r) => r.post.id)
    const terug = tebeslissenContracten([verlopen, dichtbij, rustig], '2026-08-18').map((r) => r.post.id)
    expect(heen).toEqual(terug)
  })
})
