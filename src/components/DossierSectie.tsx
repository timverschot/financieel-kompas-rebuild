import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Dossier, GedeeldeKost } from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { saldoVerrekening } from '../utils/dossier'
import { formatEuro } from '../utils/format'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}

// De volledige Dossiers-sectie: kies of maak een dossier, beheer de gedeelde
// kosten ervan, en zie de automatische verrekening.
export function DossierSectie({
  dossiers,
  kosten,
  onDossierOpslaan,
  onKostOpslaan,
  onKostVerwijderen,
}: {
  dossiers: Dossier[]
  kosten: GedeeldeKost[]
  onDossierOpslaan: (d: Dossier) => Promise<void> | void
  onKostOpslaan: (k: GedeeldeKost) => Promise<void> | void
  onKostVerwijderen: (id: string) => Promise<void> | void
}) {
  const [geselecteerd, setGeselecteerd] = useState('')

  // Zorg dat er altijd een geldig dossier geselecteerd is zodra er dossiers zijn.
  useEffect(() => {
    if (dossiers.length === 0) {
      setGeselecteerd('')
    } else if (!dossiers.some((d) => d.id === geselecteerd)) {
      setGeselecteerd(dossiers[0].id)
    }
  }, [dossiers, geselecteerd])

  const dossier = dossiers.find((d) => d.id === geselecteerd) ?? null
  const kostenVan = dossier ? kosten.filter((k) => k.dossierId === dossier.id) : []
  const netto = dossier ? saldoVerrekening(dossier.aandeelJij, kostenVan) : 0
  const verrekentekst =
    netto > 0.005
      ? `Partner is jou ${formatEuro(netto)} verschuldigd`
      : netto < -0.005
        ? `Jij bent partner ${formatEuro(-netto)} verschuldigd`
        : 'Niets te verrekenen'

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Dossiers (gedeelde kosten)</h2>
      {dossiers.length === 0 && <p style={{ color: '#888' }}>Nog geen dossiers. Maak er hieronder een aan.</p>}

      {dossiers.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="dossierkeuze">Gekozen dossier</label>
          <select id="dossierkeuze" style={veld} value={geselecteerd} onChange={(e) => setGeselecteerd(e.target.value)}>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.naam} (jij {d.aandeelJij}%)
              </option>
            ))}
          </select>
        </div>
      )}

      <DossierFormulier onOpslaan={onDossierOpslaan} />

      {dossier && (
        <div style={{ marginTop: '1rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {kostenVan.map((k) => (
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
                    · betaald door {k.betaaldDoor === 'jij' ? 'jou' : 'partner'}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>{formatEuro(k.bedrag)}</span>
                  <button
                    aria-label={`Verwijder kost ${k.omschrijving}`}
                    onClick={() => onKostVerwijderen(k.id)}
                    style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <p style={{ fontWeight: 'bold', marginTop: '0.75rem' }}>{verrekentekst}</p>

          <GedeeldeKostFormulier dossierId={dossier.id} onOpslaan={onKostOpslaan} />
        </div>
      )}
    </section>
  )
}
