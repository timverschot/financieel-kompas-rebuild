import { useEffect, useId, useRef, type ReactNode } from 'react'
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
        onSluiten()
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

    document.addEventListener('keydown', opToets)
    return () => {
      document.removeEventListener('keydown', opToets)
      document.body.style.overflow = vorigeOverflow
      // Terug naar de knop waarmee de popup geopend werd.
      vorigeFocus.current?.focus?.()
    }
  }, [open, onSluiten])

  if (!open) return null

  return (
    <div className="dialoog-laag" onClick={onSluiten}>
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
