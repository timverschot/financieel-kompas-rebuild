import { z } from 'zod'

// De schemas zijn de 'poortwachters' van je data. Elk stuk data dat de database
// in of uit gaat, wordt hiertegen gecontroleerd. De TypeScript-types worden
// automatisch afgeleid, zodat schema en type nooit uit elkaar lopen.

export const RekeningSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  beginsaldo: z.number().finite(),
})
export type Rekening = z.infer<typeof RekeningSchema>

export const CategorieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
})
export type Categorie = z.infer<typeof CategorieSchema>

export const TransactieSchema = z.object({
  id: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  omschrijving: z.string(),
  bedrag: z.number().finite(), // positief = inkomst, negatief = uitgave
  rekeningId: z.string().min(1),
  categorieId: z.string().min(1).optional(),
})
export type Transactie = z.infer<typeof TransactieSchema>

export const BudgetSchema = z.object({
  id: z.string().min(1),
  categorieId: z.string().min(1),
  bedrag: z.number().finite().positive(), // maandbudget, altijd positief
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
  bedrag: z.number().finite().positive(),
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
  bedrag: z.number().finite(), // positief = partner was jou verschuldigd
})
export type Verrekening = z.infer<typeof VerrekeningSchema>

// Een terugkerende (vaste) post, bv. huur of een abonnement. 'dag' is de dag van
// de maand (1-28, zodat elke maand gedekt is). Bij het inboeken wordt hij een
// gewone transactie.
export const TerugkerendePostSchema = z.object({
  id: z.string().min(1),
  omschrijving: z.string().min(1),
  bedrag: z.number().finite(), // positief = inkomst, negatief = uitgave
  rekeningId: z.string().min(1),
  categorieId: z.string().min(1).optional(),
  dag: z.number().int().min(1).max(28),
})
export type TerugkerendePost = z.infer<typeof TerugkerendePostSchema>
