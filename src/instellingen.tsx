import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { BUDGETDREMPELS, STANDAARD_BUDGETDREMPEL } from './utils/meldingen'
import { keurVerborgen } from './utils/appOnderdelen'
import { keurVerborgenKaarten, type AnalyseKaartId } from './utils/analysekaarten'
import { keurVerborgenOverzichtKaarten, type OverzichtKaartId } from './utils/overzichtkaarten'
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
// ⚠ Een EIGEN sleutel en geen tweede lijst in dezelfde (ronde 81). De ene gaat over
// pagina's en de andere over kaarten binnen één pagina; ze samen bewaren zou
// betekenen dat `keurVerborgen` en `keurVerborgenKaarten` elkaars waarden moeten
// wegfilteren, en dan drukt een tikfout in de ene lijst iets weg in de andere.
const ANALYSEKAARTEN_SLEUTEL = 'fk_verborgen_analysekaarten'
// ⚠ En om precies dezelfde reden een DERDE sleutel (ronde 90). De kaarten van het
// Overzicht en die van Analyse › Verdeling zijn twee verzamelingen met eigen id's; in
// één lijst zouden `keurVerborgenKaarten` en `keurVerborgenOverzichtKaarten` elkaars
// waarden moeten wegfilteren.
const OVERZICHTKAARTEN_SLEUTEL = 'fk_verborgen_overzichtkaarten'

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

/**
 * Welke verdelingskaarten je op Analyse uitgezet hebt (ronde 81).
 *
 * Zelfde keuze en zelfde terugval als `leesVerborgen` hierboven: een
 * weergavevoorkeur per toestel, en bij twijfel toont de app alles.
 */
function leesVerborgenKaarten(): AnalyseKaartId[] {
  try {
    const ruw = localStorage.getItem(ANALYSEKAARTEN_SLEUTEL)
    if (ruw !== null) return keurVerborgenKaarten(JSON.parse(ruw))
  } catch {
    // localStorage niet beschikbaar, of geen geldige JSON: alles blijft zichtbaar.
  }
  return []
}

/**
 * Welke kaarten van het Overzicht je uitgezet hebt (ronde 90).
 *
 * Zelfde keuze en zelfde terugval als de twee lezers hierboven: een weergavevoorkeur per
 * toestel, en bij twijfel toont de app alles.
 */
function leesVerborgenOverzichtKaarten(): OverzichtKaartId[] {
  try {
    const ruw = localStorage.getItem(OVERZICHTKAARTEN_SLEUTEL)
    if (ruw !== null) return keurVerborgenOverzichtKaarten(JSON.parse(ruw))
  } catch {
    // localStorage niet beschikbaar, of geen geldige JSON: alles blijft zichtbaar.
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
  /** De verdelingskaarten die je uitgezet hebt. Zie utils/analysekaarten.ts. */
  verborgenAnalysekaarten: AnalyseKaartId[]
  zetVerborgenAnalysekaarten: (k: AnalyseKaartId[]) => void
  /** De kaarten van het Overzicht die je uitgezet hebt. Zie utils/overzichtkaarten.ts. */
  verborgenOverzichtkaarten: OverzichtKaartId[]
  zetVerborgenOverzichtkaarten: (k: OverzichtKaartId[]) => void
}

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests).
const standaard: InstellingenContextType = {
  budgetDrempel: STANDAARD_BUDGETDREMPEL,
  zetBudgetDrempel: () => {},
  // ⚠ Leeg, dus zonder Provider is ALLES zichtbaar. Elke test die een scherm
  // rechtstreeks rendert, ziet daardoor de app zoals ze standaard is.
  verborgenPaginas: [],
  zetVerborgenPaginas: () => {},
  verborgenAnalysekaarten: [],
  zetVerborgenAnalysekaarten: () => {},
  verborgenOverzichtkaarten: [],
  zetVerborgenOverzichtkaarten: () => {},
}

const InstellingenContext = createContext<InstellingenContextType>(standaard)

export function InstellingenProvider({ children }: { children: ReactNode }) {
  const [budgetDrempel, setBudgetDrempel] = useState<number>(leesDrempel)
  const [verborgenPaginas, setVerborgenPaginas] = useState<Pagina[]>(leesVerborgen)
  const [verborgenAnalysekaarten, setVerborgenAnalysekaarten] = useState<AnalyseKaartId[]>(leesVerborgenKaarten)
  const [verborgenOverzichtkaarten, setVerborgenOverzichtkaarten] =
    useState<OverzichtKaartId[]>(leesVerborgenOverzichtKaarten)

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

  useEffect(() => {
    try {
      localStorage.setItem(ANALYSEKAARTEN_SLEUTEL, JSON.stringify(verborgenAnalysekaarten))
    } catch {
      // stil negeren
    }
  }, [verborgenAnalysekaarten])

  useEffect(() => {
    try {
      localStorage.setItem(OVERZICHTKAARTEN_SLEUTEL, JSON.stringify(verborgenOverzichtkaarten))
    } catch {
      // stil negeren
    }
  }, [verborgenOverzichtkaarten])

  return (
    <InstellingenContext.Provider
      value={{
        budgetDrempel,
        zetBudgetDrempel: setBudgetDrempel,
        verborgenPaginas,
        zetVerborgenPaginas: setVerborgenPaginas,
        verborgenAnalysekaarten,
        zetVerborgenAnalysekaarten: setVerborgenAnalysekaarten,
        verborgenOverzichtkaarten,
        zetVerborgenOverzichtkaarten: setVerborgenOverzichtkaarten,
      }}
    >
      {children}
    </InstellingenContext.Provider>
  )
}

/** Hook: const { budgetDrempel, verborgenPaginas, … } = useInstellingen(). */
export function useInstellingen(): InstellingenContextType {
  return useContext(InstellingenContext)
}
