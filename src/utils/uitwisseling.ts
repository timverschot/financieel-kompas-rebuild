import { z } from 'zod'
import type { Dossier, GedeeldeKost, Kind } from '../data/schema'
import { effectiefAandeel } from './dossier'
import { rondPercentage } from './format'
import { isOpenKost } from './afrekening'
import { labelVanCategorie, type EigenCategorie } from '../data/categorieen/resolve'

// ============================================================================
// Het uitwisselbestand tussen twee ouders (ronde 44)
//
// Twee gescheiden ouders gebruiken elk hun EIGEN installatie van deze app. Er is
// geen server en er komt er ook geen. Jij exporteert de gedeelde kosten van één
// dossier naar een bestand, stuurt dat door zoals je een foto doorstuurt, de
// andere ouder leest het in zijn eigen Kompal in, vinkt aan wat hij betwist, en
// stuurt hetzelfde soort bestand terug.
//
// DE GRENS DIE WE BEWAKEN (uit het werkplan): dit is een import/export van
// KOSTEN, geen tweede synchronisatiemechanisme naast het append-only logboek.
// Concreet betekent dat:
//   - er reizen alleen gedeelde kosten mee, nooit rekeningen, transacties,
//     andere dossiers, onderhoudsbijdragen of de documentkluis;
//   - het inlezen schrijft gewone 'gedeeldekost.bewaard'-gebeurtenissen, precies
//     zoals wanneer je een kost met de hand invoert;
//   - een ingelezen kost krijgt altijd een NIEUWE eigen id. Zonder dat zou een
//     vreemde id via het logboek (last-writer-wins) stil een eigen kost kunnen
//     overschrijven.
//
// VIER REGELS DIE DE REST VERKLAREN
//
// 1. Het perspectief keert om. In jouw app is een kost 'betaald door jij'; in de
//    app van de andere ouder is diezelfde kost 'betaald door partner'. En jouw
//    aandeel van 40 % is aan de andere kant 60 %.
//
// 2. Je stuurt wat JIJ betaalde. Twee ouders die elk hun eigen uitgaven sturen,
//    hebben samen het volledige dossier en niets dubbel. Stuur je ook wat de
//    ander betaalde, dan krijgt hij zijn eigen kosten van jou terug — en die
//    staan bij hem al. (Het mag wel; het is een keuze bij het exporteren, en de
//    ontvanger krijgt ze als vermoedelijke dubbels aangeboden.)
//
// 3. Identiteit blijft behouden over meerdere heen-en-weers. Een kost draagt
//    altijd dezelfde uitwisselId, ook wanneer ze intussen aan beide kanten een
//    andere lokale id heeft. Daardoor verdubbelt hetzelfde bestand twee keer
//    inlezen niets, en komt een kost die je ooit van de ander kreeg niet als
//    nieuwe kost bij hem terug.
//
// 4. Het aandeel wordt vastgepind. Een ingelezen kost krijgt altijd een eigen
//    percentage (100 min dat van de afzender), ook wanneer dat toevallig gelijk
//    is aan de dossier-standaard. Anders zouden twee ouders met een verschillende
//    verdeelsleutel over dezelfde kost een verschillend bedrag zien, en dan heeft
//    het hele uitwisselen geen zin meer.
// ============================================================================

/**
 * De versie van het bestandsformaat.
 *
 * Van 1 naar 2 (ronde 46) om dezelfde reden als LOG_FORMAAT in sync/events.ts: een
 * bedrag is gewoon een getal, en van buiten kan je niet zien of `2400` € 24,00 of
 * € 2.400,00 betekent. De app bewaarde geld vroeger in euro's; een uitwisselbestand
 * uit die tijd zou hier binnenkomen als centen, en dan staat € 2.400 er als € 24.
 * `.int()` vangt de bedragen met een komma af, maar een rond bedrag glipt erdoor.
 *
 * Versie 1 wordt daarom geweigerd. Het bestand droeg altijd al een versienummer;
 * het werd alleen nooit gebruikt om déze vraag te beantwoorden.
 */
export const UITWISSEL_VERSIE = 2

// Bovengrenzen. Ze staan er niet om de gebruiker te pesten maar omdat dit bestand
// van buiten komt: een kapot of kwaadaardig bestand mag de app niet laten
// vastlopen of het Drive-logboek laten ontploffen. Een bon zit als data-URL IN de
// gebeurtenis, en het logboek wordt bij elke wijziging integraal naar Drive
// geschreven — vandaar dat bonnen standaard NIET meereizen.
export const MAX_KOSTEN = 2000
export const MAX_BON = 1_000_000
export const MAX_BONNEN_TOTAAL = 10_000_000

const DATUM = /^\d{4}-\d{2}-\d{2}$/

export const UitwisselKostSchema = z.object({
  id: z.string().min(1),
  omschrijving: z.string(),
  bedrag: z.number().int().positive(),
  datum: z.string().regex(DATUM),
  // Bewust vanuit de AFZENDER geschreven, niet als 'jij'/'partner': die woorden
  // betekenen aan de andere kant het omgekeerde en dat is precies de val.
  betaaldDoorAfzender: z.boolean(),
  // Het effectieve percentage dat de AFZENDER van deze kost draagt (0-100).
  aandeelAfzender: z.number().min(0).max(100),
  /**
   * Wat de afzender zelf voor deze kost berekende, in centen.
   *
   * ⚠ RONDE 107 — DIT COMMENTAAR BELOOFDE IETS WAT DE CODE NIET DOET. Er stond: *"Puur ter
   * controle: de ontvanger rekent zelf en meldt het wanneer de twee uitkomsten verschillen."*
   * Dat gebeurt niet per kost: alleen het TOTAALsaldo (`saldoAfzender`) wordt vergeleken, en
   * dat veld wordt apart geschreven. Het veld hier wordt nergens gelezen.
   *
   * Het blijft wél in het bestand staan, en met opzet: het reist mee zodat een latere versie
   * — of een mens die het bestand opent — per kost kan nakijken waar een verschil zit dat het
   * totaal niet toont (twee fouten die elkaar opheffen). Een veld weghalen uit een formaat
   * dat al bij de andere ouder op de schijf staat, kost een versiesprong; het laten staan
   * niet. Wat niet mocht blijven, is de zin die beweerde dat er iets mee gebeurde.
   */
  aandeelAfzenderCenten: z.number().int().min(0).optional(),
  // NAMEN, geen id's: gezinsleden krijgen in elke installatie een eigen
  // willekeurige id, dus daar valt niets op te matchen.
  kinderen: z.array(z.string()).optional(),
  // De id van een INGEBOUWDE categorie is wél in elke installatie identiek (zie
  // data/categorieen/ingebouwd.ts). Die reist dus mee; het label staat ernaast
  // als terugval voor een eigen categorie en als weergave.
  categorieId: z.string().min(1).optional(),
  categorie: z.string().optional(),
  kostenType: z.enum(['gewoon', 'buitengewoon']).optional(),
  bon: z.string().max(MAX_BON).optional(),
})
export type UitwisselKost = z.infer<typeof UitwisselKostSchema>

export const UitwisselReactieSchema = z.object({
  // Verwijst naar de uitwisselId van de kost, nooit naar een lokale id.
  uitwisselId: z.string().min(1),
  soort: z.enum(['akkoord', 'betwist']),
  op: z.string().regex(DATUM),
  reden: z.string().optional(),
  // Waarop de reactie sloeg. Wijzigt de kost nadien, dan vervalt ze.
  bedrag: z.number().int().optional(),
  datum: z.string().regex(DATUM).optional(),
})
export type UitwisselReactie = z.infer<typeof UitwisselReactieSchema>

export const UitwisselBestandSchema = z.object({
  app: z.literal('financieel-kompas'),
  soort: z.literal('uitwisseling'),
  versie: z.number().int().positive(),
  gemaaktOp: z.string().min(1),
  dossierNaam: z.string(),
  afzender: z.string().optional(),
  kosten: z.array(z.unknown()).max(MAX_KOSTEN),
  reacties: z.array(z.unknown()).max(MAX_KOSTEN).optional(),
  // Kosten die de afzender uit haar dossier haalde. Afwezigheid kan nooit
  // 'verwijderd' betekenen — een bestand kan nu eenmaal een selectie zijn.
  ingetrokken: z.array(z.string()).max(MAX_KOSTEN).optional(),
  // Wat de afzender zelf als saldo berekende, in centen, positief = de ontvanger
  // is de afzender dat verschuldigd. Ter controle, niet om over te nemen.
  saldoAfzender: z.number().int().optional(),
})
// Het schema laat 'kosten' en 'reacties' bewust als onbekende rijen binnen, zodat
// één rotte regel het hele bestand niet ongeldig maakt; leesUitwisselBestand
// valideert ze daarna record per record. Het TYPE waarmee de rest van de app werkt
// is wel het gecontroleerde.
export type UitwisselBestand = Omit<z.infer<typeof UitwisselBestandSchema>, 'kosten' | 'reacties'> & {
  kosten: UitwisselKost[]
  reacties?: UitwisselReactie[]
}

// ============================================================================
// Kleine hulpjes
// ============================================================================

// De identiteit die een kost in een uitwisseling draagt. Een kost die je zelf
// boekte draagt haar eigen id; een kost die je inlas draagt de id die ze bij de
// andere ouder had. Zo blijft één kost over vier uitwisselingen heen dezelfde.
export function uitwisselIdVan(kost: GedeeldeKost): string {
  return kost.uitwisselId ?? kost.id
}


// Is dit een categorie die de ontvanger sowieso kent? Alleen de ingebouwde boom
// heeft in elke installatie dezelfde id's; een eigen categorie is een uuid en
// betekent aan de andere kant niets.
function isIngebouwdeCategorie(id: string | undefined): boolean {
  if (!id) return false
  return labelVanCategorie(id, []) !== 'Onbekend'
}

// Vervalt een reactie doordat de kost nadien gewijzigd is? Een akkoord over € 40
// is geen akkoord over € 400.
export function reactieVervallen(kost: GedeeldeKost): boolean {
  const r = kost.reactie
  if (!r) return false
  if (typeof r.bedrag === 'number' && r.bedrag !== kost.bedrag) return true
  if (r.datum && r.datum !== kost.datum) return true
  return false
}

// ============================================================================
// Exporteren
// ============================================================================

export type ExportKeuze = {
  // Ook kosten meesturen die de ANDERE ouder betaalde. Standaard uit: die staan
  // bij hem al, en hij krijgt ze dan als vermoedelijke dubbel terug.
  ookVanPartner?: boolean
  metBonnen?: boolean
  afzender?: string
  periodeVan?: string
  periodeTot?: string
}

export type ExportResultaat = {
  bestand: UitwisselBestand
  // Bonnen die niet meekonden omdat ze te groot waren. Bewust geteld en gemeld
  // in plaats van stil afgekapt.
  bonnenOvergeslagen: number
}

// Bouwt het bestand voor één dossier. Alleen OPEN kosten reizen mee: een kost die
// je al afrekende hoort niet opnieuw in het saldo van de andere ouder te
// verschijnen. Ingetrokken kosten reizen als verklaring mee, niet als kost.
export function bouwUitwisselBestand(
  dossier: Dossier,
  kosten: GedeeldeKost[],
  kinderen: Kind[],
  categorieen: EigenCategorie[],
  nuISO: string,
  keuze: ExportKeuze = {},
): ExportResultaat {
  const vanDossier = kosten.filter((k) => k.dossierId === dossier.id)
  const naamVan = (id: string) => kinderen.find((k) => k.id === id)?.naam

  const inPeriode = (k: GedeeldeKost) => {
    if (keuze.periodeVan && k.datum < keuze.periodeVan) return false
    if (keuze.periodeTot && k.datum > keuze.periodeTot) return false
    return true
  }

  const teSturen = vanDossier.filter((k) => {
    if (!isOpenKost(k)) return false
    if (!inPeriode(k)) return false
    if (!keuze.ookVanPartner && k.betaaldDoor !== 'jij') return false
    return true
  })

  let bonnenTotaal = 0
  let bonnenOvergeslagen = 0
  const uitKosten: UitwisselKost[] = teSturen.map((k) => {
    const pct = rondPercentage(effectiefAandeel(dossier, k))
    const namen = (k.kindIds ?? []).map(naamVan).filter((n): n is string => !!n)

    let bon: string | undefined
    if (keuze.metBonnen && k.bonnetje) {
      if (k.bonnetje.length > MAX_BON || bonnenTotaal + k.bonnetje.length > MAX_BONNEN_TOTAAL) {
        bonnenOvergeslagen += 1
      } else {
        bon = k.bonnetje
        bonnenTotaal += k.bonnetje.length
      }
    }

    const uit: UitwisselKost = {
      id: uitwisselIdVan(k),
      omschrijving: k.omschrijving,
      bedrag: k.bedrag,
      datum: k.datum,
      betaaldDoorAfzender: k.betaaldDoor === 'jij',
      aandeelAfzender: pct,
      aandeelAfzenderCenten: Math.round(k.bedrag * (pct / 100)),
    }
    if (namen.length > 0) uit.kinderen = namen
    if (isIngebouwdeCategorie(k.categorieId)) uit.categorieId = k.categorieId
    const label = labelVanCategorie(k.categorieId, categorieen)
    if (label && label !== 'Onbekend') uit.categorie = label
    if (k.kostenType) uit.kostenType = k.kostenType
    if (bon) uit.bon = bon
    return uit
  })

  // De reacties die JIJ gaf op kosten die je van de andere ouder kreeg. Ze reizen
  // terug onder de uitwisselId, want dat is de enige naam die zij herkent.
  // Alleen over kosten die nog spelen. Een antwoord op een allang afgerekende
  // kost zou anders eeuwig blijven meereizen en bij elke import opnieuw op die
  // afgesloten kost geschreven worden — logregels naar Drive voor niets.
  const reacties: UitwisselReactie[] = vanDossier
    .filter((k) => k.uitwisselId && k.reactie && isOpenKost(k))
    .map((k) => {
      const r = k.reactie!
      const uit: UitwisselReactie = { uitwisselId: k.uitwisselId!, soort: r.soort, op: r.op }
      if (r.reden) uit.reden = r.reden
      uit.bedrag = k.bedrag
      uit.datum = k.datum
      return uit
    })

  const ingetrokken = vanDossier.filter((k) => k.ingetrokken).map(uitwisselIdVan)

  // Het saldo dat de ONTVANGER van de afzender tegoed heeft: precies het
  // omgekeerde van wat de afzender zelf ziet.
  let betaaldDoorAfzender = 0
  let aandeelAfzenderExact = 0
  for (const k of teSturen) {
    if (k.betaaldDoor === 'jij') betaaldDoorAfzender += k.bedrag
    // Met HETZELFDE afgeronde percentage als in de rijen hierboven. Rekende dit
    // met het rauwe percentage, dan hoorde het meegestuurde saldo niet bij de
    // getallen die meereizen: bij een dossier op 33,333 % scheelde dat al tien
    // cent, en dan meldde de ontvanger een inhoudelijk verschil dat er niet was.
    aandeelAfzenderExact += k.bedrag * (rondPercentage(effectiefAandeel(dossier, k)) / 100)
  }
  const saldoAfzender = -(betaaldDoorAfzender - Math.round(aandeelAfzenderExact))

  const bestand: UitwisselBestand = {
    app: 'financieel-kompas',
    soort: 'uitwisseling',
    versie: UITWISSEL_VERSIE,
    gemaaktOp: nuISO,
    dossierNaam: dossier.naam,
    kosten: uitKosten,
    saldoAfzender,
  }
  if (keuze.afzender) bestand.afzender = keuze.afzender
  if (reacties.length > 0) bestand.reacties = reacties
  if (ingetrokken.length > 0) bestand.ingetrokken = ingetrokken

  return { bestand, bonnenOvergeslagen }
}

// ============================================================================
// Inlezen
// ============================================================================

export type LeesResultaat =
  | { ok: true; bestand: UitwisselBestand; overgeslagen: number }
  | { ok: false; fout: 'geen-json' | 'geen-uitwisseling' | 'nieuwere-versie' | 'oudere-versie' | 'te-groot' }

// Leest en valideert een bestand. Bewust per record: één rotte regel mag de hele
// import niet kosten, maar ze wordt wel geteld en gemeld — nooit stil weggelaten.
export function leesUitwisselBestand(json: string): LeesResultaat {
  let rauw: unknown
  try {
    rauw = JSON.parse(json)
  } catch {
    return { ok: false, fout: 'geen-json' }
  }

  const buiten = UitwisselBestandSchema.safeParse(rauw)
  if (!buiten.success) {
    const telFout = buiten.error.issues.some((i) => i.code === 'too_big')
    return { ok: false, fout: telFout ? 'te-groot' : 'geen-uitwisseling' }
  }
  if (buiten.data.versie > UITWISSEL_VERSIE) return { ok: false, fout: 'nieuwere-versie' }
  // Een ouder bestand: de bedragen daarin staan mogelijk in euro's, en dat is van
  // buiten niet te zien. Weigeren is de enige veilige keuze — een bedrag honderd
  // keer verkeerd overnemen is erger dan een bestand niet kunnen lezen.
  if (buiten.data.versie < UITWISSEL_VERSIE) return { ok: false, fout: 'oudere-versie' }

  let overgeslagen = 0
  const gezien = new Set<string>()
  const kosten: UitwisselKost[] = []
  for (const rij of buiten.data.kosten) {
    const g = UitwisselKostSchema.safeParse(rij)
    if (!g.success) {
      overgeslagen += 1
      continue
    }
    // Twee kosten met dezelfde identiteit in één bestand: de tweede overslaan zou
    // stil geld kosten, hem inlezen zou elke volgende ronde fout maken. Overslaan
    // én tellen, zodat het gemeld wordt.
    if (gezien.has(g.data.id)) {
      overgeslagen += 1
      continue
    }
    gezien.add(g.data.id)
    kosten.push(g.data)
  }

  const reacties: UitwisselReactie[] = []
  for (const rij of buiten.data.reacties ?? []) {
    const g = UitwisselReactieSchema.safeParse(rij)
    if (g.success) reacties.push(g.data)
    else overgeslagen += 1
  }

  return {
    ok: true,
    overgeslagen,
    bestand: { ...buiten.data, kosten, reacties: reacties.length > 0 ? reacties : undefined },
  }
}

// ============================================================================
// Vergelijken met het eigen dossier
// ============================================================================

export type KostOordeel =
  // Nog niet gekend: nieuw in jouw dossier.
  | 'nieuw'
  // Al gekend en identiek: er valt niets te doen.
  | 'ongewijzigd'
  // Al gekend, maar de andere ouder heeft het bedrag of de datum aangepast.
  | 'gewijzigd'
  // Nog niet gekend, maar er staat een kost met dezelfde datum en hetzelfde
  // bedrag in jouw dossier. Waarschijnlijk dezelfde kost, langs twee wegen.
  | 'dubbel'
  // Al gekend en al vastgelegd in een afrekening: niet meer aan te raken.
  | 'vast'

export type Vergelijking = {
  kost: UitwisselKost
  oordeel: KostOordeel
  // De eigen kost waar dit op slaat (bij ongewijzigd/gewijzigd/vast/dubbel).
  eigen?: GedeeldeKost
  // Het percentage dat JIJ zou dragen na inlezen.
  aandeelJij: number
  // Wijkt dat af van wat jouw dossier zelf zou zeggen?
  anderePctDanDossier: boolean
  // Staat de al gekende kost in een ANDER dossier? Dan hoort ze daar thuis en is
  // ze hier niet nog eens in te lezen.
  anderDossier?: string
}

/**
 * De groepjes waarin de inleeskaart haar samenvatting opsomt.
 *
 * ⚠ WAAROM DIT HIER STAAT EN NIET IN DE KAART (ronde 96). De kaart filterde zelf, en
 * daardoor telde ze dezelfde kost twee keer: `anderDossier` wordt hierboven op precies
 * één plaats gezet, en daar staat het oordeel al op `'ongewijzigd'`. `elders` is dus een
 * DEELVERZAMELING van `ongewijzigd`, terwijl de twee regels als losse punten onder elkaar
 * stonden en lazen als groepen die elkaar uitsluiten. Bij drie kosten uit een ander
 * dossier las je "3 kost(en) staan er al" én "3 kost(en) staan in een ander dossier" —
 * zes vermeldingen voor drie kosten.
 *
 * Als zuivere functie is dat op verzonnen invoer te beproeven; in de kaart kon het alleen
 * met een half ingelezen bestand.
 */
export type Uitwisselgroepen = {
  nieuw: Vergelijking[]
  gewijzigd: Vergelijking[]
  dubbel: Vergelijking[]
  /** Al gekend en ongewijzigd — maar NIET wat in een ander dossier staat. */
  ongewijzigd: Vergelijking[]
  vast: Vergelijking[]
  elders: Vergelijking[]
  anderePct: Vergelijking[]
}

export function groepeerVergelijkingen(vergelijkingen: Vergelijking[]): Uitwisselgroepen {
  const elders = vergelijkingen.filter((x) => x.anderDossier)
  return {
    nieuw: vergelijkingen.filter((x) => x.oordeel === 'nieuw'),
    gewijzigd: vergelijkingen.filter((x) => x.oordeel === 'gewijzigd'),
    dubbel: vergelijkingen.filter((x) => x.oordeel === 'dubbel'),
    ongewijzigd: vergelijkingen.filter((x) => x.oordeel === 'ongewijzigd' && !x.anderDossier),
    vast: vergelijkingen.filter((x) => x.oordeel === 'vast'),
    elders,
    anderePct: vergelijkingen.filter(
      (x) => x.anderePctDanDossier && (x.oordeel === 'nieuw' || x.oordeel === 'gewijzigd'),
    ),
  }
}

/** De namen van de andere dossiers, elk één keer. */
export function andereDossiernamen(elders: Vergelijking[]): string[] {
  return [...new Set(elders.map((x) => x.anderDossier).filter((naam): naam is string => !!naam))]
}

export type Uitwisseloverzicht = {
  vergelijkingen: Vergelijking[]
  reacties: { reactie: UitwisselReactie; eigen: GedeeldeKost }[]
  reactiesZonderKost: number
  ingetrokken: GedeeldeKost[]
  // Het saldo dat jij zelf berekent over de kosten in dit bestand, in centen,
  // positief = de andere ouder is jou dat verschuldigd.
  saldoJij: number
  saldoAfzender?: number
}

// Legt het bestand naast het eigen dossier. Verandert niets; het scherm toont dit
// eerst en de gebruiker beslist wat er ingelezen wordt.
export function vergelijkMetDossier(
  bestand: UitwisselBestand,
  dossier: Dossier,
  eigenKosten: GedeeldeKost[],
  vastgelegdeIds: Set<string>,
  dossierNaamVan: (dossierId: string) => string | undefined,
): Uitwisseloverzicht {
  // Kosten van DIT dossier krijgen voorrang. Zonder dat kon een kopie in een
  // ander dossier de juiste kost verbergen, en meldde het scherm "staat in een
  // ander dossier" terwijl ze hier ook stond.
  const perUitwisselId = new Map<string, GedeeldeKost>()
  for (const k of eigenKosten) {
    const sleutel = uitwisselIdVan(k)
    const bestaand = perUitwisselId.get(sleutel)
    if (!bestaand || (bestaand.dossierId !== dossier.id && k.dossierId === dossier.id)) {
      perUitwisselId.set(sleutel, k)
    }
  }

  const vergelijkingen: Vergelijking[] = bestand.kosten.map((u) => {
    const aandeelJij = rondPercentage(100 - u.aandeelAfzender)
    const eigen = perUitwisselId.get(u.id)

    // Wat zou dit dossier zelf zeggen? Alleen om het te MELDEN wanneer het
    // afwijkt — overnemen doen we het niet, zie regel 4 bovenaan.
    const alsofEigen: GedeeldeKost = {
      id: 'proef',
      dossierId: dossier.id,
      omschrijving: u.omschrijving,
      bedrag: u.bedrag,
      betaaldDoor: u.betaaldDoorAfzender ? 'partner' : 'jij',
      datum: u.datum,
      ...(u.categorieId ? { categorieId: u.categorieId } : {}),
      ...(u.kostenType ? { kostenType: u.kostenType } : {}),
    }
    const anderePctDanDossier = rondPercentage(effectiefAandeel(dossier, alsofEigen)) !== aandeelJij

    if (eigen) {
      if (eigen.dossierId !== dossier.id) {
        return {
          kost: u,
          oordeel: 'ongewijzigd',
          eigen,
          aandeelJij,
          anderePctDanDossier,
          anderDossier: dossierNaamVan(eigen.dossierId) ?? eigen.dossierId,
        }
      }
      if (!isOpenKost(eigen) || vastgelegdeIds.has(eigen.id)) {
        return { kost: u, oordeel: 'vast', eigen, aandeelJij, anderePctDanDossier }
      }
      const zelfde = eigen.bedrag === u.bedrag && eigen.datum === u.datum && eigen.omschrijving === u.omschrijving
      return { kost: u, oordeel: zelfde ? 'ongewijzigd' : 'gewijzigd', eigen, aandeelJij, anderePctDanDossier }
    }

    // Nog niet gekend langs de uitwisseling. Staat er iets dat er sterk op lijkt?
    // Dat gebeurt zodra beide ouders dezelfde kost zelf inboekten.
    const lijkt = eigenKosten.find(
      (k) => k.dossierId === dossier.id && k.datum === u.datum && k.bedrag === u.bedrag && isOpenKost(k),
    )
    if (lijkt) return { kost: u, oordeel: 'dubbel', eigen: lijkt, aandeelJij, anderePctDanDossier }

    return { kost: u, oordeel: 'nieuw', aandeelJij, anderePctDanDossier }
  })

  // Reacties slaan op JOUW kosten: de andere ouder antwoordde op wat jij stuurde.
  const reacties: { reactie: UitwisselReactie; eigen: GedeeldeKost }[] = []
  let reactiesZonderKost = 0
  for (const r of bestand.reacties ?? []) {
    const eigen = perUitwisselId.get(r.uitwisselId)
    if (eigen && eigen.dossierId === dossier.id) reacties.push({ reactie: r, eigen })
    else reactiesZonderKost += 1
  }

  // Een intrekking mag ALLEEN slaan op een kost die van de andere ouder komt
  // (die draagt een uitwisselId). Anders zou een bestand — per vergissing of niet
  // — een kost die JIJ betaalde uit je saldo kunnen halen, met alleen een telling
  // op het scherm als waarschuwing.
  const ingetrokken: GedeeldeKost[] = []
  for (const id of bestand.ingetrokken ?? []) {
    const eigen = perUitwisselId.get(id)
    if (eigen && eigen.dossierId === dossier.id && eigen.uitwisselId && !eigen.ingetrokken) ingetrokken.push(eigen)
  }

  // Wat JIJ over deze reeks berekent, van jouw kant gezien. Bewust op dezelfde
  // manier afgerond als utils/dossier.ts, zodat de twee cijfers vergelijkbaar zijn.
  let betaaldDoorJou = 0
  let jouwExact = 0
  for (const u of bestand.kosten) {
    if (!u.betaaldDoorAfzender) betaaldDoorJou += u.bedrag
    jouwExact += u.bedrag * ((100 - u.aandeelAfzender) / 100)
  }
  const saldoJij = betaaldDoorJou - Math.round(jouwExact)

  return {
    vergelijkingen,
    reacties,
    reactiesZonderKost,
    ingetrokken,
    saldoJij,
    saldoAfzender: bestand.saldoAfzender,
  }
}

// ============================================================================
// Toepassen
// ============================================================================

// Zet één uitwisselkost om naar een gedeelde kost in JOUW dossier. Het perspectief
// keert om en het aandeel wordt vastgepind (regels 1 en 4 bovenaan).
export function naarEigenKost(
  u: UitwisselKost,
  dossierId: string,
  kinderen: Kind[],
  nieuweId: string,
): GedeeldeKost {
  const kost: GedeeldeKost = {
    id: nieuweId,
    dossierId,
    omschrijving: u.omschrijving,
    bedrag: u.bedrag,
    betaaldDoor: u.betaaldDoorAfzender ? 'partner' : 'jij',
    datum: u.datum,
    aandeelJijOverride: rondPercentage(100 - u.aandeelAfzender),
    // Dezelfde waarde, maar met een andere betekenis: dit is wat de ANDERE OUDER
    // opgaf. Wijzig je het percentage later zelf, dan blijft dit staan en ziet de
    // app dat het huidige aandeel niet meer van haar komt (ronde 51).
    uitwisselAandeel: rondPercentage(100 - u.aandeelAfzender),
    uitwisselId: u.id,
  }
  // Gezinsleden koppelen we op NAAM, en alleen aan wie al bestaat. Automatisch
  // nieuwe gezinsleden aanmaken zou de globale lijst vervuilen met namen uit het
  // huishouden van de andere ouder.
  const ids = (u.kinderen ?? [])
    .map((naam) => kinderen.find((k) => k.naam.trim().toLowerCase() === naam.trim().toLowerCase())?.id)
    .filter((id): id is string => !!id)
  if (ids.length > 0) kost.kindIds = ids
  if (u.categorieId) kost.categorieId = u.categorieId
  if (u.kostenType) kost.kostenType = u.kostenType
  if (u.bon) kost.bonnetje = u.bon
  return kost
}

// Neemt een wijziging van de andere ouder over op een kost die je al hebt. Alle
// eigen velden blijven staan; alleen wat in het bestand stond verandert. Een
// eerdere reactie vervalt: ze sloeg op het oude bedrag.
export function metWijziging(eigen: GedeeldeKost, u: UitwisselKost): GedeeldeKost {
  const bijgewerkt: GedeeldeKost = {
    ...eigen,
    omschrijving: u.omschrijving,
    bedrag: u.bedrag,
    datum: u.datum,
    aandeelJijOverride: rondPercentage(100 - u.aandeelAfzender),
    uitwisselAandeel: rondPercentage(100 - u.aandeelAfzender),
    uitwisselId: u.id,
  }
  delete bijgewerkt.reactie
  if (u.bon) bijgewerkt.bonnetje = u.bon
  return bijgewerkt
}

// Zet de reactie van de andere ouder op je eigen kost.
// Zet de reactie van de andere ouder op je eigen kost. 'bedrag' en 'datum' zijn
// die waarop het antwoord SLOEG — uit het bestand, niet de waarden die de kost nu
// heeft. Anders zou een akkoord over EUR 40 dat je intussen naar EUR 400 bracht
// als geldig gestempeld worden, en dat is precies wat reactieVervallen moet vangen.
export function metReactie(eigen: GedeeldeKost, r: UitwisselReactie): GedeeldeKost {
  const reactie: GedeeldeKost['reactie'] = {
    soort: r.soort,
    op: r.op,
    bedrag: r.bedrag ?? eigen.bedrag,
    datum: r.datum ?? eigen.datum,
  }
  if (r.reden) reactie.reden = r.reden
  return { ...eigen, reactie }
}

// Markeert een kost als ingetrokken. Bewust geen verwijdering: een kost die uit
// een saldo verdwijnt zonder spoor is erger dan een die zichtbaar doorgestreept
// staat, en verwijderen helpt bovendien niet — bij de volgende uitwisseling komt
// ze gewoon terug.
export function metIntrekking(eigen: GedeeldeKost): GedeeldeKost {
  return { ...eigen, ingetrokken: true }
}

// Draait een intrekking terug. Elke handeling die geld uit een saldo haalt, moet
// terug te draaien zijn.
export function zonderIntrekking(eigen: GedeeldeKost): GedeeldeKost {
  const uit = { ...eigen }
  delete uit.ingetrokken
  return uit
}

// Verklaart een kost die je al had, dezelfde als een kost uit het bestand: ze
// krijgt de identiteit van de uitwisseling. Zonder dit blijft een vermoedelijke
// dubbel elke ronde opnieuw als dubbel terugkomen, en is er geen manier om te
// zeggen dat het om hetzelfde gaat.
export function metKoppeling(eigen: GedeeldeKost, u: UitwisselKost): GedeeldeKost {
  return { ...eigen, uitwisselId: u.id }
}

// De naam van het bestand. De dossiernaam erin, zodat je in je downloadmap ziet
// waarover het gaat, en de datum zodat twee uitwisselingen niet over elkaar heen
// vallen.
export function uitwisselBestandsnaam(dossierNaam: string, nuISO: string, veilig: (t: string) => string): string {
  const naam = veilig(dossierNaam) || 'dossier'
  return `kompas-uitwisseling-${naam}-${nuISO.slice(0, 10)}.json`
}
