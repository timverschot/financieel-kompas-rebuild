import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie, Rekening, Transactie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { formatEuro } from '../utils/format'
import { filterTransacties, heeftActiefFilter, grensDatumMaandenTerug, type TxFilter } from '../utils/transactieFilter'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)
const STANDAARD_MAANDEN = 6

const veld: CSSProperties = { display: 'block', width: '100%', padding: '0.4rem', marginTop: 2, boxSizing: 'border-box' }
const filterBlok: CSSProperties = { background: '#faf9f7', border: '1px solid #eee', borderRadius: 8, padding: '0.6rem', marginBottom: '0.75rem' }

// De transactielijst met zoek-/filterbalk en een historiek-venster. Standaard
// toont ze enkel de recente maanden (ouder op aanvraag); zodra je zoekt of filtert,
// wordt de volledige historiek doorzocht. Analyses/budgetten/doelen elders blijven
// altijd op de volledige data rekenen — dit venster is enkel voor deze lijst.
export function TransactieLijst({
  transacties,
  categorieen,
  rekeningen,
  onBewerk,
  onVerwijder,
}: {
  transacties: Transactie[]
  categorieen: Categorie[]
  rekeningen: Rekening[]
  onBewerk: (tx: Transactie) => void
  onVerwijder: (id: string) => void
}) {
  const { t } = useT()
  const [filter, setFilter] = useState<TxFilter>({})
  const [toonAlles, setToonAlles] = useState(false)

  // De mid-categorieën van de gekozen hoofdcategorie (voor de tweede keuzelijst).
  const subOpties = useMemo(() => {
    const hoofd = INGEBOUWDE_CATEGORIEEN.find((h) => h.id === filter.hoofdId)
    return hoofd ? hoofd.categorieen : []
  }, [filter.hoofdId])

  const gefilterd = useMemo(() => filterTransacties(transacties, filter), [transacties, filter])
  const gesorteerd = useMemo(() => [...gefilterd].sort((a, b) => (a.datum < b.datum ? 1 : -1)), [gefilterd])

  const actief = heeftActiefFilter(filter)
  const grens = grensDatumMaandenTerug(vandaag(), STANDAARD_MAANDEN)
  const venster = !actief && !toonAlles
  const zichtbaar = venster ? gesorteerd.filter((tx) => tx.datum >= grens) : gesorteerd
  const verborgen = gesorteerd.length - zichtbaar.length

  function zet(deel: Partial<TxFilter>) {
    setFilter((f) => ({ ...f, ...deel }))
  }

  function wis() {
    setFilter({})
    setToonAlles(false)
  }

  const categorieNaam = (id?: string) => labelVanCategorie(id, categorieen)

  return (
    <section>
      <div style={filterBlok}>
        <input
          aria-label={t('Zoek in transacties')}
          style={veld}
          placeholder={t('Zoek op omschrijving…')}
          value={filter.zoek ?? ''}
          onChange={(e) => zet({ zoek: e.target.value })}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <label style={{ flex: 1, minWidth: 130 }}>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>{t('Richting')}</span>
            <select style={veld} value={filter.richting ?? ''} onChange={(e) => zet({ richting: (e.target.value || undefined) as TxFilter['richting'] })}>
              <option value="">{t('Alles')}</option>
              <option value="in">{t('Inkomsten')}</option>
              <option value="uit">{t('Uitgaven')}</option>
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 130 }}>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>{t('Rekening')}</span>
            <select style={veld} value={filter.rekeningId ?? ''} onChange={(e) => zet({ rekeningId: e.target.value || undefined })}>
              <option value="">{t('Alle rekeningen')}</option>
              {rekeningen.map((r) => (
                <option key={r.id} value={r.id}>{r.naam}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <label style={{ flex: 1, minWidth: 130 }}>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>{t('Hoofdcategorie')}</span>
            <select
              style={veld}
              value={filter.hoofdId ?? ''}
              onChange={(e) => zet({ hoofdId: e.target.value || undefined, catId: undefined })}
            >
              <option value="">{t('Alle categorieën')}</option>
              {INGEBOUWDE_CATEGORIEEN.map((h) => (
                <option key={h.id} value={h.id}>{h.naam}</option>
              ))}
              {categorieen.length > 0 && (
                <optgroup label={t('Eigen categorieën')}>
                  {categorieen.map((c) => (
                    <option key={c.id} value={c.id}>{c.naam}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {subOpties.length > 0 && (
            <label style={{ flex: 1, minWidth: 130 }}>
              <span style={{ fontSize: '0.8rem', color: '#555' }}>{t('Subcategorie')}</span>
              <select style={veld} value={filter.catId ?? ''} onChange={(e) => zet({ catId: e.target.value || undefined })}>
                <option value="">{t('Alle subcategorieën')}</option>
                {subOpties.map((c) => (
                  <option key={c.id} value={c.id}>{c.naam}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', alignItems: 'flex-end' }}>
          <label style={{ flex: 1, minWidth: 120 }}>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>{t('Van')}</span>
            <input type="date" style={veld} value={filter.van ?? ''} onChange={(e) => zet({ van: e.target.value || undefined })} />
          </label>
          <label style={{ flex: 1, minWidth: 120 }}>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>{t('Tot')}</span>
            <input type="date" style={veld} value={filter.tot ?? ''} onChange={(e) => zet({ tot: e.target.value || undefined })} />
          </label>
          {actief && (
            <button type="button" onClick={wis} style={{ padding: '0.4rem 0.7rem', borderRadius: 8, border: '1px solid #ccc', background: '#f2f2f2', cursor: 'pointer' }}>
              {t('Wis filters')}
            </button>
          )}
        </div>
      </div>

      <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>
        {actief
          ? t('{n} transactie(s) gevonden', { n: gesorteerd.length })
          : t('{n} transactie(s) getoond', { n: zichtbaar.length })}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {zichtbaar.map((tx) => {
          const cat = tx.regels && tx.regels.length > 0 ? t('gesplitst · {n} categorieën', { n: tx.regels.length }) : categorieNaam(tx.categorieId)
          return (
            <li key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <span>
                {tx.omschrijving}
                <span style={{ color: '#999', fontSize: '0.85rem' }}>
                  {' '}· {tx.datum}
                  {cat && ` · ${cat}`}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: tx.bedrag < 0 ? '#c0392b' : '#27ae60' }}>{formatEuro(tx.bedrag)}</span>
                <button aria-label={t('Bewerk {oms}', { oms: tx.omschrijving })} onClick={() => onBewerk(tx)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer', fontSize: '1rem' }}>✎</button>
                <button aria-label={t('Verwijder {oms}', { oms: tx.omschrijving })} onClick={() => onVerwijder(tx.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
              </span>
            </li>
          )
        })}
      </ul>

      {zichtbaar.length === 0 && <p style={{ color: '#888' }}>{t('Geen transacties gevonden.')}</p>}

      {venster && verborgen > 0 && (
        <button
          type="button"
          onClick={() => setToonAlles(true)}
          style={{ marginTop: '0.6rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
        >
          {t('Toon oudere transacties ({n} ouder dan {maanden} maanden)', { n: verborgen, maanden: STANDAARD_MAANDEN })}
        </button>
      )}
      {!venster && !actief && toonAlles && (
        <button
          type="button"
          onClick={() => setToonAlles(false)}
          style={{ marginTop: '0.6rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
        >
          {t('Toon enkel recente maanden')}
        </button>
      )}
    </section>
  )
}
