import { useState } from 'react'
import type { CSSProperties } from 'react'
import { bouwEffectieveBoom } from '../data/categorieen/effectief'
import type { Subcategorie } from '../data/schema'
import { useT } from '../i18n'

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
const miniKnop: CSSProperties = {
  border: '1px solid #ccc',
  background: '#f7f7f7',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.8rem',
  padding: '0.15rem 0.5rem',
}
const veld: CSSProperties = { padding: '0.25rem', boxSizing: 'border-box' }

// Doorbladerbaar én bewerkbaar overzicht van de categorieboom: vouw open van
// hoofdcategorie → categorie → items. Je kan een subcategorie toevoegen onder een
// categorie, elke subcategorie hernoemen (ook de ingebouwde), en je eigen
// toevoegingen weer verwijderen.
export function CategorieBoom({
  aanpassingen,
  onToevoegen,
  onWijzigen,
  onVerwijderen,
}: {
  aanpassingen: Subcategorie[]
  onToevoegen: (categorieId: string, naam: string) => void
  onWijzigen: (id: string, categorieId: string, naam: string) => void
  onVerwijderen: (id: string) => void
}) {
  const { t } = useT()
  const boom = bouwEffectieveBoom(aanpassingen)
  const [openHoofd, setOpenHoofd] = useState<Set<string>>(new Set())
  const [openCat, setOpenCat] = useState<Set<string>>(new Set())
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')
  const [toevoegCatId, setToevoegCatId] = useState<string | null>(null)
  const [toevoegTekst, setToevoegTekst] = useState('')

  function wissel(set: Set<string>, zet: (s: Set<string>) => void, id: string) {
    const nieuw = new Set(set)
    if (nieuw.has(id)) nieuw.delete(id)
    else nieuw.add(id)
    zet(nieuw)
  }

  function bewaarHernoeming(catId: string) {
    if (bewerkId && bewerkTekst.trim()) onWijzigen(bewerkId, catId, bewerkTekst.trim())
    setBewerkId(null)
    setBewerkTekst('')
  }
  function bewaarToevoeging(catId: string) {
    if (toevoegTekst.trim()) onToevoegen(catId, toevoegTekst.trim())
    setToevoegCatId(null)
    setToevoegTekst('')
  }

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Alle categorieën')}</h2>
      <p style={{ color: '#888', marginTop: 0 }}>
        {t('Vouw open om te bekijken. Voeg subcategorieën toe of hernoem bestaande.')}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {boom.map((h) => {
          const hOpen = openHoofd.has(h.id)
          const aantal = h.categorieen.reduce((s, c) => s + c.items.length, 0)
          return (
            <li key={h.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <button type="button" aria-expanded={hOpen} onClick={() => wissel(openHoofd, setOpenHoofd, h.id)} style={{ ...rijKnop, fontWeight: 600 }}>
                {hOpen ? '▾' : '▸'} {h.icoon} {h.naam} <span style={{ color: '#999', fontWeight: 400 }}>· {t('{n} items', { n: aantal })}</span>
              </button>

              {hOpen && (
                <ul style={{ listStyle: 'none', padding: '0 0 0.4rem 1rem', margin: 0 }}>
                  {h.categorieen.map((c) => {
                    const cOpen = openCat.has(c.id)
                    return (
                      <li key={c.id}>
                        <button type="button" aria-expanded={cOpen} onClick={() => wissel(openCat, setOpenCat, c.id)} style={rijKnop}>
                          {cOpen ? '▾' : '▸'} {c.naam} <span style={{ color: '#aaa' }}>({c.items.length})</span>
                        </button>
                        {cOpen && (
                          <ul style={{ listStyle: 'none', padding: '0 0 0.3rem 1.2rem', margin: 0 }}>
                            {c.items.map((it) => (
                              <li key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.1rem 0', fontSize: '0.9rem' }}>
                                {bewerkId === it.id ? (
                                  <>
                                    <input aria-label={t('Nieuwe naam voor {naam}', { naam: it.naam })} style={{ ...veld, flex: 1 }} value={bewerkTekst} onChange={(e) => setBewerkTekst(e.target.value)} />
                                    <button type="button" style={miniKnop} onClick={() => bewaarHernoeming(c.id)}>{t('Bewaar')}</button>
                                    <button type="button" style={miniKnop} onClick={() => setBewerkId(null)}>×</button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ flex: 1, color: '#555' }}>
                                      {it.naam}
                                      {it.eigen && <span style={{ color: '#c56a1f' }}> · {t('eigen')}</span>}
                                    </span>
                                    <button type="button" aria-label={t('Wijzig {naam}', { naam: it.naam })} onClick={() => { setBewerkId(it.id); setBewerkTekst(it.naam) }} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>✎</button>
                                    {it.eigen && (
                                      <button type="button" aria-label={t('Verwijder {naam}', { naam: it.naam })} onClick={() => onVerwijderen(it.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                                    )}
                                  </>
                                )}
                              </li>
                            ))}

                            <li style={{ paddingTop: '0.2rem' }}>
                              {toevoegCatId === c.id ? (
                                <span style={{ display: 'flex', gap: '0.4rem' }}>
                                  <input aria-label={t('Nieuwe subcategorie in {naam}', { naam: c.naam })} style={{ ...veld, flex: 1 }} value={toevoegTekst} onChange={(e) => setToevoegTekst(e.target.value)} placeholder={t('Naam subcategorie')} />
                                  <button type="button" style={miniKnop} onClick={() => bewaarToevoeging(c.id)}>{t('Toevoegen')}</button>
                                  <button type="button" style={miniKnop} onClick={() => setToevoegCatId(null)}>×</button>
                                </span>
                              ) : (
                                <button type="button" aria-label={t('Voeg subcategorie toe aan {naam}', { naam: c.naam })} onClick={() => { setToevoegCatId(c.id); setToevoegTekst('') }} style={{ ...miniKnop, color: '#3F8A58' }}>{t('+ subcategorie')}</button>
                              )}
                            </li>
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
