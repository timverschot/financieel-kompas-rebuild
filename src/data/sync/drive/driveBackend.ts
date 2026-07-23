import type { SyncBackend } from '../backend'
import type { Logregel } from '../events'
import { vraagToken } from './auth'

// De Google Drive-implementatie van de abstracte SyncBackend. Elk toestel houdt
// precies ÉÉN bestand bij in een backup-map in je Drive: 'log-<toestelId>.json',
// met zijn volledige eigen logboek. Bij een push wordt dat ene bestand
// overschreven (compactie), zodat het aantal bestanden nooit ongecontroleerd
// groeit. Omdat elk toestel enkel zijn eigen bestand aanraakt, kan het niets van
// een ander toestel kwijtmaken; en omdat de lokale database de bron van waarheid
// is, herstelt een mislukte schrijfbeurt zich vanzelf bij de volgende push.
const MAP_NAAM = 'Financieel Kompas Backup'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await vraagToken(false)
  const headers = new Headers(init.headers)
  headers.set('Authorization', 'Bearer ' + token)
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    throw new Error('Drive-fout ' + res.status + ': ' + (await res.text()))
  }
  return res
}

export class DriveBackend implements SyncBackend {
  private mapId: string | null = null

  // Zoekt de backup-map, of maakt ze aan als ze nog niet bestaat.
  private async zorgVoorMap(): Promise<string> {
    if (this.mapId) return this.mapId

    const q = `name='${MAP_NAAM}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    const zoek = await driveFetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`)
    const data = (await zoek.json()) as { files: { id: string }[] }
    if (data.files.length > 0) {
      this.mapId = data.files[0].id
      return this.mapId
    }

    const maak = await driveFetch(`${API}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: MAP_NAAM, mimeType: 'application/vnd.google-apps.folder' }),
    })
    const gemaakt = (await maak.json()) as { id: string }
    this.mapId = gemaakt.id
    return this.mapId
  }

  // Zoekt het bestand-id van een bestand met een bepaalde naam in de backup-map.
  private async vindBestandId(mapId: string, naam: string): Promise<string | null> {
    const q = `name='${naam}' and '${mapId}' in parents and trashed=false`
    const res = await driveFetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`)
    const data = (await res.json()) as { files: { id: string }[] }
    return data.files[0]?.id ?? null
  }

  async stuur(toestelId: string, alleEigenRegels: Logregel[]): Promise<void> {
    const mapId = await this.zorgVoorMap()
    const naam = `log-${toestelId}.json`
    const inhoud = JSON.stringify(alleEigenRegels)
    const bestaandId = await this.vindBestandId(mapId, naam)

    if (bestaandId) {
      // Bestaat al: enkel de inhoud vervangen.
      await driveFetch(`${UPLOAD}/files/${bestaandId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: inhoud,
      })
      return
    }

    // Nog niet: aanmaken met naam + inhoud in één multipart-verzoek.
    const metadata = { name: naam, parents: [mapId] }
    const grens = 'grens' + Math.random().toString(36).slice(2)
    const body =
      `--${grens}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${grens}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      inhoud +
      `\r\n--${grens}--`

    await driveFetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${grens}` },
      body,
    })
  }

  async haalOp(): Promise<Logregel[]> {
    const mapId = await this.zorgVoorMap()
    const q = `'${mapId}' in parents and trashed=false`

    // Alle bestanden oplijsten, met paginatie: boven één pagina (1000) blijven we
    // 'nextPageToken' volgen, zodat er nooit bestanden stil wegvallen.
    const bestanden: { id: string }[] = []
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams({
        q,
        fields: 'nextPageToken,files(id)',
        spaces: 'drive',
        pageSize: '1000',
      })
      if (pageToken) params.set('pageToken', pageToken)
      const lijst = await driveFetch(`${API}/files?${params.toString()}`)
      const data = (await lijst.json()) as { nextPageToken?: string; files: { id: string }[] }
      bestanden.push(...data.files)
      pageToken = data.nextPageToken
    } while (pageToken)

    const alle: Logregel[] = []
    for (const bestand of bestanden) {
      const inhoud = await driveFetch(`${API}/files/${bestand.id}?alt=media`)
      const regels = (await inhoud.json()) as unknown
      if (Array.isArray(regels)) alle.push(...(regels as Logregel[]))
    }
    return alle
  }
}
