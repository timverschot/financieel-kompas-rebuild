import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Licht/donker-thema. Drie keuzes: altijd licht, altijd donker, of "volg systeem"
// (dan kijkt de app naar de voorkeur van je toestel). De keuze wordt bewaard,
// zodat ze bij een volgende start behouden blijft.
//
// Techniek: we zetten data-theme="dark" op <html> wanneer donker actief is. De
// kleuren zelf staan als CSS-variabelen in index.css; hier schakelen we enkel.

export type ThemaKeuze = 'licht' | 'donker' | 'systeem'

export const THEMAKEUZES: { waarde: ThemaKeuze; label: string }[] = [
  { waarde: 'licht', label: 'Licht' },
  { waarde: 'donker', label: 'Donker' },
  { waarde: 'systeem', label: 'Systeem' },
]

const OPSLAG_SLEUTEL = 'fk_thema'

function leesKeuze(): ThemaKeuze {
  try {
    const k = localStorage.getItem(OPSLAG_SLEUTEL)
    if (k === 'licht' || k === 'donker' || k === 'systeem') return k
  } catch {
    // localStorage niet beschikbaar: stil terugvallen op systeem.
  }
  return 'systeem'
}

// Bepaalt of donker effectief actief is, gegeven de keuze en de systeemvoorkeur.
export function isDonkerActief(keuze: ThemaKeuze): boolean {
  if (keuze === 'licht') return false
  if (keuze === 'donker') return true
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

// Zet (of verwijder) data-theme op <html> zodat de juiste kleuren gelden.
function pasThemaToe(keuze: ThemaKeuze) {
  const donker = isDonkerActief(keuze)
  const el = document.documentElement
  if (donker) el.setAttribute('data-theme', 'dark')
  else el.removeAttribute('data-theme')
}

type ThemaContextType = { keuze: ThemaKeuze; zetKeuze: (k: ThemaKeuze) => void }

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests).
const standaard: ThemaContextType = { keuze: 'systeem', zetKeuze: () => {} }

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

  // Volg live mee met de systeemvoorkeur wanneer "systeem" gekozen is.
  useEffect(() => {
    if (keuze !== 'systeem') return
    let mql: MediaQueryList
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const bijWijziging = () => pasThemaToe('systeem')
    mql.addEventListener('change', bijWijziging)
    return () => mql.removeEventListener('change', bijWijziging)
  }, [keuze])

  return <ThemaContext.Provider value={{ keuze, zetKeuze: setKeuze }}>{children}</ThemaContext.Provider>
}

// Hook: const { keuze, zetKeuze } = useThema().
export function useThema(): ThemaContextType {
  return useContext(ThemaContext)
}
