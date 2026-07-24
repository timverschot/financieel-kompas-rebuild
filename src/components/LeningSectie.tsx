import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Aflossing, Lening } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { aflossingenVan, openstaandKapitaal, totaalAfgelost, voortgang, isAfbetaald, maandenTotEinde } from '../utils/lening'
import { LeningFormulier } from './LeningFormulier'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

const kaart: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem', marginBottom: '0.75rem' }
const veld: CSSProperties = { padding: '0.4rem', boxSizing: 'border-box' }

// Klein formulier om een aflossing toe te voegen aan één lening.
function AflossingToevoegen({ leningId, onOpslaan }: { leningId: string; onOpslaan: (a: Aflossing) => Promise<void> | void }) {
  const { t } = useT()
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const centen = invoerNaarCenten(bedrag)
  const geldig = Number.isFinite(centen) && centen > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({ id: nieuwId(), leningId, datum, bedrag: centen })
    setBedrag('')
    setDatum(vandaag())
  }

  return (
    <form onSubmit={verzend} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
      <input aria-label={t('Aflossing (€)')} style={{ ...veld, width: 110 }} inputMode="decimal" placeholder={t('Aflossing (€)')} value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      <input aria-label={t('Datum aflossing')} type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      <button type="submit" disabled={!geldig} style={{ padding: '0.4rem 0.7rem', borderRadius: 8, border: '1px solid var(--border-strong)', background: geldig ? 'var(--positive-soft)' : 'var(--surface-2)', cursor: geldig ? 'pointer' : 'not-allowed' }}>
        {t('Aflossing toevoegen')}
      </button>
    </form>
  )
}

// De regel voor de afgesproken termijn van een krediet.
function termijnTekst(t: Vertaler, einddatum: string): string {
  const m = maandenTotEinde(einddatum, vandaag())
  if (m < 0) return t('termijn verstreken sinds {datum}', { datum: einddatum })
  if (m === 0) return t('termijn loopt deze maand af')
  return t('nog {n} maand(en) tot {datum}', { n: m, datum: einddatum })
}

// De volledige leningen/kredieten-sectie: voeg leningen toe (beide richtingen),
// zie per lening het openstaand kapitaal met voortgangsbalk, log aflossingen en
// bekijk de volledige aflossingsgeschiedenis.
export function LeningSectie({
  leningen,
  aflossingen,
  onOpslaan,
  onVerwijderen,
  onAflossingOpslaan,
  onAflossingVerwijderen,
}: {
  leningen: Lening[]
  aflossingen: Aflossing[]
  onOpslaan: (l: Lening) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onAflossingOpslaan: (a: Aflossing) => Promise<void> | void
  onAflossingVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [bewerk, setBewerk] = useState<Lening | null>(null)
  const [toonGeschiedenis, setToonGeschiedenis] = useState<Record<string, boolean>>({})

  async function opslaan(l: Lening) {
    await onOpslaan(l)
    setBewerk(null)
  }

  const gesorteerd = [...leningen].sort((a, b) => {
    const aKlaar = isAfbetaald(a, aflossingen)
    const bKlaar = isAfbetaald(b, aflossingen)
    if (aKlaar !== bKlaar) return aKlaar ? 1 : -1 // openstaande eerst
    return a.naam < b.naam ? -1 : a.naam > b.naam ? 1 : 0
  })

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Leningen & kredieten')}</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.85rem' }}>
        {t('Geld dat jij uitleende of zelf leende. Log terugbetalingen; de app houdt het openstaand kapitaal en de geschiedenis bij.')}
      </p>

      {leningen.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('Nog geen leningen. Voeg er hieronder een toe.')}</p>}

      {gesorteerd.map((l) => {
        const eigen = aflossingenVan(l.id, aflossingen)
        const open = openstaandKapitaal(l, aflossingen)
        const afgelost = totaalAfgelost(l.id, aflossingen)
        const pct = Math.round(voortgang(l, aflossingen) * 100)
        const klaar = isAfbetaald(l, aflossingen)
        const richtingLabel = l.richting === 'uitgeleend' ? t('uitgeleend') : t('geleend')
        const openLabel = l.richting === 'uitgeleend' ? t('nog te ontvangen') : t('nog te betalen')
        return (
          <div key={l.id} style={{ ...kaart, opacity: klaar ? 0.7 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{l.naam}</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#fff', background: l.richting === 'uitgeleend' ? 'var(--positive)' : 'var(--warn)', borderRadius: 6, padding: '0.05rem 0.4rem' }}>
                  {richtingLabel}
                </span>
                <button aria-label={t('Bewerk lening {naam}', { naam: l.naam })} onClick={() => setBewerk(l)} style={{ border: 'none', background: 'none', color: 'var(--info)', cursor: 'pointer' }}>✎</button>
                <button aria-label={t('Verwijder lening {naam}', { naam: l.naam })} onClick={() => onVerwijderen(l.id)} style={{ border: 'none', background: 'none', color: 'var(--negative)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
              </span>
            </div>
            {l.tegenpartij && <div style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{l.tegenpartij}</div>}

            <p style={{ margin: '0.4rem 0 0.1rem' }}>
              <strong>{formatEuro(open)}</strong> <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>{openLabel}</span>
              {klaar && <span style={{ color: 'var(--positive)', fontSize: '0.85rem' }}> · {t('afbetaald')}</span>}
            </p>
            <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, overflow: 'hidden', margin: '0.25rem 0' }}>
              <div
                role="progressbar"
                aria-label={l.naam}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ width: `${pct}%`, height: '100%', background: l.richting === 'uitgeleend' ? 'var(--positive)' : 'var(--warn)' }}
              />
            </div>
            <div style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
              {t('{afgelost} van {hoofdsom} afgelost ({pct}%)', { afgelost: formatEuro(afgelost), hoofdsom: formatEuro(l.hoofdsom), pct })}
            </div>

            {l.richting === 'geleend' && (l.rentevoet !== undefined || l.maandbedrag !== undefined || l.einddatum) && (
              <div style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {l.rentevoet !== undefined && <span>{t('rente {r}%', { r: l.rentevoet })} </span>}
                {l.maandbedrag !== undefined && <span>· {t('{bedrag}/maand', { bedrag: formatEuro(l.maandbedrag) })} </span>}
                {l.einddatum && <span>· {termijnTekst(t, l.einddatum)}</span>}
              </div>
            )}

            {l.bonnetje && (
              <div style={{ marginTop: '0.25rem' }}>
                <a href={l.bonnetje} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontSize: '0.85rem' }}>{t('contract/bewijs')}</a>
              </div>
            )}

            {eigen.length > 0 && (
              <button
                type="button"
                onClick={() => setToonGeschiedenis((h) => ({ ...h, [l.id]: !h[l.id] }))}
                style={{ border: 'none', background: 'none', color: 'var(--info)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem 0 0' }}
              >
                {toonGeschiedenis[l.id] ? t('Geschiedenis verbergen') : t('Geschiedenis tonen ({n})', { n: eigen.length })}
              </button>
            )}
            {toonGeschiedenis[l.id] && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0.25rem 0 0' }}>
                {[...eigen].reverse().map((a) => (
                  <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <span>{a.datum}{a.omschrijving ? ` · ${a.omschrijving}` : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{formatEuro(a.bedrag)}</span>
                      <button aria-label={t('Verwijder aflossing {datum}', { datum: a.datum })} onClick={() => onAflossingVerwijderen(a.id)} style={{ border: 'none', background: 'none', color: 'var(--negative)', cursor: 'pointer' }}>×</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {!klaar && <AflossingToevoegen leningId={l.id} onOpslaan={onAflossingOpslaan} />}
          </div>
        )
      })}

      <h3 style={{ fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{bewerk ? t('Lening bewerken') : t('Nieuwe lening')}</h3>
      <LeningFormulier onOpslaan={opslaan} onAnnuleer={() => setBewerk(null)} bewerken={bewerk} />
    </section>
  )
}
