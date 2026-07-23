import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Categorie, Dossier, GedeeldeKost, Kind, Verrekening } from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { CategorieKiezer } from './CategorieKiezer'
import { saldoVerrekeningDossier } from '../utils/dossier'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { formatEuro } from '../utils/format'
import { useT, type Vertaler } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}

function verrekentekst(t: Vertaler, netto: number): string {
  // netto is in centen (geheel getal): positief = partner is jou verschuldigd.
  if (netto > 0) return t('Partner is jou {bedrag} verschuldigd', { bedrag: formatEuro(netto) })
  if (netto < 0) return t('Jij bent partner {bedrag} verschuldigd', { bedrag: formatEuro(-netto) })
  return t('Niets te verrekenen')
}

// De volledige Dossiers-sectie: kies, maak of verwijder een dossier, beheer de
// open gedeelde kosten (toevoegen/bewerken/verwijderen), leg een afrekening vast,
// en bekijk de geschiedenis.
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
  onAfrekenen,
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
  onAfrekenen: (dossier: Dossier, openKosten: GedeeldeKost[]) => Promise<void> | void
}) {
  const { t } = useT()
  const [splitCat, setSplitCat] = useState('')
  const [splitPct, setSplitPct] = useState('')
  const kindNamen = (ids?: string[]) =>
    (ids ?? []).map((id) => kinderen.find((k) => k.id === id)?.naam).filter(Boolean).join(', ')

  async function voegSplitToe() {
    const pct = Number.parseFloat(splitPct.replace(',', '.'))
    if (!dossier || !splitCat || !Number.isFinite(pct) || pct < 0 || pct > 100) return
    const nieuw = { ...(dossier.categorieAandelen ?? {}), [splitCat]: pct }
    await onDossierOpslaan({ ...dossier, categorieAandelen: nieuw })
    setSplitCat('')
    setSplitPct('')
  }

  async function verwijderSplit(catId: string) {
    if (!dossier || !dossier.categorieAandelen) return
    const nieuw = { ...dossier.categorieAandelen }
    delete nieuw[catId]
    await onDossierOpslaan({ ...dossier, categorieAandelen: nieuw })
  }
  const [geselecteerd, setGeselecteerd] = useState('')
  const [bewerkKost, setBewerkKost] = useState<GedeeldeKost | null>(null)

  useEffect(() => {
    if (dossiers.length === 0) {
      setGeselecteerd('')
    } else if (!dossiers.some((d) => d.id === geselecteerd)) {
      setGeselecteerd(dossiers[0].id)
    }
  }, [dossiers, geselecteerd])

  const dossier = dossiers.find((d) => d.id === geselecteerd) ?? null
  const alleKosten = dossier ? kosten.filter((k) => k.dossierId === dossier.id) : []
  const openKosten = alleKosten.filter((k) => !k.verrekeningId)
  const netto = dossier ? saldoVerrekeningDossier(dossier, openKosten) : 0
  const geschiedenis = dossier
    ? verrekeningen.filter((v) => v.dossierId === dossier.id).sort((a, b) => (a.datum < b.datum ? 1 : -1))
    : []

  async function kostOpslaan(k: GedeeldeKost) {
    await onKostOpslaan(k)
    setBewerkKost(null)
  }

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Dossiers (gedeelde kosten)')}</h2>
      {dossiers.length === 0 && <p style={{ color: '#888' }}>{t('Nog geen dossiers. Maak er hieronder een aan.')}</p>}

      {dossiers.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="dossierkeuze">{t('Gekozen dossier')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select id="dossierkeuze" style={{ ...veld, flex: 1 }} value={geselecteerd} onChange={(e) => setGeselecteerd(e.target.value)}>
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
          <div style={{ marginBottom: '0.75rem', background: '#faf9f7', border: '1px solid #eee', borderRadius: 8, padding: '0.6rem' }}>
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

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {openKosten.map((k) => (
              <li
                key={k.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.4rem 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
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
                  <button aria-label={t('Bewerk kost {naam}', { naam: k.omschrijving })} onClick={() => setBewerkKost(k)} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>
                    ✎
                  </button>
                  <button
                    aria-label={t('Verwijder kost {naam}', { naam: k.omschrijving })}
                    onClick={() => onKostVerwijderen(k.id)}
                    style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <p style={{ fontWeight: 'bold', marginTop: '0.75rem' }}>{verrekentekst(t, netto)}</p>

          <button
            onClick={() => onAfrekenen(dossier, openKosten)}
            disabled={openKosten.length === 0}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 8,
              border: '1px solid #ccc',
              background: openKosten.length === 0 ? '#f2f2f2' : '#f3eef7',
              cursor: openKosten.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {t('Leg afrekening vast')}
          </button>

          <GedeeldeKostFormulier
            dossierId={dossier.id}
            kinderen={kinderen}
            categorieen={categorieen}
            onOpslaan={kostOpslaan}
            onAnnuleer={() => setBewerkKost(null)}
            bewerken={bewerkKost}
          />

          {geschiedenis.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.25rem' }}>{t('Vastgelegde afrekeningen')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {geschiedenis.map((v) => (
                  <li key={v.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#666', padding: '0.2rem 0' }}>
                    <span>{v.datum}</span>
                    <span>{verrekentekst(t, v.bedrag)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
