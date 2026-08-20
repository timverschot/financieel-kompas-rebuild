// De klok achter de "ongedaan maken"-balk (ronde 61).
//
// Waarom dit een eigen bestand is en geen paar regels in `App.tsx`: het is een
// toestandsmachientje met twee vlaggen, en juist daar zat de fout die de nakijkronde
// vond. Los van het scherm is ze na te rekenen zonder klok en zonder browser — dezelfde
// reden als bij `volgendeVerborgenLijst` in ronde 60.

/**
 * Hoelang de balk blijft staan.
 *
 * ⚠ TWINTIG seconden en niet acht. Acht was genoeg voor wie een muis heeft: de balk
 * staat onderaan, je klikt. Met een toetsenbord moest je vanaf je plek tot voorbij de
 * laatste knop van de pagina tabben — op een transactielijst zijn dat tientallen stops
 * — en dat lukt niet in acht seconden. Voor die gebruikers bestond het herstelnet dus
 * in de praktijk niet. Twintig seconden is ook de ondergrens die de
 * toegankelijkheidsnorm noemt voor een tijdslimiet die je niet kan verlengen.
 */
export const UNDO_MS = 20000

/** Wat er van "de tijd" nodig is. Zo kan een test hem zelf vooruitzetten. */
export type Planner = {
  zet: (fn: () => void, ms: number) => number
  wis: (id: number) => void
}

export type UndoKlok = {
  /** (Her)start de klok, met beide vlaggen op nul. */
  start: () => void
  /** Zet de klok stil omdat de muis of de focus binnenkomt. */
  pauzeer: (welke: 'muis' | 'focus') => void
  /** Laat de klok weer lopen — maar pas wanneer ALLEBEI weg zijn. */
  hervat: (welke: 'muis' | 'focus') => void
  /** Zet alles stil; de balk verdwijnt niet meer vanzelf. */
  stop: () => void
  /** Loopt er op dit ogenblik een klok? Alleen voor tests en uitleg. */
  loopt: () => boolean
}

/**
 * Maakt een klok die afloopt na `ms`, tenzij de muis of de focus in de balk zit.
 *
 * ⚠ TWEE vlaggen en niet één. Ga je met de muis over de balk, tab je er dan in en
 * beweeg je de muis weg, dan zou één vlag de klok hervatten terwijl je focus er nog ín
 * zit — twintig seconden later verdwijnt de balk onder je vinger vandaan en val je
 * terug naar het begin van de pagina. Precies wat deze ronde wil voorkomen.
 */
export function maakUndoKlok(opVerlopen: () => void, planner: Planner, ms: number = UNDO_MS): UndoKlok {
  let timer: number | null = null
  let muis = false
  let focus = false

  function wis() {
    if (timer !== null) planner.wis(timer)
    timer = null
  }

  function plan() {
    wis()
    timer = planner.zet(() => {
      timer = null
      opVerlopen()
    }, ms)
  }

  return {
    start() {
      muis = false
      focus = false
      plan()
    },
    pauzeer(welke) {
      if (welke === 'muis') muis = true
      else focus = true
      wis()
    },
    hervat(welke) {
      if (welke === 'muis') muis = false
      else focus = false
      if (muis || focus) return
      plan()
    },
    stop() {
      muis = false
      focus = false
      wis()
    },
    loopt() {
      return timer !== null
    },
  }
}
