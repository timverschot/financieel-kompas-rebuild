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
// Waarom niet `CategorieKiezer` (de zoeker uit het transactieformulier): die is
// groter — een zoekveld, een chiprij met álle hoofdcategorieën (de ingebouwde plus je
// eigen) en twee lagen eronder — en dat is meer scherm dan een budgetregel nodig heeft.
// ⚠ Bewust geen aantal: dat groeit mee met wat de gebruiker zelf aanmaakt. Deze kiezer blijft
// klein en doet één ding: een niveau kiezen.
//
// ⚠ HIER STOND EEN REDEN DIE NIET MEER KLOPTE, en ze had bijna ronde 98 tegengehouden:
// *"die kent de middenlaag niet, geeft altijd een item terug"*. Dat was ooit waar, maar
// `CategorieTrap` geeft sinds ronde 28 wel degelijk een MIDDENcategorie terug — en een
// tik op de actieve chip rolt zelfs terug naar de hoofdcategorie. Twee tests in
// `CategorieKiezer.test.tsx` leggen dat vast ("kiest een categorie met één tik" →
// `cat-broodwaren`; "gaat een laag terug …" → `ov-voeding`).
//
// ⚠ Waarom dat ertoe deed: kon je hier geen middenlaag meer kiezen, dan stond een vaste
// last niet meer op "Elektriciteit" en viel ze bij het inboeken uit elke analyse. Precies
// de fout die deze opmerking wilde voorkomen — maar de opmerking bewaakte niets, ze
// beweerde alleen iets. Sinds ronde 98 gebruikt het vaste-lastenformulier `CategorieKiezer`;
// deze kiezer blijft voor het budgetformulier.

const MAX_SUGGESTIES = 20

type Keuze = { id: string; naam: string; pad: string }

// ⚠ RONDE 98 — DRIE PROPS ZIJN HIER WEGGEVALLEN, EN DAT IS EEN GEVOLG, GEEN KEUZE.
//
// `labelledBy`, `naamToevoegingId` en `metGeenKeuze` bestonden alle drie voor één
// oproeper: het vaste-lastenformulier. Dat gebruikt sinds ronde 98 `CategorieKiezer`,
// en daarmee had geen enkele oproeper ze nog. `BudgetFormulier` — de enige die
// overblijft — hangt zijn naam met een gewone `<label htmlFor>` aan de keuzelijst.
//
// Weggehaald in plaats van laten staan: de huisregel sinds ronde 77 is dat wat nergens
// gebruikt wordt, weggaat. Een ongebruikte prop is een uitnodiging om ernaar te grijpen
// zonder na te gaan of ze nog doet wat haar naam belooft. De reden waaróm ze bestonden
// (twee formulieren met dezelfde veldnamen op één scherm) is met ronde 98 verdwenen.
export function CategorieNiveauKiezer({
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
      {/* ⚠ Geen kaal `aria-label` (doorlichting ronde 92), maar een echt label buiten
          beeld: alleen zo steunt de koppeling tussen het woord en het veld ergens op. */}
      <span id={`${id}-zoek-label`} className="alleen-voorlezen">
        {t('Zoek een categorie')}
      </span>
      <input
        aria-labelledby={`${id}-zoek-label`}
        placeholder={t('Typ om ook subcategorieën te zoeken…')}
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
          {t('Je kan een budget ook op één subcategorie zetten — typ dan de naam.')}
        </span>
      )}
    </div>
  )
}
