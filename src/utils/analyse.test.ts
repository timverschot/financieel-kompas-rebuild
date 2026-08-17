import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import {
  inPeriode,
  perHoofdcategorie,
  perItem,
  perWinkel,
  drillTransacties,
  drillPerItem,
  totaalVan,
} from './analyse'

// Ingebouwde ids (gecontroleerd in ingebouwd.ts): hoofdcategorie 'ov-voeding'
// (Voeding), item 'i-brood--wit-9238' (Brood (wit)) rolt op naar Voeding.
const BROOD = 'i-brood--wit-9238'
const MID_BROOD = 'cat-broodwaren'
const VOEDING = 'ov-voeding'

function tx(over: Partial<Transactie>): Transactie {
  return {
    id: over.id ?? 'x',
    datum: over.datum ?? '2026-07-10',
    omschrijving: over.omschrijving ?? '',
    bedrag: over.bedrag ?? 0,
    rekeningId: 'r1',
    ...(over.categorieId ? { categorieId: over.categorieId } : {}),
    ...(over.regels ? { regels: over.regels } : {}),
  }
}

const OPEN = {}

describe('analyse — inPeriode', () => {
  it('respecteert van en tot inclusief', () => {
    expect(inPeriode('2026-07-10', { van: '2026-07-01', tot: '2026-07-31' })).toBe(true)
    expect(inPeriode('2026-07-01', { van: '2026-07-01', tot: '2026-07-31' })).toBe(true)
    expect(inPeriode('2026-06-30', { van: '2026-07-01' })).toBe(false)
    expect(inPeriode('2026-08-01', { tot: '2026-07-31' })).toBe(false)
    expect(inPeriode('1999-01-01', OPEN)).toBe(true)
  })
})

describe('analyse — perHoofdcategorie', () => {
  it('rolt items op naar hun hoofdcategorie en telt op', () => {
    const txs = [
      tx({ id: 'a', categorieId: BROOD, bedrag: -500 }),
      tx({ id: 'b', categorieId: VOEDING, bedrag: -300 }),
      tx({ id: 'c', categorieId: BROOD, bedrag: 1000 }), // inkomst, telt niet mee bij uitgave
    ]
    const r = perHoofdcategorie(txs, [], OPEN, 'uitgave')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ sleutel: VOEDING, naam: 'Voeding', bedrag: 800, kleur: '#F59E0B' })
  })

  it('scheidt uitgave en inkomst via de richting', () => {
    const txs = [tx({ categorieId: BROOD, bedrag: 1000 })]
    expect(perHoofdcategorie(txs, [], OPEN, 'uitgave')).toHaveLength(0)
    expect(perHoofdcategorie(txs, [], OPEN, 'inkomst')[0].bedrag).toBe(1000)
  })
})

describe('analyse — perItem', () => {
  it('groepeert op het leaf-label en zet ontbrekende categorie op Zonder categorie', () => {
    const txs = [
      tx({ categorieId: BROOD, bedrag: -500 }),
      tx({ bedrag: -200 }), // geen categorie
    ]
    const r = perItem(txs, [], OPEN, 'uitgave')
    expect(r).toEqual([
      // Sinds ronde 49 draagt een rij haar sleutel mee zodra die eenduidig is, zodat
      // je kan doorklikken naar de boekingen erachter.
      { naam: 'Brood (wit)', bedrag: 500, sleutel: BROOD },
      // Sinds ronde 51 draagt deze rij een eigen markering: er bestaat een filter
      // `zonderCategorie`, dus hoeft ze niet dood te lopen.
      { naam: 'Zonder categorie', bedrag: 200, zonderCategorie: true },
    ])
  })

  // Ronde 49: wanneer mag een rij een sleutel dragen?
  it('geeft GEEN sleutel wanneer twee categorieën in dezelfde rij vallen', () => {
    // `labelVanCategorie` noemt elk onbekend id 'Onbekend', dus die rollen samen in
    // één rij. Geen enkel filter wijst die rij dan precies aan.
    const txs = [
      tx({ categorieId: 'i-bestaat-niet-1', bedrag: -500 }),
      tx({ categorieId: 'i-bestaat-niet-2', bedrag: -300 }),
    ]
    const r = perItem(txs, [], OPEN, 'uitgave')
    expect(r).toHaveLength(1)
    expect(r[0].bedrag).toBe(800)
    expect(r[0].sleutel).toBeUndefined()
  })

  it('geeft GEEN sleutel aan een boeking op een middencategorie', () => {
    // Een filter op een middencategorie vangt ook alles wat eronder hangt, terwijl
    // deze telling alleen meeneemt wat rechtstreeks op die categorie staat. Klikte
    // je op € 3,00, dan toonde de lijst € 43,00.
    const r = perItem([tx({ categorieId: MID_BROOD, bedrag: -300 })], [], OPEN, 'uitgave')
    expect(r).toHaveLength(1)
    expect(r[0].sleutel).toBeUndefined()
  })
})

describe('analyse — perWinkel', () => {
  it('groepeert op de omschrijving en negeert lege omschrijvingen', () => {
    const txs = [
      tx({ omschrijving: 'Colruyt', bedrag: -500 }),
      tx({ omschrijving: 'Colruyt', bedrag: -300 }),
      tx({ omschrijving: '', bedrag: -100 }),
    ]
    const r = perWinkel(txs, OPEN, 'uitgave')
    expect(r).toEqual([{ naam: 'Colruyt', bedrag: 800 }])
  })
})

describe('analyse — split-kassaticket', () => {
  it('telt elke regel bij haar eigen categorie en de rest bij Zonder categorie', () => {
    // Totaal -1000, regel -600 brood; rest -400 zonder categorie.
    const txs = [
      tx({
        omschrijving: 'Colruyt',
        bedrag: -1000,
        regels: [{ categorieId: BROOD, bedrag: -600 }],
      }),
    ]
    const hoofd = perHoofdcategorie(txs, [], OPEN, 'uitgave')
    expect(hoofd.find((g) => g.sleutel === VOEDING)?.bedrag).toBe(600)
    expect(hoofd.find((g) => g.naam === 'Zonder categorie')?.bedrag).toBe(400)
    // De winkel krijgt het volledige bedrag van 1000.
    expect(perWinkel(txs, OPEN, 'uitgave')).toEqual([{ naam: 'Colruyt', bedrag: 1000 }])
  })
})

describe('analyse — drill', () => {
  it('geeft de transacties en subcategorieën binnen een hoofdcategorie', () => {
    const txs = [
      tx({ id: 'a', datum: '2026-07-05', categorieId: BROOD, bedrag: -500 }),
      tx({ id: 'b', datum: '2026-07-20', categorieId: VOEDING, bedrag: -300 }),
      tx({ id: 'c', datum: '2026-07-09', omschrijving: 'Media', bedrag: -700 }), // andere groep
    ]
    const drill = drillTransacties(txs, [], OPEN, 'uitgave', VOEDING)
    expect(drill.map((d) => d.transactie.id)).toEqual(['b', 'a']) // nieuwste eerst
    expect(totaalVan(drill.map((d) => ({ bedrag: d.bedrag })))).toBe(800)

    const perSub = drillPerItem(drill, [])
    expect(perSub).toEqual([
      { naam: 'Voeding', bedrag: 300, sleutel: VOEDING },
      { naam: 'Brood (wit)', bedrag: 500, sleutel: BROOD },
    ].sort((a, b) => b.bedrag - a.bedrag))
  })
})

describe('analyse — de rij "Zonder categorie"', () => {
  // Ronde 51. Dit was de enige rij die doodliep terwijl de app precies wist welke
  // boekingen ze bedoelde — en juist die wil je openen: het zijn de uitgaven die je
  // nog moet indelen.

  it('markeert alleen een rij waarvan élke regel zonder categorie is', () => {
    const r = perItem([tx({ bedrag: -200 })], [], OPEN, 'uitgave')
    expect(r[0]).toMatchObject({ naam: 'Zonder categorie', zonderCategorie: true })
    expect(r[0].sleutel).toBeUndefined()
  })

  it('markeert een gewone rij niet', () => {
    const r = perItem([tx({ categorieId: BROOD, bedrag: -500 })], [], OPEN, 'uitgave')
    expect(r[0].zonderCategorie).toBeUndefined()
  })

  it('markeert ook de rij in de drilldown per subcategorie', () => {
    const sub = drillPerItem(drillTransacties([tx({ bedrag: -400 })], [], OPEN, 'uitgave', ''), [])
    expect(sub[0]).toMatchObject({ naam: 'Zonder categorie', zonderCategorie: true })
  })
})
