import { INGEBOUWDE_CATEGORIEEN } from './ingebouwd'
import { itemPerId } from './zoek'

// Een transactie kan getagd zijn op twee niveaus: een hoofdcategorie (bv.
// 'Voeding') of een specifiek item/subcategorie (bv. 'Brood (wit)'). Daarnaast
// kan ze nog verwijzen naar een eigen, door de gebruiker gemaakte categorie
// (uit de oude, platte lijst). Deze helpers zetten zo'n opgeslagen id om naar:
//  - de GROEP waaronder ze valt (voor optellen en grafieken: altijd de
//    hoofdcategorie voor ingebouwde items), en
//  - het LABEL dat je het best toont (het specifieke niveau dat gekozen werd).

const HOOFD_PER_ID = new Map(INGEBOUWDE_CATEGORIEEN.map((h) => [h.id, h]))

export type CategorieGroep = {
  sleutel: string // groepeersleutel voor optellingen/grafieken
  naam: string // weergavenaam van de groep (hoofdcategorie)
  kleur: string | null // kleur van de hoofdcategorie (voor grafieken), of null
}

// Rolt een categorieId op naar zijn groep (hoofdcategorie). Een ingebouwd item
// rolt op naar zijn hoofdcategorie; een hoofdcategorie is haar eigen groep; een
// eigen categorie blijft zichzelf; niets = 'Zonder categorie'; onbekend = 'Onbekend'.
export function groepVanCategorie(
  id: string | undefined,
  gebruikerCategorieen: { id: string; naam: string }[],
): CategorieGroep {
  if (!id) return { sleutel: '', naam: 'Zonder categorie', kleur: null }

  const hoofd = HOOFD_PER_ID.get(id)
  if (hoofd) return { sleutel: hoofd.id, naam: hoofd.naam, kleur: hoofd.kleur }

  const item = itemPerId(id)
  if (item) return { sleutel: item.hoofdId, naam: item.hoofdNaam, kleur: item.kleur }

  const eigen = gebruikerCategorieen.find((c) => c.id === id)
  if (eigen) return { sleutel: eigen.id, naam: eigen.naam, kleur: null }

  return { sleutel: id, naam: 'Onbekend', kleur: null }
}

// Het label dat je het best toont voor een categorieId: het SPECIFIEKE niveau dat
// gekozen werd (item toont zijn eigen naam, hoofdcategorie haar naam, eigen
// categorie haar naam). Geeft undefined bij geen categorie.
export function labelVanCategorie(
  id: string | undefined,
  gebruikerCategorieen: { id: string; naam: string }[],
): string | undefined {
  if (!id) return undefined
  const item = itemPerId(id)
  if (item) return item.naam
  const hoofd = HOOFD_PER_ID.get(id)
  if (hoofd) return hoofd.naam
  const eigen = gebruikerCategorieen.find((c) => c.id === id)
  if (eigen) return eigen.naam
  return 'Onbekend'
}
