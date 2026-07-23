import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { TerugkerendePostFormulier } from './TerugkerendePostFormulier'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

const knop: CSSProperties = {
  padding: '0.3rem 0.7rem',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#eef2f7',
  cursor: 'pointer',
}

// Sectie voor vaste (terugkerende) lasten: overzicht, inboeken voor de gekozen
// maand, en een formulier om een vaste post toe te voegen of te bewerken.
export function TerugkerendeSectie({
  posten,
  rekeningen,
  categorieen,
  transacties,
  maand,
  maandLabel,
  onOpslaan,
  onVerwijderen,
  onBoek,
}: {
  posten: TerugkerendePost[]
  rekeningen: Rekening[]
  categorieen: Categorie[]
  transacties: Transactie[]
  maand: string
  maandLabel: string
  onOpslaan: (p: TerugkerendePost) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
  onBoek: (p: TerugkerendePost) => Promise<void> | void
}) {
  const { t } = useT()
  const [bewerken, setBewerken] = useState<TerugkerendePost | null>(null)

  async function opslaan(p: TerugkerendePost) {
    await onOpslaan(p)
    setBewerken(null)
  }

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Vaste lasten')}</h2>
      <p style={{ color: '#888', marginTop: 0 }}>{t('Inboeken voor {maand}', { maand: maandLabel })}</p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {posten.map((p) => {
          const geboekt = transacties.some((tx) => tx.id === `tk-${p.id}-${maand}`)
          return (
            <li
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <span>
                {p.omschrijving}
                <span style={{ color: '#999', fontSize: '0.85rem' }}>
                  {' '}
                  · {t('{bedrag} · dag {dag}', { bedrag: formatEuro(p.bedrag), dag: p.dag })}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {geboekt ? (
                  <span style={{ color: '#27ae60' }}>{t('Geboekt ✓')}</span>
                ) : (
                  <button style={knop} onClick={() => onBoek(p)}>
                    {t('Boek in')}
                  </button>
                )}
                <button aria-label={t('Bewerk vaste post {naam}', { naam: p.omschrijving })} onClick={() => setBewerken(p)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                  ✎
                </button>
                <button
                  aria-label={t('Verwijder vaste post {naam}', { naam: p.omschrijving })}
                  onClick={() => onVerwijderen(p.id)}
                  style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  ×
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <TerugkerendePostFormulier
        rekeningen={rekeningen}
        categorieen={categorieen}
        onOpslaan={opslaan}
        onAnnuleer={() => setBewerken(null)}
        bewerken={bewerken}
      />
    </section>
  )
}
