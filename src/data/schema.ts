import { z } from 'zod'

// De schemas zijn de 'poortwachters' van je data. Elk stuk data dat de database
// in of uit gaat, wordt hiertegen gecontroleerd. Zo kan foute of beschadigde
// data niet stil binnensluipen. De TypeScript-types worden automatisch uit deze
// schemas afgeleid, zodat schema en type nooit uit elkaar kunnen lopen.

export const RekeningSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  beginsaldo: z.number().finite(),
})
export type Rekening = z.infer<typeof RekeningSchema>

export const TransactieSchema = z.object({
  id: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  omschrijving: z.string(),
  bedrag: z.number().finite(), // positief = inkomst, negatief = uitgave
  rekeningId: z.string().min(1),
})
export type Transactie = z.infer<typeof TransactieSchema>
