import { useState } from 'react'
import type { Categorie, Dossier, GedeeldeKost, Kind, Kindrekening, Kindrekeningpost, Verrekening } from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { KindrekeningSectie } from './KindrekeningSectie'
import { CategorieKiezer } from './CategorieKiezer'
import { saldoVerrekeningDossier } from '../utils/dossier'
import { isOpenKost, kostenVoorAfrekening, type AfrekeningFilter } from '../utils/afrekening'
import { verrekenTekst, afrekeningSamenvatting } from '../utils/afrekeningTekst'
import { exporteerAfrekeningPDF } from '../utils/afrekeningPdf'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { Bedrag, Kaart, Leeg, PaginaKop } from '../ui/basis'
import { useT } from '../i18n'

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
  kindrekeningen,
  kindrekeningposten,
  onDossierOpslaan,
  onDossierVerwijderen,
  onKostOpslaan,
  onKostVerwijderen,
  onGenereer,
  onMarkeerOvergemaakt,
  onVerwijderAfrekening,
  onKindrekeningOpslaan,
  onKindrekeningVerwijderen,
  onKindrekeningPostOpslaan,
  onKindrekeningPostVerwijderen,
}: {
  dossiers: Dossier[]
  kosten: GedeeldeKost[]
  verrekeningen: Verrekening[]
  kinderen: Kind[]
  categorieen: Categorie[]
  kindrekeningen: Kindrekening[]
  kindrekeningposten: Kindrekeningpost[]
  onDossierOpslaan: (d: Dossier) => Promise<void> | void
  onDossierVerwijderen: (id: string) => Promise<void> | void
  onKostOpslaan: (k: GedeeldeKost) => Promise<void> | void
  onKostVerwijderen: (id: string) => Promise<void> | void
  onGenereer: (dossier: Dossier, filter: AfrekeningFilter) => Promise<void> | void
  onMarkeerOvergemaakt: (v: Verrekening, overgemaakt: boolean) => Promise<void> | void
  onVerwijderAfrekening: (id: string) => Promise<void> | void
  onKindrekeningOpslaan: (kr: Kindrekening) => Promise<void> | void
  onKindrekeningVerwijderen: (id: string) => Promise<void> | void
  onKindrekeningPostOpslaan: (p: Kindrekeningpost) => Promise<void> | void
  onKindrekeningPostVerwijderen: (id: string) => Promise<void> | void
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

  const kindrekening = dossier ? (kindrekeningen.find((k) => k.dossierId === dossier.id) ?? null) : null
  const potPosten = kindrekening ? kindrekeningposten.filter((p) => p.kindrekeningId === kindrekening.id) : []

  async function kostOpslaan(k: GedeeldeKost) {
    await onKostOpslaan(k)
    setBewerkKost(null)
  }

  async function genereerNu() {
    if (!dossier || selectie.length === 0) return
    await onGenereer(dossier, filter)
  }

  return (
    <>
      <PaginaKop titel={t('Dossiers (gedeelde kosten)')} />

      <Kaart>
        {dossiers.length === 0 && <Leeg>{t('Nog geen dossiers. Maak er hieronder een aan.')}</Leeg>}

        {dossiers.length > 0 && (
          <div className="veldgroep">
            <label className="label-caps" htmlFor="dossierkeuze">{t('Gekozen dossier')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select id="dossierkeuze" style={{ flex: 1, minWidth: 0 }} value={dossierId} onChange={(e) => setGeselecteerd(e.target.value)}>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.naam} {t('(jij {p}%)', { p: d.aandeelJij })}
                  </option>
                ))}
              </select>
              {dossier && (
                <button
                  className="knop knop-kaal knop-gevaar"
                  aria-label={t('Verwijder dossier {naam}', { naam: dossier.naam })}
                  onClick={() => onDossierVerwijderen(dossier.id)}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        <DossierFormulier onOpslaan={onDossierOpslaan} />
      </Kaart>

      {dossier && (
        <div className="stapel">
          {/* Verdeling per categorie */}
          <Kaart
            titel={t('Verdeling per categorie')}
            bijschrift={t('Standaard draag jij {p}%. Stel hier per categorie een afwijkend percentage in.', { p: dossier.aandeelJij })}
          >
            {dossier.categorieAandelen && Object.keys(dossier.categorieAandelen).length > 0 && (
              <ul className="lijst">
                {Object.entries(dossier.categorieAandelen).map(([catId, pct]) => (
                  <li key={catId} className="rij">
                    <span className="rij-midden">
                      <span className="rij-titel">{labelVanCategorie(catId, categorieen) ?? catId}</span>
                      <span className="rij-meta">{t('jij {p}%', { p: pct })}</span>
                    </span>
                    <span className="rij-acties">
                      <button
                        className="knop knop-kaal knop-gevaar"
                        aria-label={t('Verwijder verdeling {naam}', { naam: labelVanCategorie(catId, categorieen) ?? catId })}
                        onClick={() => verwijderSplit(catId)}
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CategorieKiezer waarde={splitCat || undefined} onKies={(id) => setSplitCat(id ?? '')} gebruikerCategorieen={categorieen} />
              </div>
              <input aria-label={t('Percentage jij')} style={{ width: 76 }} inputMode="decimal" placeholder="%" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} />
              <button type="button" className="knop knop-secundair" onClick={voegSplitToe}>
                {t('Toevoegen')}
              </button>
            </div>
          </Kaart>

          {/* Open kosten */}
          <Kaart>
            {openKosten.length > 0 && (
              <ul className="lijst">
                {openKosten.map((k) => (
                  <li key={k.id} className="rij">
                    <span className="rij-midden">
                      <span className="rij-titel">{k.omschrijving}</span>
                      <span className="rij-meta">
                        {t('betaald door {wie}', { wie: k.betaaldDoor === 'jij' ? t('jou') : t('partner') })}
                        {k.categorieId && ` · ${labelVanCategorie(k.categorieId, categorieen) ?? ''}`}
                        {k.kostenType === 'buitengewoon' && ` · ${t('buitengewoon')}`}
                        {k.kindIds && k.kindIds.length > 0 && ` · ${t('voor {namen}', { namen: kindNamen(k.kindIds) })}`}
                        {typeof k.aandeelJijOverride === 'number' && ` · ${t('jij {p}%', { p: k.aandeelJijOverride })}`}
                      </span>
                    </span>
                    <span className="rij-acties">
                      <Bedrag centen={k.bedrag} />
                      {k.bonnetje && (
                        <a href={k.bonnetje} target="_blank" rel="noreferrer">
                          {t('bon')}
                        </a>
                      )}
                      <button className="knop knop-kaal" aria-label={t('Bewerk kost {naam}', { naam: k.omschrijving })} onClick={() => setBewerkKost(k)}>
                        ✎
                      </button>
                      <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder kost {naam}', { naam: k.omschrijving })} onClick={() => onKostVerwijderen(k.id)}>
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="stat">
              <span className="label-caps">{t('Openstaand')}</span>
              <span className="stat-waarde" style={{ fontFamily: 'var(--font-body)' }}>
                {verrekenTekst(t, openSaldo)}
              </span>
            </div>

            <hr className="scheiding" style={{ margin: 0 }} />

            <GedeeldeKostFormulier
              dossierId={dossier.id}
              kinderen={kinderen}
              categorieen={categorieen}
              onOpslaan={kostOpslaan}
              onAnnuleer={() => setBewerkKost(null)}
              bewerken={bewerkKost}
            />
          </Kaart>

          {/* Nieuwe afrekening genereren */}
          <Kaart
            titel={t('Nieuwe afrekening')}
            bijschrift={t('Kies een periode en (optioneel) kinderen. Dit blokkeert niets — je kan meerdere afrekeningen maken.')}
          >
            <div className="veldrij">
              <label className="veldgroep">
                <span className="label-caps">{t('Periode van')}</span>
                <input type="date" value={afrVan} onChange={(e) => setAfrVan(e.target.value)} />
              </label>
              <label className="veldgroep">
                <span className="label-caps">{t('Periode tot')}</span>
                <input type="date" value={afrTot} onChange={(e) => setAfrTot(e.target.value)} />
              </label>
            </div>
            {kinderen.length > 0 && (
              <div className="veldgroep">
                <span className="label-caps">{t('Voor welke kinderen? (leeg = allemaal)')}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {kinderen.map((k) => (
                    <label key={k.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={afrKindIds.includes(k.id)} onChange={() => wisselAfrKind(k.id)} /> {k.naam}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('In deze selectie: {n} kost(en), {saldo}', { n: selectie.length, saldo: verrekenTekst(t, selectieSaldo) })}
            </p>
            <div className="knoprij">
              <button type="button" className="knop knop-secundair" onClick={genereerNu} disabled={selectie.length === 0}>
                {t('Genereer afrekening')}
              </button>
            </div>
          </Kaart>

          {/* Afrekeningen */}
          {afrekeningen.length > 0 && (
            <Kaart titel={t('Afrekeningen')}>
              <ul className="lijst">
                {afrekeningen.map((v) => {
                  const periode = v.periodeVan || v.periodeTot ? `${v.periodeVan ?? '…'} – ${v.periodeTot ?? '…'}` : t('alle periodes')
                  const wie = v.kindIds && v.kindIds.length > 0 ? kindNamen(v.kindIds) : t('alle kinderen')
                  return (
                    <li key={v.id} className="rij" style={{ flexWrap: 'wrap', opacity: v.overgemaakt ? 0.7 : 1 }}>
                      <span className="rij-midden">
                        <span className="rij-titel">{verrekenTekst(t, v.bedrag)}</span>
                        <span className="rij-meta">
                          {v.datum} · {periode} · {wie}
                        </span>
                      </span>
                      <span className="rij-acties">
                        <label className="rij-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input type="checkbox" checked={!!v.overgemaakt} onChange={(e) => onMarkeerOvergemaakt(v, e.target.checked)} /> {t('Overgemaakt')}
                        </label>
                        <button type="button" className="knop knop-ghost knop-klein" onClick={() => kopieerSamenvatting(v)}>
                          {gekopieerd === v.id ? t('Gekopieerd ✓') : t('Kopieer')}
                        </button>
                        <button type="button" className="knop knop-ghost knop-klein" onClick={() => exportPdf(v)}>
                          PDF
                        </button>
                        <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder afrekening {datum}', { datum: v.datum })} onClick={() => onVerwijderAfrekening(v.id)}>
                          ×
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Kaart>
          )}

          {/* Kindrekening: de gezamenlijke pot als tweede manier van afrekenen. */}
          <KindrekeningSectie
            dossier={dossier}
            kindrekening={kindrekening}
            posten={potPosten}
            kinderen={kinderen}
            categorieen={categorieen}
            onOpslaan={onKindrekeningOpslaan}
            onVerwijderen={onKindrekeningVerwijderen}
            onPostOpslaan={onKindrekeningPostOpslaan}
            onPostVerwijderen={onKindrekeningPostVerwijderen}
          />
        </div>
      )}
    </>
  )
}
