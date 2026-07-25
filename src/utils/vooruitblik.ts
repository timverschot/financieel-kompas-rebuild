import type { TerugkerendePost, Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { inPeriode, type Periode } from './analyse'

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
  komend: { inkomsten: number; uitgaven: number }
  aantalKomend: number // aantal nog niet ingeboekte vaste lasten
  verwachteInkomsten: number
  verwachteUitgaven: number
  verwachtSaldo: number
  verwachteQuote: number | null
}

export function maandVooruitblik(
  transacties: Transactie[],
  posten: TerugkerendePost[],
  maand: string,
): Vooruitblik {
  const geboekt = telInUit(transacties, (d) => d.startsWith(maand))

  const bestaandeIds = new Set(transacties.map((t) => t.id))
  let komendeInkomsten = 0
  let komendeUitgaven = 0
  let aantalKomend = 0
  for (const p of posten) {
    if (bestaandeIds.has(vasteLastTransactieId(p.id, maand))) continue
    aantalKomend++
    if (p.bedrag > 0) komendeInkomsten += p.bedrag
    else if (p.bedrag < 0) komendeUitgaven += -p.bedrag
  }

  const verwachteInkomsten = geboekt.inkomsten + komendeInkomsten
  const verwachteUitgaven = geboekt.uitgaven + komendeUitgaven
  const verwachtSaldo = verwachteInkomsten - verwachteUitgaven
  const verwachteQuote = verwachteInkomsten > 0 ? (verwachtSaldo / verwachteInkomsten) * 100 : null

  return {
    maand,
    geboekt,
    komend: { inkomsten: komendeInkomsten, uitgaven: komendeUitgaven },
    aantalKomend,
    verwachteInkomsten,
    verwachteUitgaven,
    verwachtSaldo,
    verwachteQuote,
  }
}
