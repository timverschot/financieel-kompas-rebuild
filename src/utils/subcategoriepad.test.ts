import { describe, it, expect, afterEach } from 'vitest'
import { stelCategorieboomIn } from '../data/categorieen/zoek'
import { subcategoriePad } from './subcategoriepad'

afterEach(() => stelCategorieboomIn([], []))

const t = (s: string) => s

describe('subcategoriePad', () => {
  it('zegt waar een gekozen subcategorie hangt', () => {
    expect(subcategoriePad('i-brood--wit-9238', new Set(), t)).toBe('Voeding › Broodwaren')
  })

  it('zwijgt bij een HOOFDcategorie', () => {
    // ⚠ Geen toevalligheid maar de kern van de afspraak: alleen onderaan de boom valt
    // er niets meer te kiezen, en alleen dán verdwijnen de keuzeknoppen. Bij een
    // hoofdcategorie is de laag eronder juist de logische volgende stap.
    expect(subcategoriePad('ov-voeding', new Set(), t)).toBeUndefined()
  })

  it('zwijgt bij een MIDDENcategorie', () => {
    // ⚠ Dezelfde reden als bij een hoofdcategorie, en het geval waar de functie het
    // makkelijkst zou breken: `cat-*` staat in een ánder register dan de items.
    expect(subcategoriePad('cat-broodwaren', new Set(), t)).toBeUndefined()
  })

  it('kent ook een subcategorie die de gebruiker zelf maakte', () => {
    // ⚠ Het geval dat de hele keten raakt: zo'n subcategorie bestaat alleen in de boom
    // die `stelCategorieboomIn` opbouwt, niet in de ingebouwde lijst. Zonder deze test
    // zou een gebroken opbouw hier stil "geen pad" geven — en dan komt de keuzeknop die
    // deze ronde weghaalde gewoon terug op een regel die wél een subcategorie draagt.
    stelCategorieboomIn(
      [{ id: 'sub-tv', naam: 'Televisie', categorieId: 'cat-meubels' }],
      [
        { id: 'eigen-huisraad', naam: 'Huisraad' },
        { id: 'cat-meubels', naam: 'Meubels', ouderId: 'eigen-huisraad' },
      ],
    )
    expect(subcategoriePad('sub-tv', new Set(['eigen-huisraad']), t)).toBe('Huisraad › Meubels')
  })

  it('zwijgt zonder keuze en bij een id dat niet bestaat', () => {
    expect(subcategoriePad(undefined, new Set(), t)).toBeUndefined()
    expect(subcategoriePad('', new Set(), t)).toBeUndefined()
    expect(subcategoriePad('bestaatniet', new Set(), t)).toBeUndefined()
  })

  it('vertaalt een INGEBOUWDE hoofdcategorie', () => {
    const vertaal = (s: string) => (s === 'Voeding' ? 'Food' : s)
    expect(subcategoriePad('i-brood--wit-9238', new Set(), vertaal)).toBe('Food › Broodwaren')
  })

  it('laat een EIGEN hoofdcategorienaam met rust', () => {
    // ⚠ Noemt de gebruiker zijn eigen hoofdcategorie "Sport" of "Auto", dan zijn dat
    // toevallig ook vertaalsleutels van de app — en dan zou zijn categorie in het
    // Engels ineens anders heten dan op de knop ernaast.
    const vertaal = (s: string) => (s === 'Voeding' ? 'Food' : s)
    expect(subcategoriePad('i-brood--wit-9238', new Set(['ov-voeding']), vertaal)).toBe('Voeding › Broodwaren')
  })
})
