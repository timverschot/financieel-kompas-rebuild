import { describe, it, expect } from 'vitest'
import { splitsCsv, raadScheider, decodeerTekst, zonderRommelregels, lijktOpCsv, meestVoorkomendeBreedte } from './csv'

describe('splitsCsv', () => {
  it('splitst gewone rijen', () => {
    expect(splitsCsv('a;b;c\n1;2;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('laat het scheidingsteken binnen aanhalingstekens met rust', () => {
    // Dit is het geval waarvoor deze lezer bestaat: zonder het respecteren van de
    // aanhalingstekens schuift elke kolom erna één plaats op.
    expect(splitsCsv('datum;omschrijving;bedrag\n01/02/2026;"COLRUYT, HALLE";-12,50')).toEqual([
      ['datum', 'omschrijving', 'bedrag'],
      ['01/02/2026', 'COLRUYT, HALLE', '-12,50'],
    ])
  })

  it('leest een dubbel aanhalingsteken als één teken', () => {
    expect(splitsCsv('a;"zeg ""hallo""";b')).toEqual([['a', 'zeg "hallo"', 'b']])
  })

  it('laat een regeleinde binnen aanhalingstekens de rij niet afbreken', () => {
    expect(splitsCsv('a;"regel1\nregel2";c')).toEqual([['a', 'regel1\nregel2', 'c']])
  })

  it('leest Windows-regeleindes', () => {
    expect(splitsCsv('a;b\r\n1;2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('laat lege regels weg', () => {
    expect(splitsCsv('a;b\n\n1;2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('houdt lege velden aan het einde van een rij', () => {
    expect(splitsCsv('a;b;\n1;;3')).toEqual([
      ['a', 'b', ''],
      ['1', '', '3'],
    ])
  })
})

describe('raadScheider', () => {
  it('kiest de puntkomma bij Belgische bedragen met een komma', () => {
    const csv = 'datum;omschrijving;bedrag\n01/02/2026;Colruyt;-12,50\n02/02/2026;Delhaize;-8,20'
    expect(raadScheider(csv)).toBe(';')
  })

  it('kiest de komma bij een Engelstalig bestand', () => {
    const csv = 'date,description,amount\n2026-02-01,Colruyt,-12.50\n2026-02-02,Delhaize,-8.20'
    expect(raadScheider(csv)).toBe(',')
  })

  it('kiest de tab', () => {
    const csv = 'datum\tomschrijving\tbedrag\n01/02/2026\tColruyt\t-12,50'
    expect(raadScheider(csv)).toBe('\t')
  })

  it('laat zich niet misleiden door komma’s in de tekst', () => {
    // Elke rij bevat komma's in de bedragen én in de omschrijving, maar alleen de
    // puntkomma geeft op elke rij hetzelfde aantal kolommen.
    const csv =
      'datum;omschrijving;bedrag\n01/02/2026;COLRUYT, HALLE;-12,50\n02/02/2026;DELHAIZE, GENT, CENTRUM;-8,20'
    expect(raadScheider(csv)).toBe(';')
  })
})

describe('decodeerTekst', () => {
  const buffer = (bytes: number[]) => new Uint8Array(bytes).buffer

  it('leest gewone UTF-8', () => {
    expect(decodeerTekst(new TextEncoder().encode('Café Piano').buffer as ArrayBuffer)).toBe('Café Piano')
  })

  it('haalt de byte-volgordemarkering weg', () => {
    expect(decodeerTekst(buffer([0xef, 0xbb, 0xbf, 0x64, 0x61, 0x74, 0x75, 0x6d]))).toBe('datum')
  })

  it('valt terug op Windows-1252 bij een bestand dat geen UTF-8 is', () => {
    // 0xE9 is é in Windows-1252, maar op zichzelf ongeldige UTF-8. Zonder deze
    // terugval wordt "Café" stil "Caf<?>" — en dat blijft zo, ook in de back-up.
    expect(decodeerTekst(buffer([0x43, 0x61, 0x66, 0xe9]))).toBe('Café')
  })
})

// --- Ronde 37, na de verificatieronde: de preambule die banken meesturen ---

describe('raadScheider met een preambule', () => {
  it('laat zich niet misleiden door regels boven de tabel', () => {
    // Belgische banken zetten vaak rekeninginfo boven het uittreksel. Keken we
    // alleen naar de eerste rij, dan viel de puntkomma af en werd het bestand
    // geknipt op de komma uit de bedragen — met −12,50 dat +50,00 werd.
    const csv = [
      'Rekening: BE12 3456 7890 1234, EUR, Zichtrekening',
      'Periode: 01/02/2026 - 28/02/2026',
      'Datum;Omschrijving;Bedrag',
      '01/02/2026;COLRUYT HALLE;-12,50',
      '02/02/2026;DELHAIZE;-8,20',
    ].join('\n')
    expect(raadScheider(csv)).toBe(';')
  })
})

describe('zonderRommelregels', () => {
  it('gooit de regels weg die niet bij de tabel horen', () => {
    const rijen = [
      ['Rekening: BE12 3456 7890 1234'],
      ['Datum', 'Omschrijving', 'Bedrag'],
      ['01/02/2026', 'Colruyt', '-12,50'],
      ['02/02/2026', 'Delhaize', '-8,20'],
    ]
    expect(zonderRommelregels(rijen)).toEqual(rijen.slice(1))
  })

  it('laat een gewoon bestand ongemoeid', () => {
    const rijen = [
      ['Datum', 'Bedrag'],
      ['01/02/2026', '-12,50'],
    ]
    expect(zonderRommelregels(rijen)).toEqual(rijen)
  })
})

describe('meestVoorkomendeBreedte', () => {
  it('neemt de breedte die het vaakst voorkomt', () => {
    expect(meestVoorkomendeBreedte([['a'], ['a', 'b', 'c'], ['d', 'e', 'f']])).toBe(3)
  })
})

describe('lijktOpCsv', () => {
  it('herkent een gewoon uittreksel', () => {
    const csv = 'Datum;Bedrag\n01/02/2026;-12,50'
    expect(lijktOpCsv(csv, splitsCsv(csv))).toBe(true)
  })

  it('weigert een bestand met maar één kolom', () => {
    const tekst = 'dit is gewoon een tekstbestand\nzonder kolommen'
    expect(lijktOpCsv(tekst, splitsCsv(tekst))).toBe(false)
  })

  it('weigert een binair bestand', () => {
    // Een pdf of een Excel-bestand geeft bij het lezen tekenbrij in plaats van een
    // foutmelding. Zonder deze controle kreeg je "Kloppen de kolommen?" met onzin
    // erin, en de vraag om een datumkolom aan te duiden die er niet is.
    const brij = Array.from({ length: 400 }, (_, i) => String.fromCharCode(i % 32)).join('') + ';;\n;;'
    expect(lijktOpCsv(brij, splitsCsv(brij))).toBe(false)
  })
})

