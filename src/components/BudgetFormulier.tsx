import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Budget, Categorie } from '../data/schema'
import { invoerNaarCenten } from '../utils/format'
import { CategorieSelect, STANDAARD_CATEGORIE_ID } from './CategorieSelect'
import { useT } from '../i18n'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen.
const BEGIN = { categorieId: STANDAARD_CATEGORIE_ID, bedrag: '' }

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
  const [categorieId, setCategorieId] = useState(BEGIN.categorieId)
  const [bedrag, setBedrag] = useState(BEGIN.bedrag)

  // Zet alle velden terug op hun beginwaarde.
  function leegmaken() {
    setCategorieId(BEGIN.categorieId)
    setBedrag(BEGIN.bedrag)
  }

  const bedragCenten = invoerNaarCenten(bedrag)
  const geldig = categorieId.length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({ id: `budget-${categorieId}`, categorieId, bedrag: bedragCenten })
    // Pas ná een geslaagde opslag leegmaken: zo staat het formulier klaar voor een
    // volgend budget en stel je niet per ongeluk twee keer hetzelfde in.
    leegmaken()
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="budgetcategorie">
            {t('Budgetcategorie')}
          </label>
          <CategorieSelect id="budgetcategorie" waarde={categorieId} onKies={setCategorieId} categorieen={categorieen} />
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
      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt. */}
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {t('Kies een categorie en geef een bedrag.')}
        </p>
      )}
    </form>
  )
}
