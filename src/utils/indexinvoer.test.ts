import { describe, it, expect } from 'vitest'
import { indexOpmerking, keurIndexcijfer, keurIndexpaar } from './indexinvoer'
import { indexcijfer, laatsteIndexmaand } from '../data/indexreeksen'

const t = (s: string, p?: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(p?.[k] ?? `{${k}}`))

const goed = (tekst: string) => keurIndexcijfer(t, tekst)

describe('keurIndexcijfer', () => {
  it('laat een leeg veld leeg: niet indexeren is een geldige keuze', () => {
    expect(goed('')).toEqual({ soort: 'leeg' })
    expect(goed('   ')).toEqual({ soort: 'leeg' })
  })

  it('leest een komma als decimaalteken', () => {
    expect(goed('128,50')).toEqual({ soort: 'goed', waarde: 128.5 })
  })

  it('weigert invoer die maar half een getal is', () => {
    // ⚠ `Number.parseFloat('140,17 (juli 2026)')` geeft 140,17 en gooit de rest stil
    // weg — precies het gedrag dat deze keuring moet uitbannen.
    expect(goed('140,17 (juli 2026)').soort).toBe('fout')
    expect(goed('140,17,5').soort).toBe('fout')
    expect(goed('1.281,50').soort).toBe('fout')
  })

  it('weigert onleesbare invoer in plaats van ze stil weg te gooien', () => {
    // ⚠ Dit was de fout: `Number.parseFloat('honderd')` is NaN, en de oude code
    // liet dat veld dan gewoon weg. De afspraak werd bewaard zónder index terwijl
    // jij dacht dat je geïndexeerd had.
    const uit = goed('honderd')
    expect(uit.soort).toBe('fout')
    if (uit.soort === 'fout') expect(uit.tekst).toContain('geen indexcijfer')
  })

  it('weigert nul en negatieve cijfers', () => {
    expect(goed('0').soort).toBe('fout')
    expect(goed('-3').soort).toBe('fout')
  })

  it('aanvaardt elk leesbaar cijfer: de plausibiliteit hoort bij het paar', () => {
    expect(goed('79,45')).toEqual({ soort: 'goed', waarde: 79.45 })
  })
})

describe('keurIndexpaar', () => {
  const laatste = indexcijfer(undefined, laatsteIndexmaand(undefined)) as number
  const nu = String(laatste).replace('.', ',')

  it('laat twee lege velden gewoon door', () => {
    expect(keurIndexpaar(t, goed(''), goed(''))).toBeNull()
  })

  it('vraagt allebei de cijfers wanneer er maar één ingevuld is', () => {
    expect(keurIndexpaar(t, goed('110'), goed(''))).toContain('allebei de cijfers')
    expect(keurIndexpaar(t, goed(''), goed(nu))).toContain('allebei de cijfers')
  })

  it('geeft de leesfout door vóór alle andere controles', () => {
    expect(keurIndexpaar(t, goed('honderd'), goed(nu))).toContain('geen indexcijfer')
    expect(keurIndexpaar(t, goed('110'), goed('honderd'))).toContain('geen indexcijfer')
  })

  it('aanvaardt een gewone indexatie', () => {
    expect(keurIndexpaar(t, goed('110'), goed(nu))).toBeNull()
  })

  it('aanvaardt een aanvangsindex uit een oud basisjaar', () => {
    // ⚠ Een vonnis uit 1999 draagt een aanvangsindex rond de 74. Dat is een correct
    // cijfer; weigeren zou het scherm iets laten verbieden wat de waarschuwing
    // eronder juist vraagt.
    expect(keurIndexpaar(t, goed('74,20'), goed(nu))).toBeNull()
  })

  it('weigert niets wat rekenkundig kan kloppen', () => {
    // ⚠ Dit is de kern van de derde nakijkronde. Een paar dat VOLLEDIG in basis
    // 2025 = 100 staat, geeft exact hetzelfde bedrag als hetzelfde paar in basis
    // 2013 = 100 — `geindexeerdeBijdrage` gebruikt alleen de verhouding. Weigeren
    // zou betekenen dat het scherm verbiedt wat de waarschuwing eronder juist vraagt.
    expect(keurIndexpaar(t, goed('80,95'), goed('103,60'))).toBeNull()
    // En een afspraak van jaren geleden, met een huidig cijfer dat intussen ver
    // achterligt, moet gewoon nog te bewaren zijn.
    expect(keurIndexpaar(t, goed('100'), goed('122,04'))).toBeNull()
  })

  it('laat een dalende index door: de wet kent ook een verlaging', () => {
    // Artikel 203quater spreekt van "de verhoging of de verlaging", en de tabellen
    // van de app bevatten zelf maanden waarin de index daalde.
    expect(keurIndexpaar(t, goed(String(laatste * 1.05)), goed(nu))).toBeNull()
  })
})

describe('indexOpmerking', () => {
  const laatste = indexcijfer(undefined, laatsteIndexmaand(undefined)) as number

  it('zwijgt over een cijfer dat dicht bij de tabel van de app ligt', () => {
    expect(indexOpmerking(t, goed(String(laatste)))).toBeNull()
    expect(indexOpmerking(t, goed(String(laatste * 1.05)))).toBeNull()
  })

  it('zwijgt over een leeg of onleesbaar veld', () => {
    expect(indexOpmerking(t, goed(''))).toBeNull()
    expect(indexOpmerking(t, goed('honderd'))).toBeNull()
  })

  it('merkt een cijfer op dat uit de nieuwe basis 2025 = 100 lijkt te komen', () => {
    // Statbel publiceert sinds januari 2026 standaard in basis 2025 = 100, en dat is
    // net het cijfer dat je vandaag opzoekt. De app rekent in basis 2013 = 100.
    const zin = indexOpmerking(t, goed(String(laatste / 1.35298)))
    expect(zin).toContain('2025 = 100')
    expect(zin).toContain('Ter controle')
  })

  it('merkt ook een cijfer op dat veel te hoog ligt', () => {
    expect(indexOpmerking(t, goed(String(laatste * 1.5)))).toContain('Ter controle')
  })
})
