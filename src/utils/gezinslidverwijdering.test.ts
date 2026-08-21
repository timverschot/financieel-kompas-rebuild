import { describe, it, expect } from 'vitest'
import { telGezinslidGebruik } from './gezinslidverwijdering'

const t = (s: string, p?: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(p?.[k] ?? `{${k}}`))

describe('gezinslidverwijdering', () => {
  it('geeft een LEGE lijst terug wanneer het lid nergens gebruikt wordt', () => {
    // ⚠ Bewust leeg en niet één regel met "nergens gebruikt". Het venster zette daar
    // de kop "Deze naam wordt nu nog gebruikt in:" boven, en dan las het scherm
    // zichzelf tegen. De kop wisselt nu mee, dus die keuze hoort bij het venster.
    expect(telGezinslidGebruik(t, 'k1', {})).toEqual([])
  })

  it('telt gedeelde kosten, afrekeningen en boekingen apart', () => {
    const regels = telGezinslidGebruik(t, 'k1', {
      kosten: [
        { id: 'a', dossierId: 'd1', omschrijving: 'School', bedrag: 100, betaaldDoor: 'jij', datum: '2026-01-01', kindIds: ['k1'] },
        { id: 'b', dossierId: 'd1', omschrijving: 'Sport', bedrag: 100, betaaldDoor: 'jij', datum: '2026-01-01', kindIds: ['k2'] },
      ],
      verrekeningen: [{ id: 'v1', dossierId: 'd1', datum: '2026-01-01', bedrag: 1, kindIds: ['k1'] }],
      transacties: [
        { id: 't1', datum: '2026-01-01', omschrijving: 'Colruyt', bedrag: -100, rekeningId: 'r1', persoonIds: ['k1'] },
      ],
    })
    expect(regels).toEqual(['1 gedeelde kost(en) in een dossier', '1 afrekening(en)', '1 boeking(en)'])
  })

  it('laat regels weg die op nul staan, in plaats van acht keer "0" te tonen', () => {
    const regels = telGezinslidGebruik(t, 'k1', {
      leningen: [{ id: 'l1', naam: 'Auto', hoofdsom: 1000, persoonId: 'k1', richting: 'uitgeleend', startdatum: '2026-01-01' }],
    })
    expect(regels).toHaveLength(1)
    expect(regels[0]).toBe('1 lening(en)')
  })

  it('herkent gebruik via spaardoelen, leningen en garanties', () => {
    expect(
      telGezinslidGebruik(t, 'k1', { spaardoelen: [{ id: 's1', naam: 'Fiets', doelbedrag: 100, huidigBedrag: 0, persoonId: 'k1' }] }),
    ).toEqual(['1 spaardoel(en)'])
    expect(
      telGezinslidGebruik(t, 'k2', { garanties: [{ id: 'g1', product: 'Fiets', aankoopdatum: '2026-01-01', garantieMaanden: 24, persoonId: 'k1' }] }),
    ).toEqual([])
  })
})
