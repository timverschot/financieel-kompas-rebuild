import type { Vertaler } from '../i18n'
import { INDEX_BASISJAAR } from '../data/gezondheidsindex'
import { formatEuro } from './format'
import { maandJaarLabel } from './datum'
import type { BijdrageOpbouw, IndexatieStap } from './onderhoudsbijdrage'

// De bewoordingen van de onderhoudsbijdrage, op één plek (ronde 42).
//
// Waarom apart, net als `afrekeningTekst.ts`: het scherm, de brief-PDF en de tekst
// die je doorstuurt moeten woord voor woord hetzelfde zeggen. Loopt dat uiteen, dan
// staat er in het document dat je meestuurt iets anders dan wat je zelf op je
// scherm zag — en dit is een onderwerp waar dat verschil meteen tegen je gebruikt
// wordt.
//
// De toon is een functionele eis, geen afwerking: de app rekent en registreert. Ze
// kiest geen partij en ze zegt niet wie gelijk heeft.
//
// Bewust ASCII-vriendelijk (geen pijltjes, geen emoji): deze teksten gaan naar
// jsPDF, en dat kan ze in het standaardlettertype niet tonen.

/**
 * De uitleg onder één verjaardag — de enige versie.
 *
 * Stond eerst in het scherm én in de PDF, allebei met dezelfde drie takken. Die
 * kopieën lopen na één wijziging uiteen, en dan zegt het document dat je meestuurt
 * iets anders dan wat je zelf zag. De kop van dit bestand belooft precies dat dat
 * niet gebeurt.
 */
export function stapUitleg(t: Vertaler, stap: IndexatieStap, basisbedrag: number, aanvangsindex: number | null): string {
  if (stap.nieuweIndex === null) {
    return t('index van {maand} nog niet bekend — bedrag ongewijzigd gelaten', {
      maand: maandJaarLabel(`${stap.indexmaand}-01`),
    })
  }
  if (aanvangsindex === null) {
    return t('index {index} uit {maand}', {
      index: getalTekst(stap.nieuweIndex),
      maand: maandJaarLabel(`${stap.indexmaand}-01`),
    })
  }
  return stapTekst(t, stap, basisbedrag, aanvangsindex)
}

/** De berekening van één aanpassing, uitgeschreven. */
export function stapTekst(t: Vertaler, stap: IndexatieStap, basisbedrag: number, aanvangsindex: number): string {
  return t('{basis} x {nieuw} / {aanvang} = {uit}', {
    basis: formatEuro(basisbedrag),
    nieuw: getalTekst(stap.nieuweIndex ?? 0),
    aanvang: getalTekst(aanvangsindex),
    uit: formatEuro(stap.bedrag),
  })
}

/** Een indexcijfer met twee cijfers na de komma, in Belgische notatie. */
export function getalTekst(waarde: number): string {
  return waarde.toFixed(2).replace('.', ',')
}

/** Waar de aanvangsindex vandaan komt — dat hoort navolgbaar te zijn. */
export function aanvangsindexTekst(t: Vertaler, opbouw: BijdrageOpbouw): string {
  if (opbouw.aanvangsindex === null) {
    return t('De aanvangsindex is niet bekend: de app kent geen indexcijfer voor {maand}.', {
      maand: maandJaarLabel(`${opbouw.aanvangsmaand}-01`),
    })
  }
  if (opbouw.aanvangsindexUitAkte) {
    return t('Aanvangsindex {index}, zoals ze in de akte staat.', { index: getalTekst(opbouw.aanvangsindex) })
  }
  return t('Aanvangsindex {index}: de gezondheidsindex van {maand}, de maand vóór de regeling.', {
    index: getalTekst(opbouw.aanvangsindex),
    maand: maandJaarLabel(`${opbouw.aanvangsmaand}-01`),
  })
}

/**
 * De waarschuwing over basisjaren.
 *
 * Dit is de valkuil van het hele onderwerp: een aanvangsindex uit een oud vonnis
 * staat in een andere maatstaf dan de tabel van vandaag, en die twee combineren
 * geeft een verschil van tientallen procenten zonder één foutmelding.
 */
export function basisjaarWaarschuwing(t: Vertaler): string {
  return t(
    'Let op: de indexcijfers van de app staan in basis {jaar} = 100. Staat er in je vonnis een aanvangsindex uit een ouder basisjaar, vul die dan hier in én gebruik ook voor de nieuwe index een cijfer uit datzelfde basisjaar. Twee cijfers uit verschillende basisjaren geven een bedrag dat er juist uitziet en het niet is.',
    { jaar: INDEX_BASISJAAR },
  )
}

/** Hoe de achterstand geteld is. Zonder deze zin is het getal niet te plaatsen. */
export function telwijzeTekst(t: Vertaler): string {
  return t(
    'Per maand geteld vanaf de maand van de regeling, telkens met het bedrag dat op de eerste van die maand gold. Twee gevolgen die je moet kennen voor je dit cijfer gebruikt: de maand van de regeling telt volledig mee, ook als ze halverwege begon, en de maand waarin er geïndexeerd wordt telt nog aan het oude, lagere bedrag. Klopt dat niet met jouw afspraak, corrigeer het dan met een betaling.',
  )
}

/**
 * Het voorbehoud, in het document zelf.
 *
 * Dezelfde grens als bij de bewijsmap (ronde 41): feiten en berekeningen, geen
 * juridisch advies. Bij dit onderwerp weegt het zwaarder, want een bedrag dat als
 * standpunt gelezen wordt, maakt een gesprek tussen twee ouders erger in plaats van
 * makkelijker.
 */
export function bijdrageVoorbehoud(t: Vertaler): string[] {
  return [
    t('Dit blad is een berekening op basis van wat er in Financieel Kompas is ingevoerd: het bedrag uit de regeling, de datum ervan en de gezondheidsindex.'),
    t('De indexatie gebeurt in België van rechtswege, jaarlijks op de verjaardag van de regeling — tenzij de akte iets anders bepaalt. Wat er in jouw akte staat, gaat voor op wat hier staat.'),
    t('Dit is geen juridisch advies en geen ingebrekestelling. De app rekent; wat je met het cijfer doet, beslis jij.'),
  ]
}

/** Wie aan wie betaalt, in woorden. Voor het SCHERM: daar ben jij de lezer. */
export function richtingTekst(t: Vertaler, richting: 'jij-betaalt' | 'jij-ontvangt'): string {
  return richting === 'jij-betaalt' ? t('Jij betaalt aan de andere ouder') : t('De andere ouder betaalt aan jou')
}

/**
 * Dezelfde richting, maar zonder "jij" — voor het DOCUMENT.
 *
 * Het blad gaat naar de andere ouder, en die leest "jij" als zichzelf. Dan staat er
 * in het document letterlijk het omgekeerde van wat bedoeld is. Dit is de enige
 * plek in de module waar de taal zelf partij zou kiezen, en juist daar mag het niet.
 */
export function richtingTekstNeutraal(t: Vertaler, richting: 'jij-betaalt' | 'jij-ontvangt'): string {
  return richting === 'jij-betaalt'
    ? t('Betaald door de ouder die dit overzicht opmaakte')
    : t('Betaald aan de ouder die dit overzicht opmaakte')
}

/** Het openstaande saldo in klare taal, zonder oordeel. */
export function openTekst(t: Vertaler, open: number, richting: 'jij-betaalt' | 'jij-ontvangt'): string {
  if (open === 0) return t('Betaald en verschuldigd zijn precies gelijk.')
  if (open > 0) {
    return richting === 'jij-betaalt'
      ? t('Er staat nog {bedrag} open die jij verschuldigd bent.', { bedrag: formatEuro(open) })
      : t('Er staat nog {bedrag} open die aan jou verschuldigd is.', { bedrag: formatEuro(open) })
  }
  return richting === 'jij-betaalt'
    ? t('Er is {bedrag} meer betaald dan berekend.', { bedrag: formatEuro(-open) })
    : t('Er is {bedrag} meer ontvangen dan berekend.', { bedrag: formatEuro(-open) })
}
