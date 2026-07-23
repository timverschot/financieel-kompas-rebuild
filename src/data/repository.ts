import type { ZodType } from 'zod'
import { db } from './db'
import { RekeningSchema, TransactieSchema, type Rekening, type Transactie } from './schema'
import { pasGebeurtenisToe } from './sync/lokaal'

// De repository is de enige weg naar de database. Alle schrijfacties worden
// eerst gevalideerd en lopen daarna via het append-only logboek, zodat elke
// wijziging bewaard blijft en klaar is voor synchronisatie.

// --- Schrijven ---
export async function bewaarTransactie(tx: Transactie): Promise<void> {
  const geldig = TransactieSchema.parse(tx)
  await pasGebeurtenisToe({ type: 'transactie.bewaard', payload: geldig })
}

export async function bewaarRekening(rekening: Rekening): Promise<void> {
  const geldig = RekeningSchema.parse(rekening)
  await pasGebeurtenisToe({ type: 'rekening.bewaard', payload: geldig })
}

export async function verwijderTransactie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'transactie.verwijderd', payload: { id } })
}

// --- Lezen ---
// Bij het laden controleren we elk record opnieuw. Een corrupt of onverwacht
// record wordt overgeslagen én geteld, in plaats van de app te laten crashen of
// stil foute cijfers te tonen.
export type LeesResultaat<T> = {
  geldig: T[]
  ongeldig: number
}

function valideerLijst<T>(ruw: unknown[], schema: ZodType<T>): LeesResultaat<T> {
  const geldig: T[] = []
  let ongeldig = 0
  for (const item of ruw) {
    const resultaat = schema.safeParse(item)
    if (resultaat.success) {
      geldig.push(resultaat.data)
    } else {
      ongeldig++
      console.error('Ongeldig record overgeslagen bij het laden:', item, resultaat.error.issues)
    }
  }
  return { geldig, ongeldig }
}

export async function laadTransacties(): Promise<LeesResultaat<Transactie>> {
  const ruw = await db.transacties.toArray()
  return valideerLijst(ruw, TransactieSchema)
}

export async function laadRekeningen(): Promise<LeesResultaat<Rekening>> {
  const ruw = await db.rekeningen.toArray()
  return valideerLijst(ruw, RekeningSchema)
}
