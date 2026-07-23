import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { Categorie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { zoekItems } from '../data/categorieen/zoek'
import { labelVanCategorie } from '../data/categorieen/resolve'

// Vanaf hoeveel letters we in de items/subcategorieën beginnen te zoeken.
const ZOEK_VANAF = 2
const MAX_SUGGESTIES = 12

type Suggestie = { id: string; titel: string; sub?: string }

const invoer: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}

// Categorie-kiezer met autocomplete, zoals in v1: begin te typen en vanaf twee
// letters worden items (subcategorieën) herkend. Navigeer met pijl omhoog/omlaag
// door de voorstellen; kies met Enter of Tab. Je kan ook een hoofdcategorie
// (Voeding, Drank, …) of een eigen categorie kiezen. Beide niveaus werken overal.
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
  const [open, setOpen] = useState(false)
  const [hoog, setHoog] = useState(0)
  // Ref naast state: de toetsaanslag-handler moet de ACTUELE markering lezen,
  // niet een verouderde waarde uit een oude render (bekende valkuil uit v1).
  const hoogRef = useRef(0)
  function zetHoog(n: number) {
    hoogRef.current = n
    setHoog(n)
  }

  const gekozenLabel = labelVanCategorie(waarde, gebruikerCategorieen)
  const term = zoek.trim().toLowerCase()

  // Bouw de voorstellenlijst (plat, zodat toetsenbordnavigatie er vlot doorheen gaat).
  const suggesties: Suggestie[] = []
  if (open) {
    if (term.length >= ZOEK_VANAF) {
      for (const h of INGEBOUWDE_CATEGORIEEN) {
        if (h.naam.toLowerCase().includes(term)) suggesties.push({ id: h.id, titel: `${h.icoon} ${h.naam}` })
      }
      for (const it of zoekItems(term, MAX_SUGGESTIES)) {
        suggesties.push({ id: it.id, titel: it.naam, sub: it.hoofdNaam })
      }
      for (const c of gebruikerCategorieen) {
        if (c.naam.toLowerCase().includes(term)) suggesties.push({ id: c.id, titel: c.naam, sub: 'eigen' })
      }
    } else {
      // Nog geen twee letters: toon de hoofdcategorieën als snelkeuze.
      for (const h of INGEBOUWDE_CATEGORIEEN) suggesties.push({ id: h.id, titel: `${h.icoon} ${h.naam}` })
    }
  }
  const zichtbaar = suggesties.slice(0, MAX_SUGGESTIES)
  const gemarkeerd = Math.min(hoog, Math.max(0, zichtbaar.length - 1))

  function kies(id: string | undefined) {
    onKies(id)
    setZoek('')
    setOpen(false)
    zetHoog(0)
  }

  function opToets(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || zichtbaar.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      zetHoog(Math.min(hoogRef.current + 1, zichtbaar.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      zetHoog(Math.max(hoogRef.current - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // niet het formulier verzenden, maar het voorstel kiezen
      const s = zichtbaar[Math.min(hoogRef.current, zichtbaar.length - 1)]
      if (s) kies(s.id)
    } else if (e.key === 'Tab') {
      const s = zichtbaar[Math.min(hoogRef.current, zichtbaar.length - 1)]
      if (s) {
        e.preventDefault()
        kies(s.id)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
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
        role="combobox"
        aria-expanded={open && zichtbaar.length > 0}
        aria-autocomplete="list"
        style={invoer}
        value={zoek}
        placeholder="Typ om te zoeken (vanaf 2 letters)…"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setZoek(e.target.value)
          setOpen(true)
          zetHoog(0)
        }}
        onKeyDown={opToets}
      />
      {open && zichtbaar.length > 0 && (
        <ul
          role="listbox"
          style={{
            listStyle: 'none',
            margin: '2px 0 0',
            padding: 0,
            maxHeight: 220,
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: 8,
            background: 'white',
            position: 'absolute',
            width: '100%',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          {zichtbaar.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === gemarkeerd}>
              <button
                type="button"
                // Voorkom dat het invoerveld de focus verliest vóór de klik telt.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => kies(s.id)}
                onMouseEnter={() => zetHoog(i)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.35rem 0.5rem',
                  border: 'none',
                  borderBottom: '1px solid #f2f2f2',
                  background: i === gemarkeerd ? '#eef2fb' : 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {s.titel}
                {s.sub && <span style={{ color: '#999' }}> · {s.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
