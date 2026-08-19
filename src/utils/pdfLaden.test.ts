import { describe, it, expect } from 'vitest'

// Ronde 56 — het vangnet onder de PDF-bibliotheek.
//
// De vijf documenten van de app halen die bibliotheek (390 kB) pas op wanneer je
// erom vraagt. Dat is de juiste keuze — bijna niemand maakt bij elk bezoek een PDF —
// maar ze heeft een prijs: het bestand draagt een code in zijn naam die bij elke
// publicatie verandert, en na een publicatie bestaat de oude niet meer. Had je de app
// open staan, dan vraagt ze een bestand op dat weg is, en zei ze tot deze ronde
// "probeer het opnieuw" — de enige raad die daar nooit kan werken.
//
// `laadJsPdf` in pdfBlad.ts is de ene plek die dat opvangt. Deze test bewaakt dat er
// geen zesde document naast komt te staan: wie `import('jspdf')` rechtstreeks
// schrijft, valt buiten het vangnet, en dat merk je pas maanden later — bij een
// afrekening die naar de andere ouder moest.
//
// Waarom `import.meta.glob` en niet `node:fs`: dat laatste vraagt `@types/node`, en
// zonder dat pakket faalt `tsc -b` en dus de hele CI (les van ronde 54).

const bronnen = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('het ophalen van de PDF-bibliotheek', () => {
  it('vindt genoeg bestanden om iets te bewijzen', () => {
    // Een ondergrens, anders slaagt deze test stil op nul bestanden wanneer het
    // patroon ooit naast de map grijpt.
    expect(Object.keys(bronnen).length).toBeGreaterThan(40)
  })

  it('haalt jsPDF op precies één plek op', () => {
    const rechtstreeks = Object.entries(bronnen)
      .filter(([pad]) => !pad.endsWith('.test.ts'))
      .filter(([, inhoud]) => /import\(['"]jspdf['"]\)/.test(inhoud))
      .map(([pad]) => pad)
    expect(rechtstreeks).toEqual(['./pdfBlad.ts'])
  })

  it('laat elk document dat een PDF maakt langs die plek gaan', () => {
    const documenten = Object.entries(bronnen)
      .filter(([pad]) => !pad.endsWith('.test.ts'))
      .filter(([, inhoud]) => /new jsPDF\(/.test(inhoud))
    // De vijf: afrekening, bewijsmap, fiscaal overzicht, indexatiebrief, maandrapport.
    expect(documenten.length).toBe(5)
    const zonderVangnet = documenten.filter(([, inhoud]) => !/laadJsPdf\(\)/.test(inhoud)).map(([pad]) => pad)
    expect(zonderVangnet).toEqual([])
  })

  it('laat het vangnet zelf door `laadOnderdeel` lopen', () => {
    const pdfBlad = bronnen['./pdfBlad.ts']
    expect(pdfBlad).toBeTruthy()
    expect(/laadOnderdeel\(\(\) => import\(['"]jspdf['"]\)\)/.test(pdfBlad)).toBe(true)
  })
})
