import { useMemo, useState } from 'react'
import type { Overboeking, Rekening, Transactie, Waardering } from '../data/schema'
import { vermogensEvolutie, laatsteMaanden } from '../utils/vermogen'
import { formatEuro } from '../utils/format'
import { EersteStapKnop, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { maandKort, vandaag } from '../utils/datum'

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

/** Hoeveel maanden de lijn beslaat. Eén getal, ook in de bijschriften gebruikt. */
const MAANDEN = 12



// Vermogensevolutie: een lijn van je totale vermogen over de laatste 12 maanden,
// met elke rekening apart aan/uit te zetten. Het totaal blijft altijd zichtbaar.
export function Vermogensevolutie({
  rekeningen,
  transacties,
  overboekingen,
  waarderingen,
  ankerMaand,
  onNaarRekeningen,
}: {
  rekeningen: Rekening[]
  transacties: Transactie[]
  overboekingen: Overboeking[]
  waarderingen: Waardering[]
  /**
   * De laatste maand van de grafiek ('JJJJ-MM'). Ronde 40: dit was `new Date()`,
   * zodat de lijn altijd op vandaag eindigde — ook wanneer je bovenaan naar een
   * andere maand bladerde. Standaard blijft het de huidige maand.
   */
  ankerMaand?: string
  /** De eerste stap in de lege toestand (ronde 66). Optioneel: zonder handler geen knop. */
  onNaarRekeningen?: () => void
}) {
  const { t } = useT()
  const [verborgen, setVerborgen] = useState<Set<string>>(new Set())

  const nu = new Date()
  const huidige = ankerMaand ?? nu.getFullYear() + '-' + String(nu.getMonth() + 1).padStart(2, '0')
  const maanden = useMemo(() => laatsteMaanden(huidige, MAANDEN), [huidige])
  const data = useMemo(
    () => vermogensEvolutie(rekeningen, transacties, overboekingen, waarderingen, maanden),
    [rekeningen, transacties, overboekingen, waarderingen, maanden],
  )

  // Zonder rekeningen verdween deze kaart vroeger spoorloos tussen de twee
  // kaarten eromheen. Nu blijft ze staan en zegt ze wat je moet doen — anders weet
  // een nieuwe gebruiker niet dat de app dit kan.
  if (rekeningen.length === 0 || data.length === 0) {
    return (
      <Kaart titel={t('Vermogensevolutie')}>
        <Leeg
          actie={
            onNaarRekeningen ? (
              <EersteStapKnop onClick={onNaarRekeningen}>{t('Maak een rekening aan')}</EersteStapKnop>
            ) : undefined
          }
        >
          {t('Zodra je een rekening hebt toegevoegd, zie je hier hoe je bezit evolueert.')}
        </Leeg>
      </Kaart>
    )
  }

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

  // Hoeveel boekingen er in de LAATSTE maand van de grafiek nog moeten vallen. Zie
  // de uitleg bij de zin hieronder. Overboekingen tellen mee: ook die verschuiven
  // het saldo van een rekening, en de grafiek toont saldo's per rekening.
  const laatsteMaand = maanden[maanden.length - 1]
  const vandaagISO = vandaag()
  const komtNog =
    laatsteMaand === vandaagISO.slice(0, 7)
      ? transacties.filter((tx) => tx.datum > vandaagISO && tx.datum.slice(0, 7) === laatsteMaand).length +
        overboekingen.filter((o) => o.datum > vandaagISO && o.datum.slice(0, 7) === laatsteMaand).length
      : 0

  return (
    <Kaart
      titel={t('Vermogensevolutie')}
      // Het tijdvak staat er letterlijk bij. "De laatste 12 maanden" klopte niet
      // meer zodra de grafiek de maandschakelaar volgt, en een grafiek die niet
      // zegt waarover ze gaat is erger dan geen grafiek.
      bijschrift={t('Wat er op je rekeningen staat, van {van} tot {tot}', {
        van: maandKort(maanden[0]),
        tot: maandKort(maanden[maanden.length - 1]),
      })}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="bedrag-groot">{formatEuro(laatsteTotaal)}</span>
        <span className="rij-meta" style={{ color: verschil >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
          {verschil >= 0 ? '▲' : '▼'} {formatEuro(Math.abs(verschil))} {t('over {n} maanden', { n: MAANDEN })}
        </span>
      </div>

      {/* RONDE 69 — WAAROM DIT BEDRAG KAN VERSCHILLEN VAN DE SALDOTEGEL.
          `saldoOpEinde` telt tot het EINDE van de maand; de saldotegel telt tot en
          met VANDAAG. Staat er een huurbetaling op de 28ste klaar en is het de 5de,
          dan staat hier een lager bedrag — twee cijfers over hetzelfde geld, zonder
          dat iets het verschil benoemt.

          ⚠ De zin noemt uitdrukkelijk de OVERZICHT-pagina en niet "bovenaan". Deze
          grafiek staat op Analyse › Vooruit, en op dat scherm staat geen saldotegel;
          het enige grote bedrag erboven is het eindpunt van deze lijn zelf. "Je saldo
          bovenaan" zou dus naar het cijfer wijzen dat per definitie gelijk is.

          De zin komt er alleen wanneer er ook écht zo'n boeking klaarstaat: anders
          zou ze een verschil verklaren dat er niet is. */}
      {komtNog > 0 ? (
        <p className="rij-meta" data-evolutiebron style={{ margin: 0 }}>
          {komtNog === 1
            ? t('Het laatste punt is de stand aan het einde van de maand. Eén boeking of overboeking van later deze maand telt er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.')
            : t('Het laatste punt is de stand aan het einde van de maand. {n} boekingen en overboekingen van later deze maand tellen er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.', {
                n: komtNog,
              })}
        </p>
      ) : null}

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
              {/* `print-kleur`: dit vlakje is de enige koppeling tussen een lijn in de
                  grafiek en de naam van de rekening. De printopmaak maakt achtergronden
                  doorzichtig; zonder deze klasse printte de legende zonder kleuren en
                  was er geen manier meer om lijn en rekening bij elkaar te brengen. */}
              <span
                className="print-kleur"
                style={{ width: 10, height: 10, borderRadius: 3, background: r.kleur, flexShrink: 0 }}
              />
              {r.naam}
            </button>
          )
        })}
      </div>
    </Kaart>
  )
}
