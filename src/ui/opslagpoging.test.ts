import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { opslagFoutTekst, foutTekst, useOpslagpoging } from './opslagpoging'
import { vertaal } from '../i18n'

const t = (sleutel: string, params?: Record<string, string | number>) => vertaal('nl', sleutel, params)

describe('opslagFoutTekst', () => {
  it('geeft de meegegeven zin terug bij een gewone fout', () => {
    expect(opslagFoutTekst(t, 'DataError: iets liep mis', 'Er is niets verwijderd.')).toBe('Er is niets verwijderd.')
  })

  it('herkent een volle opslag en geeft dan raad die wél helpt', () => {
    // ⚠ "Probeer het opnieuw" is precies de verkeerde raad bij een volle schijf:
    // dan moet er eerst iets weg. Deze app schrijft bonfoto's als tekst in de
    // database, dus dit is geen theoretisch geval.
    for (const boodschap of [
      'QuotaExceededError',
      'The quota has been exceeded.',
      'de opslag zit vol',
      'storage limit reached',
    ]) {
      expect(opslagFoutTekst(t, boodschap, 'Opslaan is niet gelukt.')).toContain('opslag van dit toestel zit vol')
    }
  })
})

describe('foutTekst', () => {
  it('haalt de boodschap uit een Error', () => {
    expect(foutTekst(new Error('database geweigerd'))).toBe('database geweigerd')
  })

  it('kan ook met iets anders dan een Error om', () => {
    expect(foutTekst('kapot')).toBe('kapot')
    expect(foutTekst(42)).toBe('42')
  })
})

describe('useOpslagpoging', () => {
  it('geeft waar terug wanneer het gelukt is, en laat geen melding staan', async () => {
    const { result } = renderHook(() => useOpslagpoging())
    let uit: boolean | undefined
    await act(async () => {
      uit = await result.current.probeer(async () => undefined)
    })
    expect(uit).toBe(true)
    expect(result.current.fout).toBe('')
    expect(result.current.bezig).toBe(false)
  })

  it('geeft ONWAAR terug bij een mislukking, met de reden erbij', async () => {
    // ⚠ Onwaar in plaats van gooien: zo staat op elke aanroepplaats zichtbaar wat er
    // bij een mislukking níét meer mag gebeuren (leegmaken, een venster sluiten).
    const { result } = renderHook(() => useOpslagpoging())
    let uit: boolean | undefined
    await act(async () => {
      uit = await result.current.probeer(() => {
        throw new Error('schijf vol')
      })
    })
    expect(uit).toBe(false)
    expect(result.current.fout).toBe('schijf vol')
    expect(result.current.bezig).toBe(false)
  })

  it('laat een tweede poging gewoon door, ook terwijl de eerste loopt', async () => {
    // ⚠ Hier stond eerst een grendel, en die is er bewust weer uit (tweede
    // doorlichting ronde 68): één kaart deelt één poging, dus die grendel sloeg ook
    // toe wanneer je tijdens een trage opslag op een ÁNDERE knop van dezelfde kaart
    // tikte — en dan gebeurde er zichtbaar niets. Dat mag nu, omdat elke schrijfactie
    // een vast id gebruikt: twee keer tikken levert twee keer hetzelfde record op.
    const { result } = renderHook(() => useOpslagpoging())
    const actie = vi.fn(async () => undefined)

    await act(async () => {
      await Promise.all([result.current.probeer(actie), result.current.probeer(actie)])
    })

    expect(actie).toHaveBeenCalledTimes(2)
    expect(result.current.bezig).toBe(false)
  })

  it('wist een oude melding zodra je het opnieuw probeert', async () => {
    const { result } = renderHook(() => useOpslagpoging())
    await act(async () => {
      await result.current.probeer(() => {
        throw new Error('schijf vol')
      })
    })
    expect(result.current.fout).toBe('schijf vol')

    await act(async () => {
      await result.current.probeer(async () => undefined)
    })
    expect(result.current.fout).toBe('')
  })

  it('laat de melding met de hand wissen', async () => {
    const { result } = renderHook(() => useOpslagpoging())
    await act(async () => {
      await result.current.probeer(() => {
        throw new Error('kapot')
      })
    })
    act(() => result.current.wis())
    expect(result.current.fout).toBe('')
  })
})
