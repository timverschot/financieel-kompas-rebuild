import { describe, it, expect } from 'vitest'
import * as Sentry from '@sentry/react'
import { onderdelen, zeefKruimel, sentryOpties } from './sentry'

// ⚠ RONDE 68 — DEZE TEST BEWAAKT EEN BELOFTE OP HET SCHERM.
//
// Instellingen zegt: "een technisch foutrapport (welke fout, welke browser) — nooit
// een bedrag of een naam". Sentry legt bij elke klik het `aria-label` van de knop
// vast, en die labels dragen in deze app bedragen en namen ("Bewerk Colruyt —
// 14 aug 2026, € 43,20"). Zonder deze twee sloten is die zin onwaar.

describe('welke onderdelen van de crashrapportage meedoen', () => {
  it('vervangt het kruimelspoor door een versie zonder kliks en zonder console', () => {
    const standaard = Sentry.getDefaultIntegrations({})
    const uit = onderdelen(standaard)
    const kruimels = uit.filter((i) => i.name === 'Breadcrumbs')
    // Precies één — niet de standaardversie én de onze naast elkaar.
    expect(kruimels).toHaveLength(1)
    expect(kruimels[0]).not.toBe(standaard.find((i) => i.name === 'Breadcrumbs'))
  })

  it('laat de vanger voor onafgevangen fouten staan', () => {
    // ⚠ Die is de reden dat een weggegooide belofte überhaupt ergens aankomt. Hem
    // meenemen in de opkuis zou deze hele ronde blind maken.
    const uit = onderdelen(Sentry.getDefaultIntegrations({})).map((i) => i.name)
    expect(uit).toContain('GlobalHandlers')
    expect(uit).toContain('Dedupe')
  })
})

describe('het tweede slot op het kruimelspoor', () => {
  it('gooit alles weg wat over een klik of een consoleregel gaat', () => {
    expect(zeefKruimel({ category: 'ui.click', message: 'aria-label="Bewerk Colruyt — € 43,20"' })).toBeNull()
    expect(zeefKruimel({ category: 'ui.input' })).toBeNull()
    expect(zeefKruimel({ category: 'console' })).toBeNull()
  })

  it('laat staan wat een vastgelopen synchronisatie verklaart', () => {
    // Een adres draagt in deze app bewust geen namen of bedragen (ronde 59).
    expect(zeefKruimel({ category: 'navigation' })).not.toBeNull()
    expect(zeefKruimel({ category: 'fetch' })).not.toBeNull()
    expect(zeefKruimel({})).not.toBeNull()
  })
})

describe('de bedrading van de crashrapportage', () => {
  it('geeft allebei de sloten door aan Sentry', () => {
    // ⚠ `onderdelen` en `zeefKruimel` waren elk apart getoetst, maar niets bewees dat
    // ze ook echt gebruikt worden. Haal je één van de twee regels uit `sentryOpties`,
    // dan is de belofte op het scherm weer onwaar zonder dat er iets rood wordt.
    const opties = sentryOpties()
    expect(opties.integrations).toBe(onderdelen)
    expect(opties.beforeBreadcrumb).toBe(zeefKruimel)
    // En geen persoonlijke gegevens, geen prestatiemeting.
    expect(opties.sendDefaultPii).toBe(false)
    expect(opties.tracesSampleRate).toBe(0)
  })
})
