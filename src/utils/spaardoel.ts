import type { Overboeking, Rekening, Spaardoel, Transactie } from '../data/schema'
import { saldoOpDatum } from './saldo'
import { datumVoorDoel, maandbedragVoorDoel } from './rekenhulp'

// Het huidige saldo van een rekening. Gebruikt bewust dezelfde rekenkern als de
// vermogensevolutie (utils/saldo.ts), zodat een spaardoel en de grafiek nooit meer
// een ander getal tonen. Sinds ronde 7 tellen ook OVERBOEKINGEN mee: geld dat je
// van je betaal- naar je spaarrekening boekt is de normale manier van sparen, en
// bleef vroeger onzichtbaar in je spaardoel.
export function rekeningSaldo(
  rekeningId: string,
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[] = [],
): number {
  const begin = rekeningen.find((r) => r.id === rekeningId)?.beginsaldo ?? 0
  return saldoOpDatum(rekeningId, begin, transacties, overboekingen)
}

export type SpaardoelVoortgang = { huidig: number; doel: number; resterend: number; fractie: number }

// De voortgang van een spaardoel. Is er een rekening aan gekoppeld, dan komt het
// huidige bedrag uit het saldo van die rekening; anders uit het manueel
// bijgehouden bedrag. Alles in centen. 'fractie' zit tussen 0 en 1.
export function spaardoelVoortgang(
  doel: Spaardoel,
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[] = [],
): SpaardoelVoortgang {
  const huidig = doel.gekoppeldeRekeningId
    ? rekeningSaldo(doel.gekoppeldeRekeningId, rekeningen, transacties, overboekingen)
    : doel.huidigBedrag
  const resterend = Math.max(doel.doelbedrag - huidig, 0)
  const fractie = doel.doelbedrag > 0 ? Math.min(Math.max(huidig / doel.doelbedrag, 0), 1) : 0
  return { huidig, doel: doel.doelbedrag, resterend, fractie }
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
  overboekingen: Overboeking[] = [],
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

  const beginsaldo = rekeningen.find((r) => r.id === rekeningId)?.beginsaldo ?? 0
  const toen = saldoOpDatum(rekeningId, beginsaldo, transacties, overboekingen, begin)
  const nu = saldoOpDatum(rekeningId, beginsaldo, transacties, overboekingen, eind)
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
