import { useMemo } from 'react'
import type { Categorie, Transactie } from '../data/schema'
import { stijgersDalers, maandreeksPerHoofd } from '../utils/trends'
import { laatsteMaanden } from '../utils/vermogen'
import type { Periode, Richting } from '../utils/analyse'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

const kaart = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '1rem',
  marginBottom: '1rem',
} as const

// Piepkleine verloopgrafiek (sparkline) voor één categorie.
function Sparkline({ waarden, kleur }: { waarden: number[]; kleur: string }) {
  const w = 90
  const h = 26
  const max = Math.max(1, ...waarden)
  const n = waarden.length
  const x = (i: number) => (n <= 1 ? w / 2 : (i / (n - 1)) * w)
  const y = (v: number) => h - 2 - (v / max) * (h - 4)
  const punten = waarden.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden style={{ flexShrink: 0 }}>
      <polyline points={punten} fill="none" stroke={kleur} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function TrendsSectie({
  transacties,
  categorieen,
  richting,
  huidige,
  vorige,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  richting: Richting
  huidige: Periode
  vorige: Periode | null
}) {
  const { t } = useT()

  const nu = new Date()
  const huidigeMaand = nu.getFullYear() + '-' + String(nu.getMonth() + 1).padStart(2, '0')
  const maanden = useMemo(() => laatsteMaanden(huidigeMaand, 6), [huidigeMaand])
  const reeksen = useMemo(
    () => maandreeksPerHoofd(transacties, categorieen, maanden, richting).slice(0, 6),
    [transacties, categorieen, maanden, richting],
  )
  const movers = useMemo(
    () => (vorige ? stijgersDalers(transacties, categorieen, huidige, vorige, richting).slice(0, 5) : []),
    [transacties, categorieen, huidige, vorige, richting],
  )

  // Kleur van een verschil: bij uitgaven is meer = rood, minder = groen; bij
  // inkomsten omgekeerd.
  function deltaKleur(delta: number): string {
    const omhoog = delta > 0
    const goedGevoel = richting === 'inkomst' ? omhoog : !omhoog
    return goedGevoel ? 'var(--positive)' : 'var(--negative)'
  }

  return (
    <>
      <div style={kaart}>
        <h3 style={{ margin: '0 0 0.15rem', fontSize: '0.95rem' }}>{t('Stijgers en dalers')}</h3>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0 0 0.6rem' }}>{t('t.o.v. de vorige periode')}</p>
        {!vorige ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('Kies een periode (niet Alles) om te vergelijken.')}</p>
        ) : movers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('Geen verschillen om te tonen.')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {movers.map((m) => (
              <li key={m.sleutel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', padding: '0.35rem 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: m.kleur ?? 'var(--text-subtle)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.naam}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                  <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{formatEuro(m.huidig)}</span>
                  <span style={{ fontWeight: 600, color: deltaKleur(m.delta), minWidth: 84, textAlign: 'right' }}>
                    {m.delta > 0 ? '▲' : m.delta < 0 ? '▼' : '='} {formatEuro(Math.abs(m.delta))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reeksen.length > 0 && (
        <div style={kaart}>
          <h3 style={{ margin: '0 0 0.15rem', fontSize: '0.95rem' }}>{t('Per categorie per maand')}</h3>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0 0 0.6rem' }}>{t('Verloop over de laatste 6 maanden')}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {reeksen.map((r) => (
              <li key={r.sleutel} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: r.kleur ?? 'var(--text-subtle)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.naam}</span>
                </span>
                <Sparkline waarden={r.waarden} kleur={r.kleur ?? 'var(--accent-strong)'} />
                <span style={{ fontWeight: 600, minWidth: 76, textAlign: 'right' }}>{formatEuro(r.waarden[r.waarden.length - 1])}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
