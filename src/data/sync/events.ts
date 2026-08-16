import { z } from 'zod'
import {
  BudgetSchema,
  CategorieSchema,
  AflossingSchema,
  DossierDocumentSchema,
  DossierSchema,
  GarantieSchema,
  GedeeldeKostSchema,
  KindSchema,
  KindrekeningSchema,
  KindrekeningpostSchema,
  LeningSchema,
  OrdeningSchema,
  OverboekingSchema,
  RekeningSchema,
  SpaardoelSchema,
  StreepjescodeSchema,
  SubcategorieSchema,
  TerugkerendePostSchema,
  TransactieSchema,
  VerrekeningSchema,
  WaarderingSchema,
  MaandafsluitingSchema,
  OnderhoudsbijdrageSchema,
  OnderhoudsbetalingSchema,
} from '../schema'

// Een gebeurtenis beschrijft één wijziging. We slaan nooit data over of
// overschrijven; we voegen alleen gebeurtenissen toe (append-only).
export const GebeurtenisSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('transactie.bewaard'), payload: TransactieSchema }),
  z.object({ type: z.literal('transactie.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('rekening.bewaard'), payload: RekeningSchema }),
  z.object({ type: z.literal('rekening.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('categorie.bewaard'), payload: CategorieSchema }),
  z.object({ type: z.literal('categorie.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('budget.bewaard'), payload: BudgetSchema }),
  z.object({ type: z.literal('budget.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('dossier.bewaard'), payload: DossierSchema }),
  z.object({ type: z.literal('dossier.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('gedeeldekost.bewaard'), payload: GedeeldeKostSchema }),
  z.object({ type: z.literal('gedeeldekost.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('verrekening.bewaard'), payload: VerrekeningSchema }),
  z.object({ type: z.literal('verrekening.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('terugkerendepost.bewaard'), payload: TerugkerendePostSchema }),
  z.object({ type: z.literal('terugkerendepost.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('spaardoel.bewaard'), payload: SpaardoelSchema }),
  z.object({ type: z.literal('spaardoel.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('subcategorie.bewaard'), payload: SubcategorieSchema }),
  z.object({ type: z.literal('subcategorie.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('overboeking.bewaard'), payload: OverboekingSchema }),
  z.object({ type: z.literal('overboeking.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('kind.bewaard'), payload: KindSchema }),
  z.object({ type: z.literal('kind.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('kindrekening.bewaard'), payload: KindrekeningSchema }),
  z.object({ type: z.literal('kindrekening.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('kindrekeningpost.bewaard'), payload: KindrekeningpostSchema }),
  z.object({ type: z.literal('kindrekeningpost.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  // Ronde 42 — de onderhoudsbijdrage en haar betalingen.
  z.object({ type: z.literal('onderhoudsbijdrage.bewaard'), payload: OnderhoudsbijdrageSchema }),
  z.object({ type: z.literal('onderhoudsbijdrage.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  // Ronde 43 — de maandafsluiting.
  z.object({ type: z.literal('maandafsluiting.bewaard'), payload: MaandafsluitingSchema }),
  z.object({ type: z.literal('maandafsluiting.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('onderhoudsbetaling.bewaard'), payload: OnderhoudsbetalingSchema }),
  z.object({ type: z.literal('onderhoudsbetaling.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('lening.bewaard'), payload: LeningSchema }),
  z.object({ type: z.literal('lening.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('aflossing.bewaard'), payload: AflossingSchema }),
  z.object({ type: z.literal('aflossing.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('garantie.bewaard'), payload: GarantieSchema }),
  z.object({ type: z.literal('garantie.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('streepjescode.bewaard'), payload: StreepjescodeSchema }),
  z.object({ type: z.literal('streepjescode.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('dossierdocument.bewaard'), payload: DossierDocumentSchema }),
  z.object({ type: z.literal('dossierdocument.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('ordening.bewaard'), payload: OrdeningSchema }),
  z.object({ type: z.literal('ordening.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('waardering.bewaard'), payload: WaarderingSchema }),
  z.object({ type: z.literal('waardering.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
])
export type Gebeurtenis = z.infer<typeof GebeurtenisSchema>

// Een logregel is een gebeurtenis mét herkomst: welk toestel, het hoeveelste
// wijziging van dat toestel (volgnummer), en wanneer (tijdstip). 'hlcL'/'hlcC'
// vormen samen het hybride-logische-klok-stempel dat de samenvoeg-volgorde bepaalt
// (zie hlc.ts). Ze zijn optioneel voor terugwaartse compatibiliteit: oudere
// logregels (of back-ups van vóór deze versie) missen ze; bij het ordenen valt de
// app dan terug op 'tijdstip'.
/**
 * In welke EENHEID de bedragen in een logregel staan.
 *
 * Waarom dit veld bestaat (en waarom het er veel te laat kwam). De app bewaarde
 * geld vroeger als euro's met een komma, en stapte later over op gehele centen.
 * Die overstap gebeurde als een database-migratie: bij het opstarten werd alles
 * omgezet wat op dat moment in het LOKALE logboek stond.
 *
 * Alleen: het logboek is niet lokaal. Het staat ook op Google Drive, en het zit in
 * back-upbestanden. Een regel die van daar binnenkomt NADAT de migratie gedraaid
 * heeft, wordt door niemand nog omgezet — er is geen tweede migratie die haar ziet.
 * En omdat een bedrag gewoon een getal is, kan je van buiten niet zien of `2400`
 * nu € 24,00 of € 2.400,00 betekent.
 *
 * Gevolg in de praktijk: wie de app opnieuw met Drive verbond op een toestel
 * waarvan de browser de lokale gegevens had opgeruimd, kreeg zijn oudste bedragen
 * honderd keer te klein terug. € 2.400 werd € 24. Stil, en precies bij de cijfers
 * waar het om gaat.
 *
 * Vanaf nu draagt elke logregel haar eigen eenheid. Een regel zonder dit veld komt
 * uit de euro-tijd; die wordt NIET toegepast maar geteld en gemeld. Dat is bewust
 * de veilige kant: een bedrag honderd keer verkeerd tonen is erger dan een regel
 * niet tonen en dat luid zeggen.
 */
export const LOG_FORMAAT = 2

/** Een regel zonder `formaat` komt uit de euro-tijd (formaat 1). */
export function formaatVan(r: { formaat?: number }): number {
  return r.formaat ?? 1
}

/** Kunnen we de bedragen in deze regel vertrouwen? */
export function leesbaarFormaat(r: { formaat?: number }): boolean {
  return formaatVan(r) === LOG_FORMAAT
}

/**
 * Waarom een regel niet leesbaar is. De twee gevallen vragen een ander antwoord van
 * de gebruiker, en dus een andere melding.
 *
 * 'te-oud'   — de regel komt uit een versie van vóór deze; haar bedragen kunnen in
 *              euro's staan. Er valt hier niets aan te doen behalve opnieuw beginnen.
 * 'te-nieuw' — de regel komt uit een NIEUWERE versie dan deze app. Dan draait DIT
 *              toestel achter, en de oplossing is de app hier bijwerken. Zonder dit
 *              onderscheid zou de app een regel van morgen "verouderd" noemen en een
 *              advies geven dat nergens toe leidt.
 */
export function formaatOordeel(r: { formaat?: number }): 'ok' | 'te-oud' | 'te-nieuw' {
  const f = formaatVan(r)
  if (f === LOG_FORMAAT) return 'ok'
  return f < LOG_FORMAAT ? 'te-oud' : 'te-nieuw'
}

export const LogregelSchema = z.object({
  id: z.string().min(1),
  toestelId: z.string().min(1),
  volgnummer: z.number().int().nonnegative(),
  tijdstip: z.number(),
  hlcL: z.number().optional(),
  hlcC: z.number().int().nonnegative().optional(),
  // De eenheid van de bedragen in deze regel. Optioneel, want regels van vóór
  // deze versie hebben hem niet — en dat is precies het signaal dat we nodig hebben.
  formaat: z.number().int().positive().optional(),
  gebeurtenis: GebeurtenisSchema,
})
export type Logregel = z.infer<typeof LogregelSchema>

export type MetaRegel = { sleutel: string; waarde: unknown }
