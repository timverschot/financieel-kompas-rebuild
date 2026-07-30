import { useEffect, useState } from 'react'
import type { Categorie, Dossier, DossierDocument, GedeeldeKost, Kind, Kindrekening, Kindrekeningpost, Verrekening } from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { KindrekeningSectie } from './KindrekeningSectie'
import { Documentkluis } from './DossierKluis'
import { CategorieKiezer } from './CategorieKiezer'
import { saldoVerrekeningDossier } from '../utils/dossier'
import { isOpenKost, kostenVoorAfrekening, type AfrekeningFilter } from '../utils/afrekening'
import {
  verrekenTekst,
  afrekeningSamenvatting,
  heeftEenBon,
  periodeTekst,
  kinderenTekst,
  groepLabel,
  verdeelsleutelTekst,
  saldoLegende,
  totaalRegels,
  regelMeta,
} from '../utils/afrekeningTekst'
import { bouwAfrekeningOverzicht, type AfrekeningGroep } from '../utils/afrekeningOverzicht'
import { exporteerAfrekeningPDF } from '../utils/afrekeningPdf'
import { exporteerBewijsmapPDF } from '../utils/bewijsmapPdf'
import { bonVanKost } from '../utils/kluis'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { useT, type Vertaler } from '../i18n'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { Bonknop } from '../ui/Bonknop'
import { formatEuro } from '../utils/format'
import { dagJaar } from '../utils/datum'

// De onderdelen van een dossier die je kan wegklikken.
//
// Niet elk dossier gebruikt alles. De ene co-ouder rekent alles fiftyfifty af en
// heeft nooit een verdeelsleutel per categorie nodig; de andere heeft geen
// gezamenlijke pot en bewaart de papieren elders. Die kaarten scrollen dan eeuwig
// mee zonder ooit iets te doen.
//
// Wat er BEWUST niet in staat: de lijst met open kosten. Dat is waar een dossier
// voor bestaat — verberg je die, dan blijft er een lege pagina over. De keuze zit
// op het dossier (`Dossier.verborgenOnderdelen`), dus ze klopt ook op je gsm.
//
// 'verrekeningen' kwam er in ronde 36 bij: wie zijn kosten gewoon bijhoudt en pas
// op het einde van het jaar afrekent, scrolt anders elke keer voorbij twee kaarten
// die hij nooit gebruikt.
export const DOSSIER_ONDERDELEN = [
  { id: 'verdeling-categorie', label: 'Verdeling per categorie' },
  { id: 'verdeling-kostensoort', label: 'Verdeling per kostensoort' },
  { id: 'verrekeningen', label: 'Verrekeningen' },
  // Ronde 40: een eigen sleutel, bewust NIET aan 'verrekeningen' gehangen. Die
  // vlag dekt al twee kaarten; er een derde bij zetten zou betekenen dat wie de
  // opbouw niet wil zien ook de knop kwijtraakt om een afrekening te maken.
  { id: 'afrekening-detail', label: 'Opbouw van een afrekening' },
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
  beginDossierId,
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
  /**
   * Welk dossier meteen open moet staan (ronde 40). Klik je in de transactielijst
   * op de badge "gedeeld", dan hoor je in dát dossier te landen en niet in het
   * eerste uit de lijst. Alleen de BEGINstand: wissel je daarna zelf, dan blijft
   * jouw keuze staan.
   */
  beginDossierId?: string | null
}) {
  const { t } = useT()
  const [geselecteerd, setGeselecteerd] = useState(beginDossierId ?? '')
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
  // Van welke afrekening staat de opbouw open (ronde 40). Eén tegelijk: het is een
  // lang blok, en twee ervan naast elkaar lees je toch niet.
  const [opbouwVan, setOpbouwVan] = useState('')
  const [bewijsmapBezig, setBewijsmapBezig] = useState('')
  const [bewijsmapFout, setBewijsmapFout] = useState('')
  const [bewijsmapKlaar, setBewijsmapKlaar] = useState('')

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
      await navigator.clipboard.writeText(
        afrekeningSamenvatting(t, dossier, v, kosten, kinderen, categorieen, new Date(), documenten),
      )
      setGekopieerd(v.id)
      window.setTimeout(() => setGekopieerd(''), 2000)
    } catch {
      // klembord niet beschikbaar: stil negeren.
    }
  }

  async function exportPdf(v: Verrekening) {
    if (!dossier) return
    // Dezelfde wachttoestand als de bewijsmap: anders kan er tijdens het bouwen van
    // een bewijsmap een PDF-melding tussendoor komen.
    if (bewijsmapBezig !== '') return
    // Ronde 41: deze knop had geen vangnet. Liep de PDF stuk, dan gebeurde er
    // letterlijk niets — geen bestand, geen melding, alleen iets in de console dat
    // niemand ziet. Nu de bewijsmap ernaast staat, moeten ze zich hetzelfde gedragen.
    setBewijsmapFout('')
    setBewijsmapKlaar('')
    try {
      await exporteerAfrekeningPDF(t, dossier, v, kosten, kinderen, categorieen, new Date(), documenten)
      setBewijsmapKlaar(t('De PDF van {datum} is gedownload.', { datum: v.datum }))
    } catch {
      setBewijsmapFout(t('De PDF van {datum} kon niet gemaakt worden. Probeer het opnieuw.', { datum: v.datum }))
    }
  }

  // De bewijsmap (ronde 41): hetzelfde dossier, maar volledig — per kost de
  // berekening en de verdeelsleutel die erop gold, en elke bon als afbeelding op een
  // eigen bladzijde. Bedoeld om aan een advocaat of bemiddelaar te geven.
  //
  // Duurt langer dan de gewone PDF, want er zitten afbeeldingen in. Zonder de
  // wachttoestand hieronder tik je drie keer omdat er niets lijkt te gebeuren.
  async function exportBewijsmap(v: Verrekening) {
    if (!dossier) return
    // De knop blijft met `aria-disabled` bereikbaar, dus hij kan écht nog aangeklikt
    // worden. Deze regel is wat een tweede tik tegenhoudt.
    if (bewijsmapBezig !== '') return
    setBewijsmapBezig(v.id)
    setBewijsmapFout('')
    setBewijsmapKlaar('')
    try {
      await exporteerBewijsmapPDF(t, dossier, v, kosten, kinderen, categorieen, documenten)
      // Bij een download gebeurt er op het scherm niets. Zonder deze regel weet wie
      // met een schermlezer werkt niet of het bestand er komt.
      setBewijsmapKlaar(t('De bewijsmap van {datum} is gedownload.', { datum: v.datum }))
    } catch {
      setBewijsmapFout(t('De bewijsmap van {datum} kon niet gemaakt worden. Probeer het opnieuw.', { datum: v.datum }))
    } finally {
      setBewijsmapBezig('')
    }
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

        {/* Welke onderdelen zijn van toepassing op dít dossier?
            Tot ronde 35 zat dit achter een knop "Onderdelen". Dat woord zei niets,
            en wat je niet ziet ga je ook niet gebruiken: je bleef dus scrollen langs
            kaarten die je nooit nodig had. De vakjes staan nu gewoon open, met een
            vraag als titel in plaats van een zelfstandig naamwoord. */}
        {dossier && (
          <div className="veldgroep">
            <span className="label-caps" id="dossier-onderdelen-kop">{t('Wat toon je in dit dossier?')}</span>
            <div
              className="chiprooster"
              role="group"
              aria-labelledby="dossier-onderdelen-kop"
            >
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
                      {/* `bonVanKost` en niet `k.bonnetje`: hangt de kost aan een
                          transactie, dan zit de bonfoto in de documentkluis. Zonder
                          deze regel zag je hier geen bonknop terwijl de bewijsmap de
                          bon wél als bijlage meenam. */}
                      {bonVanKost(k, documenten) && (
                        <Bonknop bestand={bonVanKost(k, documenten) as string} naam={k.omschrijving} label={t('bon')} />
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

          {/* Verrekenen: een nieuwe afrekening maken en de gemaakte afrekeningen.
              Samen één onderdeel — wie zijn kosten alleen bijhoudt en pas veel later
              afrekent, zet ze in één keer uit. */}
          {toont('verrekeningen') && (
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
          )}

          {/* Afrekeningen */}
          {toont('verrekeningen') && afrekeningen.length > 0 && (
            <Kaart
              titel={t('Afrekeningen')}
              bijschrift={t('Kopieer stuurt een korte samenvatting door. PDF is diezelfde samenvatting als document. De bewijsmap is het volledige dossier: per kost de berekening en elke bon als bijlage.')}
            >
              <ul className="lijst">
                {afrekeningen.map((v) => {
                  const periode = v.periodeVan || v.periodeTot ? `${v.periodeVan ?? '…'} – ${v.periodeTot ?? '…'}` : t('alle periodes')
                  const wie = v.kindIds && v.kindIds.length > 0 ? kindNamen(v.kindIds) : t('alle kinderen')
                  return (
                    <li key={v.id} className="rij rij-kost" style={{ opacity: v.overgemaakt ? 0.7 : 1 }}>
                      <span className="rij-midden">
                        <span className="rij-titel">{verrekenTekst(t, v.bedrag)}</span>
                        <span className="rij-meta">
                          {v.datum} · {periode} · {wie}
                        </span>
                      </span>
                      {/* Zes bedieningen in één rij passen niet op een telefoon, en
                          `.lijst` heeft `overflow: hidden` — dan verdwijnt een knop
                          gewoon in plaats van de pagina breder te maken.
                          `flexWrap` op deze span hielp daar niet tegen: `.rij-acties`
                          heeft `flex-shrink: 0`, dus de span houdt haar volle breedte
                          en er valt niets af te breken. `.rij-kost` op de <li> hierboven
                          is de klasse die daar wél voor bestaat: onder 560 px krijgen
                          de tekst en de knoppen elk een eigen regel. */}
                      <span className="rij-acties" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <label className="rij-meta raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* `.tx-vinkje`: zonder die klasse is dit met ~13 px het
                              kleinste raakvlak van de rij, pal naast knoppen van 44 px. */}
                          <input
                            type="checkbox"
                            className="tx-vinkje"
                            checked={!!v.overgemaakt}
                            onChange={(e) => onMarkeerOvergemaakt(v, e.target.checked)}
                          />{' '}
                          {t('Overgemaakt')}
                        </label>
                        <button type="button" className="knop knop-ghost knop-klein" onClick={() => kopieerSamenvatting(v)}>
                          {gekopieerd === v.id ? t('Gekopieerd ✓') : t('Kopieer')}
                        </button>
                        <button type="button" className="knop knop-ghost knop-klein" onClick={() => exportPdf(v)}>
                          PDF
                        </button>
                        {/* `aria-disabled` en niet `disabled`: dat laatste haalt de
                            knop die je net aanraakte uit de tab-volgorde, waardoor de
                            focus naar de pagina valt en je je moet terugtabben. Zie de
                            uitleg bij `.knop[aria-disabled]` in index.css.
                            En bewust alleen DEZE rij op slot: bij acht afrekeningen
                            werden er anders zeven grijs zonder uitleg. */}
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          aria-disabled={bewijsmapBezig === v.id}
                          // De zichtbare tekst zegt "Bewijsmap"; wie met een
                          // schermlezer werkt, hoort er ook bij WELKE afrekening ze
                          // hoort — en dat ze bezig is, want een tekstwissel op een
                          // knop wordt niet aangekondigd.
                          aria-label={
                            bewijsmapBezig === v.id
                              ? t('Bewijsmap van {datum} — bezig…', { datum: v.datum })
                              : t('Bewijsmap met bonnen van de afrekening van {datum}', { datum: v.datum })
                          }
                          onClick={() => exportBewijsmap(v)}
                        >
                          {bewijsmapBezig === v.id ? t('Bezig…') : t('Bewijsmap')}
                        </button>
                        {/* Ronde 40: de rekenkern achter een afrekening werd tot nu
                            toe alleen door de PDF en de tekstkopie gebruikt. Op het
                            scherm zag je enkel het bedrag — precies het cijfer waar
                            je met de andere ouder over praat, zonder de opbouw. */}
                        {toont('afrekening-detail') && (
                          <button
                            type="button"
                            className="knop knop-ghost knop-klein"
                            aria-expanded={opbouwVan === v.id}
                            onClick={() => setOpbouwVan(opbouwVan === v.id ? '' : v.id)}
                          >
                            {opbouwVan === v.id ? t('Verberg opbouw') : t('Toon opbouw')}
                          </button>
                        )}
                        <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder afrekening {datum}', { datum: v.datum })} onClick={() => onVerwijderAfrekening(v.id)}>
                          ×
                        </button>
                      </span>
                      {toont('afrekening-detail') && opbouwVan === v.id && (
                        <AfrekeningOpbouw
                          t={t}
                          dossier={dossier}
                          afrekening={v}
                          kosten={kosten}
                          kinderen={kinderen}
                          categorieen={categorieen}
                          documenten={documenten}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
              {bewijsmapFout !== '' && (
                <p className="foutregel" role="alert">
                  {bewijsmapFout}
                </p>
              )}
              {/* Altijd aanwezig, leeg wanneer er niets te melden is: een
                  `role="status"` die pas bij de melding in het document verschijnt,
                  wordt door sommige schermlezers niet voorgelezen. */}
              <p className="rij-meta" role="status">
                {bewijsmapKlaar}
              </p>
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

/**
 * De opbouw van één afrekening, op het scherm (ronde 40).
 *
 * `utils/afrekeningOverzicht.ts` rekent al uit hoe elk bedrag tot stand komt —
 * per kind, per categorie, per kostensoort, en per kost met de gebruikte
 * verdeelsleutel erbij. Tot deze ronde werd die rekenkern alleen door de
 * PDF-export en de tekstkopie aangeroepen: op het scherm stond enkel het bedrag
 * en één metaregel. Wie met de andere ouder over dat bedrag praat, moest dus
 * eerst een PDF maken om te kunnen uitleggen waar het vandaan komt.
 *
 * De woorden komen uit dezelfde helpers als de PDF en de tekstkopie
 * (`afrekeningTekst.ts`). Dat is geen luiheid maar een eis: het scherm en het
 * bewijsstuk moeten letterlijk hetzelfde zeggen.
 */
function AfrekeningOpbouw({
  t,
  dossier,
  afrekening,
  kosten,
  kinderen,
  categorieen,
  documenten = [],
}: {
  t: Vertaler
  dossier: Dossier
  afrekening: Verrekening
  kosten: GedeeldeKost[]
  kinderen: Kind[]
  categorieen: Categorie[]
  /** De documentkluis, zodat het scherm dezelfde bonnen ziet als de bewijsmap. */
  documenten?: DossierDocument[]
}) {
  const o = bouwAfrekeningOverzicht(dossier, afrekening, kosten, kinderen, categorieen, (k) =>
    heeftEenBon(k, documenten),
  )

  // Eén uitsplitsing. Vier kolommen zoals in de PDF: totaal, jij, partner, saldo.
  // Op een telefoon stapelen ze onder de naam in plaats van uit de kaart te lopen.
  const Uitsplitsing = ({ titel, groepen }: { titel: string; groepen: AfrekeningGroep[] }) =>
    groepen.length === 0 ? null : (
      <div className="veldgroep">
        <span className="label-caps">{titel}</span>
        <ul className="lijst">
          {groepen.map((g) => (
            <li key={g.sleutel} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="rij-midden">
                  <span className="rij-titel">{groepLabel(t, g)}</span>
                </span>
                <Bedrag centen={g.totaal} />
              </span>
              <span className="rij-meta">
                {t('jij {jij} / partner {partner}', {
                  jij: formatEuro(g.jouwAandeel),
                  partner: formatEuro(g.partnerAandeel),
                })}{' '}
                · {t('saldo')} {formatEuro(g.netto)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )

  return (
    <div style={{ width: '100%', paddingTop: 12 }}>
      {/* `backgroundColor` en niet `background`: de shorthand wist de
          background-image van `.kaart`, en daarmee de ambergloed die ronde 32
          app-breed maakte. En geen `stapel` erbij — die zet de tussenruimte terug
          op 16 px en draait de compacte maatvoering ongedaan. */}
      <Kaart compact style={{ backgroundColor: 'var(--surface-2)', gap: 12 }}>
        <div className="veldgroep">
          <span className="label-caps">{t('Verdeelsleutel')}</span>
          {o.verdeelsleutels.length === 0 ? (
            <Leeg>{t('Geen kosten in deze afrekening.')}</Leeg>
          ) : (
            <ul className="lijst">
              {o.verdeelsleutels.map((s, i) => (
                <li key={`${s.percentageJij}-${s.herkomst}-${s.bron}-${i}`} className="rij">
                  <span className="rij-midden">
                    <span className="rij-meta">{verdeelsleutelTekst(t, s)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <span className="rij-meta">
            {t('Periode')}: {periodeTekst(t, o)} · {t('Kinderen')}: {kinderenTekst(t, o)}
          </span>
        </div>

        <div className="veldgroep">
          <span className="label-caps">{t('Totalen')}</span>
          <ul className="lijst">
            {totaalRegels(t, o).map((r) => (
              <li key={r.label} className="rij">
                <span className="rij-midden rij-titel">{r.label}</span>
                <span className="bedrag">{r.waarde}</span>
              </li>
            ))}
          </ul>
          <span className="rij-titel">{verrekenTekst(t, o.netto)}</span>
          {/* Dezelfde waarschuwing als in de PDF: is de verdeling van het dossier
              sinds het genereren gewijzigd, dan klopt het bewaarde bedrag niet meer
              met wat je hier ziet. Dat hoort er te staan, niet stil weggerekend. */}
          {o.wijktAf && (
            <span className="rij-meta" style={{ color: 'var(--warn-tekst)' }}>
              {t('Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.', {
                bedrag: formatEuro(o.bewaardNetto),
              })}
            </span>
          )}
          <span className="rij-meta">{saldoLegende(t)}</span>
        </div>

        <Uitsplitsing titel={t('Per kind')} groepen={o.perKind} />
        <Uitsplitsing titel={t('Per categorie')} groepen={o.perCategorie} />
        <Uitsplitsing titel={t('Per kostensoort')} groepen={o.perKostensoort} />

        <div className="veldgroep">
          <span className="label-caps">{t('Detail')}</span>
          {o.regels.length === 0 ? (
            <Leeg>{t('Geen kosten in deze afrekening.')}</Leeg>
          ) : (
            <ul className="lijst">
              {o.regels.map((r) => {
                const meta = regelMeta(t, r)
                return (
                  <li key={r.kostId} className="rij" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="rij-midden">
                        <span className="rij-titel">{r.omschrijving || t('Zonder omschrijving')}</span>
                        <span className="rij-meta">{dagJaar(r.datum)}</span>
                      </span>
                      <Bedrag centen={r.bedrag} />
                    </span>
                    {meta.map((regel, i) => (
                      <span key={i} className="rij-meta">
                        {regel}
                      </span>
                    ))}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Kaart>
    </div>
  )
}
