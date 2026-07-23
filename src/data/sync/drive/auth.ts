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

type Token = { waarde: string; verlooptOp: number }

let gisLaden: Promise<void> | null = null
let tokenClient: TokenClient | null = null
let huidigToken: Token | null = null
let wachtend: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null

// Google geeft in deze browser-opzet enkel een kortlevend toegangstoken (~1 uur)
// en géén refresh-token; een volledig onzichtbare vernieuwing zonder klik is niet
// mogelijk. Om te vermijden dat je bij elke herlaad opnieuw moet klikken, bewaren
// we het token (met zijn vervaltijd) lokaal in de browser. Zolang het geldig is,
// hergebruikt de app het meteen — zonder venster. Na het verlopen volstaat één
// klik om te herverbinden (zonder opnieuw toestemming te geven).
//
// Afweging: het gaat om een kortlevend token met enkel toegang tot de eigen
// back-upmap (scope drive.file). Voor persoonlijk gebruik is dat een verantwoorde
// keuze. Bij afmelden wordt het gewist.
const TOKEN_SLEUTEL = 'fk_drive_token'

function bewaarTokenLokaal(token: Token): void {
  try {
    localStorage.setItem(TOKEN_SLEUTEL, JSON.stringify(token))
  } catch {
    // localStorage niet beschikbaar (bv. in tests): stil negeren.
  }
}

function laadTokenLokaal(): Token | null {
  try {
    const ruw = localStorage.getItem(TOKEN_SLEUTEL)
    if (!ruw) return null
    const t = JSON.parse(ruw) as Token
    if (typeof t?.waarde === 'string' && typeof t?.verlooptOp === 'number') return t
    return null
  } catch {
    return null
  }
}

// Herstel een eventueel eerder bewaard token meteen bij het laden van de module,
// zodat een herlaad of nieuw venster binnen het uur meteen verbonden is.
huidigToken = laadTokenLokaal()

// True zolang we een geldig, niet-bijna-verlopen token hebben.
export function heeftOoitVerbonden(): boolean {
  return laadTokenLokaal() !== null
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
        bewaarTokenLokaal(huidigToken)
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

// Vraagt een geldig toegangstoken.
// - Is er een geldig (bewaard) token? Dan meteen teruggeven, zonder venster.
// - Zo niet en 'interactief' is true (vanuit een knopklik): open Google om te
//   (her)verbinden. Voor wie eerder toegang gaf toont Google geen toestemmings-
//   scherm meer.
// - Zo niet en niet-interactief: we openen NOOIT zelf een venster (dat zou door
//   de browser geblokkeerd worden buiten een klik) en melden dat herverbinden
//   nodig is. De auto-sync vangt dit stil op; de gebruiker klikt gewoon opnieuw.
export async function vraagToken(interactief: boolean): Promise<string> {
  if (huidigToken && huidigToken.verlooptOp > Date.now() + 10_000) return huidigToken.waarde
  if (!interactief) throw new Error('Geen geldig token; opnieuw verbinden nodig.')
  const client = await zorgVoorClient()
  return new Promise<string>((resolve, reject) => {
    wachtend = { resolve, reject }
    // Lege prompt = geen toestemmingsscherm forceren; Google toont het enkel de
    // allereerste keer of wanneer de toegang werd ingetrokken.
    client.requestAccessToken({ prompt: '' })
  })
}

export function meldAf(): void {
  huidigToken = null
  try {
    localStorage.removeItem(TOKEN_SLEUTEL)
  } catch {
    // stil negeren
  }
}
