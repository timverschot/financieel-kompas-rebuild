// Welke kaarten je op het Overzicht wil zien (ronde 90 — "Minder tegelijk", deel drie).
//
// ⚠ HET DERDE DEEL VAN DEZELFDE AFSPRAAK. Ronde 75 zette PAGINA'S uit, ronde 81 KAARTEN
// binnen Analyse › Verdeling, en de nota van die ronde noemde het Overzicht met zoveel
// woorden als wat er nog lag. Met volledige gegevens droeg die pagina vóór deze ronde op een
// telefoon ZEVEN blokken onder elkaar — het maandblok, de twee donuts, je recente boekingen,
// de maandgrafiek, "Wat komt eraan" en het rapport; geteld in de DOM, niet uit het hoofd. Op
// een breed scherm staan de twee donuts naast elkaar en komt de zijkolom erbij. Het is
// bovendien de pagina waar je LANDT: Timothy's tweede struikelblok op de plek waar hij het
// vaakst voorkomt.
//
// ⚠ HET MAANDBLOK STAAT ER BEWUST NIET IN. Saldo, Inkomsten, Uitgaven en Netto zijn
// waarvoor deze pagina bestaat; wie die kan uitzetten, houdt een lege startpagina over.
// Dezelfde veiligheidsregel als bij `APP_ONDERDELEN` (ronde 75, waar Overzicht zelf om die
// reden niet uitzetbaar is) en bij `ANALYSE_KAART_IDS` (ronde 81, waar de verdeling per
// hoofdcategorie blijft staan).
//
// ⚠ EN DE ZIJKOLOM OOK NIET. Die verschijnt alleen op een breed scherm en vult daar de
// ruimte naast het raster; op een telefoon bestaat ze niet. Een chip voor iets wat de helft
// van de tijd niet bestaat, is een schakelaar die niets lijkt te doen.
//
// ⚠ EEN CHIP BESTAAT ALLEEN VOOR EEN KAART DIE ER OOK KÁN STAAN — zie `kiesbareKaarten` in
// utils/analysekaarten.ts, waar ronde 81 die les duur betaalde. Hier ligt dat anders dan
// daar, en dat is het vermelden waard: de twee donutkaarten BLIJVEN STAAN zonder cijfers
// (met een lege toestand die uitlegt hoe je begint), want anders zag een nieuwe gebruiker
// niet eens dát er een uitgavengrafiek bestaat. Hun chip hoort er dus ook altijd te zijn.
// Alleen "Wat komt eraan" tekent zichzelf niet op een lege app.

export const OVERZICHT_KAART_IDS = ['uitgaven', 'inkomsten', 'recent', 'maandgrafiek', 'toekomst', 'rapport'] as const
export type OverzichtKaartId = (typeof OVERZICHT_KAART_IDS)[number]

/**
 * De chipnaam van een kaart.
 *
 * ⚠ ELKE CHIPNAAM KOMT LETTERLIJK IN DE KOPREGEL VOOR VAN DE KAART DIE ZE BEDIENT, net als
 * in ronde 81 ("Per winkel" bij "Uitgaven per winkel"). Een test bewaakt dat. Zo weet je bij
 * het uitzetten welk blok verdwijnt, zonder dat de rij zelf een muur van tekst wordt.
 *
 * ⚠ VIER VAN DE ZES DRAGEN DE VOLLEDIGE KOPREGEL, twee zijn ingekort. Dat is geen willekeur
 * maar een meting: met alle zes voluit beslaat de chiprij in Chromium op een scherm van
 * 360 px 189 px in vijf rijen, met deze twee ingekort 150 px in vier. "Inkomsten en uitgaven
 * per maand" was met 234 px breder dan het scherm zelf en kreeg dus altijd een eigen rij.
 *
 * ⚠ EN "Uitgaven per categorie" WORDT NIET "Uitgaven": dat woord staat pal erboven al als
 * label van een kengetaltegel, met een bedrag ernaast. Eén woord per ding (ronde 66).
 *
 * ⚠ Er staat geen uitlegzin per chip, anders dan bij `APP_ONDERDELEN` (ronde 75): de uitleg
 * is de kaart zelf, en die staat er vlak onder.
 */
export function overzichtKaartLabel(id: OverzichtKaartId): string {
  switch (id) {
    case 'uitgaven':
      return 'Uitgaven per categorie'
    case 'inkomsten':
      return 'Inkomsten per categorie'
    case 'recent':
      return 'Recente boekingen'
    case 'maandgrafiek':
      return 'Per maand'
    case 'toekomst':
      return 'Wat komt eraan'
    case 'rapport':
      return 'Rapport'
  }
}

/** Mag deze kaart getoond worden? */
export function toontOverzichtKaart(id: OverzichtKaartId, verborgen: readonly OverzichtKaartId[]): boolean {
  return !verborgen.includes(id)
}

/**
 * De nieuwe lijst na één tik op een chip.
 *
 * Zuiver, net als `wisselKaart` (ronde 81) en `wisselPagina` (ronde 75): de component hoeft
 * niets over verzamelingen te weten en de regel is apart te testen.
 */
export function wisselOverzichtKaart(
  verborgen: readonly OverzichtKaartId[],
  id: OverzichtKaartId,
): OverzichtKaartId[] {
  return verborgen.includes(id) ? verborgen.filter((v) => v !== id) : [...verborgen, id]
}

/**
 * Welke chips er te zien zijn: die van de kaarten die er ook kunnen staan.
 *
 * ⚠ Op DATA en niet op je keuze. Zet je een kaart uit, dan blijft haar chip staan
 * (uitgedrukt, met `aria-pressed="false"`) — anders zou de knop waarmee je hem terugzet,
 * verdwijnen op het moment dat je hem indrukt. Exact dezelfde regel als in ronde 81.
 */
export function kiesbareOverzichtKaarten(
  gevuld: Readonly<Record<OverzichtKaartId, boolean>>,
): OverzichtKaartId[] {
  return OVERZICHT_KAART_IDS.filter((id) => gevuld[id])
}

/**
 * Het spiegelbeeld: de kaarten die er nu NIET kunnen staan, en waarvoor dus geen chip is.
 *
 * ⚠ Het scherm noemt ze bij naam. Ronde 75 begon met de vaststelling dat kaarten STIL
 * verdwenen zodra er geen gegevens waren — "je ontdekte dus nooit dat de app iets kón" —
 * en een chiprij die er zwijgend eentje weglaat, doet precies dat opnieuw.
 */
export function nietKiesbareOverzichtKaarten(
  gevuld: Readonly<Record<OverzichtKaartId, boolean>>,
): OverzichtKaartId[] {
  return OVERZICHT_KAART_IDS.filter((id) => !gevuld[id])
}

const UITZETBAAR: ReadonlySet<string> = new Set(OVERZICHT_KAART_IDS)

/**
 * Leest een bewaarde lijst en gooit weg wat vandaag geen uitzetbare kaart is.
 *
 * ⚠ Nodig omdat de voorkeur in `localStorage` staat en dus een oudere versie van de app kan
 * overleven — dezelfde reden als bij `keurVerborgen` (ronde 75) en `keurVerborgenKaarten`
 * (ronde 81). Verdwijnt een kaart ooit uit deze lijst, dan hoort een oude voorkeur haar
 * opvolger niet stil weg te drukken.
 */
export function keurVerborgenOverzichtKaarten(ruw: unknown): OverzichtKaartId[] {
  if (!Array.isArray(ruw)) return []
  const uit: OverzichtKaartId[] = []
  for (const item of ruw) {
    if (typeof item !== 'string') continue
    if (UITZETBAAR.has(item) && !uit.includes(item as OverzichtKaartId)) uit.push(item as OverzichtKaartId)
  }
  return uit
}
