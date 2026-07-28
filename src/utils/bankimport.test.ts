import { describe, it, expect } from 'vitest'
import {
  leesBedrag,
  leesDatum,
  raadKolommen,
  heeftKoprij,
  bouwKandidaten,
  markeerDubbels,
  formaatSleutel,
  raadDatumvolgorde,
  type Kolommen,
} from './bankimport'
import type { Transactie } from '../data/schema'

describe('leesBedrag', () => {
  it('leest de Belgische schrijfwijze', () => {
    expect(leesBedrag('-12,50')).toBe(-1250)
    expect(leesBedrag('1.234,56')).toBe(123456)
    expect(leesBedrag('0,05')).toBe(5)
  })

  it('leest de Engelse schrijfwijze', () => {
    expect(leesBedrag('-12.50')).toBe(-1250)
    expect(leesBedrag('1,234.56')).toBe(123456)
  })

  it('leest een duizendtalteken zonder decimalen als een heel bedrag', () => {
    // Dit is de valstrik: "1.234" is twaalfhonderd euro, niet 1 euro 234.
    expect(leesBedrag('1.234')).toBe(123400)
    expect(leesBedrag('1,234')).toBe(123400)
    // Maar drie cijfers ACHTER een tweede teken is wél een duizendtal:
    expect(leesBedrag('1.234.567,89')).toBe(123456789)
  })

  it('laat zich niet verwarren door munt, spaties en een plusteken', () => {
    expect(leesBedrag('€ 12,50')).toBe(1250)
    expect(leesBedrag('+ 1 234,56')).toBe(123456)
    expect(leesBedrag('1 234,56')).toBe(123456)
  })

  it('leest een minteken achteraan en haakjes als negatief', () => {
    expect(leesBedrag('12,50-')).toBe(-1250)
    expect(leesBedrag('(12,50)')).toBe(-1250)
  })

  it('leest een bedrag met een muntcode erbij', () => {
    expect(leesBedrag('12,50 EUR')).toBe(1250)
    expect(leesBedrag('EUR 12,50')).toBe(1250)
  })

  it('weigert wat geen bedrag is', () => {
    expect(leesBedrag('')).toBeNull()
    expect(leesBedrag('EUR')).toBeNull()
    expect(leesBedrag('Colruyt')).toBeNull()
    expect(leesBedrag('12,3456')).toBeNull()
  })
})

describe('leesDatum', () => {
  it('leest dag-eerst, zoals elke Belgische bank exporteert', () => {
    expect(leesDatum('03/04/2026')).toBe('2026-04-03')
    expect(leesDatum('3-4-2026')).toBe('2026-04-03')
    expect(leesDatum('03.04.2026')).toBe('2026-04-03')
  })

  it('leest een jaar-eerst-datum zoals ze bedoeld is', () => {
    expect(leesDatum('2026-04-03')).toBe('2026-04-03')
  })

  it('vult een jaartal van twee cijfers aan', () => {
    expect(leesDatum('03/04/26')).toBe('2026-04-03')
  })

  it('weigert onmogelijke datums en gewone tekst', () => {
    expect(leesDatum('32/04/2026')).toBeNull()
    expect(leesDatum('03/13/2026')).toBeNull()
    expect(leesDatum('Colruyt')).toBeNull()
    expect(leesDatum('')).toBeNull()
  })
})

describe('heeftKoprij', () => {
  it('herkent een rij met kolomnamen', () => {
    expect(heeftKoprij([['Datum', 'Omschrijving', 'Bedrag'], ['01/02/2026', 'Colruyt', '-12,50']])).toBe(true)
  })

  it('ziet een bestand zonder koprij als gegevens', () => {
    expect(heeftKoprij([['01/02/2026', 'Colruyt', '-12,50']])).toBe(false)
  })
})

describe('raadKolommen', () => {
  it('herkent Nederlandse kolomnamen', () => {
    const rollen = raadKolommen(
      ['Boekingsdatum', 'Tegenpartij', 'Mededeling', 'Bedrag'],
      [['01/02/2026', 'COLRUYT', 'aankoop', '-12,50']],
    )
    expect(rollen).toEqual(['datum', 'tegenpartij', 'mededeling', 'bedrag'])
  })

  it('herkent Franse kolomnamen', () => {
    const rollen = raadKolommen(
      ['Date', 'Contrepartie', 'Montant'],
      [['01/02/2026', 'COLRUYT', '-12,50']],
    )
    expect(rollen).toEqual(['datum', 'tegenpartij', 'bedrag'])
  })

  it('neemt de eerste datumkolom en laat een tweede met rust', () => {
    const rollen = raadKolommen(
      ['Boekingsdatum', 'Valutadatum', 'Omschrijving', 'Bedrag'],
      [['01/02/2026', '02/02/2026', 'Colruyt', '-12,50']],
    )
    expect(rollen[0]).toBe('datum')
    expect(rollen[1]).toBe('negeren')
  })

  it('herkent aparte debet- en creditkolommen', () => {
    const rollen = raadKolommen(
      ['Datum', 'Omschrijving', 'Debet', 'Credit'],
      [['01/02/2026', 'Colruyt', '12,50', '']],
    )
    expect(rollen).toEqual(['datum', 'omschrijving', 'bedrag-af', 'bedrag-bij'])
  })

  it('raadt op de inhoud wanneer er geen kolomnamen zijn', () => {
    const rollen = raadKolommen(null, [
      ['01/02/2026', 'COLRUYT HALLE', '-12,50'],
      ['02/02/2026', 'DELHAIZE GENT CENTRUM', '-8,20'],
      ['03/02/2026', 'LOON FEBRUARI', '2400,00'],
    ])
    expect(rollen).toEqual(['datum', 'omschrijving', 'bedrag'])
  })

  it('kiest het bedrag en niet het saldo', () => {
    // Een saldokolom bestaat óók volledig uit getallen. Het verschil: in de
    // bedragkolom staan negatieve getallen.
    const rollen = raadKolommen(null, [
      ['01/02/2026', 'Colruyt', '-12,50', '1000,00'],
      ['02/02/2026', 'Delhaize', '-8,20', '991,80'],
      ['03/02/2026', 'Loon', '2400,00', '3391,80'],
    ])
    expect(rollen[2]).toBe('bedrag')
    expect(rollen[3]).toBe('negeren')
  })
})

describe('bouwKandidaten', () => {
  const kolommen: Kolommen = ['datum', 'tegenpartij', 'mededeling', 'bedrag']

  it('zet een rij om naar een boeking', () => {
    const [k] = bouwKandidaten([['01/02/2026', 'COLRUYT', 'aankoop', '-12,50']], kolommen)
    // De mededeling komt er BEWUST niet bij: zie de test verderop over de
    // winkelnaam.
    expect(k).toMatchObject({ datum: '2026-02-01', omschrijving: 'COLRUYT', bedrag: -1250 })
    expect(k.probleem).toBeUndefined()
  })

  it('herhaalt de naam van de tegenpartij niet', () => {
    const [k] = bouwKandidaten([['01/02/2026', 'Colruyt', 'COLRUYT', '-12,50']], kolommen)
    expect(k.omschrijving).toBe('Colruyt')
  })

  it('maakt van een debetkolom een negatief bedrag, ook zonder minteken', () => {
    const [k] = bouwKandidaten(
      [['01/02/2026', 'Colruyt', '12,50', '']],
      ['datum', 'omschrijving', 'bedrag-af', 'bedrag-bij'],
    )
    expect(k.bedrag).toBe(-1250)
  })

  it('maakt van een creditkolom een positief bedrag', () => {
    const [k] = bouwKandidaten(
      [['01/02/2026', 'Loon', '', '2400,00']],
      ['datum', 'omschrijving', 'bedrag-af', 'bedrag-bij'],
    )
    expect(k.bedrag).toBe(240000)
  })

  it('meldt wat er aan een regel mankeert in plaats van ze stil te laten vallen', () => {
    const rijen = [
      ['geen datum', 'Colruyt', '', '-12,50'],
      ['01/02/2026', 'Colruyt', '', 'EUR'],
    ]
    const uit = bouwKandidaten(rijen, kolommen)
    expect(uit.map((k) => k.probleem)).toEqual(['geen-datum', 'geen-bedrag'])
  })
})

describe('markeerDubbels', () => {
  const tx = (id: string, datum: string, bedrag: number, rekeningId = 'r1'): Transactie => ({
    id,
    datum,
    omschrijving: 'bestaand',
    bedrag,
    rekeningId,
  })

  it('markeert een regel die al geboekt is op dezelfde rekening', () => {
    const kandidaten = bouwKandidaten([['01/02/2026', 'Colruyt', '', '-12,50']], [
      'datum',
      'tegenpartij',
      'mededeling',
      'bedrag',
    ])
    const uit = markeerDubbels(kandidaten, [tx('t1', '2026-02-01', -1250)], 'r1')
    expect(uit[0].lijktOp).toBe('t1')
  })

  it('kijkt alleen naar de rekening waarin je inleest', () => {
    const kandidaten = bouwKandidaten([['01/02/2026', 'Colruyt', '', '-12,50']], [
      'datum',
      'tegenpartij',
      'mededeling',
      'bedrag',
    ])
    const uit = markeerDubbels(kandidaten, [tx('t1', '2026-02-01', -1250, 'r2')], 'r1')
    expect(uit[0].lijktOp).toBeUndefined()
  })

  it('gebruikt elke bestaande boeking maar één keer', () => {
    // Twee identieke regels in het bestand, maar één bestaande boeking: dan is er
    // precies één een dubbel en de andere een echte tweede aankoop.
    const kandidaten = bouwKandidaten(
      [
        ['01/02/2026', 'Q8', '', '-50,00'],
        ['01/02/2026', 'Q8', '', '-50,00'],
      ],
      ['datum', 'tegenpartij', 'mededeling', 'bedrag'],
    )
    const uit = markeerDubbels(kandidaten, [tx('t1', '2026-02-01', -5000)], 'r1')
    expect(uit.filter((k) => k.lijktOp).length).toBe(1)
  })
})

describe('formaatSleutel', () => {
  const rijen = [['01/02/2026', '-12,50']]

  it('is gelijk voor twee bestanden met dezelfde kolommen', () => {
    expect(formaatSleutel(['Datum', 'Bedrag'], rijen)).toBe(formaatSleutel(['datum', ' BEDRAG '], rijen))
  })

  it('verschilt zodra de kolommen verschillen', () => {
    expect(formaatSleutel(['Datum', 'Bedrag'], rijen)).not.toBe(formaatSleutel(['Datum', 'Saldo'], rijen))
  })

  it('houdt twee banken zonder koprij uit elkaar', () => {
    // Allebei vier kolommen, maar bij de ene staat de tekst links en bij de andere
    // rechts. Zonder de vorm mee te nemen zouden ze elkaars onthouden kolomkeuze
    // gebruiken — en dan lees je de saldokolom in als bedrag.
    const bankA = [['01/02/2026', 'COLRUYT', '-12,50', '1000,00']]
    const bankB = [['01/02/2026', '-12,50', '1000,00', 'COLRUYT']]
    expect(formaatSleutel(null, bankA)).not.toBe(formaatSleutel(null, bankB))
  })
})

// --- De fouten die de verificatieronde van ronde 37 aan het licht bracht ---

describe('leesBedrag — wat er stil fout ging', () => {
  it('leest drie decimalen niet als duizendtal', () => {
    // '0,005' werd € 5,00. Elk bedrag met drie cijfers achter de komma ging maal
    // duizend, zonder één foutmelding.
    expect(leesBedrag('0,005')).toBeNull()
    expect(leesBedrag('0.005')).toBeNull()
    // Maar een echt duizendtal blijft werken.
    expect(leesBedrag('1.234')).toBe(123400)
  })

  it('leest een datum niet als bedrag', () => {
    // '20260201' werd € 20.260.201,00 en '1.2.26' werd € 12,26 — allebei stil in
    // de kolom die de app dan als bedragkolom koos.
    expect(leesBedrag('20260201')).toBeNull()
    expect(leesBedrag('1.2.26')).toBeNull()
    expect(leesBedrag('31.12.26')).toBeNull()
  })

  it('laat haakjes en een minteken elkaar niet opheffen', () => {
    expect(leesBedrag('(-12,34)')).toBe(-1234)
  })
})

describe('leesDatum — onmogelijke datums', () => {
  it('weigert een dag die in die maand niet bestaat', () => {
    // '2026-02-31' kwam anders gewoon in de database, en dan telt de app die
    // boeking in februari maar toont ze in maart.
    expect(leesDatum('31/02/2026')).toBeNull()
    expect(leesDatum('31/04/2026')).toBeNull()
    expect(leesDatum('29/02/2026')).toBeNull()
    // 2028 is wél een schrikkeljaar.
    expect(leesDatum('29/02/2028')).toBe('2028-02-29')
  })
})

describe('raadDatumvolgorde', () => {
  it('herkent dag-eerst aan een dag boven 12', () => {
    expect(raadDatumvolgorde(['03/04/2026', '31/12/2026'])).toBe('dag-eerst')
  })

  it('herkent maand-eerst aan een tweede getal boven 12', () => {
    expect(raadDatumvolgorde(['04/03/2026', '12/31/2026'])).toBe('maand-eerst')
  })

  it('houdt bij twijfel dag-eerst aan, zoals elke Belgische bank exporteert', () => {
    expect(raadDatumvolgorde(['03/04/2026', '05/06/2026'])).toBe('dag-eerst')
  })

  it('leest een hele kolom maand-eerst wanneer dat blijkt', () => {
    const uit = bouwKandidaten(
      [
        ['04/03/2026', 'Colruyt', '', '-12,50'],
        ['12/31/2026', 'Delhaize', '', '-8,20'],
      ],
      ['datum', 'tegenpartij', 'mededeling', 'bedrag'],
    )
    expect(uit[0].datum).toBe('2026-04-03')
    expect(uit[1].datum).toBe('2026-12-31')
  })
})

describe('raadKolommen — de saldokolom', () => {
  it('kiest het bedrag en niet het saldo, ook zonder negatieve bedragen', () => {
    // Een spaarrekening met alleen stortingen. Vroeger won de meest linkse kolom,
    // en dat was het saldo: je las dan € 1.000 in waar € 10 stond.
    const rollen = raadKolommen(null, [
      ['01/02/2026', 'RENTE', '1000,00', '10,00'],
      ['02/02/2026', 'STORTING', '1500,00', '500,00'],
      ['03/02/2026', 'LOON', '3900,00', '2400,00'],
    ])
    expect(rollen[3]).toBe('bedrag')
    expect(rollen[2]).toBe('negeren')
  })

  it('sluit een kolom uit die "saldo" heet', () => {
    const rollen = raadKolommen(
      ['Datum', 'Naam verrichting', 'Saldo na verrichting', 'Som'],
      [
        ['01/02/2026', 'Colruyt', '991,80', '-12,50'],
        ['02/02/2026', 'Delhaize', '983,60', '-8,20'],
      ],
    )
    expect(rollen[3]).toBe('bedrag')
    expect(rollen[2]).toBe('negeren')
  })

  it('laat één onleesbare waarde een hele kolom niet afkeuren', () => {
    const rollen = raadKolommen(
      ['Datum', 'Naam', 'Som'],
      [
        ['01/02/2026', 'Colruyt', '-12,50'],
        ['02/02/2026', 'Delhaize', '-8,20'],
        ['03/02/2026', 'Q8', '-50,00 EUR'],
        ['04/02/2026', 'Loon', '2400,00'],
      ],
    )
    expect(rollen[2]).toBe('bedrag')
  })
})

describe('bouwKandidaten — de omschrijving blijft een winkelnaam', () => {
  it('neemt de mededeling niet mee zolang er een tegenpartij is', () => {
    // Bij een kaartbetaling staat in de mededeling een uniek referentienummer.
    // Namen we dat mee, dan kreeg élke boeking een unieke "winkelnaam" en werkten
    // de categorievoorstellen net na een import niet meer.
    const [k] = bouwKandidaten(
      [['01/02/2026', 'COLRUYT HALLE', 'BETALING KAART 1234 REF 998877', '-12,50']],
      ['datum', 'tegenpartij', 'mededeling', 'bedrag'],
    )
    expect(k.omschrijving).toBe('COLRUYT HALLE')
  })

  it('valt wél terug op de mededeling wanneer er verder niets is', () => {
    const [k] = bouwKandidaten(
      [['01/02/2026', '', 'BANKKOSTEN', '-3,50']],
      ['datum', 'tegenpartij', 'mededeling', 'bedrag'],
    )
    expect(k.omschrijving).toBe('BANKKOSTEN')
  })

  it('houdt een boeking zonder enige tekst in de lijst', () => {
    // Een geldopname heeft soms geen omschrijving. Die regel weggooien zou
    // betekenen dat er geld van je rekening gaat zonder dat het ergens staat.
    const [k] = bouwKandidaten(
      [['01/02/2026', '', '', '-100,00']],
      ['datum', 'tegenpartij', 'mededeling', 'bedrag'],
    )
    expect(k.probleem).toBeUndefined()
    expect(k.omschrijving.length).toBeGreaterThan(0)
  })
})
