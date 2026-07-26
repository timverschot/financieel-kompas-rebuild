import type { Transactie } from '../data/schema'

// Auto-categorisatie op handelaarsnaam.
//
// Waarom dit bestaat: alles in Kompal wordt met de hand ingevoerd — dat is de
// prijs van lokaal-eerst zonder bankkoppeling. Die prijs kan je niet wegnemen,
// maar je kan de wrijving per invoer wél verlagen. Boekte je "Colruyt" al tien
// keer onder Voeding, dan hoeft de app dat de elfde keer niet opnieuw te vragen.
//
// Bewust een VOORSTEL en geen stille invulling. Een verkeerd geraden categorie die
// je niet ziet, vervuilt je analyses maanden later zonder dat je weet waarom.
// Daarom stelt de app voor en beslis jij met één tik.
//
// Zuiver en los testbaar: geen datum, geen database, geen React.

/** Genormaliseerde omschrijving → categorie-id van de laatste keer. */
export type HandelaarIndex = Map<string, string>

// Hoofdletters, dubbele spaties en spaties rond de naam mogen niet uitmaken:
// "colruyt", "Colruyt" en " COLRUYT " zijn dezelfde winkel.
export function normaliseerHandelaar(omschrijving: string): string {
  return omschrijving.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Bouwt de index uit de bestaande transacties: per handelaar de categorie van de
 * MEEST RECENTE boeking met die naam.
 *
 * Twee soorten transacties blijven erbuiten:
 *  - zonder categorie (er valt niets te onthouden);
 *  - gesplitste kassatickets (die hebben per definitie meerdere categorieën, dus
 *    er is geen enkele juiste keuze — en de moedertransactie van een ticket
 *    aggregeren is een bekende fout in deze app).
 */
export function bouwHandelaarIndex(transacties: Transactie[]): HandelaarIndex {
  // Per handelaar bijhouden welke boeking tot nu toe de recentste was, zodat het
  // resultaat niet afhangt van de volgorde waarin de transacties binnenkomen.
  const laatste = new Map<string, { datum: string; id: string; categorieId: string }>()
  for (const t of transacties) {
    if (!t.categorieId) continue
    if (t.regels && t.regels.length > 0) continue
    const sleutel = normaliseerHandelaar(t.omschrijving)
    if (sleutel === '') continue
    const bestaand = laatste.get(sleutel)
    // Bij exact dezelfde datum beslist de id, zodat de uitkomst deterministisch is.
    const nieuwer = !bestaand || t.datum > bestaand.datum || (t.datum === bestaand.datum && t.id > bestaand.id)
    if (nieuwer) laatste.set(sleutel, { datum: t.datum, id: t.id, categorieId: t.categorieId })
  }

  const index: HandelaarIndex = new Map()
  for (const [sleutel, waarde] of laatste) index.set(sleutel, waarde.categorieId)
  return index
}

/**
 * De categorie die deze handelaar de vorige keer kreeg, of null.
 * Geeft ook null bij een lege of onbekende naam.
 */
export function voorstelCategorie(omschrijving: string, index: HandelaarIndex): string | null {
  const sleutel = normaliseerHandelaar(omschrijving)
  if (sleutel === '') return null
  return index.get(sleutel) ?? null
}
