import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

const ZOEK_VANAF = 2
const MAX = 6

// Het zwevende suggestielijstje: crème vlak met zachte rand en een schaduw,
// want het zweeft boven de rest van het formulier.
const suggestieLijst: CSSProperties = {
  listStyle: 'none',
  margin: '4px 0 0',
  padding: 0,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  boxShadow: 'var(--shadow-sheet)',
  overflow: 'hidden',
  position: 'absolute',
  width: '100%',
  zIndex: 10,
}

function suggestieKnop(gemarkeerd: boolean): CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 'var(--tekst-sm)',
    color: 'var(--text)',
    padding: '9px 12px',
    border: 'none',
    borderBottom: '1px solid var(--rij-lijn)',
    background: gemarkeerd ? 'var(--accent-soft)' : 'transparent',
    cursor: 'pointer',
  }
}

// Invoerveld voor de handelaar/winkel, met suggesties uit eerder ingevoerde
// namen. Vanaf twee letters verschijnen de overeenkomende namen; navigeer met
// pijl omhoog/omlaag en kies met Tab of Enter. Zo hoef je een winkel die je vaak
// bezoekt maar één keer volledig te typen.
export function HandelaarVeld({
  id,
  waarde,
  onWijzig,
  suggestiesBron,
}: {
  id: string
  waarde: string
  onWijzig: (v: string) => void
  suggestiesBron: string[]
}) {
  const [open, setOpen] = useState(false)
  const [hoog, setHoog] = useState(0)
  const hoogRef = useRef(0)
  function zetHoog(n: number) {
    hoogRef.current = n
    setHoog(n)
  }

  const term = waarde.trim().toLowerCase()
  const suggesties =
    open && term.length >= ZOEK_VANAF
      ? suggestiesBron
          .filter((s) => s.toLowerCase().startsWith(term) && s.toLowerCase() !== term)
          .slice(0, MAX)
      : []
  const gemarkeerd = Math.min(hoog, Math.max(0, suggesties.length - 1))

  function kies(s: string) {
    onWijzig(s)
    setOpen(false)
    zetHoog(0)
  }

  function opToets(e: KeyboardEvent<HTMLInputElement>) {
    if (suggesties.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      zetHoog(Math.min(hoogRef.current + 1, suggesties.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      zetHoog(Math.max(hoogRef.current - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const s = suggesties[Math.min(hoogRef.current, suggesties.length - 1)]
      if (s) {
        e.preventDefault()
        kies(s)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        style={{ display: 'block', width: '100%' }}
        autoComplete="off"
        // Merknamen mogen NIET door de autocorrectie van iOS: die maakt van "Q8"
        // iets anders en van "Lidl" "Lid". Dezelfde reden waarom we ze nergens
        // vertalen. Wel hoofdletters aan het woordbegin — het is een naam.
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="next"
        value={waarde}
        onChange={(e) => {
          onWijzig(e.target.value)
          setOpen(true)
          zetHoog(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={opToets}
      />
      {suggesties.length > 0 && (
        <ul role="listbox" style={suggestieLijst}>
          {suggesties.map((s, i) => (
            <li key={s} role="option" aria-selected={i === gemarkeerd}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => kies(s)}
                onMouseEnter={() => zetHoog(i)}
                style={suggestieKnop(i === gemarkeerd)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
