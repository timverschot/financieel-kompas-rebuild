import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { BUDGETDREMPELS, STANDAARD_BUDGETDREMPEL } from './utils/meldingen'
import { keurVerborgen } from './utils/appOnderdelen'
import type { Pagina } from './components/navigatie'

// Kleine, per-toestel voorkeuren die géén gegevens zijn maar wél bewaard moeten
// blijven. Exact hetzelfde patroon als `thema.tsx` en de taalkeuze in `i18n.tsx`:
// localStorage, met een veilige terugval en zonder de datalaag te raken.
//
// Waarom niet in de database (en dus in de Drive-back-up)? Dit is een
// weergavevoorkeur, geen gebeurtenis in je financiën. Ze hoort niet in het
// append-only logboek, net zoals licht/donker en de taal daar niet in zitten.
// Gevolg: je stelt ze per toestel in. Dat is bewust.

const OPSLAG_SLEUTEL = 'fk_budgetdrempel'
const ONDERDELEN_SLEUTEL = 'fk_verborgen_paginas'

// Leest de bewaarde drempel. Alles wat geen geldige keuze is (oude waarde,
// handmatig gerommel, kapotte localStorage) valt terug op de standaard.
function leesDrempel(): number {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL)
    if (ruw !== null) {
      const n = Number(ruw)
      if (BUDGETDREMPELS.includes(n)) return n
    }
  } catch {
    // localStorage niet beschikbaar: stil terugvallen op de standaard.
  }
  return STANDAARD_BUDGETDREMPEL
}

/**
 * Welke pagina's je uitgezet hebt (ronde 75).
 *
 * ⚠ Bewust een LIJST in localStorage en niet in de database, om dezelfde reden als
 * de drempel hierboven: dit is een weergavevoorkeur, geen gebeurtenis in je
 * financiën. Ze hoort niet in het append-only logboek, en ze is dus per toestel.
 * Dat is verdedigbaar én gewenst: op je gsm wil je misschien minder zien dan op je
 * pc, en het omgekeerde — een pagina die op één toestel verdwijnt en op alle andere
 * mee — zou verrassender zijn dan wat het oplost.
 */
function leesVerborgen(): Pagina[] {
  try {
    const ruw = localStorage.getItem(ONDERDELEN_SLEUTEL)
    if (ruw !== null) return keurVerborgen(JSON.parse(ruw))
  } catch {
    // localStorage niet beschikbaar, of geen geldige JSON: alles blijft zichtbaar.
    // ⚠ Die terugval is de veilige kant op: bij twijfel TOONT de app alles. Zou ze
    // bij een leesfout iets verbergen, dan zou een kapotte voorkeur pagina's laten
    // verdwijnen zonder dat iemand weet waarom.
  }
  return []
}

type InstellingenContextType = {
  /** Vanaf welk percentage een budget een waarschuwing geeft. */
  budgetDrempel: number
  zetBudgetDrempel: (n: number) => void
  /** De pagina's die je uitgezet hebt. Zie utils/appOnderdelen.ts. */
  verborgenPaginas: Pagina[]
  zetVerborgenPaginas: (p: Pagina[]) => void
}

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests).
const standaard: InstellingenContextType = {
  budgetDrempel: STANDAARD_BUDGETDREMPEL,
  zetBudgetDrempel: () => {},
  // ⚠ Leeg, dus zonder Provider is ALLES zichtbaar. Elke test die een scherm
  // rechtstreeks rendert, ziet daardoor de app zoals ze standaard is.
  verborgenPaginas: [],
  zetVerborgenPaginas: () => {},
}

const InstellingenContext = createContext<InstellingenContextType>(standaard)

export function InstellingenProvider({ children }: { children: ReactNode }) {
  const [budgetDrempel, setBudgetDrempel] = useState<number>(leesDrempel)
  const [verborgenPaginas, setVerborgenPaginas] = useState<Pagina[]>(leesVerborgen)

  useEffect(() => {
    try {
      localStorage.setItem(OPSLAG_SLEUTEL, String(budgetDrempel))
    } catch {
      // stil negeren
    }
  }, [budgetDrempel])

  useEffect(() => {
    try {
      localStorage.setItem(ONDERDELEN_SLEUTEL, JSON.stringify(verborgenPaginas))
    } catch {
      // stil negeren
    }
  }, [verborgenPaginas])

  return (
    <InstellingenContext.Provider
      value={{ budgetDrempel, zetBudgetDrempel: setBudgetDrempel, verborgenPaginas, zetVerborgenPaginas: setVerborgenPaginas }}
    >
      {children}
    </InstellingenContext.Provider>
  )
}

/** Hook: const { budgetDrempel, verborgenPaginas, … } = useInstellingen(). */
export function useInstellingen(): InstellingenContextType {
  return useContext(InstellingenContext)
}
