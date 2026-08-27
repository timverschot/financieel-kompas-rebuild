import { db } from './db'
import { LOG_FORMAAT, LogregelSchema, formaatOordeel, type Logregel } from './sync/events'
import type { GeweigerdeRegel, Weigering } from '../utils/geweigerdeRegels'
import { verwerkOntvangenHlc, voegRegelsToeEnHerbouw } from './sync/lokaal'

// Een onafhankelijk vangnet, los van Google Drive: de volledige geschiedenis
// (het append-only logboek) als één JSON-bestand dat de gebruiker zelf kan
// bewaren en later terugzetten. Omdat de staat volledig uit het logboek wordt
// afgeleid, is het logboek alles wat we nodig hebben voor een volledig herstel.

export type BackupBestand = {
  app: 'financieel-kompas'
  soort: 'backup'
  /** 1 = de euro-tijd (bedragen met een komma), 2 = gehele centen én elke regel
   *  draagt zelf haar eenheid. Zie LOG_FORMAAT in sync/events.ts. */
  versie: number
  gemaaktOp: string
  events: Logregel[]
}

// Zet de volledige geschiedenis om naar een JSON-tekst om te downloaden.
export async function exporteerBackup(): Promise<string> {
  const events = await db.events.toArray()
  const bestand: BackupBestand = {
    app: 'financieel-kompas',
    soort: 'backup',
    versie: LOG_FORMAAT,
    gemaaktOp: new Date().toISOString(),
    events,
  }
  return JSON.stringify(bestand, null, 2)
}

export type ImportResultaat = {
  toegevoegd: number
  overgeslagen: number
  ongeldig: number
  /** Regels uit een oudere versie van de app, waarvan de bedragen niet betrouwbaar
   *  te lezen zijn. Zie LOG_FORMAAT in sync/events.ts. */
  verouderd: number
  /** Regels uit een NIEUWERE versie dan deze app. Dan draait dit toestel achter. */
  teNieuw: number
  /**
   * WELKE regels geweigerd zijn (ronde 100). Zie de uitleg bij `SyncResultaat` in
   * `sync/sync.ts`: met alleen een teller kan het scherm niet zien of het om dezelfde
   * regel gaat als de vorige keer, en dan komt dezelfde melding eeuwig terug.
   */
  geweigerd: GeweigerdeRegel[]
}

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
  let verouderd = 0
  let teNieuw = 0
  const geweigerd: GeweigerdeRegel[] = []
  for (const ruw of events) {
    const check = LogregelSchema.safeParse(ruw)
    if (!check.success) {
      ongeldig++
      // ⚠ RONDE 109 — zelfde reden als in `sync/sync.ts`: een regel die de schemacontrole niet
      // haalt, hoort in de blijvende melding en niet alleen in een teller.
      const id = typeof (ruw as { id?: unknown }).id === 'string' && (ruw as { id: string }).id.length > 0
        ? (ruw as { id: string }).id
        : `onleesbaar-${ongeldig}`
      const tijdstip = typeof (ruw as { tijdstip?: unknown }).tijdstip === 'number' && Number.isFinite((ruw as { tijdstip: number }).tijdstip)
        ? (ruw as { tijdstip: number }).tijdstip
        : 0
      geweigerd.push({ id, tijdstip, reden: 'onleesbaar' })
      continue
    }
    if (bestaandeIds.has(check.data.id)) {
      overgeslagen++
      continue
    }
    // Zie sync/sync.ts: een regel uit de euro-tijd draagt geen eenheid, en haar
    // bedragen als centen lezen maakt van € 2.400 stil € 24.
    const oordeel = formaatOordeel(check.data)
    if (oordeel === 'te-oud') {
      verouderd++
      geweigerd.push(kenmerk(check.data, 'te-oud'))
      continue
    }
    if (oordeel === 'te-nieuw') {
      teNieuw++
      geweigerd.push(kenmerk(check.data, 'te-nieuw'))
      continue
    }
    // BEWUST de ruwe regel, niet `check.data`. Het schema controleert of de regel
    // deugt, maar knipt ook alles weg wat het niet kent. Zet je een back-up van een
    // nieuwere app-versie terug op een toestel met een oudere versie, dan verliest
    // elke regel daar de velden die die versie niet begrijpt — en omdat het hier om
    // je EIGEN logregels gaat, schrijft dat toestel de verminkte versie bij de
    // eerstvolgende synchronisatie gewoon terug naar Drive. Dan zijn de velden
    // overal weg. Zie dezelfde overweging in sync/sync.ts.
    nieuw.push(ruw as Logregel)
  }

  if (nieuw.length > 0) {
    // Werk de eigen logische klok bij op basis van de herstelde gebeurtenissen,
    // net zoals bij een sync. Anders kan een wijziging ná het herstel een lager
    // klokstempel krijgen en vóór de herstelde data geordend worden.
    await verwerkOntvangenHlc(nieuw.map((r) => ({ l: r.hlcL ?? r.tijdstip, c: r.hlcC ?? 0 })))
    // ⚠ RONDE 109 — SCHRIJVEN EN HERBOUWEN IN ÉÉN TRANSACTIE. Hier stonden een
    // `db.events.bulkPut` en een `herbouwStaat()` als twee losse stappen. Brak de tweede af —
    // een volle opslag, een tabblad dat dichtgaat — dan stonden je regels wél in het logboek
    // maar niet in je lijsten. En dat herstelde zich NOOIT meer: een tweede herstel met
    // hetzelfde bestand slaat elke regel over als "al aanwezig" ("0 toegevoegd, 1
    // overgeslagen"), en `herbouwStaat` draait alleen na een sync-ronde die iets ophaalt,
    // nooit bij het opstarten. Je gegevens waren dan voorgoed onbereikbaar terwijl ze er
    // gewoon stonden.
    //
    // Ronde 35 heeft precies deze fout uit de SYNC-weg gehaald, met `voegRegelsToeEnHerbouw`
    // en een test erop. De herstel-weg is toen niet meegegaan.
    await voegRegelsToeEnHerbouw(nieuw)
  }
  return { toegevoegd: nieuw.length, overgeslagen, ongeldig, verouderd, teNieuw, geweigerd }
}

/**
 * Net genoeg van een geweigerde regel om te kunnen zeggen wélke het is (ronde 100).
 * Dezelfde vorm als in `sync/sync.ts`, en om dezelfde reden: geen bedragen en geen
 * omschrijvingen, want juist die zijn hier niet te vertrouwen.
 */
function kenmerk(regel: Logregel, reden: Weigering): GeweigerdeRegel {
  return { id: regel.id, tijdstip: regel.tijdstip, reden }
}
