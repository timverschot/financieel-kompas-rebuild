import type { Documentsoort, DossierDocument } from '../data/schema'

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

// ---------------------------------------------------------------------------
// Ronde 41
// ---------------------------------------------------------------------------

/**
 * De bon van een gedeelde kost — waar hij ook hangt.
 *
 * Dit is niet één plek maar twee, en dat is geen ontwerpfout maar geschiedenis:
 *
 *  * `kost.bonnetje` is de bon die je in het formulier voor een gedeelde kost zelf
 *    toevoegt;
 *  * hangt de kost aan een TRANSACTIE (je boekte een uitgave en deelde die in een
 *    dossier), dan zit de bonfoto in de documentkluis onder `transactieId` — het
 *    formulier voor gedeelde kosten komt daar niet aan.
 *
 * Waarom dat telt: de tweede weg is de gewóne weg. Wie een uitgave boekt, de bon
 * fotografeert en "delen in een dossier" aanvinkt, kreeg in de bewijsmap "geen bon"
 * te lezen bij een kost waar wél een bon van bestond. Precies het bewijsstuk dat je
 * wilde meesturen ontbrak dan, zonder één waarschuwing.
 */
export function bonnenVanKost(
  kost: { bonnetje?: string; transactieId?: string },
  documenten: DossierDocument[] = [],
): string[] {
  const uit: string[] = []
  if (kost.bonnetje) uit.push(kost.bonnetje)
  if (kost.transactieId) {
    const uitDeKluis = bonVanTransactie(documenten, kost.transactieId)?.bestand
    // Beide kunnen bestaan: je boekt een uitgave met een bonfoto (die gaat naar de
    // kluis onder de transactie) en voegt later op de Dossiers-pagina de factuur toe
    // aan diezelfde kost (die komt op `bonnetje`). Dan zijn dat twee bewijsstukken en
    // horen ze er beide in — één ervan stil weglaten is precies wat een bewijsmap
    // niet mag doen.
    if (uitDeKluis && uitDeKluis !== kost.bonnetje) uit.push(uitDeKluis)
  }
  return uit
}

/**
 * De EERSTE bon van een gedeelde kost, voor plekken waar er maar één past.
 *
 * Het scherm toont per kost één bonknop; de bewijsmap gebruikt `bonnenVanKost` en
 * neemt ze allemaal mee.
 */
export function bonVanKost(
  kost: { bonnetje?: string; transactieId?: string },
  documenten: DossierDocument[] = [],
): string | undefined {
  return bonnenVanKost(kost, documenten)[0]
}

/**
 * De weergavenaam van een documentsoort. De opgeslagen sleutel ('overeenkomst',
 * 'attest', …) blijft taal-onafhankelijk; alleen wat je ziet wordt vertaald.
 *
 * Stond tot ronde 41 privé in `DossierKluis.tsx`. Ze staat hier omdat de bewijsmap
 * dezelfde namen moet gebruiken: een vonnis en een willekeurige foto stonden in de
 * bijlagelijst identiek vermeld, en juist bij een bewijsstuk maakt het uit wát het is.
 */
export function soortNaam(t: (s: string) => string, soort: Documentsoort): string {
  switch (soort) {
    case 'overeenkomst':
      return t('Overeenkomst')
    case 'attest':
      return t('Attest')
    case 'bon':
      return t('Bon')
    case 'vonnis':
      return t('Vonnis')
    default:
      return t('Ander')
  }
}
