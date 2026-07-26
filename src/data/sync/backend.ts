import type { Logregel } from './events'

// De sync-backend is bewust abstract: de sync-logica weet niet of de opslag
// Google Drive, een testomgeving of iets anders is. Zo kunnen we de volledige
// motor testen zonder echte Drive, en de Drive-koppeling later inpluggen
// (Fase 2b) zonder de rest te wijzigen.
export interface SyncBackend {
  // Haalt alle logregels op van alle toestellen.
  haalOp(): Promise<Logregel[]>
  // Bewaart de VOLLEDIGE eigen logregels van dit toestel als één geheel
  // (compactie: één bestand per toestel dat overschreven wordt). Een toestel
  // raakt nooit de bestanden van een ander toestel aan, dus overschrijven kan
  // niets van iemand anders kwijtmaken; en omdat de lokale database de bron van
  // waarheid is, herstelt een mislukte schrijfbeurt zich vanzelf bij de volgende.
  stuur(toestelId: string, alleEigenRegels: Logregel[]): Promise<void>
  // Gooit ALLE logbestanden in de back-upmap weg (van élk toestel). Enkel voor
  // "Begin opnieuw": zonder dit zou de eerstvolgende sync alles wat je net gewist
  // hebt gewoon weer binnenhalen — ook van een ander toestel. Bij Google Drive
  // gaan de bestanden naar de prullenbak, dus je kan ze daar nog terughalen.
  wisAlles(): Promise<void>
}

// Een eenvoudige backend in het geheugen, voor tests en ontwikkeling. Elk
// toestel heeft precies één lijst (zijn eigen bestand); een nieuwe stuur()
// vervangt die volledig - toestellen raken nooit elkaars data aan, precies zoals
// de echte per-toestel-bestanden op Drive.
export class GeheugenBackend implements SyncBackend {
  private opslag = new Map<string, Logregel[]>()

  async haalOp(): Promise<Logregel[]> {
    return [...this.opslag.values()].flat()
  }

  async stuur(toestelId: string, alleEigenRegels: Logregel[]): Promise<void> {
    this.opslag.set(toestelId, [...alleEigenRegels])
  }

  async wisAlles(): Promise<void> {
    this.opslag.clear()
  }
}
