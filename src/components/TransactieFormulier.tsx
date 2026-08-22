import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type {
  Categorie,
  Dossier,
  DossierDocument,
  Garantie,
  GedeeldeKost,
  Kind,
  Kostentype,
  Rekening,
  Transactie,
  TransactieRegel,
} from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { rekeningLabel, standaardRekening, onthoudRekening } from '../utils/rekening'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { CategorieKiezer } from './CategorieKiezer'
import { HandelaarVeld } from './HandelaarVeld'
import { voorstelCategorie, type HandelaarIndex } from '../utils/categorieVoorstel'
import { ItemZoeker } from './ItemZoeker'
import { Kaart } from '../ui/basis'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { verkleinAfbeelding } from '../utils/afbeelding'
import { useT } from '../i18n'
import type { NieuweTak } from '../utils/categorietak'
import { vandaag } from '../utils/datum'
import { Bonknop } from '../ui/Bonknop'

/**
 * Het invoertijdstip van een boeking: bij een nieuwe het moment van nu, bij een
 * bewerking het oorspronkelijke moment.
 *
 * Waarom niet bijwerken bij een bewerking: dan zou een boeking van vorige maand
 * waar je een typfout in verbetert, bovenaan de lijst van die dag springen. Het
 * veld zegt "wanneer heb je dit ingevoerd", niet "wanneer heb je dit laatst
 * aangeraakt".
 */
/**
 * Velden die dit formulier NIET beheert en die een bewerking moeten overleven.
 *
 * ⚠ Waarom dit bestaat (nakijkronde ronde 64). Dit formulier bouwt de transactie
 * elke keer van nul op. Alles wat het niet zelf kent, verdwijnt dus zodra je een
 * boeking opent en op "Wijzigen" drukt — ook al veranderde je alleen een letter in
 * de handelaarsnaam. Voor `vasteLastId` is dat erger dan een verloren veld: dat is
 * het ANTWOORD dat de gebruiker gaf op de vraag "is dit je vaste last Water?", en
 * de app belooft hem dat dat antwoord blijft staan. Zonder deze regel sprong die
 * vaste last na de kleinste correctie terug naar "nog te boeken", zonder één woord
 * uitleg.
 *
 * ⚠ Maar ALLEEN zolang de boeking blijft wat ze was (tweede nakijkronde ronde 64).
 * Zet je diezelfde boeking om naar een inkomst of naar een gesplitst kassaticket,
 * dan is ze niet meer de betaling van die vaste last: een kassaticket van € 120 bij
 * Colruyt bleef anders de vaste last Water van € 30 afdekken, en een omgezette
 * inkomst haalde de € 30 uit je verwachte uitgaven én zette er € 32 inkomsten bij.
 * De koppeling valt dan gewoon weg; de vraag komt vanzelf terug als ze weer past.
 *
 * Komt er ooit nog zo'n veld bij, dan hoort het hier.
 */
function bewaardVeld(bewerken: Transactie | null | undefined, blijftUitgave: boolean): { vasteLastId?: string } {
  if (!blijftUitgave) return {}
  return bewerken?.vasteLastId ? { vasteLastId: bewerken.vasteLastId } : {}
}

function invoertijdstip(bewerken?: Transactie | null): { ingevoerdOp?: string } {
  if (bewerken) return bewerken.ingevoerdOp ? { ingevoerdOp: bewerken.ingevoerdOp } : {}
  return { ingevoerdOp: new Date().toISOString() }
}

// Dezelfde grens als in de documentkluis: boven ~4 MB weigeren we het bestand.
// Een zwaardere data-URL maakt de lokale database én elke back-up traag, en dat
// merk je pas veel later — beter meteen zeggen dat de foto kleiner moet.
const MAX_BON = 4_000_000



// Eén kassaticketregel (lokale invoer).
type KassaRegel = { sleutel: string; categorieId: string; omschrijving: string; bedrag: string }
function nieuweKassaRegel(): KassaRegel {
  return { sleutel: nieuwId(), categorieId: '', omschrijving: '', bedrag: '' }
}

// Invoerformulier voor een transactie. 'Handelaar' is de winkel; het bedrag is het
// totaal. Met 'Kassaticket splitsen' verdeel je dat totaal over item-regels; het
// niet-verdeelde restbedrag telt als 'Zonder categorie'.
// Leest het aantal garantiemaanden. Geeft null bij onzin, zodat de opslaanknop uit
// kan blijven met een regel eronder die zegt wat er mankeert — in plaats van er
// stil 24 van te maken.
function leesMaanden(waarde: string): number | null {
  const getal = Number.parseInt(waarde.trim(), 10)
  if (!Number.isFinite(getal) || getal <= 0 || getal > 600) return null
  return getal
}

export function TransactieFormulier({
  onOpslaan,
  onAnnuleer,
  rekeningen,
  categorieen,
  handelaars,
  bewerken,
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
  gekoppeldeGarantie = null,
  onGarantie,
}: {
  onOpslaan: (t: Transactie) => Promise<void> | void
  onAnnuleer?: () => void
  rekeningen: Rekening[]
  categorieen: Categorie[]
  handelaars: string[]
  bewerken?: Transactie | null
  // Bewaart een nieuwe subcategorie onder een bestaande (midden)categorie en
  // geeft het nieuwe id terug, zodat de regel er meteen op getagd kan worden.
  onNieuweSubcategorie?: (plan: NieuweTak) => Promise<string>
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
  /** Het garantiebewijs dat al aan deze (te bewerken) transactie hangt, of null. */
  gekoppeldeGarantie?: Garantie | null
  /**
   * Wordt na een gelukte opslag aangeroepen met het garantiebewijs dat bij deze
   * transactie hoort, of met `null` wanneer het vinkje weer uit gaat. Zonder deze
   * prop verschijnt het garantieveld niet.
   */
  onGarantie?: (garantie: Garantie | null) => Promise<void> | void
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
  // Bezig met bewaren? De ref grendelt meteen (state is pas na een hertekening
  // bijgewerkt, en twee snelle tikken zitten binnen datzelfde beeldje).
  const [bezig, setBezig] = useState(false)
  const bezigRef = useRef(false)
  const [opslaanFout, setOpslaanFout] = useState('')
  // Het id van de boeking die nu ingevuld wordt. Eén keer bepaald, niet bij elke
  // poging opnieuw: lukt het bewaren van de transactie wél maar dat van de bon
  // niet, dan zegt de app "probeer het opnieuw" — en met een nieuw id zou die
  // tweede poging een TWEEDE boeking maken in plaats van dezelfde te herstellen.
  const nieuwIdRef = useRef(nieuwId())
  // Om precies dezelfde reden krijgen de drie AANHANGSELS ook elk één vast id
  // (ronde 36). Ze werden tot nu toe pas bij het verzenden aangemaakt, en dat is
  // niet hetzelfde: `verzend()` bewaart na de transactie nog de bon, de
  // dossierkoppeling en het garantiebewijs. Brak dat op de derde stap af, dan zei
  // de app "je invoer staat er nog" — en maakte de tweede klik, die diezelfde
  // melding vraagt, een TWEEDE gedeelde kost in het dossier. Die telt dubbel mee
  // in de afrekening die naar de andere ouder gaat.
  const nieuwBonIdRef = useRef(nieuwId())
  const nieuwKostIdRef = useRef(nieuwId())
  const nieuwGarantieIdRef = useRef(nieuwId())
  const [kassaRegels, setKassaRegels] = useState<KassaRegel[]>(() => [nieuweKassaRegel()])
  const zoekRefs = useRef<Record<string, HTMLInputElement | null>>({})
  // Welke van de twee opslaanknoppen ingedrukt werd. Een klik komt altijd vóór de
  // verzending van het formulier, dus dit staat juist op het moment dat we het lezen.
  const blijfOpen = useRef(false)

  // --- De optionele velden (achter "Meer opties") ---
  const [meerOpen, setMeerOpen] = useState(false)
  const [bonData, setBonData] = useState('')
  const [bonNaam, setBonNaam] = useState('')
  const [bonFout, setBonFout] = useState('')
  // Heeft de gebruiker de bon in DIT venster zelf weggehaald? Zonder deze vlag zou
  // een leeg bonveld ook "weghalen" betekenen wanneer het gewoon nooit gevuld was —
  // en dan wist het opslaan een bon die intussen van een ánder toestel binnenkwam.
  const bonVerwijderd = useRef(false)
  const [bezigBon, setBezigBon] = useState(false)
  const [dossierId, setDossierId] = useState('')
  const [kostenType, setKostenType] = useState<Kostentype>('gewoon')
  // Een garantiebewijs bij deze aankoop. Standaard 24 maanden: dat is de wettelijke
  // minimumgarantie op een nieuw product voor een consument in België.
  const [garantieAan, setGarantieAan] = useState(false)
  const [garantieMaanden, setGarantieMaanden] = useState('24')
  // Zelfde vlag als `bonVerwijderd` hierboven, en om dezelfde reden. Zie
  // `bewaarGarantiekoppeling`.
  const garantieVerwijderd = useRef(false)

  // Een kost die al in een afrekening zit, raken we niet meer aan: het bedrag
  // ervan staat in een afrekening die je misschien al doorgestuurd hebt. Ze stil
  // meeveranderen omdat je hier een typfout in de omschrijving verbetert, zou die
  // afrekening achteraf laten kloppen met iets anders dan wat je verstuurd hebt.
  const kostVastgeklikt = Boolean(gekoppeldeKost?.verrekeningId || gekoppeldeKost?.afgerekend)

  // ---------------------------------------------------------------------------
  // De twee effecten hieronder vullen het formulier ÉÉN keer, en daarna nooit meer
  // ongevraagd. Dat is de kern van deze reparatie (ronde 35).
  //
  // Wat er misging. Ze keken naar de vóórwerpen zelf: `bewerken`, `categorieen`,
  // `bon`, `gekoppeldeKost`. De app maakt die bij élke herlaadbeurt opnieuw aan —
  // met exact dezelfde inhoud, maar als nieuw voorwerp. En herladen gebeurt niet
  // alleen na een opslag: de stille synchronisatie met Drive loopt elke 45
  // seconden. Stond je op dat moment te typen, dan liep dit effect opnieuw en
  // veegde het je invoer weg. Bij het bewerken was het nog erger: het veld sprong
  // terug naar het opgeslagen bedrag, en "Wijzigen" bewaarde daarna stil de oude
  // waarde. Je zag niet dat je wijziging verdampt was.
  //
  // Nu kijken ze naar de ID's. Die veranderen alleen wanneer je écht een ander
  // record opent — precies het moment waarop het formulier opnieuw gevuld hoort te
  // worden. Een achtergrondsync raakt je invoer niet meer aan.
  // ---------------------------------------------------------------------------
  const bewerkenRef = useRef(bewerken)
  bewerkenRef.current = bewerken
  const categorieenRef = useRef(categorieen)
  categorieenRef.current = categorieen
  const bonRef = useRef(bon)
  bonRef.current = bon
  const kostRef = useRef(gekoppeldeKost)
  kostRef.current = gekoppeldeKost
  const garantieRef = useRef(gekoppeldeGarantie)
  garantieRef.current = gekoppeldeGarantie

  useEffect(() => {
    const bewerken = bewerkenRef.current
    const categorieen = categorieenRef.current
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
    // Bewust alleen het ID: zie de uitleg hierboven.
  }, [bewerken?.id])

  // De optionele velden staan in een aparte useEffect omdat ze uit andere bronnen
  // komen (de gekoppelde kost en het bondocument). Bewerk je een transactie waar al
  // iets van dit alles aan hangt, dan klapt het blok meteen open: anders zou je een
  // bon of een dossierkoppeling niet zien en hem bij het bewaren stil verliezen.
  useEffect(() => {
    const bewerken = bewerkenRef.current
    const bon = bonRef.current
    const gekoppeldeKost = kostRef.current
    const garantie = garantieRef.current
    const heeftBon = Boolean(bon)
    const heeftKost = Boolean(gekoppeldeKost)
    const heeftGarantie = Boolean(garantie)
    setBonData(bon?.bestand ?? '')
    setBonNaam(bon?.bestandsnaam ?? '')
    setBonFout('')
    bonVerwijderd.current = false
    setDossierId(gekoppeldeKost?.dossierId ?? '')
    setKostenType(gekoppeldeKost?.kostenType ?? 'gewoon')
    setGarantieAan(heeftGarantie)
    setGarantieMaanden(garantie ? String(garantie.garantieMaanden) : '24')
    garantieVerwijderd.current = false
    const heeftPersonen = (bewerken?.persoonIds?.length ?? 0) > 0
    setMeerOpen(Boolean(bewerken) && (heeftBon || heeftKost || heeftGarantie || heeftPersonen))
    // Bewust ALLEEN de transactie, en niet ook de id's van de bon en de gedeelde
    // kost (ronde 35).
    //
    // Die twee veranderen namelijk MIDDEN in het bewaren: `verzend()` schrijft
    // eerst de transactie weg, dan de bon, dan de dossierkoppeling. Zodra de bon
    // bewaard of verwijderd was, kreeg dit effect een nieuw id en liep het opnieuw
    // — en zette het je dossierkeuze terug op leeg, klapte "Meer opties" dicht en
    // zette het kostentype terug op 'gewoon'.
    //
    // Bij een geslaagde opslag zag je dat niet. Maar mislukte de laatste stap, dan
    // zei de app "je invoer staat er nog" terwijl je dossierkeuze intussen wég was.
    // Duwde je dan opnieuw op Wijzigen, zoals de melding vraagt, dan werd de
    // gedeelde kost helemaal niet meer aangemaakt — het venster sloot netjes en er
    // stond nergens iets over. In de Dossiers-module, waar die kost later in de
    // afrekening met de andere ouder meetelt, is dat het slechtst denkbare gedrag.
    //
    // Deze waarden horen bij ÉÉN record, dus één keer instellen per record is juist.
  }, [bewerken?.id])

  const teken = soort === 'uitgave' ? -1 : 1

  const bedragCenten = invoerNaarCenten(bedrag)
  const totaalCenten = Number.isFinite(bedragCenten) && bedragCenten > 0 ? bedragCenten : 0

  // De teller telt precies die regels die straks ook écht bewaard worden — dus
  // met een bedrag én met een omschrijving of een categorie. Zie `verzend()`,
  // waar exact dezelfde filter staat.
  //
  // Dat liep uit elkaar: een regel met alleen een bedrag telde wél mee in de
  // teller, maar werd niet bewaard. Vulde je op een ticket van € 50 een regel van
  // € 40 in en tikte je in de lege regel eronder alvast € 20, dan zei de app "de
  // regels verdelen meer dan het totaalbedrag" en weigerde ze op te slaan — terwijl
  // wat ze zou bewaren (€ 40 van € 50) perfect paste. Je zat vast op een melding
  // over iets wat de app zelf niet ging opslaan.
  const bewaardeRegels = kassaRegels.filter((r) => r.omschrijving.trim() || r.categorieId)
  const verdeeld = bewaardeRegels.reduce((s, r) => {
    const c = invoerNaarCenten(r.bedrag)
    return Number.isFinite(c) && c > 0 ? s + c : s
  }, 0)
  const verschil = totaalCenten - verdeeld

  // Waarom de opslaanknop uit staat, als tekst waar de knop naar kan verwijzen.
  const redenId = useId()
  // Verdelen de regels van een kassaticket MEER dan het totaal, dan is er iets
  // fout getikt. Zonder deze voorwaarde werd dat verschil een tegenboeking met een
  // omgekeerd teken — een uitgave van € 50 met regels van € 40 en € 20 leverde
  // € 60 uitgaven én € 10 inkomsten op. Zie de uitleg in utils/transactie.ts.
  const teveelVerdeeld = gesplitst && verdeeld > totaalCenten
  // Een garantiebewijs met een onmogelijke duur bewaren we niet stil met 24: dan
  // staat er straks een vervaldatum die je nooit bedoeld hebt.
  const garantieMaandenGeldig = !garantieAan || leesMaanden(garantieMaanden) !== null
  const geldig =
    omschrijving.trim().length > 0 &&
    Number.isFinite(bedragCenten) &&
    bedragCenten > 0 &&
    rekeningId.length > 0 &&
    !teveelVerdeeld &&
    garantieMaandenGeldig

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
    // ⚠ WELKE KNOP ER GEDUWD IS, LEZEN WE HIER — niet in een `onClick` op de knop.
    //
    // De vlag "blijf open na opslaan" hoort bij DEZE poging. Zat ze in een `onClick`,
    // dan bleef ze hangen zodra de verzending daarna niet doorging: de klik gebeurt
    // namelijk vóór het verzenden. Tikte je op "Opslaan + volgende" terwijl het
    // formulier nog niet klopte — of terwijl er nog een nieuwe categorie openstond,
    // want die houdt het verzenden tegen — dan bleef de popup daarna óók open wanneer
    // je later gewoon op "Toevoegen" duwde. Je zag een leeg formulier, dacht dat het
    // niet gelukt was, en boekte alles een tweede keer.
    //
    // `submitter` zegt welke knop de verzending in gang zette. Zo hoort de vlag bij de
    // poging en niet bij de klik, en kan ze niet blijven staan.
    const knop = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
    blijfOpen.current = knop?.dataset.blijfOpen === '1'
    if (!geldig) return
    // Twee keer tikken mag nooit twee boekingen maken. Op een telefoon duurt het
    // bewaren merkbaar lang (schrijven én alle lijsten opnieuw laden), en zonder
    // deze grendel draaide een tweede tik de hele functie nog eens — mét een nieuw
    // id, dus mét een tweede transactie in je overzicht.
    // Hier wordt `blijfOpen` BEWUST niet gewist: de opslag die al loopt, leest die
    // vlag straks nog en die hoort bij de knop waarop je het eerst duwde.
    if (bezigRef.current) return
    bezigRef.current = true
    setBezig(true)
    setOpslaanFout('')

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
        id: bewerken ? bewerken.id : nieuwIdRef.current,
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(regels.length > 0 ? { regels } : {}),
        ...(persoonIds.length > 0 ? { persoonIds } : {}),
        ...invoertijdstip(bewerken),
        // Een gesplitst kassaticket is nooit een vaste last.
        ...bewaardVeld(bewerken, false),
      }
    } else {
      t = {
        id: bewerken ? bewerken.id : nieuwIdRef.current,
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: teken * bedragCenten,
        rekeningId,
        ...(categorieId ? { categorieId } : {}),
        ...(persoonIds.length > 0 ? { persoonIds } : {}),
        ...invoertijdstip(bewerken),
        ...bewaardVeld(bewerken, teken < 0),
      }
    }

    try {
      await onOpslaan(t)
      onthoudRekening(rekeningId)

      // De bon en de dossierkoppeling worden PAS NA de transactie bewaard: ze
      // wijzen met een id naar de transactie, en dat id mag niet bestaan in een
      // record dat naar iets verwijst wat er niet is.
      await bewaarBon(t.id)
      await bewaarDossierkoppeling(t)
      await bewaarGarantiekoppeling(t)
    } catch (fout) {
      // Mislukt het bewaren (opslag vol, privémodus, database geweigerd), dan mag
      // dat nooit stil gebeuren: je zou denken dat je te zacht getikt hebt en het
      // opnieuw proberen, of de popup sluiten en je invoer kwijt zijn. Het
      // formulier blijft staan zoals het is, met de reden erbij.
      setOpslaanFout(fout instanceof Error ? fout.message : String(fout))
      bezigRef.current = false
      setBezig(false)
      return
    }

    bezigRef.current = false
    setBezig(false)

    if (!bewerken) {
      // Klaar voor de volgende boeking (bv. na "Opslaan + volgende").
      nieuwIdRef.current = nieuwId()
      nieuwBonIdRef.current = nieuwId()
      nieuwKostIdRef.current = nieuwId()
      nieuwGarantieIdRef.current = nieuwId()
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
      bonVerwijderd.current = false
      setDossierId('')
      setKostenType('gewoon')
      setGarantieAan(false)
      setGarantieMaanden('24')
      garantieVerwijderd.current = false
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
      // Alleen weghalen wanneer je hem ZELF hebt weggehaald.
      //
      // Vroeger stond hier "geen bon in het veld, maar wel een bewaarde bon? dan
      // weg ermee". Dat gaat mis met twee toestellen: hing er bij het openen geen
      // bon aan en kwam er tijdens het invullen een binnen via de synchronisatie,
      // dan wiste het opslaan die net ontvangen bon — zonder één woord.
      if (bon && bonVerwijderd.current) await onBon(null)
      return
    }
    if (bon && bon.bestand === bonData) return
    await onBon({
      id: bon ? bon.id : nieuwBonIdRef.current,
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
    // Van de BESTAANDE kost vertrekken en alleen overschrijven wat deze boeking
    // bepaalt. Stond hier een witte lijst van velden, dan wiste elke bewerking van
    // de transactie alles wat dit formulier niet kent: een eigen verdeelpercentage,
    // een bon, en sinds ronde 44 ook het antwoord van de andere ouder. Je zou dan
    // een betwisting kwijtraken door een typfout in de omschrijving te verbeteren.
    const kost: GedeeldeKost = {
      ...(gekoppeldeKost ?? {}),
      id: gekoppeldeKost ? gekoppeldeKost.id : nieuwKostIdRef.current,
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
    }
    if (persoonIds.length > 0) kost.kindIds = persoonIds
    else delete kost.kindIds
    if (categorieId) kost.categorieId = categorieId
    else delete kost.categorieId
    await onDossierKost(kost)
  }

  // Maakt of verwijdert het garantiebewijs dat bij deze aankoop hoort.
  //
  // Bij een NIEUW bewijs vullen we product, datum en prijs uit de boeking: dat is
  // precies waarom de brug bestaat — je hoeft niets over te tikken. Bij een BESTAAND
  // bewijs raken we alleen het aantal maanden aan. Reden: dat bewijs kan ondertussen
  // op de Garanties-pagina bijgewerkt zijn (een preciezere productnaam, de winkel,
  // een notitie), en dat mag een correctie aan de omschrijving van je boeking niet
  // stil overschrijven.
  async function bewaarGarantiekoppeling(tx: Transactie) {
    if (!onGarantie) return
    const geldigeMaanden = leesMaanden(garantieMaanden) ?? 24

    // Een uitgave die je omboekt naar een inkomst: dan hoort er geen
    // garantiebewijs meer bij deze boeking. Maar het bewijs zelf gooien we NIET
    // weg — het kan op de Garanties-pagina aangevuld zijn met de winkel, een
    // notitie en een foto, en die verlies je hier onherroepelijk. Alleen de
    // verwijzing naar deze boeking gaat eraf.
    if (!garantieKanGekozenWorden) {
      if (gekoppeldeGarantie) {
        const zonderKoppeling = { ...gekoppeldeGarantie }
        delete zonderKoppeling.transactieId
        await onGarantie(zonderKoppeling)
      }
      return
    }

    if (!garantieAan) {
      // Alleen weghalen wanneer je het vinkje ZELF hebt uitgezet.
      //
      // Zonder deze vlag betekent een leeg vinkje ook "weghalen" wanneer het
      // gewoon nooit aangevinkt was — en dan wist het opslaan een garantiebewijs
      // dat intussen van een ánder toestel binnenkwam. Exact hetzelfde gat als bij
      // de bon, waar `bonVerwijderd` het in ronde 35 al dichtte.
      if (gekoppeldeGarantie && garantieVerwijderd.current) await onGarantie(null)
      return
    }

    if (gekoppeldeGarantie) {
      // Alleen het aantal maanden. Product, winkel, notitie en foto kunnen op de
      // Garanties-pagina verfijnd zijn, en een correctie aan de omschrijving van
      // je boeking mag dat niet stil overschrijven. Is er niets veranderd, dan
      // schrijven we ook niets weg: het logboek is append-only, dus dat zou bij
      // elke bewerking dezelfde regel nog eens toevoegen.
      if (
        gekoppeldeGarantie.garantieMaanden === geldigeMaanden &&
        gekoppeldeGarantie.transactieId === tx.id
      ) {
        return
      }
      await onGarantie({ ...gekoppeldeGarantie, garantieMaanden: geldigeMaanden, transactieId: tx.id })
      return
    }

    await onGarantie({
      id: nieuwGarantieIdRef.current,
      product: tx.omschrijving,
      aankoopdatum: tx.datum,
      garantieMaanden: geldigeMaanden,
      prijs: Math.abs(tx.bedrag),
      transactieId: tx.id,
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
  // Een inkomst koop je niet, dus dan verschijnt de garantiekeuze niet. Hangt er al
  // een bewijs aan en zet je de boeking om naar een inkomst, dan zeggen we dat
  // liever dan de koppeling stil weg te gooien.
  const garantieKanGekozenWorden = Boolean(onGarantie) && soort === 'uitgave'
  const toonGarantieBlok = Boolean(onGarantie) && (garantieKanGekozenWorden || Boolean(gekoppeldeGarantie))
  const toonMeer = heeftGezinsleden || Boolean(onBon) || toonDossierBlok || toonGarantieBlok
  // Hoeveel van de optionele velden ingevuld zijn. Zonder dit getal is een
  // dichtgeklapt blok een blinde vlek: je ziet niet dat er een bon aan hangt.
  const aantalIngevuld = [
    persoonIds.length > 0,
    Boolean(bonData),
    Boolean(dossierId),
    garantieAan && garantieKanGekozenWorden,
  ].filter(Boolean).length

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

      {/* `raak-label` (ronde 45): het vakje zelf is 13 px en dat is met een duim
          niet te treffen. Dezelfde klasse als overal elders in de app. */}
      <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
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
        <Kaart compact style={{ backgroundColor: 'var(--surface-2)' }}>
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
              <input
                // ⚠ Met het nummer erbij: dit veld staat er één per deelregel, en het
                // kruisje ernaast draagt dat nummer al.
                aria-label={t('Deelbedrag {n}', { n: i + 1 })}
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
              // "(nog −€ 10,00)" las niemand goed: een minteken vóór een bedrag na
              // het woord "nog" is dubbel ontkennend. Verdeel je te veel, dan staat
              // er nu gewoon wat er aan de hand is.
              <span className="bedrag" style={{ color: verschil < 0 ? 'var(--negative)' : 'var(--warn-tekst)' }}>
                {verschil < 0
                  ? t('({bedrag} te veel)', { bedrag: formatEuro(-verschil) })
                  : t('(nog {bedrag})', { bedrag: formatEuro(verschil) })}
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
                      <Bonknop bestand={bonData} naam={omschrijving || t('Bon')} />
                      <button
                        type="button"
                        className="knop knop-ghost knop-klein knop-gevaar"
                        onClick={() => {
                          bonVerwijderd.current = true
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
                  {/* `role="status"` en `role="alert"`: het verkleinen van een
                      grote foto duurt merkbaar lang, en "te groot" is de enige
                      terugkoppeling die je krijgt. Zonder deze rollen gebeurde er
                      voor wie de app laat voorlezen letterlijk niets. */}
                  {bezigBon && (
                    <span role="status" className="rij-meta">
                      {t('bezig…')}
                    </span>
                  )}
                  {bonFout && (
                    <span role="alert" className="rij-meta" style={{ color: 'var(--negative)' }}>
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

              {/* Een garantiebewijs bij deze aankoop (ronde 36).
                  Tot nu toe liep de brug maar één kant op: op de Garanties-pagina kon
                  je een boeking kiezen, en die koppeling werd wel bewaard maar nergens
                  getoond. Het moment waarop je aan garantie dénkt, is echter het moment
                  waarop je de aankoop inboekt. */}
              {toonGarantieBlok && (
                <div className="veldgroep">
                  {!garantieKanGekozenWorden ? (
                    <p className="leeg" style={{ padding: 0, textAlign: 'left' }}>
                      {t('Een inkomst heeft geen garantiebewijs. Bewaar je dit zo, dan blijft het bewijs bestaan bij je garanties, maar hangt het niet meer aan deze boeking.')}
                    </p>
                  ) : (
                    <>
                      {/* Alleen de korte zin staat in het label: een schermlezer leest
                          de volledige naam van een vinkje in één adem voor, en de
                          uitleg erbij maakt daar een alinea van. Die uitleg hangt er
                          via `aria-describedby` naast. */}
                      <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={garantieAan}
                          aria-describedby="tx-garantie-uitleg"
                          onChange={(e) => {
                            setGarantieAan(e.target.checked)
                            if (!e.target.checked) garantieVerwijderd.current = true
                          }}
                        />
                        <span className="rij-meta">{t('Garantiebewijs bijhouden')}</span>
                      </label>
                      <span className="rij-meta" id="tx-garantie-uitleg">
                        {t('Kompal maakt er een garantiebewijs bij met deze boeking als aankoopbewijs, en verwittigt je voor de garantie afloopt.')}
                      </span>
                      {garantieAan && (
                        <div className="veldgroep">
                          <label className="label-caps" htmlFor="tx-garantie">{t('Garantie (maanden)')}</label>
                          <input
                            id="tx-garantie"
                            inputMode="numeric"
                            style={{ width: 96 }}
                            value={garantieMaanden}
                            onChange={(e) => setGarantieMaanden(e.target.value)}
                          />
                          <span className="rij-meta">
                            {!garantieMaandenGeldig
                              ? t('Vul een aantal maanden in, bijvoorbeeld 24.')
                              : gekoppeldeGarantie
                                ? t('Dit bewijs bestaat al; je past hier alleen de garantieduur aan.')
                                : t('Wettelijk minimum op een nieuw product: 24 maanden.')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
                {rekeningLabel(r)}
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
          <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" name="soort" checked={soort === 'uitgave'} onChange={() => setEigenSoort('uitgave')} /> {t('Uitgave')}
          </label>
          <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" name="soort" checked={soort === 'inkomst'} onChange={() => setEigenSoort('inkomst')} /> {t('Inkomst')}
          </label>
        </div>
      )}

      {/* De knoppenbalk PLAKT onderaan (ronde 34, zie `.formulier-voet`).
          Waarom: in de popup op een telefoon staat het toetsenbord open zodra je
          in een veld tikt, en dan is er nog zo'n 380 px zichtbaar terwijl het
          formulier er ruim 700 telt. De opslaanknop stond daardoor altijd buiten
          beeld en je moest eerst terugscrollen om te bewaren. Nu blijft ze staan
          waar je hem verwacht, met de reden waarom hij eventueel uit staat erbij.

          Bewust `position: sticky` binnen het formulier en géén losse voet buiten
          de <form>: een knop met `type="submit"` moet in zijn eigen formulier
          staan, anders werkt Enter niet meer en moet er een `form`-koppeling
          bijkomen die op oudere browsers stilletjes faalt. */}
      <div className="formulier-voet">
        <div className="knoprij">
          {/* `aria-disabled` en niet `disabled`: een uitgeschakelde knop krijgt geen
              focus, dus wie met een toetsenbord of schermlezer werkt kwam de
              opslaanknop nooit tegen en hoorde ook nooit waaróm hij niet werkte.
              Nu is hij bereikbaar, is de reden eraan gekoppeld, en weigert
              `verzend` alsnog wanneer de invoer niet klopt. */}
          <button
            type="submit"
            className="knop knop-primair"
            aria-disabled={!geldig || bezig}
            aria-busy={bezig}
            aria-describedby={!geldig ? redenId : undefined}
          >
            {bezig ? t('Bewaren…') : bewerken ? t('Wijzigen') : t('Toevoegen')}
          </button>
          {onOpgeslagen && !bewerken && (
            <button
              type="submit"
              className="knop knop-ghost"
              aria-disabled={!geldig || bezig}
              aria-describedby={!geldig ? redenId : undefined}
              data-blijf-open="1"
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
        {opslaanFout !== '' && (
          <div role="alert" style={{ margin: 0 }}>
            {/* Boodschap eerst, techniek eronder. Een Engelse foutcode midden in een
                Nederlandse zin laat de lezer afhaken vóór hij bij het belangrijkste
                komt: dat zijn invoer er nog staat. */}
            <p style={{ margin: 0, color: 'var(--negative-ink)', fontSize: 'var(--tekst-s)', fontWeight: 600 }}>
              {/opslag|quota|storage/i.test(opslaanFout)
                ? t('De opslag van dit toestel zit vol. Verwijder een paar bonnetjes of foto’s en probeer opnieuw.')
                : t('Opslaan is niet gelukt. Je invoer staat er nog.')}
            </p>
            <p className="rij-meta" style={{ margin: '2px 0 0' }}>
              {t('Technische melding: {fout}', { fout: opslaanFout })}
            </p>
          </div>
        )}

        {!geldig && (
          <p id={redenId} role="status" className="leeg" style={{ padding: '4px 0 0', textAlign: 'left', margin: 0 }}>
            {rekeningen.length === 0
              ? t('Maak eerst een rekening aan — een boeking moet ergens op staan.')
              : teveelVerdeeld
                ? t('De regels verdelen meer dan het totaalbedrag. Pas een regel of het totaal aan.')
                : t('Geef een handelaar en een bedrag om op te slaan.')}
          </p>
        )}
      </div>

    </form>
  )
}
