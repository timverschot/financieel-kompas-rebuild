import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de Google-token-ophaler zodat er geen echte auth nodig is.
vi.mock('./auth', () => ({ vraagToken: vi.fn(async () => 'test-token') }))

import { DriveBackend } from './driveBackend'
import type { Logregel } from '../events'

const regel = (id: string, toestelId: string): Logregel => ({
  id,
  toestelId,
  volgnummer: 1,
  tijdstip: 1,
  gebeurtenis: { type: 'rekening.verwijderd', payload: { id: 'r1' } },
})

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) } as unknown as Response
}

describe('DriveBackend.haalOp', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('slaat één corrupt logbestand over en behoudt de rest (sync blijft werken)', async () => {
    const goedeRegels = [regel('a', 't1'), regel('b', 't1')]
    const corrupt = { ok: true, status: 200, json: async () => { throw new Error('kapotte JSON') }, text: async () => 'x' } as unknown as Response
    const fetchMock = vi.fn(async (url: string) => {
      // Inhoud ophalen (alt=media): goed bestand geeft geldige regels, corrupt gooit.
      if (url.includes('alt=media')) {
        return url.includes('/goed') ? jsonResponse(goedeRegels) : corrupt
      }
      // Map opzoeken (query bevat de folder-mimeType).
      if (url.includes('folder') || url.includes('mimeType')) {
        return jsonResponse({ files: [{ id: 'map1' }] })
      }
      // Bestanden in de map oplijsten: één goed, één corrupt.
      return jsonResponse({ files: [{ id: 'goed' }, { id: 'corrupt' }] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const backend = new DriveBackend()
    const resultaat = await backend.haalOp()

    // Ondanks het corrupte bestand komen de geldige regels wél terug.
    expect(resultaat.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })
})

describe('DriveBackend.stuur', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('overschrijft (PATCH) een bestaand logbestand in plaats van een nieuw aan te maken', async () => {
    const calls: { url: string; method?: string }[] = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method })
      if (url.includes('folder') || url.includes('mimeType')) return jsonResponse({ files: [{ id: 'map1' }] })
      if (url.includes('/files?') && url.includes('name')) return jsonResponse({ files: [{ id: 'bestaand' }] })
      return jsonResponse({ id: 'x' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const backend = new DriveBackend()
    await backend.stuur('t1', [regel('a', 't1')])

    // Er is een PATCH op het bestaande bestand gebeurd, geen multipart-POST.
    expect(calls.some((c) => c.method === 'PATCH' && c.url.includes('bestaand'))).toBe(true)
    expect(calls.some((c) => c.method === 'POST' && c.url.includes('uploadType=multipart'))).toBe(false)
  })
})
