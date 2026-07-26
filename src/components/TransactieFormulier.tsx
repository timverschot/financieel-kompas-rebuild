import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type {
  Categorie,
  Dossier,
  DossierDocument,
  GedeeldeKost,
  Kind,
  Kostentype,
  Rekening,
  Streepjescode,
  Transactie,
  TransactieRegel,
} from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { zoekProduct } from '../utils/openFoodFacts'
import { CategorieKiezer } from './CategorieKiezer'
import { HandelaarVeld } from './HandelaarVeld'
import { voorstelCategorie, type HandelaarIndex } from '../utils/categorieVoorstel'
import { ItemZoeker } from './ItemZoeker'
import { NutriScoreBadge } from './NutriScoreBadge'
import { Kaart } from '../ui/basis'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { useT } from '../i18n'
import { vandaag } from '../utils/datum'

// De scanner (en de ZXing-bibliotheek) worden pas geladen wanneer je effectief scant.
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

/**
 * Het invoertijdstip van een boeking: bij een nieuwe het moment van nu, bij een
 * bewerking het oorspronkelijke moment.
 *
 * Waarom niet bijwerken bij een bewerking: dan zou een boeking van vorige maand
 * waar je een typfout in verbetert, bovenaan de lijst van die dag springen. Het
 * veld zegt "wanneer heb je dit ingevoerd", niet "wanneer heb je dit laatst
 * aangeraakt".
 */
function invoertijdstip(bewerken?: Transactie | null): { ingevoerdOp?: string } {
  if (bewerken) return bewerken.ingevoerdOp ? { ingevoerdOp: bewerken.ingevoerdOp } : {}
  return { ingevoerdOp: new Date().toISOString() }
}

// Dezelfde grens als in de documentkluis: boven ~4 MB weigeren we het bestand.
// Een zwaardere data-URL maakt de lokale database én elke back-up traag, en dat
// merk je pas veel later — beter meteen zeggen dat de foto kleiner moet.
const MAX_BON = 4_000_000


// Onthoud de laatst gebruikte rekening als standaard (ook na een herlaad).
const LAATSTE_REKENING_SLEUTEL = 'fk_laatste_rekening'

function standaardRekening(rekeningen: Rekening[]): string {
  try {
    const opgeslagen = localStorage.getItem(LAATSTE_REKENING_SLEUTEL)
    if (opgeslagen && rekeningen.some((r) => r.id === opgeslagen)) return opgeslagen
  } catch {
    // localStorage niet beschikbaar: stil terugvallen.
  }
  return rekeningen[0]?.id ?? ''
}

function onthoudRekening(id: string): void {
  try {
    localStorage.setItem(LAATSTE_REKENING_SLEUTEL, id)
  } catch {
    // stil negeren
  }
}

// Eén kassaticketregel (lokale invoer). 'code'/'nutriScore' zijn optioneel en
// worden ingevuld bij het scannen van een streepjescode.
type KassaRegel = { sleutel: string; categorieId: string; omschrijving: string; bedrag: string; code?: string; nutriScore?: string }
function nieuweKassaRegel(): KassaRegel {
  return { sleutel: nieuwId(), categorieId: '', omschrijving: '', bedrag: '' }
}

// Invoerformulier voor een transactie. 'Handelaar' is de winkel; het bedrag is het
// totaal. Met 'Kassaticket splitsen' verdeel je dat totaal over item-regels; het
// niet-verdeelde restbedrag telt als 'Zonder categorie'.
export function TransactieFormulier({
  onOpslaan,
  onAnnuleer,
  rekeningen,
  categorieen,
  handelaars,
  bewerken,
  streepjescodes = [],
  onOnthoudStreepjescode,
  onNieuweSubcategorie,
  gezinsleden = [],
  handelaarIndex,
  soort: soortVanBuiten,
  onOpgeslagen,
  dossiers = [],
  gekoppeldeKost = null,
  onDossierKost,
  bon = null,
  onBon,
}: {
  onOpslaan: (t: Transactie) => Promise<void> | void
  onAnnuleer?: () => void
  rekeningen: Rekening[]
  categorieen: Categorie[]
  handelaars: string[]
  bewerken?: Transactie | null
  streepjescodes?: Streepjescode[]
  onOnthoudStreepjescode?: (s: Streepjescode) => Promise<void> | void
  // Bewaart een nieuwe subcategorie onder een bestaande (midden)categorie en
  // geeft het nieuwe id terug, zodat de regel er meteen op getagd kan worden.
  onNieuweSubcategorie?: (categorieId: string, naam: string) => Promise<string>
  // Optioneel: voor of door welke gezinsleden was deze uitgave?
  gezinsleden?: Kind[]
  // Optioneel: welke categorie deze handelaar de vorige keer kreeg. Zonder deze
  // index blijft het formulier zich exact gedragen zoals voorheen.
  handelaarIndex?: HandelaarIndex
  /**
   * Uitgave of inkomst, van buitenaf gezet. De invoerpopup heeft daar bovenaan
   * knoppen voor; wordt deze prop meegegeven, dan verdwijnen de twee bolletjes
   * onderaan het formulier zodat dezelfde keuze niet op twee plaatsen staat.
   * Zonder deze prop gedraagt het formulier zich exact zoals voorheen.
   */
  soort?: 'uitgave' | 'inkomst'
  /**
   * Wordt aangeroepen ná een gelukte opslag. `blijfOpen` is waar wanneer je op
   * "Opslaan + volgende" duwde. Zodra deze prop meegegeven wordt, verschijnt die
   * tweede knop.
   */
  onOpgeslagen?: (opties: { blijfOpen: boolean }) => void
  /**
   * De dossiers waaraan deze uitgave gehangen kan worden. Blijft deze lijst leeg,
   * dan verschijnt de dossierkeuze niet — wie geen dossiers gebruikt, ziet er ook
   * niets van.
   */
  dossiers?: Dossier[]
  /** De gedeelde kost die al aan deze (te bewerken) transactie hangt, of null. */
  gekoppeldeKost?: GedeeldeKost | null
  /**
   * Wordt na een gelukte opslag aangeroepen met de gedeelde kost die bij deze
   * transactie hoort, of met `null` wanneer de koppeling weggehaald is. Zonder
   * deze prop verschijnt de dossierkeuze niet.
   */
  onDossierKost?: (kost: GedeeldeKost | null) => Promise<void> | void
  /** De bon/factuur die al aan deze (te bewerken) transactie hangt, of null. */
  bon?: DossierDocument | null
  /**
   * Wordt na een gelukte opslag aangeroepen met het bondocument, of met `null`
   * wanneer de bon weggehaald is. Zonder deze prop verschijnt het bonveld niet.
   */
  onBon?: (document: DossierDocument | null) => Promise<void> | void
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [persoonIds, setPersoonIds] = useState<string[]>([])
  const [eigenSoort, setEigenSoort] = useState<'uitgave' | 'inkomst'>('uitgave')
  // Van buiten gezet heeft voorrang; anders houdt het formulier zijn eigen keuze bij.
  const soort = soortVanBuiten ?? eigenSoort
  const [rekeningId, setRekeningId] = useState(() => standaardRekening(rekeningen))
  const [categorieId, setCategorieId] = useState('')
  const [gesplitst, setGesplitst] = useState(false)
  const [kassaRegels, setKassaRegels] = useState<KassaRegel[]>(() => [nieuweKassaRegel()])
  const zoekRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [scanVoor, setScanVoor] = useState<string | null>(null)
  // Welke van de twee opslaanknoppen ingedrukt werd. Een klik komt altijd vóór de
  // verzending van het formulier, dus dit staat juist op het moment dat we het lezen.
  const blijfOpen = useRef(false)

  // --- De optionele velden (achter "Meer opties") ---
  const [meerOpen, setMeerOpen] = useState(false)
  const [bonData, setBonData] = useState('')
  const [bonNaam, setBonNaam] = useState('')
  const [bonFout, setBonFout] = useState('')
  const [bezigBon, setBezigBon] = useState(false)
  const [dossierId, setDossierId] = useState('')
  const [kostenType, setKostenType] = useState<Kostentype>('gewoon')

  // Een kost die al in een afrekening zit, raken we niet meer aan: het bedrag
  // ervan staat in een afrekening die je misschien al doorgestuurd hebt. Ze stil
  // meeveranderen omdat je hier een typfout in de omschrijving verbetert, zou die
  // afrekening achteraf laten kloppen met iets anders dan wat je verstuurd hebt.
  const kostVastgeklikt = Boolean(gekoppeldeKost?.verrekeningId || gekoppeldeKost?.afgerekend)

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setEigenSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setDatum(bewerken.datum)
      setRekeningId(bewerken.rekeningId)
      setPersoonIds(bewerken.persoonIds ?? [])
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      if (bewerken.regels && bewerken.regels.length > 0) {
        setGesplitst(true)
        setCategorieId('')
        setKassaRegels(
          bewerken.regels.map((r) => ({
            sleutel: nieuwId(),
            categorieId: r.categorieId ?? '',
            omschrijving: r.omschrijving ?? (r.categorieId ? labelVanCategorie(r.categorieId, categorieen) ?? '' : ''),
            bedrag: centenNaarInvoer(Math.abs(r.bedrag)),
          })),
        )
      } else {
        setGesplitst(false)
        setCategorieId(bewerken.categorieId ?? '')
        setKassaRegels([nieuweKassaRegel()])
      }
    } else {
      setOmschrijving('')
      setBedrag('')
      setEigenSoort('uitgave')
      setDatum(vandaag())
      setPersoonIds([])
      setCategorieId('')
      setGesplitst(false)
      setKassaRegels([nieuweKassaRegel()])
    }
  }, [bewerken, categorieen])

  // De optionele velden staan in een aparte useEffect omdat ze uit andere bronnen
  // komen (de gekoppelde kost en het bondocument). Bewerk je een transactie waar al
  // iets van dit alles aan hangt, dan klapt het blok meteen open: anders zou je een
  // bon of een dossierkoppeling niet zien en hem bij het bewaren stil verliezen.
  useEffect(() => {
    const heeftBon = Boolean(bon)
    const heeftKost = Boolean(gekoppeldeKost)
    setBonData(bon?.bestand ?? '')
    setBonNaam(bon?.bestandsnaam ?? '')
    setBonFout('')
    setDossierId(gekoppeldeKost?.dossierId ?? '')
    setKostenType(gekoppeldeKost?.kostenType ?? 'gewoon')
    const heeftPersonen = (bewerken?.persoonIds?.length ?? 0) > 0
    setMeerOpen(Boolean(bewerken) && (heeftBon || heeftKost || heeftPersonen))
  }, [bewerken, bon, gekoppeldeKost])

  const teken = soort === 'uitgave' ? -1 : 1
  const bedragCenten = invoerNaarCenten(bedrag)
  const totaalCenten = Number.isFinite(bedragCenten) && bedragCenten > 0 ? bedragCenten : 0

  const verdeeld = kassaRegels.reduce((s, r) => {
    const c = invoerNaarCenten(r.bedrag)
    return Number.isFinite(c) && c > 0 ? s + c : s
  }, 0)
  const verschil = totaalCenten - verdeeld

  const geldig =
    omschrijving.trim().length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0 && rekeningId.length > 0

  function wijzigRegel(sleutel: string, velden: Partial<KassaRegel>) {
    setKassaRegels((rs) => rs.map((r) => (r.sleutel === sleutel ? { ...r, ...velden } : r)))
  }
  function verwijderRegel(sleutel: string) {
    setKassaRegels((rs) => (rs.length > 1 ? rs.filter((r) => r.sleutel !== sleutel) : rs))
  }
  function voegRegelToe(): string {
    const r = nieuweKassaRegel()
    setKassaRegels((rs) => [...rs, r])
    return r.sleutel
  }

  // Verwerkt een gescande streepjescode voor één regel: eerst kijken of we ze al
  // onthouden hebben (meteen, ook offline), anders online opzoeken via Open Food
  // Facts. De code blijft aan de regel hangen zodat ze bij het opslaan (met de
  // uiteindelijke naam + categorie) onthouden wordt.
  async function verwerkScan(sleutel: string, code: string) {
    setScanVoor(null)
    const onthouden = streepjescodes.find((s) => s.id === code)
    if (onthouden) {
      wijzigRegel(sleutel, { omschrijving: onthouden.naam, categorieId: onthouden.categorieId ?? '', code, nutriScore: onthouden.nutriScore })
      return
    }
    const gevonden = await zoekProduct(code)
    wijzigRegel(sleutel, { omschrijving: gevonden?.naam ?? '', categorieId: '', code, nutriScore: gevonden?.nutriScore })
  }

  function opBedragToets(e: KeyboardEvent<HTMLInputElement>, sleutel: string) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const idx = kassaRegels.findIndex((r) => r.sleutel === sleutel)
    if (idx < kassaRegels.length - 1) {
      // Niet de laatste regel: spring naar het zoekveld van de volgende regel.
      zoekRefs.current[kassaRegels[idx + 1].sleutel]?.focus()
    } else {
      // Laatste regel: alleen een nieuwe toevoegen als deze zinvol ingevuld is.
      const r = kassaRegels[idx]
      const c = invoerNaarCenten(r.bedrag)
      if ((r.omschrijving.trim() || r.categorieId) && Number.isFinite(c) && c > 0) {
        const nieuwSleutel = voegRegelToe()
        setTimeout(() => zoekRefs.current[nieuwSleutel]?.focus(), 0)
      }
    }
  }

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return

    let t: Transactie
    if (gesplitst) {
      const regels: TransactieRegel[] = kassaRegels
        .map((r) => ({ r, centen: invoerNaarCenten(r.bedrag) }))
        .filter(({ r, centen }) => Number.isFinite(centen) && centen > 0 && (r.omschrijving.trim() || r.categorieId))
        .map(({ r, centen }) => ({
          ...(r.categorieId ? { categorieId: r.categorieId } : {}),
          ...(r.omschrijving.trim() ? { omschrijving: r.omschrijving.trim() } : {}),
          bedrag: teken * centen,
        }))
      t = {
        id: bewerken ? bewerken.id : nieuwId(),
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(regels.length > 0 ? { regels } : {}),
        ...(persoonIds.length > 0 ? { persoonIds } : {}),
        ...invoertijdstip(bewerken),
      }
    } else {
      t = {
        id: bewerken ? bewerken.id : nieuwId(),
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(categorieId ? { categorieId } : {}),
        ...(persoonIds.length > 0 ? { persoonIds } : {}),
        ...invoertijdstip(bewerken),
      }
    }

    await onOpslaan(t)
    onthoudRekening(rekeningId)

    // Onthoud elke gescande regel (barcode -> naam + categorie + Nutri-Score), zodat
    // een volgende scan van hetzelfde product meteen werkt, ook offline.
    if (gesplitst && onOnthoudStreepjescode) {
      for (const r of kassaRegels) {
        if (r.code && r.omschrijving.trim()) {
          await onOnthoudStreepjescode({
            id: r.code,
            naam: r.omschrijving.trim(),
            ...(r.categorieId ? { categorieId: r.categorieId } : {}),
            ...(r.nutriScore ? { nutriScore: r.nutriScore } : {}),
          })
        }
      }
    }

    // De bon en de dossierkoppeling worden PAS NA de transactie bewaard: ze wijzen
    // met een id naar de transactie, en dat id mag niet bestaan in een record dat
    // naar iets verwijst wat er niet is.
    await bewaarBon(t.id)
    await bewaarDossierkoppeling(t)

    if (!bewerken) {
      setOmschrijving('')
      setBedrag('')
      setCategorieId('')
      setGesplitst(false)
      setKassaRegels([nieuweKassaRegel()])
      // Ook de optionele velden leeg, anders hangt bij "Opslaan + volgende" de bon
      // van het vorige bonnetje aan de volgende boeking.
      setPersoonIds([])
      setBonData('')
      setBonNaam('')
      setBonFout('')
      setDossierId('')
      setKostenType('gewoon')
      setMeerOpen(false)
    }

    const nog = blijfOpen.current
    blijfOpen.current = false
    onOpgeslagen?.({ blijfOpen: nog })
  }

  // Bewaart of verwijdert de bon die aan deze transactie hangt. Een ongewijzigde
  // bon wordt niet opnieuw weggeschreven: het logboek is append-only, dus dat zou
  // bij elke bewerking dezelfde foto nog eens toevoegen.
  async function bewaarBon(transactieId: string) {
    if (!onBon) return
    if (!bonData) {
      if (bon) await onBon(null)
      return
    }
    if (bon && bon.bestand === bonData) return
    await onBon({
      id: bon ? bon.id : nieuwId(),
      transactieId,
      naam: omschrijving.trim() || t('Bon/factuur'),
      soort: 'bon',
      bestand: bonData,
      toegevoegdOp: vandaag(),
      ...(bonNaam ? { bestandsnaam: bonNaam } : {}),
    })
  }

  // Maakt, werkt bij of verwijdert de gedeelde kost die bij deze transactie hoort.
  async function bewaarDossierkoppeling(tx: Transactie) {
    if (!onDossierKost || kostVastgeklikt) return
    const gekozen = dossierKanGekozenWorden ? dossierId : ''
    if (!gekozen) {
      if (gekoppeldeKost) await onDossierKost(null)
      return
    }
    await onDossierKost({
      id: gekoppeldeKost ? gekoppeldeKost.id : nieuwId(),
      dossierId: gekozen,
      transactieId: tx.id,
      omschrijving: tx.omschrijving,
      // In een dossier is een kost altijd een positief bedrag; de richting zit in
      // 'betaaldDoor'. De transactie zelf blijft negatief, zoals elke uitgave.
      bedrag: Math.abs(tx.bedrag),
      // Je boekt deze uitgave op je eigen rekening, dus jij hebt betaald. Wie de
      // kost van de andere ouder wil ingeven, doet dat op de Dossiers-pagina.
      betaaldDoor: 'jij',
      datum: tx.datum,
      kostenType,
      ...(persoonIds.length > 0 ? { kindIds: persoonIds } : {}),
      ...(categorieId ? { categorieId } : {}),
    })
  }

  // Het voorstel wordt enkel getoond zolang je zelf nog niets gekozen hebt, en
  // nooit bij een gesplitst kassaticket (daar heeft elke regel zijn eigen categorie).
  const voorsteldId = !gesplitst && !categorieId && handelaarIndex ? voorstelCategorie(omschrijving, handelaarIndex) : null
  const voorstelNaam = voorsteldId ? labelVanCategorie(voorsteldId, categorieen) : undefined
  const voorstel = voorsteldId && voorstelNaam ? { id: voorsteldId, naam: voorstelNaam } : null

  // Een inkomst kan geen gedeelde kost zijn, dus dan verschijnt de keuze niet. En
  // zonder dossiers valt er niets te kiezen.
  const dossierKanGekozenWorden = Boolean(onDossierKost) && dossiers.length > 0 && soort === 'uitgave'
  const toonDossierBlok = Boolean(onDossierKost) && (dossierKanGekozenWorden || Boolean(gekoppeldeKost))
  // Het blok "Meer opties" verschijnt alleen als er ook echt iets in staat.
  const heeftGezinsleden = gezinsleden.some((g) => !g.gearchiveerd || persoonIds.includes(g.id))
  const toonMeer = heeftGezinsleden || Boolean(onBon) || toonDossierBlok
  // Hoeveel van de optionele velden ingevuld zijn. Zonder dit getal is een
  // dichtgeklapt blok een blinde vlek: je ziet niet dat er een bon aan hangt.
  const aantalIngevuld = [persoonIds.length > 0, Boolean(bonData), Boolean(dossierId)].filter(Boolean).length

  async function kiesBon(bestand: File) {
    setBezigBon(true)
    setBonFout('')
    try {
      const data = await verkleinAfbeelding(bestand)
      if (data.length > MAX_BON) {
        setBonFout(t('Dit bestand is te groot (max. 4 MB). Kies een kleinere scan of foto.'))
        return
      }
      setBonData(data)
      setBonNaam(bestand.name)
    } catch {
      setBonFout(t('Dit bestand kon niet gelezen worden. Probeer een andere scan of foto.'))
    } finally {
      setBezigBon(false)
    }
  }

  return (
    <form onSubmit={verzend} className="stapel">
      <div className="veldrij">
        <div className="veldgroep" style={{ flex: '2 1 220px' }}>
          <label className="label-caps" htmlFor="handelaar">{t('Handelaar / winkel')}</label>
          <HandelaarVeld id="handelaar" waarde={omschrijving} onWijzig={setOmschrijving} suggestiesBron={handelaars} />
        </div>

        <div className="veldgroep">
          <label className="label-caps" htmlFor="bedrag">{t('Bedrag (€)')}{gesplitst ? t(' — totaal van het ticket') : ''}</label>
          <input
            id="bedrag"
            inputMode="decimal"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
          />
        </div>
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
        <input type="checkbox" checked={gesplitst} onChange={(e) => setGesplitst(e.target.checked)} /> {t('Kassaticket splitsen')}
      </label>

      {!gesplitst ? (
        <>
          <CategorieKiezer
            waarde={categorieId || undefined}
            onKies={(id) => setCategorieId(id ?? '')}
            gebruikerCategorieen={categorieen}
            onNieuweSubcategorie={onNieuweSubcategorie}
            // Boek je een inkomst, dan hoort "Inkomsten" vooraan te staan in
            // plaats van ergens achteraan in de rij.
            voorkeurId={soort === 'inkomst' ? 'ov-inkomsten' : undefined}
          />

          {/* Boekte je deze handelaar eerder, dan stellen we die categorie voor.
              Bewust een voorstel en geen stille invulling: een verkeerd geraden
              categorie die je niet ziet, vervuilt je analyses maanden later. */}
          {voorstel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="rij-meta">{t('Vorige keer bij deze handelaar:')}</span>
              <button
                type="button"
                className="chip"
                aria-label={t('Gebruik {naam}, zoals de vorige keer', { naam: voorstel.naam })}
                onClick={() => setCategorieId(voorstel.id)}
              >
                {voorstel.naam}
              </button>
            </div>
          )}
        </>
      ) : (
        <Kaart compact style={{ background: 'var(--surface-2)' }}>
          {kassaRegels.map((r, i) => (
            <div key={r.sleutel} className="rij" style={{ flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                <ItemZoeker
                  waarde={r.omschrijving}
                  onTekst={(tekst) => wijzigRegel(r.sleutel, { omschrijving: tekst, categorieId: '' })}
                  onKiesItem={(item) => wijzigRegel(r.sleutel, { categorieId: item.id, omschrijving: item.naam })}
                  categorieId={r.categorieId}
                  eigenCategorieen={categorieen}
                  // Breed taggen: een regel "diversen" zet je zo op 'Huishouden'.
                  // Stond er nog geen omschrijving, dan nemen we de naam van de
                  // hoofdcategorie over.
                  onKiesHoofdcategorie={(hoofdId, hoofdNaam) =>
                    wijzigRegel(r.sleutel, {
                      categorieId: hoofdId,
                      omschrijving: r.omschrijving.trim() || hoofdNaam,
                    })
                  }
                  onNieuweSubcategorie={onNieuweSubcategorie}
                  registerInput={(el) => {
                    zoekRefs.current[r.sleutel] = el
                  }}
                />
              </div>
              <button
                type="button"
                className="knop knop-icoon"
                aria-label={t('Scan streepjescode voor regel {n}', { n: i + 1 })}
                onClick={() => setScanVoor(r.sleutel)}
                title={t('Streepjescode scannen')}
              >
                📷
              </button>
              <input
                aria-label={t('Deelbedrag')}
                style={{ width: 96, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                inputMode="decimal"
                placeholder="0,00"
                value={r.bedrag}
                onChange={(e) => wijzigRegel(r.sleutel, { bedrag: e.target.value })}
                onKeyDown={(e) => opBedragToets(e, r.sleutel)}
              />
              {kassaRegels.length > 1 && (
                <button
                  type="button"
                  className="knop knop-kaal knop-gevaar"
                  aria-label={t('Verwijder regel {n}', { n: i + 1 })}
                  onClick={() => verwijderRegel(r.sleutel)}
                >
                  ×
                </button>
              )}
              {r.nutriScore && (
                <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="label-caps">{t('Nutri-Score')}</span>
                  <NutriScoreBadge score={r.nutriScore} />
                </div>
              )}
            </div>
          ))}

          <div className="knoprij">
            <button type="button" className="knop knop-secundair knop-klein" onClick={() => voegRegelToe()}>
              {t('+ Regel toevoegen')}
            </button>
          </div>

          <p style={{ margin: 0, fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }}>
            {t('Verdeeld:')} <strong className="bedrag">{formatEuro(verdeeld)}</strong> {t('van')}{' '}
            <strong className="bedrag">{formatEuro(totaalCenten)}</strong>{' '}
            {Math.abs(verschil) < 1 ? (
              <span style={{ color: 'var(--positive)' }}>✓</span>
            ) : (
              <span className="bedrag" style={{ color: verschil < 0 ? 'var(--negative)' : 'var(--warn)' }}>
                {t('(nog {bedrag})', { bedrag: formatEuro(verschil) })}
              </span>
            )}
          </p>
        </Kaart>
      )}

      {/* De optionele velden zitten achter één regel. Ze zijn alle drie waardevol,
          maar ze staan niet in de weg van wat je bij negen op de tien boekingen
          alleen nodig hebt: winkel, bedrag, categorie. Op een telefoon vulde de
          popup zonder deze inklapping bijna het hele scherm. */}
      {toonMeer && (
        <div className="stapel" style={{ gap: 12 }}>
          <div>
            <button
              type="button"
              className="knop knop-ghost knop-klein"
              aria-expanded={meerOpen}
              onClick={() => setMeerOpen((v) => !v)}
            >
              {meerOpen
                ? t('Minder opties')
                : aantalIngevuld > 0
                  ? t('Meer opties ({n} ingevuld)', { n: aantalIngevuld })
                  : t('Meer opties')}
            </button>
          </div>

          {meerOpen && (
            <div className="stapel" style={{ gap: 12, borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
              {/* Voor of door wie was deze uitgave? Verschijnt enkel als er
                  gezinsleden ingesteld zijn. "Het gezin" staat standaard aan: de
                  meeste uitgaven zijn van iedereen samen, en pas wanneer je
                  iemand aanduidt wordt het persoonlijk. */}
              <GezinsledenKiezer
                label={t('Voor wie?')}
                waarden={persoonIds}
                onWijzig={setPersoonIds}
                gezinsleden={gezinsleden}
                metGezin
                hint={t('Duid je niemand aan, dan telt dit als een uitgave voor het gezin.')}
              />

              {onBon && (
                <div className="veldgroep">
                  <label className="label-caps" htmlFor="tx-bon">{t('Bon/factuur (optioneel)')}</label>
                  {bonData ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {bonData.startsWith('data:image') && (
                        <img
                          src={bonData}
                          alt={t('Bon/factuur')}
                          style={{ maxHeight: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        />
                      )}
                      {bonNaam && <span className="rij-meta">{bonNaam}</span>}
                      <a href={bonData} target="_blank" rel="noreferrer">{t('bekijken')}</a>
                      <button
                        type="button"
                        className="knop knop-ghost knop-klein knop-gevaar"
                        onClick={() => {
                          setBonData('')
                          setBonNaam('')
                        }}
                      >
                        {t('verwijderen')}
                      </button>
                    </div>
                  ) : (
                    <input
                      id="tx-bon"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void kiesBon(f)
                        e.target.value = ''
                      }}
                    />
                  )}
                  {bezigBon && <span className="rij-meta">{t('bezig…')}</span>}
                  {bonFout && (
                    <span className="rij-meta" style={{ color: 'var(--negative)' }}>
                      {bonFout}
                    </span>
                  )}
                </div>
              )}

              {toonDossierBlok && (
                <>
                  {kostVastgeklikt ? (
                    // Al afgerekend: tonen wat er hangt, maar niets meer wijzigen.
                    <p className="leeg" style={{ padding: 0, textAlign: 'left' }}>
                      {t('Deze uitgave zit al in een afrekening van een dossier en wordt hier niet meer gewijzigd.')}
                    </p>
                  ) : !dossierKanGekozenWorden ? (
                    // Er hangt een kost aan, maar delen kan hier niet (meer): je zet
                    // de boeking om naar een inkomst. Zeg dat, in plaats van de
                    // koppeling stil weg te gooien bij het bewaren.
                    <p className="leeg" style={{ padding: 0, textAlign: 'left' }}>
                      {t('Een inkomst kan geen gedeelde kost zijn. Bewaar je dit zo, dan verdwijnt de koppeling met het dossier.')}
                    </p>
                  ) : (
                    <>
                      <div className="veldgroep">
                        <label className="label-caps" htmlFor="tx-dossier">{t('Delen in een dossier (optioneel)')}</label>
                        <select id="tx-dossier" value={dossierId} onChange={(e) => setDossierId(e.target.value)}>
                          <option value="">{t('Niet delen')}</option>
                          {dossiers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.naam}
                            </option>
                          ))}
                        </select>
                      </div>
                      {dossierId && (
                        <>
                          <div className="veldgroep">
                            <label className="label-caps" htmlFor="tx-kosttype">{t('Soort kost')}</label>
                            <select
                              id="tx-kosttype"
                              value={kostenType}
                              onChange={(e) => setKostenType(e.target.value as Kostentype)}
                            >
                              <option value="gewoon">{t('Gewone kost')}</option>
                              <option value="buitengewoon">{t('Buitengewone kost')}</option>
                            </select>
                          </div>
                          <p className="leeg" style={{ padding: 0, textAlign: 'left' }}>
                            {t('Je betaalde deze uitgave zelf. De verdeling volgt de afspraak van het dossier; op de Dossiers-pagina kan je ze voor deze kost nog aanpassen.')}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="datum">{t('Datum')}</label>
          <input id="datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="rekening">{t('Rekening')}</label>
          <select id="rekening" value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
            {rekeningen.map((r) => (
              <option key={r.id} value={r.id}>
                {r.naam}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staat de soort van buitenaf vast (de knoppenrij bovenaan de invoerpopup),
          dan verdwijnen deze bolletjes: dezelfde keuze twee keer op één scherm is
          precies hoe je een uitgave als inkomst boekt zonder het te merken. */}
      {soortVanBuiten === undefined && (
        <div className="veldrij" style={{ gap: 18 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" name="soort" checked={soort === 'uitgave'} onChange={() => setEigenSoort('uitgave')} /> {t('Uitgave')}
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" name="soort" checked={soort === 'inkomst'} onChange={() => setEigenSoort('inkomst')} /> {t('Inkomst')}
          </label>
        </div>
      )}

      <div className="knoprij">
        <button type="submit" className="knop knop-primair" disabled={!geldig}>
          {bewerken ? t('Wijzigen') : t('Toevoegen')}
        </button>
        {onOpgeslagen && !bewerken && (
          <button
            type="submit"
            className="knop knop-ghost"
            disabled={!geldig}
            onClick={() => {
              blijfOpen.current = true
            }}
          >
            {t('Opslaan + volgende')}
          </button>
        )}
        {bewerken && onAnnuleer && (
          <button type="button" className="knop knop-secundair" onClick={onAnnuleer}>
            {t('Annuleer')}
          </button>
        )}
      </div>

      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt.
          Zonder rekening kan een transactie nergens op geboekt worden, en dat is
          bij een gloednieuwe app het allereerste wat je moet doen. */}
      {!geldig && (
        <p className="leeg" style={{ padding: '4px 0 0', textAlign: 'left' }}>
          {rekeningen.length === 0
            ? t('Maak eerst een rekening aan — een transactie moet ergens op geboekt worden.')
            : t('Geef een handelaar en een bedrag om op te slaan.')}
        </p>
      )}

      {scanVoor && (
        <Suspense fallback={null}>
          <BarcodeScanner onGevonden={(code) => void verwerkScan(scanVoor, code)} onSluiten={() => setScanVoor(null)} />
        </Suspense>
      )}
    </form>
  )
}
