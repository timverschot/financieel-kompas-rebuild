import { describe, it, expect } from 'vitest'
import { rekeningSaldo, spaardoelPlan, spaardoelTempo, spaardoelVoortgang } from './spaardoel'
import type { Overboeking, Rekening, Spaardoel, Transactie } from '../data/schema'

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
    expect(rekeningSaldo('spaar', rekeningen, transacties)).toBe(150000)
  })
})

describe('spaardoelVoortgang', () => {
  it('gebruikt het manueel bijgehouden bedrag zonder gekoppelde rekening', () => {
    const v = spaardoelVoortgang(doel({ huidigBedrag: 150000 }), rekeningen, transacties)
    expect(v.huidig).toBe(150000)
    expect(v.resterend).toBe(150000)
    expect(v.fractie).toBeCloseTo(0.5)
  })

  it('leidt het huidige bedrag af uit de gekoppelde rekening', () => {
    const v = spaardoelVoortgang(doel({ gekoppeldeRekeningId: 'spaar' }), rekeningen, transacties)
    expect(v.huidig).toBe(150000)
  })

  it('begrenst de fractie op 1 en het resterende op 0 wanneer het doel bereikt is', () => {
    const v = spaardoelVoortgang(doel({ huidigBedrag: 400000 }), rekeningen, transacties)
    expect(v.fractie).toBe(1)
    expect(v.resterend).toBe(0)
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
    expect(spaardoelTempo(zonder, spaarRekeningen, [], [], '2026-07-15')).toEqual({ perMaand: null, gemetenMaanden: 0 })
  })

  it('meet niets zolang de rekening nog geen geschiedenis vóór het venster heeft', () => {
    // Enkel een boeking ín het venster: de rekening bestond nog niet lang genoeg.
    const tx: Transactie[] = [{ id: 't1', datum: '2026-05-10', omschrijving: 'storting', bedrag: 30000, rekeningId: 'sp' }]
    expect(spaardoelTempo(doel, spaarRekeningen, tx, [], '2026-07-15')).toEqual({ perMaand: null, gemetenMaanden: 0 })
  })

  it('rekent de gemiddelde groei per maand uit over de laatste drie volle maanden', () => {
    // Venster = april t/m juni. Vóór het venster staat er al iets, dus meetbaar.
    const tx: Transactie[] = [
      { id: 't0', datum: '2026-01-05', omschrijving: 'start', bedrag: 100000, rekeningId: 'sp' },
      { id: 't1', datum: '2026-04-05', omschrijving: 'storting', bedrag: 20000, rekeningId: 'sp' },
      { id: 't2', datum: '2026-05-05', omschrijving: 'storting', bedrag: 20000, rekeningId: 'sp' },
      { id: 't3', datum: '2026-06-05', omschrijving: 'storting', bedrag: 20000, rekeningId: 'sp' },
    ]
    expect(spaardoelTempo(doel, spaarRekeningen, tx, [], '2026-07-15')).toEqual({ perMaand: 20000, gemetenMaanden: 3 })
  })

  it('telt overboekingen naar de spaarrekening mee', () => {
    const tx: Transactie[] = [{ id: 't0', datum: '2026-01-05', omschrijving: 'start', bedrag: 100000, rekeningId: 'sp' }]
    const ob: Overboeking[] = [
      { id: 'o1', datum: '2026-04-01', vanRekeningId: 'bt', naarRekeningId: 'sp', bedrag: 15000 },
      { id: 'o2', datum: '2026-05-01', vanRekeningId: 'bt', naarRekeningId: 'sp', bedrag: 15000 },
      { id: 'o3', datum: '2026-06-01', vanRekeningId: 'bt', naarRekeningId: 'sp', bedrag: 15000 },
    ]
    expect(spaardoelTempo(doel, spaarRekeningen, tx, ob, '2026-07-15').perMaand).toBe(15000)
  })

  it('laat de aangebroken maand buiten het gemiddelde', () => {
    const tx: Transactie[] = [
      { id: 't0', datum: '2026-01-05', omschrijving: 'start', bedrag: 100000, rekeningId: 'sp' },
      { id: 't1', datum: '2026-07-10', omschrijving: 'grote storting', bedrag: 300000, rekeningId: 'sp' },
    ]
    // De storting van juli valt buiten het venster (april t/m juni), dus het
    // gemiddelde blijft 0 in plaats van € 1.000 per maand te suggereren.
    expect(spaardoelTempo(doel, spaarRekeningen, tx, [], '2026-07-15').perMaand).toBe(0)
  })
})

describe('spaardoelPlan', () => {
  const geenTempo = { perMaand: null, gemetenMaanden: 0 }
  const voortgang = (huidig: number, doelbedrag: number) => ({
    huidig,
    doel: doelbedrag,
    resterend: Math.max(doelbedrag - huidig, 0),
    fractie: Math.min(huidig / doelbedrag, 1),
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
