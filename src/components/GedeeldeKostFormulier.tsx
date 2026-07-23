import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { GedeeldeKost } from '../data/schema'
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

// Formulier om een gedeelde kost aan een dossier toe te voegen.
export function GedeeldeKostFormulier({
  dossierId,
  onOpslaan,
}: {
  dossierId: string
  onOpslaan: (k: GedeeldeKost) => Promise<void> | void
}) {
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [betaaldDoor, setBetaaldDoor] = useState<'jij' | 'partner'>('jij')

  const bedragGetal = Number.parseFloat(bedrag.replace(',', '.'))
  const geldig = omschrijving.trim().length > 0 && Number.isFinite(bedragGetal) && bedragGetal > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({
      id: nieuwId(),
      dossierId,
      omschrijving: omschrijving.trim(),
      bedrag: bedragGetal,
      betaaldDoor,
      datum,
    })
    setOmschrijving('')
    setBedrag('')
    setBetaaldDoor('jij')
    setDatum(vandaag())
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="kostomschrijving">Kostomschrijving</label>
        <input
          id="kostomschrijving"
          style={veld}
          value={omschrijving}
          onChange={(e) => setOmschrijving(e.target.value)}
        />
      </div>
      <div style={rij}>
        <label htmlFor="kostbedrag">Kostbedrag (€)</label>
        <input
          id="kostbedrag"
          style={veld}
          inputMode="decimal"
          placeholder="0,00"
          value={bedrag}
          onChange={(e) => setBedrag(e.target.value)}
        />
      </div>
      <div style={rij}>
        <label htmlFor="kostdatum">Datum</label>
        <input id="kostdatum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div style={rij}>
        <span style={{ marginRight: '0.75rem' }}>Betaald door:</span>
        <label style={{ marginRight: '1rem' }}>
          <input type="radio" name="betaalddoor" checked={betaaldDoor === 'jij'} onChange={() => setBetaaldDoor('jij')} /> Jij
        </label>
        <label>
          <input type="radio" name="betaalddoor" checked={betaaldDoor === 'partner'} onChange={() => setBetaaldDoor('partner')} /> Partner
        </label>
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef7ee' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        Kost toevoegen
      </button>
    </form>
  )
}
