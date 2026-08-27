import type { Budget, Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { groepVanCategorie } from '../data/categorieen/resolve'
import { itemPerId, midPerId } from '../data/categorieen/zoek'

// Zuivere functies voor de budgetopvolging. 'maand' is 'JJJJ-MM'.
//
// Sinds ronde 25 kan een budget op DRIE niveaus staan, en dat is de kern van deze
// module. Daarvóór rolde elke transactieregel op naar haar groep (de
// hoofdcategorie) en werd die met het budget vergeleken. Gevolg: een budget op
// "Persoonlijke verzorging" of op "Brood (wit)" zou nooit één transactie
// herkennen en eeuwig op € 0 verbruikt blijven staan. De keuzelijst bood die
// niveaus daarom niet eens aan — maar "€ 800 voor Huishouden en Verzorging"
// stuurt niets, en "€ 150 voor Persoonlijke verzorging" wel.
//
// De regel is nu: een regel telt mee wanneer het budgetniveau in haar eigen keten
// voorkomt.
//
//   budget op een HOOFDcategorie (ov-*) of een EIGEN categorie
//     → alles eronder telt mee (het oude gedrag, ongewijzigd)
//   budget op een MIDDENcategorie (cat-*)
//     → enkel items die onder díé middencategorie hangen
//   budget op een ITEM (i-*)
//     → enkel dat ene item
//
// Een boeking die rechtstreeks op een hoofdcategorie getagd staat ("dit was gewoon
// Huishouden"), telt bewust NIET mee in een budget op een middencategorie
// eronder. Je weet niet of die € 40 naar verzorging of naar poetsproducten ging,
// en ze stilzwijgend toewijzen zou het budget laten kloppen met iets wat niemand
// gezegd heeft.

/** Op welk niveau staat dit budget? */
export type Budgetniveau = 'hoofd' | 'midden' | 'item'

export function niveauVanBudget(categorieId: string): Budgetniveau {
  if (midPerId(categorieId)) return 'midden'
  if (itemPerId(categorieId)) return 'item'
  return 'hoofd'
}

/**
 * Telt een transactieregel mee voor dit budget? Zuiver, zodat elk niveau apart
 * getest kan worden.
 */
export function regelHoortBijBudget(regelCategorieId: string | undefined, budgetCategorieId: string): boolean {
  // Exact hetzelfde niveau telt altijd: een budget op een item vangt dat item, een
  // budget op een hoofdcategorie vangt een boeking die er rechtstreeks op staat.
  if (regelCategorieId === budgetCategorieId) return true

  switch (niveauVanBudget(budgetCategorieId)) {
    case 'item':
      // Alleen het item zelf, en dat is hierboven al afgehandeld.
      return false
    case 'midden': {
      const item = itemPerId(regelCategorieId ?? '')
      return item?.categorieId === budgetCategorieId
    }
    default:
      // Hoofdcategorie of eigen categorie: oprollen zoals voorheen.
      return groepVanCategorie(regelCategorieId, []).sleutel === budgetCategorieId
  }
}

// Het NETTO-verbruik voor één budget in één maand. Gesplitste kassatickets worden
// uitgesplitst. Een terugbetaling (positieve regel) op hetzelfde niveau VERLAAGT
// het verbruik; het resultaat wordt nooit negatief.
export function uitgavenInMaand(transacties: Transactie[], categorieId: string, maand: string): number {
  let som = 0
  for (const t of transacties) {
    if (!t.datum.startsWith(maand)) continue
    for (const regel of categorieBedragen(t)) {
      if (regelHoortBijBudget(regel.categorieId, categorieId)) {
        // Uitgave (negatief) telt op als verbruik; terugbetaling (positief) trekt af.
        som += -regel.bedrag
      }
    }
  }
  return Math.max(0, som)
}

/**
 * De id van een budget (ronde 62).
 *
 * ⚠ Een STANDAARDbudget houdt exact de id die het altijd al had:
 * `budget-<categorieId>`. Dat is geen schoonheidsfout maar de reden dat opnieuw
 * instellen je bestaande budget BIJWERKT in plaats van er een tweede naast te zetten —
 * en het houdt elk bestaand record precies zoals het is. Een uitzondering voor één
 * maand krijgt de maand achter die id, dus de twee raken elkaar nooit.
 */
export function budgetId(categorieId: string, maand?: string): string {
  return maand === undefined ? `budget-${categorieId}` : `budget-${categorieId}-${maand}`
}

/**
 * Welke budgetten gelden in DEZE maand — hoogstens één per categorie (ronde 62).
 *
 * Sinds ronde 62 kan een budget een `maand` dragen. Ontbreekt die, dan is het je
 * standaardbudget en geldt het elke maand; staat er een maand in, dan geldt het
 * alleen dán en gaat het vóór op je standaard.
 *
 * ⚠ WAAROM ÉÉN FUNCTIE, EN WAAROM ALLES ER LANGS MOET. Er zijn vijf plaatsen die
 * met budgetten rekenen: de Budget-pagina, de planregel bovenaan die pagina, het
 * belletje, de maandafsluiting en de zijkolom van het Overzicht. Geen enkele
 * daarvan kon vóór deze ronde twee records voor dezelfde categorie aan — ze lopen
 * alle vijf gewoon over de lijst. Zou één plek de kale lijst blijven gebruiken, dan
 * staat er dáár een dubbele regel, of erger: de planregel TELT budgetten OP, en die
 * zou je standaardbudget én je uitzondering samen vragen. Dat is een cijfer dat te
 * hoog staat zonder dat iets het verraadt.
 *
 * ⚠ EN ELKE PLEK GEBRUIKT ZIJN EIGEN MAAND. Er zijn er drie tegelijk in omloop: de
 * maand die je BEKIJKT (de schakelaar bovenaan), de maand van NU (waar het belletje
 * over gaat) en de maand die je AFSLUIT. Geef je hier de verkeerde mee, dan
 * waarschuwt het belletje in augustus met je decemberbudget.
 *
 * De volgorde is die van de categorie-id, en dus dezelfde als vóór deze ronde: het
 * oude id was `budget-<categorieId>` en de database gaf ze op id terug. Sorteren op
 * de categorie in plaats van op de id houdt de lijst stil wanneer er een maand
 * achter een id komt te staan.
 */
export function geldendeBudgetten(budgetten: readonly Budget[], maand: string): Budget[] {
  const standaard = new Map<string, Budget>()
  const dezeMaand = new Map<string, Budget>()
  for (const b of budgetten) {
    if (b.maand === undefined) standaard.set(b.categorieId, b)
    else if (b.maand === maand) dezeMaand.set(b.categorieId, b)
    // Een budget voor een ANDERE maand telt hier niet mee. Het blijft wel gewoon
    // bestaan; je ziet het zodra je naar die maand bladert.
  }
  const uit: Budget[] = []
  for (const categorieId of new Set([...standaard.keys(), ...dezeMaand.keys()])) {
    const gekozen = dezeMaand.get(categorieId) ?? standaard.get(categorieId)
    if (gekozen) uit.push(gekozen)
  }
  // ⚠ Een gewone vergelijking en niet `localeCompare` (nakijkronde ronde 62): die
  // volgt de taalinstelling van het toestel, en dan zou dezelfde lijst op een Frans
  // toestel in een andere volgorde kunnen staan dan op een Nederlands.
  return uit.sort((a, b) => (a.categorieId < b.categorieId ? -1 : a.categorieId > b.categorieId ? 1 : 0))
}

/**
 * De budgetten die niet BINNEN een ander geldend budget vallen (ronde 106).
 *
 * ⚠ WAAROM DIT BESTAAT. `geldendeBudgetten` ontdubbelt op dezelfde categorie — één budget per
 * categorie. Maar budgetten kunnen ook in elkáár zitten: € 900 op "Woning en vaste lasten" en
 * € 120 op "Energie en nutsvoorzieningen", een middencategorie daaronder. Dan telde de kaart
 * "Wat ligt vast, wat blijft over" ze allebei op — *"je budgetten vragen samen € 1.020,00"* —
 * terwijl er hoogstens € 900 vastligt. De badge "nog nergens ondergebracht" stond dus € 120 te
 * laag, en dat is precies het getal waarop je stuurt.
 *
 * ⚠ ALLEEN VOOR HET OPTELLEN. De twee balken op de Budget-pagina blijven allebei staan: het
 * is een geldige manier om te budgetteren ("van mijn € 900 woonlasten mag hoogstens € 120 naar
 * energie"), en die € 100 elektriciteit hoort dan ook in allebei mee te tellen. Alleen de SOM
 * mag ze niet twee keer vragen.
 *
 * Het buitenste budget wint, ook wanneer het binnenste hoger staat: dat is een opstelling die
 * zichzelf tegenspreekt, en dan is het plafond nog altijd het plafond.
 */
export function budgettenZonderOverlap(geldend: readonly Budget[]): Budget[] {
  return geldend.filter(
    (b) => !geldend.some((ander) => ander !== b && regelHoortBijBudget(b.categorieId, ander.categorieId)),
  )
}

/**
 * De maanden waarvoor er een apart budget klaarstaat, van vroeg naar laat.
 *
 * Waarvoor: een budget voor september zie je in augustus nergens — het hoort ook
 * niet in je augustuslijst. Maar dan weet je ook niet meer dát je het gezet hebt.
 * Deze lijst laat de Budget-pagina zeggen "je hebt ook een apart budget voor
 * september 2026", met een knop om erheen te bladeren.
 *
 * De maand die je nu bekijkt hoort er NIET bij: die staat al in de lijst erboven, en
 * `vanaf` (meestal de huidige maand) houdt het verleden eruit.
 */
export function maandenMetEigenBudget(budgetten: readonly Budget[], behalve: string, vanaf: string): string[] {
  const maanden = new Set<string>()
  for (const b of budgetten) {
    if (b.maand === undefined || b.maand === behalve) continue
    // ⚠ Niets uit het verleden (nakijkronde ronde 62). Zonder deze regel groeit dit
    // rijtje knoppen alleen maar aan: een uitzondering die je in 2019 zette, zou hier
    // vandaag nog altijd staan. Een voorbije maand kan je toch niet meer bijsturen.
    if (b.maand < vanaf) continue
    maanden.add(b.maand)
  }
  return [...maanden].sort()
}

/**
 * De kleur van een budgetbalk: groen, amber of terracotta.
 *
 * Waarom dit een eigen functie is (ronde 35): de grens stond hard op 80 % op twee
 * plaatsen in de code, terwijl je in Instellingen een drempel tussen 70 en 100 %
 * kan kiezen. De meldingen gebruikten die keuze wél. Zette je hem op 95 %, dan
 * kleurde je balk toch al oranje bij 80 % — de app zei dus iets anders dan wat je
 * had ingesteld.
 *
 * `drempel` is een percentage (70–100), net zoals het in de instellingen staat.
 */
export function budgetKleur(uitgegeven: number, bedrag: number, drempel: number): string {
  if (bedrag <= 0) return 'var(--positive)'
  if (uitgegeven > bedrag) return 'var(--negative)'
  if (uitgegeven >= (bedrag * drempel) / 100) return 'var(--warn)'
  return 'var(--positive)'
}
