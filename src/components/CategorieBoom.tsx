import { useState } from 'react'
import type { CSSProperties } from 'react'
import { bouwEffectieveBoom } from '../data/categorieen/effectief'
import type { Categorie, Subcategorie } from '../data/schema'
import { Kaart } from '../ui/basis'
import { opVolgorde } from '../utils/categorieVolgorde'
import { useHoofdvolgorde } from '../categorievolgorde'
import { useT } from '../i18n'

// De uitklapregel van een tak is één kale knop over de volle breedte: zo blijft de
// hele regel aanklikbaar, met het driehoekje links als open/dicht-teken. De maten
// zijn bewust compact — de boom kan honderden items tonen.
const takKnop: CSSProperties = {
  width: '100%',
  height: 'auto',
  justifyContent: 'flex-start',
  textAlign: 'left',
  gap: 10,
  padding: '10px 8px',
  fontSize: 'var(--tekst-m)',
  color: 'var(--text)',
}
const driehoek: CSSProperties = {
  width: 12,
  flexShrink: 0,
  fontSize: 'var(--tekst-s)',
  color: 'var(--text-subtle)',
}

// Het icoon van een hoofdcategorie: groot en in een gekleurd vlakje, zoals in V1.
// Het was een kaal emoji op leesgrootte, en dan is een lijst van veertien takken
// één grijze muur waarin je niets terugvindt. Dit is het herkenningspunt van de
// rij, dus het mag de grootste vorm op de regel zijn.
function hoofdTeken(kleur: string | null): CSSProperties {
  return {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    lineHeight: 1,
    borderRadius: 'var(--radius-sm)',
    background: kleur ? `color-mix(in srgb, ${kleur} 18%, transparent)` : 'var(--accent-soft)',
  }
}
// Compacte bladrij: geen scheidingslijn per item, anders wordt de lijst rumoerig.
const bladRij: CSSProperties = { padding: '4px 8px', gap: 8, borderBottom: 'none' }
const subLijst: CSSProperties = { paddingLeft: 18 }

/**
 * Doorbladerbaar én bewerkbaar overzicht van de categorieboom: vouw open van
 * hoofdcategorie → categorie → items.
 *
 * Sinds ronde 27 kan je op ELK niveau iets toevoegen, ook onder je eigen
 * hoofdcategorieën. Daarvóór was een eigen categorie een losse, vlakke naam
 * waaronder niets kon hangen, terwijl de ingebouwde categorieën wél drie lagen
 * hadden — dus je eigen indeling bleef altijd grover dan de standaard.
 */
export function CategorieBoom({
  aanpassingen,
  eigenCategorieen = [],
  onToevoegen,
  onWijzigen,
  onVerwijderen,
  onCategorieToevoegen,
  onCategorieVerwijderen,
  onVerplaats,
}: {
  aanpassingen: Subcategorie[]
  /** De eigen categorieën: hoofdcategorieën (zonder ouder) én middencategorieën. */
  eigenCategorieen?: Categorie[]
  onToevoegen: (categorieId: string, naam: string) => void
  onWijzigen: (id: string, categorieId: string, naam: string) => void
  onVerwijderen: (id: string) => void
  /** Maakt een eigen MIDDENcategorie onder een hoofdcategorie. */
  onCategorieToevoegen?: (ouderId: string, naam: string) => void
  /** Verwijdert een eigen middencategorie, met alles wat eronder hangt. */
  onCategorieVerwijderen?: (id: string) => void
  /**
   * Zet een hoofdcategorie één plaats omhoog (-1) of omlaag (+1).
   *
   * Alleen HIER kan je de volgorde wijzigen — niet in de invoerpopup. Daar ben je
   * aan het boeken, en dan wil je kiezen, niet inrichten. Zonder deze prop
   * verschijnen de pijltjes gewoon niet.
   */
  onVerplaats?: (id: string, richting: -1 | 1) => void
}) {
  const { t } = useT()
  // Dezelfde volgorde als overal elders; ze wordt hieronder ook ingesteld.
  const volgorde = useHoofdvolgorde()
  const boom = opVolgorde(bouwEffectieveBoom(aanpassingen, eigenCategorieen), volgorde)
  const [openHoofd, setOpenHoofd] = useState<Set<string>>(new Set())
  const [openCat, setOpenCat] = useState<Set<string>>(new Set())
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')
  const [toevoegCatId, setToevoegCatId] = useState<string | null>(null)
  const [toevoegTekst, setToevoegTekst] = useState('')
  // Voor welke hoofdcategorie staat het veld "nieuwe categorie" open?
  const [nieuweCatOnder, setNieuweCatOnder] = useState<string | null>(null)
  const [nieuweCatTekst, setNieuweCatTekst] = useState('')

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
  function bewaarNieuweCategorie(ouderId: string) {
    if (nieuweCatTekst.trim()) onCategorieToevoegen?.(ouderId, nieuweCatTekst.trim())
    setNieuweCatOnder(null)
    setNieuweCatTekst('')
  }

  return (
    <Kaart
      titel={t('Alle categorieën')}
      bijschrift={t('Vouw open om te bekijken. Je kan op elk niveau iets toevoegen.')}
    >
      <ul className="lijst">
        {boom.map((h, hIndex) => {
          const hOpen = openHoofd.has(h.id)
          const aantalItems = h.categorieen.reduce((s, c) => s + c.items.length, 0)
          return (
            <li key={h.id} style={{ borderBottom: '1px solid var(--rij-lijn)', padding: '2px 0' }}>
              {/* De open/dicht-knop en de twee pijltjes staan NAAST elkaar en niet
                  in elkaar: een knop in een knop bestaat niet in HTML. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="knop knop-kaal"
                aria-expanded={hOpen}
                onClick={() => wissel(openHoofd, setOpenHoofd, h.id)}
                style={{ ...takKnop, fontWeight: 600, flex: 1, minWidth: 0 }}
              >
                <span aria-hidden style={driehoek}>
                  {hOpen ? '▾' : '▸'}
                </span>
                <span aria-hidden style={hoofdTeken(h.kleur)}>
                  {h.icoon || h.naam.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="rij-midden">
                  <span className="rij-titel">{h.naam}</span>
                  {/* BEIDE aantallen, zoals in V1: het aantal categorieën zegt hoe
                      fijn de tak vertakt is, het aantal items hoe diep. Alleen dat
                      tweede tonen liet de middenlaag onbenoemd. */}
                  <span className="rij-meta">
                    {t('{c} cat. · {i} items', { c: h.categorieen.length, i: aantalItems })}
                    {h.eigen && <span style={{ color: 'var(--accent-ink)' }}> · {t('eigen')}</span>}
                  </span>
                </span>
              </button>

              {/* Volgorde wijzigen. Bewust twee knoppen en geen slepen: dit werkt
                  identiek met een muis, met een vinger én met het toetsenbord, en
                  het is volledig na te meten in de tests. De eerste kan niet
                  omhoog, de laatste niet omlaag. */}
              {onVerplaats && (
                <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="knop knop-kaal"
                    aria-label={t('Zet {naam} hoger', { naam: h.naam })}
                    disabled={hIndex === 0}
                    onClick={() => onVerplaats(h.id, -1)}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="knop knop-kaal"
                    aria-label={t('Zet {naam} lager', { naam: h.naam })}
                    disabled={hIndex === boom.length - 1}
                    onClick={() => onVerplaats(h.id, 1)}
                  >
                    ▼
                  </button>
                </span>
              )}
              </div>

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
                          style={{ ...takKnop, padding: '6px 8px', fontWeight: 500 }}
                        >
                          <span aria-hidden style={driehoek}>
                            {cOpen ? '▾' : '▸'}
                          </span>
                          <span className="rij-midden">
                            <span style={{ fontSize: 'var(--tekst-sm)' }}>
                              {c.naam}
                              {c.eigen && <span style={{ color: 'var(--accent-ink)' }}> · {t('eigen')}</span>}
                            </span>
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
                                <>
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
                                  {/* Een eigen middencategorie mag je weer weghalen;
                                      een ingebouwde niet — die is de referentie. */}
                                  {c.eigen && onCategorieVerwijderen && (
                                    <button
                                      type="button"
                                      className="knop knop-ghost knop-klein knop-gevaar"
                                      aria-label={t('Verwijder categorie {naam}', { naam: c.naam })}
                                      onClick={() => onCategorieVerwijderen(c.id)}
                                    >
                                      {t('Verwijderen')}
                                    </button>
                                  )}
                                </>
                              )}
                            </li>
                          </ul>
                        )}
                      </li>
                    )
                  })}

                  {/* Toevoegen op het MIDDENniveau. Dit ontbrak volledig: onder een
                      eigen hoofdcategorie kon je niets hangen, dus bleef ze een losse
                      naam terwijl de ingebouwde categorieën drie lagen hadden. */}
                  {onCategorieToevoegen && (
                    <li className="rij" style={{ ...bladRij, paddingTop: 6, paddingBottom: 6 }}>
                      {nieuweCatOnder === h.id ? (
                        <>
                          <input
                            aria-label={t('Nieuwe categorie in {naam}', { naam: h.naam })}
                            style={{ flex: 1, minWidth: 0 }}
                            value={nieuweCatTekst}
                            onChange={(e) => setNieuweCatTekst(e.target.value)}
                            placeholder={t('Naam categorie')}
                          />
                          <span className="rij-acties">
                            <button type="button" className="knop knop-secundair knop-klein" onClick={() => bewaarNieuweCategorie(h.id)}>
                              {t('Toevoegen')}
                            </button>
                            <button type="button" className="knop knop-kaal" onClick={() => setNieuweCatOnder(null)}>
                              ×
                            </button>
                          </span>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          aria-label={t('Voeg categorie toe aan {naam}', { naam: h.naam })}
                          onClick={() => {
                            setNieuweCatOnder(h.id)
                            setNieuweCatTekst('')
                          }}
                        >
                          {t('+ categorie')}
                        </button>
                      )}
                    </li>
                  )}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </Kaart>
  )
}
