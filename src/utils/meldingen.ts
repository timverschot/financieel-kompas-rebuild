import type { Budget, Garantie, TerugkerendePost, Transactie } from '../data/schema'
import { uitgavenInMaand } from './budget'
import { garantieStatus } from './garantie'
import { maandVooruitblik } from './vooruitblik'

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

/** Naar welke pagina een melding je brengt. Beide zijn geldige `Pagina`-waarden. */
export type MeldingPagina = 'budget' | 'leningen'

export type MeldingSoort = 'budget-over' | 'budget-bijna' | 'garantie' | 'vastelast'

export type Melding = {
  /** Stabiele sleutel voor React, en handig om in een test te herkennen. */
  id: string
  soort: MeldingSoort
  /** De Nederlandse tekst = de vertaalsleutel (zie i18n). */
  sleutel: string
  params?: Record<string, string | number>
  pagina: MeldingPagina
  /** Dringend = rood; anders amber. */
  dringend: boolean
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
}

// Dringende meldingen eerst, daarna in een vaste volgorde per soort. Zo springt
// de lijst niet rond bij elke herberekening.
const SOORT_ORDE: Record<MeldingSoort, number> = {
  'budget-over': 0,
  'vastelast': 1,
  'garantie': 2,
  'budget-bijna': 3,
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
    if (percent > 100) {
      uit.push({
        id: `budget-over-${b.id}`,
        soort: 'budget-over',
        sleutel: 'Budget {naam} is overschreden ({pct}%)',
        params: { naam, pct: percent },
        pagina: 'budget',
        dringend: true,
      })
    } else if (percent >= drempel) {
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
      pagina: 'leningen',
      dringend: status.dagenResterend <= GARANTIE_DRINGEND_DAGEN,
    })
  }

  // --- Vaste lasten die deze maand nog niet geboekt zijn ---
  // Hergebruikt bewust `maandVooruitblik`: dat is de enige plek die weet welke
  // posten al geboekt zijn (ook wanneer je ze zelf hebt ingetikt). Een tweede
  // eigen telling zou vroeg of laat uit elkaar lopen met de Vooruitblik-pagina.
  if (invoer.terugkerendePosten.length > 0) {
    const blik = maandVooruitblik(invoer.transacties, invoer.terugkerendePosten, invoer.maand, invoer.vandaagISO)
    if (blik.aantalAchterstallig > 0) {
      uit.push({
        id: 'vastelast-achterstallig',
        soort: 'vastelast',
        sleutel: '{n} vaste last(en) van deze maand staan nog niet ingeboekt',
        params: { n: blik.aantalAchterstallig },
        pagina: 'budget',
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
