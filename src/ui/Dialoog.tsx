import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
    const inInhoud = inhoud.current ? focusbareElementen(inhoud.current) : []
    const eersteVeld = inInhoud.find((el) => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)
    const eersteFocus = eersteVeld ?? inInhoud[0] ?? (paneel.current ? focusbareElementen(paneel.current)[0] : undefined)
    eersteFocus?.focus()

    // De pagina eronder mag niet meescrollen.
    const vorigeOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function opToets(e: KeyboardEvent) {
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
      document.body.style.overflow = vorigeOverflow
      // Terug naar de knop waarmee de popup geopend werd.
      vorigeFocus.current?.focus?.()
    }
    // Bewust ALLEEN `open`: zie de opmerking bij `sluitRef`.
  }, [open])

  if (!open) return null

  return (
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

        <div className="dialoog-inhoud" ref={inhoud}>
          {children}
        </div>

        {voet && <div className="dialoog-voet">{voet}</div>}
      </div>
    </div>
  )
}
