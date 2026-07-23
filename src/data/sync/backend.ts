import type { Logregel } from './events'

// De sync-backend is bewust abstract: de sync-logica weet niet of de opslag
// Google Drive, een testomgeving of iets anders is. Zo kunnen we de volledige
// motor testen zonder echte Drive, en de Drive-koppeling later inpluggen
// (Fase 2b) zonder de rest te wijzigen.
export interface SyncBackend {
  // Haalt alle logregels op van alle toestellen.
  haalOp(): Promise<Logregel[]>
  // Voegt nieuwe eigen logregels toe (append-only; overschrijft nooit iets).
  stuur(toestelId: string, regels: Logregel[]): Promise<void>
}

// Een eenvoudige backend in het geheugen, voor tests en ontwikkeling. Elk
// toestel schrijft alleen zijn eigen lijst - toestellen raken nooit elkaars data
// aan, precies zoals de echte per-toestel-mappen op Drive straks.
export class GeheugenBackend implements SyncBackend {
  private opslag = new Map<string, Logregel[]>()

  async haalOp(): Promise<Logregel[]> {
    return [...this.opslag.values()].flat()
  }

  async stuur(toestelId: string, regels: Logregel[]): Promise<void> {
    const bestaand = this.opslag.get(toestelId) ?? []
    this.opslag.set(toestelId, [...bestaand, ...regels])
  }
}
