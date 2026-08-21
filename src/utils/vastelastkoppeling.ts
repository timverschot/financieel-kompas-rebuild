import type { TerugkerendePost, Transactie } from '../data/schema'
import { geboekteVasteLasten } from './vooruitblik'
import { valtInMaand } from './vastelast'

// "Is dit je vaste last Water?" — de app vraagt het in plaats van te zwijgen
// (ronde 64).
//
// ⚠ WAAR DIT VANDAAN KOMT. Timothy, na echt gebruik: *"als ik vaste kosten invul,
// wordt dat dan automatisch verwerkt wanneer ik bijvoorbeeld een uitgave voor water
// invoer?"* Het antwoord was: alleen bij een EXACTE match — zelfde maand, zelfde
// rekening, exact hetzelfde bedrag tot de cent, exact dezelfde categorie. Een
// waterfactuur van € 32 tegenover een vaste last van € 30 herkende de app dus niet.
// Erger: klikte je dan op "Boek in", dan maakte ze er een tweede boeking van € 30
// bij, en telde je maand € 62 op Water terwijl er € 32 van je rekening ging.
//
// Strenger maken kon niet en losser ook niet: de strenge regel bestaat juist om te
// vermijden dat een gewone uitgave stil als vaste last wordt weggemoffeld (zie
// `isMogelijkeBoeking` in `vooruitblik.ts`). De derde weg is de app laten VRAGEN.
// Zij herkent wat waarschijnlijk bij elkaar hoort; jij beslist. Je antwoord komt in
// `Transactie.vasteLastId` te staan en dan is er geen twijfel meer.
//
// Zuivere functies: geen datums van binnenuit, geen database.

/**
 * Hoeveel het bedrag mag afwijken vóór we het niet meer waarschijnlijk vinden.
 *
 * ⚠ Er staat een grens omdat de vraag anders ruis wordt. Heb je een vaste last
 * "Boodschappen € 400" staan, dan mag een broodje van € 3 in diezelfde categorie
 * niet elke keer de vraag oproepen of dát je vaste last is. De helft is ruim genoeg
 * voor een factuur die schommelt (water, elektriciteit, gas) en smal genoeg om een
 * gewone aankoop buiten te houden. Bij twijfel vraagt de app niets — dat is
 * dezelfde keuze als overal: liever één keer te weinig herkennen.
 */
export const KOPPEL_MARGE = 0.5

/**
 * Lijkt deze boeking op die vaste last, zonder dat ze exact gelijk zijn?
 *
 * De categorie is hier het dragende bewijs, niet het bedrag. Een vaste last zonder
 * categorie doet dus nooit mee: dan blijft alleen "zelfde rekening, ongeveer
 * hetzelfde bedrag" over, en dat is te weinig om iemand een vraag over te stellen.
 */
function lijktErop(t: Transactie, p: TerugkerendePost, maand: string): boolean {
  // Al beantwoord: een boeking die aan een vaste last hangt, hoort bij díé last.
  if (t.vasteLastId !== undefined) return false
  // ⚠ Alleen posten die deze maand ECHT vervallen (nakijkronde ronde 64). Zonder
  // deze regel stelde de app de vraag over een abonnement dat je vorig jaar opzegde
  // en over een jaarpremie die pas in januari vervalt — terwijl de vraag zelf zegt
  // "en die staat deze maand nog open". Erger: van twee posten in dezelfde
  // categorie koos ze dan de OPGEZEGDE omdat het bedrag toevallig dichterbij lag,
  // en bleef de lopende post open staan voor een tweede boeking.
  if (!valtInMaand(p, maand)) return false
  // ⚠ Alleen UITGAVEN. Een vaste inkomst afpunten met een lagere boeking laat je
  // "te verdelen" zakken zonder dat er iets misging, en de vraag zou het bovendien
  // over "je vaste last Loon" hebben — de app zet vaste inkomsten en vaste lasten
  // sinds ronde 25 juist uit elkaar.
  if (p.bedrag >= 0) return false
  if (!t.datum.startsWith(maand)) return false
  if (t.rekeningId !== p.rekeningId) return false
  if (t.regels && t.regels.length > 0) return false
  if (p.categorieId === undefined) return false
  if (t.categorieId !== p.categorieId) return false
  // Exact gelijk hoeft geen vraag: dat herkent de app zelf al (`isMogelijkeBoeking`).
  if (t.bedrag === p.bedrag) return false
  return Math.abs(t.bedrag - p.bedrag) <= Math.abs(p.bedrag) * KOPPEL_MARGE
}

/** Uit meerdere kandidaten: die met het dichtste bedrag, of niets bij gelijkspel. */
function dichtstbij<T>(kandidaten: T[], afstand: (k: T) => number): T | null {
  if (kandidaten.length === 0) return null
  if (kandidaten.length === 1) return kandidaten[0]
  const gesorteerd = [...kandidaten].sort((a, b) => afstand(a) - afstand(b))
  // ⚠ Bij een gelijkspel vragen we NIETS. Twee vaste lasten die even ver van deze
  // boeking liggen: dan zou de app moeten gokken over welke van de twee ze de vraag
  // stelt, en een verkeerd gestelde vraag levert een verkeerd antwoord op.
  if (afstand(gesorteerd[0]) === afstand(gesorteerd[1])) return null
  return gesorteerd[0]
}

/**
 * Bij welke vaste last hoort deze boeking waarschijnlijk?
 *
 * Geeft `null` wanneer er niets te vragen valt. Posten die deze maand al afgedekt
 * zijn, doen niet mee: dan is er niets meer op te lossen.
 */
export function vasteLastVoorBoeking(
  boeking: Transactie,
  posten: readonly TerugkerendePost[],
  transacties: readonly Transactie[],
  maand: string,
): TerugkerendePost | null {
  const alGeboekt = geboekteVasteLasten([...transacties], [...posten], maand)
  const kandidaten = posten.filter((p) => !alGeboekt.has(p.id) && lijktErop(boeking, p, maand))
  return dichtstbij(kandidaten, (p) => Math.abs(boeking.bedrag - p.bedrag))
}

/**
 * Welke bestaande boeking is waarschijnlijk de betaling van deze vaste last?
 *
 * Dit is de vraag die "Boek in" stelt vóór hij een tweede boeking bijmaakt. De
 * strenge controle (`boekingDieDezePostAfdekt`) vangt alleen het exacte bedrag af;
 * juist het geval van Timothy — € 32 tegenover € 30 — glipte daar doorheen.
 */
export function boekingVoorVasteLast(
  post: TerugkerendePost,
  transacties: readonly Transactie[],
  posten: readonly TerugkerendePost[],
  maand: string,
): Transactie | null {
  const alGeboekt = geboekteVasteLasten([...transacties], [...posten], maand)
  if (alGeboekt.has(post.id)) return null
  const kandidaten = transacties.filter((t) => lijktErop(t, post, maand))
  return dichtstbij(kandidaten, (t) => Math.abs(t.bedrag - post.bedrag))
}
