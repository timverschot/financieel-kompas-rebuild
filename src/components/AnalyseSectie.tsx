import { useMemo, useState, type CSSProperties } from 'react'
import type { Categorie, Overboeking, Rekening, Transactie } from '../data/schema'
import { Vermogensevolutie } from './Vermogensevolutie'
import {
  perHoofdcategorie,
  perItem,
  perWinkel,
  drillTransacties,
  drillPerItem,
  totaalVan,
  type Periode,
  type Richting,
  type AnalysePost,
} from '../utils/analyse'
import { Donut } from './Donut'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

// Palet voor lijstjes zonder eigen kleur (producten, winkels). Bewust vaste,
// onderscheidbare tinten; de kleur reist mee met het bedrag (zelfde data-object).
const PALET = ['#C56A1F', '#F59E0B', '#96588A', '#3E7C7B', '#3F8A58', '#C97B8B', '#C1502E', '#4E8D8C', '#7A8B3E', '#A34A5E', '#83705C', '#2C6CB0']
const OVERIGE_KLEUR = '#A08C77'

type Gekleurd = AnalysePost & { kleur: string }
function kleuren(posten: AnalysePost[]): Gekleurd[] {
  return posten.map((p, i) => ({ ...p, kleur: PALET[i % PALET.length] }))
}

const kaart: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '1rem',
  marginBottom: '1rem',
}
const knopKlein: CSSProperties = {
  padding: '0.3rem 0.7rem',
  borderRadius: 8,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: '0.8rem',
}
const knopActief: CSSProperties = {
  ...knopKlein,
  background: 'var(--accent-strong)',
  borderColor: 'var(--accent-strong)',
  color: 'var(--on-accent)',
  fontWeight: 600,
}

function maandStr(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}
function datumKort(datum: string): string {
  const [j, m, d] = datum.split('-').map(Number)
  return new Intl.DateTimeFormat('nl-BE', { day: '2-digit', month: 'short' }).format(new Date(j, m - 1, d))
}

// Uitklapbare donutkaart: het diagram toont top 10 + een 'Overige'-schijf; de
// legende toont standaard de top 10 en kan naar alles uitklappen.
function DonutKaart({ titel, subtitel, posten, richting }: { titel: string; subtitel?: string; posten: Gekleurd[]; richting: Richting }) {
  const { t } = useT()
  const [toonAlles, setToonAlles] = useState(false)
  const totaal = totaalVan(posten)
  const top10 = posten.slice(0, 10)
  const rest = posten.slice(10)
  const restTotaal = totaalVan(rest)
  const ring = top10.map((p) => ({ naam: p.naam, bedrag: p.bedrag, kleur: p.kleur }))
  if (restTotaal > 0) ring.push({ naam: t('Overige ({n})', { n: rest.length }), bedrag: restTotaal, kleur: OVERIGE_KLEUR })
  const legende = toonAlles ? posten : top10

  return (
    <div style={kaart}>
      <h3 style={{ margin: '0 0 0.15rem', fontSize: '0.95rem' }}>{titel}</h3>
      {subtitel && <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0 0 0.6rem' }}>{subtitel}</p>}
      <Donut items={ring} toonLegende={false} middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'} />
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.6rem 0 0', maxHeight: toonAlles ? 260 : undefined, overflowY: toonAlles ? 'auto' : undefined }}>
        {legende.map((p) => (
          <li key={p.naam} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.kleur, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{p.naam}</span>
            <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', width: 40, textAlign: 'right' }}>{totaal > 0 ? Math.round((p.bedrag / totaal) * 100) : 0}%</span>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatEuro(p.bedrag)}</span>
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <button onClick={() => setToonAlles((s) => !s)} style={{ ...knopKlein, marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-strong)', padding: '0.2rem 0' }}>
          {toonAlles ? t('Toon minder') : t('Toon alle {n} — incl. {m} overige', { n: posten.length, m: rest.length })}
        </button>
      )}
      <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{t('Totaal')}</span>
        <span>{formatEuro(totaal)}</span>
      </div>
    </div>
  )
}

export function AnalyseSectie({
  transacties,
  categorieen,
  rekeningen,
  overboekingen,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  rekeningen: Rekening[]
  overboekingen: Overboeking[]
}) {
  const { t } = useT()
  const [richting, setRichting] = useState<Richting>('uitgave')
  const [keuze, setKeuze] = useState<'maand' | 'vorige' | 'jaar' | 'alles' | 'aangepast'>('maand')
  const [van, setVan] = useState('')
  const [tot, setTot] = useState('')
  const [drill, setDrill] = useState<{ sleutel: string; naam: string } | null>(null)

  // Periode omzetten naar een van/tot-bereik. Los gehouden van de rekenkern zodat
  // die zuiver testbaar blijft.
  const periode: Periode = useMemo(() => {
    const nu = new Date()
    if (keuze === 'maand') {
      const m = maandStr(nu)
      return { van: `${m}-01`, tot: `${m}-31` }
    }
    if (keuze === 'vorige') {
      const v = new Date(nu.getFullYear(), nu.getMonth() - 1, 1)
      const m = maandStr(v)
      return { van: `${m}-01`, tot: `${m}-31` }
    }
    if (keuze === 'jaar') {
      const j = nu.getFullYear()
      return { van: `${j}-01-01`, tot: `${j}-12-31` }
    }
    if (keuze === 'aangepast') return { van: van || undefined, tot: tot || undefined }
    return {}
  }, [keuze, van, tot])

  const byOv = useMemo(() => perHoofdcategorie(transacties, categorieen, periode, richting), [transacties, categorieen, periode, richting])
  const byItem = useMemo(() => kleuren(perItem(transacties, categorieen, periode, richting)), [transacties, categorieen, periode, richting])
  const byWinkel = useMemo(() => kleuren(perWinkel(transacties, periode, richting)), [transacties, periode, richting])
  const totaal = totaalVan(byOv)

  const drillTxs = useMemo(
    () => (drill ? drillTransacties(transacties, categorieen, periode, richting, drill.sleutel) : []),
    [drill, transacties, categorieen, periode, richting],
  )
  const drillSub = useMemo(() => kleuren(drillPerItem(drillTxs, categorieen)), [drillTxs, categorieen])
  const drillTotaal = totaalVan(drillTxs.map((d) => ({ bedrag: d.bedrag })))

  const perioden: [typeof keuze, string][] = [
    ['maand', t('Deze maand')],
    ['vorige', t('Vorige maand')],
    ['jaar', t('Dit jaar')],
    ['alles', t('Alles')],
    ['aangepast', t('Aangepast')],
  ]
  const leegTekst = richting === 'uitgave' ? t('Geen uitgaven in deze periode') : t('Geen inkomsten in deze periode')
  const donutInvoer = byOv.map((g) => ({ naam: g.naam, bedrag: g.bedrag, kleur: g.kleur }))

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
        {drill && (
          <button onClick={() => setDrill(null)} style={{ ...knopKlein, background: 'none', border: 'none', color: 'var(--accent-strong)', padding: 0 }}>
            ‹ {t('Terug')}
          </button>
        )}
        <h2 style={{ fontSize: '1rem', margin: 0 }}>{drill ? drill.naam : t('Analyse')}</h2>
      </div>

      {/* Richting: uitgaven of inkomsten */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <button onClick={() => { setRichting('uitgave'); setDrill(null) }} style={richting === 'uitgave' ? knopActief : knopKlein}>{t('Uitgaven')}</button>
        <button onClick={() => { setRichting('inkomst'); setDrill(null) }} style={richting === 'inkomst' ? knopActief : knopKlein}>{t('Inkomsten')}</button>
      </div>

      {/* Periode */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', marginBottom: '1rem' }}>
        {perioden.map(([k, label]) => (
          <button key={k} onClick={() => setKeuze(k)} style={keuze === k ? knopActief : knopKlein}>{label}</button>
        ))}
        {keuze === 'aangepast' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input type="date" aria-label={t('Periode van')} value={van} onChange={(e) => setVan(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.3rem' }} />
            <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{t('t/m')}</span>
            <input type="date" aria-label={t('Periode tot')} value={tot} onChange={(e) => setTot(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.3rem' }} />
          </span>
        )}
      </div>

      {!drill && (
        <>
          {/* Verdeling per hoofdcategorie + ranglijst */}
          <div style={kaart}>
            <h3 style={{ margin: '0 0 0.15rem', fontSize: '0.95rem' }}>{richting === 'uitgave' ? t('Verdeling uitgaven') : t('Verdeling inkomsten')}</h3>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0 0 0.6rem' }}>{t('Per hoofdcategorie')}</p>
            {byOv.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>{leegTekst}</p>
            ) : (
              <>
                <Donut items={donutInvoer} toonLegende={false} middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'} />
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: '0.6rem 0 0.4rem' }}>{t('Ranglijst')} — {t('klik voor detail')}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {byOv.map((g) => {
                    const fractie = totaal > 0 ? g.bedrag / totaal : 0
                    return (
                      <li key={g.sleutel}>
                        <button
                          onClick={() => setDrill({ sleutel: g.sleutel, naam: g.naam })}
                          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem 0', color: 'var(--text)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: g.kleur ?? OVERIGE_KLEUR, flexShrink: 0 }} />
                              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.naam}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{Math.round(fractie * 100)}%</span>
                              <span style={{ fontWeight: 600 }}>{formatEuro(g.bedrag)}</span>
                              <span style={{ color: 'var(--text-subtle)' }}>›</span>
                            </span>
                          </div>
                          <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${fractie * 100}%`, background: g.kleur ?? OVERIGE_KLEUR }} />
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('Totaal')}</span>
                  <span>{formatEuro(totaal)}</span>
                </div>
              </>
            )}
          </div>

          {byItem.length > 0 && (
            <DonutKaart
              titel={t('Verdeling per product/dienst')}
              subtitel={t('Subcategorieën — brood, koffiekoeken, elektriciteit…')}
              posten={byItem}
              richting={richting}
            />
          )}
          {byWinkel.length > 0 && (
            <DonutKaart
              titel={richting === 'uitgave' ? t('Uitgaven per winkel') : t('Inkomsten per bron')}
              subtitel={t('Gebaseerd op de omschrijving bij elke transactie')}
              posten={byWinkel}
              richting={richting}
            />
          )}

          <Vermogensevolutie rekeningen={rekeningen} transacties={transacties} overboekingen={overboekingen} />
        </>
      )}

      {drill && (
        <>
          <div style={{ ...kaart, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{drill.naam}</div>
              <div style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{t('{n} transacties in de periode', { n: drillTxs.length })}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{formatEuro(drillTotaal)}</div>
              {totaal > 0 && <div style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{Math.round((drillTotaal / totaal) * 100)}% {t('van het totaal')}</div>}
            </div>
          </div>

          {drillSub.length > 0 && (
            <div style={kaart}>
              <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.95rem' }}>{t('Per subcategorie')}</h3>
              <Donut items={drillSub.map((p) => ({ naam: p.naam, bedrag: p.bedrag, kleur: p.kleur }))} toonLegende={false} middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0.6rem 0 0' }}>
                {drillSub.map((p) => {
                  const fractie = drillTotaal > 0 ? p.bedrag / drillTotaal : 0
                  return (
                    <li key={p.naam} style={{ padding: '0.25rem 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.kleur, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.naam}</span>
                        </span>
                        <span style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>{Math.round(fractie * 100)}%</span>
                          <span style={{ fontWeight: 600 }}>{formatEuro(p.bedrag)}</span>
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${fractie * 100}%`, background: p.kleur }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div style={kaart}>
            <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.95rem' }}>{t('Alle transacties')}</h3>
            {drillTxs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>{leegTekst}</p>
            ) : (
              <div>
                {drillTxs.map((d, i) => (
                  <div key={d.transactie.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', width: 52, flexShrink: 0 }}>{datumKort(d.transactie.datum)}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.transactie.omschrijving || t('Zonder omschrijving')}
                      {d.transactie.regels && d.transactie.regels.length > 0 && (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}> · {t('Kassaticket gesplitst')}</span>
                      )}
                    </span>
                    <span style={{ fontWeight: 700, color: richting === 'uitgave' ? 'var(--negative)' : 'var(--positive)', flexShrink: 0 }}>{richting === 'uitgave' ? '−' : '+'}{formatEuro(d.bedrag)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
