import { useMemo } from 'react'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { spaarquote, maandVooruitblik } from '../utils/vooruitblik'
import type { Periode } from '../utils/analyse'
import { formatEuro } from '../utils/format'
import { Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { huidigeMaand, vandaag, maandVoluit } from '../utils/datum'

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

  // Vandaag en de huidige maand komen uit utils/datum.ts, zodat elk scherm met
  // dezelfde (lokale) dag rekent. De dag is nodig om te zien welke vaste lasten
  // achterstallig zijn.
  const nu = new Date()
  const vandaagISO = vandaag(nu)
  const maand = huidigeMaand(nu)
  const maandNaam = maandVoluit(maand)
  const vb = useMemo(
    () => maandVooruitblik(transacties, terugkerendePosten, maand, vandaagISO),
    [transacties, terugkerendePosten, maand, vandaagISO],
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
          <span className="bedrag-groot" style={{ color: kleurVanSaldo(vb.verwachtSaldo) }}>
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
          {/* Achterstallig: de dag van de maand is voorbij en er is niets geboekt.
              Bewust rustig getoond — het blijft een gewone regel in dezelfde lijst. */}
          {vb.achterstallig.inkomsten > 0 && (
            <Regel label={t('Achterstallig — inkomsten')} bedrag={vb.achterstallig.inkomsten} teken="+" />
          )}
          {vb.achterstallig.uitgaven > 0 && (
            <Regel label={t('Achterstallig — uitgaven')} bedrag={vb.achterstallig.uitgaven} teken="−" />
          )}
        </ul>
        {vb.aantalKomend > 0 && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('{n} vaste last(en) nog in te boeken deze maand', { n: vb.aantalKomend })}
          </p>
        )}
        {vb.aantalAchterstallig > 0 && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('{n} vaste last(en) achterstallig — de dag is voorbij', { n: vb.aantalAchterstallig })}
          </p>
        )}
        {vb.aantalKomend === 0 && vb.aantalAchterstallig === 0 && (
          <p className="rij-meta" style={{ margin: 0 }}>
            {t('Alle vaste lasten voor deze maand zijn al ingeboekt')}
          </p>
        )}
      </div>
    </Kaart>
  )
}
