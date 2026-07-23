import type { ZodType } from 'zod'
import { db } from './db'
import {
  BudgetSchema,
  CategorieSchema,
  DossierSchema,
  GedeeldeKostSchema,
  KindSchema,
  OverboekingSchema,
  RekeningSchema,
  SpaardoelSchema,
  SubcategorieSchema,
  TerugkerendePostSchema,
  TransactieSchema,
  VerrekeningSchema,
  type Budget,
  type Categorie,
  type Dossier,
  type GedeeldeKost,
  type Kind,
  type Overboeking,
  type Rekening,
  type Spaardoel,
  type Subcategorie,
  type TerugkerendePost,
  type Transactie,
  type Verrekening,
} from './schema'
import { pasGebeurtenisToe } from './sync/lokaal'

// De repository is de enige weg naar de database. Alle schrijfacties worden
// eerst gevalideerd en lopen daarna via het append-only logboek.

// --- Schrijven ---
export async function bewaarTransactie(tx: Transactie): Promise<void> {
  const geldig = TransactieSchema.parse(tx)
  await pasGebeurtenisToe({ type: 'transactie.bewaard', payload: geldig })
}

export async function bewaarRekening(rekening: Rekening): Promise<void> {
  const geldig = RekeningSchema.parse(rekening)
  await pasGebeurtenisToe({ type: 'rekening.bewaard', payload: geldig })
}

export async function bewaarCategorie(categorie: Categorie): Promise<void> {
  const geldig = CategorieSchema.parse(categorie)
  await pasGebeurtenisToe({ type: 'categorie.bewaard', payload: geldig })
}

export async function bewaarBudget(budget: Budget): Promise<void> {
  const geldig = BudgetSchema.parse(budget)
  await pasGebeurtenisToe({ type: 'budget.bewaard', payload: geldig })
}

export async function bewaarDossier(dossier: Dossier): Promise<void> {
  const geldig = DossierSchema.parse(dossier)
  await pasGebeurtenisToe({ type: 'dossier.bewaard', payload: geldig })
}

export async function bewaarGedeeldeKost(kost: GedeeldeKost): Promise<void> {
  const geldig = GedeeldeKostSchema.parse(kost)
  await pasGebeurtenisToe({ type: 'gedeeldekost.bewaard', payload: geldig })
}

export async function bewaarVerrekening(verrekening: Verrekening): Promise<void> {
  const geldig = VerrekeningSchema.parse(verrekening)
  await pasGebeurtenisToe({ type: 'verrekening.bewaard', payload: geldig })
}

export async function bewaarTerugkerendePost(post: TerugkerendePost): Promise<void> {
  const geldig = TerugkerendePostSchema.parse(post)
  await pasGebeurtenisToe({ type: 'terugkerendepost.bewaard', payload: geldig })
}

export async function verwijderTerugkerendePost(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'terugkerendepost.verwijderd', payload: { id } })
}

export async function bewaarSpaardoel(doel: Spaardoel): Promise<void> {
  const geldig = SpaardoelSchema.parse(doel)
  await pasGebeurtenisToe({ type: 'spaardoel.bewaard', payload: geldig })
}

export async function verwijderSpaardoel(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'spaardoel.verwijderd', payload: { id } })
}

export async function bewaarSubcategorie(sub: Subcategorie): Promise<void> {
  const geldig = SubcategorieSchema.parse(sub)
  await pasGebeurtenisToe({ type: 'subcategorie.bewaard', payload: geldig })
}

export async function verwijderSubcategorie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'subcategorie.verwijderd', payload: { id } })
}

export async function bewaarOverboeking(o: Overboeking): Promise<void> {
  const geldig = OverboekingSchema.parse(o)
  await pasGebeurtenisToe({ type: 'overboeking.bewaard', payload: geldig })
}

export async function verwijderOverboeking(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'overboeking.verwijderd', payload: { id } })
}

export async function bewaarKind(k: Kind): Promise<void> {
  const geldig = KindSchema.parse(k)
  await pasGebeurtenisToe({ type: 'kind.bewaard', payload: geldig })
}

export async function verwijderKind(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'kind.verwijderd', payload: { id } })
}

export async function verwijderTransactie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'transactie.verwijderd', payload: { id } })
}

export async function verwijderRekening(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'rekening.verwijderd', payload: { id } })
}

export async function verwijderCategorie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'categorie.verwijderd', payload: { id } })
}

export async function verwijderBudget(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'budget.verwijderd', payload: { id } })
}

export async function verwijderGedeeldeKost(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'gedeeldekost.verwijderd', payload: { id } })
}

export async function verwijderDossier(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'dossier.verwijderd', payload: { id } })
}

// --- Lezen ---
// Bij het laden controleren we elk record opnieuw. Een corrupt of onverwacht
// record wordt overgeslagen én geteld, in plaats van de app te laten crashen of
// stil foute cijfers te tonen.
export type LeesResultaat<T> = {
  geldig: T[]
  ongeldig: number
}

function valideerLijst<T>(ruw: unknown[], schema: ZodType<T>): LeesResultaat<T> {
  const geldig: T[] = []
  let ongeldig = 0
  for (const item of ruw) {
    const resultaat = schema.safeParse(item)
    if (resultaat.success) {
      geldig.push(resultaat.data)
    } else {
      ongeldig++
      console.error('Ongeldig record overgeslagen bij het laden:', item, resultaat.error.issues)
    }
  }
  return { geldig, ongeldig }
}

export async function laadTransacties(): Promise<LeesResultaat<Transactie>> {
  return valideerLijst(await db.transacties.toArray(), TransactieSchema)
}

export async function laadRekeningen(): Promise<LeesResultaat<Rekening>> {
  return valideerLijst(await db.rekeningen.toArray(), RekeningSchema)
}

export async function laadCategorieen(): Promise<LeesResultaat<Categorie>> {
  return valideerLijst(await db.categorieen.toArray(), CategorieSchema)
}

export async function laadBudgetten(): Promise<LeesResultaat<Budget>> {
  return valideerLijst(await db.budgetten.toArray(), BudgetSchema)
}

export async function laadDossiers(): Promise<LeesResultaat<Dossier>> {
  return valideerLijst(await db.dossiers.toArray(), DossierSchema)
}

export async function laadGedeeldeKosten(): Promise<LeesResultaat<GedeeldeKost>> {
  return valideerLijst(await db.gedeeldeKosten.toArray(), GedeeldeKostSchema)
}

export async function laadVerrekeningen(): Promise<LeesResultaat<Verrekening>> {
  return valideerLijst(await db.verrekeningen.toArray(), VerrekeningSchema)
}

export async function laadTerugkerendePosten(): Promise<LeesResultaat<TerugkerendePost>> {
  return valideerLijst(await db.terugkerendePosten.toArray(), TerugkerendePostSchema)
}

export async function laadSpaardoelen(): Promise<LeesResultaat<Spaardoel>> {
  return valideerLijst(await db.spaardoelen.toArray(), SpaardoelSchema)
}

export async function laadSubcategorieen(): Promise<LeesResultaat<Subcategorie>> {
  return valideerLijst(await db.subcategorieen.toArray(), SubcategorieSchema)
}

export async function laadOverboekingen(): Promise<LeesResultaat<Overboeking>> {
  return valideerLijst(await db.overboekingen.toArray(), OverboekingSchema)
}

export async function laadKinderen(): Promise<LeesResultaat<Kind>> {
  return valideerLijst(await db.kinderen.toArray(), KindSchema)
}
