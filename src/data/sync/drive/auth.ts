import { GOOGLE_CLIENT_ID } from '../../../config'

// Aanmelden bij Google, volledig aan de kant van de browser (Google Identity
// Services). We vragen enkel de scope 'drive.file': de app kan uitsluitend bij
// bestanden die ze zélf aanmaakt, niet bij de rest van je Drive.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

type TokenResponse = { access_token?: string; expires_in?: number; error?: string }
type TokenClient = { requestAccessToken(overrideConfig?: { prompt?: string }): void }
type TokenClientConfig = {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: unknown) => void
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient(config: TokenClientConfig): TokenClient } } }
  }
}

let gisLaden: Promise<void> | null = null
let tokenClient: TokenClient | null = null
let huidigToken: { waarde: string; verlooptOp: number } | null = null
let wachtend: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null

// We bewaren het token zelf NOOIT op schijf (dat is veiliger). We onthouden enkel
// dat de gebruiker ooit verbond, zodat de app bij het opstarten stil - zonder
// venster - een vers token kan vragen (dat lukt zolang de Google-sessie actief is
// en de toegang eerder werd gegeven).
const OOIT_VERBONDEN_SLEUTEL = 'fk_ooit_verbonden'

function onthoudVerbonden(): void {
  try {
    localStorage.setItem(OOIT_VERBONDEN_SLEUTEL, '1')
  } catch {
    // localStorage niet beschikbaar (bv. in tests): stil negeren.
  }
}

export function heeftOoitVerbonden(): boolean {
  try {
    return localStorage.getItem(OOIT_VERBONDEN_SLEUTEL) === '1'
  } catch {
    return false
  }
}

// Laadt het Google-aanmeldscript eenmalig.
function laadGis(): Promise<void> {
  if (gisLaden) return gisLaden
  gisLaden = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Kon de Google-aanmelding niet laden.'))
    document.head.appendChild(s)
  })
  return gisLaden
}

async function zorgVoorClient(): Promise<TokenClient> {
  await laadGis()
  if (!window.google) throw new Error('Google-aanmelding is niet beschikbaar.')
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (r) => {
        if (!wachtend) return
        const w = wachtend
        wachtend = null
        if (r.error || !r.access_token) {
          w.reject(new Error(r.error ?? 'Geen toegang gekregen.'))
          return
        }
        huidigToken = { waarde: r.access_token, verlooptOp: Date.now() + (r.expires_in ?? 3600) * 1000 }
        onthoudVerbonden()
        w.resolve(r.access_token)
      },
      error_callback: () => {
        if (!wachtend) return
        const w = wachtend
        wachtend = null
        w.reject(new Error('Aanmelding geannuleerd of mislukt.'))
      },
    })
  }
  return tokenClient
}

export function isAangemeld(): boolean {
  return huidigToken !== null && huidigToken.verlooptOp > Date.now() + 10_000
}

// Vraagt een geldig toegangstoken. 'interactief' opent zo nodig het
// aanmeldvenster (moet vanuit een knopklik gebeuren).
export async function vraagToken(interactief: boolean): Promise<string> {
  if (huidigToken && huidigToken.verlooptOp > Date.now() + 10_000) return huidigToken.waarde
  const client = await zorgVoorClient()
  return new Promise<string>((resolve, reject) => {
    wachtend = { resolve, reject }
    client.requestAccessToken({ prompt: interactief ? 'consent' : '' })
  })
}

export function meldAf(): void {
  huidigToken = null
  try {
    localStorage.removeItem(OOIT_VERBONDEN_SLEUTEL)
  } catch {
    // stil negeren
  }
}
