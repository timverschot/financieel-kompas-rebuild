// De indeling van de navigatie (afgesplitst in ronde 60).
//
// Waarom dit een eigen bestand is: het zijn GEGEVENS, geen component. Ze worden ook
// gelezen door `utils/route.ts` (om een adres te keuren), door de zijbalk en door de
// tests. Stonden ze in het componentbestand, dan exporteerde dat naast een component
// ook een handvol constanten, en dat breekt het live herladen tijdens het ontwikkelen.

// De pagina's van de app. De interne id blijft taal-onafhankelijk; enkel het label
// wordt vertaald. Sinds de layout-herwerking (V1-logica) is elk onderdeel een
// aparte pagina i.p.v. één lange 'Meer'-scroll.
export type Pagina =
  | 'opstelling'
  | 'overzicht'
  | 'transacties'
  | 'rekeningen'
  | 'spaardoelen'
  | 'budget'
  | 'dossiers'
  | 'analyse'
  | 'categorieen'
  | 'rekenhulpen'
  | 'importeren'
  | 'maandafsluiting'
  | 'fiscaal'
  | 'kindkosten'
  | 'instellingen'

// Alle pagina's met icoon + label, in de volgorde van het desktop-zijpaneel.
export const PAGINAS: { id: Pagina; icoon: string; label: string }[] = [
  { id: 'overzicht', icoon: '🏠', label: 'Overzicht' },
  { id: 'opstelling', icoon: '🧭', label: 'Je situatie' },
  // ⚠ RONDE 66. De pagina heette "Transacties" terwijl de rest van de app over
  // "boekingen" spreekt — vier woorden voor één ding maakten de app onleerbaar. De
  // ID blijft `transacties`: die staat in het adres en in bewaarde routes.
  { id: 'transacties', icoon: '💳', label: 'Boekingen' },
  { id: 'rekeningen', icoon: '🏦', label: 'Rekeningen' },
  { id: 'spaardoelen', icoon: '💰', label: 'Spaardoelen' },
  { id: 'budget', icoon: '🎯', label: 'Budget' },
  // Eén ingang voor alle dossiers. Leningen en garanties stonden vroeger op een
  // eigen pagina 'leningen' die niets meer was dan twee secties onder elkaar; ze
  // zitten nu als subtab op déze pagina. Zie `ui/Subtabs.tsx`.
  { id: 'dossiers', icoon: '👨‍👧', label: 'Dossiers' },
  { id: 'analyse', icoon: '📊', label: 'Analyse' },
  { id: 'categorieen', icoon: '🏷️', label: 'Categorieën' },
  { id: 'rekenhulpen', icoon: '🧮', label: 'Rekenhulpen' },
  { id: 'importeren', icoon: '📥', label: 'Inlezen' },
  // De maandafsluiting staat bewust NA Inlezen: dat is ook de volgorde waarin je
  // ze gebruikt — eerst je uittreksel erin, dan de maand rondmaken.
  { id: 'maandafsluiting', icoon: '✅', label: 'Maandafsluiting' },
  { id: 'fiscaal', icoon: '🧾', label: 'Fiscaal jaaroverzicht' },
  { id: 'kindkosten', icoon: '👶', label: 'Wat kost elk gezinslid?' },
  { id: 'instellingen', icoon: '⚙️', label: 'Instellingen' },
]

// Op mobiel: vier tabs + een centrale ➕ (V1-patroon). Links Overzicht en
// Transacties, rechts Budget, en dan Meer. De rest zit onder 'Meer'.
//
// ⚠ BUDGET STOND HIER NIET, EN ANALYSE WEL (ronde 60). Dat was omgekeerd. Budget is
// de reden dat iemand een budget-app installeert en je opent het meerdere keren per
// maand; het zat op de vierde regel van een lade met twaalf pagina's. Analyse is een
// verdiepingspagina: je gaat erheen wanneer je iets wil uitzoeken, niet wanneer je
// even snel iets wil nakijken. Die twee zijn van plaats gewisseld.
export const PRIMAIR_LINKS: Pagina[] = ['overzicht', 'transacties']
export const PRIMAIR_RECHTS: Pagina[] = ['budget']

/**
 * De lade achter 'Meer', in twee groepen (ronde 60).
 *
 * ⚠ WAT ER MIS WAS. Twaalf pagina's onder één ⋯, ongesorteerd, alleen uit elkaar te
 * houden aan een emoji. Daar stonden dagtaken (Rekeningen, Inlezen, de
 * Maandafsluiting) en zeldzaamheden (het fiscaal jaaroverzicht, de rekenhulpen,
 * Instellingen) door elkaar — en Dossiers, het onderdeel dat deze app onderscheidt,
 * stond op de vijfde regel.
 *
 * Twee groepen met een kop is het goedkoopste wat je aan zo'n lijst kan doen: je
 * hoeft niet meer te lezen om te weten waar je moet kijken. De volgorde binnen een
 * groep is die van gebruik, niet alfabetisch — Dossiers eerst.
 */
export const LADE_GROEPEN: { titel: string; paginas: Pagina[] }[] = [
  {
    // De kop gaat over hoe VAAK je hier komt, niet over hoe zwaar het onderdeel is.
    // Daarom staat Analyse hier en niet in de balk: je opent ze wél elke maand — bij
    // het rondmaken van de maand — maar niet meerdere keren per week zoals je
    // transacties of je budget. Dat is precies het verschil tussen "in de balk" en
    // "bovenaan de lade".
    titel: 'Elke maand',
    paginas: ['dossiers', 'rekeningen', 'importeren', 'maandafsluiting', 'analyse', 'spaardoelen'],
  },
  {
    titel: 'Af en toe',
    paginas: ['opstelling', 'categorieen', 'rekenhulpen', 'fiscaal', 'kindkosten', 'instellingen'],
  },
]

// Afgeleid, niet naast elkaar bijgehouden: anders valt een nieuwe pagina er ooit
// tussenuit en is ze nergens meer te bereiken. `OnderNavigatie.test.tsx` bewaakt dat
// élke pagina precies één plek heeft.
export const SECUNDAIR: Pagina[] = LADE_GROEPEN.flatMap((g) => g.paginas)
