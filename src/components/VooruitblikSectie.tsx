import { useMemo } from 'react'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { spaarquote, maandVooruitblik } from '../utils/vooruitblik'
import type { Periode } from '../utils/analyse'
import { formatEuro } from '../utils/format'
import { Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'

function kleurVanSaldo(saldo: number): string {
  return saldo >= 0 ? 'var(--positive)' : 'var(--negative)'
}
function procent(q: number | null): string {
  return q === null ? '—' : `${Math.round(q)}%`
}

// Kleine label-links / bedrag-rechts regel, in de vorm van een lijstrij.
function Regel({ label, bedrag, teken }: { label: string; bedrag: number; teken: '+' | '−' }) {
  return (
    <li className="rij">
      <span className="rij-midden rij-titel">{label}</span>
      <span className="bedrag">
        {teken}
        {formatEuro(bedrag)}
      </span>
    </li>
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
    <Kaart titel={t('Vooruitblik & spaarquote')}>
      {/* Spaarquote over de gekozen periode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="kaart-bijschrift" style={{ margin: 0 }}>
          {t('Spaarquote')} · {periodeLabel}
        </p>
        {sq.inkomsten === 0 ? (
          <Leeg>{t('Nog geen inkomsten in deze periode')}</Leeg>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span className="bedrag-groot" style={{ color: kleurVanSaldo(sq.saldo) }}>
                {procent(sq.quote)}
              </span>
              <span className="rij-meta">
                {t('{saldo} van {inkomsten} inkomsten overgehouden', { saldo: formatEuro(sq.saldo), inkomsten: formatEuro(sq.inkomsten) })}
              </span>
            </div>
            <div className="balk">
              <div className="balk-vulling" style={{ width: `${vulling}%`, background: kleurVanSaldo(sq.saldo) }} />
            </div>
            <ul className="lijst">
              <Regel label={t('Inkomsten')} bedrag={sq.inkomsten} teken="+" />
              <Regel label={t('Uitgaven')} bedrag={sq.uitgaven} teken="−" />
            </ul>
          </>
        )}
      </div>

      {/* Vooruitblik voor de huidige maand */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid var(--divider)' }}>
        <p className="kaart-bijschrift" style={{ margin: 0 }}>
          {t('Vooruitblik — {maand}', { maand: maandNaam })}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="bedrag-groot" style={{ fontSize: 22, color: kleurVanSaldo(vb.verwachtSaldo) }}>
            {vb.verwachtSaldo >= 0 ? '+' : '−'}
            {formatEuro(Math.abs(vb.verwachtSaldo))}
          </span>
          <span className="rij-meta">
            {t('verwacht deze maand')}
            {vb.verwachteQuote !== null ? ` · ${procent(vb.verwachteQuote)} ${t('spaarquote')}` : ''}
          </span>
        </div>

        <ul className="lijst">
          <Regel label={t('Al geboekt — inkomsten')} bedrag={vb.geboekt.inkomsten} teken="+" />
          <Regel label={t('Al geboekt — uitgaven')} bedrag={vb.geboekt.uitgaven} teken="−" />
          {vb.aantalKomend > 0 && vb.komend.inkomsten > 0 && (
            <Regel label={t('Nog te komen — inkomsten')} bedrag={vb.komend.inkomsten} teken="+" />
          )}
          {vb.aantalKomend > 0 && vb.komend.uitgaven > 0 && (
            <Regel label={t('Nog te komen — uitgaven')} bedrag={vb.komend.uitgaven} teken="−" />
          )}
        </ul>
        {vb.aantalKomend > 0 ? (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('{n} vaste last(en) nog in te boeken deze maand', { n: vb.aantalKomend })}
          </p>
        ) : (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Alle vaste lasten voor deze maand zijn al ingeboekt')}
          </p>
        )}
      </div>
    </Kaart>
  )
}
