import type { Dossier, GedeeldeKost, Gezinslid, Transactie } from '../data/schema'
import { categorieBedragen } from './transactie'
import { effectiefAandeel } from './dossier'
import { uitgavenPerPersoon, type PersoonLabels, type TeVerdelenPost } from './persoon'

// Wat kost elk gezinslid mij per jaar? (ronde 53)
//
// DE VRAAG DIE DIT SCHERM BEANTWOORDT is smaller dan ze klinkt, en dat is met
// opzet: "wat gaf IK dit jaar uit dat aan dit gezinslid hangt". Niet wat een kind
// kost, niet wat het samen met de andere ouder kost — wat het JOU kost.
//
// TWEE BRONNEN, en niet meer:
//
//  1. Je eigen boekingen met een gezinslid eraan (`Transactie.persoonIds`). Het
//     volledige bedrag, want jij betaalde het.
//  2. De gedeelde kosten in je dossiers (`GedeeldeKost.kindIds`), maar dan JOUW
//     AANDEEL. Betaalde je partner een schoolreis van € 90 en draag jij 60 %, dan
//     kost dat jou € 54 — ook al ging er niets van je rekening. Omgekeerd: betaalde
//     jij die € 90 zelf, dan kost hij jou nog altijd € 54, want de andere € 36 komt
//     terug via de afrekening.
//
// WAT ER BEWUST NIET IN ZIT (keuze van de gebruiker, ronde 53):
//
//  * de onderhoudsbijdrage — die is niet per kind toewijsbaar zonder een verdeling
//    te verzinnen die in geen enkele akte staat;
//  * de gezamenlijke pot (kindrekening) — daar zit ook geld van de andere ouder in,
//    en dan wordt "wat kost het mij" te hoog.
//
// Het scherm zegt dat er zélf bij. Een cijfer dat stilzwijgend twee grote posten
// weglaat, leest als een volledig antwoord en is er geen.
//
// DE DUBBELTELLING die deze module moet vermijden: koppel je een boeking aan een
// dossier, dan bestaat dezelfde uitgave twee keer — als transactie én als gedeelde
// kost met `transactieId`. Zonder ontdubbeling zou een schoolreis van € 60 hier als
// € 60 (de boeking) plus € 36 (jouw aandeel) verschijnen. Zie `gedektDoorDossier`.

/** Eén gezinslid met zijn jaarbedrag, en waar dat uit is opgebouwd. */
export type KindkostenRegel = {
  /** `null` is de groep "Het gezin": alles wat aan niemand persoonlijk hangt. */
  id: string | null
  naam: string
  /** In centen, positief. */
  bedrag: number
  /** Het deel dat uit je eigen boekingen komt. */
  uitBoekingen: number
  /** Het deel dat uit jouw aandeel in gedeelde kosten komt. */
  uitDossiers: number
  /**
   * Bevat dit bedrag iets wat NERGENS als boeking bestaat?
   *
   * Twee gevallen: een uitgave die aan meerdere gezinsleden hing en dus gedeeld
   * werd, en elk aandeel uit een dossier (jouw 60 % van € 90 is een berekening, geen
   * betaling). Deze vlag bepaalt of de rij mag doorklikken — dezelfde regel als in
   * ronde 49: een doorklik moet exact de verzameling tonen waaruit het cijfer komt.
   */
  gedeeld: boolean
  /**
   * Is er een boeking van dit lid uit de telling gehouden omdat een gedeelde kost
   * ze al dekte? Dan klopt een filter op dit gezinslid niet meer met dit bedrag —
   * die overgeslagen boeking zou in de lijst wél verschijnen.
   */
  metOvergeslagen: boolean
}

export type Kindkosten = {
  jaar: number
  /** Van groot naar klein; "Het gezin" staat altijd achteraan. */
  regels: KindkostenRegel[]
  /** De som van alle regels. Zelfde eenheid, zelfde betekenis — dus wél optelbaar. */
  totaal: number
  /** Hoeveel boekingen en hoeveel gedeelde kosten er effectief iets bijdroegen. */
  aantalBoekingen: number
  aantalDossierkosten: number
  /** Hoeveel boekingen er (deels) door een gekoppelde gedeelde kost vervangen zijn. */
  aantalOvergeslagen: number
  /**
   * Uitgaven die hier vermoedelijk TWEE KEER staan (ronde 53, na review).
   *
   * De ontdubbeling hierboven werkt via `GedeeldeKost.transactieId`, en die
   * koppeling ontstaat alleen wanneer je de boeking in het invoervenster aan een
   * dossier hangt. De gewone werkwijze levert er géén: je leest je bankuittreksel
   * in, hangt er een kind aan, en registreert diezelfde schoolreis daarnaast als
   * gedeelde kost voor de afrekening. Dan staat ze hier twee keer — één keer voor
   * € 90 en één keer voor jouw € 54 — en niets verraadt dat.
   *
   * De app KAN dat niet zeker weten (twee uitstappen van € 90 op dezelfde dag zijn
   * niet uitgesloten), dus ze beslist niet: ze telt hoeveel paren er verdacht zijn
   * en zegt het. Zelfde houding als bij het inlezen van een uitwisselbestand, waar
   * een vermoedelijk duplicaat wél getoond maar niet voorgevinkt wordt.
   */
  mogelijkeDubbels: number
}

export type KindkostenInvoer = {
  jaar: number
  transacties: Transactie[]
  dossiers?: Dossier[]
  gedeeldeKosten?: GedeeldeKost[]
  gezinsleden?: Gezinslid[]
  labels: PersoonLabels
}

/** De interne sleutel voor de groep "Het gezin". Nooit een gezinslid-id. */
const GEZIN = '__het-gezin__'

/** Valt deze datum (JJJJ-MM-DD) in het gevraagde jaar? */
function inJaar(datum: string, jaar: number): boolean {
  return datum.startsWith(String(jaar))
}

/** De uitgaven van één boeking, in centen (positief). Inkomsten tellen niet mee. */
function uitgaveVan(tx: Transactie): number {
  let som = 0
  for (const regel of categorieBedragen(tx)) {
    // Op REGELniveau, net als elders in de app: een kassaticket met een statiegeld-
    // regel erop kost je het uitgavedeel, niet het nettobedrag.
    if (regel.bedrag < 0) som += -regel.bedrag
  }
  return som
}

/**
 * Het volledige overzicht van één jaar.
 *
 * Zuiver: geen React, geen database, en het jaar komt van buiten — deze module
 * kijkt zelf nooit op de klok.
 */
export function kindkostenVanJaar(invoer: KindkostenInvoer): Kindkosten {
  const { jaar, transacties, labels } = invoer
  const dossiers = invoer.dossiers ?? []
  const kosten = invoer.gedeeldeKosten ?? []
  const leden = invoer.gezinsleden ?? []
  const perDossier = new Map(dossiers.map((d) => [d.id, d]))

  const uitDossiers: TeVerdelenPost[] = []
  let aantalDossierkosten = 0
  // Per boeking: hoeveel van haar bedrag al door een gedeelde kost gedekt is.
  //
  // ZONDER JAARGRENS, en dat is met opzet. Staat de boeking in december 2025 en de
  // gekoppelde kost in januari 2026, dan zou een jaargrens hier de boeking in 2025
  // volledig laten meetellen én de kost in 2026 nog eens — dezelfde schoolreis in
  // twee jaren. De koppeling geldt altijd, ongeacht welk jaar je bekijkt.
  const gedekt = new Map<string, number>()

  for (const kost of kosten) {
    // Een INGETROKKEN kost telt nergens mee. Sinds ronde 44 is intrekken het
    // eerlijke alternatief voor verwijderen; ze hier wél meetellen zou betekenen dat
    // een kost die je publiek introk, in je eigen overzicht blijft doorwegen. En ze
    // dekt dan ook geen boeking meer af, zodat die boeking gewoon weer meetelt.
    if (kost.ingetrokken) continue
    const dossier = perDossier.get(kost.dossierId)
    // Een kost waarvan het dossier niet (meer) bestaat, kan geen aandeel opleveren:
    // de verdeelsleutel staat op dat dossier. Ze dekt dan ook geen boeking af —
    // anders zou die boeking uit het overzicht vallen zonder dat er iets voor in de
    // plaats komt, en zou het scherm bovendien beweren dat ze meegeteld is.
    if (!dossier) continue
    // Per kost afgerond, en dus is het totaal de som van die afgeronde delen. Dat is
    // intern sluitend; het is bewust NIET dezelfde afronding als in een afrekening,
    // want daar moet de uitsplitsing exact op één totaalbedrag uitkomen.
    const aandeel = Math.round((kost.bedrag * effectiefAandeel(dossier, kost)) / 100)
    // Een kost met 0 % dekt haar boeking wél af: dan kost die boeking je terecht
    // niets, en mag ze niet alsnog voor het volle bedrag meetellen.
    if (kost.transactieId) gedekt.set(kost.transactieId, (gedekt.get(kost.transactieId) ?? 0) + kost.bedrag)
    if (!inJaar(kost.datum, jaar)) continue
    if (aandeel <= 0) continue
    aantalDossierkosten += 1
    uitDossiers.push({ bedrag: aandeel, persoonIds: kost.kindIds })
  }

  const uitBoekingen: TeVerdelenPost[] = []
  const overgeslagenIds = new Set<string>()
  let aantalBoekingen = 0
  let aantalOvergeslagen = 0
  // De bedragen van de boekingen die dit jaar meetelden, om verdachte duplicaten te
  // kunnen herkennen: 'JJJJ-MM-DD|centen'.
  const losseBoekingen = new Map<string, number>()

  for (const tx of transacties) {
    if (!inJaar(tx.datum, jaar)) continue
    const bedrag = uitgaveVan(tx)
    if (bedrag <= 0) continue
    const alGedekt = gedekt.get(tx.id) ?? 0
    if (alGedekt > 0) {
      aantalOvergeslagen += 1
      for (const id of tx.persoonIds ?? []) overgeslagenIds.add(id)
      if ((tx.persoonIds ?? []).length === 0) overgeslagenIds.add(GEZIN)
      // WAT ER OVERBLIJFT telt wél mee. Bij het koppelen krijgt de kost het volledige
      // bedrag van de boeking, maar je kan dat bedrag nadien vrij wijzigen: zet je de
      // kost van € 90 naar € 60, dan is € 30 van die boeking helemaal van jou. Zonder
      // deze regel viel dat stil weg.
      const rest = bedrag - alGedekt
      if (rest > 0) uitBoekingen.push({ bedrag: rest, persoonIds: tx.persoonIds })
      continue
    }
    aantalBoekingen += 1
    const sleutel = `${tx.datum}|${bedrag}`
    losseBoekingen.set(sleutel, (losseBoekingen.get(sleutel) ?? 0) + 1)
    uitBoekingen.push({ bedrag, persoonIds: tx.persoonIds })
  }

  // Een gedeelde kost zonder koppeling die exact samenvalt met een losse boeking van
  // dezelfde dag: waarschijnlijk dezelfde uitgave, twee keer ingevoerd.
  let mogelijkeDubbels = 0
  for (const kost of kosten) {
    if (kost.ingetrokken || kost.transactieId || !inJaar(kost.datum, jaar)) continue
    if (!perDossier.has(kost.dossierId)) continue
    const sleutel = `${kost.datum}|${kost.bedrag}`
    const aantal = losseBoekingen.get(sleutel) ?? 0
    if (aantal > 0) {
      mogelijkeDubbels += 1
      losseBoekingen.set(sleutel, aantal - 1)
    }
  }

  const boekingRijen = uitgavenPerPersoon(uitBoekingen, leden, labels)
  const dossierRijen = uitgavenPerPersoon(uitDossiers, leden, labels)

  const samen = new Map<string, KindkostenRegel>()
  const sleutelVan = (id: string | null) => id ?? GEZIN

  for (const rij of boekingRijen) {
    samen.set(sleutelVan(rij.id), {
      id: rij.id,
      naam: rij.naam,
      bedrag: rij.bedrag,
      uitBoekingen: rij.bedrag,
      uitDossiers: 0,
      gedeeld: rij.gedeeld,
      metOvergeslagen: overgeslagenIds.has(sleutelVan(rij.id)),
    })
  }
  for (const rij of dossierRijen) {
    const bestaand = samen.get(sleutelVan(rij.id))
    if (bestaand) {
      bestaand.bedrag += rij.bedrag
      bestaand.uitDossiers += rij.bedrag
      // Élk dossierbedrag is een berekend aandeel: het bestaat nergens als boeking.
      bestaand.gedeeld = true
      continue
    }
    samen.set(sleutelVan(rij.id), {
      id: rij.id,
      naam: rij.naam,
      bedrag: rij.bedrag,
      uitBoekingen: 0,
      uitDossiers: rij.bedrag,
      gedeeld: true,
      metOvergeslagen: overgeslagenIds.has(sleutelVan(rij.id)),
    })
  }

  // Van groot naar klein, met "Het gezin" altijd achteraan — dezelfde volgorde als
  // in `uitgavenPerPersoon`, zodat de twee schermen dezelfde taal spreken.
  const regels = [...samen.values()]
    .filter((r) => r.bedrag > 0)
    .sort((a, b) => {
      if (a.id === null) return 1
      if (b.id === null) return -1
      return b.bedrag - a.bedrag || a.naam.localeCompare(b.naam)
    })

  return {
    jaar,
    regels,
    totaal: regels.reduce((som, r) => som + r.bedrag, 0),
    aantalBoekingen,
    aantalDossierkosten,
    aantalOvergeslagen,
    mogelijkeDubbels,
  }
}

/**
 * Mag deze rij doorklikken naar de boekingen erachter?
 *
 * Alleen wanneer het bedrag ÉÉN op één uit gewone boekingen komt. Vier redenen om
 * het niet te doen, en ze leveren allemaal een lijst op die iets anders toont dan
 * de rij:
 *
 *  1. er zit een aandeel uit een dossier in — dat bestaat nergens als boeking;
 *  2. een uitgave hing aan meerdere gezinsleden en werd gedeeld;
 *  3. er is een boeking (deels) vervangen door een gekoppelde gedeelde kost — die
 *     zou in de gefilterde lijst wél voor haar volle bedrag opduiken;
 *  4. het gezinslid bestaat niet meer. Dan heeft de chip boven de lijst geen naam,
 *     en twee zulke rijen heten allebei "Onbekend gezinslid" — dezelfde reden als
 *     op de Analyse-pagina sinds ronde 49.
 */
export function magDoorklikken(regel: KindkostenRegel, leden: Gezinslid[] = []): boolean {
  if (regel.uitDossiers !== 0 || regel.gedeeld || regel.metOvergeslagen) return false
  if (regel.id === null) return true
  return leden.some((l) => l.id === regel.id)
}

/**
 * De jaren waarover dit scherm iets kan zeggen, nieuwste eerst.
 *
 * Het huidige jaar staat er altijd bij, ook wanneer er nog niets in staat: anders
 * opent het scherm op een leeg jaar zonder dat je ergens heen kan.
 */
export function beschikbareKindjaren(
  transacties: Transactie[],
  gedeeldeKosten: GedeeldeKost[],
  vandaagISO: string,
): number[] {
  const jaren = new Set<number>([Number(vandaagISO.slice(0, 4))])
  const voegToe = (datum: string) => {
    const jaar = Number(datum.slice(0, 4))
    if (Number.isFinite(jaar) && jaar > 1900) jaren.add(jaar)
  }
  for (const tx of transacties) voegToe(tx.datum)
  for (const kost of gedeeldeKosten) if (!kost.ingetrokken) voegToe(kost.datum)
  return [...jaren].sort((a, b) => b - a)
}
