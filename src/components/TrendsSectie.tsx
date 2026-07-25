import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie, Transactie } from '../data/schema'
import { stijgersDalers, maandreeksPerHoofd } from '../utils/trends'
import { laatsteMaanden } from '../utils/vermogen'
import type { Periode, Richting } from '../utils/analyse'
import { formatEuro } from '../utils/format'
import { Kaart, Leeg, Bedrag } from '../ui/basis'
import { useT } from '../i18n'

// Kleurstipje voor de categorie. De kleur komt uit de categorie zelf (zelfde
// data-object als de cijfers); enkel de vorm ligt hier vast.
const stip: CSSProperties = { width: 10, height: 10, borderRadius: 3, flexShrink: 0 }
const afkap: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

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
      <polyline points={punten} fill="none" stroke={kleur} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
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
      <Kaart titel={t('Stijgers en dalers')} bijschrift={t('t.o.v. de vorige periode')}>
        {!vorige ? (
          <Leeg>{t('Kies een periode (niet Alles) om te vergelijken.')}</Leeg>
        ) : movers.length === 0 ? (
          <Leeg>{t('Geen verschillen om te tonen.')}</Leeg>
        ) : (
          <ul className="lijst">
            {movers.map((m) => (
              <li key={m.sleutel} className="rij">
                <span style={{ ...stip, background: m.kleur ?? 'var(--text-subtle)' }} />
                <span className="rij-midden">
                  <span className="rij-titel" style={afkap}>
                    {m.naam}
                  </span>
                  <span className="rij-meta">{formatEuro(m.huidig)}</span>
                </span>
                <span className="bedrag" style={{ color: deltaKleur(m.delta), minWidth: 90, textAlign: 'right' }}>
                  {m.delta > 0 ? '▲' : m.delta < 0 ? '▼' : '='} {formatEuro(Math.abs(m.delta))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Kaart>

      {reeksen.length > 0 && (
        <Kaart titel={t('Per categorie per maand')} bijschrift={t('Verloop over de laatste 6 maanden')}>
          <ul className="lijst">
            {reeksen.map((r) => (
              <li key={r.sleutel} className="rij">
                <span style={{ ...stip, background: r.kleur ?? 'var(--text-subtle)' }} />
                <span className="rij-midden">
                  <span className="rij-titel" style={afkap}>
                    {r.naam}
                  </span>
                </span>
                <Sparkline waarden={r.waarden} kleur={r.kleur ?? 'var(--accent-strong)'} />
                <Bedrag centen={r.waarden[r.waarden.length - 1]} />
              </li>
            ))}
          </ul>
        </Kaart>
      )}
    </>
  )
}
