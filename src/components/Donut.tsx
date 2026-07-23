import type { CSSProperties } from 'react'
import { donutSegmenten, type DonutInvoer } from '../utils/donut'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

// Geometrie van de donut.
const GROOTTE = 180
const MIDDEN = GROOTTE / 2
const BUITEN = 80
const BINNEN = 50

// Een punt op een cirkel; hoek 0 = bovenaan, met de klok mee.
function punt(straal: number, fractie: number): [number, number] {
  const hoek = fractie * 2 * Math.PI
  return [MIDDEN + straal * Math.sin(hoek), MIDDEN - straal * Math.cos(hoek)]
}

function segmentPad(start: number, eind: number): string {
  const groot = eind - start > 0.5 ? 1 : 0
  const [xb0, yb0] = punt(BUITEN, start)
  const [xb1, yb1] = punt(BUITEN, eind)
  const [xi1, yi1] = punt(BINNEN, eind)
  const [xi0, yi0] = punt(BINNEN, start)
  return `M ${xb0} ${yb0} A ${BUITEN} ${BUITEN} 0 ${groot} 1 ${xb1} ${yb1} L ${xi1} ${yi1} A ${BINNEN} ${BINNEN} 0 ${groot} 0 ${xi0} ${yi0} Z`
}

const swatch: CSSProperties = { display: 'inline-block', width: 12, height: 12, borderRadius: 3, flexShrink: 0 }

// Donutgrafiek van bedragen per (hoofd)categorie, met legende. De kleuren komen
// uit hetzelfde data-object als de cijfers.
export function Donut({ items, middenLabel = 'uitgaven' }: { items: DonutInvoer[]; middenLabel?: string }) {
  const { t } = useT()
  const segmenten = donutSegmenten(items)
  if (segmenten.length === 0) return null
  const totaal = segmenten.reduce((s, seg) => s + seg.bedrag, 0)
  const enkel = segmenten.length === 1

  return (
    <div>
      <svg viewBox={`0 0 ${GROOTTE} ${GROOTTE}`} width={GROOTTE} height={GROOTTE} role="img" aria-label={t('{label} per categorie', { label: t(middenLabel) })}>
        {enkel ? (
          <circle
            cx={MIDDEN}
            cy={MIDDEN}
            r={(BUITEN + BINNEN) / 2}
            fill="none"
            stroke={segmenten[0].kleur}
            strokeWidth={BUITEN - BINNEN}
          />
        ) : (
          segmenten.map((seg) => <path key={seg.naam} d={segmentPad(seg.start, seg.eind)} fill={seg.kleur} />)
        )}
        <text x={MIDDEN} y={MIDDEN - 4} textAnchor="middle" style={{ fontSize: 11, fill: '#888' }}>
          {t(middenLabel)}
        </text>
        <text x={MIDDEN} y={MIDDEN + 12} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: '#333' }}>
          {formatEuro(totaal)}
        </text>
      </svg>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
        {segmenten.map((seg) => (
          <li key={seg.naam} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
            <span style={{ ...swatch, background: seg.kleur }} />
            <span style={{ flex: 1 }}>{seg.naam}</span>
            <span style={{ color: '#666' }}>{formatEuro(seg.bedrag)}</span>
            <span style={{ color: '#aaa', width: 44, textAlign: 'right' }}>{Math.round(seg.fractie * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
