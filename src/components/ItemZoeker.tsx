import { useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { zoekItems, itemPerId, midPerId, ZOEK_VANAF } from '../data/categorieen/zoek'
import { groepVanCategorie } from '../data/categorieen/resolve'
import type { Categorie } from '../data/schema'
import { HoofdcategorieChips, NieuweSubcategoriePaneel } from './CategorieKiezer'
import { alleHoofdcategorieen } from '../utils/categorieVolgorde'
import { subcategoriePad } from '../utils/subcategoriepad'
import { useT } from '../i18n'
import type { NieuweTak } from '../utils/categorietak'

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
  onWis,
  nummer,
  eigenCategorieen = [],
}: {
  waarde: string
  onTekst: (tekst: string) => void
  /**
   * De keuze voor deze regel: alleen een id en een naam.
   *
   * ⚠ Bewust NIET het volledige `PlatItem`. De enige oproeper zet er precies twee
   * velden uit op de regel (`categorieId` en `omschrijving`); kleur, teken en plaats
   * in de boom komen bij het TEKENEN uit de herbouwde boom. Een net aangemaakte
   * subcategorie staat nog niet in die boom op het moment dat we ze hier kiezen, dus
   * een volledig `PlatItem` moest toen met de hand nagebouwd worden — met kleuren en
   * namen die daarna nergens meer aankwamen. Deze smallere vorm zegt eerlijk wat er
   * echt nodig is.
   */
  onKiesItem: (item: { id: string; naam: string }) => void
  registerInput?: (el: HTMLInputElement | null) => void
  categorieId?: string
  onKiesHoofdcategorie?: (hoofdId: string, hoofdNaam: string) => void
  /**
   * De categorie van deze regel weer leeghalen (ronde 78).
   *
   * ⚠ Nodig omdat de keuzeknop verdwijnt zodra er een subcategorie staat. Zonder een
   * weg terug zou je daarna niet meer breed kunnen taggen — en dan is "een afgemaakte
   * keuze is geen vraag meer" veranderd in "een afgemaakte keuze is definitief".
   * Ontbreekt deze handler, dan blijft de keuzeknop staan: liever een knop te veel
   * dan een gebruiker die vastzit.
   */
  onWis?: () => void
  /**
   * Het nummer van deze ticketregel (1, 2, 3 …), alleen om de knop "wissen" een eigen
   * toegankelijke naam te geven. Ontbreekt het, dan heet die knop gewoon "wissen".
   */
  nummer?: number
  onNieuweSubcategorie?: (plan: NieuweTak) => Promise<string>
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
  // Wat er net gelukt is — alleen voor wie de app laat voorlezen. Zie CategorieKiezer.
  const [melding, setMelding] = useState('')
  // Zie CategorieKiezer: houdt een sluiting tegen zolang er bewaard wordt.
  const paneelBezigRef = useRef(false)
  const hoogRef = useRef(0)
  const lijstId = useId()
  const padId = useId()
  // Waar de focus naartoe moet als het paneeltje sluit; zie CategorieKiezer.
  const veldRef = useRef<HTMLInputElement | null>(null)
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
  // En de CATEGORIE waar deze regel in staat, zodat het paneeltje die al invult.
  const categorieInBeeld = categorieId ? (itemPerId(categorieId)?.categorieId ?? midPerId(categorieId)?.id) : undefined
  /** Welke hoofdcategorieën heeft de gebruiker zelf gemaakt? Zie CategorieKiezer. */
  const eigenHoofd = useMemo(
    () => new Set(alleHoofdcategorieen(eigenCategorieen).filter((h) => h.eigen).map((h) => h.id)),
    [eigenCategorieen],
  )
  // ⚠ RONDE 78 — HIER BLEEF DE KEUZEKNOP STAAN NAAST EEN AFGEMAAKTE KEUZE.
  // Ronde 67 sprak af dat een gekozen SUBcategorie alleen nog een vermelding krijgt en
  // geen keuzefunctie meer. Die afspraak landde toen op het gewone boekingsformulier
  // (`CategorieKiezer`) en niet hier. Gevolg, gemeld uit Timothy's eigen gebruik: naast
  // "Brood (wit)" bleef de knop "Hoofdcategorie: …" staan, hij bleef aanklikbaar, en
  // een tik erop verving zijn subcategorie door de brede hoofdcategorie "Drank" — de
  // omschrijving bleef "Brood (wit)", de categorie werd Drank, en niets zei het.
  //
  // ⚠ Het rooster van hoofdcategorieën klapt pas open bij de eerste tik, dus in
  // principe kost het er twee. Maar de knop hield zijn open-stand vast nadat je uit de
  // zoeklijst gekozen had — stond het rooster al open, dan volstond één tik.
  const pad = subcategoriePad(categorieId, eigenHoofd, t)
  // Staat er in het veld precies de naam van de gekozen subcategorie? Zie `onFocus`.
  const veldToontDeKeuze =
    categorieId !== undefined &&
    itemPerId(categorieId)?.naam.trim().toLowerCase() === waarde.trim().toLowerCase()
  // De keuzeknop verdwijnt alleen wanneer er ook een weg terug is; zie `onWis`.
  const toonPad = pad !== undefined && nieuweNaam === null
  const toonChips = Boolean(onKiesHoofdcategorie) && nieuweNaam === null && !(toonPad && onWis)

  function kies(item: { id: string; naam: string }) {
    setMelding('')
    onKiesItem(item)
    setOpen(false)
    setNieuweNaam(null)
    zetHoog(0)
  }

  function startToevoegen() {
    // De vorige melding hoort weg; zie CategorieKiezer.
    setMelding('')
    setNieuweNaam(term)
  }

  /** Sluit het paneeltje en zet de focus terug in het invoerveld. */
  function sluitPaneel() {
    // ⚠ Niet tijdens het bewaren — zie CategorieKiezer. Anders breekt Escape hier af
    // terwijl het wegschrijven doorloopt, en staat je "geannuleerde" categorie er
    // achteraf toch, met je regel erop getagd.
    if (paneelBezigRef.current) return
    setNieuweNaam(null)
    veldRef.current?.focus()
  }

  async function bewaarNieuwe(plan: NieuweTak) {
    if (!onNieuweSubcategorie) return
    const id = await onNieuweSubcategorie(plan)
    // De naam komt uit het plan en niet uit de boom: die boom wordt pas bij de
    // volgende tekening herbouwd, dus `itemPerId(id)` geeft hier nog niets terug.
    kies({ id, naam: plan.subnaam.trim() })
    setMelding(t('“{naam}” is toegevoegd en staat nu op deze boeking.', { naam: plan.subnaam.trim() }))
    // ⚠ De focus terugzetten mag de voorstellenlijst NIET heropenen. Dit veld houdt
    // zijn tekst (het is tegelijk de omschrijving van de ticketregel), dus je kreeg
    // meteen weer "+ … toevoegen aan …" te zien voor de naam die je zonet had
    // toegevoegd — een uitnodiging om hetzelfde nog eens te maken.
    //
    // ⚠ HIER STOND EEN VLAG (`netToegevoegdRef`) DIE `onFocus` LIET OVERSLAAN, en die
    // is er in ronde 78 uit gegaan omdat een mutatietest er niet op beet. Nagerekend:
    // deze functie draait ná een `await`, en React bundelt ook daar de
    // toestandswijzigingen. `focus()` kan hoogstens een `setOpen(true)` uitlokken die
    // in dezelfde bundel zit als de `setOpen(false)` hieronder — en de laatste wint.
    // Er is dus geen tussenliggende tekening waarin de lijst even opflitst. De vlag kon
    // niets uitsluiten; het is de regel eronder die het werk doet.
    veldRef.current?.focus()
    setOpen(false)
  }

  function opToets(e: KeyboardEvent<HTMLInputElement>) {
    // ⚠ Zie CategorieKiezer: staat het toevoegpaneeltje open, dan is de
    // voorstellenlijst van het scherm en mag dit veld er niets meer uit kiezen.
    // Escape sluit dan het paneeltje, en stopt daar — anders vraagt het venster
    // eromheen of je je hele boeking mag weggooien.
    if (nieuweNaam !== null) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        sluitPaneel()
        return
      }
      // ⚠ Enter tegenhouden, niet loslaten: anders verzendt de browser de boeking.
      // Zie CategorieKiezer voor de volledige uitleg.
      if (e.key === 'Enter') e.preventDefault()
      return
    }
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
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        aria-label={t('Subcategorie zoeken')}
        ref={(el) => {
          veldRef.current = el
          registerInput?.(el)
        }}
        // Zie CategorieKiezer: zonder deze koppelingen hoort wie de app laat
        // voorlezen niet wat er onder de markering staat.
        role="combobox"
        aria-expanded={aantalRegels > 0 && nieuweNaam === null}
        aria-autocomplete="list"
        aria-controls={aantalRegels > 0 && nieuweNaam === null ? lijstId : undefined}
        aria-activedescendant={aantalRegels > 0 && nieuweNaam === null ? `${lijstId}-${gemarkeerd}` : undefined}
        // De vermelding onder het veld beschrijft de keuze die op dit veld staat;
        // zonder deze koppeling hoort wie de app laat voorlezen haar als een losse zin.
        aria-describedby={toonPad ? padId : undefined}
        style={{ display: 'block', width: '100%' }}
        autoComplete="off"
        placeholder={t('Zoek een subcategorie (vanaf 2 letters)…')}
        value={waarde}
        onChange={(e) => {
          onTekst(e.target.value)
          setOpen(true)
          zetHoog(0)
        }}
        onFocus={() => {
          // ⚠ STAAT ER PRECIES JE EIGEN KEUZE, DAN VALT ER NIETS TE ZOEKEN
          // (doorlichting ronde 78). Op een ticketregel is dit veld tegelijk de
          // omschrijving, dus na een keuze staat er "Brood (wit)" in — en daar vond
          // `zoekItems` meteen weer een treffer. Twee gevolgen, allebei stil: je kreeg
          // ónder je eigen keuze een lijst met diezelfde "Brood (wit)" én "+ toevoegen
          // aan …", een uitnodiging om een duplicaat van jezelf te maken; en omdat Tab
          // in een open lijst het gemarkeerde voorstel KIEST in plaats van door te
          // gaan, veranderde de eerste Tab op weg naar "wissen" je categorie — en zette
          // de eerste Tab ná "wissen" hem weer terug.
          //
          // ⚠ Bewust op de NAAM en niet op "er staat een categorie". Wijkt de tekst af
          // van je keuze, dan ben je juist iets anders aan het zoeken en hoort de lijst
          // gewoon open te gaan. Typen opent haar sowieso weer (zie `onChange`).
          if (veldToontDeKeuze) return
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={opToets}
      />
      {/* Weg zolang het toevoegpaneeltje openstaat: het paneeltje zweeft eroverheen,
          en één tik op een chip die je niet meer zag koos een categorie, sloot het
          paneeltje en gooide je invoer weg.

          ⚠ Hier ECHT weghalen, en niet zoals in CategorieKiezer alleen onzichtbaar
          maken. Deze chiprij staat namelijk binnen het laagje waaraan het paneeltje
          zich ophangt. Liet je haar plaats staan, dan begon het paneeltje zestig pixels
          lager, met een lege strook tussen het invoerveld en het paneeltje — dat leest
          als kapot. Het is hier ook maar één knop hoog (er is geen trap onder), dus de
          sprong is klein. */}
      {toonChips && onKiesHoofdcategorie && (
        <HoofdcategorieChips
          actiefId={hoofdInBeeld}
          onKies={(id, naam) => {
            // De melding hoort bij de vorige keuze; die klopt niet meer zodra je de
            // regel breed op een hoofdcategorie tagt.
            setMelding('')
            onKiesHoofdcategorie(id, naam)
          }}
          eigenCategorieen={eigenCategorieen}
        />
      )}
      {/* ⚠ RONDE 78 — DE VERMELDING DIE HIER HOORDE. Staat er een subcategorie, dan
          valt er onderaan de boom niets meer te kiezen; dan hoort er te staan wáár ze
          hangt, en niet een knop die iets anders zou doen. Precies dezelfde regel en
          dezelfde functie als op het gewone boekingsformulier — zie
          `utils/subcategoriepad.ts`, dat sinds deze ronde de enige plek is waar ze staat.

          De naam van de subcategorie zelf herhalen we niet: die staat in het veld
          hierboven, want op een ticketregel is het zoekveld tegelijk de omschrijving. */}
      {toonPad && (
        <p className="rij-meta" style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* ⚠ Het `id` staat op de SPAN en niet op de alinea (doorlichting ronde 78).
              Een toegankelijke beschrijving wordt platgeslagen tot tekst: wees hij naar
              de alinea, dan las voorleessoftware dit veld voor als "… Voeding ›
              Broodwaren wissen" — het woord "wissen" plakte aan de vermelding vast
              alsof het erbij hoorde, en de knop werd daarna nóg eens aangekondigd. */}
          <span id={padId}>{pad}</span>
          {onWis && (
            <button
              type="button"
              className="knop knop-ghost knop-klein knop-gevaar"
              // ⚠ Mét het regelnummer (doorlichting ronde 78). Een gesplitst kassaticket
              // heeft er meerdere onder elkaar, en drie knoppen die allemaal "wissen"
              // heten zijn voor wie de app laat voorlezen niet uit elkaar te houden —
              // huisregel sinds ronde 66. De buren op dezelfde rij dragen hun nummer al
              // ("Deelbedrag 2", "Verwijder regel 2").
              aria-label={nummer === undefined ? undefined : t('Categorie van regel {n} wissen', { n: nummer })}
              // Meteen weer in het zoekveld, net als op het gewone formulier: wie zich
              // vergist heeft, wil doortypen en niet eerst een veld aanwijzen.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setMelding('')
                onWis()
                veldRef.current?.focus()
                // ⚠ En de voorstellenlijst gaat dicht. Zonder dit bleef ze staan wanneer
                // je tekst van je keuze afweek — dan stond ze al open — en koos de
                // eerstvolgende Tab precies terug wat je net gewist had.
                //
                // ⚠ HIER STOND OOK `geenLijstBijFocusRef`, en die is er weer uit
                // (mutatietest ronde 78). De focus hierboven leest `veldToontDeKeuze`
                // uit déze render, waarin de categorie nog op de regel staat — React
                // verwerkt `onWis` pas na deze handler. De lijst gaat dus sowieso niet
                // open, en een vlag die niets kan uitsluiten hoort weg.
                setOpen(false)
              }}
            >
              {t('wissen')}
            </button>
          )}
        </p>
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
                {/* ⚠ De chiprij hierboven toont een ingebouwde hoofdcategorie vertaald;
                    deze regel deed dat niet. In het Frans stond er dan een knop
                    "Boissons" met daaronder "Cola · Drank" — dezelfde hoofdcategorie
                    met twee namen, twee regels uit elkaar. Een EIGEN naam blijft
                    natuurlijk staan zoals de gebruiker ze intikte. */}
                {it.naam}{' '}
                <span style={{ color: 'var(--text-subtle)' }}>
                  · {eigenHoofd.has(it.hoofdId) ? it.hoofdNaam : t(it.hoofdNaam)}
                </span>
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
          // Zie CategorieKiezer: het veld blijft bewerkbaar, dus de naam volgt mee.
          naam={term}
          hoofdIdInBeeld={hoofdInBeeld}
          categorieIdInBeeld={categorieInBeeld}
          eigenCategorieen={eigenCategorieen}
          onBevestig={bewaarNieuwe}
          onAnnuleer={sluitPaneel}
          onBezig={(bezig) => {
            paneelBezigRef.current = bezig
          }}
        />
      )}
      <p role="status" className="alleen-voorlezen">
        {melding}
      </p>
    </div>
  )
}
