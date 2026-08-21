import type { Budget, Maandafsluiting, TerugkerendePost, Transactie } from '../data/schema'
import { maandInkomsten, maandUitgaven } from './overzicht'
import { bepaalBalans, type Balans } from './balans'
import { mistCategorie } from './transactieFilter'
import { geldendeBudgetten, uitgavenInMaand } from './budget'
import { maandVooruitblik } from './vooruitblik'

// De rekenkern van de maandafsluiting (ronde 43).
//
// WAARVOOR. Een budget-app vraagt van je dat je er élke dag aan denkt, en dat houdt
// niemand vol. De maandafsluiting vervangt die belofte door een andere: één keer per
// maand, vijf minuten, met een duidelijk einde. Drie stappen die de app allemaal al
// kon — je uittreksel inlezen, de boekingen zonder categorie wegwerken, je cijfers
// bekijken — maar die verspreid over drie schermen stonden en dus nooit als één
// handeling voelden.
//
// WAT DEZE MODULE WEL EN NIET WEET. Ze kan zien of er nog boekingen zonder categorie
// zijn en of er die maand überhaupt iets geboekt is. Ze kan NIET weten of jij je
// uittreksel al ingelezen hebt of je cijfers bekeken hebt — daarvoor bestaat het
// record `Maandafsluiting`. Dat verschil is het hele punt: "er valt niets meer te
// doen" is iets anders dan "ik heb ernaar gekeken".
//
// Zuiver en deterministisch: "vandaag" en "welke maand" komen altijd van buiten.

/** De drie stappen, in de volgorde waarin je ze doet. */
export const STAPPEN = ['boekingen', 'categorieen', 'oordeel'] as const
export type Stapsleutel = (typeof STAPPEN)[number]

export type Stap = {
  sleutel: Stapsleutel
  /**
   * Is deze stap klaar?
   *
   * Bewust een lage lat. Een stap is klaar wanneer er niets meer te dóén is, niet
   * wanneer alles perfect is — anders staat er in een rustige maand een rood
   * kruisje omdat je toevallig weinig geboekt hebt, en dan stopt iemand ermee.
   */
  klaar: boolean
  /** Het getal dat bij deze stap hoort (aantal boekingen, aantal zonder categorie). */
  aantal: number
}

export type MaandStand = {
  /** De maand zelf, 'JJJJ-MM'. */
  maand: string
  /** Is deze maand al afgesloten? */
  afgesloten: boolean
  /** Wanneer, als ze afgesloten is. */
  afgeslotenOp: string | null
  /** De drie stappen. */
  stappen: Stap[]
  /** Hoeveel boekingen er die maand staan. */
  boekingen: number
  /** Hoeveel daarvan nog een categorie missen. */
  zonderCategorie: number
  /** Hoeveel vaste lasten er die maand nog niet ingeboekt zijn. */
  vasteLastenOpen: number
  /** Hoeveel budgetten er die maand overschreden zijn. */
  budgettenOver: number
  /** Wat er binnenkwam en wat eraf ging, in centen. */
  inkomsten: number
  uitgaven: number
  /** Overschot, tekort of in balans. */
  balans: Balans
  /** Kan je hier iets doen? Zo niet, dan is afsluiten het enige dat rest. */
  werkTeDoen: boolean
}

export type MaandStandInvoer = {
  maand: string
  transacties: Transactie[]
  budgetten: Budget[]
  terugkerendePosten: TerugkerendePost[]
  afsluitingen: Maandafsluiting[]
  /** 'JJJJ-MM-DD'. */
  vandaagISO: string
}

/** De volledige stand van één maand. */
export function maandStand(invoer: MaandStandInvoer): MaandStand {
  const vanDeMaand = invoer.transacties.filter((t) => t.datum.startsWith(invoer.maand))
  const zonder = vanDeMaand.filter(mistCategorie)
  const afsluiting = invoer.afsluitingen.find((a) => a.id === invoer.maand)

  const blik = maandVooruitblik(invoer.transacties, invoer.terugkerendePosten, invoer.maand, invoer.vandaagISO)
  const vasteLastenOpen = blik.achterstalligeIds.length

  let budgettenOver = 0
  // ⚠ `geldendeBudgetten` met de maand die je AFSLUIT (ronde 62), niet met de maand
  // die je bekijkt: dit scherm heeft zijn eigen maandkeuze. Zonder deze functie zou
  // een categorie met een standaardbudget én een uitzondering hier dubbel geteld
  // worden — "2 budgetten over" terwijl er één over is.
  for (const b of geldendeBudgetten(invoer.budgetten, invoer.maand)) {
    if (b.bedrag <= 0) continue
    if (uitgavenInMaand(invoer.transacties, b.categorieId, invoer.maand) > b.bedrag) budgettenOver++
  }

  const inkomsten = maandInkomsten(invoer.transacties, invoer.maand)
  const uitgaven = maandUitgaven(invoer.transacties, invoer.maand)

  const stappen: Stap[] = [
    // Stap 1 is klaar zodra er íets geboekt is. Meer kan de app niet weten: of jouw
    // uittreksel volledig is, weet alleen jij.
    { sleutel: 'boekingen', klaar: vanDeMaand.length > 0, aantal: vanDeMaand.length },
    // ⚠ RONDE 65. Dit was `zonder.length === 0`, en op een LEGE maand is dat waar.
    // Stap 2 kreeg dan een groen "rond" met "Alles heeft een categorie. Niets te
    // doen." — over nul boekingen. Een vinkje voor werk dat je niet gedaan hebt is
    // erger dan geen vinkje: het zegt je dat je klaar bent.
    { sleutel: 'categorieen', klaar: vanDeMaand.length > 0 && zonder.length === 0, aantal: zonder.length },
    // Stap 3 heeft geen eigen voorwaarde: kijken is de handeling. Ze staat er als
    // stap omdat het scherm anders na twee vinkjes ophoudt zonder je de cijfers te
    // tonen waarvoor je het allemaal deed.
    { sleutel: 'oordeel', klaar: vanDeMaand.length > 0, aantal: vanDeMaand.length },
  ]

  return {
    maand: invoer.maand,
    afgesloten: afsluiting !== undefined,
    afgeslotenOp: afsluiting?.afgeslotenOp ?? null,
    stappen,
    boekingen: vanDeMaand.length,
    zonderCategorie: zonder.length,
    vasteLastenOpen,
    budgettenOver,
    inkomsten,
    uitgaven,
    balans: bepaalBalans(inkomsten, uitgaven),
    werkTeDoen: zonder.length > 0 || vasteLastenOpen > 0 || vanDeMaand.length === 0,
  }
}

/** De maand vóór 'maand', als 'JJJJ-MM'. */
export function vorigeMaand(maand: string): string {
  const [jaar, m] = maand.split('-').map(Number)
  if (!Number.isFinite(jaar) || !Number.isFinite(m)) return maand
  const totaal = jaar * 12 + (m - 1) - 1
  return `${String(Math.floor(totaal / 12)).padStart(4, '0')}-${String((totaal % 12) + 1).padStart(2, '0')}`
}

/**
 * Hoeveel dagen er verstreken zijn sinds de maand afliep.
 *
 * Gebruikt om te beslissen wanneer de app over een openstaande maand mag beginnen:
 * op 1 juli je juni-cijfers afsluiten is voorbarig, want de laatste boekingen van
 * juni staan er dan vaak nog niet op je uittreksel.
 */
export function dagenNaMaand(maand: string, vandaagISO: string): number {
  const [jaar, m] = maand.split('-').map(Number)
  const eerstVolgende = `${String(m === 12 ? jaar + 1 : jaar).padStart(4, '0')}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`
  const van = Date.parse(`${eerstVolgende}T00:00:00Z`)
  const tot = Date.parse(`${vandaagISO}T00:00:00Z`)
  if (!Number.isFinite(van) || !Number.isFinite(tot)) return 0
  return Math.round((tot - van) / 86_400_000)
}

/**
 * Hoeveel dagen we wachten voor de app over een afgelopen maand begint.
 *
 * Vijf werkdagen ruim genomen: de meeste banken hebben tegen dan alles verwerkt, en
 * wie op de eerste van de maand al gepord wordt, sluit een maand af die nog niet
 * compleet is.
 */
export const RIJPINGSDAGEN = 5

/**
 * Welke afgelopen maanden nog niet afgesloten zijn, oudste eerst.
 *
 * Alleen maanden waarin er íets geboekt is: een maand waarin je de app niet gebruikt
 * hebt, hoef je niet af te sluiten — daar valt niets na te kijken, en een herinnering
 * eraan is enkel ruis. Kijkt hoogstens 'maxMaanden' terug, zodat een lange
 * geschiedenis geen rij meldingen oplevert.
 */
export function openMaanden(
  transacties: Transactie[],
  afsluitingen: Maandafsluiting[],
  vandaagISO: string,
  maxMaanden = 12,
): string[] {
  const afgesloten = new Set(afsluitingen.map((a) => a.id))
  const geboekt = new Set(transacties.map((t) => t.datum.slice(0, 7)))
  const uit: string[] = []
  let maand = vorigeMaand(vandaagISO.slice(0, 7))
  for (let i = 0; i < maxMaanden; i++) {
    if (geboekt.has(maand) && !afgesloten.has(maand) && dagenNaMaand(maand, vandaagISO) >= RIJPINGSDAGEN) {
      uit.push(maand)
    }
    maand = vorigeMaand(maand)
  }
  return uit.reverse()
}
