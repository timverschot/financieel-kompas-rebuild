import type {
  Budget,
  Categorie,
  Dossier,
  GedeeldeKost,
  Rekening,
  TerugkerendePost,
  Transactie,
  Verrekening,
} from '../schema'
import type { Logregel } from './events'

export type Staat = {
  rekeningen: Map<string, Rekening>
  transacties: Map<string, Transactie>
  categorieen: Map<string, Categorie>
  budgetten: Map<string, Budget>
  dossiers: Map<string, Dossier>
  gedeeldeKosten: Map<string, GedeeldeKost>
  verrekeningen: Map<string, Verrekening>
  terugkerendePosten: Map<string, TerugkerendePost>
}

// Bepaalt de volgorde van twee logregels: eerst op tijd, dan op toestel, dan op
// volgnummer.
function vergelijk(a: Logregel, b: Logregel): number {
  if (a.tijdstip !== b.tijdstip) return a.tijdstip - b.tijdstip
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
    }
  }
  return staat
}
