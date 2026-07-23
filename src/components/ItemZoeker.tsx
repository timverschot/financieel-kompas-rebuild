import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { zoekItems } from '../data/categorieen/zoek'
import type { PlatItem } from '../data/categorieen/zoek'
import { useT } from '../i18n'

const ZOEK_VANAF = 2
const MAX = 8

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 0,
  boxSizing: 'border-box',
}

// Compacte item-autocomplete voor één kassaticketregel: typ een product (vanaf
// twee letters), navigeer met pijltjes en kies met Tab/Enter. Vindt ook op
// synoniem. Vrije tekst zonder keuze blijft gewoon als omschrijving staan.
export function ItemZoeker({
  waarde,
  onTekst,
  onKiesItem,
  registerInput,
}: {
  waarde: string
  onTekst: (tekst: string) => void
  onKiesItem: (item: PlatItem) => void
  registerInput?: (el: HTMLInputElement | null) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [hoog, setHoog] = useState(0)
  const hoogRef = useRef(0)
  function zetHoog(n: number) {
    hoogRef.current = n
    setHoog(n)
  }

  const term = waarde.trim()
  const resultaten = open && term.length >= ZOEK_VANAF ? zoekItems(term, MAX) : []
  const gemarkeerd = Math.min(hoog, Math.max(0, resultaten.length - 1))

  function kies(item: PlatItem) {
    onKiesItem(item)
    setOpen(false)
    zetHoog(0)
  }

  function opToets(e: KeyboardEvent<HTMLInputElement>) {
    if (resultaten.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      zetHoog(Math.min(hoogRef.current + 1, resultaten.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      zetHoog(Math.max(hoogRef.current - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const item = resultaten[Math.min(hoogRef.current, resultaten.length - 1)]
      if (item) {
        e.preventDefault()
        kies(item)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        aria-label={t('Item zoeken')}
        ref={registerInput}
        style={veld}
        autoComplete="off"
        placeholder={t('Zoek een product (vanaf 2 letters)…')}
        value={waarde}
        onChange={(e) => {
          onTekst(e.target.value)
          setOpen(true)
          zetHoog(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={opToets}
      />
      {resultaten.length > 0 && (
        <ul
          role="listbox"
          style={{
            listStyle: 'none',
            margin: '2px 0 0',
            padding: 0,
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: 8,
            background: 'white',
            position: 'absolute',
            width: '100%',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          {resultaten.map((it, i) => (
            <li key={it.id} role="option" aria-selected={i === gemarkeerd}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => kies(it)}
                onMouseEnter={() => zetHoog(i)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.3rem 0.5rem',
                  border: 'none',
                  borderBottom: '1px solid #f2f2f2',
                  background: i === gemarkeerd ? '#eef2fb' : 'white',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {it.naam} <span style={{ color: '#999' }}>· {it.hoofdNaam}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
