import { describe, it, expect } from 'vitest'

// `aria-…` op een EIGEN component: compileert schoon, doet niets (ronde 92).
//
// ⚠ WAAROM DEZE TEST BESTAAT. In ronde 92 kreeg elk veld van het vaste-lastenformulier een
// `aria-labelledby`, zodat de twee formulieren op Budget → Vast niet langer negen paren
// velden met exact dezelfde naam droegen. Twaalf daarvan landden op een gewone `<input>` of
// `<select>` en werkten meteen. De dertiende landde op `<CategorieNiveauKiezer …>` — een
// eigen React-component — en verdween spoorloos:
//
//   `npx tsc --noEmit` gaf NUL fouten.
//
// Dat is geen vergissing van TypeScript maar een gedocumenteerde uitzondering: JSX-attributen
// waarvan de naam geen geldige JavaScript-naam is — alles met een koppelteken, dus élke
// `aria-*` en `data-*` — worden op een eigen component niet gecontroleerd. De prop komt in
// het niets terecht, de app ziet er hetzelfde uit, en niets meldt iets.
//
// Het werd alleen gevonden doordat één test de toegankelijke naam UITREKENDE in plaats van
// hem te vertrouwen. Deze test is het vangnet daaronder: een `aria-…` op een tag die met een
// hoofdletter begint, is per definitie verdacht.
//
// ⚠ NIET ALTIJD FOUT. Een component die haar overige props doorgeeft (`{...rest}`, zoals
// `Kaart` in ui/basis.tsx) verwerkt zo'n attribuut wél. Zulke gevallen horen daarom hieronder
// te staan, mét reden — en niet stil te blijven bestaan.
//
// ⚠ De juiste oplossing is meestal een EIGEN PROP IN CAMELCASE (`labelledBy`), want die
// controleert TypeScript wél.

// ⚠ Via `import.meta.glob` en niet via `node:fs` — dezelfde reden als in `index.css.test.ts`:
// met `node:fs` moet je zelf uitrekenen waar de broncode staat, en een misrekening laat de
// test stil slagen op nul bestanden.
const BRON_RUW = import.meta.glob('./**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>
const BRONBESTANDEN = Object.entries(BRON_RUW).filter(([pad]) => !/\.test\.tsx$/.test(pad))

/** Zonder commentaar: anders telt een `aria-…` uit een uitlegblok mee als echte code. */
function zonderCommentaar(tekst: string): string {
  return tekst.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

/** Toegestane gevallen, met een reden. Vandaag: geen enkel. */
const TOEGESTAAN: { bestand: string; component: string; attribuut: string; reden: string }[] = []

type Treffer = { bestand: string; component: string; attribuut: string }

/**
 * Zoekt de openingstags die met een hoofdletter beginnen, en geeft hun attribuutblok terug.
 *
 * ⚠ MET DE HAND GETELD, NIET MET EEN REGEXP (doorlichting ronde 92). De eerste opzet was
 * `/<([A-Z]\w*)((?:[^<>]|\{[^{}]*\})*?)\/?>/g`, en die was in de praktijk blind: door de
 * luie kwantor stopte de tag bij de EERSTE `>` — en een pijlfunctie levert er een.
 * `<Dialoog onSluiten={() => …} aria-label="x" />` gaf nul treffers, en dat is nu net de
 * vorm die in deze broncode het vaakst voorkomt. De tak voor accolades werd daardoor nooit
 * bereikt: dode code die in het commentaar iets beloofde wat niet gebeurde.
 *
 * Dit loopt de tekst teken voor teken af, houdt de accoladediepte bij en slaat strings en
 * sjabloonteksten over. Trager, maar het klopt.
 */
export function tagsMetHoofdletter(tekst: string): { naam: string; attributen: string }[] {
  const uit: { naam: string; attributen: string }[] = []
  const naamPatroon = /^<([A-Z]\w*)/
  for (let i = 0; i < tekst.length; i++) {
    if (tekst[i] !== '<') continue
    const kop = naamPatroon.exec(tekst.slice(i, i + 40))
    if (!kop) continue
    let j = i + kop[0].length
    let diepte = 0
    let quote = ''
    let eind = -1
    // ⚠ ALLEEN WAT OP DIEPTE NUL STAAT (tweede correctie, doorlichting ronde 92). Een prop
    // kan een hele JSX-boom bevatten — `actie={<button aria-expanded={open}>…</button>}` of
    // `voet={<knop aria-busy={…} />}` — en die `aria-…` hoort bij dat GENESTE element, niet
    // bij de component erbuiten. Nam je het hele blok tussen `<Kaart` en `>`, dan meldde de
    // test twaalf gevallen die alle twaalf in orde waren. Een attribuutnaam staat per
    // definitie buiten de accolades.
    let opDiepteNul = ''
    for (; j < tekst.length; j++) {
      const c = tekst[j]
      if (quote) {
        if (c === quote && tekst[j - 1] !== '\\') quote = ''
        continue
      }
      if (c === "'" || c === '"' || c === '`') quote = c
      else if (c === '{') diepte++
      else if (c === '}') diepte--
      else if (c === '>' && diepte === 0) {
        eind = j
        break
      }
      // Een `<` op diepte 0 betekent dat deze tag nooit sluit — dan is het geen tag.
      else if (c === '<' && diepte === 0) break
      if (diepte === 0 && !quote) opDiepteNul += c
    }
    if (eind === -1) continue
    uit.push({ naam: kop[1], attributen: opDiepteNul })
    i = eind
  }
  return uit
}

/** De `aria-…` die in één stuk broncode op een eigen component staan. Zuiver, dus zelf te
 * beproeven — de bewaking hieronder kan anders alleen falen wanneer er al een fout ís, en
 * dat is geen bewaking (les uit ronde 91). */
export function ariaInBron(pad: string, ruw: string): Treffer[] {
  const uit: Treffer[] = []
  for (const tag of tagsMetHoofdletter(zonderCommentaar(ruw))) {
    for (const attr of tag.attributen.matchAll(/\baria-[\w-]+/g)) {
      uit.push({ bestand: pad, component: tag.naam, attribuut: attr[0] })
    }
  }
  return uit
}

function ariaOpEigenComponent(): Treffer[] {
  return BRONBESTANDEN.flatMap(([pad, ruw]) => ariaInBron(pad, ruw))
}

describe('aria-attributen op een eigen component (ronde 92)', () => {
  it('leest de broncode écht', () => {
    // ⚠ Het vangnet vóór het vangnet: vindt de glob niets, dan slaagt alles hieronder stil.
    expect(BRONBESTANDEN.length).toBeGreaterThan(50)
  })

  // ⚠ Deze vier proeven staan er omdat de EERSTE opzet van deze test er drie van niet
  // haalde. Ze beproeven de zoeker zelf, op vormen die in deze broncode echt voorkomen.
  it('vindt een aria-attribuut op een tag met een hoofdletter', () => {
    const uit = tagsMetHoofdletter('<Kaart aria-label="x"><input aria-labelledby="y" /></Kaart>')
    expect(uit.map((t) => t.naam)).toEqual(['Kaart'])
    expect(uit[0].attributen).toContain('aria-label')
  })

  it('kijkt VOORBIJ een pijlfunctie', () => {
    // ⚠ Hier ging de eerste opzet onderuit: de `>` van `=>` sloot de tag.
    const uit = tagsMetHoofdletter('<Dialoog onSluiten={() => setOpen(false)} aria-label="x" />')
    expect(uit).toHaveLength(1)
    expect(uit[0].attributen).toContain('aria-label')
  })

  it('kijkt voorbij geneste accolades en meerdere regels', () => {
    const uit = tagsMetHoofdletter('<Iets\n  style={{ a: 1 }}\n  onClick={() => { f() }}\n  aria-labelledby="y"\n/>')
    expect(uit).toHaveLength(1)
    expect(uit[0].attributen).toContain('aria-labelledby')
  })

  it('trapt niet in een groter-dan-teken binnen een tekst', () => {
    const uit = tagsMetHoofdletter('<Iets titel={"a > b"} aria-label="x" />')
    expect(uit).toHaveLength(1)
    expect(uit[0].attributen).toContain('aria-label')
  })

  it('laat een gewone kleine-letter-tag met rust', () => {
    expect(tagsMetHoofdletter('<input aria-label="x" />')).toEqual([])
  })

  it('kijkt NIET in een geneste JSX-boom binnen een prop', () => {
    // ⚠ De tweede correctie van deze zoeker. `actie={<button aria-expanded={open}>}` hoort
    // bij die knop, niet bij de kaart eromheen — dat gaf twaalf valse meldingen.
    const uit = tagsMetHoofdletter('<Kaart titel="x" actie={<button aria-expanded={open}>ja</button>}>')
    expect(uit).toHaveLength(1)
    expect(uit[0].naam).toBe('Kaart')
    expect(uit[0].attributen).not.toContain('aria-expanded')
  })

  it('ziet een aria-attribuut dat WÉL op de component zelf staat, ook na zo\'n prop', () => {
    const uit = tagsMetHoofdletter('<Kaart actie={<button onClick={() => f()}>ja</button>} aria-label="x">')
    expect(uit[0].attributen).toContain('aria-label')
  })

  it('laat commentaar buiten beschouwing', () => {
    expect(zonderCommentaar('/* <Iets aria-label="x" /> */ const a = 1')).not.toContain('aria-')
    expect(zonderCommentaar('  // <Iets aria-label="x" />\nconst a = 1')).not.toContain('aria-')
  })

  it('zou een echte fout ook aanwijzen', () => {
    // ⚠ Deze test bestaat door een mutatietest: laat je de zoeker nergens naar kijken, dan
    // blijft alles groen — niet omdat hij werkt, maar omdat er vandaag geen fout ís.
    expect(ariaInBron('./proef.tsx', '<MijnComponent aria-labelledby="x" />')).toEqual([
      { bestand: './proef.tsx', component: 'MijnComponent', attribuut: 'aria-labelledby' },
    ])
    expect(ariaInBron('./proef.tsx', '<input aria-labelledby="x" />')).toEqual([])
  })

  it('zet geen aria-attribuut op een eigen component', () => {
    const fouten = ariaOpEigenComponent().filter(
      (t) =>
        !TOEGESTAAN.some(
          (u) => u.bestand === t.bestand && u.component === t.component && u.attribuut === t.attribuut,
        ),
    )
    // De volledige lijst in de foutmelding, zodat je ze in één keer kan nakijken.
    expect(fouten.map((t) => `${t.bestand}: <${t.component} ${t.attribuut}>`)).toEqual([])
  })

  /** Welke uitzonderingen vandaag nergens meer op slaan. Zuiver, dus zelf te beproeven. */
  function overbodig(lijst: typeof TOEGESTAAN): typeof TOEGESTAAN {
    const echt = ariaOpEigenComponent()
    return lijst.filter(
      (u) =>
        !echt.some((t) => t.bestand === u.bestand && t.component === u.component && t.attribuut === u.attribuut),
    )
  }

  it('houdt geen uitzondering staan die niet meer bestaat', () => {
    expect(overbodig(TOEGESTAAN)).toEqual([])
  })

  it('zou een verouderde uitzondering ook écht aanwijzen', () => {
    // ⚠ `TOEGESTAAN` is vandaag leeg, dus de test hierboven kan niet falen — en een test die
    // niet kán falen bewijst niets (les uit ronde 91). Hier krijgt ze wél iets te vinden.
    expect(
      overbodig([{ bestand: './nergens.tsx', component: 'Verzonnen', attribuut: 'aria-label', reden: 'proef' }]),
    ).toHaveLength(1)
  })
})
