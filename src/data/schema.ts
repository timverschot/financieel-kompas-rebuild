import { z } from 'zod'

// De schemas zijn de 'poortwachters' van je data. Elk stuk data dat de database
// in of uit gaat, wordt hiertegen gecontroleerd. De TypeScript-types worden
// automatisch afgeleid, zodat schema en type nooit uit elkaar lopen.
//
// GELD: alle bedragen worden bewaard als GEHELE CENTEN (integers), nooit als
// euro's met drijvende komma. €12,50 = 1250. Zo kan er nooit centen-drift
// ontstaan bij optellen (het klassieke 0,1 + 0,2 ≠ 0,3). Bij weergave/invoer
// wordt omgerekend via de helpers in utils/format.ts.

// De types rekening. De sleutels ('betaal', ...) zijn taal-onafhankelijk en
// worden pas bij weergave vertaald; de opgeslagen waarde blijft altijd de sleutel.
export const REKENING_TYPES = ['betaal', 'spaar', 'termijn', 'effecten', 'cash'] as const
export type RekeningType = (typeof REKENING_TYPES)[number]

export const RekeningSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  beginsaldo: z.number().int(), // in centen
  // Alle onderstaande velden zijn optioneel, zodat bestaande rekeningen (van vóór
  // deze uitbreiding) geldig blijven zonder migratie.
  type: z.enum(REKENING_TYPES).optional(),
  rekeningnummer: z.string().optional(), // IBAN of ander rekeningnummer
  rubriek: z.string().optional(), // vrije rubriek-/groepsnaam
  gearchiveerd: z.boolean().optional(), // afgesloten/oud: verborgen in keuzelijsten
})
export type Rekening = z.infer<typeof RekeningSchema>

export const CategorieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
})
export type Categorie = z.infer<typeof CategorieSchema>

// Eén deelregel (kassaticketlijn): een product/omschrijving met zijn bedrag en
// (optioneel) een categorie/item. Bedrag in centen, met hetzelfde teken als het
// totaal. De som van de regels hoeft niet exact het totaal te dekken; een niet-
// verdeeld restbedrag wordt bij het optellen als 'Zonder categorie' geteld (zie
// utils/transactie.ts), zodat een gedeeltelijk ingevuld ticket toch altijd klopt.
export const TransactieRegelSchema = z.object({
  categorieId: z.string().min(1).optional(),
  omschrijving: z.string().optional(),
  bedrag: z.number().int(),
})
export type TransactieRegel = z.infer<typeof TransactieRegelSchema>

export const TransactieSchema = z.object({
  id: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  omschrijving: z.string(), // handelaar/winkel
  bedrag: z.number().int(), // in centen; positief = inkomst, negatief = uitgave (totaal)
  rekeningId: z.string().min(1),
  categorieId: z.string().min(1).optional(),
  // Optionele uitsplitsing (kassaticket) over meerdere regels.
  regels: z.array(TransactieRegelSchema).optional(),
})
export type Transactie = z.infer<typeof TransactieSchema>

export const BudgetSchema = z.object({
  id: z.string().min(1),
  categorieId: z.string().min(1),
  bedrag: z.number().int().positive(), // maandbudget in centen, altijd positief
})
export type Budget = z.infer<typeof BudgetSchema>

// Een dossier voor gedeelde kosten (bv. tussen co-ouders). 'aandeelJij' is het
// percentage (0-100) van elke kost dat jij hoort te dragen.
export const DossierSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  aandeelJij: z.number().min(0).max(100),
})
export type Dossier = z.infer<typeof DossierSchema>

export const GedeeldeKostSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1),
  omschrijving: z.string(),
  bedrag: z.number().int().positive(), // in centen
  betaaldDoor: z.enum(['jij', 'partner']),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  // Zodra een kost in een afrekening is vastgelegd, verwijst dit naar die
  // afrekening. Open (nog niet afgerekende) kosten hebben dit veld niet.
  verrekeningId: z.string().min(1).optional(),
})
export type GedeeldeKost = z.infer<typeof GedeeldeKostSchema>

// Een vastgelegde afrekening: een momentopname van het te verrekenen bedrag.
export const VerrekeningSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  bedrag: z.number().int(), // in centen; positief = partner was jou verschuldigd
})
export type Verrekening = z.infer<typeof VerrekeningSchema>

// Een terugkerende (vaste) post, bv. huur of een abonnement. 'dag' is de dag van
// de maand (1-28, zodat elke maand gedekt is). Bij het inboeken wordt hij een
// gewone transactie.
export const TerugkerendePostSchema = z.object({
  id: z.string().min(1),
  omschrijving: z.string().min(1),
  bedrag: z.number().int(), // in centen; positief = inkomst, negatief = uitgave
  rekeningId: z.string().min(1),
  categorieId: z.string().min(1).optional(),
  dag: z.number().int().min(1).max(28),
})
export type TerugkerendePost = z.infer<typeof TerugkerendePostSchema>

// Een door de gebruiker toegevoegde of gewijzigde subcategorie (item) bovenop de
// vaste, ingebouwde categorieboom. 'categorieId' is de mid-categorie (cat-*)
// waaronder het valt. Is 'id' gelijk aan een ingebouwd item, dan overschrijft
// deze aanpassing dat item (bv. een hernoeming); anders is het een nieuw item.
export const SubcategorieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  categorieId: z.string().min(1),
  synoniemen: z.array(z.string()).optional(),
})
export type Subcategorie = z.infer<typeof SubcategorieSchema>

// Een spaardoel: een langetermijndoel met een doelbedrag. Het huidige bedrag
// wordt manueel bijgehouden, of - als er een rekening aan gekoppeld is - afgeleid
// uit het saldo van die rekening. Bedragen in centen.
export const SpaardoelSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  doelbedrag: z.number().int().positive(),
  huidigBedrag: z.number().int(), // manueel bijgehouden bedrag
  doeldatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn').optional(),
  gekoppeldeRekeningId: z.string().min(1).optional(),
  maandbedrag: z.number().int().positive().optional(), // maandelijks streefbedrag
  kleur: z.string().optional(),
})
export type Spaardoel = z.infer<typeof SpaardoelSchema>

// Een interne overboeking tussen twee EIGEN rekeningen. Dit is geen inkomst of
// uitgave: het geld verlaat je vermogen niet, het verschuift enkel. Daarom telt
// een overboeking nooit mee in het maandoverzicht, de budgetten of de grafieken.
// 'bedrag' is altijd positief (in centen); de richting zit in van/naar.
export const OverboekingSchema = z.object({
  id: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  vanRekeningId: z.string().min(1),
  naarRekeningId: z.string().min(1),
  bedrag: z.number().int().positive(),
  omschrijving: z.string().optional(),
})
export type Overboeking = z.infer<typeof OverboekingSchema>
