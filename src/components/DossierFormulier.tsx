import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Dossier } from '../data/schema'
import { nieuwId } from '../data/sync/id'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Formulier om een nieuw dossier aan te maken, met de verdeelsleutel (percentage
// dat jij draagt).
export function DossierFormulier({ onOpslaan }: { onOpslaan: (d: Dossier) => Promise<void> | void }) {
  const [naam, setNaam] = useState('')
  const [aandeel, setAandeel] = useState('')

  const aandeelGetal = Number.parseFloat(aandeel.replace(',', '.'))
  const geldig =
    naam.trim().length > 0 && Number.isFinite(aandeelGetal) && aandeelGetal >= 0 && aandeelGetal <= 100

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({ id: nieuwId(), naam: naam.trim(), aandeelJij: aandeelGetal })
    setNaam('')
    setAandeel('')
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="dossiernaam">Dossiernaam</label>
        <input id="dossiernaam" style={veld} value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="aandeel">Aandeel jij (%)</label>
        <input
          id="aandeel"
          style={veld}
          inputMode="decimal"
          placeholder="50"
          value={aandeel}
          onChange={(e) => setAandeel(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef2f7' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        Dossier toevoegen
      </button>
    </form>
  )
}
