import { db } from './db'
import type { SyncBackend } from './sync/backend'

// "Begin opnieuw": alles wissen en met een schone lei starten.
//
// Waarom dit méér is dan de lokale database leegmaken: de app werkt met een
// append-only logboek dat naar Google Drive gaat. Wis je enkel lokaal, dan haalt
// de eerstvolgende synchronisatie alle logbestanden van Drive gewoon weer binnen
// — ook die van een ander toestel — en staat alles er weer. Daarom gooien we ook
// de logbestanden in de back-upmap weg.
//
// Bij Drive gaan die bestanden naar de PRULLENBAK, niet definitief weg: gaat er
// iets mis, dan kan je ze daar nog terughalen. De back-upmap zelf blijft bestaan
// en houdt haar naam.

export type HerstartResultaat = {
  /** Of de logbestanden in de back-up ook opgeruimd zijn. */
  backupGewist: boolean
  /** Gezet wanneer het opruimen van de back-up mislukte (bv. geen internet). */
  backupFout?: string
}

/**
 * Wist alle gegevens van dit toestel, en — als er een verbonden back-up
 * meegegeven wordt — ook de logbestanden daarin.
 *
 * De lokale database gaat ALTIJD leeg, ook wanneer het opruimen van de back-up
 * mislukt; dat wordt dan gemeld in het resultaat. Zo blijft de gebruiker nooit
 * achter met een half gewiste app zonder te weten wat er gebeurd is.
 */
export async function wisAlles(backend?: SyncBackend | null): Promise<HerstartResultaat> {
  let backupGewist = false
  let backupFout: string | undefined

  if (backend) {
    try {
      await backend.wisAlles()
      backupGewist = true
    } catch (e) {
      backupFout = e instanceof Error ? e.message : String(e)
    }
  }

  // Alle tabellen, inclusief het logboek (events) en de sleutel/waarde-tabel
  // (meta, met o.a. het toestel-id, de dag van je laatste back-up en de dag van
  // de laatste geslaagde synchronisatie).
  //
  // ⚠ Die twee dagen MOETEN mee (ronde 63). Blijven ze staan, dan draagt een lege
  // app een vangnet-datum mee die over gewiste gegevens ging, en zwijgt het
  // belletje een maand lang. Er staat een test op.
  await db.transaction('rw', db.tables, async () => {
    for (const tabel of db.tables) await tabel.clear()
  })

  return { backupGewist, ...(backupFout ? { backupFout } : {}) }
}
