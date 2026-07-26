import { z } from 'zod'

// De schemas zijn de 'poortwachters' van je data. Elk stuk data dat de database
// in of uit gaat, wordt hiertegen gecontroleerd. De TypeScript-types worden
// automatisch afgeleid, zodat schema en type nooit uit elkaar lopen.
//
// GELD: alle bedragen worden bewaard als GEHELE CENTEN (integers), nooit als
// euro's met drijvende komma. €12,50 = 1250. Zo kan er nooit centen-drift
// ontstaan bij optellen (het klassieke 0,1 + 0,2 ≠ 0,3). Bij weergave/invoer
// wordt omgerekend via de helpers in utils/format.ts.

// De types rekening. De sleutels ('betaal', ...) zijn taal-onafhankelijk en
// worden pas bij weergave vertaald; de opgeslagen waarde blijft altijd de sleutel.
export const REKENING_TYPES = ['betaal', 'spaar', 'termijn', 'effecten', 'cash'] as const
export type RekeningType = (typeof REKENING_TYPES)[number]

export const RekeningSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  beginsaldo: z.number().int(), // in centen
  // Alle onderstaande velden zijn optioneel, zodat bestaande rekeningen (van vóór
  // deze uitbreiding) geldig blijven zonder migratie.
  type: z.enum(REKENING_TYPES).optional(),
  rekeningnummer: z.string().optional(), // IBAN of ander rekeningnummer
  rubriek: z.string().optional(), // vrije rubriek-/groepsnaam
  gearchiveerd: z.boolean().optional(), // afgesloten/oud: verborgen in keuzelijsten
})
export type Rekening = z.infer<typeof RekeningSchema>

export const CategorieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  // Een eigen categorie mag, net als de ingebouwde hoofdcategorieën, een icoon en
  // een kleur dragen. Zonder die twee toont de transactielijst de beginletter van
  // de handelaar en blijft de grafiek op haar standaardkleur. Beide optioneel,
  // dus bestaande categorieën blijven geldig — geen migratie.
  icoon: z.string().min(1).max(8).optional(),
  kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'kleur moet #rrggbb zijn').optional(),
})
export type Categorie = z.infer<typeof CategorieSchema>

// Eén deelregel (kassaticketlijn): een product/omschrijving met zijn bedrag en
// (optioneel) een categorie/item. Bedrag in centen, met hetzelfde teken als het
// totaal. De som van de regels hoeft niet exact het totaal te dekken; een niet-
// verdeeld restbedrag wordt bij het optellen als 'Zonder categorie' geteld (zie
// utils/transactie.ts), zodat een gedeeltelijk ingevuld ticket toch altijd klopt.
export const TransactieRegelSchema = z.object({
  categorieId: z.string().min(1).optional(),
  omschrijving: z.string().optional(),
  bedrag: z.number().int(),
})
export type TransactieRegel = z.infer<typeof TransactieRegelSchema>

export const TransactieSchema = z.object({
  id: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  omschrijving: z.string(), // handelaar/winkel
  bedrag: z.number().int(), // in centen; positief = inkomst, negatief = uitgave (totaal)
  rekeningId: z.string().min(1),
  categorieId: z.string().min(1).optional(),
  // Optionele uitsplitsing (kassaticket) over meerdere regels.
  regels: z.array(TransactieRegelSchema).optional(),
  // Optioneel: voor of door welke gezinsleden was deze uitgave? Bewust op het
  // niveau van de hele transactie en niet per ticketregel — dat laatste zou de
  // splitsingslogica verdubbelen en elke ticketinvoer traag maken.
  persoonIds: z.array(z.string().min(1)).optional(),
})
export type Transactie = z.infer<typeof TransactieSchema>

export const BudgetSchema = z.object({
  id: z.string().min(1),
  categorieId: z.string().min(1),
  bedrag: z.number().int().positive(), // maandbudget in centen, altijd positief
})
export type Budget = z.infer<typeof BudgetSchema>

// Een kind (of algemener: een partij) waaraan gedeelde kosten toegewezen kunnen
// worden. Globale lijst, herbruikbaar in elk dossier. De naam is de weergave; de
// id is de taal-onafhankelijke sleutel.
// De rollen die een gezinslid kan hebben. Puur informatief: de app rekent er
// niets mee, ze helpen enkel om de lijst leesbaar te houden.
export const GEZINSROLLEN = ['kind', 'partner', 'ikzelf', 'ander'] as const
export type Gezinsrol = (typeof GEZINSROLLEN)[number]

// Een gezinslid. LET OP: intern heet dit nog altijd "kind" — het event-type
// 'kind.bewaard' en het veld 'kindIds' staan letterlijk in élke bestaande
// logregel en in elke Google Drive-back-up. Hernoemen zou de volledige
// geschiedenis herschrijven, wat haaks staat op het append-only-model. In de app
// spreken we van "gezinsleden"; onder water blijft alles ongewijzigd.
// De extra velden zijn OPTIONEEL, zodat bestaande records geldig blijven.
export const KindSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  rol: z.enum(GEZINSROLLEN).optional(),
  gearchiveerd: z.boolean().optional(),
})
export type Kind = z.infer<typeof KindSchema>
/** Nieuwe naam voor hetzelfde ding; gebruik deze in nieuwe code. */
export type Gezinslid = Kind

// De twee kostensoorten uit de Belgische praktijk. 'gewoon' = de dagelijkse,
// terugkerende kosten; 'buitengewoon' = uitzonderlijke, noodzakelijke of
// onvoorzienbare uitgaven die het gewone budget overschrijden (KB 22 april 2019).
export const KOSTENTYPES = ['gewoon', 'buitengewoon'] as const
export type Kostentype = (typeof KOSTENTYPES)[number]

// Een dossier voor gedeelde kosten (bv. tussen co-ouders). 'aandeelJij' is het
// STANDAARD-percentage (0-100) van elke kost dat jij hoort te dragen. Dit kan per
// categorie overschreven worden via 'categorieAandelen' (categorie-id -> jouw %),
// en per losse kost via 'aandeelJijOverride'. Zo krijg je de verdeel-hiërarchie
// dossier -> categorie -> kost.
export const DossierSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  aandeelJij: z.number().min(0).max(100),
  categorieAandelen: z.record(z.string(), z.number().min(0).max(100)).optional(),
  // Verdeling per KOSTENSOORT (gewoon vs buitengewoon). In de Belgische praktijk
  // wordt daar vaak een andere sleutel voor afgesproken: gewone kosten volgen de
  // dossier-standaard, buitengewone kosten (medisch, schools, ontwikkeling — KB
  // 22 april 2019) bijvoorbeeld strikt 50/50. Optioneel, dus bestaande dossiers
  // blijven geldig en gedragen zich exact zoals voorheen.
  typeAandelen: z.record(z.enum(KOSTENTYPES), z.number().min(0).max(100)).optional(),
})
export type Dossier = z.infer<typeof DossierSchema>

export const GedeeldeKostSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1),
  omschrijving: z.string(),
  bedrag: z.number().int().positive(), // in centen
  betaaldDoor: z.enum(['jij', 'partner']),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  // Zodra een kost in een afrekening is vastgelegd, verwijst dit naar die
  // afrekening. Open (nog niet afgerekende) kosten hebben dit veld niet.
  verrekeningId: z.string().min(1).optional(),
  // Uitbreidingen (allemaal optioneel, zodat bestaande kosten geldig blijven):
  // aan welke kinderen de kost hoort, een (optionele) categorie, het kostentype,
  // en een eigen verdeel-percentage dat de dossier-/categorie-standaard overschrijft.
  kindIds: z.array(z.string()).optional(),
  categorieId: z.string().min(1).optional(),
  kostenType: z.enum(KOSTENTYPES).optional(),
  aandeelJijOverride: z.number().min(0).max(100).optional(),
  // Losse afgerekend-status: staat los van het genereren van een afrekening.
  // Een kost is pas 'afgerekend' als de bijhorende afrekening als overgemaakt is
  // gemarkeerd. Zolang dat niet zo is, telt ze mee in het openstaande saldo.
  afgerekend: z.boolean().optional(),
  // Bon/factuur als (verkleinde) data-URL. Bewust optioneel en klein gehouden.
  bonnetje: z.string().optional(),
})
export type GedeeldeKost = z.infer<typeof GedeeldeKostSchema>

// Een afrekening: een momentopname van het te verrekenen bedrag over een gekozen
// periode en (optioneel) voor bepaalde kinderen. Het genereren blokkeert niets —
// meerdere afrekeningen mogen naast elkaar bestaan. Pas als je ze als
// 'overgemaakt' markeert, worden de opgenomen kosten afgerekend (en tellen ze niet
// meer mee in het openstaande saldo). 'kostIds' is de momentopname van welke kosten
// deze afrekening dekt.
export const VerrekeningSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  bedrag: z.number().int(), // in centen; positief = partner was jou verschuldigd
  periodeVan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodeTot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kindIds: z.array(z.string()).optional(),
  kostIds: z.array(z.string()).optional(),
  overgemaakt: z.boolean().optional(),
})
export type Verrekening = z.infer<typeof VerrekeningSchema>

// Een terugkerende (vaste) post, bv. huur of een abonnement. 'dag' is de dag van
// de maand (1-28, zodat elke maand gedekt is). Bij het inboeken wordt hij een
// gewone transactie.
export const TerugkerendePostSchema = z.object({
  id: z.string().min(1),
  omschrijving: z.string().min(1),
  bedrag: z.number().int(), // in centen; positief = inkomst, negatief = uitgave
  rekeningId: z.string().min(1),
  categorieId: z.string().min(1).optional(),
  dag: z.number().int().min(1).max(28),
})
export type TerugkerendePost = z.infer<typeof TerugkerendePostSchema>

// Een door de gebruiker toegevoegde of gewijzigde subcategorie (item) bovenop de
// vaste, ingebouwde categorieboom. 'categorieId' is de mid-categorie (cat-*)
// waaronder het valt. Is 'id' gelijk aan een ingebouwd item, dan overschrijft
// deze aanpassing dat item (bv. een hernoeming); anders is het een nieuw item.
export const SubcategorieSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  categorieId: z.string().min(1),
  synoniemen: z.array(z.string()).optional(),
})
export type Subcategorie = z.infer<typeof SubcategorieSchema>

// Een spaardoel: een langetermijndoel met een doelbedrag. Het huidige bedrag
// wordt manueel bijgehouden, of - als er een rekening aan gekoppeld is - afgeleid
// uit het saldo van die rekening. Bedragen in centen.
export const SpaardoelSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  doelbedrag: z.number().int().positive(),
  huidigBedrag: z.number().int(), // manueel bijgehouden bedrag
  doeldatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn').optional(),
  gekoppeldeRekeningId: z.string().min(1).optional(),
  maandbedrag: z.number().int().positive().optional(), // maandelijks streefbedrag
  kleur: z.string().optional(),
  icoon: z.string().min(1).max(8).optional(), // optioneel eigen icoon, zoals bij categorieën
  persoonId: z.string().min(1).optional(), // optioneel: doel op naam van een gezinslid
})
export type Spaardoel = z.infer<typeof SpaardoelSchema>

// Een interne overboeking tussen twee EIGEN rekeningen. Dit is geen inkomst of
// uitgave: het geld verlaat je vermogen niet, het verschuift enkel. Daarom telt
// een overboeking nooit mee in het maandoverzicht, de budgetten of de grafieken.
// 'bedrag' is altijd positief (in centen); de richting zit in van/naar.
export const OverboekingSchema = z.object({
  id: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  vanRekeningId: z.string().min(1),
  naarRekeningId: z.string().min(1),
  bedrag: z.number().int().positive(),
  omschrijving: z.string().optional(),
})
export type Overboeking = z.infer<typeof OverboekingSchema>

// Een kindrekening: een gezamenlijke pot bij een dossier waar beide ouders
// periodiek op storten en waaruit gedeelde kosten rechtstreeks betaald worden.
// Dit is een tweede manier van afrekenen naast het verschil-model, en is kiesbaar
// per dossier (hoogstens één pot per dossier). 'beginsaldo' is het startsaldo van
// de pot (centen). De maandbijdrage per ouder is de afgesproken periodieke storting
// (basisbedrag in centen); ze kan geïndexeerd worden via de Belgische formule
// (aanvangsindex + huidige index). 'bijdrageStart' is de eerste maand van de
// afspraak, gebruikt om te tonen wie achterloopt met storten.
export const KindrekeningSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1),
  naam: z.string().min(1),
  beginsaldo: z.number().int(), // in centen
  maandbijdrageJij: z.number().int().nonnegative().optional(),
  maandbijdragePartner: z.number().int().nonnegative().optional(),
  bijdrageStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  aanvangsindex: z.number().positive().optional(),
  huidigeIndex: z.number().positive().optional(),
})
export type Kindrekening = z.infer<typeof KindrekeningSchema>

// Eén beweging op de kindrekening: een storting (door een ouder) of een uitgave
// (een kost betaald vanuit de pot). 'bedrag' is altijd positief (in centen); de
// richting zit in 'soort'. Bij een storting zegt 'door' welke ouder stortte; bij
// een uitgave kan de post aan kinderen/een categorie gekoppeld worden en een
// bon/factuur dragen.
export const KindrekeningpostSchema = z.object({
  id: z.string().min(1),
  kindrekeningId: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  soort: z.enum(['storting', 'uitgave']),
  bedrag: z.number().int().positive(), // in centen
  door: z.enum(['jij', 'partner']).optional(),
  omschrijving: z.string().optional(),
  kindIds: z.array(z.string()).optional(),
  categorieId: z.string().min(1).optional(),
  bonnetje: z.string().optional(),
})
export type Kindrekeningpost = z.infer<typeof KindrekeningpostSchema>

// De richting van een lening/krediet. Taal-onafhankelijke sleutels:
//   'uitgeleend' = jij leende geld uit, iemand is jou nog iets verschuldigd.
//   'geleend'    = jij leende zelf / een krediet dat jij afbetaalt.
export const LENING_RICHTINGEN = ['uitgeleend', 'geleend'] as const
export type LeningRichting = (typeof LENING_RICHTINGEN)[number]

// Eén lening of krediet. Dezelfde vorm dekt beide richtingen. 'hoofdsom' is het
// startbedrag (of het openstaand kapitaal op de startdatum), in centen. Het
// openstaand kapitaal wordt afgeleid uit de hoofdsom min de gelogde aflossingen.
// De rente/maandbedrag/einddatum-velden zijn vooral nuttig voor een krediet dat
// jij afbetaalt, en zijn allemaal optioneel.
export const LeningSchema = z.object({
  id: z.string().min(1),
  naam: z.string().min(1),
  richting: z.enum(LENING_RICHTINGEN),
  hoofdsom: z.number().int().positive(), // in centen
  startdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  tegenpartij: z.string().optional(), // wie: persoon of kredietgever
  rentevoet: z.number().nonnegative().optional(), // jaarlijkse % (informatief)
  maandbedrag: z.number().int().positive().optional(), // afgesproken maandaflossing (centen)
  einddatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // afgesproken termijn
  omschrijving: z.string().optional(),
  afgesloten: z.boolean().optional(), // manueel afgesloten/gearchiveerd
  bonnetje: z.string().optional(), // contract/bewijs als (verkleinde) data-URL
  persoonId: z.string().min(1).optional(), // optioneel: aan/van welk gezinslid
})
export type Lening = z.infer<typeof LeningSchema>

// Eén aflossing (terugbetaling) op een lening/krediet. Bedrag altijd positief in
// centen; het verlaagt het openstaand kapitaal.
export const AflossingSchema = z.object({
  id: z.string().min(1),
  leningId: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  bedrag: z.number().int().positive(), // in centen
  omschrijving: z.string().optional(),
})
export type Aflossing = z.infer<typeof AflossingSchema>

// Een aankoop met garantie. 'garantieMaanden' is de garantieperiode in maanden
// (standaard 24 = de Belgische wettelijke garantie van 2 jaar; tweedehands minstens
// 12; een commerciële garantie kan langer). De vervaldatum wordt afgeleid uit de
// aankoopdatum + de garantieperiode (zie utils/garantie.ts). Een aankoop kan
// optioneel aan een bestaande transactie gekoppeld worden of losstaan.
export const GarantieSchema = z.object({
  id: z.string().min(1),
  product: z.string().min(1),
  aankoopdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  garantieMaanden: z.number().int().positive(),
  winkel: z.string().optional(),
  prijs: z.number().int().nonnegative().optional(), // in centen
  transactieId: z.string().min(1).optional(),
  notitie: z.string().optional(),
  bonnetje: z.string().optional(), // bon/factuur als (verkleinde) data-URL
  persoonId: z.string().min(1).optional(), // optioneel: van welk gezinslid is dit
})
export type Garantie = z.infer<typeof GarantieSchema>

// Een onthouden streepjescode: koppelt een barcode aan een productnaam (en
// optioneel een categorie en Nutri-Score), zodat een volgende scan van hetzelfde
// product meteen werkt — ook offline en voor niet-voeding die je één keer benoemt.
// De 'id' IS de barcode zelf. Wordt mee gesynct, dus je onthouden producten volgen
// je over toestellen.
export const StreepjescodeSchema = z.object({
  id: z.string().min(1), // de barcode
  naam: z.string().min(1),
  categorieId: z.string().min(1).optional(),
  nutriScore: z.string().optional(), // 'a'..'e' (Open Food Facts)
})
export type Streepjescode = z.infer<typeof StreepjescodeSchema>

// De soorten documenten die in een documentkluis passen. Deze waarden worden
// opgeslagen en zijn dus taal-onafhankelijk; alleen de weergavenaam wordt vertaald.
export const DOCUMENTSOORTEN = ['overeenkomst', 'attest', 'bon', 'vonnis', 'ander'] as const
export type Documentsoort = (typeof DOCUMENTSOORTEN)[number]

// Een document in een kluis: de ouderschapsovereenkomst, een schoolattest, een
// bonnetje, een vonnis, een leningovereenkomst of een garantiebewijs. Het bestand
// zelf zit als data-URL in 'bestand' (afbeeldingen worden verkleind vóór het
// bewaren, zie utils/afbeelding.ts), zodat alles lokaal blijft en gewoon mee in de
// back-up gaat.
//
// Een document hangt aan PRECIES ÉÉN eigenaar: een dossier, een lening of een
// garantie. Alle drie de velden zijn optioneel, zodat documenten van vóór deze
// uitbreiding (die enkel 'dossierId' hebben) geldig blijven — geen migratie. Welke
// eigenaar het is, lees je met eigenaarVanDocument() in utils/kluis.ts.
export const DossierDocumentSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1).optional(),
  leningId: z.string().min(1).optional(),
  garantieId: z.string().min(1).optional(),
  naam: z.string().min(1),
  soort: z.enum(DOCUMENTSOORTEN),
  bestand: z.string().min(1), // data-URL
  bestandsnaam: z.string().optional(),
  toegevoegdOp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  notitie: z.string().optional(),
})
export type DossierDocument = z.infer<typeof DossierDocumentSchema>
