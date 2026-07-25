import { useMemo, useState } from 'react'
import type { Categorie, Rekening, Transactie } from '../data/schema'
import { INGEBOUWDE_CATEGORIEEN } from '../data/categorieen/ingebouwd'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { filterTransacties, heeftActiefFilter, grensDatumMaandenTerug, type TxFilter } from '../utils/transactieFilter'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'
import { vandaag } from '../utils/datum'

const STANDAARD_MAANDEN = 6

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
  const rekeningNaam = (id: string) => rekeningen.find((r) => r.id === id)?.naam

  return (
    <section className="stapel">
      <Kaart>
        <div className="veldgroep">
          <input
            aria-label={t('Zoek in transacties')}
            placeholder={t('Zoek op omschrijving…')}
            value={filter.zoek ?? ''}
            onChange={(e) => zet({ zoek: e.target.value })}
          />
        </div>

        <div className="veldrij">
          <label className="veldgroep">
            <span className="label-caps">{t('Richting')}</span>
            <select value={filter.richting ?? ''} onChange={(e) => zet({ richting: (e.target.value || undefined) as TxFilter['richting'] })}>
              <option value="">{t('Alles')}</option>
              <option value="in">{t('Inkomsten')}</option>
              <option value="uit">{t('Uitgaven')}</option>
            </select>
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Rekening')}</span>
            <select value={filter.rekeningId ?? ''} onChange={(e) => zet({ rekeningId: e.target.value || undefined })}>
              <option value="">{t('Alle rekeningen')}</option>
              {rekeningen.map((r) => (
                <option key={r.id} value={r.id}>{r.naam}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="veldrij">
          <label className="veldgroep">
            <span className="label-caps">{t('Hoofdcategorie')}</span>
            <select
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
            <label className="veldgroep">
              <span className="label-caps">{t('Subcategorie')}</span>
              <select value={filter.catId ?? ''} onChange={(e) => zet({ catId: e.target.value || undefined })}>
                <option value="">{t('Alle subcategorieën')}</option>
                {subOpties.map((c) => (
                  <option key={c.id} value={c.id}>{c.naam}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="veldrij">
          <label className="veldgroep">
            <span className="label-caps">{t('Van')}</span>
            <input type="date" value={filter.van ?? ''} onChange={(e) => zet({ van: e.target.value || undefined })} />
          </label>
          <label className="veldgroep">
            <span className="label-caps">{t('Tot')}</span>
            <input type="date" value={filter.tot ?? ''} onChange={(e) => zet({ tot: e.target.value || undefined })} />
          </label>
          {actief && (
            <button type="button" className="chip" onClick={wis} style={{ alignSelf: 'flex-end' }}>
              {t('Wis filters')}
            </button>
          )}
        </div>
      </Kaart>

      <Kaart>
        <p className="kaart-bijschrift" style={{ margin: 0 }}>
          {actief
            ? t('{n} transactie(s) gevonden', { n: gesorteerd.length })
            : t('{n} transactie(s) getoond', { n: zichtbaar.length })}
        </p>

        {zichtbaar.length > 0 && (
          <ul className="lijst">
            {zichtbaar.map((tx) => {
              const cat = tx.regels && tx.regels.length > 0 ? t('gesplitst · {n} categorieën', { n: tx.regels.length }) : categorieNaam(tx.categorieId)
              const meta = [tx.datum, cat, rekeningNaam(tx.rekeningId)].filter(Boolean).join(' · ')
              return (
                <li key={tx.id} className="rij">
                  <span className="rij-teken" aria-hidden="true">
                    {tx.omschrijving.trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="rij-midden">
                    <span className="rij-titel">{tx.omschrijving}</span>
                    <span className="rij-meta">{meta}</span>
                  </span>
                  <Bedrag centen={tx.bedrag} richting="auto" />
                  <span className="rij-acties">
                    <button
                      type="button"
                      className="knop knop-kaal"
                      aria-label={t('Bewerk {oms}', { oms: tx.omschrijving })}
                      onClick={() => onBewerk(tx)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="knop knop-kaal knop-gevaar"
                      aria-label={t('Verwijder {oms}', { oms: tx.omschrijving })}
                      onClick={() => onVerwijder(tx.id)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {zichtbaar.length === 0 && <Leeg>{t('Geen transacties gevonden.')}</Leeg>}

        {venster && verborgen > 0 && (
          <div className="knoprij">
            <button type="button" className="knop knop-secundair knop-klein" onClick={() => setToonAlles(true)}>
              {t('Toon oudere transacties ({n} ouder dan {maanden} maanden)', { n: verborgen, maanden: STANDAARD_MAANDEN })}
            </button>
          </div>
        )}
        {!venster && !actief && toonAlles && (
          <div className="knoprij">
            <button type="button" className="knop knop-secundair knop-klein" onClick={() => setToonAlles(false)}>
              {t('Toon enkel recente maanden')}
            </button>
          </div>
        )}
      </Kaart>
    </section>
  )
}
