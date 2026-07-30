import type { Categorie, Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { groepVanCategorie, labelVanCategorie } from '../data/categorieen/resolve'
import {
  jaarVan,
  laatsteDagVanPeriode,
  maandenVanJaar,
  periodeLabel,
  periodeSoort,
} from './datum'
import {
  inkomstenPerCategorie,
  maandInkomsten,
  maandUitgaven,
  uitgavenPerCategorie,
  type CategorieUitgave,
} from './overzicht'
import { centenNaarInvoer } from './format'
import { totaalSaldoVan } from './saldo'
import { categorieBedragen } from './transactie'

// De rekenkern achter het maand- en jaarrapport (ronde 41).
//
// Bewust apart van de opmaak, net zoals `afrekeningOverzicht.ts` los staat van
// `afrekeningPdf.ts`: zo valt elk cijfer in het rapport te testen zonder dat er
// ooit een PDF gebouwd hoeft te worden.
//
// Alle cijfers komen uit de functies die de app op het scherm óók gebruikt
// (`maandInkomsten`, `maandUitgaven`, `uitgavenPerCategorie`, `totaalSaldoVan`).
// Dat is de hele bedoeling: een rapport dat andere getallen toont dan het scherm is
// erger dan geen rapport.

/** Eén boeking in het rapport, met de namen al opgelost. */
export type PeriodeRegel = {
  id: string
  datum: string
  omschrijving: string
  /** De hoofdcategorie, of "Zonder categorie". Bij een gesplitst ticket leeg. */
  categorie: string
  rekening: string
  bedrag: number
  /** Bij een gesplitst ticket: de uitsplitsing als "Voeding -41,20 · Huishouden -12,60". */
  uitsplitsing: string
}

/** Eén maand van een jaarrapport. */
export type PeriodeMaand = { maand: string; label: string; inkomsten: number; uitgaven: number; netto: number }

export type PeriodeOverzicht = {
  periode: string
  soort: 'jaar' | 'maand'
  /** "juli 2026" of "2026". */
  label: string
  /** De dag waarop het saldo gemeten is: de laatste dag van de periode. */
  saldoDatum: string
  aantal: number
  inkomsten: number
  uitgaven: number
  netto: number
  saldo: number
  perCategorieUitgaven: CategorieUitgave[]
  perCategorieInkomsten: CategorieUitgave[]
  regels: PeriodeRegel[]
  /** Alleen bij een jaarrapport: de twaalf maanden. Bij een maandrapport leeg. */
  perMaand: PeriodeMaand[]
}

/**
 * De uitsplitsing van een gesplitst ticket als één regel tekst.
 *
 * Bv. "Voeding -41,20 · Huishouden -12,60". Bewust ZONDER euroteken en zonder iconen:
 * deze tekst gaat naar een PDF, en jsPDF kan emoji in het standaardlettertype niet
 * tonen (zie afrekeningTekst.ts).
 *
 * Twee dingen die hier moeten kloppen, en die eerst niet klopten:
 *
 *  1. De regels tellen op tot het bedrag van de boeking. Daarvoor blijft het TEKEN
 *     staan. Een kassaticket met een positieve regel ertussen (statiegeld, een
 *     korting) gaf anders "Voeding 56,80 · Statiegeld 3,00" onder een rij van
 *     € 53,80 — wie natelde vond zes euro die niet bestond.
 *  2. Regels in dezelfde categorie worden samengevoegd. Anders stond er "Voeding
 *     20,00 · Voeding 15,00" en las het als twee categorieën.
 */
export function uitsplitsingRegel(tx: Transactie, categorieen: Categorie[]): string {
  const regels = categorieBedragen(tx)
  if (regels.length < 2) return ''
  const perNaam = new Map<string, number>()
  for (const r of regels) {
    const naam = labelVanCategorie(r.categorieId, categorieen) ?? groepVanCategorie(r.categorieId, categorieen).naam
    perNaam.set(naam, (perNaam.get(naam) ?? 0) + r.bedrag)
  }
  return [...perNaam.entries()].map(([naam, bedrag]) => `${naam} ${centenNaarInvoer(bedrag)}`).join(' · ')
}

/**
 * Bouwt het volledige rapport van één periode.
 *
 * `periode` is 'JJJJ-MM' voor een maand of 'JJJJ' voor een jaar.
 *
 * Het SALDO is de stand op de laatste dag van de periode, niet die van vandaag.
 * Anders leest een rapport over maart het saldo van juli, en sluit er niets meer op
 * elkaar aan. Ligt de periode in de toekomst, dan is dat cijfer een vooruitblik —
 * daarom staat de peildatum er altijd bij in het rapport zelf.
 */
export function bouwPeriodeOverzicht(
  periode: string,
  transacties: Transactie[],
  categorieen: Categorie[],
  rekeningen: Rekening[],
  overboekingen: Overboeking[] = [],
  waarderingen: Waardering[] = [],
): PeriodeOverzicht {
  const soort = periodeSoort(periode)
  const saldoDatum = laatsteDagVanPeriode(periode)
  const rekeningNaam = new Map(rekeningen.map((r) => [r.id, r.naam]))

  const inPeriode = transacties
    .filter((t) => t.datum.startsWith(periode))
    // Oudste eerst: een rapport leest men chronologisch, ook al staat de app-lijst
    // standaard op nieuwste eerst.
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.omschrijving.localeCompare(b.omschrijving) || a.id.localeCompare(b.id))

  const regels: PeriodeRegel[] = inPeriode.map((tx) => {
    const uitsplitsing = uitsplitsingRegel(tx, categorieen)
    // De categorie komt uit `categorieBedragen` en NIET uit `tx.categorieId`.
    //
    // Waarom dat verschil telt: boek je een kassaticket met één ingevulde regel, dan
    // zet het formulier alleen die regel en géén categorie op de transactie zelf. De
    // tabel "Uitgaven per categorie" telt via `categorieBedragen` en zei dan
    // "Huishouden € 12,00", terwijl de boekingenlijst in hetzelfde document "Zonder
    // categorie" zei. Twee delen van één rapport die elkaar tegenspreken.
    const eenRegel = categorieBedragen(tx)[0]
    return {
      id: tx.id,
      datum: tx.datum,
      // Bij een écht gesplitst ticket staat de uitsplitsing onder de regel; één
      // categorienaam zou dan liegen over waar het geld naartoe ging.
      categorie: uitsplitsing ? '' : groepVanCategorie(eenRegel?.categorieId, categorieen).naam,
      omschrijving: tx.omschrijving,
      rekening: rekeningNaam.get(tx.rekeningId) ?? '',
      bedrag: tx.bedrag,
      uitsplitsing,
    }
  })

  const inkomsten = maandInkomsten(transacties, periode)
  const uitgaven = maandUitgaven(transacties, periode)

  const perMaand: PeriodeMaand[] =
    soort === 'jaar'
      ? maandenVanJaar(jaarVan(periode)).map((maand) => {
          const i = maandInkomsten(transacties, maand)
          const u = maandUitgaven(transacties, maand)
          return { maand, label: periodeLabel(maand), inkomsten: i, uitgaven: u, netto: i - u }
        })
      : []

  return {
    periode,
    soort,
    label: periodeLabel(periode),
    saldoDatum,
    aantal: inPeriode.length,
    inkomsten,
    uitgaven,
    netto: inkomsten - uitgaven,
    saldo: totaalSaldoVan(rekeningen, transacties, overboekingen, waarderingen, saldoDatum),
    perCategorieUitgaven: uitgavenPerCategorie(transacties, categorieen, periode),
    perCategorieInkomsten: inkomstenPerCategorie(transacties, categorieen, periode),
    regels,
    perMaand,
  }
}
