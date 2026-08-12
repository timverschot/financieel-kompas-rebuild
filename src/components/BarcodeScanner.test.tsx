import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BarcodeScanner } from './BarcodeScanner'
import { geldigeStreepjescode } from '../utils/openFoodFacts'

// De camera bestaat niet in een test; ZXing valt dan netjes terug op de foutmelding.
// Precies daarom bestaan de twee wegen zonder camera — en die zijn hier te testen.

function toon() {
  const onGevonden = vi.fn()
  const onSluiten = vi.fn()
  const uit = render(<BarcodeScanner onGevonden={onGevonden} onSluiten={onSluiten} />)
  return { ...uit, onGevonden, onSluiten }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('geldigeStreepjescode', () => {
  it('aanvaardt de lengtes die op een winkelproduct staan', () => {
    // EAN-8, UPC-A, EAN-13 en ITF-14.
    for (const code of ['12345678', '123456789012', '5410041001008', '12345678901234']) {
      expect(geldigeStreepjescode(code)).toBe(true)
    }
  })

  it('weigert een typfout in plaats van er stil mee te gaan opzoeken', () => {
    for (const code of ['', '123', '541004100100812', '541004100', '54100a1001008']) {
      expect(geldigeStreepjescode(code)).toBe(false)
    }
  })

  it('trekt zich niets aan van spaties', () => {
    expect(geldigeStreepjescode('5410 0410 01008')).toBe(true)
  })
})

describe('BarcodeScanner — de streepjescode intypen', () => {
  it('geeft de getypte code door', async () => {
    const gebruiker = userEvent.setup()
    const { onGevonden } = toon()
    await gebruiker.type(screen.getByLabelText('Of typ de streepjescode'), '5410041001008')
    await gebruiker.click(screen.getByRole('button', { name: 'Opzoeken' }))
    expect(onGevonden).toHaveBeenCalledWith({ code: '5410041001008' })
  })

  it('zoekt niets op bij een ongeldige code, en zegt waarom', async () => {
    const gebruiker = userEvent.setup()
    const { onGevonden } = toon()
    await gebruiker.type(screen.getByLabelText('Of typ de streepjescode'), '541004')
    await gebruiker.click(screen.getByRole('button', { name: 'Opzoeken' }))
    expect(onGevonden).not.toHaveBeenCalled()
    expect(screen.getByText(/8, 12, 13 of 14 cijfers/)).toBeInTheDocument()
  })

  it('werkt ook met Enter, zodat je de knop niet hoeft te zoeken', async () => {
    const gebruiker = userEvent.setup()
    const { onGevonden } = toon()
    await gebruiker.type(screen.getByLabelText('Of typ de streepjescode'), '5410041001008{Enter}')
    expect(onGevonden).toHaveBeenCalledWith({ code: '5410041001008' })
  })
})

describe('BarcodeScanner — zoeken op productnaam', () => {
  it('zoekt niet bij minder dan drie letters', async () => {
    const gebruiker = userEvent.setup()
    toon()
    await gebruiker.type(screen.getByLabelText('Of zoek op productnaam'), 'ch')
    await new Promise((r) => setTimeout(r, 450))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('toont de treffers en geeft de gekozen door, inclusief Nutri-Score', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [{ code: '999', product_name_nl: 'Choco', nutriscore_grade: 'd' }] }),
      }),
    )
    const gebruiker = userEvent.setup()
    const { onGevonden } = toon()
    await gebruiker.type(screen.getByLabelText('Of zoek op productnaam'), 'choco')
    const treffer = await screen.findByRole('button', { name: /Choco/ }, { timeout: 3000 })
    await gebruiker.click(treffer)
    expect(onGevonden).toHaveBeenCalledWith({ code: '999', naam: 'Choco', nutriScore: 'd' })
  })

  it('zegt het eerlijk wanneer er niets gevonden is', async () => {
    const gebruiker = userEvent.setup()
    toon()
    await gebruiker.type(screen.getByLabelText('Of zoek op productnaam'), 'zzzzz')
    expect(await screen.findByText(/Niets gevonden/, undefined, { timeout: 3000 })).toBeInTheDocument()
  })
})

describe('BarcodeScanner — de weg terug', () => {
  it('laat zich sluiten', async () => {
    const gebruiker = userEvent.setup()
    const { onSluiten } = toon()
    await gebruiker.click(screen.getByRole('button', { name: 'Sluiten' }))
    expect(onSluiten).toHaveBeenCalled()
  })

  it('biedt ook zonder camera een weg vooruit', async () => {
    // Dit was het pijnpunt: mislukte het scannen, dan stond er alleen "Sluiten".
    toon()
    expect(await screen.findByLabelText('Of typ de streepjescode')).toBeInTheDocument()
    expect(screen.getByLabelText('Of zoek op productnaam')).toBeInTheDocument()
  })
})
