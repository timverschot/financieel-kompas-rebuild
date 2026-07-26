import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { BUDGETDREMPELS, STANDAARD_BUDGETDREMPEL } from './utils/meldingen'

// Kleine, per-toestel voorkeuren die géén gegevens zijn maar wél bewaard moeten
// blijven. Exact hetzelfde patroon als `thema.tsx` en de taalkeuze in `i18n.tsx`:
// localStorage, met een veilige terugval en zonder de datalaag te raken.
//
// Waarom niet in de database (en dus in de Drive-back-up)? Dit is een
// weergavevoorkeur, geen gebeurtenis in je financiën. Ze hoort niet in het
// append-only logboek, net zoals licht/donker en de taal daar niet in zitten.
// Gevolg: je stelt ze per toestel in. Dat is bewust.

const OPSLAG_SLEUTEL = 'fk_budgetdrempel'

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

type InstellingenContextType = {
  /** Vanaf welk percentage een budget een waarschuwing geeft. */
  budgetDrempel: number
  zetBudgetDrempel: (n: number) => void
}

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests).
const standaard: InstellingenContextType = {
  budgetDrempel: STANDAARD_BUDGETDREMPEL,
  zetBudgetDrempel: () => {},
}

const InstellingenContext = createContext<InstellingenContextType>(standaard)

export function InstellingenProvider({ children }: { children: ReactNode }) {
  const [budgetDrempel, setBudgetDrempel] = useState<number>(leesDrempel)

  useEffect(() => {
    try {
      localStorage.setItem(OPSLAG_SLEUTEL, String(budgetDrempel))
    } catch {
      // stil negeren
    }
  }, [budgetDrempel])

  return (
    <InstellingenContext.Provider value={{ budgetDrempel, zetBudgetDrempel: setBudgetDrempel }}>
      {children}
    </InstellingenContext.Provider>
  )
}

/** Hook: const { budgetDrempel, zetBudgetDrempel } = useInstellingen(). */
export function useInstellingen(): InstellingenContextType {
  return useContext(InstellingenContext)
}
