import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { spaarquote, maandVooruitblik } from '../utils/vooruitblik'
import type { Periode } from '../utils/analyse'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

const kaart: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '1rem',
  marginBottom: '1rem',
  boxShadow: 'var(--shadow)',
}

function kleurVanSaldo(saldo: number): string {
  return saldo >= 0 ? 'var(--positive)' : 'var(--negative)'
}
function procent(q: number | null): string {
  return q === null ? '—' : `${Math.round(q)}%`
}

// Kleine label-links / bedrag-rechts regel.
function Regel({ label, bedrag, teken }: { label: string; bedrag: number; teken: '+' | '−' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.15rem 0' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>
        {teken}
        {formatEuro(bedrag)}
      </span>
    </div>
  )
}

// "Vooruitblik & spaarquote": bovenaan de spaarquote over de gekozen periode
// (hoeveel % van je inkomsten je overhield), daaronder een vooruitblik voor de
// huidige maand die je nog niet ingeboekte vaste lasten meerekent.
export function VooruitblikSectie({
  transacties,
  terugkerendePosten,
  periode,
  periodeLabel,
}: {
  transacties: Transactie[]
  terugkerendePosten: TerugkerendePost[]
  periode: Periode
  periodeLabel: string
}) {
  const { t } = useT()

  const sq = useMemo(() => spaarquote(transacties, periode), [transacties, periode])

  const nu = new Date()
  const maand = nu.getFullYear() + '-' + String(nu.getMonth() + 1).padStart(2, '0')
  const maandNaam = new Intl.DateTimeFormat('nl-BE', { month: 'long' }).format(nu)
  const vb = useMemo(
    () => maandVooruitblik(transacties, terugkerendePosten, maand),
    [transacties, terugkerendePosten, maand],
  )

  // Balkje toont het overgehouden deel van de inkomsten (0–100%); negatief = leeg.
  const vulling = sq.quote === null ? 0 : Math.max(0, Math.min(100, sq.quote))

  return (
    <div style={kaart}>
      <h3 style={{ margin: '0 0 0.15rem', fontSize: '0.95rem' }}>{t('Vooruitblik & spaarquote')}</h3>

      {/* Spaarquote over de gekozen periode */}
      <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0 0 0.5rem' }}>
        {t('Spaarquote')} · {periodeLabel}
      </p>
      {sq.inkomsten === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{t('Nog geen inkomsten in deze periode')}</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: kleurVanSaldo(sq.saldo) }}>{procent(sq.quote)}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
              {t('{saldo} van {inkomsten} inkomsten overgehouden', { saldo: formatEuro(sq.saldo), inkomsten: formatEuro(sq.inkomsten) })}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', margin: '0.5rem 0 0.3rem' }}>
            <div style={{ height: '100%', width: `${vulling}%`, background: kleurVanSaldo(sq.saldo) }} />
          </div>
          <Regel label={t('Inkomsten')} bedrag={sq.inkomsten} teken="+" />
          <Regel label={t('Uitgaven')} bedrag={sq.uitgaven} teken="−" />
        </>
      )}

      {/* Vooruitblik voor de huidige maand */}
      <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0 0 0.4rem' }}>{t('Vooruitblik — {maand}', { maand: maandNaam })}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: kleurVanSaldo(vb.verwachtSaldo) }}>
            {vb.verwachtSaldo >= 0 ? '+' : '−'}
            {formatEuro(Math.abs(vb.verwachtSaldo))}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
            {t('verwacht deze maand')}
            {vb.verwachteQuote !== null ? ` · ${procent(vb.verwachteQuote)} ${t('spaarquote')}` : ''}
          </span>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <Regel label={t('Al geboekt — inkomsten')} bedrag={vb.geboekt.inkomsten} teken="+" />
          <Regel label={t('Al geboekt — uitgaven')} bedrag={vb.geboekt.uitgaven} teken="−" />
          {vb.aantalKomend > 0 ? (
            <>
              {vb.komend.inkomsten > 0 && <Regel label={t('Nog te komen — inkomsten')} bedrag={vb.komend.inkomsten} teken="+" />}
              {vb.komend.uitgaven > 0 && <Regel label={t('Nog te komen — uitgaven')} bedrag={vb.komend.uitgaven} teken="−" />}
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0.3rem 0 0' }}>
                {t('{n} vaste last(en) nog in te boeken deze maand', { n: vb.aantalKomend })}
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0.3rem 0 0' }}>{t('Alle vaste lasten voor deze maand zijn al ingeboekt')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
