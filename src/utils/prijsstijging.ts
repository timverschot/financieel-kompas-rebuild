import type { TerugkerendePost, Transactie } from '../data/schema'
import { handelaarNaam, handelaarSleutel } from './handelaar'
import { intervalVan, isGestopt } from './vastelast'

// Prijsstijgingen opsporen (ronde 43, deel 2).
//
// WAARVOOR. "Je vaste lasten stegen dit jaar met € 38 per maand. Netflix ging in
// maart van € 11,99 naar € 13,99, je autoverzekering in januari van € 62 naar € 71."
// Niemand merkt zoiets op: het gaat om enkele euro's per keer, verspreid over het
// jaar, op tien verschillende afschriften. Alle gegevens ervoor staan al in je
// boekingen — dezelfde handelaar, een terugkerend bedrag dat verandert.
//
// WAAROP WE KIJKEN. Twee bronnen, met een verschillende zekerheid:
//
//  1. Je VASTE LASTEN. Je hebt de app zelf verteld dat dit een vast bedrag is, dus
//     een afwijking is bijna altijd echt. Bonus: `isMogelijkeBoeking` in
//     `vooruitblik.ts` herkent zo'n betaling níet meer als afdekking van de post
//     (die eist een exact gelijk bedrag), dus je zag het al indirect — als een vaste
//     last die "nog niet ingeboekt" leek.
//  2. HANDELAARS DIE ELKE MAAND TERUGKOMEN, ook zonder dat je ze als vaste last
//     hebt ingevoerd. Zo vindt de app het abonnement dat je vergeten was. Wel met
//     strengere eisen, want een supermarkt kost elke keer wat anders — en een lijst
//     vol vals alarm is erger dan geen lijst.
//
// WAT ZE NIET DOET: ze verandert niets aan je gegevens en ze past geen vaste last
// aan. Ze vertelt wat ze ziet; wat je ermee doet, beslis jij.
//
// Zuiver en deterministisch: "vandaag" komt altijd van buiten.

/**
 * Hoeveel betalingen een handelaar minstens moet hebben om mee te tellen.
 *
 * Zes, en in zes VERSCHILLENDE maanden. Met vier glipte een supermarkt erdoor waar
 * je toevallig vier maanden na elkaar één keer kwam met twee keer bijna hetzelfde
 * bedrag — en dan meldt de app een prijsstijging die nooit bestaan heeft.
 */
export const MIN_BETALINGEN = 6

/**
 * Hoeveel betalingen per maand een abonnement hoogstens heeft.
 *
 * Een supermarkt bezoek je vier keer per maand met vier verschillende bedragen; die
 * hoort hier niet in. Een beetje speling omdat een afschrijving soms net over een
 * maandgrens valt en er dan twee in één maand staan.
 */
const MAX_PER_MAAND = 1.4

/**
 * Hoeveel twee bedragen mogen verschillen en toch "hetzelfde" zijn.
 *
 * Zonder deze marge is één cent wisselkoersverschil al een prijsstijging. 1 % van het
 * bedrag, met een bodem van 25 cent voor kleine abonnementen.
 */
function zelfdeBedrag(a: number, b: number): boolean {
  const marge = Math.max(25, Math.round(Math.max(a, b) * 0.01))
  return Math.abs(a - b) <= marge
}

/**
 * Vanaf welk verschil we het een prijswijziging noemen.
 *
 * Minstens één euro én minstens 3 %. Een abonnement van € 4 dat € 5 wordt is 25 %
 * duurder en hoort erbij; een energiefactuur die van € 210 naar € 211 gaat, is ruis.
 */
function isEchteWijziging(oud: number, nieuw: number): boolean {
  const verschil = Math.abs(nieuw - oud)
  return verschil >= 100 && verschil >= oud * 0.03
}

export type Zekerheid = 'hoog' | 'gemiddeld'

export type Prijswijziging = {
  /** De genormaliseerde handelaarsnaam; tegelijk een stabiele sleutel voor React. */
  sleutel: string
  /** Wat er op het scherm hoort te staan: de omschrijving zoals jij ze kent. */
  naam: string
  /** Komt dit van een vaste last die je zelf invoerde, of van een vaste handelaar? */
  bron: 'vastelast' | 'handelaar'
  /** Het bedrag per betaling vóór en ná de wijziging, positief in centen. */
  oudBedrag: number
  nieuwBedrag: number
  /** Positief = duurder geworden. */
  verschil: number
  /** Datzelfde verschil omgerekend naar per maand (een jaarpremie telt door twaalf). */
  verschilPerMaand: number
  /** De eerste boeking met het nieuwe bedrag. */
  sindsDatum: string
  /** Hoeveel betalingen er aan het oude en aan het nieuwe bedrag zijn. */
  aantalOud: number
  aantalNieuw: number
  zekerheid: Zekerheid
  /** De id van de terugkerende post, wanneer die er is. */
  postId?: string
}

export type Prijsbeeld = {
  /** Alles wat veranderd is, duurste stijging eerst. */
  wijzigingen: Prijswijziging[]
  /** Wat de stijgingen samen per maand kosten, in centen. Alleen de duurdere. */
  duurderPerMaand: number
  /** Wat de dalingen samen per maand opleveren, positief in centen. */
  goedkoperPerMaand: number
  /** Duurder min goedkoper: wat je er netto per maand op achteruit gaat. */
  nettoPerMaand: number
}

type Betaling = { datum: string; bedrag: number }

/** Eén handelaar met al zijn betalingen, oudste eerst. */
type Groep = {
  sleutel: string
  naam: string
  /** De datum die bij `naam` hoort, zodat de recentste omschrijving wint. */
  naamDatum: string
  betalingen: Betaling[]
  maanden: Set<string>
}

/**
 * De betalingen per handelaar.
 *
 * Alleen UITGAVEN, en alleen niet-gesplitste boekingen: een kassaticket dat over
 * vier categorieën verdeeld is, heeft geen "prijs" die je over de tijd kan volgen.
 */
function groepeer(transacties: Transactie[]): Map<string, Groep> {
  const groepen = new Map<string, Groep>()
  for (const t of transacties) {
    if (t.bedrag >= 0) continue
    if (t.regels && t.regels.length > 0) continue
    const sleutel = handelaarSleutel(t.omschrijving)
    if (sleutel === '') continue
    const groep = groepen.get(sleutel) ?? {
      sleutel,
      naam: handelaarNaam(t.omschrijving) || t.omschrijving.trim(),
      naamDatum: '',
      betalingen: [],
      maanden: new Set<string>(),
    }
    groep.betalingen.push({ datum: t.datum, bedrag: -t.bedrag })
    groep.maanden.add(t.datum.slice(0, 7))
    // De recentste omschrijving wint als weergavenaam, mét de opschoning: een rij
    // die "BETALING MAESTRO 6703 NETFLIX.COM 05/07 REF 9000006" heet, herken je
    // niet als Netflix.
    if (t.datum >= groep.naamDatum) {
      groep.naam = handelaarNaam(t.omschrijving) || t.omschrijving.trim()
      groep.naamDatum = t.datum
    }
    groepen.set(sleutel, groep)
  }
  for (const groep of groepen.values()) {
    groep.betalingen.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0))
  }
  return groepen
}

/**
 * Om de hoeveel maanden deze handelaar betaald wordt, uit de gegevens zelf.
 *
 * De mediaan van de gaten tussen twee betalingen. Waarom uit de GEGEVENS en niet uit
 * de frequentie van een vaste last: een kwartaalabonnement dat je nooit als vaste
 * last invoerde, telde anders drie keer te zwaar mee in het totaal per maand — en een
 * post die "kwartaal" heet maar maandelijks geboekt wordt, drie keer te licht.
 */
function cadansInMaanden(betalingen: Betaling[]): number {
  if (betalingen.length < 3) return 1
  const gaten: number[] = []
  for (let i = 1; i < betalingen.length; i++) {
    const [j1, m1] = betalingen[i - 1].datum.split('-').map(Number)
    const [j2, m2] = betalingen[i].datum.split('-').map(Number)
    gaten.push((j2 - j1) * 12 + (m2 - m1))
  }
  gaten.sort((a, b) => a - b)
  const midden = gaten[Math.floor(gaten.length / 2)]
  return Math.max(1, midden)
}

/**
 * De laatste prijssprong in een reeks betalingen, of null.
 *
 * Van achter naar voor: hoeveel betalingen staan er aan het huidige bedrag, en welk
 * bedrag stond eraan vóór die sprong? Zo vindt ze de LAATSTE wijziging, ook wanneer
 * er dit jaar twee geweest zijn — dat is het bedrag dat je vandaag betaalt.
 */
function vindSprong(
  betalingen: Betaling[],
): { oud: number; nieuw: number; sinds: string; aantalOud: number; aantalNieuw: number } | null {
  if (betalingen.length < 2) return null
  const nieuw = betalingen[betalingen.length - 1].bedrag

  let i = betalingen.length - 1
  while (i >= 0 && zelfdeBedrag(betalingen[i].bedrag, nieuw)) i--
  if (i < 0) return null // nooit veranderd

  const aantalNieuw = betalingen.length - 1 - i
  const sinds = betalingen[i + 1].datum
  const oud = betalingen[i].bedrag

  let j = i
  while (j >= 0 && zelfdeBedrag(betalingen[j].bedrag, oud)) j--
  const aantalOud = i - j

  return { oud, nieuw, sinds, aantalOud, aantalNieuw }
}

export type PrijsbeeldInvoer = {
  transacties: Transactie[]
  terugkerendePosten: TerugkerendePost[]
  /** 'JJJJ-MM-DD'. Alleen boekingen tot en met vandaag tellen mee. */
  vandaagISO: string
  /** Hoeveel maanden er hoogstens teruggekeken wordt. */
  maanden?: number
}

/** De eerste dag van de maand 'n' maanden vóór 'vandaag'. */
function grensDatum(vandaagISO: string, maanden: number): string {
  const [jaar, maand] = vandaagISO.split('-').map(Number)
  const totaal = jaar * 12 + (maand - 1) - (maanden - 1)
  return `${String(Math.floor(totaal / 12)).padStart(4, '0')}-${String((totaal % 12) + 1).padStart(2, '0')}-01`
}

/**
 * Wat er duurder (of goedkoper) geworden is.
 *
 * Kijkt standaard achttien maanden terug: genoeg om een jaarpremie twee keer te zien,
 * en kort genoeg dat een prijs van drie jaar geleden niet als "de oude prijs" geldt.
 */
export function bouwPrijsbeeld(invoer: PrijsbeeldInvoer): Prijsbeeld {
  const maanden = invoer.maanden ?? 18
  const vanaf = grensDatum(invoer.vandaagISO, maanden)
  const binnenBereik = invoer.transacties.filter((t) => t.datum >= vanaf && t.datum <= invoer.vandaagISO)

  // De vaste lasten op hun genormaliseerde naam, zodat een groep kan weten dat ze er
  // een is. Een post zonder herkenbare naam slaan we over.
  const posten = new Map<string, TerugkerendePost>()
  const dubbel = new Set<string>()
  for (const p of invoer.terugkerendePosten) {
    if (p.bedrag >= 0) continue
    // Een opgezegde vaste last hoeft geen advies meer: die betaal je niet meer.
    if (isGestopt(p, invoer.vandaagISO.slice(0, 7))) continue
    const sleutel = handelaarSleutel(p.omschrijving)
    if (sleutel === '') continue
    if (posten.has(sleutel)) dubbel.add(sleutel)
    posten.set(sleutel, p)
  }

  const wijzigingen: Prijswijziging[] = []
  for (const groep of groepeer(binnenBereik).values()) {
    // Twee vaste lasten die na het opschonen dezelfde naam hebben ("Turnles Kind 1"
    // en "Turnles Kind 2" zonder de cijfers) horen niet op één hoop: dan lijkt het
    // verschil tussen die twee een prijsstijging. Bij twijfel: zwijgen.
    if (dubbel.has(groep.sleutel)) continue
    const post = posten.get(groep.sleutel)
    const isVasteLast = post !== undefined

    // De cadans. Een vaste last hoeft die toets niet te doorstaan: je hebt de app
    // zelf verteld dat dit elke maand (of elk kwartaal, of elk jaar) terugkomt.
    if (!isVasteLast) {
      if (groep.betalingen.length < MIN_BETALINGEN) continue
      if (groep.maanden.size < MIN_BETALINGEN) continue
      if (groep.betalingen.length / groep.maanden.size > MAX_PER_MAAND) continue
    } else if (groep.betalingen.length < 3) {
      continue
    }

    const sprong = vindSprong(groep.betalingen)
    if (!sprong) continue
    if (!isEchteWijziging(sprong.oud, sprong.nieuw)) continue
    // Eén betaling aan één kant is geen prijs, dat is een uitschieter. Zonder de
    // tweede eis werd een jaarafrekening van € 480 na zes voorschotten van € 150
    // gemeld als "€ 330 per maand duurder" — precies het vals alarm dat de hele
    // lijst onbruikbaar maakt.
    if (sprong.aantalOud < 2 || sprong.aantalNieuw < 2) continue

    const verschil = sprong.nieuw - sprong.oud
    // Een jaarpremie die € 60 duurder wordt, kost je € 5 per maand. Zonder deze
    // omrekening telt ze twaalf keer te zwaar mee in het totaal. De cadans komt uit
    // de gegevens; alleen bij te weinig betalingen valt ze terug op wat je bij de
    // vaste last hebt ingevuld.
    const uitGegevens = cadansInMaanden(groep.betalingen)
    const perInterval = groep.betalingen.length >= 3 ? uitGegevens : post ? intervalVan(post) : 1
    const verschilPerMaand = Math.round(verschil / perInterval)

    wijzigingen.push({
      sleutel: groep.sleutel,
      naam: isVasteLast && post ? post.omschrijving : groep.naam,
      bron: isVasteLast ? 'vastelast' : 'handelaar',
      oudBedrag: sprong.oud,
      nieuwBedrag: sprong.nieuw,
      verschil,
      verschilPerMaand,
      sindsDatum: sprong.sinds,
      aantalOud: sprong.aantalOud,
      aantalNieuw: sprong.aantalNieuw,
      // Twee betalingen aan het nieuwe bedrag is het minimum om het te melden; drie
      // (of een vaste last, waar het bedrag afgesproken is) maakt het zeker.
      zekerheid: isVasteLast || sprong.aantalNieuw >= 3 ? 'hoog' : 'gemiddeld',
      ...(post ? { postId: post.id } : {}),
    })
  }

  wijzigingen.sort((a, b) => Math.abs(b.verschilPerMaand) - Math.abs(a.verschilPerMaand))

  const duurderPerMaand = wijzigingen.reduce((s, w) => (w.verschil > 0 ? s + w.verschilPerMaand : s), 0)
  const goedkoperPerMaand = wijzigingen.reduce((s, w) => (w.verschil < 0 ? s - w.verschilPerMaand : s), 0)

  return {
    wijzigingen,
    duurderPerMaand,
    goedkoperPerMaand,
    nettoPerMaand: duurderPerMaand - goedkoperPerMaand,
  }
}

/**
 * Klopt het bedrag van een vaste last nog met wat je betaalt?
 *
 * Aparte vraag, want ze vraagt om een andere handeling: hier hoef je niet te
 * onderhandelen met je leverancier, maar je vaste last bij te werken. Zolang dat niet
 * gebeurt, blijft de app rekenen met een bedrag dat niet meer bestaat — in je
 * vooruitblik, je buffer en je "nog niet ingeboekt"-meldingen.
 */
export function verouderdeVasteLasten(beeld: Prijsbeeld, posten: TerugkerendePost[]): Prijswijziging[] {
  return beeld.wijzigingen.filter((w) => {
    if (w.postId === undefined) return false
    const post = posten.find((p) => p.id === w.postId)
    if (!post) return false
    return !zelfdeBedrag(Math.abs(post.bedrag), w.nieuwBedrag)
  })
}
