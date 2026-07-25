import { useMemo, useState, type CSSProperties } from 'react'
import type { Categorie, Kind, Overboeking, Rekening, TerugkerendePost, Transactie } from '../data/schema'
import { Vermogensevolutie } from './Vermogensevolutie'
import { TrendsSectie } from './TrendsSectie'
import { VooruitblikSectie } from './VooruitblikSectie'
import {
  perHoofdcategorie,
  perItem,
  perWinkel,
  drillTransacties,
  drillPerItem,
  totaalVan,
  inPeriode,
  type Periode,
  type Richting,
  type AnalysePost,
} from '../utils/analyse'
import { categorieBedragen } from '../utils/transactie'
import { uitgavenPerPersoon } from '../utils/persoon'
import { Donut } from './Donut'
import { afgerondePercentages } from '../utils/donut'
import { formatEuro } from '../utils/format'
import { Kaart, PaginaKop, Leeg, Bedrag, Stat, Balk } from '../ui/basis'
import { useT } from '../i18n'
import { naarDatumTekst } from '../utils/datum'
import { isOmgekeerdBereik } from '../utils/transactieFilter'

// Palet voor lijstjes zonder eigen kleur (producten, winkels). Bewust vaste,
// onderscheidbare tinten; de kleur reist mee met het bedrag (zelfde data-object).
const PALET = ['#C56A1F', '#F59E0B', '#96588A', '#3E7C7B', '#3F8A58', '#C97B8B', '#C1502E', '#4E8D8C', '#7A8B3E', '#A34A5E', '#83705C', '#2C6CB0']
const OVERIGE_KLEUR = '#A08C77'

type Gekleurd = AnalysePost & { kleur: string }
function kleuren(posten: AnalysePost[]): Gekleurd[] {
  return posten.map((p, i) => ({ ...p, kleur: PALET[i % PALET.length] }))
}

// Kleurstipje links in een rij: enkel de vorm ligt vast, de kleur komt uit de
// data zelf.
const stip: CSSProperties = { width: 10, height: 10, borderRadius: 3, flexShrink: 0 }
const afkap: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
// Een hele lijstrij die klikbaar is: knop zonder eigen knop-look, met de
// rij-opmaak eromheen.
const rijKnop: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 8,
  padding: '12px 0',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--rij-lijn)',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'var(--text)',
  font: 'inherit',
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
  // Percentages over de VOLLEDIGE lijst berekenen (niet enkel de zichtbare top 10),
  // zodat een rij hetzelfde percentage houdt als je de lijst uitklapt. 'legende' is
  // altijd het begin van 'posten', dus de plaatsen lopen gelijk.
  const percentages = afgerondePercentages(posten.map((p) => p.bedrag))

  return (
    <Kaart titel={titel} bijschrift={subtitel}>
      <Donut items={ring} toonLegende={false} middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'} />
      <ul className="lijst" style={{ maxHeight: toonAlles ? 260 : undefined, overflowY: toonAlles ? 'auto' : undefined }}>
        {legende.map((p, i) => (
          <li key={`${i}-${p.naam}`} className="rij">
            <span style={{ ...stip, background: p.kleur }} />
            <span className="rij-midden">
              <span className="rij-titel" style={afkap}>
                {p.naam}
              </span>
              <span className="rij-meta">{percentages[i]}%</span>
            </span>
            <Bedrag centen={p.bedrag} />
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <div className="knoprij">
          <button className="knop knop-ghost knop-klein" onClick={() => setToonAlles((s) => !s)}>
            {toonAlles ? t('Toon minder') : t('Toon alle {n} — incl. {m} overige', { n: posten.length, m: rest.length })}
          </button>
        </div>
      )}
      <div className="stat-rij" style={{ paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
        <Stat label={t('Totaal')}>{formatEuro(totaal)}</Stat>
      </div>
    </Kaart>
  )
}

export function AnalyseSectie({
  transacties,
  categorieen,
  rekeningen,
  overboekingen,
  terugkerendePosten,
  gezinsleden = [],
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  rekeningen: Rekening[]
  overboekingen: Overboeking[]
  terugkerendePosten: TerugkerendePost[]
  // Optioneel: zonder ingestelde gezinsleden blijft het blok 'per gezinslid'
  // gewoon weg — het zou dan alleen maar verwarren.
  gezinsleden?: Kind[]
}) {
  const { t } = useT()
  const [richting, setRichting] = useState<Richting>('uitgave')
  const [keuze, setKeuze] = useState<'maand' | 'vorige' | 'jaar' | 'alles' | 'aangepast'>('maand')
  const [van, setVan] = useState('')
  const [tot, setTot] = useState('')
  const [drill, setDrill] = useState<{ sleutel: string; naam: string } | null>(null)

  // Een aangepast bereik waarvan de einddatum vóór de begindatum ligt, levert
  // nergens resultaten op. Vroeger bleef het scherm dan zwijgend leeg (en werd het
  // aantal dagen voor de vergelijking zelfs negatief). We merken dat geval nu op,
  // zeggen het in één regel, en rekenen verder niets uit.
  const bereikOmgekeerd = keuze === 'aangepast' && isOmgekeerdBereik(van, tot)

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

  // De vorige, vergelijkbare periode (voor stijgers/dalers). 'Alles' en een
  // onvolledig aangepast bereik hebben geen zinvolle vorige periode.
  const vorige: Periode | null = useMemo(() => {
    const nu = new Date()
    const iso = naarDatumTekst
    if (keuze === 'maand') {
      const m = maandStr(new Date(nu.getFullYear(), nu.getMonth() - 1, 1))
      return { van: `${m}-01`, tot: `${m}-31` }
    }
    if (keuze === 'vorige') {
      const m = maandStr(new Date(nu.getFullYear(), nu.getMonth() - 2, 1))
      return { van: `${m}-01`, tot: `${m}-31` }
    }
    if (keuze === 'jaar') {
      const j = nu.getFullYear() - 1
      return { van: `${j}-01-01`, tot: `${j}-12-31` }
    }
    if (keuze === 'aangepast') {
      if (!van || !tot || isOmgekeerdBereik(van, tot)) return null
      const vd = new Date(van)
      const td = new Date(tot)
      const dagen = Math.round((td.getTime() - vd.getTime()) / 86400000)
      const prevTot = new Date(vd.getTime() - 86400000)
      const prevVan = new Date(prevTot.getTime() - dagen * 86400000)
      return { van: iso(prevVan), tot: iso(prevTot) }
    }
    return null // alles
  }, [keuze, van, tot])

  // Bij een omgekeerd bereik rekenen we bewust niets uit: lege kaarten met nullen
  // zouden suggereren dat er écht niets is.
  const byOv = useMemo(
    () => (bereikOmgekeerd ? [] : perHoofdcategorie(transacties, categorieen, periode, richting)),
    [bereikOmgekeerd, transacties, categorieen, periode, richting],
  )
  const byItem = useMemo(
    () => (bereikOmgekeerd ? [] : kleuren(perItem(transacties, categorieen, periode, richting))),
    [bereikOmgekeerd, transacties, categorieen, periode, richting],
  )
  const byWinkel = useMemo(
    () => (bereikOmgekeerd ? [] : kleuren(perWinkel(transacties, periode, richting))),
    [bereikOmgekeerd, transacties, periode, richting],
  )
  const totaal = totaalVan(byOv)

  // Verdeling per gezinslid. Het bedrag per transactie wordt opgebouwd uit de
  // deelregels (categorieBedragen), zodat een gesplitst kassaticket exact even
  // zwaar meetelt als een gewone transactie — en daarna gelijk verdeeld over de
  // personen die eraan hangen.
  const perPersoon = useMemo(() => {
    if (bereikOmgekeerd || gezinsleden.length === 0) return []
    const posten = transacties
      .filter((tx) => inPeriode(tx.datum, periode))
      .map((tx) => ({
        bedrag: categorieBedragen(tx)
          .filter((r) => (richting === 'uitgave' ? r.bedrag < 0 : r.bedrag > 0))
          .reduce((s, r) => s + Math.abs(r.bedrag), 0),
        persoonIds: tx.persoonIds,
      }))
      .filter((p) => p.bedrag > 0)
    return uitgavenPerPersoon(posten, gezinsleden, {
      nietToegewezen: t('Niet toegewezen'),
      onbekend: t('Onbekend gezinslid'),
    })
  }, [bereikOmgekeerd, gezinsleden, transacties, periode, richting, t])

  // Kleuren zoals elders op deze pagina; de restgroep krijgt bewust de neutrale
  // 'overige'-tint, zodat ze niet als een persoon leest.
  const perPersoonGekleurd = useMemo(
    () =>
      kleuren(perPersoon.map((p) => ({ naam: p.naam, bedrag: p.bedrag }))).map((p, i) =>
        perPersoon[i].id === null ? { ...p, kleur: OVERIGE_KLEUR } : p,
      ),
    [perPersoon],
  )

  const drillTxs = useMemo(
    () => (drill && !bereikOmgekeerd ? drillTransacties(transacties, categorieen, periode, richting, drill.sleutel) : []),
    [bereikOmgekeerd, drill, transacties, categorieen, periode, richting],
  )
  const drillSub = useMemo(() => kleuren(drillPerItem(drillTxs, categorieen)), [drillTxs, categorieen])
  const drillTotaal = totaalVan(drillTxs.map((d) => ({ bedrag: d.bedrag })))

  // Percentages per rij: in één keer berekend zodat elke kolom op exact 100% sluit.
  const ovPercentages = afgerondePercentages(byOv.map((g) => g.bedrag))
  const drillSubPercentages = afgerondePercentages(drillSub.map((p) => p.bedrag))

  const perioden: [typeof keuze, string][] = [
    ['maand', t('Deze maand')],
    ['vorige', t('Vorige maand')],
    ['jaar', t('Dit jaar')],
    ['alles', t('Alles')],
    ['aangepast', t('Aangepast')],
  ]
  const leegTekst = richting === 'uitgave' ? t('Geen uitgaven in deze periode') : t('Geen inkomsten in deze periode')
  const donutInvoer = byOv.map((g) => ({ naam: g.naam, bedrag: g.bedrag, kleur: g.kleur }))
  const periodeLabel = perioden.find(([k]) => k === keuze)?.[1] ?? ''

  return (
    <section className="stapel">
      <PaginaKop
        titel={drill ? drill.naam : t('Analyse')}
        actie={
          drill ? (
            <button className="knop knop-secundair knop-klein" onClick={() => setDrill(null)}>
              ‹ {t('Terug')}
            </button>
          ) : undefined
        }
      />

      {/* Richting: uitgaven of inkomsten */}
      <div className="knoprij" style={{ gap: 8 }}>
        <button
          className={richting === 'uitgave' ? 'chip chip-actief' : 'chip'}
          onClick={() => {
            setRichting('uitgave')
            setDrill(null)
          }}
        >
          {t('Uitgaven')}
        </button>
        <button
          className={richting === 'inkomst' ? 'chip chip-actief' : 'chip'}
          onClick={() => {
            setRichting('inkomst')
            setDrill(null)
          }}
        >
          {t('Inkomsten')}
        </button>
      </div>

      {/* Periode */}
      <div className="knoprij" style={{ gap: 8 }}>
        {perioden.map(([k, label]) => (
          <button key={k} className={keuze === k ? 'chip chip-actief' : 'chip'} onClick={() => setKeuze(k)}>
            {label}
          </button>
        ))}
        {keuze === 'aangepast' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input type="date" aria-label={t('Periode van')} value={van} onChange={(e) => setVan(e.target.value)} style={{ fontSize: 13, padding: '8px 10px' }} />
            <span className="rij-meta">{t('t/m')}</span>
            <input type="date" aria-label={t('Periode tot')} value={tot} onChange={(e) => setTot(e.target.value)} style={{ fontSize: 13, padding: '8px 10px' }} />
          </span>
        )}
      </div>

      {bereikOmgekeerd && (
        <Kaart>
          <Leeg>{t('De einddatum ligt vóór de begindatum.')}</Leeg>
        </Kaart>
      )}

      {!drill && !bereikOmgekeerd && (
        <>
          {/* Verdeling per hoofdcategorie + ranglijst */}
          <Kaart
            titel={richting === 'uitgave' ? t('Verdeling uitgaven') : t('Verdeling inkomsten')}
            bijschrift={t('Per hoofdcategorie')}
          >
            {byOv.length === 0 ? (
              <Leeg>{leegTekst}</Leeg>
            ) : (
              <>
                <Donut items={donutInvoer} toonLegende={false} middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'} />
                <p className="kaart-bijschrift" style={{ margin: 0 }}>
                  {t('Ranglijst')} — {t('klik voor detail')}
                </p>
                <ul className="lijst">
                  {byOv.map((g, i) => {
                    const fractie = totaal > 0 ? g.bedrag / totaal : 0
                    return (
                      <li key={g.sleutel}>
                        <button
                          onClick={() => setDrill({ sleutel: g.sleutel, naam: g.naam })}
                          style={{ ...rijKnop, borderBottom: i === byOv.length - 1 ? 'none' : rijKnop.borderBottom }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ ...stip, background: g.kleur ?? OVERIGE_KLEUR }} />
                            <span className="rij-midden">
                              <span className="rij-titel" style={afkap}>
                                {g.naam}
                              </span>
                              <span className="rij-meta">{ovPercentages[i]}%</span>
                            </span>
                            <Bedrag centen={g.bedrag} />
                            <span className="rij-meta">›</span>
                          </span>
                          {/* Balkje in de knop: bewust de kale balk-klassen, zodat we geen
                              tweede rol/naam binnen de knop introduceren. */}
                          <span className="balk">
                            <span className="balk-vulling" style={{ display: 'block', width: `${fractie * 100}%`, background: g.kleur ?? OVERIGE_KLEUR }} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div className="stat-rij" style={{ paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
                  <Stat label={t('Totaal')}>{formatEuro(totaal)}</Stat>
                </div>
              </>
            )}
          </Kaart>

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

          {perPersoonGekleurd.length > 0 && (
            <DonutKaart
              titel={richting === 'uitgave' ? t('Uitgaven per gezinslid') : t('Inkomsten per gezinslid')}
              subtitel={t('Hangt een transactie aan meerdere gezinsleden, dan wordt het bedrag gelijk over hen verdeeld.')}
              posten={perPersoonGekleurd}
              richting={richting}
            />
          )}

          <TrendsSectie transacties={transacties} categorieen={categorieen} richting={richting} huidige={periode} vorige={vorige} />

          <Vermogensevolutie rekeningen={rekeningen} transacties={transacties} overboekingen={overboekingen} />

          <VooruitblikSectie transacties={transacties} terugkerendePosten={terugkerendePosten} periode={periode} periodeLabel={periodeLabel} />
        </>
      )}

      {drill && !bereikOmgekeerd && (
        <>
          <Kaart>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="rij-midden">
                <span className="rij-titel" style={{ fontSize: 17 }}>
                  {drill.naam}
                </span>
                <span className="rij-meta">{t('{n} transacties in de periode', { n: drillTxs.length })}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <Bedrag centen={drillTotaal} groot />
                {totaal > 0 && (
                  <span className="rij-meta">
                    {Math.round((drillTotaal / totaal) * 100)}% {t('van het totaal')}
                  </span>
                )}
              </span>
            </div>
          </Kaart>

          {drillSub.length > 0 && (
            <Kaart titel={t('Per subcategorie')}>
              <Donut
                items={drillSub.map((p) => ({ naam: p.naam, bedrag: p.bedrag, kleur: p.kleur }))}
                toonLegende={false}
                middenLabel={richting === 'uitgave' ? 'uitgaven' : 'inkomsten'}
              />
              <ul className="lijst">
                {drillSub.map((p, i) => {
                  const fractie = drillTotaal > 0 ? p.bedrag / drillTotaal : 0
                  return (
                    <li key={`${i}-${p.naam}`} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ ...stip, background: p.kleur }} />
                        <span className="rij-midden">
                          <span className="rij-titel" style={afkap}>
                            {p.naam}
                          </span>
                          <span className="rij-meta">{drillSubPercentages[i]}%</span>
                        </span>
                        <Bedrag centen={p.bedrag} />
                      </span>
                      <Balk label={p.naam} fractie={fractie} kleur={p.kleur} />
                    </li>
                  )
                })}
              </ul>
            </Kaart>
          )}

          <Kaart titel={t('Alle transacties')}>
            {drillTxs.length === 0 ? (
              <Leeg>{leegTekst}</Leeg>
            ) : (
              <ul className="lijst">
                {drillTxs.map((d, i) => (
                  <li key={d.transactie.id || i} className="rij">
                    <span className="rij-meta" style={{ width: 52, flexShrink: 0 }}>
                      {datumKort(d.transactie.datum)}
                    </span>
                    <span className="rij-midden">
                      <span className="rij-titel" style={afkap}>
                        {d.transactie.omschrijving || t('Zonder omschrijving')}
                        {d.transactie.regels && d.transactie.regels.length > 0 && (
                          <span className="rij-meta"> · {t('Kassaticket gesplitst')}</span>
                        )}
                      </span>
                    </span>
                    <span className={richting === 'uitgave' ? 'bedrag bedrag-negatief' : 'bedrag bedrag-positief'}>
                      {richting === 'uitgave' ? '−' : '+'}
                      {formatEuro(d.bedrag)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Kaart>
        </>
      )}
    </section>
  )
}
