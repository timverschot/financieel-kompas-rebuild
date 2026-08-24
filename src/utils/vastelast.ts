import { FREQUENTIES, type Frequentie, type TerugkerendePost } from '../data/schema'

// De rekenkern voor vaste lasten met een andere termijn dan maandelijks.
//
// Waarom dit bestaat: een vaste last was tot ronde 23 altijd maandelijks. In de
// praktijk is dat vaak niet zo — verzekeringen, onroerende voorheffing en veel
// abonnementen zijn trimestrieel, halfjaarlijks of jaarlijks. Zolang de app dat
// niet wist, kon ze twee dingen niet: zeggen wélke maand zo'n kost valt, en het
// buffercijfer correct berekenen.
//
// Twee keuzes die je moet kennen:
//
//  1. **Het ritme telt vanaf de eerste betaling, niet vanaf het kalenderjaar.**
//     Een halfjaarlijkse post die op 5 augustus voor het eerst betaald wordt, valt
//     daarna op 5 februari en 5 augustus. Niet in januari en juli. Dat is hoe
//     contracten werkelijk lopen: de vervaldag hangt aan de startdatum van je
//     polis of abonnement, niet aan de kalender.
//
//  2. **Voor 'hoeveel kost mij dit per maand' rekenen we het bedrag om.** Een
//     jaarlijkse verzekering van € 1.200 is € 100 per maand. Dat genormaliseerde
//     bedrag is wat de buffer moet gebruiken; het volle bedrag is wat je in de
//     maand van de vervaldag effectief van je rekening ziet gaan. Die twee door
//     elkaar halen, geeft een cijfer dat er correct uitziet en het niet is.
//
// Zuiver en deterministisch: geen klok binnenin, de maand gaat er altijd in.

/** Het aantal maanden tussen twee betalingen, per frequentie. */
export const INTERVAL_MAANDEN: Record<Frequentie, number> = {
  maand: 1,
  kwartaal: 3,
  semester: 6,
  jaar: 12,
}

/**
 * Het woord dat achter een bedrag hoort: "per maand", "per kwartaal", ...
 *
 * ⚠ RONDE 65. Het scherm "Je situatie" splitste op `frequentie === 'jaar'` en gaf
 * alles wat níet 'jaar' was het woord "per maand" — óók een kwartaal- of
 * semesterpost. Dat is dezelfde factorfout die deze ronde wegneemt, alleen met een
 * andere factor. Eén tabel, en elke plek die een periode moet benoemen leest ervan.
 */
export const PERIODE_SLEUTELS: Record<Frequentie, string> = {
  maand: 'per maand',
  kwartaal: 'per kwartaal',
  semester: 'per half jaar',
  jaar: 'per jaar',
}

export { FREQUENTIES }
export type { Frequentie }

/** De frequentie van een post; ontbreekt ze, dan is de post maandelijks. */
export function frequentieVan(post: TerugkerendePost): Frequentie {
  return post.frequentie ?? 'maand'
}

/** Het aantal maanden tussen twee betalingen van deze post. */
export function intervalVan(post: TerugkerendePost): number {
  return INTERVAL_MAANDEN[frequentieVan(post)]
}

/** Het aantal maanden van maand a naar maand b ('JJJJ-MM'); negatief als b vroeger is. */
export function maandVerschil(a: string, b: string): number {
  const [ja, ma] = a.split('-').map(Number)
  const [jb, mb] = b.split('-').map(Number)
  return (jb - ja) * 12 + (mb - ma)
}

/**
 * Is deze post in deze maand ('JJJJ-MM') al gestopt?
 *
 * 'eindMaand' is de maand waarin de post NIET meer geldt; de laatste betaling is
 * dus de maand ervóór. Zonder eindmaand loopt de post gewoon door.
 */
export function isGestopt(post: TerugkerendePost, maand: string): boolean {
  return post.eindMaand !== undefined && maand >= post.eindMaand
}

/**
 * Is deze post in deze maand ('JJJJ-MM') nog NIET begonnen? (ronde 71)
 *
 * De tegenhanger van `isGestopt`, en ze bestond niet. Twee plekken rekenen bewust
 * buiten `valtInMaand` om — het buffercijfer en `gemiddeldPerMaand` — omdat ze juist
 * het OMGEREKENDE maandbedrag willen, ook in maanden waarin de post niet vervalt.
 * Allebei controleerden ze wél het einde en nooit het begin. Gevolg: een
 * halfjaarlijkse premie met "eerste betaling maart 2029" trok je buffer vandaag al
 * met € 100 per maand omlaag, voor een kost die nog niet bestaat.
 *
 * Tot ronde 70 was dat bijna onschuldig: de app zette de startmaand altijd op
 * volgende maand, dus de fout was hoogstens één maand groot. Sinds de gebruiker die
 * maand zelf kiest, kan ze jaren zijn.
 *
 * ⚠ DE INTERVALCONTROLE HOORT ERBIJ, en om precies dezelfde reden als in
 * `valtInMaand`: daar kort een maandelijkse post af vóór de startmaand bekeken wordt,
 * dus draagt een maandelijkse post haar startmaand vandaag als een dood veld. Zou
 * deze functie hem wél lezen, dan zouden de twee regels uiteenlopen — en dan telt een
 * post in het ene cijfer mee en in het andere niet.
 *
 * ⚠ EN DIT GELDT NIET VOOR "OPZIJ". Geld opzijzetten voor een kost die er nog niet
 * is, is precies wat je wil; dat is de voorbereiding. `plancijfers` houdt die tak dus
 * los.
 */
export function isNogNietBegonnen(post: TerugkerendePost, maand: string): boolean {
  if (post.startMaand === undefined) return false
  if (intervalVan(post) === 1) return false
  return maand < post.startMaand
}

/**
 * Valt deze post in deze maand ('JJJJ-MM')?
 *
 * Een maandelijkse post valt altijd. Een post met een langere termijn valt enkel
 * in de maanden die een veelvoud van het interval na de startmaand liggen, en
 * nooit vóór de startmaand — een contract dat in augustus begint, bestaat in juni
 * nog niet.
 *
 * De eindmaand-controle staat bewust VÓÓR de kortsluiting voor maandelijkse
 * posten. Anders zou een opgezegde huur of een gestopt abonnement — precies de
 * meest voorkomende gevallen — eeuwig blijven meetellen.
 */
export function valtInMaand(post: TerugkerendePost, maand: string): boolean {
  if (isGestopt(post, maand)) return false
  const interval = intervalVan(post)
  if (interval === 1) return true
  // Zonder startmaand kunnen we het ritme niet plaatsen. Dan is elke maand een
  // gok, en gokken hoort niet in een cijfer waar de gebruiker op rekent: we laten
  // de post dan als maandelijks gelden, precies zoals vóór deze uitbreiding.
  if (!post.startMaand) return true
  const verschil = maandVerschil(post.startMaand, maand)
  return verschil >= 0 && verschil % interval === 0
}

/**
 * Het bedrag omgerekend naar één maand, met hetzelfde teken als het origineel.
 * Voor het buffercijfer en voor "wat kost dit mij gemiddeld per maand".
 */
export function maandbedrag(post: TerugkerendePost): number {
  const interval = intervalVan(post)
  if (interval === 1) return post.bedrag
  // Naar nul afronden zou bij kleine bedragen centen laten verdwijnen; gewoon
  // afronden houdt de som over een jaar zo dicht mogelijk bij het echte bedrag.
  return Math.round(post.bedrag / interval)
}

/**
 * Hoeveel je deze maand voor deze post opzij hoort te zetten, als positief bedrag.
 * Nul wanneer de post maandelijks is (dan zet je niets opzij, je betaalt gewoon),
 * wanneer je niet gekozen hebt om op te bouwen, of wanneer het geen uitgave is.
 */
export function opzijPerMaand(post: TerugkerendePost): number {
  if (!post.opbouwen) return 0
  if (intervalVan(post) === 1) return 0
  if (post.bedrag >= 0) return 0
  return -maandbedrag(post)
}

/**
 * De eerstvolgende vervaldag vanaf een datum ('JJJJ-MM-DD'), of null wanneer die
 * niet te bepalen is. Voor een maandelijkse post is dat deze maand of de volgende;
 * voor de andere frequenties de eerstvolgende maand in het ritme.
 */
export function volgendeVervaldag(post: TerugkerendePost, vanafISO: string): string | null {
  // Een gestopte post heeft geen volgende keer meer. Zonder deze regel bleef het
  // scherm "volgende keer 5 september" tonen bij een abonnement dat in augustus
  // is opgezegd.
  if (post.eindMaand !== undefined && vanafISO.slice(0, 7) >= post.eindMaand) return null
  const dag = String(post.dag).padStart(2, '0')
  const vanafMaand = vanafISO.slice(0, 7)
  const vanafDag = Number(vanafISO.slice(8, 10))
  const interval = intervalVan(post)

  // De eerste kandidaat-maand: deze maand als de dag nog niet voorbij is.
  const beginOffset = post.dag >= vanafDag ? 0 : 1

  if (interval === 1 || !post.startMaand) {
    return naEinde(post, verschuif(vanafMaand, beginOffset), dag)
  }

  // Het contract is nog niet begonnen: de eerste betaling is de eerste vervaldag.
  const sindsStart = maandVerschil(post.startMaand, vanafMaand)
  if (sindsStart < 0) return naEinde(post, post.startMaand, dag)

  // Hoe ver zitten we in de lopende cyclus? Rest 0 = deze maand valt in het ritme.
  const rest = sindsStart % interval
  let kandidaat = rest === 0 ? vanafMaand : verschuif(vanafMaand, interval - rest)
  // Valt ze deze maand, maar is de dag al voorbij, dan is de volgende pas een
  // volledige cyclus later — niet volgende maand.
  if (kandidaat === vanafMaand && beginOffset === 1) kandidaat = verschuif(vanafMaand, interval)
  return naEinde(post, kandidaat, dag)
}

/**
 * Geeft de vervaldag terug, of null wanneer die maand al voorbij de eindmaand ligt.
 *
 * Zonder deze controle sprong een driemaandelijkse post die in september stopt
 * vrolijk door naar november: de controle bovenaan kijkt of je NU al gestopt bent,
 * niet of de volgende beurt nog binnen de looptijd valt.
 */
function naEinde(post: TerugkerendePost, maand: string, dag: string): string | null {
  if (post.eindMaand !== undefined && maand >= post.eindMaand) return null
  return `${maand}-${dag}`
}

/** Verschuift een maand ('JJJJ-MM') met een aantal maanden. */
export function verschuifMaand(maand: string, delta: number): string {
  return verschuif(maand, delta)
}

/** Verschuift een maand ('JJJJ-MM') met een aantal maanden. */
function verschuif(maand: string, delta: number): string {
  const [jaar, m] = maand.split('-').map(Number)
  const totaal = jaar * 12 + (m - 1) + delta
  const nieuwJaar = Math.floor(totaal / 12)
  const nieuweMaand = (totaal % 12) + 1
  return `${String(nieuwJaar).padStart(4, '0')}-${String(nieuweMaand).padStart(2, '0')}`
}

/**
 * De cijfers voor het plan van één maand.
 *
 * `vastDezeMaand` is wat er deze maand effectief van je rekening gaat: de posten
 * die déze maand vervallen, met hun volle bedrag. `opzij` is wat je voor later
 * hoort te reserveren: het maandelijkse deel van de posten die je wil opbouwen en
 * die deze maand niet vervallen. Die twee overlappen nooit, zodat je een
 * jaarrekening niet tegelijk betaalt én spaart.
 *
 * `gemiddeldPerMaand` is een ander soort getal: alle vaste uitgaven omgerekend
 * naar één maand. Het antwoord op "wat kosten mijn vaste lasten mij eigenlijk",
 * los van welke maand je bekijkt.
 *
 * ⚠ RONDE 74 — `opzijViaDoel`. Hangt er een spaardoel aan een vaste last, dan komt
 * het bedrag onder "Opzij voor later" uit dát doel in plaats van uit de kale deling
 * "jaarbedrag ÷ 12". Zie `opzijVolgensSpaardoelen` in utils/spaardoel.ts.
 *
 * ⚠ VERVANGEN, NIET WEGLATEN. De eerste opzet van deze ronde liet zo'n post gewoon
 * uit `opzij` vallen, in de veronderstelling dat het spaardoel de reservering elders
 * al meetelde. Dat doet het niet: `Spaardoel.maandbedrag` komt in geen enkele
 * rekenkern die Budget voedt, en een storting naar je spaarrekening is een
 * overboeking — die telt hier per definitie niet mee. `teVerdelen` zou dus te HOOG
 * gestaan hebben: de app zou zeggen dat je meer vrij hebt dan waar is.
 *
 * De kaart is OPTIONEEL en standaard leeg: elke bestaande aanroep gedraagt zich
 * daardoor precies zoals vóór deze ronde.
 */
export type Plancijfers = {
  vastDezeMaand: number // positief, centen
  vasteInkomsten: number // positief, centen — terugkerende inkomsten deze maand
  opzij: number // positief, centen
  gemiddeldPerMaand: number // positief, centen
}

export function plancijfers(
  posten: TerugkerendePost[],
  maand: string,
  opzijViaDoel: ReadonlyMap<string, number> = new Map(),
): Plancijfers {
  let vastDezeMaand = 0
  let vasteInkomsten = 0
  let opzij = 0
  let gemiddeldPerMaand = 0

  for (const p of posten) {
    // Een gestopte post telt nergens meer mee — ook niet in het gemiddelde en ook
    // niet in "opzij". Die twee lopen buiten valtInMaand om: het gemiddelde staat
    // vóór de controle, en een post die niet in deze maand valt landt automatisch
    // in de else-tak. Zonder deze regel zou een opgezegd abonnement eeuwig blijven
    // vragen om er geld voor opzij te zetten.
    if (isGestopt(p, maand)) continue
    // ⚠ RONDE 71. Het gemiddelde telt een post pas vanaf zijn eerste betaling. Het
    // stond vóór élke controle, dus een kost die pas over jaren begint zat er al in.
    // `opzij` hieronder blijft er BUITEN staan: daar hoort ze juist wél, want dat is
    // het geld dat je nú opzijzet om ze straks te kunnen betalen.
    if (p.bedrag < 0 && !isNogNietBegonnen(p, maand)) gemiddeldPerMaand += -maandbedrag(p)
    if (valtInMaand(p, maand)) {
      if (p.bedrag < 0) vastDezeMaand += -p.bedrag
      else if (p.bedrag > 0) vasteInkomsten += p.bedrag
    } else {
      // ⚠ Het BEDRAG kan uit een spaardoel komen, maar de post blijft meetellen — en
      // hij blijft ook gewoon in `gemiddeldPerMaand` en in `vastDezeMaand` staan.
      // Sparen verandert niets aan wat een kost je kost of wanneer hij van je rekening
      // gaat; het verandert alleen met welk bedrag je plan rekent.
      const viaDoel = opzijViaDoel.get(p.id)
      opzij += viaDoel !== undefined ? viaDoel : opzijPerMaand(p)
    }
  }

  return { vastDezeMaand, vasteInkomsten, opzij, gemiddeldPerMaand }
}
