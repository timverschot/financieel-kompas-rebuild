import type { DossierDocument, Onderhoudsbetaling, Onderhoudsbijdrage, Transactie } from '../data/schema'
import {
  aanslagjaarVan,
  bouwtVerderAf,
  kentAanslagjaar,
  onderhoudPercentage,
  postenVoorAanslagjaar,
  vervallenVoorAanslagjaar,
  type FiscalePost,
} from '../data/fiscalePosten'
import { categorieValtOnder } from './transactieFilter'
import { categorieBedragen } from './transactie'
import { bonVanTransactie } from './kluis'

// De rekenkern van het fiscale jaaroverzicht (ronde 50).
//
// Zuiver: geen React, geen database, geen `new Date()` zonder dat de aanroeper hem
// meegeeft. Wat deze module doet, staat in één zin: ZE VERZAMELT. Per fiscale post
// telt ze op wat je dat jaar uitgaf, welke boekingen erin zitten en of er een bon
// bij hangt.
//
// Wat ze NIET doet, en waarom dat een ontwerpbeslissing is en geen tekortkoming:
// ze zegt niet hoeveel belasting je bespaart. Dat hangt af van je hele aangifte —
// je inkomen, je gezinssituatie, je andere posten — en daar weet deze app niets
// van. Een geschat voordeel zou er geloofwaardig uitzien en toch niet kloppen.
//
// Eén uitzondering, en die is geen schatting: bij betaalde onderhoudsuitkeringen
// legt de wet een vast percentage op dat aftrekbaar is. Dat percentage is een feit
// uit de wet (zie `onderhoudPercentage`), en het verschilt per BETALINGSJAAR. Dat
// mag de app dus wél tonen.

/** Eén post, met wat de app erover gevonden heeft. */
export type FiscaleRegel = {
  post: FiscalePost
  /** Wat je dat jaar uitgaf onder deze post, in centen (positief). */
  bedrag: number
  /** De boekingen die eronder vallen, nieuwste eerst. */
  boekingen: FiscaleBoeking[]
  /** Hoeveel van die boekingen een bon in de kluis hebben. */
  metBon: number
  /**
   * Het deel dat de wet aftrekbaar maakt, in centen. Alleen ingevuld waar de wet een
   * vast percentage oplegt — vandaag enkel bij de onderhoudsuitkeringen.
   */
  aftrekbaar?: number
  /** Het percentage dat bij `aftrekbaar` hoort. */
  percentage?: number
  /**
   * Daalt dat percentage ná dit betalingsjaar nog verder?
   *
   * Staat hier en niet in het scherm, omdat het een feit uit de wet is en niet een
   * opmaakkeuze. De wet legt vandaag tot 50 % vast en niet verder; een scherm dat
   * onvoorwaardelijk "wordt de komende jaren verder afgebouwd" zegt, beweert vanaf
   * dat niveau iets wat nergens staat.
   */
  bouwtVerderAf?: boolean
}

/** Eén boeking onder een post. Los van `Transactie`, want een betaling op een
 *  onderhoudsregeling is geen transactie maar telt hier wel mee. */
export type FiscaleBoeking = {
  id: string
  datum: string
  omschrijving: string
  /** In centen, positief. */
  bedrag: number
  /**
   * Hangt er een bon in de kluis aan? `null` = de app kan het niet weten. Bij een
   * onderhoudsbetaling is dat het geval: die wordt in de Dossiers-module
   * geregistreerd en heeft daar geen documentkluis. "Nee" zou daar onwaar zijn, en
   * bij precies deze post is bewijs een wettelijke voorwaarde.
   */
  bon: boolean | null
  /** De transactie zelf, wanneer die bestaat — om vanuit het scherm te openen. */
  transactie?: Transactie
}

export type FiscaalOverzicht = {
  inkomstenjaar: number
  aanslagjaar: number
  /**
   * Beschrijft het gegevensbestand dit aanslagjaar? Zo niet, dan hoort het scherm
   * dat te zeggen in plaats van een korte lijst te tonen — een korte lijst leest als
   * "er valt niets af te trekken".
   */
  gekend: boolean
  /** De posten die dat jaar bestonden en waar iets onder valt of kan vallen. */
  regels: FiscaleRegel[]
  /**
   * Posten die dat jaar NIET meer bestonden maar waar je wél nog boekingen onder
   * hebt. Wie jarenlang dienstencheques inbracht, gaat anders zoeken naar een vak
   * dat verdwenen is.
   */
  vervallen: FiscaleRegel[]
}

// Wat hier BEWUST NIET staat: een totaal over alle posten heen (ronde 50, na review).
// Kinderopvang plus pensioensparen plus een woonlening optellen geeft een getal dat
// niets betekent — het zijn verschillende vakken, verschillende regels en gedeeltelijk
// bedragen die het attest nog moet corrigeren. Zo'n som stond hier eerst wel, werd
// nergens getoond, en dat is precies het soort veld dat later tóch op een scherm
// belandt.

/** De uitgaven van één boeking die onder een post vallen, in centen (positief). */
function bedragOnderPost(tx: Transactie, post: FiscalePost): number {
  let som = 0
  for (const regel of categorieBedragen(tx)) {
    // Alleen uitgaven. Een terugbetaling op dezelfde categorie (een creditnota van
    // de crèche) wordt hier dus NIET afgetrokken: die staat als een aparte regel met
    // een positief bedrag en valt buiten deze filter. Bewust — dit cijfer is een
    // geheugensteun naast je attest, en dat attest telt zelf op wat je betaalde.
    // Gevolg dat je moet kennen: "betaald in dit jaar" kan hoger staan dan wat er
    // netto van je rekening ging.
    if (regel.bedrag >= 0) continue
    if (!regel.categorieId) continue
    if (!post.categorieIds.some((doel) => categorieValtOnder(regel.categorieId as string, doel))) continue
    som += Math.abs(regel.bedrag)
  }
  return som
}

/** De boekingen van één jaar die onder een post vallen. */
function boekingenVoorPost(
  post: FiscalePost,
  transacties: Transactie[],
  documenten: DossierDocument[],
  jaar: number,
): FiscaleBoeking[] {
  if (post.categorieIds.length === 0) return []
  const uit: FiscaleBoeking[] = []
  for (const tx of transacties) {
    if (!tx.datum.startsWith(String(jaar))) continue
    const bedrag = bedragOnderPost(tx, post)
    if (bedrag <= 0) continue
    uit.push({
      id: tx.id,
      datum: tx.datum,
      omschrijving: tx.omschrijving,
      bedrag,
      bon: bonVanTransactie(documenten, tx.id) !== null,
      transactie: tx,
    })
  }
  return uit.sort((a, b) => b.datum.localeCompare(a.datum))
}

/**
 * De betalingen op onderhoudsregelingen waarbij JIJ betaalt.
 *
 * Alleen die zijn aftrekbaar; wat je ONTVANGT is aan de andere kant belastbaar en
 * hoort dus niet in deze lijst thuis.
 */
function onderhoudBoekingen(
  bijdragen: Onderhoudsbijdrage[],
  betalingen: Onderhoudsbetaling[],
  jaar: number,
): FiscaleBoeking[] {
  const betaaldDoorJou = new Set(bijdragen.filter((b) => b.richting === 'jij-betaalt').map((b) => b.id))
  return betalingen
    .filter((b) => betaaldDoorJou.has(b.bijdrageId) && b.datum.startsWith(String(jaar)))
    .map((b) => ({
      id: b.id,
      datum: b.datum,
      omschrijving: b.notitie ?? '',
      bedrag: b.bedrag,
      bon: null,
    }))
    .sort((a, b) => b.datum.localeCompare(a.datum))
}

export type FiscaalInvoer = {
  inkomstenjaar: number
  transacties: Transactie[]
  onderhoudsbijdragen?: Onderhoudsbijdrage[]
  onderhoudsbetalingen?: Onderhoudsbetaling[]
  documenten?: DossierDocument[]
}

/**
 * Het volledige overzicht van één inkomstenjaar.
 *
 * LET OP het verschil tussen inkomstenjaar en aanslagjaar: de betalingen van 2026
 * horen bij de aangifte van aanslagjaar 2027. Dat is de meest gemaakte fout in dit
 * onderwerp, en daarom draagt het resultaat allebei de jaartallen.
 */
export function fiscaalJaaroverzicht(invoer: FiscaalInvoer): FiscaalOverzicht {
  const { inkomstenjaar, transacties } = invoer
  const documenten = invoer.documenten ?? []
  const aanslagjaar = aanslagjaarVan(inkomstenjaar)

  const maakRegel = (post: FiscalePost): FiscaleRegel => {
    const boekingen = post.uitOnderhoudsbetalingen
      ? onderhoudBoekingen(invoer.onderhoudsbijdragen ?? [], invoer.onderhoudsbetalingen ?? [], inkomstenjaar)
      : boekingenVoorPost(post, transacties, documenten, inkomstenjaar)
    const bedrag = boekingen.reduce((som, b) => som + b.bedrag, 0)
    const regel: FiscaleRegel = {
      post,
      bedrag,
      boekingen,
      metBon: boekingen.filter((b) => b.bon === true).length,
    }
    if (post.uitOnderhoudsbetalingen && bedrag > 0) {
      // Het percentage volgt het jaar van BETALING, en alle betalingen in deze regel
      // vallen per definitie in hetzelfde jaar.
      const pct = onderhoudPercentage(inkomstenjaar)
      regel.percentage = pct
      // Naar beneden afgerond op de cent: bij twijfel liever een cent te weinig
      // opgeven dan een cent te veel.
      regel.aftrekbaar = Math.floor((bedrag * pct) / 100)
      regel.bouwtVerderAf = bouwtVerderAf(inkomstenjaar)
    }
    return regel
  }

  const regels = postenVoorAanslagjaar(aanslagjaar).map(maakRegel)
  // Een vervallen post tonen we alleen wanneer er dat jaar écht iets onder staat.
  const vervallen = vervallenVoorAanslagjaar(aanslagjaar)
    .map(maakRegel)
    .filter((r) => r.bedrag > 0)

  return {
    inkomstenjaar,
    aanslagjaar,
    gekend: kentAanslagjaar(aanslagjaar),
    regels,
    vervallen,
  }
}

/**
 * De jaren waarover de app iets kan zeggen, nieuwste eerst.
 *
 * De onderhoudsbetalingen tellen mee, en dat is geen detail: wie zijn alimentatie
 * alleen in de Dossiers-module bijhoudt en dat jaar geen gewone boekingen had, kon
 * zijn belangrijkste post anders niet eens kiezen.
 */
export function beschikbareJaren(
  transacties: Transactie[],
  vandaagISO: string,
  onderhoudsbetalingen: Onderhoudsbetaling[] = [],
): number[] {
  const nu = Number(vandaagISO.slice(0, 4))
  const jaren = new Set<number>([nu])
  const voegToe = (datum: string) => {
    const jaar = Number(datum.slice(0, 4))
    // Alleen jaren waarvan het aanslagjaar in dit gegevensbestand beschreven staat;
    // voor oudere jaren zou de lijst te kort zijn en dat leest als "niets aftrekbaar".
    if (Number.isFinite(jaar) && kentAanslagjaar(aanslagjaarVan(jaar))) jaren.add(jaar)
  }
  for (const tx of transacties) voegToe(tx.datum)
  for (const b of onderhoudsbetalingen) voegToe(b.datum)
  return [...jaren].sort((a, b) => b - a)
}
