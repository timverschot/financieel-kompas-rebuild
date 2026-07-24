import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Garantie, Transactie } from '../data/schema'
import { formatEuro } from '../utils/format'
import { garantieStatus } from '../utils/garantie'
import { GarantieFormulier } from './GarantieFormulier'
import { useT } from '../i18n'
import type { Vertaler } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

const kaart: CSSProperties = { background: '#faf9f7', border: '1px solid #eee', borderRadius: 8, padding: '0.7rem', marginBottom: '0.6rem' }

// De statusbadge (kleur + tekst) voor een garantie.
function badge(t: Vertaler, s: ReturnType<typeof garantieStatus>): { kleur: string; tekst: string } {
  if (s.verlopen) return { kleur: '#9aa0a6', tekst: t('verlopen') }
  if (s.bijnaVerlopen) return { kleur: '#c07000', tekst: t('nog {n} dag(en)', { n: s.dagenResterend }) }
  return { kleur: '#2e8b57', tekst: t('nog {n} maand(en)', { n: s.maandenResterend }) }
}

// De garantie- & factuursectie: voeg aankopen met garantie toe, zie de vervaldatum
// en "nog X maanden / verlopen" — gesorteerd op wat het eerst vervalt, met een
// waarschuwing voor wat bijna verloopt.
export function GarantieSectie({
  garanties,
  transacties,
  onOpslaan,
  onVerwijderen,
}: {
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
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Garanties & facturen')}</h2>
      <p style={{ color: '#888', marginTop: 0, fontSize: '0.85rem' }}>
        {t('Hou per aankoop de garantie en de factuur bij. De app berekent de vervaldatum en waarschuwt vóór ze afloopt.')}
      </p>

      {garanties.length === 0 && <p style={{ color: '#888' }}>{t('Nog geen aankopen. Voeg er hieronder een toe.')}</p>}

      {metStatus.map(({ g, s }) => {
        const b = badge(t, s)
        return (
          <div key={g.id} style={{ ...kaart, opacity: s.verlopen ? 0.7 : 1, borderColor: s.bijnaVerlopen ? '#e0b070' : '#eee', background: s.bijnaVerlopen ? '#fff8ee' : '#faf9f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{g.product}</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#fff', background: b.kleur, borderRadius: 6, padding: '0.05rem 0.4rem' }}>{b.tekst}</span>
                <button aria-label={t('Bewerk garantie {naam}', { naam: g.product })} onClick={() => setBewerk(g)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>✎</button>
                <button aria-label={t('Verwijder garantie {naam}', { naam: g.product })} onClick={() => onVerwijderen(g.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
              </span>
            </div>
            <div style={{ color: '#777', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              {g.winkel && <span>{g.winkel} · </span>}
              {t('gekocht {datum}', { datum: g.aankoopdatum })}
              {typeof g.prijs === 'number' && <span> · {formatEuro(g.prijs)}</span>}
              {' · '}
              {t('vervalt {datum}', { datum: s.vervaldatum })}
            </div>
            {g.notitie && <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.15rem' }}>{g.notitie}</div>}
            {g.bonnetje && (
              <div style={{ marginTop: '0.2rem' }}>
                <a href={g.bonnetje} target="_blank" rel="noreferrer" style={{ color: '#2c6cb0', fontSize: '0.85rem' }}>{t('bon/factuur')}</a>
              </div>
            )}
          </div>
        )
      })}

      <h3 style={{ fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{bewerk ? t('Aankoop bewerken') : t('Nieuwe aankoop')}</h3>
      <GarantieFormulier transacties={transacties} onOpslaan={opslaan} onAnnuleer={() => setBewerk(null)} bewerken={bewerk} />
    </section>
  )
}
