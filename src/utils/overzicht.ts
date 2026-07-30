import type { Categorie, Transactie } from '../data/schema'
import { groepVanCategorie } from '../data/categorieen/resolve'
import { categorieBedragen } from './transactie'

// Zuivere functies voor het maandoverzicht. Los gehouden zodat ze deterministisch
// getest kunnen worden.
//
// 'periode' is een PREFIX van een datum: 'JJJJ-MM' voor één maand, of 'JJJJ' voor
// een heel jaar. Alle tellingen hier vergelijken met `datum.startsWith(periode)`,
// dus beide vormen werken zonder aparte logica. Ronde 41 maakte dat expliciet
// omdat de jaar-PDF hetzelfde moet kunnen tellen als de maand-PDF; vóór die ronde
// stond er 'maand' en was het toeval dat een jaar ook werkte.

// Inkomsten en uitgaven tellen op REGELNIVEAU (via categorieBedragen), net zoals
// de donut per categorie. Zo blijft het maandtotaal altijd gelijk aan de som van
// de grafiek-segmenten, ook bij een gesplitst ticket met een positieve regel
// (bv. statiegeld of korting) tussen de uitgaven.
export function maandInkomsten(transacties: Transactie[], periode: string): number {
  let som = 0
  for (const t of transacties) {
    if (!t.datum.startsWith(periode)) continue
    for (const regel of categorieBedragen(t)) if (regel.bedrag > 0) som += regel.bedrag
  }
  return som
}

export function maandUitgaven(transacties: Transactie[], periode: string): number {
  let som = 0
  for (const t of transacties) {
    if (!t.datum.startsWith(periode)) continue
    for (const regel of categorieBedragen(t)) if (regel.bedrag < 0) som += Math.abs(regel.bedrag)
  }
  return som
}

/**
 * Inkomsten, uitgaven en saldo van een WILLEKEURIGE selectie transacties — dus
 * niet van een maand, maar van precies de rijen die in de lijst staan.
 *
 * Waarom dat verschil telt: de kengetallen bovenaan de Transacties-pagina horen
 * over dezelfde rijen te gaan als de lijst eronder. Zou je ze op de maand
 * berekenen terwijl er een filter aanstaat, dan lees je bovenaan € 1.200 uitgaven
 * en tel je in de lijst € 300 — en dan vertrouw je geen van beide nog.
 *
 * Op regelniveau geteld, net als het maandoverzicht, zodat een gesplitst ticket
 * met een positieve regel (statiegeld, korting) hier exact even zwaar meetelt.
 */
export type Kengetallen = { inkomsten: number; uitgaven: number; saldo: number }

export function kengetallenVan(transacties: Transactie[]): Kengetallen {
  let inkomsten = 0
  let uitgaven = 0
  for (const t of transacties) {
    for (const regel of categorieBedragen(t)) {
      if (regel.bedrag > 0) inkomsten += regel.bedrag
      else if (regel.bedrag < 0) uitgaven += -regel.bedrag
    }
  }
  return { inkomsten, uitgaven, saldo: inkomsten - uitgaven }
}

// `sleutel` is de groepeersleutel van `groepVanCategorie` (de hoofdcategorie, de
// eigen categorie, of '' voor "Zonder categorie"). Ze staat er sinds ronde 40 bij
// omdat een donutschijf en een top-drie-regel anders doodlopen: je ziet € 340 bij
// Voeding en kan nergens heen om te weten wélke boekingen dat zijn.
export type CategorieUitgave = { sleutel: string; naam: string; bedrag: number; kleur: string | null }

// Uitgaven per (hoofd)categorie in één maand, gesorteerd van groot naar klein.
// Elke transactie wordt opgerold naar haar groep: een ingebouwd item telt mee
// onder zijn hoofdcategorie, een hoofdcategorie onder zichzelf, een eigen
// categorie onder zichzelf, en transacties zonder categorie onder 'Zonder
// categorie'. De kleur (van de hoofdcategorie) komt uit hetzelfde data-object,
// zodat grafieken later dezelfde kleur als de cijfers gebruiken.
function groepeerPerCategorie(
  transacties: Transactie[],
  categorieen: Categorie[],
  periode: string,
  wilInkomst: boolean,
): CategorieUitgave[] {
  const perGroep = new Map<string, { sleutel: string; naam: string; kleur: string | null; bedrag: number }>()
  for (const t of transacties) {
    if (!t.datum.startsWith(periode)) continue
    // Splits de transactie uit in haar deelregels (of één regel als ze niet
    // gesplitst is), zodat elke categorie exact zijn deel krijgt.
    for (const regel of categorieBedragen(t)) {
      const past = wilInkomst ? regel.bedrag > 0 : regel.bedrag < 0
      if (past) {
        const groep = groepVanCategorie(regel.categorieId, categorieen)
        const bestaand = perGroep.get(groep.sleutel)
        if (bestaand) bestaand.bedrag += Math.abs(regel.bedrag)
        else
          perGroep.set(groep.sleutel, {
            sleutel: groep.sleutel,
            naam: groep.naam,
            kleur: groep.kleur,
            bedrag: Math.abs(regel.bedrag),
          })
      }
    }
  }

  return [...perGroep.values()]
    .map((g) => ({ sleutel: g.sleutel, naam: g.naam, bedrag: g.bedrag, kleur: g.kleur }))
    .sort((a, b) => b.bedrag - a.bedrag)
}

export function uitgavenPerCategorie(transacties: Transactie[], categorieen: Categorie[], periode: string): CategorieUitgave[] {
  return groepeerPerCategorie(transacties, categorieen, periode, false)
}

export function inkomstenPerCategorie(transacties: Transactie[], categorieen: Categorie[], periode: string): CategorieUitgave[] {
  return groepeerPerCategorie(transacties, categorieen, periode, true)
}
