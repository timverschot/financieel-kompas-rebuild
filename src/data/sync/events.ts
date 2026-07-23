import { z } from 'zod'
import { RekeningSchema, TransactieSchema } from '../schema'

// Een gebeurtenis beschrijft één wijziging. We slaan nooit data over of
// overschrijven; we voegen alleen gebeurtenissen toe (append-only). Zo kan een
// halve schrijfactie hooguit de nieuwste toevoeging raken, nooit de hele
// geschiedenis.
export const GebeurtenisSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('transactie.bewaard'), payload: TransactieSchema }),
  z.object({ type: z.literal('transactie.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal('rekening.bewaard'), payload: RekeningSchema }),
  z.object({ type: z.literal('rekening.verwijderd'), payload: z.object({ id: z.string().min(1) }) }),
])
export type Gebeurtenis = z.infer<typeof GebeurtenisSchema>

// Een logregel is een gebeurtenis mét herkomst: welk toestel, het hoeveelste
// wijziging van dat toestel (volgnummer), en wanneer (tijdstip). Die drie samen
// bepalen de volgorde bij het samenvoegen.
export const LogregelSchema = z.object({
  id: z.string().min(1),
  toestelId: z.string().min(1),
  volgnummer: z.number().int().nonnegative(),
  tijdstip: z.number(),
  gebeurtenis: GebeurtenisSchema,
})
export type Logregel = z.infer<typeof LogregelSchema>

export type MetaRegel = { sleutel: string; waarde: unknown }
