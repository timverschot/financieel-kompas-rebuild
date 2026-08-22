import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useT } from '../i18n'
import type { Melding, MeldingPagina } from '../utils/meldingen'
import type { BudgetTab } from '../utils/budgettab'
import type { DossierSoort } from '../utils/dossiersoort'

// Het belletje in de bovenbalk, mét een echt paneel eronder.
//
// Wat er verandert t.o.v. voorheen:
//  1. Het belletje stond alleen in de desktopweergave. Op een telefoon kreeg je
//     dus nooit een signaal dat een budget bijna op was. Nu staat dezelfde bel op
//     élk schermformaat, met exact dezelfde inhoud.
//  2. Klikken sprong meteen naar de budgetpagina, ook als de melding over iets
//     anders ging. Nu zie je eerst wát er is, en kies je zelf.
//
// De lijst met meldingen komt van buiten (utils/meldingen.ts). Deze component
// rekent niets uit; ze toont enkel.

const paneel: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  // `100vw` telt de veilige zones aan de zijkanten MEE, terwijl body die er al
  // afhaalt. In liggende stand op een iPhone werd het paneel daardoor zo'n 64 px
  // te breed en liep het links buiten beeld. `dvw` bestaat niet overal, dus
  // trekken we de insets er zelf af.
  width: 'min(320px, calc(100vw - 32px - env(safe-area-inset-left) - env(safe-area-inset-right)))',
  maxHeight: 340,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  zIndex: 1200,
  boxShadow: 'var(--shadow-sheet)',
  textAlign: 'left',
}

const meldingKnop: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '10px 4px',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--rij-lijn)',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'var(--text)',
  font: 'inherit',
  fontSize: 'var(--tekst-s)',
  lineHeight: 1.35,
}

export function Meldingenbel({
  meldingen,
  onGaNaar,
  onBoekVasteLast,
}: {
  meldingen: Melding[]
  /**
   * De tweede parameter zegt welke lade op die pagina open moet (de Dossiers-pagina
   * heeft er drie). Ontbreekt ze, dan verandert er niets aan de lade. De vierde doet
   * hetzelfde voor de drie tabbladen van de Budget-pagina (ronde 64).
   */
  onGaNaar: (pagina: MeldingPagina, subtab?: DossierSoort, dossierId?: string, budgettab?: BudgetTab) => void
  /**
   * Een vaste last meteen inboeken vanuit het paneel. Zonder deze prop gedraagt de
   * bel zich zoals voorheen: elke melding brengt je enkel naar een pagina.
   */
  onBoekVasteLast?: (postId: string) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const aantal = meldingen.length

  const belKnop = useRef<HTMLButtonElement | null>(null)

  // Escape sluit het paneel. Overal elders in de app doet die toets dat al (de
  // popups, de 'Meer'-lade); hier deed hij niets, en dan moet je met de muis of je
  // vinger precies naast het paneel mikken om ervan af te raken.
  //
  // ⚠ En de focus gaat mee terug naar het belletje (ronde 61). Zonder die regel
  // sloot Escape het paneel wel, maar viel je focus terug naar het begin van de
  // pagina — je was kwijt waar je was. De 'Meer'-lade doet dit al zo.
  useEffect(() => {
    if (!open) return
    function opToets(e: KeyboardEvent) {
      // ⚠ Niet reageren wanneer er een popup bovenop staat (tweede nakijkronde
      // ronde 64). Boek je vanuit dit paneel een vaste last in en stelt de app dan
      // een vraag, dan sloot één druk op Escape allebei tegelijk — het paneel klapte
      // dicht en je zag niet meer wat er met de vraag gebeurd was.
      if (document.querySelector('[aria-modal="true"]')) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        belKnop.current?.focus()
      }
    }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  }, [open])

  function kies(pagina: MeldingPagina, subtab?: DossierSoort, dossierId?: string, budgettab?: BudgetTab) {
    setOpen(false)
    onGaNaar(pagina, subtab, dossierId, budgettab)
  }

  function boek(postId: string) {
    // Het paneel blijft open: heb je er drie staan, dan wil je ze na elkaar
    // wegwerken zonder telkens opnieuw op het belletje te duwen.
    onBoekVasteLast?.(postId)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Ronde 32: de bel is groter en spreekt.
          Ze was een grijze 34×34-icoonknop met een stipje van 8 px in de hoek —
          precies zoals de knopjes ‹ › ✎ elders in de app, dus niets onderscheidde
          "er is nieuws" van "hier kan je bladeren". Nu:
            - een grotere knop met een groter belletje;
            - géén stipje maar een echt TELLERTJE, zodat je ziet hoeveel er is;
            - amber van rand en kleur zodra er iets staat, rood als het dringend is;
            - een zachte klop van twee seconden om de aandacht te trekken. Die stopt
              vanzelf (drie keer) en blijft dus niet eeuwig bewegen. */}
      <button
        ref={belKnop}
        className={aantal > 0 ? 'knop knop-icoon bel bel-actief' : 'knop knop-icoon bel'}
        aria-label={aantal > 0 ? t('Meldingen ({n})', { n: aantal }) : t('Meldingen')}
        aria-expanded={open}
        // ⚠ GEEN `aria-haspopup` (ronde 61, na de nakijkronde). Er stond `"dialog"`, en
        // dat belooft een venster met een focusval dat hier bewust niet bestaat — zie
        // de opmerking bij het paneel hieronder. `"true"` is volgens de norm hetzelfde
        // als `"menu"`, dus dat ruilt de ene verkeerde belofte in voor de andere: dit
        // is ook geen menu. `aria-expanded` hieronder zegt al precies wat er gebeurt.
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className={aantal > 0 && !open ? 'bel-teken bel-klop' : 'bel-teken'}>
          🔔
        </span>
        {aantal > 0 && (
          // Rood zodra er iets dringend is, anders de gewone amberen stip. De
          // kleuren staan in index.css, want de letterkleur moet met de
          // achtergrond én met het thema meewisselen om leesbaar te blijven.
          <span
            aria-hidden
            className={meldingen.some((m) => m.dringend) ? 'bel-teller bel-teller-dringend' : 'bel-teller'}
          >
            {aantal > 9 ? '9+' : aantal}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Klikken naast het paneel sluit het. Bewust géén dialog/modal: dit is
              een informatief lijstje, niet een taak die je moet afmaken. */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
            aria-hidden
          />
          <div className="kaart kaart-compact" style={paneel} data-meldingen>
            <p className="label-caps" style={{ margin: '0 4px 6px' }}>
              {t('Meldingen')}
            </p>
            {aantal === 0 ? (
              <p className="leeg" style={{ margin: 0 }}>
                {/* ⚠ RONDE 66, slotronde — DEZE ZIN MAG NIETS BEVESTIGEN EN NIETS
                    BELOVEN. Ze zei eerst "Al je budgetten en garanties zijn in orde":
                    een oordeel over nul garanties zodra je één budget had, en stil
                    over de zes andere dingen die deze bel bekijkt (vaste lasten,
                    contracten, onderhoudsbijdragen, de maandafsluiting, de back-up).
                    Mijn eerste herstel wisselde tussen twee zinnen op basis van wat er
                    ingesteld was — maar dan belooft de ene zin stilte over dingen die
                    de bel wél in de gaten houdt. Eén zin die alleen zegt wat er ís,
                    plus een voorbeeld van wat er kán komen, is het enige eerlijke. */}
                {t('Niets om te melden. Zodra er iets je aandacht nodig heeft — een budget dat vol raakt, een garantie die afloopt, een vaste last die nog niet geboekt is — zie je het hier.')}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {meldingen.map((m, i) => {
                  const kanBoeken = m.actie?.soort === 'boek-vastelast' && onBoekVasteLast
                  return (
                    <li
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        borderBottom: i === aantal - 1 ? 'none' : '1px solid var(--rij-lijn)',
                      }}
                    >
                      {/* De tekst brengt je naar de pagina; de knop ernaast doet het
                          werk meteen. Bewust twee losse knoppen naast elkaar: een
                          knop in een knop bestaat niet in HTML. */}
                      <button
                        type="button"
                        onClick={() => kies(m.pagina, m.subtab, m.dossierId, m.budgettab)}
                        style={{ ...meldingKnop, borderBottom: 'none', flex: 1, minWidth: 0 }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            marginTop: 5,
                            flexShrink: 0,
                            background: m.dringend ? 'var(--negative)' : 'var(--accent-dot)',
                          }}
                        />
                        <span>{t(m.sleutel, m.params)}</span>
                      </button>
                      {kanBoeken && m.actie && (
                        <button
                          type="button"
                          className="knop knop-secundair knop-klein"
                          style={{ flexShrink: 0 }}
                          onClick={() => boek(m.actie!.postId)}
                        >
                          {t('Boek in')}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
