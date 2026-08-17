// De Belgische fiscale posten, als GEGEVENS.
//
// Waarom dit een gegevensbestand is en geen logica (ronde 50). Deze regels
// veranderen élk jaar, en aanslagjaar 2026 was een breukjaar: de federale regering
// schrapte een reeks belastingverminderingen in één keer, en Vlaanderen schrapte de
// dienstencheques. Een app die dit als aannames in code zet, toont volgend jaar
// posten die niet meer bestaan. Eén regel per post bijzetten of afsluiten is het
// volledige onderhoud.
//
// WAT DEZE MODULE WEL EN NIET DOET. Ze VERZAMELT: per post het bedrag dat je dat
// jaar uitgaf, welke boekingen erin zitten en of er een bon bij hangt. Ze zegt NIET
// hoeveel belasting je daarmee bespaart — dat hangt af van je hele aangifte, en dat
// weet deze app niet. Ze noemt wel het AFTREKBARE DEEL waar de wet een vast
// percentage oplegt (de onderhoudsuitkeringen); dat is een feit uit de wet, geen
// berekening van jouw voordeel.
//
// En bij de meeste posten is het bedrag op je rekeningafschrift niet eens het bedrag
// dat in de aangifte hoort. Zie `afleidbaarheid` hieronder — dat veld is de kern van
// dit bestand.
//
// BRONNEN. Zie het projectdossier `claude/domeinonderzoek_fiscale_posten_belgie.md`
// voor de volledige verantwoording per post, met links. Elke post hieronder draagt
// zijn eigen bron mee.
//
// GRENS. Dit is Vlaanderen/België, particulier. Geen zelfstandigen, geen
// vennootschappen, en Nederland is een ander stelsel dat later een eigen bestand
// krijgt.

/**
 * Hoe goed de app het fiscale bedrag uit je boekingen kan halen.
 *
 * Dit is het belangrijkste veld van dit bestand, want het bepaalt wat de app mag
 * beweren:
 *
 * - `uit-boeking`: wat je betaalde ís het bedrag dat gevraagd wordt. De app mag het
 *   optellen en tonen.
 * - `uit-attest`: je betaling is niet het fiscale bedrag. Bij kinderopvang geldt een
 *   maximum PER OPVANGDAG, en een schoolfactuur mengt opvang met maaltijden en
 *   uitstappen; bij giften telt alleen een erkende instelling mee en geldt een
 *   drempel per instelling. De app toont dan wat je betaalde als GEHEUGENSTEUN en
 *   zegt erbij dat het attest het bedrag bepaalt.
 * - `niet-uit-bank`: komt nooit op je rekening voor (bv. een inhouding op je loon).
 *   Zulke posten staan hier alleen om te kunnen zeggen dat de app ze niet kent.
 */
export type Afleidbaarheid = 'uit-boeking' | 'uit-attest' | 'niet-uit-bank'

/** Federaal of gewestelijk. Bepaalt of een post voor een Vlaming geldt. */
export type FiscaalNiveau = 'federaal' | 'vlaams'

export type FiscalePost = {
  id: string
  /** De naam zoals de belastingaangifte ze gebruikt. */
  naam: string
  /** Het vak in de aangifte, bv. 'Vak X'. */
  vak: string
  /**
   * De code(s) waar het bedrag in hoort. Twee codes = één per partner bij een
   * gezamenlijke aangifte. Dit is wat de gebruiker overtypt in Tax-on-web, en dus
   * het nuttigste veld van het hele scherm.
   */
  codes: string[]
  niveau: FiscaalNiveau
  /**
   * Het eerste aanslagjaar waarvoor deze post bestond. Ontbreekt = ze bestond al
   * vóór het bereik van dit bestand — dat is bij een afgeschafte post het gewone
   * geval, en er is geen reden om een beginjaar te verzinnen dat we niet opgezocht
   * hebben.
   */
  geldigVanAj?: number
  /** Het LAATSTE aanslagjaar waarvoor de post bestond. Ontbreekt = nog geldig. */
  geldigTotAj?: number
  afleidbaarheid: Afleidbaarheid
  /**
   * De categorie-id's die onder deze post vallen. Een hoofd- of middencategorie
   * vangt alles eronder, net als elders in de app.
   */
  categorieIds: string[]
  /**
   * Haalt deze post zijn bedrag uit de onderhoudsbijdrage-module in plaats van uit
   * categorieën? Alleen de betalingen op een regeling waarbij JIJ betaalt tellen.
   */
  uitOnderhoudsbetalingen?: boolean
  /** De belangrijkste voorwaarde, in één zin. */
  voorwaarde: string
  /** Waarom het bedrag op je rekening niet het bedrag in de aangifte is. */
  waarschuwing?: string
  bron: string
}

/**
 * Het aanslagjaar dat bij een inkomstenjaar hoort.
 *
 * Aanslagjaar 2027 gaat over de inkomsten van 2026. Dat verschil van één is de
 * meest gemaakte fout in dit onderwerp: wie in augustus 2026 een betaling doet,
 * bereidt de aangifte van 2027 voor, niet die van dit jaar.
 */
export function aanslagjaarVan(inkomstenjaar: number): number {
  return inkomstenjaar + 1
}

/**
 * Het oudste aanslagjaar dat dit bestand beschrijft.
 *
 * Aanslagjaar 2026 was een breukjaar: er verdween een hele reeks
 * belastingverminderingen tegelijk. Voor oudere jaren zou dit bestand dus een te
 * korte lijst tonen — en een te korte lijst leest als "er valt niets af te trekken",
 * wat erger is dan zeggen dat we het jaar niet beschrijven.
 */
export const EERSTE_AANSLAGJAAR = 2026

/**
 * Het percentage van een betaalde onderhoudsuitkering dat aftrekbaar is.
 *
 * Dit was jarenlang 80 % en wordt in drie stappen afgebouwd. Het percentage volgt
 * het JAAR VAN BETALING, niet het aanslagjaar — dat staat uitdrukkelijk zo in de
 * circulaire. Een betaling van december 2025 blijft dus op 70 %, ook al wordt ze pas
 * in 2026 aangegeven.
 *
 * Bron: circulaire 2026/C/12 (FOD Financiën), wet van 18.12.2025 (BS 30.12.2025),
 * die art. 99 en 104 WIB 92 wijzigt.
 */
export function onderhoudPercentage(betalingsjaar: number): number {
  if (betalingsjaar <= 2024) return 80
  if (betalingsjaar === 2025) return 70
  if (betalingsjaar === 2026) return 60
  // 50 % is het laatste niveau dat de wet vandaag vastlegt. Dit is dus geen
  // doorgetrokken lijn naar de toekomst: als er ooit verder afgebouwd wordt, hoort
  // dat hier als een nieuwe regel bij te komen.
  return 50
}

/**
 * Wordt het percentage ná dit betalingsjaar nog verder afgebouwd?
 *
 * Bestaat opdat het scherm niet hoeft te beweren dat er nog stappen komen. De wet
 * legt vandaag tot 50 % vast en niet verder; wie in 2027 kijkt, hoort dus niet te
 * lezen dat er nog een verlaging aankomt.
 */
export function bouwtVerderAf(betalingsjaar: number): boolean {
  return onderhoudPercentage(betalingsjaar + 1) < onderhoudPercentage(betalingsjaar)
}

/**
 * De posten.
 *
 * DE INSLUITREGEL: een post staat hier wanneer de betaling als gewone boeking op je
 * rekening verschijnt. Of het BEDRAG daarna nog van een attest moet komen, is geen
 * reden om ze weg te laten — dan dient de post als geheugensteun, en zegt
 * `afleidbaarheid` dat erbij.
 *
 * Wat daardoor wél wegvalt: alles wat op je loonfiche staat in plaats van op je
 * rekening (de persoonlijke bijdrage in een groepsverzekering, het VAPW, aandelen
 * die je werkgever inhoudt). Die zou de app nooit zien.
 *
 * Twee posten die er bewust niet in staan hoewel ze aan de regel voldoen: de Vlaamse
 * win-winlening en de aandelen van startende ondernemingen. Allebei bestaan ze nog,
 * maar het zijn uitleningen en beleggingen — geen uitgaven — en ze komen in deze app
 * niet als kost binnen. Ze horen bij een latere ronde over beleggingen.
 */
export const FISCALE_POSTEN: FiscalePost[] = [
  {
    id: 'onderhoudsuitkeringen',
    naam: 'Betaalde onderhoudsuitkeringen',
    vak: 'Vak VIII',
    codes: ['1390', '2390'],
    niveau: 'federaal',
    geldigVanAj: 2026,
    afleidbaarheid: 'uit-boeking',
    categorieIds: [],
    uitOnderhoudsbetalingen: true,
    voorwaarde:
      'Alleen wat je regelmatig betaalt op grond van een wettelijke onderhoudsplicht, aan iemand die niet bij jou woont en in de EER of Zwitserland verblijft.',
    waarschuwing:
      'Kies je voor fiscaal co-ouderschap (de toeslag op de belastingvrije som delen), dan kan je deze aftrek in de regel niet óók vragen; alleen in het jaar van de feitelijke scheiding zelf kunnen ze samengaan. Dat is een keuze, geen berekening — de app maakt ze niet voor jou. Doen jullie een gezamenlijke aangifte en is de uitkering door jullie samen verschuldigd, dan bestaat daar een aparte code voor.',
    bron: 'https://blog.oeccbb.be/nl/article/circulaire-2026c12-over-de-wijzigingen-inzake-de-fiscale-behandeling-van-onderhoudsuitkeringen/29834',
  },
  {
    id: 'pensioensparen',
    naam: 'Betalingen voor het pensioensparen',
    vak: 'Vak X',
    codes: ['1361', '2361'],
    niveau: 'federaal',
    geldigVanAj: 2026,
    afleidbaarheid: 'uit-attest',
    categorieIds: ['i-pensioensparen-6807'],
    voorwaarde:
      'Je bent minstens 18, je laatste storting valt in het jaar waarin je 64 wordt, en de begunstigde moet aan de voorwaarden voldoen — een feitelijk samenwonende partner mag het niet zijn.',
    waarschuwing:
      'Op je rekeningafschrift ziet een storting voor pensioensparen er hetzelfde uit als een storting voor langetermijnsparen: dezelfde bank, hetzelfde soort bedrag. Welke van de twee het is, staat op het attest van je bank of verzekeraar. Neem het bedrag hieronder dus als geheugensteun, niet als eindcijfer.',
    bron: 'https://www.wikifin.be/nl/belasting-werk-en-inkomen/belastingaangifte/belastingverminderingen/pensioensparen',
  },
  {
    id: 'langetermijnsparen',
    naam: 'Premies van individuele levensverzekeringen (langetermijnsparen)',
    vak: 'Vak IX',
    codes: ['1353', '2353'],
    niveau: 'federaal',
    geldigVanAj: 2026,
    afleidbaarheid: 'uit-attest',
    categorieIds: ['i-langetermijnsparen-3706'],
    voorwaarde:
      'Een contract van minstens tien jaar, afgesloten vóór je 65e, met jezelf of een verwante als begunstigde.',
    waarschuwing:
      'Je maximum hangt af van je beroepsinkomen, en de storting is op je afschrift niet te onderscheiden van pensioensparen. Het attest van je verzekeraar bepaalt het bedrag.',
    bron: 'https://www.wikifin.be/nl/belasting-werk-en-inkomen/belastingaangifte/belastingverminderingen/vermindering-voor',
  },
  {
    id: 'giften',
    naam: 'Giften',
    vak: 'Vak X',
    codes: ['1394'],
    niveau: 'federaal',
    geldigVanAj: 2026,
    afleidbaarheid: 'uit-attest',
    // Sponsoring staat er bewust NIET bij: daar krijg je een tegenprestatie voor, en
    // dat is fiscaal geen gift.
    categorieIds: ['i-giften-aan-goede-doelen-3720', 'i-x-gift-goed-doel', 'i-x-collecte', 'i-x-peterschap'],
    voorwaarde: 'Alleen aan een ERKENDE instelling, die je daarvoor een fiscaal attest bezorgt.',
    waarschuwing:
      'Twee dingen die de app niet aan een overschrijving kan zien: of de instelling erkend is, en of je bij díe instelling boven de jaarlijkse drempel komt. Die drempel geldt per instelling per jaar, niet over al je giften samen.',
    bron: 'https://www.wikifin.be/nl/belasting-werk-en-inkomen/belastingaangifte/belastingverminderingen/giften',
  },
  {
    id: 'kinderopvang',
    naam: 'Uitgaven voor kinderoppas',
    vak: 'Vak X',
    codes: ['1384'],
    niveau: 'federaal',
    geldigVanAj: 2026,
    afleidbaarheid: 'uit-attest',
    // Ook de kampen die elders in de boom staan. Zonder deze drie kwam hetzelfde
    // vakantiekamp er wél of niet in, puur naargelang je het onder 'Kinderopvang'
    // of onder 'Kampen en uitstappen' boekte. De uitstappen uit diezelfde
    // middencategorie (schooluitstap, pretpark, dierentuin) horen er NIET bij: dat
    // is geen opvang.
    categorieIds: ['cat-kinderopvang', 'i-x-speelpleinwerking', 'i-x-jeugdkamp', 'i-x-sportkamp'],
    voorwaarde:
      'Voor een kind ten laste jonger dan 14 jaar (jonger dan 21 bij een zware handicap), en je moet zelf een beroepsinkomen hebben.',
    waarschuwing:
      'Het maximum geldt PER OPVANGDAG, en een schoolfactuur mengt opvang met maaltijden, uitstappen en materiaal — alleen het opvangdeel telt. Het attest van de opvang splitst dat; je bankboeking niet.',
    bron: 'https://www.wikifin.be/nl/belasting-werk-en-inkomen/belastingaangifte/belastingverminderingen/kosten-voor-kinderopvang',
  },

  {
    id: 'woonlening',
    naam: 'Hypothecaire lening voor je eigen woning',
    vak: 'Vak IX',
    // BEWUST LEEG. Welke code je nodig hebt, hangt af van het jaar waarin je de
    // lening afsloot: de Vlaamse woonbonus van 2005-2014 heeft andere codes dan de
    // geïntegreerde woonbonus van 2016-2019, en de federale rubriek is voor
    // aanslagjaar 2026 helemaal geschrapt. Een verkeerde code in een aangifte is
    // erger dan geen code, en de juiste staat op je bankattest.
    codes: [],
    niveau: 'vlaams',
    afleidbaarheid: 'uit-attest',
    categorieIds: ['i-hypotheek-8607'],
    voorwaarde:
      'Alleen voor leningen die al liepen: Vlaanderen schafte de woonbonus af voor nieuwe leningen, en de federale regeling verdween met aanslagjaar 2026.',
    waarschuwing:
      'Je maandelijkse domiciliëring is kapitaal, interest en schuldsaldoverzekering in één bedrag. Alleen het bankattest splitst dat, en alleen die opsplitsing hoort in de aangifte. Het bedrag hieronder is dus wat er van je rekening ging, niet wat je invult.',
    bron: 'https://blog.forumforthefuture.be/nl/article/circulaire-2026c59-over-de-wijzigingen-in-de-aangifte-in-de-personenbelasting-van-aanslagjaar-2026/31149',
  },

  // --- Afgeschaft ------------------------------------------------------------
  //
  // Deze staan hier NIET om ingevuld te worden, maar om te kunnen zeggen dat er
  // niets meer in te vullen valt. Wie jarenlang dienstencheques inbracht, gaat
  // anders zoeken naar een vak dat verdwenen is. De app toont zo'n post alleen
  // wanneer er dat jaar écht boekingen onder staan.
  {
    id: 'dienstencheques',
    naam: 'Dienstencheques',
    vak: 'Vak X',
    codes: ['3364', '4364'],
    niveau: 'vlaams',
    geldigTotAj: 2025,
    afleidbaarheid: 'uit-attest',
    categorieIds: ['i-dienstencheques-9094'],
    voorwaarde: 'Gold voor cheques die je zelf kocht, met een attest van de uitgever.',
    waarschuwing:
      'In Vlaanderen geven dienstencheques die je vanaf 2025 kocht geen belastingvoordeel meer, en er worden ook geen attesten meer uitgereikt. In Brussel en Wallonië bestaat de vermindering nog wél — daar gelden andere bedragen.',
    bron: 'https://dienstencheques.vlaanderen.be/burger/info/fiscale-aftrek/aftrekbaar-bedrag-vlaanderen',
  },
]

/** De posten die voor één aanslagjaar gelden. */
export function postenVoorAanslagjaar(aanslagjaar: number): FiscalePost[] {
  return FISCALE_POSTEN.filter(
    (p) =>
      (p.geldigVanAj === undefined || aanslagjaar >= p.geldigVanAj) &&
      (p.geldigTotAj === undefined || aanslagjaar <= p.geldigTotAj),
  )
}

/** Beschrijft dit bestand dat aanslagjaar? Zo niet, hoort het scherm dat te zeggen. */
export function kentAanslagjaar(aanslagjaar: number): boolean {
  return aanslagjaar >= EERSTE_AANSLAGJAAR
}

/** Posten die ooit bestonden maar voor dit aanslagjaar niet meer. */
export function vervallenVoorAanslagjaar(aanslagjaar: number): FiscalePost[] {
  return FISCALE_POSTEN.filter((p) => p.geldigTotAj !== undefined && aanslagjaar > p.geldigTotAj)
}
