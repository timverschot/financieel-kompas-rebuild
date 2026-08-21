import { describe, it, expect, afterEach } from 'vitest'
import { hashNaarRoute, huidigeRoute, routeNaarHash, volgRoute, zelfdeRoute, zetExtraStap, zetRoute } from './route'

// Ronde 59. Deze module bepaalt waar je landt na een herlaadbeurt en wat de
// terugknop doet. Elke test hieronder is met de hand na te lopen.

afterEach(() => {
  window.history.replaceState(null, '', '#')
})

describe('hashNaarRoute', () => {
  it('leest een gewone pagina', () => {
    expect(hashNaarRoute('#/budget')).toEqual({ pagina: 'budget' })
    // Met en zonder schuine streep, want beide vormen komen voor in de praktijk.
    expect(hashNaarRoute('#budget')).toEqual({ pagina: 'budget' })
  })

  it('leest de subtab van de dossierpagina', () => {
    expect(hashNaarRoute('#/dossiers/garantie')).toEqual({ pagina: 'dossiers', subtab: 'garantie' })
  })

  it('leest de actie die de snelkoppeling gebruikt', () => {
    expect(hashNaarRoute('#/transacties/nieuw')).toEqual({ pagina: 'transacties', actie: 'nieuw' })
  })

  it('geeft null bij alles wat geen bekende pagina is', () => {
    // Streng, en met opzet: een half herkend adres zou je op een pagina zetten die
    // niet bestaat. Dan valt de app liever terug op haar gewone startgedrag.
    expect(hashNaarRoute('')).toBeNull()
    expect(hashNaarRoute('#')).toBeNull()
    expect(hashNaarRoute('#/')).toBeNull()
    expect(hashNaarRoute('#/bestaatniet')).toBeNull()
    expect(hashNaarRoute('#/BUDGET')).toBeNull()
  })

  it('negeert een onbekend tweede deel in plaats van de hele route weg te gooien', () => {
    // De pagina klopt; een subtab die we niet kennen is geen reden om iemand op het
    // Overzicht te zetten.
    expect(hashNaarRoute('#/dossiers/onzin')).toEqual({ pagina: 'dossiers' })
    expect(hashNaarRoute('#/budget/onzin')).toEqual({ pagina: 'budget' })
  })

  it('laat een subtab alleen toe waar hij betekenis heeft', () => {
    expect(hashNaarRoute('#/transacties/garantie')).toEqual({ pagina: 'transacties' })
    expect(hashNaarRoute('#/dossiers/nieuw')).toEqual({ pagina: 'dossiers' })
  })

  // Ronde 60: de Analyse-pagina kreeg drie tabbladen, en het gekozen tabblad staat in
  // het adres. Dezelfde drie proeven als bij de dossierlade hierboven — anders is dit
  // alleen indirect gedekt via de test van de hele app.
  it('leest het tabblad van de analysepagina', () => {
    expect(hashNaarRoute('#/analyse/vooruit')).toEqual({ pagina: 'analyse', analyse: 'vooruit' })
    expect(hashNaarRoute('#/analyse/verandering')).toEqual({ pagina: 'analyse', analyse: 'verandering' })
  })

  it('negeert een onbekend tabblad in plaats van de pagina weg te gooien', () => {
    expect(hashNaarRoute('#/analyse/onzin')).toEqual({ pagina: 'analyse' })
  })

  // Ronde 64: dezelfde afspraak voor de Budget-pagina.
  it('leest het tabblad van de budgetpagina', () => {
    expect(hashNaarRoute('#/budget/vast')).toEqual({ pagina: 'budget', budget: 'vast' })
    expect(hashNaarRoute('#/budget/budgetten')).toEqual({ pagina: 'budget', budget: 'budgetten' })
  })

  it('negeert een onbekend budgettabblad zonder de pagina te verliezen', () => {
    expect(hashNaarRoute('#/budget/onzin')).toEqual({ pagina: 'budget' })
  })

  it('laat een budgettabblad alleen toe op de budgetpagina', () => {
    expect(hashNaarRoute('#/analyse/vast')).toEqual({ pagina: 'analyse' })
  })

  it('laat een analysetabblad alleen toe op de analysepagina', () => {
    expect(hashNaarRoute('#/budget/vooruit')).toEqual({ pagina: 'budget' })
  })
})

describe('routeNaarHash', () => {
  it('is de omgekeerde van hashNaarRoute', () => {
    for (const hash of ['#/overzicht', '#/dossiers/lening', '#/transacties/nieuw', '#/instellingen']) {
      expect(routeNaarHash(hashNaarRoute(hash) as never)).toBe(hash)
    }
  })

  it('laat een subtab weg waar hij niet hoort', () => {
    expect(routeNaarHash({ pagina: 'budget', subtab: 'lening' })).toBe('#/budget')
    expect(routeNaarHash({ pagina: 'dossiers', actie: 'nieuw' })).toBe('#/dossiers')
  })

  it('schrijft en leest het budgettabblad heen en terug', () => {
    expect(routeNaarHash({ pagina: 'budget', budget: 'vast' })).toBe('#/budget/vast')
    expect(hashNaarRoute('#/budget/vast')).toEqual({ pagina: 'budget', budget: 'vast' })
    // Een budgettabblad op een andere pagina laat geen spoor na in het adres.
    expect(routeNaarHash({ pagina: 'analyse', budget: 'vast' })).toBe('#/analyse')
  })

  it('schrijft en leest het analysetabblad heen en terug', () => {
    expect(routeNaarHash({ pagina: 'analyse', analyse: 'vooruit' })).toBe('#/analyse/vooruit')
    expect(routeNaarHash({ pagina: 'budget', analyse: 'vooruit' })).toBe('#/budget')
  })
})

describe('zetRoute en huidigeRoute', () => {
  it('zet de route in het adres en leest ze terug', () => {
    zetRoute({ pagina: 'spaardoelen' })
    expect(window.location.hash).toBe('#/spaardoelen')
    expect(huidigeRoute()).toEqual({ pagina: 'spaardoelen' })
  })

  it('maakt geen tweede stap voor dezelfde plek', () => {
    // Zonder deze regel levert elke hertekening een extra stap op, en dan moet je
    // vijf keer op terug drukken om één pagina terug te gaan.
    zetRoute({ pagina: 'budget' })
    const voor = window.history.length
    zetRoute({ pagina: 'budget' })
    zetRoute({ pagina: 'budget' })
    expect(window.history.length).toBe(voor)
  })

  it('vervangt zonder een stap te maken wanneer dat gevraagd wordt', () => {
    zetRoute({ pagina: 'overzicht' })
    const voor = window.history.length
    zetRoute({ pagina: 'analyse' }, true)
    expect(window.location.hash).toBe('#/analyse')
    expect(window.history.length).toBe(voor)
  })
})

describe('volgRoute', () => {
  it('meldt de nieuwe route bij een druk op terug', async () => {
    const gezien: (string | null)[] = []
    const stop = volgRoute((r) => gezien.push(r === null ? null : routeNaarHash(r)))
    zetRoute({ pagina: 'overzicht' }, true)
    zetRoute({ pagina: 'budget' })
    window.history.back()
    await new Promise((r) => setTimeout(r, 30))
    stop()
    expect(gezien).toContain('#/overzicht')
  })

  it('hoort ook een stap terug die het adres NIET verandert', async () => {
    // ⚠ De vorige test bewijst minder dan ze belooft: `history.back()` verandert daar
    // ook het adres, dus `hashchange` alleen zou al genoeg zijn. Maar een popup zet
    // een stap naar DEZELFDE plek (zie ui/Dialoog.tsx), en die geeft geen
    // `hashchange` — alleen `popstate`. Zonder die luisteraar zou de terugknop een
    // popup niet meer sluiten.
    zetRoute({ pagina: 'budget' }, true)
    const gezien: string[] = []
    const stop = volgRoute((r) => gezien.push(r === null ? 'null' : routeNaarHash(r)))
    // Een stap op hetzelfde adres, precies zoals een popup die zet.
    window.history.pushState({ kompalPopup: 1 }, '', '#/budget')
    window.history.back()
    await new Promise((r) => setTimeout(r, 30))
    stop()
    expect(gezien).toEqual(['#/budget'])
  })

  it('luistert niet meer na het opzeggen', async () => {
    const gezien: unknown[] = []
    const stop = volgRoute((r) => gezien.push(r))
    stop()
    zetRoute({ pagina: 'overzicht' }, true)
    zetRoute({ pagina: 'budget' })
    window.history.back()
    await new Promise((r) => setTimeout(r, 30))
    expect(gezien).toEqual([])
  })
})

describe('zelfdeRoute', () => {
  it('vergelijkt op de plek en niet op het voorwerp', () => {
    expect(zelfdeRoute({ pagina: 'budget' }, { pagina: 'budget' })).toBe(true)
    expect(zelfdeRoute({ pagina: 'budget' }, { pagina: 'analyse' })).toBe(false)
    expect(zelfdeRoute(null, null)).toBe(true)
    expect(zelfdeRoute(null, { pagina: 'budget' })).toBe(false)
    // Een subtab die op deze pagina toch weggelaten wordt, telt niet mee.
    expect(zelfdeRoute({ pagina: 'budget' }, { pagina: 'budget', subtab: 'lening' })).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('zetExtraStap', () => {
  const merk = () => (window.history.state as { kompalExtra?: boolean } | null)?.kompalExtra === true

  it('geeft de terugknop iets om op te landen, zonder dat het adres verandert', async () => {
    // ⚠ Zonder deze stap verlaat de browser de app wanneer je meteen na het starten
    // een popup opent en op terug drukt — met je halve boeking erin. Gemeten in een
    // echte browser; in jsdom is dat niet te zien.
    zetRoute({ pagina: 'overzicht' }, true)
    zetExtraStap()
    expect(merk()).toBe(true)
    expect(window.location.hash).toBe('#/overzicht')

    // En één druk op terug landt op dezelfde plek: je ziet niets gebeuren, maar de
    // app is niet verlaten.
    window.history.back()
    await new Promise((r) => setTimeout(r, 30))
    expect(window.location.hash).toBe('#/overzicht')
    expect(merk()).toBe(false)
  })

  it('legt er nooit meer dan één tegelijk', async () => {
    zetRoute({ pagina: 'overzicht' }, true)
    zetExtraStap()
    zetExtraStap()
    zetExtraStap()
    // Eén terugdruk hoort ze allemaal op te ruimen; er was er maar één.
    window.history.back()
    await new Promise((r) => setTimeout(r, 30))
    expect(merk()).toBe(false)
  })

  it('wordt hergebruikt door de eerste echte navigatie', async () => {
    // Anders groeit de geschiedenis met een stap per popup die je opent, en moet je
    // vijf keer op terug drukken om één pagina terug te gaan.
    zetRoute({ pagina: 'overzicht' }, true)
    zetExtraStap()
    zetRoute({ pagina: 'budget' })
    expect(window.location.hash).toBe('#/budget')
    expect(merk()).toBe(false)

    window.history.back()
    await new Promise((r) => setTimeout(r, 30))
    expect(window.location.hash).toBe('#/overzicht')
  })
})
