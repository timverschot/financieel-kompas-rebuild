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
export const REKENING_TYPES = ['betaal', 'spaar', 'termijn', 'effecten', 'cash', 'krediet'] as const
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
  // De twee velden hieronder horen bij het type 'krediet' (ronde 38).
  //
  // Waarom een eigen type en niet gewoon een betaalrekening met een negatief
  // saldo: dat rekende toevallig juist, maar de kaart stond dan met de badge
  // "Betaalrekening" tussen je echte rekeningen, en de app kon niet weten dat een
  // negatief saldo hier een SCHULD met een vervaldag is in plaats van een
  // vergissing. Met een eigen type kunnen we dat wél zeggen.
  //
  // 'kredietlimiet' is de toegestane opname als POSITIEF getal in centen, ook al
  // staat het saldo negatief. Zo blijft "hoeveel kan ik nog opnemen" een gewone
  // aftrekking in plaats van een tekenpuzzel.
  kredietlimiet: z.number().int().positive().optional(),
  // De dag van de maand waarop de kaartrekening wordt AFGESLOTEN (1-28, dezelfde
  // grens als bij een terugkerende post, zodat elke maand gedekt is).
  afrekendag: z.number().int().min(1).max(28).optional(),
  // De dag waarop het afgesloten bedrag effectief van je betaalrekening gaat.
  //
  // Dit is een ANDERE dag dan de afsluitdag, en dat verschil is precies waarom dit
  // veld bestaat. Tussen de afsluiting en de afboeking loopt de volgende periode al,
  // terwijl het afgesloten bedrag nog niet betaald is en dus nog steeds op je limiet
  // weegt. Met alleen een afsluitdag kan de app dat tussenstuk niet benoemen.
  afboekdag: z.number().int().min(1).max(28).optional(),
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
  // WAARONDER deze categorie hangt. Dit maakt van de vlakke eigen-categorielijst
  // een echte boom, net als bij de ingebouwde categorieën:
  //
  //   ontbreekt        → een eigen HOOFDcategorie (het gedrag van vóór ronde 27,
  //                      dus elke bestaande categorie blijft precies wat ze was)
  //   ingevuld         → een eigen MIDDENcategorie, hangend onder die ouder. De
  //                      ouder mag een eigen hoofdcategorie zijn óf een ingebouwde
  //                      (ov-*), zodat je ook onder "Voeding" iets eigens kan zetten.
  //
  // Onder zo'n eigen middencategorie kan je vervolgens gewone subcategorieën
  // hangen (SubcategorieSchema), en dan is de boom hoofd → categorie → item ook
  // voor je eigen categorieën compleet.
  ouderId: z.string().min(1).optional(),
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
  // WANNEER je deze boeking hebt ingevoerd (ISO-tijdstempel met tijd), los van de
  // datum waarop ze plaatsvond. Alleen om binnen dezelfde dag te sorteren: tik je
  // 's avonds vijf bonnetjes van vandaag in, dan hoort het laatst ingetikte
  // bovenaan te staan. Zonder dit veld viel de app terug op alfabetische volgorde
  // op handelaarsnaam, en dan verdwijnt wat je net boekte ergens in het midden.
  //
  // Wordt bij het BEWERKEN bewust niet bijgewerkt: je wil dat een oude boeking waar
  // je een typfout in verbetert, op haar plaats blijft staan.
  //
  // Dit is een tijdstip, geen kalenderdatum — hier mag `toISOString()` dus wél
  // (zie de waarschuwing in utils/datum.ts, die over datums gaat).
  ingevoerdOp: z.string().datetime().optional(),
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
  // Welke onderdelen van dit dossier je NIET wil zien. Niet elk dossier gebruikt
  // alle mogelijkheden: de ene co-ouder rekent alles fiftyfifty af en heeft dus
  // geen verdeelsleutel per categorie nodig, de andere heeft geen gezamenlijke
  // pot. Die kaarten blijven anders eeuwig meescrollen.
  //
  // Twee bewuste keuzes:
  // 1. We bewaren wat VERBORGEN is, niet wat zichtbaar is. Ontbreekt het veld,
  //    dan is alles zichtbaar — precies het oude gedrag, dus geen migratie. En
  //    komt er ooit een vijfde onderdeel bij, dan is dat meteen zichtbaar in
  //    bestaande dossiers in plaats van stil te ontbreken.
  // 2. Dit staat op het DOSSIER, niet in localStorage. Of de gezamenlijke pot van
  //    toepassing is, is een eigenschap van de afspraak met de andere ouder — niet
  //    van het toestel waarop je toevallig kijkt. Zo klopt het ook op je gsm.
  //
  // Onbekende sleutels worden bewust toegelaten (gewone strings): een dossier dat
  // op een nieuwere versie een onderdeel verborg, mag op een oudere versie niet
  // ongeldig worden en uit de replay vallen.
  verborgenOnderdelen: z.array(z.string()).optional(),
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
  // Uit welke gewone transactie deze kost ontstaan is, wanneer je ze rechtstreeks
  // in de invoerpopup aan een dossier hing. De link loopt bewust DEZE kant op:
  // 'TransactieSchema' blijft ongemoeid, zodat een transactie niets van dossiers
  // hoeft te weten. Optioneel, dus bestaande kosten blijven geldig — geen migratie.
  //
  // Waarom er überhaupt een link is: zonder dit veld zou een tweede bewaring van
  // dezelfde transactie een tweede gedeelde kost maken, en zou je de koppeling
  // nooit meer kunnen terugvinden of weghalen.
  transactieId: z.string().min(1).optional(),
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

// Hoe vaak een vaste last terugkomt. De sleutels zijn taal-onafhankelijk; het
// getal erachter (zie utils/vastelast.ts) is het aantal maanden tussen twee
// betalingen.
export const FREQUENTIES = ['maand', 'kwartaal', 'semester', 'jaar'] as const
export type Frequentie = (typeof FREQUENTIES)[number]

// Een terugkerende (vaste) post, bv. huur, een abonnement of een jaarlijkse
// verzekering. 'dag' is de dag van de maand (1-28, zodat elke maand gedekt is).
// Bij het inboeken wordt hij een gewone transactie.
export const TerugkerendePostSchema = z.object({
  id: z.string().min(1),
  omschrijving: z.string().min(1),
  bedrag: z.number().int(), // in centen; positief = inkomst, negatief = uitgave
  rekeningId: z.string().min(1),
  categorieId: z.string().min(1).optional(),
  dag: z.number().int().min(1).max(28),
  // Onderstaande drie velden zijn OPTIONEEL, zodat elke bestaande post geldig
  // blijft en zich exact gedraagt zoals voorheen: maandelijks, elke maand.
  //
  // 'frequentie' ontbreekt = 'maand'.
  frequentie: z.enum(FREQUENTIES).optional(),
  // De maand van de EERSTE betaling ('JJJJ-MM'). Het ritme telt vanaf daar, niet
  // vanaf het kalenderkwartaal: een halfjaarlijkse post die in augustus begint,
  // valt in februari en augustus — niet in januari en juli. Ontbreekt dit veld bij
  // een niet-maandelijkse post, dan valt ze terug op de maand waarin je haar
  // aanmaakt (het formulier vult dat in).
  startMaand: z.string().regex(/^\d{4}-\d{2}$/, 'maand moet JJJJ-MM zijn').optional(),
  // De maand waarin de post STOPT ('JJJJ-MM'), bijvoorbeeld omdat je het
  // abonnement opzegt of de lening afloopt. Vanaf DEZE maand telt hij niet meer
  // mee — de laatste betaling is dus de maand ervóór.
  //
  // Waarom dit veld er is (ronde 38): tot nu toe was opzeggen hetzelfde als
  // verwijderen, en dan verdween de post ook uit je historiek terwijl je hem vorig
  // jaar wél betaalde. Nu blijft het record bestaan en verandert alleen de
  // toekomst. Ontbreekt het veld, dan loopt de post gewoon door — precies zoals
  // elke bestaande post, dus geen migratie.
  eindMaand: z.string().regex(/^\d{4}-\d{2}$/, 'maand moet JJJJ-MM zijn').optional(),
  // Wil je het bedrag maandelijks opzijzetten in plaats van het in één keer te
  // dragen? Puur informatief: de app houdt geen echte pot bij, ze rekent uit
  // hoeveel je per maand opzij moet leggen en toont dat in je plan.
  opbouwen: z.boolean().optional(),
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

// Een WAARDERING: "op deze dag stond er dit op deze rekening" (ronde 38).
//
// Waarvoor. Een effectenrekening, een termijnrekening of een pensioenspaarplan
// verandert van waarde zonder dat er een boeking gebeurt. Tot nu toe kon je die
// waarde alleen actueel houden door het BEGINsaldo aan te passen — waarmee je met
// terugwerkende kracht je hele geschiedenis verschoof — of door een verzonnen
// transactie te boeken, die dan als inkomst in je maandoverzicht belandde.
//
// Wat ze IS: een nieuw vertrekpunt. Vanaf haar datum vertrekt het saldo van deze
// rekening van 'saldo'; alles wat vóór die dag geboekt is, telt niet meer mee (het
// zit al in dat bedrag verwerkt). Boekingen ná die dag tellen er gewoon bij op.
//
// Wat ze NIET is: geen inkomst, geen uitgave, geen overboeking. Ze verschijnt dus
// nooit in een maandoverzicht, een budget, een donut of een grafiek van inkomsten
// en uitgaven — net zomin als een overboeking dat doet. Ze verandert alleen wat er
// op je rekening staat.
//
// 'saldo' mag negatief zijn (een kredietrekening staat negatief), dus bewust géén
// .positive() — anders dan bij een overboeking, waar het bedrag een hoeveelheid is
// en geen stand.
export const WaarderingSchema = z.object({
  id: z.string().min(1),
  rekeningId: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  saldo: z.number().int(), // de STAND op die dag, in centen
  notitie: z.string().optional(),
})
export type Waardering = z.infer<typeof WaarderingSchema>

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
  // De boeking waarmee deze aflossing betaald is (ronde 38). Optioneel, want een
  // aflossing kan ook van een rekening komen die je niet in de app hebt.
  //
  // Waarom dit bestaat: een maandaflossing werd tot nu toe twee keer ingegeven —
  // één keer als transactie op je rekening, één keer als aflossing op de lening —
  // zonder dat iets die twee met elkaar vergeleek. Nu kan de app zeggen "hier
  // staat al een boeking van hetzelfde bedrag op dezelfde dag; is dit dezelfde?"
  // Hetzelfde patroon als `Garantie.transactieId` en `GedeeldeKost.transactieId`.
  transactieId: z.string().min(1).optional(),
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

// De sleutel van de enige ordening die vandaag bestaat: de volgorde van de
// hoofdcategorieën. Taal-onafhankelijk en opgeslagen, dus niet vertalen.
export const ORDENING_HOOFDCATEGORIEEN = 'hoofdcategorieen'

// Een door de gebruiker gekozen VOLGORDE van een lijst.
//
// Waarom een eigen record en niet een 'volgorde'-getal op de categorie zelf: de
// veertien ingebouwde hoofdcategorieën zijn géén records — ze staan in de code.
// Een getal per record kan hun plaats dus nooit bepalen. Eén lijst met id's op
// volgorde kan dat wel, en zet ingebouwde en eigen categorieën in dezelfde rij.
//
// Waarom niet in localStorage, zoals de budgetdrempel: dit is geen
// weergavevoorkeur van één toestel maar een indeling die je zelf gemaakt hebt.
// Ze hoort op je gsm hetzelfde te zijn als op je pc, dus ze gaat mee in het
// logboek en dus in de back-up.
//
// 'id' is bewust een vrije string en geen enum: komt er ooit een tweede ordening
// (rekeningen, spaardoelen), dan is daar geen schemawijziging voor nodig.
//
// Onbekende id's in 'ids' zijn geen fout. Verwijder je een eigen categorie, dan
// blijft haar id hier staan; de rekenkern (utils/categorieVolgorde.ts) negeert wat
// niet meer bestaat. Zo hoeft het verwijderen van een categorie deze lijst niet
// aan te raken en kan ze ook niet half bijgewerkt achterblijven.
export const OrdeningSchema = z.object({
  id: z.string().min(1),
  ids: z.array(z.string()),
})
export type Ordening = z.infer<typeof OrdeningSchema>

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
// Een document hangt aan PRECIES ÉÉN eigenaar: een dossier, een lening, een
// garantie of een transactie. Alle vier de velden zijn optioneel, zodat documenten
// van vóór deze uitbreiding (die enkel 'dossierId' hebben) geldig blijven — geen
// migratie. Welke eigenaar het is, lees je met eigenaarVanDocument() in utils/kluis.ts.
//
// 'transactieId' is de bon of factuur bij een gewone transactie. Die hangt bewust
// hier en niet als 'bonnetje'-veld op de transactie zelf: het logboek is
// append-only, dus elke wijziging aan een transactie zou anders de volledige
// afbeelding opnieuw wegschrijven. Transacties zijn het talrijkst van alles in de
// app; als eender welk record klein moet blijven, is het dit.
export const DossierDocumentSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1).optional(),
  leningId: z.string().min(1).optional(),
  garantieId: z.string().min(1).optional(),
  transactieId: z.string().min(1).optional(),
  naam: z.string().min(1),
  soort: z.enum(DOCUMENTSOORTEN),
  bestand: z.string().min(1), // data-URL
  bestandsnaam: z.string().optional(),
  toegevoegdOp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  notitie: z.string().optional(),
})
export type DossierDocument = z.infer<typeof DossierDocumentSchema>

// ---------------------------------------------------------------------------
// DE ONDERHOUDSBIJDRAGE (ronde 42)
//
// Het vaste maandbedrag dat de ene ouder aan de andere betaalt voor de kinderen,
// en dat volgens de Belgische regel jaarlijks van rechtswege geïndexeerd wordt.
// De volledige verantwoording staat in het projectdossier
// (`domeinonderzoek_kinderkosten_alimentatie_belgie.md`, sectie 4); de rekenregels
// staan in `utils/onderhoudsbijdrage.ts`.
//
// Waarom dit een eigen record is en geen veld op het dossier: er hoort een
// geschiedenis bij (elke verjaardag een ander bedrag) en er horen betalingen bij.
//
// HOOGSTENS ÉÉN PER DOSSIER. Het scherm toont er één en biedt er één aan om te
// maken; een tweede zou onzichtbaar blijven. Loopt er in beide richtingen een
// bijdrage (kinderen uit twee relaties), dan is dat vandaag een tweede dossier —
// wat sowieso al klopt, want ook de kosten en de afrekeningen staan dan los.
// ---------------------------------------------------------------------------

// Wie betaalt aan wie. Taal-onafhankelijke sleutels, zoals overal in dit bestand.
//   'jij-betaalt'  = jij betaalt de bijdrage aan de andere ouder.
//   'jij-ontvangt' = jij ontvangt de bijdrage van de andere ouder.
export const BIJDRAGERICHTINGEN = ['jij-betaalt', 'jij-ontvangt'] as const
export type Bijdragerichting = (typeof BIJDRAGERICHTINGEN)[number]

export const OnderhoudsbijdrageSchema = z.object({
  id: z.string().min(1),
  dossierId: z.string().min(1),
  richting: z.enum(BIJDRAGERICHTINGEN),
  // Het bedrag zoals het LETTERLIJK in het vonnis of de overeenkomst staat, in
  // centen. Nooit het geïndexeerde bedrag: dat wordt telkens opnieuw uit dit getal
  // berekend, want elke indexatie vertrekt van het basisbedrag.
  basisbedrag: z.number().int().positive(),
  // De datum van het vonnis of de ouderschapsovereenkomst. Bepaalt twee dingen: de
  // aanvangsindex (de maand ervóór) en de verjaardag waarop er geïndexeerd wordt.
  datumRegeling: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  // Wordt er geïndexeerd? Standaard ja — dat is de wettelijke regel. Een akte mag
  // het uitsluiten, en dan hoort de app dat te volgen in plaats van te corrigeren.
  geindexeerd: z.boolean().optional(),
  // De aanvangsindex zoals ze in de akte staat, voor het geval die afwijkt van wat
  // de app voor die maand kent. Dat gebeurt bij oudere vonnissen: de index is
  // sindsdien herbaseerd, en dan is het getal in de akte in een andere maatstaf
  // uitgedrukt. Zie INDEX_BASISJAAR in data/gezondheidsindex.ts.
  aanvangsindexHandmatig: z.number().positive().optional(),
  // Indexcijfers die de gebruiker zelf toevoegde, als 'JJJJ-MM' -> cijfer. Nodig
  // omdat de meegeleverde tabel per definitie achterloopt op de werkelijkheid: het
  // cijfer van deze maand verschijnt pas op het einde van deze maand.
  eigenIndexcijfers: z.record(z.string(), z.number().positive()).optional(),
  // Voor welke kinderen de bijdrage geldt. Puur informatief voor het document.
  kindIds: z.array(z.string()).optional(),
  // Loopt de regeling af (bv. bij het einde van de studies)? Dan telt er na deze
  // maand niets meer mee.
  eindDatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn').optional(),
  notitie: z.string().optional(),
})
export type Onderhoudsbijdrage = z.infer<typeof OnderhoudsbijdrageSchema>

// Eén betaling van de onderhoudsbijdrage: ontvangen of gedaan.
//
// Bewust een eigen record en geen gewone transactie: een betaling hoort bij de
// regeling, niet bij een rekening. Wie ze ook als transactie wil boeken, doet dat
// apart — de app koppelt die twee niet automatisch, want dan zou één storting in
// twee tellingen tegelijk verschijnen.
export const OnderhoudsbetalingSchema = z.object({
  id: z.string().min(1),
  bijdrageId: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  bedrag: z.number().int().positive(), // in centen
  // Over welke maand deze betaling gaat ('JJJJ-MM'). Optioneel: wie stipt betaalt
  // heeft het niet nodig, wie een achterstand inhaalt wel — dan wordt één
  // overschrijving aan een oudere maand toegewezen.
  voorMaand: z.string().regex(/^\d{4}-\d{2}$/, 'maand moet JJJJ-MM zijn').optional(),
  notitie: z.string().optional(),
})
export type Onderhoudsbetaling = z.infer<typeof OnderhoudsbetalingSchema>

// ---------------------------------------------------------------------------
// DE MAANDAFSLUITING (ronde 43)
//
// "Deze maand heb ik nagekeken." Eén record per maand, en niet meer dan dat.
//
// Waarom dit een record is en geen berekening. De app kan zélf wel zien of er nog
// boekingen zonder categorie zijn, maar niet of JIJ je uittreksel al ingelezen hebt
// of je cijfers bekeken hebt. Dat is precies het verschil tussen "er valt niets
// meer te doen" en "ik heb ernaar gekeken". Zonder dat verschil kan de app je ook
// niet aan een vergeten maand herinneren — en dat herinneren is het hele punt van
// de maandafsluiting.
//
// De MAAND is de identiteit: 'JJJJ-MM' is het id. Twee toestellen die dezelfde
// maand afsluiten schrijven dus hetzelfde record in plaats van er twee te maken,
// en dat klopt ook inhoudelijk — een maand is één keer nagekeken of niet.
// ---------------------------------------------------------------------------
export const MaandafsluitingSchema = z.object({
  /** De maand zelf, 'JJJJ-MM'. Tegelijk de sleutel. */
  id: z.string().regex(/^\d{4}-\d{2}$/, 'maand moet JJJJ-MM zijn'),
  /** Wanneer je ze afgesloten hebt. Puur informatief. */
  afgeslotenOp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datum moet JJJJ-MM-DD zijn'),
  /**
   * Hoeveel boekingen er op dat moment nog zonder categorie stonden.
   *
   * Je mag een maand afsluiten met werk dat blijft liggen — de app houdt je niet
   * tegen. Maar dan hoort ze wel te onthouden dat je dat wist, in plaats van later
   * te doen alsof alles rond was.
   */
  zonderCategorie: z.number().int().nonnegative().optional(),
  notitie: z.string().optional(),
})
export type Maandafsluiting = z.infer<typeof MaandafsluitingSchema>
