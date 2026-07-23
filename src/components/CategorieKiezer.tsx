import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { zoekItems } from '../data/categorieen/zoek'
import { labelVanCategorie } from '../data/categorieen/resolve'

const keuzeKnop: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '0.35rem 0.5rem',
  border: 'none',
  borderBottom: '1px solid #f0f0f0',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.9rem',
}
const invoer: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}

// Laat een transactie categoriseren op twee niveaus: kies een hoofdcategorie
// (Voeding, Drank, …) óf zoek een specifiek item (subcategorie, bv. 'Brood
// (wit)'). Eigen categorieën blijven ook kiesbaar. Beide niveaus werken overal.
export function CategorieKiezer({
  waarde,
  onKies,
  gebruikerCategorieen,
}: {
  waarde: string | undefined
  onKies: (id: string | undefined) => void
  gebruikerCategorieen: Categorie[]
}) {
  const [zoek, setZoek] = useState('')
  const term = zoek.trim().toLowerCase()

  const gekozenLabel = labelVanCategorie(waarde, gebruikerCategorieen)

  const hoofdLijst = term
    ? INGEBOUWDE_CATEGORIEEN.filter((h) => h.naam.toLowerCase().includes(term))
    : INGEBOUWDE_CATEGORIEEN
  const items = term ? zoekItems(term, 12) : []
  const eigenLijst = term
    ? gebruikerCategorieen.filter((c) => c.naam.toLowerCase().includes(term))
    : gebruikerCategorieen

  function kies(id: string | undefined) {
    onKies(id)
    setZoek('')
  }

  return (
    <div>
      <p style={{ margin: '0 0 0.25rem', color: '#555', fontSize: '0.9rem' }}>
        Categorie: <strong>{gekozenLabel ?? 'Geen'}</strong>
        {waarde && (
          <button
            type="button"
            onClick={() => kies(undefined)}
            style={{ marginLeft: '0.5rem', border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer' }}
          >
            wissen
          </button>
        )}
      </p>
      <input
        aria-label="Zoek categorie of item"
        style={invoer}
        value={zoek}
        placeholder="Zoek een categorie of item…"
        onChange={(e) => setZoek(e.target.value)}
      />
      <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, marginTop: 4 }}>
        <button type="button" style={keuzeKnop} onClick={() => kies(undefined)}>
          Geen categorie
        </button>
        {hoofdLijst.map((h) => (
          <button type="button" key={h.id} style={keuzeKnop} onClick={() => kies(h.id)}>
            {h.icoon} {h.naam}
          </button>
        ))}
        {items.map((it) => (
          <button type="button" key={it.id} style={keuzeKnop} onClick={() => kies(it.id)}>
            {it.naam} <span style={{ color: '#999' }}>· {it.hoofdNaam}</span>
          </button>
        ))}
        {eigenLijst.map((c) => (
          <button type="button" key={c.id} style={keuzeKnop} onClick={() => kies(c.id)}>
            {c.naam} <span style={{ color: '#999' }}>· eigen</span>
          </button>
        ))}
      </div>
    </div>
  )
}
