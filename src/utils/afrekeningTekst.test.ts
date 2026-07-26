import { describe, it, expect } from 'vitest'
import { afrekeningKosten, afrekeningSamenvatting, groepLabel, verdeelsleutelTekst, verrekenTekst } from './afrekeningTekst'
import { bouwAfrekeningOverzicht } from './afrekeningOverzicht'
import { saldoVerrekeningDossier } from './dossier'
import { formatEuro } from './format'
import { vertaal } from '../i18n'
import type { Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

const kost = (over: Partial<GedeeldeKost>): GedeeldeKost => ({
  id: 'k',
  dossierId: 'd1',
  omschrijving: 'kost',
  bedrag: 10000,
  betaaldDoor: 'jij',
  datum: '2026-07-15',
  ...over,
})

describe('verrekenTekst', () => {
  it('toont wie wie verschuldigd is', () => {
    expect(verrekenTekst(t, 5000)).toContain('Partner is jou')
    expect(verrekenTekst(t, -5000)).toContain('Jij bent partner')
    expect(verrekenTekst(t, 0)).toBe('Niets te verrekenen')
  })
})

describe('afrekeningKosten', () => {
  it('selecteert enkel de kosten uit de momentopname', () => {
    const kosten = [kost({ id: 'a' }), kost({ id: 'b' }), kost({ id: 'c' })]
    const afr: Verrekening = { id: 'v1', dossierId: 'd1', datum: '2026-07-31', bedrag: 0, kostIds: ['a', 'c'] }
    expect(afrekeningKosten(afr, kosten).map((k) => k.id)).toEqual(['a', 'c'])
  })
})

describe('afrekeningSamenvatting', () => {
  const dossier: Dossier = { id: 'd1', naam: 'Kinderen', aandeelJij: 50 }
  const kinderen: Kind[] = [{ id: 'kind1', naam: 'Emma' }]
  const kosten: GedeeldeKost[] = [
    kost({ id: 'a', omschrijving: 'Schoolreis', bedrag: 10000, betaaldDoor: 'jij', kindIds: ['kind1'] }),
  ]
  const afr: Verrekening = {
    id: 'v1',
    dossierId: 'd1',
    datum: '2026-07-31',
    bedrag: 5000,
    periodeVan: '2026-07-01',
    periodeTot: '2026-07-31',
    kindIds: ['kind1'],
    kostIds: ['a'],
  }

  it('bevat de dossiernaam, periode, kind, kostregel en het resultaat', () => {
    const tekst = afrekeningSamenvatting(t, dossier, afr, kosten, kinderen)
    expect(tekst).toContain('Afrekening — Kinderen')
    expect(tekst).toContain('2026-07-01 – 2026-07-31')
    expect(tekst).toContain('Emma')
    expect(tekst).toContain('Schoolreis')
    expect(tekst).toContain('Partner is jou')
  })

  it('zet de opmaakdatum in de kop', () => {
    const tekst = afrekeningSamenvatting(t, dossier, afr, kosten, kinderen, [], new Date(2026, 6, 26))
    expect(tekst).toContain('Opgemaakt op: 2026-07-26')
  })
})

describe('afrekeningSamenvatting — volledige, uitgesplitste afrekening', () => {
  const dossier: Dossier = {
    id: 'd1',
    naam: 'Kinderen',
    aandeelJij: 60,
    typeAandelen: { buitengewoon: 50 },
  }
  const kinderen: Kind[] = [
    { id: 'kind1', naam: 'Emma' },
    { id: 'kind2', naam: 'Lucas' },
  ]
  const kosten: GedeeldeKost[] = [
    kost({ id: 'a', omschrijving: 'Schoolreis', bedrag: 10000, betaaldDoor: 'jij', kindIds: ['kind1'], categorieId: 'ov-voeding', bonnetje: 'data:x' }),
    kost({ id: 'b', omschrijving: 'Tandarts', bedrag: 7500, betaaldDoor: 'partner', kindIds: ['kind1', 'kind2'], kostenType: 'buitengewoon', datum: '2026-07-20' }),
    kost({ id: 'c', omschrijving: 'Boekentassen', bedrag: 4501, betaaldDoor: 'jij', datum: '2026-07-03' }),
  ]
  const afr: Verrekening = {
    id: 'v1',
    dossierId: 'd1',
    datum: '2026-07-31',
    bedrag: saldoVerrekeningDossier(dossier, kosten),
    periodeVan: '2026-07-01',
    periodeTot: '2026-07-31',
    kostIds: ['a', 'b', 'c'],
  }
  const tekst = afrekeningSamenvatting(t, dossier, afr, kosten, kinderen, [], new Date(2026, 6, 26))
  const o = bouwAfrekeningOverzicht(dossier, afr, kosten, kinderen)

  it('toont de kop met periode, kinderen, datum en opmaakdatum', () => {
    expect(tekst).toContain('Periode: 2026-07-01 – 2026-07-31')
    expect(tekst).toContain('Kinderen: alle kinderen')
    expect(tekst).toContain('Datum: 2026-07-31')
    expect(tekst).toContain('Opgemaakt op: 2026-07-26')
  })

  it('toont de gebruikte verdeelsleutels met hun herkomst', () => {
    expect(tekst).toContain('VERDEELSLEUTEL')
    expect(tekst).toContain('jij 60% / partner 40% — standaardverdeling van het dossier')
    expect(tekst).toContain('jij 50% / partner 50% — afspraak voor buitengewone kosten')
  })

  it('toont de totalen, wie wat betaalde en het saldo in klare taal', () => {
    expect(tekst).toContain(`Totaal kosten: ${formatEuro(22001)}`)
    expect(tekst).toContain('Aantal kosten: 3, waarvan 1 met bon')
    expect(tekst).toContain(`Jij betaalde: ${formatEuro(14501)}`)
    expect(tekst).toContain(`Partner betaalde: ${formatEuro(7500)}`)
    expect(tekst).toContain(`Jouw aandeel: ${formatEuro(o.jouwAandeel)}`)
    expect(tekst).toContain(`Aandeel partner: ${formatEuro(o.partnerAandeel)}`)
    expect(tekst).toContain(verrekenTekst(t, o.netto))
  })

  it('toont de drie uitsplitsingen', () => {
    expect(tekst).toContain('PER KIND')
    expect(tekst).toContain('Emma')
    expect(tekst).toContain('Niet toegewezen aan een kind')
    expect(tekst).toContain('PER CATEGORIE')
    expect(tekst).toContain('Voeding')
    expect(tekst).toContain('Zonder categorie')
    expect(tekst).toContain('PER KOSTENSOORT')
    expect(tekst).toContain('Gewone kosten')
    expect(tekst).toContain('Buitengewone kosten')
  })

  it('maakt elke kostregel navolgbaar: datum, bedrag, betaler, percentage en bon', () => {
    expect(tekst).toContain(`• 2026-07-15 Schoolreis: ${formatEuro(10000)}`)
    expect(tekst).toContain(`betaald door jou · jij 60% · jouw deel ${formatEuro(6000)}`)
    expect(tekst).toContain('Emma · Voeding · bon toegevoegd')
    expect(tekst).toContain(`• 2026-07-20 Tandarts: ${formatEuro(7500)}`)
    expect(tekst).toContain('betaald door partner · jij 50%')
    expect(tekst).toContain('buitengewoon · Emma, Lucas · geen bon')
  })

  it('blijft leesbaar in WhatsApp: korte regels, geen tabs of uitgelijnde kolommen', () => {
    for (const regel of tekst.split('\n')) {
      expect(regel).not.toContain('\t')
      expect(regel).not.toMatch(/\S {3,}\S/)
      expect(regel.length).toBeLessThanOrEqual(90)
    }
  })

  it('gebruikt exact hetzelfde saldo als de rekenkern', () => {
    expect(o.netto).toBe(saldoVerrekeningDossier(dossier, kosten))
  })
})

describe('gedeelde bewoordingen', () => {
  it('vertaalt vaste noemers wel en gebruikersnamen niet', () => {
    const basis = { sleutel: 'x', aantal: 1, totaal: 0, jouwAandeel: 0, partnerAandeel: 0, betaaldDoorJou: 0, betaaldDoorPartner: 0, netto: 0 }
    expect(groepLabel(t, { ...basis, naam: 'Gewone kosten', vertaalbaar: true })).toBe('Gewone kosten')
    expect(groepLabel(t, { ...basis, naam: 'Emma', vertaalbaar: false })).toBe('Emma')
  })

  it('noemt bij een eigen percentage op de kost geen categorie of dossier', () => {
    const zin = verdeelsleutelTekst(t, { percentageJij: 80, herkomst: 'kost', bron: '', aantalKosten: 2, totaal: 5000 })
    expect(zin).toBe(`jij 80% / partner 20% — eigen percentage op de kost (2 kost(en), ${formatEuro(5000)})`)
  })
})
