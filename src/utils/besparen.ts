import type { Transactie } from '../data/schema'
import { itemPerId } from '../data/categorieen/zoek'
import { categorieBedragen } from './transactie'
import { inPeriode, type Periode } from './analyse'
import { percentageZinvol } from './verhouding'

// De vier domeinen waar voor een gemiddeld gezin het meeste te besparen valt:
// boodschappen, energie, telecom en verzekeringen. Het idee komt uit
// consumentenonderzoek naar budgetbeheer; hier is het gewoon een vaste,
// begrijpelijke bril op je eigen cijfers.
//
// Waarom een aparte laag en niet gewoon de hoofdcategorieën? Twee van de vier
// zitten NIET op het niveau van een hoofdcategorie: energie en verzekeringen
// zijn mid-categorieën binnen 'Woning en vaste lasten', en telecom zit in
// 'Abonnementen en multimedia'. Deze module rolt daarom zelf op — via de
// hoofd-id's (ov-*) én de mid-id's (cat-*) samen.
//
// Zuiver en los testbaar: geen datum/klok binnenin, alles komt via de periode.

export type BesparingsdomeinSleutel = 'boodschappen' | 'energie' | 'telecom' | 'verzekeringen'

export type Besparingsdomein = {
  sleutel: BesparingsdomeinSleutel
  /** Weergavenaam (vertaalsleutel = de Nederlandse tekst). */
  naam: string
  /** Eén concrete tip, ook een vertaalsleutel. */
  tip: string
  /** Hoofdcategorieën die volledig meetellen. */
  hoofdIds: string[]
  /** Mid-categorieën (cat-*) die meetellen. */
  catIds: string[]
  /** Vaste kleur, zodat cijfer en balk uit hetzelfde data-object komen. */
  kleur: string
}

export const BESPARINGSDOMEINEN: Besparingsdomein[] = [
  {
    sleutel: 'boodschappen',
    naam: 'Boodschappen',
    tip: 'Vergelijk de prijzen van de winkels in je buurt en overloop je kassabonnen.',
    hoofdIds: ['ov-voeding', 'ov-drank', 'ov-huishouden-en-verzorging'],
    catIds: [],
    kleur: '#F59E0B',
  },
  {
    sleutel: 'energie',
    naam: 'Energie',
    tip: 'Pas je verbruik aan en vergelijk de contracten van de leveranciers.',
    hoofdIds: [],
    catIds: ['cat-energie-en-nutsvoorzieningen'],
    kleur: '#C1502E',
  },
  {
    sleutel: 'telecom',
    naam: 'Telecom en abonnementen',
    tip: 'Vergelijk de pakketten voor internet, tv en gsm — en schrap wat je niet gebruikt.',
    hoofdIds: [],
    catIds: ['cat-abonnementen-en-multimedia', 'cat-x-digitale-abonnementen'],
    kleur: '#2C6CB0',
  },
  {
    sleutel: 'verzekeringen',
    naam: 'Verzekeringen',
    tip: 'Vergelijk je polissen; vooral auto en hospitalisatie schelen vaak veel.',
    hoofdIds: [],
    catIds: ['cat-verzekeringen'],
    kleur: '#3E7C7B',
  },
]

/**
 * De (Nederlandse) naam van een besparingsdomein, of null bij een onbekende
 * sleutel. Gebruikt door het domeinfilter in de transactielijst, zodat daar geen
 * tweede lijst met namen ontstaat die uit de pas kan lopen.
 */
export function naamVanBesparingsdomein(sleutel: string): string | null {
  return BESPARINGSDOMEINEN.find((d) => d.sleutel === sleutel)?.naam ?? null
}

// Zoekt bij welk domein een opgeslagen categorie-id hoort, of null.
// Een id kan drie dingen zijn: een hoofdcategorie (ov-*), een ingebouwd item
// (dan kennen we via itemPerId zowel zijn mid- als zijn hoofdcategorie), of een
// eigen categorie van de gebruiker (die valt hier bewust buiten — we verzinnen
// niet waar iemands eigen categorie thuishoort).
export function domeinVanCategorie(id: string | undefined): BesparingsdomeinSleutel | null {
  if (!id) return null
  const item = itemPerId(id)
  const hoofdId = item ? item.hoofdId : id
  const catId = item ? item.categorieId : id
  for (const d of BESPARINGSDOMEINEN) {
    if (d.hoofdIds.includes(hoofdId)) return d.sleutel
    if (d.catIds.includes(catId)) return d.sleutel
  }
  return null
}

export type DomeinUitgave = {
  sleutel: BesparingsdomeinSleutel
  naam: string
  tip: string
  kleur: string
  /** Centen, positief. */
  bedrag: number
}

// Uitgaven per besparingsdomein binnen een periode. Telt op REGELNIVEAU (via
// categorieBedragen), zodat een gesplitst kassaticket exact zijn deel bijdraagt —
// dezelfde regel als in het maandoverzicht en de donuts.
export function uitgavenPerBesparingsdomein(transacties: Transactie[], periode: Periode): DomeinUitgave[] {
  const som = new Map<BesparingsdomeinSleutel, number>()
  for (const t of transacties) {
    if (!inPeriode(t.datum, periode)) continue
    for (const regel of categorieBedragen(t)) {
      if (regel.bedrag >= 0) continue // enkel uitgaven
      const sleutel = domeinVanCategorie(regel.categorieId)
      if (!sleutel) continue
      som.set(sleutel, (som.get(sleutel) ?? 0) + -regel.bedrag)
    }
  }
  // Vaste volgorde (die van BESPARINGSDOMEINEN), niet op bedrag: het is een
  // checklist, geen ranglijst. Zo staat energie altijd op dezelfde plaats.
  return BESPARINGSDOMEINEN.map((d) => ({
    sleutel: d.sleutel,
    naam: d.naam,
    tip: d.tip,
    kleur: d.kleur,
    bedrag: som.get(d.sleutel) ?? 0,
  }))
}

/**
 * Eén besparingsdomein, vergeleken met de vorige even lange periode.
 *
 * Waarom deze uitbreiding er is: het blok toonde vier bedragen met een algemene
 * tip ("vergelijk je polissen"). Dat is informatie die je ook uit de ranglijst
 * haalt, zonder norm en zonder aanleiding om iets te doen. Een bedrag alleen zegt
 * niets — pas een VERGELIJKING zegt iets: is dit meer of minder dan de vorige keer,
 * en hoeveel scheelt dat op een jaar?
 *
 * We vergelijken bewust met de vorige VERGELIJKBARE periode (dezelfde bron als
 * "Stijgers en dalers"), niet met een vast gemiddelde over zes maanden: zo volgt
 * het blok de periode die je bovenaan koos, in plaats van er stilzwijgend van af te
 * wijken.
 */
export type DomeinVergelijking = DomeinUitgave & {
  /** Hetzelfde domein in de vorige periode; null wanneer die er niet is. */
  vorig: number | null
  /** Huidig min vorig, in centen. Positief = duurder geworden. */
  verschil: number | null
  /**
   * Het verschil in procent van de vorige periode. Null wanneer er geen vorige
   * periode is, of wanneer je toen niets uitgaf — dan is "oneindig procent meer"
   * een misleidend getal en tonen we liever alleen het bedrag.
   *
   * ⚠ RONDE 104 — EN OOK NULL WANNEER JE TOEN BIJNA NIETS UITGAF. Die redenering hierboven
   * hield op bij nul, en dat was te vroeg: € 0,50 vorige maand tegenover € 400,00 deze
   * maand gaf **"▲ € 399,50 (79900%)"**. Vijftig cent is even misleidend als nul. De grens
   * staat in `utils/verhouding.ts`, samen met de twee andere schermen die dezelfde fout
   * maakten. Het BEDRAG blijft altijd staan — dat is het cijfer dat wél klopt.
   */
  procent: number | null
}

export function vergelijkBesparingsdomeinen(
  transacties: Transactie[],
  periode: Periode,
  vorigePeriode: Periode | null,
): DomeinVergelijking[] {
  const nu = uitgavenPerBesparingsdomein(transacties, periode)
  // ⚠ RONDE 106 — EEN PERIODE ZONDER ENKELE BOEKING IS GEEN VERGELIJKING. Het kalenderbereik
  // van de vorige maand bestaat altijd, ook wanneer de app toen nog niet bestond. Bij je
  // allereerste boeking ooit stond er dan "Sterkst gestegen: Boodschappen, € 400,00 meer" met
  // een rood ▲ en "Houdt dit een jaar aan, dan kost het € 4.800,00 extra" — tegenover een
  // maand waarin niets bestond. En de lege domeinen kregen "Even veel als de vorige periode",
  // een geruststelling over datzelfde niets.
  //
  // ⚠ WEL ÉÉN BOEKING IS GENOEG, in welke categorie ook. Boekte je vorige maand alleen je
  // huur, dan is "je gaf toen niets uit aan energie" een echt gegeven en hoort het te tellen.
  // Alleen een periode waarin je HELEMAAL niets boekte, telt als "geen vorige periode".
  const vorigeIsLeeg = vorigePeriode !== null && !transacties.some((t) => inPeriode(t.datum, vorigePeriode))
  if (!vorigePeriode || vorigeIsLeeg) return nu.map((d) => ({ ...d, vorig: null, verschil: null, procent: null }))

  const toen = new Map(uitgavenPerBesparingsdomein(transacties, vorigePeriode).map((d) => [d.sleutel, d.bedrag]))
  return nu.map((d) => {
    const vorig = toen.get(d.sleutel) ?? 0
    const verschil = d.bedrag - vorig
    return {
      ...d,
      vorig,
      verschil,
      procent: percentageZinvol(vorig, d.bedrag) ? Math.round((verschil / vorig) * 100) : null,
    }
  })
}
