import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { Categorie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { zoekItems, zoekMidCategorieen } from '../data/categorieen/zoek'
import { groepVanCategorie, labelVanCategorie, type EigenCategorie } from '../data/categorieen/resolve'
import { alleHoofdcategorieen, opVolgorde } from '../utils/categorieVolgorde'
import { useHoofdvolgorde } from '../categorievolgorde'
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
  // Doorvegen aan het einde van de lijst mag de pagina eronder niet meeslepen.
  overscrollBehavior: 'contain',
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
    // Bewust GEEN `display` hier: een <div> is al een blok, en in
    // `@media (pointer: coarse)` maakt index.css er een flexrij van zodat de tekst
    // in het vak van 44 px gecentreerd staat. Een inline waarde zou dat overrulen.
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

// De hoofdcategorieën: één knop die het volledige rooster opent.
//
// Wat hiervoor stond: acht chips in beeld en de rest achter "Nog 6 …". Dat was al
// beter dan de zijwaarts schuivende rij van daarvóór, maar het bleef een halve
// oplossing — je zag een willekeurig lijkende selectie en moest zelf ontdekken dat
// er meer was. Nu staat er één knop met je huidige keuze erop, en erachter komt
// ALLES tevoorschijn: zichtbaar en aanklikbaar in één keer.
//
// Waarom klikken en niet hover, wat je zou verwachten van een uitklapper op een
// pc: hover bestáát niet op een telefoon, dus dan zou de rij daar onbereikbaar
// zijn. En ook met een muis heeft hover een nadeel — de rij klapt open zodra je er
// toevallig overheen beweegt, en je kan hem niet bewust sluiten. Eén klik werkt op
// beide toestellen identiek.
//
// De rij is daardoor in rust nog maar één knop hoog. Dat maakt meteen de aparte
// 'compact'-stand overbodig: de voorstellenlijst blijft nu altijd vlak bij het
// invoerveld, ook terwijl je typt.
export function HoofdcategorieChips({
  actiefId,
  onKies,
  eigenCategorieen = [],
  voorkeurId,
}: {
  actiefId?: string
  onKies: (id: string, naam: string) => void
  /**
   * Een hoofdcategorie die vooraan hoort te staan. Het transactieformulier zet
   * hier "Inkomsten" wanneer je een inkomst boekt: die staat anders ergens in de
   * staart, terwijl ze op dat moment net de enige is die je zoekt.
   */
  voorkeurId?: string
  /**
   * De zelfgemaakte categorieën van de gebruiker. Die stonden hier niet, waardoor
   * je een eigen categorie nergens met één tik kon kiezen — ook niet op een
   * kassaticketregel. Ze horen in dezelfde rij: voor de gebruiker is er geen
   * verschil tussen "een categorie van de app" en "een categorie van mij".
   */
  eigenCategorieen?: EigenCategorie[]
}) {
  const { t } = useT()
  // De volgorde die de gebruiker zelf koos op de Categorieën-pagina. Komt uit een
  // context en niet als prop: deze kiezer zit vier lagen diep en op vier plaatsen.
  const volgorde = useHoofdvolgorde()
  const [open, setOpen] = useState(false)

  const alleChips = opVolgorde(
    alleHoofdcategorieen(eigenCategorieen as Categorie[]).map((h) => ({
      id: h.id,
      icoon: h.icoon,
      // Alleen ingebouwde namen lopen door t(): een eigen categorie draagt de naam
      // die de gebruiker zelf intikte en die vertalen we nooit.
      label: h.eigen ? h.naam : t(h.naam),
    })),
    volgorde,
  )
  const voorkeur = voorkeurId ? alleChips.find((c) => c.id === voorkeurId) : undefined
  const chips = voorkeur ? [voorkeur, ...alleChips.filter((c) => c !== voorkeur)] : alleChips

  const actief = chips.find((c) => c.id === actiefId)
  const knopTekst = actief
    ? t('Hoofdcategorie: {naam}', { naam: actief.label })
    : t('Selecteer hoofdcategorie')

  return (
    <div className="hoofdkiezer">
      <button
        type="button"
        className={'chip' + (actief ? ' chip-actief' : '')}
        aria-expanded={open}
        // Voorkom dat het invoerveld de focus verliest vóór de klik telt.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {actief ? `${actief.icoon} ` : ''}
        {knopTekst}
        <span aria-hidden> {open ? '▲' : '▼'}</span>
      </button>

      {open && (
        // Ronde 34: dit was een rij losse chips die afbrak waar ze toevallig
        // uitkwam. Veertien tekstblokjes van heel verschillende breedte onder
        // elkaar lezen als een hoop woorden, niet als een keuzelijst — precies
        // wat er gemeld werd ("een onoverzichtelijk opgestelde groepering van
        // woorden"). Nu is het een ROOSTER van even brede tegels: het icoon groot
        // bovenaan, de naam eronder, alles even hoog. Twee kolommen op een
        // telefoon, vier op een breed scherm (zie .categorierooster in index.css).
        <div role="group" aria-label={t('Hoofdcategorieën')} className="categorierooster">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={'categorietegel' + (actiefId === c.id ? ' categorietegel-actief' : '')}
              aria-pressed={actiefId === c.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onKies(c.id, c.label)
                // Sluiten na de keuze: die staat nu op de knop, dus het rooster
                // heeft zijn werk gedaan en de voorstellenlijst eronder mag weer
                // dicht bij het invoerveld komen.
                setOpen(false)
              }}
            >
              <span className="categorietegel-teken" aria-hidden>
                {c.icoon}
              </span>
              <span className="categorietegel-naam">{c.label}</span>
            </button>
          ))}
        </div>
      )}
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
  voorkeurId,
}: {
  waarde: string | undefined
  onKies: (id: string | undefined) => void
  gebruikerCategorieen: Categorie[]
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
  /** Hoofdcategorie die vooraan in de chiprij hoort. Zie `HoofdcategorieChips`. */
  voorkeurId?: string
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
  // Eén vast id-voorvoegsel voor de voorstellenlijst en haar regels, zodat het
  // invoerveld ernaar kan verwijzen (aria-controls / aria-activedescendant).
  const lijstId = useId()
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
    // Sinds ronde 27 rolt een middencategorie (cat-*) netjes op naar haar
    // hoofdcategorie in élke grafiek, elk budget en elke analyse. Daarom mag je er
    // nu ook een transactie op zetten. Dat scheelt echt iets: "Elektriciteit" is
    // wat je bedoelt, terwijl je vroeger moest kiezen tussen het veel te brede
    // "Woning en vaste lasten" en een willekeurig item eronder.
    const mids = zoekMidCategorieen(term, MAX_SUGGESTIES)
    const middenSuggestie = (m: (typeof mids)[number]): Suggestie => ({
      id: m.id,
      titel: m.naam,
      sub: t('{hoofd} · hele categorie', { hoofd: t(m.hoofdNaam) }),
    })
    // Een middencategorie die met de zoekterm begint, is bijna altijd wat je
    // bedoelt; de rest komt achter de items.
    for (const m of mids.filter((m) => m.naam.toLowerCase().startsWith(term))) suggesties.push(middenSuggestie(m))
    for (const it of zoekItems(term, MAX_SUGGESTIES)) {
      suggesties.push({ id: it.id, titel: it.naam, sub: t(it.hoofdNaam) })
    }
    // Eigen MIDDENcategorieën staan al in `mids`; hier alleen de eigen
    // hoofdcategorieën, anders stond dezelfde naam twee keer in de lijst.
    for (const c of gebruikerCategorieen) {
      if (!c.ouderId && c.naam.toLowerCase().includes(term)) {
        suggesties.push({ id: c.id, titel: c.naam, sub: t('eigen') })
      }
    }
    for (const m of mids.filter((m) => !m.naam.toLowerCase().startsWith(term))) suggesties.push(middenSuggestie(m))
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
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        role="combobox"
        aria-expanded={open && aantalRegels > 0}
        aria-autocomplete="list"
        // Zonder deze twee koppelingen is de zoeker voor wie de app laat voorlezen
        // stil: de focus blijft in het veld staan, dus pijltje-omlaag verplaatst
        // alleen een markering die niemand hoort. `aria-controls` wijst naar de
        // lijst, `aria-activedescendant` naar de regel die nu gemarkeerd is.
        aria-controls={open && aantalRegels > 0 ? lijstId : undefined}
        aria-activedescendant={open && aantalRegels > 0 ? `${lijstId}-${gemarkeerd}` : undefined}
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
      <HoofdcategorieChips
        actiefId={hoofdInBeeld}
        onKies={(id) => kies(id)}
        eigenCategorieen={gebruikerCategorieen}
        voorkeurId={voorkeurId}
      />
      {open && aantalRegels > 0 && nieuweNaam === null && (
        // De regels zijn `div`-jes met `role="option"` en géén knoppen meer. Een
        // keuzeregel mag namelijk niets bevatten waar je apart op kan klikken;
        // browsers en voorleessoftware maken daar onvoorspelbare dingen van. Ze
        // blijven met de muis, de vinger én de pijltjes precies even bruikbaar.
        <ul role="listbox" id={lijstId} style={{ ...suggestieLijst, top: '100%' }}>
          {zichtbaar.map((s, i) => (
            <li key={s.id}>
              <div
                role="option"
                id={`${lijstId}-${i}`}
                aria-selected={i === gemarkeerd}
                // Voorkom dat het invoerveld de focus verliest vóór de klik telt.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => kies(s.id)}
                onMouseEnter={() => zetHoog(i)}
                className="kiezer-voorstel"
                style={suggestieKnop(i === gemarkeerd)}
              >
                {s.titel}
                {s.sub && <span style={{ color: 'var(--text-subtle)' }}> · {s.sub}</span>}
              </div>
            </li>
          ))}
          {toonToevoegen && (
            <li>
              <div
                role="option"
                id={`${lijstId}-${zichtbaar.length}`}
                aria-selected={gemarkeerd === zichtbaar.length}
                onMouseDown={(e) => e.preventDefault()}
                onClick={startToevoegen}
                onMouseEnter={() => zetHoog(zichtbaar.length)}
                className="kiezer-voorstel"
                style={suggestieKnop(gemarkeerd === zichtbaar.length)}
              >
                {t('+ “{naam}” toevoegen aan …', { naam: getypt })}
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
