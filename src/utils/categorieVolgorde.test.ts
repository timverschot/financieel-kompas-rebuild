import { describe, it, expect } from 'vitest'
import type { Categorie, Ordening } from '../data/schema'
import { ORDENING_HOOFDCATEGORIEEN } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { alleHoofdcategorieen, bewaardeVolgorde, opVolgorde, verplaats } from './categorieVolgorde'

const eigen: Categorie[] = [
  { id: 'eigen-a', naam: 'Mijn hobby' },
  { id: 'eigen-b', naam: 'Mijn zaak', icoon: '💼' },
  // Een eigen MIDDENcategorie: die hoort onder haar ouder, niet in deze rij.
  { id: 'eigen-mid', naam: 'Onderdeel', ouderId: 'eigen-a' },
]

describe('alleHoofdcategorieen', () => {
  it('zet de ingebouwde eerst en de eigen erachter', () => {
    const alle = alleHoofdcategorieen(eigen)
    expect(alle[0].id).toBe(INGEBOUWDE_CATEGORIEEN[0].id)
    // Ronde 30: een nieuwe eigen categorie hoort ACHTERAAN. Voorheen stonden de
    // eigen categorieën hardgecodeerd vooraan, dus een categorie die je net
    // aanmaakte sprong meteen bovenaan de rij.
    expect(alle.slice(-2).map((h) => h.id)).toEqual(['eigen-a', 'eigen-b'])
  })

  it('laat een eigen middencategorie erbuiten', () => {
    expect(alleHoofdcategorieen(eigen).some((h) => h.id === 'eigen-mid')).toBe(false)
  })

  it('geeft een eigen categorie zonder teken een standaardteken', () => {
    const a = alleHoofdcategorieen(eigen).find((h) => h.id === 'eigen-a')
    expect(a?.icoon).toBeTruthy()
    expect(alleHoofdcategorieen(eigen).find((h) => h.id === 'eigen-b')?.icoon).toBe('💼')
  })
})

describe('bewaardeVolgorde', () => {
  it('geeft een lege lijst wanneer er niets bewaard is', () => {
    expect(bewaardeVolgorde([])).toEqual([])
    expect(bewaardeVolgorde([{ id: 'iets-anders', ids: ['x'] }])).toEqual([])
  })

  it('vindt de volgorde van de hoofdcategorieën', () => {
    const o: Ordening[] = [{ id: ORDENING_HOOFDCATEGORIEEN, ids: ['b', 'a'] }]
    expect(bewaardeVolgorde(o)).toEqual(['b', 'a'])
  })
})

describe('opVolgorde', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('houdt de standaardvolgorde aan zonder bewaarde lijst', () => {
    expect(opVolgorde(items, []).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('zet de bewaarde volgorde vooraan en de rest erachter', () => {
    // 'c' en 'a' zijn verplaatst; 'b' en 'd' volgen in hun eigen volgorde.
    expect(opVolgorde(items, ['c', 'a']).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('negeert id’s die niet meer bestaan', () => {
    // 'weg' is een verwijderde eigen categorie. De lijst hoeft daar niet voor
    // opgekuist te worden, en mag er ook niet door in de war raken.
    expect(opVolgorde(items, ['weg', 'd', 'weg']).map((i) => i.id)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('telt een dubbel id maar één keer', () => {
    expect(opVolgorde(items, ['b', 'b']).map((i) => i.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('laat niets vallen en voegt niets toe', () => {
    const uit = opVolgorde(items, ['d', 'c', 'b', 'a'])
    expect(uit).toHaveLength(items.length)
    expect(new Set(uit.map((i) => i.id))).toEqual(new Set(['a', 'b', 'c', 'd']))
  })
})

describe('verplaats', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('zet een item één plaats omhoog', () => {
    expect(verplaats(items, [], 'b', -1)).toEqual(['b', 'a', 'c'])
  })

  it('zet een item één plaats omlaag', () => {
    expect(verplaats(items, [], 'b', 1)).toEqual(['a', 'c', 'b'])
  })

  it('doet niets aan de randen', () => {
    expect(verplaats(items, [], 'a', -1)).toEqual(['a', 'b', 'c'])
    expect(verplaats(items, [], 'c', 1)).toEqual(['a', 'b', 'c'])
  })

  it('geeft ALTIJD de volledige volgorde terug', () => {
    // Belangrijk: ook de items die je niet aanraakte staan erin. Zou dat niet zo
    // zijn, dan zou de eerstvolgende toevoeging de rest opnieuw door elkaar
    // schudden — je verplaatsing zou dus maar tijdelijk zijn.
    expect(verplaats(items, [], 'c', -1)).toEqual(['a', 'c', 'b'])
  })

  it('rekent verder op de al bewaarde volgorde', () => {
    expect(verplaats(items, ['c', 'b', 'a'], 'b', -1)).toEqual(['b', 'c', 'a'])
  })

  it('laat een onbekend id de volgorde niet verstoren', () => {
    expect(verplaats(items, ['b'], 'bestaat-niet', 1)).toEqual(['b', 'a', 'c'])
  })
})
