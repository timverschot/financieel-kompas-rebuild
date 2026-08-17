// Eén palet voor alles wat gekleurd moet worden.
//
// Waarom dit bestaat: er waren twee paletten die niets van elkaar wisten. De
// Analyse-pagina had een eigen `PALET` van twaalf tinten voor lijstjes zonder eigen
// kleur (producten, winkels, gezinsleden), en de icoon- en kleurkiezer had een
// eigen `KLEUR_KEUZES` van twaalf tinten voor je eigen categorieën. Zeven van de
// twaalf verschilden. Gevolg: hetzelfde soort schijfje kon in het ene diagram
// zeegroen zijn en in het andere iets anders, en een eigen categorie viel op naast
// de rest.
//
// Deze twaalf tinten zijn de kleuren die de ingebouwde hoofdcategorieën gebruiken.
// Dat is de juiste bron: zo hoort een zelfgemaakte categorie er meteen bij, en
// spreken alle diagrammen dezelfde taal.
//
// Ze staan als hexcode en niet als thematoken, en dat is bewust: een categoriekleur
// is **opgeslagen data** (ze zit in het `kleur`-veld van een categorie en in een
// Drive-back-up), geen opmaak die met licht of donker mag wisselen.

export type Paletkleur = { kleur: string; naam: string }

export const PALET: Paletkleur[] = [
  { kleur: '#F59E0B', naam: 'Amber' },
  { kleur: '#C56A1F', naam: 'Oranje' },
  { kleur: '#C1502E', naam: 'Terracotta' },
  { kleur: '#D64545', naam: 'Rood' },
  { kleur: '#C97B8B', naam: 'Oudroze' },
  { kleur: '#96588A', naam: 'Paars' },
  { kleur: '#3F8A58', naam: 'Mosgroen' },
  { kleur: '#3E7C7B', naam: 'Zeegroen' },
  { kleur: '#0891B2', naam: 'Turkoois' },
  { kleur: '#92400E', naam: 'Bruin' },
  { kleur: '#83705C', naam: 'Zandbruin' },
  { kleur: '#6B7280', naam: 'Grijs' },
]

/** Alleen de kleuren, in vaste volgorde — voor diagrammen en lijstjes. */
export const GRAFIEKKLEUREN: string[] = PALET.map((p) => p.kleur)

/**
 * De neutrale tint voor een restgroep ("Overige (7)"). Bewust géén kleur uit het
 * palet: een restgroep mag niet als een echte categorie lezen.
 */
export const OVERIGE_KLEUR = '#A08C77'

/**
 * De tint voor "Het gezin": alles wat aan géén enkel gezinslid hangt (ronde 51).
 *
 * Ook géén kleur uit het palet, om dezelfde reden als hierboven — deze groep is geen
 * persoon en mag er niet als een lezen. Maar het is ook geen RESTgroep: het is een
 * echte, benoemde categorie uitgaven waar je op kan doorklikken.
 *
 * Waarom ze een eigen tint kreeg: ze deelde `OVERIGE_KLEUR` met de schijf
 * "Overige (n)", en sinds "Het gezin" bij tien of meer gezinsleden vastgepind in de
 * ring blijft staan, kunnen die twee nu naast elkaar voorkomen. Twee schijven in
 * dezelfde kleur zijn niet aan hun legende te koppelen, en dat is precies waar een
 * donut voor dient.
 */
export const GEZIN_KLEUR = '#5B6B7C'

/** De kleur voor plaats `i` in een lijst, met herhaling zodra het palet rond is. */
export function kleurVoor(i: number): string {
  return GRAFIEKKLEUREN[i % GRAFIEKKLEUREN.length]
}
