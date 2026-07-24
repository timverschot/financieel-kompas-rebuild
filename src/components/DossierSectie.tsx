import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie, Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { CategorieKiezer } from './CategorieKiezer'
import { saldoVerrekeningDossier } from '../utils/dossier'
import { isOpenKost, kostenVoorAfrekening, type AfrekeningFilter } from '../utils/afrekening'
import { verrekenTekst, afrekeningSamenvatting } from '../utils/afrekeningTekst'
import { exporteerAfrekeningPDF } from '../utils/afrekeningPdf'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { formatEuro } from '../utils/format'
import { useT } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const blok: CSSProperties = { background: '#faf9f7', border: '1px solid #eee', borderRadius: 8, padding: '0.6rem', marginBottom: '0.75rem' }

// De volledige Dossiers-sectie: kies/maak/verwijder een dossier, stel de verdeling
// per categorie in, beheer de open kosten, en genereer niet-blokkerende
// afrekeningen over een gekozen periode + kinderen. Een afrekening blokkeert niets;
// pas als je ze als 'overgemaakt' markeert, worden de kosten afgerekend.
export function DossierSectie({
  dossiers,
  kosten,
  verrekeningen,
  kinderen,
  categorieen,
  onDossierOpslaan,
  onDossierVerwijderen,
  onKostOpslaan,
  onKostVerwijderen,
  onGenereer,
  onMarkeerOvergemaakt,
  onVerwijderAfrekening,
}: {
  dossiers: Dossier[]
  kosten: GedeeldeKost[]
  verrekeningen: Verrekening[]
  kinderen: Kind[]
  categorieen: Categorie[]
  onDossierOpslaan: (d: Dossier) => Promise<void> | void
  onDossierVerwijderen: (id: string) => Promise<void> | void
  onKostOpslaan: (k: GedeeldeKost) => Promise<void> | void
  onKostVerwijderen: (id: string) => Promise<void> | void
  onGenereer: (dossier: Dossier, filter: AfrekeningFilter) => Promise<void> | void
  onMarkeerOvergemaakt: (v: Verrekening, overgemaakt: boolean) => Promise<void> | void
  onVerwijderAfrekening: (id: string) => Promise<void> | void
}) {
  const { t } = useT()
  const [geselecteerd, setGeselecteerd] = useState('')
  const [bewerkKost, setBewerkKost] = useState<GedeeldeKost | null>(null)
  const [splitCat, setSplitCat] = useState('')
  const [splitPct, setSplitPct] = useState('')
  const [afrVan, setAfrVan] = useState('')
  const [afrTot, setAfrTot] = useState('')
  const [afrKindIds, setAfrKindIds] = useState<string[]>([])
  const [gekopieerd, setGekopieerd] = useState('')

  const dossier = dossiers.find((d) => d.id === geselecteerd) ?? (dossiers[0] ?? null)
  const dossierId = dossier?.id ?? ''

  const kindNamen = (ids?: string[]) =>
    (ids ?? []).map((id) => kinderen.find((k) => k.id === id)?.naam).filter(Boolean).join(', ')

  async function voegSplitToe() {
    const pct = Number.parseFloat(splitPct.replace(',', '.'))
    if (!dossier || !splitCat || !Number.isFinite(pct) || pct < 0 || pct > 100) return
    await onDossierOpslaan({ ...dossier, categorieAandelen: { ...(dossier.categorieAandelen ?? {}), [splitCat]: pct } })
    setSplitCat('')
    setSplitPct('')
  }

  async function verwijderSplit(catId: string) {
    if (!dossier || !dossier.categorieAandelen) return
    const nieuw = { ...dossier.categorieAandelen }
    delete nieuw[catId]
    await onDossierOpslaan({ ...dossier, categorieAandelen: nieuw })
  }

  function wisselAfrKind(id: string) {
    setAfrKindIds((huidig) => (huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id]))
  }

  async function kopieerSamenvatting(v: Verrekening) {
    if (!dossier) return
    try {
      await navigator.clipboard.writeText(afrekeningSamenvatting(t, dossier, v, kosten, kinderen))
      setGekopieerd(v.id)
      window.setTimeout(() => setGekopieerd(''), 2000)
    } catch {
      // klembord niet beschikbaar: stil negeren.
    }
  }

  async function exportPdf(v: Verrekening) {
    if (!dossier) return
    await exporteerAfrekeningPDF(t, dossier, v, kosten, kinderen)
  }

  const alleKosten = dossier ? kosten.filter((k) => k.dossierId === dossier.id) : []
  const openKosten = alleKosten.filter(isOpenKost)
  const openSaldo = dossier ? saldoVerrekeningDossier(dossier, openKosten) : 0

  const filter: AfrekeningFilter = {
    ...(afrVan ? { periodeVan: afrVan } : {}),
    ...(afrTot ? { periodeTot: afrTot } : {}),
    ...(afrKindIds.length > 0 ? { kindIds: afrKindIds } : {}),
  }
  const selectie = dossier ? kostenVoorAfrekening(kosten, dossier.id, filter) : []
  const selectieSaldo = dossier ? saldoVerrekeningDossier(dossier, selectie) : 0

  const afrekeningen = dossier
    ? verrekeningen.filter((v) => v.dossierId === dossier.id).sort((a, b) => (a.datum < b.datum ? 1 : -1))
    : []

  async function kostOpslaan(k: GedeeldeKost) {
    await onKostOpslaan(k)
    setBewerkKost(null)
  }

  async function genereerNu() {
    if (!dossier || selectie.length === 0) return
    await onGenereer(dossier, filter)
  }

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Dossiers (gedeelde kosten)')}</h2>
      {dossiers.length === 0 && <p style={{ color: '#888' }}>{t('Nog geen dossiers. Maak er hieronder een aan.')}</p>}

      {dossiers.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="dossierkeuze">{t('Gekozen dossier')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select id="dossierkeuze" style={{ ...veld, flex: 1 }} value={dossierId} onChange={(e) => setGeselecteerd(e.target.value)}>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.naam} {t('(jij {p}%)', { p: d.aandeelJij })}
                </option>
              ))}
            </select>
            {dossier && (
              <button
                aria-label={t('Verwijder dossier {naam}', { naam: dossier.naam })}
                onClick={() => onDossierVerwijderen(dossier.id)}
                style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      <DossierFormulier onOpslaan={onDossierOpslaan} />

      {dossier && (
        <div style={{ marginTop: '1rem' }}>
          {/* Verdeling per categorie */}
          <div style={blok}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.15rem' }}>{t('Verdeling per categorie')}</h3>
            <p style={{ color: '#888', margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
              {t('Standaard draag jij {p}%. Stel hier per categorie een afwijkend percentage in.', { p: dossier.aandeelJij })}
            </p>
            {dossier.categorieAandelen && Object.keys(dossier.categorieAandelen).length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.4rem' }}>
                {Object.entries(dossier.categorieAandelen).map(([catId, pct]) => (
                  <li key={catId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.15rem 0' }}>
                    <span>{labelVanCategorie(catId, categorieen) ?? catId} · {t('jij {p}%', { p: pct })}</span>
                    <button
                      aria-label={t('Verwijder verdeling {naam}', { naam: labelVanCategorie(catId, categorieen) ?? catId })}
                      onClick={() => verwijderSplit(catId)}
                      style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <CategorieKiezer waarde={splitCat || undefined} onKies={(id) => setSplitCat(id ?? '')} gebruikerCategorieen={categorieen} />
              </div>
              <input aria-label={t('Percentage jij')} style={{ width: 70, padding: '0.4rem', boxSizing: 'border-box' }} inputMode="decimal" placeholder="%" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} />
              <button type="button" onClick={voegSplitToe} style={{ padding: '0.4rem 0.7rem', borderRadius: 8, border: '1px solid #ccc', background: '#eef2f7', cursor: 'pointer' }}>
                {t('Toevoegen')}
              </button>
            </div>
          </div>

          {/* Open kosten */}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {openKosten.map((k) => (
              <li
                key={k.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <span>
                  {k.omschrijving}
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>
                    {' '}
                    · {t('betaald door {wie}', { wie: k.betaaldDoor === 'jij' ? t('jou') : t('partner') })}
                    {k.categorieId && ` · ${labelVanCategorie(k.categorieId, categorieen) ?? ''}`}
                    {k.kostenType === 'buitengewoon' && ` · ${t('buitengewoon')}`}
                    {k.kindIds && k.kindIds.length > 0 && ` · ${t('voor {namen}', { namen: kindNamen(k.kindIds) })}`}
                    {typeof k.aandeelJijOverride === 'number' && ` · ${t('jij {p}%', { p: k.aandeelJijOverride })}`}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>{formatEuro(k.bedrag)}</span>
                  {k.bonnetje && (
                    <a href={k.bonnetje} target="_blank" rel="noreferrer" style={{ color: '#2c6cb0', fontSize: '0.85rem' }}>
                      {t('bon')}
                    </a>
                  )}
                  <button aria-label={t('Bewerk kost {naam}', { naam: k.omschrijving })} onClick={() => setBewerkKost(k)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                    ✎
                  </button>
                  <button aria-label={t('Verwijder kost {naam}', { naam: k.omschrijving })} onClick={() => onKostVerwijderen(k.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <p style={{ fontWeight: 'bold', marginTop: '0.75rem' }}>
            {t('Openstaand')}: {verrekenTekst(t, openSaldo)}
          </p>

          <GedeeldeKostFormulier
            dossierId={dossier.id}
            kinderen={kinderen}
            categorieen={categorieen}
            onOpslaan={kostOpslaan}
            onAnnuleer={() => setBewerkKost(null)}
            bewerken={bewerkKost}
          />

          {/* Nieuwe afrekening genereren */}
          <div style={{ ...blok, marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.15rem' }}>{t('Nieuwe afrekening')}</h3>
            <p style={{ color: '#888', margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
              {t('Kies een periode en (optioneel) kinderen. Dit blokkeert niets — je kan meerdere afrekeningen maken.')}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{ flex: 1, minWidth: 120 }}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>{t('Periode van')}</span>
                <input type="date" style={veld} value={afrVan} onChange={(e) => setAfrVan(e.target.value)} />
              </label>
              <label style={{ flex: 1, minWidth: 120 }}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>{t('Periode tot')}</span>
                <input type="date" style={veld} value={afrTot} onChange={(e) => setAfrTot(e.target.value)} />
              </label>
            </div>
            {kinderen.length > 0 && (
              <div style={{ marginTop: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>{t('Voor welke kinderen? (leeg = allemaal)')}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: 2 }}>
                  {kinderen.map((k) => (
                    <label key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <input type="checkbox" checked={afrKindIds.includes(k.id)} onChange={() => wisselAfrKind(k.id)} /> {k.naam}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
              {t('In deze selectie: {n} kost(en), {saldo}', { n: selectie.length, saldo: verrekenTekst(t, selectieSaldo) })}
            </p>
            <button
              type="button"
              onClick={genereerNu}
              disabled={selectie.length === 0}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: 8,
                border: '1px solid #ccc',
                background: selectie.length === 0 ? '#f2f2f2' : '#f3eef7',
                cursor: selectie.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {t('Genereer afrekening')}
            </button>
          </div>

          {/* Afrekeningen */}
          {afrekeningen.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.25rem' }}>{t('Afrekeningen')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {afrekeningen.map((v) => {
                  const periode = v.periodeVan || v.periodeTot ? `${v.periodeVan ?? '…'} – ${v.periodeTot ?? '…'}` : t('alle periodes')
                  const wie = v.kindIds && v.kindIds.length > 0 ? kindNamen(v.kindIds) : t('alle kinderen')
                  return (
                    <li key={v.id} style={{ padding: '0.4rem 0', borderBottom: '1px solid #f0f0f0', opacity: v.overgemaakt ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{verrekenTekst(t, v.bedrag)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <label style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <input type="checkbox" checked={!!v.overgemaakt} onChange={(e) => onMarkeerOvergemaakt(v, e.target.checked)} /> {t('Overgemaakt')}
                          </label>
                          <button type="button" onClick={() => kopieerSamenvatting(v)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer', fontSize: '0.85rem' }}>
                            {gekopieerd === v.id ? t('Gekopieerd ✓') : t('Kopieer')}
                          </button>
                          <button type="button" onClick={() => exportPdf(v)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer', fontSize: '0.85rem' }}>
                            PDF
                          </button>
                          <button aria-label={t('Verwijder afrekening {datum}', { datum: v.datum })} onClick={() => onVerwijderAfrekening(v.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>
                            ×
                          </button>
                        </span>
                      </div>
                      <div style={{ color: '#999', fontSize: '0.8rem' }}>
                        {v.datum} · {periode} · {wie}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
