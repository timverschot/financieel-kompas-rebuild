import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Meertaligheid (NL/EN/FR). Bewust eenvoudig gehouden: de SLEUTEL is de
// Nederlandse tekst zelf. Ontbreekt een vertaling voor de gekozen taal, dan valt
// de app terug op het Nederlands. Zo werkt alles altijd — ook zolang EN/FR nog
// niet volledig ingevuld zijn — en kunnen teksten geleidelijk door t() lopen.
//
// Opgeslagen (interne) waarden — categorie-id's, rekeningtypes, kindnamen — blijven
// taal-onafhankelijk; enkel de weergave wordt vertaald.

export type Taal = 'nl' | 'en' | 'fr'

export const TALEN: { waarde: Taal; label: string }[] = [
  { waarde: 'nl', label: 'Nederlands' },
  { waarde: 'en', label: 'English' },
  { waarde: 'fr', label: 'Français' },
]

// Vertaaltabellen: Nederlandse tekst -> vertaling. Voorlopig grotendeels leeg;
// wordt gaandeweg aangevuld. Wat ontbreekt, valt terug op het Nederlands.
const en: Record<string, string> = {}
const fr: Record<string, string> = {}
const woordenboeken: Record<Taal, Record<string, string>> = { nl: {}, en, fr }

function pasParametersToe(tekst: string, params?: Record<string, string | number>): string {
  if (!params) return tekst
  return tekst.replace(/\{(\w+)\}/g, (_, naam) => (naam in params ? String(params[naam]) : `{${naam}}`))
}

// Zuivere vertaalfunctie, los testbaar.
export function vertaal(taal: Taal, sleutel: string, params?: Record<string, string | number>): string {
  const vertaald = taal === 'nl' ? sleutel : woordenboeken[taal][sleutel] ?? sleutel
  return pasParametersToe(vertaald, params)
}

export type Vertaler = (sleutel: string, params?: Record<string, string | number>) => string

type TaalContextType = { taal: Taal; zetTaal: (t: Taal) => void; t: Vertaler }

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests):
// dan is de taal Nederlands en geeft t() de sleutel ongewijzigd terug.
const standaard: TaalContextType = {
  taal: 'nl',
  zetTaal: () => {},
  t: (sleutel, params) => vertaal('nl', sleutel, params),
}

const TaalContext = createContext<TaalContextType>(standaard)

const OPSLAG_SLEUTEL = 'fk_taal'
function leesTaal(): Taal {
  try {
    const t = localStorage.getItem(OPSLAG_SLEUTEL)
    if (t === 'nl' || t === 'en' || t === 'fr') return t
  } catch {
    // localStorage niet beschikbaar: stil terugvallen op Nederlands.
  }
  return 'nl'
}

export function TaalProvider({ children }: { children: ReactNode }) {
  const [taal, setTaal] = useState<Taal>(leesTaal)
  useEffect(() => {
    try {
      localStorage.setItem(OPSLAG_SLEUTEL, taal)
    } catch {
      // stil negeren
    }
    document.documentElement.lang = taal
  }, [taal])
  const waarde: TaalContextType = { taal, zetTaal: setTaal, t: (sleutel, params) => vertaal(taal, sleutel, params) }
  return <TaalContext.Provider value={waarde}>{children}</TaalContext.Provider>
}

// Hook om te vertalen: const { t } = useT().
export function useT(): TaalContextType {
  return useContext(TaalContext)
}
