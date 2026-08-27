import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NieuweVersieBalk } from './NieuweVersieBalk'
import { meldNieuweVersie, vergeetNieuweVersie } from '../utils/appVersie'
import { TaalProvider } from '../i18n'

// Ronde 56. Deze balk is het enige wat de gebruiker vertelt dat zijn scherm niet meer
// bij de server past. Zonder haar loopt hij vast op een afrekening die pas na een
// herlaadbeurt lukt, zonder één aanwijzing waarom.

beforeEach(() => {
  vergeetNieuweVersie()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function toon(taal: 'nl' | 'en' | 'fr' = 'nl') {
  localStorage.setItem('fk_taal', taal)
  return render(
    <TaalProvider>
      <NieuweVersieBalk />
    </TaalProvider>,
  )
}

describe('NieuweVersieBalk', () => {
  it('houdt het vak leeg zolang er niets nieuws is', () => {
    // Het VAK staat er wel, en dat is met opzet: een `role="status"` die pas mét zijn
    // tekst in het document verschijnt, wordt door sommige schermlezers niet
    // voorgelezen. Dezelfde regel als bij de exportmeldingen elders in de app.
    toon()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Herlaad' })).not.toBeInTheDocument()
  })

  it('laat je de melding wegklikken', () => {
    // Na elke publicatie verschijnt ze opnieuw. Kan je ze niet wegdoen, dan wordt ze
    // een sta-in-de-weg — en de foutmelding bij een export zegt intussen zélf dat je
    // moet herladen, dus er gaat niets verloren.
    toon()
    act(() => meldNieuweVersie())
    expect(screen.getByRole('button', { name: 'Herlaad' })).toBeInTheDocument()
    return userEvent.setup().click(screen.getByRole('button', { name: 'Melding sluiten' })).then(() => {
      expect(screen.queryByRole('button', { name: 'Herlaad' })).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })
  })

  it('verschijnt zodra er een nieuwe versie klaarstaat', () => {
    toon()
    act(() => meldNieuweVersie())
    expect(screen.getByRole('status')).toHaveTextContent(/nieuwe versie/i)
    expect(screen.getByRole('button', { name: 'Herlaad' })).toBeInTheDocument()
  })

  it('staat er meteen wanneer het al gemeld was vóór ze getekend werd', () => {
    // De volgorde is niet te sturen: een PDF-export kan mislukken op een moment dat
    // deze component nog niet bestaat (op een andere pagina).
    meldNieuweVersie()
    toon()
    expect(screen.getByRole('status')).toHaveTextContent(/nieuwe versie/i)
  })

  it('herlaadt de pagina wanneer je op de knop duwt', async () => {
    const herlaad = vi.fn()
    vi.stubGlobal('location', { reload: herlaad })
    const user = userEvent.setup()
    toon()
    act(() => meldNieuweVersie())
    await user.click(screen.getByRole('button', { name: 'Herlaad' }))
    expect(herlaad).toHaveBeenCalledTimes(1)
  })

  it('zegt het ook in het Frans', () => {
    toon('fr')
    act(() => meldNieuweVersie())
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()
  })

  it('start de versiewacht ook zelf, als vangnet (ronde 99)', () => {
    // ⚠ `main.tsx` start het wachten vóór het renderen — dat is de bedoeling van deze
    // ronde. Maar géén enkele test raakt `main.tsx`: haal die regel daar weg en alle
    // tests blijven groen terwijl de klacht van Timothy precies terug is. Deze component
    // start hem daarom nog eens; `startVersiewacht` is idempotent, dus dat kost niets.
    const luisteraars: Record<string, (() => void)[]> = {}
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {},
        getRegistration: () => Promise.resolve({ update: vi.fn(), addEventListener: () => {} }),
        addEventListener: (naam: string, cb: () => void) => {
          luisteraars[naam] = [...(luisteraars[naam] ?? []), cb]
        },
        removeEventListener: () => {},
      },
    })
    toon()
    expect((luisteraars['controllerchange'] ?? []).length).toBe(1)
  })

  it('meldt zichzelf netjes af', () => {
    // Anders blijft er na elke paginawissel een luisteraar hangen die een component
    // wil bijwerken die niet meer bestaat.
    const { unmount } = toon()
    unmount()
    expect(() => act(() => meldNieuweVersie())).not.toThrow()
  })
})
