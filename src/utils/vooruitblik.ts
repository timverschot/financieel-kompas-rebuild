import type { TerugkerendePost, Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { inPeriode, type Periode } from './analyse'
import { vandaag } from './datum'
import { valtInMaand } from './vastelast'

// Rekenkern voor het blok "Vooruitblik & spaarquote" op de Analyse-pagina.
// Zuiver en los testbaar (geen datum/klok binnenin). Inkomsten en uitgaven worden
// — net als in het maandoverzicht (utils/overzicht.ts) — op REGELNIVEAU geteld via
// categorieBedragen, zodat een gesplitst kassaticket (bv. een positieve statiegeld-
// regel tussen de uitgaven) exact even zwaar meetelt als in de grafieken.

// Optelling van inkomsten- en uitgavenregels binnen een selectie van transacties.
// Uitgaven worden als positief getal (absolute waarde) teruggegeven.
function telInUit(transacties: Transactie[], hoort: (datum: string) => boolean): { inkomsten: number; uitgaven: number } {
  let inkomsten = 0
  let uitgaven = 0
  for (const t of transacties) {
    if (!hoort(t.datum)) continue
    for (const r of categorieBedragen(t)) {
      if (r.bedrag > 0) inkomsten += r.bedrag
      else if (r.bedrag < 0) uitgaven += -r.bedrag
    }
  }
  return { inkomsten, uitgaven }
}

// De spaarquote is het deel van je inkomsten dat je overhoudt: (inkomsten −
// uitgaven) / inkomsten. Overboekingen tussen eigen rekeningen tellen bewust niet
// mee (dat zijn geen inkomsten/uitgaven), net als op de rest van de Analyse-pagina.
export type Spaarquote = {
  inkomsten: number // centen, positief
  uitgaven: number // centen, positief (absoluut)
  saldo: number // inkomsten − uitgaven (kan negatief zijn)
  quote: number | null // percentage overgehouden; null als er geen inkomsten zijn
}

export function spaarquote(transacties: Transactie[], periode: Periode): Spaarquote {
  const { inkomsten, uitgaven } = telInUit(transacties, (d) => inPeriode(d, periode))
  const saldo = inkomsten - uitgaven
  const quote = inkomsten > 0 ? (saldo / inkomsten) * 100 : null
  return { inkomsten, uitgaven, saldo, quote }
}

// De transactie-id die het inboeken van een vaste last krijgt. MOET gelijk blijven
// aan wat App.boekTerugkerend genereert (`tk-<postId>-<maand>`), anders herkent de
// vooruitblik een al geboekte post niet als geboekt.
export function vasteLastTransactieId(postId: string, maand: string): string {
  return `tk-${postId}-${maand}`
}

// Vooruitblik voor één maand ('JJJJ-MM'): wat er in die maand al geboekt is, plus
// de vaste lasten die deze maand nog NIET ingeboekt zijn, samen tot een verwacht
// eindresultaat en een verwachte spaarquote.
export type Vooruitblik = {
  maand: string
  geboekt: { inkomsten: number; uitgaven: number }
  komend: { inkomsten: number; uitgaven: number } // dag nog niet voorbij
  achterstallig: { inkomsten: number; uitgaven: number } // dag voorbij, nog niet geboekt
  aantalKomend: number
  aantalAchterstallig: number
  /**
   * De id's van de posten die deze maand vervallen zijn maar nog niet geboekt.
   * Het belletje gebruikt ze om per post een "boek in"-knop te tonen: inboeken is
   * een maandelijkse handeling en mag geen navigatie naar een andere pagina kosten.
   */
  achterstalligeIds: string[]
  verwachteInkomsten: number
  verwachteUitgaven: number
  verwachtSaldo: number
  verwachteQuote: number | null
}

// Herkent een vaste last die de gebruiker ZELF als gewone transactie ingetikt
// heeft (dus niet via de knop "Boek in", die een vast id meegeeft).
//
// Waarom nodig: zonder deze herkenning telt zelf ingetikte huur dubbel — één keer
// bij "al geboekt" en nog eens bij "nog te komen". € 900 huur werd dan € 1.800
// verwachte uitgave.
//
// De regel is bewust STRENG. Een transactie moet in dezelfde maand vallen, op
// dezelfde rekening staan, exact hetzelfde bedrag hebben (zelfde teken), en — als
// de vaste last een categorie heeft — dezelfde categorie dragen. Bovendien:
// - gesplitste transacties (kassaticket met regels) tellen nooit mee: die zijn per
//   definitie een winkelbezoek, geen vaste last;
// - elke transactie kan hoogstens één vaste last afdekken, zodat twee posten van
//   hetzelfde bedrag niet allebei op dezelfde transactie leunen.
// De keuze bij twijfel is altijd: liever een vaste last één keer te weinig
// herkennen (ze blijft dan als "nog te komen" staan, wat hoogstens irritant is)
// dan een echte, aparte uitgave onterecht wegmoffelen (wat je te rooskleurig
// voorspelt).
function isMogelijkeBoeking(t: Transactie, p: TerugkerendePost, maand: string): boolean {
  if (!t.datum.startsWith(maand)) return false
  if (t.rekeningId !== p.rekeningId) return false
  if (t.bedrag !== p.bedrag) return false
  if (t.regels && t.regels.length > 0) return false
  if (p.categorieId && t.categorieId !== p.categorieId) return false
  return true
}

export function maandVooruitblik(
  transacties: Transactie[],
  alleposten: TerugkerendePost[],
  maand: string,
  vandaagISO: string = vandaag(),
): Vooruitblik {
  // Alleen de posten die déze maand vervallen. Een halfjaarlijkse verzekering is
  // in de vijf tussenliggende maanden geen "nog te komen" uitgave; zonder deze
  // filter zou ze de vooruitblik elke maand met haar volle bedrag verzwaren en
  // zou het belletje elke maand klagen dat ze niet geboekt is.
  const posten = alleposten.filter((p) => valtInMaand(p, maand))
  const geboekt = telInUit(transacties, (d) => d.startsWith(maand))

  // Ronde 1: de zekere herkenning op id ("Boek in"). Die krijgt voorrang, zodat
  // zo'n transactie niet eerst door een andere post opgesnoept wordt.
  const perId = new Map<string, Transactie>()
  for (const t of transacties) perId.set(t.id, t)
  const gebruikt = new Set<string>() // transactie-id's die al een vaste last afdekken
  const geboekteposten = new Set<string>() // post-id's die als geboekt gelden
  for (const p of posten) {
    const t = perId.get(vasteLastTransactieId(p.id, maand))
    if (t) {
      gebruikt.add(t.id)
      geboekteposten.add(p.id)
    }
  }

  // Ronde 2: de voorzichtige herkenning van handmatig ingetikte vaste lasten.
  for (const p of posten) {
    if (geboekteposten.has(p.id)) continue
    const treffer = transacties.find((t) => !gebruikt.has(t.id) && isMogelijkeBoeking(t, p, maand))
    if (treffer) {
      gebruikt.add(treffer.id)
      geboekteposten.add(p.id)
    }
  }

  // Is de dag van de maand al voorbij? Dan is een niet-geboekte post niet "nog te
  // komen" maar achterstallig. Voor een maand in het verleden is alles voorbij,
  // voor een maand in de toekomst nog niets. De dag van vandaag zelf telt nog als
  // "nog te komen" (de post kan vandaag nog geboekt worden).
  const huidigeMaand = vandaagISO.slice(0, 7)
  const huidigeDag = Number(vandaagISO.slice(8, 10))
  const isVoorbij = (dag: number): boolean => {
    if (maand < huidigeMaand) return true
    if (maand > huidigeMaand) return false
    return dag < huidigeDag
  }

  let komendeInkomsten = 0
  let komendeUitgaven = 0
  let aantalKomend = 0
  let achterstalligeInkomsten = 0
  let achterstalligeUitgaven = 0
  let aantalAchterstallig = 0
  const achterstalligeIds: string[] = []
  for (const p of posten) {
    if (geboekteposten.has(p.id)) continue
    if (isVoorbij(p.dag)) {
      aantalAchterstallig++
      achterstalligeIds.push(p.id)
      if (p.bedrag > 0) achterstalligeInkomsten += p.bedrag
      else if (p.bedrag < 0) achterstalligeUitgaven += -p.bedrag
    } else {
      aantalKomend++
      if (p.bedrag > 0) komendeInkomsten += p.bedrag
      else if (p.bedrag < 0) komendeUitgaven += -p.bedrag
    }
  }

  // Achterstallige posten tellen wél mee in de verwachting: ze zijn te laat, maar
  // het geld moet nog steeds komen of gaan.
  const verwachteInkomsten = geboekt.inkomsten + komendeInkomsten + achterstalligeInkomsten
  const verwachteUitgaven = geboekt.uitgaven + komendeUitgaven + achterstalligeUitgaven
  const verwachtSaldo = verwachteInkomsten - verwachteUitgaven
  const verwachteQuote = verwachteInkomsten > 0 ? (verwachtSaldo / verwachteInkomsten) * 100 : null

  return {
    maand,
    geboekt,
    komend: { inkomsten: komendeInkomsten, uitgaven: komendeUitgaven },
    achterstallig: { inkomsten: achterstalligeInkomsten, uitgaven: achterstalligeUitgaven },
    aantalKomend,
    aantalAchterstallig,
    achterstalligeIds,
    verwachteInkomsten,
    verwachteUitgaven,
    verwachtSaldo,
    verwachteQuote,
  }
}
