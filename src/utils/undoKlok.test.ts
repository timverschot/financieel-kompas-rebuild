import { describe, it, expect } from 'vitest'
import { maakUndoKlok, UNDO_MS } from './undoKlok'

// Ronde 61. De klok achter de ongedaan-balk. Hier na te rekenen zonder browser en
// zonder echte tijd: de test speelt zelf voor klok.
function nepPlanner() {
  let volgende = 1
  const lopend = new Map<number, { fn: () => void; ms: number }>()
  return {
    planner: {
      zet: (fn: () => void, ms: number) => {
        const id = volgende++
        lopend.set(id, { fn, ms })
        return id
      },
      wis: (id: number) => {
        lopend.delete(id)
      },
    },
    /** Laat elke lopende klok aflopen. */
    laatAflopen() {
      for (const [id, t] of [...lopend]) {
        lopend.delete(id)
        t.fn()
      }
    },
    aantalLopend: () => lopend.size,
    laatsteWachttijd: () => {
      const alle = [...lopend.values()]
      return alle.length > 0 ? alle[alle.length - 1].ms : undefined
    },
  }
}

describe('undoKlok', () => {
  it('loopt twintig seconden, niet acht', () => {
    // ⚠ Acht was genoeg voor wie een muis heeft. Met een toetsenbord moest je vanaf je
    // plek tot voorbij de laatste knop van de pagina tabben, en dat lukt niet in acht
    // seconden — het herstelnet bestond voor die gebruikers dus niet.
    expect(UNDO_MS).toBe(20000)
    const { planner, laatsteWachttijd } = nepPlanner()
    const klok = maakUndoKlok(() => {}, planner)
    klok.start()
    expect(laatsteWachttijd()).toBe(20000)
  })

  it('roept na afloop precies één keer op', () => {
    const { planner, laatAflopen } = nepPlanner()
    let n = 0
    const klok = maakUndoKlok(() => n++, planner)
    klok.start()
    laatAflopen()
    expect(n).toBe(1)
    expect(klok.loopt()).toBe(false)
  })

  it('zet de klok stil zolang de muis erop staat', () => {
    const { planner, laatAflopen } = nepPlanner()
    let n = 0
    const klok = maakUndoKlok(() => n++, planner)
    klok.start()
    klok.pauzeer('muis')
    laatAflopen()
    expect(n).toBe(0)
    klok.hervat('muis')
    laatAflopen()
    expect(n).toBe(1)
  })

  it('hervat pas wanneer ALLEBEI weg zijn', () => {
    // ⚠ Dit is de fout die de nakijkronde ving. Ga je met de muis over de balk, tab je
    // er dan in en beweeg je de muis weg, dan zou één vlag de klok hervatten terwijl je
    // focus er nog ín zit — twintig seconden later verdwijnt de balk onder je vinger
    // vandaan en val je terug naar het begin van de pagina.
    const { planner, laatAflopen } = nepPlanner()
    let n = 0
    const klok = maakUndoKlok(() => n++, planner)
    klok.start()
    klok.pauzeer('muis')
    klok.pauzeer('focus')

    klok.hervat('muis')
    expect(klok.loopt()).toBe(false)
    laatAflopen()
    expect(n).toBe(0)

    klok.hervat('focus')
    expect(klok.loopt()).toBe(true)
    laatAflopen()
    expect(n).toBe(1)
  })

  it('laat nooit twee klokken tegelijk lopen', () => {
    // Anders verdwijnt de balk op het ritme van de OUDSTE klok, en dan is pauzeren
    // zinloos.
    const { planner, aantalLopend } = nepPlanner()
    const klok = maakUndoKlok(() => {}, planner)
    klok.start()
    klok.start()
    klok.pauzeer('muis')
    klok.hervat('muis')
    klok.hervat('muis')
    expect(aantalLopend()).toBe(1)
  })

  it('begint bij een nieuwe verwijdering met een schone lei', () => {
    // Stond de muis nog op de vorige balk toen die verdween, dan mag die vlag de
    // volgende balk niet eeuwig laten staan.
    const { planner, laatAflopen } = nepPlanner()
    let n = 0
    const klok = maakUndoKlok(() => n++, planner)
    klok.start()
    klok.pauzeer('muis')
    klok.start()
    laatAflopen()
    expect(n).toBe(1)
  })

  it('stopt helemaal wanneer je de balk wegklikt', () => {
    const { planner, laatAflopen, aantalLopend } = nepPlanner()
    let n = 0
    const klok = maakUndoKlok(() => n++, planner)
    klok.start()
    klok.stop()
    expect(aantalLopend()).toBe(0)
    laatAflopen()
    expect(n).toBe(0)
  })
})
