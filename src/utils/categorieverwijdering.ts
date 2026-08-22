import type {
  Budget,
  Categorie,
  Dossier,
  GedeeldeKost,
  Kindrekeningpost,
  Subcategorie,
  TerugkerendePost,
  Transactie,
} from '../data/schema'
import type { Vertaler } from '../i18n'

// Wat gaat er precies weg met deze eigen categorie? (ronde 65)
//
// ⚠ WAAROM DEZE FUNCTIE BESTAAT. Het kruisje naast een eigen categorie wiste ook
// álle middencategorieën eronder én álle items daarin — zonder vraag, en met
// alleen "Categorie verwijderd" op de ongedaan-balk. Wie een categorie met drie
// niveaus en veertig items had opgebouwd, kreeg dezelfde vier woorden te zien als
// wie een lege categorie wegdeed.
//
// Boekingen en budgetten die naar de weggehaalde categorie wijzen blijven staan.
// Ze verdwijnen niet, maar ze verliezen hun naam — en dat is precies iets wat je
// vóóraf wil weten, niet achteraf ontdekken in een grafiek.

/** De categorie zelf, haar middencategorieën, en de items daaronder. */
export function watGaatMee(
  id: string,
  categorieen: Categorie[],
  subcategorieen: Subcategorie[],
): { midden: Categorie[]; items: Subcategorie[]; ids: Set<string> } {
  const midden = (categorieen ?? []).filter((c) => c.ouderId === id)
  const ids = new Set([id, ...midden.map((c) => c.id)])
  const items = (subcategorieen ?? []).filter((sub) => ids.has(sub.categorieId))
  for (const it of items) ids.add(it.id)
  return { midden, items, ids }
}

/**
 * Wat verwijst er allemaal naar deze categorie?
 *
 * ⚠ Dit was eerst alleen boekingen en budgetten, en dan zei het venster "Er hangt
 * niets aan deze categorie" terwijl er twaalf vaste lasten en dertig gedeelde
 * kosten aan hingen. Vijf soorten records dragen een `categorieId`, en één ervan
 * — de verdeelsleutel per categorie in een dossier — verandert bij verwijderen
 * stil het bedrag van je afrekening.
 */
export type Verwijzingen = {
  boekingen: number
  budgetten: number
  vasteLasten: number
  gedeeldeKosten: number
  kindrekeningposten: number
  /** Dossiers met een eigen verdeelsleutel op een van deze categorieën. */
  verdeelsleutels: number
}

export type CategorieGegevens = {
  transacties?: Transactie[]
  budgetten?: Budget[]
  terugkerendePosten?: TerugkerendePost[]
  gedeeldeKosten?: GedeeldeKost[]
  kindrekeningposten?: Kindrekeningpost[]
  dossiers?: Dossier[]
}

export function telVerwijzingen(ids: Set<string>, g: CategorieGegevens): Verwijzingen {
  const raakt = (t: Transactie) =>
    (t.categorieId !== undefined && ids.has(t.categorieId)) ||
    (t.regels ?? []).some((r) => r.categorieId !== undefined && ids.has(r.categorieId))
  const heeft = (id?: string) => id !== undefined && ids.has(id)
  return {
    boekingen: (g.transacties ?? []).filter(raakt).length,
    budgetten: (g.budgetten ?? []).filter((b) => ids.has(b.categorieId)).length,
    vasteLasten: (g.terugkerendePosten ?? []).filter((p) => heeft(p.categorieId)).length,
    gedeeldeKosten: (g.gedeeldeKosten ?? []).filter((k) => heeft(k.categorieId)).length,
    kindrekeningposten: (g.kindrekeningposten ?? []).filter((p) => heeft(p.categorieId)).length,
    verdeelsleutels: (g.dossiers ?? []).filter((d) =>
      Object.keys(d.categorieAandelen ?? {}).some((id) => ids.has(id)),
    ).length,
  }
}

/** De regels voor het vraagvenster. Alleen wat er ECHT is. */
export function telCategorieVerwijderen(
  t: Vertaler,
  id: string,
  gegevens: CategorieGegevens & { categorieen: Categorie[]; subcategorieen: Subcategorie[] },
): string[] {
  const { midden, items, ids } = watGaatMee(id, gegevens.categorieen, gegevens.subcategorieen)
  const tel = telVerwijzingen(ids, gegevens)
  const paren: [number, string][] = [
    [midden.length, '{n} categorie(ën) eronder'],
    [items.length, '{n} subcategorie(ën) daarin'],
    [tel.boekingen, '{n} boeking(en) blijven bestaan, maar staan daarna zonder categorienaam.'],
    [tel.vasteLasten, '{n} vaste last(en) verliezen hun categorie.'],
    [tel.budgetten, '{n} budget(ten) hierop verliezen hun categorie.'],
    [tel.gedeeldeKosten, '{n} gedeelde kost(en) in een dossier verliezen hun categorie.'],
    [tel.kindrekeningposten, '{n} post(en) op een kindrekening verliezen hun categorie.'],
    // ⚠ Deze laatste is de enige die GELD verandert: een dossier dat voor deze
    // categorie een eigen verdeelsleutel had (bv. "Onderwijs 70/30"), valt daarna
    // terug op de dossierstandaard. Het bedrag van je volgende afrekening
    // verschuift dan, zonder dat er ergens een foutmelding komt.
    [tel.verdeelsleutels, '{n} dossier(s) hebben hiervoor een eigen verdeelsleutel — die valt terug op de dossierstandaard, en dan verandert je afrekeningsbedrag.'],
  ]
  const regels = paren.filter(([n]) => n > 0).map(([n, sleutel]) => t(sleutel, { n }))
  return regels.length > 0 ? regels : [t('Er hangt niets aan deze categorie.')]
}

/** De korte zin op de ongedaan-balk: zegt hoeveel er meeging. */
export function categorieUndoTekst(
  t: Vertaler,
  naam: string,
  midden: number,
  items: number,
): string {
  if (midden === 0 && items === 0) return t('{naam} verwijderd', { naam })
  if (midden === 0) return t('{naam} verwijderd, met {items} subcategorie(ën)', { naam, items })
  return t('{naam} verwijderd, met {midden} categorie(ën) en {items} subcategorie(ën)', { naam, midden, items })
}
