import { INGEBOUWDE_CATEGORIEEN } from './ingebouwd'
import type { Categorie, Subcategorie } from '../schema'

// Een item uit de boom, "plat" gemaakt met al zijn context (categorie +
// hoofdcategorie). Handig om te tonen, te zoeken en op te tellen.
export type PlatItem = {
  id: string
  naam: string
  synoniemen: string[]
  eenheid: string | null
  categorieId: string
  categorieNaam: string
  hoofdId: string
  hoofdNaam: string
  kleur: string
  icoon: string
}

// De vaste, ingebouwde boom één keer platgeslagen (de basis).
export const PLATTE_ITEMS: PlatItem[] = (() => {
  const uit: PlatItem[] = []
  for (const hoofd of INGEBOUWDE_CATEGORIEEN) {
    for (const cat of hoofd.categorieen) {
      for (const item of cat.items) {
        uit.push({
          id: item.id,
          naam: item.naam,
          synoniemen: item.synoniemen,
          eenheid: item.eenheid,
          categorieId: cat.id,
          categorieNaam: cat.naam,
          hoofdId: hoofd.id,
          hoofdNaam: hoofd.naam,
          kleur: hoofd.kleur,
          icoon: hoofd.icoon,
        })
      }
    }
  }
  return uit
})()

// De context (categorie + hoofdcategorie) van elke mid-categorie (cat-*), zodat
// een toegevoegde subcategorie zijn plaats in de boom kent.
type CatContext = { categorieNaam: string; hoofdId: string; hoofdNaam: string; kleur: string; icoon: string }

// De vaste context van elke INGEBOUWDE middencategorie.
const BASIS_CONTEXT_PER_CAT = new Map<string, CatContext>()
for (const hoofd of INGEBOUWDE_CATEGORIEEN) {
  for (const cat of hoofd.categorieen) {
    BASIS_CONTEXT_PER_CAT.set(cat.id, {
      categorieNaam: cat.naam,
      hoofdId: hoofd.id,
      hoofdNaam: hoofd.naam,
      kleur: hoofd.kleur,
      icoon: hoofd.icoon,
    })
  }
}

// Sinds ronde 27 kan de gebruiker ook zélf middencategorieën maken (een
// `Categorie` met een `ouderId`). Die moeten hier bij, anders slaat
// `bouwEffectieveItems` een subcategorie eronder over en verdwijnt ze stil uit
// elke telling — precies de reden waarom een eigen boom tot nu toe niet kon.
let CONTEXT_PER_CAT = new Map(BASIS_CONTEXT_PER_CAT)

// Bouwt de effectieve platte lijst: de basis, met daarbovenop de gebruikers-
// aanpassingen (nieuwe items toegevoegd, of bestaande hernoemd/overschreven).
export function bouwEffectieveItems(
  aanpassingen: Subcategorie[],
  context_per_cat: Map<string, CatContext> = CONTEXT_PER_CAT,
): PlatItem[] {
  const perId = new Map(PLATTE_ITEMS.map((i) => [i.id, i]))
  for (const a of aanpassingen) {
    const context = context_per_cat.get(a.categorieId)
    const bestaand = perId.get(a.id)
    if (!context && !bestaand) continue // onbekende plaats en geen basis: overslaan
    const basis = context ?? {
      categorieNaam: bestaand!.categorieNaam,
      hoofdId: bestaand!.hoofdId,
      hoofdNaam: bestaand!.hoofdNaam,
      kleur: bestaand!.kleur,
      icoon: bestaand!.icoon,
    }
    perId.set(a.id, {
      id: a.id,
      naam: a.naam,
      synoniemen: a.synoniemen ?? [],
      eenheid: null,
      categorieId: a.categorieId,
      categorieNaam: basis.categorieNaam,
      hoofdId: basis.hoofdId,
      hoofdNaam: basis.hoofdNaam,
      kleur: basis.kleur,
      icoon: basis.icoon,
    })
  }
  return [...perId.values()]
}

// --- Register: de app stelt de actuele boom in, waarna zoeken en opzoeken die
// automatisch meenemen (zonder overal parameters door te geven). ---
let huidigeItems: PlatItem[] = PLATTE_ITEMS
let perIdRegister = new Map(PLATTE_ITEMS.map((i) => [i.id, i]))

/**
 * Zet de actuele categorieboom klaar: de ingebouwde basis plus wat de gebruiker
 * zelf gemaakt heeft.
 *
 * `eigenCategorieen` is de volledige lijst eigen categorieën. Die zonder
 * `ouderId` zijn eigen HOOFDcategorieën; die mét een `ouderId` zijn eigen
 * MIDDENcategorieën en horen in de boom onder hun ouder. Pas als die middenlaag
 * hier bekend is, kan er een subcategorie onder hangen zonder stil te verdwijnen.
 */
export function stelCategorieboomIn(aanpassingen: Subcategorie[], eigenCategorieen: Categorie[] = []): void {
  const eigenHoofd = eigenCategorieen.filter((c) => !c.ouderId)
  const eigenMid = eigenCategorieen.filter((c) => c.ouderId)

  // De context van een ouder: een ingebouwde hoofdcategorie of een eigen.
  const hoofdContext = (id: string): { id: string; naam: string; kleur: string; icoon: string } | null => {
    const ingebouwd = INGEBOUWDE_CATEGORIEEN.find((h) => h.id === id)
    if (ingebouwd) return { id: ingebouwd.id, naam: ingebouwd.naam, kleur: ingebouwd.kleur, icoon: ingebouwd.icoon }
    const eigen = eigenHoofd.find((h) => h.id === id)
    if (eigen) return { id: eigen.id, naam: eigen.naam, kleur: eigen.kleur ?? EIGEN_KLEUR, icoon: eigen.icoon ?? '' }
    return null
  }

  // 1. De middenlaag: ingebouwd + eigen.
  const mids: MidCategorie[] = [...MID_BASIS]
  const context = new Map(BASIS_CONTEXT_PER_CAT)
  for (const m of eigenMid) {
    const ouder = hoofdContext(m.ouderId!)
    // Een wees (ouder bestaat niet meer) laten we bewust weg: hem onder een
    // willekeurige hoofdcategorie hangen zou erger zijn dan hem niet tonen. Het
    // verwijderen van een hoofdcategorie ruimt haar kinderen op, dus in de
    // praktijk komt dit alleen voor bij handmatig geknoeide data.
    if (!ouder) continue
    mids.push({
      id: m.id,
      naam: m.naam,
      hoofdId: ouder.id,
      hoofdNaam: ouder.naam,
      kleur: m.kleur ?? ouder.kleur,
      icoon: m.icoon ?? ouder.icoon,
    })
    context.set(m.id, {
      categorieNaam: m.naam,
      hoofdId: ouder.id,
      hoofdNaam: ouder.naam,
      kleur: m.kleur ?? ouder.kleur,
      icoon: m.icoon ?? ouder.icoon,
    })
  }
  huidigeMids = mids
  midRegister = new Map(mids.map((m) => [m.id, m]))
  CONTEXT_PER_CAT = context

  // 2. De items, nu de middenlaag compleet is.
  huidigeItems = bouwEffectieveItems(aanpassingen, context)
  perIdRegister = new Map(huidigeItems.map((i) => [i.id, i]))
}

/** Oude naam, behouden zodat bestaande aanroepen blijven werken. */
export function stelSubcategorieenIn(aanpassingen: Subcategorie[]): void {
  stelCategorieboomIn(aanpassingen, [])
}

// Zoekt een item op zijn id (inclusief gebruikersaanpassingen).
export function itemPerId(id: string): PlatItem | undefined {
  return perIdRegister.get(id)
}

// Zoekt items op naam of synoniem (hoofdletterongevoelig), inclusief
// gebruikersaanpassingen. Rangschikt op relevantie.
export function zoekItems(term: string, limiet = 25): PlatItem[] {
  const t = term.trim().toLowerCase()
  if (!t) return []

  const gescoord: { item: PlatItem; score: number }[] = []
  for (const item of huidigeItems) {
    const naam = item.naam.toLowerCase()
    let score = -1
    if (naam === t) score = 0
    else if (naam.startsWith(t)) score = 1
    else if (naam.includes(t)) score = 2
    else if (item.synoniemen.some((s) => s.toLowerCase().includes(t))) score = 3
    if (score >= 0) gescoord.push({ item, score })
  }

  gescoord.sort((a, b) => a.score - b.score || a.item.naam.localeCompare(b.item.naam, 'nl'))
  return gescoord.slice(0, limiet).map((g) => g.item)
}

// --- De MIDDENLAAG (cat-*) --------------------------------------------------
//
// De middenlaag bestond wel in de boom, maar was nergens op te zoeken of op te
// vragen. Sinds ronde 25 kan je er een BUDGET op zetten ("€ 150 voor Persoonlijke
// verzorging"), en dan moet de app haar naam kennen en haar kunnen vinden.
//
// LET OP: dit maakt de middenlaag NIET kiesbaar als categorie van een transactie.
// `groepVanCategorie` kent die laag nog altijd niet, dus een transactie die erop
// getagd zou zijn, valt uit elke grafiek. Zie de projectinstructies.

/** Eén middencategorie met haar plaats in de boom. */
export type MidCategorie = {
  id: string
  naam: string
  hoofdId: string
  hoofdNaam: string
  kleur: string
  icoon: string
}

/** De vaste, INGEBOUWDE middencategorieën. */
export const MID_BASIS: MidCategorie[] = INGEBOUWDE_CATEGORIEEN.flatMap((hoofd) =>
  hoofd.categorieen.map((cat) => ({
    id: cat.id,
    naam: cat.naam,
    hoofdId: hoofd.id,
    hoofdNaam: hoofd.naam,
    kleur: hoofd.kleur,
    icoon: hoofd.icoon,
  })),
)

/**
 * De kleur die een eigen hoofdcategorie zonder eigen kleur meekrijgt. Bewust een
 * neutrale tint uit het palet en geen willekeurige: een categorie hoort niet van
 * kleur te wisselen omdat er eentje bijkomt.
 */
const EIGEN_KLEUR = '#8A8175'

// Het register: basis + wat de gebruiker zelf gemaakt heeft (zie
// `stelCategorieboomIn` hieronder).
let huidigeMids: MidCategorie[] = MID_BASIS
let midRegister = new Map(MID_BASIS.map((c) => [c.id, c]))

/** Alle middencategorieën die nu gelden, ingebouwd én eigen. */
export function alleMidCategorieen(): MidCategorie[] {
  return huidigeMids
}

/** Zoekt een middencategorie op haar id. */
export function midPerId(id: string): MidCategorie | undefined {
  return midRegister.get(id)
}

/** Zoekt middencategorieën op naam, op dezelfde manier als `zoekItems`. */
export function zoekMidCategorieen(term: string, limiet = 25): MidCategorie[] {
  const t = term.trim().toLowerCase()
  if (!t) return []
  const gescoord: { cat: MidCategorie; score: number }[] = []
  for (const cat of huidigeMids) {
    const naam = cat.naam.toLowerCase()
    let score = -1
    if (naam === t) score = 0
    else if (naam.startsWith(t)) score = 1
    else if (naam.includes(t)) score = 2
    if (score >= 0) gescoord.push({ cat, score })
  }
  gescoord.sort((a, b) => a.score - b.score || a.cat.naam.localeCompare(b.cat.naam, 'nl'))
  return gescoord.slice(0, limiet).map((g) => g.cat)
}
