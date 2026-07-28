import { describe, it, expect, beforeEach } from 'vitest'
import { voorstelKostensoort, KOSTENSOORT_SLEUTELS } from './kostensoort'
import { stelCategorieboomIn } from '../data/categorieen/zoek'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'

// De boom staat globaal geregistreerd; zet hem terug op de ingebouwde basis zodat
// een andere test die er eigen categorieën in hing deze test niet beïnvloedt.
beforeEach(() => {
  stelCategorieboomIn([], [])
})

describe('voorstelKostensoort', () => {
  it('geeft geen voorstel zonder categorie', () => {
    expect(voorstelKostensoort(undefined)).toBeNull()
    expect(voorstelKostensoort('')).toBeNull()
  })

  it('geeft geen voorstel voor een onbekend of eigen id', () => {
    expect(voorstelKostensoort('eigen-123')).toBeNull()
  })

  it('stelt medische zorg voor als buitengewoon', () => {
    const v = voorstelKostensoort('cat-x-tandzorg')
    expect(v).toEqual({ kostenType: 'buitengewoon', rubriek: 'medisch', reden: expect.any(String) })
  })

  it('houdt een huisartsbezoek gewoon, ook al zit het in een buitengewone categorie', () => {
    expect(voorstelKostensoort('i-huisarts-8922')?.kostenType).toBe('gewoon')
    expect(voorstelKostensoort('i-specialisten-3458')?.kostenType).toBe('buitengewoon')
  })

  it('doet geen uitspraak over een terugbetaling', () => {
    expect(voorstelKostensoort('i-ziekenfonds-terugbetalingen-5629')).toBeNull()
    expect(voorstelKostensoort('i-dkv-terugbetalingen-990')).toBeNull()
  })

  it('houdt vrij verkrijgbare medicatie gewoon en voorgeschreven medicatie buitengewoon', () => {
    expect(voorstelKostensoort('i-pijn-en-koorts-7283')?.kostenType).toBe('gewoon')
    expect(voorstelKostensoort('i-rilatine-jasper-5184')?.rubriek).toBe('medisch')
  })

  it('stelt hoger onderwijs voor als schoolse opleiding, behalve eten en de studentenclub', () => {
    expect(voorstelKostensoort('i-x-kothuur')?.rubriek).toBe('school')
    expect(voorstelKostensoort('i-x-inschrijvingsgeld-hogeschool-of-unief')?.rubriek).toBe('school')
    expect(voorstelKostensoort('i-x-studentenrestaurant')?.kostenType).toBe('gewoon')
  })

  it('houdt de gewone schoolrekening gewoon maar de studielaptop buitengewoon', () => {
    expect(voorstelKostensoort('i-schoolfactuur-jasper-95')?.kostenType).toBe('gewoon')
    expect(voorstelKostensoort('i-schoolboeken-jasper-46')?.kostenType).toBe('gewoon')
    expect(voorstelKostensoort('i-laptop-jasper-185')?.rubriek).toBe('school')
  })

  it('stelt lidgelden, kampen, opvang van jonge kinderen en de rijopleiding voor als ontplooiing', () => {
    expect(voorstelKostensoort('i-x-sportclub-lidgeld')?.rubriek).toBe('ontplooiing')
    expect(voorstelKostensoort('i-x-jeugdkamp')?.rubriek).toBe('ontplooiing')
    expect(voorstelKostensoort('i-cr-che-9817')?.rubriek).toBe('ontplooiing')
    expect(voorstelKostensoort('i-x-rijbewijs')?.rubriek).toBe('ontplooiing')
  })

  it('houdt buitenschoolse opvang en een daguitstap gewoon', () => {
    expect(voorstelKostensoort('i-buitenschoolse-opvang-3170')?.kostenType).toBe('gewoon')
    expect(voorstelKostensoort('i-x-schooluitstap')?.kostenType).toBe('gewoon')
  })

  it('rolt een item op naar zijn hoofdcategorie wanneer de categorie zelf niets zegt', () => {
    // 'Brood (wit)' staat niet in de tabel; 'Voeding' wel.
    expect(voorstelKostensoort('i-brood--wit-9238')?.kostenType).toBe('gewoon')
    // En de hoofdcategorie zelf geeft hetzelfde antwoord.
    expect(voorstelKostensoort('ov-voeding')?.kostenType).toBe('gewoon')
  })

  it('erft het voorstel van de categorie waaronder je zelf iets toevoegt', () => {
    stelCategorieboomIn([{ id: 'i-eigen-beugel', naam: 'Beugel', categorieId: 'cat-x-tandzorg' }], [])
    expect(voorstelKostensoort('i-eigen-beugel')?.rubriek).toBe('medisch')
  })

  it('zwijgt over een gemengde hoofdcategorie in plaats van te gokken', () => {
    expect(voorstelKostensoort('ov-apotheek-en-gezondheid')).toBeNull()
    expect(voorstelKostensoort('ov-kinderen-en-gezin')).toBeNull()
  })

  it('verwijst alleen naar id’s die echt in de categorieboom bestaan', () => {
    // Een tikfout in een id zou stil betekenen: nooit een voorstel. Deze test
    // vergelijkt de tabel met de werkelijke boom.
    const bestaat = new Set<string>()
    for (const h of INGEBOUWDE_CATEGORIEEN) {
      bestaat.add(h.id)
      for (const c of h.categorieen) {
        bestaat.add(c.id)
        for (const it of c.items) bestaat.add(it.id)
      }
    }
    expect(KOSTENSOORT_SLEUTELS.filter((id) => !bestaat.has(id))).toEqual([])
  })
})
