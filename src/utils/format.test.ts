import { describe, it, expect, afterEach } from 'vitest'
import { zetOpmaaktaal } from './opmaaktaal'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from './format'

describe('formatEuro', () => {
  it('toont centen als eurobedrag (950 centen -> 9,50)', () => {
    expect(formatEuro(-950)).toContain('9,50')
  })

  it('toont een groot bedrag met duizendtal (123456 centen -> 1.234,56)', () => {
    expect(formatEuro(123456)).toContain('1.234,56')
  })
})

describe('invoerNaarCenten', () => {
  it('leest een komma-bedrag in als centen', () => {
    expect(invoerNaarCenten('12,50')).toBe(1250)
  })

  it('leest ook een punt-bedrag in als centen', () => {
    expect(invoerNaarCenten('12.5')).toBe(1250)
  })

  it('geeft NaN bij ongeldige invoer', () => {
    expect(Number.isNaN(invoerNaarCenten('abc'))).toBe(true)
  })

  it('leest de Belgische notatie met duizendtalpunt en komma (1.234,50 -> 123450)', () => {
    expect(invoerNaarCenten('1.234,50')).toBe(123450)
  })

  it('weigert trailing rommel (12abc -> NaN)', () => {
    expect(Number.isNaN(invoerNaarCenten('12abc'))).toBe(true)
  })

  it('negeert spaties rond het bedrag', () => {
    expect(invoerNaarCenten('  12,50 ')).toBe(1250)
  })
})

describe('centenNaarInvoer', () => {
  it('toont centen als bewerkbare invoerstring met twee decimalen', () => {
    expect(centenNaarInvoer(1250)).toBe('12,50')
    expect(centenNaarInvoer(1200)).toBe('12,00')
  })
})

describe('de bedragopmaak volgt de taal (ronde 54)', () => {
  afterEach(() => zetOpmaaktaal('nl'))

  it('gebruikt per taal de notatie die daar hoort', () => {
    expect(formatEuro(1250)).toContain('12,50')
    zetOpmaaktaal('en')
    expect(formatEuro(1250)).toContain('12.50')
    zetOpmaaktaal('fr')
    expect(formatEuro(1250)).toContain('12,50')
  })

  it('laat de CSV-notatie ONGEMOEID', () => {
    // `centenNaarInvoer` schrijft de bedragen in een CSV-bestand. Komma als
    // decimaalteken hoort daar bij de puntkomma als scheidingsteken en de
    // byte-volgordemarkering; vertaal je er één van, dan valt het bestand uit
    // elkaar in een Belgisch Excel.
    zetOpmaaktaal('en')
    expect(centenNaarInvoer(1250)).toBe('12,50')
    zetOpmaaktaal('fr')
    expect(centenNaarInvoer(1250)).toBe('12,50')
  })

  it('zet geen smalle vaste spatie in een bedrag — die kan niet in een PDF', () => {
    // U+202F is wat `Intl` in het Frans als duizendtalscheiding gebruikt, en dat
    // teken bestaat niet in de tekentabel van het lettertype in jsPDF. Elk bedrag
    // vanaf duizend euro kwam daardoor als tekenbrij op papier — juist de
    // totaalregel onderaan een afrekening. Zie de uitleg bij `formatEuro`.
    for (const taal of ['nl', 'en', 'fr'] as const) {
      zetOpmaaktaal(taal)
      const groot = formatEuro(123456789)
      expect({ taal, smal: groot.includes('\u202f') }).toEqual({ taal, smal: false })
      // De gewone vaste spatie mag er wél in: die staat in WinAnsi en breekt niet af.
      expect({ taal, cijfers: groot.replace(/[^0-9]/g, '') }).toEqual({ taal, cijfers: '123456789' })
    }
  })

  it('leest een getypt bedrag in élke taal even soepel', () => {
    // De INVOERkant blijft bewust tolerant: punt én komma worden aanvaard.
    zetOpmaaktaal('en')
    expect(invoerNaarCenten('12.50')).toBe(1250)
    expect(invoerNaarCenten('12,50')).toBe(1250)
  })
})
