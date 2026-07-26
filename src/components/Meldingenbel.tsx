import { useState, type CSSProperties } from 'react'
import { useT } from '../i18n'
import type { Melding, MeldingPagina } from '../utils/meldingen'

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
  width: 'min(320px, calc(100vw - 32px))',
  maxHeight: 340,
  overflowY: 'auto',
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
  fontSize: 13,
  lineHeight: 1.35,
}

export function Meldingenbel({
  meldingen,
  onGaNaar,
}: {
  meldingen: Melding[]
  onGaNaar: (pagina: MeldingPagina) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const aantal = meldingen.length

  function kies(pagina: MeldingPagina) {
    setOpen(false)
    onGaNaar(pagina)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="knop knop-icoon"
        style={{ position: 'relative' }}
        aria-label={aantal > 0 ? t('Meldingen ({n})', { n: aantal }) : t('Meldingen')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden>🔔</span>
        {aantal > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              // Rood zodra er iets dringend is, anders de gewone amberen stip.
              background: meldingen.some((m) => m.dringend) ? 'var(--negative)' : 'var(--accent-dot)',
            }}
          />
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
                {t('Niets om te melden. Al je budgetten en garanties zijn in orde.')}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {meldingen.map((m, i) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => kies(m.pagina)}
                      style={{ ...meldingKnop, borderBottom: i === aantal - 1 ? 'none' : meldingKnop.borderBottom }}
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
