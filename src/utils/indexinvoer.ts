import type { Vertaler } from '../i18n'
import { basisjaarVan, indexcijfer, laatsteIndexmaand } from '../data/indexreeksen'

// Twee indexcijfers die een mens intikt, keuren (ronde 65).
//
// ⚠ WAAROM DIT BESTAAT. De kindrekening had twee velden — "Aanvangsindex" en
// "Huidige index" — die élk getal groter dan nul aanvaardden, en onleesbare invoer
// stil weggooiden. Eén kaart hoger, bij de onderhoudsbijdrage, wordt hetzelfde soort
// getal tegen de tabel van de app gehouden, met een uitleg over basisjaren erbij.
// Twee cijfers uit verschillende basisjaren geven een bedrag dat er juist uitziet en
// tientallen procenten fout is.
//
// ⚠ WAT HIER WEIGERT EN WAT ALLEEN OPMERKT. Weigeren doet de app alleen wat
// rekenkundig onmogelijk is. Een cijfer dat er alleen VERDACHT uitziet, wordt
// benoemd maar niet tegengehouden: de app kan een consistent paar uit een ander
// basisjaar niet van een verwisseld paar onderscheiden, en wie zijn eigen afspraak
// van jaren geleden niet meer kan bewaren, is slechter af dan wie een waarschuwing
// leest.

/**
 * Vanaf welke afwijking van de tabel de app een opmerking maakt bij het huidige
 * cijfer. Dezelfde marge als bij de onderhoudsbijdrage — daar weigert ze, hier zegt
 * ze het alleen (zie `indexOpmerking` voor waarom).
 */
export const HUIDIGE_MARGE = 0.1

export type IndexKeuring =
  | { soort: 'leeg' }
  | { soort: 'goed'; waarde: number }
  | { soort: 'fout'; tekst: string }

/**
 * Keurt één ingetikt indexcijfer op leesbaarheid.
 *
 * Leeg is geldig: deze velden zijn optioneel, en leeg laten betekent "niet
 * indexeren". Onleesbaar is dat níet — stil weggooien is precies hoe je denkt dat je
 * iets bewaard hebt terwijl er niets staat.
 */
export function keurIndexcijfer(t: Vertaler, tekst: string): IndexKeuring {
  const schoon = tekst.trim()
  if (schoon === '') return { soort: 'leeg' }

  // ⚠ NIET `Number.parseFloat` alleen: die leest "140,17 (juli 2026)" als 140,17 en
  // gooit de rest stil weg — net het gedrag dat deze keuring moet uitbannen. Alleen
  // een kaal getal met hoogstens één komma of punt is een indexcijfer.
  const genormaliseerd = schoon.replace(/,/g, '.')
  const waarde = /^\d+(\.\d+)?$/.test(genormaliseerd) ? Number(genormaliseerd) : Number.NaN
  if (!Number.isFinite(waarde) || waarde <= 0) {
    return {
      soort: 'fout',
      tekst: t('"{invoer}" is geen indexcijfer. Vul een getal groter dan nul in, of laat het veld leeg om niet te indexeren.', {
        invoer: schoon,
      }),
    }
  }
  return { soort: 'goed', waarde }
}

/**
 * Keurt het PAAR. Geeft de foutzin terug, of `null` wanneer het paar in orde is.
 *
 * ⚠ WAT HIER WÉL EN NIET TE CONTROLEREN VALT. `geindexeerdeBijdrage` gebruikt alleen
 * de verhouding `huidig / aanvang`. Die is basis-onafhankelijk zolang béíde cijfers
 * uit dezelfde maatstaf komen — en dát is precies de enige fout die hier gemaakt
 * wordt. Twee cijfers uit basis 2025 = 100 geven exact hetzelfde bedrag als dezelfde
 * twee uit basis 2013 = 100.
 *
 * Daaruit volgt dat de app een vergissing hier NIET met zekerheid kan aanwijzen. Ze
 * kan alleen weigeren wat rekenkundig onmogelijk is: onleesbare invoer, en één cijfer
 * zonder het andere. Al de rest is een vermoeden, en daarvoor is `indexOpmerking`.
 */
export function keurIndexpaar(t: Vertaler, aanvang: IndexKeuring, huidig: IndexKeuring): string | null {
  if (aanvang.soort === 'fout') return aanvang.tekst
  if (huidig.soort === 'fout') return huidig.tekst
  if (aanvang.soort === 'leeg' && huidig.soort === 'leeg') return null

  // Eén van de twee alleen doet niets: indexeren vraagt een van- en een naar-cijfer.
  if (aanvang.soort === 'leeg' || huidig.soort === 'leeg') {
    return t('Om te indexeren heeft de app allebei de cijfers nodig: de aanvangsindex én de huidige. Laat ze allebei leeg om niet te indexeren.')
  }
  return null
}

/**
 * Een OPMERKING bij het huidige cijfer — geen weigering.
 *
 * ⚠ WAAROM DIT GEEN FOUT IS. Het huidige cijfer hoort meestal in de buurt te liggen
 * van het laatste cijfer dat de app kent; ligt het daar ver buiten, dan komt het
 * vermoedelijk uit een ander basisjaar — precies wat er gebeurt wanneer je bij
 * Statbel de kolom "basis 2025 = 100" overtikt. Maar "vermoedelijk" is geen
 * "zeker": een paar dat volledig in basis 2025 staat, is even juist, en een
 * afspraak die je jaren geleden instelde draagt een cijfer dat intussen ver
 * achterligt. Zou de app dat weigeren, dan kon je je eigen afspraak niet meer
 * bewerken — en zou het scherm verbieden wat de waarschuwing eronder juist vraagt.
 *
 * Ze zegt dus wat ze ziet, en laat jou beslissen.
 */
export function indexOpmerking(t: Vertaler, huidig: IndexKeuring): string | null {
  if (huidig.soort !== 'goed') return null
  const laatste = indexcijfer(undefined, laatsteIndexmaand(undefined))
  if (laatste === undefined) return null
  if (Math.abs(huidig.waarde - laatste) <= laatste * HUIDIGE_MARGE) return null
  return t('Ter controle: {huidig} ligt een eind van {laatste} — het laatste cijfer dat de app zelf kent, in basis {jaar} = 100. Statbel publiceert sinds 2026 ook een kolom in basis 2025 = 100. Staan je twee cijfers allebei in dezelfde reeks en hetzelfde basisjaar, dan klopt de berekening; anders zit het bedrag er tientallen procenten naast.', {
    huidig: getalTekst(huidig.waarde),
    laatste: getalTekst(laatste),
    jaar: basisjaarVan(undefined),
  })
}

/** Een indexcijfer zoals het op het scherm hoort: met een komma, twee cijfers. */
export function getalTekst(waarde: number): string {
  return waarde.toFixed(2).replace('.', ',')
}
