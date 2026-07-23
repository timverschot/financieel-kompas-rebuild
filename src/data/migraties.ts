// Eenmalige omzetting van euro's (oude drijvende-komma-opslag) naar gehele
// centen. Gebruikt door de Dexie v8-migratie in db.ts. Bewust puur en los
// gehouden, zodat de omzetting zelf getest kan worden zonder database.

// €12,50 (12.5) -> 1250 centen. Bestaande hele euro's blijven exact.
export function euroNaarCenten(euro: number): number {
  return Math.round(euro * 100)
}

// De gebeurtenis-types die een geldbedrag dragen, en onder welke sleutel dat
// bedrag in de payload staat.
const GELDVELD: Record<string, 'bedrag' | 'beginsaldo'> = {
  'rekening.bewaard': 'beginsaldo',
  'transactie.bewaard': 'bedrag',
  'budget.bewaard': 'bedrag',
  'gedeeldekost.bewaard': 'bedrag',
  'verrekening.bewaard': 'bedrag',
  'terugkerendepost.bewaard': 'bedrag',
}

type RuweGebeurtenis = { type?: string; payload?: Record<string, unknown> }

// Zet, indien aanwezig, de deelregels van een gesplitst kassaticket om naar
// centen. Gebeurt zowel voor het logboek als voor de staat-tabellen, zodat een
// oude gesplitste transactie na de migratie niet half in euro's en half in centen
// staat (anders wordt het niet-verdeelde restbedrag gigantisch fout berekend).
function regelsNaarCenten(regels: unknown): unknown[] | null {
  if (!Array.isArray(regels)) return null
  return regels.map((r) => {
    const regel = r as Record<string, unknown>
    return typeof regel.bedrag === 'number' ? { ...regel, bedrag: euroNaarCenten(regel.bedrag) } : regel
  })
}

// Zet het geldveld (en eventuele split-regels) van één gebeurtenis-payload om naar
// centen en geeft een nieuwe gebeurtenis terug (de oude blijft ongemoeid).
// Gebeurtenissen zonder om te zetten waarde (bv. '...verwijderd') worden onveranderd
// teruggegeven — herkenbaar doordat dezelfde referentie terugkomt.
export function gebeurtenisNaarCenten<T extends RuweGebeurtenis>(g: T): T {
  if (!g.payload) return g
  const veld = g.type ? GELDVELD[g.type] : undefined
  let nieuw: Record<string, unknown> | null = null

  if (veld && typeof g.payload[veld] === 'number') {
    nieuw = { ...g.payload, [veld]: euroNaarCenten(g.payload[veld] as number) }
  }

  const nieuweRegels = regelsNaarCenten(g.payload.regels)
  if (nieuweRegels) {
    nieuw = { ...(nieuw ?? g.payload), regels: nieuweRegels }
  }

  if (!nieuw) return g
  return { ...g, payload: nieuw }
}

// Zet een transactie-record (staat-tabel) om naar centen: het totaalbedrag én de
// eventuele split-regels. Gebruikt door de v8-migratie in db.ts, en apart getest.
export function transactieNaarCenten<T extends Record<string, unknown>>(t: T): T {
  const nieuw: Record<string, unknown> = { ...t }
  if (typeof nieuw.bedrag === 'number') nieuw.bedrag = euroNaarCenten(nieuw.bedrag)
  const nieuweRegels = regelsNaarCenten(nieuw.regels)
  if (nieuweRegels) nieuw.regels = nieuweRegels
  return nieuw as T
}
