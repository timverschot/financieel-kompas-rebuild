import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Categorie } from '../data/schema'
import { nieuwId } from '../data/sync/id'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}

// Formulier om een nieuwe categorie aan te maken.
export function CategorieFormulier({
  onToevoegen,
}: {
  onToevoegen: (c: Categorie) => Promise<void> | void
}) {
  const [naam, setNaam] = useState('')
  const geldig = naam.trim().length > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onToevoegen({ id: nieuwId(), naam: naam.trim() })
    setNaam('')
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={{ marginBottom: '0.6rem' }}>
        <label htmlFor="categorienaam">Categorienaam</label>
        <input id="categorienaam" style={veld} value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#f3eef7' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        Categorie toevoegen
      </button>
    </form>
  )
}
