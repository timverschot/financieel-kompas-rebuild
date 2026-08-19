import { describe, it, expect, afterEach } from 'vitest'
import { zetOpmaaktaal } from './opmaaktaal'
import {
  dagKort,
  huidigeMaand,
  maandJaarLabel,
  maandKort,
  maandVoluit,
  naarDatumTekst,
  vandaag,
  dagJaar,
  periodeSoort,
  verschuifDatumMaanden,
  periodeLabel,
  laatsteDagVanPeriode,
  jaarVan,
  maandenVanJaar,
  dagenTussen,
  dagenVerschil,
} from './datum'

describe('datum', () => {
  it('zet een datum om naar JJJJ-MM-DD met voorloopnullen', () => {
    expect(naarDatumTekst(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(naarDatumTekst(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('rekent met de lokale kalender, niet met de wereldtijd', () => {
    // 1 augustus 2026 om 01:30 lokale tijd. In UTC is het dan (in de Belgische
    // zomertijd) nog 31 juli — de oude aanpak gaf daardoor de verkeerde dag.
    const nacht = new Date(2026, 7, 1, 1, 30)
    expect(vandaag(nacht)).toBe('2026-08-01')
    expect(huidigeMaand(nacht)).toBe('2026-08')
  })

  it('geeft de maand als JJJJ-MM', () => {
    expect(huidigeMaand(new Date(2026, 2, 9))).toBe('2026-03')
  })
})

describe('maandJaarLabel', () => {
  it('schrijft een maand en jaar leesbaar uit', () => {
    expect(maandJaarLabel('2028-07-26')).toBe('juli 2028')
    expect(maandJaarLabel('2026-01')).toBe('januari 2026')
  })

  it('laat onleesbare invoer ongemoeid in plaats van iets te verzinnen', () => {
    expect(maandJaarLabel('geen datum')).toBe('geen datum')
  })
})

// Ronde 20: de vijf plaatsen die elk hun eigen Intl-regel schreven, gebruiken nu
// deze helpers. Zo staat er één plek waar de maandnamen vandaan komen.
describe('maandnamen', () => {
  it('schrijft een korte maandnaam voor aslabels', () => {
    expect(maandKort('2026-07')).toBe('jul')
    expect(maandKort('2026-01-15')).toBe('jan')
  })

  it('schrijft een maandnaam voluit', () => {
    expect(maandVoluit('2026-07')).toBe('juli')
  })

  it('schrijft een korte dag met maand', () => {
    expect(dagKort('2026-07-04')).toBe('04 jul')
  })

  it('laat onleesbare invoer ongemoeid in plaats van iets te verzinnen', () => {
    expect(maandKort('geen maand')).toBe('geen maand')
    expect(maandVoluit('x')).toBe('x')
    expect(dagKort('x')).toBe('x')
  })
})

describe('dagJaar', () => {
  it('toont dag, maand én jaar', () => {
    // Een waardering leg je vaak één keer per jaar vast; zonder jaartal zijn twee
    // regels "01 jan" niet uit elkaar te houden.
    expect(dagJaar('2026-01-04')).toContain('2026')
    expect(dagJaar('2026-01-04')).toContain('4')
  })

  it('geeft onleesbare invoer ongewijzigd terug in plaats van "Invalid Date"', () => {
    expect(dagJaar('geen datum')).toBe('geen datum')
  })
})

// ---------------------------------------------------------------------------
// PERIODES (ronde 41)
// ---------------------------------------------------------------------------

describe('periodeSoort', () => {
  it('herkent een jaar en een maand', () => {
    expect(periodeSoort('2026')).toBe('jaar')
    expect(periodeSoort('2026-07')).toBe('maand')
  })
})

describe('periodeLabel', () => {
  it('laat een jaar staan zoals het is', () => {
    expect(periodeLabel('2026')).toBe('2026')
  })

  it('schrijft een maand voluit', () => {
    expect(periodeLabel('2026-07')).toBe('juli 2026')
  })
})

describe('laatsteDagVanPeriode', () => {
  it('geeft 31 december bij een jaar', () => {
    expect(laatsteDagVanPeriode('2026')).toBe('2026-12-31')
  })

  it('kent het aantal dagen van elke maand', () => {
    expect(laatsteDagVanPeriode('2026-01')).toBe('2026-01-31')
    expect(laatsteDagVanPeriode('2026-04')).toBe('2026-04-30')
    expect(laatsteDagVanPeriode('2026-12')).toBe('2026-12-31')
  })

  it('kent schrikkeljaren', () => {
    // 2028 is een schrikkeljaar, 2026 niet.
    expect(laatsteDagVanPeriode('2026-02')).toBe('2026-02-28')
    expect(laatsteDagVanPeriode('2028-02')).toBe('2028-02-29')
  })

  it('geeft onzin ongewijzigd terug in plaats van een NaN-datum', () => {
    expect(laatsteDagVanPeriode('geen-datum')).toBe('geen-datum')
  })
})

describe('jaarVan', () => {
  it('pikt het jaar uit een maand of een datum', () => {
    expect(jaarVan('2026-07')).toBe('2026')
    expect(jaarVan('2026-07-04')).toBe('2026')
    expect(jaarVan('2026')).toBe('2026')
  })
})

describe('maandenVanJaar', () => {
  it('geeft twaalf maanden met een nul vooraan waar nodig', () => {
    const maanden = maandenVanJaar('2026')
    expect(maanden).toHaveLength(12)
    expect(maanden[0]).toBe('2026-01')
    expect(maanden[8]).toBe('2026-09')
    expect(maanden[11]).toBe('2026-12')
  })
})

describe('de datumopmaak volgt de taal (ronde 54)', () => {
  // Een Franstalige gebruiker kreeg een Frans scherm met "juli 2026" erin. De
  // opgeslagen sleutels JJJJ-MM-DD en JJJJ-MM mogen NIET meeveranderen: die zijn de
  // ruggengraat van de hele app.
  afterEach(() => zetOpmaaktaal('nl'))

  it('vertaalt de maandnaam mee', () => {
    expect(maandJaarLabel('2026-07-04')).toBe('juli 2026')
    zetOpmaaktaal('fr')
    expect(maandJaarLabel('2026-07-04')).toBe('juillet 2026')
    zetOpmaaktaal('en')
    expect(maandJaarLabel('2026-07-04')).toBe('July 2026')
  })

  it('vertaalt ook de korte vormen', () => {
    zetOpmaaktaal('fr')
    expect(maandVoluit('2026-07')).toBe('juillet')
    expect(dagKort('2026-07-04')).toContain('juil')
  })

  it('laat de opgeslagen sleutels met rust', () => {
    // Deze twee bouwen hun tekst met padStart, niet met Intl. Zouden ze meevertalen,
    // dan zou een Franstalig toestel boekingen wegschrijven die een Nederlandstalig
    // toestel niet meer terugvindt.
    zetOpmaaktaal('fr')
    const nu = new Date(2026, 6, 4)
    expect(vandaag(nu)).toBe('2026-07-04')
    expect(huidigeMaand(nu)).toBe('2026-07')
    expect(periodeLabel('2026')).toBe('2026')
  })
})

describe('dagenTussen', () => {
  it('telt de dagen tussen twee datums, in beide richtingen even veel', () => {
    expect(dagenTussen('2026-05-04', '2026-05-07')).toBe(3)
    expect(dagenTussen('2026-05-07', '2026-05-04')).toBe(3)
    expect(dagenTussen('2026-05-04', '2026-05-04')).toBe(0)
  })

  it('rekent over een maandgrens en over een schrikkeldag heen', () => {
    expect(dagenTussen('2026-04-30', '2026-05-02')).toBe(2)
    expect(dagenTussen('2024-02-28', '2024-03-01')).toBe(2)
  })

  it('houdt hele dagen over de omschakeling van zomer- naar wintertijd', () => {
    // In België gaat de klok in de nacht van 24 op 25 oktober 2026 een uur terug.
    // Zou dit met de lokale tijd rekenen, dan gaf dit 1,0417 in plaats van 1 — en
    // dan glipt een paar er net langs een marge van drie dagen.
    expect(dagenTussen('2026-10-24', '2026-10-25')).toBe(1)
    expect(dagenTussen('2026-03-28', '2026-03-29')).toBe(1)
  })

  it('legt ook een MAANDwaarde buiten elke marge', () => {
    // '2026-07' wordt door `Date.parse` stilzwijgend als 1 juli gelezen. Zonder de
    // vormcontrole zou een budgetperiode zich dus als een dag gedragen en op drie
    // dagen van een boeking kunnen "liggen". In deze app is 'JJJJ-MM' overal in
    // gebruik, dus dat is geen bedacht geval.
    expect(dagenTussen('2026-07', '2026-07-04')).toBe(Number.POSITIVE_INFINITY)
    expect(dagenTussen('2026', '2026-01-02')).toBe(Number.POSITIVE_INFINITY)
    expect(dagenTussen('2026-07-04T10:00:00', '2026-07-04')).toBe(Number.POSITIVE_INFINITY)
  })

  it('weigert een dag die niet op de kalender staat', () => {
    // `Date.parse` weigert '2026-13-45', maar '2026-02-30' NIET: dat rolt stil door
    // naar 2 maart. Zonder terugrekening zou een boeking van 5 maart op drie dagen
    // van "30 februari" liggen en als vermoedelijk duplicaat gelden.
    expect(dagenTussen('2026-02-30', '2026-03-05')).toBe(Number.POSITIVE_INFINITY)
    expect(dagenTussen('2026-04-31', '2026-05-01')).toBe(Number.POSITIVE_INFINITY)
    expect(dagenTussen('2026-13-45', '2026-05-01')).toBe(Number.POSITIVE_INFINITY)
    // 2024 is wél een schrikkeljaar, 2026 niet.
    expect(dagenTussen('2024-02-29', '2024-03-01')).toBe(1)
    expect(dagenTussen('2026-02-29', '2026-03-01')).toBe(Number.POSITIVE_INFINITY)
  })

  it('legt een onleesbare datum buiten elke marge', () => {
    // Niet 0 en niet NaN: `Infinity` zegt "dit past bij niets", en dat is wat een
    // vergelijking met een marge ervan moet maken.
    expect(dagenTussen('geen datum', '2026-05-04')).toBe(Number.POSITIVE_INFINITY)
  })
})

// ---------------------------------------------------------------------------
// dagenVerschil — de ene som die de drie eigen versies vervangt (ronde 55)
// ---------------------------------------------------------------------------
describe('dagenVerschil', () => {
  it('telt met teken: negatief wanneer "tot" vóór "van" ligt', () => {
    expect(dagenVerschil('2026-05-01', '2026-05-04')).toBe(3)
    expect(dagenVerschil('2026-05-04', '2026-05-01')).toBe(-3)
    expect(dagenVerschil('2026-05-04', '2026-05-04')).toBe(0)
  })

  it('telt over een maand- en een jaargrens heen', () => {
    expect(dagenVerschil('2026-02-27', '2026-03-02')).toBe(3)
    expect(dagenVerschil('2025-12-30', '2026-01-02')).toBe(3)
    // Schrikkeljaar: 2024 heeft een 29 februari.
    expect(dagenVerschil('2024-02-28', '2024-03-01')).toBe(2)
  })

  it('geeft null bij alles wat geen echte kalenderdag is', () => {
    // Dit is de kern van de ronde: de eigen versie in meldingen.ts gaf hier 0, en
    // "0 dagen geleden" haalt élk venster — dus kwam er altijd een melding.
    expect(dagenVerschil('2026-05', '2026-05-04')).toBeNull()
    expect(dagenVerschil('2026-13-45', '2026-05-04')).toBeNull()
    // 30 februari bestaat niet, maar Date.parse rolt hem stil door naar 2 maart.
    expect(dagenVerschil('2026-02-30', '2026-03-05')).toBeNull()
    expect(dagenVerschil('', '2026-03-05')).toBeNull()
    expect(dagenVerschil('2026-03-05', 'morgen')).toBeNull()
  })

  it('is de bron van dagenTussen, dat hetzelfde antwoord zonder teken geeft', () => {
    expect(dagenTussen('2026-05-04', '2026-05-01')).toBe(3)
    expect(dagenTussen('2026-05-01', '2026-05-04')).toBe(3)
    expect(dagenTussen('2026-02-30', '2026-03-05')).toBe(Number.POSITIVE_INFINITY)
  })
})

// ---------------------------------------------------------------------------
describe('verschuifDatumMaanden', () => {
  it('telt hele kalendermaanden op en af', () => {
    expect(verschuifDatumMaanden('2026-04-15', -1)).toBe('2026-03-15')
    expect(verschuifDatumMaanden('2026-04-15', -2)).toBe('2026-02-15')
    expect(verschuifDatumMaanden('2026-04-15', 24)).toBe('2028-04-15')
  })

  it('is NIET hetzelfde als dertig dagen, en dat is de hele reden dat ze bestaat', () => {
    // Naast elkaar gezet, met de dagen-som er echt bij gerekend in plaats van
    // overgeschreven. Twee gevallen waarin dagen rekenen TE LAAT uitkomt:
    const dagen = (iso: string, n: number) =>
      new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
    // Eén maand vóór 15 april is 15 maart; dertig dagen terug is 16 maart.
    expect(verschuifDatumMaanden('2026-04-15', -1)).toBe('2026-03-15')
    expect(dagen('2026-04-15', -30)).toBe('2026-03-16')
    // Twee maanden vóór 15 september is 15 juli; zestig dagen terug is 17 juli.
    expect(verschuifDatumMaanden('2026-09-15', -2)).toBe('2026-07-15')
    expect(dagen('2026-09-15', -60)).toBe('2026-07-17')
  })

  it('klemt de dag op de laatste dag van de doelmaand', () => {
    expect(verschuifDatumMaanden('2025-01-31', 1)).toBe('2025-02-28')
    expect(verschuifDatumMaanden('2024-01-31', 1)).toBe('2024-02-29')
    expect(verschuifDatumMaanden('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('schrijft het jaartal altijd met vier cijfers', () => {
    // Zonder aanvulling wordt dit '901-06-15', en in een tekstvergelijking is dat
    // GROTER dan '2026-…' omdat '9' > '2'. Zo gold een datum uit het jaar 900 als
    // toekomst, en klapte de planpagina om.
    expect(verschuifDatumMaanden('0900-06-15', 12)).toBe('0901-06-15')
    expect(verschuifDatumMaanden('0099-12-31', 1)).toBe('0100-01-31')
  })

  it('kent de schrikkeljaren ook bij een jaartal onder de honderd', () => {
    // `Date.UTC(jaar, …)` beeldt de jaren 0 tot 99 af op 1900 tot 1999, en 1904 en 4
    // zijn allebei schrikkeljaren — maar 1900 en 0 niet allebei: het jaar 0 wél,
    // 1900 niet. Vandaar `setUTCFullYear` in de bron.
    expect(verschuifDatumMaanden('0000-01-31', 1)).toBe('0000-02-29')
    expect(verschuifDatumMaanden('0100-01-31', 1)).toBe('0100-02-28')
  })

  it('geeft null bij een datum die geen echte kalenderdag is', () => {
    expect(verschuifDatumMaanden('2026-02-30', 1)).toBeNull()
    expect(verschuifDatumMaanden('2026-04', 1)).toBeNull()
    expect(verschuifDatumMaanden('', 1)).toBeNull()
  })

  it('geeft null in plaats van een jaartal vóór het jaar 0', () => {
    expect(verschuifDatumMaanden('0001-01-15', -24)).toBeNull()
  })
})
