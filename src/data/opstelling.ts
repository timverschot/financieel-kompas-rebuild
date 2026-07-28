import type { Frequentie } from './schema'

// De twee aanvinklijsten van De Opstelling (ronde 39).
//
// WAAROM AANVINKEN EN NIET INTIKKEN. Een leeg formulier vraagt je iets te
// HERINNEREN; een lijst vraagt je iets te HERKENNEN. Dat tweede is veel
// makkelijker, en het is precies de reden waarom je cloudopslag van € 2,99 vandaag
// nergens in je app staat: niemand denkt daar uit zichzelf aan.
//
// DIT IS GEGEVENS, GEEN CODE. De lijsten mogen groeien zonder dat er iets aan de
// werking verandert — net zoals de categorieboom en de KB-tabel in
// utils/kostensoort.ts. Voeg gerust een regel toe.
//
// ⚠️ ELKE `categorieId` MOET ECHT BESTAAN in de ingebouwde categorieboom. Een
// verzonnen id levert een vaste last op die nergens in een grafiek terechtkomt, en
// dat merk je pas maanden later. `opstelling.test.ts` vergelijkt daarom elk id
// hieronder met de echte boom en faalt bij een typefout — hetzelfde vangnet als bij
// utils/kostensoort.ts.
//
// De `sleutel` is taal-onafhankelijk en stabiel; alleen `naam` wordt vertaald.

export type Kostvoorstel = {
  /** Taal-onafhankelijke sleutel, stabiel over versies heen. */
  sleutel: string
  /** Weergavenaam (Nederlandse vertaalsleutel). */
  naam: string
  icoon: string
  /** Een echt id uit de ingebouwde categorieboom. */
  categorieId: string
  /** Ontbreekt = maandelijks. */
  frequentie?: Frequentie
  /** Korte toelichting wanneer de naam alleen niet volstaat. */
  toelichting?: string
}

/**
 * De klassieke vaste kosten van een Belgisch of Nederlands huishouden.
 *
 * Bewust NIET in deze lijst: de onderhoudsbijdrage (alimentatie). Die hoort niet
 * bij je gewone vaste lasten maar in de Dossiers-module, waar ze geïndexeerd en
 * opgevolgd wordt. Er bestaat om diezelfde reden geen categorie voor in de boom.
 */
export const KLASSIEKE_VASTE_KOSTEN: Kostvoorstel[] = [
  { sleutel: 'huur', naam: 'Huur', icoon: '🏠', categorieId: 'i-huur-4062' },
  { sleutel: 'hypotheek', naam: 'Hypotheek', icoon: '🏡', categorieId: 'i-hypotheek-8607' },
  {
    sleutel: 'energie',
    naam: 'Elektriciteit en gas',
    icoon: '💡',
    categorieId: 'i-elektriciteit-gas-voorschotten-7574',
    toelichting: 'Je maandelijkse voorschot',
  },
  { sleutel: 'water', naam: 'Water', icoon: '🚿', categorieId: 'i-water-voorschotten-8977' },
  {
    sleutel: 'internet-gsm',
    naam: 'Internet, tv en gsm',
    icoon: '📶',
    categorieId: 'i-internet--tv---gsm-4253',
  },
  {
    sleutel: 'brandverzekering',
    naam: 'Brand- en familiale verzekering',
    icoon: '🔥',
    categorieId: 'i-brand-en-familiale-verzekering-2328',
    frequentie: 'jaar',
  },
  { sleutel: 'autoverzekering', naam: 'Autoverzekering', icoon: '🚗', categorieId: 'i-autoverzekering-8001', frequentie: 'jaar' },
  {
    sleutel: 'hospitalisatie',
    naam: 'Hospitalisatieverzekering',
    icoon: '🏥',
    categorieId: 'i-hospitalisatieverzekering-prem-4163',
    frequentie: 'jaar',
  },
  {
    sleutel: 'schuldsaldo',
    naam: 'Schuldsaldoverzekering',
    icoon: '📄',
    categorieId: 'i-schuldsaldoverzekering-6890',
    frequentie: 'jaar',
  },
  {
    sleutel: 'autolening',
    naam: 'Autolening',
    icoon: '🚙',
    categorieId: 'i-aankoop---afbetaling-wagen-8108',
  },
  {
    sleutel: 'onroerende-voorheffing',
    naam: 'Onroerende voorheffing',
    icoon: '🧾',
    categorieId: 'i-onroerende-voorheffing-1420',
    frequentie: 'jaar',
  },
  {
    sleutel: 'gemeentebelasting',
    naam: 'Gemeentebelasting',
    icoon: '🏛️',
    categorieId: 'i-gemeentebelasting-4332',
    frequentie: 'jaar',
  },
  {
    sleutel: 'syndicus',
    naam: 'Syndicus of gemeenschappelijke kosten',
    icoon: '🏢',
    categorieId: 'cat-huisvesting',
  },
  { sleutel: 'school', naam: 'Schoolkosten', icoon: '🎒', categorieId: 'cat-kinderen-school' },
  { sleutel: 'kinderopvang', naam: 'Kinderopvang', icoon: '🧸', categorieId: 'cat-kinderopvang' },
  {
    sleutel: 'openbaar-vervoer',
    naam: 'Abonnement openbaar vervoer',
    icoon: '🚋',
    categorieId: 'cat-openbaar-vervoer',
  },
  { sleutel: 'vakbond', naam: 'Vakbond', icoon: '🤝', categorieId: 'i-x-vakbondsbijdrage', frequentie: 'jaar' },
  { sleutel: 'mutualiteit', naam: 'Mutualiteit', icoon: '⚕️', categorieId: 'i-x-mutualiteitsbijdrage' },
  { sleutel: 'huisvuil', naam: 'Huisvuil', icoon: '🗑️', categorieId: 'cat-x-afval-en-milieu', frequentie: 'jaar' },
]

/**
 * De sluipende kosten: kleine abonnementen die je nooit meer bekijkt.
 *
 * Twee dingen om te weten wanneer je deze lijst uitbreidt:
 *  - de categorieboom kent GEEN item voor muziekstreaming, dus Spotify en Apple
 *    Music hangen aan de middencategorie 'Abonnementen en multimedia'. Ze onder
 *    "Streaming Video" hangen zou een onwaarheid zijn;
 *  - merchant-namen worden nooit vertaald (Netflix blijft Netflix), maar
 *    soortnamen wél ("Fitness", "Krant").
 */
export const SLUIPENDE_KOSTEN: Kostvoorstel[] = [
  { sleutel: 'netflix', naam: 'Netflix', icoon: '📺', categorieId: 'i-streaming-video-5157' },
  { sleutel: 'disney', naam: 'Disney+', icoon: '🏰', categorieId: 'i-streaming-video-5157' },
  { sleutel: 'streamz', naam: 'Streamz', icoon: '🎬', categorieId: 'i-streaming-video-5157' },
  { sleutel: 'prime', naam: 'Amazon Prime', icoon: '📦', categorieId: 'i-streaming-video-5157' },
  { sleutel: 'spotify', naam: 'Spotify', icoon: '🎧', categorieId: 'cat-abonnementen-en-multimedia' },
  { sleutel: 'apple-music', naam: 'Apple Music', icoon: '🎵', categorieId: 'cat-abonnementen-en-multimedia' },
  { sleutel: 'fitness', naam: 'Fitness', icoon: '🏋️', categorieId: 'i-fitnessabonnement-3929' },
  { sleutel: 'sportclub', naam: 'Sportclub', icoon: '⚽', categorieId: 'i-x-sportclub-lidgeld', frequentie: 'jaar' },
  { sleutel: 'software', naam: 'App- of software-abonnement', icoon: '📱', categorieId: 'i-x-software-abonnement' },
  { sleutel: 'cloudopslag', naam: 'Cloudopslag', icoon: '☁️', categorieId: 'i-x-cloudopslag' },
  { sleutel: 'krant', naam: 'Krant', icoon: '📰', categorieId: 'i-x-krantenabonnement' },
  { sleutel: 'tijdschrift', naam: 'Tijdschrift', icoon: '📖', categorieId: 'i-tijdschriften-8700' },
  { sleutel: 'goed-doel', naam: 'Gift aan een goed doel', icoon: '❤️', categorieId: 'i-x-gift-goed-doel' },
  { sleutel: 'domeinnaam', naam: 'Domeinnaam of webhosting', icoon: '🌐', categorieId: 'i-x-domeinnaam-en-hosting', frequentie: 'jaar' },
  { sleutel: 'gaming', naam: 'Gaming-abonnement', icoon: '🎮', categorieId: 'i-x-game-abonnement' },
  { sleutel: 'dating', naam: 'Dating-app', icoon: '💬', categorieId: 'cat-x-digitale-abonnementen' },
  { sleutel: 'opleiding', naam: 'Online opleiding', icoon: '🎓', categorieId: 'i-cursussen-en-opleidingen-8133' },
  { sleutel: 'luisterboeken', naam: 'Luisterboeken', icoon: '🎙️', categorieId: 'i-x-luisterboeken' },
]

/** Alle categorie-id's uit beide lijsten, voor de test die ze tegen de boom houdt. */
export const OPSTELLING_CATEGORIE_IDS: string[] = [...KLASSIEKE_VASTE_KOSTEN, ...SLUIPENDE_KOSTEN].map(
  (k) => k.categorieId,
)
