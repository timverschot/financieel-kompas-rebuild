import { describe, it, expect } from 'vitest'
import {
  doeldekking,
  rekeningSaldo,
  spaarbareVasteLasten,
  spaardoelPlan,
  spaardoelTempo,
  spaardoelVoorVasteLast,
  spaardoelVoortgang,
  opzijVolgensSpaardoelen,
  teLaatVoorVervaldag,
  vasteLastenMetSpaardoel,
} from './spaardoel'
import type { Overboeking, Rekening, Spaardoel, TerugkerendePost, Transactie } from '../data/schema'
import { vandaag } from './datum'
import { isGestopt, opzijPerMaand } from './vastelast'

const rekeningen: Rekening[] = [{ id: 'spaar', naam: 'Spaarrekening', beginsaldo: 100000 }]
const transacties: Transactie[] = [
  { id: 't1', datum: '2026-07-01', omschrijving: 'storting', bedrag: 50000, rekeningId: 'spaar' },
  { id: 't2', datum: '2026-07-02', omschrijving: 'ander', bedrag: 9999, rekeningId: 'andere' },
]

const doel = (over: Partial<Spaardoel>): Spaardoel => ({
  id: 'd1',
  naam: 'Buffer',
  doelbedrag: 300000,
  huidigBedrag: 0,
  ...over,
})

describe('rekeningSaldo', () => {
  it('telt beginsaldo en enkel de eigen transacties op', () => {
    expect(rekeningSaldo('spaar', rekeningen, transacties, [], [])).toBe(150000)
  })
})

describe('spaardoelVoortgang', () => {
  it('gebruikt het manueel bijgehouden bedrag zonder gekoppelde rekening', () => {
    const v = spaardoelVoortgang(doel({ huidigBedrag: 150000 }), rekeningen, transacties, [], [])
    expect(v.huidig).toBe(150000)
    expect(v.resterend).toBe(150000)
    expect(v.fractie).toBeCloseTo(0.5)
  })

  it('leidt het huidige bedrag af uit de gekoppelde rekening', () => {
    const v = spaardoelVoortgang(doel({ gekoppeldeRekeningId: 'spaar' }), rekeningen, transacties, [], [])
    expect(v.huidig).toBe(150000)
  })

  it('begrenst de fractie op 1 en het resterende op 0 wanneer het doel bereikt is', () => {
    const v = spaardoelVoortgang(doel({ huidigBedrag: 400000 }), rekeningen, transacties, [], [])
    expect(v.fractie).toBe(1)
    expect(v.resterend).toBe(0)
  })

  // ⚠ RONDE 85 — `resterend` en `fractie` worden afgekapt, en dat is voor een balk ook
  // juist. Maar daardoor las de rij "nog € 0,00" bij wie er ruim over zat: hetzelfde
  // beeld als bij wie exact genoeg had. `over` draagt dat verschil.
  describe('over — hoeveel er MEER staat dan het doel vraagt', () => {
    it('noemt het bedrag wanneer je er ruim over zit', () => {
      // Doel € 3.000, gespaard € 4.000.
      const v = spaardoelVoortgang(doel({ huidigBedrag: 400000 }), rekeningen, transacties, [], [])
      expect(v.over).toBe(100000)
    })

    it('is nul wanneer je precies genoeg hebt', () => {
      const v = spaardoelVoortgang(doel({ huidigBedrag: 300000 }), rekeningen, transacties, [], [])
      expect(v.over).toBe(0)
      expect(v.resterend).toBe(0)
    })

    it('is nul zolang je er nog niet bent', () => {
      const v = spaardoelVoortgang(doel({ huidigBedrag: 150000 }), rekeningen, transacties, [], [])
      expect(v.over).toBe(0)
    })

    it('is nul bij een doel zonder bedrag — anders is élke euro "meer dan nodig"', () => {
      const v = spaardoelVoortgang(doel({ doelbedrag: 0, huidigBedrag: 5000 }), rekeningen, transacties, [], [])
      expect(v.over).toBe(0)
    })
  })
})

// Ronde 18: een spaardoel zegt nu zelf wat er per maand nodig is, hoe snel je
// effectief spaart, en of dat volstaat. De rekenkernen daarvoor (maandbedragVoorDoel,
// datumVoorDoel) bestonden al in utils/rekenhulp.ts maar stonden enkel in de losse
// Rekenhulpen-pagina.
describe('spaardoelTempo', () => {
  const doel: Spaardoel = { id: 'd1', naam: 'Buffer', doelbedrag: 500000, huidigBedrag: 0, gekoppeldeRekeningId: 'sp' }
  const spaarRekeningen: Rekening[] = [{ id: 'sp', naam: 'Spaar', beginsaldo: 0, type: 'spaar' }]

  it('meet niets bij een manueel doel zonder gekoppelde rekening', () => {
    const zonder: Spaardoel = { id: 'd2', naam: 'Los', doelbedrag: 100000, huidigBedrag: 0 }
    expect(spaardoelTempo(zonder, spaarRekeningen, [], [], [], '2026-07-15')).toEqual({ perMaand: null, gemetenMaanden: 0 })
  })

  it('meet niets zolang de rekening nog geen geschiedenis vóór het venster heeft', () => {
    // Enkel een boeking ín het venster: de rekening bestond nog niet lang genoeg.
    const tx: Transactie[] = [{ id: 't1', datum: '2026-05-10', omschrijving: 'storting', bedrag: 30000, rekeningId: 'sp' }]
    expect(spaardoelTempo(doel, spaarRekeningen, tx, [], [], '2026-07-15')).toEqual({ perMaand: null, gemetenMaanden: 0 })
  })

  it('rekent de gemiddelde groei per maand uit over de laatste drie volle maanden', () => {
    // Venster = april t/m juni. Vóór het venster staat er al iets, dus meetbaar.
    const tx: Transactie[] = [
      { id: 't0', datum: '2026-01-05', omschrijving: 'start', bedrag: 100000, rekeningId: 'sp' },
      { id: 't1', datum: '2026-04-05', omschrijving: 'storting', bedrag: 20000, rekeningId: 'sp' },
      { id: 't2', datum: '2026-05-05', omschrijving: 'storting', bedrag: 20000, rekeningId: 'sp' },
      { id: 't3', datum: '2026-06-05', omschrijving: 'storting', bedrag: 20000, rekeningId: 'sp' },
    ]
    expect(spaardoelTempo(doel, spaarRekeningen, tx, [], [], '2026-07-15')).toEqual({ perMaand: 20000, gemetenMaanden: 3 })
  })

  it('telt overboekingen naar de spaarrekening mee', () => {
    const tx: Transactie[] = [{ id: 't0', datum: '2026-01-05', omschrijving: 'start', bedrag: 100000, rekeningId: 'sp' }]
    const ob: Overboeking[] = [
      { id: 'o1', datum: '2026-04-01', vanRekeningId: 'bt', naarRekeningId: 'sp', bedrag: 15000 },
      { id: 'o2', datum: '2026-05-01', vanRekeningId: 'bt', naarRekeningId: 'sp', bedrag: 15000 },
      { id: 'o3', datum: '2026-06-01', vanRekeningId: 'bt', naarRekeningId: 'sp', bedrag: 15000 },
    ]
    expect(spaardoelTempo(doel, spaarRekeningen, tx, ob, [], '2026-07-15').perMaand).toBe(15000)
  })

  it('laat de aangebroken maand buiten het gemiddelde', () => {
    const tx: Transactie[] = [
      { id: 't0', datum: '2026-01-05', omschrijving: 'start', bedrag: 100000, rekeningId: 'sp' },
      { id: 't1', datum: '2026-07-10', omschrijving: 'grote storting', bedrag: 300000, rekeningId: 'sp' },
    ]
    // De storting van juli valt buiten het venster (april t/m juni), dus het
    // gemiddelde blijft 0 in plaats van € 1.000 per maand te suggereren.
    expect(spaardoelTempo(doel, spaarRekeningen, tx, [], [], '2026-07-15').perMaand).toBe(0)
  })
})

describe('spaardoelPlan', () => {
  const geenTempo = { perMaand: null, gemetenMaanden: 0 }
  const voortgang = (huidig: number, doelbedrag: number) => ({
    huidig,
    doel: doelbedrag,
    resterend: Math.max(doelbedrag - huidig, 0),
    fractie: Math.min(huidig / doelbedrag, 1),
    over: Math.max(huidig - doelbedrag, 0),
  })

  it('zegt hoeveel er per maand bij moet om de doeldatum te halen', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0, doeldatum: '2026-10-15' }
    const plan = spaardoelPlan(doel, voortgang(0, 600000), geenTempo, '2026-07-15')
    // Juli → oktober = 3 maandstortingen van € 2.000.
    expect(plan.maandenTotDoeldatum).toBe(3)
    expect(plan.benodigdPerMaand).toBe(200000)
    expect(plan.opSchema).toBeNull() // geen tempo bekend
  })

  it('geeft je eigen streefbedrag voorrang op het gemeten tempo', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0, doeldatum: '2026-10-15', maandbedrag: 250000 }
    const plan = spaardoelPlan(doel, voortgang(0, 600000), { perMaand: 50000, gemetenMaanden: 3 }, '2026-07-15')
    expect(plan.tempoBron).toBe('streefbedrag')
    expect(plan.tempoPerMaand).toBe(250000)
    expect(plan.opSchema).toBe(true)
  })

  it('valt terug op het gemeten tempo wanneer je geen streefbedrag invulde', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0, doeldatum: '2026-10-15' }
    const plan = spaardoelPlan(doel, voortgang(0, 600000), { perMaand: 100000, gemetenMaanden: 3 }, '2026-07-15')
    expect(plan.tempoBron).toBe('gemeten')
    expect(plan.tempoPerMaand).toBe(100000)
    // € 1.000 per maand is te weinig voor € 2.000 per maand.
    expect(plan.opSchema).toBe(false)
    expect(plan.verwachteDatum).toBe('2027-01-15')
  })

  it('negeert een tempo van nul of minder — daarmee kom je er nooit', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0 }
    const plan = spaardoelPlan(doel, voortgang(0, 600000), { perMaand: -5000, gemetenMaanden: 3 }, '2026-07-15')
    expect(plan.tempoPerMaand).toBeNull()
    expect(plan.tempoBron).toBeNull()
    expect(plan.verwachteDatum).toBeNull()
  })

  it('merkt een bereikt doel op', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 600000, doeldatum: '2026-10-15' }
    const plan = spaardoelPlan(doel, voortgang(600000, 600000), geenTempo, '2026-07-15')
    expect(plan.alBereikt).toBe(true)
    expect(plan.opSchema).toBe(true)
  })

  it('merkt een verstreken doeldatum op', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 100000, doeldatum: '2026-06-01' }
    const plan = spaardoelPlan(doel, voortgang(100000, 600000), geenTempo, '2026-07-15')
    expect(plan.datumVerstreken).toBe(true)
    expect(plan.benodigdPerMaand).toBeNull()
  })

  it('zegt niets over een doel zonder doeldatum en zonder tempo', () => {
    const doel: Spaardoel = { id: 'd1', naam: 'Auto', doelbedrag: 600000, huidigBedrag: 0 }
    const plan = spaardoelPlan(doel, voortgang(0, 600000), geenTempo, '2026-07-15')
    expect(plan).toMatchObject({
      benodigdPerMaand: null,
      maandenTotDoeldatum: null,
      tempoPerMaand: null,
      verwachteDatum: null,
      opSchema: null,
      datumVerstreken: false,
    })
  })
})

// Ronde 35: een spaardoel telde een storting mee die je alvast voor volgende maand
// had ingeboekt, terwijl de Rekeningen-pagina die nog niet toonde. Twee schermen,
// één rekening, twee bedragen.
describe('rekeningSaldo kijkt tot vandaag', () => {
  const rekening = { id: 'sp', naam: 'Spaar', beginsaldo: 500000 }

  it('telt een boeking met een datum in de toekomst niet mee', () => {
    // Bewust een jaar vooruit en niet "+30 dagen, dan naar de 1e".
    //
    // Die oude berekening ging op zeven dagen per jaar mis: begin je op de 1e van
    // een maand van 31 dagen, dan valt +30 dagen nóg in dezelfde maand, en werd
    // "later" gewoon vandaag. Dan telde de storting wél mee en ging de build rood
    // zonder dat er iets veranderd was. Een jaar erbij kan dat nooit.
    const straks = new Date()
    straks.setFullYear(straks.getFullYear() + 1)
    const later =
      straks.getFullYear() +
      '-' +
      String(straks.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(straks.getDate()).padStart(2, '0')
    const toekomst = { id: 't', datum: later, omschrijving: 'Storting', bedrag: 50000, rekeningId: 'sp' }
    expect(later > vandaag()).toBe(true)
    expect(rekeningSaldo('sp', [rekening], [toekomst], [], [])).toBe(500000)
  })

  it('telt een boeking van vandaag of eerder wél mee', () => {
    const gisteren = new Date()
    gisteren.setDate(gisteren.getDate() - 1)
    const eerder = gisteren.getFullYear() + '-' + String(gisteren.getMonth() + 1).padStart(2, '0') + '-' + String(gisteren.getDate()).padStart(2, '0')
    const gedaan = { id: 't', datum: eerder, omschrijving: 'Storting', bedrag: 50000, rekeningId: 'sp' }
    expect(rekeningSaldo('sp', [rekening], [gedaan], [], [])).toBe(550000)
  })
})

describe('spaardoelVoortgang — waarderingen (ronde 38)', () => {
  it('gebruikt de waardering van de gekoppelde rekening', () => {
    // Precies het scenario waarvoor de waardering bedacht is: je spaardoel hangt aan
    // een beleggingsrekening waarvan de waarde verandert zonder boeking. De
    // waardering ligt ná de storting, dus die zit er al in verwerkt.
    const w = [{ id: 'w1', rekeningId: 'spaar', datum: '2026-07-03', saldo: 275000 }]
    const v = spaardoelVoortgang(doel({ gekoppeldeRekeningId: 'spaar' }), rekeningen, transacties, [], w)
    expect(v.huidig).toBe(275000)
  })

  it('telt boekingen van ná de waardering er gewoon bij', () => {
    // Waardering op 30 juni, storting op 1 juli: 2.500 + 500 = 3.000.
    const w = [{ id: 'w1', rekeningId: 'spaar', datum: '2026-06-30', saldo: 250000 }]
    const v = spaardoelVoortgang(doel({ gekoppeldeRekeningId: 'spaar' }), rekeningen, transacties, [], w)
    expect(v.huidig).toBe(300000)
  })
})

describe('spaardoelTempo — een herwaardering is geen spaargedrag', () => {
  it('zwijgt over het tempo wanneer er een waardering in het meetvenster ligt', () => {
    // Een koerssprong van € 3.000 delen door drie en presenteren als "je spaart
    // € 1.000 per maand" zou een cijfer opleveren waar je op rekent en dat nergens
    // op slaat. Dan zeggen we liever niets.
    const doelMetRekening = doel({ gekoppeldeRekeningId: 'spaar' })
    const tx: Transactie[] = [
      { id: 'oud', datum: '2026-01-01', omschrijving: 'start', bedrag: 10000, rekeningId: 'spaar' },
    ]
    const w = [{ id: 'w1', rekeningId: 'spaar', datum: '2026-05-01', saldo: 400000 }]
    expect(spaardoelTempo(doelMetRekening, rekeningen, tx, [], w, '2026-07-15')).toEqual({
      perMaand: null,
      gemetenMaanden: 0,
    })
  })

  it('rekent gewoon door wanneer de waardering buiten het venster ligt', () => {
    const doelMetRekening = doel({ gekoppeldeRekeningId: 'spaar' })
    const tx: Transactie[] = [
      { id: 'oud', datum: '2023-01-01', omschrijving: 'start', bedrag: 10000, rekeningId: 'spaar' },
    ]
    const w = [{ id: 'w1', rekeningId: 'spaar', datum: '2024-01-01', saldo: 400000 }]
    expect(spaardoelTempo(doelMetRekening, rekeningen, tx, [], w, '2026-07-15').gemetenMaanden).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Ronde 74 — een spaardoel dat weet welke vaste last het dient
// ---------------------------------------------------------------------------

const premie: TerugkerendePost = {
  id: 'vl1',
  omschrijving: 'Autoverzekering',
  bedrag: -62000,
  rekeningId: 'zicht',
  dag: 5,
  frequentie: 'jaar',
  startMaand: '2027-03',
  opbouwen: true,
}

describe('spaarbareVasteLasten', () => {
  it('laat een maandelijkse kost weg', () => {
    // Voor een kost die elke maand valt, spaar je niet vooruit: je betaalt hem uit
    // het loon van diezelfde maand. Een pot die elke maand weer leeg is, is geen doel.
    const huur: TerugkerendePost = { id: 'vl2', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'zicht', dag: 3 }
    expect(spaarbareVasteLasten([premie, huur], '2026-08').map((p) => p.id)).toEqual(['vl1'])
  })

  it('laat een inkomst en een gestopte kost weg', () => {
    const inkomst: TerugkerendePost = {
      id: 'vl3', omschrijving: 'Kotgeld', bedrag: 40000, rekeningId: 'zicht', dag: 1, frequentie: 'jaar', startMaand: '2027-01',
    }
    const gestopt: TerugkerendePost = { ...premie, id: 'vl4', eindMaand: '2026-01' }
    expect(spaarbareVasteLasten([premie, inkomst, gestopt], '2026-08').map((p) => p.id)).toEqual(['vl1'])
  })
})

describe('vasteLastenMetSpaardoel', () => {
  it('verzamelt alleen de posten waar echt een doel aan hangt', () => {
    const met = doel({ id: 'd1', vasteLastId: 'vl1' })
    const zonder = doel({ id: 'd2' })
    const set = vasteLastenMetSpaardoel([met, zonder])
    expect(set.has('vl1')).toBe(true)
    expect(set.size).toBe(1)
  })
})

describe('spaardoelVoorVasteLast', () => {
  it('vindt het doel dat bij een post hoort, en anders null', () => {
    const d = doel({ vasteLastId: 'vl1' })
    expect(spaardoelVoorVasteLast('vl1', [d])?.id).toBe('d1')
    expect(spaardoelVoorVasteLast('vl9', [d])).toBeNull()
  })
})

describe('doeldekking — wat er over de koppeling te zeggen valt', () => {
  it('zwijgt bij een doel zonder koppeling', () => {
    expect(doeldekking(doel({}), [premie], '2026-08-24')).toEqual({ soort: 'geen' })
  })

  it('meldt het wanneer de vaste last niet meer bestaat', () => {
    // ⚠ Het doel blijft gewoon lopen: je spaargeld is niet verdwenen omdat de kost
    // uit je lijst gehaald is. Maar het scherm hoort te zeggen waarom er niets meer
    // over die kost staat.
    expect(doeldekking(doel({ vasteLastId: 'vl1' }), [], '2026-08-24')).toEqual({ soort: 'verdwenen' })
  })

  it('meldt het wanneer de vaste last opgezegd is', () => {
    const gestopt = { ...premie, eindMaand: '2026-01' }
    const uit = doeldekking(doel({ vasteLastId: 'vl1' }), [gestopt], '2026-08-24')
    expect(uit.soort).toBe('gestopt')
  })

  it('geeft de vervaldag en het volle bedrag van één betaling', () => {
    const uit = doeldekking(doel({ vasteLastId: 'vl1', doelbedrag: 62000 }), [premie], '2026-08-24')
    expect(uit).toMatchObject({ soort: 'loopt', vervaldag: '2027-03-05', bedrag: 62000, bedragWijktAf: false })
  })

  it('merkt op dat je doelbedrag iets anders zegt dan de kost', () => {
    // ⚠ Alleen OPMERKEN. De app zet je doelbedrag nooit uit zichzelf goed: misschien
    // spaar je bewust voor twee jaar vooruit, of legde je de premie van vorig jaar vast.
    const uit = doeldekking(doel({ vasteLastId: 'vl1', doelbedrag: 68000 }), [premie], '2026-08-24')
    expect(uit).toMatchObject({ bedragWijktAf: true })
  })

  it('merkt op dat je doeldatum ná de betaling ligt', () => {
    const uit = doeldekking(doel({ vasteLastId: 'vl1', doeldatum: '2027-06-01' }), [premie], '2026-08-24')
    expect(uit).toMatchObject({ datumNaVervaldag: true })
  })

  it('waarschuwt NIET wanneer de doeldatum precies op de vervaldag valt', () => {
    // Exact goed mag geen waarschuwing geven; anders leert de gebruiker de melding
    // te negeren op het moment dat hij het juist perfect gedaan heeft.
    const uit = doeldekking(doel({ vasteLastId: 'vl1', doeldatum: '2027-03-05' }), [premie], '2026-08-24')
    expect(uit).toMatchObject({ datumNaVervaldag: false })
  })

  it('herkent een post waarvan de laatste betaling al geweest is', () => {
    // ⚠ Deze post is NIET gestopt (de eindmaand is nog niet bereikt), maar zijn
    // volgende beurt ligt er wel voorbij. Er komt dus nooit meer een betaling. Zonder
    // dit eigen geval zei het scherm alleen "Voor Autoverzekering." en bleef je sparen
    // voor iets wat niet meer valt.
    const laatste = { ...premie, eindMaand: '2027-06' }
    expect(isGestopt(laatste, '2027-04')).toBe(false)
    const uit = doeldekking(doel({ vasteLastId: 'vl1', doeldatum: '2030-01-01' }), [laatste], '2027-04-01')
    expect(uit).toEqual({ soort: 'uitbetaald', post: laatste })
  })
})


describe('opzijVolgensSpaardoelen', () => {
  it('neemt het streefbedrag van het doel over', () => {
    const d = doel({ vasteLastId: 'vl1', maandbedrag: 7500 })
    expect(opzijVolgensSpaardoelen([d], [premie]).get('vl1')).toBe(7500)
  })

  it('valt zonder streefbedrag terug op de kale deling', () => {
    // ⚠ Dan verandert er niets aan het bedrag op Budget, en dat is de bedoeling: de
    // app mag geen reservering laten verdampen omdat je een doel aanmaakte.
    const d = doel({ vasteLastId: 'vl1' })
    expect(opzijVolgensSpaardoelen([d], [premie]).get('vl1')).toBe(opzijPerMaand(premie))
  })

  it('telt twee doelen op dezelfde kost bij elkaar op', () => {
    // Je stort dan ook echt twee keer; het scherm zegt het erbij.
    const a = doel({ id: 'a', vasteLastId: 'vl1', maandbedrag: 3000 })
    const b = doel({ id: 'b', vasteLastId: 'vl1', maandbedrag: 2000 })
    expect(opzijVolgensSpaardoelen([a, b], [premie]).get('vl1')).toBe(5000)
  })

  it('zet niets in je plan voor een inkomst of een maandelijkse post', () => {
    // ⚠ Alleen bereikbaar via een oud logboekbestand, maar het gevolg zou een bedrag
    // in je plan zijn dat daar niet hoort.
    const inkomst: TerugkerendePost = { id: 'i1', omschrijving: 'Loon', bedrag: 240000, rekeningId: 'zicht', dag: 25, frequentie: 'jaar', startMaand: '2027-01' }
    const maandelijks: TerugkerendePost = { id: 'm1', omschrijving: 'Huur', bedrag: -95000, rekeningId: 'zicht', dag: 3 }
    const doelen = [doel({ id: 'a', vasteLastId: 'i1', maandbedrag: 1000 }), doel({ id: 'b', vasteLastId: 'm1', maandbedrag: 1000 })]
    expect(opzijVolgensSpaardoelen(doelen, [inkomst, maandelijks]).size).toBe(0)
  })

  it('negeert een doel dat naar een onbekende post wijst', () => {
    expect(opzijVolgensSpaardoelen([doel({ vasteLastId: 'weg' })], [premie]).size).toBe(0)
  })
})

describe('teLaatVoorVervaldag', () => {
  const dekking = () => doeldekking(doel({ vasteLastId: 'vl1' }), [premie], '2026-08-24')

  it('zegt het wanneer je aan je tempo pas ná de betaling genoeg hebt', () => {
    // ⚠ De app kende beide datums en zweeg: "zo klaar rond mei 2028" naast "de
    // volgende keer op 5 maart 2027", en jij mocht ze zelf vergelijken.
    const plan = { alBereikt: false, benodigdPerMaand: null, maandenTotDoeldatum: null, datumVerstreken: false,
      tempoPerMaand: 3000, tempoBron: 'streefbedrag' as const, verwachteDatum: '2028-05-01', opSchema: null }
    expect(teLaatVoorVervaldag(dekking(), plan)).toBe(true)
  })

  it('zwijgt wanneer je op tijd bent, wanneer het doel al gehaald is, of zonder verwachte datum', () => {
    const basis = { benodigdPerMaand: null, maandenTotDoeldatum: null, datumVerstreken: false,
      tempoPerMaand: 3000, tempoBron: 'streefbedrag' as const, opSchema: null }
    expect(teLaatVoorVervaldag(dekking(), { ...basis, alBereikt: false, verwachteDatum: '2027-01-01' })).toBe(false)
    expect(teLaatVoorVervaldag(dekking(), { ...basis, alBereikt: true, verwachteDatum: '2028-05-01' })).toBe(false)
    expect(teLaatVoorVervaldag(dekking(), { ...basis, alBereikt: false, verwachteDatum: null })).toBe(false)
  })

  it('zwijgt bij een doel zonder koppeling', () => {
    const plan = { alBereikt: false, benodigdPerMaand: null, maandenTotDoeldatum: null, datumVerstreken: false,
      tempoPerMaand: 3000, tempoBron: 'streefbedrag' as const, verwachteDatum: '2099-01-01', opSchema: null }
    expect(teLaatVoorVervaldag({ soort: 'geen' }, plan)).toBe(false)
  })
})
