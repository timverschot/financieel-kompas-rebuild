// Nagebootste `window.matchMedia` voor de tests.
//
// Waarom dit nodig is: de app kiest tussen de mobiele en de desktopweergave met
// `window.matchMedia('(min-width: 1024px)')`. De testomgeving (jsdom) kent die
// functie niet, waardoor de app in tests ALTIJD op de mobiele weergave terugvalt
// en de volledige desktopcode ongetest bleef. Met deze nabootsing kan een test
// zeggen hoe breed het scherm is.
//
// Gebruik in een test:
//   import { zetSchermbreedte } from '../test/schermbreedte'
//   zetSchermbreedte(1440)   // desktop
//   zetSchermbreedte(390)    // telefoon (standaard)

const STANDAARD_BREEDTE = 390

let breedte = STANDAARD_BREEDTE
const luisteraars = new Set<{ query: string; luister: () => void }>()

function komtOvereen(query: string): boolean {
  const min = /min-width:\s*(\d+)px/.exec(query)
  if (min) return breedte >= Number(min[1])
  const max = /max-width:\s*(\d+)px/.exec(query)
  if (max) return breedte <= Number(max[1])
  // Alles wat we niet begrijpen (bv. prefers-color-scheme) is gewoon niet actief.
  return false
}

/** Zet de nagebootste schermbreedte en waarschuwt wie meeluistert. */
export function zetSchermbreedte(px: number): void {
  breedte = px
  for (const l of luisteraars) l.luister()
}

/** Terug naar de standaard (telefoon), zodat tests elkaar niet beïnvloeden. */
export function herstelSchermbreedte(): void {
  zetSchermbreedte(STANDAARD_BREEDTE)
}

/** Installeert de nabootsing op `window`. Wordt aangeroepen vanuit setupTests. */
export function installeerMatchMedia(): void {
  if (typeof window === 'undefined') return
  window.matchMedia = (query: string) => {
    const item = { query, luister: () => {} }
    const mql = {
      media: query,
      get matches() {
        return komtOvereen(query)
      },
      onchange: null,
      addEventListener: (_soort: string, cb: () => void) => {
        item.luister = cb
        luisteraars.add(item)
      },
      removeEventListener: () => {
        luisteraars.delete(item)
      },
      addListener: (cb: () => void) => {
        item.luister = cb
        luisteraars.add(item)
      },
      removeListener: () => {
        luisteraars.delete(item)
      },
      dispatchEvent: () => false,
    }
    return mql as unknown as MediaQueryList
  }
}
