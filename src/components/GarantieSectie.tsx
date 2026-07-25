import { useState } from 'react'
import type { Garantie, Kind, Transactie } from '../data/schema'
import { formatEuro } from '../utils/format'
import { garantieStatus, dagenTussen } from '../utils/garantie'
import { GarantieFormulier } from './GarantieFormulier'
import { Kaart, Leeg, Balk } from '../ui/basis'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'
import { vandaag } from '../utils/datum'


// De statusbadge (klasse + tekst) voor een garantie: vervallen, bijna vervallen
// of nog geldig.
function badge(t: Vertaler, s: ReturnType<typeof garantieStatus>): { klasse: string; tekst: string } {
  if (s.verlopen) return { klasse: 'badge badge-laat', tekst: t('verlopen') }
  if (s.bijnaVerlopen) return { klasse: 'badge badge-open', tekst: t('nog {n} dag(en)', { n: s.dagenResterend }) }
  return { klasse: 'badge badge-ok', tekst: t('nog {n} maand(en)', { n: s.maandenResterend }) }
}

// De garantie- & factuursectie: voeg aankopen met garantie toe, zie de vervaldatum
// en "nog X maanden / verlopen" — gesorteerd op wat het eerst vervalt, met een
// waarschuwing voor wat bijna verloopt.
export function GarantieSectie({
  gezinsleden = [],
  garanties,
  transacties,
  onOpslaan,
  onVerwijderen,
}: {
  // Optioneel: doorgegeven aan het formulier, om iets aan een gezinslid te koppelen.
  gezinsleden?: Kind[]
  garanties: Garantie[]
  transacties: Transactie[]
  onOpslaan: (g: Garantie) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [bewerk, setBewerk] = useState<Garantie | null>(null)
  const nu = vandaag()

  async function opslaan(g: Garantie) {
    await onOpslaan(g)
    setBewerk(null)
  }

  // Sorteer op vervaldatum: wat het eerst vervalt bovenaan; verlopen onderaan.
  const metStatus = garanties.map((g) => ({ g, s: garantieStatus(g.aankoopdatum, g.garantieMaanden, nu) }))
  metStatus.sort((a, b) => {
    if (a.s.verlopen !== b.s.verlopen) return a.s.verlopen ? 1 : -1
    return a.s.vervaldatum < b.s.vervaldatum ? -1 : a.s.vervaldatum > b.s.vervaldatum ? 1 : 0
  })

  return (
    <Kaart
      titel={t('Garanties & facturen')}
      bijschrift={t('Hou per aankoop de garantie en de factuur bij. De app berekent de vervaldatum en waarschuwt vóór ze afloopt.')}
    >
      {garanties.length === 0 && <Leeg>{t('Nog geen aankopen. Voeg er hieronder een toe.')}</Leeg>}

      {metStatus.length > 0 && (
        <ul className="lijst">
          {metStatus.map(({ g, s }) => {
            const b = badge(t, s)
            // Hoeveel van de garantieperiode er nog rest, als fractie 0..1.
            const totaalDagen = dagenTussen(g.aankoopdatum, s.vervaldatum)
            const restFractie = totaalDagen > 0 ? s.dagenResterend / totaalDagen : 0
            const balkKleur = s.verlopen ? 'var(--text-subtle)' : s.bijnaVerlopen ? 'var(--warn)' : 'var(--positive)'
            return (
              <li
                key={g.id}
                className="rij"
                style={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 8,
                  opacity: s.verlopen ? 0.7 : 1,
                  ...(s.bijnaVerlopen ? { borderLeft: '3px solid var(--warn)', paddingLeft: 10 } : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="rij-midden">
                    <span className="rij-titel">{g.product}</span>
                  </div>
                  <span className="rij-acties">
                    <span className={b.klasse}>{b.tekst}</span>
                    <button className="knop knop-kaal" aria-label={t('Bewerk garantie {naam}', { naam: g.product })} onClick={() => setBewerk(g)}>
                      ✎
                    </button>
                    <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder garantie {naam}', { naam: g.product })} onClick={() => onVerwijderen(g.id)}>
                      ×
                    </button>
                  </span>
                </div>

                <Balk label={g.product} fractie={restFractie} kleur={balkKleur} />

                <span className="rij-meta">
                  {g.winkel && <span>{g.winkel} · </span>}
                  {t('gekocht {datum}', { datum: g.aankoopdatum })}
                  {typeof g.prijs === 'number' && (
                    <span>
                      {' · '}
                      <span className="bedrag" style={{ fontSize: 'inherit' }}>
                        {formatEuro(g.prijs)}
                      </span>
                    </span>
                  )}
                  {' · '}
                  {t('vervalt {datum}', { datum: s.vervaldatum })}
                </span>

                {g.notitie && <span className="rij-meta">{g.notitie}</span>}

                {g.bonnetje && (
                  <div>
                    <a href={g.bonnetje} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                      {t('bon/factuur')}
                    </a>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="label-caps" style={{ margin: 0 }}>
        {bewerk ? t('Aankoop bewerken') : t('Nieuwe aankoop')}
      </h3>
      <GarantieFormulier gezinsleden={gezinsleden} transacties={transacties} onOpslaan={opslaan} onAnnuleer={() => setBewerk(null)} bewerken={bewerk} />
    </Kaart>
  )
}
