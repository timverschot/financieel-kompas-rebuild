import { useState } from 'react'
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
  | 'leningen'
  | 'analyse'
  | 'categorieen'
  | 'instellingen'

// Alle pagina's met icoon + label, in de volgorde van het desktop-zijpaneel.
export const PAGINAS: { id: Pagina; icoon: string; label: string }[] = [
  { id: 'overzicht', icoon: '🏠', label: 'Overzicht' },
  { id: 'transacties', icoon: '💳', label: 'Transacties' },
  { id: 'rekeningen', icoon: '🏦', label: 'Rekeningen' },
  { id: 'spaardoelen', icoon: '💰', label: 'Spaardoelen' },
  { id: 'budget', icoon: '🎯', label: 'Budget' },
  { id: 'dossiers', icoon: '👨‍👧', label: 'Dossiers' },
  { id: 'leningen', icoon: '📄', label: 'Leningen' },
  { id: 'analyse', icoon: '📊', label: 'Analyse' },
  { id: 'categorieen', icoon: '🏷️', label: 'Categorieën' },
  { id: 'instellingen', icoon: '⚙️', label: 'Instellingen' },
]

// Op mobiel: vier tabs + een centrale ➕ (V1-patroon). Links van de knop Overzicht
// en Transacties, rechts Analyse, en dan Meer. De rest zit onder 'Meer'.
const PRIMAIR_LINKS: Pagina[] = ['overzicht', 'transacties']
const PRIMAIR_RECHTS: Pagina[] = ['analyse']
const SECUNDAIR: Pagina[] = ['rekeningen', 'spaardoelen', 'budget', 'dossiers', 'leningen', 'categorieen', 'instellingen']

const balk: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.06)',
  zIndex: 900,
  paddingBottom: 'env(safe-area-inset-bottom)',
}
const binnen: CSSProperties = { maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'stretch' }
const tabKnop: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  background: 'none',
  border: 'none',
  padding: '0.45rem 0 0.4rem',
  cursor: 'pointer',
  minHeight: 56,
}

function Tab({ icoon, label, aan, onClick }: { icoon: string; label: string; aan: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={aan ? 'page' : undefined}
      aria-label={label}
      style={{ ...tabKnop, color: aan ? 'var(--accent-strong)' : 'var(--text-muted)' }}
    >
      <span style={{ fontSize: '1.3rem', lineHeight: 1, opacity: aan ? 1 : 0.7 }} aria-hidden>
        {icoon}
      </span>
      <span style={{ fontSize: '0.68rem', fontWeight: aan ? 600 : 400 }}>{label}</span>
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
  const meerAan = SECUNDAIR.includes(actief) || meerOpen
  const kies = (p: Pagina) => {
    setMeerOpen(false)
    onKies(p)
  }

  return (
    <nav style={balk} className="kompal-bottombar" aria-label={t('Hoofdnavigatie')}>
      {meerOpen && (
        <>
          <div
            onClick={() => setMeerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: -1 }}
            aria-hidden
          />
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '0.4rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
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
                    padding: '0.7rem 0.9rem',
                    background: aan ? 'var(--accent-soft)' : 'none',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
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
        </>
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
              borderRadius: '50%',
              border: 'none',
              background: 'var(--accent-dot)',
              color: '#3a2c22',
              fontSize: '1.7rem',
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 6px 16px -4px rgba(201,118,26,0.55)',
            }}
          >
            +
          </button>
        </div>

        {PRIMAIR_RECHTS.map((id) => {
          const p = PAGINAS.find((x) => x.id === id)!
          return <Tab key={id} icoon={p.icoon} label={t(p.label)} aan={id === actief} onClick={() => kies(id)} />
        })}

        <Tab icoon="⋯" label={t('Meer')} aan={meerAan} onClick={() => setMeerOpen((o) => !o)} />
      </div>
    </nav>
  )
}
