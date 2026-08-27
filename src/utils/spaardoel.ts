import type { Overboeking, Rekening, Spaardoel, TerugkerendePost, Transactie, Waardering } from '../data/schema'
import { saldoOpDatum } from './saldo'
import { vandaag } from './datum'
import { datumVoorDoel, maandbedragVoorDoel } from './rekenhulp'
import { intervalVan, isGestopt, opzijPerMaand, volgendeVervaldag } from './vastelast'

// Het huidige saldo van een rekening. Gebruikt bewust dezelfde rekenkern als de
// vermogensevolutie (utils/saldo.ts), zodat een spaardoel en de grafiek nooit meer
// een ander getal tonen. Sinds ronde 7 tellen ook OVERBOEKINGEN mee: geld dat je
// van je betaal- naar je spaarrekening boekt is de normale manier van sparen, en
// bleef vroeger onzichtbaar in je spaardoel.
export function rekeningSaldo(
  rekeningId: string,
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
): number {
  const begin = rekeningen.find((r) => r.id === rekeningId)?.beginsaldo ?? 0
  // Tot VANDAAG, net als de Rekeningen-pagina en het rekeningdetail. Zonder die
  // grens telde een storting die je alvast voor volgende maand inboekte al mee in
  // je spaardoel, terwijl het rekeningsaldo ernaast hem nog niet toonde: twee
  // schermen, één rekening, twee bedragen.
  return saldoOpDatum(rekeningId, begin, transacties, overboekingen, waarderingen, vandaag())
}

export type SpaardoelVoortgang = {
  huidig: number
  doel: number
  /** Wat er nog bij moet. Nooit negatief; zie `over`. */
  resterend: number
  /** Tussen 0 en 1, ook wanneer je er ruim over zit. Voedt de balk. */
  fractie: number
  /**
   * Hoeveel je er OVER zit (ronde 85). Nul zolang je het doel niet gehaald hebt.
   *
   * ⚠ WAAROM DIT ERBIJ MOEST. `resterend` en `fractie` worden allebei afgekapt, en dat
   * is voor een voortgangsbalk ook juist: een balk van 116 % bestaat niet. Maar de rij
   * zei daardoor "nog € 0,00" bij wie € 720 opzij had staan voor een doel van € 620 —
   * precies hetzelfde als bij wie exact € 620 had. De twee getallen stonden er wél al
   * naast elkaar ("€ 720,00 van € 620,00"); het VERSCHIL moest je zelf maken, en de
   * regel eronder deed alsof er niets aan de hand was. Timothy: *"als er in dat
   * spaardoel gespaard wordt en je gaat dan over het doel, staat er simpelweg het bedrag
   * dat je er over aan 't gaan bent."*
   */
  over: number
}

// De voortgang van een spaardoel. Is er een rekening aan gekoppeld, dan komt het
// huidige bedrag uit het saldo van die rekening; anders uit het manueel
// bijgehouden bedrag. Alles in centen. 'fractie' zit tussen 0 en 1.
export function spaardoelVoortgang(
  doel: Spaardoel,
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
): SpaardoelVoortgang {
  const huidig = doel.gekoppeldeRekeningId
    ? rekeningSaldo(doel.gekoppeldeRekeningId, rekeningen, transacties, overboekingen, waarderingen)
    : doel.huidigBedrag
  const resterend = Math.max(doel.doelbedrag - huidig, 0)
  const fractie = doel.doelbedrag > 0 ? Math.min(Math.max(huidig / doel.doelbedrag, 0), 1) : 0
  // ⚠ Een VANGNET, geen bereikbaar geval (ronde 85, doorlichting). Een doel van € 0 kan
  // je niet bewaren: het formulier eist `doelCenten > 0` en `SpaardoelSchema` eist
  // `positive()`, gecontroleerd bij élke schrijfactie én bij élk inlezen. Deze regel
  // staat er voor gegevens die langs een ouder logboek binnenkomen — dan is élke euro
  // "meer dan nodig", en zou de app roepen dat je te veel gespaard hebt voor een doel
  // dat nog geen bedrag heeft.
  const over = doel.doelbedrag > 0 ? Math.max(huidig - doel.doelbedrag, 0) : 0
  return { huidig, doel: doel.doelbedrag, resterend, fractie, over }
}

// ---------------------------------------------------------------------------
// Van "waar sta ik?" naar "haal ik het?"
//
// De app wist al hoeveel er nog bij moet, en de Rekenhulpen-pagina kon al
// uitrekenen hoeveel je per maand nodig hebt — maar die twee stonden los van
// elkaar: op de Rekenhulpen moest je alles zélf opnieuw intikken. Hieronder
// worden ze verbonden, zodat een spaardoel zelf zegt of je op schema zit.
//
// Alles zuiver en deterministisch: 'vandaagISO' gaat er altijd in.
// ---------------------------------------------------------------------------

/** Over hoeveel volle maanden het tempo van een gekoppelde rekening gemeten wordt. */
export const TEMPO_VENSTER_MAANDEN = 3

export type SpaardoelTempo = {
  /** Gemiddelde groei per maand in centen; negatief mag (je haalde er geld af). */
  perMaand: number | null
  /** Over hoeveel maanden er gemeten is. 0 = niet meetbaar. */
  gemetenMaanden: number
}

// De LAATSTE dag van de maand die 'maanden' terug ligt, als JJJJ-MM-DD.
// We meten tussen twee maandeinden, niet tussen twee maandbegins: een saldo "t.e.m.
// de eerste van de maand" bevat de boekingen van die eerste dag al, en dan zou een
// storting die je elke 1e doet aan de verkeerde kant van de grens vallen.
function eindeVanMaandTerug(vandaagISO: string, maanden: number): string {
  const jaar = Number(vandaagISO.slice(0, 4))
  const maand = Number(vandaagISO.slice(5, 7))
  const totaal = jaar * 12 + (maand - 1) - maanden
  const nj = Math.floor(totaal / 12)
  const nm = (totaal % 12) + 1 // 1-gebaseerd
  const laatsteDag = new Date(Date.UTC(nj, nm, 0)).getUTCDate()
  return `${nj}-${String(nm).padStart(2, '0')}-${String(laatsteDag).padStart(2, '0')}`
}

/**
 * Hoe snel een gekoppelde spaarrekening de laatste maanden groeide.
 *
 * Enkel voor doelen MET een gekoppelde rekening: bij een manueel doel is er geen
 * geschiedenis (huidigBedrag wordt gewoon overschreven), dus valt er niets te
 * meten. En er wordt alleen gemeten wanneer de rekening al vóór het venster in
 * gebruik was — anders deel je de volledige aangroei van een pas geopende
 * rekening door drie en lijkt je tempo veel te laag.
 */
export function spaardoelTempo(
  doel: Spaardoel,
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
  vandaagISO: string,
  venster: number = TEMPO_VENSTER_MAANDEN,
): SpaardoelTempo {
  const rekeningId = doel.gekoppeldeRekeningId
  if (!rekeningId) return { perMaand: null, gemetenMaanden: 0 }

  // Het venster loopt over de laatste 'venster' VOLLE maanden: van het einde van
  // de maand daarvoor tot het einde van vorige maand. De aangebroken maand blijft
  // erbuiten — die zou het gemiddelde vertekenen zolang ze nog niet om is.
  const begin = eindeVanMaandTerug(vandaagISO, venster + 1)
  const eind = eindeVanMaandTerug(vandaagISO, 1)

  const raaktRekening = (o: Overboeking) => o.vanRekeningId === rekeningId || o.naarRekeningId === rekeningId
  const heeftGeschiedenis =
    transacties.some((t) => t.rekeningId === rekeningId && t.datum <= begin) ||
    overboekingen.some((o) => raaktRekening(o) && o.datum <= begin)
  if (!heeftGeschiedenis) return { perMaand: null, gemetenMaanden: 0 }

  // Ligt er een waardering IN het meetvenster, dan is het verschil tussen begin en
  // eind geen spaargedrag maar een koerssprong. Die delen door drie en presenteren
  // als "je spaart € 1.000 per maand" zou een cijfer opleveren waar de gebruiker op
  // rekent en dat nergens op slaat. Dan zeggen we liever niets — dezelfde regel als
  // bij een rekening zonder geschiedenis.
  if (waarderingen.some((w) => w.rekeningId === rekeningId && w.datum > begin && w.datum <= eind)) {
    return { perMaand: null, gemetenMaanden: 0 }
  }

  // ⚠ RONDE 106 — ÉÉN BEWEGING IS GEEN TEMPO. Dezelfde redenering als bij de waardering
  // hierboven, maar voor gewoon geld: verkocht je in juni je auto en stortte je € 3.000 op je
  // spaarrekening, dan las je "je tempo: € 1.000,00 per maand (gemiddeld over 3 maanden)" en
  // "zo klaar rond februari 2027". Dat cijfer beschrijft geen gedrag dat zich herhaalt, en het
  // is precies het soort cijfer waarop iemand een plan bouwt.
  //
  // ⚠ NUL bewegingen blijft WÉL een antwoord: dan spaarde je in dit venster aantoonbaar
  // niets, en "€ 0,00 per maand" is dan waar. Alleen bij precies één beweging weten we het
  // niet.
  const bewegingen =
    transacties.filter((t) => t.rekeningId === rekeningId && t.datum > begin && t.datum <= eind).length +
    overboekingen.filter((o) => raaktRekening(o) && o.datum > begin && o.datum <= eind).length
  if (bewegingen === 1) return { perMaand: null, gemetenMaanden: 0 }

  const beginsaldo = rekeningen.find((r) => r.id === rekeningId)?.beginsaldo ?? 0
  const toen = saldoOpDatum(rekeningId, beginsaldo, transacties, overboekingen, waarderingen, begin)
  const nu = saldoOpDatum(rekeningId, beginsaldo, transacties, overboekingen, waarderingen, eind)
  return { perMaand: Math.round((nu - toen) / venster), gemetenMaanden: venster }
}

export type SpaardoelPlan = {
  /** Het doel is al gehaald. */
  alBereikt: boolean
  /** Wat er per maand bij moet om de doeldatum te halen. Null zonder bruikbare doeldatum. */
  benodigdPerMaand: number | null
  /** Aantal maandstortingen tot de doeldatum. Null zonder bruikbare doeldatum. */
  maandenTotDoeldatum: number | null
  /** De doeldatum ligt in het verleden terwijl het doel nog niet gehaald is. */
  datumVerstreken: boolean
  /** Waarmee we rekenen: je eigen streefbedrag als je dat invulde, anders het gemeten tempo. */
  tempoPerMaand: number | null
  tempoBron: 'streefbedrag' | 'gemeten' | null
  /** Wanneer je aan dat tempo klaar bent. Null als er geen tempo is of het te lang duurt. */
  verwachteDatum: string | null
  /** true = dat tempo volstaat voor de doeldatum. Null wanneer een van de twee ontbreekt. */
  opSchema: boolean | null
}

/**
 * Combineert de voortgang van een doel met wat er nodig is en wat je effectief doet.
 *
 * Twee tempo-bronnen, in deze volgorde: het streefbedrag dat je zelf bij het doel
 * invulde (dat is je plan), en anders het gemeten tempo van de gekoppelde
 * rekening (dat is je gedrag). Je eigen plan krijgt voorrang, want daar heb je
 * bewust voor gekozen; het gemeten tempo is de terugval als je niets invulde.
 */
export function spaardoelPlan(
  doel: Spaardoel,
  voortgang: SpaardoelVoortgang,
  tempo: SpaardoelTempo,
  vandaagISO: string,
): SpaardoelPlan {
  const alBereikt = voortgang.resterend === 0

  let benodigdPerMaand: number | null = null
  let maandenTotDoeldatum: number | null = null
  let datumVerstreken = false
  if (doel.doeldatum) {
    const plan = maandbedragVoorDoel(doel.doelbedrag, voortgang.huidig, doel.doeldatum, vandaagISO)
    if (plan.ok) {
      benodigdPerMaand = plan.waarde.perMaandCenten
      maandenTotDoeldatum = plan.waarde.maanden
    } else if (plan.fout === 'datum-verleden') {
      datumVerstreken = !alBereikt
    }
  }

  const tempoPerMaand = doel.maandbedrag ?? (tempo.perMaand !== null && tempo.perMaand > 0 ? tempo.perMaand : null)
  const tempoBron: SpaardoelPlan['tempoBron'] = doel.maandbedrag ? 'streefbedrag' : tempoPerMaand !== null ? 'gemeten' : null

  let verwachteDatum: string | null = null
  if (!alBereikt && tempoPerMaand !== null) {
    const duur = datumVoorDoel(doel.doelbedrag, voortgang.huidig, tempoPerMaand, vandaagISO)
    if (duur.ok) verwachteDatum = duur.waarde.datumISO
  }

  const opSchema =
    alBereikt ? true : benodigdPerMaand === null || tempoPerMaand === null ? null : tempoPerMaand >= benodigdPerMaand

  return { alBereikt, benodigdPerMaand, maandenTotDoeldatum, datumVerstreken, tempoPerMaand, tempoBron, verwachteDatum, opSchema }
}

// ---------------------------------------------------------------------------
// Een spaardoel dat weet WELKE vaste last het dient (ronde 74)
//
// Afspraak met Timothy uit ronde 71, op de vraag hoe hij wil sparen voor een kost
// die pas later valt: *"allebei, maar het vinkje eerst"*. Het vinkje ("hier
// maandelijks voor opzijzetten") staat er sinds ronde 71; dit is het tweede deel.
//
// ⚠ WAT DE KOPPELING ÉCHT VERANDERT — en wat ze BEWUST NIET doet.
//
// Ze VERVANGT het bedrag onder "Opzij voor later" op Budget; ze haalt het er niet
// weg. Dat verschil is de hele ronde waard, en de eerste opzet had het fout: die
// liet de post gewoon uit `opzij` vallen. Gevolg zou zijn geweest dat "Te verdelen"
// te HOOG stond, want `Spaardoel.maandbedrag` komt in geen enkele rekenkern die
// Budget voedt — een storting naar je spaarrekening is een overboeking, en die telt
// daar per definitie niet mee. Er stond dus niets tegenover.
//
// Wat de koppeling wél doet: het bedrag komt voortaan uit JOUW doel in plaats van
// uit de kale deling "jaarbedrag ÷ 12". Zet je € 75 per maand opzij voor een premie
// van € 620, dan vraagt Budget € 75 — niet € 51,67. En zet je géén streefbedrag,
// dan blijft de oude deling gelden en verandert er niets.
//
// Alles hieronder is zuiver: 'vandaagISO' gaat er altijd in.
// ---------------------------------------------------------------------------

/**
 * De vaste lasten waar je zinnig voor kan sparen.
 *
 * Alleen UITGAVEN, alleen wat niet elke maand valt, en niets wat al gestopt is.
 * Een maandelijkse kost betaal je gewoon uit het loon van die maand; daar vooraf
 * voor sparen is een pot die elke maand weer leeg is.
 */
export function spaarbareVasteLasten(posten: TerugkerendePost[], maand: string): TerugkerendePost[] {
  return posten.filter((p) => p.bedrag < 0 && intervalVan(p) > 1 && !isGestopt(p, maand))
}

/**
 * De id's van de vaste lasten waar een spaardoel aan hangt.
 *
 * ⚠ Een `Set`, en niet "zoek per post het doel op": `plancijfers` loopt over alle
 * posten, en een lineaire zoektocht per post maakt daar stil een kwadratische lus
 * van op een scherm dat bij elke maandwissel opnieuw rekent.
 */
export function vasteLastenMetSpaardoel(spaardoelen: Spaardoel[]): Set<string> {
  const uit = new Set<string>()
  for (const d of spaardoelen) if (d.vasteLastId) uit.add(d.vasteLastId)
  return uit
}

/** Het spaardoel dat bij deze vaste last hoort, of null. */
export function spaardoelVoorVasteLast(postId: string, spaardoelen: Spaardoel[]): Spaardoel | null {
  return spaardoelen.find((d) => d.vasteLastId === postId) ?? null
}

/** Alle spaardoelen die aan deze vaste last hangen. Meestal één, soms meer. */
export function spaardoelenVoorVasteLast(postId: string, spaardoelen: Spaardoel[]): Spaardoel[] {
  return spaardoelen.filter((d) => d.vasteLastId === postId)
}

/**
 * Wat je per maand opzij hoort te zetten voor de vaste lasten waar een doel aan hangt.
 *
 * Sleutel: het id van de vaste last. Waarde: het bedrag in centen dat Budget onder
 * "Opzij voor later" hoort te tellen, IN PLAATS VAN de kale `opzijPerMaand`.
 *
 *  - Heeft het doel een maandelijks streefbedrag, dan is dát het bedrag. Jij hebt
 *    gekozen hoeveel je wegzet; de app hoort met jouw bedrag te rekenen, niet met
 *    een deling die ze zelf verzint.
 *  - Zonder streefbedrag valt ze terug op `opzijPerMaand` — precies wat er vóór de
 *    koppeling stond. Dan verandert er dus niets, en dat is de bedoeling.
 *
 * ⚠ Hangen er TWEE doelen aan dezelfde kost, dan tellen ze op: je stort dan ook
 * echt twee keer. Het scherm zegt het erbij, zodat je ziet dat je dubbel spaart.
 *
 * ⚠ Alleen voor kosten waar sparen zin heeft (uitgave, niet elke maand). Een doel
 * dat door een oud logboekbestand naar een inkomst of een maandelijkse post wijst,
 * mag geen bedrag in je plan zetten dat daar niet hoort.
 */
export function opzijVolgensSpaardoelen(
  spaardoelen: Spaardoel[],
  posten: TerugkerendePost[],
): Map<string, number> {
  const uit = new Map<string, number>()
  for (const d of spaardoelen) {
    if (!d.vasteLastId) continue
    const post = posten.find((p) => p.id === d.vasteLastId)
    if (!post || post.bedrag >= 0 || intervalVan(post) === 1) continue
    uit.set(d.vasteLastId, (uit.get(d.vasteLastId) ?? 0) + (d.maandbedrag ?? opzijPerMaand(post)))
  }
  return uit
}

/**
 * Wat er over de koppeling van dit doel te zeggen valt.
 *
 * ⚠ ALLEEN VASTSTELLINGEN, geen stille correcties. De app verandert nooit uit
 * zichzelf een bedrag of een datum die jij hebt ingevuld — ze zegt wat ze ziet en
 * laat jou beslissen. Dat is dezelfde regel als bij het indexcijfer van de
 * kindrekening (ronde 65): kan de app een vergissing niet met zekerheid
 * aanwijzen, dan wijst ze niets aan.
 */
export type Doeldekking =
  | { soort: 'geen' }
  /** De post waarnaar het doel wijst, bestaat niet meer. */
  | { soort: 'verdwenen' }
  /** De post bestaat nog maar is opgezegd: er komt geen betaling meer. */
  | { soort: 'gestopt'; post: TerugkerendePost }
  /** De post loopt nog, maar zijn laatste betaling is al geweest. */
  | { soort: 'uitbetaald'; post: TerugkerendePost }
  | {
      soort: 'loopt'
      post: TerugkerendePost
      /** De eerstvolgende vervaldag ('JJJJ-MM-DD'). */
      vervaldag: string
      /** Het volle bedrag van één betaling, positief in centen. */
      bedrag: number
      /** Waar of het doelbedrag afwijkt van dat bedrag. */
      bedragWijktAf: boolean
      /** Waar of je doeldatum ná de vervaldag ligt — dan ben je te laat klaar. */
      datumNaVervaldag: boolean
    }

export function doeldekking(doel: Spaardoel, posten: TerugkerendePost[], vandaagISO: string): Doeldekking {
  if (!doel.vasteLastId) return { soort: 'geen' }
  const post = posten.find((p) => p.id === doel.vasteLastId)
  if (!post) return { soort: 'verdwenen' }
  if (isGestopt(post, vandaagISO.slice(0, 7))) return { soort: 'gestopt', post }
  const vervaldag = volgendeVervaldag(post, vandaagISO)
  // ⚠ EEN EIGEN GEVAL (doorlichting ronde 74). Een post met een eindmaand die nog
  // niet bereikt is, geldt niet als 'gestopt' — maar zijn volgende beurt kan al
  // voorbij die eindmaand liggen, en dan komt er nooit meer een betaling. Zonder dit
  // geval zei het scherm alleen "Voor Autoverzekering." en bleef je sparen voor iets
  // wat nooit meer valt.
  if (vervaldag === null) return { soort: 'uitbetaald', post }
  const bedrag = Math.abs(post.bedrag)
  return {
    soort: 'loopt',
    post,
    vervaldag,
    bedrag,
    bedragWijktAf: doel.doelbedrag !== bedrag,
    // ⚠ Strikt NA, niet "op of na": een doeldatum die precies op de vervaldag valt
    // is exact goed, en dat mag geen waarschuwing geven.
    datumNaVervaldag: doel.doeldatum !== undefined && doel.doeldatum > vervaldag,
  }
}

/**
 * Ben je op tijd klaar voor de betaling? (ronde 74, doorlichting)
 *
 * ⚠ Los van `doeldekking`, want dit vraagt het PLAN erbij. `doeldekking` vergelijkt
 * alleen de doeldatum die jij invulde; deze vraag vergelijkt de datum waarop je aan
 * je huidige tempo genoeg hebt. Zonder haar zei de app "zo klaar rond mei 2028" naast
 * "de volgende keer op 5 maart 2027" en liet ze jou de vergelijking maken.
 */
export function teLaatVoorVervaldag(dekking: Doeldekking, plan: SpaardoelPlan): boolean {
  if (dekking.soort !== 'loopt' || plan.alBereikt) return false
  if (plan.verwachteDatum === null) return false
  return plan.verwachteDatum > dekking.vervaldag
}
