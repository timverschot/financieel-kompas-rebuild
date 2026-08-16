import type {
  Budget,
  Dossier,
  Garantie,
  Maandafsluiting,
  Onderhoudsbijdrage,
  TerugkerendePost,
  Transactie,
} from '../data/schema'
import { uitgavenInMaand } from './budget'
import { garantieStatus } from './garantie'
import { maandVooruitblik } from './vooruitblik'
import { alsBijdrageInvoer, bouwOpbouw, laatsteAanpassing } from './onderhoudsbijdrage'
import { openMaanden } from './maandafsluiting'
import { maandJaarLabel } from './datum'
import type { DossierSoort } from './dossiersoort'

// De rekenkern achter het belletje in de bovenbalk.
//
// Waarom apart: tot nu toe zat er één regel logica in App.tsx (budget boven 85%),
// en die stond alleen in de desktopweergave. Op een telefoon kreeg je dus nooit
// een signaal. Door de logica hier te zetten, is ze (a) zuiver en los testbaar,
// en (b) op élk schermformaat exact dezelfde.
//
// Zuiver en deterministisch: "vandaag" wordt altijd meegegeven, nooit binnenin
// opgevraagd.

/** De grens waarboven een budget een waarschuwing geeft, in procent. */
export const STANDAARD_BUDGETDREMPEL = 85

/** De keuzes die de gebruiker in Instellingen krijgt (procent). */
export const BUDGETDREMPELS = [70, 75, 80, 85, 90, 95, 100]

/** Een garantie die binnen zoveel dagen verloopt, wordt dringend. */
const GARANTIE_DRINGEND_DAGEN = 14

/**
 * Hoe lang een indexatie van een onderhoudsbijdrage in het belletje blijft staan.
 *
 * De indexatie gebeurt in België van rechtswege op de verjaardag van de regeling,
 * maar niemand past zijn overschrijving vanzelf aan. Twee maanden is ruim genoeg om
 * het op te merken zonder dat de melding een jaar lang blijft hangen.
 */
const BIJDRAGE_VENSTER_DAGEN = 62

/** Naar welke pagina een melding je brengt. Beide zijn geldige `Pagina`-waarden. */
export type MeldingPagina = 'budget' | 'dossiers' | 'maandafsluiting'

export type MeldingSoort = 'budget-over' | 'budget-bijna' | 'garantie' | 'vastelast' | 'bijdrage' | 'maand'

export type Melding = {
  /** Stabiele sleutel voor React, en handig om in een test te herkennen. */
  id: string
  soort: MeldingSoort
  /** De Nederlandse tekst = de vertaalsleutel (zie i18n). */
  sleutel: string
  params?: Record<string, string | number>
  pagina: MeldingPagina
  /**
   * Welke lade op die pagina open moet. Alleen zinvol voor de Dossiers-pagina,
   * die sinds ronde 29 drie subtabs heeft. Ontbreekt dit, dan blijft de subtab
   * staan waar hij stond.
   */
  subtab?: DossierSoort
  /**
   * Welk dossier geopend moet worden. Zonder dit belandde je op de dossierpagina
   * met een ánder dossier open dan het dossier waarover de melding gaat.
   */
  dossierId?: string
  /** Dringend = rood; anders amber. */
  dringend: boolean
  /**
   * Iets wat je meteen vanuit het paneel kan doen, zonder ergens naartoe te gaan.
   * Een vaste last inboeken herhaal je élke maand voor élke post; daarvoor eerst
   * naar de Plan-pagina moeten navigeren is precies de omweg die de invoerpopup in
   * ronde 21 heeft weggewerkt.
   */
  actie?: { soort: 'boek-vastelast'; postId: string }
}

export type MeldingenInvoer = {
  budgetten: Budget[]
  transacties: Transactie[]
  /** De maand waarover de budgetten gaan, 'JJJJ-MM'. */
  maand: string
  garanties: Garantie[]
  terugkerendePosten: TerugkerendePost[]
  /** 'JJJJ-MM-DD'. */
  vandaagISO: string
  /** Waarschuwingsgrens voor budgetten in procent; standaard 85. */
  drempel?: number
  /** Zet een categorie-id om in een leesbare naam. */
  naamVanCategorie: (id: string) => string
  /** De onderhoudsbijdragen; leeg wanneer er geen dossier met een regeling is. */
  onderhoudsbijdragen?: Onderhoudsbijdrage[]
  /** Alleen om de naam van het dossier in de melding te kunnen zetten. */
  dossiers?: Dossier[]
  /** De maanden die je al afgesloten hebt. Leeg = nog geen enkele. */
  maandafsluitingen?: Maandafsluiting[]
  /**
   * Hoe een bedrag in centen op het scherm hoort te staan.
   *
   * Meegegeven in plaats van hier `formatEuro` te importeren, omdat deze module
   * zuiver blijft: ze bouwt sleutels en parameters, ze kiest geen opmaak. Ontbreekt
   * hij, dan staat er het kale centengetal — zichtbaar fout in plaats van stil fout.
   */
  formatBedrag?: (centen: number) => string
}

// Dringende meldingen eerst, daarna in een vaste volgorde per soort. Zo springt
// de lijst niet rond bij elke herberekening.
const SOORT_ORDE: Record<MeldingSoort, number> = {
  'budget-over': 0,
  'maand': 1,
  'vastelast': 2,
  'bijdrage': 3,
  'garantie': 4,
  'budget-bijna': 5,
}

/** Het aantal hele dagen tussen twee datums in 'JJJJ-MM-DD'. */
function dagenTussen(vanISO: string, totISO: string): number {
  const van = Date.parse(`${vanISO}T00:00:00Z`)
  const tot = Date.parse(`${totISO}T00:00:00Z`)
  if (!Number.isFinite(van) || !Number.isFinite(tot)) return 0
  return Math.round((tot - van) / 86_400_000)
}

export function bouwMeldingen(invoer: MeldingenInvoer): Melding[] {
  const drempel = invoer.drempel ?? STANDAARD_BUDGETDREMPEL
  const uit: Melding[] = []

  // --- Budgetten ---
  for (const b of invoer.budgetten) {
    if (b.bedrag <= 0) continue
    const verbruikt = uitgavenInMaand(invoer.transacties, b.categorieId, invoer.maand)
    const percent = Math.round((verbruikt / b.bedrag) * 100)
    const naam = invoer.naamVanCategorie(b.categorieId)
    // Vergelijken op CENTEN, niet op het afgeronde percentage.
    //
    // Met `percent > 100` gold € 100,40 van een budget van € 100 als 100 % en dus
    // als "bijna op", terwijl de balk op de budgetpagina al rood kleurde (die
    // vergelijkt wél op centen). Twee schermen die iets anders zeggen over exact
    // hetzelfde feit. Het percentage blijft gewoon in de tekst staan.
    if (verbruikt > b.bedrag) {
      uit.push({
        id: `budget-over-${b.id}`,
        soort: 'budget-over',
        sleutel: 'Budget {naam} is overschreden ({pct}%)',
        params: { naam, pct: percent },
        pagina: 'budget',
        dringend: true,
      })
      // Ook de drempelgrens op centen. Met het afgeronde percentage waarschuwde het
      // belletje al bij € 69,50 van een budget van € 100 met drempel 70 % (want
      // 69,5 rondt af naar 70), terwijl de balk op de Budgetpagina daar nog groen
      // stond. Nu zeggen ze allebei hetzelfde.
    } else if (verbruikt >= (b.bedrag * drempel) / 100) {
      uit.push({
        id: `budget-bijna-${b.id}`,
        soort: 'budget-bijna',
        sleutel: 'Budget {naam} is {pct}% verbruikt',
        params: { naam, pct: percent },
        pagina: 'budget',
        dringend: false,
      })
    }
  }

  // --- Garanties die bijna verlopen ---
  for (const g of invoer.garanties) {
    const status = garantieStatus(g.aankoopdatum, g.garantieMaanden, invoer.vandaagISO)
    if (!status.bijnaVerlopen) continue
    uit.push({
      id: `garantie-${g.id}`,
      soort: 'garantie',
      sleutel: 'Garantie op {product} verloopt binnen {n} dag(en)',
      params: { product: g.product, n: status.dagenResterend },
      // De Dossiers-pagina, en daarbinnen de lade met de garanties. Zonder die
      // tweede aanwijzing zou je op de eerste subtab landen (gedeelde kosten) en
      // zelf moeten zoeken waar die aflopende garantie staat.
      pagina: 'dossiers',
      subtab: 'garantie',
      dringend: status.dagenResterend <= GARANTIE_DRINGEND_DAGEN,
    })
  }

  // --- Vaste lasten die deze maand nog niet geboekt zijn ---
  // Hergebruikt bewust `maandVooruitblik`: dat is de enige plek die weet welke
  // posten al geboekt zijn (ook wanneer je ze zelf hebt ingetikt). Een tweede
  // eigen telling zou vroeg of laat uit elkaar lopen met de Vooruitblik-pagina.
  if (invoer.terugkerendePosten.length > 0) {
    const blik = maandVooruitblik(invoer.transacties, invoer.terugkerendePosten, invoer.maand, invoer.vandaagISO)
    // Eén melding PER post, met de naam erbij. Vroeger stond er één regel
    // "{n} vaste last(en) staan nog niet ingeboekt": je wist dan wel dát er iets
    // ontbrak, maar niet wat — en je moest hoe dan ook naar de Plan-pagina om te
    // zien welke. Nu staat de naam er, en kan je ze meteen inboeken.
    for (const id of blik.achterstalligeIds) {
      const post = invoer.terugkerendePosten.find((p) => p.id === id)
      if (!post) continue
      uit.push({
        id: `vastelast-${post.id}`,
        soort: 'vastelast',
        sleutel: '{naam} staat nog niet ingeboekt deze maand',
        params: { naam: post.omschrijving },
        pagina: 'budget',
        dringend: false,
        actie: { soort: 'boek-vastelast', postId: post.id },
      })
    }
  }

  // --- Onderhoudsbijdragen die geïndexeerd zijn ---
  //
  // De aanpassing gebeurt van rechtswege, maar een doorlopende opdracht bij de bank
  // past zichzelf niet aan. Zonder deze melding moest je er zelf aan denken én zelf
  // naar het dossier gaan kijken.
  for (const bijdrage of invoer.onderhoudsbijdragen ?? []) {
    if (bijdrage.geindexeerd === false) continue
    // Een regeling die afgelopen is, indexeert niet meer.
    if (bijdrage.eindDatum !== undefined && bijdrage.eindDatum < invoer.vandaagISO) continue

    const opbouw = bouwOpbouw(alsBijdrageInvoer(bijdrage), invoer.vandaagISO)

    // Een bijdrage waarvan het dossier niet meer bestaat, is een weesrecord: de
    // melding zou een lege naam tonen en je naar een dossier brengen dat er niet is.
    const dossier = invoer.dossiers?.find((d) => d.id === bijdrage.dossierId)
    if (invoer.dossiers !== undefined && dossier === undefined) continue
    const naam = dossier?.naam ?? ''
    const gemeen = {
      pagina: 'dossiers' as const,
      subtab: 'coouderschap' as const,
      dossierId: bijdrage.dossierId,
      dringend: false,
    }

    // Loopt de berekening vast op twee verschillende indexreeksen, dan staat het
    // bedrag stil. Zonder deze melding zou de bijdrage gewoon uit de lijst
    // verdwijnen — geen nieuws, terwijl er juist iets te doen is.
    if (opbouw.indexConflict !== null) {
      uit.push({
        id: `bijdrage-reeks-${bijdrage.id}`,
        soort: 'bijdrage',
        sleutel: 'De onderhoudsbijdrage van {dossier} wordt niet meer geïndexeerd: de indexcijfers komen uit twee verschillende reeksen. Open de regeling om het op te lossen.',
        params: { dossier: naam },
        ...gemeen,
      })
      continue
    }

    const laatsteStap = opbouw.stappen[opbouw.stappen.length - 1]
    if (!laatsteStap) continue
    const dagenGeleden = dagenTussen(laatsteStap.datum, invoer.vandaagISO)
    if (dagenGeleden < 0 || dagenGeleden > BIJDRAGE_VENSTER_DAGEN) continue

    // Wachten op een indexcijfer is iets anders dan een aanpassing die er is: in het
    // eerste geval kan je zélf iets doen (het cijfer bijzetten), in het tweede moet
    // je je overschrijving aanpassen. Eén melding voor allebei zou het verschil
    // wegpoetsen.
    // Een stap is óók 'niet berekend' wanneer alleen de AANVANGSINDEX ontbreekt. Dan
    // is de maand van deze verjaardag niet het probleem, en zou de melding jaar na
    // jaar een maand noemen die de app wél kent. Die twee gevallen dus apart.
    if (opbouw.aanvangsindex === null) {
      uit.push({
        id: `bijdrage-aanvang-${bijdrage.id}`,
        soort: 'bijdrage',
        sleutel: 'De onderhoudsbijdrage van {dossier} kan niet geïndexeerd worden: de app kent geen aanvangsindex voor {maand}. Vul ze in bij de regeling, zoals ze in de akte staat.',
        params: { dossier: naam, maand: opbouw.aanvangsmaand },
        ...gemeen,
      })
      continue
    }
    if (!laatsteStap.berekend) {
      uit.push({
        id: `bijdrage-wacht-${bijdrage.id}`,
        soort: 'bijdrage',
        sleutel: 'De onderhoudsbijdrage van {dossier} moest op {datum} geïndexeerd worden, maar het indexcijfer van {maand} is nog niet bekend.',
        params: { dossier: naam, datum: laatsteStap.datum, maand: laatsteStap.indexmaand },
        ...gemeen,
      })
      continue
    }

    const vorige = laatsteAanpassing(opbouw, bijdrage.basisbedrag)
    // Geen verschil met het vorige bedrag betekent geen nieuws.
    if (vorige === null || vorige.datum !== laatsteStap.datum) continue
    const ervoor = opbouw.stappen.filter((st) => st.berekend && st.datum < laatsteStap.datum)
    const oudBedrag = ervoor.length > 0 ? ervoor[ervoor.length - 1].bedrag : bijdrage.basisbedrag

    uit.push({
      id: `bijdrage-${bijdrage.id}`,
      soort: 'bijdrage',
      sleutel: 'De onderhoudsbijdrage van {dossier} is sinds {datum} geïndexeerd: van {oud} naar {nieuw} per maand.',
      params: {
        dossier: naam,
        datum: laatsteStap.datum,
        oud: (invoer.formatBedrag ?? String)(oudBedrag),
        nieuw: (invoer.formatBedrag ?? String)(laatsteStap.bedrag),
      },
      ...gemeen,
    })
  }

  // --- Een maand die nog niet afgesloten is ---
  //
  // Eén melding voor de OUDSTE openstaande maand, niet één per maand. Wie de app
  // een half jaar niet opende, hoort geen zes regels te zien maar één beginpunt;
  // is die maand rond, dan schuift de melding vanzelf naar de volgende.
  //
  // Alleen wanneer 'maandafsluitingen' meegegeven is: zonder die lijst zou de app
  // elke maand als niet-afgesloten lezen en meteen klagen.
  if (invoer.maandafsluitingen !== undefined) {
    const open = openMaanden(invoer.transacties, invoer.maandafsluitingen, invoer.vandaagISO)
    const oudste = open[0]
    if (oudste !== undefined) {
      uit.push({
        id: `maand-${oudste}`,
        soort: 'maand',
        sleutel:
          open.length > 1
            ? '{maand} is nog niet afgesloten, en de {n} maand(en) daarna ook niet.'
            : '{maand} is nog niet afgesloten.',
        // De maand in woorden, zoals elk ander scherm ze toont. Het kale '2026-05'
        // is precies het soort verschil waardoor twee schermen niet meer op elkaar
        // lijken te slaan.
        params: { maand: maandJaarLabel(oudste), n: open.length - 1 },
        pagina: 'maandafsluiting',
        dringend: false,
      })
    }
  }

  return uit.sort((a, b) => {
    if (a.dringend !== b.dringend) return a.dringend ? -1 : 1
    if (SOORT_ORDE[a.soort] !== SOORT_ORDE[b.soort]) return SOORT_ORDE[a.soort] - SOORT_ORDE[b.soort]
    return a.id.localeCompare(b.id)
  })
}
