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

// Zet het geldveld van één gebeurtenis-payload om naar centen en geeft een
// nieuwe gebeurtenis terug (de oude blijft ongemoeid). Gebeurtenissen zonder
// geldveld (bv. '...verwijderd') worden onveranderd teruggegeven — herkenbaar
// doordat dezelfde referentie terugkomt.
export function gebeurtenisNaarCenten<T extends RuweGebeurtenis>(g: T): T {
  const veld = g.type ? GELDVELD[g.type] : undefined
  if (!veld || !g.payload) return g
  const huidig = g.payload[veld]
  if (typeof huidig !== 'number') return g
  return { ...g, payload: { ...g.payload, [veld]: euroNaarCenten(huidig) } }
}
