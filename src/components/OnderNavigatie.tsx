import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useT } from '../i18n'

// De pagina's van de app. De interne id blijft taal-onafhankelijk; enkel het label
// wordt vertaald. Sinds de layout-herwerking (V1-logica) is elk onderdeel een
// aparte pagina i.p.v. één lange 'Meer'-scroll.
export type Pagina =
  | 'overzicht'
  | 'transacties'
  | 'rekeningen'
  | 'spaardoelen'
  | 'budget'
  | 'dossiers'
  | 'analyse'
  | 'categorieen'
  | 'rekenhulpen'
  | 'instellingen'

// Alle pagina's met icoon + label, in de volgorde van het desktop-zijpaneel.
export const PAGINAS: { id: Pagina; icoon: string; label: string }[] = [
  { id: 'overzicht', icoon: '🏠', label: 'Overzicht' },
  { id: 'transacties', icoon: '💳', label: 'Transacties' },
  { id: 'rekeningen', icoon: '🏦', label: 'Rekeningen' },
  { id: 'spaardoelen', icoon: '💰', label: 'Spaardoelen' },
  { id: 'budget', icoon: '🎯', label: 'Budget' },
  // Eén ingang voor alle dossiers. Leningen en garanties stonden vroeger op een
  // eigen pagina 'leningen' die niets meer was dan twee secties onder elkaar; ze
  // zitten nu als subtab op déze pagina. Zie `ui/Subtabs.tsx`.
  { id: 'dossiers', icoon: '👨‍👧', label: 'Dossiers' },
  { id: 'analyse', icoon: '📊', label: 'Analyse' },
  { id: 'categorieen', icoon: '🏷️', label: 'Categorieën' },
  { id: 'rekenhulpen', icoon: '🧮', label: 'Rekenhulpen' },
  { id: 'instellingen', icoon: '⚙️', label: 'Instellingen' },
]

// Op mobiel: vier tabs + een centrale ➕ (V1-patroon). Links van de knop Overzicht
// en Transacties, rechts Analyse, en dan Meer. De rest zit onder 'Meer'.
const PRIMAIR_LINKS: Pagina[] = ['overzicht', 'transacties']
const PRIMAIR_RECHTS: Pagina[] = ['analyse']
const SECUNDAIR: Pagina[] = ['rekeningen', 'spaardoelen', 'budget', 'dossiers', 'categorieen', 'rekenhulpen', 'instellingen']

const balk: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  zIndex: 900,
  // De balk hoort tot de randen door te lopen, maar de knoppen erin niet: in
  // liggende stand liggen de buitenste anders onder de afgeronde hoeken.
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
  // Ronde 34: de balk verdween op een echte iPhone tijdens het scrollen en kwam
  // niet meer terug. Twee dingen helpen daartegen, en ze staan hier allebei:
  //  - `transform` (in plaats van bv. `bottom` verzetten) zodat het wegschuiven
  //    op de grafische kaart gebeurt en niet op de hoofdrekenkern;
  //  - `willChange` + `translateZ(0)` zodat de browser de balk in een eigen laag
  //    zet en niet bij elke scrollstap opnieuw hoeft te tekenen. Dat laatste is
  //    precies waar Safari op iOS de mist in ging.
  transition: 'transform 220ms ease',
  willChange: 'transform',
}

/**
 * Is de onderbalk zichtbaar?
 *
 * Het gedrag dat gevraagd is: scroll je naar BENEDEN, dan schuift de balk weg
 * zodat je meer van de lijst ziet. Scroll je omhoog, of stop je gewoon met
 * scrollen, dan komt hij terug.
 *
 * Drie details die het verschil maken tussen "werkt" en "irritant":
 *  - een DREMPEL van 24 px die OPGETELD wordt sinds de laatste richtingswissel.
 *    Dat laatste is het belangrijkste detail: een scroll-gebeurtenis vuurt per
 *    beeldframe, en bij normaal leestempo is dat maar zo'n 5 px per keer. Zou je
 *    elke gebeurtenis los tegen de drempel houden, dan haalde rustig scrollen
 *    hem nooit en verdween de balk alleen bij een snelle veeg — wat als
 *    willekeurig gedrag overkomt;
 *  - bovenaan de pagina (< 80 px) staat hij altijd; daar is niets te winnen;
 *  - hij komt vanzelf terug zodra je 260 ms niet meer scrolt. Dat is wat
 *    "zodra ik stop met scrollen" betekent, en het is ook het vangnet voor het
 *    geval een scrollbeweging halverwege wordt afgebroken. Bewust LANGER dan de
 *    220 ms van de animatie: anders krijgt een korte veeg het bevel "kom terug"
 *    terwijl de balk nog halverwege naar beneden is, en zie je hem stuiteren.
 */
const DREMPEL = 24
const TERUG_NA = 260

function useBalkZichtbaar(altijdTonen: boolean): boolean {
  const [zichtbaar, setZichtbaar] = useState(true)
  const vorigeY = useRef(0)
  // Hoeveel er sinds de laatste richtingswissel in één richting geschoven is.
  const opgeteld = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let stopTimer: ReturnType<typeof setTimeout> | undefined

    function opScroll() {
      const y = window.scrollY
      const stap = y - vorigeY.current
      vorigeY.current = y

      // Van richting veranderd? Dan begint het optellen opnieuw.
      if (stap === 0) return
      if (Math.sign(stap) !== Math.sign(opgeteld.current)) opgeteld.current = 0
      opgeteld.current += stap

      if (y < 80) {
        setZichtbaar(true)
        opgeteld.current = 0
      } else if (opgeteld.current > DREMPEL) {
        setZichtbaar(false)
      } else if (opgeteld.current < -DREMPEL) {
        setZichtbaar(true)
      }

      // Stoppen met scrollen brengt hem terug — en zet de teller op nul. Dat
      // laatste is nodig: zonder reset telt de volgende beweging verder op de
      // vorige door, en dan verdwijnt de balk al na één klein stapje.
      if (stopTimer) clearTimeout(stopTimer)
      stopTimer = setTimeout(() => {
        opgeteld.current = 0
        setZichtbaar(true)
      }, TERUG_NA)
    }

    vorigeY.current = window.scrollY
    window.addEventListener('scroll', opScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', opScroll)
      if (stopTimer) clearTimeout(stopTimer)
    }
  }, [])

  // Staat de 'Meer'-lade open, dan mag de balk nooit wegschuiven: dan zou het
  // paneel dat eruit komt met scherm en al verdwijnen terwijl je erin kiest.
  return altijdTonen || zichtbaar
}
const binnen: CSSProperties = { maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'stretch' }
// Tik-doel van een tab: ruim boven de 44 px die een duim nodig heeft.
const tabKnop: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  background: 'none',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '0.45rem 0 0.4rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  minHeight: 56,
}
// De 'Meer'-lijst is een sheet: afgeronde bovenhoeken en de sheet-schaduw.
const sheet: CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  padding: '0.4rem',
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
  boxShadow: 'var(--shadow-sheet)',
}

function Tab({
  icoon,
  label,
  aan,
  onClick,
  gemarkeerd,
  uitgeklapt,
  bedient,
  knopRef,
}: {
  icoon: string
  label: string
  /** Kleurt de tab op. Bij 'Meer' ook wanneer de lade openstaat. */
  aan: boolean
  onClick: () => void
  /** Is dit ECHT de huidige pagina? Alleen dan hoort `aria-current`. */
  gemarkeerd?: boolean
  /** Voor een tab die iets opent: staat het open? */
  uitgeklapt?: boolean
  /** De id van wat deze tab opent. */
  bedient?: string
  knopRef?: React.Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={knopRef}
      type="button"
      onClick={onClick}
      // `aria-current` zegt "hier ben je nu". Dat is iets anders dan "deze knop
      // staat aan omdat er een lade openstaat" — daarvoor is `aria-expanded`.
      aria-current={(gemarkeerd ?? aan) ? 'page' : undefined}
      aria-expanded={uitgeklapt}
      aria-controls={bedient}
      aria-label={label}
      style={{ ...tabKnop, color: aan ? 'var(--accent-strong)' : 'var(--text-muted)' }}
    >
      <span style={{ fontSize: '1.3rem', lineHeight: 1, opacity: aan ? 1 : 0.7 }} aria-hidden>
        {icoon}
      </span>
      <span style={{ fontSize: 'var(--tekst-s)', fontWeight: aan ? 600 : 400 }}>{label}</span>
    </button>
  )
}

export function OnderNavigatie({
  actief,
  onKies,
  onNieuweTransactie,
}: {
  actief: Pagina
  onKies: (p: Pagina) => void
  onNieuweTransactie: () => void
}) {
  const { t } = useT()
  const [meerOpen, setMeerOpen] = useState(false)
  // Staat de focus ergens ín de balk? Dan mag hij niet wegschuiven: wie met de
  // tab-toets navigeert zou anders op een knop landen die buiten beeld staat.
  const [focusBinnen, setFocusBinnen] = useState(false)
  const meerKnop = useRef<HTMLButtonElement | null>(null)
  const meerAan = SECUNDAIR.includes(actief) || meerOpen
  const zichtbaar = useBalkZichtbaar(meerOpen || focusBinnen)
  const kies = (p: Pagina) => {
    setMeerOpen(false)
    onKies(p)
  }

  // Escape sluit de lade en geeft de focus terug aan de knop waarmee je hem
  // opende. Zonder dit kan wie met een toetsenbord werkt de lade niet meer weg.
  useEffect(() => {
    if (!meerOpen) return
    function opToets(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setMeerOpen(false)
      meerKnop.current?.focus()
    }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  }, [meerOpen])

  return (
    <>
      {/* Het donkere vlak achter de 'Meer'-lade staat BUITEN de <nav>, en dat is
          geen stijlkwestie maar noodzaak: sinds de balk een `transform` draagt
          (om weg te kunnen schuiven) is zij het referentiekader voor alles wat
          erbinnen `position: fixed` is. Een vlak met `inset: 0` bedekte daardoor
          niet meer het scherm maar alleen de balk zelf — en dan verduistert het
          niets én sluit een tik ernaast de lade niet meer. */}
      {meerOpen && (
        <div
          data-meer-laag
          onClick={() => setMeerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'var(--sidebar-bg)', opacity: 0.35, zIndex: 890 }}
          aria-hidden
        />
      )}

      <nav
        style={{
          ...balk,
          // 110 % in plaats van 100 %: de schaduw van de balk mag ook mee weg,
          // anders blijft er een grijze zweem onderaan het scherm hangen.
          transform: zichtbaar ? 'translateZ(0)' : 'translate3d(0, 110%, 0)',
        }}
        className="kompal-bottombar"
        aria-label={t('Hoofdnavigatie')}
        onFocusCapture={() => setFocusBinnen(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusBinnen(false)
        }}
      >
        {meerOpen && (
          <div style={sheet} id="meer-lade" role="group" aria-label={t('Meer pagina\'s')}>
            {SECUNDAIR.map((id) => {
              const p = PAGINAS.find((x) => x.id === id)!
              const aan = id === actief
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => kies(id)}
                  aria-label={t(p.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    minHeight: 44,
                    padding: '0.7rem 0.9rem',
                    background: aan ? 'var(--accent-soft)' : 'none',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: aan ? 'var(--accent-strong)' : 'var(--text)',
                    fontSize: '0.95rem',
                    fontWeight: aan ? 600 : 400,
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }} aria-hidden>
                    {p.icoon}
                  </span>
                  {t(p.label)}
                </button>
              )
            })}
          </div>
        )}

        <div style={binnen}>
        {PRIMAIR_LINKS.map((id) => {
          const p = PAGINAS.find((x) => x.id === id)!
          return <Tab key={id} icoon={p.icoon} label={t(p.label)} aan={id === actief} onClick={() => kies(id)} />
        })}

        {/* Centrale ➕ — nieuwe transactie, altijd één tik weg */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onNieuweTransactie}
            aria-label={t('Nieuwe transactie')}
            style={{
              width: 52,
              height: 52,
              marginTop: -22,
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: 'var(--accent-dot)',
              color: 'var(--sidebar-bg)',
              fontFamily: 'inherit',
              fontSize: '1.7rem',
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-zwevend)',
            }}
          >
            +
          </button>
        </div>

        {PRIMAIR_RECHTS.map((id) => {
          const p = PAGINAS.find((x) => x.id === id)!
          return <Tab key={id} icoon={p.icoon} label={t(p.label)} aan={id === actief} onClick={() => kies(id)} />
        })}

          <Tab
            icoon="⋯"
            label={t('Meer')}
            aan={meerAan}
            gemarkeerd={SECUNDAIR.includes(actief)}
            uitgeklapt={meerOpen}
            bedient={meerOpen ? 'meer-lade' : undefined}
            knopRef={meerKnop}
            onClick={() => setMeerOpen((o) => !o)}
          />
        </div>
      </nav>
    </>
  )
}
