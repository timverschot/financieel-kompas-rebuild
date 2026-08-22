import type { ZodType } from 'zod'
import { db } from './db'
import {
  AflossingSchema,
  BudgetSchema,
  CategorieSchema,
  DossierSchema,
  DossierDocumentSchema,
  GarantieSchema,
  GedeeldeKostSchema,
  KindSchema,
  KindrekeningSchema,
  KindrekeningpostSchema,
  LeningSchema,
  OrdeningSchema,
  OverboekingSchema,
  WaarderingSchema,
  StreepjescodeSchema,
  RekeningSchema,
  SpaardoelSchema,
  SubcategorieSchema,
  TerugkerendePostSchema,
  TransactieSchema,
  VerrekeningSchema,
  type Budget,
  type Categorie,
  type Aflossing,
  type Dossier,
  type DossierDocument,
  type Garantie,
  type GedeeldeKost,
  type Kind,
  type Kindrekening,
  type Kindrekeningpost,
  type Lening,
  type Ordening,
  type Overboeking,
  type Waardering,
  type Streepjescode,
  type Rekening,
  type Spaardoel,
  type Subcategorie,
  type TerugkerendePost,
  type Transactie,
  type Verrekening,
  MaandafsluitingSchema,
  OnderhoudsbijdrageSchema,
  OnderhoudsbetalingSchema,
  type Maandafsluiting,
  type Onderhoudsbijdrage,
  type Onderhoudsbetaling,
} from './schema'
import { pasGebeurtenisToe, pasGebeurtenissenToe } from './sync/lokaal'

// De repository is de enige weg naar de database. Alle schrijfacties worden
// eerst gevalideerd en lopen daarna via het append-only logboek.

// --- Schrijven ---
export async function bewaarTransactie(tx: Transactie): Promise<void> {
  const geldig = TransactieSchema.parse(tx)
  await pasGebeurtenisToe({ type: 'transactie.bewaard', payload: geldig })
}

/**
 * Veel transacties in ÉÉN ondeelbare stap (ronde 37, voor het inlezen van een
 * bankuittreksel).
 *
 * Waarom niet gewoon `bewaarTransactie` in een lus: dat zijn evenveel losse
 * schrijfacties naar het logboek. Bij tweehonderd regels duurt dat merkbaar lang,
 * en breekt het halverwege af (de opslag zit vol, je sluit het tabblad), dan staat
 * de helft van je uittreksel in de app en weet je niet welke helft. Nu gaat alles
 * door, of niets — en één keer ongedaan maken haalt precies dezelfde reeks weg.
 */
export async function bewaarTransacties(transacties: Transactie[]): Promise<void> {
  if (transacties.length === 0) return
  const gebeurtenissen = transacties.map(
    (t) => ({ type: 'transactie.bewaard', payload: TransactieSchema.parse(t) }) as const,
  )
  await pasGebeurtenissenToe(gebeurtenissen)
}

export async function bewaarRekening(rekening: Rekening): Promise<void> {
  const geldig = RekeningSchema.parse(rekening)
  await pasGebeurtenisToe({ type: 'rekening.bewaard', payload: geldig })
}

export async function bewaarCategorie(categorie: Categorie): Promise<void> {
  const geldig = CategorieSchema.parse(categorie)
  await pasGebeurtenisToe({ type: 'categorie.bewaard', payload: geldig })
}

export async function bewaarBudget(budget: Budget): Promise<void> {
  const geldig = BudgetSchema.parse(budget)
  await pasGebeurtenisToe({ type: 'budget.bewaard', payload: geldig })
}

export async function bewaarDossier(dossier: Dossier): Promise<void> {
  const geldig = DossierSchema.parse(dossier)
  await pasGebeurtenisToe({ type: 'dossier.bewaard', payload: geldig })
}

export async function bewaarGedeeldeKost(kost: GedeeldeKost): Promise<void> {
  const geldig = GedeeldeKostSchema.parse(kost)
  await pasGebeurtenisToe({ type: 'gedeeldekost.bewaard', payload: geldig })
}

/**
 * Meerdere gedeelde kosten in ÉÉN blok wegschrijven — dezelfde reden als bij
 * 'bewaarTransacties': een uitwisseling met de andere ouder gaat in één keer door
 * of helemaal niet. Een half ingelezen bestand zou je met een dossier opzadelen
 * waarvan je niet weet welke helft er staat, en één keer ongedaan maken haalt nu
 * precies dezelfde reeks weer weg.
 */
export async function bewaarGedeeldeKosten(kosten: GedeeldeKost[]): Promise<void> {
  if (kosten.length === 0) return
  const gebeurtenissen = kosten.map(
    (k) => ({ type: 'gedeeldekost.bewaard', payload: GedeeldeKostSchema.parse(k) }) as const,
  )
  await pasGebeurtenissenToe(gebeurtenissen)
}

export async function bewaarVerrekening(verrekening: Verrekening): Promise<void> {
  const geldig = VerrekeningSchema.parse(verrekening)
  await pasGebeurtenisToe({ type: 'verrekening.bewaard', payload: geldig })
}

export async function verwijderVerrekening(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'verrekening.verwijderd', payload: { id } })
}

export async function bewaarTerugkerendePost(post: TerugkerendePost): Promise<void> {
  const geldig = TerugkerendePostSchema.parse(post)
  await pasGebeurtenisToe({ type: 'terugkerendepost.bewaard', payload: geldig })
}

export async function verwijderTerugkerendePost(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'terugkerendepost.verwijderd', payload: { id } })
}

export async function bewaarSpaardoel(doel: Spaardoel): Promise<void> {
  const geldig = SpaardoelSchema.parse(doel)
  await pasGebeurtenisToe({ type: 'spaardoel.bewaard', payload: geldig })
}

export async function verwijderSpaardoel(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'spaardoel.verwijderd', payload: { id } })
}

export async function bewaarSubcategorie(sub: Subcategorie): Promise<void> {
  const geldig = SubcategorieSchema.parse(sub)
  await pasGebeurtenisToe({ type: 'subcategorie.bewaard', payload: geldig })
}

export async function verwijderSubcategorie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'subcategorie.verwijderd', payload: { id } })
}

export async function bewaarOverboeking(o: Overboeking): Promise<void> {
  const geldig = OverboekingSchema.parse(o)
  await pasGebeurtenisToe({ type: 'overboeking.bewaard', payload: geldig })
}

export async function verwijderOverboeking(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'overboeking.verwijderd', payload: { id } })
}

export async function bewaarKind(k: Kind): Promise<void> {
  const geldig = KindSchema.parse(k)
  await pasGebeurtenisToe({ type: 'kind.bewaard', payload: geldig })
}

export async function verwijderKind(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'kind.verwijderd', payload: { id } })
}

export async function bewaarKindrekening(kr: Kindrekening): Promise<void> {
  const geldig = KindrekeningSchema.parse(kr)
  await pasGebeurtenisToe({ type: 'kindrekening.bewaard', payload: geldig })
}

export async function verwijderKindrekening(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'kindrekening.verwijderd', payload: { id } })
}

export async function bewaarKindrekeningpost(post: Kindrekeningpost): Promise<void> {
  const geldig = KindrekeningpostSchema.parse(post)
  await pasGebeurtenisToe({ type: 'kindrekeningpost.bewaard', payload: geldig })
}

export async function verwijderKindrekeningpost(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'kindrekeningpost.verwijderd', payload: { id } })
}

// Ronde 42 — de onderhoudsbijdrage.
export async function bewaarOnderhoudsbijdrage(bijdrage: Onderhoudsbijdrage): Promise<void> {
  const geldig = OnderhoudsbijdrageSchema.parse(bijdrage)
  await pasGebeurtenisToe({ type: 'onderhoudsbijdrage.bewaard', payload: geldig })
}

export async function verwijderOnderhoudsbijdrage(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'onderhoudsbijdrage.verwijderd', payload: { id } })
}

// --- De maandafsluiting (ronde 43) ---
//
// De MAAND is de sleutel: dezelfde maand twee keer afsluiten schrijft hetzelfde
// record, ook vanaf twee toestellen. Dat klopt ook inhoudelijk — een maand is één
// keer nagekeken of niet.
export async function bewaarMaandafsluiting(m: Maandafsluiting): Promise<void> {
  await pasGebeurtenisToe({ type: 'maandafsluiting.bewaard', payload: m })
}

export async function verwijderMaandafsluiting(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'maandafsluiting.verwijderd', payload: { id } })
}

export async function bewaarOnderhoudsbetaling(betaling: Onderhoudsbetaling): Promise<void> {
  const geldig = OnderhoudsbetalingSchema.parse(betaling)
  await pasGebeurtenisToe({ type: 'onderhoudsbetaling.bewaard', payload: geldig })
}

export async function verwijderOnderhoudsbetaling(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'onderhoudsbetaling.verwijderd', payload: { id } })
}

export async function bewaarLening(lening: Lening): Promise<void> {
  const geldig = LeningSchema.parse(lening)
  await pasGebeurtenisToe({ type: 'lening.bewaard', payload: geldig })
}

export async function verwijderLening(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'lening.verwijderd', payload: { id } })
}

export async function bewaarAflossing(aflossing: Aflossing): Promise<void> {
  const geldig = AflossingSchema.parse(aflossing)
  await pasGebeurtenisToe({ type: 'aflossing.bewaard', payload: geldig })
}

export async function verwijderAflossing(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'aflossing.verwijderd', payload: { id } })
}

export async function bewaarGarantie(g: Garantie): Promise<void> {
  const geldig = GarantieSchema.parse(g)
  await pasGebeurtenisToe({ type: 'garantie.bewaard', payload: geldig })
}

export async function verwijderGarantie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'garantie.verwijderd', payload: { id } })
}

export async function bewaarDossierDocument(d: DossierDocument): Promise<void> {
  const geldig = DossierDocumentSchema.parse(d)
  await pasGebeurtenisToe({ type: 'dossierdocument.bewaard', payload: geldig })
}

/**
 * Een document uit de kluis verwijderen, en de verwijzing ernaar mee (ronde 54).
 *
 * Sinds ronde 52 kan een dossier één document aanwijzen als de GRONDSLAG van zijn
 * verdeling — de akte of het vonnis waar de percentages uit komen. Verdween dat
 * document, dan bleef die aanwijzing staan: het dossier wees naar iets dat niet
 * meer bestond. Het scherm ving dat netjes op ("het aangeduide document bestaat
 * niet meer"), maar die melding ging nooit meer weg, ook niet nadat je een ánder
 * document had toegevoegd — je moest zelf raden dat je de keuzelijst opnieuw op
 * "geen" moest zetten.
 *
 * In ÉÉN schrijfactie, om dezelfde reden als bij `verwijderTransactieMetAanhang`:
 * ging de tweede stap mis, dan was het document weg én bleef de dode verwijzing
 * staan — precies de toestand die we wilden vermijden.
 *
 * `grondslagVanDossierId` is het dossier dat dit document aanwees, als dat er is.
 *
 * WAAROM EEN ID EN NIET HET DOSSIER ZELF. Een gebeurtenis 'dossier.bewaard' schrijft
 * het HELE dossier weg, en het logboek werkt met "de laatste schrijver wint". Kreeg
 * deze functie een dossier mee dat het scherm even eerder had ingeladen, dan zette ze
 * die momentopname terug — inclusief een verdeelsleutel die je intussen op je gsm van
 * 65 naar 50 had gezet en die net was binnengekomen via de synchronisatie. Zo'n cijfer
 * belandt later in een afrekening met de andere ouder. Daarom halen we het dossier
 * hier zelf op, vlak vóór het schrijven, en halen we er alleen dat ene veld af.
 *
 * De controle `grondslagDocumentId === id` staat er ook nog eens, zodat een verkeerd
 * meegegeven dossier niet stilzwijgend zijn grondslag verliest.
 */
export async function verwijderDossierDocument(id: string, grondslagVanDossierId?: string): Promise<void> {
  const gebeurtenissen: Parameters<typeof pasGebeurtenissenToe>[0] = [
    { type: 'dossierdocument.verwijderd', payload: { id } },
  ]
  if (grondslagVanDossierId) {
    const dossier = (await laadDossiers()).geldig.find((d) => d.id === grondslagVanDossierId)
    if (dossier && dossier.grondslagDocumentId === id) {
      const opgeschoond: Dossier = { ...dossier }
      // Het veld helemaal WEG, niet op een lege tekst — zelfde keuze als in het
      // scherm zelf, en het schema laat geen lege tekst toe.
      delete opgeschoond.grondslagDocumentId
      gebeurtenissen.push({ type: 'dossier.bewaard', payload: DossierSchema.parse(opgeschoond) })
    }
  }
  await pasGebeurtenissenToe(gebeurtenissen)
}

/**
 * Een verwijderd document terugzetten, samen met de grondslag-verwijzing die eraan
 * hing — als ÉÉN schrijfactie (ronde 54).
 *
 * De tegenhanger van `verwijderDossierDocument` hierboven, en om dezelfde reden
 * ondeelbaar: ging de tweede schrijfactie mis, dan stond het document er weer maar
 * verwees geen enkel dossier er nog naar, terwijl het balkje beloofde dat allebei
 * terugkwamen.
 */
export async function herstelDossierDocument(document: DossierDocument, dossier?: Dossier): Promise<void> {
  const gebeurtenissen: Parameters<typeof pasGebeurtenissenToe>[0] = [
    { type: 'dossierdocument.bewaard', payload: DossierDocumentSchema.parse(document) },
  ]
  if (dossier) gebeurtenissen.push({ type: 'dossier.bewaard', payload: DossierSchema.parse(dossier) })
  await pasGebeurtenissenToe(gebeurtenissen)
}

export async function bewaarStreepjescode(s: Streepjescode): Promise<void> {
  const geldig = StreepjescodeSchema.parse(s)
  await pasGebeurtenisToe({ type: 'streepjescode.bewaard', payload: geldig })
}

export async function verwijderStreepjescode(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'streepjescode.verwijderd', payload: { id } })
}

export async function verwijderTransactie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'transactie.verwijderd', payload: { id } })
}

/**
 * Een transactie verwijderen SAMEN MET wat eraan hangt: de gedeelde kost die eruit
 * ontstaan is, de bon die eraan bewaard werd, en (sinds ronde 36) het
 * garantiebewijs dat je vanuit deze boeking gemaakt hebt.
 *
 * Waarom in één keer (ronde 35): dit gebeurde als drie losse schrijfacties. Faalde
 * de tweede, dan was de transactie weg maar bleef de gedeelde kost als weesrecord
 * in het dossier staan — en telde ze mee in de volgende afrekening met de andere
 * ouder. Ofwel gaat nu alles door, ofwel niets.
 */
export async function verwijderTransactieMetAanhang(
  id: string,
  aanhang: { gedeeldeKostId?: string; documentId?: string; garantieId?: string } = {},
): Promise<void> {
  const gebeurtenissen: Parameters<typeof pasGebeurtenissenToe>[0] = [{ type: 'transactie.verwijderd', payload: { id } }]
  if (aanhang.gedeeldeKostId) {
    gebeurtenissen.push({ type: 'gedeeldekost.verwijderd', payload: { id: aanhang.gedeeldeKostId } })
  }
  if (aanhang.documentId) {
    gebeurtenissen.push({ type: 'dossierdocument.verwijderd', payload: { id: aanhang.documentId } })
  }
  // Het garantiebewijs gaat mee. Anders bleef het achter met een verwijzing naar
  // een boeking die niet meer bestaat, terwijl de bon van die boeking — het
  // aankoopbewijs dat de app beloofde — wél verdween.
  if (aanhang.garantieId) {
    gebeurtenissen.push({ type: 'garantie.verwijderd', payload: { id: aanhang.garantieId } })
  }
  await pasGebeurtenissenToe(gebeurtenissen)
}

/**
 * Meerdere transacties verwijderen mét wat eraan hangt, als ÉÉN ondeelbare stap.
 *
 * Dezelfde reden als hierboven, maar het risico is groter: bij twaalf rijen zijn er
 * meer schrijfacties die halverwege kunnen afbreken, en dan blijven er gedeelde
 * kosten als weesrecord in een dossier meetellen.
 */
export async function verwijderTransactiesMetAanhang(
  ids: string[],
  aanhang: { gedeeldeKostIds?: string[]; documentIds?: string[]; garantieIds?: string[] } = {},
): Promise<void> {
  if (ids.length === 0) return
  const gebeurtenissen: Parameters<typeof pasGebeurtenissenToe>[0] = [
    ...ids.map((id) => ({ type: 'transactie.verwijderd', payload: { id } }) as const),
    ...(aanhang.gedeeldeKostIds ?? []).map((id) => ({ type: 'gedeeldekost.verwijderd', payload: { id } }) as const),
    ...(aanhang.documentIds ?? []).map((id) => ({ type: 'dossierdocument.verwijderd', payload: { id } }) as const),
    ...(aanhang.garantieIds ?? []).map((id) => ({ type: 'garantie.verwijderd', payload: { id } }) as const),
  ]
  await pasGebeurtenissenToe(gebeurtenissen)
}

export async function verwijderRekening(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'rekening.verwijderd', payload: { id } })
}

export async function verwijderCategorie(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'categorie.verwijderd', payload: { id } })
}

export async function verwijderBudget(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'budget.verwijderd', payload: { id } })
}

export async function verwijderGedeeldeKost(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'gedeeldekost.verwijderd', payload: { id } })
}

export async function verwijderDossier(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'dossier.verwijderd', payload: { id } })
}

/**
 * Een afrekening als (niet) overgemaakt markeren, samen met de kosten die ze dekt —
 * in ÉÉN ondeelbare stap (ronde 65).
 *
 * Dezelfde reden als bij het verwijderen hieronder, en het spiegelbeeld ervan: brak
 * dit halverwege af, dan stonden er kosten op 'afgerekend' terwijl de afrekening
 * niet als overgemaakt gemarkeerd was. Dat geld valt dan uit je saldo, en het
 * verwijderen van die afrekening zet het niet terug — dat kijkt immers naar het
 * vinkje 'overgemaakt'.
 */
export async function markeerVerrekeningOvergemaakt(
  verrekening: Verrekening,
  kosten: GedeeldeKost[],
  overgemaakt: boolean,
): Promise<void> {
  await pasGebeurtenissenToe([
    ...kosten.map(
      (k) => ({ type: 'gedeeldekost.bewaard', payload: GedeeldeKostSchema.parse({ ...k, afgerekend: overgemaakt }) }) as const,
    ),
    { type: 'verrekening.bewaard', payload: VerrekeningSchema.parse({ ...verrekening, overgemaakt }) },
  ])
}

/**
 * Een afrekening verwijderen én de kosten die zij dichtzette weer openen — in ÉÉN
 * ondeelbare stap (ronde 65).
 *
 * ⚠ WAAROM DIT NIET IN TWEE STAPPEN MAG. Is een afrekening als 'overgemaakt'
 * gemarkeerd, dan staan de kosten die zij dekt op `afgerekend` en tellen ze niet
 * mee in het openstaande saldo. Verdwijnt de afrekening maar blijven die vlaggen
 * staan — omdat het halverwege afbrak: opslag vol, tabblad dicht, geweigerde
 * schrijfactie — dan valt dat geld uit je saldo terwijl er niets meer bestaat dat
 * uitlegt waarom. Dat is precies de stille fout die deze ronde wil uitroeien, dus
 * ze mag hier niet zelf ontstaan. Nu gaat alles door, of niets.
 *
 * Ook de oude `verrekeningId`-koppeling gaat mee: die telt in `isOpenKost` net zo
 * hard als `afgerekend`, en een kost met een verwijzing naar een afrekening die
 * niet meer bestaat, komt anders nooit meer terug in een saldo.
 */
export async function verwijderVerrekeningMetHeropening(
  id: string,
  heropenen: GedeeldeKost[],
): Promise<void> {
  await pasGebeurtenissenToe([
    { type: 'verrekening.verwijderd', payload: { id } },
    ...heropenen.map((k) => {
      // ⚠ De oude koppeling alleen wissen wanneer ze naar DEZE afrekening wijst. Een
      // kost kan via de andere weg in deze lijst zitten (overgemaakt + afgerekend)
      // en tegelijk een `verrekeningId` naar een ándere afrekening dragen; die
      // koppeling mag hier niet sneuvelen.
      const vanDeze = k.verrekeningId === id
      const { verrekeningId: _oud, ...rest } = k
      return {
        type: 'gedeeldekost.bewaard',
        payload: GedeeldeKostSchema.parse({
          ...rest,
          afgerekend: false,
          ...(vanDeze ? {} : k.verrekeningId ? { verrekeningId: k.verrekeningId } : {}),
        }),
      } as const
    }),
  ])
}

/**
 * Een eigen categorie met alles eronder verwijderen, in ÉÉN ondeelbare stap
 * (ronde 65).
 *
 * Dezelfde reden als hierboven en als bij het dossier: brak het halverwege af, dan
 * bleven de middencategorieën of de items als onzichtbare weesrecords staan — niet
 * meer te zien, niet meer te verwijderen, en wél mee gesynchroniseerd naar je
 * andere toestellen.
 */
export async function verwijderCategorieMetAanhang(
  id: string,
  aanhang: { categorieIds?: string[]; subcategorieIds?: string[] } = {},
): Promise<void> {
  await pasGebeurtenissenToe([
    // De items eerst, dan de middencategorieën, dan de hoofdcategorie. Binnen deze
    // ene transactie maakt dat voor de uitkomst niets uit; het is de volgorde
    // waarin het logboek zich láát lezen — en waarin een ander toestel de regels
    // afspeelt, van blad naar tak naar stam.
    ...(aanhang.subcategorieIds ?? []).map((s) => ({ type: 'subcategorie.verwijderd', payload: { id: s } }) as const),
    ...(aanhang.categorieIds ?? []).map((c) => ({ type: 'categorie.verwijderd', payload: { id: c } }) as const),
    { type: 'categorie.verwijderd', payload: { id } },
  ])
}

/**
 * Een NIEUWE categorietak in één ondeelbare stap: de hoofdcategorie die er nog
 * niet was, de categorie die er nog niet was, en de subcategorie zelf.
 *
 * ⚠ Waarom niet drie losse schrijfacties (ronde 67). Breekt het halverwege af — de
 * opslag zit vol, je sluit het tabblad — dan houd je een lege eigen hoofdcategorie
 * over waar je nooit om vroeg, terwijl je boeking nog altijd geen categorie heeft.
 * Dat is precies de half-af toestand die ronde 65 overal weggewerkt heeft. Nu gaat
 * alles door, of niets.
 */
export async function bewaarNieuweTak(categorieen: Categorie[], subcategorie: Subcategorie): Promise<void> {
  await pasGebeurtenissenToe([
    ...categorieen.map((c) => ({ type: 'categorie.bewaard', payload: CategorieSchema.parse(c) }) as const),
    { type: 'subcategorie.bewaard', payload: SubcategorieSchema.parse(subcategorie) },
  ])
}

/** Een verwijderde categorietak in één keer terugzetten (de ongedaan-balk). */
export async function herstelCategorieMetAanhang(
  categorieen: Categorie[],
  subcategorieen: Subcategorie[],
): Promise<void> {
  await pasGebeurtenissenToe([
    ...categorieen.map((c) => ({ type: 'categorie.bewaard', payload: CategorieSchema.parse(c) }) as const),
    ...subcategorieen.map((s) => ({ type: 'subcategorie.bewaard', payload: SubcategorieSchema.parse(s) }) as const),
  ])
}

/** Een verwijderde afrekening met haar kostenvlaggen in één keer terugzetten. */
export async function herstelVerrekeningMetKosten(
  verrekening: Verrekening,
  kosten: GedeeldeKost[],
): Promise<void> {
  await pasGebeurtenissenToe([
    { type: 'verrekening.bewaard', payload: VerrekeningSchema.parse(verrekening) },
    ...kosten.map((k) => ({ type: 'gedeeldekost.bewaard', payload: GedeeldeKostSchema.parse(k) }) as const),
  ])
}

/**
 * Een verwijderd dossier met alles eraan in één keer terugzetten (ronde 65).
 *
 * ⚠ Het verwijderen was al ondeelbaar; het terugzetten was dat niet. Brak dát
 * halverwege af, dan kreeg je een dossier terug met de helft van zijn kosten,
 * afrekeningen en documenten — en een half bewijsstuk is erger dan geen.
 */
export async function herstelDossierMetAanhang(dossier: Dossier, aanhang: {
  gedeeldeKosten?: GedeeldeKost[]
  verrekeningen?: Verrekening[]
  kindrekeningen?: Kindrekening[]
  kindrekeningposten?: Kindrekeningpost[]
  onderhoudsbijdragen?: Onderhoudsbijdrage[]
  onderhoudsbetalingen?: Onderhoudsbetaling[]
  documenten?: DossierDocument[]
} = {}): Promise<void> {
  await pasGebeurtenissenToe([
    // Het dossier eerst, dan wat eraan hangt: zo leest het logboek zich van stam
    // naar tak, en speelt een ander toestel de regels in die volgorde af.
    { type: 'dossier.bewaard', payload: DossierSchema.parse(dossier) },
    ...(aanhang.gedeeldeKosten ?? []).map((k) => ({ type: 'gedeeldekost.bewaard', payload: GedeeldeKostSchema.parse(k) }) as const),
    ...(aanhang.verrekeningen ?? []).map((v) => ({ type: 'verrekening.bewaard', payload: VerrekeningSchema.parse(v) }) as const),
    ...(aanhang.kindrekeningen ?? []).map((k) => ({ type: 'kindrekening.bewaard', payload: KindrekeningSchema.parse(k) }) as const),
    ...(aanhang.kindrekeningposten ?? []).map((p) => ({ type: 'kindrekeningpost.bewaard', payload: KindrekeningpostSchema.parse(p) }) as const),
    ...(aanhang.onderhoudsbijdragen ?? []).map((b) => ({ type: 'onderhoudsbijdrage.bewaard', payload: OnderhoudsbijdrageSchema.parse(b) }) as const),
    ...(aanhang.onderhoudsbetalingen ?? []).map((b) => ({ type: 'onderhoudsbetaling.bewaard', payload: OnderhoudsbetalingSchema.parse(b) }) as const),
    ...(aanhang.documenten ?? []).map((d) => ({ type: 'dossierdocument.bewaard', payload: DossierDocumentSchema.parse(d) }) as const),
  ])
}

/**
 * Een dossier verwijderen SAMEN MET alles wat eraan hangt, als één ondeelbare stap.
 *
 * Waarom (ronde 35): dit gebeurde als vijf losse reeksen schrijfacties na elkaar —
 * het dossier, dan de kosten, dan de afrekeningen, dan de kindrekeningposten, dan
 * de kindrekeningen. Bij een dossier met dertig kosten zijn dat ruim dertig
 * momenten waarop het kan afbreken (opslag vol, tabblad gesloten, browser die de
 * schrijfactie weigert). Brak het halverwege af, dan was het dossier zelf al weg,
 * maar bleven de kosten als onzichtbare weesrecords in de database staan — én
 * werden ze mee gesynchroniseerd naar je andere toestellen. Dat is precies het
 * soort stille fout dat later een verkeerde afrekening met de andere ouder
 * oplevert. Nu gaat alles door, of niets.
 */

export async function verwijderDossierMetAanhang(
  id: string,
  aanhang: {
    gedeeldeKostIds?: string[]
    verrekeningIds?: string[]
    kindrekeningIds?: string[]
    kindrekeningpostIds?: string[]
    onderhoudsbijdrageIds?: string[]
    onderhoudsbetalingIds?: string[]
    // De documenten in de kluis van dit dossier (ronde 55). Bleven ze staan, dan
    // bleef elke foto en elke scan als data-URL in de database én in ELKE back-up
    // staan, met een `dossierId` dat nergens meer naar wijst: onzichtbaar, niet meer
    // te verwijderen, en het zwaarste wat de app bewaart.
    documentIds?: string[]
  } = {},
): Promise<void> {
  await pasGebeurtenissenToe([
    { type: 'dossier.verwijderd', payload: { id } },
    ...(aanhang.gedeeldeKostIds ?? []).map((k) => ({ type: 'gedeeldekost.verwijderd', payload: { id: k } }) as const),
    ...(aanhang.verrekeningIds ?? []).map((v) => ({ type: 'verrekening.verwijderd', payload: { id: v } }) as const),
    ...(aanhang.kindrekeningpostIds ?? []).map(
      (p) => ({ type: 'kindrekeningpost.verwijderd', payload: { id: p } }) as const,
    ),
    ...(aanhang.kindrekeningIds ?? []).map((k) => ({ type: 'kindrekening.verwijderd', payload: { id: k } }) as const),
    // De betalingen vóór de bijdrage: een betaling hangt aan een bijdrage, dus zo
    // leest het logboek zich van blad naar tak.
    ...(aanhang.onderhoudsbetalingIds ?? []).map(
      (b) => ({ type: 'onderhoudsbetaling.verwijderd', payload: { id: b } }) as const,
    ),
    ...(aanhang.onderhoudsbijdrageIds ?? []).map(
      (b) => ({ type: 'onderhoudsbijdrage.verwijderd', payload: { id: b } }) as const,
    ),
    ...(aanhang.documentIds ?? []).map((d) => ({ type: 'dossierdocument.verwijderd', payload: { id: d } }) as const),
  ])
}

// --- Lezen ---
// Bij het laden controleren we elk record opnieuw. Een corrupt of onverwacht
// record wordt overgeslagen én geteld, in plaats van de app te laten crashen of
// stil foute cijfers te tonen.
export type LeesResultaat<T> = {
  geldig: T[]
  ongeldig: number
}

function valideerLijst<T>(ruw: unknown[], schema: ZodType<T>): LeesResultaat<T> {
  const geldig: T[] = []
  let ongeldig = 0
  for (const item of ruw) {
    const resultaat = schema.safeParse(item)
    if (resultaat.success) {
      geldig.push(resultaat.data)
    } else {
      ongeldig++
      console.error('Ongeldig record overgeslagen bij het laden:', item, resultaat.error.issues)
    }
  }
  return { geldig, ongeldig }
}

export async function laadTransacties(): Promise<LeesResultaat<Transactie>> {
  return valideerLijst(await db.transacties.toArray(), TransactieSchema)
}

export async function laadRekeningen(): Promise<LeesResultaat<Rekening>> {
  return valideerLijst(await db.rekeningen.toArray(), RekeningSchema)
}

export async function laadCategorieen(): Promise<LeesResultaat<Categorie>> {
  return valideerLijst(await db.categorieen.toArray(), CategorieSchema)
}

export async function laadBudgetten(): Promise<LeesResultaat<Budget>> {
  return valideerLijst(await db.budgetten.toArray(), BudgetSchema)
}

export async function laadDossiers(): Promise<LeesResultaat<Dossier>> {
  return valideerLijst(await db.dossiers.toArray(), DossierSchema)
}

export async function laadGedeeldeKosten(): Promise<LeesResultaat<GedeeldeKost>> {
  return valideerLijst(await db.gedeeldeKosten.toArray(), GedeeldeKostSchema)
}

export async function laadVerrekeningen(): Promise<LeesResultaat<Verrekening>> {
  return valideerLijst(await db.verrekeningen.toArray(), VerrekeningSchema)
}

export async function laadTerugkerendePosten(): Promise<LeesResultaat<TerugkerendePost>> {
  return valideerLijst(await db.terugkerendePosten.toArray(), TerugkerendePostSchema)
}

export async function laadSpaardoelen(): Promise<LeesResultaat<Spaardoel>> {
  return valideerLijst(await db.spaardoelen.toArray(), SpaardoelSchema)
}

export async function laadSubcategorieen(): Promise<LeesResultaat<Subcategorie>> {
  return valideerLijst(await db.subcategorieen.toArray(), SubcategorieSchema)
}

export async function laadOverboekingen(): Promise<LeesResultaat<Overboeking>> {
  return valideerLijst(await db.overboekingen.toArray(), OverboekingSchema)
}

export async function laadKinderen(): Promise<LeesResultaat<Kind>> {
  return valideerLijst(await db.kinderen.toArray(), KindSchema)
}

export async function laadKindrekeningen(): Promise<LeesResultaat<Kindrekening>> {
  return valideerLijst(await db.kindrekeningen.toArray(), KindrekeningSchema)
}

export async function laadKindrekeningposten(): Promise<LeesResultaat<Kindrekeningpost>> {
  return valideerLijst(await db.kindrekeningposten.toArray(), KindrekeningpostSchema)
}

export async function laadOnderhoudsbijdragen(): Promise<LeesResultaat<Onderhoudsbijdrage>> {
  return valideerLijst(await db.onderhoudsbijdragen.toArray(), OnderhoudsbijdrageSchema)
}

export async function laadOnderhoudsbetalingen(): Promise<LeesResultaat<Onderhoudsbetaling>> {
  return valideerLijst(await db.onderhoudsbetalingen.toArray(), OnderhoudsbetalingSchema)
}

export async function laadMaandafsluitingen(): Promise<LeesResultaat<Maandafsluiting>> {
  return valideerLijst(await db.maandafsluitingen.toArray(), MaandafsluitingSchema)
}

export async function laadLeningen(): Promise<LeesResultaat<Lening>> {
  return valideerLijst(await db.leningen.toArray(), LeningSchema)
}

export async function laadAflossingen(): Promise<LeesResultaat<Aflossing>> {
  return valideerLijst(await db.aflossingen.toArray(), AflossingSchema)
}

export async function laadDossierDocumenten(): Promise<LeesResultaat<DossierDocument>> {
  return valideerLijst(await db.dossierdocumenten.toArray(), DossierDocumentSchema)
}

export async function laadGaranties(): Promise<LeesResultaat<Garantie>> {
  return valideerLijst(await db.garanties.toArray(), GarantieSchema)
}

export async function laadStreepjescodes(): Promise<LeesResultaat<Streepjescode>> {
  return valideerLijst(await db.streepjescodes.toArray(), StreepjescodeSchema)
}

// De volgorde die de gebruiker zelf koos. Eén record per lijst; vandaag bestaat
// alleen 'hoofdcategorieen'. Zie OrdeningSchema voor het waarom.
export async function bewaarOrdening(o: Ordening): Promise<void> {
  const geldig = OrdeningSchema.parse(o)
  await pasGebeurtenisToe({ type: 'ordening.bewaard', payload: geldig })
}

export async function laadOrdeningen(): Promise<LeesResultaat<Ordening>> {
  return valideerLijst(await db.ordeningen.toArray(), OrdeningSchema)
}

// Waarderingen: "op deze dag stond er dit op deze rekening" (ronde 38).
export async function bewaarWaardering(w: Waardering): Promise<void> {
  const geldig = WaarderingSchema.parse(w)
  await pasGebeurtenisToe({ type: 'waardering.bewaard', payload: geldig })
}

export async function verwijderWaardering(id: string): Promise<void> {
  await pasGebeurtenisToe({ type: 'waardering.verwijderd', payload: { id } })
}

export async function laadWaarderingen(): Promise<LeesResultaat<Waardering>> {
  return valideerLijst(await db.waarderingen.toArray(), WaarderingSchema)
}
