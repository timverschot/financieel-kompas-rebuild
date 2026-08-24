import { describe, it, expect } from 'vitest'
import type { Spaardoel, Transactie } from '../data/schema'
import { vasteLastTransactieId } from './vooruitblik'
import {
  hangtErIetsAan,
  isInboekingVan,
  telVasteLastGebruik,
  telVasteLastVerwijzingen,
  vasteLastUndoTekst,
} from './vastelastverwijdering'

const t = (s: string, p?: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(p?.[k] ?? `{${k}}`))

function tx(over: Partial<Transactie> & { id: string }): Transactie {
  return { datum: '2026-03-05', omschrijving: 'Water', bedrag: -3000, rekeningId: 'r1', ...over }
}

function doel(over: Partial<Spaardoel> & { id: string }): Spaardoel {
  return { naam: 'Autoverzekering', doelbedrag: 60000, huidigBedrag: 0, ...over }
}

describe('isInboekingVan — het vaste id van "Boek in"', () => {
  it('herkent het id dat de app zelf maakt', () => {
    expect(isInboekingVan(vasteLastTransactieId('p1', '2026-03'), 'p1')).toBe(true)
  })

  it('laat de boeking van een ándere post met rust', () => {
    expect(isInboekingVan(vasteLastTransactieId('p2', '2026-03'), 'p1')).toBe(false)
  })

  it('eist dat de staart een MAAND is, en niet zomaar tekst', () => {
    // ⚠ Waarom dit geen kale `startsWith` mag zijn. Een post-id is een UUID met
    // streepjes; zonder deze toets zou 'tk-p1-iets-anders' als inboeking van 'p1'
    // gelden, en dan telt het venster boekingen mee die er niet bij horen.
    expect(isInboekingVan('tk-p1-maart', 'p1')).toBe(false)
    expect(isInboekingVan('tk-p1-2026-03-05', 'p1')).toBe(false)
    expect(isInboekingVan('tk-p1', 'p1')).toBe(false)
  })

  it('herkent een gewone, zelf ingetikte boeking NIET', () => {
    expect(isInboekingVan('abc', 'p1')).toBe(false)
  })
})

describe('telVasteLastVerwijzingen', () => {
  it('telt de drie soorten apart', () => {
    const tel = telVasteLastVerwijzingen('p1', {
      transacties: [
        tx({ id: vasteLastTransactieId('p1', '2026-01') }),
        tx({ id: vasteLastTransactieId('p1', '2026-02') }),
        tx({ id: 'zelf', vasteLastId: 'p1' }),
        tx({ id: 'andere', vasteLastId: 'p2' }),
        tx({ id: 'los' }),
      ],
      spaardoelen: [doel({ id: 'd1', vasteLastId: 'p1' }), doel({ id: 'd2' })],
    })
    expect(tel).toEqual({ ingeboekt: 2, aangeduid: 1, spaardoelen: 1 })
  })

  it('telt één boeking maar ÉÉN keer, ook wanneer ze allebei de kenmerken draagt', () => {
    // ⚠ Een boeking die "Boek in" maakte kan er later ook nog een `vasteLastId` bij
    // krijgen. Zonder de ontdubbeling zei het venster "2 boekingen" over één boeking.
    const tel = telVasteLastVerwijzingen('p1', {
      transacties: [tx({ id: vasteLastTransactieId('p1', '2026-01'), vasteLastId: 'p1' })],
    })
    expect(tel).toEqual({ ingeboekt: 1, aangeduid: 0, spaardoelen: 0 })
  })

  it('geeft nul terug zonder gegevens, in plaats van te struikelen', () => {
    expect(telVasteLastVerwijzingen('p1', {})).toEqual({ ingeboekt: 0, aangeduid: 0, spaardoelen: 0 })
  })
})

describe('hangtErIetsAan — de vraag of de app een vraag stelt', () => {
  it('is onwaar voor een kost waar niets aan hangt', () => {
    expect(hangtErIetsAan('p1', { transacties: [tx({ id: 'los' })], spaardoelen: [doel({ id: 'd2' })] })).toBe(false)
  })

  it('is waar bij elk van de drie soorten afzonderlijk', () => {
    expect(hangtErIetsAan('p1', { transacties: [tx({ id: vasteLastTransactieId('p1', '2026-01') })] })).toBe(true)
    expect(hangtErIetsAan('p1', { transacties: [tx({ id: 'zelf', vasteLastId: 'p1' })] })).toBe(true)
    expect(hangtErIetsAan('p1', { spaardoelen: [doel({ id: 'd1', vasteLastId: 'p1' })] })).toBe(true)
  })
})

describe('telVasteLastGebruik — de regels in het venster', () => {
  it('laat regels weg die op nul staan', () => {
    const regels = telVasteLastGebruik(t, 'p1', { spaardoelen: [doel({ id: 'd1', vasteLastId: 'p1' })] })
    expect(regels).toHaveLength(1)
    expect(regels[0].kop).toContain('1 spaardoel(en)')
  })

  it('zet het AANTAL in de kop en het gevolg in de uitleg', () => {
    // ⚠ In een echte browser gemeten: als één zin werden dit drie halfvette alinea's
    // onder elkaar, en dan lees je er geen van drie. Het aantal hoort vooraan te staan.
    const regels = telVasteLastGebruik(t, 'p1', { spaardoelen: [doel({ id: 'd1', vasteLastId: 'p1' })] })
    expect(regels[0].kop).not.toContain('.')
    expect(regels[0].uitleg.length).toBeGreaterThan(20)
    expect(regels[0].uitleg).not.toContain('{n}')
  })

  it('is LEEG wanneer er niets hangt', () => {
    // Het venster gaat dan niet open; een zin die niemand ziet, hoort er niet te zijn.
    expect(telVasteLastGebruik(t, 'p1', {})).toEqual([])
  })

  it('zegt bij de boekingen dat ze BLIJVEN staan', () => {
    // ⚠ De hele reden van dit venster: niemand mag denken dat zijn boekingen
    // meeverdwijnen. Dat is precies de angst die een kaal kruisje oproept.
    const regels = telVasteLastGebruik(t, 'p1', {
      transacties: [tx({ id: vasteLastTransactieId('p1', '2026-01') }), tx({ id: 'zelf', vasteLastId: 'p1' })],
    })
    expect(regels).toHaveLength(2)
    for (const r of regels) expect(r.uitleg).toContain('blijven staan')
  })
})

describe('vasteLastUndoTekst', () => {
  it('noemt alleen de naam wanneer er niets meeging', () => {
    expect(vasteLastUndoTekst(t, 'Water', { ingeboekt: 0, aangeduid: 0, spaardoelen: 0 })).toBe('Water verwijderd')
  })

  it('telt ingeboekte en aangeduide boekingen samen', () => {
    expect(vasteLastUndoTekst(t, 'Water', { ingeboekt: 2, aangeduid: 1, spaardoelen: 0 })).toBe(
      'Water verwijderd, 3 boeking(en) blijven staan',
    )
  })

  it('noemt de spaardoelen apart', () => {
    expect(vasteLastUndoTekst(t, 'Water', { ingeboekt: 0, aangeduid: 0, spaardoelen: 1 })).toBe(
      'Water verwijderd, 1 spaardoel(en) blijven lopen',
    )
  })

  it('noemt allebei wanneer er allebei is', () => {
    expect(vasteLastUndoTekst(t, 'Water', { ingeboekt: 1, aangeduid: 0, spaardoelen: 2 })).toBe(
      'Water verwijderd, 1 boeking(en) blijven staan en 2 spaardoel(en) blijven lopen',
    )
  })
})
