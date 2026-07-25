import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Aflossing, Lening } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { aflossingenVan, openstaandKapitaal, totaalAfgelost, voortgang, isAfbetaald, maandenTotEinde } from '../utils/lening'
import { LeningFormulier } from './LeningFormulier'
import { Kaart, Leeg, Bedrag, Balk } from '../ui/basis'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'
import { vandaag } from '../utils/datum'


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
    <form onSubmit={verzend} className="knoprij">
      <input aria-label={t('Aflossing (€)')} style={{ width: 130 }} inputMode="decimal" placeholder={t('Aflossing (€)')} value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      <input aria-label={t('Datum aflossing')} type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
      <button type="submit" disabled={!geldig} className="knop knop-secundair knop-klein">
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
    <Kaart
      titel={t('Leningen & kredieten')}
      bijschrift={t('Geld dat jij uitleende of zelf leende. Log terugbetalingen; de app houdt het openstaand kapitaal en de geschiedenis bij.')}
    >
      {leningen.length === 0 && <Leeg>{t('Nog geen leningen. Voeg er hieronder een toe.')}</Leeg>}

      {gesorteerd.length > 0 && (
        <ul className="lijst">
          {gesorteerd.map((l) => {
            const eigen = aflossingenVan(l.id, aflossingen)
            const open = openstaandKapitaal(l, aflossingen)
            const afgelost = totaalAfgelost(l.id, aflossingen)
            const pct = Math.round(voortgang(l, aflossingen) * 100)
            const klaar = isAfbetaald(l, aflossingen)
            const richtingLabel = l.richting === 'uitgeleend' ? t('uitgeleend') : t('geleend')
            const openLabel = l.richting === 'uitgeleend' ? t('nog te ontvangen') : t('nog te betalen')
            const balkKleur = l.richting === 'uitgeleend' ? 'var(--positive)' : 'var(--warn)'
            return (
              <li key={l.id} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, opacity: klaar ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="rij-midden">
                    <span className="rij-titel">{l.naam}</span>
                    {l.tegenpartij && <span className="rij-meta">{l.tegenpartij}</span>}
                  </div>
                  <span className="rij-acties">
                    <span className={l.richting === 'uitgeleend' ? 'badge badge-ok' : 'badge badge-open'}>{richtingLabel}</span>
                    <button className="knop knop-kaal" aria-label={t('Bewerk lening {naam}', { naam: l.naam })} onClick={() => setBewerk(l)}>
                      ✎
                    </button>
                    <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder lening {naam}', { naam: l.naam })} onClick={() => onVerwijderen(l.id)}>
                      ×
                    </button>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                  <Bedrag centen={open} />
                  <span className="rij-meta">{openLabel}</span>
                  {klaar && <span className="rij-meta" style={{ color: 'var(--positive)' }}> · {t('afbetaald')}</span>}
                </div>

                <Balk label={l.naam} fractie={pct / 100} kleur={balkKleur} nu={pct} max={100} />

                <span className="rij-meta">
                  {t('{afgelost} van {hoofdsom} afgelost ({pct}%)', { afgelost: formatEuro(afgelost), hoofdsom: formatEuro(l.hoofdsom), pct })}
                </span>

                {l.richting === 'geleend' && (l.rentevoet !== undefined || l.maandbedrag !== undefined || l.einddatum) && (
                  <span className="rij-meta">
                    {l.rentevoet !== undefined && <span>{t('rente {r}%', { r: l.rentevoet })} </span>}
                    {l.maandbedrag !== undefined && <span>· {t('{bedrag}/maand', { bedrag: formatEuro(l.maandbedrag) })} </span>}
                    {l.einddatum && <span>· {termijnTekst(t, l.einddatum)}</span>}
                  </span>
                )}

                {l.bonnetje && (
                  <div>
                    <a href={l.bonnetje} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                      {t('contract/bewijs')}
                    </a>
                  </div>
                )}

                {eigen.length > 0 && (
                  <div>
                    <button type="button" className="knop knop-ghost knop-klein" onClick={() => setToonGeschiedenis((h) => ({ ...h, [l.id]: !h[l.id] }))}>
                      {toonGeschiedenis[l.id] ? t('Geschiedenis verbergen') : t('Geschiedenis tonen ({n})', { n: eigen.length })}
                    </button>
                  </div>
                )}
                {toonGeschiedenis[l.id] && (
                  <ul className="lijst">
                    {[...eigen].reverse().map((a) => (
                      <li key={a.id} className="rij">
                        <span className="rij-midden rij-meta">
                          {a.datum}
                          {a.omschrijving ? ` · ${a.omschrijving}` : ''}
                        </span>
                        <span className="rij-acties">
                          <Bedrag centen={a.bedrag} />
                          <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder aflossing {datum}', { datum: a.datum })} onClick={() => onAflossingVerwijderen(a.id)}>
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {!klaar && <AflossingToevoegen leningId={l.id} onOpslaan={onAflossingOpslaan} />}
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="label-caps" style={{ margin: 0 }}>
        {bewerk ? t('Lening bewerken') : t('Nieuwe lening')}
      </h3>
      <LeningFormulier onOpslaan={opslaan} onAnnuleer={() => setBewerk(null)} bewerken={bewerk} />
    </Kaart>
  )
}
