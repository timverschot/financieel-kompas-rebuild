import type { DossierDocument } from '../data/schema'

// Waaraan een document kan hangen. De sleutels zijn taal-onafhankelijk; ze bepalen
// alleen welk veld in het document ingevuld wordt.
export const KLUIS_SOORTEN = ['dossier', 'lening', 'garantie'] as const
export type KluisSoort = (typeof KLUIS_SOORTEN)[number]

/** De eigenaar van een kluis: waaraan de documenten hangen. */
export type KluisEigenaar = { soort: KluisSoort; id: string }

// Van eigenaarsoort naar het veld in het document. Eén plek, zodat filteren en
// opslaan nooit uit elkaar kunnen lopen.
const VELD: Record<KluisSoort, 'dossierId' | 'leningId' | 'garantieId'> = {
  dossier: 'dossierId',
  lening: 'leningId',
  garantie: 'garantieId',
}

/** Het documentveld dat bij deze eigenaarsoort hoort. */
export function veldVanSoort(soort: KluisSoort): 'dossierId' | 'leningId' | 'garantieId' {
  return VELD[soort]
}

/**
 * Aan welke eigenaar hangt dit document? Geeft null wanneer geen van de drie
 * velden ingevuld is — dat kan enkel bij handmatig geknoeide data, en zo'n
 * document verschijnt dan nergens in plaats van op een willekeurige plek.
 */
export function eigenaarVanDocument(d: DossierDocument): KluisEigenaar | null {
  if (d.dossierId) return { soort: 'dossier', id: d.dossierId }
  if (d.leningId) return { soort: 'lening', id: d.leningId }
  if (d.garantieId) return { soort: 'garantie', id: d.garantieId }
  return null
}

/** De documenten van één eigenaar, nieuwste eerst. */
export function documentenVan(documenten: DossierDocument[], eigenaar: KluisEigenaar): DossierDocument[] {
  const veld = veldVanSoort(eigenaar.soort)
  return documenten
    .filter((d) => d[veld] === eigenaar.id)
    .sort((a, b) => (a.toegevoegdOp < b.toegevoegdOp ? 1 : a.toegevoegdOp > b.toegevoegdOp ? -1 : 0))
}
