import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Transactie } from '../data/schema'
import { nieuwId } from '../data/sync/id'

const vandaag = () => new Date().toISOString().slice(0, 10)

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Eenvoudig invoerformulier. De gebruiker typt een positief bedrag en kiest
// 'Uitgave' of 'Inkomst'; wij zetten dat om naar een negatief of positief
// bedrag. Zo hoeft niemand met minustekens te werken.
export function TransactieFormulier({
  onToevoegen,
}: {
  onToevoegen: (t: Transactie) => Promise<void> | void
}) {
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [soort, setSoort] = useState<'uitgave' | 'inkomst'>('uitgave')

  const bedragGetal = Number.parseFloat(bedrag.replace(',', '.'))
  const geldig = omschrijving.trim().length > 0 && Number.isFinite(bedragGetal) && bedragGetal > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const t: Transactie = {
      id: nieuwId(),
      datum,
      omschrijving: omschrijving.trim(),
      bedrag: soort === 'uitgave' ? -bedragGetal : bedragGetal,
      rekeningId: 'r1',
    }
    await onToevoegen(t)
    setOmschrijving('')
    setBedrag('')
    setSoort('uitgave')
    setDatum(vandaag())
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '1rem' }}>
      <div style={rij}>
        <label htmlFor="omschrijving">Omschrijving</label>
        <input id="omschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="bedrag">Bedrag (€)</label>
        <input
          id="bedrag"
          style={veld}
          inputMode="decimal"
          placeholder="0,00"
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
        />
      </div>
      <div style={rij}>
        <label htmlFor="datum">Datum</label>
        <input id="datum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div style={rij}>
        <label style={{ marginRight: '1rem' }}>
          <input type="radio" name="soort" checked={soort === 'uitgave'} onChange={() => setSoort('uitgave')} /> Uitgave
        </label>
        <label>
          <input type="radio" name="soort" checked={soort === 'inkomst'} onChange={() => setSoort('inkomst')} /> Inkomst
        </label>
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.5rem 0.9rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef7ee' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        Toevoegen
      </button>
    </form>
  )
}
