import { z } from 'zod'
import {
  BudgetSchema,
  CategorieSchema,
  DossierSchema,
  GedeeldeKostSchema,
  RekeningSchema,
  TerugkerendePostSchema,
  TransactieSchema,
  VerrekeningSchema,
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
])
export type Gebeurtenis = z.infer<typeof GebeurtenisSchema>

// Een logregel is een gebeurtenis mét herkomst: welk toestel, het hoeveelste
// wijziging van dat toestel (volgnummer), en wanneer (tijdstip).
export const LogregelSchema = z.object({
  id: z.string().min(1),
  toestelId: z.string().min(1),
  volgnummer: z.number().int().nonnegative(),
  tijdstip: z.number(),
  gebeurtenis: GebeurtenisSchema,
})
export type Logregel = z.infer<typeof LogregelSchema>

export type MetaRegel = { sleutel: string; waarde: unknown }
