import { describe, it, expect } from 'vitest'
import type { DossierDocument } from '../data/schema'
import { documentenVan, eigenaarVanDocument, veldVanSoort } from './kluis'

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
  })

  it('herkent de eigenaar van een document', () => {
    expect(eigenaarVanDocument(doc({ dossierId: 'd1' }))).toEqual({ soort: 'dossier', id: 'd1' })
    expect(eigenaarVanDocument(doc({ leningId: 'l1' }))).toEqual({ soort: 'lening', id: 'l1' })
    expect(eigenaarVanDocument(doc({ garantieId: 'g1' }))).toEqual({ soort: 'garantie', id: 'g1' })
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
})
