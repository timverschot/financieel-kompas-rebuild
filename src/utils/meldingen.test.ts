import { describe, it, expect } from 'vitest'
import type {
  Budget,
  Dossier,
  Garantie,
  Maandafsluiting,
  Onderhoudsbijdrage,
  TerugkerendePost,
  Transactie,
} from '../data/schema'
import { bouwMeldingen, STANDAARD_BUDGETDREMPEL } from './meldingen'
import { budgetKleur } from './budget'
import { formatEuro } from './format'
import { maandJaarLabel } from './datum'

const naamVanCategorie = (id: string) => (id === 'ov-voeding' ? 'Voeding' : id)

function tx(datum: string, bedrag: number, categorieId?: string): Transactie {
  return { id: `t-${datum}-${bedrag}`, datum, omschrijving: 'x', bedrag, rekeningId: 'r1', categorieId }
}

function basis(extra: Partial<Parameters<typeof bouwMeldingen>[0]> = {}) {
  return bouwMeldingen({
    budgetten: [],
    transacties: [],
    maand: '2026-07',
    garanties: [],
    terugkerendePosten: [],
    vandaagISO: '2026-07-15',
    naamVanCategorie,
    ...extra,
  })
}

describe('bouwMeldingen — budgetten', () => {
  const budget: Budget = { id: 'b1', categorieId: 'ov-voeding', bedrag: 10000 }

  it('zwijgt zolang een budget onder de drempel blijft', () => {
    // 84% van € 100 = € 84 — net onder de standaarddrempel van 85%.
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -8400, 'ov-voeding')] })
    expect(meldingen).toHaveLength(0)
  })

  it('waarschuwt vanaf de drempel', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -8500, 'ov-voeding')] })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('budget-bijna')
    expect(meldingen[0].params).toEqual({ naam: 'Voeding', pct: 85 })
    expect(meldingen[0].dringend).toBe(false)
    expect(meldingen[0].pagina).toBe('budget')
  })

  it('respecteert een eigen drempel', () => {
    const transacties = [tx('2026-07-02', -7000, 'ov-voeding')]
    expect(basis({ budgetten: [budget], transacties })).toHaveLength(0)
    expect(basis({ budgetten: [budget], transacties, drempel: 70 })).toHaveLength(1)
  })

  it('meldt een overschrijding als dringend', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -12000, 'ov-voeding')] })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('budget-over')
    expect(meldingen[0].dringend).toBe(true)
    expect(meldingen[0].params).toEqual({ naam: 'Voeding', pct: 120 })
  })

  it('telt exact 100% als "bijna op", niet als overschreden', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-07-02', -10000, 'ov-voeding')] })
    expect(meldingen[0].soort).toBe('budget-bijna')
  })

  it('negeert uitgaven buiten de gekozen maand', () => {
    const meldingen = basis({ budgetten: [budget], transacties: [tx('2026-06-30', -20000, 'ov-voeding')] })
    expect(meldingen).toHaveLength(0)
  })

  it('splitst een gesplitst kassaticket uit over de categorieën', () => {
    // € 90 in Voeding + € 40 elders. Alleen de Voeding-regel mag het budget van
    // € 100 raken: 90% ligt boven de drempel, 130% zou ze overschrijden.
    const ticket: Transactie = {
      id: 'ticket',
      datum: '2026-07-04',
      omschrijving: 'Colruyt',
      bedrag: -13000,
      rekeningId: 'r1',
      regels: [
        { bedrag: -9000, categorieId: 'ov-voeding' },
        { bedrag: -4000, categorieId: 'ov-drank' },
      ],
    }
    const meldingen = basis({ budgetten: [budget], transacties: [ticket] })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('budget-bijna')
    expect(meldingen[0].params?.pct).toBe(90)
  })
})

describe('bouwMeldingen — garanties', () => {
  // Aankoop 1 juni 2026, 2 maanden garantie: verloopt 1 augustus 2026.
  const garantie: Garantie = { id: 'g1', product: 'Koffiezet', aankoopdatum: '2026-06-01', garantieMaanden: 2 }

  it('zwijgt zolang de garantie nog ruim geldig is (meer dan 60 dagen)', () => {
    // Dezelfde aankoop, maar met de wettelijke 24 maanden: verloopt pas in 2028.
    const lang: Garantie = { ...garantie, garantieMaanden: 24 }
    expect(basis({ garanties: [lang], vandaagISO: '2026-06-02' })).toHaveLength(0)
  })

  it('meldt een garantie die binnen 60 dagen verloopt', () => {
    const meldingen = basis({ garanties: [garantie], vandaagISO: '2026-07-15' })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('garantie')
    expect(meldingen[0].params).toEqual({ product: 'Koffiezet', n: 17 })
    expect(meldingen[0].pagina).toBe('dossiers')
    expect(meldingen[0].subtab).toBe('garantie')
    expect(meldingen[0].dringend).toBe(false)
  })

  it('maakt de melding dringend binnen twee weken', () => {
    const meldingen = basis({ garanties: [garantie], vandaagISO: '2026-07-25' })
    expect(meldingen[0].dringend).toBe(true)
  })

  it('zwijgt over een garantie die al verlopen is', () => {
    expect(basis({ garanties: [garantie], vandaagISO: '2026-08-02' })).toHaveLength(0)
  })
})

describe('bouwMeldingen — vaste lasten', () => {
  const huur: TerugkerendePost = { id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 3 }

  it('meldt een vaste last waarvan de dag voorbij is en die nog niet geboekt is', () => {
    const meldingen = basis({ terugkerendePosten: [huur], vandaagISO: '2026-07-15' })
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].soort).toBe('vastelast')
    // Sinds ronde 23 één melding PER post, met de naam erbij en een actie om ze
    // meteen in te boeken — niet meer één regel "{n} vaste last(en)".
    expect(meldingen[0].params).toEqual({ naam: 'Huur' })
    expect(meldingen[0].actie).toEqual({ soort: 'boek-vastelast', postId: 'p1' })
    expect(meldingen[0].pagina).toBe('budget')
  })

  it('meldt elke niet-geboekte post apart', () => {
    const gas: TerugkerendePost = { id: 'p2', omschrijving: 'Gas', bedrag: -8000, rekeningId: 'r1', dag: 5 }
    const meldingen = basis({ terugkerendePosten: [huur, gas], vandaagISO: '2026-07-15' })
    expect(meldingen.map((m) => m.params?.naam).sort()).toEqual(['Gas', 'Huur'])
  })

  it('zwijgt over een post die deze maand niet vervalt', () => {
    // Halfjaarlijks, eerste betaling in augustus: in juli valt er niets te boeken.
    const premie: TerugkerendePost = {
      id: 'p3',
      omschrijving: 'Autoverzekering',
      bedrag: -60000,
      rekeningId: 'r1',
      dag: 5,
      frequentie: 'semester',
      startMaand: '2026-08',
    }
    expect(basis({ terugkerendePosten: [premie], vandaagISO: '2026-07-15' })).toHaveLength(0)
  })

  it('zwijgt zolang de dag nog niet voorbij is', () => {
    expect(basis({ terugkerendePosten: [huur], vandaagISO: '2026-07-01' })).toHaveLength(0)
  })

  it('zwijgt zodra de vaste last geboekt is', () => {
    const geboekt = tx('2026-07-03', -95000)
    expect(basis({ terugkerendePosten: [huur], transacties: [geboekt], vandaagISO: '2026-07-15' })).toHaveLength(0)
  })
})

describe('bouwMeldingen — volgorde', () => {
  it('zet dringende meldingen bovenaan', () => {
    const meldingen = basis({
      budgetten: [
        { id: 'b1', categorieId: 'ov-voeding', bedrag: 10000 },
        { id: 'b2', categorieId: 'ov-drank', bedrag: 10000 },
      ],
      transacties: [tx('2026-07-02', -9000, 'ov-voeding'), tx('2026-07-03', -15000, 'ov-drank')],
    })
    expect(meldingen.map((m) => m.soort)).toEqual(['budget-over', 'budget-bijna'])
  })

  it('gebruikt 85% als standaarddrempel', () => {
    expect(STANDAARD_BUDGETDREMPEL).toBe(85)
  })
})

// Ronde 35: het belletje en de gekleurde balk op de Budgetpagina moeten over exact
// hetzelfde feit hetzelfde zeggen. Ze rekenden allebei anders — het belletje op een
// afgerond percentage, de balk op centen — en dus waren er randen waar het ene
// scherm waarschuwde en het andere niet.
describe('budgetmelding en budgetkleur zeggen hetzelfde', () => {
  function melding(verbruiktCenten: number, budgetCenten: number, drempel = 70) {
    return bouwMeldingen({
      transacties: [
        { id: 't', datum: '2026-07-05', omschrijving: 'x', bedrag: -verbruiktCenten, rekeningId: 'r', categorieId: 'c' },
      ],
      budgetten: [{ id: 'b', categorieId: 'c', bedrag: budgetCenten }],
      garanties: [],
      terugkerendePosten: [],
      maand: '2026-07',
      vandaagISO: '2026-07-15',
      naamVanCategorie: () => 'Boodschappen',
      drempel,
    })
  }

  it('meldt een overschrijding van een halve procent als overschreden, net als de balk', () => {
    // € 100,40 van € 100. Afgerond is dat 100 %, dus vroeger heette dit "bijna op"
    // terwijl de balk al rood stond.
    const m = melding(10040, 10000)
    expect(m[0].soort).toBe('budget-over')
    expect(m[0].dringend).toBe(true)
    expect(budgetKleur(10040, 10000, 70)).toBe('var(--negative)')
  })

  it('waarschuwt niet vóór de drempel echt bereikt is', () => {
    // € 69,50 van € 100 bij drempel 70 %: afgerond 70 %, maar in centen nog niet.
    expect(melding(6950, 10000)).toHaveLength(0)
    expect(budgetKleur(6950, 10000, 70)).toBe('var(--positive)')
  })

  it('waarschuwt wél zodra de drempel in centen gehaald is', () => {
    expect(melding(7000, 10000)[0].soort).toBe('budget-bijna')
    expect(budgetKleur(7000, 10000, 70)).toBe('var(--warn)')
  })
})

describe('bouwMeldingen — een gestopte vaste last (ronde 38)', () => {
  it('zwijgt over een post die is opgezegd', () => {
    // Het belletje leunt op maandVooruitblik, dus dit is een regressietest: zou
    // iemand die keten ooit doorknippen, dan biedt de app "Boek in" aan voor een
    // abonnement dat niet meer bestaat.
    const gestopt: TerugkerendePost = {
      id: 'weg',
      omschrijving: 'Netflix',
      bedrag: -1399,
      rekeningId: 'r1',
      dag: 1,
      eindMaand: '2026-07',
    }
    const meldingen = basis({ terugkerendePosten: [gestopt] })
    expect(meldingen.some((m) => m.actie?.postId === 'weg')).toBe(false)
    expect(meldingen.some((m) => JSON.stringify(m.params ?? {}).includes('Netflix'))).toBe(false)
  })
})

describe('bouwMeldingen — de onderhoudsbijdrage', () => {
  // De regeling van 15 september 2021: de verjaardag van 2025 valt op 15-09-2025.
  const bijdrage: Onderhoudsbijdrage = {
    id: 'ob1',
    dossierId: 'd1',
    richting: 'jij-ontvangt',
    basisbedrag: 25000,
    datumRegeling: '2021-09-15',
    // Expliciet, zodat deze tests niet ook de eenmalige reeks-melding van ronde 58
    // meekrijgen. Die heeft haar eigen test hieronder.
    indexreeks: 'consumptieprijzen' as const,
  }
  const dossiers: Dossier[] = [{ id: 'd1', naam: 'Kinderen', aandeelJij: 60 }]
  const bel = (extra: Record<string, unknown> = {}, vandaag = '2025-09-20') =>
    basis({ onderhoudsbijdragen: [bijdrage], dossiers, vandaagISO: vandaag, formatBedrag: formatEuro, ...extra })

  it('meldt een indexatie die net gebeurd is, met het oude en het nieuwe bedrag', () => {
    // Van rechtswege aangepast, maar een doorlopende opdracht past zichzelf niet aan.
    const m = bel().filter((x) => x.soort === 'bijdrage')
    expect(m).toHaveLength(1)
    expect(m[0].params?.dossier).toBe('Kinderen')
    expect(m[0].params?.datum).toBe('2025-09-15')
    // Consumptieprijzen sinds ronde 58: aug 2024 → aug 2025 in plaats van de
    // gezondheidsindex. Vandaar andere bedragen dan vóór die ronde.
    expect(m[0].params?.oud).toBe(formatEuro(29427))
    expect(m[0].params?.nieuw).toBe(formatEuro(29990))
    expect(m[0].dringend).toBe(false)
  })

  it('zegt het één keer wanneer de regeling nog geen indexreeks gekozen heeft', () => {
    // ⚠ Ronde 58. Een regeling van vóór die ronde rekende met de gezondheidsindex;
    // de wet noemt de consumptieprijzen. De app rekent nu de wettelijke reeks, dus
    // het bedrag KAN veranderd zijn zonder dat de gebruiker iets deed. Een bedrag dat
    // stil verschuift is precies wat deze app niet mag doen — vandaar deze melding,
    // tot hij één keer bevestigt wat er in zijn akte staat.
    const oud = { ...bijdrage, indexreeks: undefined }
    const m = bel({ onderhoudsbijdragen: [oud] }).filter((x) => x.soort === 'bijdrage')
    const reeksmelding = m.find((x) => x.id.includes('indexreeks'))
    expect(reeksmelding?.sleutel).toContain('gezondheidsindex')
    expect(reeksmelding?.dringend).toBe(false)
    expect(reeksmelding?.params?.dossier).toBe('Kinderen')
  })

  it('zwijgt erover zodra de reeks bevestigd is', () => {
    const m = bel().filter((x) => x.id.includes('indexreeks'))
    expect(m).toEqual([])
  })

  it('meldt GEEN geïndexeerd bedrag wanneer de indexcijfers uit twee reeksen komen', () => {
    // Ronde 47. De meldingen bouwden hun eigen invoer op en vergaten daarbij het
    // veld dat het conflict bepaalt. Gevolg: het dossierscherm weigerde een bedrag
    // te tonen terwijl de startpagina er wél eentje meldde — twee verschillende
    // cijfers uit één app, en het foute stond vooraan.
    const gemengd = { ...bijdrage, aanvangsindexHandmatig: 88.5 }
    const m = bel({ onderhoudsbijdragen: [gemengd] }).filter((x) => x.soort === 'bijdrage')
    expect(m).toHaveLength(1)
    expect(m[0].id).toContain('bijdrage-reeks')
    // Geen enkel bedrag in de melding: dat is het hele punt.
    expect(m[0].params?.oud).toBeUndefined()
    expect(m[0].params?.nieuw).toBeUndefined()
  })

  it('brengt je naar het juiste dossier, niet enkel naar de pagina', () => {
    const m = bel().find((x) => x.soort === 'bijdrage')
    expect(m?.pagina).toBe('dossiers')
    expect(m?.subtab).toBe('coouderschap')
    expect(m?.dossierId).toBe('d1')
  })

  it('zwijgt wanneer de aanpassing al maanden geleden is', () => {
    expect(bel({}, '2026-07-30').filter((x) => x.soort === 'bijdrage')).toHaveLength(0)
  })

  it('zwijgt wanneer de regeling indexatie uitsluit', () => {
    const zonder = { ...bijdrage, geindexeerd: false }
    expect(bel({ onderhoudsbijdragen: [zonder] }).filter((x) => x.soort === 'bijdrage')).toHaveLength(0)
  })

  it('zwijgt wanneer de regeling al afgelopen is', () => {
    const gestopt = { ...bijdrage, eindDatum: '2024-12-31' }
    expect(bel({ onderhoudsbijdragen: [gestopt] }).filter((x) => x.soort === 'bijdrage')).toHaveLength(0)
  })

  it('zwijgt wanneer er nog geen verjaardag geweest is', () => {
    const nieuw = { ...bijdrage, datumRegeling: '2025-09-01' }
    expect(bel({ onderhoudsbijdragen: [nieuw] }, '2025-09-20').filter((x) => x.soort === 'bijdrage')).toHaveLength(0)
  })

  it('zegt het apart wanneer het indexcijfer van die maand nog ontbreekt', () => {
    // Dan kan je zélf iets doen — het cijfer bijzetten — in plaats van je
    // overschrijving aan te passen. Eén melding voor allebei poetst dat verschil weg.
    // September: de verjaardag heeft augustus 2026 nodig, en Statbel publiceert een
    // maand pas op het einde van die maand.
    const wacht = { ...bijdrage, datumRegeling: '2021-09-10' }
    const m = bel({ onderhoudsbijdragen: [wacht] }, '2026-09-20').filter((x) => x.soort === 'bijdrage')
    expect(m).toHaveLength(1)
    expect(m[0].id).toContain('wacht')
    expect(m[0].sleutel).toContain('nog niet bekend')
  })

  it('draait ook zonder bijdragen, zoals voorheen', () => {
    expect(basis()).toHaveLength(0)
  })
})

describe('bouwMeldingen — de onderhoudsbijdrage, de randgevallen', () => {
  const dossiers: Dossier[] = [{ id: 'd1', naam: 'Kinderen', aandeelJij: 60 }]
  const maak = (extra: Partial<Onderhoudsbijdrage>): Onderhoudsbijdrage => ({
    id: 'ob1',
    dossierId: 'd1',
    richting: 'jij-ontvangt',
    basisbedrag: 25000,
    datumRegeling: '2021-09-15',
    // Expliciet, zodat deze tests niet ook de eenmalige reeks-melding van ronde 58
    // meekrijgen. Die heeft haar eigen test hieronder.
    indexreeks: 'consumptieprijzen' as const,
    ...extra,
  })
  const bel = (b: Onderhoudsbijdrage, vandaag: string, ds: Dossier[] | undefined = dossiers) =>
    basis({ onderhoudsbijdragen: [b], dossiers: ds, vandaagISO: vandaag, formatBedrag: formatEuro }).filter(
      (m) => m.soort === 'bijdrage',
    )

  it('zwijgt over een bijdrage waarvan het dossier niet meer bestaat', () => {
    // Anders staat er "De onderhoudsbijdrage van  is …" met een klik die je in een
    // willekeurig ander dossier laat landen.
    expect(bel(maak({}), '2025-09-20', [])).toHaveLength(0)
  })

  it('meldt op de dag van de verjaardag zelf', () => {
    expect(bel(maak({}), '2025-09-15')).toHaveLength(1)
  })

  it('houdt het venster op 62 dagen', () => {
    // 62 dagen na 15 september 2025 is 16 november; 63 dagen is 17 november.
    expect(bel(maak({}), '2025-11-16')).toHaveLength(1)
    expect(bel(maak({}), '2025-11-17')).toHaveLength(0)
  })

  it('noemt bij een ontbrekend cijfer de maand van de INDEX, niet die van de verjaardag', () => {
    // De verjaardag valt in september; het cijfer dat ontbreekt is dat van augustus.
    const m = bel(maak({ datumRegeling: '2021-09-10' }), '2026-09-20')
    expect(m).toHaveLength(1)
    expect(m[0].params?.maand).toBe('2026-08')
    expect(m[0].params?.datum).toBe('2026-09-10')
  })

  it('zegt het apart wanneer de aanvangsindex zelf onbekend is', () => {
    // Een vonnis van vóór de reeks. Dan is élke stap onberekend, en zou de melding
    // jaar na jaar een maand noemen die de app wél kent.
    const m = bel(maak({ datumRegeling: '2010-05-15' }), '2026-05-20')
    expect(m).toHaveLength(1)
    expect(m[0].id).toContain('aanvang')
    expect(m[0].params?.maand).toBe('2010-04')
  })

  it('geeft twee bijdragen elk hun eigen melding', () => {
    const twee = basis({
      onderhoudsbijdragen: [maak({}), maak({ id: 'ob2', dossierId: 'd2' })],
      dossiers: [...dossiers, { id: 'd2', naam: 'Tweede', aandeelJij: 50 }],
      vandaagISO: '2025-09-20',
      formatBedrag: formatEuro,
    }).filter((m) => m.soort === 'bijdrage')
    expect(twee).toHaveLength(2)
    expect(new Set(twee.map((m) => m.id)).size).toBe(2)
  })
})

describe('bouwMeldingen — een maand die nog niet afgesloten is', () => {
  const transacties = [
    tx('2026-05-03', -2500, 'ov-voeding'),
    tx('2026-06-03', -2500, 'ov-voeding'),
    tx('2026-07-03', -2500, 'ov-voeding'),
  ]
  const bel = (afsluitingen: Maandafsluiting[] | undefined, vandaag = '2026-07-10') =>
    basis({ transacties, maandafsluitingen: afsluitingen, vandaagISO: vandaag }).filter((m) => m.soort === 'maand')

  it('herinnert je aan de oudste maand, niet aan allemaal', () => {
    // Wie de app een half jaar niet opende, hoort geen zes regels te zien maar één
    // beginpunt.
    const m = bel([])
    expect(m).toHaveLength(1)
    // De maand in woorden, zoals elk ander scherm ze toont.
    expect(m[0].params?.maand).toBe(maandJaarLabel('2026-05'))
    expect(m[0].pagina).toBe('maandafsluiting')
    expect(m[0].dringend).toBe(false)
  })

  it('zegt erbij hoeveel er nog volgen', () => {
    expect(bel([])[0].sleutel).toContain('maand(en) daarna ook niet')
    expect(bel([])[0].params?.n).toBe(1)
  })

  it('schuift op zodra je de oudste afsluit', () => {
    const m = bel([{ id: '2026-05', afgeslotenOp: '2026-06-08' }])
    expect(m).toHaveLength(1)
    expect(m[0].params?.maand).toBe(maandJaarLabel('2026-06'))
    expect(m[0].sleutel).not.toContain('daarna ook niet')
  })

  it('zwijgt wanneer alles afgesloten is', () => {
    expect(
      bel([
        { id: '2026-05', afgeslotenOp: '2026-06-08' },
        { id: '2026-06', afgeslotenOp: '2026-07-08' },
      ]),
    ).toHaveLength(0)
  })

  it('zwijgt zolang de lijst niet meegegeven is', () => {
    // Zonder die lijst zou de app elke maand als niet-afgesloten lezen en meteen
    // klagen — ook bij wie de maandafsluiting nooit gebruikt.
    expect(bel(undefined)).toHaveLength(0)
  })

  it('begint niet meteen op de eerste van de maand', () => {
    // Dan staan de laatste boekingen van de vorige maand vaak nog niet op je
    // uittreksel.
    expect(bel([{ id: '2026-05', afgeslotenOp: '2026-06-08' }], '2026-07-01')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Contracten die verlengen (ronde 57)
//
// Deze meldingen gaan over een datum die één keer per jaar langskomt en die je een
// jaar aan de nieuwe prijs kost als je hem mist. Ze staan daarom hoog in de lijst.
//
// ⚠ Ze zeggen NOOIT bij welke leverancier je beter zou zitten: waarschuwen mag,
// aanbevelen is gereglementeerde bemiddeling. Zie data/opzegregels.ts.
// ---------------------------------------------------------------------------
describe('bouwMeldingen — contracten', () => {
  const contract = (over: Partial<TerugkerendePost> = {}): TerugkerendePost => ({
    id: 'p-energie',
    omschrijving: 'Energie',
    bedrag: -8000,
    rekeningId: 'r1',
    dag: 5,
    contractsoort: 'energie',
    ...over,
  })

  it('zwijgt zolang de beslisdatum ver weg ligt', () => {
    const m = basis({ terugkerendePosten: [contract({ verlengtOp: '2027-06-01' })] })
    expect(m.filter((x) => x.soort === 'contract')).toEqual([])
  })

  it('meldt het zodra de beslisdatum in zicht komt, met het aantal dagen erbij', () => {
    // Energie: één KALENDERmaand opzegtermijn. Verlengt 2026-09-01 → beslissen vóór
    // 2026-08-01. Op 2026-07-15 is dat 17 dagen weg. (Met de oude omrekening naar
    // 30 dagen stond hier 2026-08-02 en dus 18 — één dag te laat gewaarschuwd.)
    const m = basis({ terugkerendePosten: [contract({ verlengtOp: '2026-09-01' })] })
    const c = m.find((x) => x.soort === 'contract')
    expect(c?.params).toEqual({ naam: 'Energie', n: 17 })
    expect(c?.dringend).toBe(false)
    expect(c?.pagina).toBe('budget')
  })

  it('wordt dringend in de laatste week', () => {
    // Verlengt 2026-08-20 → beslissen vóór 2026-07-20, dus 5 dagen weg.
    const m = basis({ terugkerendePosten: [contract({ verlengtOp: '2026-08-20' })] })
    expect(m.find((x) => x.soort === 'contract')?.dringend).toBe(true)
  })

  it('heeft een eigen zin voor de laatste dag', () => {
    // Verlengt 2026-08-15 → beslissen vóór 2026-07-15, en dat is vandaag.
    const m = basis({ terugkerendePosten: [contract({ verlengtOp: '2026-08-15' })] })
    expect(m.find((x) => x.soort === 'contract')?.sleutel).toContain('laatste dag')
  })

  it('zegt erbij wanneer ze met de WETTELIJKE termijn rekent', () => {
    // Tweede nakijkronde van ronde 57. "Nog 17 dagen" is een zekerheid die de app
    // niet heeft: een hospitalisatieverzekering vraagt drie maanden en een abonnement
    // in zijn eerste periode volgt gewoon zijn contract. Vult de gebruiker zelf een
    // termijn in, dan is het wél zijn eigen getal en verdwijnt het voorbehoud.
    const m = basis({ terugkerendePosten: [contract({ verlengtOp: '2026-09-01' })] })
    expect(m.find((x) => x.soort === 'contract')?.sleutel).toContain('wettelijke termijn')
    const eigen = basis({
      terugkerendePosten: [contract({ verlengtOp: '2026-09-01', opzegtermijnMaanden: 1 })],
    })
    expect(eigen.find((x) => x.soort === 'contract')?.sleutel).not.toContain('wettelijke termijn')
  })

  it('zegt het wanneer de opgeslagen datum onleesbaar is', () => {
    // 30 februari bestaat niet. Vroeger zweeg het belletje hier volledig, terwijl er
    // wél contractgegevens opgeslagen waren.
    const m = basis({ terugkerendePosten: [contract({ verlengtOp: '2026-02-30' })] })
    const c = m.find((x) => x.soort === 'contract')
    expect(c?.sleutel).toContain('onleesbaar')
    expect(c?.dringend).toBe(false)
  })

  it('zet een onleesbare datum vóór een verlopen datum', () => {
    // Allebei kan de app niets uitrekenen, maar bij een onleesbare datum weet ze niet
    // eens wat er staat.
    const kapot = contract({ id: 'kapot', omschrijving: 'Alarm', verlengtOp: '2026-02-30' })
    const oud = contract({ id: 'oud', omschrijving: 'Internet', verlengtOp: '2024-01-01' })
    const namen = (posten: TerugkerendePost[]) =>
      basis({ terugkerendePosten: posten })
        .filter((x) => x.soort === 'contract')
        .map((x) => x.params?.naam)
    expect(namen([oud, kapot])).toEqual(['Alarm', 'Internet'])
    expect(namen([kapot, oud])).toEqual(['Alarm', 'Internet'])
  })

  it('vraagt de nieuwe datum wanneer de oude voorbij is en niet door te rollen valt', () => {
    const m = basis({ terugkerendePosten: [contract({ verlengtOp: '2024-01-01' })] })
    const c = m.find((x) => x.soort === 'contract')
    expect(c?.sleutel).toContain('is voorbij')
    // Niet dringend: er is niets te missen, er valt iets bij te werken.
    expect(c?.dringend).toBe(false)
  })

  it('zwijgt over een vaste last zonder contractgegevens', () => {
    const m = basis({ terugkerendePosten: [{ id: 'p1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'r1', dag: 1 }] })
    expect(m.filter((x) => x.soort === 'contract')).toEqual([])
  })

  it('zet het dringendste contract bovenaan, ook al zegt het alfabet iets anders', () => {
    // Uit de nakijkronde van ronde 57. De eindsortering vergeleek binnen dezelfde
    // soort op id, en gooide zo de volgorde weg die op dringendheid gebouwd was:
    // "Zwembad over 17 dagen" stond dan boven "Auto over 10 dagen".
    const snel = contract({ id: 'zwembad', omschrijving: 'Zwembad', verlengtOp: '2026-08-25' })
    const traag = contract({ id: 'auto', omschrijving: 'Auto', verlengtOp: '2026-09-01' })
    const namen = (posten: TerugkerendePost[]) =>
      basis({ terugkerendePosten: posten })
        .filter((x) => x.soort === 'contract')
        .map((x) => x.params?.naam)
    expect(namen([snel, traag])).toEqual(['Zwembad', 'Auto'])
    // En omgekeerd binnengekomen geeft het hetzelfde antwoord: Dexie levert op id.
    expect(namen([traag, snel])).toEqual(['Zwembad', 'Auto'])
  })

  it('zet een contract vóór een vaste last die nog niet ingeboekt is', () => {
    // Die vaste last kan morgen ook nog; de contractdatum komt één keer per jaar.
    const m = basis({
      terugkerendePosten: [contract({ verlengtOp: '2026-09-01' })],
      transacties: [],
    })
    const soorten = m.map((x) => x.soort)
    const c = soorten.indexOf('contract')
    const v = soorten.indexOf('vastelast')
    expect(c).toBeGreaterThanOrEqual(0)
    if (v >= 0) expect(c).toBeLessThan(v)
  })
})
