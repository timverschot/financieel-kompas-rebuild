import { describe, it, expect } from 'vitest'

// Leest de app haar eigen opmaakbestand na? (ronde 77)
//
// ⚠ WAAROM DEZE TEST BESTAAT. Twaalf echte fouten in zeven rondes waren geen fouten
// in de logica maar in `src/index.css`, en géén enkele daarvan werd door een test
// gevonden — ze kwamen allemaal uit een meting in een echte browser of uit een
// doorlichting die het bestand met de hand nalas:
//
//  - een klasse geleend van een ander component, waarvan de regel LATER in het
//    bestand stond en dus won (ronde 70, drie keer);
//  - een focusring die verloor van `.rij button:focus-visible` (ronde 70);
//  - `overflow: hidden` op `.lijst` dat elke ring naar buiten wegknipte (70 en 73);
//  - een klassenaam in de code waarvoor geen enkele regel bestond (`rij-kost-open`,
//    ronde 73);
//  - een vinkje zonder zichtbare focusring (ronde 75);
//  - een knop van 44 px die in een flexrij kromp tot 26 px (ronde 76).
//
// ⚠ WAT DEZE TEST NIET IS: een dekking op die twaalf. De doorlichting heeft dat
// nagerekend, en het antwoord is eerlijker dan de opsomming hierboven suggereert —
// van die twaalf zou deze test er ÉÉN gevangen hebben (de klassenaam zonder regel).
// De andere elf zijn metingen: een ring die door een ander element weggeknipt wordt,
// een vinkje dat zijn eigen vakje tekent, een knop die in een flexrij krimpt. Geen
// tekstcontrole ziet dat; daarvoor blijft de browsermeting het enige net.
//
// Wat ze WÉL doet, en waarom ze toch de moeite is: ze bewaakt de twee richtingen die
// bij de vertaaltabel al jaren werken (`i18nDekking.test.ts`) — bestaat alles waarnaar
// de code verwijst, en wordt alles gebruikt wat er staat — plus een handvol
// invarianten die dit project duur betaald heeft. In de ronde waarin ze geschreven
// werd, vond ze in één keer acht fouten die zeven rondes handmatig nalezen gemist
// hadden: een klassenaam zonder regel, vier dode klassen, twee dode tokens, een
// verschreven tokennaam waardoor een balk stil geen schaduw had, en een selector die
// in twee groepen stond met een andere `outline`.
//
// De bestanden komen via `import.meta.glob` binnen en niet via `node:fs` — dezelfde
// reden als bij `i18nDekking.test.ts`: met `node:fs` moet je zelf uitrekenen waar de
// broncode staat, en een misrekening laat de test stil slagen op nul bestanden.

// ⚠ HET OPMAAKBESTAND KOMT MOEIZAMER BINNEN DAN DE BRONCODE. Vitest zet standaard
// élke CSS-import om in een lege string — ook `import css from './index.css?raw'`.
// Deze test kreeg dus nul tekens en slaagde stil op niets. In `vite.config.ts` staat
// daarom `css: { include: [/index\.css/] }`, uitsluitend voor dit ene bestand.
// De test hieronder ("vindt het opmaakbestand") is het vangnet: gaat die instelling
// ooit verloren, dan wordt deze hele reeks rood in plaats van stil nutteloos.
import CSS_TEKST from './index.css?raw'
const BRON_RUW = import.meta.glob('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

const CSS: string = CSS_TEKST
/** Zonder commentaar: anders telt `.md` uit een zin mee als klasse. */
const CSS_SCHOON = CSS.replace(/\/\*[\s\S]*?\*\//g, '')

const BRONBESTANDEN = Object.entries(BRON_RUW).filter(([pad]) => !/\.test\.tsx?$/.test(pad))

// ---------------------------------------------------------------------------
// Uitzonderingen — met een reden erbij, zodat ze niet stil kunnen groeien
// ---------------------------------------------------------------------------

/**
 * Klassen die in de code staan maar met opzet GEEN opmaak hebben.
 *
 * ⚠ Alleen testhaken horen hier. Een klasse die er staat "voor later" hoort er niet:
 * dat is precies het geval dat deze test moet vangen.
 */
const TESTHAKEN = new Set(['tx-rekening'])

/**
 * ⚠ HIER STOND EEN LIJST MET "PALETRESERVE" (doorlichting ronde 77): twee dode
 * kleurtokens die mochten blijven omdat ze bij een drietal hoorden waarvan de app de
 * andere twee wél gebruikt. Die grens bleek niet vol te houden — `--radius-2xl` is
 * net zo goed de volgende trap van een ladder waarvan de andere vier in gebruik zijn,
 * en die werd wél weggehaald. Twee maten met twee criteria is geen regel maar een
 * gevoel. Nu geldt overal hetzelfde: wat nergens gebruikt wordt, gaat weg. Heeft een
 * volgende ronde `--info` nodig, dan zet ze hem erbij op het moment dat ze hem
 * gebruikt — dat is één regel werk, en dan klopt het palet ook echt.
 */

/**
 * Selectoren die dezelfde eigenschap bewust twee keer zetten.
 *
 * ⚠ Elk paar staat hier met een reden. Komt er een nieuw paar bij, dan faalt de test
 * — en dat is de bedoeling: "bij gelijke specificiteit wint de regel die later in het
 * bestand staat" is de meest voorkomende oorzaak van "mijn CSS doet niets" in dit
 * project.
 */
const DUBBEL_MET_REDEN: Record<string, string> = {
  // Een oudere browser kent `dvh` niet en negeert die regel; dan geldt `100vh`.
  '.dialoog-laag|height': 'terugval voor browsers zonder dvh',
  // Eerst de gedeelde plaatsing voor `.stat-knop` én `.kengetal-knop`, daarna de
  // correctie voor de tegel die wél binnenruimte heeft.
  '.kengetal-knop .rij-chevron|top': 'bewuste correctie op de gedeelde regel erboven',
  '.kengetal-knop .rij-chevron|right': 'bewuste correctie op de gedeelde regel erboven',
}

/**
 * `:focus-visible`-regels die met opzet niets zichtbaars zetten.
 *
 * `main` krijgt alleen focus doordat de code hem programmatisch zet (de sla-over-link
 * springt erheen). Een ring rond de hele pagina zegt niets; de bestemming is wat je
 * daarna leest.
 */
const FOCUS_ZONDER_RING = new Set(['main:focus-visible'])

/**
 * Focusringen die naar BUITEN wijzen, met per stuk de reden dat dat hier mag.
 *
 * ⚠ `.lijst` draagt `overflow: hidden`, dus een ring met een positieve offset wordt
 * aan de rand van de lijst weggeknipt (rondes 70 en 73). Binnen een lijstrij hoort de
 * offset dus negatief te zijn — behalve wanneer het element ver genoeg van die rand
 * staat, en dan is dat een METING en geen aanname.
 *
 * ⚠ Deze lijst verving een controle die filterde op de tekst `.lijst` in de selector
 * (doorlichting ronde 77). Er is geen enkele regel die zowel `.lijst` als
 * `outline-offset` heeft — de reparaties van ronde 70 en 73 heten `.rij .kost-kop`,
 * `.rij .tx-openen` enzovoort — dus die controle liep over een lege lijst en kon
 * nooit rood worden.
 */
const OFFSET_NAAR_BUITEN: Record<string, string> = {
  '.kengetal-knop:focus-visible': 'een tegel op het overzicht, niet in een lijst',
  '.maandstaaf-knop:focus-visible': 'een staaf in de grafiek, niet in een lijst',
  '.rij .stat-knop:focus-visible, .stat-knop:focus-visible':
    'een tegel; het `.rij`-voorvoegsel staat er alleen om van `.rij button:focus-visible` te winnen',
  "input[type='checkbox']:focus-visible, input[type='radio']:focus-visible":
    'in de browser gemeten in ronde 75: het vinkje staat 50 px van de rand van de lijst',
  'button:focus-visible, [tabindex]:focus-visible': 'het vangnet voor alles buiten een lijst',
  '.uitleg > summary:focus-visible': 'een uitklapkop, niet in een lijst',
}

// ---------------------------------------------------------------------------
// Het bestand uit elkaar halen
// ---------------------------------------------------------------------------

export type Cssregel = { context: string; selector: string; body: string }

/**
 * Alle regels, met de `@media`- of `@supports`-context waarin ze staan.
 *
 * Geen echte parser — een teller op accolades volstaat, en dat is met opzet: een
 * afhankelijkheid erbij voor één test is een prijs die niet in verhouding staat.
 */
function leesRegels(tekst: string, context = ''): Cssregel[] {
  const uit: Cssregel[] = []
  let i = 0
  while (i < tekst.length) {
    const open = tekst.indexOf('{', i)
    if (open < 0) break
    // ⚠ TOT NÁ DE LAATSTE PUNTKOMMA (doorlichting ronde 77). Bovenaan het bestand
    // staan acht `@import`-regels. Zonder deze snede begint de kop van het eerste
    // blok met `@import …; :root`, denkt de lezer dat het om een at-regel gaat, en
    // duikt hij de body van `:root` in — die geen enkele accolade bevat. Uitkomst:
    // het volledige lichte palet, 65 declaraties, stond niet in `REGELS`. De
    // botsingcontrole hieronder keek dus overal behalve in het blok waar élke kleur
    // en élke maat van de app gedefinieerd staat, en de vangnettest merkte niets
    // (367 regels is ruim genoeg).
    const ruweKop = tekst.slice(i, open)
    const kop = ruweKop.slice(ruweKop.lastIndexOf(';') + 1).trim()
    let diepte = 1
    let k = open + 1
    while (k < tekst.length && diepte > 0) {
      if (tekst[k] === '{') diepte++
      else if (tekst[k] === '}') diepte--
      k++
    }
    const body = tekst.slice(open + 1, k - 1)
    if (kop.startsWith('@')) uit.push(...leesRegels(body, `${context}${kop} `))
    else uit.push({ context, selector: kop, body })
    i = k
  }
  return uit
}

/** De declaraties op het EERSTE niveau van een body, als naam → waarde. */
function declaraties(body: string): Array<[string, string]> {
  const plat = body.replace(/\{[^{}]*\}/g, '')
  const uit: Array<[string, string]> = []
  for (const m of plat.matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;]+)/g)) {
    uit.push([m[1], m[2].split(/\s+/).join(' ').trim()])
  }
  return uit
}

const REGELS = leesRegels(CSS_SCHOON)

/** Een selectorlijst over meerdere regels als één regel, om op te kunnen zoeken. */
function opEenRegel(selector: string): string {
  return selector.split(/\s*\n\s*/).join(' ')
}

/**
 * Een selectorlijst in stukken, zonder de komma's BINNEN haakjes mee te tellen.
 *
 * ⚠ `*:not(:where(.print-kleur, .balk-vulling))` is één selector, geen twee. Zonder
 * dit masker leverde die twee onzinsleutels op in de botsingcontrole.
 */
function selectoren(kop: string): string[] {
  const masker = kop.replace(/\([^()]*\)/g, (deel) => `(${'_'.repeat(deel.length - 2)})`)
  const uit: string[] = []
  let start = 0
  for (let i = 0; i < masker.length; i++) {
    if (masker[i] === ',') {
      uit.push(kop.slice(start, i).trim())
      start = i + 1
    }
  }
  uit.push(kop.slice(start).trim())
  return uit.filter((x) => x !== '')
}

/**
 * Zet deze regel de focus AF zonder er iets voor in de plaats te geven?
 *
 * ⚠ Zes schrijfwijzen, en dat is niet overdreven (doorlichting ronde 77). De eerste
 * versie testte op `/^(none|0|0px)$/` en sloeg daardoor `outline: 0px none` over —
 * precies de vorm die ronde 75 in de browser mat. `outline: transparent` telde zelfs
 * als ZICHTBAAR, terwijl dat een ring is die er wel staat en niets toont.
 */
function ringWeg(d: Map<string, string>): boolean {
  const outline = d.get('outline')
  if (outline !== undefined) {
    const kaal = outline.replace(/\s*!important$/, '').trim()
    if (/^(none|0(px)?)(\s|$)/.test(kaal) || /(^|\s)transparent(\s|$)/.test(kaal)) return true
  }
  const breedte = d.get('outline-width')
  if (breedte !== undefined && /^0(px)?$/.test(breedte.replace(/\s*!important$/, '').trim())) return true
  const stijl = d.get('outline-style')
  if (stijl !== undefined && /^none/.test(stijl.trim())) return true
  return false
}

/** Iets anders dan de outline dat je op het scherm ziet. */
function andereMarkering(d: Map<string, string>): boolean {
  const schaduw = d.get('box-shadow')
  if (schaduw !== undefined && schaduw !== 'none') return true
  return d.has('border-color') || d.has('background') || d.has('color') || d.has('transform')
}

// ---------------------------------------------------------------------------
// De klassen aan beide kanten
// ---------------------------------------------------------------------------

/** Elke klasse waarvoor `index.css` een regel heeft. */
function klassenInCss(): Set<string> {
  const uit = new Set<string>()
  for (const m of CSS_SCHOON.matchAll(/\.(-?[a-zA-Z_][\w-]*)(?=[\s,:.[{>+~)])/g)) uit.add(m[1])
  return uit
}

/** Het einde van een gebalanceerd paar haakjes vanaf `start`. */
function sluit(tekst: string, start: number, open: string, dicht: string): number {
  let diepte = 0
  for (let i = start; i < tekst.length; i++) {
    if (tekst[i] === open) diepte++
    else if (tekst[i] === dicht) {
      diepte--
      if (diepte === 0) return i
    }
  }
  return tekst.length - 1
}

/**
 * Elke tekst uit een uitdrukking, inclusief de stukken van een sjabloontekst én de
 * teksten die BINNEN `${…}` staan.
 *
 * ⚠ Die laatste horen erbij: `` `soortknop${actief ? ' soortknop-actief' : ''}` ``
 * zet twee klassen, en een lezer die alleen de vaste stukken pakt, ziet de tweede
 * niet — en verklaart haar dan onterecht dood.
 */
function teksten(expr: string, uit: string[]): void {
  let i = 0
  while (i < expr.length) {
    const c = expr[i]
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < expr.length && expr[j] !== c) j += expr[j] === '\\' ? 2 : 1
      uit.push(expr.slice(i + 1, j))
      i = j + 1
    } else if (c === '`') {
      let j = i + 1
      let stuk = ''
      while (j < expr.length && expr[j] !== '`') {
        if (expr[j] === '\\') {
          stuk += expr.slice(j, j + 2)
          j += 2
          continue
        }
        if (expr[j] === '$' && expr[j + 1] === '{') {
          const eind = sluit(expr, j + 1, '{', '}')
          teksten(expr.slice(j + 2, eind), uit)
          stuk += ' '
          j = eind + 1
          continue
        }
        stuk += expr[j]
        j++
      }
      uit.push(stuk)
      i = j + 1
    } else {
      i++
    }
  }
}

/** Elke klassenaam die de app op een element zet. */
function klassenInCode(): Map<string, string> {
  const uit = new Map<string, string>()
  for (const [pad, inhoud] of BRONBESTANDEN) {
    const stukken: string[] = []
    for (const m of inhoud.matchAll(/className\s*=\s*/g)) {
      const i = m.index! + m[0].length
      if (inhoud[i] === '{') stukken.push(inhoud.slice(i, sluit(inhoud, i, '{', '}') + 1))
      else stukken.push(inhoud.slice(i, inhoud.indexOf(inhoud[i], i + 1) + 1))
    }
    // ⚠ Ook de losse `klassen(…)`-aanroepen: die staan vaak in een variabele die
    // pas verderop aan `className` hangt (zie `Kengetal` in ui/basis.tsx).
    for (const m of inhoud.matchAll(/\bklassen\s*\(/g)) {
      const i = m.index! + m[0].length - 1
      stukken.push(inhoud.slice(i, sluit(inhoud, i, '(', ')') + 1))
    }
    for (const ruw of stukken) {
      // ⚠ De rechterkant van een vergelijking is geen klasse: `soort === 'inkomst'`
      // staat vol in de app en zou anders dertien verzonnen klassen opleveren.
      const expr = ruw.replace(/[!=]==?\s*('[^']*'|"[^"]*")/g, '')
      const gevonden: string[] = []
      teksten(expr, gevonden)
      for (const tekst of gevonden) {
        for (const woord of tekst.split(/\s+/)) {
          if (/^[a-zA-Z][\w-]*$/.test(woord) && !uit.has(woord)) uit.set(woord, pad)
        }
      }
    }
  }
  return uit
}

const CSS_KLASSEN = klassenInCss()
const CODE_KLASSEN = klassenInCode()

/**
 * RONDE 86 — ROOD IS DE KLEUR VAN WEGGOOIEN.
 *
 * Timothy, over de knop naast een gekozen subcategorie op een kassaticketregel: *"De
 * knop is rood en vet naast een grijze regel van 13 px — de wegwerpknop weegt visueel
 * zwaarder dan de informatie ernaast."* De oorzaak zat dieper dan de opmaak: die knop
 * droeg `knop-gevaar`, de klasse waarmee deze app VERWIJDEREN aanduidt.
 *
 * ⚠ DE KNOP HEET SINDS DEZE RONDE "OPNIEUW KIEZEN" EN NIET MEER "WISSEN". Het woord
 * botste: "Alles wissen" bij Begin opnieuw gooit werkelijk élk gegeven weg, en "wissen"
 * naast je categorie zette één veld terug op leeg. Eén werkwoord voor twee tegengestelde
 * dingen is precies wat ronde 83 uitroeide. "Ander bestand kiezen" — de derde knop van
 * deze ronde — zei het al goed; nu zeggen alle drie het zo.
 *
 * ⚠ DE PARSER LEEST DE KOP VAN DE KNOP MET `sluit()` EN `teksten()`, en niet met een
 * regex op dubbele aanhalingstekens (doorlichting ronde 86). Met die regex gaf een
 * `className={…}` met accolades gewoon een lege klassenlijst terug — en dan slaagde
 * uitgerekend de controle "draagt geen `knop-gevaar`" stil.
 */
function knoppenMetTekst(tekst: string): { pad: string; klassen: string[] }[] {
  const uit: { pad: string; klassen: string[] }[] = []
  const naald = `{t('${tekst}')}`
  for (const [pad, inhoud] of BRONBESTANDEN) {
    let i = inhoud.indexOf(naald)
    while (i !== -1) {
      const start = inhoud.lastIndexOf('<button', i)
      if (start !== -1) {
        // Alleen de KOP van deze knop: van `<button` tot zijn eigen sluitende `>`.
        // Zonder die grens zou een `className` op een genest element meetellen.
        let j = start
        let diep = 0
        while (j < inhoud.length) {
          const c = inhoud[j]
          if (c === '{') { j = sluit(inhoud, j, '{', '}'); diep = 0 }
          else if (c === '>' && diep === 0) break
          j++
        }
        const kop = inhoud.slice(start, j)
        const m = kop.match(/className\s*=\s*/)
        const klassen: string[] = []
        if (m) {
          const k = m.index! + m[0].length
          const ruw = kop[k] === '{' ? kop.slice(k, sluit(kop, k, '{', '}') + 1) : kop.slice(k, kop.indexOf(kop[k], k + 1) + 1)
          const stukken: string[] = []
          teksten(ruw, stukken)
          for (const stuk of stukken) for (const w of stuk.split(/\s+/)) if (w) klassen.push(w)
        }
        uit.push({ pad, klassen })
      }
      i = inhoud.indexOf(naald, i + 1)
    }
  }
  return uit
}

describe('een knop die iets RECHTZET draagt niet de kleur van weggooien', () => {
  const KNOPPEN = knoppenMetTekst('opnieuw kiezen')

  it('vindt de knoppen waar het over gaat, mét hun klassen', () => {
    // ⚠ Zonder deze ondergrens slaagt de reeks hieronder op een lege lijst — precies de
    // val die ronde 77 in vier van haar eigen controles vond. En de tweede regel vangt
    // de val van de oude parser: een knop gevonden, maar met een lege klassenlijst.
    expect(KNOPPEN.length).toBeGreaterThanOrEqual(2)
    expect(KNOPPEN.filter((k) => k.klassen.length === 0)).toEqual([])
  })

  it('zet `knop-gevaar` op geen enkele van die knoppen', () => {
    expect(KNOPPEN.filter((k) => k.klassen.includes('knop-gevaar'))).toEqual([])
  })

  it('geeft ze allemaal `knop-terzijde`, zodat ze de regel ernaast niet overstemmen', () => {
    expect(KNOPPEN.filter((k) => !k.klassen.includes('knop-terzijde'))).toEqual([])
  })

  it('laat `knop-klein` staan — die draagt op een aanraakscherm de 44 px-regel', () => {
    expect(KNOPPEN.filter((k) => !k.klassen.includes('knop-klein'))).toEqual([])
  })

  it('laat `.knop-terzijde` het gewicht ook echt terugbrengen', () => {
    // ⚠ Zonder deze regel kan de klasse leeg worden of alleen nog een kleur zetten, en
    // dan staat de knop wéér op gewicht 600 uit `.knop` — de helft van de klacht.
    // In de browser gemeten (393 px): knop 500 / 14 px in de accentkleur, de regel
    // ernaast 400 / 13 px in de gedempte tekstkleur, raakgebied 44 px.
    const regel = REGELS.find((r) => r.selector.trim() === '.knop-terzijde')
    expect(regel).toBeDefined()
    expect(regel?.body).toMatch(/font-weight\s*:\s*500\s*[;}]/)
  })

  it('zet `.knop-terzijde` ná elke knopklasse waarvan ze moet winnen', () => {
    // ⚠ Bij gelijke specificiteit wint de LATERE regel — de meest voorkomende oorzaak van
    // "mijn CSS doet niets" in dit project (rondes 70 en 71). `.knop` zet gewicht 600;
    // stond `.knop-terzijde` ervóór, dan deed ze niets en bleef de knop vet, zonder dat
    // één test iets merkte (doorlichting ronde 86). Ook `.knop-gevaar` staat in de lijst:
    // zet een volgende ronde daar ooit een gewicht op, dan hoort terzijde te winnen.
    const index = (sel: string) => REGELS.findIndex((r) => r.selector.trim() === sel)
    const terzijde = index('.knop-terzijde')
    expect(terzijde).toBeGreaterThan(-1)
    for (const eerder of ['.knop', '.knop-ghost', '.knop-klein', '.knop-gevaar']) {
      expect(index(eerder)).toBeGreaterThan(-1)
      expect(terzijde).toBeGreaterThan(index(eerder))
    }
  })
})

describe('index.css — het bestand wordt echt gelezen', () => {
  it('vindt het opmaakbestand en de broncode', () => {
    // ⚠ Zonder deze test kan de hele reeks stil slagen op een lege string, en dan
    // bewaakt ze niets meer. Dat is precies de val die `node:fs` hier zou opzetten.
    expect(CSS.length).toBeGreaterThan(10_000)
    expect(BRONBESTANDEN.length).toBeGreaterThan(50)
    expect(REGELS.length).toBeGreaterThan(100)
    expect(CSS_KLASSEN.size).toBeGreaterThan(100)
    expect(CODE_KLASSEN.size).toBeGreaterThan(100)
  })
})

describe('elke klasse uit de code heeft opmaak', () => {
  it('kent geen klassenaam waarvoor geen enkele regel bestaat', () => {
    // ⚠ Dit is de fout van ronde 73 (`rij-kost-open`) en van ronde 77 (`veld` in de
    // uitwisselkaart, `tx-rekening` in de boekingenlijst): een klasse die er staat,
    // maar niets doet. Ze valt niet op, want het scherm ziet er gewoon uit — alleen
    // de bedoeling erachter komt nooit uit.
    const zonder = [...CODE_KLASSEN]
      .filter(([naam]) => !CSS_KLASSEN.has(naam) && !TESTHAKEN.has(naam))
      .map(([naam, pad]) => `${naam} (${pad})`)
    expect(zonder).toEqual([])
  })

  it('houdt de lijst met testhaken kort en waar', () => {
    // Een testhaak die intussen wél opmaak kreeg, hoort hier niet meer te staan.
    for (const naam of TESTHAKEN) {
      expect(CODE_KLASSEN.has(naam), `${naam} staat nergens meer in de code`).toBe(true)
      expect(CSS_KLASSEN.has(naam), `${naam} heeft nu wél opmaak`).toBe(false)
    }
  })
})

describe('elke klasse in index.css wordt gebruikt', () => {
  it('kent geen opmaak voor een klasse die nergens meer staat', () => {
    // ⚠ Dezelfde richting als de dode-sleutelcontrole van de vertaaltabel (ronde 66).
    // Ronde 73 haalde vijf dode `.rij-kost-*`-blokken weg die niemand nog zag staan,
    // en ronde 77 vond er nog vier (`.cijfer`, `.klikbaar`, `.rij-klikbaar`,
    // `.saldotegel-sub`). Dode opmaak is niet onschuldig: ze nodigt uit om een klasse
    // te LENEN die verderop in het bestand staat, en dan wint zij van jouw eigen
    // regel — de fout van ronde 70, drie keer op rij.
    const dood = [...CSS_KLASSEN].filter((naam) => !CODE_KLASSEN.has(naam)).sort()
    expect(dood).toEqual([])
  })
})

describe('kleur- en maattokens', () => {
  const gedefinieerd = new Set([...CSS_SCHOON.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
  const gebruiktInCss = new Set([...CSS_SCHOON.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))
  const gebruiktInCode = new Set(
    BRONBESTANDEN.flatMap(([, inhoud]) =>
      [...inhoud.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]),
    ),
  )

  it('verwijst nergens naar een token dat niet bestaat', () => {
    // ⚠ De fout van ronde 77: `box-shadow: var(--schaduw-kaart, none)`. Dat token
    // bestond nergens, dus viel de regel terug op de reserve `none` en had de
    // versiebalk stil geen schaduw. Een verschrijving in een tokennaam geeft geen
    // foutmelding en geen rood scherm — ze doet gewoon niets.
    const ontbreekt = [...gebruiktInCss].filter((t) => !gedefinieerd.has(t)).sort()
    expect(ontbreekt).toEqual([])
  })

  it('verwijst ook vanuit de code nergens naar een token dat niet bestaat', () => {
    const ontbreekt = [...gebruiktInCode].filter((t) => !gedefinieerd.has(t)).sort()
    expect(ontbreekt).toEqual([])
  })

  it('leest genoeg tokens om iets te bewaken', () => {
    // ⚠ Zonder ondergrens zou een lezer die stilvalt de drie controles hierboven
    // over lege verzamelingen laten lopen, en dan slagen ze op niets.
    expect(gedefinieerd.size).toBeGreaterThan(40)
    expect(gebruiktInCss.size).toBeGreaterThan(30)
    expect(gebruiktInCode.size).toBeGreaterThan(20)
  })

  it('bewaart geen token dat nergens gebruikt wordt', () => {
    // ⚠ Geen uitzonderingen (doorlichting ronde 77): wat nergens gebruikt wordt, gaat
    // weg. Een lijst met "hoort bij een drietal, dus mag blijven" was niet vol te
    // houden naast een maatladder waarvan de ongebruikte trap wél weg moest.
    const dood = [...gedefinieerd].filter((t) => !gebruiktInCss.has(t) && !gebruiktInCode.has(t)).sort()
    expect(dood).toEqual([])
  })
})

describe('focus — de ring die dit project vijf keer kwijtraakte', () => {
  const focusregels = REGELS.filter((r) => r.selector.includes(':focus-visible'))

  it('heeft er genoeg om iets te bewaken', () => {
    expect(focusregels.length).toBeGreaterThan(5)
  })

  it('laat geen enkele :focus-visible-regel zonder zichtbaar merkteken', () => {
    // ⚠ WAT DEZE CONTROLE WÉL EN NIET KAN. Ze vangt een regel die de ring afzet en er
    // niets voor teruggeeft. Ze had de fout van ronde 75 NIET gevangen: daar stond
    // `outline: none` mét een `border-color` én een `box-shadow` — keurig volgens deze
    // regel — maar op een native vinkje tekent geen van beide iets, want dat element
    // tekent zijn eigen vakje. Dat is een meting, geen tekstcontrole.
    const kaal: string[] = []
    for (const regel of focusregels) {
      const d = new Map(declaraties(regel.body))
      const outline = d.get('outline')
      const zichtbaar =
        (!ringWeg(d) && (outline !== undefined || d.has('outline-color') || d.has('outline-width'))) ||
        andereMarkering(d)
      const namen = selectoren(regel.selector)
      if (!zichtbaar && !namen.every((n) => FOCUS_ZONDER_RING.has(n))) kaal.push(regel.selector)
    }
    expect(kaal).toEqual([])
  })

  it('zet de ring alleen áf samen met iets anders dat je ziet', () => {
    const kaal: string[] = []
    for (const regel of REGELS) {
      const d = new Map(declaraties(regel.body))
      if (!ringWeg(d)) continue
      const namen = selectoren(regel.selector)
      if (!andereMarkering(d) && !namen.every((n) => FOCUS_ZONDER_RING.has(n))) kaal.push(regel.selector)
    }
    expect(kaal).toEqual([])
  })

  it('houdt de lijst met ringloze regels waar', () => {
    const alle = new Set(REGELS.flatMap((r) => selectoren(r.selector)))
    for (const naam of FOCUS_ZONDER_RING) {
      expect(alle.has(naam), `${naam} bestaat niet meer`).toBe(true)
    }
  })

  it('laat een ring alleen naar BUITEN wijzen waar dat verantwoord is', () => {
    // ⚠ `.lijst` draagt `overflow: hidden`; een ring met een positieve offset wordt
    // daar aan de rand weggeknipt. Elke positieve offset hoort daarom een reden te
    // hebben — en een nieuwe dwingt tot een beslissing in plaats van tot een meting
    // achteraf.
    const metOffset = REGELS.filter((r) => new Map(declaraties(r.body)).has('outline-offset'))
    expect(metOffset.length).toBeGreaterThan(8)

    const onverantwoord = metOffset
      .filter((r) => {
        const offset = new Map(declaraties(r.body)).get('outline-offset') as string
        if (offset.startsWith('-')) return false
        return OFFSET_NAAR_BUITEN[opEenRegel(r.selector)] === undefined
      })
      .map((r) => opEenRegel(r.selector))
    expect(onverantwoord).toEqual([])
  })

  it('houdt de lijst met ringen naar buiten waar', () => {
    const alle = new Set(REGELS.map((r) => opEenRegel(r.selector)))
    for (const selector of Object.keys(OFFSET_NAAR_BUITEN)) {
      expect(alle.has(selector), `${selector} bestaat niet meer`).toBe(true)
    }
  })
})

describe('twee regels voor hetzelfde', () => {
  it('zet dezelfde eigenschap niet twee keer met een andere waarde op dezelfde selector', () => {
    // ⚠ De duurste val van dit project: bij gelijke specificiteit wint de regel die
    // LATER in het bestand staat, en die staat soms duizend regels verderop. Zo kreeg
    // `a:focus-visible` er in ronde 77 een tweede ring bij, zonder dat iemand het zag.
    const gezien = new Map<string, string[]>()
    for (const regel of REGELS) {
      for (const selector of selectoren(regel.selector)) {
        for (const [naam, waarde] of declaraties(regel.body)) {
          const sleutel = `${regel.context}${selector}|${naam}`
          const lijst = gezien.get(sleutel) ?? []
          lijst.push(waarde)
          gezien.set(sleutel, lijst)
        }
      }
    }
    const botsingen = [...gezien]
      .filter(([sleutel, waarden]) => new Set(waarden).size > 1 && DUBBEL_MET_REDEN[sleutel] === undefined)
      .map(([sleutel, waarden]) => `${sleutel} → ${waarden.join(' / ')}`)
      .sort()
    expect(botsingen).toEqual([])
  })

  it('houdt de lijst met bewuste dubbelingen waar', () => {
    // ⚠ Niet "bestaat de sleutel nog" maar "botst ze nog écht" (doorlichting ronde
    // 77). Haalt iemand de `100vh`-terugval weg, dan blijft `.dialoog-laag|height`
    // gewoon bestaan en blijft de uitzondering stil staan — klaar om later een échte
    // botsing af te dekken. Dat is precies wat deze lijst moet voorkomen.
    const waarden = new Map<string, string[]>()
    for (const regel of REGELS) {
      for (const selector of selectoren(regel.selector)) {
        for (const [naam, waarde] of declaraties(regel.body)) {
          const sleutel = `${regel.context}${selector}|${naam}`
          waarden.set(sleutel, [...(waarden.get(sleutel) ?? []), waarde])
        }
      }
    }
    for (const sleutel of Object.keys(DUBBEL_MET_REDEN)) {
      const lijst = waarden.get(sleutel) ?? []
      expect(new Set(lijst).size, `${sleutel} botst niet meer`).toBeGreaterThan(1)
    }
  })
})

describe('`.alleen-voorlezen` verbergt zonder te zwijgen (ronde 95)', () => {
  // ⚠ WAAROM DIT HIER STAAT EN NIET BIJ DE COMPONENTEN. De rondes 92 en 95 hangen een
  // onzichtbare toevoeging aan de naam van een veld ("Datum (gedeelde kost)") met
  // `aria-labelledby` naar een `<span class="alleen-voorlezen">`. Dat werkt alleen zolang
  // die klasse het element BUITEN BEELD zet en niet WEGHAALT: een element met
  // `display: none` of `visibility: hidden` staat niet in de toegankelijkheidsboom, en
  // dan halveert élke naam die ernaar wijst.
  //
  // ⚠ En geen enkele componenttest ziet dat, want jsdom rekent geen CSS uit: `textContent`
  // blijft ook bij `display: none` gewoon staan. Die tests toetsen daarom de KLASSENAAM;
  // wat die naam betekent, ligt hier vast. Zonder deze test kon iemand de regel omzetten
  // naar `display: none` en bleef alles groen.
  const regel = REGELS.find((r) => r.selector.trim() === '.alleen-voorlezen')

  it('bestaat', () => {
    expect(regel, 'er is geen regel `.alleen-voorlezen` in index.css').toBeDefined()
  })

  it('haalt het element niet uit de toegankelijkheidsboom', () => {
    const d = new Map(declaraties(regel?.body ?? ''))
    expect(d.get('display')).not.toBe('none')
    expect(d.get('visibility')).not.toBe('hidden')
    expect(d.get('content-visibility')).not.toBe('hidden')
  })

  it('zet het écht buiten beeld, in plaats van het gewoon te laten staan', () => {
    // De klassieke techniek: één pixel groot, weggeknipt, absoluut gepositioneerd.
    const d = new Map(declaraties(regel?.body ?? ''))
    expect(d.get('position')).toBe('absolute')
    expect(d.get('overflow')).toBe('hidden')
    expect(d.has('clip-path') || d.has('clip')).toBe(true)
    expect(d.get('width')).toBe('1px')
    expect(d.get('height')).toBe('1px')
  })
})
