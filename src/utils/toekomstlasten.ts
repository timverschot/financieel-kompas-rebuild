import type { TerugkerendePost } from '../data/schema'
import { intervalVan, isGestopt, valtInMaand, verschuifMaand } from './vastelast'

// "In welke maand komt de klap?" (ronde 72)
//
// WAAROM DIT BESTAAT. De app keek precies één maand vooruit. `maandVooruitblik`
// telt op wat er déze maand nog moet vallen; blader je bovenaan naar een andere
// maand, dan verschuift die kaart mee — maar je ziet altijd één maand tegelijk.
// Sinds ronde 70 kiest de gebruiker zelf of een kost per kwartaal, per semester of
// per jaar terugkomt, en sinds ronde 71 ook vanaf welke maand. Daarmee zitten er
// pieken in het jaar die de app perfect kán uitrekenen en nergens liet zien.
//
// Deze module beantwoordt één vraag en niet meer: **wat gaat er de komende maanden
// van mijn rekening aan vaste lasten?** Bewust NIET erbij:
//  - je inkomsten (dit is geen saldovoorspelling);
//  - je losse uitgaven (boodschappen, tanken — die kent de app niet vooruit);
//  - je leningen en je onderhoudsbijdrage (die tellen elk op hun eigen manier;
//    ze hier bijmengen zou dubbeltellingen opleveren die niemand nog naleest).
//
// DE BEDRAGEN ZIJN VOLLE BEDRAGEN, niet omgerekend. Een jaarpremie van € 1.200
// staat met € 1.200 in háár maand en met niets in de elf andere. Dat is precies het
// tegenovergestelde van wat `maandbedrag()` doet, en het is met opzet: `maandbedrag`
// beantwoordt "wat kost mij dit gemiddeld", deze module "wanneer moet ik het
// betalen". Die twee door elkaar halen geeft een cijfer dat er juist uitziet en het
// niet is (zie de waarschuwing bovenaan utils/vastelast.ts).
//
// Zuiver en deterministisch: geen klok binnenin, de beginmaand gaat er altijd in.

/** Hoeveel maanden er in één beeld staan. Eén getal, ook in de teksten gebruikt. */
export const VENSTER_MAANDEN = 12

/** Wat er in één maand aan vaste lasten vervalt. */
export type Toekomstmaand = {
  /** 'JJJJ-MM' */
  maand: string
  /** Positief, in centen. Nul wanneer er die maand niets vervalt. */
  bedrag: number
  /** De id's van de posten die deze maand vervallen, in de volgorde van de invoer. */
  postIds: string[]
}

/**
 * Kan de app deze post in de tijd plaatsen?
 *
 * ⚠ DIT IS GEEN OVERBODIGE CONTROLE. `valtInMaand` geeft `true` terug voor élke
 * maand wanneer een niet-maandelijkse post geen startmaand heeft — een bewuste
 * terugval daar, zodat zo'n post zich gedraagt als vóór de frequenties bestonden.
 * Voor een grafiek van volle bedragen is diezelfde terugval rampzalig: een
 * jaarpremie van € 1.200 zou dan twaalf keer € 1.200 tekenen, dus € 14.400 in plaats
 * van € 1.200. Twaalf keer te hoog, en niets dat het verraadt.
 *
 * De app schrijft zo'n post vandaag niet meer weg (beide formulieren vullen de
 * startmaand in), maar een ouder logboekbestand van een ander toestel kan er nog een
 * dragen. Die posten blijven daarom buiten de grafiek, en het scherm zegt dat.
 */
export function isPlaatsbaar(post: TerugkerendePost): boolean {
  // ⚠ `Boolean(...)` en niet `!== undefined` (doorlichting ronde 72). `valtInMaand`
  // valt terug bij een LEGE tekst (`if (!post.startMaand)`), niet bij `undefined`.
  // Zouden de twee uiteenlopen, dan gold een post met `startMaand: ''` hier als
  // plaatsbaar en daar als ritmeloos — en dan tekende de grafiek een jaarpremie van
  // € 1.200 twaalf keer voluit: € 14.400. Precies de fout die deze functie moet
  // voorkomen, in de functie zelf.
  //
  // Het schema laat een lege tekst niet door (`/^\d{4}-\d{2}$/`), dus dit is geen
  // levend defect maar een dichtgetimmerd verschil: twee functies die dezelfde vraag
  // beantwoorden, horen hem niet elk op hun eigen manier te stellen.
  return intervalVan(post) === 1 || Boolean(post.startMaand)
}

/** De uitgaveposten die in deze grafiek horen. Inkomsten blijven erbuiten. */
function lastenVan(posten: TerugkerendePost[]): TerugkerendePost[] {
  return posten.filter((p) => p.bedrag < 0 && isPlaatsbaar(p))
}

/**
 * De uitgaveposten die de app níét in de tijd kan plaatsen, en die dus buiten de
 * grafiek vallen. Het scherm benoemt ze; stil weglaten zou een te laag totaal geven.
 */
export function onplaatsbareLasten(posten: TerugkerendePost[], vanafMaand: string): TerugkerendePost[] {
  return posten.filter((p) => p.bedrag < 0 && !isPlaatsbaar(p) && !isGestopt(p, vanafMaand))
}

/**
 * Wat er de komende `aantal` maanden aan vaste lasten vervalt, oudste eerst.
 *
 * De reeks is altijd `aantal` lang, ook wanneer er in een maand niets valt: een
 * lege maand is informatie ("hier is het rustig"), geen ontbrekende rij.
 */
export function toekomstlasten(
  posten: TerugkerendePost[],
  vanafMaand: string,
  aantal: number = VENSTER_MAANDEN,
): Toekomstmaand[] {
  const lasten = lastenVan(posten)
  const reeks: Toekomstmaand[] = []
  for (let i = 0; i < aantal; i++) {
    const maand = verschuifMaand(vanafMaand, i)
    let bedrag = 0
    const postIds: string[] = []
    for (const p of lasten) {
      if (!valtInMaand(p, maand)) continue
      bedrag += -p.bedrag
      postIds.push(p.id)
    }
    reeks.push({ maand, bedrag, postIds })
  }
  return reeks
}

/**
 * ÁLLE maanden met het hoogste bedrag, oudste eerst. Leeg wanneer er in de hele
 * reeks niets valt.
 *
 * ⚠ MEERVOUD, EN DAT IS DE HELE REDEN DAT DEZE FUNCTIE ZO HEET (doorlichting ronde
 * 72). Ze gaf eerst één maand terug, de vroegste bij een gelijkstand, en het scherm
 * zei "je zwaarste maand is september". Maar een gelijkstand is bij deze grafiek
 * niet de uitzondering, het is de normale vorm: een halfjaarlijkse premie geeft twee
 * even zware maanden, een kwartaalpost vier, een post zonder pieken twaalf. Wie zijn
 * geld klaarzette voor september liep in maart tegen exact hetzelfde bedrag aan,
 * zonder dat de app het ooit genoemd had.
 */
/**
 * Heeft de widget op het Overzicht iets te tonen? (ronde 90)
 *
 * ⚠ HIER EN NIET TWEE KEER. `ToekomstlastenWidget` bepaalde dit zelf, in de component:
 * `if (totaal === 0 && ontbreken.length === 0) return null`. Ronde 90 zet een chip boven
 * die kaart, en een chip die er staat terwijl de kaart eronder zwijgt is een schakelaar
 * die niets lijkt te doen. De chiprij en de kaart moeten dus DEZELFDE vraag stellen —
 * huisregel sinds ronde 81, waar die twee anders uit elkaar zouden lopen bij de eerste
 * volgende aanpassing.
 */
export function heeftToekomstlasten(posten: TerugkerendePost[], beginMaand: string): boolean {
  const totaal = toekomstlasten(posten, beginMaand).reduce((som, m) => som + m.bedrag, 0)
  return totaal !== 0 || onplaatsbareLasten(posten, beginMaand).length > 0
}

export function zwaarsteMaanden(reeks: Toekomstmaand[]): Toekomstmaand[] {
  let hoogste = 0
  for (const m of reeks) if (m.bedrag > hoogste) hoogste = m.bedrag
  if (hoogste <= 0) return []
  return reeks.filter((m) => m.bedrag === hoogste)
}

/**
 * Waarom houdt het vooruitblikken op?
 *
 * ⚠ TWEE HEEL VERSCHILLENDE ANTWOORDEN, en het scherm zei er maar één (doorlichting
 * ronde 72). Loopt er iets door, dan herhaalt elk jaar zich vanaf de horizon en valt
 * er niets nieuws meer te zien. Maar houdt ÁLLES een keer op, dan is het omgekeerde
 * waar: verder vooruit staat er helemaal niets meer. De zin "vanaf hier herhaalt elk
 * jaar zich" stond dan onder vijf staven die zichtbaar op nul stonden.
 */
export type Slotreden = 'herhaalt' | 'stopt'

export function slotreden(posten: TerugkerendePost[], vanafMaand: string): Slotreden {
  // ⚠ DIT GAAT ALLEEN OVER DE POSTEN DIE DE APP KAN PLAATSEN. Weet ze van een post de
  // maand niet, dan kan ze over de verre toekomst helemaal niets beweren — en dat is
  // een DERDE antwoord, geen variant van deze twee. Het scherm vangt dat geval apart
  // op (zie `ToekomstlastenKaart`), zodat deze functie één vraag beantwoordt in plaats
  // van er stilletjes twee te vermengen.
  const lasten = lastenVan(posten).filter((p) => !isGestopt(p, vanafMaand))
  // Zonder lasten geeft `every` op een lege lijst `true`, en dan zou "alles stopt" het
  // antwoord zijn op een vraag die niemand gesteld heeft.
  if (lasten.length === 0) return 'herhaalt'
  return lasten.every((p) => p.eindMaand !== undefined) ? 'stopt' : 'herhaalt'
}

/**
 * De laatste maand waarin deze post nog vervalt. Null wanneer ze blijft doorlopen
 * (geen eindmaand) of wanneer haar laatste beurt al vóór `vanafMaand` lag.
 *
 * Waarom niet gewoon "de maand vóór de eindmaand": dat is de laatste maand waarin de
 * post nog GELDT, niet de laatste waarin ze nog VALT. Een jaarpremie die in maart
 * vervalt en in september opgezegd wordt, betaal je voor het laatst in maart. Zou de
 * horizon hieronder op augustus mikken, dan mocht je naar een venster bladeren
 * waarin geen enkele euro meer staat.
 *
 * Verder terugzoeken dan één interval heeft geen zin: ligt er binnen één volledige
 * cyclus geen vervalmaand, dan is er geen.
 *
 * ⚠ GEEN ONDERGRENS OP `vanafMaand` (tweede doorlichting ronde 72). Die stond hier en
 * was onmeetbaar: `toekomsthorizon` begint zijn grens op `vanafMaand` en verhoogt hem
 * alleen, dus een maand uit het verleden wordt daar sowieso genegeerd. Een waarborg
 * die geen enkele test rood kan maken, is geen waarborg maar een geruststelling.
 */
function laatsteVervalmaand(post: TerugkerendePost): string | null {
  if (post.eindMaand === undefined) return null
  // ⚠ De maand VÓÓR de eindmaand, want `eindMaand` is de maand waarin de post niet
  // meer geldt. Vertrek je van de eindmaand zelf, dan schuift de hele lus één stap op
  // en valt de laatste vervalmaand er precies buiten — de lus is namelijk exact één
  // interval lang.
  let maand = verschuifMaand(post.eindMaand, -1)
  for (let i = 0; i < intervalVan(post); i++) {
    if (valtInMaand(post, maand)) return maand
    maand = verschuifMaand(maand, -1)
  }
  return null
}

/**
 * Tot welke maand mag je vooruitbladeren?
 *
 * DIT IS DE LASTIGSTE KEUZE VAN DEZE RONDE, dus expliciet. Een gewone huur heeft
 * geen eindmaand: ze loopt door tot in het oneindige. "Bladeren zolang er nog iets
 * valt" zou dus betekenen: eeuwig bladeren door twaalf identieke beelden. Dat is
 * geen informatie, dat is een tredmolen.
 *
 * De regel die hier geldt: **je mag bladeren tot een jaar na de laatste
 * verandering.** Een verandering is een post die begint (een startmaand die nog moet
 * komen) of een post die ophoudt (een eindmaand). Voorbij dat punt herhaalt elk jaar
 * zich exact — dezelfde posten, dezelfde ritmes, dezelfde bedragen — en er valt dus
 * niets nieuws meer te zien. Het scherm zegt dat ook met zoveel woorden in plaats
 * van de knop stil te laten verdwijnen.
 *
 * Eén uitzondering: houdt ÁLLES een keer op (elke last heeft een eindmaand), dan is
 * er geen herhaling om te tonen en stopt de horizon bij de laatste BETALING. Anders
 * zou je naar een venster mogen bladeren waarin niets meer staat.
 *
 * Er is altijd minstens één volledig venster, ook bij een lege app.
 */
export function toekomsthorizon(posten: TerugkerendePost[], vanafMaand: string): string {
  const eersteVenster = verschuifMaand(vanafMaand, VENSTER_MAANDEN - 1)
  const lasten = lastenVan(posten).filter((p) => !isGestopt(p, vanafMaand))
  if (lasten.length === 0) return eersteVenster

  const allesStopt = lasten.every((p) => p.eindMaand !== undefined)

  let grens = vanafMaand
  // ⚠ EEN APARTE VLAG, EN NIET "GRENS > VANAFMAAND" (vierde doorlichting ronde 72).
  // Zeg je een abonnement op met "de laatste keer is deze maand", dan valt de
  // verandering pRECIES op de lopende maand. `hoger()` slaat die kandidaat over — hij
  // is niet gróter dan de ondergrens — en dan leek er niets te veranderen, terwijl het
  // getoonde jaar juist het overgangsjaar was: augustus lag € 15,99 hoger dan hij ooit
  // nog wordt, de kaart zei "vanaf hier herhaalt elk jaar zich", en de knop stond op
  // slot zodat je het niet kon nakijken. En dat is de meest gewone opzegging die er
  // is: "ik zeg op, deze maand betaal ik voor het laatst".
  let verandertIets = false
  const hoger = (kandidaat: string | null): void => {
    if (kandidaat === null || kandidaat < vanafMaand) return
    verandertIets = true
    if (kandidaat > grens) grens = kandidaat
  }

  if (allesStopt) {
    // Alles houdt een keer op: de laatste betaling is het einde van het verhaal.
    for (const p of lasten) hoger(laatsteVervalmaand(p))
  } else {
    // Er loopt iets door. Dan is de laatste VERANDERING het punt waarna elk jaar
    // zich herhaalt, en tonen we daar nog één volledig jaar achter.
    for (const p of lasten) {
      // ⚠ Alleen bij een niet-maandelijkse post (doorlichting ronde 72). Een
      // maandelijkse post valt élke maand; haar startmaand is een dood veld, precies
      // zoals `valtInMaand` en `isNogNietBegonnen` het behandelen. Zou de horizon hem
      // wél lezen, dan rekte een huur met een oude `startMaand: '2030-01'` het
      // bladeren op tot 2030 — vier identieke vensters lang, voor een veld dat
      // nergens anders in de app meetelt.
      hoger(intervalVan(p) > 1 && p.startMaand !== undefined && p.startMaand > vanafMaand ? p.startMaand : null)
      // ⚠ DE LAATSTE BETALING, niet de laatste maand waarin de post nog GELDT (vijfde
      // doorlichting ronde 72). Een jaarpremie die in maart vervalt en per december
      // opgezegd is, verandert in maart iets — niet in november. Met de kale eindmaand
      // schoof de horizon acht maanden op en kreeg je één venster extra te zien dat tot
      // op de cent gelijk was aan het vorige, mét een actieve knop die nieuws beloofde.
      hoger(laatsteVervalmaand(p))
    }
    // ⚠ TWAALF EN NIET ELF (derde doorlichting ronde 72). De vensters staan twaalf
    // maanden uit elkaar, dus met elf kon het LAATSTE venster precies op de maand van
    // de verandering beginnen — en dan stond er "vanaf hier herhaalt elk jaar zich"
    // onder een jaar dat juist het overgangsjaar was en zich nooit meer herhaalt.
    // Bewezen geval: huur die doorloopt plus een kwartaalabonnement dat in september
    // 2028 stopt; het laatste venster was augustus 2028 – juli 2029, met augustus 2028
    // als zwaarste maand — terwijl augustus 2029 dertig euro lager ligt.
    //
    // Alleen wanneer er ÉCHT iets verandert; zonder verandering is één venster alles
    // wat er te zien is.
    if (verandertIets) grens = verschuifMaand(grens, VENSTER_MAANDEN)
  }

  return grens > eersteVenster ? grens : eersteVenster
}

/**
 * Mag je van dit venster naar het volgende jaar bladeren?
 *
 * ⚠ BEWUST GEEN TWEEDE CONTROLE OP "valt er in dat venster wel iets". Dat leek
 * veiliger en was het niet: heb je één jaarpost die pas in 2030 begint, dan zijn de
 * vensters van 2027, 2028 en 2029 leeg — en met zo'n controle kon je er niet
 * doorheen bladeren naar de enige maand die je zocht. Een leeg venster is een
 * geldig antwoord ("hier valt niets"), geen reden om de weg af te sluiten. De
 * horizon hierboven zorgt er al voor dat het LAATSTE venster nooit leeg is.
 */
export function kanVooruit(posten: TerugkerendePost[], beginMaand: string, vensterMaand: string): boolean {
  return verschuifMaand(vensterMaand, VENSTER_MAANDEN) <= toekomsthorizon(posten, beginMaand)
}
