import { describe, it, expect } from 'vitest'
import { INGEBOUWDE_CATEGORIEEN } from './categorieen/ingebouwd'
import { KLASSIEKE_VASTE_KOSTEN, OPSTELLING_CATEGORIE_IDS, SLUIPENDE_KOSTEN } from './opstelling'
import { vertaalSleutels } from '../i18n'

// Alle id's die in de echte boom voorkomen, op alle drie de niveaus.
const bestaat = new Set<string>()
for (const h of INGEBOUWDE_CATEGORIEEN) {
  bestaat.add(h.id)
  for (const c of h.categorieen) {
    bestaat.add(c.id)
    for (const it of c.items) bestaat.add(it.id)
  }
}

describe('de aanvinklijsten van De Opstelling', () => {
  it('verwijst uitsluitend naar categorieën die echt bestaan', () => {
    // Dit is het belangrijkste vangnet van deze lijsten. Een typefout in een id
    // levert een vaste last op die nergens in een grafiek terechtkomt, en dat merk
    // je pas maanden later. Zelfde patroon als in utils/kostensoort.test.ts.
    expect(OPSTELLING_CATEGORIE_IDS.filter((id) => !bestaat.has(id))).toEqual([])
  })

  it('heeft unieke sleutels — die dienen om te herkennen wat je al toegevoegd hebt', () => {
    const alle = [...KLASSIEKE_VASTE_KOSTEN, ...SLUIPENDE_KOSTEN].map((k) => k.sleutel)
    expect(new Set(alle).size).toBe(alle.length)
  })

  it('geeft elk voorstel een naam en een icoon', () => {
    for (const k of [...KLASSIEKE_VASTE_KOSTEN, ...SLUIPENDE_KOSTEN]) {
      expect(k.naam.trim().length).toBeGreaterThan(0)
      expect(k.icoon.trim().length).toBeGreaterThan(0)
    }
  })

  it('bevat geen onderhoudsbijdrage bij de gewone vaste lasten', () => {
    // Bewust: een onderhoudsbijdrage hoort in de Dossiers-module, waar ze
    // geïndexeerd en opgevolgd wordt. Er bestaat om diezelfde reden geen categorie
    // voor in de boom.
    const namen = KLASSIEKE_VASTE_KOSTEN.map((k) => k.naam.toLowerCase()).join(' ')
    expect(namen).not.toContain('aliment')
    expect(namen).not.toContain('onderhoudsbijdrage')
  })

  it('heeft voor elk voorstel een Engelse en een Franse naam', () => {
    // Zonder deze test voegt iemand later een regel toe zonder vertaling, en krijgt
    // een Franstalige gebruiker stil Nederlandse tekst te zien. De sleutelpariteit
    // in i18n.test.ts vangt dat niet: die vergelijkt EN met FR, niet met de bron.
    //
    // We controleren of de SLEUTEL bestaat, niet of de vertaling anders luidt:
    // "Water" heet in het Engels ook gewoon "Water", en dat is een geldige
    // vertaling — geen ontbrekende.
    //
    // Merchant-namen worden nooit vertaald; dat is de domeinregel, geen gat.
    const MERKEN = new Set(['Netflix', 'Disney+', 'Streamz', 'Amazon Prime', 'Spotify', 'Apple Music'])
    const en = new Set(vertaalSleutels('en'))
    const fr = new Set(vertaalSleutels('fr'))
    const ontbreekt: string[] = []
    for (const k of [...KLASSIEKE_VASTE_KOSTEN, ...SLUIPENDE_KOSTEN]) {
      for (const tekst of [k.naam, k.toelichting]) {
        if (!tekst || MERKEN.has(tekst)) continue
        if (!en.has(tekst)) ontbreekt.push(`en: ${tekst}`)
        if (!fr.has(tekst)) ontbreekt.push(`fr: ${tekst}`)
      }
    }
    expect(ontbreekt).toEqual([])
  })

  it('laat de categorieën van de twee lijsten elkaar niet overlappen', () => {
    // "Waarvan sluipend" herkent een post aan haar categorie. Zat een klassieke
    // kost in dezelfde categorie als een abonnement, dan telde je huur mee als
    // sluipende kost.
    const vast = new Set(KLASSIEKE_VASTE_KOSTEN.map((k) => k.categorieId))
    expect(SLUIPENDE_KOSTEN.filter((k) => vast.has(k.categorieId))).toEqual([])
  })

  it('houdt de twee lijsten gescheiden', () => {
    const vast = new Set(KLASSIEKE_VASTE_KOSTEN.map((k) => k.sleutel))
    expect(SLUIPENDE_KOSTEN.filter((k) => vast.has(k.sleutel))).toEqual([])
  })
})
