import type { TerugkerendePost, Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { inPeriode, type Periode } from './analyse'
import { vandaag } from './datum'
import { valtInMaand } from './vastelast'
import { percentageZinvol } from './verhouding'

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
  /** Percentage overgehouden; `null` wanneer er te weinig inkomsten zijn. Zie `heeftQuote`. */
  quote: number | null
}

/**
 * Is een spaarquote hier zinvol? (ronde 104)
 *
 * ⚠ DE VRAAG WAS `inkomsten > 0`, EN DAT VALT OM BIJ ÉÉN CENT. Deze som telt per REGEL —
 * zoals het hoort, want een gesplitst kassaticket telt overal per regel mee. Maar één regel
 * statiegeld van € 0,25 binnen een boodschappenticket van € 1.240 maakte die controle waar,
 * en dan stond er op het scherm **"−496000%"**, met een balk erbij en de zin
 * "€ -1.240,00 van € 0,25 inkomsten overgehouden".
 *
 * De grens zelf staat in `utils/verhouding.ts`, samen met de twee andere schermen die
 * dezelfde fout maakten. `PlanRegels` gebruikt dezelfde VERHOUDING, maar op een andere
 * noemer: daar gaat het om de vaste lasten van één maand, hier om alle uitgaven van de
 * gekozen periode.
 */
export function heeftQuote(inkomsten: number, uitgaven: number): boolean {
  // ⚠ RONDE 106 — EN ER MOET OOK IETS UITGEGEVEN ZIJN. Boek je op 1 augustus je loon en
  // verder nog niets, dan was de quote 100%: "je hield je hele loon over", op de dag dat de
  // maand begint. Het getal klopte met de gegevens en zei niets over je maand. Zolang er
  // niets uitgegeven is, is er geen quote — de bedragen eronder blijven wél staan.
  return uitgaven > 0 && percentageZinvol(inkomsten, uitgaven)
}

export function spaarquote(transacties: Transactie[], periode: Periode): Spaarquote {
  const { inkomsten, uitgaven } = telInUit(transacties, (d) => inPeriode(d, periode))
  const saldo = inkomsten - uitgaven
  const quote = heeftQuote(inkomsten, uitgaven) ? (saldo / inkomsten) * 100 : null
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
   * Hoeveel vaste posten vervallen er déze maand? (ronde 66, slotronde)
   *
   * ⚠ Nodig om een zin als "alle vaste lasten voor augustus zijn al ingeboekt" te
   * mogen zeggen. Die zin hing aan de TOTALE lijst posten, terwijl de tellers
   * hierboven alleen gaan over wat deze maand vervalt. Heb je enkel een jaarlijkse
   * verzekering die in december valt, dan stonden beide tellers in augustus op nul
   * en bevestigde de app iets wat ze niet gekeken had — er viel die maand gewoon
   * niets te boeken.
   */
  aantalDezeMaand: number
  /**
   * De id's van de posten die deze maand vervallen zijn maar nog niet geboekt.
   * Het belletje gebruikt ze om per post een "boek in"-knop te tonen: inboeken is
   * een maandelijkse handeling en mag geen navigatie naar een andere pagina kosten.
   */
  achterstalligeIds: string[]
  /**
   * De id's van de posten die deze maand nog moeten komen (de dag is nog niet
   * voorbij) en nog niet geboekt zijn.
   *
   * Ronde 40: deze lijst bestond niet, alleen het AANTAL. Daardoor kon de regel
   * "3 vaste lasten nog in te boeken deze maand" nergens heen — je las dat er
   * drie openstonden en moest zelf naar de Plan-pagina om uit te zoeken welke.
   */
  komendeIds: string[]
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
function isMogelijkeBoeking(t: Transactie, p: TerugkerendePost, maand: string, bekend: Set<string>): boolean {
  // ⚠ De MAAND eerst, en dan pas het antwoord (nakijkronde ronde 64). Andersom
  // dekte één gekoppelde augustusbetaling die vaste last in élke volgende maand af:
  // de vooruitblik telde de € 30 water nooit meer mee, het belletje zweeg voorgoed,
  // de maandafsluiting zei elke maand "niets open", en "Boek in" weigerde met "lijkt
  // al geboekt op 7 augustus". Een boeking is de betaling van HAAR maand.
  if (!t.datum.startsWith(maand)) return false
  // Heeft de gebruiker gezegd dat deze boeking die vaste last is, dan geldt dat —
  // welk bedrag er ook op staat. En omgekeerd: een boeking die aan een ándere post
  // hangt, dekt deze niet af. Zonder die tweede regel zou een gekoppelde betaling
  // van € 32 alsnog een tweede post van € 32 kunnen afdekken.
  //
  // ⚠ Een WEES telt niet mee: wijst het antwoord naar een post die niet meer
  // bestaat (je verwijderde de vaste last en maakte een nieuwe), dan gedraagt de
  // boeking zich weer als een gewone boeking. Anders was ze voor de hele app
  // onzichtbaar en maakte "Boek in" er zonder waarschuwing een tweede bij.
  if (t.vasteLastId !== undefined && bekend.has(t.vasteLastId)) return t.vasteLastId === p.id
  if (t.rekeningId !== p.rekeningId) return false
  if (t.bedrag !== p.bedrag) return false
  if (t.regels && t.regels.length > 0) return false
  // De categorie moet aan BEIDE kanten hetzelfde zijn — ook wanneer ze aan beide
  // kanten ontbreekt.
  //
  // Vroeger stond hier `if (p.categorieId && t.categorieId !== p.categorieId)`.
  // Had de post geen categorie, dan viel die voorwaarde helemaal weg en volstond
  // "zelfde maand, zelfde rekening, zelfde bedrag". Te weinig: koop je in dezelfde
  // maand sportkledij van exact hetzelfde bedrag als je jaarlijkse clubbijdrage,
  // dan dekte die aankoop de bijdrage af en hoorde je nooit meer dat ze nog
  // betaald moest worden — stil, en precies de kant op die de regel hierboven
  // verbiedt.
  //
  // Met deze vergelijking blijft een post zónder categorie gewoon herkenbaar aan
  // een boeking zónder categorie (het normale geval), maar dekt een boeking mét
  // categorie hem niet meer af.
  if ((t.categorieId ?? null) !== (p.categorieId ?? null)) return false
  return true
}

/**
 * Welke vaste posten gelden als GEBOEKT in deze maand?
 *
 * Twee manieren, in deze volgorde:
 *  1. de zekere herkenning op het vaste id dat "Boek in" gebruikt;
 *  2. de voorzichtige herkenning van een handmatig ingetikte boeking.
 *
 * Elke transactie kan hoogstens één post afdekken, zodat twee posten van hetzelfde
 * bedrag niet allebei op dezelfde boeking leunen.
 *
 * Waarom dit apart staat (ronde 35): de Plan-pagina bepaalde dit ZELF, en dan
 * alleen met manier 1. Tikte je je huur met de hand in, dan zei het belletje
 * "geboekt" terwijl de Plan-pagina er "Boek in" naast zette — één klik en je huur
 * stond er twee keer. Beide schermen halen het antwoord nu uit deze ene functie.
 */
export function geboekteVasteLasten(
  transacties: Transactie[],
  posten: TerugkerendePost[],
  maand: string,
  allePosten?: TerugkerendePost[],
): Set<string> {
  return new Set(geboekteVasteLastenMet(transacties, posten, maand, allePosten).keys())
}

/**
 * Staat er in deze maand al een boeking die déze vaste last afdekt? Zo ja, welke?
 *
 * Dit is de vraag die "Boek in" stelt vóór hij iets aanmaakt, en ze is bewust
 * strenger dan de vraag die de Plan-pagina stelt. Het verschil zit in wat er op het
 * spel staat: een post die ten onrechte als "nog te boeken" in de lijst blijft
 * staan, is een ergernis die je zelf ziet en kan rechtzetten. Een post die
 * dubbel geboekt wordt, is een bedrag dat stil van je overzicht af wijkt.
 *
 * Waarom niet gewoon de toewijzing van `geboekteVasteLastenMet` gebruiken: die
 * geeft elke boeking aan de EERSTE post die past. Heb je Netflix en Spotify allebei
 * op € 9,99 staan en tik je de Netflix-betaling zelf in, dan kan die betaling aan
 * Spotify toegewezen worden — en dan meent "Boek in" dat Netflix nog moet en maakt
 * hem bij. Je maand telt dan € 19,98 terwijl er € 9,99 van je rekening ging, en de
 * app meldt daarna dat alles keurig geboekt is.
 *
 * Deze functie kijkt daarom niet naar de toewijzing maar naar de feiten: alleen een
 * boeking die met een vast id aan een ándere post vasthangt, telt als "van iemand
 * anders". Al de rest wordt gewoon met deze post vergeleken.
 */
export function boekingDieDezePostAfdekt(
  transacties: Transactie[],
  posten: TerugkerendePost[],
  post: TerugkerendePost,
  maand: string,
): Transactie | undefined {
  const eigenVastId = vasteLastTransactieId(post.id, maand)
  const eigen = transacties.find((t) => t.id === eigenVastId)
  if (eigen) return eigen
  // De vaste id's van de ándere posten: die boekingen horen aantoonbaar bij hen.
  // Bewust ALLE posten, ook die deze maand niet vervallen: hun oude boeking hoort
  // ook dan bij hen, en zou anders een post van hetzelfde bedrag kunnen blokkeren.
  const vanIemandAnders = new Set(
    posten.filter((p) => p.id !== post.id).map((p) => vasteLastTransactieId(p.id, maand)),
  )
  const bekend = new Set(posten.map((p) => p.id))
  return transacties.find((t) => !vanIemandAnders.has(t.id) && lijktOpDezeBetaling(t, post, maand, bekend))
}

/**
 * Ruimer dan `isMogelijkeBoeking`: zelfde maand, zelfde rekening, zelfde bedrag,
 * geen gesplitst ticket — en de categorie doet er NIET toe.
 *
 * Precies dat verschil is de reden dat dit vangnet bestaat. `isMogelijkeBoeking` is
 * streng over de categorie, en terecht: zij bepaalt of een post uit de lijst "nog
 * te boeken" verdwijnt, en daar is het veiliger om er één te veel te tonen. Maar
 * hier gaat het om de omgekeerde vraag — mogen we er een tweede bijmaken? — en dan
 * is elke twijfel een reden om het níét te doen.
 *
 * Zonder dit onderscheid glipte het gevaarlijkste geval er gewoon doorheen: je huur
 * van € 900 staat als post zónder categorie, je tikt de betaling zelf in mét
 * categorie "Wonen", en dan zag geen van beide functies een verband. De app zei
 * "nog niet ingeboekt", je klikte "Boek in", en je maand telde € 1.800 uitgaven
 * terwijl er € 900 van je rekening ging.
 */
function lijktOpDezeBetaling(t: Transactie, p: TerugkerendePost, maand: string, bekend: Set<string>): boolean {
  if (!t.datum.startsWith(maand)) return false
  // Ook hier telt een uitgesproken antwoord, en ook hier telt een wees niet mee
  // (ronde 64 en haar nakijkronde).
  if (t.vasteLastId !== undefined && bekend.has(t.vasteLastId)) return t.vasteLastId === p.id
  if (t.rekeningId !== p.rekeningId) return false
  if (t.bedrag !== p.bedrag) return false
  if (t.regels && t.regels.length > 0) return false
  return true
}

/** Dezelfde toewijzing als `geboekteVasteLasten`, maar mét de boeking erbij. */
export function geboekteVasteLastenMet(
  transacties: Transactie[],
  posten: TerugkerendePost[],
  maand: string,
  /**
   * ⚠ ÁLLE posten, ook die niet in `posten` staan (tweede nakijkronde ronde 64).
   *
   * Waarvoor: `bekend` bepaalt of een koppeling naar een bestaande post wijst dan
   * wel een wees is. De aanroepers geven vaak een GEFILTERDE lijst mee — alleen wat
   * deze maand vervalt, of alleen de uitgaven. Bouwden we `bekend` daaruit, dan gold
   * een geldige koppeling naar een post die toevallig buiten dat filter viel als een
   * wees, en dan dekte die boeking ineens een ÁNDERE post af. Bewezen geval: een
   * opgezegde Fitness met een gekoppelde betaling zette de nog openstaande Water op
   * "Geboekt ✓", waarna het belletje en de maandafsluiting er allebei over zwegen.
   *
   * Ontbreekt dit, dan valt de app terug op `posten` — het gedrag van vóór deze
   * reparatie, en veilig zolang de aanroeper niet filtert.
   */
  allePosten?: TerugkerendePost[],
): Map<string, Transactie> {
  const perId = new Map<string, Transactie>()
  for (const t of transacties) perId.set(t.id, t)
  const bekend = new Set((allePosten ?? posten).map((p) => p.id))
  const gebruikt = new Set<string>() // transactie-id's die al een vaste last afdekken
  const geboekt = new Map<string, Transactie>() // post-id → de boeking die hem afdekt

  for (const p of posten) {
    const t = perId.get(vasteLastTransactieId(p.id, maand))
    if (t) {
      gebruikt.add(t.id)
      geboekt.set(p.id, t)
    }
  }
  for (const p of posten) {
    if (geboekt.has(p.id)) continue
    const treffer = transacties.find((t) => !gebruikt.has(t.id) && isMogelijkeBoeking(t, p, maand, bekend))
    if (treffer) {
      gebruikt.add(treffer.id)
      geboekt.set(p.id, treffer)
    }
  }
  return geboekt
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

  // Welke posten al geboekt zijn — dezelfde bepaling als op de Plan-pagina.
  const geboekteposten = geboekteVasteLasten(transacties, posten, maand, alleposten)

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
  const komendeIds: string[] = []
  for (const p of posten) {
    if (geboekteposten.has(p.id)) continue
    if (isVoorbij(p.dag)) {
      aantalAchterstallig++
      achterstalligeIds.push(p.id)
      if (p.bedrag > 0) achterstalligeInkomsten += p.bedrag
      else if (p.bedrag < 0) achterstalligeUitgaven += -p.bedrag
    } else {
      aantalKomend++
      komendeIds.push(p.id)
      if (p.bedrag > 0) komendeInkomsten += p.bedrag
      else if (p.bedrag < 0) komendeUitgaven += -p.bedrag
    }
  }

  // Achterstallige posten tellen wél mee in de verwachting: ze zijn te laat, maar
  // het geld moet nog steeds komen of gaan.
  const verwachteInkomsten = geboekt.inkomsten + komendeInkomsten + achterstalligeInkomsten
  const verwachteUitgaven = geboekt.uitgaven + komendeUitgaven + achterstalligeUitgaven
  const verwachtSaldo = verwachteInkomsten - verwachteUitgaven
  // Dezelfde ondergrens als bij `spaarquote` hierboven, en om dezelfde reden.
  const verwachteQuote = heeftQuote(verwachteInkomsten, verwachteUitgaven)
    ? (verwachtSaldo / verwachteInkomsten) * 100
    : null

  return {
    maand,
    geboekt,
    komend: { inkomsten: komendeInkomsten, uitgaven: komendeUitgaven },
    achterstallig: { inkomsten: achterstalligeInkomsten, uitgaven: achterstalligeUitgaven },
    aantalKomend,
    aantalAchterstallig,
    aantalDezeMaand: posten.length,
    achterstalligeIds,
    komendeIds,
    verwachteInkomsten,
    verwachteUitgaven,
    verwachtSaldo,
    verwachteQuote,
  }
}
