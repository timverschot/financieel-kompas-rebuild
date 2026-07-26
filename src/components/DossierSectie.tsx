import { useEffect, useState } from 'react'
import type { Categorie, Dossier, DossierDocument, GedeeldeKost, Kind, Kindrekening, Kindrekeningpost, Verrekening } from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { KindrekeningSectie } from './KindrekeningSectie'
import { Documentkluis } from './DossierKluis'
import { CategorieKiezer } from './CategorieKiezer'
import { saldoVerrekeningDossier } from '../utils/dossier'
import { isOpenKost, kostenVoorAfrekening, type AfrekeningFilter } from '../utils/afrekening'
import { verrekenTekst, afrekeningSamenvatting } from '../utils/afrekeningTekst'
import { exporteerAfrekeningPDF } from '../utils/afrekeningPdf'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { useT } from '../i18n'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'

// De onderdelen van een dossier die je kan wegklikken.
//
// Niet elk dossier gebruikt alles. De ene co-ouder rekent alles fiftyfifty af en
// heeft nooit een verdeelsleutel per categorie nodig; de andere heeft geen
// gezamenlijke pot en bewaart de papieren elders. Die kaarten scrollen dan eeuwig
// mee zonder ooit iets te doen.
//
// Wat er BEWUST niet in staat: de lijst met open kosten en het afrekenen zelf. Dat
// is waar een dossier voor bestaat — verberg je die, dan blijft er een lege pagina
// over. De keuze zit op het dossier (`Dossier.verborgenOnderdelen`), dus ze klopt
// ook op je gsm.
export const DOSSIER_ONDERDELEN = [
  { id: 'verdeling-categorie', label: 'Verdeling per categorie' },
  { id: 'verdeling-kostensoort', label: 'Verdeling per kostensoort' },
  { id: 'gezamenlijke-pot', label: 'Kindrekening (gezamenlijke pot)' },
  { id: 'documentkluis', label: 'Documentkluis' },
] as const

export type DossierOnderdeel = (typeof DOSSIER_ONDERDELEN)[number]['id']

// Leest een percentageveld: leeg betekent 'niet ingesteld', een getal van 0 tot en
// met 100 is geldig, al de rest is ongeldig (dan blijft de knop uit).
function leesPercentage(waarde: string): number | 'leeg' | null {
  const tekst = waarde.trim()
  if (!tekst) return 'leeg'
  const getal = Number.parseFloat(tekst.replace(',', '.'))
  if (!Number.isFinite(getal) || getal < 0 || getal > 100) return null
  return getal
}

// De volledige Dossiers-sectie: kies/maak/verwijder een dossier, stel de verdeling
// per categorie en per kostensoort in, beheer de open kosten, en genereer
// niet-blokkerende afrekeningen over een gekozen periode + kinderen. Een afrekening
// blokkeert niets; pas als je ze als 'overgemaakt' markeert, worden de kosten
// afgerekend.
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
  documenten,
  onDocumentOpslaan,
  onDocumentVerwijderen,
  onNieuweSubcategorie,
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
  documenten: DossierDocument[]
  onDocumentOpslaan: (d: DossierDocument) => Promise<void> | void
  onDocumentVerwijderen: (id: string) => Promise<void> | void
  /**
   * Maakt ter plekke een nieuwe subcategorie aan en geeft het nieuwe id terug.
   * Ontbrak hier, waardoor je bij een gedeelde kost of een post op de gezamenlijke
   * pot geen ontbrekend item kon toevoegen — terwijl dat in het transactieformulier
   * wél kon. Dezelfde handeling hoorde overal hetzelfde te werken.
   */
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
}) {
  const { t } = useT()
  const [geselecteerd, setGeselecteerd] = useState('')
  const [bewerkKost, setBewerkKost] = useState<GedeeldeKost | null>(null)
  const [splitCat, setSplitCat] = useState('')
  const [splitPct, setSplitPct] = useState('')
  const [afrVan, setAfrVan] = useState('')
  const [afrTot, setAfrTot] = useState('')
  const [afrKindIds, setAfrKindIds] = useState<string[]>([])
  // Standaard tellen kosten zonder kind mee: zo verdwijnt er nooit stil geld uit
  // een afrekening zodra je op kinderen filtert.
  const [zonderKindMee, setZonderKindMee] = useState(true)
  const [typeGewoon, setTypeGewoon] = useState('')
  const [typeBuitengewoon, setTypeBuitengewoon] = useState('')
  const [gekopieerd, setGekopieerd] = useState('')
  // Staat het rijtje "welke onderdelen toon je?" open? Bewust per sessie en niet
  // bewaard: het is een instelknopje, geen scherm waar je in werkt.
  const [onderdelenOpen, setOnderdelenOpen] = useState(false)

  const dossier = dossiers.find((d) => d.id === geselecteerd) ?? (dossiers[0] ?? null)
  const dossierId = dossier?.id ?? ''

  // Houd de twee velden voor de kostensoort-verdeling gelijk met het gekozen
  // dossier (ook na een wissel van dossier of na het bewaren).
  const bewaardGewoon = dossier?.typeAandelen?.gewoon
  const bewaardBuitengewoon = dossier?.typeAandelen?.buitengewoon
  useEffect(() => {
    setTypeGewoon(typeof bewaardGewoon === 'number' ? String(bewaardGewoon) : '')
    setTypeBuitengewoon(typeof bewaardBuitengewoon === 'number' ? String(bewaardBuitengewoon) : '')
  }, [dossierId, bewaardGewoon, bewaardBuitengewoon])

  const kindNamen = (ids?: string[]) =>
    (ids ?? []).map((id) => kinderen.find((k) => k.id === id)?.naam).filter(Boolean).join(', ')

  // De knop 'Toevoegen' blijft uit zolang dit niet klopt; daaronder staat één regel
  // die zegt wat er nog ontbreekt.
  const splitPctWaarde = leesPercentage(splitPct)
  const splitGeldig = !!splitCat && typeof splitPctWaarde === 'number'

  async function voegSplitToe() {
    if (!dossier || !splitGeldig || typeof splitPctWaarde !== 'number') return
    await onDossierOpslaan({
      ...dossier,
      categorieAandelen: { ...(dossier.categorieAandelen ?? {}), [splitCat]: splitPctWaarde },
    })
    setSplitCat('')
    setSplitPct('')
  }

  // Verdeling per kostensoort: leeg laten = die soort volgt gewoon de rest van de
  // hiërarchie (categorie of dossier-standaard).
  const gewoonWaarde = leesPercentage(typeGewoon)
  const buitengewoonWaarde = leesPercentage(typeBuitengewoon)
  const typeGeldig = gewoonWaarde !== null && buitengewoonWaarde !== null

  async function bewaarTypeAandelen() {
    if (!dossier || !typeGeldig) return
    const nieuw: NonNullable<Dossier['typeAandelen']> = {}
    if (typeof gewoonWaarde === 'number') nieuw.gewoon = gewoonWaarde
    if (typeof buitengewoonWaarde === 'number') nieuw.buitengewoon = buitengewoonWaarde
    const bijgewerkt: Dossier = { ...dossier }
    if (Object.keys(nieuw).length > 0) bijgewerkt.typeAandelen = nieuw
    else delete bijgewerkt.typeAandelen
    await onDossierOpslaan(bijgewerkt)
  }

  // Welke onderdelen zijn zichtbaar? We bewaren wat VERBORGEN is, dus een dossier
  // zonder dat veld toont gewoon alles — precies zoals vóór deze ronde.
  const verborgen = dossier?.verborgenOnderdelen ?? []
  const toont = (id: DossierOnderdeel) => !verborgen.includes(id)

  async function zetOnderdeel(id: DossierOnderdeel, zichtbaar: boolean) {
    if (!dossier) return
    const nieuw = zichtbaar ? verborgen.filter((v) => v !== id) : [...verborgen, id]
    const bijgewerkt: Dossier = { ...dossier }
    // Niets verborgen? Dan halen we het veld helemaal weg in plaats van een lege
    // lijst weg te schrijven. Zo blijft een dossier dat nooit iets verborg exact
    // hetzelfde record als voorheen.
    if (nieuw.length > 0) bijgewerkt.verborgenOnderdelen = nieuw
    else delete bijgewerkt.verborgenOnderdelen
    await onDossierOpslaan(bijgewerkt)
  }

  async function verwijderSplit(catId: string) {
    if (!dossier || !dossier.categorieAandelen) return
    const nieuw = { ...dossier.categorieAandelen }
    delete nieuw[catId]
    await onDossierOpslaan({ ...dossier, categorieAandelen: nieuw })
  }

  async function kopieerSamenvatting(v: Verrekening) {
    if (!dossier) return
    try {
      await navigator.clipboard.writeText(afrekeningSamenvatting(t, dossier, v, kosten, kinderen, categorieen))
      setGekopieerd(v.id)
      window.setTimeout(() => setGekopieerd(''), 2000)
    } catch {
      // klembord niet beschikbaar: stil negeren.
    }
  }

  async function exportPdf(v: Verrekening) {
    if (!dossier) return
    await exporteerAfrekeningPDF(t, dossier, v, kosten, kinderen, categorieen)
  }

  const alleKosten = dossier ? kosten.filter((k) => k.dossierId === dossier.id) : []
  const openKosten = alleKosten.filter(isOpenKost)
  const openSaldo = dossier ? saldoVerrekeningDossier(dossier, openKosten) : 0

  const filter: AfrekeningFilter = {
    ...(afrVan ? { periodeVan: afrVan } : {}),
    ...(afrTot ? { periodeTot: afrTot } : {}),
    ...(afrKindIds.length > 0 ? { kindIds: afrKindIds, zonderKindMeetellen: zonderKindMee } : {}),
  }
  const selectie = dossier ? kostenVoorAfrekening(kosten, dossier.id, filter, verrekeningen) : []
  // Dezelfde selectie zonder de blokkade van bestaande afrekeningen: het verschil
  // is precies het aantal kosten dat al in een andere afrekening zit.
  const zonderBlokkade = dossier ? kostenVoorAfrekening(kosten, dossier.id, filter, []) : []
  const alElders = zonderBlokkade.length - selectie.length
  const selectieSaldo = dossier ? saldoVerrekeningDossier(dossier, selectie) : 0

  const afrekeningen = dossier
    ? gesorteerdNieuwsteEerst(verrekeningen.filter((v) => v.dossierId === dossier.id))
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

  const aantalVerborgen = DOSSIER_ONDERDELEN.filter((o) => !toont(o.id)).length

  return (
    <>
      {/* Geen eigen paginakop meer: deze sectie is sinds ronde 29 één subtab van de
          Dossiers-pagina, en die pagina zet de kop. Twee koppen boven elkaar zou
          alleen ruimte kosten. */}
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

        {/* Welke onderdelen zijn van toepassing op dít dossier? Ingeklapt achter één
            regel, in dezelfde vorm als "Meer opties" in het invoerformulier, zodat
            een instelling nooit belangrijker oogt dan het werk eronder. */}
        {dossier && (
          <div className="veldgroep">
            <button
              type="button"
              className="knop knop-ghost knop-klein"
              style={{ alignSelf: 'flex-start' }}
              aria-expanded={onderdelenOpen}
              onClick={() => setOnderdelenOpen((o) => !o)}
            >
              {aantalVerborgen > 0 ? t('Onderdelen ({n} verborgen)', { n: aantalVerborgen }) : t('Onderdelen')}
            </button>
            {onderdelenOpen && (
              <>
                <div className="chiprooster" role="group" aria-label={t('Welke onderdelen toon je in dit dossier?')}>
                  {DOSSIER_ONDERDELEN.map((o) => {
                    const aan = toont(o.id)
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={aan}
                        className={aan ? 'chip chip-actief' : 'chip'}
                        onClick={() => zetOnderdeel(o.id, !aan)}
                      >
                        {t(o.label)}
                      </button>
                    )
                  })}
                </div>
                <p className="rij-meta" style={{ margin: 0 }}>
                  {t('Wat je uitzet, verdwijnt alleen uit beeld — er gaat niets verloren.')}
                </p>
              </>
            )}
          </div>
        )}

        <DossierFormulier onOpslaan={onDossierOpslaan} />
      </Kaart>

      {dossier && (
        <div className="stapel">
          {/* Verdeling per categorie */}
          {toont('verdeling-categorie') && (
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
              <button type="button" className="knop knop-secundair" onClick={voegSplitToe} disabled={!splitGeldig}>
                {t('Toevoegen')}
              </button>
            </div>
            {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt. */}
            {!splitGeldig && (
              <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
                {!splitCat
                  ? t('Kies eerst een categorie en geef een percentage van 0 tot 100.')
                  : t('Geef een percentage van 0 tot 100 om deze verdeling toe te voegen.')}
              </p>
            )}
          </Kaart>
          )}

          {/* Verdeling per kostensoort */}
          {toont('verdeling-kostensoort') && (
          <Kaart
            titel={t('Verdeling per kostensoort')}
            bijschrift={t('Voor buitengewone kosten (medisch, schools, ontwikkeling) spreken ouders vaak een andere sleutel af dan voor gewone kosten. Leeg laten = de standaard van het dossier ({p}%).', { p: dossier.aandeelJij })}
          >
            <div className="veldrij">
              <label className="veldgroep">
                <span className="label-caps">{t('Gewone kosten (% jij)')}</span>
                <input inputMode="decimal" placeholder={t('leeg = {p}%', { p: dossier.aandeelJij })} value={typeGewoon} onChange={(e) => setTypeGewoon(e.target.value)} />
              </label>
              <label className="veldgroep">
                <span className="label-caps">{t('Buitengewone kosten (% jij)')}</span>
                <input inputMode="decimal" placeholder={t('leeg = {p}%', { p: dossier.aandeelJij })} value={typeBuitengewoon} onChange={(e) => setTypeBuitengewoon(e.target.value)} />
              </label>
            </div>
            <div className="knoprij">
              <button type="button" className="knop knop-secundair" onClick={bewaarTypeAandelen} disabled={!typeGeldig}>
                {t('Bewaar verdeling per kostensoort')}
              </button>
            </div>
            {!typeGeldig && (
              <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
                {t('Geef een percentage van 0 tot 100, of laat het veld leeg.')}
              </p>
            )}
          </Kaart>
          )}

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
              onNieuweSubcategorie={onNieuweSubcategorie}
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
            {/* Dezelfde kiezer als bij een gedeelde kost en bij een transactie, zodat
                dezelfde vraag er overal hetzelfde uitziet. */}
            <GezinsledenKiezer
              label={t('Voor welke kinderen? (leeg = allemaal)')}
              waarden={afrKindIds}
              onWijzig={setAfrKindIds}
              gezinsleden={kinderen}
            />
            {/* Enkel zinvol zodra je écht op kinderen filtert: anders zitten alle
                kosten er sowieso in. */}
            {afrKindIds.length > 0 && (
              <label style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
                <input type="checkbox" checked={zonderKindMee} onChange={(e) => setZonderKindMee(e.target.checked)} />
                <span className="rij-meta">
                  {t('Kosten zonder kind ook meetellen')}
                  <br />
                  {t('Bv. een gezamenlijke schoolrekening zonder kind erbij. Vink je dit uit, dan blijven die kosten open staan.')}
                </span>
              </label>
            )}
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('In deze selectie: {n} kost(en), {saldo}', { n: selectie.length, saldo: verrekenTekst(t, selectieSaldo) })}
            </p>
            {alElders > 0 && (
              <p className="rij-meta" style={{ margin: 0 }}>
                {t('{n} kosten zitten al in een andere afrekening', { n: alElders })}
              </p>
            )}
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
          {toont('gezamenlijke-pot') && (
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
            onNieuweSubcategorie={onNieuweSubcategorie}
          />
          )}

          {/* De documentkluis: overeenkomst, attesten, bonnen en vonnis van dit
              dossier op één plek, zodat je ze niet in je mailbox moet zoeken. */}
          {toont('documentkluis') && (
          <Documentkluis
            eigenaar={{ soort: 'dossier', id: dossier.id }}
            documenten={documenten}
            onOpslaan={onDocumentOpslaan}
            onVerwijderen={onDocumentVerwijderen}
          />
          )}
        </div>
      )}
    </>
  )
}
