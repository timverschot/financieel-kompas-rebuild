import { useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { zoekItems, ZOEK_VANAF } from '../data/categorieen/zoek'
import type { PlatItem } from '../data/categorieen/zoek'
import { groepVanCategorie } from '../data/categorieen/resolve'
import type { Categorie } from '../data/schema'
import { HoofdcategorieChips, NieuweSubcategoriePaneel } from './CategorieKiezer'
import { useT } from '../i18n'

const MAX = 8

// Het zwevende voorstellenlijstje: crème vlak met zachte rand en een schaduw,
// want het zweeft boven de rest van het formulier.
const suggestieLijst: CSSProperties = {
  listStyle: 'none',
  margin: '4px 0 0',
  padding: 0,
  maxHeight: 220,
  overflowY: 'auto',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  boxShadow: 'var(--shadow-sheet)',
  position: 'absolute',
  width: '100%',
  zIndex: 20,
}

function suggestieKnop(gemarkeerd: boolean): CSSProperties {
  return {
    // Bewust GEEN `display` hier: een <div> is al een blok, en in
    // `@media (pointer: coarse)` maakt index.css er een flexrij van zodat de tekst
    // in het vak van 44 px gecentreerd staat. Een inline waarde zou dat overrulen.
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 'var(--tekst-sm)',
    color: 'var(--text)',
    padding: '8px 12px',
    border: 'none',
    borderBottom: '1px solid var(--rij-lijn)',
    background: gemarkeerd ? 'var(--accent-soft)' : 'transparent',
    cursor: 'pointer',
  }
}

// Een net aangemaakte subcategorie bestaat nog niet in de zoekindex op het
// moment dat we ze op de regel willen zetten (de app herlaadt daarna pas). We
// bouwen ze dus zelf op met de plaats in de boom die de gebruiker koos, zodat de
// regel meteen correct getagd is.
function nieuwPlatItem(id: string, naam: string, categorieId: string): PlatItem | null {
  for (const h of INGEBOUWDE_CATEGORIEEN) {
    for (const c of h.categorieen) {
      if (c.id === categorieId) {
        return {
          id,
          naam,
          synoniemen: [],
          eenheid: null,
          categorieId: c.id,
          categorieNaam: c.naam,
          hoofdId: h.id,
          hoofdNaam: h.naam,
          kleur: h.kleur,
          icoon: h.icoon,
        }
      }
    }
  }
  return null
}

// Compacte item-autocomplete voor één kassaticketregel: typ een product (vanaf
// twee letters), navigeer met pijltjes en kies met Tab/Enter. Vindt ook op
// synoniem. Breed taggen kan met de chips (hoofdcategorieën) onder het veld, en
// bestaat je product nog niet, dan maak je het aan via de laatste regel in de
// lijst. Vrije tekst zonder keuze blijft gewoon als omschrijving staan.
export function ItemZoeker({
  waarde,
  onTekst,
  onKiesItem,
  registerInput,
  categorieId,
  onKiesHoofdcategorie,
  onNieuweSubcategorie,
  eigenCategorieen = [],
}: {
  waarde: string
  onTekst: (tekst: string) => void
  onKiesItem: (item: PlatItem) => void
  registerInput?: (el: HTMLInputElement | null) => void
  categorieId?: string
  onKiesHoofdcategorie?: (hoofdId: string, hoofdNaam: string) => void
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
  /**
   * De zelfgemaakte categorieën. Zonder deze lijst kon je een regel van een
   * gesplitst kassaticket niet op een eigen categorie taggen — de chiprij bood er
   * geen aan en de zoeker kende ze niet.
   */
  eigenCategorieen?: Categorie[]
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [hoog, setHoog] = useState(0)
  // De naam waarvoor het "nieuwe subcategorie"-paneeltje openstaat (null = dicht).
  const [nieuweNaam, setNieuweNaam] = useState<string | null>(null)
  const hoogRef = useRef(0)
  const lijstId = useId()
  function zetHoog(n: number) {
    hoogRef.current = n
    setHoog(n)
  }

  const term = waarde.trim()
  const resultaten = open && term.length >= ZOEK_VANAF ? zoekItems(term, MAX) : []
  // De "toevoegen"-regel telt mee in de toetsenbordnavigatie: ze is gewoon de
  // laatste regel van de lijst.
  const toonToevoegen = Boolean(onNieuweSubcategorie) && open && term.length >= ZOEK_VANAF
  const aantalRegels = resultaten.length + (toonToevoegen ? 1 : 0)
  const gemarkeerd = Math.min(hoog, Math.max(0, aantalRegels - 1))
  // Onder welke hoofdcategorie valt deze regel nu? Die chip lichten we op.
  const hoofdInBeeld = categorieId ? groepVanCategorie(categorieId, eigenCategorieen).sleutel : undefined

  function kies(item: PlatItem) {
    onKiesItem(item)
    setOpen(false)
    setNieuweNaam(null)
    zetHoog(0)
  }

  function startToevoegen() {
    setNieuweNaam(term)
  }

  async function bewaarNieuwe(catId: string) {
    if (!onNieuweSubcategorie || !nieuweNaam) return
    const id = await onNieuweSubcategorie(catId, nieuweNaam)
    const item = nieuwPlatItem(id, nieuweNaam, catId)
    if (item) kies(item)
    else setNieuweNaam(null)
  }

  function opToets(e: KeyboardEvent<HTMLInputElement>) {
    if (aantalRegels === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      zetHoog(Math.min(hoogRef.current + 1, aantalRegels - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      zetHoog(Math.max(hoogRef.current - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const index = Math.min(hoogRef.current, aantalRegels - 1)
      if (index < resultaten.length) {
        e.preventDefault()
        kies(resultaten[index])
      } else if (toonToevoegen) {
        e.preventDefault()
        startToevoegen()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        aria-label={t('Subcategorie zoeken')}
        ref={registerInput}
        // Zie CategorieKiezer: zonder deze koppelingen hoort wie de app laat
        // voorlezen niet wat er onder de markering staat.
        role="combobox"
        aria-expanded={aantalRegels > 0 && nieuweNaam === null}
        aria-autocomplete="list"
        aria-controls={aantalRegels > 0 && nieuweNaam === null ? lijstId : undefined}
        aria-activedescendant={aantalRegels > 0 && nieuweNaam === null ? `${lijstId}-${gemarkeerd}` : undefined}
        style={{ display: 'block', width: '100%' }}
        autoComplete="off"
        placeholder={t('Zoek een subcategorie (vanaf 2 letters)…')}
        value={waarde}
        onChange={(e) => {
          onTekst(e.target.value)
          setOpen(true)
          zetHoog(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={opToets}
      />
      {onKiesHoofdcategorie && (
        <HoofdcategorieChips
          actiefId={hoofdInBeeld}
          onKies={(id, naam) => onKiesHoofdcategorie(id, naam)}
          eigenCategorieen={eigenCategorieen}
        />
      )}
      {aantalRegels > 0 && nieuweNaam === null && (
        <ul role="listbox" id={lijstId} style={suggestieLijst}>
          {resultaten.map((it, i) => (
            <li key={it.id}>
              <div
                role="option"
                id={`${lijstId}-${i}`}
                aria-selected={i === gemarkeerd}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => kies(it)}
                onMouseEnter={() => zetHoog(i)}
                className="kiezer-voorstel"
                style={suggestieKnop(i === gemarkeerd)}
              >
                {it.naam} <span style={{ color: 'var(--text-subtle)' }}>· {it.hoofdNaam}</span>
              </div>
            </li>
          ))}
          {toonToevoegen && (
            <li>
              <div
                role="option"
                id={`${lijstId}-${resultaten.length}`}
                aria-selected={gemarkeerd === resultaten.length}
                onMouseDown={(e) => e.preventDefault()}
                onClick={startToevoegen}
                onMouseEnter={() => zetHoog(resultaten.length)}
                className="kiezer-voorstel"
                style={suggestieKnop(gemarkeerd === resultaten.length)}
              >
                {t('+ “{naam}” toevoegen aan …', { naam: term })}
              </div>
            </li>
          )}
        </ul>
      )}
      {nieuweNaam !== null && (
        <NieuweSubcategoriePaneel
          naam={nieuweNaam}
          hoofdIdInBeeld={hoofdInBeeld}
          onBevestig={bewaarNieuwe}
          onAnnuleer={() => setNieuweNaam(null)}
        />
      )}
    </div>
  )
}
