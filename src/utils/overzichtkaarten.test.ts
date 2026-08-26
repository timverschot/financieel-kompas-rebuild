import { describe, it, expect } from 'vitest'
import {
  OVERZICHT_KAART_IDS,
  keurVerborgenOverzichtKaarten,
  kiesbareOverzichtKaarten,
  nietKiesbareOverzichtKaarten,
  overzichtKaartLabel,
  toontOverzichtKaart,
  wisselOverzichtKaart,
  type OverzichtKaartId,
} from './overzichtkaarten'
import { vertaalSleutels } from '../i18n'

// ⚠ Via `import.meta.glob` en niet via `node:fs` — dezelfde reden als in
// `index.css.test.ts` en `i18nDekking.test.ts`: met `node:fs` moet je zelf uitrekenen
// waar de broncode staat, en een misrekening laat de test stil slagen op nul bestanden.
const BRON_RUW = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>
const BRONBESTANDEN = Object.entries(BRON_RUW).filter(([pad]) => !/\.test\.tsx$/.test(pad))

const ALLES: Record<OverzichtKaartId, boolean> = {
  uitgaven: true,
  inkomsten: true,
  recent: true,
  maandgrafiek: true,
  toekomst: true,
  rapport: true,
}

describe('OVERZICHT_KAART_IDS', () => {
  it('bevat het maandblok NIET', () => {
    // Saldo, Inkomsten, Uitgaven en Netto zijn waarvoor het Overzicht bestaat. Kan je
    // die uitzetten, dan hou je een lege startpagina over — dezelfde veiligheidsregel
    // als bij APP_ONDERDELEN (ronde 75) en ANALYSE_KAART_IDS (ronde 81).
    expect(OVERZICHT_KAART_IDS).not.toContain('maandblok' as OverzichtKaartId)
    expect(OVERZICHT_KAART_IDS).not.toContain('saldo' as OverzichtKaartId)
  })

  it('bevat de zijkolom NIET', () => {
    // Die bestaat alleen op een breed scherm. Een chip voor iets wat de helft van de
    // tijd niet bestaat, is een schakelaar die niets lijkt te doen.
    expect(OVERZICHT_KAART_IDS).not.toContain('zijkolom' as OverzichtKaartId)
  })

  it('staat in de volgorde waarin de kaarten op het scherm staan', () => {
    expect(OVERZICHT_KAART_IDS).toEqual([
      'uitgaven',
      'inkomsten',
      'recent',
      'maandgrafiek',
      'toekomst',
      'rapport',
    ])
  })
})

describe('overzichtKaartLabel', () => {
  it('geeft elke kaart een naam', () => {
    for (const id of OVERZICHT_KAART_IDS) expect(overzichtKaartLabel(id).trim()).not.toBe('')
  })

  it('geeft geen twee kaarten dezelfde naam', () => {
    const namen = OVERZICHT_KAART_IDS.map(overzichtKaartLabel)
    expect(new Set(namen).size).toBe(namen.length)
  })

  it('komt LETTERLIJK voor in de kopregel van de kaart die de chip bedient', () => {
    // ⚠ De belofte uit de kopregels van overzichtkaarten.ts, hier hard gemaakt: elke
    // chipnaam moet in een kaarttitel van de app terug te vinden zijn. Wijkt een van de
    // twee ooit af, dan zegt de chip iets anders dan het blok dat verdwijnt — en dan
    // weet je niet wat je net uitzette. We lezen daarvoor de broncode zelf, want de
    // titels staan verspreid over App.tsx en vier componenten.
    // ⚠ Het vangnet vóór het vangnet: vindt de glob niets, dan zou elke controle
    // hieronder stil op nul bestanden slagen.
    expect(BRONBESTANDEN.length).toBeGreaterThan(20)
    const titels = [...BRONBESTANDEN.map(([, tekst]) => tekst).join('\n').matchAll(/titel=\{t\('([^']+)'\)\}/g)].map(
      (m) => m[1].toLowerCase(),
    )
    // ⚠ Het vangnet vóór het vangnet, tweede helft: vangt de regexp geen enkele titel,
    // dan zou `some` hieronder overal onwaar geven en de test tóch iets beweren.
    expect(titels.length).toBeGreaterThan(10)
    for (const id of OVERZICHT_KAART_IDS) {
      const naam = overzichtKaartLabel(id).toLowerCase()
      expect(
        titels.some((titel) => titel.includes(naam)),
        `geen kaarttitel gevonden die "${overzichtKaartLabel(id)}" bevat (${id})`,
      ).toBe(true)
    }
  })

  it('is voor elke naam vertaald in het Engels en het Frans', () => {
    // Een chip die in één taal in het Nederlands blijft staan, is precies het soort
    // half-vertaalde scherm dat ronde 89 opruimde.
    const en = new Set(vertaalSleutels('en'))
    const fr = new Set(vertaalSleutels('fr'))
    for (const id of OVERZICHT_KAART_IDS) {
      const naam = overzichtKaartLabel(id)
      expect(en.has(naam), `EN mist ${naam}`).toBe(true)
      expect(fr.has(naam), `FR mist ${naam}`).toBe(true)
    }
  })
})

describe('toontOverzichtKaart', () => {
  it('toont standaard alles', () => {
    for (const id of OVERZICHT_KAART_IDS) expect(toontOverzichtKaart(id, [])).toBe(true)
  })

  it('verbergt wat in de lijst staat, en alleen dat', () => {
    expect(toontOverzichtKaart('rapport', ['rapport'])).toBe(false)
    expect(toontOverzichtKaart('uitgaven', ['rapport'])).toBe(true)
  })
})

describe('wisselOverzichtKaart', () => {
  it('zet een zichtbare kaart uit en weer aan', () => {
    const uit = wisselOverzichtKaart([], 'rapport')
    expect(uit).toEqual(['rapport'])
    expect(wisselOverzichtKaart(uit, 'rapport')).toEqual([])
  })

  it('laat de andere kaarten met rust', () => {
    expect(wisselOverzichtKaart(['rapport'], 'recent')).toEqual(['rapport', 'recent'])
  })

  it('verandert de meegegeven lijst niet', () => {
    const begin: OverzichtKaartId[] = ['rapport']
    wisselOverzichtKaart(begin, 'recent')
    expect(begin).toEqual(['rapport'])
  })
})

describe('kiesbareOverzichtKaarten', () => {
  it('geeft een chip aan elke kaart waarvoor er iets te tonen is', () => {
    expect(kiesbareOverzichtKaarten(ALLES)).toEqual([...OVERZICHT_KAART_IDS])
  })

  it('laat een kaart zonder gegevens weg', () => {
    expect(kiesbareOverzichtKaarten({ ...ALLES, toekomst: false })).toEqual([
      'uitgaven',
      'inkomsten',
      'recent',
      'maandgrafiek',
      'rapport',
    ])
  })

  it('houdt de vaste volgorde aan', () => {
    expect(kiesbareOverzichtKaarten({ ...ALLES, inkomsten: false, maandgrafiek: false })).toEqual([
      'uitgaven',
      'recent',
      'toekomst',
      'rapport',
    ])
  })

  it('geeft niets terug wanneer er nergens gegevens voor zijn', () => {
    const niets = Object.fromEntries(OVERZICHT_KAART_IDS.map((id) => [id, false])) as Record<
      OverzichtKaartId,
      boolean
    >
    expect(kiesbareOverzichtKaarten(niets)).toEqual([])
  })
})

describe('nietKiesbareOverzichtKaarten', () => {
  it('geeft niets terug wanneer elke kaart iets te tonen heeft', () => {
    expect(nietKiesbareOverzichtKaarten(ALLES)).toEqual([])
  })

  it('noemt de kaart die er niet kan staan', () => {
    // ⚠ Het scherm noemt ze bij naam. Een kaart die STIL wegblijft, is precies wat
    // ronde 75 opruimde.
    expect(nietKiesbareOverzichtKaarten({ ...ALLES, toekomst: false })).toEqual(['toekomst'])
  })

  it('is het exacte spiegelbeeld van kiesbareOverzichtKaarten', () => {
    const gevuld = { ...ALLES, toekomst: false, recent: false }
    expect([...kiesbareOverzichtKaarten(gevuld), ...nietKiesbareOverzichtKaarten(gevuld)].sort()).toEqual(
      [...OVERZICHT_KAART_IDS].sort(),
    )
  })
})

describe('keurVerborgenOverzichtKaarten', () => {
  it('leest een geldige lijst', () => {
    expect(keurVerborgenOverzichtKaarten(['rapport', 'recent'])).toEqual(['rapport', 'recent'])
  })

  it('gooit onbekende namen weg', () => {
    // Een voorkeur van een oudere versie mag geen kaart wegdrukken die vandaag anders
    // heet — of erger: het maandblok, dat hier nooit uitzetbaar mag worden.
    expect(keurVerborgenOverzichtKaarten(['rapport', 'iets-ouds', 'maandblok'])).toEqual(['rapport'])
  })

  it('ontdubbelt', () => {
    expect(keurVerborgenOverzichtKaarten(['rapport', 'rapport'])).toEqual(['rapport'])
  })

  it('valt bij onzin terug op "niets verborgen"', () => {
    // ⚠ De veilige kant op: bij twijfel TOONT de app alles.
    expect(keurVerborgenOverzichtKaarten(null)).toEqual([])
    expect(keurVerborgenOverzichtKaarten(undefined)).toEqual([])
    expect(keurVerborgenOverzichtKaarten('rapport')).toEqual([])
    expect(keurVerborgenOverzichtKaarten([1, 2, 3])).toEqual([])
    expect(keurVerborgenOverzichtKaarten({ rapport: true })).toEqual([])
  })
})
