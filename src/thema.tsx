import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Licht of donker. Twee keuzes, niet drie.
//
// Er was ook een keuze "systeem" die de voorkeur van het toestel volgde. Die is
// weg, om een eenvoudige reden: op een toestel dat zelf op donker staat, geeft
// "systeem" exact hetzelfde beeld als "donker", en dan is één van de drie knoppen
// alleen maar uitleg die je moet geven. De nuttige helft van dat gedrag houden we:
// bij de **allereerste** start volgt de app nog steeds de voorkeur van je toestel.
// Daarna is het jouw keuze en blijft ze staan.
//
// Techniek: we zetten data-theme="dark" op <html> wanneer donker actief is. De
// kleuren zelf staan als CSS-variabelen in index.css; hier schakelen we enkel.

export type ThemaKeuze = 'licht' | 'donker'

export const THEMAKEUZES: { waarde: ThemaKeuze; label: string }[] = [
  { waarde: 'licht', label: 'Licht' },
  { waarde: 'donker', label: 'Donker' },
]

const OPSLAG_SLEUTEL = 'fk_thema'

/** Wat het toestel zelf verkiest. Alleen gebruikt bij de allereerste start. */
export function systeemVerkiestDonker(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function leesKeuze(): ThemaKeuze {
  try {
    const k = localStorage.getItem(OPSLAG_SLEUTEL)
    if (k === 'licht' || k === 'donker') return k
    // Wie vroeger 'systeem' gekozen had, verschiet niet: die keuze wordt één keer
    // omgezet naar wat het toestel op dít moment zegt, en blijft dan staan.
    if (k === 'systeem') return systeemVerkiestDonker() ? 'donker' : 'licht'
  } catch {
    // localStorage niet beschikbaar: stil terugvallen op de systeemvoorkeur.
  }
  return systeemVerkiestDonker() ? 'donker' : 'licht'
}

/** Of donker actief is. Met twee keuzes is dat nu een rechttoe rechtaan vraag. */
export function isDonkerActief(keuze: ThemaKeuze): boolean {
  return keuze === 'donker'
}

/**
 * De kleur van de systeembalken rondom de geïnstalleerde app.
 *
 * Ronde 34: dit stond hardgecodeerd op donker in `index.html`, en werd nergens
 * bijgewerkt. Wie de app op het lichte thema zette en haar op het beginscherm
 * van zijn telefoon had staan, kreeg dus een bijna-zwarte band rond een crème
 * app. Het is dezelfde waarde als `--surface` per thema.
 */
const BALKKLEUR: Record<ThemaKeuze, string> = { licht: '#FFFCF6', donker: '#171C23' }

// Zet (of verwijder) data-theme op <html> zodat de juiste kleuren gelden.
function pasThemaToe(keuze: ThemaKeuze) {
  const el = document.documentElement
  if (isDonkerActief(keuze)) el.setAttribute('data-theme', 'dark')
  else el.removeAttribute('data-theme')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', BALKKLEUR[keuze])
}

type ThemaContextType = { keuze: ThemaKeuze; zetKeuze: (k: ThemaKeuze) => void }

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests).
const standaard: ThemaContextType = { keuze: 'licht', zetKeuze: () => {} }

const ThemaContext = createContext<ThemaContextType>(standaard)

export function ThemaProvider({ children }: { children: ReactNode }) {
  const [keuze, setKeuze] = useState<ThemaKeuze>(leesKeuze)

  useEffect(() => {
    try {
      localStorage.setItem(OPSLAG_SLEUTEL, keuze)
    } catch {
      // stil negeren
    }
    pasThemaToe(keuze)
  }, [keuze])

  return <ThemaContext.Provider value={{ keuze, zetKeuze: setKeuze }}>{children}</ThemaContext.Provider>
}

/** Hook: const { keuze, zetKeuze } = useThema(). */
export function useThema(): ThemaContextType {
  return useContext(ThemaContext)
}
