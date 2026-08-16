import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import {
  filterTransacties,
  heeftActiefFilter,
  mistCategorie,
  grensDatumMaandenTerug,
  isOmgekeerdBereik,
  filterVoorCategorie,
} from './transactieFilter'

const tx = (extra: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-06-01',
  omschrijving: 'Winkel',
  bedrag: -1000,
  rekeningId: 'r1',
  ...extra,
})

describe('filterTransacties', () => {
  const lijst = [
    tx({ id: '1', omschrijving: 'Colruyt', bedrag: -5000, datum: '2026-01-10', rekeningId: 'r1', categorieId: 'i-brood--wit-9238' }),
    tx({ id: '2', omschrijving: 'Loon', bedrag: 200000, datum: '2026-02-01', rekeningId: 'r2' }),
    tx({ id: '3', omschrijving: 'Delhaize', bedrag: -3000, datum: '2026-03-15', rekeningId: 'r1' }),
  ]

  it('filtert op richting inkomst/uitgave', () => {
    expect(filterTransacties(lijst, { richting: 'in' }).map((t) => t.id)).toEqual(['2'])
    expect(filterTransacties(lijst, { richting: 'uit' }).map((t) => t.id)).toEqual(['1', '3'])
  })

  it('kijkt bij richting naar de deelregels, niet naar het totaal', () => {
    // Kassaticket van −50€ met een statiegeldregel van +3€: dat is tegelijk een
    // uitgave én (voor 3€) een inkomst. Vroeger verdween dit ticket volledig
    // onder 'Inkomsten', terwijl de Analyse die 3€ wél als inkomst toonde.
    const ticket = tx({
      id: 'ticket',
      omschrijving: 'Colruyt',
      bedrag: -4700,
      regels: [{ bedrag: -5000 }, { bedrag: 300, omschrijving: 'statiegeld' }],
    })
    expect(filterTransacties([ticket], { richting: 'in' }).map((t) => t.id)).toEqual(['ticket'])
    expect(filterTransacties([ticket], { richting: 'uit' }).map((t) => t.id)).toEqual(['ticket'])
  })

  it('laat een niet-gesplitste transactie zich exact gedragen als vroeger', () => {
    const nul = tx({ id: 'nul', bedrag: 0 })
    expect(filterTransacties([nul], { richting: 'in' })).toEqual([])
    expect(filterTransacties([nul], { richting: 'uit' })).toEqual([])
  })

  it('filtert op rekening', () => {
    expect(filterTransacties(lijst, { rekeningId: 'r2' }).map((t) => t.id)).toEqual(['2'])
  })

  it('filtert op periode (van/tot, inclusief)', () => {
    expect(filterTransacties(lijst, { van: '2026-02-01', tot: '2026-03-31' }).map((t) => t.id)).toEqual(['2', '3'])
  })

  it('zoekt in de omschrijving (hoofdletterongevoelig)', () => {
    expect(filterTransacties(lijst, { zoek: 'colr' }).map((t) => t.id)).toEqual(['1'])
  })

  it('filtert op hoofdcategorie via het item (brood -> Voeding)', () => {
    // i-brood--wit-9238 rolt op naar hoofdcategorie ov-voeding.
    expect(filterTransacties(lijst, { hoofdId: 'ov-voeding' }).map((t) => t.id)).toEqual(['1'])
  })

  it('combineert filters (AND)', () => {
    expect(filterTransacties(lijst, { richting: 'uit', rekeningId: 'r1', van: '2026-03-01' }).map((t) => t.id)).toEqual(['3'])
  })
})

describe('heeftActiefFilter', () => {
  it('is onwaar bij een leeg filter', () => {
    expect(heeftActiefFilter({})).toBe(false)
    expect(heeftActiefFilter({ zoek: '  ' })).toBe(false)
  })

  it('is waar zodra er iets ingesteld is', () => {
    expect(heeftActiefFilter({ richting: 'in' })).toBe(true)
    expect(heeftActiefFilter({ zoek: 'x' })).toBe(true)
  })
})

describe('isOmgekeerdBereik', () => {
  it('herkent een einddatum die vóór de begindatum ligt', () => {
    expect(isOmgekeerdBereik('2026-07-31', '2026-07-01')).toBe(true)
  })

  it('is onwaar bij een gewoon bereik, één dag, of een half ingevuld bereik', () => {
    expect(isOmgekeerdBereik('2026-07-01', '2026-07-31')).toBe(false)
    expect(isOmgekeerdBereik('2026-07-05', '2026-07-05')).toBe(false)
    expect(isOmgekeerdBereik('2026-07-05', undefined)).toBe(false)
    expect(isOmgekeerdBereik(undefined, '2026-07-05')).toBe(false)
    expect(isOmgekeerdBereik('', '')).toBe(false)
  })

  it('werkt over de jaargrens', () => {
    expect(isOmgekeerdBereik('2026-01-01', '2025-12-31')).toBe(true)
  })
})

describe('grensDatumMaandenTerug', () => {
  it('geeft de eerste dag van de maand, n maanden terug (n telt de huidige maand mee)', () => {
    // 6 maanden terug vanaf juni 2026 = januari 2026.
    expect(grensDatumMaandenTerug('2026-06-15', 6)).toBe('2026-01-01')
  })

  it('werkt over de jaargrens', () => {
    expect(grensDatumMaandenTerug('2026-02-10', 6)).toBe('2025-09-01')
  })
})

// --- Ronde 40: doorklikken van een cijfer naar zijn boekingen ---------------
//
// Ingebouwde ids (gecontroleerd in ingebouwd.ts): 'ov-voeding' is een
// HOOFDcategorie, 'cat-zuivel-en-kaas' een MIDDENcategorie, en
// 'i-brood--wit-9238' een ITEM dat onder Voeding valt.

describe('filterVoorCategorie', () => {
  it('maakt van een hoofdcategorie een hoofdId-filter (alles eronder telt mee)', () => {
    expect(filterVoorCategorie('ov-voeding')).toEqual({ hoofdId: 'ov-voeding' })
  })

  it('maakt van een middencategorie een catId-filter', () => {
    expect(filterVoorCategorie('cat-zuivel-en-kaas')).toEqual({ catId: 'cat-zuivel-en-kaas' })
  })

  it('maakt van een item ook een catId-filter, zodat enkel dát item overblijft', () => {
    expect(filterVoorCategorie('i-brood--wit-9238')).toEqual({ catId: 'i-brood--wit-9238' })
  })

  it('behandelt een eigen categorie van de gebruiker als een hoofdcategorie', () => {
    // Een eigen categorie staat niet in de item- of middenindex, dus valt ze in de
    // hoofd-tak. Dat klopt: alles wat erop getagd staat, hoort erbij.
    expect(filterVoorCategorie('eigen-1')).toEqual({ hoofdId: 'eigen-1' })
  })

  it('geeft samen met filterTransacties precies de boekingen van dat niveau', () => {
    const brood = tx({ id: 'brood', categorieId: 'i-brood--wit-9238' })
    const kaas = tx({ id: 'kaas', categorieId: 'cat-zuivel-en-kaas' })
    const drank = tx({ id: 'drank', categorieId: 'ov-drank' })
    const alles = [brood, kaas, drank]

    // Voeding vangt zowel het item als de middencategorie eronder.
    expect(filterTransacties(alles, filterVoorCategorie('ov-voeding')).map((t) => t.id)).toEqual(['brood', 'kaas'])
    // Het item vangt alleen zichzelf.
    expect(filterTransacties(alles, filterVoorCategorie('i-brood--wit-9238')).map((t) => t.id)).toEqual(['brood'])
  })
})

describe('filterTransacties — besparingsdomein', () => {
  // Boodschappen bundelt DRIE hoofdcategorieën (voeding, drank, huishouden). Juist
  // daarom is het een eigen filter: met één hoofdId zou de lijst minder tonen dan
  // het bedrag waarop je klikte.
  const voeding = tx({ id: 'v', categorieId: 'i-brood--wit-9238' })
  const drank = tx({ id: 'd', categorieId: 'ov-drank' })
  const wonen = tx({ id: 'w', categorieId: 'ov-woning-en-vaste-lasten' })

  it('vangt alle categorieën van het domein, niet één', () => {
    expect(filterTransacties([voeding, drank, wonen], { domein: 'boodschappen' }).map((t) => t.id)).toEqual(['v', 'd'])
  })

  it('laat wat buiten het domein valt weg', () => {
    expect(filterTransacties([wonen], { domein: 'boodschappen' })).toEqual([])
  })

  it('vangt ook een gesplitst kassaticket waarvan één regel in het domein valt', () => {
    const ticket = tx({
      id: 'ticket',
      omschrijving: 'Colruyt',
      bedrag: -6000,
      categorieId: 'ov-woning-en-vaste-lasten',
      regels: [
        { categorieId: 'ov-woning-en-vaste-lasten', bedrag: -4000 },
        { categorieId: 'i-brood--wit-9238', bedrag: -2000 },
      ],
    })
    expect(filterTransacties([ticket], { domein: 'boodschappen' }).map((t) => t.id)).toEqual(['ticket'])
  })

  it('telt mee als actief filter, zodat het historiek-venster wijkt', () => {
    expect(heeftActiefFilter({ domein: 'energie' })).toBe(true)
  })
})

describe('filter op boekingen zonder categorie (ronde 43)', () => {
  const zonder: Transactie = { id: 'a', datum: '2026-07-02', omschrijving: 'Onbekend', bedrag: -2500, rekeningId: 'r1' }
  const met: Transactie = {
    id: 'b',
    datum: '2026-07-03',
    omschrijving: 'Colruyt',
    bedrag: -4000,
    rekeningId: 'r1',
    categorieId: 'ov-voeding',
  }
  const halfGesplitst: Transactie = {
    id: 'c',
    datum: '2026-07-04',
    omschrijving: 'Delhaize',
    bedrag: -5000,
    rekeningId: 'r1',
    regels: [
      { categorieId: 'ov-voeding', bedrag: -3000 },
      { bedrag: -2000 },
    ],
  }
  const heelGesplitst: Transactie = {
    id: 'd',
    datum: '2026-07-05',
    omschrijving: 'Delhaize',
    bedrag: -5000,
    rekeningId: 'r1',
    regels: [
      { categorieId: 'ov-voeding', bedrag: -3000 },
      { categorieId: 'ov-huishouden', bedrag: -2000 },
    ],
  }
  const restZonderCategorie: Transactie = {
    id: 'e',
    datum: '2026-07-06',
    omschrijving: 'Delhaize',
    bedrag: -5000,
    rekeningId: 'r1',
    // De regels dekken maar € 30 van de € 50; de rest hangt nergens.
    regels: [{ categorieId: 'ov-voeding', bedrag: -3000 }],
  }
  const alles = [zonder, met, halfGesplitst, heelGesplitst, restZonderCategorie]

  it('houdt alleen over wat nog een categorie mist', () => {
    const uit = filterTransacties(alles, { zonderCategorie: true })
    expect(uit.map((t) => t.id)).toEqual(['a', 'c', 'e'])
  })

  it('doet niets wanneer de vlag uit staat', () => {
    expect(filterTransacties(alles, {}).length).toBe(5)
    expect(filterTransacties(alles, { zonderCategorie: false }).length).toBe(5)
  })

  it('werkt samen met de andere filters', () => {
    // Ook een AND met de maand: dat is precies hoe de maandafsluiting hem gebruikt.
    expect(filterTransacties(alles, { zonderCategorie: true, maand: '2026-07' }).length).toBe(3)
    expect(filterTransacties(alles, { zonderCategorie: true, maand: '2026-06' }).length).toBe(0)
  })

  it('mistCategorie kijkt op regelniveau, niet alleen naar het kopveld', () => {
    // Een ticket waarvan de eerste regel wél ingevuld is, zou anders nooit
    // gevonden worden — terwijl dat tweede deel van het bedrag nergens meetelt.
    expect(mistCategorie(zonder)).toBe(true)
    expect(mistCategorie(met)).toBe(false)
    expect(mistCategorie(halfGesplitst)).toBe(true)
    expect(mistCategorie(heelGesplitst)).toBe(false)
    expect(mistCategorie(restZonderCategorie)).toBe(true)
  })
})

describe('filter op handelaar (ronde 43)', () => {
  // Zoals een bankexport eruitziet: elke maand een andere datum en referentie.
  const bank: Transactie[] = ['01', '02', '03'].map((m) => ({
    id: `b${m}`,
    datum: `2026-${m}-05`,
    omschrijving: `BETALING MAESTRO 6703 NETFLIX.COM ${m}/07 REF 90000${m}`,
    bedrag: -1399,
    rekeningId: 'r1',
  }))
  const andere: Transactie = {
    id: 'x',
    datum: '2026-02-06',
    omschrijving: 'Aankoop Bancontact DELHAIZE 2530',
    bedrag: -4000,
    rekeningId: 'r1',
  }

  it('vindt alle boekingen van dezelfde handelaar, ondanks datum en referentie', () => {
    // Met een vrije zoekterm vond je er één van de drie.
    expect(filterTransacties([...bank, andere], { handelaar: bank[2].omschrijving })).toHaveLength(3)
  })

  it('houdt een andere handelaar erbuiten', () => {
    expect(filterTransacties([...bank, andere], { handelaar: 'Delhaize' }).map((t) => t.id)).toEqual(['x'])
  })

  it('telt mee als actief filter', () => {
    expect(heeftActiefFilter({ handelaar: 'Netflix' })).toBe(true)
  })
})

// --- Ronde 48: exact op de omschrijving ----------------------------------------
//
// De kaart "Uitgaven per winkel" op Analyse groepeert op de LETTERLIJKE
// omschrijving. Wie daar doorklikt, hoort exact die boekingen terug te zien —
// niet meer, want dan klopt het bedrag boven de lijst niet meer met de rij waarop
// hij klikte.
describe('filterTransacties — omschrijving', () => {
  const tx = (id: string, omschrijving: string): Transactie => ({
    id,
    datum: '2026-08-10',
    omschrijving,
    bedrag: -1000,
    rekeningId: 'r1',
  })
  const alle = [tx('a', 'Colruyt'), tx('b', 'Colruyt Collect'), tx('c', 'colruyt'), tx('d', '  Colruyt  ')]

  it('neemt alleen de exact gelijke omschrijving', () => {
    const uit = filterTransacties(alle, { omschrijving: 'Colruyt' })
    // 'Colruyt Collect' valt af: een substring-vergelijking zou hem meenemen en
    // dan stond er een hoger bedrag boven de lijst dan op de rij.
    expect(uit.map((t) => t.id)).toEqual(['a', 'd'])
  })

  it('is hoofdlettergevoelig, net als de rekenkern van de analyse', () => {
    // 'colruyt' is daar een eigen rij met een eigen bedrag. Zou dit filter de twee
    // samennemen, dan toonde elk van die rijen de som van allebei.
    expect(filterTransacties(alle, { omschrijving: 'colruyt' }).map((t) => t.id)).toEqual(['c'])
  })

  it('telt mee als actief filter', () => {
    // Zonder dit blijft het zesmaandsvenster van de lijst aanstaan, en zie je maar
    // een deel van de boekingen achter het bedrag.
    expect(heeftActiefFilter({ omschrijving: 'Colruyt' })).toBe(true)
  })
})
