import { useMemo, useState } from 'react'
import type { Categorie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { zoekItems, zoekMidCategorieen, zoekHoofdcategorieen, ZOEK_VANAF } from '../data/categorieen/zoek'
import { padVanCategorie } from '../data/categorieen/resolve'
import { useT } from '../i18n'

// Eén categoriekiezer die ALLE DRIE de niveaus aanbiedt, met een zoekveld ervoor.
//
// Gebruikt door het budgetformulier en door het formulier voor vaste lasten en
// inkomsten. Waarom niet `CategorieSelect`: die biedt bewust enkel de veertien
// hoofdcategorieën aan. Dat was lang de enige veilige keuze, omdat
// `groepVanCategorie` de middenlaag niet kende — een vaste last op
// "Elektriciteit" zou dan bij het inboeken uit elke analyse vallen. Sinds ronde 27
// rolt die laag gewoon op naar haar hoofdcategorie, dus mag ze overal gekozen
// worden.
//
// Waarom niet `CategorieKiezer` (de zoeker uit het transactieformulier): die kent
// de middenlaag niet, geeft altijd een item terug en heeft de horizontaal
// schuivende chiprij die in ronde 28 hertekend wordt. Deze kiezer blijft klein en
// doet één ding: een niveau kiezen.

const MAX_SUGGESTIES = 20

type Keuze = { id: string; naam: string; pad: string }

export function CategorieNiveauKiezer({
  id,
  waarde,
  onKies,
  categorieen,
  metGeenKeuze = false,
  labelledBy,
  naamToevoegingId,
}: {
  id: string
  waarde: string
  onKies: (id: string) => void
  categorieen: Categorie[]
  /** Voegt bovenaan een lege keuze toe, voor velden waar geen categorie mag. */
  metGeenKeuze?: boolean
  /**
   * Waar de keuzelijst haar naam vandaan haalt, als `aria-labelledby` op het `<select>`.
   *
   * ⚠ EEN EIGEN PROP IN CAMELCASE, EN GEEN `aria-labelledby` VAN BUITEN (ronde 92).
   * TypeScript controleert JSX-attributen die geen geldige JS-naam zijn — alles met een
   * koppelteken, dus élke `aria-*` — NIET op een eigen component. Schrijf je
   * `<CategorieNiveauKiezer aria-labelledby="…" />`, dan compileert dat schoon, komt het
   * nergens terecht en merkt niemand er iets van. Precies dat is in deze ronde gebeurd, en
   * alleen een test die de naam UITREKENDE ving het.
   */
  labelledBy?: string
  /**
   * Het id van de verduidelijking die achter ELKE naam in deze kiezer hoort — ook achter
   * die van het zoekveld ernaast.
   *
   * ⚠ WAAROM APART VAN `labelledBy` (doorlichting ronde 92). Deze component draagt TWEE
   * bedieningen: de keuzelijst én het zoekveld erboven. `labelledBy` bedient alleen de
   * eerste. Staat deze kiezer twee keer op één scherm — en dat doet ze op Budget → Vast —
   * dan heette dat zoekveld nog altijd twee keer "Zoek een categorie". Acht van de negen
   * paren waren opgelost, het negende niet.
   */
  naamToevoegingId?: string
}) {
  const { t } = useT()
  const [zoek, setZoek] = useState('')
  const term = zoek.trim().toLowerCase()

  // Zonder zoekterm: de veertien hoofdcategorieën plus de eigen categorieën. Dat
  // is de lijst die je in negen van de tien gevallen wil, en ze past op één scherm.
  // Zodra je typt, komen de middenlaag en de items erbij.
  const keuzes: Keuze[] = useMemo(() => {
    const uit: Keuze[] = []
    // Enkel eigen HOOFDcategorieën in de basislijst: een eigen middencategorie
    // komt via de zoekfunctie mee, mét haar ouder ervoor.
    const eigenHoofd = categorieen.filter((c) => !c.ouderId)
    if (term.length < ZOEK_VANAF) {
      for (const h of INGEBOUWDE_CATEGORIEEN) uit.push({ id: h.id, naam: h.naam, pad: h.naam })
      for (const c of eigenHoofd) uit.push({ id: c.id, naam: c.naam, pad: c.naam })
      return uit
    }

    // Ronde 40: dit was een handgeschreven `includes` over de ingebouwde lijst
    // plus nog eens over de eigen categorieën. Dat staat nu als één functie in
    // zoek.ts, zodat deze kiezer en het beheerscherm dezelfde treffers geven.
    // (`CategorieKiezer` houdt bewust een eigen regel: daar staan de ingebouwde
    // hoofdcategorieën al als chips, dus die horen niet in de suggesties.)
    for (const h of zoekHoofdcategorieen(term, MAX_SUGGESTIES)) {
      uit.push({ id: h.id, naam: h.naam, pad: h.naam })
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
      {/* ⚠ Geen kaal `aria-label` meer (doorlichting ronde 92): dan kan er geen
          verduidelijking achter, en heette dit veld op Budget → Vast twee keer hetzelfde.
          De naam komt nu uit een verborgen span, gevolgd door diezelfde toevoeging als bij
          de keuzelijst eronder. */}
      <span id={`${id}-zoek-label`} className="alleen-voorlezen">
        {t('Zoek een categorie')}
      </span>
      <input
        aria-labelledby={naamToevoegingId ? `${id}-zoek-label ${naamToevoegingId}` : `${id}-zoek-label`}
        placeholder={t('Typ om ook subcategorieën te zoeken…')}
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
      />
      {/* Zolang je niet zoekt is dit een gewone keuzelijst met veertien regels.
          Zodra je typt wordt het een openstaand lijstje: de treffers meteen tonen
          scheelt een extra klik, en je ziet ook of er iets gevonden is. */}
      <select
        id={id}
        aria-labelledby={labelledBy}
        value={waarde}
        onChange={(e) => onKies(e.target.value)}
        size={term.length >= ZOEK_VANAF ? Math.min(6, Math.max(2, compleet.length + (metGeenKeuze ? 1 : 0))) : 1}
      >
        {metGeenKeuze && <option value="">{t('Geen categorie')}</option>}
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
          {t('Je kan een budget ook op één subcategorie zetten — typ dan de naam.')}
        </span>
      )}
    </div>
  )
}
