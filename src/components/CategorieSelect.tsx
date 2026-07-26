import type { Categorie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { useT } from '../i18n'

// Dé keuzelijst voor "welke categorie?" in een gewoon formulier.
//
// Waarom dit bestaat: dezelfde keuze werd op verschillende plaatsen anders gevuld.
// `BudgetFormulier` bood de ingebouwde hoofdcategorieën én de eigen categorieën aan;
// `TerugkerendePostFormulier` bood **alleen** de eigen categorieën aan en importeerde
// `INGEBOUWDE_CATEGORIEEN` niet eens. Wie geen eigen categorie gemaakt had, kon een
// vaste last dus aan niets hangen — en die valt dan uit de budgetopvolging, uit de
// besparingsdomeinen en uit elke analyse, ook nadat je ze ingeboekt hebt.
//
// De middenlaag (`cat-*`) staat er bewust NIET in: `groepVanCategorie` kent die laag
// niet, dus zo'n tag zou uit alle analyses vallen. Zie de projectinstructies.
//
// De namen van de ingebouwde categorieën gaan door `t()`. Dat was ook een
// inconsistentie: sommige formulieren vertaalden ze, andere niet, waardoor dezelfde
// hoofdcategorie in het Engels of Frans twee namen had.
export function CategorieSelect({
  id,
  waarde,
  onKies,
  categorieen,
  /** Voegt bovenaan een lege keuze toe, voor velden waar geen categorie mag. */
  metGeenKeuze = false,
  /** Voor plekken zonder zichtbaar label, zoals de bulkbalk in de lijst. */
  ariaLabel,
}: {
  id: string
  waarde: string
  onKies: (id: string) => void
  categorieen: Categorie[]
  metGeenKeuze?: boolean
  ariaLabel?: string
}) {
  const { t } = useT()
  return (
    <select id={id} aria-label={ariaLabel} value={waarde} onChange={(e) => onKies(e.target.value)}>
      {metGeenKeuze && <option value="">{t('Geen categorie')}</option>}
      <optgroup label={t('Hoofdcategorieën')}>
        {INGEBOUWDE_CATEGORIEEN.map((h) => (
          <option key={h.id} value={h.id}>
            {h.icoon} {t(h.naam)}
          </option>
        ))}
      </optgroup>
      {categorieen.length > 0 && (
        <optgroup label={t('Eigen categorieën')}>
          {categorieen.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icoon ? `${c.icoon} ` : ''}
              {c.naam}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

/** De categorie waarop een leeg formulier standaard staat. */
export const STANDAARD_CATEGORIE_ID = INGEBOUWDE_CATEGORIEEN[0]?.id ?? ''
