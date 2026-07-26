import type { Categorie, Ordening } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { ORDENING_HOOFDCATEGORIEEN } from '../data/schema'

// De volgorde van de hoofdcategorieën — de enige rekenkern daarvoor.
//
// Tot nu toe lag die volgorde vast in de code: eerst je EIGEN hoofdcategorieën,
// daarna de veertien ingebouwde. Gevolg: een categorie die je pas aanmaakte,
// sprong meteen helemaal bovenaan, ook als je ze zelden gebruikt.
//
// Nu bepaal je de volgorde zelf, op de Categorieën-pagina. Drie regels:
//
//  1. De bewaarde lijst (`Ordening.ids`) geeft de volgorde. Wat erin staat maar
//     niet meer bestaat, wordt overgeslagen — een verwijderde eigen categorie
//     hoeft die lijst dus niet aan te raken en kan er niet half in achterblijven.
//  2. Wat NIET in de lijst staat, komt erachter in de standaardvolgorde. Zo
//     verschijnt een nieuwe categorie altijd ACHTERAAN, en niet ineens vooraan.
//  3. Is er helemaal geen bewaarde lijst, dan geldt de standaardvolgorde: de
//     veertien ingebouwde in hun eigen volgorde, daarna de eigen categorieën
//     alfabetisch.
//
// Zuiver: geen database, geen klok. Alles komt binnen als argument.

/** Eén hoofdcategorie zoals de kiezers ze nodig hebben. */
export type Hoofdkeuze = {
  id: string
  naam: string
  icoon: string
  /** Waar of onwaar: door de gebruiker zelf gemaakt. */
  eigen: boolean
}

/** Standaardteken voor een eigen categorie die er zelf geen koos. */
export const EIGEN_ICOON = '🏷️'

/**
 * Alle hoofdcategorieën — ingebouwd én eigen — in hun standaardvolgorde.
 *
 * Alleen eigen HOOFDcategorieën tellen mee: een eigen middencategorie (met
 * `ouderId`) hoort onder haar ouder en niet als losse keuze ernaast.
 */
export function alleHoofdcategorieen(eigen: Categorie[]): Hoofdkeuze[] {
  return [
    ...INGEBOUWDE_CATEGORIEEN.map((h) => ({ id: h.id, naam: h.naam, icoon: h.icoon, eigen: false })),
    ...eigenOpNaam(eigen).map((c) => ({ id: c.id, naam: c.naam, icoon: c.icoon ?? EIGEN_ICOON, eigen: true })),
  ]
}

/**
 * De eigen HOOFDcategorieën, alfabetisch.
 *
 * Waarom alfabetisch en niet "in de volgorde waarin ze uit de database komen":
 * die volgorde is de sorteervolgorde van hun interne id, en die is willekeurig.
 * Een nieuwe categorie zou dan op een onvoorspelbare plek tussen de andere
 * belanden. Alfabetisch is voorspelbaar en uitlegbaar — en zodra je zelf iets
 * verplaatst, neemt jouw volgorde het sowieso over.
 */
export function eigenOpNaam(eigen: Categorie[]): Categorie[] {
  return eigen
    .filter((c) => !c.ouderId)
    .slice()
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** De bewaarde volgorde uit de lijst met ordeningen, of een lege lijst. */
export function bewaardeVolgorde(ordeningen: Ordening[]): string[] {
  return ordeningen.find((o) => o.id === ORDENING_HOOFDCATEGORIEEN)?.ids ?? []
}

/**
 * Zet de hoofdcategorieën in de gekozen volgorde.
 *
 * Bewust generiek over `T`: de kiezers werken met verschillende vormen (chip,
 * boomtak, keuzelijst), maar de volgorde is overal dezelfde.
 */
export function opVolgorde<T extends { id: string }>(items: T[], volgorde: string[]): T[] {
  const perId = new Map(items.map((i) => [i.id, i]))
  const uit: T[] = []
  const gehad = new Set<string>()
  for (const id of volgorde) {
    const item = perId.get(id)
    // Onbekend id = een categorie die intussen verwijderd is. Overslaan.
    if (!item || gehad.has(id)) continue
    uit.push(item)
    gehad.add(id)
  }
  // Alles wat nog niet aan de beurt kwam, in de standaardvolgorde erachter.
  for (const item of items) if (!gehad.has(item.id)) uit.push(item)
  return uit
}

/**
 * Verplaatst één id een plaats omhoog (`-1`) of omlaag (`+1`) binnen de volledige,
 * geordende lijst, en geeft de nieuwe volgorde terug.
 *
 * Belangrijk: er wordt gerekend met de VOLLEDIGE lijst en niet met de bewaarde
 * lijst alleen. Anders zou de eerste verplaatsing van een categorie die nog niet
 * in de bewaarde lijst staat, alle andere overhoop gooien. Het resultaat bevat
 * daarom altijd alle bestaande id's — vanaf dat moment ligt de hele volgorde vast.
 *
 * Aan de rand gebeurt er niets: de eerste kan niet omhoog, de laatste niet omlaag.
 */
export function verplaats<T extends { id: string }>(items: T[], volgorde: string[], id: string, richting: -1 | 1): string[] {
  const huidig = opVolgorde(items, volgorde).map((i) => i.id)
  const van = huidig.indexOf(id)
  if (van === -1) return huidig
  const naar = van + richting
  if (naar < 0 || naar >= huidig.length) return huidig
  const nieuw = [...huidig]
  nieuw[van] = huidig[naar]
  nieuw[naar] = id
  return nieuw
}
