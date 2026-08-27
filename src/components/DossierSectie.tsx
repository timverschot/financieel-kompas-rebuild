import { useEffect, useId, useRef, useState } from 'react'
import type {
  Categorie,
  Dossier,
  DossierDocument,
  GedeeldeKost,
  Kind,
  Kindrekening,
  Kindrekeningpost,
  Onderhoudsbetaling,
  Onderhoudsbijdrage,
  Verrekening,
} from '../data/schema'
import { DossierFormulier } from './DossierFormulier'
import { GedeeldeKostFormulier } from './GedeeldeKostFormulier'
import { KindrekeningSectie } from './KindrekeningSectie'
import { Documentkluis } from './DossierKluis'
import { UitwisselingKaart } from './UitwisselingKaart'
import { CategorieKiezer } from './CategorieKiezer'
import { Dialoog } from '../ui/Dialoog'
import { telVoorVerwijderen } from '../utils/dossierverwijdering'
import { afrekeningTitel, telAfrekeningVerwijderen } from '../utils/afrekeningverwijdering'
import {
  DOSSIER_ONDERDELEN,
  verborgenMetInhoud,
  volgendeVerborgenLijst,
  type DossierOnderdeel,
} from '../utils/dossieronderdelen'
import { saldoVerrekeningDossier, standaardWordtNogGebruikt } from '../utils/dossier'
import { exportFoutmelding } from '../utils/appVersie'
import { isOpenKost, kostenVoorAfrekening, type AfrekeningFilter } from '../utils/afrekening'
import { reactieVervallen } from '../utils/uitwisseling'
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
  voorbehoudNaBewerking,
} from '../utils/afrekeningTekst'
import { bouwAfrekeningOverzicht, type AfrekeningGroep } from '../utils/afrekeningOverzicht'
import { exporteerAfrekeningPDF } from '../utils/afrekeningPdf'
import { exporteerBewijsmapPDF } from '../utils/bewijsmapPdf'
import { bonVanKost, documentenVan, soortNaam } from '../utils/kluis'
import { OnderhoudsbijdrageSectie } from './OnderhoudsbijdrageSectie'
import { labelVanCategorie } from '../data/categorieen/resolve'
import { Bedrag, Kaart, Leeg } from '../ui/basis'
import { GezinsledenKiezer } from './GezinslidKiezer'
import { useT, type Vertaler } from '../i18n'
import { gesorteerdNieuwsteEerst } from '../utils/sorteer'
import { Bonknop } from '../ui/Bonknop'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import { formatEuro, leesPercentage } from '../utils/format'
import { dagJaar } from '../utils/datum'
import type { NieuweTak } from '../utils/categorietak'

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
  onderhoudsbijdragen,
  onderhoudsbetalingen,
  onOnderhoudsbijdrageOpslaan,
  onOnderhoudsbijdrageVerwijderen,
  onOnderhoudsbetalingOpslaan,
  onOnderhoudsbetalingVerwijderen,
  onDossierOpslaan,
  onDossierVerwijderen,
  onKostOpslaan,
  onKostenBewaren,
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
  onderhoudsbijdragen?: Onderhoudsbijdrage[]
  onderhoudsbetalingen?: Onderhoudsbetaling[]
  onOnderhoudsbijdrageOpslaan?: (b: Onderhoudsbijdrage) => Promise<void> | void
  onOnderhoudsbijdrageVerwijderen?: (id: string) => Promise<void> | void
  onOnderhoudsbetalingOpslaan?: (b: Onderhoudsbetaling) => Promise<void> | void
  onOnderhoudsbetalingVerwijderen?: (id: string) => Promise<void> | void
  onDossierOpslaan: (d: Dossier) => Promise<void> | void
  onDossierVerwijderen: (id: string) => Promise<void> | void
  onKostOpslaan: (k: GedeeldeKost) => Promise<void> | void
  /** Schrijft een reeks kosten in ÉÉN blok weg (alles of niets). Nodig voor de
   *  uitwisseling met de andere ouder: een half ingelezen bestand mag niet
   *  bestaan. Optioneel, zodat bestaande tests van dit scherm ongewijzigd
   *  blijven; zonder deze prop verschijnt de uitwisselkaart gewoon niet. */
  onKostenBewaren?: (kosten: GedeeldeKost[]) => Promise<void>
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
  onNieuweSubcategorie?: (plan: NieuweTak) => Promise<string>
  /**
   * Welk dossier meteen open moet staan (ronde 40). Klik je in de transactielijst
   * op de badge "gedeeld", dan hoor je in dát dossier te landen en niet in het
   * eerste uit de lijst. Alleen de BEGINstand: wissel je daarna zelf, dan blijft
   * jouw keuze staan.
   */
  beginDossierId?: string | null
}) {
  const { t } = useT()
  // Eén poging voor dit dossierscherm (ronde 68). ⚠ De chips hebben hun eigen,
  // fijnere melding (`chipFout`): die meldt alleen wanneer je tik écht verloren gaat
  // én je nog in hetzelfde dossier staat.
  const opslag = useOpslagpoging()
  // ⚠ Een EIGEN poging voor het verwijdervenster (tweede doorlichting ronde 68). Met
  // één gedeelde stonden er bij een mislukking twee `alert`-blokken tegelijk op het
  // scherm — één achter het venster en één erin, met verschillende tekst — en las
  // voorleessoftware het twee keer voor.
  const vensterOpslag = useOpslagpoging()
  // Welk dossier staat op het punt verwijderd te worden? (ronde 59)
  //
  // ⚠ WAAROM DIT ER MOET ZIJN. Het kruisje naast de keuzelijst wiste het HELE
  // dossier — alle gedeelde kosten, alle verrekeningen, de kindrekening met haar
  // posten, de onderhoudsbijdrage met al haar betalingen, én de volledige
  // documentkluis met elke scan en elke bon erin — zonder één vraag. De enige
  // redding was de ongedaan-balk (acht seconden toen, twintig sinds ronde 61). Ter
  // vergelijking: voor "Begin opnieuw" moet je het woord WISSEN intikken.
  //
  // En het stond naast een KEUZELIJST, waar je juist heen gaat om van dossier te
  // wisselen. Eén mistik op een telefoon en jaren bewijsmateriaal waren weg.
  const [teVerwijderen, setTeVerwijderen] = useState<Dossier | null>(null)
  // Ronde 65: hetzelfde vangnet voor een AFREKENING. Het kruisje ernaast wiste
  // haar zonder vraag en zonder ongedaan-balk, terwijl de opbouw erachter — welke
  // kosten, welke periode, welk aandeel — nergens anders bewaard is.
  // ⚠ Een ID en geen KOPIE van de afrekening. Er loopt elke drie kwartier een
  // stille sync; werd de afrekening intussen op een ander toestel als overgemaakt
  // gemarkeerd, dan zou een kopie iets anders beloven dan wat er straks gebeurt.
  // Verdwijnt ze helemaal, dan sluit het venster vanzelf in plaats van te blijven
  // staan met een knop die niets meer heeft om te verwijderen.
  const [afrekeningWegId, setAfrekeningWegId] = useState<string | null>(null)
  const afrekeningWeg = verrekeningen.find((v) => v.id === afrekeningWegId) ?? null
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

  // ⚠ RONDE 93 — om de chiprij open te zetten wanneer "Toon het" de focus naar een chip
  // erin stuurt. Zonder dat kan de focus in een dichtgeklapt blok verdwijnen.
  const keuzeblok = useRef<HTMLDetailsElement | null>(null)
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
    // ⚠ RONDE 68 — dit gaat over hoe het geld tussen jullie verdeeld wordt. Mislukte
    // het wegschrijven, dan gebeurde er zichtbaar niets en dacht je dat de knop kapot
    // was. Leegmaken pas na een geslaagde opslag.
    const gelukt = await opslag.probeer(() =>
      onDossierOpslaan({
        ...dossier,
        categorieAandelen: { ...(dossier.categorieAandelen ?? {}), [splitCat]: splitPctWaarde },
      }),
    )
    if (!gelukt) return
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
    // ⚠ Zonder melding leek deze knop kapot: er gebeurde zichtbaar niets.
    await opslag.probeer(() => onDossierOpslaan(bijgewerkt))
  }

  // Welke onderdelen zijn zichtbaar? We bewaren wat VERBORGEN is, dus een dossier
  // zonder dat veld toont gewoon alles — precies zoals vóór ronde 60.
  //
  // ⚠ ZOLANG ER EEN OPSLAG ONDERWEG IS, TOONT HET SCHERM WAT JE TIK BEDOELDE.
  // Elke tik schrijft het dossier weg en de app leest daarna opnieuw; tot dat rond
  // is, draagt het dossier hieronder nog de OUDE lijst. Zonder `bedoeling` springt de
  // chip pas ná de opslag terug — op een trage telefoon een zichtbare hapering — en
  // rekent een tweede tik vlak erna vanaf diezelfde oude lijst, waardoor de eerste
  // wijziging spoorloos verdwijnt. Dat laatste viel op doordat een test die zes chips
  // na elkaar aanklikte ongeveer één keer op de drie omviel.
  //
  // `null` betekent: niets onderweg, het dossier heeft gelijk. Belangrijk dat dit de
  // beginwaarde is én dat we er meteen naar terugvallen zodra de opslag klaar is —
  // anders loopt het scherm één hertekening achter op het dossier, en dat zie je bij
  // het wisselen van dossier als een flits met de kaarten van daarnet.
  const [bedoeling, setBedoeling] = useState<string[] | null>(null)
  // Wat er misging bij het laatste tikje op een chip (ronde 60). Leeg = niets aan de hand.
  const [chipFout, setChipFout] = useState('')
  const opgeslagenVerborgen = dossier?.verborgenOnderdelen ?? []
  // Dezelfde lijst, maar om mee te REKENEN: een ref is meteen bij, ook binnen
  // dezelfde tik, terwijl een toestand dat pas is na de hertekening.
  const verborgenRef = useRef<string[]>(opgeslagenVerborgen)
  const gezienDossier = useRef<string | undefined>(dossier?.id)
  // ⚠ De bedoeling geldt alleen voor het dossier waarin ze uitgesproken is. Het
  // opruimen bij een dossierwissel gebeurt in een effect, en dat loopt pas nádat het
  // beeld getekend is; wissel je van dossier terwijl er nog een opslag onderweg is,
  // dan zou er anders één beeldframe zijn waarin het nieuwe dossier de lijst van het
  // oude draagt.
  const verborgen = bedoeling !== null && gezienDossier.current === dossier?.id ? bedoeling : opgeslagenVerborgen
  const toont = (id: DossierOnderdeel) => !verborgen.includes(id)
  // Hoeveel opslagbeurten er op dit ogenblik onderweg zijn. Zolang dat er nul zijn,
  // is wat er in het dossier staat de waarheid — ook als die van een ÁNDER toestel
  // komt (ronde 60). Zonder deze teller hield het scherm zijn eigen lijst vast tot je
  // van dossier wisselde, en draaide de eerstvolgende tik de wijziging van dat
  // andere toestel gewoon terug.
  const opslagBezig = useRef(0)
  // Wat er op dit ogenblik ECHT in het dossier staat. Nodig omdat de waarde in een
  // opslagbeurt uit een oudere hertekening komt: tegen de tijd dat die klaar is, kan
  // het dossier al iets anders zeggen.
  const opgeslagenRef = useRef<string[]>(opgeslagenVerborgen)
  useEffect(() => {
    opgeslagenRef.current = dossier?.verborgenOnderdelen ?? []
  })
  // De chips zelf, om de focus na "Toon het" ergens zinnigs te laten landen.
  const chipKnoppen = useRef<Record<string, HTMLButtonElement | null>>({})
  // De id's van de regels die zeggen wat er nog ontbreekt. De knoppen wijzen ernaar
  // met `aria-describedby`, zodat wie erop landt de reden hoort (ronde 61).
  const splitRedenId = useId()
  const typeRedenId = useId()
  const afrekenRedenId = useId()
  useEffect(() => {
    const opgeslagen = dossier?.verborgenOnderdelen ?? []
    // Van dossier gewisseld: altijd overnemen. Wat het vorige dossier bedoelde, heeft
    // hier niets te zoeken.
    if (gezienDossier.current !== dossier?.id) {
      gezienDossier.current = dossier?.id
      verborgenRef.current = opgeslagen
      setBedoeling(null)
      setChipFout('')
      return
    }
    // Zelfde dossier, en niets meer onderweg: het dossier heeft gelijk.
    if (opslagBezig.current === 0) verborgenRef.current = opgeslagen
  }, [dossier?.id, dossier?.verborgenOnderdelen])

  // Een nieuw dossier bewaren en het meteen kiezen. Mislukt het bewaren, dan
  // wisselen we niet van dossier — anders stond je naar een leeg scherm te kijken
  // van iets dat niet bestaat.
  async function maakDossier(nieuwDossier: Dossier) {
    await onDossierOpslaan(nieuwDossier)
    setGeselecteerd(nieuwDossier.id)
  }

  async function zetOnderdeel(id: DossierOnderdeel, zichtbaar: boolean) {
    if (!dossier) return
    const vanDossier = dossier.id
    const basis = verborgenRef.current
    // De rekensom staat in `utils/dossieronderdelen.ts`, zodat een test ze los kan
    // narekenen. Ze ontdubbelt ook: twee tikken vlak na elkaar op dezelfde chip
    // schreven de sleutel anders twee keer weg, en de tweede tik deed dan het
    // omgekeerde van wat je bedoelde (ronde 60).
    const nieuw = volgendeVerborgenLijst(basis, id, zichtbaar)
    verborgenRef.current = nieuw
    // Meteen tonen, niet pas na de opslag: een chip die een halve seconde blijft
    // staan waar hij stond, laat je twijfelen of je tik wel aankwam.
    setBedoeling(nieuw)
    setChipFout('')
    const bijgewerkt: Dossier = { ...dossier }
    // Niets verborgen? Dan halen we het veld helemaal weg in plaats van een lege
    // lijst weg te schrijven. Zo blijft een dossier dat nooit iets verborg exact
    // hetzelfde record als voorheen.
    if (nieuw.length > 0) bijgewerkt.verborgenOnderdelen = nieuw
    else delete bijgewerkt.verborgenOnderdelen
    opslagBezig.current += 1
    try {
      await onDossierOpslaan(bijgewerkt)
    } catch {
      // We laten de fout hier NIET door. Niemand vangt hem verderop, en dan blijft er
      // enkel een rode regel in de ontwikkelaarsconsole over — die de gebruiker nooit
      // ziet. Hij hoort op het scherm te staan, naast de chip die terugsprong.
      //
      // ⚠ Alleen wanneer deze tik ook écht verloren gaat. Kwam er ná deze tik nog een
      // andere, dan draagt die de wijziging al mee en is er niets kwijt — de melding
      // zou je dan aanzetten om nóg eens te tikken en juist iets om te zetten dat
      // goed stond. En ze hoort bij het dossier waarin je tikte: ben je intussen naar
      // een ander dossier gewisseld, dan zou ze daar staan zonder dat je daar iets
      // gedaan hebt.
      if (verborgenRef.current === nieuw && gezienDossier.current === vanDossier) {
        setChipFout(t('Dat is niet bewaard — je scherm staat weer zoals het was.'))
      }
    } finally {
      opslagBezig.current -= 1
      // Terug naar het dossier als bron van waarheid — geslaagd of niet, maar pas
      // wanneer er niets meer onderweg is. Zit er nog een tik in de wacht, dan houdt
      // die de bedoeling vast.
      //
      // ⚠ De lijst komt uit het DOSSIER en niet uit `basis` (nakijkronde ronde 60).
      // Mislukken er twee opslagbeurten na elkaar, dan is `basis` van de tweede tik
      // een lijst die nooit bewaard is; de eerstvolgende tik zou daar dan op
      // doorrekenen en iets wegschrijven dat op je scherm net aan stond.
      if (opslagBezig.current === 0) {
        verborgenRef.current = opgeslagenRef.current
        setBedoeling(null)
      }
    }
  }

  // Welk document legt de verdeling vast (ronde 52)?
  //
  // Alleen de documenten uit de kluis van DIT dossier komen in aanmerking: een
  // attest dat aan een lening of een garantie hangt, legt geen verdeling vast.
  const dossierDocumenten = dossier ? documentenVan(documenten, { soort: 'dossier', id: dossier.id }) : []
  // Een aangeduid document dat intussen verwijderd is, telt niet meer mee.
  //
  // Sinds ronde 54 ruimt het verwijderen zelf die verwijzing op, dus in de gewone
  // gang van zaken kan dit niet meer gebeuren. Deze opvang blijft toch staan, en
  // dat is geen dubbel werk: een ánder toestel kan een document geschrapt hebben
  // met een oudere versie van de app, en dat komt hier binnen via het logboek.
  // Data die van elders komt, wordt bij het TONEN gecontroleerd — nooit vertrouwd.
  const grondslagBestaat = dossierDocumenten.some((d) => d.id === dossier?.grondslagDocumentId)

  async function zetGrondslag(id: string) {
    if (!dossier) return
    const bijgewerkt: Dossier = { ...dossier }
    // Leeg? Dan halen we het veld helemaal weg in plaats van een lege string weg te
    // schrijven — zelfde keuze als bij `typeAandelen` en `verborgenOnderdelen`.
    if (id) bijgewerkt.grondslagDocumentId = id
    else delete bijgewerkt.grondslagDocumentId
    // ⚠ Mislukte dit, dan sprong de keuzelijst zonder een woord terug naar de oude
    // waarde — niet te onderscheiden van een misgetikte klik.
    await opslag.probeer(() => onDossierOpslaan(bijgewerkt))
  }

  async function verwijderSplit(catId: string) {
    if (!dossier || !dossier.categorieAandelen) return
    const nieuw = { ...dossier.categorieAandelen }
    delete nieuw[catId]
    await opslag.probeer(() => onDossierOpslaan({ ...dossier, categorieAandelen: nieuw }))
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
    } catch (e) {
      setBewijsmapFout(
        exportFoutmelding(t, e, t('De PDF van {datum} kon niet gemaakt worden. Probeer het opnieuw.', { datum: v.datum })),
      )
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
    } catch (e) {
      setBewijsmapFout(
        exportFoutmelding(t, e, t('De bewijsmap van {datum} kon niet gemaakt worden. Probeer het opnieuw.', { datum: v.datum })),
      )
    } finally {
      setBewijsmapBezig('')
    }
  }

  const alleKosten = dossier ? kosten.filter((k) => k.dossierId === dossier.id) : []
  const openKosten = alleKosten.filter(isOpenKost)
  const openSaldo = dossier ? saldoVerrekeningDossier(dossier, openKosten) : 0
  // RONDE 69. Een betwiste kost telt gewoon mee in "Te verrekenen" — dat is een
  // bewuste keuze (zie `afrekeningTekst.ts`: stil geld uit een saldo laten vallen
  // is erger dan het zichtbaar te houden). Maar de afrekening ZEGT dat er betwist
  // is, en dit scherm zei het niet. Dan staat er een bedrag dat er zeker uitziet
  // terwijl de andere ouder er net bezwaar tegen maakte.
  //
  // `reactieVervallen` hoort erbij: is de kost na het antwoord gewijzigd, dan sloeg
  // die betwisting op een ander bedrag en telt ze hier niet meer als bezwaar —
  // dezelfde regel die `afrekeningOverzicht` hanteert.
  const aantalBetwist = openKosten.filter((k) => k.reactie?.soort === 'betwist' && !reactieVervallen(k)).length

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
  // Hoogstens één bijdrage per dossier. Zijn er er meer (bv. na een import), dan
  // wint de eerste — beter één die klopt dan twee die elkaar tegenspreken.
  const bijdrage = dossier ? (onderhoudsbijdragen?.find((b) => b.dossierId === dossier.id) ?? null) : null
  const bijdrageBetalingen = bijdrage ? (onderhoudsbetalingen ?? []).filter((b) => b.bijdrageId === bijdrage.id) : []

  async function kostOpslaan(k: GedeeldeKost) {
    // ⚠ RONDE 68 — HIER MAG DE FOUT NIET OPGEVANGEN WORDEN. Het formulier hieronder
    // vangt zelf op en houdt dan je invoer vast; ving deze tussenstap hem al weg, dan
    // zag het formulier "gelukt", maakte het zichzelf leeg, en was je tekst tóch weg —
    // mét een melding erbij. Precies de fout die deze ronde moest uitroeien.
    await onKostOpslaan(k)
    setBewerkKost(null)
  }

  async function genereerNu() {
    if (!dossier || selectie.length === 0) return
    // ⚠ Dit maakt de momentopname die naar de andere ouder gaat. Mislukte ze in
    // stilte, dan dacht je dat de afrekening bestond en stuurde je niets door.
    await opslag.probeer(() => onGenereer(dossier, filter))
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
                    {/* ⚠ RONDE 107 — GEEN PERCENTAGE DAT NIET GEBRUIKT WORDT. Vul je beide
                        velden van "Verdeling per kostensoort" in, dan rekent de app daarmee
                        en niet meer met dit getal. */}
                    {d.naam} {standaardWordtNogGebruikt(d) ? t('(jij {p}%)', { p: d.aandeelJij }) : t('(verdeling per kostensoort)')}
                  </option>
                ))}
              </select>
              {dossier && (
                <button
                  type="button"
                  className="knop knop-kaal knop-gevaar"
                  aria-label={t('Verwijder dossier {naam}', { naam: dossier.naam })}
                  onClick={() => setTeVerwijderen(dossier)}
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
          /* ⚠ RONDE 93 — OPEN, MAAR WEG TE KLAPPEN. Gemeten in Chromium op een scherm van
             360 px: dit blok besloeg 459 px, met acht rijen chips, bovenaan élk dossier.
             Vijf kortere chipnamen brachten dat op 300 px (vijf rijen). Wie het daarna nog altijd
             te veel vindt, klapt het weg — dezelfde `<details open>` als op het Overzicht
             (ronde 90). ⚠ OPEN blijft de beginstand: dat is een beslissing van Timothy, niet
             van mij (zie DESIGN.md, "Dichtklappen mag, standaard dicht niet").

             ⚠ `data-geen-print`: een rij schakelaars zegt op papier niets. De printopmaak
             verbergt `.knop` maar met opzet niet `.chip`. */
          <details className="uitleg" ref={keuzeblok} data-onderdeelkeuze data-geen-print open>
            <summary id="dossier-onderdelen-kop">{t('Wat toon je in dit dossier?')}</summary>
            <div className="uitleg-inhoud">
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
                    ref={(el) => {
                      chipKnoppen.current[o.id] = el
                    }}
                    className={aan ? 'chip chip-actief' : 'chip'}
                    onClick={() => zetOnderdeel(o.id, !aan)}
                  >
                    {t(o.label)}
                  </button>
                )
              })}
            </div>
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Wat je uitzet, verdwijnt alleen uit beeld — er gaat niets verloren, en je zet het hier met één tik terug.')}
            </p>
            {/* `role="alert"` en niet `role="status"`: dit is een mislukking meteen ná
                iets wat je zelf deed, en dan mag een schermlezer het niet overslaan —
                dezelfde keuze als bij de veertien andere foutregels in de app. */}
            {chipFout !== '' && (
              <p className="foutregel" role="alert" style={{ margin: 0 }}>
                {chipFout}
              </p>
            )}
            </div>
          </details>
        )}

        {/* ⚠ RONDE 93 — DEZE TWEE STAAN BUITEN HET DICHTKLAPBARE BLOK, en dat is geen
            opmaakkeuze maar een correctie op mijn eigen eerste opzet (doorlichting).

            ⚠ RONDE 68 — de melding voor al het ándere op dit scherm: een verdeling bewaren
            of wissen, het grondslagdocument aanduiden, een gedeelde kost opslaan, een
            afrekening genereren, een afrekening als overgemaakt markeren. Die deden tot ronde
            68 allemaal zichtbaar niets wanneer het wegschrijven mislukte, en het gaat hier
            over geld dat tussen twee ouders verdeeld wordt. Al die knoppen staan honderden
            regels ONDER de chiprij. Stond deze melding erin, dan zou wie het blok één keer
            wegklapt op "Genereer afrekening" duwen, niets zien gebeuren, en nergens lezen
            waarom — en een schermlezer leest een `role="alert"` in een dicht `<details>`
            helemaal niet voor, want die inhoud staat niet in de toegankelijkheidsboom.

            ⚠ `chipFout` hierboven mag wél binnen blijven: die kan alleen ontstaan door een
            tik op een chip, en dan staat het blok per definitie open. */}
        {dossier && <Opslagfout fout={opslag.fout} zin={t('Dat is niet gelukt. Er is niets veranderd.')} />}

        {/* ⚠ Een uitgezet onderdeel waar tóch iets in staat (ronde 60). Dat kan
            echt gebeuren: de rekenhulp "Indexatie" bewaart een onderhoudsbijdrage
            rechtstreeks in een dossier. Zonder deze regel zou je die gegevens
            nergens meer zien, zonder dat iets je dat vertelt.

            Bewust GEEN `role="alert"` of `role="status"`: deze regel staat er al
            zodra je het dossier opent, ze is geen antwoord op een handeling. Een
            schermlezer die je bij elke dossierwissel onderbreekt om iets voor te
            lezen dat gewoon in de leesvolgorde staat, is luider dan nuttig. De
            melding hieronder over een MISLUKTE opslag is dat wél, en draagt
            daarom `role="alert"`. */}
        {dossier &&
          verborgenMetInhoud(dossier.id, verborgen, {
          verrekeningen,
          kindrekeningen,
          onderhoudsbijdragen,
          documenten: dossierDocumenten,
            categorieAandelen: dossier.categorieAandelen,
            typeAandelen: dossier.typeAandelen,
            kosten,
          }).map((id) => {
            const naam = t(DOSSIER_ONDERDELEN.find((o) => o.id === id)?.label ?? id)
            return (
              <p key={id} className="foutregel" style={{ margin: 0 }}>
              {t('{onderdeel} staat uit, maar er staat wel iets in.', { onderdeel: naam })}{' '}
              {/* De knop draagt de naam van het onderdeel, niet alleen "Toon het":
                  staan er twee van deze regels, dan hoor je anders twee keer
                  exact hetzelfde en weet je niet welke bij welke hoort. En na de
                  klik verdwijnt de regel — mét de knop erin — dus zetten we de
                  focus op de chip van datzelfde onderdeel in plaats van hem naar
                  het begin van de pagina te laten terugvallen. */}
                <button
                  type="button"
                  className="knop knop-ghost knop-klein"
                  aria-label={t('Toon {onderdeel}', { onderdeel: naam })}
                  onClick={() => {
                    // ⚠ RONDE 93 — eerst het blok openzetten. Sinds deze ronde kan de
                    // chiprij dichtgeklapt staan, en dan zou de focus naar een chip gaan
                    // die niemand ziet: de focus verdwijnt dan in het niets.
                    if (keuzeblok.current) keuzeblok.current.open = true
                    chipKnoppen.current[id]?.focus()
                    void zetOnderdeel(id, true)
                  }}
                >
                  {t('Toon het')}
                </button>
              </p>
            )
          })}


        {/* Een nieuw dossier wordt meteen het gekozen dossier (ronde 60). Vóór die
            ronde bleef de keuzelijst op het vorige dossier staan: je maakte "Dossier
            Emma" aan, en de chips en kaarten eronder gingen nog altijd over het
            dossier daarvoor. Wie dan een onderdeel aanzette, zette het bij het
            verkeerde dossier aan. */}
        <DossierFormulier onOpslaan={maakDossier} />
      </Kaart>

      {dossier && (
        <div className="stapel">
          {/* Waarop steunt de verdeling? (ronde 52)
              Deze kaart verschijnt alleen wanneer er iets te kiezen valt — staat er
              nog geen document in de kluis, dan zou een lege keuzelijst enkel
              meescrollen. De bewijsmap zegt dan zélf dat er niets aangeduid is, en
              hoe je dat oplost; dat is de plek waar je het mist.

              Ze hangt aan `documentkluis` en niet aan een eigen chip: haar bijschrift
              en haar foutregel verwijzen allebei naar die kluis, en wie die kaart
              uitzet zou hier een verwijzing houden naar iets wat op zijn scherm niet
              meer bestaat. */}
          {toont('documentkluis') && (dossierDocumenten.length > 0 || dossier.grondslagDocumentId) && (
            <Kaart
              titel={t('Waarop steunt deze verdeling?')}
              bijschrift={t('Duid de overeenkomst of het vonnis aan waarin de verdeling staat. De bewijsmap verwijst er dan bij elke afspraak naar, met het bijlagenummer erbij.')}
            >
              <label className="veldgroep">
                <span className="label-caps">{t('Document')}</span>
                <select
                  value={grondslagBestaat ? (dossier.grondslagDocumentId ?? '') : ''}
                  onChange={(e) => zetGrondslag(e.target.value)}
                >
                  <option value="">{t('Geen document aangeduid')}</option>
                  {dossierDocumenten.map((d) => (
                    <option key={d.id} value={d.id}>
                      {`${soortNaam(t, d.soort)}: ${d.naam}`}
                    </option>
                  ))}
                </select>
              </label>
              {/* Het aangeduide document is verdwenen uit de kluis. Stil terugvallen
                  op "geen" zou de indruk wekken dat je nooit iets koos. */}
              {dossier.grondslagDocumentId && !grondslagBestaat && (
                <p className="statusregel" role="status" style={{ margin: 0 }} data-grondslag-weg>
                  {t('Het document dat je hier had aangeduid, staat niet meer in de kluis van dit dossier. Kies er een ander, of voeg het opnieuw toe.')}
                </p>
              )}
              <p className="rij-meta" style={{ margin: 0 }}>
                {t('De app leest dit document niet en controleert de inhoud ervan niet; ze noemt het alleen als de afspraak die jij aanduidde.')}
              </p>
            </Kaart>
          )}

          {/* Verdeling per categorie */}
          {toont('verdeling-categorie') && (
          <Kaart
            titel={t('Verdeling per categorie')}
            bijschrift={
              standaardWordtNogGebruikt(dossier)
                ? t('Standaard draag jij {p}%. Stel hier per categorie een afwijkend percentage in.', { p: dossier.aandeelJij })
                : t('Je verdeling per kostensoort geldt voor élke kost, dus de standaard van dit dossier wordt niet meer gebruikt. Stel hier per categorie een afwijkend percentage in.')
            }
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
            {/* ⚠ RONDE 101 — `flexWrap`, GEMETEN IN EEN ECHTE BROWSER. Zonder afbreken kregen
                de drie kinderen van deze rij op een scherm van 320 px respectievelijk 34, 76
                en 116 pixels: de categoriekiezer werd 34 px breed en toonde "Sel / hoo /
                (op". Op 360 px was hij 74 px. Je kon hier dus feitelijk geen categorie
                kiezen op een telefoon. Met afbreken neemt de kiezer de volle breedte en
                zakken het percentage en de knop eronder. */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
                <CategorieKiezer
                  waarde={splitCat || undefined}
                  onKies={(id) => setSplitCat(id ?? '')}
                  gebruikerCategorieen={categorieen}
                  naamToevoeging={t('(verdeling per categorie)')}
                />
              </div>
              <input aria-label={t('Percentage jij')} style={{ width: 76 }} inputMode="decimal" placeholder="%" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} />
              <button
                type="button"
                className="knop knop-secundair"
                onClick={voegSplitToe}
                aria-disabled={!splitGeldig}
                aria-describedby={splitGeldig ? undefined : splitRedenId}
              >
                {t('Toevoegen')}
              </button>
            </div>
            {/* ⚠ Altijd aanwezig, leeg wanneer er niets te melden is (ronde 61): een
                `role="status"` die pas MÉT zijn tekst verschijnt, wordt door sommige
                schermlezers overgeslagen, en de knop hierboven wijst ernaar. */}
            <p id={splitRedenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
              {splitGeldig
                ? ''
                : !splitCat
                  ? t('Kies eerst een categorie en geef een percentage van 0 tot 100.')
                  : t('Geef een percentage van 0 tot 100 om deze verdeling toe te voegen.')}
            </p>
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
              <button
                type="button"
                className="knop knop-secundair"
                onClick={bewaarTypeAandelen}
                aria-disabled={!typeGeldig}
                aria-describedby={typeGeldig ? undefined : typeRedenId}
              >
                {t('Bewaar verdeling per kostensoort')}
              </button>
            </div>
            <p id={typeRedenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
              {typeGeldig ? '' : t('Geef een percentage van 0 tot 100, of laat het veld leeg.')}
            </p>
          </Kaart>
          )}

          {/* Open kosten */}
          <Kaart>
            {openKosten.length > 0 && (
              <ul className="lijst">
                {openKosten.map((k) => (
                  <li key={k.id} className="rij">
                    <span className="rij-midden">
                      <span className="rij-titel">
                        {k.omschrijving}
                        {/* RONDE 69. Het cijfer "Te verrekenen" zegt eronder dát er een
                            kost betwist is; zonder merkteken op de rij wist je niet
                            WELKE. Dezelfde regel als in `afrekeningOverzicht`: een
                            reactie op een bedrag dat nadien gewijzigd is, telt niet. */}
                        {k.reactie?.soort === 'betwist' && !reactieVervallen(k) ? (
                          <>
                            {' '}
                            <span className="badge badge-laat">{t('betwist')}</span>
                          </>
                        ) : null}
                      </span>
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
                      <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder kost {naam}', { naam: k.omschrijving })} onClick={() => void opslag.probeer(() => onKostVerwijderen(k.id))}>
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* ⚠ RONDE 66. Dit bedrag heette hier "Openstaand" en in de PDF én de
                klembordtekst "Te verrekenen" — hetzelfde getal, twee namen. En
                "Openstaand" is op Je situatie de naam van het blok met je
                kredietkaarten en leningen, en op een rekeningdetail het bedrag dat
                je nog moet afbetalen. Drie dingen, één woord. */}
            {/* ⚠ RONDE 66, slotronde — GEEN OORDEEL OVER NUL KOSTEN. Bij een vers
                dossier stond hier meteen "Niets te verrekenen", en dat leest als
                "jullie staan quitte" terwijl er nog nooit iets ingegeven is. Dezelfde
                valse geruststelling die `BalansRegel` bij nul boekingen afvangt en die
                ronde 65 uit de maandafsluiting gehaald heeft. Het formulier staat er
                direct onder, dus een knop is hier niet nodig. */}
            {openKosten.length === 0 ? (
              <Leeg>
                {t('Nog geen kosten in dit dossier. Voeg er hieronder een toe; zodra er kosten staan, rekent de app uit wie wie wat verschuldigd is.')}
              </Leeg>
            ) : (
              <div className="stat">
                <span className="label-caps">{t('Te verrekenen')}</span>
                <span className="stat-waarde" style={{ fontFamily: 'var(--font-body)' }}>
                  {verrekenTekst(t, openSaldo)}
                </span>
                <span className="getal-bron">
                  {t('Alle kosten in dit dossier die nog niet afgerekend zijn, ongeacht de periode. Wat ingetrokken is telt niet mee; wat al in een afrekening staat die je nog niet als overgemaakt aanvinkte, telt hier nog wel mee.')}
                  {aantalBetwist > 0
                    ? ' ' +
                      (aantalBetwist === 1
                        ? t('Eén ervan is betwist door de andere ouder en telt hier toch mee.')
                        : t('{n} ervan zijn betwist door de andere ouder en tellen hier toch mee.', { n: aantalBetwist }))
                    : ''}
                </span>
              </div>
            )}

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
              naamToevoeging={t('(afrekening)')}
            />
            {/* Enkel zinvol zodra je écht op kinderen filtert: anders zitten alle
                kosten er sowieso in. */}
            {afrKindIds.length > 0 && (
              <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
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
              <button
                type="button"
                className="knop knop-secundair"
                onClick={genereerNu}
                aria-disabled={selectie.length === 0}
                aria-describedby={selectie.length === 0 ? afrekenRedenId : undefined}
              >
                {t('Genereer afrekening')}
              </button>
            </div>
            {/* ⚠ Hier stond niets (ronde 61): de knop lag uit en er stond nergens
                waarom, en met een toetsenbord kwam je hem niet eens tegen. */}
            <p id={afrekenRedenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
              {selectie.length === 0 ? t('Er staat geen enkele open kost in deze selectie.') : ''}
            </p>
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
                          {/* ⚠ RONDE 66, slotronde — DE DATUM IN ELKE NAAM. Deze rij
                              staat er één per afrekening, dus met acht afrekeningen
                              hoorde je acht keer "PDF", acht keer "Kopieer" en acht keer
                              "Overgemaakt" zonder één verschil. De bewijsmapknop en het
                              kruisje in dezelfde rij deden dit al goed; deze vier waren
                              toen overgeslagen. */}
                          <input
                            type="checkbox"
                            className="tx-vinkje"
                            aria-label={t('Afrekening {datum} is overgemaakt', { datum: dagJaar(v.datum) })}
                            checked={!!v.overgemaakt}
                            // ⚠ RONDE 68 — mislukte dit, dan sprong het vinkje zonder
                            // een woord terug. Op een trage telefoon is dat niet te
                            // onderscheiden van een misgetikte klik: de kosten blijven
                            // open staan en komen in de volgende afrekening opnieuw mee.
                            onChange={(e) => {
                              const aan = e.target.checked
                              void opslag.probeer(() => onMarkeerOvergemaakt(v, aan))
                            }}
                          />{' '}
                          {t('Overgemaakt')}
                        </label>
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          aria-label={t('Kopieer de afrekening van {datum}', { datum: dagJaar(v.datum) })}
                          onClick={() => kopieerSamenvatting(v)}
                        >
                          {gekopieerd === v.id ? t('Gekopieerd ✓') : t('Kopieer')}
                        </button>
                        <button
                          type="button"
                          className="knop knop-ghost knop-klein"
                          aria-label={t('PDF van de afrekening van {datum}', { datum: dagJaar(v.datum) })}
                          onClick={() => exportPdf(v)}
                        >
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
                            aria-label={
                              opbouwVan === v.id
                                ? t('Verberg de opbouw van de afrekening van {datum}', { datum: dagJaar(v.datum) })
                                : t('Toon de opbouw van de afrekening van {datum}', { datum: dagJaar(v.datum) })
                            }
                            onClick={() => setOpbouwVan(opbouwVan === v.id ? '' : v.id)}
                          >
                            {opbouwVan === v.id ? t('Verberg de opbouw') : t('Toon de opbouw')}
                          </button>
                        )}
                        <button className="knop knop-kaal knop-gevaar" aria-label={t('Verwijder afrekening {datum}', { datum: dagJaar(v.datum) })} onClick={() => setAfrekeningWegId(v.id)}>
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

          {/* De onderhoudsbijdrage: het vaste maandbedrag uit het vonnis, met de
              jaarlijkse indexatie. Staat bewust vóór de gezamenlijke pot: het is de
              afspraak waar alles op rust, de pot is een manier om ze uit te voeren. */}
          {toont('onderhoudsbijdrage') && onOnderhoudsbijdrageOpslaan && onOnderhoudsbijdrageVerwijderen && (
            <OnderhoudsbijdrageSectie
              dossier={dossier}
              bijdrage={bijdrage}
              betalingen={bijdrageBetalingen}
              kinderen={kinderen}
              onOpslaan={onOnderhoudsbijdrageOpslaan}
              onVerwijderen={onOnderhoudsbijdrageVerwijderen}
              onBetalingOpslaan={onOnderhoudsbetalingOpslaan ?? (() => {})}
              onBetalingVerwijderen={onOnderhoudsbetalingVerwijderen ?? (() => {})}
            />
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

          {/* Uitwisselen met de andere ouder (ronde 44): doorsturen, inlezen,
              antwoorden. Onderaan, want het is de laatste stap — je stuurt door
              wat hierboven staat. */}
          {toont('uitwisseling') && onKostenBewaren && (
          <UitwisselingKaart
            dossier={dossier}
            dossiers={dossiers}
            kosten={kosten}
            verrekeningen={verrekeningen}
            kinderen={kinderen}
            categorieen={categorieen}
            onKostenBewaren={onKostenBewaren}
          />
          )}
        </div>
      )}

      {/* De vraag vóór het verwijderen (ronde 59).
          Ze TELT wat er weg gaat in plaats van "weet je het zeker?" te vragen: het
          verschil tussen een leeg dossier en een dossier met zestig kosten en
          twaalf documenten is precies wat je op dat moment moet weten. */}
      <Dialoog
        titel={t('Dit dossier verwijderen?')}
        open={teVerwijderen !== null}
        onSluiten={() => setTeVerwijderen(null)}
        voet={
          <div className="knoprij">
            <button type="button" className="knop knop-secundair" onClick={() => setTeVerwijderen(null)}>
              {t('Nee, behouden')}
            </button>
            <button
              type="button"
              // `knop-secundair` erbij, net als bij de weggooivraag in ui/Dialoog.tsx:
              // een kale `knop-gevaar` is alleen rode tekst zonder vlak of rand, en dan
              // ziet de gevaarlijke keuze er mínder uit als een knop dan de veilige
              // ernaast. Op een aanraakscherm is dat het verkeerde signaal.
              className="knop knop-secundair knop-gevaar"
              onClick={() => {
                const doel = teVerwijderen
                setTeVerwijderen(null)
                if (doel) onDossierVerwijderen(doel.id)
              }}
            >
              {t('Ja, verwijder')}
            </button>
          </div>
        }
      >
        {teVerwijderen && (
          <div className="stapel" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}>
              {t('Je staat op het punt {naam} te verwijderen, met alles wat eraan hangt:', {
                naam: teVerwijderen.naam,
              })}
            </p>
            <ul className="lijst">
              {telVoorVerwijderen(t, teVerwijderen.id, {
                kosten,
                verrekeningen,
                kindrekeningen,
                kindrekeningposten,
                onderhoudsbijdragen,
                onderhoudsbetalingen,
                documenten,
              }).map((regel) => (
                <li key={regel} className="rij">
                  <span className="rij-midden">
                    <span className="rij-titel">{regel}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Je kan dit meteen daarna nog ongedaan maken met de balk onderaan, maar die blijft niet lang staan.')}
            </p>
          </div>
        )}
      </Dialoog>

      {/* De vraag vóór het verwijderen van een AFREKENING (ronde 65). Dezelfde
          vorm als bij het dossier: ze telt wat er weg gaat in plaats van "weet je
          het zeker?" te vragen, en ze zegt er expliciet bij welke kosten weer
          openkomen. */}
      <Dialoog
        titel={afrekeningWeg ? afrekeningTitel(t, afrekeningWeg) : t('Deze afrekening verwijderen?')}
        open={afrekeningWeg !== null}
        onSluiten={() => setAfrekeningWegId(null)}
        voet={
          <div className="knoprij">
            <button type="button" className="knop knop-secundair" onClick={() => setAfrekeningWegId(null)}>
              {t('Nee, behouden')}
            </button>
            <button
              type="button"
              className="knop knop-secundair knop-gevaar"
              aria-busy={vensterOpslag.bezig}
              // ⚠ RONDE 68 — het venster ging dicht vóór er iets gebeurd was. Je las
              // hier net hoeveel kosten er weer op "nog niet afgerekend" komen te
              // staan, drukte op "Ja, verwijder", zag het venster wegvallen — en de
              // afrekening stond er gewoon nog.
              onClick={() => {
                const doel = afrekeningWegId
                if (!doel) return
                void vensterOpslag.probeer(() => onVerwijderAfrekening(doel)).then((gelukt) => {
                  if (gelukt) setAfrekeningWegId(null)
                })
              }}
            >
              {t('Ja, verwijder')}
            </button>
          </div>
        }
      >
        {afrekeningWeg && (
          <div className="stapel" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}>{t('Dit verandert er:')}</p>
            <ul className="lijst">
              {telAfrekeningVerwijderen(t, afrekeningWeg, kosten).map((regel) => (
                <li key={regel} className="rij">
                  <span className="rij-midden">
                    <span className="rij-titel">{regel}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="rij-meta" style={{ margin: 0 }}>
              {t('Je kan dit meteen daarna nog ongedaan maken met de balk onderaan, maar die blijft niet lang staan.')}
            </p>
            <Opslagfout fout={vensterOpslag.fout} zin={t('Verwijderen is niet gelukt. Er is niets weggehaald.')} />
          </div>
        )}
      </Dialoog>
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
            <li key={g.sleutel} className="rij rij-kolom" style={{ gap: 4 }}>
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
                · {t('te verrekenen')} {formatEuro(g.netto)}
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
          {/* Dezelfde zinnen als in de PDF, uit dezelfde functie — zie
              `voorbehoudNaBewerking`. Verandert er iets aan de kosten ná het genereren, dan
              hoort dat er te staan en niet stil weggerekend te worden. */}
          {voorbehoudNaBewerking(t, o).map((zin) => (
            <span key={zin} className="rij-meta" style={{ color: 'var(--warn-tekst)' }}>
              {zin}
            </span>
          ))}
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
                  <li key={r.kostId} className="rij rij-kolom" style={{ gap: 4 }}>
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
