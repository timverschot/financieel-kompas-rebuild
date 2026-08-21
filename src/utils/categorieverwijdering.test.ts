import { describe, it, expect } from 'vitest'
import type { Budget, Categorie, Subcategorie, Transactie } from '../data/schema'
import { categorieUndoTekst, telCategorieVerwijderen, telVerwijzingen, watGaatMee } from './categorieverwijdering'

const t = (s: string, p?: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(p?.[k] ?? `{${k}}`))

const categorieen: Categorie[] = [
  { id: 'eigen-1', naam: 'Hobby' },
  { id: 'eigen-2', naam: 'Muziek', ouderId: 'eigen-1' },
  { id: 'eigen-3', naam: 'Sport', ouderId: 'eigen-1' },
  { id: 'eigen-4', naam: 'Los', ouderId: 'ander' },
]
const subcategorieen: Subcategorie[] = [
  { id: 'sub-1', naam: 'Gitaarles', categorieId: 'eigen-2' },
  { id: 'sub-2', naam: 'Snaren', categorieId: 'eigen-2' },
  { id: 'sub-3', naam: 'Elders', categorieId: 'eigen-4' },
]
const boeking = (id: string, categorieId?: string, regels?: { categorieId?: string; bedrag: number }[]): Transactie => ({
  id,
  datum: '2026-04-01',
  omschrijving: 'Colruyt',
  bedrag: -1000,
  rekeningId: 'r1',
  ...(categorieId ? { categorieId } : {}),
  ...(regels ? { regels } : {}),
})

describe('categorieverwijdering', () => {
  it('neemt de middencategorieën en hun items mee, maar niets van een andere tak', () => {
    const { midden, items } = watGaatMee('eigen-1', categorieen, subcategorieen)
    expect(midden.map((c) => c.id)).toEqual(['eigen-2', 'eigen-3'])
    expect(items.map((s) => s.id)).toEqual(['sub-1', 'sub-2'])
  })

  it('telt ook boekingen die de categorie alleen in een split-regel gebruiken', () => {
    // ⚠ Een kassaticket hangt zijn categorie aan de REGELS, niet aan de boeking.
    // Wie alleen naar transactie.categorieId kijkt, telt die tickets niet mee en
    // zegt dus "0 boekingen" terwijl er geld aan hangt.
    const { ids } = watGaatMee('eigen-1', categorieen, subcategorieen)
    const tel = telVerwijzingen(ids, { transacties: [boeking('t1', undefined, [{ categorieId: 'sub-1', bedrag: -500 }])] })
    expect(tel.boekingen).toBe(1)
  })

  it('telt de vier soorten records die óók een categorie dragen', () => {
    // ⚠ Dit was de fout: de telling keek alleen naar boekingen en budgetten, en zei
    // dan "Er hangt niets aan deze categorie" terwijl er twaalf vaste lasten en
    // dertig gedeelde kosten aan hingen.
    const { ids } = watGaatMee('eigen-1', categorieen, subcategorieen)
    const tel = telVerwijzingen(ids, {
      terugkerendePosten: [
        { id: 'p1', omschrijving: 'Netflix', bedrag: -1500, rekeningId: 'r1', dag: 5, categorieId: 'sub-1' },
        { id: 'p2', omschrijving: 'Elders', bedrag: -1500, rekeningId: 'r1', dag: 5, categorieId: 'sub-3' },
      ],
      gedeeldeKosten: [
        { id: 'k1', dossierId: 'd1', omschrijving: 'School', bedrag: 100, betaaldDoor: 'jij', datum: '2026-01-01', categorieId: 'eigen-2' },
      ],
      kindrekeningposten: [
        { id: 'kp1', kindrekeningId: 'kr1', datum: '2026-01-01', soort: 'uitgave', bedrag: 100, categorieId: 'sub-2' },
      ],
      dossiers: [
        { id: 'd1', naam: 'Co-ouderschap', aandeelJij: 60, categorieAandelen: { 'eigen-2': 70 } },
        { id: 'd2', naam: 'Ander', aandeelJij: 50, categorieAandelen: { 'eigen-4': 70 } },
      ],
    })
    expect(tel).toMatchObject({ vasteLasten: 1, gedeeldeKosten: 1, kindrekeningposten: 1, verdeelsleutels: 1 })
  })


  it('telt budgetten op elk niveau van de tak', () => {
    const { ids } = watGaatMee('eigen-1', categorieen, subcategorieen)
    const budgetten: Budget[] = [
      { id: 'b1', categorieId: 'eigen-2', bedrag: 5000 },
      { id: 'b2', categorieId: 'eigen-4', bedrag: 5000 },
    ]
    expect(telVerwijzingen(ids, { budgetten }).budgetten).toBe(1)
  })

  it('zegt het kort wanneer er niets aan hangt', () => {
    expect(telCategorieVerwijderen(t, 'eigen-4', { categorieen, subcategorieen: [], transacties: [], budgetten: [] })).toEqual([
      'Er hangt niets aan deze categorie.',
    ])
  })

  it('somt op wat er meegaat', () => {
    const regels = telCategorieVerwijderen(t, 'eigen-1', {
      categorieen,
      subcategorieen,
      // Twee regels van één kassaticket onder dezelfde tak: dat is ÉÉN boeking.
      transacties: [boeking('t1', 'sub-1', [{ categorieId: 'sub-1', bedrag: -500 }, { categorieId: 'sub-2', bedrag: -500 }])],
      budgetten: [{ id: 'b1', categorieId: 'eigen-2', bedrag: 5000 }],
    })
    expect(regels).toEqual([
      '2 categorie(ën) eronder',
      '2 item(s) daarin',
      '1 boeking(en) blijven bestaan, maar staan daarna zonder categorienaam.',
      '1 budget(ten) hierop verliezen hun categorie.',
    ])
  })

  it('zegt op de ongedaan-balk hoeveel er meeging', () => {
    expect(categorieUndoTekst(t, 'Hobby', 0, 0)).toBe('Hobby verwijderd')
    expect(categorieUndoTekst(t, 'Hobby', 0, 3)).toBe('Hobby verwijderd, met 3 item(s)')
    expect(categorieUndoTekst(t, 'Hobby', 2, 5)).toBe('Hobby verwijderd, met 2 categorie(ën) en 5 item(s)')
  })
})
