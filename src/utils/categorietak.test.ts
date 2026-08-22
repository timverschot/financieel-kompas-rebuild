import { describe, it, expect } from 'vitest'
import { bouwTak, schoneNaam } from './categorietak'

// De regel achter "+ … toevoegen aan …" in het boekingsvenster (ronde 67).
//
// Waarom dit een zuivere functie is en geen stuk component: ze bepaalt WELKE
// records er ontstaan en in welke volgorde ze het logboek in gaan. Dat is precies
// het soort ding dat je zonder browser en zonder database wil kunnen nakijken.

// Een voorspelbare id-generator, zodat een test kan zeggen wát er weggeschreven wordt.
function teller() {
  let n = 0
  return () => `id-${++n}`
}

describe('bouwTak — een bestaande categorie', () => {
  it('maakt alleen de subcategorie', () => {
    const uit = bouwTak({ subnaam: 'Kefir', categorie: { id: 'cat-zuivel-en-kaas' } }, teller())
    expect(uit.categorieen).toEqual([])
    expect(uit.subcategorie).toEqual({ id: 'id-1', naam: 'Kefir', categorieId: 'cat-zuivel-en-kaas' })
  })
})

describe('bouwTak — een nieuwe categorie onder een bestaande hoofdcategorie', () => {
  it('maakt de categorie en hangt de subcategorie eraan', () => {
    const uit = bouwTak(
      { subnaam: 'televisietoestel', categorie: { naam: 'Meubels', hoofd: { id: 'eigen-huisraad' } } },
      teller(),
    )
    expect(uit.categorieen).toEqual([{ id: 'id-1', naam: 'Meubels', ouderId: 'eigen-huisraad' }])
    expect(uit.subcategorie).toEqual({ id: 'id-2', naam: 'televisietoestel', categorieId: 'id-1' })
  })
})

describe('bouwTak — alles nieuw', () => {
  it('maakt hoofdcategorie, categorie en subcategorie, van stam naar blad', () => {
    const uit = bouwTak(
      { subnaam: 'televisietoestel', categorie: { naam: 'Meubels en toestellen', hoofd: { naam: 'Huisraad' } } },
      teller(),
    )
    // ⚠ De VOLGORDE telt: de hoofdcategorie eerst. Zo laat het logboek zich lezen,
    // en zo speelt een ander toestel de regels af — van stam naar tak naar blad.
    expect(uit.categorieen).toEqual([
      { id: 'id-1', naam: 'Huisraad' },
      { id: 'id-2', naam: 'Meubels en toestellen', ouderId: 'id-1' },
    ])
    expect(uit.subcategorie).toEqual({ id: 'id-3', naam: 'televisietoestel', categorieId: 'id-2' })
  })

  it('geeft de nieuwe hoofdcategorie geen ouder', () => {
    // Een `Categorie` zonder `ouderId` IS een hoofdcategorie; een lege string zou
    // haar een wees maken en `stelCategorieboomIn` laat een wees bewust vallen.
    const uit = bouwTak({ subnaam: 'x', categorie: { naam: 'y', hoofd: { naam: 'z' } } }, teller())
    expect(uit.categorieen[0]).not.toHaveProperty('ouderId')
  })
})

describe('bouwTak — namen', () => {
  it('trimt alle drie de namen', () => {
    // Anders staat er in de boom een categorie met een spatie ervoor, en die
    // sorteert dan ergens waar je haar niet zoekt.
    const uit = bouwTak(
      { subnaam: '  televisie  ', categorie: { naam: '  Meubels ', hoofd: { naam: ' Huisraad ' } } },
      teller(),
    )
    expect(uit.categorieen.map((c) => c.naam)).toEqual(['Huisraad', 'Meubels'])
    expect(uit.subcategorie.naam).toBe('televisie')
  })
})

describe('schoneNaam', () => {
  it('haalt spaties eromheen weg', () => {
    expect(schoneNaam('  Huisraad  ')).toBe('Huisraad')
  })

  it('haalt ONZICHTBARE tekens weg', () => {
    // ⚠ `trim()` alleen laat deze staan. Plak je een naam uit een pdf of een website,
    // dan zit er soms een teken in dat nergens getekend wordt. Zonder deze stap krijg
    // je een categorie die in elke lijst als een lege regel staat.
    expect(schoneNaam('\u200BHuis\u200Craad\uFEFF')).toBe('Huisraad')
    expect(schoneNaam('\u200B\u200B')).toBe('')
  })

  it('laat gewone namen met leestekens ongemoeid', () => {
    expect(schoneNaam('Brood (wit) & beleg')).toBe('Brood (wit) & beleg')
  })
})

describe('bouwTak — onzichtbare tekens', () => {
  it('schoont alle drie de namen op, niet alleen de spaties', () => {
    const uit = bouwTak(
      { subnaam: '\u200Btelevisie', categorie: { naam: 'Meubels\u200B', hoofd: { naam: '\uFEFFHuisraad' } } },
      teller(),
    )
    expect(uit.categorieen.map((c) => c.naam)).toEqual(['Huisraad', 'Meubels'])
    expect(uit.subcategorie.naam).toBe('televisie')
  })
})
