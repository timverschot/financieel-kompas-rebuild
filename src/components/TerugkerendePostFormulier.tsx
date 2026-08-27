import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Categorie, Frequentie, Rekening, TerugkerendePost } from '../data/schema'
import { CONTRACTSOORTEN, opzegregelVan, type Contractsoort } from '../data/opzegregels'
import { FREQUENTIES } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { rekeningLabel } from '../utils/rekening'
import { invoerNaarCenten, centenNaarInvoer, formatEuro } from '../utils/format'
import { huidigeMaand, maandJaarLabel } from '../utils/datum'
import { INTERVAL_MAANDEN, verschuifMaand } from '../utils/vastelast'
import { useT } from '../i18n'
import { Opslagfout } from '../ui/Opslagfout'
import { useOpslagpoging } from '../ui/opslagpoging'
import type { Vertaler } from '../i18n'
import { CategorieKiezer } from './CategorieKiezer'

// De beginwaarden van een leeg formulier staan op één plek, zodat de begintoestand
// en het leegmaken na het opslaan niet uit elkaar kunnen lopen. De gekozen rekening
// hoort hier bewust niet bij: die blijft staan als handige standaard.
const BEGIN = {
  omschrijving: '',
  bedrag: '',
  soort: 'uitgave' as const,
  categorieId: '',
  dag: '1',
  frequentie: 'maand' as Frequentie,
  opbouwen: false,
}

// De weergavenaam van een frequentie. De opgeslagen sleutel ('kwartaal', ...)
// blijft taal-onafhankelijk; alleen wat je ziet, wordt vertaald.
export function frequentieNaam(t: Vertaler, f: Frequentie): string {
  switch (f) {
    case 'kwartaal':
      return t('Om de 3 maanden')
    case 'semester':
      return t('Om de 6 maanden')
    case 'jaar':
      return t('Eén keer per jaar')
    default:
      return t('Elke maand')
  }
}

// Formulier om een vaste (terugkerende) post aan te maken of te bewerken.
export function TerugkerendePostFormulier({
  rekeningen,
  categorieen,
  onOpslaan,
  bewerken,
  onOpgeslagen,
  soort: soortVanBuiten,
  onSoortGekozen,
  beginwaarden,
  bestaande,
  focusBijStart = false,
  focusEindeNa = 0,
  gedektDoorDoel,
}: {
  rekeningen: Rekening[]
  categorieen: Categorie[]
  onOpslaan: (p: TerugkerendePost) => Promise<void> | void
  bewerken?: TerugkerendePost | null
  /**
   * Inkomst of uitgave, van buitenaf gezet. De Plan-pagina heeft sinds ronde 25
   * twee aparte lijsten ("Vaste inkomsten" en "Vaste lasten"), en elk formulier
   * hoort daar maar één soort te maken. Dan verdwijnen de twee bolletjes onderaan:
   * dezelfde keuze op twee plaatsen is hoe je je loon per ongeluk als kost boekt.
   */
  soort?: 'uitgave' | 'inkomst'
  /**
   * Meldt welke soort er ín dit formulier gekozen staat, zodat het venster eromheen zijn
   * kop kan laten meelopen.
   *
   * ⚠ WAAROM (doorlichting ronde 92). In de ➕-popup ligt `soort` NIET van buiten vast: je
   * kiest hem met de twee bolletjes onderaan. De vensterkop stond intussen hard op "Vaste
   * last toevoegen". Wie op "Inkomst" klikte, kreeg dus een kop die zijn keuze tegensprak —
   * en sinds deze ronde zegt élk veld eronder "(vaste inkomst)". Dertien keer een
   * tegenspraak in plaats van één.
   */
  onSoortGekozen?: (soort: 'uitgave' | 'inkomst') => void
  /**
   * Wordt aangeroepen ná een gelukte opslag. `blijfOpen` is waar wanneer je op
   * "Opslaan + volgende" duwde. Zodra deze prop meegegeven wordt, verschijnt die
   * tweede knop — zo hoeft de invoerpopup niets over dit formulier te weten.
   */
  onOpgeslagen?: (opties: { blijfOpen: boolean }) => void
  /**
   * Waarden waarmee een LEEG formulier begint (ronde 73).
   *
   * De aanvinklijst op "Je situatie" opent dit formulier vanuit een voorstel, en dan
   * hoort de naam, de categorie, het ritme en de rekening al te staan — jij tikt
   * alleen nog het bedrag. Zo is er één invulweg in plaats van twee die uit elkaar
   * kunnen lopen; de vorige opzet had twee half-formulieren met verschillende regels,
   * en dat leverde in ronde 71 al een echt verschil op ("12abc" werd op de ene plek
   * als 12 gelezen en op de andere geweigerd).
   *
   * ⚠ EEN VERTREKPUNT, GEEN KOPPELING. De waarden worden alleen bij het opbouwen van
   * het formulier gelezen — en opnieuw na "Opslaan + volgende", zodat je meteen aan de
   * volgende van dezelfde soort kan beginnen. Verandert de prop daarna, dan overschrijft
   * ze niet wat jij intussen getikt hebt. Wie een ánder voorstel wil openen, geeft het
   * formulier een andere `key`.
   *
   * `bronVoorstel` reist mee naar het record: zo weet die lijst later welke kosten bij
   * welk voorstel horen, ook wanneer je ze hernoemt.
   */
  /**
   * De vaste posten die er al zijn, om te waarschuwen bij een dubbele naam (ronde 73).
   *
   * ⚠ Deze controle stond tot ronde 72 in het inline invulblok van "Je situatie" en
   * verdween met dat blok. Ze hoort hier thuis: dit is sinds deze ronde de ENIGE weg
   * waarlangs een vaste last ontstaat, dus een waarschuwing hier geldt meteen op alle
   * schermen. Het is bewust een WAARSCHUWING en geen blokkade — twee auto's, twee
   * telefoonabonnementen of twee verzekeringen met dezelfde naam bestaan echt.
   */
  bestaande?: TerugkerendePost[]
  /**
   * Zet de cursor bij het opbouwen in het bedragveld (ronde 73).
   *
   * ⚠ Alleen voor het invulvenster van "Je situatie". Springt "Opslaan + volgende" daar
   * naar het volgende voorstel, dan bouwt React dit formulier opnieuw op — inclusief de
   * knop waar de focus op stond. Die viel dan naar `<body>`, en één druk op Tab bracht
   * je op de pagina áchter het venster. Bij de eerste opening doet deze focus niets
   * kwaads: de popup zet de cursor daarna zelf in het eerste veld (effecten van een
   * kind draaien vóór die van de ouder).
   *
   * Op de Plan-pagina staat dit formulier gewoon op de pagina; daar zou een focus bij
   * het laden de pagina naar beneden trekken. Vandaar: standaard uit.
   */
  focusBijStart?: boolean
  /**
   * Verhoog dit getal om de cursor in het veld "Loopt tot en met" te zetten.
   *
   * ⚠ Waarvoor (ronde 76): "Liever opzeggen" in het verwijdervenster brengt je naar
   * dít formulier, en dan moet je ook zíén waar je moet zijn. Op de Plan-pagina staat
   * het formulier gewoon op de pagina, soms tien vaste lasten naar beneden; zonder
   * dit gebeurde er zichtbaar niets en leek de knop kapot.
   *
   * Bewust een TELLER en geen vlag, net als `schoonNa`: het formulier blijft
   * gemonteerd staan, dus een vlag zou maar één keer werken. En bewust geen `key` om
   * het te laten hermonteren — dat gooit je halve invoer weg (ronde 66).
   */
  focusEindeNa?: number
  /**
   * Het spaardoel dat de reservering van deze kost draagt (ronde 74), met het bedrag
   * waarmee je plan effectief rekent. Ontbreekt het, dan geldt de gewone uitleg bij
   * het vinkje "Hier maandelijks voor opzijzetten".
   */
  gedektDoorDoel?: { naam: string; perMaand: number }
  beginwaarden?: {
    omschrijving?: string
    categorieId?: string
    frequentie?: Frequentie
    dag?: number
    /** De maand van de eerste betaling van een niet-maandelijkse post ('JJJJ-MM'). */
    startMaand?: string
    rekeningId?: string
    bronVoorstel?: string
  }
}) {
  const { t } = useT()
  // Vangt een mislukte opslag op en zegt het (ronde 68).
  const opslag = useOpslagpoging()
  // ⚠ RONDE 68 — ÉÉN VAST ID PER INVULBEURT, niet één per poging.
  //
  // Nu een mislukte opslag zichtbaar is en de app zegt "probeer het opnieuw", telt dit
  // ineens: werd het record wél weggeschreven maar liep het opnieuw inlezen daarna mis,
  // dan maakte een tweede poging met een VERS id een tweede record in plaats van
  // hetzelfde te overschrijven. Het boekingsformulier doet dit al sinds ronde 36 zo, om
  // precies dezelfde reden.
  //
  // Het id wordt ververst zodra het formulier na een geslaagde opslag leeggemaakt wordt.
  const nieuwIdRef = useRef(nieuwId())
  // Sinds ronde 25 staan er TWEE van deze formulieren op de Plan-pagina (één voor
  // inkomsten, één voor lasten). Vaste id's zouden dan dubbel voorkomen, en dan
  // wijst een label naar het veld van de andere kaart.
  const veldId = useId()
  // ⚠ Vastgepind bij het opbouwen. Zie de uitleg bij `beginwaarden`: het is een
  // vertrekpunt en geen koppeling, dus een latere wijziging van de prop mag niet
  // overschrijven wat de gebruiker intussen intikte.
  const beginRef = useRef(beginwaarden)
  const [omschrijving, setOmschrijving] = useState(beginwaarden?.omschrijving ?? BEGIN.omschrijving)
  const [bedrag, setBedrag] = useState(BEGIN.bedrag)
  const [eigenSoort, setEigenSoort] = useState<'uitgave' | 'inkomst'>(BEGIN.soort)
  // Van buiten gezet heeft voorrang; anders houdt het formulier zijn eigen keuze bij.
  const soort = soortVanBuiten ?? eigenSoort
  const [rekeningId, setRekeningId] = useState(beginwaarden?.rekeningId ?? rekeningen[0]?.id ?? '')
  // ⚠ NIET afleiden uit de lijst. Ik heb dat in ronde 66 geprobeerd — "val terug op
  // de eerste rekening zodra de gekozene niet meer in de lijst staat" — en dat is
  // erger dan het gaatje dat het dichtte: bewerk je een vaste last die op een
  // intussen GEARCHIVEERDE rekening staat, dan schoof zo'n afleiding hem stil naar
  // een andere rekening zodra je alleen het bedrag aanpaste. Een koppeling mag nooit
  // stil verdwijnen; dat is elders in deze app een harde regel (zie het spaardoel-,
  // garantie- en leningformulier), en ze geldt hier ook.
  const [categorieId, setCategorieId] = useState(beginwaarden?.categorieId ?? BEGIN.categorieId)
  const [dag, setDag] = useState(beginwaarden?.dag !== undefined ? String(beginwaarden.dag) : BEGIN.dag)
  const [frequentie, setFrequentie] = useState<Frequentie>(beginwaarden?.frequentie ?? BEGIN.frequentie)
  // De maand van de eerste betaling. Bepaalt het ritme van een niet-maandelijkse
  // post: begin je in augustus met een halfjaarlijkse premie, dan valt de volgende
  // in februari — niet in januari, want het contract volgt geen kalenderhalfjaar.
  const [startMaand, setStartMaand] = useState(() => beginwaarden?.startMaand ?? huidigeMaand())
  // Leeg = loopt door. Geldt voor ELKE frequentie, ook maandelijks: een opgezegde
  // huur of een gestopt abonnement is precies het normale geval.
  const [eindMaand, setEindMaand] = useState('')
  const [opbouwen, setOpbouwen] = useState(BEGIN.opbouwen)
  // --- Het CONTRACT achter deze vaste last (ronde 57) --------------------------
  // Leeg = deze post is gewoon een vaste last en gedraagt zich precies zoals
  // vroeger. Vul je een soort én een datum in, dan rekent de app uit wanneer je
  // uiterlijk moet beslissen; zie utils/contract.ts.
  const [contractsoort, setContractsoort] = useState<Contractsoort | ''>('')
  const [verlengtOp, setVerlengtOp] = useState('')
  const [verlengtElke, setVerlengtElke] = useState('')
  const [eigenTermijn, setEigenTermijn] = useState('')
  // Maanden als vertrekpunt, want zo staat een opzegtermijn in een Belgisch contract
  // ("drie maanden opzeg"). Dagen blijven mogelijk voor wie een contract heeft dat het
  // wél in dagen zegt. Zie de uitleg bij `opzegtermijnMaanden` in data/schema.ts.
  const [eigenEenheid, setEigenEenheid] = useState<'maand' | 'dag'>('maand')
  // Welke van de twee opslaanknoppen ingedrukt werd. Een klik komt altijd vóór de
  // verzending van het formulier, dus dit staat juist op het moment dat we het lezen.
  const blijfOpen = useRef(false)
  // Eén keer per opbouw; zie `focusBijStart`.
  const bedragGefocust = useRef(false)
  // Het veld "Loopt tot en met"; zie `focusEindeNa`.
  const eindeRef = useRef<HTMLInputElement>(null)

  // Zet alle velden terug op hun beginwaarde.
  const leegmaken = useCallback(() => {
    // Klaar voor het volgende record: een vers id, zodat de volgende invoer niet
    // hetzelfde record overschrijft (ronde 68).
    nieuwIdRef.current = nieuwId()
    // Terug naar het VERTREKPUNT, niet naar leeg: kom je hier na "Opslaan + volgende"
    // vanuit de aanvinklijst, dan wil je meteen aan de tweede van dezelfde soort
    // kunnen beginnen zonder de naam en de categorie opnieuw te kiezen.
    const begin = beginRef.current
    setOmschrijving(begin?.omschrijving ?? BEGIN.omschrijving)
    setBedrag(BEGIN.bedrag)
    setEigenSoort(BEGIN.soort)
    setCategorieId(begin?.categorieId ?? BEGIN.categorieId)
    setDag(begin?.dag !== undefined ? String(begin.dag) : BEGIN.dag)
    setFrequentie(begin?.frequentie ?? BEGIN.frequentie)
    setStartMaand(begin?.startMaand ?? huidigeMaand())
    setEindMaand('')
    setOpbouwen(BEGIN.opbouwen)
    setContractsoort('')
    setVerlengtOp('')
    setVerlengtElke('')
    setEigenTermijn('')
    setEigenEenheid('maand')
  }, [])

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(Math.abs(bewerken.bedrag)))
      setEigenSoort(bewerken.bedrag < 0 ? 'uitgave' : 'inkomst')
      setRekeningId(bewerken.rekeningId)
      setCategorieId(bewerken.categorieId ?? '')
      setDag(String(bewerken.dag))
      setFrequentie(bewerken.frequentie ?? 'maand')
      setStartMaand(bewerken.startMaand ?? huidigeMaand())
      setEindMaand(bewerken.eindMaand ?? '')
      setOpbouwen(bewerken.opbouwen ?? false)
      setContractsoort(bewerken.contractsoort ?? '')
      setVerlengtOp(bewerken.verlengtOp ?? '')
      setVerlengtElke(bewerken.verlengtElkeMaanden ? String(bewerken.verlengtElkeMaanden) : '')
      // Maanden winnen, net als in de rekenkern: een oud logboekbestand kan nog het
      // dagenveld dragen, en dan hoort er één voorspelbaar antwoord te zijn.
      if (bewerken.opzegtermijnMaanden !== undefined) {
        setEigenTermijn(String(bewerken.opzegtermijnMaanden))
        setEigenEenheid('maand')
      } else if (bewerken.opzegtermijnDagen !== undefined) {
        setEigenTermijn(String(bewerken.opzegtermijnDagen))
        setEigenEenheid('dag')
      } else {
        setEigenTermijn('')
        setEigenEenheid('maand')
      }
    } else {
      leegmaken()
    }
  }, [bewerken, leegmaken])

  /**
   * De cursor naar "Loopt tot en met" brengen; zie `focusEindeNa`.
   *
   * ⚠ De nul slaan we over: dat is de beginstand, en anders zou het formulier bij
   * élke opbouw naar dat veld springen — ook wanneer je gewoon een nieuwe kost
   * invult. `scrollIntoView` bestaat niet in de testomgeving, vandaar de
   * bestaanscheck (dezelfde als in ui/Dialoog.tsx).
   */
  useEffect(() => {
    if (focusEindeNa === 0) return
    const veld = eindeRef.current
    if (!veld) return
    veld.focus()
    veld.scrollIntoView?.({ block: 'nearest' })
  }, [focusEindeNa])

  const bedragCenten = invoerNaarCenten(bedrag)
  // ⚠ RONDE 73 — BEWUST GEEN `Number.parseInt`. Die leest "12abc" als 12, "28,7" als 28
  // en "1e3" als 1: hij stopt bij het eerste teken dat geen cijfer is en zegt niets. Dat
  // verschil was in ronde 71 al eens een echte fout, en het samenvoegen van de twee
  // invulwegen deze ronde zou het anders stil hebben laten winnen. Nu geldt hier
  // dezelfde regel als bij de contractvelden: wat er staat is een heel getal, of niets.
  const dagGetal = /^\d+$/.test(dag.trim()) ? Number(dag.trim()) : Number.NaN

  // --- Het contract ------------------------------------------------------------
  const regel = opzegregelVan(contractsoort || undefined)
  // Met een regel keuren en niet met `parseInt`: die leest "12abc" als 12 en "3,5" als
  // 3. Bij een getal dat een OPZEGDATUM bepaalt, is stil iets anders begrijpen dan wat
  // er staat precies het soort fout dat je een contract kost.
  const heelGetal = (tekst: string): number | null => {
    const kaal = tekst.trim()
    return /^\d{1,3}$/.test(kaal) ? Number(kaal) : null
  }
  const verlengtElkeIngevuld = verlengtElke.trim() !== ''
  const verlengtElkeGetal = (() => {
    const n = heelGetal(verlengtElke)
    return n !== null && n > 0 && n <= 120 ? n : 0
  })()
  const eigenTermijnIngevuld = eigenTermijn.trim() !== ''
  const TERMIJN_MAX = eigenEenheid === 'maand' ? 24 : 365
  const eigenTermijnGetal = (() => {
    const n = heelGetal(eigenTermijn)
    return n !== null && n <= TERMIJN_MAX ? n : null
  })()
  // Een ingevuld veld dat de app niet kan lezen, mag ze NIET stil laten vallen (fout
  // uit de nakijkronde van ronde 57). Vroeger sloeg ze dan gewoon niets op en rekende
  // ze verder met de wettelijke termijn, zonder dat er iets op het scherm veranderde.
  const termijnGeldig = !contractsoort || !eigenTermijnIngevuld || eigenTermijnGetal !== null
  const periodeGeldig = !contractsoort || !verlengtElkeIngevuld || verlengtElkeGetal > 0
  // Stond er contractinfo op de post die je aan het bewerken bent, en zet je de soort
  // terug op "geen"? Dan gaat die info weg bij het opslaan.
  const contractsoortWordtGewist = Boolean(bewerken?.contractsoort) && contractsoort === ''
  const periodiek = frequentie !== 'maand'
  // Een lege eindmaand betekent "loopt door" en is dus geldig. Is ze ingevuld, dan
  // moet ze een echte maand zijn én ná de eerste betaling liggen — een post die
  // stopt vóór hij begint bestaat niet. Die kruiscontrole staat hier en niet in het
  // schema: een strengere zod-regel zou bestaande gegevens ongeldig kunnen maken.
  const eindeGeldig =
    eindMaand === '' || (/^\d{4}-\d{2}$/.test(eindMaand) && (!periodiek || eindMaand > startMaand))
  // De id van de regel die zegt wat er nog ontbreekt (ronde 61).
  const redenId = useId()

  // Staat er al een vaste last die zo heet? (ronde 73, zie de prop `bestaande`)
  // Vergelijkt zoals de gebruiker kijkt: zonder spaties eromheen en zonder op
  // hoofdletters te letten. De post die je aan het BEWERKEN bent, telt niet mee — anders
  // waarschuwt hij tegen zichzelf zodra je alleen het bedrag bijstelt.
  const naamBestaatAl =
    omschrijving.trim().length > 0 &&
    (bestaande ?? []).some(
      (p) => p.id !== bewerken?.id && p.omschrijving.trim().toLowerCase() === omschrijving.trim().toLowerCase(),
    )
  const geldig =
    omschrijving.trim().length > 0 &&
    Number.isFinite(bedragCenten) &&
    bedragCenten > 0 &&
    rekeningId.length > 0 &&
    Number.isInteger(dagGetal) &&
    dagGetal >= 1 &&
    dagGetal <= 28 &&
    (!periodiek || /^\d{4}-\d{2}$/.test(startMaand)) &&
    eindeGeldig &&
    termijnGeldig &&
    periodeGeldig

  // Wat het per maand zou kosten als je ervoor opzijzet. Meteen tonen, want dat is
  // het bedrag waar je in je maandplan rekening mee houdt — niet het volle bedrag.
  const perMaand = Number.isFinite(bedragCenten) && bedragCenten > 0
    ? Math.round(bedragCenten / INTERVAL_MAANDEN[frequentie])
    : 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) {
      // ⚠ De vlag WEL wissen (ronde 61). Sinds 'Opslaan + volgende' met `aria-disabled`
      // werkt in plaats van `disabled`, loopt zijn onClick ook bij een onvolledig
      // formulier. Bleef de vlag staan, dan hield een latere, gewone opslag de popup
      // open met lege velden — en dan denk je dat het niet gelukt is en boek je alles
      // een tweede keer. Dezelfde val als in OverboekingFormulier.
      blijfOpen.current = false
      return
    }
    // ⚠ RONDE 68 — EEN MISLUKTE OPSLAG MAG NOOIT STIL BLIJVEN. Dit formulier riep
    // `onOpslaan` aan zonder de mislukking op te vangen: de belofte werd weggegooid,
    // er verscheen geen letter, en de knop leek gewoon niet te reageren. Je drukte
    // opnieuw, of je sloot het venster en was je invoer kwijt. Alles wat "het is
    // gelukt" uitstraalt, gebeurt nu pas ná een geslaagde opslag.
    const gelukt = await opslag.probeer(() =>
      onOpslaan({
        id: bewerken ? bewerken.id : nieuwIdRef.current,
        omschrijving: omschrijving.trim(),
        bedrag: soort === 'uitgave' ? -bedragCenten : bedragCenten,
        rekeningId,
        dag: dagGetal,
        ...(categorieId ? { categorieId } : {}),
        // Een maandelijkse post laat deze drie velden weg, zodat ze exact hetzelfde
        // record blijft als vóór deze uitbreiding.
        ...(periodiek ? { frequentie, startMaand } : {}),
        ...(eindeGeldig && eindMaand ? { eindMaand } : {}),
        ...(periodiek && opbouwen ? { opbouwen: true } : {}),
        // Het contract. Zonder soort wordt er niets weggeschreven, en dan blijft dit
        // record byte voor byte wat het vóór ronde 57 was.
        ...(contractsoort ? { contractsoort } : {}),
        ...(contractsoort && verlengtOp ? { verlengtOp } : {}),
        ...(contractsoort && verlengtElkeGetal ? { verlengtElkeMaanden: verlengtElkeGetal } : {}),
        // Hoogstens één van de twee wordt weggeschreven, zodat er nooit twee eigen
        // termijnen naast elkaar staan die iets anders zeggen.
        ...(contractsoort && eigenTermijnGetal !== null
          ? eigenEenheid === 'maand'
            ? { opzegtermijnMaanden: eigenTermijnGetal }
            : { opzegtermijnDagen: eigenTermijnGetal }
          : {}),
        // Waar deze kost vandaan komt (ronde 73). Bij het BEWERKEN blijft staan wat er
        // al stond: de herkomst van een record verandert niet omdat je het bedrag
        // bijstelt. Bij een nieuwe post komt ze uit het voorstel waarop je klikte, en
        // ontbreekt ze wanneer je het formulier gewoon op Budget → Vast invult.
        ...(bewerken?.bronVoorstel
          ? { bronVoorstel: bewerken.bronVoorstel }
          : beginRef.current?.bronVoorstel
            ? { bronVoorstel: beginRef.current.bronVoorstel }
            : {}),
      }),
    )
    if (!gelukt) return
    // Bij een NIEUWE vaste post blijft 'bewerken' null, dus de useEffect hierboven
    // draait niet. Daarom hier leegmaken, anders blijft alles ingevuld staan en
    // maakt een tweede klik dezelfde post nog eens aan.
    if (!bewerken) leegmaken()
    const nog = blijfOpen.current
    blijfOpen.current = false
    onOpgeslagen?.({ blijfOpen: nog })
  }

  // ⚠ RONDE 83 — WELK VAN DE TWEE FORMULIEREN IS DIT?
  // Op Budget → Vast staan er twee onder elkaar: één voor je vaste inkomsten en één
  // voor je vaste lasten. Hun velden heten allemaal hetzelfde — nageteld: NEGEN paren
  // in de gewone toestand ("Omschrijving", "Bedrag (€)", "Dag van de maand", "Hoe
  // vaak?", "Loopt tot en met", "Zit hier een contract achter? (optioneel)",
  // "Rekening", "Zoek een categorie", "Categorie"), en tot VEERTIEN zodra je in allebei
  // een ritme en een contract invult. (⚠ Die vier heetten tot ronde 88 "Vaste
  // omschrijving", "Vast bedrag (€)", "Vaste rekening" en "Vaste categorie" — met
  // precies dezelfde botsing: het voorvoegsel stond in ALLEBEI de formulieren.)
  //
  // ⚠ PAREN, GEEN BEDIENINGEN. Het vinkje "Hier maandelijks voor opzijzetten" staat er
  // bij een ritme óók, maar alleen in het UITGAVEformulier — dus het is een tiende
  // bediening en geen tiende paar. Wie bedieningen telt komt op vijftien uit en denkt
  // dat dit getal misteld is. Dat is exact de huisregel die ronde 82
  // in de LIJST kwam handhaven, zestig regels lager geschonden.
  //
  // ⚠ EEN NAAM OP HET `<form>` EN NIET OP ELK VELD. Een formulier met een naam is in
  // HTML een LANDMARK: een schermlezer kondigt het aan zodra de focus erin komt
  // ("Nieuwe vaste last, formulier") en kan er rechtstreeks naartoe springen. Negen
  // tot veertien velden elk een eigen achtervoegsel geven zou twee vertaalsleutels per
  // veld kosten en de labels langer maken voor iedereen die gewoon kijkt.
  //
  // ⚠ MAAR HET LOST NIET ALLES OP, en dat hoort erbij te staan. Het helpt wie
  // DOORTABT. Het helpt níét wie de app met zijn STEM bedient ("klik Omschrijving"
  // vindt er nog altijd twee, want stembediening kent geen landmarks),
  // en ook niet wie de veldenlijst van zijn schermlezer opent — die somt de
  // bedieningen op zonder hun landmark. Die twee wegen blijven open.
  //
  // ⚠ EEN ZELFSTANDIG NAAMWOORD, geen bevel. Elke andere regio in de app heet
  // "Hoofdnavigatie", "Weergave", "Meer pagina's", "Hoofdcategorieën" of "Wat wil je
  // boeken?" — een plek of een vraag. "Vaste last invullen" stond daar als enige
  // gebiedende wijs tussen, en dat leest als een opdracht die de app je geeft.
  //
  // ⚠ En de naam volgt of je BEWERKT of TOEVOEGT. Anders kondigt een schermlezer
  // "nieuwe vaste last" aan boven een formulier waarin je je bestaande huur zit te
  // wijzigen — met een knop eronder die "Vaste last wijzigen" heet.
  //
  // ⚠ `soort` en niet `soortVanBuiten`: staat de soort niet van buiten vast (dat is
  // alleen zo in de ➕-invoerpopup, onder de knop "Vaste last"), dan kiest de gebruiker
  // hem zelf met de twee bolletjes onderaan — en dan hoort de naam mee te veranderen
  // met wat hij aan het maken is.
  const isInkomst = soort === 'inkomst'
  // ⚠ RONDE 92 — ELK VELD DRAAGT ERBIJ OVER WELK FORMULIER HET GAAT.
  //
  // ⚠ EN RONDE 98 HAALDE DE REDEN WEG WAAROM DAT NODIG WAS. Tot dan stonden op Budget →
  // Vast dit formulier voor de INKOMSTEN en dat voor de LASTEN onder elkaar op één scherm,
  // met negen tot veertien paren velden die exact hetzelfde heetten. Ronde 83 gaf allebei
  // een naam op het `<form>` (een landmark), ronde 88 haalde het zinloze voorvoegsel
  // "Vaste …" van de labels, en ronde 92 hing achter elke veldnaam een verduidelijking.
  // Drie rondes rond de oorzaak heen. Sinds ronde 98 zit dit formulier in een VENSTER en
  // staat er nooit meer een tweede naast; `App.test.tsx` legt dat vast.
  //
  // ⚠ WAAROM DE VERDUIDELIJKING TÓCH BLIJFT. De ➕-popup hangt buiten de pagina-inhoud en
  // kan dit formulier bovenop élk ander scherm leggen — ronde 88 telde er vier waar
  // "Rekening", "Omschrijving", "Bedrag (€)" of "Categorie" al iets anders benoemt. Daar
  // is "Omschrijving (vaste last)" nog altijd het verschil.
  //
  // ⚠ TUSSEN HAAKJES, EN NIET "van deze vaste last" (doorlichting). Zes van de dertien
  // labels zijn een VRAAG of eindigen zelf al op een toevoeging: "Hoe vaak?", "Eerste
  // betaling in", "Zit hier een contract achter? (optioneel)". Daarachter is "van deze
  // vaste last" geen Nederlands meer — en dat is precies de regel die ronde 88 kwam
  // handhaven toen ze "Vaste omschrijving" wegdeed. Een verduidelijking tussen haakjes past
  // achter een zelfstandig naamwoord én achter een vraagteken.
  //
  // ⚠ DE ZICHTBARE TEKST BLIJFT VOORAAN EN AANEENGESLOTEN. Dat is WCAG 2.5.3: wie
  // "Omschrijving" zégt, moet het veld raken dat "Omschrijving" heet. Vandaar
  // `aria-labelledby` met eerst het bestaande label en dán de toevoeging — nooit andersom,
  // en nooit een `aria-label` die de zichtbare tekst vervangt.
  //
  // ⚠ EN HET LABEL BLIJFT EEN ECHT `<label htmlFor>`. Daardoor blijft een klik op het
  // woord het veld focussen, en blijft `getByLabelText('Omschrijving')` in de tests werken:
  // die zoekt óók langs de `for`-koppeling, niet alleen langs de toegankelijke naam.
  // Nagemeten met een wegwerptest voor deze ronde begon — anders had dit ruim vijftig
  // aanroeppunten omgegooid.
  const soortId = `${veldId}-soort`
  const formuliernaam = bewerken
    ? isInkomst
      ? t('Deze vaste inkomst')
      : t('Deze vaste last')
    : isInkomst
      ? t('Nieuwe vaste inkomst')
      : t('Nieuwe vaste last')

  return (
    <form onSubmit={verzend} className="stapel" aria-label={formuliernaam}>
      {/* De toevoeging waar elk veld hierboven naar wijst. Buiten beeld, want wie kijkt
          ziet de vensterkop ("Vaste last toevoegen") al boven dit formulier staan. */}
      <span id={soortId} className="alleen-voorlezen">
        {isInkomst ? t('(vaste inkomst)') : t('(vaste last)')}
      </span>
      {/* ⚠ RONDE 88 — DE VELDEN HETEN WEER GEWOON WAT ZE ZIJN.
          Tot deze ronde stond er "Vaste omschrijving", "Vast bedrag (€)", "Vaste
          rekening" en "Vaste categorie". Dat is geen Nederlands — een rekening die vást
          is? — en het voorvoegsel stond er alleen om de velden van dit formulier uit
          elkaar te houden van velden elders.

          ⚠ EN HET DEED DAT NOOIT WAAR HET NODIG WAS. Op Budget → Vast stonden tot ronde
          98 twee exemplaren van dit formulier onder elkaar (inkomsten en lasten), en die
          zeiden allebei "Vaste omschrijving": het voorvoegsel hielp daar precies niets.
          Wat die twee toen uit elkaar hield, was de naam van het formulier zelf
          (`aria-label` hierboven, ronde 83): een `<form>` met een naam is een landmark.

          ⚠ SINDS RONDE 98 STAAT ER MAAR ÉÉN FORMULIER TEGELIJK, in een venster. De
          botsing waar deze drie rondes omheen werkten, bestaat niet meer.

          ⚠ EN DE ➕-POPUP DAN? (doorlichting ronde 88) Dat venster hangt buiten de
          pagina-inhoud, dus dit formulier kan bovenop élk scherm komen — ook op Boekingen
          met de filterbalk open ("Rekening"), op Rekeningen naast een overboeking
          ("Omschrijving") of naast het afrekenblok ("Bedrag (€)"). Die vier samenlopen
          bestonden vóór deze ronde niet. Ze doen er in de praktijk niet toe: `Dialoog`
          zet `role="dialog"` met `aria-modal`, en dan bestaat alles erbuiten voor een
          schermlezer niet meer. ⚠ Maar Testing Library trekt zich daar níéts van aan en
          zoekt over de hele `document.body`: een `getByLabelText('Rekening')` zonder
          `within(…)` kan er sinds deze ronde twee vinden. */}
      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-vaste-omschrijving-label`} htmlFor={`${veldId}-vaste-omschrijving`}>
          {t('Omschrijving')}
        </label>
        <input id={`${veldId}-vaste-omschrijving`}
            aria-labelledby={`${veldId}-vaste-omschrijving-label ${soortId}`} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
        {/* ⚠ Een WAARSCHUWING, geen fout: de opslaanknop blijft gewoon werken. Twee
            gezinsauto's met allebei "Autoverzekering" bestaan, en de app hoort dat niet
            te verbieden. Ze hoort alleen te voorkomen dat je dezelfde kost twee keer
            invoert zonder het te merken — dan staat ze ook twee keer in je vaste lasten
            per maand, in je buffer en in je vooruitblik. */}
        {naamBestaatAl && (
          <p className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
            {t('Er staat al een vaste last die zo heet. Is dit een tweede, geef ze dan een eigen naam — dan zie je later welke welke is.')}
          </p>
        )}
      </div>

      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" id={`${veldId}-vast-bedrag-label`} htmlFor={`${veldId}-vast-bedrag`}>
            {t('Bedrag (€)')}
          </label>
          <input
            id={`${veldId}-vast-bedrag`}
            aria-labelledby={`${veldId}-vast-bedrag-label ${soortId}`}
            inputMode="decimal"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
            ref={(el) => {
              // Alleen bij het opbouwen, en alleen wanneer erom gevraagd is. Een effect
              // met een lege afhankelijkheidslijst zou hetzelfde doen; via de ref is er
              // geen extra beurt tussen het tekenen en het zetten van de cursor.
              if (focusBijStart && el && !bedragGefocust.current) {
                bedragGefocust.current = true
                el.focus()
              }
            }}
          />
        </div>
        <div className="veldgroep">
          <label className="label-caps" id={`${veldId}-vaste-dag-label`} htmlFor={`${veldId}-vaste-dag`}>
            {t('Dag van de maand')}
          </label>
          <input id={`${veldId}-vaste-dag`}
            aria-labelledby={`${veldId}-vaste-dag-label ${soortId}`} inputMode="numeric" value={dag} onChange={(e) => setDag(e.target.value)} />
        </div>
      </div>

      {/* Hoe vaak komt dit terug? Niet elke vaste last is maandelijks: een
          verzekering, de onroerende voorheffing of een jaarabonnement komen per
          kwartaal, per halfjaar of één keer per jaar. Zonder deze keuze telde de
          app zo'n kost élke maand mee, en klopten de vooruitblik én het
          buffercijfer niet. */}
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" id={`${veldId}-vaste-frequentie-label`} htmlFor={`${veldId}-vaste-frequentie`}>
            {t('Hoe vaak?')}
          </label>
          <select
            id={`${veldId}-vaste-frequentie`}
            aria-labelledby={`${veldId}-vaste-frequentie-label ${soortId}`}
            value={frequentie}
            onChange={(e) => setFrequentie(e.target.value as Frequentie)}
          >
            {FREQUENTIES.map((f) => (
              <option key={f} value={f}>
                {frequentieNaam(t, f)}
              </option>
            ))}
          </select>
        </div>
        {periodiek && (
          <div className="veldgroep">
            <label className="label-caps" id={`${veldId}-vaste-start-label`} htmlFor={`${veldId}-vaste-start`}>
              {t('Eerste betaling in')}
            </label>
            {/* Het ritme telt vanaf hier, niet vanaf het kalenderjaar: begin je in
                augustus met een halfjaarlijkse premie, dan volgt februari. */}
            <input
              id={`${veldId}-vaste-start`}
            aria-labelledby={`${veldId}-vaste-start-label ${soortId}`}
              type="month"
              value={startMaand}
              onChange={(e) => setStartMaand(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-vaste-einde-label`} htmlFor={`${veldId}-vaste-einde`}>
          {t('Loopt tot en met')}
        </label>
        <input
          ref={eindeRef}
          id={`${veldId}-vaste-einde`}
            aria-labelledby={`${veldId}-vaste-einde-label ${soortId}`}
          type="month"
          value={eindMaand === '' ? '' : verschuifMaand(eindMaand, -1)}
          onChange={(e) => setEindMaand(e.target.value === '' ? '' : verschuifMaand(e.target.value, 1))}
          aria-describedby={`${veldId}-vaste-einde-uitleg`}
        />
        <span className="rij-meta" id={`${veldId}-vaste-einde-uitleg`}>
          {eindMaand === ''
            ? t('Laat leeg zolang de post doorloopt. Vul hem in wanneer je opzegt — de post blijft dan gewoon in je historiek staan.')
            : t('De laatste keer is {maand}. Daarna telt deze post niet meer mee.', { maand: maandJaarLabel(`${verschuifMaand(eindMaand, -1)}-01`) })}
        </span>
      </div>

      {periodiek && soort === 'uitgave' && (
        <div className="veldgroep">
          <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={opbouwen} onChange={(e) => setOpbouwen(e.target.checked)} />{' '}
            {t('Hier maandelijks voor opzijzetten')}
          </label>
          <span className="rij-meta">
            {/* ⚠ Hangt er een spaardoel aan deze kost, dan rekent je plan met DAT
                bedrag (ronde 74). Bleef hier "€ 51,67" staan terwijl Budget met jouw
                streefbedrag van € 75 rekent, dan zei dit venster iets anders dan het
                scherm eronder — over dezelfde kost, in dezelfde maand. */}
            {gedektDoorDoel
              ? t('Je plan rekent hiervoor met je spaardoel {doel}: {bedrag} per maand.', {
                  doel: gedektDoorDoel.naam,
                  bedrag: formatEuro(gedektDoorDoel.perMaand),
                })
              : opbouwen
                ? t('In de maanden zonder betaling rekent je plan op {bedrag} opzij.', { bedrag: formatEuro(perMaand) })
                : t('Zonder dit staat het volle bedrag in één keer in je plan, in de maand dat het vervalt.')}
          </span>
        </div>
      )}

      {/* --- Het contract achter deze vaste last (ronde 57) ---------------------

          Waarom dit hier staat en niet in een eigen module: het gaat om drie feiten
          over een afspraak die al in de app staat. En waarom het ONDERAAN staat en
          niet bovenaan: negen van de tien vaste lasten zijn geen contract dat je in
          de gaten moet houden, en dan mag dit blok niet in de weg zitten.

          ⚠ De app WAARSCHUWT, ze BEVEELT NIET AAN. Ze zegt wanneer je moet beslissen;
          ze zegt nooit bij wie je beter zou zitten. Een leverancier voorstellen tegen
          vergoeding is gereglementeerde bemiddeling. */}
      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-contractsoort-label`} htmlFor={`${veldId}-contractsoort`}>
          {t('Zit hier een contract achter? (optioneel)')}
        </label>
        <select
          id={`${veldId}-contractsoort`}
            aria-labelledby={`${veldId}-contractsoort-label ${soortId}`}
          value={contractsoort}
          onChange={(e) => setContractsoort(e.target.value as Contractsoort | '')}
        >
          <option value="">{t('Nee, gewoon een vaste last')}</option>
          {CONTRACTSOORTEN.map((soortNaam) => (
            <option key={soortNaam} value={soortNaam}>
              {t(opzegregelVan(soortNaam)?.naam ?? soortNaam)}
            </option>
          ))}
        </select>
        {/* Zonder soort schrijft het formulier de contractvelden niet weg, en omdat
            opslaan het hele record vervangt, verdwijnt de verlengdatum dan echt. Het
            blok van het scherm zien verdwijnen is niet hetzelfde als weten dat je een
            datum wist — dus staat het er nu bij. */}
        {contractsoortWordtGewist && (
          <span className="rij-meta">
            {t('Sla je zo op, dan wis je de verlengdatum en de opzegtermijn van deze post.')}
          </span>
        )}
      </div>

      {contractsoort && (
        <>
          <div className="veldrij">
            <div className="veldgroep">
              <label className="label-caps" id={`${veldId}-verlengt-op-label`} htmlFor={`${veldId}-verlengt-op`}>
                {t('Verlengt of loopt af op')}
              </label>
              <input
                id={`${veldId}-verlengt-op`}
            aria-labelledby={`${veldId}-verlengt-op-label ${soortId}`}
                type="date"
                value={verlengtOp}
                onChange={(e) => setVerlengtOp(e.target.value)}
              />
            </div>
            <div className="veldgroep">
              <label className="label-caps" id={`${veldId}-verlengt-elke-label`} htmlFor={`${veldId}-verlengt-elke`}>
                {t('Om de hoeveel maanden? (optioneel)')}
              </label>
              <input
                id={`${veldId}-verlengt-elke`}
            aria-labelledby={`${veldId}-verlengt-elke-label ${soortId}`}
                inputMode="numeric"
                placeholder="12"
                value={verlengtElke}
                onChange={(e) => setVerlengtElke(e.target.value)}
              />
            </div>
          </div>
          <span className={periodeGeldig ? 'rij-meta' : 'foutregel'} style={{ marginTop: -6 }}>
            {!periodeGeldig
              ? t('Vul hier een heel aantal maanden in, van 1 tot 120 — of laat het leeg.')
              : verlengtElkeGetal
                ? t('De app schuift deze datum vanzelf op zodra ze voorbij is.')
                : t('Zonder dit getal schuift de app de datum NIET zelf op: ze vraagt je de nieuwe. Ze kan niet weten voor hoe lang er verlengd is.')}
          </span>

          <div className="veldgroep">
            <label className="label-caps" id={`${veldId}-opzegtermijn-label`} htmlFor={`${veldId}-opzegtermijn`}>
              {t('Je eigen opzegtermijn (optioneel)')}
            </label>
            {/* ⚠ MET EEN EENHEID, en dat is de reparatie uit de tweede nakijkronde van
                ronde 57. Eerst kon je hier alleen DAGEN invullen, terwijl een Belgisch
                contract bijna altijd maanden noemt. Wie "3 maanden opzeg" als 90 dagen
                invulde, kreeg 17 oktober te zien waar 15 oktober de echte laatste dag
                was — twee dagen te laat, en dus precies de rekenfout die deze ronde in
                haar eigen kern net weggewerkt had. */}
            <div className="termijnrij">
              <input
                id={`${veldId}-opzegtermijn`}
            aria-labelledby={`${veldId}-opzegtermijn-label ${soortId}`}
                inputMode="numeric"
                value={eigenTermijn}
                onChange={(e) => setEigenTermijn(e.target.value)}
                aria-describedby={`${veldId}-opzeg-uitleg`}
                aria-invalid={!termijnGeldig}
              />
              {/* ⚠ Deze keuzelijst heeft geen zichtbaar label — ze staat pal naast het
                  getal en zou er anders twee woorden bij zetten. Ze krijgt haar naam dus
                  uit een verborgen span, en niet uit een `aria-label`: zo hangt de
                  toevoeging van ronde 92 er op dezelfde manier aan als bij de andere
                  twaalf velden. */}
              {/* ⚠ Een ECHT `<label htmlFor>`, alleen buiten beeld (doorlichting ronde 92).
                  Een verborgen `<span>` als naambron werkt voor een schermlezer, maar dan
                  steunt de koppeling tussen het woord en het veld nergens meer op — en dan
                  slaagt `getByLabelText` alleen nog door een eigenaardigheid van Testing
                  Library. Dit is de enige bediening in dit formulier zonder zichtbaar
                  label; ze krijgt dezelfde behandeling als de twaalf andere. */}
              <label
                id={`${veldId}-opzegeenheid-label`}
                htmlFor={`${veldId}-opzegeenheid`}
                className="alleen-voorlezen"
              >
                {t('Eenheid van de opzegtermijn')}
              </label>
              <select
                id={`${veldId}-opzegeenheid`}
                aria-labelledby={`${veldId}-opzegeenheid-label ${soortId}`}
                value={eigenEenheid}
                onChange={(e) => setEigenEenheid(e.target.value as 'maand' | 'dag')}
              >
                <option value="maand">{t('maanden')}</option>
                <option value="dag">{t('dagen')}</option>
              </select>
            </div>
            <span className={termijnGeldig ? 'rij-meta' : 'foutregel'} id={`${veldId}-opzeg-uitleg`}>
              {!termijnGeldig
                ? eigenEenheid === 'maand'
                  ? t('Vul een heel aantal maanden in, van 0 tot 24. Zolang dit niet klopt, kan je niet opslaan.')
                  : t('Vul een heel aantal dagen in, van 0 tot 365. Zolang dit niet klopt, kan je niet opslaan.')
                : eigenTermijnGetal !== null
                  ? eigenEenheid === 'maand'
                    ? t('De app rekent met jouw {n} maand(en).', { n: eigenTermijnGetal })
                    : t('De app rekent met jouw {n} dagen.', { n: eigenTermijnGetal })
                  : regel?.standaardTermijnMaanden != null
                    ? t('De app rekent met de wettelijke {n} maand(en). Staat er in jouw overeenkomst een kortere termijn, vul die dan hier in.', { n: regel.standaardTermijnMaanden })
                    : t('Zonder termijn toont de app alleen de datum en rekent ze niets uit.')}
            </span>
          </div>

          {/* Wat de wet zegt, en wat de app daarover NIET weet, bewust op twee aparte
              regels: aan elkaar geplakt las het voorbehoud als een voetnoot bij de
              regel, terwijl het net het stuk is waar jouw contract kan afwijken. */}
          {regel && regel.uitleg && (
            <>
              <p className="rij-meta" style={{ margin: 0 }}>
                {t(regel.uitleg)}
              </p>
              {regel.voorbehoud && (
                <p className="rij-meta" style={{ margin: 0 }}>
                  <strong>{t('Let op:')}</strong> {t(regel.voorbehoud)}
                </p>
              )}
            </>
          )}
        </>
      )}

      <div className="veldgroep">
        <label className="label-caps" id={`${veldId}-vaste-rekening-label`} htmlFor={`${veldId}-vaste-rekening`}>
          {t('Rekening')}
        </label>
        <select id={`${veldId}-vaste-rekening`}
            aria-labelledby={`${veldId}-vaste-rekening-label ${soortId}`} value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
          {rekeningen.map((r) => (
            <option key={r.id} value={r.id}>
              {rekeningLabel(r)}
            </option>
          ))}
        </select>
      </div>

      {/* ⚠ RONDE 98 — DEZELFDE CATEGORIEKIEZER ALS BIJ EEN BOEKING, MET KNOPPEN.
          Keuze van Timothy, en alleen hier: het budgetformulier houdt voorlopig zijn
          keuzelijst (`CategorieNiveauKiezer`).

          ⚠ EEN VERALDERDE OPMERKING DIE DEZE RONDE BIJNA TEGENHIELD. In
          `CategorieNiveauKiezer` stond te lezen waarom dít formulier die kiezer NIET
          gebruikte: *"die kent de middenlaag niet, geeft altijd een item terug"*. Zou dat
          waar zijn, dan kon een vaste last niet meer op "Elektriciteit" (middenlaag)
          staan en viel ze bij het inboeken uit elke analyse — precies de fout die de
          opmerking wilde voorkomen.

          ⚠ NAGEMETEN, NIET GELEZEN. Het klopt niet meer, en er stónden al twee groene
          tests die het bewijzen: "kiest een categorie met één tik" geeft `cat-broodwaren`
          terug (een MIDDENcategorie), en "gaat een laag terug wanneer je de actieve chip
          nog eens aantikt" geeft `ov-voeding`. Deze ronde zet daar een derde naast die
          uitdrukkelijk over dít formulier gaat. De opmerking zelf is rechtgezet: elke
          bewering in een commentaar hoort waar te zijn.

          ⚠ GEEN EIGEN `<label>` MEER. Deze kiezer draagt haar naam zelf ("Categorie:"
          met de keuze ernaast) en heeft geen `<select>` om een label aan te hangen. Een
          los label dat naar niets wijst, is erger dan geen label. */}
      <CategorieKiezer
        waarde={categorieId || undefined}
        onKies={(id) => setCategorieId(id ?? '')}
        gebruikerCategorieen={categorieen}
        // Zegt bij welk formulier het zoekveld hoort. Sinds deze ronde staat dit
        // formulier in een venster en is er nooit meer een tweede naast — maar de
        // ➕-popup kan hem nog altijd bovenop een ánder scherm leggen, en daar heet
        // "Zoek een categorie of subcategorie" soms al iets.
        naamToevoeging={isInkomst ? t('(vaste inkomst)') : t('(vaste last)')}
      />

      {/* Deze twee bolletjes stonden zonder enige uitleg onder het formulier. In de
          invoerpopup staat er nu bovenaan een knop "Vaste last", en dan lijkt een
          losse keuze "Uitgave / Inkomst" eronder een tegenspraak. Ze is het niet:
          een vaste post kán ook geld zijn dat elke maand binnenkomt (loon, huurgeld
          dat je ontvangt). Vandaar dit kopje. */}
      {soortVanBuiten === undefined && (
        <>
          <span className="label-caps">{t('Komt dit geld binnen of gaat het eruit?')}</span>
          <div className="veldrij" style={{ gap: 18, marginTop: -6 }}>
            <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                name="vastsoort"
                checked={soort === 'uitgave'}
                onChange={() => {
                  setEigenSoort('uitgave')
                  onSoortGekozen?.('uitgave')
                }}
              />{' '}
              {t('Uitgave')}
            </label>
            <label className="raak-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                name="vastsoort"
                checked={soort === 'inkomst'}
                onChange={() => {
                  setEigenSoort('inkomst')
                  onSoortGekozen?.('inkomst')
                }}
              />{' '}
              {t('Inkomst')}
            </label>
          </div>
        </>
      )}

      <div className="knoprij">
        {/* In de popup is dit de hoofdactie van het scherm; in de kaart op de
            budgetpagina is het één actie tussen andere. */}
        <button
          type="submit"
          aria-disabled={!geldig}
          aria-describedby={geldig ? undefined : redenId}
          className={onOpgeslagen ? 'knop knop-primair' : 'knop knop-secundair'}
        >
          {/* ⚠ RONDE 83 — "vaste post" bestond nergens anders in de app: de kaart heet
              "Vaste lasten" en de rij spreekt over "deze kost". En het maakte meteen de
              twee knoppen onderscheidbaar: met twee open bewerkvensters stond er twee
              keer "Vaste post wijzigen".

              ⚠ IN DE POPUP GEWOON "TOEVOEGEN", en dat is een correctie op mezelf. Daar
              staat de naam van het ding al in de vensterkop ("Vaste last toevoegen"),
              dus een knop met diezelfde vier woorden zegt hetzelfde twee keer. Erger:
              in die popup kiest de gebruiker de soort met de bolletjes onderaan terwijl
              de kop vastligt — zette hij die op "Inkomst", dan stond er boven "Vaste
              last toevoegen" en onder "Vaste inkomst toevoegen". Die tegenspraak had ik
              er zelf in gezet. Dat de kop en de inleidende zin dáár de bolletjes niet
              volgen, is ouder dan deze ronde en staat op de open lijst. */}
          {bewerken
            ? isInkomst
              ? t('Vaste inkomst wijzigen')
              : t('Vaste last wijzigen')
            : onOpgeslagen
              ? t('Toevoegen')
              : isInkomst
                ? t('Vaste inkomst toevoegen')
                : t('Vaste last toevoegen')}
        </button>
        {onOpgeslagen && !bewerken && (
          <button
            type="submit"
            aria-disabled={!geldig}
            aria-describedby={geldig ? undefined : redenId}
            className="knop knop-ghost"
            onClick={() => {
              blijfOpen.current = true
            }}
          >
            {t('Opslaan + volgende')}
          </button>
        )}
        {/* ⚠ RONDE 98 — HIER STOND EEN KNOP "ANNULEER", EN DIE HAD GEEN OPROEPER MEER.
            Ronde 92 gaf hem een eigen naam per formulier, omdat er met twee open
            bewerkformulieren twee keer exact "Annuleer" stond. Die toestand kan sinds
            ronde 98 niet meer bestaan: dit formulier staat altijd in een venster, en dat
            heeft al twee wegen naar buiten (het kruisje en Escape) die allebei eerst
            vragen of je je invoer mag weggooien. Alle drie de oproepers gaven `onAnnuleer`
            dan ook niet meer mee. Weggehaald in plaats van laten staan — wat nergens
            gebruikt wordt, gaat weg (regel sinds ronde 77). */}
      </div>
      {/* Zolang de knop uitgeschakeld is, zegt deze regel wat er nog ontbreekt.
          Sinds ronde 57 kan het contractblok de knop óók tegenhouden, en dan mag hier
          niet "geef een naam en een bedrag" staan terwijl die allebei ingevuld zijn:
          dan zoek je je blind. "Niet kan gebruiken" en niet "niet kan lezen": zet je
          een veld van 90 dagen om naar maanden, dan LEEST de app die 90 prima — ze
          valt alleen buiten het bereik van 0 tot 24. Het veld zelf zegt welk bereik. */}
      {/* ⚠ Altijd aanwezig, leeg wanneer er niets te melden is (ronde 61): een
          `role="status"` die pas MÉT zijn tekst verschijnt, wordt door sommige
          schermlezers overgeslagen, en de twee knoppen hierboven wijzen ernaar. */}
      <Opslagfout fout={opslag.fout} />
      <p id={redenId} className="leeg" role="status" style={{ padding: '4px 0 0', textAlign: 'left' }}>
        {geldig
          ? ''
          : !termijnGeldig || !periodeGeldig
            ? t('In het contractblok staat een getal dat de app niet kan gebruiken. Pas het aan om op te slaan.')
            : t('Geef een naam en een geldig bedrag om op te slaan.')}
      </p>
    </form>
  )
}
