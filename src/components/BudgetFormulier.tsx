import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Budget, Categorie } from '../data/schema'
import { invoerNaarCenten } from '../utils/format'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { useT } from '../i18n'

// Formulier om een maandbudget voor een categorie in te stellen. De id is
// afgeleid van de categorie, zodat opnieuw instellen hetzelfde budget bijwerkt.
// Staat al binnen een Kaart (budgetpagina), dus zonder eigen kaartomlijsting.
export function BudgetFormulier({
  categorieen,
  onOpslaan,
}: {
  categorieen: Categorie[]
  onOpslaan: (b: Budget) => Promise<void> | void
}) {
  const { t } = useT()
  const [categorieId, setCategorieId] = useState(INGEBOUWDE_CATEGORIEEN[0]?.id ?? '')
  const [bedrag, setBedrag] = useState('')

  const bedragCenten = invoerNaarCenten(bedrag)
  const geldig = categorieId.length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({ id: `budget-${categorieId}`, categorieId, bedrag: bedragCenten })
    setBedrag('')
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="budgetcategorie">
            {t('Budgetcategorie')}
          </label>
          <select id="budgetcategorie" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <optgroup label={t('Hoofdcategorieën')}>
              {INGEBOUWDE_CATEGORIEEN.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.naam}
                </option>
              ))}
            </optgroup>
            {categorieen.length > 0 && (
              <optgroup label={t('Eigen categorieën')}>
                {categorieen.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.naam}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="maandbudget">
            {t('Maandbudget (€)')}
          </label>
          <input
            id="maandbudget"
            inputMode="decimal"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
          />
        </div>
      </div>

      <div className="knoprij">
        <button type="submit" disabled={!geldig} className="knop knop-primair">
          {t('Budget instellen')}
        </button>
      </div>
    </form>
  )
}
