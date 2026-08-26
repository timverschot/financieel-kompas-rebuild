import { describe, it, expect } from 'vitest'
import { isSluipendeLast, overigeSluipendeLasten } from './sluipend'
import { KLASSIEKE_VASTE_KOSTEN, SLUIPEND_ANDERS, SLUIPENDE_KOSTEN } from '../data/opstelling'
import type { TerugkerendePost } from '../data/schema'

const post = (over: Partial<TerugkerendePost> = {}): TerugkerendePost => ({
  id: 'p',
  omschrijving: 'Iets',
  bedrag: -1599,
  rekeningId: 'r1',
  dag: 8,
  ...over,
})

// De categorie van het eerste voorstel uit de lijst — uit de lijst zelf gehaald en niet
// overgeschreven, zodat deze test niet omvalt wanneer die ooit verhuist.
const SLUIPENDE_CATEGORIE = SLUIPENDE_KOSTEN[0].categorieId

describe('isSluipendeLast — de categorie', () => {
  it('herkent een post in een categorie uit de lijst', () => {
    expect(isSluipendeLast(post({ categorieId: SLUIPENDE_CATEGORIE }))).toBe(true)
  })

  it('laat een post in een andere categorie met rust', () => {
    expect(isSluipendeLast(post({ categorieId: 'ov-woning-en-vaste-lasten' }))).toBe(false)
  })

  it('telt een post zonder categorie niet mee', () => {
    expect(isSluipendeLast(post({ categorieId: undefined }))).toBe(false)
  })
})

describe('isSluipendeLast — jouw eigen woord (ronde 84)', () => {
  it('telt mee zodra je hem onder "Een andere sluipende last" toevoegde', () => {
    // ⚠ Zonder deze tweede reden moest jij raden welke categorie de app bedoelde, en
    // raadde je fout, dan telde je abonnement stil niet mee.
    expect(isSluipendeLast(post({ bronVoorstel: SLUIPEND_ANDERS.sleutel, categorieId: undefined }))).toBe(true)
  })

  it('telt ook mee met een categorie die er niets mee te maken heeft', () => {
    // Jij zei dat het een klein abonnement is. De app hoeft dat niet af te leiden.
    expect(
      isSluipendeLast(post({ bronVoorstel: SLUIPEND_ANDERS.sleutel, categorieId: 'ov-woning-en-vaste-lasten' })),
    ).toBe(true)
  })

  it('laat een post uit een ANDER voorstel met rust', () => {
    expect(isSluipendeLast(post({ bronVoorstel: 'huur', categorieId: 'ov-woning-en-vaste-lasten' }))).toBe(false)
  })
})

describe('overigeSluipendeLasten', () => {
  // De stub die zegt onder welk voorstel een post hoort. Het echte scherm kent de
  // naamtabel in drie talen; deze module hoeft daar niets van te weten.
  const onder = (paren: Record<string, string>) => (p: TerugkerendePost) => paren[p.id]

  it('verzamelt een sluipende last die onder geen enkel voorstel valt', () => {
    // ⚠ Dit is het gat dat er al langer zat: "Le Soir" met de categorie van een
    // krantenabonnement telde wél mee in het cijfer, maar stond onder geen enkele rij.
    const soir = post({ id: 'soir', omschrijving: 'Le Soir', categorieId: SLUIPENDE_CATEGORIE })
    expect(overigeSluipendeLasten([soir], onder({}))).toEqual([soir])
  })

  it('verzamelt wat je via de rij zelf toevoegde', () => {
    const eigen = post({ id: 'e', bronVoorstel: SLUIPEND_ANDERS.sleutel })
    expect(overigeSluipendeLasten([eigen], onder({ e: SLUIPEND_ANDERS.sleutel }))).toEqual([eigen])
  })

  it('laat een post die WÉL onder een voorstel valt aan die rij', () => {
    // Anders stond je Netflix twee keer op het scherm.
    const netflix = post({ id: 'n', omschrijving: 'Netflix', categorieId: SLUIPENDE_CATEGORIE })
    expect(overigeSluipendeLasten([netflix], onder({ n: 'netflix' }))).toEqual([])
  })

  it('laat een gewone vaste last er helemaal buiten', () => {
    const huur = post({ id: 'h', omschrijving: 'Huur', bedrag: -95000, categorieId: 'ov-woning-en-vaste-lasten' })
    expect(overigeSluipendeLasten([huur], onder({}))).toEqual([])
  })

  it('houdt de volgorde van de lijst aan', () => {
    const een = post({ id: '1', bronVoorstel: SLUIPEND_ANDERS.sleutel })
    const twee = post({ id: '2', bronVoorstel: SLUIPEND_ANDERS.sleutel })
    expect(overigeSluipendeLasten([een, twee], onder({}))).toEqual([een, twee])
  })
})

// ⚠ RONDE 84, doorlichting — DE KLACHT STOND ÉÉN RIJ HOGER NOG ALTIJD OVEREIND.
// De eerste versie van deze ronde liet alleen `sluipend-anders` als eigen woord tellen.
// Maar klik je "Toevoegen" op de rij Netflix en wis je de voorgestelde categorie — of
// verhang je hem naar iets van jou — dan viel je abonnement stil buiten "Waarvan
// sluipend" én buiten het blok waarin je het net had gezet. Exact wat Timothy schreef,
// alleen op een andere rij. Elk sluipend voorstel stempelt nu.
describe('isSluipendeLast — het voorstel waarop je klikte', () => {
  it('telt een post mee die van een sluipend voorstel komt, ook zonder categorie', () => {
    for (const v of SLUIPENDE_KOSTEN) {
      expect(isSluipendeLast(post({ bronVoorstel: v.sleutel, categorieId: undefined }))).toBe(true)
    }
  })

  it('telt hem ook mee wanneer je zelf een andere categorie koos', () => {
    const eigen = post({ bronVoorstel: 'netflix', categorieId: 'ov-woning-en-vaste-lasten' })
    expect(isSluipendeLast(eigen)).toBe(true)
  })

  it('laat een KLASSIEK voorstel er buiten', () => {
    // Anders telde je huur mee als sluipende last.
    for (const v of KLASSIEKE_VASTE_KOSTEN) {
      expect(isSluipendeLast(post({ bronVoorstel: v.sleutel, categorieId: undefined }))).toBe(false)
    }
  })

  it('trapt niet in een verzonnen sleutel', () => {
    expect(isSluipendeLast(post({ bronVoorstel: 'bestaat-niet', categorieId: undefined }))).toBe(false)
  })
})

describe('SLUIPEND_ANDERS', () => {
  it('staat bewust NIET in de lijst met voorstellen', () => {
    // Anders zou ze meetellen in "je vulde er 3 van de 18 in", en zou haar lege
    // categorie-id tegen de categorieboom gehouden worden.
    expect(SLUIPENDE_KOSTEN.map((k) => k.sleutel)).not.toContain(SLUIPEND_ANDERS.sleutel)
  })

  it('vult geen naam en geen categorie voor je in', () => {
    expect(SLUIPEND_ANDERS.vrijeNaam).toBe(true)
    expect(SLUIPEND_ANDERS.categorieId).toBe('')
  })
})
