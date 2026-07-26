import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InstallerenKaart } from './InstallerenKaart'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const echteUA = navigator.userAgent

function zetUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

function zetStandalone(aan: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: aan && query.includes('standalone'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  zetStandalone(false)
})

afterEach(() => {
  zetUserAgent(echteUA)
  vi.restoreAllMocks()
})

describe('InstallerenKaart', () => {
  it('geeft op een iPhone de stappen met de hand, want daar bestaat geen voorstel', () => {
    zetUserAgent(IPHONE)
    render(<InstallerenKaart />)
    expect(screen.getByText('Open deze pagina in Safari (niet in een andere browser).')).toBeInTheDocument()
    expect(screen.getByText('Tik op de drie puntjes rechts van de adresbalk en kies "Deel".')).toBeInTheDocument()
    expect(
      screen.getByText('Zet de schakelaar "Open as Web App" AAN — anders krijg je enkel een bladwijzer.'),
    ).toBeInTheDocument()
    // Geen knop: die zou op iOS niets doen.
    expect(screen.queryByRole('button', { name: 'Zet op beginscherm' })).not.toBeInTheDocument()
  })

  it('geeft een knop zodra de browser zelf een voorstel klaar heeft', async () => {
    zetUserAgent(ANDROID)
    render(<InstallerenKaart />)
    expect(screen.queryByRole('button', { name: 'Zet op beginscherm' })).not.toBeInTheDocument()

    // De browser vuurt zijn voorstel af; wij houden het tegen en bieden een knop aan.
    const gebeurtenis = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    act(() => {
      window.dispatchEvent(gebeurtenis)
    })

    const knop = await screen.findByRole('button', { name: 'Zet op beginscherm' })
    await userEvent.click(knop)
    expect(gebeurtenis.prompt).toHaveBeenCalled()
    expect(await screen.findByText('De app staat nu op je beginscherm.')).toBeInTheDocument()
  })

  it('zegt niets meer wanneer de app al als app draait', () => {
    zetUserAgent(IPHONE)
    zetStandalone(true)
    render(<InstallerenKaart />)
    expect(screen.getByText('Je gebruikt Kompal al als app. Zo werkt ze ook zonder internet.')).toBeInTheDocument()
    expect(screen.queryByText(/Open deze pagina in Safari/)).not.toBeInTheDocument()
  })

  it('houdt het vaag in plaats van fout op een onbekende combinatie', () => {
    zetUserAgent(WINDOWS)
    render(<InstallerenKaart />)
    expect(screen.getByText(/Je browser biedt hier nu niets aan/)).toBeInTheDocument()
  })
})
