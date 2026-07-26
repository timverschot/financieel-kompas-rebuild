import { useState } from 'react'
import type { CSSProperties } from 'react'
import { bouwEffectieveBoom } from '../data/categorieen/effectief'
import type { Subcategorie } from '../data/schema'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// De uitklapregel van een tak is één kale knop over de volle breedte: zo blijft de
// hele regel aanklikbaar, met het driehoekje links als open/dicht-teken. De maten
// zijn bewust compact — de boom kan honderden items tonen.
const takKnop: CSSProperties = {
  width: '100%',
  height: 'auto',
  justifyContent: 'flex-start',
  textAlign: 'left',
  gap: 8,
  padding: '6px 8px',
  fontSize: 'var(--tekst-m)',
  color: 'var(--text)',
}
const driehoek: CSSProperties = {
  width: 12,
  flexShrink: 0,
  fontSize: 'var(--tekst-xxs)',
  color: 'var(--text-subtle)',
}
// Compacte bladrij: geen scheidingslijn per item, anders wordt de lijst rumoerig.
const bladRij: CSSProperties = { padding: '3px 8px', gap: 8, borderBottom: 'none' }
const subLijst: CSSProperties = { paddingLeft: 18 }

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
    <Kaart
      titel={t('Alle categorieën')}
      bijschrift={t('Vouw open om te bekijken. Voeg subcategorieën toe of hernoem bestaande.')}
    >
      <ul className="lijst">
        {boom.map((h) => {
          const hOpen = openHoofd.has(h.id)
          const aantal = h.categorieen.reduce((s, c) => s + c.items.length, 0)
          return (
            <li key={h.id} style={{ borderBottom: '1px solid var(--rij-lijn)', padding: '2px 0' }}>
              <button
                type="button"
                className="knop knop-kaal"
                aria-expanded={hOpen}
                onClick={() => wissel(openHoofd, setOpenHoofd, h.id)}
                style={{ ...takKnop, fontWeight: 600 }}
              >
                <span aria-hidden style={driehoek}>
                  {hOpen ? '▾' : '▸'}
                </span>
                <span aria-hidden>{h.icoon}</span>
                <span className="rij-midden">
                  <span className="rij-titel">{h.naam}</span>
                  <span className="rij-meta">{t('{n} items', { n: aantal })}</span>
                </span>
              </button>

              {hOpen && (
                <ul className="lijst" style={subLijst}>
                  {h.categorieen.map((c) => {
                    const cOpen = openCat.has(c.id)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="knop knop-kaal"
                          aria-expanded={cOpen}
                          onClick={() => wissel(openCat, setOpenCat, c.id)}
                          style={{ ...takKnop, fontWeight: 500 }}
                        >
                          <span aria-hidden style={driehoek}>
                            {cOpen ? '▾' : '▸'}
                          </span>
                          <span className="rij-midden">
                            <span style={{ fontSize: 'var(--tekst-sm)' }}>{c.naam}</span>
                          </span>
                          <span className="rij-meta">{c.items.length}</span>
                        </button>
                        {cOpen && (
                          <ul className="lijst" style={subLijst}>
                            {c.items.map((it) => (
                              <li key={it.id} className="rij" style={bladRij}>
                                {bewerkId === it.id ? (
                                  <>
                                    <input
                                      aria-label={t('Nieuwe naam voor {naam}', { naam: it.naam })}
                                      style={{ flex: 1, minWidth: 0 }}
                                      value={bewerkTekst}
                                      onChange={(e) => setBewerkTekst(e.target.value)}
                                    />
                                    <span className="rij-acties">
                                      <button type="button" className="knop knop-secundair knop-klein" onClick={() => bewaarHernoeming(c.id)}>
                                        {t('Bewaar')}
                                      </button>
                                      <button type="button" className="knop knop-kaal" onClick={() => setBewerkId(null)}>
                                        ×
                                      </button>
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="rij-midden">
                                      <span style={{ fontSize: 'var(--tekst-sm)', color: 'var(--text-muted)' }}>
                                        {it.naam}
                                        {it.eigen && <span style={{ color: 'var(--accent-ink)' }}> · {t('eigen')}</span>}
                                      </span>
                                    </span>
                                    <span className="rij-acties">
                                      <button
                                        type="button"
                                        className="knop knop-kaal"
                                        aria-label={t('Wijzig {naam}', { naam: it.naam })}
                                        onClick={() => {
                                          setBewerkId(it.id)
                                          setBewerkTekst(it.naam)
                                        }}
                                      >
                                        ✎
                                      </button>
                                      {it.eigen && (
                                        <button
                                          type="button"
                                          className="knop knop-kaal knop-gevaar"
                                          aria-label={t('Verwijder {naam}', { naam: it.naam })}
                                          onClick={() => onVerwijderen(it.id)}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </span>
                                  </>
                                )}
                              </li>
                            ))}

                            <li className="rij" style={{ ...bladRij, paddingTop: 6, paddingBottom: 6 }}>
                              {toevoegCatId === c.id ? (
                                <>
                                  <input
                                    aria-label={t('Nieuwe subcategorie in {naam}', { naam: c.naam })}
                                    style={{ flex: 1, minWidth: 0 }}
                                    value={toevoegTekst}
                                    onChange={(e) => setToevoegTekst(e.target.value)}
                                    placeholder={t('Naam subcategorie')}
                                  />
                                  <span className="rij-acties">
                                    <button type="button" className="knop knop-secundair knop-klein" onClick={() => bewaarToevoeging(c.id)}>
                                      {t('Toevoegen')}
                                    </button>
                                    <button type="button" className="knop knop-kaal" onClick={() => setToevoegCatId(null)}>
                                      ×
                                    </button>
                                  </span>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="knop knop-ghost knop-klein"
                                  aria-label={t('Voeg subcategorie toe aan {naam}', { naam: c.naam })}
                                  onClick={() => {
                                    setToevoegCatId(c.id)
                                    setToevoegTekst('')
                                  }}
                                >
                                  {t('+ subcategorie')}
                                </button>
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
    </Kaart>
  )
}
