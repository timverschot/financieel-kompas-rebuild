import { describe, it, expect } from 'vitest'
import {
  splitsCsv,
  raadScheider,
  decodeerTekst,
  zonderRommelregels,
  lijktOpCsv,
  meestVoorkomendeBreedte,
  maakCsv,
  metBom,
  veiligeCsvTekst,
} from './csv'

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


// ---------------------------------------------------------------------------
// SCHRIJVEN (ronde 41)
// ---------------------------------------------------------------------------

describe('maakCsv', () => {
  it('zet rijen om met puntkomma en CRLF', () => {
    expect(maakCsv([['a', 'b'], ['c', 'd']])).toBe('a;b\r\nc;d')
  })

  it('omhult een veld met het scheidingsteken erin', () => {
    expect(maakCsv([['COLRUYT; HALLE', '12,50']])).toBe('"COLRUYT; HALLE";12,50')
  })

  it('verdubbelt een aanhalingsteken in de tekst', () => {
    expect(maakCsv([['zaak "De Kroon"']])).toBe('"zaak ""De Kroon"""')
  })

  it('omhult een veld met een regeleinde erin', () => {
    expect(maakCsv([['twee\nregels']])).toBe('"twee\nregels"')
  })

  it('laat een gewoon veld onaangeroerd, ook met een komma erin', () => {
    // De komma is hier het DECIMAALteken en niet het scheidingsteken; die mag dus
    // kaal blijven staan. Zou hij omhuld worden, dan leest Excel er tekst in.
    expect(maakCsv([['12,50']])).toBe('12,50')
  })

  // Dit is de test die de twee helften van dit bestand aan elkaar vastzet: wat de
  // schrijver eruit stuurt, moet de lezer er weer in krijgen.
  it('is omkeerbaar: wat maakCsv schrijft, leest splitsCsv terug', () => {
    const rijen = [
      ['Datum', 'Handelaar', 'Bedrag'],
      ['2026-07-04', 'COLRUYT; HALLE', '-41,20'],
      ['2026-07-05', 'zaak "De Kroon"', '12,50'],
      ['2026-07-06', 'Café Piano', '-8,00'],
    ]
    expect(splitsCsv(maakCsv(rijen), ';')).toEqual(rijen)
  })

  it('overleeft een rondgang door de tekenset-lezer met markering', () => {
    const rijen = [['Handelaar'], ['Café Piano']]
    const bestand = metBom(maakCsv(rijen))
    // Zo komt het bestand terug binnen: als bytes, met de markering vooraan.
    const bytes = new TextEncoder().encode(bestand)
    expect(splitsCsv(decodeerTekst(bytes.buffer as ArrayBuffer), ';')).toEqual(rijen)
  })
})

describe('metBom', () => {
  it('zet precies één markering vooraan', () => {
    expect(metBom('a;b').charCodeAt(0)).toBe(0xfeff)
    expect(metBom('a;b').slice(1)).toBe('a;b')
  })
})

describe('veiligeCsvTekst', () => {
  it('zet een aanhalingsteken voor tekst die Excel als formule zou lezen', () => {
    expect(veiligeCsvTekst('=1+1')).toBe("'=1+1")
    expect(veiligeCsvTekst('+32 CALL')).toBe("'+32 CALL")
    expect(veiligeCsvTekst('@handel')).toBe("'@handel")
  })

  it('laat gewone tekst ongemoeid', () => {
    expect(veiligeCsvTekst('COLRUYT')).toBe('COLRUYT')
    expect(veiligeCsvTekst('Café Piano')).toBe('Café Piano')
  })

  it('raakt een negatief bedrag niet aan', () => {
    // Anders wordt van "-41,20" tekst in plaats van een getal, en kan je in Excel
    // je uitgaven niet meer optellen.
    expect(veiligeCsvTekst('-41,20')).toBe('-41,20')
  })
})

describe('maakCsv — de omkeerbaarheid ook in de lastige gevallen', () => {
  // Deze gevallen liepen vóór ronde 41 stuk: de lezer trimde ELK veld, ook een veld
  // dat tussen aanhalingstekens stond. Precies bij zo'n veld heeft de schrijver die
  // aanhalingstekens er net om gezet omdat de inhoud onaangeroerd moet blijven.
  const lastig: string[][][] = [
    [['regel1\n']],
    [[' voorloopspatie']],
    [['achterloopspatie ']],
    [['a', 'b\r\n']],
    [['"omhuld"', ' spaties rondom ']],
  ]

  for (const rijen of lastig) {
    it(`leest ${JSON.stringify(rijen)} onveranderd terug`, () => {
      expect(splitsCsv(maakCsv(rijen), ';')).toEqual(rijen)
    })
  }

  it('blijft spaties trimmen bij een veld dat NIET omhuld is', () => {
    // Dat is voor een bankbestand juist: daar staat vaak een spatie na de puntkomma.
    expect(splitsCsv('a; b ;c', ';')).toEqual([['a', 'b', 'c']])
  })
})

describe('veiligeCsvTekst — de overige gevaarlijke eerste tekens', () => {
  it('beschermt ook een tab en een regelterugloop vooraan', () => {
    expect(veiligeCsvTekst('\tkolom')).toBe("'\tkolom")
    expect(veiligeCsvTekst('\rregel')).toBe("'\rregel")
  })

  it('laat een tab midden in de tekst ongemoeid', () => {
    expect(veiligeCsvTekst('a\tb')).toBe('a\tb')
  })
})
