import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Budget, Categorie } from '../data/schema'
import { invoerNaarCenten } from '../utils/format'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Formulier om een maandbudget voor een categorie in te stellen. De id is
// afgeleid van de categorie, zodat opnieuw instellen hetzelfde budget bijwerkt.
export function BudgetFormulier({
  categorieen,
  onOpslaan,
}: {
  categorieen: Categorie[]
  onOpslaan: (b: Budget) => Promise<void> | void
}) {
  const [categorieId, setCategorieId] = useState(categorieen[0]?.id ?? '')
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
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="budgetcategorie">Budgetcategorie</label>
        <select
          id="budgetcategorie"
          style={veld}
          value={categorieId}
          onChange={(e) => setCategorieId(e.target.value)}
        >
          {categorieen.map((c) => (
            <option key={c.id} value={c.id}>
              {c.naam}
            </option>
          ))}
        </select>
      </div>
      <div style={rij}>
        <label htmlFor="maandbudget">Maandbudget (€)</label>
        <input
          id="maandbudget"
          style={veld}
          inputMode="decimal"
          placeholder="0,00"
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef2f7' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        Budget instellen
      </button>
    </form>
  )
}
