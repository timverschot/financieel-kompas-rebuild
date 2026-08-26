import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { Categorie } from '../data/schema'
import { zoekItems, zoekMidCategorieen, midsVanHoofd, itemsVanMid, midPerId, itemPerId, ZOEK_VANAF } from '../data/categorieen/zoek'
import { groepVanCategorie, labelVanCategorie, type EigenCategorie } from '../data/categorieen/resolve'
import { alleHoofdcategorieen, opVolgorde } from '../utils/categorieVolgorde'
import { subcategoriePad } from '../utils/subcategoriepad'
import { useHoofdvolgorde } from '../categorievolgorde'
import { useT } from '../i18n'
import { schoneNaam } from '../utils/categorietak'
import type { NieuweTak } from '../utils/categorietak'

// Vanaf hoeveel letters we in de items/subcategorieën beginnen te zoeken.
const MAX_SUGGESTIES = 12

// De waarde van de regel "+ nieuwe …" in de twee keuzelijsten van het
// toevoegpaneeltje. Een teken dat geen id kan zijn, zodat hij nooit met een echte
// categorie kan botsen.
const NIEUW = '__nieuw__'

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
    : // "(optioneel)" staat er bewust bij: zonder dat woord leest deze knop als een
      // verplichte eerste stap, en dan blijft iemand hem invullen terwijl je gewoon
      // meteen op naam kan zoeken. De hoofdcategorie is enkel een filter.
      t('Selecteer hoofdcategorie (optioneel)')

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


// ---------------------------------------------------------------------------
// De trap: hoofdcategorie -> categorie -> subcategorie
//
// Waarom dit er is. De boom heeft drie lagen en meer dan duizend items. Tot nu
// koos je een hoofdcategorie met één tik, en al de rest moest je TYPEN. Wie de
// naam van een item niet precies kent ("Brood (wit)"? "Wit brood"?) blijft dan
// zoeken. Zodra er een hoofdcategorie gekozen is, verschijnen daarom de
// categorieën eronder, en na een categorie haar subcategorieën. Zo kan je van
// boven naar beneden doorklikken zonder één letter te typen.
//
// Elke laag is OPTIONEEL en op zich een geldige keuze: alleen "Voeding" mag, en
// "Voeding > Broodwaren" ook. Dat stond er al zo in de rekenkern (alles rolt op
// naar de hoofdcategorie), maar het was niet zichtbaar.
//
// Er is bewust GEEN eigen toestand: welke laag open staat, leiden we af uit de
// gekozen waarde. Zo klopt de trap ook wanneer je een item via het zoekveld
// koos — je ziet dan meteen waar dat item in de boom hangt.
// ---------------------------------------------------------------------------

/** Hoeveel chips een laag toont voor ze inklapt. Voeding heeft 26 categorieën en
 *  sommige categorieën bijna negentig items; die allemaal tonen maakt van een
 *  keuzerij een muur. */
const CHIPS_INGEKLAPT = 12

function trapVan(waarde: string | undefined): { hoofdId?: string; midId?: string } {
  if (!waarde) return {}
  const item = itemPerId(waarde)
  if (item) return { hoofdId: item.hoofdId, midId: item.categorieId }
  const mid = midPerId(waarde)
  if (mid) return { hoofdId: mid.hoofdId, midId: mid.id }
  // Dan is het een hoofdcategorie (ingebouwd of een eigen zonder ouder).
  return { hoofdId: waarde }
}

function ChipLaag({
  label,
  keuzes,
  actiefId,
  onKies,
}: {
  label: string
  keuzes: { id: string; naam: string }[]
  actiefId?: string
  onKies: (id: string) => void
}) {
  const { t } = useT()
  const [alles, setAlles] = useState(false)
  if (keuzes.length === 0) return null
  // De gekozen chip staat altijd in beeld, ook als ze buiten de eerste twaalf
  // valt: anders lijkt je keuze verdwenen zodra de laag weer inklapt.
  const zichtbaar = alles
    ? keuzes
    : [...keuzes.slice(0, CHIPS_INGEKLAPT), ...keuzes.filter((k, i) => i >= CHIPS_INGEKLAPT && k.id === actiefId)]
  const rest = keuzes.length - zichtbaar.length

  return (
    <div className="trap-laag">
      <p className="label-caps trap-label">{label}</p>
      <div role="group" aria-label={label} className="chiprooster">
        {zichtbaar.map((k) => (
          <button
            key={k.id}
            type="button"
            className={'chip' + (actiefId === k.id ? ' chip-actief' : '')}
            aria-pressed={actiefId === k.id}
            // Voorkom dat het zoekveld de focus verliest vóór de klik telt.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onKies(k.id)}
          >
            {k.naam}
          </button>
        ))}
        {rest > 0 && (
          <button
            type="button"
            className="chip chip-meer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlles(true)}
          >
            {t('+ nog {n}', { n: rest })}
          </button>
        )}
        {alles && keuzes.length > CHIPS_INGEKLAPT && (
          <button
            type="button"
            className="chip chip-meer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAlles(false)}
          >
            {t('minder')}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * De twee lagen ONDER de hoofdcategorie. Geeft niets terug zolang er geen
 * hoofdcategorie gekozen is — dan is er ook niets om in door te klikken.
 *
 * Een tik op een chip die al actief is, gaat een laag terug (de categorie wordt
 * de keuze in plaats van de subcategorie). Zonder dat zou je een te diepe keuze
 * alleen met "opnieuw kiezen" kunnen rechtzetten en helemaal opnieuw moeten beginnen.
 */
export function CategorieTrap({
  waarde,
  onKies,
}: {
  waarde: string | undefined
  onKies: (id: string) => void
}) {
  const { t } = useT()
  const { hoofdId, midId } = trapVan(waarde)

  const mids = useMemo(() => (hoofdId ? midsVanHoofd(hoofdId) : []), [hoofdId])
  const items = useMemo(() => (midId ? itemsVanMid(midId) : []), [midId])

  if (!hoofdId) return null

  return (
    <>
      {/* De `key` is geen detail: zonder haar houdt React de "toon alles"-stand van
          een laag vast wanneer de INHOUD volledig verandert. Klapte je de 26
          categorieën van Voeding uit en wisselde je dan van hoofdcategorie, dan
          stond de nieuwe laag ook meteen open — en bij de subcategorieën kon dat
          83 chips tegelijk zijn. Precies de muur die het inklappen moest
          voorkomen. */}
      <ChipLaag
        key={`mid-${hoofdId}`}
        label={t('Categorie (optioneel)')}
        keuzes={mids}
        actiefId={midId}
        onKies={(id) => onKies(id === midId ? hoofdId : id)}
      />
      <ChipLaag
        key={`item-${midId ?? ''}`}
        label={t('Subcategorie (optioneel)')}
        keuzes={items}
        actiefId={waarde && itemPerId(waarde) ? waarde : undefined}
        onKies={(id) => onKies(id === waarde ? (midId ?? hoofdId) : id)}
      />
    </>
  )
}

// Het paneeltje dat verschijnt na "+ … toevoegen aan …": zeg waar de nieuwe
// subcategorie thuishoort. Die plaats is verplicht, want zonder plek in de boom
// valt de uitgave uit alle analyses.
//
// ⚠ RONDE 67 — HIER KON JE ALLEEN IETS BIJZETTEN OP EEN PLEK DIE AL BESTOND. Er
// stond één keuzelijst met de ingebouwde categorieën, en dat had twee gevolgen die
// allebei niet klopten met wat de rest van de app kan:
//
//  1. Je eigen hoofd- en middencategorieën stonden er NIET in. Je kon ze op de
//     Categorieën-pagina maken, maar er vanuit een boeking niets in hangen.
//  2. Een nieuwe hoofdcategorie of categorie maken kon hier helemaal niet. Wie een
//     televisie kocht en daar "Huisraad" voor wilde, moest de boeking verlaten,
//     naar Categorieën, twee lagen aanmaken, en terugkomen — als hij al wist dat
//     die pagina bestond.
//
// Nu staan er twee lagen, allebei met "+ nieuwe …" als laatste keuze, en wat je
// aanmaakt gaat in ÉÉN ondeelbare stap naar de database (`bewaarNieuweTak`).
export function NieuweSubcategoriePaneel({
  naam,
  hoofdIdInBeeld,
  categorieIdInBeeld,
  eigenCategorieen = [],
  onBevestig,
  onAnnuleer,
  onBezig,
}: {
  naam: string
  hoofdIdInBeeld?: string
  /**
   * De CATEGORIE waar je op dat moment in stond. Stond je op "Voeding › Broodwaren",
   * dan hoef je die twee niet opnieuw te kiezen: allebei staan ze al ingevuld.
   */
  categorieIdInBeeld?: string
  /** De zelfgemaakte categorieën, zodat je eigen boom hier ook aanwezig is. */
  eigenCategorieen?: Categorie[]
  onBevestig: (plan: NieuweTak) => void | Promise<void>
  onAnnuleer: () => void
  /**
   * Meldt of er op dit moment bewaard wordt. De zoeker eromheen heeft dat nodig: die
   * kan het paneeltje ook met Escape sluiten, en tijdens het bewaren mag dat niet.
   */
  onBezig?: (bezig: boolean) => void
}) {
  const { t } = useT()
  /** De naam zoals ze op het scherm hoort: een eigen naam vertalen we nooit. */
  const hoofdLabel = (h: { naam: string; eigen: boolean }) => (h.eigen ? h.naam : t(h.naam))
  // Dezelfde volgorde als op de Categorieën-pagina en in de chiprij. Een lijst die
  // per scherm anders sorteert, is een lijst waarin je telkens opnieuw moet zoeken.
  const volgorde = useHoofdvolgorde()
  const hoofden = useMemo(
    () => opVolgorde(alleHoofdcategorieen(eigenCategorieen), volgorde),
    [eigenCategorieen, volgorde],
  )

  // De waarde NIEUW staat voor "+ nieuwe …" in allebei de keuzelijsten. Een lege
  // string blijft "nog niets gekozen"; zo hoeven we geen tweede vlag bij te houden.
  const [hoofdKeuze, setHoofdKeuze] = useState(hoofdIdInBeeld ?? '')
  const [hoofdNaam, setHoofdNaam] = useState('')
  const [catKeuze, setCatKeuze] = useState(categorieIdInBeeld ?? '')
  const [catNaam, setCatNaam] = useState('')
  const [fout, setFout] = useState('')
  // Zichtbaar bezig zijn én er echt maar één keer doorlaten. De state verandert de
  // knoptekst; de ref houdt de tweede tik tegen, want state wordt pas bij de
  // volgende tekening waar en twee tikken binnen één tel glippen er dan allebei door.
  const [bezig, setBezig] = useState(false)
  const bezigRef = useRef(false)
  const eersteRef = useRef<HTMLSelectElement | null>(null)
  const wortelRef = useRef<HTMLDivElement | null>(null)

  // Meteen de eerste keuzelijst focussen: wie met het toetsenbord werkt, blijft zo
  // aan het typen/kiezen zonder naar de muis te grijpen.
  useEffect(() => {
    eersteRef.current?.focus()
  }, [])

  /**
   * ⚠ ZOLANG DIT PANEELTJE OPENSTAAT, MAG HET FORMULIER EROMHEEN NIET VERZONDEN
   * WORDEN.
   *
   * Waarom dit hier staat en niet in het boekingsformulier. Enter in élk tekstveld
   * van een formulier verzendt dat formulier — dat doet de browser vanzelf. Stond dit
   * paneeltje open en drukte je Enter in "Bedrag", of tikte je op "Toevoegen", dan
   * werd de boeking bewaard ZONDER categorie, sloot het venster, en waren de twee
   * namen die je net had ingetikt weg. Zonder een woord.
   *
   * Het is eerder geprobeerd door de toetsen in het zoekveld ernaast af te vangen,
   * maar het gat zat niet in dat veld — het zat in het formulier. Eén afspraak op de
   * juiste plek dekt alle velden af, ook de velden die er later nog bij komen: het
   * paneeltje zegt zélf tegen het formulier waarin het toevallig staat dat er nog
   * iets openstaat.
   *
   * `capture: true` zorgt dat we er vóór React bij zijn; `stopPropagation` houdt de
   * gebeurtenis tegen voordat de verzendfunctie hem ziet.
   */
  useEffect(() => {
    const formulier = wortelRef.current?.closest('form')
    if (!formulier) return
    const tegenhouden = (e: Event) => {
      e.preventDefault()
      // `stopImmediatePropagation` en niet alleen `stopPropagation`: op een gesplitst
      // kassaticket kan er per regel een paneeltje openstaan, en die hangen allemaal
      // aan hetzelfde formulier. Met alleen `stopPropagation` draaiden ze allemaal en
      // kreeg je evenveel meldingen tegelijk.
      e.stopImmediatePropagation()
      setFout(t('Rond eerst je nieuwe categorie af, of annuleer ze.'))
      eersteRef.current?.focus()
    }
    formulier.addEventListener('submit', tegenhouden, true)
    return () => formulier.removeEventListener('submit', tegenhouden, true)
  }, [t])

  /**
   * ⚠ EEN KEUZE TELT ALLEEN ZOLANG ZE ÉCHT BESTAAT — en dat wordt bij ELKE tekening
   * opnieuw nagegaan, niet één keer bij het openen.
   *
   * Twee wegen brengen hier een dood id binnen. De eerste is de hoofdcategorie "in
   * beeld": die komt van `groepVanCategorie`, en die geeft een onbekend id gewoon
   * ongewijzigd terug. De tweede is de tijd: staat dit paneeltje open terwijl een
   * ander toestel via Drive een categorie verwijdert, dan verdwijnt je keuze onder je
   * handen weg.
   *
   * Zonder deze controle liep het allebei op hetzelfde uit: de keuzelijst stond
   * zichtbaar leeg (geen enkele <option> paste), de regel eronder zei "Kies eerst een
   * categorie" — en bevestigen schreef een categorie weg met een ouder die niet
   * bestaat. Zo'n wees laat `stelCategorieboomIn` bewust vallen, dus je nieuwe
   * categorie én je nieuwe subcategorie waren stil verdwenen terwijl de app "gelukt"
   * zei en je boeking er wel op getagd stond.
   */
  const hoofd = hoofdKeuze === NIEUW || hoofden.some((h) => h.id === hoofdKeuze) ? hoofdKeuze : ''

  // De categorieën onder de gekozen hoofdcategorie. Bij een nieuwe hoofdcategorie
  // bestaat er per definitie nog niets, dus dan is er ook niets te kiezen.
  const mids = useMemo(() => (hoofd && hoofd !== NIEUW ? midsVanHoofd(hoofd) : []), [hoofd])

  const nieuweHoofd = hoofd === NIEUW
  /** Dezelfde controle een laag lager. */
  const cat = catKeuze === NIEUW || mids.some((m) => m.id === catKeuze) ? catKeuze : ''
  const nieuweCat = cat === NIEUW || (nieuweHoofd && cat === '')

  // Wat er al onder de gekozen categorie hangt — nodig om een twééde "Brood (wit)"
  // op dezelfde plek tegen te houden. Twee subcategorieën met dezelfde naam naast
  // elkaar zijn achteraf niet meer uit elkaar te houden.
  const buren = useMemo(() => (!nieuweCat && cat !== '' && cat !== NIEUW ? itemsVanMid(cat) : []), [nieuweCat, cat])

  const subnaam = schoneNaam(naam)
  const nieuweHoofdNaam = schoneNaam(hoofdNaam)
  const nieuweCatNaam = schoneNaam(catNaam)
  const zelfde = (a: string, b: string) => schoneNaam(a).toLowerCase() === schoneNaam(b).toLowerCase()

  /** De hoofdcategorie waarmee een nieuwe naam botst — mét de naam zoals ze op het
   *  scherm staat, want in het Engels of Frans is dat niet altijd dezelfde. */
  const botsendeHoofd = nieuweHoofdNaam === '' ? undefined : hoofden.find((h) => zelfde(h.naam, nieuweHoofdNaam) || zelfde(hoofdLabel(h), nieuweHoofdNaam))

  // Wat er nog ontbreekt of botst, in de volgorde waarin je het invult. Één zin, want
  // de knop kan maar één reden tegelijk hebben.
  const reden =
    subnaam === ''
      ? // Kan alleen wanneer de getypte naam uitsluitend uit onzichtbare tekens
        // bestaat (geplakt uit een pdf of een website).
          t('Typ hierboven een naam voor je nieuwe subcategorie.')
      : hoofd === ''
      ? t('Kies eerst een hoofdcategorie.')
      : nieuweHoofd && nieuweHoofdNaam === ''
        ? t('Geef je nieuwe hoofdcategorie een naam.')
        : nieuweHoofd && botsendeHoofd
          ? t('Er bestaat al een hoofdcategorie “{naam}”.', { naam: hoofdLabel(botsendeHoofd) })
          : !nieuweHoofd && cat === ''
            ? t('Kies eerst een categorie.')
            : nieuweCat && nieuweCatNaam === ''
              ? t('Geef je nieuwe categorie een naam.')
              : nieuweCat && mids.some((m) => zelfde(m.naam, nieuweCatNaam))
                ? t('Er bestaat hier al een categorie “{naam}”.', { naam: nieuweCatNaam })
                : buren.some((b) => zelfde(b.naam, subnaam))
                  ? // ⚠ Met de uitweg erbij: de naam komt uit het zoekveld en is hier
                    // niet aan te passen, dus zonder die zin sta je stil.
                    t('Er bestaat hier al een subcategorie “{naam}”. Annuleer en kies ze uit de lijst.', {
                      naam: subnaam,
                    })
                  : ''
  const geldig = reden === ''

  // De id van de regel die zegt wat er nog ontbreekt (ronde 61).
  const plaatsRedenId = useId()

  function bouwPlan(): NieuweTak {
    // Alles vertrekt van de NAGEKEKEN waarden (`hoofd`/`cat`), nooit van de ruwe
    // state: anders kan er alsnog een dood id in het logboek belanden.
    if (!nieuweCat) return { subnaam: subnaam, categorie: { id: cat } }
    const ouder = nieuweHoofd ? { naam: nieuweHoofdNaam } : { id: hoofd }
    return { subnaam: subnaam, categorie: { naam: nieuweCatNaam, hoofd: ouder } }
  }

  async function bevestig() {
    if (!geldig || bezigRef.current) return
    bezigRef.current = true
    setBezig(true)
    onBezig?.(true)
    setFout('')
    try {
      await onBevestig(bouwPlan())
    } catch {
      // ⚠ Hier stond niets (ronde 67). Mislukte het bewaren, dan bleef het
      // paneeltje gewoon staan en gebeurde er zichtbaar niets — dan denk je dat je
      // te zacht getikt hebt en probeer je het nog eens.
      setFout(t('Toevoegen is niet gelukt. Je invoer staat er nog — probeer het opnieuw.'))
    } finally {
      bezigRef.current = false
      setBezig(false)
      onBezig?.(false)
    }
  }

  /**
   * Enter in dit paneeltje betekent "voeg toe", nooit "verzend de boeking".
   *
   * ⚠ Zonder dit verzond Enter in een van deze velden het HELE boekingsformulier:
   * de boeking werd bewaard zónder categorie en het paneeltje verdween. Het zoekveld
   * erboven ving Enter al af; deze vier velden zijn er in ronde 67 bijgekomen en
   * deden dat niet.
   */
  function opVeldToets(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    void bevestig()
  }

  return (
    <div
      // Een vast haakje voor de tests: zo kan een test nagaan dat dit vlak echt
      // ONDER het zoekveld hangt en niet onderaan het hele venster.
      data-toevoegpaneel
      ref={wortelRef}
      // Zonder deze twee hoort wie de app laat voorlezen alleen "Hoofdcategorie,
      // keuzelijst" — niet dát er een paneeltje geopend is en niet waarvoor.
      role="group"
      aria-labelledby={`${plaatsRedenId}-kop`}
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
        // ⚠ Met het toetsenbord open is een telefoonscherm nog een paar honderd
        // pixels hoog. Zonder deze grens groeide het paneeltje gewoon door en stond
        // de knop "Subcategorie toevoegen" onder de rand — onbereikbaar, want de
        // pagina eronder schuift niet mee met een zwevend vlak.
        maxHeight: 'min(60vh, 420px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sheet)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      // ⚠ Escape moet hier stoppen. Liet je hem doorlopen, dan kwam hij bij het
      // dialoogvenster terecht en vroeg de app "Je invoer is nog niet opgeslagen.
      // Wil je ze weggooien?" — over de hele boeking, terwijl je alleen dit
      // paneeltje wilde sluiten.
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.preventDefault()
        e.stopPropagation()
        // ⚠ Dezelfde grendel als op de knop Annuleer. Zonder deze regel kon je met
        // Escape wél afbreken terwijl het bewaren al liep — en dan stond je
        // "geannuleerde" categorie er achteraf gewoon, mét je boeking erop getagd.
        if (!bezigRef.current) onAnnuleer()
      }}
    >
      {/* De kop van het paneeltje. Stond hier eerst in de bleekste tekststijl van de
          app — dan is de titel het minst leesbare wat er staat, terwijl hij juist moet
          zeggen wat je aan het doen bent.

          De naam komt rechtstreeks uit het zoekveld en volgt het dus terwijl je typt.
          Werd hij bij het openen vastgelegd, dan kon je hierboven "televisietoesXYZ"
          zien staan terwijl er stilletjes "televisietoestel" aangemaakt werd. */}
      <p id={`${plaatsRedenId}-kop`} style={{ margin: 0, fontWeight: 600 }}>
        {/* Maak je het zoekveld leeg terwijl dit openstaat, dan zou hier
            `Nieuwe subcategorie ""` komen te staan — twee lege aanhalingstekens. */}
        {subnaam === '' ? t('Nieuwe subcategorie') : t('Nieuwe subcategorie “{naam}”', { naam: subnaam })}
      </p>
      {/* ⚠ Bovenaan en niet onderaan. Het paneeltje kan schuiven (`maxHeight`), en de
          twee gevallen waarin hier iets komt te staan — het verzenden is tegengehouden,
          of het bewaren is mislukt — springen allebei naar boven. Stond de zin
          onderaan, dan las je precies niet waarom er niets gebeurde. */}
      {fout !== '' && (
        <p className="foutregel" role="alert" style={{ margin: 0 }}>
          {fout}
        </p>
      )}

      <div className="veldgroep">
        <label className="label-caps" htmlFor={`${plaatsRedenId}-hoofd`}>
          {t('Hoofdcategorie')}
        </label>
        <select
          id={`${plaatsRedenId}-hoofd`}
          ref={eersteRef}
          value={hoofd}
          onKeyDown={opVeldToets}
          onChange={(e) => {
            setHoofdKeuze(e.target.value)
            // De categorie hoort bij de hoofdcategorie: wisselt die, dan is de
            // oude keuze niet meer geldig. Zonder deze regel bleef een categorie
            // uit de vorige hoofdcategorie stil geselecteerd staan.
            //
            // De getypte NAAM blijft wel staan: die is van jou en hangt nergens
            // aan vast. Hem wissen kostte je je typewerk zodra je merkte dat je de
            // verkeerde hoofdcategorie had aangeklikt.
            setCatKeuze('')
            setFout('')
          }}
        >
          <option value="">{t('— kies —')}</option>
          {hoofden.map((h) => (
            <option key={h.id} value={h.id}>
              {h.icoon} {hoofdLabel(h)}
            </option>
          ))}
          <option value={NIEUW}>{t('+ Nieuwe hoofdcategorie…')}</option>
        </select>
      </div>

      {nieuweHoofd && (
        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${plaatsRedenId}-hoofdnaam`}>
            {t('Naam van de nieuwe hoofdcategorie')}
          </label>
          <input
            id={`${plaatsRedenId}-hoofdnaam`}
            value={hoofdNaam}
            placeholder={t('bv. Huisraad')}
            onKeyDown={opVeldToets}
            onChange={(e) => {
              setHoofdNaam(e.target.value)
              setFout('')
            }}
          />
        </div>
      )}

      {/* Onder een NIEUWE hoofdcategorie valt niets te kiezen: daar hoort per
          definitie ook een nieuwe categorie bij. Dan tonen we meteen het naamveld
          in plaats van een keuzelijst met één optie erin. */}
      {!nieuweHoofd && hoofd !== '' && (
        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${plaatsRedenId}-cat`}>
            {t('Categorie')}
          </label>
          <select
            id={`${plaatsRedenId}-cat`}
            value={cat}
            onKeyDown={opVeldToets}
            onChange={(e) => {
              setCatKeuze(e.target.value)
              setFout('')
            }}
          >
            <option value="">{t('— kies —')}</option>
            {/* De namen van de ingebouwde categorieën staan niet in de
                vertaaltabellen — en de namen die je zélf intikt horen daar ook
                nooit doorheen. Vandaar hier geen t(). */}
            {mids.map((m) => (
              <option key={m.id} value={m.id}>
                {m.naam}
              </option>
            ))}
            <option value={NIEUW}>{t('+ Nieuwe categorie…')}</option>
          </select>
        </div>
      )}

      {nieuweCat && hoofd !== '' && (
        <div className="veldgroep">
          <label className="label-caps" htmlFor={`${plaatsRedenId}-catnaam`}>
            {t('Naam van de nieuwe categorie')}
          </label>
          <input
            id={`${plaatsRedenId}-catnaam`}
            value={catNaam}
            placeholder={t('bv. Meubels en toestellen')}
            onKeyDown={opVeldToets}
            onChange={(e) => {
              setCatNaam(e.target.value)
              setFout('')
            }}
          />
        </div>
      )}

      {/* ⚠ Hier stond niets (ronde 61): de knop lag uit en er stond nergens waarom.
          En de reden stond ONDER de knoprij, in de stijl van "hier staat nog niets" —
          de bleekste tekst van de app, ná de knop waar ze over gaat. Je tikte dus op
          een knop die niets deed en las de uitleg pas als je verder naar beneden
          keek. Nu staat ze ervóór, in gewone tekst. */}
      <p id={plaatsRedenId} role="status" className="rij-meta" style={{ margin: 0, minHeight: '1em' }}>
        {reden}
      </p>
      <div className="knoprij">
        <button
          type="button"
          className="knop knop-secundair knop-klein"
          aria-disabled={!geldig || bezig}
          aria-describedby={geldig ? undefined : plaatsRedenId}
          onClick={() => void bevestig()}
        >
          {bezig ? t('Bezig met toevoegen…') : t('Subcategorie toevoegen')}
        </button>
        {/* ⚠ Niet aan te tikken zolang er bewaard wordt. Het paneeltje sloot wél,
            maar het wegschrijven liep gewoon door: je kreeg dus een hoofdcategorie,
            een categorie én een subcategorie die je net geannuleerd had, en je
            boeking stond erop getagd. */}
        <button
          type="button"
          className="knop knop-ghost knop-klein"
          aria-disabled={bezig}
          onClick={() => {
            if (!bezig) onAnnuleer()
          }}
        >
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
  onNieuweSubcategorie?: (plan: NieuweTak) => Promise<string>
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
  // De id van de regel die zegt waar de gekozen subcategorie hangt.
  const padId = useId()
  // Waar de focus naartoe moet als het paneeltje sluit. Zonder deze ref landde de
  // focus op de PAGINA zelf: met het toetsenbord was je je plek in het formulier
  // kwijt, en wie de app laat voorlezen hoorde niets meer.
  const zoekRef = useRef<HTMLInputElement | null>(null)
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
  // En in welke CATEGORIE stond je? Stond je op "Voeding › Broodwaren", dan hoef je
  // die niet opnieuw te kiezen wanneer je er een subcategorie bij maakt.
  const categorieInBeeld = trapVan(waarde).midId

  /** Welke hoofdcategorieën heeft de gebruiker zelf gemaakt? */
  const eigenHoofd = useMemo(
    () => new Set(alleHoofdcategorieen(gebruikerCategorieen).filter((h) => h.eigen).map((h) => h.id)),
    [gebruikerCategorieen],
  )

  /**
   * Waar hangt de gekozen SUBcategorie? "Huishouden en Verzorging › Huishoudproducten".
   *
   * `undefined` zodra de keuze geen subcategorie is (of er geen keuze is): dan
   * blijven de keuzechips staan. De naam van de subcategorie zelf staat al bovenaan
   * naast "Categorie:", dus die herhalen we hier niet.
   *
   * ⚠ WELKE NAAM WEL EN NIET DOOR `t()` MAG. Een naam die de gebruiker zelf intikte
   * gaat er NOOIT doorheen: noemt hij een eigen hoofdcategorie "Sport" of "Auto",
   * dan zijn dat toevallig ook vertaalsleutels van de app en zou zijn categorie in
   * het Engels ineens anders heten. De hoofdcategorie volgt daarom exact dezelfde
   * regel als de chiprij (`HoofdcategorieChips`), en de categorienaam blijft altijd
   * staan zoals ze is — net als in de chiplagen van de trap, en omdat de ingebouwde
   * middenlaag sowieso geen vertalingen heeft.
   */
  // ⚠ Sinds ronde 78 uit `utils/subcategoriepad.ts`, want dit scherm is niet het enige
  // dat deze regel toepast: het zoekveld van een kassaticketregel doet hetzelfde. Daar
  // stond hij NIET, en dat kostte drie dagen later een verkeerd ingedeelde boeking.
  // Eén regel, één plek.
  //
  // ⚠ En zonder `useMemo` (doorlichting ronde 78). De boom waaruit deze functie leest
  // is een register buiten React (`stelCategorieboomIn`), dus een hernoemde
  // subcategorie verandert geen van de afhankelijkheden — met een memo bleef de oude
  // naam staan zolang het formulier open was. Het is één opzoeking in een Map; er valt
  // niets te besparen. `ItemZoeker` doet het al zo, en de twee schermen die deze ronde
  // gelijk wil trekken, horen ook hierin gelijk te lopen.
  const padOnderKeuze = subcategoriePad(waarde, eigenHoofd, t)

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
    // ⚠ `hoofdNaam` mag alleen door t() als de hoofdcategorie INGEBOUWD is. Voor een
    // eigen categorie staat daar de naam die de gebruiker zelf intikte, en noemde hij
    // die "Auto", dan heette ze in het Engels ineens "Car" — terwijl de chiprij en de
    // padregel op datzelfde scherm gewoon "Auto" bleven zeggen. Eén categorie, twee
    // namen, tegelijk in beeld.
    const hoofdTekst = (hoofdId: string, hoofdNaam: string) => (eigenHoofd.has(hoofdId) ? hoofdNaam : t(hoofdNaam))
    const middenSuggestie = (m: (typeof mids)[number]): Suggestie => ({
      id: m.id,
      titel: m.naam,
      sub: t('{hoofd} · hele categorie', { hoofd: hoofdTekst(m.hoofdId, m.hoofdNaam) }),
    })
    // Een middencategorie die met de zoekterm begint, is bijna altijd wat je
    // bedoelt; de rest komt achter de items.
    for (const m of mids.filter((m) => m.naam.toLowerCase().startsWith(term))) suggesties.push(middenSuggestie(m))
    for (const it of zoekItems(term, MAX_SUGGESTIES)) {
      suggesties.push({ id: it.id, titel: it.naam, sub: hoofdTekst(it.hoofdId, it.hoofdNaam) })
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
    setMelding('')
    onKies(id)
    setZoek('')
    setOpen(false)
    setNieuweNaam(null)
    zetHoog(0)
  }

  function startToevoegen() {
    // De vorige melding hoort weg: zonder dit blijft "… is toegevoegd" staan terwijl
    // je aan de volgende bezig bent, en wordt een tweede toevoeging met dezelfde naam
    // helemaal niet meer voorgelezen (dezelfde tekst = geen wijziging om te melden).
    setMelding('')
    setNieuweNaam(getypt)
  }

  /**
   * Wat er net gelukt is. Alleen voor wie de app laat voorlezen: wie meekijkt ziet de
   * naam naast "Categorie:" verschijnen, maar wie dat niet doet hoorde helemaal niets
   * — terwijl een MISLUKTE poging wél gemeld werd.
   */
  const [melding, setMelding] = useState('')

  // Waar of onwaar: het paneeltje is op dit moment aan het bewaren. Een ref en geen
  // state — het stuurt geen tekening aan, het houdt alleen een sluiting tegen.
  const paneelBezigRef = useRef(false)

  /** Sluit het paneeltje en zet de focus terug in het zoekveld. */
  function sluitPaneel() {
    // ⚠ Niet tijdens het bewaren. Anders breekt Escape hier af terwijl het
    // wegschrijven doorloopt, en staat je "geannuleerde" categorie er achteraf toch —
    // met je boeking erop getagd. De knop Annuleer in het paneeltje heeft dezelfde
    // grendel; dit is dezelfde regel, voor de andere weg naar buiten.
    if (paneelBezigRef.current) return
    setNieuweNaam(null)
    zoekRef.current?.focus()
  }

  async function bewaarNieuwe(plan: NieuweTak) {
    if (!onNieuweSubcategorie) return
    const naam = plan.subnaam.trim()
    const id = await onNieuweSubcategorie(plan)
    kies(id)
    setMelding(t('“{naam}” is toegevoegd en staat nu op deze boeking.', { naam }))
    zoekRef.current?.focus()
  }

  function opToets(e: KeyboardEvent<HTMLInputElement>) {
    // ⚠ STAAT HET TOEVOEGPANEELTJE OPEN, DAN BEDIENT DIT VELD NIETS MEER.
    //
    // De voorstellenlijst is dan van het scherm (zie hieronder), maar de
    // toetsafhandeling bleef doorlopen op de lijst die er niet meer stond. Tik je
    // dan hierboven nog één letter en druk je Enter of Tab, dan koos de app een
    // voorstel dat je niet zag, sloot het paneeltje en gooide alles weg wat je er
    // net had ingetikt — zonder een woord. Precies dezelfde val als de chips die
    // achter het paneeltje bleven staan, maar dan met het toetsenbord.
    //
    // Escape hoort hier wél afgehandeld te worden, en te STOPPEN: liet je hem
    // doorlopen, dan kwam hij bij het boekingsvenster terecht en vroeg de app of je
    // je hele boeking mocht weggooien.
    if (nieuweNaam !== null) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        sluitPaneel()
        return
      }
      // ⚠ ENTER MOET HIER TEGENGEHOUDEN WORDEN, NIET LOSGELATEN.
      // Alleen "niets kiezen" volstaat niet: laat je Enter gewoon doorlopen, dan doet
      // de browser wat hij in een formulier standaard doet en VERZENDT hij de boeking
      // — zonder categorie, met het paneeltje en al je typewerk erbij in. Dat is
      // precies dezelfde schade, langs de achterdeur.
      if (e.key === 'Enter') e.preventDefault()
      // Tab laten we wél door: die brengt de focus netjes ín het paneeltje.
      return
    }
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
      // Ook hier stoppen: de lijst sluiten is een handeling op zich, en het venster
      // eromboven hoeft niet te vragen of je je boeking mag weggooien.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="veldgroep">
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="label-caps">{t('Categorie:')}</span>{' '}
        {/* De padregel onderaan beschrijft déze waarde. Zonder deze koppeling hoort
            wie de app laat voorlezen die regel als een losse zin, drie elementen
            verderop, zonder dat iets zegt waar ze bij hoort. */}
        <strong aria-describedby={padOnderKeuze && nieuweNaam === null ? padId : undefined}>
          {gekozenLabel ?? t('Geen')}
        </strong>
        {/* ⚠ Ook deze knop verdwijnt zolang het paneeltje openstaat. Hij doet exact
            wat de chips deden die we al weghaalden: één tik en je nieuwe tak is weg,
            plus je zoekterm, zonder een woord uitleg. */}
        {waarde && nieuweNaam === null && (
          <button
            type="button"
            // ⚠ RONDE 86 — dezelfde correctie als in `ItemZoeker`, en om dezelfde reden:
            // wissen is hier RECHTZETTEN, niet weggooien. Zie `.knop-terzijde` in index.css.
            className="knop knop-ghost knop-klein knop-terzijde"
            // Meteen weer in het zoekveld staan. Wie zich vergist ("Brood (wit)"
            // moest "Brood (bruin)" zijn) kan zo doortypen in plaats van eerst het
            // veld te moeten aanwijzen.
            onClick={() => {
              kies(undefined)
              zoekRef.current?.focus()
            }}
          >
            {t('opnieuw kiezen')}
          </button>
        )}
      </p>
      {/* Het invoerveld en de voorstellenlijst zitten samen in een eigen laagje.
          Hing de lijst aan de hele veldgroep, dan duwden de traplagen eronder haar
          honderden pixels omlaag — met het toetsenbord open vaak buiten beeld. */}
      <div style={{ position: 'relative' }}>
      <input
        ref={zoekRef}
        aria-label={t('Zoek een categorie of subcategorie')}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        role="combobox"
        // ⚠ Alle drie deze koppelingen moeten meedoen met `nieuweNaam === null`.
        // Anders meldt voorleessoftware een uitgeklapte keuzelijst die niet meer op
        // het scherm staat, en wijzen `aria-controls`/`aria-activedescendant` naar
        // id's die niet in het document bestaan.
        aria-expanded={open && aantalRegels > 0 && nieuweNaam === null}
        aria-autocomplete="list"
        // Zonder deze twee koppelingen is de zoeker voor wie de app laat voorlezen
        // stil: de focus blijft in het veld staan, dus pijltje-omlaag verplaatst
        // alleen een markering die niemand hoort. `aria-controls` wijst naar de
        // lijst, `aria-activedescendant` naar de regel die nu gemarkeerd is.
        aria-controls={open && aantalRegels > 0 && nieuweNaam === null ? lijstId : undefined}
        aria-activedescendant={
          open && aantalRegels > 0 && nieuweNaam === null ? `${lijstId}-${gemarkeerd}` : undefined
        }
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
      {/* ⚠ Het paneeltje hoort BINNEN dit laagje. Stond het erbuiten, dan had
          `top: 100%` niets om zich aan te meten: het zocht dan het eerste blok
          erboven met een eigen positie — in een boekingsvenster is dat het venster
          zélf, dus het paneeltje verscheen onderaan de hele popup in plaats van
          onder het zoekveld. */}
      {nieuweNaam !== null && (
        <NieuweSubcategoriePaneel
          // Niet `nieuweNaam`: die is een momentopname van bij het openen. Het veld
          // erboven blijft bewerkbaar, dus wat je typt en wat je krijgt moeten
          // dezelfde tekst zijn.
          naam={getypt}
          hoofdIdInBeeld={hoofdInBeeld}
          categorieIdInBeeld={categorieInBeeld}
          eigenCategorieen={gebruikerCategorieen}
          onBevestig={bewaarNieuwe}
          onAnnuleer={sluitPaneel}
          onBezig={(bezig) => {
            paneelBezigRef.current = bezig
          }}
        />
      )}
      </div>
      {/* ⚠ RONDE 67 — EEN AFGEMAAKTE KEUZE IS GEEN VRAAG MEER.
          Koos je een bestaande subcategorie, dan bleven hier de knop met de
          hoofdcategorie én twee rijen chips staan. Dat leest als een uitnodiging om
          nog iets te kiezen, terwijl je net klaar was: Timothy's woorden waren dat
          het "lijkt alsof het de keuze biedt dat die dan manueel gewijzigd kan
          worden". Voor een subcategorie staat er nu één regel die zegt waar ze
          hangt — meer valt er onderaan de boom niet te kiezen.

          Bij een HOOFDcategorie of een categorie blijven de chips wél staan: daar is
          de laag eronder de logische volgende stap ("Subcategorie (optioneel)").

          ⚠ En zolang het toevoegpaneeltje openstaat, staat hier NIETS. Het paneeltje
          zweeft over de chips heen, maar zwevend is niet hetzelfde als weg: één tik
          op een chip die je niet meer zag, koos een categorie, sloot het paneeltje
          en gooide alles weg wat je er net had ingevuld — zonder een woord. Boven-
          dien stonden er dan twee bedieningen met bijna dezelfde naam tegelijk op
          het scherm ("Hoofdcategorie" in het paneeltje, "Hoofdcategorie: Voeding"
          eronder), en dat is precies wat voorleessoftware onbruikbaar maakt. */}
      {/* ⚠ `visibility: hidden` en niet weghalen. Onzichtbaar is hier precies genoeg:
          een verborgen vlak is niet aan te klikken, niet met Tab te bereiken én niet
          te horen voor voorleessoftware — maar het houdt wél zijn plaats. Haalden we
          de chips echt weg, dan klapte er tot driehonderd pixels dicht op het moment
          dat het paneeltje opengaat, schoof het hele formulier eronder omhoog, en
          sprong het bij Annuleer weer terug. */}
      <div data-keuzevak style={{ visibility: nieuweNaam === null ? 'visible' : 'hidden' }}>
        {padOnderKeuze ? (
          <p className="rij-meta" id={padId} style={{ margin: 0 }} data-categoriepad>
            {padOnderKeuze}
          </p>
        ) : (
          <>
            <HoofdcategorieChips
              actiefId={hoofdInBeeld}
              onKies={(id) => kies(id)}
              eigenCategorieen={gebruikerCategorieen}
              voorkeurId={voorkeurId}
            />
            {/* Doorklikken in plaats van typen: zodra er een hoofdcategorie staat,
                verschijnen de categorieën eronder, en daarna de subcategorieën. */}
            <CategorieTrap waarde={waarde} onKies={(id) => kies(id)} />
          </>
        )}
      </div>
      <p role="status" className="alleen-voorlezen">
        {melding}
      </p>
    </div>
  )
}
