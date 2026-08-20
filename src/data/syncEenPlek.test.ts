import { describe, it, expect } from 'vitest'

// Ronde 63 — één poort naar het synchroniseren.
//
// `synchroniseer()` doet twee dingen die bij elkaar horen: ze zet je logboek in de
// back-up, én ze noteert de dag waarop dat laatst lukte. Het scherm moet die dag
// daarna opnieuw inlezen, anders blijft het belletje de rest van je sessie roepen
// dat er al zestig dagen niets vertrok — terwijl je net op "Synchroniseer nu" drukte
// en het gelukt was. Precies zo leer je iemand een waarschuwing weg te kijken.
//
// Daarom loopt alles in App.tsx via `syncEnOnthoud`. Deze test bewaakt dat er geen
// vijfde plek naast komt te staan, want dat merk je pas maanden later — aan een
// melding die niet weggaat.
//
// Waarom `import.meta.glob` en niet `node:fs`: dat laatste vraagt `@types/node`, en
// zonder dat pakket faalt `tsc -b` en dus de hele bouwstraat (les van ronde 54).

const bronnen = import.meta.glob('../*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

describe('het synchroniseren gaat langs één plek', () => {
  it('vindt App.tsx', () => {
    expect(Object.keys(bronnen)).toContain('../App.tsx')
  })

  it('roept synchroniseer() in App.tsx precies één keer aan', () => {
    const app = bronnen['../App.tsx'] ?? ''
    const aanroepen = app.match(/\bawait synchroniseer\(/g) ?? []
    expect(aanroepen).toHaveLength(1)
  })

  it('doet die ene aanroep binnen syncEnOnthoud', () => {
    const app = bronnen['../App.tsx'] ?? ''
    const start = app.indexOf('const syncEnOnthoud')
    expect(start).toBeGreaterThan(-1)
    const aanroep = app.indexOf('await synchroniseer(')
    expect(aanroep).toBeGreaterThan(start)
    // Binnen dezelfde functie: de aanroep staat vóór het einde van de useCallback.
    const einde = app.indexOf('}, [])', start)
    expect(aanroep).toBeLessThan(einde)
  })
})
