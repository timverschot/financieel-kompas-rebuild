import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Rekening, Spaardoel, Transactie } from '../data/schema'
import { SpaardoelFormulier } from './SpaardoelFormulier'
import { spaardoelVoortgang } from '../utils/spaardoel'
import { formatEuro, invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'

const kop: CSSProperties = { fontSize: '1rem', marginBottom: '0.25rem' }

// De volledige Spaardoelen-sectie: overzicht met voortgangsbalken, snel het
// huidige bedrag bijwerken (bij manueel bijgehouden doelen), en een formulier om
// een doel toe te voegen of te bewerken.
export function SpaardoelSectie({
  spaardoelen,
  rekeningen,
  transacties,
  onOpslaan,
  onVerwijderen,
}: {
  spaardoelen: Spaardoel[]
  rekeningen: Rekening[]
  transacties: Transactie[]
  onOpslaan: (d: Spaardoel) => Promise<void> | void
  onVerwijderen: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [bewerk, setBewerk] = useState<Spaardoel | null>(null)
  const [bedragInvoer, setBedragInvoer] = useState<Record<string, string>>({})

  async function opslaan(d: Spaardoel) {
    await onOpslaan(d)
    setBewerk(null)
  }

  async function werkBedragBij(doel: Spaardoel) {
    const tekst = bedragInvoer[doel.id]
    if (tekst === undefined) return
    const centen = invoerNaarCenten(tekst)
    if (!Number.isFinite(centen)) return
    await onOpslaan({ ...doel, huidigBedrag: centen })
    setBedragInvoer((m) => {
      const n = { ...m }
      delete n[doel.id]
      return n
    })
  }

  return (
    <section>
      <h2 style={kop}>{t('Spaardoelen')}</h2>
      <p style={{ color: '#888', marginTop: 0 }}>{t('Langetermijndoelen — buffers, grote aankopen, schuldenvrij.')}</p>

      {spaardoelen.length === 0 && <p style={{ color: '#888' }}>{t('Nog geen doelen. Voeg je eerste doel toe!')}</p>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {spaardoelen.map((d) => {
          const v = spaardoelVoortgang(d, rekeningen, transacties)
          const kleur = d.kleur ?? '#3F8A58'
          const manueel = !d.gekoppeldeRekeningId
          return (
            <li key={d.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{d.naam}</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ color: '#666' }}>
                    {t('{a} van {b}', { a: formatEuro(v.huidig), b: formatEuro(v.doel) })}
                  </span>
                  <button aria-label={t('Bewerk doel {naam}', { naam: d.naam })} onClick={() => setBewerk(d)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                    ✎
                  </button>
                  <button aria-label={t('Verwijder doel {naam}', { naam: d.naam })} onClick={() => onVerwijderen(d.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>
                    ×
                  </button>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={d.naam}
                aria-valuenow={Math.round(v.fractie * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ height: 8, background: '#eee', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}
              >
                <div style={{ height: '100%', width: `${v.fractie * 100}%`, background: kleur }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '0.85rem', marginTop: 2 }}>
                <span>{t('nog {bedrag}', { bedrag: formatEuro(v.resterend) })}</span>
                <span>
                  {d.maandbedrag ? t('{bedrag}/mnd', { bedrag: formatEuro(d.maandbedrag) }) : ''}
                  {d.doeldatum ? t(' · tegen {datum}', { datum: d.doeldatum }) : ''}
                </span>
              </div>

              {manueel && (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem' }}>
                  <input
                    aria-label={t('Huidig bedrag {naam}', { naam: d.naam })}
                    style={{ flex: 1, padding: '0.3rem', boxSizing: 'border-box' }}
                    inputMode="decimal"
                    placeholder={t('Huidig bedrag')}
                    value={bedragInvoer[d.id] ?? centenNaarInvoer(d.huidigBedrag)}
                    onChange={(e) => setBedragInvoer((m) => ({ ...m, [d.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => werkBedragBij(d)}
                    style={{ padding: '0.3rem 0.7rem', borderRadius: 8, border: '1px solid #ccc', background: '#eef2f7', cursor: 'pointer' }}
                  >
                    {t('Bedrag bijwerken')}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <SpaardoelFormulier rekeningen={rekeningen} onOpslaan={opslaan} onAnnuleer={() => setBewerk(null)} bewerken={bewerk} />
    </section>
  )
}
