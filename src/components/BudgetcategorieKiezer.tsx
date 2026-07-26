import { useMemo, useState } from 'react'
import type { Categorie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { zoekItems, zoekMidCategorieen } from '../data/categorieen/zoek'
import { padVanCategorie } from '../data/categorieen/resolve'
import { useT } from '../i18n'

// De categoriekiezer van het BUDGETformulier: alle drie de niveaus, met een
// zoekveld ervoor.
//
// Waarom een eigen component en niet `CategorieSelect`: die biedt bewust enkel
// hoofdcategorieën aan, en dat is voor een transactie ook juist. Een budget mag
// wél op de middenlaag of op één item staan (zie utils/budget.ts), en dan wordt
// de keuzelijst duizend regels lang. Een `<select>` met duizend opties is
// technisch prima maar praktisch onbruikbaar: je scrollt eindeloos.
//
// Waarom niet `CategorieKiezer` (de zoeker uit het transactieformulier): die kent
// de middenlaag niet, geeft altijd een item terug en heeft de chiprij die in
// ronde 27 sowieso hertekend wordt. Deze kiezer blijft daarom klein en doet één
// ding: een niveau kiezen om een budget op te zetten.

const ZOEK_VANAF = 2
const MAX_SUGGESTIES = 20

type Keuze = { id: string; naam: string; pad: string }

export function BudgetcategorieKiezer({
  id,
  waarde,
  onKies,
  categorieen,
}: {
  id: string
  waarde: string
  onKies: (id: string) => void
  categorieen: Categorie[]
}) {
  const { t } = useT()
  const [zoek, setZoek] = useState('')
  const term = zoek.trim().toLowerCase()

  // Zonder zoekterm: de veertien hoofdcategorieën plus de eigen categorieën. Dat
  // is de lijst die je in negen van de tien gevallen wil, en ze past op één scherm.
  // Zodra je typt, komen de middenlaag en de items erbij.
  const keuzes: Keuze[] = useMemo(() => {
    const uit: Keuze[] = []
    if (term.length < ZOEK_VANAF) {
      for (const h of INGEBOUWDE_CATEGORIEEN) uit.push({ id: h.id, naam: h.naam, pad: h.naam })
      for (const c of categorieen) uit.push({ id: c.id, naam: c.naam, pad: c.naam })
      return uit
    }

    for (const h of INGEBOUWDE_CATEGORIEEN) {
      if (h.naam.toLowerCase().includes(term)) uit.push({ id: h.id, naam: h.naam, pad: h.naam })
    }
    for (const c of categorieen) {
      if (c.naam.toLowerCase().includes(term)) uit.push({ id: c.id, naam: c.naam, pad: c.naam })
    }
    for (const m of zoekMidCategorieen(term, MAX_SUGGESTIES)) {
      uit.push({ id: m.id, naam: m.naam, pad: `${m.hoofdNaam} › ${m.naam}` })
    }
    for (const i of zoekItems(term, MAX_SUGGESTIES)) {
      uit.push({ id: i.id, naam: i.naam, pad: `${i.hoofdNaam} › ${i.naam}` })
    }
    return uit.slice(0, MAX_SUGGESTIES)
  }, [term, categorieen])

  // Staat de gekozen categorie niet in de huidige lijst (omdat je iets anders
  // typte), dan hoort ze er tóch bij: anders springt de keuzelijst naar de eerste
  // regel en verander je stil van categorie.
  const gekozenPad = padVanCategorie(waarde, categorieen)
  const compleet =
    waarde && !keuzes.some((k) => k.id === waarde) && gekozenPad
      ? [{ id: waarde, naam: gekozenPad, pad: gekozenPad }, ...keuzes]
      : keuzes

  return (
    <div className="stapel" style={{ gap: 6 }}>
      <input
        aria-label={t('Zoek een categorie')}
        placeholder={t('Typ om ook subcategorieën en producten te zoeken…')}
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
      />
      {/* Zolang je niet zoekt is dit een gewone keuzelijst met veertien regels.
          Zodra je typt wordt het een openstaand lijstje: de treffers meteen tonen
          scheelt een extra klik, en je ziet ook of er iets gevonden is. */}
      <select
        id={id}
        value={waarde}
        onChange={(e) => onKies(e.target.value)}
        size={term.length >= ZOEK_VANAF ? Math.min(6, Math.max(2, compleet.length)) : 1}
      >
        {compleet.map((k) => (
          <option key={k.id} value={k.id}>
            {k.pad}
          </option>
        ))}
      </select>
      {term.length >= ZOEK_VANAF && keuzes.length === 0 && (
        <span className="rij-meta">{t('Niets gevonden voor deze zoekterm.')}</span>
      )}
      {term.length < ZOEK_VANAF && (
        <span className="rij-meta">
          {t('Je kan een budget ook op een subcategorie of op één product zetten — typ dan de naam.')}
        </span>
      )}
    </div>
  )
}
