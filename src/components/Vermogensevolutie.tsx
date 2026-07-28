import { useMemo, useState } from 'react'
import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { vermogensEvolutie, laatsteMaanden } from '../utils/vermogen'
import { formatEuro } from '../utils/format'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'
import { maandKort } from '../utils/datum'

// Vaste, onderscheidbare lijnkleuren per rekening. De kleur reist mee met de
// reeks (zelfde data-object als de waarden), zodat lijn en schakelaar nooit uit
// de pas kunnen lopen.
const PALET = ['#C56A1F', '#3E7C7B', '#96588A', '#3F8A58', '#C97B8B', '#B08A2E', '#2C6CB0', '#C1502E', '#4E8D8C', '#7A8B3E', '#A34A5E', '#83705C']

const W = 320
const H = 150
const PAD_L = 6
const PAD_R = 6
const PAD_T = 10
const PAD_B = 18



// Vermogensevolutie: een lijn van je totale vermogen over de laatste 12 maanden,
// met elke rekening apart aan/uit te zetten. Het totaal blijft altijd zichtbaar.
export function Vermogensevolutie({
  rekeningen,
  transacties,
  overboekingen,
  waarderingen,
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  overboekingen: Overboeking[]
  waarderingen: Waardering[]
}) {
  const { t } = useT()
  const [verborgen, setVerborgen] = useState<Set<string>>(new Set())

  const nu = new Date()
  const huidige = nu.getFullYear() + '-' + String(nu.getMonth() + 1).padStart(2, '0')
  const maanden = useMemo(() => laatsteMaanden(huidige, 12), [huidige])
  const data = useMemo(
    () => vermogensEvolutie(rekeningen, transacties, overboekingen, waarderingen, maanden),
    [rekeningen, transacties, overboekingen, waarderingen, maanden],
  )

  if (rekeningen.length === 0 || data.length === 0) return null

  const reeksen = [
    { id: '__totaal', naam: t('Totaal'), kleur: 'var(--accent-strong)', dik: true, waarden: data.map((p) => p.totaal) },
    ...rekeningen.map((r, i) => ({
      id: r.id,
      naam: r.naam,
      kleur: PALET[i % PALET.length],
      dik: false,
      waarden: data.map((p) => p.perRekening[r.id] ?? 0),
    })),
  ]
  const zichtbaar = reeksen.filter((r) => r.id === '__totaal' || !verborgen.has(r.id))

  const alleWaarden = zichtbaar.flatMap((r) => r.waarden)
  const min = Math.min(0, ...alleWaarden)
  let max = Math.max(0, ...alleWaarden)
  if (min === max) max = min + 1

  const n = maanden.length
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const x = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * plotH
  const punten = (waarden: number[]) => waarden.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  const laatsteTotaal = data[data.length - 1].totaal
  const eersteTotaal = data[0].totaal
  const verschil = laatsteTotaal - eersteTotaal

  return (
    <Kaart titel={t('Vermogensevolutie')} bijschrift={t('Wat er op je rekeningen staat, over de laatste 12 maanden')}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="bedrag-groot">{formatEuro(laatsteTotaal)}</span>
        <span className="rij-meta" style={{ color: verschil >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
          {verschil >= 0 ? '▲' : '▼'} {formatEuro(Math.abs(verschil))} {t('over 12 maanden')}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t('Vermogensevolutie')} style={{ display: 'block' }}>
        {/* Nullijn wanneer er negatieve waarden zijn */}
        {min < 0 && <line x1={PAD_L} y1={y(0)} x2={W - PAD_R} y2={y(0)} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />}
        {zichtbaar
          .slice()
          .sort((a, b) => Number(a.dik) - Number(b.dik)) // totaal bovenop (laatst getekend)
          .map((r) => (
            <polyline
              key={r.id}
              points={punten(r.waarden)}
              fill="none"
              stroke={r.kleur}
              strokeWidth={r.dik ? 2.5 : 1.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={r.dik ? 1 : 0.85}
            />
          ))}
        {/* x-labels: eerste, midden, laatste maand */}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 5}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--tekst-xxs)', fill: 'var(--text-subtle)' }}
          >
            {maandKort(maanden[i])}
          </text>
        ))}
      </svg>

      {/* Schakelaars per rekening */}
      <div className="knoprij" style={{ gap: 8 }}>
        {reeksen.map((r) => {
          const uit = r.id !== '__totaal' && verborgen.has(r.id)
          return (
            <button
              key={r.id}
              className="chip"
              onClick={() => {
                if (r.id === '__totaal') return
                setVerborgen((s) => {
                  const n = new Set(s)
                  if (n.has(r.id)) n.delete(r.id)
                  else n.add(r.id)
                  return n
                })
              }}
              aria-pressed={!uit}
              disabled={r.id === '__totaal'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: r.id === '__totaal' ? 'default' : 'pointer',
                opacity: uit ? 0.45 : 1,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: r.kleur, flexShrink: 0 }} />
              {r.naam}
            </button>
          )
        })}
      </div>
    </Kaart>
  )
}
