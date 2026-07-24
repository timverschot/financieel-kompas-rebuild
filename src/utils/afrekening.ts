import type { GedeeldeKost } from '../data/schema'

// Een kost is 'open' (nog te verrekenen) zolang ze niet afgerekend is. De oude
// 'verrekeningId'-koppeling telt als afgerekend, voor terugwaartse compatibiliteit
// met dossiers van vóór het niet-blokkerende afrekenmodel.
export function isOpenKost(k: GedeeldeKost): boolean {
  return !k.afgerekend && !k.verrekeningId
}

export type AfrekeningFilter = { periodeVan?: string; periodeTot?: string; kindIds?: string[] }

// Selecteert de open kosten van één dossier die binnen de gekozen periode vallen
// en (indien opgegeven) bij minstens één van de gekozen kinderen horen. Zo kan je
// een afrekening maken over exact de periode en de kinderen die je wil.
export function kostenVoorAfrekening(
  kosten: GedeeldeKost[],
  dossierId: string,
  filter: AfrekeningFilter,
): GedeeldeKost[] {
  return kosten.filter((k) => {
    if (k.dossierId !== dossierId) return false
    if (!isOpenKost(k)) return false
    if (filter.periodeVan && k.datum < filter.periodeVan) return false
    if (filter.periodeTot && k.datum > filter.periodeTot) return false
    if (filter.kindIds && filter.kindIds.length > 0) {
      const hoortErbij = (k.kindIds ?? []).some((id) => filter.kindIds!.includes(id))
      if (!hoortErbij) return false
    }
    return true
  })
}
