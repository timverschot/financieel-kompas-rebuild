import type { SyncBackend } from '../backend'
import type { Logregel } from '../events'
import { vraagToken } from './auth'

// De Google Drive-implementatie van de abstracte SyncBackend. Ze schrijft de
// logregels als losse, append-only bestanden in een backup-map in je Drive, en
// leest ze weer uit. Omdat het steeds dezelfde gebruiker en dezelfde app is,
// ziet elk van je toestellen elkaars bestanden - de basis van de synchronisatie.
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

  async stuur(toestelId: string, regels: Logregel[]): Promise<void> {
    if (regels.length === 0) return
    const mapId = await this.zorgVoorMap()

    const metadata = { name: `log-${toestelId}-${Date.now()}.json`, parents: [mapId] }
    const grens = 'grens' + Math.random().toString(36).slice(2)
    const body =
      `--${grens}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${grens}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(regels) +
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
    const lijst = await driveFetch(
      `${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive&pageSize=1000`,
    )
    const data = (await lijst.json()) as { files: { id: string }[] }

    const alle: Logregel[] = []
    for (const bestand of data.files) {
      const inhoud = await driveFetch(`${API}/files/${bestand.id}?alt=media`)
      const regels = (await inhoud.json()) as unknown
      if (Array.isArray(regels)) alle.push(...(regels as Logregel[]))
    }
    return alle
  }
}
