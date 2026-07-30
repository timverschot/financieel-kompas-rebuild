import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { saldoVanRekening } from './saldo'

// De rekenkern van een kredietkaart (ronde 43).
//
// Waarom dit bestaat. Een kredietkaart heeft twee klokken die niet gelijk lopen:
//
//   * de AFSLUITDAG — de dag waarop de kaartrekening wordt opgemaakt (bv. de 26e);
//   * de AFBOEKDAG — de dag waarop dat bedrag effectief van je betaalrekening gaat
//     (bv. de 5e van de maand erna).
//
// Tussen die twee dagen loopt de nieuwe periode al, terwijl het afgesloten bedrag
// nog niet betaald is. Je beschikbare krediet houdt dan nog rekening met een
// afrekening die nog moet komen, en het komt pas vrij op de dag dat het bedrag
// effectief afgeboekt wordt. Met alleen een saldo kan de app dat niet uitleggen;
// vandaar deze module.
//
// HET TEKEN. Binnen de app blijft het saldo van een kaart negatief wanneer je iets
// schuldig bent — precies zoals een rekening in het rood. Naar buiten toe geeft
// deze module positieve bedragen: "openstaand € 1.000,00" leest beter dan
// "saldo € -1.000,00", en de gebruiker hoort geen tekenpuzzel op te lossen.
//
// WAT DEZE MODULE NIET DOET: ze kent geen rente, geen kosten en geen gespreide
// terugbetaling. Ze telt wat er geboekt is. Staat er op je kaartafschrift een ander
// bedrag, dan is dat afschrift de waarheid — niet dit scherm.

/** De grenzen van een dagveld. Dezelfde als bij een terugkerende post. */
export const DAG_MIN = 1
export const DAG_MAX = 28

/**
 * Het bedrag van een kaart, van het scherm naar de opslag en terug.
 *
 * In de opslag staat een schuld NEGATIEF, net als een rekening in het rood — daar
 * rekent de hele app mee. Op het scherm vul je gewoon in wat er openstaat, als een
 * positief bedrag. Zonder deze omkering typte je 1000 waar de app "er staat 1000 op
 * deze kaart" van maakte, bleef je volledige limiet beschikbaar terwijl er duizend
 * euro openstond, en telde de kaart ook nog eens als bezit mee in je vermogen.
 *
 * Een minteken blijft toegelaten en betekent dan het omgekeerde: een tegoed op de
 * kaart. Dat komt zelden voor, maar het hoort mogelijk te blijven.
 *
 * De omkering is haar eigen tegenpool, maar ze staat hier bewust als twee functies
 * met een naam: `-centen` op twee plaatsen in een formulier is precies het soort
 * regel waar later iemand een min te veel of te weinig in zet.
 */
export function kaartbedragNaarOpslag(centen: number): number {
  // De nul apart: `-0` bestaat in JavaScript, komt door elke controle heen, en
  // wordt dan als "€ -0,00" afgedrukt op het scherm van iemand die netjes 0 invulde.
  return centen === 0 ? 0 : -centen
}
export function kaartbedragUitOpslag(centen: number): number {
  return centen === 0 ? 0 : -centen
}

/** 'JJJJ-MM-DD' voor een jaar, maand (1-12) en dag. */
function datumVan(jaar: number, maand: number, dag: number): string {
  return `${String(jaar).padStart(4, '0')}-${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
}

/** Een maand verschuiven, met de jaarovergang erbij. */
function verschuifMaand(jaar: number, maand: number, stappen: number): { jaar: number; maand: number } {
  const totaal = jaar * 12 + (maand - 1) + stappen
  return { jaar: Math.floor(totaal / 12), maand: (totaal % 12) + 1 }
}

/**
 * De laatste afsluitdatum op of vóór 'vandaag'.
 *
 * Valt vandaag ná de afsluitdag van deze maand, dan is die van deze maand de
 * laatste; anders die van vorige maand.
 */
export function laatsteAfsluiting(afsluitdag: number, vandaagISO: string): string {
  const [jaar, maand, dag] = vandaagISO.split('-').map(Number)
  if (![jaar, maand, dag].every(Number.isFinite)) return vandaagISO
  if (dag >= afsluitdag) return datumVan(jaar, maand, afsluitdag)
  const vorige = verschuifMaand(jaar, maand, -1)
  return datumVan(vorige.jaar, vorige.maand, afsluitdag)
}

/** De eerstvolgende afsluitdatum ná 'vandaag'. */
export function volgendeAfsluiting(afsluitdag: number, vandaagISO: string): string {
  const [jaar, maand, dag] = vandaagISO.split('-').map(Number)
  if (![jaar, maand, dag].every(Number.isFinite)) return vandaagISO
  if (dag < afsluitdag) return datumVan(jaar, maand, afsluitdag)
  const volgende = verschuifMaand(jaar, maand, 1)
  return datumVan(volgende.jaar, volgende.maand, afsluitdag)
}

/**
 * Wanneer een afsluiting van je betaalrekening gaat.
 *
 * De afboeking komt ná de afsluiting. Ligt de afboekdag later in de maand dan de
 * afsluitdag, dan is het dezelfde maand; anders de maand erna. Zijn beide dagen
 * gelijk, dan gaat het naar de volgende maand — een afboeking op de dag van de
 * afsluiting zelf bestaat in de praktijk niet, en "dezelfde dag" kiezen zou de
 * lopende periode meteen leeg maken.
 */
export function afboekdatumVan(afsluitISO: string, afboekdag: number): string {
  const [jaar, maand, dag] = afsluitISO.split('-').map(Number)
  if (![jaar, maand, dag].every(Number.isFinite)) return afsluitISO
  if (afboekdag > dag) return datumVan(jaar, maand, afboekdag)
  const volgende = verschuifMaand(jaar, maand, 1)
  return datumVan(volgende.jaar, volgende.maand, afboekdag)
}

/** Wat er vandaag van een kaart te zeggen valt. Alle bedragen in centen. */
export type KaartStand = {
  /** Het saldo zoals de app het bewaart: negatief wanneer je iets schuldig bent. */
  saldo: number
  /** Wat je vandaag schuldig bent, positief. Nul wanneer er niets openstaat. */
  openstaand: number
  /** Staat er een tegoed op de kaart (saldo boven nul)? Meestal een tekenfout. */
  tegoed: number
  /** Hoeveel je nog mag opnemen, of null wanneer er geen limiet ingevuld is. */
  beschikbaar: number | null
  /** De laatste afsluitdatum, of null wanneer er geen afsluitdag ingevuld is. */
  afsluitdatum: string | null
  /** Wat er op die afsluitdatum openstond, positief. */
  afgesloten: number
  /** Wat er sinds de afsluiting naar de kaart is overgeboekt, positief. */
  betaaldSindsdien: number
  /**
   * Een overboeking naar de kaart die al geboekt staat mét een datum in de toekomst.
   *
   * Waarom apart. De afboeking valt vaak ná vandaag (afsluiting de 26e, afboeking de
   * 5e), en een boeking in de toekomst telt nergens mee in het saldo. Zonder dit veld
   * bleef er "nog te betalen" staan en bleef de knop staan, ook nadat je net geboekt
   * had — en dan boek je het een tweede keer.
   */
  geplandeBetaling: number
  /** Wat er van de afsluiting nog te betalen is, positief. */
  nogTeBetalen: number
  /**
   * Wat er sinds de afsluiting op de kaart bij gekomen is, betalingen niet meegeteld.
   *
   * Dit is de NETTO beweging, niet enkel de aankopen: een creditnota haalt er weer af
   * en een opname erbij. Zo tellen de drie cijfers van dit blok op — nog te betalen
   * plus dit is wat er vandaag openstaat. Bij enkel de aankopen optellen klopte die
   * som niet meer zodra er iets teruggestort werd.
   */
  lopend: number
  /** Wanneer 'nogTeBetalen' van de betaalrekening gaat, of null. */
  afboekdatum: string | null
  /** De eerstvolgende afsluitdatum, of null. */
  volgendeAfsluitdatum: string | null
  /** Is de afboekdag voorbij terwijl er nog iets openstaat van die afsluiting? */
  teLaat: boolean
}

/**
 * De volledige stand van een kaart op 'vandaagISO'.
 *
 * Werkt ook zonder limiet, zonder afsluitdag en zonder afboekdag: dan blijven de
 * bijbehorende velden op null of nul staan. Zo hoeft het scherm nergens te raden
 * of een cijfer betekenis heeft.
 */
export function kaartStand(
  rekening: Rekening,
  transacties: Transactie[],
  overboekingen: Overboeking[],
  waarderingen: Waardering[],
  vandaagISO: string,
): KaartStand {
  const saldo = saldoVanRekening(rekening, transacties, overboekingen, waarderingen, vandaagISO)
  const openstaand = Math.max(0, -saldo)
  const tegoed = Math.max(0, saldo)
  const limiet = rekening.kredietlimiet
  const beschikbaar = limiet === undefined ? null : Math.max(0, limiet - openstaand)

  const afsluitdag = rekening.afrekendag
  if (afsluitdag === undefined) {
    return {
      saldo,
      openstaand,
      tegoed,
      beschikbaar,
      afsluitdatum: null,
      afgesloten: 0,
      betaaldSindsdien: 0,
      geplandeBetaling: 0,
      nogTeBetalen: 0,
      lopend: 0,
      afboekdatum: null,
      volgendeAfsluitdatum: null,
      teLaat: false,
    }
  }

  const afsluitdatum = laatsteAfsluiting(afsluitdag, vandaagISO)
  const volgendeAfsluitdatum = volgendeAfsluiting(afsluitdag, vandaagISO)

  // Wat er op de afsluitdatum openstond: dát is het bedrag van je kaartafschrift.
  const saldoBijAfsluiting = saldoVanRekening(rekening, transacties, overboekingen, waarderingen, afsluitdatum)
  const afgesloten = Math.max(0, -saldoBijAfsluiting)

  // Wat er sindsdien naar de kaart ging. Alleen overboekingen tellen als betaling:
  // een positieve transactie op de kaart is een terugbetaling van een aankoop, geen
  // aflossing van je afrekening. Ze verlaagt je schuld wél — daarom staat ze in
  // 'openstaand' — maar ze zegt niet dat je je afschrift betaald hebt.
  let betaaldSindsdien = 0
  let geplandeBetaling = 0
  for (const o of overboekingen) {
    if (o.naarRekeningId !== rekening.id) continue
    if (o.datum <= afsluitdatum) continue
    if (o.datum > vandaagISO) geplandeBetaling += o.bedrag
    else betaaldSindsdien += o.bedrag
  }
  const nogTeBetalen = Math.max(0, afgesloten - betaaldSindsdien)

  // Wat er sinds de afsluiting bij kwam. Uitgerekend als het verschil tussen wat er
  // vandaag openstaat en wat er afgesloten was, min de betalingen — zo tellen de
  // cijfers van dit blok op in plaats van naast elkaar te staan.
  const lopend = openstaand - afgesloten + betaaldSindsdien

  const afboekdatum = rekening.afboekdag === undefined ? null : afboekdatumVan(afsluitdatum, rekening.afboekdag)
  const teLaat = afboekdatum !== null && afboekdatum < vandaagISO && nogTeBetalen > 0

  return {
    saldo,
    openstaand,
    tegoed,
    beschikbaar,
    afsluitdatum,
    afgesloten,
    betaaldSindsdien,
    geplandeBetaling,
    nogTeBetalen,
    lopend,
    afboekdatum,
    volgendeAfsluitdatum,
    teLaat,
  }
}
