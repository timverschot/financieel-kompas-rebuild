import { describe, it, expect } from 'vitest'
import type { GedeeldeKost, Verrekening } from '../data/schema'
import { afrekeningTitel, kostenOmTeHeropenen, kostenVanAfrekening, telAfrekeningVerwijderen } from './afrekeningverwijdering'
import { formatEuro } from './format'

const t = (s: string, p?: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(p?.[k] ?? `{${k}}`))

const kost = (id: string, extra: Partial<GedeeldeKost> = {}): GedeeldeKost => ({
  id,
  dossierId: 'd1',
  omschrijving: 'Schoolrekening',
  bedrag: 5000,
  betaaldDoor: 'jij',
  datum: '2026-03-04',
  ...extra,
})

const afrekening: Verrekening = { id: 'v1', dossierId: 'd1', datum: '2026-04-01', bedrag: 7200, kostIds: ['a', 'b'] }

describe('afrekeningverwijdering', () => {
  it('vindt de kosten die deze afrekening dekt', () => {
    const gevonden = kostenVanAfrekening(afrekening, [kost('a'), kost('b'), kost('c')])
    expect(gevonden.map((k) => k.id)).toEqual(['a', 'b'])
  })


  it('noemt altijd het bedrag en de opbouw', () => {
    const regels = telAfrekeningVerwijderen(t, afrekening, [])
    expect(regels[0]).toContain(formatEuro(7200))
  })

  it('toont het bedrag zonder minteken, ook wanneer de partner jou verschuldigd is', () => {
    const regels = telAfrekeningVerwijderen(t, { ...afrekening, bedrag: -7200 }, [])
    expect(regels[0]).toContain(formatEuro(7200))
    expect(regels[0]).not.toContain('-')
  })

  it('telt óók de kosten die alleen via de oude koppeling aan deze afrekening hangen', () => {
    // ⚠ Zonder deze vereniging telde regel 1 alleen `kostIds` en regel 2 ook de
    // `verrekeningId`-koppelingen. Bij een oud dossier zónder `kostIds` stond er dan
    // "3 komen weer open" zonder dat ooit gezegd was dát er kosten aan hingen.
    const zonderKostIds: Verrekening = { id: 'v1', dossierId: 'd1', datum: '2026-04-01', bedrag: 7200 }
    const regels = telAfrekeningVerwijderen(t, zonderKostIds, [kost('a', { verrekeningId: 'v1' }), kost('b')])
    expect(regels.join(' ')).toContain('1 gedeelde kost(en) blijven bestaan')
    expect(regels.join(' ')).toContain('1 kost(en) komen weer op')
  })

  it('telt de kosten die blijven bestaan', () => {
    const regels = telAfrekeningVerwijderen(t, afrekening, [kost('a'), kost('b')])
    expect(regels.join(' ')).toContain('2 gedeelde kost(en) blijven bestaan')
  })

  it('zwijgt over heropenen zolang de afrekening niet overgemaakt is', () => {
    // ⚠ De kern van deze ronde. Alleen een OVERGEMAAKTE afrekening heeft kosten
    // dichtgezet; verdwijnt ze, dan moeten die weer meetellen in het saldo. Staat
    // ze nog open, dan verandert er niets aan de kosten en mag het venster daar
    // ook niets over beweren.
    const regels = telAfrekeningVerwijderen(t, afrekening, [kost('a', { afgerekend: true })])
    expect(regels.join(' ')).not.toContain('komen weer op')
  })

  it('telt bij een overgemaakte afrekening hoeveel kosten weer opengaan', () => {
    const regels = telAfrekeningVerwijderen(t, { ...afrekening, overgemaakt: true }, [
      kost('a', { afgerekend: true }),
      kost('b'),
    ])
    expect(regels.join(' ')).toContain('1 kost(en) komen weer op')
  })

  it('schrijft de dag voluit in de titel, niet als ruwe datum', () => {
    expect(afrekeningTitel(t, afrekening)).toBe('De afrekening van 1 apr 2026 verwijderen?')
  })

  it('telt een ingetrokken kost niet als "telt weer mee in je saldo"', () => {
    // ⚠ Ingetrokken betekent: de andere ouder haalde ze uit háár dossier. Zo'n kost
    // telt sowieso niet mee, dus beloven dat ze terugkomt in je saldo is onwaar.
    const regels = telAfrekeningVerwijderen(t, { ...afrekening, overgemaakt: true }, [
      kost('a', { afgerekend: true, ingetrokken: true }),
    ])
    expect(regels.join(' ')).not.toContain('komen weer op')
  })
})

describe('kostenOmTeHeropenen', () => {
  it('opent niets zolang de afrekening niet overgemaakt is', () => {
    expect(kostenOmTeHeropenen(afrekening, [kost('a', { afgerekend: true })])).toEqual([])
  })

  it('opent de kosten die een overgemaakte afrekening dichtzette', () => {
    const uit = kostenOmTeHeropenen({ ...afrekening, overgemaakt: true }, [
      kost('a', { afgerekend: true }),
      kost('b'),
    ])
    expect(uit.map((k) => k.id)).toEqual(['a'])
  })

  it('maakt de oude verrekeningId-koppeling los, ook wanneer kostIds ontbreekt', () => {
    // ⚠ `kostIds` is optioneel, en juist de oude dossiers waarvoor `verrekeningId`
    // bestaat, hebben het niet. Keek de functie alleen binnen `kostIds`, dan bleef
    // die kost voorgoed buiten je saldo met een verwijzing naar niets.
    const zonderKostIds: Verrekening = { id: 'v1', dossierId: 'd1', datum: '2026-04-01', bedrag: 7200 }
    const uit = kostenOmTeHeropenen(zonderKostIds, [kost('a', { verrekeningId: 'v1' }), kost('b')])
    expect(uit.map((k) => k.id)).toEqual(['a'])
  })

  it('maakt ook de oude verrekeningId-koppeling los, ook zonder overgemaakt', () => {
    // ⚠ Dossiers van vóór het niet-blokkerende model koppelden kosten met
    // `verrekeningId`. Die telt even zwaar als `afgerekend`: bleef ze staan, dan
    // bleef die kost voorgoed buiten je saldo met een verwijzing naar iets wat niet
    // meer bestaat.
    const uit = kostenOmTeHeropenen(afrekening, [kost('a', { verrekeningId: 'v1' }), kost('b')])
    expect(uit.map((k) => k.id)).toEqual(['a'])
  })

  it('raakt een kost niet aan die aan een ándere afrekening hangt', () => {
    expect(kostenOmTeHeropenen(afrekening, [kost('a', { verrekeningId: 'v9' })])).toEqual([])
  })
})
