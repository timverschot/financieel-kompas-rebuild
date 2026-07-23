import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Dossier, GedeeldeKost, Verrekening } from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { saldoVerrekening } from '../utils/dossier'
import { formatEuro } from '../utils/format'
import { useT, type Vertaler } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}

function verrekentekst(t: Vertaler, netto: number): string {
  // netto is in centen (geheel getal): positief = partner is jou verschuldigd.
  if (netto > 0) return t('Partner is jou {bedrag} verschuldigd', { bedrag: formatEuro(netto) })
  if (netto < 0) return t('Jij bent partner {bedrag} verschuldigd', { bedrag: formatEuro(-netto) })
  return t('Niets te verrekenen')
}

// De volledige Dossiers-sectie: kies, maak of verwijder een dossier, beheer de
// open gedeelde kosten (toevoegen/bewerken/verwijderen), leg een afrekening vast,
// en bekijk de geschiedenis.
export function DossierSectie({
  dossiers,
  kosten,
  verrekeningen,
  onDossierOpslaan,
  onDossierVerwijderen,
  onKostOpslaan,
  onKostVerwijderen,
  onAfrekenen,
}: {
  dossiers: Dossier[]
  kosten: GedeeldeKost[]
  verrekeningen: Verrekening[]
  onDossierOpslaan: (d: Dossier) => Promise<void> | void
  onDossierVerwijderen: (id: string) => Promise<void> | void
  onKostOpslaan: (k: GedeeldeKost) => Promise<void> | void
  onKostVerwijderen: (id: string) => Promise<void> | void
  onAfrekenen: (dossier: Dossier, openKosten: GedeeldeKost[]) => Promise<void> | void
}) {
  const { t } = useT()
  const [geselecteerd, setGeselecteerd] = useState('')
  const [bewerkKost, setBewerkKost] = useState<GedeeldeKost | null>(null)

  useEffect(() => {
    if (dossiers.length === 0) {
      setGeselecteerd('')
    } else if (!dossiers.some((d) => d.id === geselecteerd)) {
      setGeselecteerd(dossiers[0].id)
    }
  }, [dossiers, geselecteerd])

  const dossier = dossiers.find((d) => d.id === geselecteerd) ?? null
  const alleKosten = dossier ? kosten.filter((k) => k.dossierId === dossier.id) : []
  const openKosten = alleKosten.filter((k) => !k.verrekeningId)
  const netto = dossier ? saldoVerrekening(dossier.aandeelJij, openKosten) : 0
  const geschiedenis = dossier
    ? verrekeningen.filter((v) => v.dossierId === dossier.id).sort((a, b) => (a.datum < b.datum ? 1 : -1))
    : []

  async function kostOpslaan(k: GedeeldeKost) {
    await onKostOpslaan(k)
    setBewerkKost(null)
  }

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Dossiers (gedeelde kosten)')}</h2>
      {dossiers.length === 0 && <p style={{ color: '#888' }}>{t('Nog geen dossiers. Maak er hieronder een aan.')}</p>}

      {dossiers.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="dossierkeuze">{t('Gekozen dossier')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select id="dossierkeuze" style={{ ...veld, flex: 1 }} value={geselecteerd} onChange={(e) => setGeselecteerd(e.target.value)}>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.naam} {t('(jij {p}%)', { p: d.aandeelJij })}
                </option>
              ))}
            </select>
            {dossier && (
              <button
                aria-label={t('Verwijder dossier {naam}', { naam: dossier.naam })}
                onClick={() => onDossierVerwijderen(dossier.id)}
                style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      <DossierFormulier onOpslaan={onDossierOpslaan} />

      {dossier && (
        <div style={{ marginTop: '1rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {openKosten.map((k) => (
              <li
                key={k.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.4rem 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <span>
                  {k.omschrijving}
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>
                    {' '}
                    · {t('betaald door {wie}', { wie: k.betaaldDoor === 'jij' ? t('jou') : t('partner') })}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>{formatEuro(k.bedrag)}</span>
                  <button aria-label={t('Bewerk kost {naam}', { naam: k.omschrijving })} onClick={() => setBewerkKost(k)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                    ✎
                  </button>
                  <button
                    aria-label={t('Verwijder kost {naam}', { naam: k.omschrijving })}
                    onClick={() => onKostVerwijderen(k.id)}
                    style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <p style={{ fontWeight: 'bold', marginTop: '0.75rem' }}>{verrekentekst(t, netto)}</p>

          <button
            onClick={() => onAfrekenen(dossier, openKosten)}
            disabled={openKosten.length === 0}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 8,
              border: '1px solid #ccc',
              background: openKosten.length === 0 ? '#f2f2f2' : '#f3eef7',
              cursor: openKosten.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {t('Leg afrekening vast')}
          </button>

          <GedeeldeKostFormulier
            dossierId={dossier.id}
            onOpslaan={kostOpslaan}
            onAnnuleer={() => setBewerkKost(null)}
            bewerken={bewerkKost}
          />

          {geschiedenis.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.25rem' }}>{t('Vastgelegde afrekeningen')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {geschiedenis.map((v) => (
                  <li key={v.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#666', padding: '0.2rem 0' }}>
                    <span>{v.datum}</span>
                    <span>{verrekentekst(t, v.bedrag)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
