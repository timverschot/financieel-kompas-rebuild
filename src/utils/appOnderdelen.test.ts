import { describe, it, expect } from 'vitest'
import { PAGINAS, type Pagina } from '../components/navigatie'
import {
  ALLEEN_DE_BASIS,
  APP_ONDERDELEN,
  keurVerborgen,
  toontPagina,
  UITZETBAAR,
  wisselPagina,
} from './appOnderdelen'

describe('APP_ONDERDELEN — wat je mag uitzetten', () => {
  it('noemt alleen pagina\'s die echt bestaan', () => {
    // Een onderdeel dat naar een onbestaande pagina wijst, geeft een vinkje dat
    // nergens iets verbergt — en de kaart zou de naam van de pagina niet kunnen tonen.
    const bestaande = new Set(PAGINAS.map((p) => p.id))
    for (const o of APP_ONDERDELEN) expect(bestaande.has(o.pagina)).toBe(true)
  })

  it('geeft elk onderdeel een zin die zegt wat het is', () => {
    // ⚠ De kern van de afspraak met Timothy: verbergen mag, mét een zin die zegt wat
    // het is. Een chip met alleen een naam is een schakelaar waarvan je niet weet wat
    // hij doet, en dan durf je hem niet aan te raken.
    for (const o of APP_ONDERDELEN) expect(o.uitleg.trim().length).toBeGreaterThan(20)
  })

  it('laat de zes pagina\'s waarop de app steunt met rust', () => {
    // ⚠ Instellingen is de belangrijkste van de zes: daar staat deze schakelaar zelf.
    // Wie die kon uitzetten, kon nooit meer iets terugzetten.
    for (const id of ['overzicht', 'transacties', 'budget', 'rekeningen', 'opstelling', 'instellingen'] as Pagina[]) {
      expect(UITZETBAAR.has(id)).toBe(false)
    }
  })

  it('noemt elk onderdeel maar één keer', () => {
    expect(new Set(APP_ONDERDELEN.map((o) => o.pagina)).size).toBe(APP_ONDERDELEN.length)
  })

  it('zet met "alleen de basis" precies alles uit wat uit mag', () => {
    expect([...ALLEEN_DE_BASIS].sort()).toEqual([...UITZETBAAR].sort())
  })
})

describe('toontPagina', () => {
  it('verbergt wat je uitzette', () => {
    expect(toontPagina('analyse', new Set(['analyse'] as Pagina[]))).toBe(false)
    expect(toontPagina('analyse', new Set())).toBe(true)
  })

  it('toont een niet-uitzetbare pagina ALTIJD, ook wanneer ze in de lijst staat', () => {
    // ⚠ De belangrijkste waarborg van deze ronde. Een oude voorkeur, een ander
    // toestel of handmatig gerommel in localStorage mag nooit je Instellingen kunnen
    // wegdrukken — dat is de enige plek waar je het kan herstellen.
    expect(toontPagina('instellingen', new Set(['instellingen'] as Pagina[]))).toBe(true)
    expect(toontPagina('overzicht', new Set(['overzicht'] as Pagina[]))).toBe(true)
  })
})

describe('wisselPagina', () => {
  it('zet aan en weer uit', () => {
    const eerst = wisselPagina(new Set(), 'analyse')
    expect(eerst).toEqual(['analyse'])
    expect(wisselPagina(new Set(eerst as Pagina[]), 'analyse')).toEqual([])
  })

  it('raakt de rest niet aan', () => {
    const uit = wisselPagina(new Set(['analyse'] as Pagina[]), 'fiscaal')
    expect([...uit].sort()).toEqual(['analyse', 'fiscaal'])
  })

  it('weigert een pagina die niet uitgezet mag worden', () => {
    expect(wisselPagina(new Set(), 'instellingen')).toEqual([])
  })
})

describe('keurVerborgen — een bewaarde voorkeur overleeft een nieuwe versie', () => {
  it('houdt alleen wat vandaag nog uitzetbaar is', () => {
    // ⚠ De voorkeur staat in localStorage en overleeft dus een update. Verdwijnt een
    // pagina ooit uit de lijst — omdat ze niet meer bestaat, of omdat ze te belangrijk
    // geworden is om te verbergen — dan hoort een oude voorkeur haar niet te blijven
    // wegdrukken.
    expect(keurVerborgen(['analyse', 'bestaatniet', 'instellingen'])).toEqual(['analyse'])
  })

  it('ontdubbelt', () => {
    expect(keurVerborgen(['analyse', 'analyse'])).toEqual(['analyse'])
  })

  it('valt terug op niets bij alles wat geen lijst is', () => {
    // ⚠ De veilige kant op: bij twijfel TOONT de app alles. Zou ze bij rommel iets
    // verbergen, dan zouden pagina's verdwijnen zonder dat iemand weet waarom.
    expect(keurVerborgen(null)).toEqual([])
    expect(keurVerborgen('analyse')).toEqual([])
    expect(keurVerborgen({ analyse: true })).toEqual([])
    expect(keurVerborgen([1, 2, 3])).toEqual([])
  })
})
