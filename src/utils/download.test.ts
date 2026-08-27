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

  it('laat geen anker achter wanneer de klik weigert', () => {
    // ⚠ Anders blijft er bij elke mislukte poging een onzichtbaar anker in de pagina
    // hangen — onzichtbaar, maar wel bereikbaar met een toetsenbord.
    const echteClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {
      throw new Error('geweigerd')
    }
    try {
      expect(() => downloadBlob('a.csv', new Blob(['x']))).toThrow('geweigerd')
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
    }
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
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

  // ⚠ RONDE 65. Het opruimen loopt tien seconden later in een timer. Gaat het daar
  // stuk — bijvoorbeeld omdat de pagina intussen weg is — dan komt die fout nergens
  // meer terecht: ze wordt een onafgevangen fout, lang nadat de gebruiker al iets
  // anders doet. Opruimen mag nooit harder stukgaan dan wat het opruimt.
  it('blijft overeind wanneer het vrijgeven zelf stukgaat', () => {
    vrijgeven.mockImplementation(() => {
      throw new TypeError('URL.revokeObjectURL is not a function')
    })
    const echteClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}
    try {
      downloadTekst('a.csv', 'x')
      expect(() => vi.advanceTimersByTime(10_000)).not.toThrow()
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
      vrijgeven.mockImplementation(() => undefined)
    }
  })

  it('laat de échte fout staan wanneer óók het opruimen stukgaat', () => {
    // Anders zie je "revokeObjectURL is not a function" in plaats van waarom de
    // download mislukte — en zoek je de fout op de verkeerde plek.
    vrijgeven.mockImplementation(() => {
      throw new TypeError('URL.revokeObjectURL is not a function')
    })
    const echteClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {
      throw new Error('geweigerd')
    }
    try {
      expect(() => downloadBlob('a.csv', new Blob(['x']))).toThrow('geweigerd')
    } finally {
      HTMLAnchorElement.prototype.click = echteClick
      vrijgeven.mockImplementation(() => undefined)
    }
  })
})

describe('veiligeBestandsnaam — een naam die niets overhoudt (ronde 108)', () => {
  it('valt terug wanneer er geen letter of cijfer overblijft', () => {
    // ⚠ RONDE 108. Twee dossiers die "🏠" en "🚗" heten, gaven op dezelfde dag allebei
    // `afrekening--2026-04-01.pdf`: hetzelfde bestand, dus het tweede overschrijft het
    // eerste in je downloadmap.
    expect(veiligeBestandsnaam('🏠', 60, 'dossier')).toBe('dossier')
    expect(veiligeBestandsnaam('   ', 60, 'dossier')).toBe('dossier')
    expect(veiligeBestandsnaam('···', 60, 'dossier')).toBe('dossier')
  })

  it('blijft leeg wanneer er geen terugval meegegeven is', () => {
    // De aanroepers die geen naam van een gebruiker gebruiken (het fiscale blad, het
    // maandrapport) kunnen niet leeg uitkomen, dus die hoeven er geen mee te geven.
    expect(veiligeBestandsnaam('🏠')).toBe('')
  })

  it('laat een gewone naam met rust', () => {
    expect(veiligeBestandsnaam('🏠 Huis', 60, 'dossier')).toBe('huis')
    expect(veiligeBestandsnaam('Kinderen 2026', 60, 'dossier')).toBe('kinderen-2026')
  })
})
