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
// zo'n negentig plaatsen — `t(post.naam)`, `t(ROL_SLEUTELS[r])`, `t(p.label)` — waar de
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
 * `t('x', { n })`.
 *
 * ⚠ RONDE 66, slotronde. Hier stond eerst `[^'\\]+` — een uitdrukking die élke
 * tekst mét een backslash-escape stil oversloeg, met in het commentaar de
 * geruststelling dat zoiets in deze app niet voorkwam. Dat klopte niet meer:
 * `t('Meer pagina\'s')` en een zin met `\"Het gezin\"` erin vielen er allebei
 * buiten. Twee schermteksten waren dus ongedekt, en omdat woordenschat.test.ts op
 * de volledigheid van dezelfde tabel steunt, waren ze daar ook ongedekt — precies
 * hoe er een dode dubbele sleutel kon ontstaan. De escapes worden nu meegenomen én
 * teruggerekend naar de echte tekst, zodat de sleutel klopt met wat er in de
 * vertaaltabel staat.
 */
function sleutelsIn(inhoud: string): string[] {
  const uit: string[] = []
  for (const m of inhoud.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)+)'/g)) uit.push(ontsnap(m[1]))
  for (const m of inhoud.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)+)"/g)) uit.push(ontsnap(m[1]))
  return uit
}

/**
 * Een geschreven escape terugrekenen naar het teken dat hij voorstelt: `\'` is
 * gewoon `'`, en `\u2019` is het typografische aanhalingsteken ’. Zonder dat
 * laatste zou de sleutel uit de broncode nooit gelijk zijn aan die in de tabel,
 * en meldde deze test een tekst als ontbrekend terwijl ze er wél in stond.
 */
function ontsnap(ruw: string): string {
  return ruw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(['"\\])/g, '$1')
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

// --- De andere richting: staat élke sleutel uit de tabel ook nog in de broncode? ---
//
// ⚠ RONDE 66, slotronde. Dit vangnet ontbrak, en dat is te merken geweest: bij elke
// zin die deze ronde herschreven werd, bleef de oude versie in beide tabellen staan.
// Vier keer in de meldingenbel alleen al. Zulke wezen doen geen kwaad, maar ze maken
// de tabel onbetrouwbaar: je zoekt een zin, vindt er twee, en past de verkeerde aan.
//
// De controle is ruw met opzet: een sleutel telt als "in gebruik" zodra hij ergens in
// de broncode als tekst voorkomt. Dat dekt ook de sleutels die via een tabel bij
// `t()` komen (`ROL_SLEUTELS`, de fiscale posten, de categorienamen) — die staan als
// gewone string in een gegevensbestand. Een sleutel die nergens meer voorkomt, is
// aantoonbaar dood.
describe('geen dode vertalingen — elke sleutel uit de tabel bestaat nog in de broncode', () => {
  // Álle bestanden, ook de tests: een sleutel die alleen in een test voorkomt is nog
  // steeds in gebruik, en het is niet aan deze test om daarover te oordelen.
  //
  // ⚠ ZONDER COMMENTAAR. Anders telt een zin die in een toelichting geciteerd wordt
  // ("hier stond eerst …") als in gebruik, en dat is precies wat er in deze ronde
  // gebeurde: bij elke herschreven zin bleef de oude in de tabel staan, netjes
  // afgedekt door mijn eigen uitleg erover.
  //
  // ⚠ EN ZONDER i18n.tsx ZELF. Daar staat elke sleutel per definitie in — het ís de
  // tabel — dus zonder deze uitzondering slaagt deze test altijd en bewaakt ze niets.
  const alleBron = Object.entries(RUW)
    .filter(([pad]) => !/\/i18n\.tsx$/.test(pad))
    .map(([, inhoud]) => zonderCommentaar(inhoud))
    .join('\n')

  it('leest de broncode', () => {
    expect(alleBron.length).toBeGreaterThan(100_000)
  })

  it('heeft geen sleutel die nergens meer gebruikt wordt', () => {
    // Een geschreven `\'` is in de tekst gewoon `'`; zie `ontsnap` hierboven.
    const bron = ontsnap(alleBron)
    // ⚠ ALS VOLLEDIGE TEKST tussen aanhalingstekens, niet als deelstring. Zocht je
    // alleen naar de tekst zelf, dan houdt een langere zin een kortere sleutel in
    // leven: `'Alle'` bleef "in gebruik" doordat `'Alle boekingen'` bestaat, en
    // `'Lening of krediet'` doordat er een zin is die zo begint. Precies de twee
    // wezen die deze test op die manier niet zag.
    const dood = vertaalSleutels('en').filter(
      (sleutel) =>
        !bron.includes(`'${sleutel}'`) && !bron.includes(`"${sleutel}"`) && !bron.includes(`\`${sleutel}\``),
    )
    // De volledige lijst in de foutmelding, zodat je ze in één keer kan opruimen.
    expect(dood).toEqual([])
  })
})

/**
 * Commentaar eruit, code laten staan.
 *
 * Twee valkuilen die deze functie omzeilt:
 *  - Een blok begint pas met `/*` wanneer daarvóór op die regel niets dan witruimte
 *    of een `{` staat. Zonder die voorwaarde snijdt `accept="image/*,…"` in een
 *    formulier een half bestand weg, en verdwijnen er stil sleutels uit het zicht.
 *  - `//` alleen aan het begin van een regel. Middenin laten we het staan, want dan
 *    zou een `https://…` de rest van die regel wegsnijden.
 */
function zonderCommentaar(inhoud: string): string {
  return inhoud
    .replace(/(^|[\s{])\/\*[\s\S]*?\*\//gm, (_, voor: string) => voor)
    .split('\n')
    .filter((regel) => !regel.trimStart().startsWith('//'))
    .join('\n')
}
