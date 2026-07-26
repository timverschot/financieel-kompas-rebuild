import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { Categorie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { zoekItems } from '../data/categorieen/zoek'
import { groepVanCategorie, labelVanCategorie, type EigenCategorie } from '../data/categorieen/resolve'
import { useT } from '../i18n'

// Vanaf hoeveel letters we in de items/subcategorieën beginnen te zoeken.
const ZOEK_VANAF = 2
const MAX_SUGGESTIES = 12

type Suggestie = { id: string; titel: string; sub?: string }

// Het zwevende voorstellenlijstje: crème vlak met zachte rand en een schaduw,
// want het zweeft boven de rest van het formulier.
const suggestieLijst: CSSProperties = {
  listStyle: 'none',
  margin: '4px 0 0',
  padding: 0,
  maxHeight: 240,
  overflowY: 'auto',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  boxShadow: 'var(--shadow-sheet)',
  position: 'absolute',
  width: '100%',
  zIndex: 10,
}

function suggestieKnop(gemarkeerd: boolean): CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 'var(--tekst-sm)',
    color: 'var(--text)',
    padding: '9px 12px',
    border: 'none',
    borderBottom: '1px solid var(--rij-lijn)',
    background: gemarkeerd ? 'var(--accent-soft)' : 'transparent',
    cursor: 'pointer',
  }
}

// Eén rij die horizontaal schuift: de chips blijven op één lijn en vullen dus
// nooit het halve scherm.
const chipRij: CSSProperties = {
  display: 'flex',
  gap: 6,
  overflowX: 'auto',
  padding: '2px 0',
  marginTop: 6,
}

// De rij met de veertien hoofdcategorieën. Altijd zichtbaar (ook tijdens het
// typen), want breed taggen — "dit was gewoon Huishouden" — moet even vlot gaan
// als een precies item kiezen. Eén tik en de regel is getagd.
export function HoofdcategorieChips({
  actiefId,
  onKies,
  eigenCategorieen = [],
}: {
  actiefId?: string
  onKies: (id: string, naam: string) => void
  /**
   * De zelfgemaakte categorieën van de gebruiker. Die stonden hier niet, waardoor
   * je een eigen categorie nergens met één tik kon kiezen — ook niet op een
   * kassaticketregel. Ze horen in dezelfde rij: voor de gebruiker is er geen
   * verschil tussen "een categorie van de app" en "een categorie van mij".
   */
  eigenCategorieen?: EigenCategorie[]
}) {
  const { t } = useT()
  const chips = [
    ...INGEBOUWDE_CATEGORIEEN.map((h) => ({ id: h.id, icoon: h.icoon, label: t(h.naam) })),
    // Alleen eigen HOOFDcategorieën: een eigen middencategorie (met ouderId) hoort
    // onder haar ouder en niet als losse chip in deze rij.
    ...eigenCategorieen.filter((c) => !c.ouderId).map((c) => ({ id: c.id, icoon: c.icoon ?? '🏷️', label: c.naam })),
  ]
  return (
    <div role="group" aria-label={t('Hoofdcategorieën')} style={chipRij}>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className={'chip' + (actiefId === c.id ? ' chip-actief' : '')}
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
          // Voorkom dat het invoerveld de focus verliest vóór de klik telt.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onKies(c.id, c.label)}
        >
          {c.icoon} {c.label}
        </button>
      ))}
    </div>
  )
}

// Het paneeltje dat verschijnt na "+ … toevoegen aan …": kies onder welke
// (midden)categorie de nieuwe subcategorie hoort. Die keuze is verplicht, want
// zonder plaats in de boom valt de uitgave uit alle analyses.
export function NieuweSubcategoriePaneel({
  naam,
  hoofdIdInBeeld,
  onBevestig,
  onAnnuleer,
}: {
  naam: string
  hoofdIdInBeeld?: string
  onBevestig: (categorieId: string) => void | Promise<void>
  onAnnuleer: () => void
}) {
  const { t } = useT()
  const [categorieId, setCategorieId] = useState('')
  // Bewust een ref en geen state: dit dient enkel om een dubbele klik tegen te
  // houden terwijl er bewaard wordt, en hoeft niets opnieuw te tekenen.
  const bezigRef = useRef(false)
  const selectRef = useRef<HTMLSelectElement | null>(null)

  // Meteen de keuzelijst focussen: wie met het toetsenbord werkt, blijft zo aan
  // het typen/kiezen zonder naar de muis te grijpen.
  useEffect(() => {
    selectRef.current?.focus()
  }, [])

  // Staat er al een hoofdcategorie in beeld, dan zetten we háár categorieën
  // bovenaan: negen van de tien keer hoort het nieuwe item daar.
  const hoofden = useMemo(() => {
    const eerst = INGEBOUWDE_CATEGORIEEN.filter((h) => h.id === hoofdIdInBeeld)
    const rest = INGEBOUWDE_CATEGORIEEN.filter((h) => h.id !== hoofdIdInBeeld)
    return [...eerst, ...rest]
  }, [hoofdIdInBeeld])

  async function bevestig() {
    if (!categorieId || bezigRef.current) return
    bezigRef.current = true
    try {
      await onBevestig(categorieId)
    } finally {
      bezigRef.current = false
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        width: '100%',
        zIndex: 20,
        marginTop: 4,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sheet)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p style={{ margin: 0, fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }}>
        {t('Nieuwe subcategorie “{naam}”', { naam })}
      </p>
      <select
        ref={selectRef}
        aria-label={t('Onder welke categorie')}
        value={categorieId}
        onChange={(e) => setCategorieId(e.target.value)}
      >
        <option value="">{t('— kies —')}</option>
        {hoofden.map((h) => (
          <optgroup key={h.id} label={`${h.icoon} ${t(h.naam)}`}>
            {h.categorieen.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.naam)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="knoprij">
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          disabled={!categorieId}
          onClick={() => void bevestig()}
        >
          {t('Subcategorie toevoegen')}
        </button>
        <button type="button" className="knop knop-ghost knop-klein" onClick={onAnnuleer}>
          {t('Annuleer')}
        </button>
      </div>
    </div>
  )
}

// Categorie-kiezer met autocomplete, zoals in v1: begin te typen en vanaf twee
// letters worden items (subcategorieën) herkend. Navigeer met pijl omhoog/omlaag
// door de voorstellen; kies met Enter of Tab. Breed taggen doe je met de chips
// (de hoofdcategorieën) die altijd boven de lijst staan. Staat je item er nog
// niet bij, dan maak je het ter plekke aan via de laatste regel in de lijst.
export function CategorieKiezer({
  waarde,
  onKies,
  gebruikerCategorieen,
  onNieuweSubcategorie,
}: {
  waarde: string | undefined
  onKies: (id: string | undefined) => void
  gebruikerCategorieen: Categorie[]
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
}) {
  const { t } = useT()
  const [zoek, setZoek] = useState('')
  const [open, setOpen] = useState(false)
  const [hoog, setHoog] = useState(0)
  // De naam waarvoor het "nieuwe subcategorie"-paneeltje openstaat (null = dicht).
  const [nieuweNaam, setNieuweNaam] = useState<string | null>(null)
  // Ref naast state: de toetsaanslag-handler moet de ACTUELE markering lezen,
  // niet een verouderde waarde uit een oude render (bekende valkuil uit v1).
  const hoogRef = useRef(0)
  function zetHoog(n: number) {
    hoogRef.current = n
    setHoog(n)
  }

  const gekozenLabel = labelVanCategorie(waarde, gebruikerCategorieen)
  const getypt = zoek.trim()
  const term = getypt.toLowerCase()
  // Onder welke hoofdcategorie valt de huidige keuze? Dat bepaalt welke
  // categorieën we bovenaan voorstellen bij een nieuwe subcategorie, en welke
  // chip we oplichten.
  const hoofdInBeeld = waarde ? groepVanCategorie(waarde, gebruikerCategorieen).sleutel : undefined

  // Bouw de voorstellenlijst (plat, zodat toetsenbordnavigatie er vlot doorheen
  // gaat). De hoofdcategorieën zelf staan hier niet meer in: die staan nu
  // permanent als chips boven de lijst.
  const suggesties: Suggestie[] = []
  if (open && term.length >= ZOEK_VANAF) {
    for (const it of zoekItems(term, MAX_SUGGESTIES)) {
      suggesties.push({ id: it.id, titel: it.naam, sub: it.hoofdNaam })
    }
    for (const c of gebruikerCategorieen) {
      if (c.naam.toLowerCase().includes(term)) suggesties.push({ id: c.id, titel: c.naam, sub: t('eigen') })
    }
  }
  const zichtbaar = suggesties.slice(0, MAX_SUGGESTIES)
  // De "toevoegen"-regel telt mee in de toetsenbordnavigatie: ze is gewoon de
  // laatste regel van de lijst.
  const toonToevoegen = Boolean(onNieuweSubcategorie) && open && getypt.length >= ZOEK_VANAF
  const aantalRegels = zichtbaar.length + (toonToevoegen ? 1 : 0)
  const gemarkeerd = Math.min(hoog, Math.max(0, aantalRegels - 1))

  function kies(id: string | undefined) {
    onKies(id)
    setZoek('')
    setOpen(false)
    setNieuweNaam(null)
    zetHoog(0)
  }

  function startToevoegen() {
    setNieuweNaam(getypt)
  }

  async function bewaarNieuwe(categorieId: string) {
    if (!onNieuweSubcategorie || !nieuweNaam) return
    const id = await onNieuweSubcategorie(categorieId, nieuweNaam)
    kies(id)
  }

  function opToets(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || aantalRegels === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      zetHoog(Math.min(hoogRef.current + 1, aantalRegels - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      zetHoog(Math.max(hoogRef.current - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const index = Math.min(hoogRef.current, aantalRegels - 1)
      e.preventDefault() // niet het formulier verzenden, maar het voorstel kiezen
      if (index < zichtbaar.length) kies(zichtbaar[index].id)
      else startToevoegen()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="veldgroep" style={{ position: 'relative' }}>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="label-caps">{t('Categorie:')}</span> <strong>{gekozenLabel ?? t('Geen')}</strong>
        {waarde && (
          <button type="button" className="knop knop-ghost knop-klein knop-gevaar" onClick={() => kies(undefined)}>
            {t('wissen')}
          </button>
        )}
      </p>
      <input
        aria-label={t('Zoek categorie of item')}
        role="combobox"
        aria-expanded={open && aantalRegels > 0}
        aria-autocomplete="list"
        style={{ display: 'block', width: '100%' }}
        value={zoek}
        placeholder={t('Typ om te zoeken (vanaf 2 letters)…')}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setZoek(e.target.value)
          setOpen(true)
          zetHoog(0)
        }}
        onKeyDown={opToets}
      />
      <HoofdcategorieChips actiefId={hoofdInBeeld} onKies={(id) => kies(id)} eigenCategorieen={gebruikerCategorieen} />
      {open && aantalRegels > 0 && nieuweNaam === null && (
        <ul role="listbox" style={{ ...suggestieLijst, top: '100%' }}>
          {zichtbaar.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === gemarkeerd}>
              <button
                type="button"
                // Voorkom dat het invoerveld de focus verliest vóór de klik telt.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => kies(s.id)}
                onMouseEnter={() => zetHoog(i)}
                style={suggestieKnop(i === gemarkeerd)}
              >
                {s.titel}
                {s.sub && <span style={{ color: 'var(--text-subtle)' }}> · {s.sub}</span>}
              </button>
            </li>
          ))}
          {toonToevoegen && (
            <li role="option" aria-selected={gemarkeerd === zichtbaar.length}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={startToevoegen}
                onMouseEnter={() => zetHoog(zichtbaar.length)}
                style={suggestieKnop(gemarkeerd === zichtbaar.length)}
              >
                {t('+ “{naam}” toevoegen aan …', { naam: getypt })}
              </button>
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
