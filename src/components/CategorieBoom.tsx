import { useState } from 'react'
import type { CSSProperties } from 'react'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'

const rijKnop: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  padding: '0.3rem 0',
  fontSize: '0.95rem',
}

// Een doorbladerbaar overzicht van de volledige ingebouwde categorieboom:
// hoofdcategorie -> categorie -> items. Alles is inklapbaar; items worden pas
// in beeld gebracht wanneer je hun categorie openvouwt (zo blijft het licht).
export function CategorieBoom() {
  const [openHoofd, setOpenHoofd] = useState<Set<string>>(new Set())
  const [openCat, setOpenCat] = useState<Set<string>>(new Set())

  function wissel(set: Set<string>, zet: (s: Set<string>) => void, id: string) {
    const nieuw = new Set(set)
    if (nieuw.has(id)) nieuw.delete(id)
    else nieuw.add(id)
    zet(nieuw)
  }

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Alle categorieën</h2>
      <p style={{ color: '#888', marginTop: 0 }}>
        De volledige ingebouwde lijst (hoofdcategorie → categorie → item). Klik om open te vouwen.
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {INGEBOUWDE_CATEGORIEEN.map((h) => {
          const hOpen = openHoofd.has(h.id)
          const aantal = h.categorieen.reduce((s, c) => s + c.items.length, 0)
          return (
            <li key={h.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <button
                type="button"
                aria-expanded={hOpen}
                onClick={() => wissel(openHoofd, setOpenHoofd, h.id)}
                style={{ ...rijKnop, fontWeight: 600 }}
              >
                {hOpen ? '▾' : '▸'} {h.icoon} {h.naam}{' '}
                <span style={{ color: '#999', fontWeight: 400 }}>· {aantal} items</span>
              </button>

              {hOpen && (
                <ul style={{ listStyle: 'none', padding: '0 0 0.4rem 1rem', margin: 0 }}>
                  {h.categorieen.map((c) => {
                    const cOpen = openCat.has(c.id)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          aria-expanded={cOpen}
                          onClick={() => wissel(openCat, setOpenCat, c.id)}
                          style={rijKnop}
                        >
                          {cOpen ? '▾' : '▸'} {c.naam}{' '}
                          <span style={{ color: '#aaa' }}>({c.items.length})</span>
                        </button>
                        {cOpen && (
                          <ul style={{ listStyle: 'none', padding: '0 0 0.3rem 1.2rem', margin: 0 }}>
                            {c.items.map((it) => (
                              <li key={it.id} style={{ color: '#555', padding: '0.1rem 0', fontSize: '0.9rem' }}>
                                {it.naam}
                                {it.eenheid && <span style={{ color: '#aaa' }}> · {it.eenheid}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
