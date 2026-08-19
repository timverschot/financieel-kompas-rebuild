// De Belgische opzegtermijnen, als GEGEVENS (ronde 57).
//
// Waarom dit een gegevensbestand is en geen logica. Deze regels veranderen: de
// verzekeringsregels wijzigden op 1 oktober 2024, en de telecomregels zijn in de
// voorbije jaren meermaals bijgesteld. Eén regel hieronder bijzetten of aanpassen is
// het volledige onderhoud. Dezelfde aanpak als `fiscalePosten.ts` en
// `gezondheidsindex.ts`.
//
// ⚠ DE GRENS DIE DIT HELE ONDERDEEL STUURT: **WEL WAARSCHUWEN, NIET AANBEVELEN.**
// De app zegt wanneer je moet beslissen. Ze zegt nooit bij wie je beter zou zitten —
// een leverancier voorstellen tegen vergoeding is gereglementeerde bemiddeling (FSMA),
// en het zou de privacybelofte van deze app onderuithalen.
//
// ⚠ WAT DIT BESTAND BEWUST NIET BEVAT: verbrekingsvergoedingen, boetes en restwaarden.
// Dat zijn BEDRAGEN, en een bedrag dat de app niet kan verantwoorden hoort ze niet te
// tonen. Ze rekent alleen met de OPZEGTERMIJN — het enige stuk dat ze nodig heeft om
// een datum uit te rekenen, en het stuk waarvan de bron hard is.
//
// BRONNEN. Zie `claude/domeinonderzoek_opzegtermijnen_belgie.md` voor de volledige
// verantwoording met links en citaten. Elke regel hieronder draagt zijn eigen bron mee.
//
// GRENS. Dit is België, particulier. Huur zit er bewust niet in: dat is een ander
// stelsel met gewestelijke regels, en dat is een eigen module of niets.

/** De soorten contracten waarvoor de app een wettelijke termijn kent. */
export const CONTRACTSOORTEN = ['energie', 'telecom', 'verzekering', 'abonnement', 'ander'] as const
export type Contractsoort = (typeof CONTRACTSOORTEN)[number]

export type Opzegregel = {
  soort: Contractsoort
  /** De naam zoals ze op het scherm komt. Vertaalbaar via `t()`. */
  naam: string
  /**
   * De opzegtermijn in KALENDERMAANDEN die de app als vertrekpunt gebruikt.
   *
   * ⚠ In maanden, en dat is sinds de nakijkronde van ronde 57 geen detail meer. Eerst
   * stond hier een omrekening naar dagen (één maand = 30 dagen). Die rekende een
   * verlenging op 15 april terug naar 16 maart, terwijl de wettelijke uiterste dag
   * 15 maart is: één dag TE LAAT. Bij twee maanden hangt het van de maand af — vóór
   * 15 september komt 60 dagen op 17 juli uit in plaats van 15 juli, dus twee dagen te
   * laat. Bij een opzegdatum is te laat precies het gevaar dat deze hele module moet
   * wegnemen. De rekenkern werkt nu met echte kalendermaanden
   * (`verschuifDatumMaanden` in `utils/datum.ts`).
   *
   * `null` = de app kent geen wettelijke termijn voor deze soort en rekent niets uit
   * tenzij jij zelf een termijn invult. Dat is geen tekortkoming maar een keuze: een
   * verzonnen termijn levert een verzonnen datum op, en die zou je een contract
   * kunnen kosten.
   */
  standaardTermijnMaanden: number | null
  /** Wat de wet zegt, in klare taal. Vertaalbaar. */
  uitleg: string
  /** Wat de app hierover NIET weet, of waar de regel niet geldt. Vertaalbaar. */
  voorbehoud: string
  bron: string
  /** Wanneer deze regel voor het laatst nagekeken is. */
  nagekekenOp: string
}

export const OPZEGREGELS: Opzegregel[] = [
  {
    soort: 'energie',
    naam: 'Energie (elektriciteit of gas)',
    standaardTermijnMaanden: 1,
    uitleg:
      'Een huishoudelijke afnemer mag een energiecontract op elk ogenblik beëindigen met één maand opzegtermijn — ook een contract met een vaste prijs. De vraag is dus meestal niet óf je weg kan, maar of je wil dat de volgende periode aan de nieuwe prijs loopt.',
    voorbehoud:
      'De app rekent alleen met de opzegtermijn. Over vergoedingen of boetes zegt ze niets: dat zijn bedragen die van jouw contract afhangen, en die kan ze niet narekenen.',
    bron: 'https://www.creg.be/sites/default/files/assets/Publications/Notes/Z2265NL.pdf',
    nagekekenOp: '2026-08-18',
  },
  {
    soort: 'telecom',
    naam: 'Telecom (internet, gsm of tv)',
    standaardTermijnMaanden: 2,
    uitleg:
      'Na de eerste zes maanden kan je een telecomcontract opzeggen zonder opzegvergoeding, hoe lang de looptijd ook is. De opzegtermijn in je contract mag niet meer dan twee maanden bedragen.',
    voorbehoud:
      'Twee maanden is het WETTELIJKE MAXIMUM. Wat in jouw contract staat, kan korter zijn — kijk het na en pas de termijn hieronder aan. Kreeg je een toestel bij je abonnement, dan mag de operator nog de restwaarde ervan aanrekenen; die staat in de aflossingstabel bij je contract. Zeg je op in de eerste zes maanden, dan betaal je het abonnement nog tot het einde van de zesde maand.',
    bron: 'https://consumerconnect.be/nl/themas/telecom/telecomcontracten/contracten/beeindigen',
    nagekekenOp: '2026-08-19',
  },
  {
    soort: 'verzekering',
    naam: 'Verzekering',
    standaardTermijnMaanden: 2,
    uitleg:
      'Voor een niet-levensverzekering geldt sinds 1 oktober 2024 twee maanden: in het eerste jaar zeg je op tegen de jaarlijkse vervaldag met twee maanden vooraf, en vanaf het tweede jaar kan je op elk moment opzeggen met twee maanden opzegtermijn.',
    voorbehoud:
      'Dit geldt voor niet-levensverzekeringen zoals auto, woning en familiale, en voor contracten die vanaf 1 oktober 2024 gesloten of stilzwijgend verlengd zijn. Voor een gezondheids- of hospitalisatieverzekering (drie maanden vóór de jaarlijkse vervaldag) en voor levensverzekeringen gelden andere regels: vul de termijn dan zelf in.',
    bron: 'https://press.assuralia.be/verzekeringssector-nieuwe-regels-vanaf-1-oktober',
    nagekekenOp: '2026-08-19',
  },
  {
    soort: 'abonnement',
    naam: 'Abonnement met stilzwijgende verlenging',
    standaardTermijnMaanden: 2,
    uitleg:
      'Is je dienstencontract van bepaalde duur stilzwijgend verlengd, dan kan je het op elk ogenblik zonder vergoeding opzeggen. De opzegtermijn uit je contract geldt, maar mag niet meer dan twee maanden bedragen.',
    voorbehoud:
      'Deze regel geldt voor DIENSTEN (artikel VI.91 WER) en pas NA een stilzwijgende verlenging. Zit het contract nog in zijn eerste periode, dan telt wat er in de overeenkomst staat. Twee maanden is het wettelijke maximum; korter kan.',
    bron: 'https://www.elfri.be/artikel/stilzwijgende-verlenging-van-consumentencontracten',
    nagekekenOp: '2026-08-19',
  },
  {
    soort: 'ander',
    naam: 'Ander contract',
    standaardTermijnMaanden: null,
    uitleg:
      'De app kent voor dit soort contract geen wettelijke termijn. Vul zelf in wat er in je overeenkomst staat; zonder termijn toont ze alleen de datum en rekent ze niets uit.',
    voorbehoud: '',
    bron: '',
    nagekekenOp: '2026-08-19',
  },
]

/** De regel voor één soort, of `undefined` bij een soort die niet bestaat. */
export function opzegregelVan(soort: Contractsoort | undefined): Opzegregel | undefined {
  if (!soort) return undefined
  return OPZEGREGELS.find((r) => r.soort === soort)
}
