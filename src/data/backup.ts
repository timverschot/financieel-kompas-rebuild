import { db } from './db'
import { LogregelSchema, type Logregel } from './sync/events'
import { herbouwStaat, verwerkOntvangenHlc } from './sync/lokaal'

// Een onafhankelijk vangnet, los van Google Drive: de volledige geschiedenis
// (het append-only logboek) als één JSON-bestand dat de gebruiker zelf kan
// bewaren en later terugzetten. Omdat de staat volledig uit het logboek wordt
// afgeleid, is het logboek alles wat we nodig hebben voor een volledig herstel.

export type BackupBestand = {
  app: 'financieel-kompas'
  soort: 'backup'
  versie: 1
  gemaaktOp: string
  events: Logregel[]
}

// Zet de volledige geschiedenis om naar een JSON-tekst om te downloaden.
export async function exporteerBackup(): Promise<string> {
  const events = await db.events.toArray()
  const bestand: BackupBestand = {
    app: 'financieel-kompas',
    soort: 'backup',
    versie: 1,
    gemaaktOp: new Date().toISOString(),
    events,
  }
  return JSON.stringify(bestand, null, 2)
}

export type ImportResultaat = { toegevoegd: number; overgeslagen: number; ongeldig: number }

// Zet een back-up terug. Werkt net als een sync: gebeurtenissen worden
// samengevoegd (append-only), nooit overschreven. Bestaande gebeurtenissen
// worden overgeslagen, ongeldige geteld, en pas als er iets nieuw is wordt de
// staat herbouwd. Zo kan een herstel de huidige data nooit stukmaken.
export async function importeerBackup(json: string): Promise<ImportResultaat> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Dit bestand is geen geldige back-up (geen JSON).')
  }
  const events = (data as { events?: unknown } | null)?.events
  if (!Array.isArray(events)) {
    throw new Error('Dit bestand bevat geen back-up-gegevens.')
  }

  const bestaandeIds = new Set((await db.events.toArray()).map((e) => e.id))
  const nieuw: Logregel[] = []
  let overgeslagen = 0
  let ongeldig = 0
  for (const ruw of events) {
    const check = LogregelSchema.safeParse(ruw)
    if (!check.success) {
      ongeldig++
      continue
    }
    if (bestaandeIds.has(check.data.id)) {
      overgeslagen++
      continue
    }
    nieuw.push(check.data)
  }

  if (nieuw.length > 0) {
    await db.events.bulkPut(nieuw)
    // Werk de eigen logische klok bij op basis van de herstelde gebeurtenissen,
    // net zoals bij een sync. Anders kan een wijziging ná het herstel een lager
    // klokstempel krijgen en vóór de herstelde data geordend worden.
    await verwerkOntvangenHlc(nieuw.map((r) => ({ l: r.hlcL ?? r.tijdstip, c: r.hlcC ?? 0 })))
    await herbouwStaat()
  }
  return { toegevoegd: nieuw.length, overgeslagen, ongeldig }
}
