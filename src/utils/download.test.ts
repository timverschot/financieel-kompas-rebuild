import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dataUrlNaarBlob, downloadBlob, downloadTekst, veiligeBestandsnaam } from './download'

// Ronde 41. Twee dingen die deze helper moet garanderen en die in de drie losse
// kopieën van vóór deze ronde niet overal klopten:
//
//  1. het blob-adres wordt pas NA een tijdje vrijgegeven — geven we het meteen vrij,
//     dan breekt de download op sommige browsers halverwege af;
//  2. een mislukte download wordt niet stil geslikt maar doorgegooid, zodat het
//     scherm iets kan zeggen.

describe('veiligeBestandsnaam', () => {
  it('maakt van accenten gewone letters', () => {
    expect(veiligeBestandsnaam('Café Piano')).toBe('cafe-piano')
  })

  it('haalt tekens weg die een bestandssysteem weigert', () => {
    expect(veiligeBestandsnaam('a/b:c*d?')).toBe('a-b-c-d')
  })

  it('laat geen streepje aan het begin of einde staan', () => {
    expect(veiligeBestandsnaam('  — Kinderen 2026 — ')).toBe('kinderen-2026')
  })

  it('kort een lange naam in zonder op een streepje te eindigen', () => {
    const naam = veiligeBestandsnaam('een heel lange dossiernaam die alle grenzen tart', 12)
    expect(naam.length).toBeLessThanOrEqual(12)
    expect(naam.endsWith('-')).toBe(false)
  })

  it('geeft een lege naam terug bij tekst zonder letters of cijfers', () => {
    // De aanroeper valt dan terug op zijn eigen standaardnaam.
    expect(veiligeBestandsnaam('···')).toBe('')
  })
})

describe('dataUrlNaarBlob', () => {
  it('leest het mimetype uit de kop van de data-URL', () => {
    const { soort } = dataUrlNaarBlob('data:image/jpeg;base64,AAAA')
    expect(soort).toBe('image/jpeg')
  })

  it('valt terug op een neutraal mimetype wanneer de kop het niet zegt', () => {
    expect(dataUrlNaarBlob('data:;base64,AAAA').soort).toBe('application/octet-stream')
  })

  it('gooit een fout bij iets wat geen data-URL is', () => {
    expect(() => dataUrlNaarBlob('gewoon een tekst')).toThrow()
  })

  it('houdt de bytes heel', () => {
    // "AAA" in base64 is 0x00 0x00 0x00.
    const { blob } = dataUrlNaarBlob('data:application/octet-stream;base64,AAAA')
    expect(blob.size).toBe(3)
  })
})

describe('downloadBlob', () => {
  const maakUrl = vi.fn(() => 'blob:nep')
  const vrijgeven = vi.fn()
  // De echte functies bewaren en terugzetten. Zonder dat zou het volgende testbestand
  // in dezelfde omgeving met een halfvervangen URL-object werken — een valstrik die
  // pas veel later een onbegrijpelijke fout geeft.
  const echteMaak = URL.createObjectURL
  const echteVrij = URL.revokeObjectURL

  beforeEach(() => {
    vi.useFakeTimers()
    maakUrl.mockClear()
    vrijgeven.mockClear()
    URL.createObjectURL = maakUrl as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vrijgeven as unknown as typeof URL.revokeObjectURL
  })

  afterEach(() => {
    vi.useRealTimers()
    URL.createObjectURL = echteMaak
    URL.revokeObjectURL = echteVrij
  })

  it('geeft het bestand het meegegeven mimetype', () => {
    const echteClick = HTMLAnchorElement.prototype.click
    let soort = ''
    HTMLAnchorElement.prototype.click = () => {}
    try {
      maakUrl.mockImplementation(((blob: Blob) => {
        soort = blob.type
        return 'blob:nep'
      }) as unknown as () => string)
      downloadTekst('a.csv', 'x', 'text/csv;charset=utf-8')
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
      maakUrl.mockImplementation(() => 'blob:nep')
    }
    expect(soort).toBe('text/csv;charset=utf-8')
  })

  it('zet de bestandsnaam op de link en klikt hem aan', () => {
    const klikken: string[] = []
    const echteClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      klikken.push((this as HTMLAnchorElement).download)
    }
    try {
      downloadTekst('transacties.csv', 'a;b', 'text/csv;charset=utf-8')
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
    }
    expect(klikken).toEqual(['transacties.csv'])
  })

  it('laat geen anker achter in het document', () => {
    const echteClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}
    try {
      downloadTekst('a.csv', 'x')
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
    }
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })

  it('geeft het adres pas na tien seconden vrij, niet meteen', () => {
    const echteClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}
    try {
      downloadTekst('a.csv', 'x')
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
    }
    expect(vrijgeven).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10_000)
    expect(vrijgeven).toHaveBeenCalledWith('blob:nep')
  })

  it('gooit de fout door wanneer de browser de klik weigert, en ruimt het adres op', () => {
    const echteClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {
      throw new Error('geweigerd')
    }
    try {
      expect(() => downloadBlob('a.csv', new Blob(['x']))).toThrow('geweigerd')
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
    }
    expect(vrijgeven).toHaveBeenCalledWith('blob:nep')
  })
})
