import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Rekening } from '../data/schema'
import { nieuwId } from '../data/sync/id'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Formulier om een nieuwe rekening aan te maken. Het beginsaldo is optioneel
// (leeg = 0) en telt mee in het totaalsaldo.
export function RekeningFormulier({
  onToevoegen,
}: {
  onToevoegen: (r: Rekening) => Promise<void> | void
}) {
  const [naam, setNaam] = useState('')
  const [beginsaldo, setBeginsaldo] = useState('')
  const geldig = naam.trim().length > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const n = Number.parseFloat(beginsaldo.replace(',', '.'))
    const r: Rekening = { id: nieuwId(), naam: naam.trim(), beginsaldo: Number.isFinite(n) ? n : 0 }
    await onToevoegen(r)
    setNaam('')
    setBeginsaldo('')
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="rekeningnaam">Rekeningnaam</label>
        <input id="rekeningnaam" style={veld} value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="beginsaldo">Beginsaldo (€)</label>
        <input
          id="beginsaldo"
          style={veld}
          inputMode="decimal"
          placeholder="0,00"
          value={beginsaldo}
          onChange={(e) => setBeginsaldo(e.target.value)}
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
        Rekening toevoegen
      </button>
    </form>
  )
}
