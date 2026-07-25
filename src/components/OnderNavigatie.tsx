import type { CSSProperties } from 'react'
import { useT } from '../i18n'

// De vijf hoofdpagina's van de app. De interne id blijft taal-onafhankelijk;
// enkel het label onder het icoon wordt vertaald.
export type Pagina = 'overzicht' | 'transacties' | 'budget' | 'dossiers' | 'meer'

const TABS: { id: Pagina; icoon: string; label: string }[] = [
  { id: 'overzicht', icoon: '🏠', label: 'Overzicht' },
  { id: 'transacties', icoon: '💳', label: 'Transacties' },
  { id: 'budget', icoon: '🎯', label: 'Budget' },
  { id: 'dossiers', icoon: '👨‍👧', label: 'Dossiers' },
  { id: 'meer', icoon: '⋯', label: 'Meer' },
]

// Vaste navigatiebalk onderaan (app-gevoel). Blijft binnen dezelfde kolombreedte
// als de rest van de app en respecteert de veilige zone onderaan op iOS.
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
const binnen: CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  display: 'flex',
}
const knopBasis: CSSProperties = {
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

export function OnderNavigatie({ actief, onKies }: { actief: Pagina; onKies: (p: Pagina) => void }) {
  const { t } = useT()
  return (
    <nav style={balk} aria-label={t('Hoofdnavigatie')}>
      <div style={binnen}>
        {TABS.map((tab) => {
          const aan = tab.id === actief
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onKies(tab.id)}
              aria-current={aan ? 'page' : undefined}
              aria-label={t(tab.label)}
              style={{ ...knopBasis, color: aan ? 'var(--accent-strong)' : 'var(--text-muted)' }}
            >
              <span style={{ fontSize: '1.3rem', lineHeight: 1, opacity: aan ? 1 : 0.7 }} aria-hidden>
                {tab.icoon}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: aan ? 600 : 400 }}>{t(tab.label)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
