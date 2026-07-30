import { describe, it, expect } from 'vitest'
import type { DossierDocument } from '../data/schema'
import { bonVanTransactie, documentenVan, eigenaarVanDocument, veldVanSoort, bonVanKost, soortNaam } from './kluis'
import { DOCUMENTSOORTEN } from '../data/schema'

function doc(extra: Partial<DossierDocument>): DossierDocument {
  return {
    id: 'x',
    naam: 'Document',
    soort: 'ander',
    bestand: 'data:application/pdf;base64,AA==',
    toegevoegdOp: '2026-07-01',
    ...extra,
  }
}

describe('kluis', () => {
  it('koppelt elke soort aan het juiste veld', () => {
    expect(veldVanSoort('dossier')).toBe('dossierId')
    expect(veldVanSoort('lening')).toBe('leningId')
    expect(veldVanSoort('garantie')).toBe('garantieId')
    expect(veldVanSoort('transactie')).toBe('transactieId')
  })

  it('herkent de eigenaar van een document', () => {
    expect(eigenaarVanDocument(doc({ dossierId: 'd1' }))).toEqual({ soort: 'dossier', id: 'd1' })
    expect(eigenaarVanDocument(doc({ leningId: 'l1' }))).toEqual({ soort: 'lening', id: 'l1' })
    expect(eigenaarVanDocument(doc({ garantieId: 'g1' }))).toEqual({ soort: 'garantie', id: 'g1' })
    expect(eigenaarVanDocument(doc({ transactieId: 't1' }))).toEqual({ soort: 'transactie', id: 't1' })
  })

  it('geeft null voor een document zonder eigenaar', () => {
    expect(eigenaarVanDocument(doc({}))).toBeNull()
  })

  it('filtert op de juiste eigenaar en zet nieuwste eerst', () => {
    const documenten = [
      doc({ id: 'a', dossierId: 'd1', toegevoegdOp: '2026-01-01' }),
      doc({ id: 'b', dossierId: 'd1', toegevoegdOp: '2026-06-01' }),
      doc({ id: 'c', dossierId: 'd2', toegevoegdOp: '2026-07-01' }),
      doc({ id: 'd', leningId: 'd1', toegevoegdOp: '2026-07-02' }),
    ]
    expect(documentenVan(documenten, { soort: 'dossier', id: 'd1' }).map((d) => d.id)).toEqual(['b', 'a'])
    // Een lening met toevallig dezelfde id als een dossier mag niet meetellen.
    expect(documentenVan(documenten, { soort: 'lening', id: 'd1' }).map((d) => d.id)).toEqual(['d'])
  })

  it('geeft de bon van een transactie, en null wanneer er geen is', () => {
    const documenten = [
      doc({ id: 'bon', transactieId: 't1', soort: 'bon', toegevoegdOp: '2026-07-01' }),
      doc({ id: 'ander', transactieId: 't2', soort: 'bon', toegevoegdOp: '2026-07-02' }),
    ]
    expect(bonVanTransactie(documenten, 't1')?.id).toBe('bon')
    expect(bonVanTransactie(documenten, 't9')).toBeNull()
  })

  it('kiest de nieuwste wanneer een transactie er per ongeluk twee heeft', () => {
    const documenten = [
      doc({ id: 'oud', transactieId: 't1', toegevoegdOp: '2026-01-01' }),
      doc({ id: 'nieuw', transactieId: 't1', toegevoegdOp: '2026-06-01' }),
    ]
    expect(bonVanTransactie(documenten, 't1')?.id).toBe('nieuw')
  })
})

// ---------------------------------------------------------------------------
// Ronde 41
// ---------------------------------------------------------------------------

describe('bonVanKost', () => {
  const bonInKluis: DossierDocument = {
    id: 'doc1',
    transactieId: 'tx1',
    naam: 'Bon Colruyt',
    soort: 'bon',
    bestand: 'data:image/jpeg;base64,UITDEKLUIS',
    toegevoegdOp: '2026-03-04',
  }

  it('neemt de bon van de kost zelf wanneer die er is', () => {
    expect(bonVanKost({ bonnetje: 'data:image/jpeg;base64,OPDEKOST' })).toBe('data:image/jpeg;base64,OPDEKOST')
  })

  // Dit is de gewóne weg: je boekt een uitgave, hangt de bonfoto eraan en vinkt
  // "delen in een dossier" aan. De bon staat dan in de kluis onder de transactie en
  // NIET op de gedeelde kost. Zonder deze regel zei de bewijsmap "geen bon" bij een
  // kost waar wél een bon van bestond.
  it('vindt de bon die aan de transactie hangt', () => {
    expect(bonVanKost({ transactieId: 'tx1' }, [bonInKluis])).toBe('data:image/jpeg;base64,UITDEKLUIS')
  })

  it('laat de bon op de kost voorgaan op die van de transactie', () => {
    expect(bonVanKost({ bonnetje: 'data:image/jpeg;base64,OPDEKOST', transactieId: 'tx1' }, [bonInKluis])).toBe(
      'data:image/jpeg;base64,OPDEKOST',
    )
  })

  it('geeft niets terug wanneer er nergens een bon is', () => {
    expect(bonVanKost({})).toBeUndefined()
    expect(bonVanKost({ transactieId: 'tx-zonder-bon' }, [bonInKluis])).toBeUndefined()
  })

  it('behandelt een lege bonstring als geen bon', () => {
    expect(bonVanKost({ bonnetje: '' })).toBeUndefined()
  })
})

describe('soortNaam', () => {
  const t = (s: string) => s

  it('geeft elke documentsoort een eigen naam', () => {
    const namen = DOCUMENTSOORTEN.map((s) => soortNaam(t, s))
    expect(new Set(namen).size).toBe(DOCUMENTSOORTEN.length)
  })

  it('noemt een vonnis een vonnis', () => {
    // In een bewijsmap is dit het verschil dat telt: een vonnis en een losse foto
    // stonden er eerst identiek in.
    expect(soortNaam(t, 'vonnis')).toBe('Vonnis')
    expect(soortNaam(t, 'overeenkomst')).toBe('Overeenkomst')
  })
})
