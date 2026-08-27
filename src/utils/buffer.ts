import type { Overboeking, Rekening, RekeningType, TerugkerendePost, Transactie, Waardering } from '../data/schema'
import { saldoVanRekening } from './saldo'
import { isGestopt, isNogNietBegonnen, maandbedrag } from './vastelast'

/**
 * Boven hoeveel maanden buffer de app geen exact getal meer noemt (ronde 104).
 *
 * ⚠ Een KEUZE, geen feit. Twee jaar vaste lasten opzij is in elk advies dat ik ken ruim
 * boven wat een noodbuffer moet zijn; wat erboven staat, zegt vooral iets over hoe volledig
 * je opstelling is. Wie zijn app net opzet, als eerste ding Netflix invult en € 5.000 op
 * zijn spaarrekening heeft, kreeg te lezen: **"5.050,5 maanden buffer"** — ruim vierhonderd
 * jaar. Het cijfer is niet fout gerekend, maar het is geen oordeel meer.
 *
 * ⚠ RONDE 105 — DAAROM STAAT HET HIER EN NIET IN EEN COMPONENT. Het plafond stond in
 * `BufferRegel.tsx` en werd daardoor maar op één van de twee plaatsen toegepast: het
 * Overzicht zei "meer dan 24 maanden", Je situatie zei over dezelfde cijfers "5.050,5
 * maanden". Eén getal, twee schermen, twee antwoorden. Wie dit cijfer toont, haalt de
 * grens hier.
 */
export const BUFFER_PLAFOND = 24

// "Hoelang kom ik toe als er even niets binnenkomt?"
//
// Dit is het enige vooruitziende cijfer dat verder kijkt dan de huidige maand.
// De Vooruitblik zegt hoe déze maand eindigt; dit zegt hoeveel maanden je vaste
// lasten je spaargeld nog kan dragen. Precies het gat dat in de kritiek op
// budget-apps "future planning" heet, en alle cijfers ervoor bestonden al.
//
// Twee bewuste keuzes in de definitie:
//  1. **De vaste lasten** zijn de maatstaf, niet je gemiddelde totale uitgaven.
//     Ze zijn wat je zélf als terugkerend hebt ingevoerd, dus het is een cijfer
//     dat je kan navertellen. Het is ook de ondergrens: eten en tanken komen daar
//     nog bij. Daarom heet het cijfer nadrukkelijk "je vaste lasten", niet
//     "je leven".
//  2. **Opneembaar geld** is spaar + cash. Een termijnrekening staat vast en
//     effecten schommelen; die meerekenen zou de buffer te rooskleurig maken.
//     Een betaalrekening blijft er bewust buiten: dat is je werkkapitaal, geen
//     buffer.
//
// Zuiver en deterministisch: 'vandaagISO' gaat er altijd in.

/** De rekeningtypes die als opneembare buffer gelden. */
export const BUFFERTYPES: RekeningType[] = ['spaar', 'cash']

export type Buffer = {
  /** Som van de terugkerende uitgaven per maand, in centen (positief). */
  vasteLastenPerMaand: number
  /** Saldo op de spaar- en cash-rekeningen vandaag, in centen. */
  beschikbaar: number
  /** Hoeveel maanden je toekomt. Null wanneer er geen vaste lasten zijn. */
  maanden: number | null
  /**
   * Of het zinvol is dit te tonen. False wanneer er geen rekening als spaar of
   * cash gemarkeerd staat, of wanneer er geen vaste lasten ingevoerd zijn: dan
   * zou het cijfer nul of oneindig zijn, en dat zegt niets over je situatie.
   */
  bruikbaar: boolean
}

export function bepaalBuffer(
  rekeningen: Rekening[],
  transacties: Transactie[],
  overboekingen: Overboeking[],
  terugkerendePosten: TerugkerendePost[],
  waarderingen: Waardering[],
  vandaagISO: string,
): Buffer {
  // Gearchiveerde rekeningen blijven erbuiten: dat zijn afgesloten rekeningen.
  const bufferRekeningen = rekeningen.filter((r) => !r.gearchiveerd && r.type !== undefined && BUFFERTYPES.includes(r.type))
  const beschikbaar = bufferRekeningen.reduce(
    (som, r) => som + saldoVanRekening(r, transacties, overboekingen, waarderingen, vandaagISO),
    0,
  )

  // Enkel de uitgaven onder de terugkerende posten; een terugkerende inkomst
  // (bv. loon) is geen last en hoort hier niet in.
  //
  // Elke post wordt omgerekend naar één maand: een jaarlijkse verzekering van
  // € 1.200 telt hier als € 100. Nam je het volle bedrag, dan zou je buffer van
  // vijf maanden naar één zakken zodra je die verzekering invoert — en dat is niet
  // waar. Sloeg je haar over, dan zou de buffer te rooskleurig zijn. De omrekening
  // staat in utils/vastelast.ts.
  //
  // Een post die gestopt is telt niet meer mee (ronde 38), en een post die nog niet
  // begonnen is evenmin (ronde 71). Dit bestand roept `valtInMaand` bewust niet aan —
  // het wil juist het OMGEREKENDE maandbedrag, ook in maanden waarin de post niet
  // vervalt — dus allebei die controles staan hier apart. Zonder de eerste bleef een
  // opgezegd abonnement je buffercijfer voor altijd omlaag trekken; zonder de tweede
  // trok een halfjaarlijkse premie met "eerste betaling maart 2029" hem vandaag al
  // omlaag voor een kost die nog niet bestaat.
  const dezeMaand = vandaagISO.slice(0, 7)
  const vasteLastenPerMaand = terugkerendePosten.reduce(
    (som, p) =>
      p.bedrag < 0 && !isGestopt(p, dezeMaand) && !isNogNietBegonnen(p, dezeMaand) ? som + -maandbedrag(p) : som,
    0,
  )

  const bruikbaar = bufferRekeningen.length > 0 && vasteLastenPerMaand > 0
  const maanden = vasteLastenPerMaand > 0 ? beschikbaar / vasteLastenPerMaand : null

  return { vasteLastenPerMaand, beschikbaar, maanden, bruikbaar }
}
