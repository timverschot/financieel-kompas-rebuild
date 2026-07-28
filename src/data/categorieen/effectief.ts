import { eigenOpNaam } from '../../utils/categorieVolgorde'
import { INGEBOUWDE_CATEGORIEEN } from './ingebouwd'
import type { Categorie, Subcategorie } from '../schema'

// De boom zoals hij effectief getoond wordt: de vaste basis, met de eigen
// categorieën en de gebruikersaanpassingen erin verwerkt.
//
// Sinds ronde 27 is een EIGEN categorie niet meer noodzakelijk een losse, vlakke
// naam. Een `Categorie` zonder `ouderId` is een eigen HOOFDcategorie; een
// `Categorie` mét `ouderId` is een eigen MIDDENcategorie die onder die ouder
// hangt — en die ouder mag een eigen hoofdcategorie zijn óf een ingebouwde. Zo
// krijg je ook voor je eigen categorieën de volledige boom
// hoofdcategorie → categorie → item, precies zoals bij de ingebouwde.
//
// 'eigen' op een tak zegt of de gebruiker hem zelf gemaakt heeft; alleen die
// takken mag je verwijderen zonder de ingebouwde referentie te raken.
export type EffectiefItem = { id: string; naam: string; eenheid: string | null; eigen: boolean }
export type EffectieveCategorie = { id: string; naam: string; eigen: boolean; items: EffectiefItem[] }
export type EffectieveHoofd = {
  id: string
  naam: string
  icoon: string
  kleur: string | null
  eigen: boolean
  categorieen: EffectieveCategorie[]
}

export function bouwEffectieveBoom(
  aanpassingen: Subcategorie[],
  eigenCategorieen: Categorie[] = [],
): EffectieveHoofd[] {
  const basisIds = new Set<string>()
  for (const h of INGEBOUWDE_CATEGORIEEN) for (const c of h.categorieen) for (const it of c.items) basisIds.add(it.id)

  // Een aanpassing op een BESTAAND item is een hernoeming; al de rest is een
  // toevoeging onder haar categorie.
  const overrideNaam = new Map<string, string>()
  const toevoegingenPerCat = new Map<string, Subcategorie[]>()
  for (const a of aanpassingen) {
    if (basisIds.has(a.id)) {
      overrideNaam.set(a.id, a.naam)
    } else {
      const lijst = toevoegingenPerCat.get(a.categorieId) ?? []
      lijst.push(a)
      toevoegingenPerCat.set(a.categorieId, lijst)
    }
  }

  // Alles wat de gebruiker zelf toevoegt, komt alfabetisch te staan (ronde 36).
  //
  // Waarom: de volgorde waarin deze records uit de database komen, is de volgorde
  // van hun interne id — willekeurig dus. Voeg je een categorie toe, dan verscheen
  // ze op een onvoorspelbare plek onderaan de lijst, en de volgende keer weer
  // ergens anders. De INGEBOUWDE volgorde blijft ongemoeid: die is met opzet
  // gegroepeerd (brood bij brood, zuivel bij zuivel) en alfabetiseren zou dat
  // stukslaan. Alleen jouw eigen takken sorteren dus onderling.
  const opNaam = <T extends { id: string; naam: string }>(lijst: T[]): T[] =>
    lijst.slice().sort((a, b) => a.naam.localeCompare(b.naam, 'nl') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const eigenHoofd = eigenCategorieen.filter((c) => !c.ouderId)
  const eigenMid = eigenCategorieen.filter((c) => c.ouderId)
  const midPerOuder = new Map<string, Categorie[]>()
  for (const m of eigenMid) {
    const lijst = midPerOuder.get(m.ouderId as string) ?? []
    lijst.push(m)
    midPerOuder.set(m.ouderId as string, lijst)
  }
  for (const [ouder, lijst] of midPerOuder) midPerOuder.set(ouder, opNaam(lijst))
  for (const [cat, lijst] of toevoegingenPerCat) toevoegingenPerCat.set(cat, opNaam(lijst))

  const eigenTak = (c: Categorie): EffectieveCategorie => ({
    id: c.id,
    naam: c.naam,
    eigen: true,
    items: (toevoegingenPerCat.get(c.id) ?? []).map((a) => ({
      id: a.id,
      naam: a.naam,
      eenheid: null,
      eigen: true,
    })),
  })

  const ingebouwd: EffectieveHoofd[] = INGEBOUWDE_CATEGORIEEN.map((hoofd) => ({
    id: hoofd.id,
    naam: hoofd.naam,
    icoon: hoofd.icoon,
    kleur: hoofd.kleur,
    eigen: false,
    categorieen: [
      ...hoofd.categorieen.map((cat) => ({
        id: cat.id,
        naam: cat.naam,
        eigen: false,
        items: [
          ...cat.items.map((it) => ({
            id: it.id,
            naam: overrideNaam.get(it.id) ?? it.naam,
            eenheid: it.eenheid,
            eigen: false,
          })),
          ...(toevoegingenPerCat.get(cat.id) ?? []).map((a) => ({
            id: a.id,
            naam: a.naam,
            eenheid: null,
            eigen: true,
          })),
        ],
      })),
      // Eigen middencategorieën die je onder een INGEBOUWDE hoofdcategorie hing.
      ...(midPerOuder.get(hoofd.id) ?? []).map(eigenTak),
    ],
  }))

  const eigen: EffectieveHoofd[] = eigenOpNaam(eigenHoofd).map((h) => ({
    id: h.id,
    naam: h.naam,
    icoon: h.icoon ?? '',
    kleur: h.kleur ?? null,
    eigen: true,
    categorieen: (midPerOuder.get(h.id) ?? []).map(eigenTak),
  }))

  // De ingebouwde eerst, de eigen erachter.
  //
  // Tot ronde 30 stonden de eigen hoofdcategorieën vooraan, met als redenering:
  // het zijn er weinig en je hebt ze zelf gemaakt. In de praktijk sprong daardoor
  // élke categorie die je pas aanmaakte meteen bovenaan de lijst, ook een die je
  // zelden gebruikt. Dit is nu enkel nog de STANDAARDvolgorde: op de
  // Categorieën-pagina zet je alles zelf op zijn plaats, en die keuze wordt
  // bewaard (zie utils/categorieVolgorde.ts).
  return [...ingebouwd, ...eigen]
}
