import { describe, it, expect } from 'vitest'
import { bepaalPlatform, isIOS, isStandalone } from './installeren'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const IPAD_ALS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

describe('isIOS', () => {
  it('herkent een iPhone', () => {
    expect(isIOS(IPHONE)).toBe(true)
  })

  it('herkent een iPad die zich als Mac voordoet, aan de aanraakpunten', () => {
    expect(isIOS(IPAD_ALS_MAC, 5)).toBe(true)
  })

  it('houdt een echte Mac zonder aanraakscherm buiten', () => {
    expect(isIOS(IPAD_ALS_MAC, 0)).toBe(false)
  })

  it('herkent Android en Windows niet als iOS', () => {
    expect(isIOS(ANDROID)).toBe(false)
    expect(isIOS(WINDOWS)).toBe(false)
  })
})

describe('isStandalone', () => {
  it('is waar zodra een van de twee signalen waar is', () => {
    expect(isStandalone(true, false)).toBe(true)
    expect(isStandalone(false, true)).toBe(true)
    expect(isStandalone(false, false)).toBe(false)
  })
})

describe('bepaalPlatform', () => {
  it('zegt niets wanneer de app al als app draait', () => {
    expect(bepaalPlatform({ userAgent: IPHONE, standalone: true, heeftVoorstel: false })).toBe('alGeinstalleerd')
  })

  it('geeft een knop wanneer de browser zelf een voorstel klaar heeft', () => {
    expect(bepaalPlatform({ userAgent: ANDROID, standalone: false, heeftVoorstel: true })).toBe('installeerbaar')
  })

  it('geeft de handleiding op een iPhone, want daar bestaat geen voorstel', () => {
    expect(bepaalPlatform({ userAgent: IPHONE, standalone: false, heeftVoorstel: false })).toBe('ios')
  })

  it('een al geïnstalleerde app weegt zwaarder dan een voorstel', () => {
    expect(bepaalPlatform({ userAgent: ANDROID, standalone: true, heeftVoorstel: true })).toBe('alGeinstalleerd')
  })

  it('zwijgt liever dan iets fout te zeggen op een onbekende combinatie', () => {
    expect(bepaalPlatform({ userAgent: WINDOWS, standalone: false, heeftVoorstel: false })).toBe('onbekend')
  })
})
