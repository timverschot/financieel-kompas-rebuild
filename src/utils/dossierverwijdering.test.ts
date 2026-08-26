import { describe, it, expect } from 'vitest'
import { telVoorVerwijderen } from './dossierverwijdering'

// Ronde 59. Deze lijst staat in de vraag vóór je een dossier verwijdert, en ze is
// het enige wat tussen een mistik en het verlies van jaren bewijsmateriaal staat.

const t = (sleutel: string, params?: Record<string, string | number>) =>
  sleutel.replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''))

const leeg = {
  kosten: [],
  verrekeningen: [],
  kindrekeningen: [],
  kindrekeningposten: [],
}

describe('telVoorVerwijderen', () => {
  it('zegt het eerlijk wanneer er nog niets in staat', () => {
    // Zes regels met "0" erin is geen informatie, het is ruis — en ruis leert je
    // wegklikken.
    expect(telVoorVerwijderen(t, 'd1', leeg)).toEqual(['Er staat nog niets in dit dossier.'])
  })

  it('telt alleen wat bij DIT dossier hoort', () => {
    const regels = telVoorVerwijderen(t, 'd1', {
      ...leeg,
      kosten: [
        { id: 'k1', dossierId: 'd1', datum: '2026-01-01', omschrijving: 'a', bedrag: 1000, betaaldDoor: 'jij' },
        { id: 'k2', dossierId: 'd2', datum: '2026-01-01', omschrijving: 'b', bedrag: 1000, betaaldDoor: 'jij' },
      ] as never,
    })
    expect(regels).toEqual(['1 gedeelde kost(en)'])
  })

  it('volgt de kindrekening naar haar posten', () => {
    // De posten hangen niet aan het dossier maar aan de kindrekening. Zonder die
    // omweg zou de vraag "0 posten" zeggen terwijl er honderd verdwijnen.
    const regels = telVoorVerwijderen(t, 'd1', {
      ...leeg,
      kindrekeningen: [
        { id: 'kr1', dossierId: 'd1', naam: 'Kind 1' },
        { id: 'kr2', dossierId: 'd2', naam: 'Kind 2' },
      ] as never,
      kindrekeningposten: [
        { id: 'p1', kindrekeningId: 'kr1', datum: '2026-01-01', omschrijving: 'x', bedrag: 100 },
        { id: 'p2', kindrekeningId: 'kr1', datum: '2026-01-01', omschrijving: 'y', bedrag: 100 },
        { id: 'p3', kindrekeningId: 'kr2', datum: '2026-01-01', omschrijving: 'z', bedrag: 100 },
      ] as never,
    })
    expect(regels).toEqual(['1 kindrekening(en)', '2 post(en) op de kindrekening'])
  })

  it('noemt een kindrekening ook zonder posten', () => {
    // ⚠ Uit de nakijkronde. Een kindrekening draagt een beginsaldo, de maandbijdragen
    // van beide ouders en de indexcijfers. Zonder deze regel zei het venster "Er staat
    // nog niets in dit dossier" terwijl al die afspraken verdwenen.
    const regels = telVoorVerwijderen(t, 'd1', {
      ...leeg,
      kindrekeningen: [{ id: 'kr1', dossierId: 'd1', naam: 'Kind 1', beginsaldo: 50000 }] as never,
    })
    expect(regels).toEqual(['1 kindrekening(en)'])
  })

  it('volgt de onderhoudsbijdrage naar haar betalingen', () => {
    const regels = telVoorVerwijderen(t, 'd1', {
      ...leeg,
      onderhoudsbijdragen: [
        { id: 'b1', dossierId: 'd1', richting: 'jij-betaalt', basisbedrag: 25000, datumRegeling: '2021-09-15' },
        { id: 'b2', dossierId: 'd2', richting: 'jij-betaalt', basisbedrag: 25000, datumRegeling: '2021-09-15' },
      ] as never,
      onderhoudsbetalingen: [
        { id: 'x1', bijdrageId: 'b1', datum: '2026-01-01', bedrag: 25000 },
        { id: 'x2', bijdrageId: 'b2', datum: '2026-01-01', bedrag: 25000 },
      ] as never,
    })
    expect(regels).toEqual(['1 regeling(en) voor de onderhoudsbijdrage', '1 betaling(en) van de onderhoudsbijdrage'])
  })

  it('noemt de documentkluis apart, want dat is het enige wat je niet opnieuw kan intikken', () => {
    const regels = telVoorVerwijderen(t, 'd1', {
      ...leeg,
      documenten: [
        { id: 'doc1', dossierId: 'd1', naam: 'vonnis.pdf', soort: 'vonnis', bestand: 'data:', toegevoegdOp: '2026-01-01' },
      ] as never,
    })
    expect(regels).toEqual(['1 bewaard(e) document(en) — bonnen, scans, overeenkomsten'])
  })

  it('zet de regels in een vaste volgorde, ongeacht hoe de gegevens binnenkomen', () => {
    const gegevens = {
      ...leeg,
      kosten: [{ id: 'k1', dossierId: 'd1', datum: '2026-01-01', omschrijving: 'a', bedrag: 1000, betaaldDoor: 'jij' }] as never,
      verrekeningen: [{ id: 'v1', dossierId: 'd1', datum: '2026-01-01', bedrag: 500, richting: 'jij-ontvangt' }] as never,
      documenten: [{ id: 'doc1', dossierId: 'd1', naam: 'a.pdf', soort: 'bon', bestand: 'data:', toegevoegdOp: '2026-01-01' }] as never,
    }
    expect(telVoorVerwijderen(t, 'd1', gegevens)).toEqual([
      '1 gedeelde kost(en)',
      '1 afrekening(en)',
      '1 bewaard(e) document(en) — bonnen, scans, overeenkomsten',
    ])
  })
})
