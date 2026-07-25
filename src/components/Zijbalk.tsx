import type { CSSProperties } from 'react'
import { PAGINAS, type Pagina } from './OnderNavigatie'
import { Merkteken } from './Merkteken'
import { useT } from '../i18n'

// Vast zijpaneel voor brede schermen (desktop/laptop), naar de V1-logica: logo
// bovenaan, de volledige navigatie eronder, en een profielregel onderaan. Op smalle
// schermen wordt dit niet getoond (dan is er de onderbalk); App.tsx beslist dat.
// De kleuren komen uit de vaste --sidebar-*-tokens: dit paneel blijft in licht én
// donker dezelfde donkere tint.
const paneel: CSSProperties = {
  width: 240,
  flexShrink: 0,
  position: 'sticky',
  top: 0,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--sidebar-bg)',
  color: 'var(--sidebar-text)',
  borderRight: '1px solid var(--border)',
}
// Hairline tussen kop, navigatie en voetregel, in dezelfde amberzweem als de
// actieve staat — zo blijft alles binnen de tokens.
const hairline = '1px solid var(--sidebar-active-bg)'

export function Zijbalk({ actief, onKies }: { actief: Pagina; onKies: (p: Pagina) => void }) {
  const { t } = useT()
  return (
    <aside style={paneel} aria-label={t('Hoofdnavigatie')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '1.1rem 1rem', borderBottom: hairline }}>
        <Merkteken grootte={38} />
        <span style={{ minWidth: 0 }}>
          <strong
            style={{
              color: 'var(--sidebar-active-text)',
              display: 'block',
              fontSize: '1.05rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Kompal
          </strong>
          <span style={{ fontSize: '0.7rem', color: 'var(--sidebar-muted)' }}>{t('je financieel kompas')}</span>
        </span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0.5rem' }}>
        {PAGINAS.map((p) => {
          const aan = p.id === actief
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onKies(p.id)}
              aria-current={aan ? 'page' : undefined}
              aria-label={t(p.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                width: '100%',
                minHeight: 44,
                padding: '0.55rem 0.8rem',
                marginBottom: 2,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: aan ? 'var(--sidebar-active-bg)' : 'transparent',
                color: aan ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                fontFamily: 'inherit',
                fontWeight: aan ? 600 : 400,
                fontSize: '0.9rem',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }} aria-hidden>
                {p.icoon}
              </span>
              {t(p.label)}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '0.9rem', borderTop: hairline, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--accent-dot)',
            color: 'var(--sidebar-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.8rem',
          }}
          aria-hidden
        >
          K
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--sidebar-muted)' }}>Kompal</span>
      </div>
    </aside>
  )
}
