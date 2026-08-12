import type { GedeeldeKost, Verrekening } from '../data/schema'

// Een kost is 'open' (nog te verrekenen) zolang ze niet afgerekend is. De oude
// 'verrekeningId'-koppeling telt als afgerekend, voor terugwaartse compatibiliteit
// met dossiers van vóór het niet-blokkerende afrekenmodel.
//
// Een INGETROKKEN kost telt evenmin mee: de andere ouder heeft ze uit haar eigen
// dossier gehaald en dat bij een uitwisseling gemeld (ronde 44). Ze blijft wel
// staan — doorgestreept — want stil geld uit een saldo laten vallen is erger dan
// het zichtbaar te maken.
export function isOpenKost(k: GedeeldeKost): boolean {
  return !k.afgerekend && !k.verrekeningId && !k.ingetrokken
}

export type AfrekeningFilter = {
  periodeVan?: string
  periodeTot?: string
  kindIds?: string[]
  // Wat er moet gebeuren met kosten die aan GEEN enkel kind hangen (bv. een
  // gezamenlijke schoolrekening) zodra je op kinderen filtert. Standaard (en bij
  // 'undefined') tellen ze MEE: dat is de veilige kant, want anders zou er stil
  // geld uit een afrekening verdwijnen. Zet expliciet op false om ze weg te laten.
  zonderKindMeetellen?: boolean
}

// De id's van alle kosten die al vastzitten in een afrekening die nog niet als
// 'overgemaakt' gemarkeerd is. Die kosten mogen niet in een tweede afrekening
// belanden: anders wordt hetzelfde geld twee keer geteld zodra je beide
// afrekeningen overmaakt. Afrekeningen die WEL overgemaakt zijn, tellen hier niet
// mee — hun kosten zijn dan al 'afgerekend' en vallen sowieso weg.
export function kostIdsInOpenAfrekening(verrekeningen: Verrekening[], dossierId: string): Set<string> {
  const ids = new Set<string>()
  for (const v of verrekeningen ?? []) {
    if (v.dossierId !== dossierId) continue
    if (v.overgemaakt) continue
    for (const id of v.kostIds ?? []) ids.add(id)
  }
  return ids
}

// Selecteert de open kosten van één dossier die binnen de gekozen periode vallen
// en (indien opgegeven) bij minstens één van de gekozen kinderen horen. Kosten die
// al in een bestaande, nog niet overgemaakte afrekening zitten, vallen weg: ze
// mogen maar in één afrekening tegelijk staan.
export function kostenVoorAfrekening(
  kosten: GedeeldeKost[],
  dossierId: string,
  filter: AfrekeningFilter,
  verrekeningen: Verrekening[],
): GedeeldeKost[] {
  const alGedekt = kostIdsInOpenAfrekening(verrekeningen ?? [], dossierId)
  return kosten.filter((k) => {
    if (k.dossierId !== dossierId) return false
    if (!isOpenKost(k)) return false
    if (alGedekt.has(k.id)) return false
    if (filter.periodeVan && k.datum < filter.periodeVan) return false
    if (filter.periodeTot && k.datum > filter.periodeTot) return false
    if (filter.kindIds && filter.kindIds.length > 0) {
      const eigenKinderen = k.kindIds ?? []
      if (eigenKinderen.length === 0) {
        // Kost zonder kind: enkel weglaten als de gebruiker daar expliciet voor koos.
        if (filter.zonderKindMeetellen === false) return false
      } else if (!eigenKinderen.some((id) => filter.kindIds!.includes(id))) {
        return false
      }
    }
    return true
  })
}
