import { itemPerId, midPerId } from '../data/categorieen/zoek'

// Gewone versus buitengewone kosten — een VOORSTEL, nooit een automatisme.
//
// In een co-ouderschapsdossier is dit de scheidslijn waar ouders het vaakst over
// discussiëren: gewone kosten zitten in de maandelijkse onderhoudsbijdrage,
// buitengewone kosten worden apart verrekend. De Belgische wetgever heeft daarom
// een INDICATIEVE lijst vastgelegd in het KB van 22 april 2019 (uitvoering van
// artikel 203, §1 van het Burgerlijk Wetboek), met drie soorten buitengewone
// kosten:
//
//   1. medische en paramedische kosten (na tussenkomst van de mutualiteit),
//   2. kosten van de schoolse opleiding,
//   3. kosten voor de ontwikkeling van de persoonlijkheid en de ontplooiing.
//
// "Indicatief" betekent: ouders en rechters mogen ervan afwijken, en doen dat ook.
// Een kost die in het ene vonnis buitengewoon is, kan in het andere gewoon zijn.
// Daarom doet deze module maar één ding: ze kijkt naar de gekozen categorie en
// zegt wat de lijst daarover zegt. Wat er uiteindelijk in het dossier staat, kiest
// de gebruiker zelf — het formulier vult het voorstel in en laat het gewoon
// wijzigen.
//
// Deze module is bewust ZUIVER: geen React, geen opslag, alleen een categorie-id
// erin en een voorstel eruit. Zo is elke regel na te rekenen in een test, en kan
// dezelfde kennis later ook een afrekening of een import voeden.

/** De drie rubrieken buitengewone kosten uit de indicatieve lijst. */
export type Kostenrubriek = 'medisch' | 'school' | 'ontplooiing'

export type Kostensoortvoorstel = {
  kostenType: 'gewoon' | 'buitengewoon'
  /** Alleen bij een buitengewone kost: onder welke rubriek van de lijst ze valt. */
  rubriek?: Kostenrubriek
  /** Korte reden in klare taal (i18n-sleutel). */
  reden: string
}

/** De bron die we altijd bij het voorstel tonen (i18n-sleutel). */
export const KOSTENSOORT_BRON = 'Indicatieve lijst uit het KB van 22 april 2019'

const MEDISCH: Kostensoortvoorstel = {
  kostenType: 'buitengewoon',
  rubriek: 'medisch',
  reden: 'Medische en paramedische kosten',
}
const SCHOOL: Kostensoortvoorstel = {
  kostenType: 'buitengewoon',
  rubriek: 'school',
  reden: 'Kosten van de schoolse opleiding',
}
const ONTPLOOIING: Kostensoortvoorstel = {
  kostenType: 'buitengewoon',
  rubriek: 'ontplooiing',
  reden: 'Kosten voor ontwikkeling en ontplooiing',
}
const GEWOON: Kostensoortvoorstel = {
  kostenType: 'gewoon',
  reden: 'Staat niet in de indicatieve lijst van buitengewone kosten',
}

// De tabel. Een sleutel mag een hoofdcategorie (ov-*), een categorie (cat-*) of
// een los item (i-*) zijn; het meest specifieke niveau wint. `null` betekent
// uitdrukkelijk "hier doen we géén uitspraak" — nodig om te verhinderen dat een
// terugbetaling het voorstel van haar categorie erft.
const TABEL = new Map<string, Kostensoortvoorstel | null>([
  // --- 1. Medische en paramedische kosten ---------------------------------
  // De lijst noemt: gespecialiseerde behandelingen en voorgeschreven medicatie,
  // heelkunde en hospitalisatie, orthodontie, logopedie, oftalmologie,
  // psychiatrische/psychologische behandeling, kinesitherapie, prothesen,
  // brillen, hoorapparaten, beugels, rolstoel, revalidatie, en de premie van een
  // aanvullende hospitalisatieverzekering.
  // Let op: 'Tandarts en orthodontie' is één item voor twee dingen. Een gewone
  // controle is een gewone kost, orthodontie staat mét zoveel woorden in de lijst.
  // We volgen het duurste geval, want dát is het bedrag waar ouders over
  // discussiëren — en één klik zet het terug.
  ['cat-medische-zorg-en-facturen', MEDISCH],
  ['cat-x-paramedische-zorg', MEDISCH],
  ['cat-x-geestelijke-gezondheid', MEDISCH],
  ['cat-x-optiek-en-gehoor', MEDISCH],
  ['cat-x-tandzorg', MEDISCH],
  ['cat-x-medische-hulpmiddelen', MEDISCH],
  ['i-hospitalisatieverzekering-prem-4163', MEDISCH],

  // Een huisartsbezoek is gewone gezondheidszorg, geen gespecialiseerde
  // behandeling — het staat dus niet in de lijst.
  ['i-huisarts-8922', GEWOON],
  // Lenzenvloeistof is een gewoon verbruiksproduct, geen optische hulpmiddel.
  ['i-x-lenzenvloeistof', GEWOON],

  // Terugbetalingen zijn geen kost maar een tussenkomst die van de kost afgaat.
  // Zonder deze drie regels zouden ze het voorstel van hun categorie erven en als
  // "buitengewone kost" voorgesteld worden.
  ['i-ziekenfonds-terugbetalingen-5629', null],
  ['i-tandverzekering-terugbetalinge-7926', null],
  ['i-dkv-terugbetalingen-990', null],

  // Vrij verkrijgbare geneesmiddelen sluit het KB uitdrukkelijk uit; alleen
  // VOORGESCHREVEN medicatie is buitengewoon.
  ['cat-medicatie', GEWOON],
  ['i-rilatine-jasper-5184', MEDISCH],
  ['i-rilatine-milo-6025', MEDISCH],
  ['cat-x-vitamines-en-supplementen', GEWOON],
  // Alternatieve zorg staat niet in de lijst en wordt er ook niet door
  // uitgesloten: hier past geen voorstel.
  ['cat-x-alternatieve-zorg', null],

  // --- 2. Kosten van de schoolse opleiding --------------------------------
  // De lijst noemt: meerdaagse schoolactiviteiten, gespecialiseerd studiemateriaal
  // en -kledij, inschrijvingsgeld hoger en niet-gesubsidieerd onderwijs, IT-materiaal
  // en software voor de studie, bijlessen, kothuur en buitenlandse studieprogramma's.
  ['cat-x-hoger-onderwijs', SCHOOL],
  // Eten en een studentenclub horen bij het gewone levensonderhoud.
  ['i-x-studentenrestaurant', GEWOON],
  ['i-x-studentenvereniging', GEWOON],

  // De gewone schoolrekening, schoolboeken en schoolgerei zijn gewone kosten; de
  // laptop voor de studie staat wél met zoveel woorden in de lijst.
  ['cat-kinderen-school', GEWOON],
  ['i-laptop-jasper-185', SCHOOL],
  ['i-laptop-hanne-4647', SCHOOL],
  ['i-laptop-milo-8590', SCHOOL],

  // --- 3. Ontwikkeling en ontplooiing -------------------------------------
  // De lijst noemt: kinderopvang van 0 tot 3 jaar, lidgelden en basisuitrusting
  // voor culturele, sportieve of artistieke activiteiten en kampen, en de
  // rijopleiding.
  ['cat-kinderen-hobby', ONTPLOOIING],
  ['i-x-sportclub-lidgeld', ONTPLOOIING],
  ['i-x-muziekinstrument', ONTPLOOIING],
  ['i-x-muzieklessen', ONTPLOOIING],
  ['i-x-rijbewijs', ONTPLOOIING],

  // Kampen zijn buitengewoon; een daguitstap of speelpleinwerking niet.
  ['cat-x-kampen-en-uitstappen', GEWOON],
  ['i-x-jeugdkamp', ONTPLOOIING],
  ['i-x-sportkamp', ONTPLOOIING],

  // Opvang: de lijst spreekt over kinderopvang van 0 tot 3 jaar. Crèche en
  // onthaalouder vallen daaronder; buitenschoolse opvang en een babysit voor een
  // ouder kind niet.
  ['cat-kinderopvang', GEWOON],
  ['i-cr-che-9817', ONTPLOOIING],
  ['i-onthaalouder-1836', ONTPLOOIING],
  ['i-vakantiekampen-1693', ONTPLOOIING],

  // --- Wat zeker gewoon is -------------------------------------------------
  // Verblijfsgebonden en gewone verblijfsoverstijgende kosten: eten en drinken,
  // huishouden en verzorging, kleding en schoenen, wonen en energie, vervoer.
  ['ov-voeding', GEWOON],
  ['ov-drank', GEWOON],
  ['ov-huishouden-en-verzorging', GEWOON],
  ['ov-kledij-en-schoenen', GEWOON],
  ['ov-woning-en-vaste-lasten', GEWOON],
  ['ov-vervoer-en-mobiliteit', GEWOON],
  ['ov-huisdieren', GEWOON],
  ['cat-kinderen-kleding', GEWOON],
  ['cat-kinderen-varia', GEWOON],
  ['cat-x-baby-en-peuter', GEWOON],
  ['cat-x-zakgeld-en-sparen-kind', GEWOON],
])

/**
 * Alle categorie-id's waarover de tabel iets zegt. Bestaat om te kunnen testen dat
 * er geen tikfout in staat: een id dat niet in de categorieboom voorkomt, zou
 * hier stil nooit een voorstel opleveren.
 */
export const KOSTENSOORT_SLEUTELS: string[] = [...TABEL.keys()]

/**
 * Het voorstel voor één categorie-id, of `null` wanneer de indicatieve lijst er
 * niets over zegt.
 *
 * Zoekt van specifiek naar algemeen: eerst het id zelf, dan de categorie waarin
 * het item hangt, dan de hoofdcategorie. Zo erft een subcategorie die jij zelf
 * onder "Tandzorg" hebt gezet vanzelf hetzelfde voorstel, zonder dat ze in de
 * tabel hoeft te staan.
 *
 * Een eigen HOOFDcategorie levert nooit een voorstel op: we weten niet wat er in
 * zit, en gokken zou hier een verkeerd bedrag in een afrekening zetten. Een eigen
 * MIDDENcategorie erft wél het antwoord van de hoofdcategorie waaronder je ze
 * hebt gehangen — dat is precies wat je bedoelde toen je ze daar zette.
 */
export function voorstelKostensoort(categorieId: string | undefined): Kostensoortvoorstel | null {
  if (!categorieId) return null

  if (TABEL.has(categorieId)) return TABEL.get(categorieId) ?? null

  const item = itemPerId(categorieId)
  if (item) {
    if (TABEL.has(item.categorieId)) return TABEL.get(item.categorieId) ?? null
    if (TABEL.has(item.hoofdId)) return TABEL.get(item.hoofdId) ?? null
    return null
  }

  const mid = midPerId(categorieId)
  if (mid && TABEL.has(mid.hoofdId)) return TABEL.get(mid.hoofdId) ?? null

  return null
}
