import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Budget, Categorie } from '../data/schema'
import { invoerNaarCenten } from '../utils/format'
import { STANDAARD_CATEGORIE_ID } from './CategorieSelect'
import { CategorieNiveauKiezer } from './CategorieNiveauKiezer'
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
  // De id van de regel die zegt wat er nog ontbreekt. De knop wijst ernaar met
  // `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const redenId = useId()
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
      {/* De categoriekiezer op een eigen regel: met een zoekveld én een lijst
          erin is een halve kolom te smal om iets als "Huishouden en Verzorging ›
          Persoonlijke verzorging" te lezen. */}
      <div className="veldgroep">
          <label className="label-caps" htmlFor="budgetcategorie">
            {t('Budgetcategorie')}
          </label>
          {/* Sinds ronde 25 mag een budget ook op een subcategorie of op één
              product staan (zie utils/budget.ts), en dan is een gewone keuzelijst
              met duizend regels onbruikbaar. */}
          <CategorieNiveauKiezer id="budgetcategorie" waarde={categorieId} onKies={setCategorieId} categorieen={categorieen} />
      </div>

      <div className="veldrij">
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
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className="knop knop-primair"
        >
          {t('Budget instellen')}
        </button>
      </div>
      {/* ⚠ Deze regel staat er ALTIJD, ook leeg (ronde 61). Twee redenen. Een
          `role="status"` die pas MÉT zijn tekst in het document verschijnt, wordt door
          sommige schermlezers overgeslagen — die regel past de app elders al toe. En de
          knop hiernaast wijst met `aria-describedby` naar deze tekst, dus wie erop landt,
          hóórt meteen wat er nog ontbreekt in plaats van alleen "niet-beschikbaar". */}
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig ? '' : t('Kies een categorie en geef een bedrag.')}
      </p>
    </form>
  )
}
