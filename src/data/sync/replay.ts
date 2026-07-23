import type {
  Budget,
  Categorie,
  Dossier,
  GedeeldeKost,
  Rekening,
  Spaardoel,
  Subcategorie,
  TerugkerendePost,
  Transactie,
  Verrekening,
} from '../schema'
import type { Logregel } from './events'
import { vergelijkStempel, type Stempel } from './hlc'

export type Staat = {
  rekeningen: Map<string, Rekening>
  transacties: Map<string, Transactie>
  categorieen: Map<string, Categorie>
  budgetten: Map<string, Budget>
  dossiers: Map<string, Dossier>
  gedeeldeKosten: Map<string, GedeeldeKost>
  verrekeningen: Map<string, Verrekening>
  terugkerendePosten: Map<string, TerugkerendePost>
  spaardoelen: Map<string, Spaardoel>
  subcategorieen: Map<string, Subcategorie>
}

// Het HLC-stempel van een logregel, met terugval op 'tijdstip' voor oude regels
// die nog geen stempel hebben.
function stempelVan(r: Logregel): Stempel {
  return { l: r.hlcL ?? r.tijdstip, c: r.hlcC ?? 0 }
}

// Bepaalt de volgorde van twee logregels: eerst op het hybride-logische-klok-
// stempel (causaliteit wint, ongeacht klokverschil), dan op toestel, dan op
// volgnummer, zodat de volgorde volledig deterministisch is.
function vergelijk(a: Logregel, b: Logregel): number {
  const s = vergelijkStempel(stempelVan(a), stempelVan(b))
  if (s !== 0) return s
  if (a.toestelId !== b.toestelId) return a.toestelId < b.toestelId ? -1 : 1
  return a.volgnummer - b.volgnummer
}

// Zuivere functie: gegeven alle logregels, bereken de uiteindelijke staat. De
// laatste wijziging wint (last-writer-wins).
export function pasToe(regels: Logregel[]): Staat {
  const gesorteerd = [...regels].sort(vergelijk)
  const staat: Staat = {
    rekeningen: new Map(),
    transacties: new Map(),
    categorieen: new Map(),
    budgetten: new Map(),
    dossiers: new Map(),
    gedeeldeKosten: new Map(),
    verrekeningen: new Map(),
    terugkerendePosten: new Map(),
    spaardoelen: new Map(),
    subcategorieen: new Map(),
  }
  for (const r of gesorteerd) {
    const g = r.gebeurtenis
    switch (g.type) {
      case 'transactie.bewaard':
        staat.transacties.set(g.payload.id, g.payload)
        break
      case 'transactie.verwijderd':
        staat.transacties.delete(g.payload.id)
        break
      case 'rekening.bewaard':
        staat.rekeningen.set(g.payload.id, g.payload)
        break
      case 'rekening.verwijderd':
        staat.rekeningen.delete(g.payload.id)
        break
      case 'categorie.bewaard':
        staat.categorieen.set(g.payload.id, g.payload)
        break
      case 'categorie.verwijderd':
        staat.categorieen.delete(g.payload.id)
        break
      case 'budget.bewaard':
        staat.budgetten.set(g.payload.id, g.payload)
        break
      case 'budget.verwijderd':
        staat.budgetten.delete(g.payload.id)
        break
      case 'dossier.bewaard':
        staat.dossiers.set(g.payload.id, g.payload)
        break
      case 'dossier.verwijderd':
        staat.dossiers.delete(g.payload.id)
        break
      case 'gedeeldekost.bewaard':
        staat.gedeeldeKosten.set(g.payload.id, g.payload)
        break
      case 'gedeeldekost.verwijderd':
        staat.gedeeldeKosten.delete(g.payload.id)
        break
      case 'verrekening.bewaard':
        staat.verrekeningen.set(g.payload.id, g.payload)
        break
      case 'verrekening.verwijderd':
        staat.verrekeningen.delete(g.payload.id)
        break
      case 'terugkerendepost.bewaard':
        staat.terugkerendePosten.set(g.payload.id, g.payload)
        break
      case 'terugkerendepost.verwijderd':
        staat.terugkerendePosten.delete(g.payload.id)
        break
      case 'spaardoel.bewaard':
        staat.spaardoelen.set(g.payload.id, g.payload)
        break
      case 'spaardoel.verwijderd':
        staat.spaardoelen.delete(g.payload.id)
        break
      case 'subcategorie.bewaard':
        staat.subcategorieen.set(g.payload.id, g.payload)
        break
      case 'subcategorie.verwijderd':
        staat.subcategorieen.delete(g.payload.id)
        break
    }
  }
  return staat
}
