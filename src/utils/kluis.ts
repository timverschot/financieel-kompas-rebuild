import type { DossierDocument } from '../data/schema'

// Waaraan een document kan hangen. De sleutels zijn taal-onafhankelijk; ze bepalen
// alleen welk veld in het document ingevuld wordt.
export const KLUIS_SOORTEN = ['dossier', 'lening', 'garantie', 'transactie'] as const
export type KluisSoort = (typeof KLUIS_SOORTEN)[number]

/** De eigenaar van een kluis: waaraan de documenten hangen. */
export type KluisEigenaar = { soort: KluisSoort; id: string }

/** Het veld in een document dat naar zijn eigenaar wijst. */
export type KluisVeld = 'dossierId' | 'leningId' | 'garantieId' | 'transactieId'

// Van eigenaarsoort naar het veld in het document. Eén plek, zodat filteren en
// opslaan nooit uit elkaar kunnen lopen.
const VELD: Record<KluisSoort, KluisVeld> = {
  dossier: 'dossierId',
  lening: 'leningId',
  garantie: 'garantieId',
  transactie: 'transactieId',
}

/** Het documentveld dat bij deze eigenaarsoort hoort. */
export function veldVanSoort(soort: KluisSoort): KluisVeld {
  return VELD[soort]
}

/**
 * Aan welke eigenaar hangt dit document? Geeft null wanneer geen van de vier
 * velden ingevuld is — dat kan enkel bij handmatig geknoeide data, en zo'n
 * document verschijnt dan nergens in plaats van op een willekeurige plek.
 */
export function eigenaarVanDocument(d: DossierDocument): KluisEigenaar | null {
  if (d.dossierId) return { soort: 'dossier', id: d.dossierId }
  if (d.leningId) return { soort: 'lening', id: d.leningId }
  if (d.garantieId) return { soort: 'garantie', id: d.garantieId }
  if (d.transactieId) return { soort: 'transactie', id: d.transactieId }
  return null
}

/**
 * De bon of factuur die bij een transactie hoort, of null. Een transactie draagt
 * hoogstens één zo'n document; staan er door een oudere fout toch meerdere, dan
 * wint de nieuwste (documentenVan sorteert al nieuwste eerst).
 */
export function bonVanTransactie(documenten: DossierDocument[], transactieId: string): DossierDocument | null {
  return documentenVan(documenten, { soort: 'transactie', id: transactieId })[0] ?? null
}

/** De documenten van één eigenaar, nieuwste eerst. */
export function documentenVan(documenten: DossierDocument[], eigenaar: KluisEigenaar): DossierDocument[] {
  const veld = veldVanSoort(eigenaar.soort)
  return documenten
    .filter((d) => d[veld] === eigenaar.id)
    .sort((a, b) => (a.toegevoegdOp < b.toegevoegdOp ? 1 : a.toegevoegdOp > b.toegevoegdOp ? -1 : 0))
}
