import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'

// Dé popup van de app. Er bestond nog geen enkele: de enige `role="dialog"` in de
// codebase zat hardgecodeerd in de barcodescanner, en de invoer van een transactie
// was een kaart op een pagina waar je eerst naartoe moest navigeren.
//
// Wat een popup écht moet doen om bruikbaar te zijn — en wat een los `div`-je met
// `position: fixed` niet doet:
//  - **Escape sluit.** Altijd, ook wanneer de focus in een invoerveld staat.
//  - **De focus blijft binnen.** Tab loopt rond in de popup in plaats van naar de
//    pagina eronder te ontsnappen, waar je met de tab-toets dingen zou aanklikken
//    die je niet ziet.
//  - **De focus komt terug.** Bij het sluiten gaat hij naar de knop waarmee je de
//    popup opende, zodat je niet bovenaan de pagina belandt.
//  - **De pagina eronder scrollt niet mee.** Anders schuift de achtergrond weg
//    terwijl je in de popup naar beneden veegt.
//  - **Hulpsoftware weet dat de rest weg is.** Vandaar `aria-modal` en een titel
//    die aan de popup hangt.
//
// Vorm: op een breed scherm een gecentreerde kaart, op een telefoon een blad dat
// van onderen komt en de volle breedte neemt — daar is een gecentreerd venstertje
// met marge rondom verspilde ruimte.
// Alles waar de tab-toets normaal op landt.
const FOCUSBAAR =
  'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * De focusbare elementen in tab-volgorde.
 *
 * In een echte browser laten we weggeklapte velden weg — een veld in een gesloten
 * blok mag geen tab-stop zijn. Dat meten we met `getClientRects()`. Maar in de
 * testomgeving (jsdom) doet niets aan layout, dus meet *elk* element als
 * onzichtbaar; daar zou dat filter de hele lijst wegvegen en de focusval stil
 * uitschakelen. Daarom vragen we het paneel eerst of deze omgeving überhaupt
 * layout doet, en filteren we alleen dan.
 */
function focusbareElementen(root: HTMLElement): HTMLElement[] {
  const alle = [...root.querySelectorAll<HTMLElement>(FOCUSBAAR)]
  const doetLayout = root.getClientRects().length > 0 || root.offsetWidth > 0
  if (!doetLayout) return alle
  return alle.filter((el) => el.getClientRects().length > 0)
}

/**
 * Hoeveel hoogte er ECHT nog over is voor de popup, in pixels.
 *
 * Waarom dit nodig is (ronde 34). Op een telefoon neemt het toetsenbord bijna de
 * halve schermhoogte in. Je zou verwachten dat `100dvh` daar rekening mee houdt,
 * maar dat doet het niet: op iOS blijft `dvh` de hoogte van het VENSTER, en het
 * toetsenbord schuift daar gewoon overheen. Het onderste stuk van de popup — met
 * de opslaanknop — verdween daardoor achter het toetsenbord.
 *
 * `window.visualViewport` is het enige dat wél weet wat je nog ziet: het krimpt
 * mee zodra het toetsenbord opengaat en groeit weer wanneer het sluit. We geven
 * die hoogte door als CSS-variabele, zodat de opmaak in index.css blijft staan.
 *
 * Geeft `null` terug wanneer de browser (of de testomgeving) dit niet kent; dan
 * valt de popup terug op haar oude gedrag en is er niets veranderd.
 */
function useZichtbareHoogte(actief: boolean): number | null {
  const [hoogte, setHoogte] = useState<number | null>(null)

  useEffect(() => {
    if (!actief) {
      // Terug op nul bij het sluiten. Zonder dit onthoudt de popup de hoogte van
      // de vórige keer — inclusief het toetsenbord dat toen openstond — en opent
      // ze de volgende keer één beeldje lang half zo hoog.
      setHoogte(null)
      return
    }
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined
    if (!vv) return

    function meet() {
      // `offsetTop` erbij: op iOS schuift het zichtbare venster óók omhoog
      // wanneer het toetsenbord opengaat, en dan is de onderkant van de popup
      // niet waar we ze denken.
      setHoogte(Math.round(vv!.height + vv!.offsetTop))
    }
    meet()
    vv.addEventListener('resize', meet)
    vv.addEventListener('scroll', meet)
    return () => {
      vv.removeEventListener('resize', meet)
      vv.removeEventListener('scroll', meet)
    }
  }, [actief])

  return hoogte
}

/**
 * De popups die op dit moment openstaan, van onder naar boven.
 *
 * Waarom dit op moduleniveau staat (ronde 35): een popup kan in een andere popup
 * zitten. Bekijk je een bon terwijl je een transactie aan het intikken bent, dan
 * staan er twee. Elke popup hing zijn Escape-luisteraar aan `document`, dus één
 * druk op Escape sloot ze ALLEBEI — en dan was je hele boeking weg. En elke popup
 * zette bij het sluiten `body.overflow` terug naar wat zíj bij het openen zag; de
 * binnenste zag 'hidden', dus sloten ze samen, dan kon de pagina daarna niet meer
 * scrollen tot je opnieuw een popup opende.
 *
 * Met deze stapel geldt: alleen de bovenste popup luistert naar Escape, en het
 * scrollslot gaat pas los wanneer de laatste popup dicht is.
 */
type Knoop = { ouder: Knoop | null }
const openePopups: Knoop[] = []

/**
 * Wie is de popup waar je NU in staat? Elke popup geeft zichzelf door, zodat een
 * popup die binnenin getekend wordt weet wie haar ouder is.
 *
 * Waarom niet gewoon kijken wie wie bevat, zoals eerst (ronde 35): sinds elke
 * popup rechtstreeks aan de pagina gehangen wordt (zie de `createPortal` onderaan)
 * staan ze in de HTML naast elkaar in plaats van in elkaar. De familieband moeten
 * we dus zelf bijhouden. Een `useRef`-voorwerp is per popup uniek en blijft
 * bestaan zolang de component leeft; dat is genoeg om ze uit elkaar te houden.
 */
const PopupContext = createContext<Knoop | null>(null)

/** Wat `body.style.overflow` was vóór de eerste popup het scrollen op slot deed. */
let oorspronkelijkeOverflow: string | null = null

function isAfstammeling(kind: Knoop, van: Knoop): boolean {
  for (let k = kind.ouder; k; k = k.ouder) if (k === van) return true
  return false
}

/**
 * Is DEZE popup de bovenste — dus degene die op Escape mag reageren?
 *
 * Twee regels, in deze volgorde:
 *  1. een popup met een open popup ín zich is nooit de bovenste;
 *  2. van wie overblijft, wint de laatst geopende.
 *
 * Regel 1 is er omdat je anders met één druk op Escape ook het formulier eronder
 * sluit — met je halve boeking erin. En bewust niet "de laatst aangemelde wint":
 * React voert de effecten van een KIND uit vóór die van de ouder, dus de binnenste
 * popup meldt zich als eerste aan. Regel 2 vangt het geval van twee popups die
 * naast elkaar staan; zonder die regel voelden ze zich allebei de bovenste en sloot
 * één druk op Escape ze allebei.
 */
function isBovenste(mij: Knoop): boolean {
  const zonderKinderen = openePopups.filter((p) => !openePopups.some((q) => isAfstammeling(q, p)))
  return zonderKinderen[zonderKinderen.length - 1] === mij
}

export function Dialoog({
  titel,
  open,
  onSluiten,
  children,
  /** Optionele vaste voet, bv. met de opslaan-knoppen. Scrollt niet mee. */
  voet,
}: {
  titel: string
  open: boolean
  onSluiten: () => void
  children: ReactNode
  voet?: ReactNode
}) {
  const { t } = useT()
  const paneel = useRef<HTMLDivElement | null>(null)
  const inhoud = useRef<HTMLDivElement | null>(null)
  const vorigeFocus = useRef<HTMLElement | null>(null)
  const titelId = useId()
  const zichtbareHoogte = useZichtbareHoogte(open)
  // `onSluiten` is bij bijna elke oproeper een verse functie per render. Stond ze
  // in de afhankelijkheden van het effect hieronder, dan werd bij ELKE
  // hertekening van de ouder de focusval afgebroken en opnieuw opgezet — met als
  // zichtbaar gevolg dat de cursor middenin het typen terugsprong naar het eerste
  // veld, en dat het schuiven naar het actieve veld stilletjes wegviel. Via een
  // ref blijft de laatste versie beschikbaar zonder het effect te herstarten.
  const sluitRef = useRef(onSluiten)
  sluitRef.current = onSluiten
  // Wie is mijn ouder-popup (of null als ik de eerste ben)? Zie PopupContext.
  const ouder = useContext(PopupContext)
  const knoopRef = useRef<Knoop>({ ouder: null })
  knoopRef.current.ouder = ouder
  const knoop = knoopRef.current

  useEffect(() => {
    if (!open) return

    // Onthoud waar de focus stond, en zet hem in de popup.
    vorigeFocus.current = document.activeElement as HTMLElement | null
    // Waar de focus heen moet, in aflopende voorkeur:
    //  1. het eerste échte invoerveld in de inhoud;
    //  2. anders het eerste focusbare element in de inhoud;
    //  3. anders wat er ook in het paneel te focussen valt.
    //
    // Waarom niet simpelweg "het eerste focusbare element": in de HTML-volgorde is
    // dat het kruisje in de kop, en dan sluit een druk op Enter je popup meteen
    // weer. En in de boekingspopup staan bovenaan vier keuzeknoppen; landt de focus
    // daar, dan moet je alsnog naar het eerste veld tabben voor je kan typen.
    //
    // Is er GEEN invoerveld, dan landt de focus op de inhoud zelf en niet op de
    // eerste knop (ronde 35). Neem de popup die een bewaarde bon toont: daar is de
    // eerste knop "Bewaren op dit toestel". Landde de focus daarop, dan startte
    // één druk op Enter meteen een download, en werd de beschrijving van de foto
    // ("Foto van bon of factuur: …") nooit voorgelezen — je begon eronder. Nu
    // begin je bij wat er te zien is, en breng één keer Tab je naar de knop.
    const inInhoud = inhoud.current ? focusbareElementen(inhoud.current) : []
    const eersteVeld = inInhoud.find((el) => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)
    const eersteFocus = eersteVeld ?? inhoud.current ?? inInhoud[0] ?? (paneel.current ? focusbareElementen(paneel.current)[0] : undefined)
    eersteFocus?.focus()

    // Deze popup bovenop de stapel. De knoop komt uit een ref en verandert nooit
    // van identiteit, dus hij hoort niet in de afhankelijkheden thuis — vandaar dat
    // hij hier uit de ref gelezen wordt en niet van buiten meekomt.
    const sleutel = knoopRef.current
    openePopups.push(sleutel)

    // De pagina eronder mag niet meescrollen. Alleen de EERSTE popup onthoudt de
    // oorspronkelijke waarde; de rest zou 'hidden' onthouden en die bij het sluiten
    // terugzetten.
    //
    // Die waarde staat BUITEN de component (ronde 35). Ze stond eerst in deze
    // functie, en dan ging het mis wanneer twee popups tegelijk verdwenen — wat
    // gebeurt als een formulier vastloopt terwijl er een bon openstaat. React ruimt
    // dan eerst de buitenste op: die zag de binnenste nog in de stapel staan en
    // liet het scrollslot dus liggen; de binnenste had de oorspronkelijke waarde
    // niet en liet het óók liggen. Gevolg: de app scrolde daarna nergens meer, tot
    // je ze afsloot en opnieuw opende. Met de waarde buiten de component kan wie er
    // ook als laatste opruimt, hem terugzetten.
    if (openePopups.length === 1) {
      oorspronkelijkeOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    function opToets(e: KeyboardEvent) {
      // Alleen de bovenste popup mag op Escape reageren. Anders sluit één druk
      // ook de popup eronder — met je halve boeking erin.
      if (!isBovenste(sleutel)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        sluitRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Focus-val: bereken bij elke Tab opnieuw wie er te focussen valt, want de
      // inhoud verandert (een keuzelijst klapt open, een veld verschijnt).
      if (!paneel.current) return
      const kandidaten = focusbareElementen(paneel.current)
      if (kandidaten.length === 0) return
      const eerste = kandidaten[0]
      const laatste = kandidaten[kandidaten.length - 1]
      if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault()
        eerste.focus()
      } else if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault()
        laatste.focus()
      }
    }

    // Zodra je in een veld tikt, schuift de popup naar dat veld toe. Zonder dit
    // staat de cursor achter het toetsenbord en typ je blind. `block: 'nearest'`
    // schuift zo weinig mogelijk: staat het veld al in beeld, dan beweegt er niets.
    //
    // Drie voorzorgen die er niet uit mogen:
    //  - ÉÉN timer die telkens gewist wordt. Vijf keer snel tabben zou anders
    //    vijf zachte schuifbewegingen tegelijk starten, en dan schokt het beeld.
    //  - de timer wordt ook bij het sluiten gewist, zodat er nooit geschoven
    //    wordt naar iets wat er niet meer is.
    //  - een bestaanscheck op `scrollIntoView`: die functie bestaat niet in de
    //    testomgeving, en een fout in een timer valt buiten elke test — dat zet
    //    de hele suite op rood zonder dat je ziet waarom.
    let schuifTimer: ReturnType<typeof setTimeout> | undefined
    function opFocus(e: FocusEvent) {
      const doel = e.target
      if (!(doel instanceof HTMLElement)) return
      // Het hele paneel, niet enkel de inhoud: een knop in de vaste voet is juist
      // het deel dat achter het toetsenbord verdwijnt.
      if (!paneel.current?.contains(doel)) return
      if (schuifTimer) clearTimeout(schuifTimer)
      // Wachten tot het toetsenbord er echt is; anders rekent de browser met de
      // hoogte van vóór het openschuiven.
      schuifTimer = setTimeout(() => {
        if (typeof doel.scrollIntoView !== 'function' || !doel.isConnected) return
        // Zacht schuiven, tenzij iemand beweging heeft uitgezet. Een
        // CSS-mediaquery bereikt een scroll uit JavaScript niet, dus dat moet
        // hier expliciet.
        const rustig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        doel.scrollIntoView({ block: 'nearest', behavior: rustig ? 'auto' : 'smooth' })
      }, 220)
    }

    document.addEventListener('keydown', opToets)
    document.addEventListener('focusin', opFocus)
    return () => {
      document.removeEventListener('keydown', opToets)
      document.removeEventListener('focusin', opFocus)
      if (schuifTimer) clearTimeout(schuifTimer)
      const plek = openePopups.lastIndexOf(sleutel)
      if (plek >= 0) openePopups.splice(plek, 1)
      // Pas losmaken wanneer er geen enkele popup meer openstaat — door wie dan
      // ook als laatste opruimt.
      if (openePopups.length === 0 && oorspronkelijkeOverflow !== null) {
        document.body.style.overflow = oorspronkelijkeOverflow
        oorspronkelijkeOverflow = null
      }
      // Terug naar de knop waarmee de popup geopend werd.
      vorigeFocus.current?.focus?.()
    }
    // Bewust ALLEEN `open`: zie de opmerking bij `sluitRef`.
  }, [open])

  if (!open) return null

  // De popup wordt rechtstreeks aan `document.body` gehangen (ronde 35).
  //
  // Waarom: `position: fixed` gaat uit van het scherm — behalve wanneer er ergens
  // boven het element een `transform` staat, want dan wordt dát element het
  // referentiekader. De pagina's van de app schuiven bij het wisselen van tabblad
  // kort omhoog, en dat is een transform. Opende je in die halve seconde een bon,
  // dan hing de popup aan de pagina in plaats van aan het scherm: gemeten stond de
  // titelbalk mét de sluitknop bóven het scherm, en het donkere vlak dekte de
  // pagina niet meer af — een tik ernaast belandde op de knoppen eronder.
  //
  // Aan `body` hangen haalt de popup onder élke transform vandaan, nu en in de
  // toekomst. De prijs is dat geneste popups niet meer ín elkaar staan; daarvoor is
  // PopupContext hierboven.
  const laag = (
    <div
      className="dialoog-laag"
      onClick={onSluiten}
      // De laag zelf krimpt mee met wat er zichtbaar is. Daardoor blijft het blad
      // met de knoppen bóven het toetsenbord in plaats van erachter.
      style={zichtbareHoogte !== null ? { height: zichtbareHoogte } : undefined}
    >
      <div
        className="dialoog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        ref={paneel}
        // Een klik ín de popup mag niet als "buiten" gelden.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialoog-kop">
          <h2 className="kaart-titel" id={titelId}>
            {titel}
          </h2>
          <button type="button" className="knop knop-kaal" aria-label={t('Sluiten')} onClick={onSluiten}>
            ×
          </button>
        </div>

        {/* `tabIndex={-1}`: het vak kan de focus krijgen wanneer er geen
            invoerveld is, maar het komt niet in de tab-volgorde te staan. */}
        <div className="dialoog-inhoud" ref={inhoud} tabIndex={-1}>
          {children}
        </div>

        {voet && <div className="dialoog-voet">{voet}</div>}
      </div>
    </div>
  )

  return <PopupContext.Provider value={knoop}>{createPortal(laag, document.body)}</PopupContext.Provider>
}
