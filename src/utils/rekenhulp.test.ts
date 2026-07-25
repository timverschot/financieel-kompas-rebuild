import { describe, it, expect } from 'vitest'
import {
  datumVoorDoel,
  extraAflossing,
  formatProcent,
  indexatie,
  maandbedragVoorDoel,
  maandenTussen,
  maandlast,
  tekstNaarGetal,
  vergelijkPrijzen,
  voegMaandenToe,
  type Aanbieding,
  type Resultaat,
} from './rekenhulp'

// Kleine hulp: haalt de waarde uit een geslaagde uitkomst en laat de test
// duidelijk falen wanneer er toch een fout uitkwam.
function waardeVan<T>(uitkomst: Resultaat<T>): T {
  if (!uitkomst.ok) throw new Error('verwachtte een geldige uitkomst, maar kreeg fout: ' + uitkomst.fout)
  return uitkomst.waarde
}

function foutVan(uitkomst: Resultaat<unknown>): string {
  if (uitkomst.ok) throw new Error('verwachtte een fout, maar de berekening lukte')
  return uitkomst.fout
}

describe('tekstNaarGetal', () => {
  it('leest zowel de komma als de punt als decimaalteken', () => {
    expect(tekstNaarGetal('7,5')).toBe(7.5)
    expect(tekstNaarGetal('7.5')).toBe(7.5)
    expect(tekstNaarGetal(' 240 ')).toBe(240)
  })

  it('begrijpt de Belgische notatie met duizendtalpunt', () => {
    expect(tekstNaarGetal('1.234,5')).toBe(1234.5)
  })

  it('geeft NaN bij lege of onzinnige invoer', () => {
    expect(tekstNaarGetal('')).toBeNaN()
    expect(tekstNaarGetal('7abc')).toBeNaN()
    expect(tekstNaarGetal('--3')).toBeNaN()
  })
})

describe('formatProcent', () => {
  it('toont een percentage met een komma', () => {
    expect(formatProcent(7.35, 2)).toBe('7,35 %')
    expect(formatProcent(10)).toBe('10,0 %')
  })
})

describe('indexatie', () => {
  it('past de Belgische formule toe en toont het verschil (€ 500 bij index 100 -> 110)', () => {
    const r = waardeVan(indexatie(50000, 100, 110))
    expect(r.nieuwBedragCenten).toBe(55000)
    expect(r.verschilCenten).toBe(5000)
    expect(r.stijgingProcent).toBeCloseTo(10, 6)
  })

  it('rondt af op hele centen', () => {
    expect(waardeVan(indexatie(50000, 128.34, 132.55)).nieuwBedragCenten).toBe(51640)
  })

  it('weigert een aanvangsindex van nul (deling door nul)', () => {
    expect(foutVan(indexatie(50000, 0, 110))).toBe('index-ongeldig')
    expect(foutVan(indexatie(50000, 100, 0))).toBe('index-ongeldig')
    expect(foutVan(indexatie(50000, 100, Number.NaN))).toBe('index-ongeldig')
  })

  it('weigert een leeg of nulbedrag', () => {
    expect(foutVan(indexatie(Number.NaN, 100, 110))).toBe('bedrag-ontbreekt')
    expect(foutVan(indexatie(0, 100, 110))).toBe('bedrag-nul')
    expect(foutVan(indexatie(-500, 100, 110))).toBe('bedrag-nul')
  })
})

describe('maandlast', () => {
  it('rekent zonder rente gewoon de hoofdsom door de looptijd', () => {
    expect(waardeVan(maandlast(120000, 0, 12))).toEqual({
      maandlastCenten: 10000,
      totaalBetaaldCenten: 120000,
      totaleInterestCenten: 0,
    })
  })

  it('past de annuïteitsformule toe (€ 1.000 aan 12 % over 12 maanden)', () => {
    const r = waardeVan(maandlast(100000, 12, 12))
    expect(r.maandlastCenten).toBe(8885)
    expect(r.totaalBetaaldCenten).toBe(106620)
    expect(r.totaleInterestCenten).toBe(6620)
  })

  it('geeft een realistische maandlast voor een woonkrediet (€ 200.000, 3 %, 240 maanden)', () => {
    const r = waardeVan(maandlast(20000000, 3, 240))
    // ± € 1.109 per maand; we controleren de orde van grootte, niet de laatste cent.
    expect(r.maandlastCenten).toBeGreaterThan(110000)
    expect(r.maandlastCenten).toBeLessThan(112000)
    expect(r.totaleInterestCenten).toBeGreaterThan(0)
  })

  it('vangt nul, negatief en een onmogelijke looptijd op', () => {
    expect(foutVan(maandlast(0, 3, 12))).toBe('bedrag-nul')
    expect(foutVan(maandlast(Number.NaN, 3, 12))).toBe('bedrag-ontbreekt')
    expect(foutVan(maandlast(100000, -1, 12))).toBe('rente-ongeldig')
    expect(foutVan(maandlast(100000, 3, 0))).toBe('looptijd-ongeldig')
    expect(foutVan(maandlast(100000, 3, 12.5))).toBe('looptijd-ongeldig')
  })
})

describe('extraAflossing', () => {
  it('zonder rente: € 20 extra per maand maakt een lening van 12 maanden 2 maanden korter', () => {
    const r = waardeVan(extraAflossing(120000, 0, 12, 2000))
    expect(r.maandlastCenten).toBe(10000)
    expect(r.totaleMaandbetalingCenten).toBe(12000)
    expect(r.maandenOrigineel).toBe(12)
    expect(r.maandenNieuw).toBe(10)
    expect(r.maandenKorter).toBe(2)
    expect(r.interestBespaardCenten).toBe(0)
  })

  it('met rente: je bent vroeger klaar én je bespaart interest', () => {
    const r = waardeVan(extraAflossing(20000000, 3, 240, 20000))
    expect(r.maandenNieuw).toBeLessThan(r.maandenOrigineel)
    expect(r.maandenKorter).toBeGreaterThan(0)
    expect(r.interestBespaardCenten).toBeGreaterThan(0)
    expect(r.interestNieuwCenten).toBeLessThan(r.interestOrigineelCenten)
  })

  it('vraagt om een extra bedrag groter dan nul', () => {
    expect(foutVan(extraAflossing(120000, 0, 12, 0))).toBe('extra-ontbreekt')
    expect(foutVan(extraAflossing(120000, 0, 12, Number.NaN))).toBe('extra-ontbreekt')
  })

  it('erft de foutmelding van de maandlast', () => {
    expect(foutVan(extraAflossing(0, 3, 12, 2000))).toBe('bedrag-nul')
  })
})

describe('voegMaandenToe', () => {
  it('telt maanden op en springt netjes over een jaargrens', () => {
    expect(voegMaandenToe('2026-07-25', 6)).toBe('2027-01-25')
    expect(voegMaandenToe('2026-07-25', 0)).toBe('2026-07-25')
  })

  it('kapt de dag af als de nieuwe maand korter is (31 januari + 1 maand)', () => {
    expect(voegMaandenToe('2026-01-31', 1)).toBe('2026-02-28')
    expect(voegMaandenToe('2024-01-31', 1)).toBe('2024-02-29')
  })
})

describe('maandenTussen', () => {
  it('rondt een aangebroken maand naar boven af', () => {
    expect(maandenTussen('2026-07-25', '2026-10-25')).toBe(3)
    expect(maandenTussen('2026-07-25', '2026-10-10')).toBe(3)
    expect(maandenTussen('2026-07-25', '2026-10-30')).toBe(4)
  })

  it('geeft nul of minder terug voor een datum die niet meer in de toekomst ligt', () => {
    expect(maandenTussen('2026-07-25', '2026-07-01')).toBe(0)
    expect(maandenTussen('2026-07-25', '2026-05-25')).toBe(-2)
  })

  it('geeft null bij een datum die geen JJJJ-MM-DD is', () => {
    expect(maandenTussen('2026-07-25', '25/12/2026')).toBeNull()
  })
})

describe('maandbedragVoorDoel', () => {
  it('verdeelt het resterende bedrag over de maanden tot de streefdatum', () => {
    const r = waardeVan(maandbedragVoorDoel(120000, 20000, '2026-12-25', '2026-07-25'))
    expect(r.maanden).toBe(5)
    expect(r.resterendCenten).toBe(100000)
    expect(r.perMaandCenten).toBe(20000)
    expect(r.alBereikt).toBe(false)
  })

  it('rondt naar boven af, zodat je het doel zeker haalt', () => {
    const r = waardeVan(maandbedragVoorDoel(100000, 0, '2026-10-25', '2026-07-25'))
    expect(r.maanden).toBe(3)
    expect(r.perMaandCenten).toBe(33334)
  })

  it('meldt dat het doel al bereikt is in plaats van een negatief bedrag', () => {
    const r = waardeVan(maandbedragVoorDoel(100000, 150000, '2026-12-25', '2026-07-25'))
    expect(r.alBereikt).toBe(true)
    expect(r.perMaandCenten).toBe(0)
    expect(r.resterendCenten).toBe(0)
  })

  it('vangt een datum in het verleden en een onzinnige datum op', () => {
    expect(foutVan(maandbedragVoorDoel(100000, 0, '2026-05-25', '2026-07-25'))).toBe('datum-verleden')
    expect(foutVan(maandbedragVoorDoel(100000, 0, '', '2026-07-25'))).toBe('datum-ongeldig')
    expect(foutVan(maandbedragVoorDoel(0, 0, '2026-12-25', '2026-07-25'))).toBe('bedrag-nul')
  })
})

describe('datumVoorDoel', () => {
  it('zegt wanneer het doel gehaald is bij een vast maandbedrag', () => {
    const r = waardeVan(datumVoorDoel(100000, 0, 25000, '2026-07-25'))
    expect(r.maanden).toBe(4)
    expect(r.datumISO).toBe('2026-11-25')
  })

  it('rondt een onvolledige laatste maand naar boven af', () => {
    const r = waardeVan(datumVoorDoel(100000, 10000, 25000, '2026-07-25'))
    expect(r.resterendCenten).toBe(90000)
    expect(r.maanden).toBe(4)
  })

  it('meldt dat het doel al bereikt is', () => {
    const r = waardeVan(datumVoorDoel(100000, 100000, 0, '2026-07-25'))
    expect(r.alBereikt).toBe(true)
    expect(r.maanden).toBe(0)
  })

  it('weigert een maandbedrag van nul (anders duurt het eeuwig)', () => {
    expect(foutVan(datumVoorDoel(100000, 0, 0, '2026-07-25'))).toBe('inleg-ontbreekt')
    expect(foutVan(datumVoorDoel(100000, 0, -500, '2026-07-25'))).toBe('inleg-ontbreekt')
  })

  it('meldt het wanneer het langer dan honderd jaar zou duren', () => {
    expect(foutVan(datumVoorDoel(10000000, 0, 1, '2026-07-25'))).toBe('duurt-te-lang')
  })
})

describe('vergelijkPrijzen', () => {
  const gram: Aanbieding = { id: 'a', naam: 'Zak 750 g', prijsCenten: 99, hoeveelheid: 750, eenheid: 'g' }
  const kilo: Aanbieding = { id: 'b', naam: 'Zak 1 kg', prijsCenten: 125, hoeveelheid: 1, eenheid: 'kg' }

  it('rekent gram naar kilo om, zodat 750 g eerlijk tegen 1 kg vergelijkt', () => {
    const r = waardeVan(vergelijkPrijzen([gram, kilo]))
    expect(r.map((x) => x.id)).toEqual(['b', 'a'])
    expect(r[0].perEenheidCenten).toBe(125)
    expect(r[0].goedkoopste).toBe(true)
    expect(r[1].perEenheidCenten).toBe(132)
    expect(r[1].goedkoopste).toBe(false)
    expect(r[1].procentDuurder).toBeCloseTo(5.6, 5)
    expect(r[0].basis).toBe('kg')
  })

  it('rekent milliliter naar liter om', () => {
    const r = waardeVan(
      vergelijkPrijzen([
        { id: 'a', naam: 'Fles 1,5 l', prijsCenten: 200, hoeveelheid: 1.5, eenheid: 'l' },
        { id: 'b', naam: 'Blikje 500 ml', prijsCenten: 80, hoeveelheid: 500, eenheid: 'ml' },
      ]),
    )
    expect(r[0].id).toBe('a')
    expect(r[0].perEenheidCenten).toBe(133)
    expect(r[1].perEenheidCenten).toBe(160)
    expect(r[0].basis).toBe('l')
  })

  it('vergelijkt ook stuks', () => {
    const r = waardeVan(
      vergelijkPrijzen([
        { id: 'a', naam: '6 rollen', prijsCenten: 300, hoeveelheid: 6, eenheid: 'stuk' },
        { id: 'b', naam: '10 rollen', prijsCenten: 450, hoeveelheid: 10, eenheid: 'stuk' },
      ]),
    )
    expect(r[0].id).toBe('b')
    expect(r[0].perEenheidCenten).toBe(45)
    expect(r[1].perEenheidCenten).toBe(50)
  })

  it('weigert appelen met peren: gewicht tegen inhoud', () => {
    expect(foutVan(vergelijkPrijzen([kilo, { ...gram, eenheid: 'l', hoeveelheid: 1 }]))).toBe('gemengde-eenheden')
  })

  it('vangt een hoeveelheid van nul op (deling door nul)', () => {
    expect(foutVan(vergelijkPrijzen([kilo, { ...gram, hoeveelheid: 0 }]))).toBe('hoeveelheid-ongeldig')
    expect(foutVan(vergelijkPrijzen([kilo, { ...gram, hoeveelheid: -750 }]))).toBe('hoeveelheid-ongeldig')
  })

  it('vraagt om minstens twee aanbiedingen en een echte prijs', () => {
    expect(foutVan(vergelijkPrijzen([kilo]))).toBe('te-weinig-aanbiedingen')
    expect(foutVan(vergelijkPrijzen([kilo, { ...gram, prijsCenten: 0 }]))).toBe('bedrag-nul')
  })
})
