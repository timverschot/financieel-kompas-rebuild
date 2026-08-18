import { describe, it, expect } from 'vitest'
import { vertaalSleutels } from './i18n'

// Staat élke tekst uit de broncode ook in de Engelse én de Franse tabel? (ronde 54)
//
// WAAROM DEZE TEST BESTAAT. `i18n.test.ts` vergelijkt EN met FR en vindt dus een
// tekst die in één van beide ontbreekt. Maar een tekst die in ALLEBEI ontbreekt,
// glipt er ongemerkt door: `vertaal()` valt stil terug op het Nederlands, en dat
// ziet er in het Engels uit als een gewone zin die je toevallig niet kent. Precies
// dat gebeurde in ronde 53 met de toegankelijke naam van een knop — het scherm werkte,
// de tests waren groen, en een Engelstalige schermlezer las Nederlands voor.
//
// Deze test leest de broncode zelf en zoekt elke `t('…')` met een LETTERLIJKE tekst.
//
// DE GRENS, en die is echt: `t(variabele)` kan hij niet volgen. De app doet dat op
// zo'n zestig plaatsen — `t(post.naam)`, `t(ROL_SLEUTELS[r])`, `t(p.label)` — waar de
// tekst uit een gegevensbestand of een tabel komt. Die vallen buiten deze test, en
// dat staat hieronder ook expliciet in een tweede test, zodat het aantal niet stil
// kan groeien zonder dat iemand ernaar kijkt.

// De bronbestanden komen via Vite binnen, niet via `node:fs`. Dat scheelt een extra
// pakket (`@types/node`) én een valkuil: met `node:fs` moet je zelf uitrekenen waar
// de broncode staat, en een misrekening laat deze test stil slagen op nul bestanden.
// `import.meta.glob` wordt bij het bouwen ingevuld en kan dus niet naast de map
// grijpen. `eager` en `?raw`: de inhoud als tekst, meteen mee ingeladen.
const RUW = import.meta.glob('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

const bestanden = Object.keys(RUW)
  .filter((pad) => !/\.test\.tsx?$/.test(pad))
  .sort()

/**
 * De letterlijke teksten uit `t('…')` in één bestand.
 *
 * Vangt zowel enkele als dubbele aanhalingstekens, en zowel `t('x')` als
 * `t('x', { n })`. Een tekst met een backslash-escape (`\'`) komt in deze app niet
 * voor; zou dat ooit veranderen, dan mist deze uitdrukking hem stil — vandaar de
 * controle op het totale aantal hieronder.
 */
function sleutelsIn(inhoud: string): string[] {
  const uit: string[] = []
  for (const m of inhoud.matchAll(/\bt\(\s*'([^'\\]+)'/g)) uit.push(m[1])
  for (const m of inhoud.matchAll(/\bt\(\s*"([^"\\]+)"/g)) uit.push(m[1])
  return uit
}

/** `t(iets.anders)` — een sleutel die pas tijdens het draaien bekend is. */
function dynamischeAanroepen(inhoud: string): number {
  return [...inhoud.matchAll(/(?<![\w.])t\(\s*[A-Za-z_$][\w$.[\]'"]*\s*[,)]/g)].length
}

describe('vertaaldekking — elke tekst uit de broncode staat in beide tabellen', () => {
  const en = new Set(vertaalSleutels('en'))
  const fr = new Set(vertaalSleutels('fr'))

  it('vindt de bronbestanden en de teksten erin', () => {
    // Zonder deze controle zou een stukgelopen glob de hele test stil laten slagen:
    // nul bestanden betekent nul ontbrekende sleutels.
    expect(bestanden.length).toBeGreaterThan(80)
    const alle = bestanden.flatMap((b) => sleutelsIn(RUW[b]))
    expect(alle.length).toBeGreaterThan(500)
  })

  it('mist geen enkele tekst in het Engels of het Frans', () => {
    const ontbreekt: string[] = []
    for (const bestand of bestanden) {
      for (const sleutel of new Set(sleutelsIn(RUW[bestand]))) {
        const talen = [!en.has(sleutel) && 'EN', !fr.has(sleutel) && 'FR'].filter(Boolean)
        if (talen.length > 0) ontbreekt.push(`${bestand}: "${sleutel}" (${talen.join(' + ')})`)
      }
    }
    // De volledige lijst in de foutmelding, zodat je ze in één keer kan aanvullen.
    expect(ontbreekt).toEqual([])
  })
})

describe('vertaaldekking — de grens van deze test', () => {
  it('houdt het aantal onvolgbare aanroepen in de gaten', () => {
    // `t(variabele)` valt buiten deze test. Dat is aanvaard, maar het aantal mag niet
    // stil groeien: wie een nieuw scherm zo bouwt, ontsnapt aan het vangnet. Loopt
    // dit getal op, kijk dan of die teksten ergens anders gedekt zijn — meestal staan
    // ze als letterlijke tekst in een tabel vlakbij (ROL_SLEUTELS, FOUTTEKST, de
    // fiscale posten, de categorienamen).
    const totaal = bestanden.reduce((som, b) => som + dynamischeAanroepen(RUW[b]), 0)
    expect(totaal).toBeLessThanOrEqual(120)
  })
})
