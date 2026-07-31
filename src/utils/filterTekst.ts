import type { Vertaler } from '../i18n'
import { maandJaarLabel } from './datum'
import { naamVanBesparingsdomein } from './besparen'
import type { TxFilter } from './transactieFilter'

// Hoe een actief filter in woorden klinkt — op één plek.
//
// Waarom dit bestaat (ronde 41). De filterchips boven de transactielijst werden
// rechtstreeks in de render van `TransactieLijst` opgebouwd. Zolang die chips het
// enige waren wat het filter benoemde, was dat prima. Maar de CSV-export en de
// PDF moeten hetzelfde kunnen zeggen: staat de lijst op Voeding in maart, dan hoort
// er in de kop van het bestand "Voeding · maart 2026" te staan en niet "alle
// transacties". Zou elk van die drie zijn eigen tekst opbouwen, dan gaan ze na één
// wijziging uit elkaar lopen — en dan lees je op het scherm iets anders dan in het
// bestand dat je net doorstuurde.
//
// Dit bestand kent de NAMEN niet: categorieën en rekeningen worden elders opgelost
// (en in de lijst met een eigen terugval). Daarom geeft de aanroeper die opzoekers
// mee. Zo blijft dit een zuivere functie die zonder React te testen valt.

/** De sleutel van één filterdeel. Dezelfde volgorde als op het scherm. */
export type FilterSleutel =
  | 'zoek'
  | 'richting'
  | 'rekening'
  | 'hoofd'
  | 'sub'
  | 'domein'
  | 'zonderCategorie'
  | 'van'
  | 'tot'
  | 'maand'

/** Eén actief filterdeel: zijn sleutel en hoe het heet. */
export type FilterDeel = { sleutel: FilterSleutel; label: string }

/** Opzoekers voor namen die dit bestand niet zelf kan kennen. */
export type FilterNamen = {
  categorieNaam?: (id: string) => string | undefined
  rekeningNaam?: (id: string) => string | undefined
}

/**
 * De actieve filterdelen, in de volgorde waarin ze op het scherm staan.
 *
 * De maand staat bewust ACHTERAAN, net als de chip: de maandschakelaar is altijd
 * zichtbaar, dus die hoort de rest niet voor te dringen.
 */
export function filterDelen(t: Vertaler, filter: TxFilter, namen: FilterNamen = {}): FilterDeel[] {
  const delen: FilterDeel[] = []
  const catNaam = namen.categorieNaam ?? (() => undefined)
  const rekNaam = namen.rekeningNaam ?? (() => undefined)

  if (filter.zoek) delen.push({ sleutel: 'zoek', label: t('Zoek: {term}', { term: filter.zoek }) })
  if (filter.richting) {
    delen.push({ sleutel: 'richting', label: filter.richting === 'in' ? t('Inkomsten') : t('Uitgaven') })
  }
  if (filter.rekeningId) {
    delen.push({ sleutel: 'rekening', label: rekNaam(filter.rekeningId) ?? t('onbekende rekening') })
  }
  if (filter.hoofdId) delen.push({ sleutel: 'hoofd', label: catNaam(filter.hoofdId) ?? filter.hoofdId })
  if (filter.catId) delen.push({ sleutel: 'sub', label: catNaam(filter.catId) ?? filter.catId })
  if (filter.domein) {
    // `naamVanBesparingsdomein` geeft de Nederlandse app-tekst; die mag door t().
    delen.push({ sleutel: 'domein', label: t(naamVanBesparingsdomein(filter.domein) ?? filter.domein) })
  }
  if (filter.zonderCategorie) delen.push({ sleutel: 'zonderCategorie', label: t('Zonder categorie') })
  if (filter.van) delen.push({ sleutel: 'van', label: t('Van {datum}', { datum: filter.van }) })
  if (filter.tot) delen.push({ sleutel: 'tot', label: t('Tot {datum}', { datum: filter.tot }) })
  if (filter.maand) delen.push({ sleutel: 'maand', label: maandJaarLabel(filter.maand) })

  return delen
}

/**
 * Het actieve filter als één leesbare regel, of "alle transacties".
 *
 * Voor de kop van een exportbestand: daar moet in één regel staan waar de cijfers
 * over gaan, want dat bestand wordt losgekoppeld van het scherm doorgestuurd.
 */
export function filterBeschrijving(t: Vertaler, filter: TxFilter, namen: FilterNamen = {}): string {
  const delen = filterDelen(t, filter, namen)
  return delen.length === 0 ? t('alle transacties') : delen.map((d) => d.label).join(' · ')
}
