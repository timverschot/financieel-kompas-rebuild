import type { CSSProperties } from 'react'
import { donutSegmenten, afgerondePercentages, type DonutInvoer } from '../utils/donut'
import { formatEuro } from '../utils/format'
import { Bedrag } from '../ui/basis'
import { useT } from '../i18n'

// Geometrie van de donut. Puur vormgeving: een iets ruimer gat en een dunnere
// ring, zodat het middenlabel rustig ademt zoals in het designsysteem.
const GROOTTE = 190
const MIDDEN = GROOTTE / 2
const BUITEN = 84
const BINNEN = 58

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

// Kleurstipje in de legende. De kleur zelf komt altijd uit het segment (zelfde
// data-object als het bedrag), dus enkel de vorm staat hier vast.
const stip: CSSProperties = { display: 'inline-block', width: 10, height: 10, borderRadius: 3, flexShrink: 0 }
const afkap: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// Donutgrafiek van bedragen per (hoofd)categorie, met legende. De kleuren komen
// uit hetzelfde data-object als de cijfers. Deze component zet bewust géén eigen
// kaart om zichzelf: ze staat altijd ín een <Kaart> van de pagina.
export function Donut({
  items,
  middenLabel = 'uitgaven',
  toonLegende = true,
}: {
  items: DonutInvoer[]
  middenLabel?: string
  toonLegende?: boolean
}) {
  const { t } = useT()
  const segmenten = donutSegmenten(items)
  if (segmenten.length === 0) return null
  const totaal = segmenten.reduce((s, seg) => s + seg.bedrag, 0)
  const enkel = segmenten.length === 1
  // Percentages in één keer berekend, zodat de legende netjes op 100% uitkomt.
  const percentages = afgerondePercentages(segmenten.map((seg) => seg.bedrag))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <svg
        viewBox={`0 0 ${GROOTTE} ${GROOTTE}`}
        width={GROOTTE}
        height={GROOTTE}
        role="img"
        aria-label={t('{label} per categorie', { label: t(middenLabel) })}
        style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
      >
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
          segmenten.map((seg, i) => (
            // Een haarlijntje in de kaartkleur scheidt de schijven zacht van elkaar.
            // De sleutel bevat de plaats in de lijst: twee schijven mogen dezelfde
            // naam dragen (bv. tweemaal 'Onbekend') zonder elkaar te verdringen.
            <path key={`${i}-${seg.naam}`} d={segmentPad(seg.start, seg.eind)} fill={seg.kleur} stroke="var(--surface)" strokeWidth={1.5} />
          ))
        )}
        <text
          x={MIDDEN}
          y={MIDDEN - 5}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-subtle)' }}
        >
          {t(middenLabel)}
        </text>
        <text
          x={MIDDEN}
          y={MIDDEN + 14}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, fill: 'var(--text)' }}
        >
          {formatEuro(totaal)}
        </text>
      </svg>

      {toonLegende && (
        <ul className="lijst">
          {segmenten.map((seg, i) => (
            <li key={`${i}-${seg.naam}`} className="rij">
              <span style={{ ...stip, background: seg.kleur }} />
              <span className="rij-midden">
                <span className="rij-titel" style={afkap}>
                  {seg.naam}
                </span>
                <span className="rij-meta">{percentages[i]}%</span>
              </span>
              <Bedrag centen={seg.bedrag} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
