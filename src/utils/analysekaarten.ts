// Welke verdelingskaarten je op Analyse › Verdeling wil zien (ronde 81 —
// "Minder tegelijk", deel twee).
//
// ⚠ RONDE 75 ZETTE PAGINA'S UIT, DEZE RONDE KAARTEN BINNEN ÉÉN PAGINA. Dat stond als
// tweede open punt in de nota van die ronde, en Analyse › Verdeling is de
// duidelijkste plek: met volledige gegevens staan daar VIER donutkaarten onder
// elkaar, elk met een grafiek én een lijst. Wie er maar één van gebruikt, scrolt
// drie keer langs iets wat hij nooit nodig heeft. Timothy's tweede struikelblok,
// letterlijk.
//
// ⚠ DE EERSTE KAART STAAT ER BEWUST NIET IN. "Verdeling per hoofdcategorie" is
// waarvoor dit tabblad bestaat; wie die kan uitzetten, houdt een leeg tabblad over.
// Dezelfde veiligheidsregel als bij `APP_ONDERDELEN` (ronde 75), waar Overzicht,
// Boekingen, Budget, Rekeningen, Je situatie en Instellingen om die reden niet
// uitzetbaar zijn.
//
// ⚠ EEN CHIP BESTAAT ALLEEN VOOR EEN KAART DIE ER OOK KÁN STAAN — zie
// `kiesbareKaarten`. De eerste opzet van deze ronde deed het anders: alle drie de
// chips altijd, en een grijze zin wanneer je er een aanzette waar geen gegevens voor
// waren. Twee nakijkrondes rekenden na dat die zinnen zo goed als onbereikbaar
// waren. `byItem` is leeg precies wanneer `byOv` leeg is (allebei lopen ze over
// dezelfde `relevanteLijnen`), en dan verschijnt het hele blok niet. `byWinkel` is
// alleen leeg wanneer élke boeking in de periode zónder omschrijving zit — het
// invoerformulier laat dat niet toe en de bankimport vult `TERUGVALNAAM` in, dus dat
// kan hooguit bij herstelde of gemigreerde gegevens. En de derde zin verscheen alleen
// bij wie helemaal géén gezinsleden heeft, met als advies "duid er een aan" terwijl er
// niets aan te duiden viel. Een schakelaar die niet bestaat, hoeft ook niet uitgelegd
// te worden — maar wat er dán wél gezegd hoort te worden, staat in de chiprij zelf:
// "Kaarten waarvoor in deze periode niets te tonen valt, staan hier niet bij."
//
// ⚠ EN GEEN `uitleg` PER CHIP, anders dan bij `APP_ONDERDELEN`. Daar staat bij elk
// vinkje een zin, omdat "Fiscaal" op zichzelf niet zegt wat er achter die pagina zit.
// Hier draagt elke chip exact het kopwoord van de kaart die ze bedient ("Per winkel"
// ↔ "Uitgaven per winkel"), en ze staat vlak boven die kaarten. De uitleg is de kaart
// zelf.

import type { Richting } from './analyse'

export const ANALYSE_KAART_IDS = ['subcategorie', 'winkel', 'gezinslid'] as const
export type AnalyseKaartId = (typeof ANALYSE_KAART_IDS)[number]

/**
 * De chipnaam van een kaart.
 *
 * ⚠ RICHTINGAFHANKELIJK, en dat is geen franje. De winkelkaart heet bij inkomsten
 * "Inkomsten per bron", want je loon komt niet van een winkel. Met een vaste
 * chipnaam stond er op dat tabblad een chip "Per winkel" boven een kaart "Inkomsten
 * per bron", zonder één woord dat de twee verbindt.
 */
export function kaartLabel(id: AnalyseKaartId, richting: Richting): string {
  if (id === 'winkel') return richting === 'uitgave' ? 'Per winkel' : 'Per bron'
  return id === 'subcategorie' ? 'Per subcategorie' : 'Per gezinslid'
}

/** Mag deze kaart getoond worden? */
export function toontKaart(id: AnalyseKaartId, verborgen: readonly AnalyseKaartId[]): boolean {
  return !verborgen.includes(id)
}

/**
 * De nieuwe lijst na één tik op een chip.
 *
 * Zuiver, net als `wisselPagina` (ronde 75) en `volgendeVerborgenLijst` (ronde 60):
 * de component hoeft niets over verzamelingen te weten en de regel is apart te
 * testen.
 */
export function wisselKaart(verborgen: readonly AnalyseKaartId[], id: AnalyseKaartId): AnalyseKaartId[] {
  return verborgen.includes(id) ? verborgen.filter((v) => v !== id) : [...verborgen, id]
}

/**
 * Welke chips er te zien zijn: die van de kaarten waarvoor er gegevens zijn.
 *
 * ⚠ Op DATA en niet op je keuze. Zet je een kaart uit, dan blijft haar chip staan
 * (uitgedrukt, met `aria-pressed="false"`) — anders zou de knop waarmee je hem
 * terugzet, verdwijnen op het moment dat je hem indrukt. Verdwijnt de chip toch,
 * dan is dat omdat er in deze periode niets te tonen valt, en dan valt er ook niets
 * te kiezen.
 *
 * ⚠ Dit houdt ook een oudere beslissing overeind die in AnalyseSectie.tsx staat
 * opgeschreven: zonder ingestelde gezinsleden blijft alles over gezinsleden weg,
 * "het zou dan alleen maar verwarren".
 *
 * ⚠ In de praktijk valt 'subcategorie' hier nooit weg wanneer het blok überhaupt
 * verschijnt: `byItem` is leeg precies wanneer `byOv` leeg is, en dan is er niets te
 * verdelen. De controle is dus een waarborg en geen dagelijkse werking — dat staat
 * hier zodat een lezer niet denkt dat alle drie de chips even vaak wegvallen.
 */
export function kiesbareKaarten(gevuld: Readonly<Record<AnalyseKaartId, boolean>>): AnalyseKaartId[] {
  return ANALYSE_KAART_IDS.filter((id) => gevuld[id])
}

const UITZETBAAR: ReadonlySet<string> = new Set(ANALYSE_KAART_IDS)

/**
 * Leest een bewaarde lijst en gooit weg wat vandaag geen uitzetbare kaart is.
 *
 * ⚠ Nodig omdat de voorkeur in `localStorage` staat en dus een oudere versie van de
 * app kan overleven — dezelfde reden als bij `keurVerborgen` in ronde 75. Verdwijnt
 * een kaart ooit uit deze lijst, dan hoort een oude voorkeur haar opvolger niet stil
 * weg te drukken.
 */
export function keurVerborgenKaarten(ruw: unknown): AnalyseKaartId[] {
  if (!Array.isArray(ruw)) return []
  const uit: AnalyseKaartId[] = []
  for (const item of ruw) {
    if (typeof item !== 'string') continue
    if (UITZETBAAR.has(item) && !uit.includes(item as AnalyseKaartId)) uit.push(item as AnalyseKaartId)
  }
  return uit
}
