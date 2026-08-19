import type { TerugkerendePost } from '../data/schema'
import { opzegregelVan, type Opzegregel } from '../data/opzegregels'
import { dagenVerschil, isDagstempel, verschuifDatumMaanden } from './datum'

// Wanneer moet je beslissen over een contract? (ronde 57)
//
// DE VRAAG DIE DEZE MODULE BEANTWOORDT, en het is niet de vraag die je zou verwachten.
//
// Bij het domeinonderzoek bleek dat je in België bijna nooit meer VASTZIT. Energie kan
// je op elk moment opzeggen met één maand; een stilzwijgend verlengd abonnement op elk
// moment met hoogstens twee maanden; een verzekering vanaf haar tweede jaar op elk
// moment met twee maanden. De vraag "wanneer zit ik vast" heeft dus meestal geen
// antwoord meer.
//
// Wat wél telt: *wanneer moet ik uiterlijk beslissen als ik NIET wil dat de volgende
// periode nog aan de nieuwe prijs loopt?* Dat is één som — de verlengingsdatum min de
// opzegtermijn — en dat is het enige wat deze module uitrekent.
//
// ⚠ EN WAT ZE NIET DOET. Ze zegt niets over verbrekingsvergoedingen (zie
// `data/opzegregels.ts` voor waarom), ze beveelt geen leverancier aan (dat zou
// gereglementeerde bemiddeling zijn), en ze verzint geen datum. Zie `fase: 'verlopen'`.

/** Vanaf hoeveel dagen vóór de beslisdatum de app erover begint. */
export const BESLISVENSTER_DAGEN = 30

/**
 * Hoe staat dit contract ervoor?
 *
 * - `geen` — deze vaste last is geen contract, of er staat geen verlengingsdatum bij.
 * - `rustig` — er is nog ruim tijd; de app zwijgt.
 * - `beslissen` — de beslisdatum komt eraan (of is vandaag). Nu handelen.
 * - `verlengd` — de beslisdatum is voorbij. Je zit niet vast, maar zeg je nu op, dan
 *   loopt het contract nog de opzegtermijn door.
 * - `verlopen` — de verlengingsdatum ligt in het verleden en de app kan hem niet
 *   doorrollen, want ze weet niet voor hoe lang er verlengd is. Ze vraagt de nieuwe.
 * - `zonder-termijn` — er staat een datum, maar noch jij noch de wet geeft een
 *   opzegtermijn. De app toont de datum en rekent niets uit.
 * - `onleesbaar` — er STAAT een datum, maar het is geen echte kalenderdag (een
 *   30 februari uit een ouder toestel of uit het logboek). Vroeger zweeg de app dan
 *   volledig: rij noch belletje zeiden iets, terwijl er wél contractgegevens
 *   opgeslagen waren. Stil verkeerd is erger dan zichtbaar kapot.
 */
export type Contractfase =
  | 'geen'
  | 'rustig'
  | 'beslissen'
  | 'verlengd'
  | 'verlopen'
  | 'zonder-termijn'
  | 'onleesbaar'

/**
 * De gebruikte opzegtermijn, MET zijn eenheid.
 *
 * Waarom niet gewoon een aantal dagen (nakijkronde ronde 57): de wet spreekt in
 * MAANDEN, en "twee maanden" is geen vast aantal dagen. Twee maanden als 60 dagen
 * terugrekenen vanaf 15 SEPTEMBER geeft 17 juli in plaats van 15 juli — twee dagen te
 * laat, en bij een opzegdatum is te laat het enige echte gevaar.
 *
 * Ook JOUW eigen termijn kan in maanden, en dat is de reparatie uit de tweede
 * nakijkronde: een Belgisch contract noemt bijna altijd maanden, dus alleen dagen
 * aanbieden legde diezelfde omrekenfout gewoon bij de gebruiker.
 */
export type Opzegtermijn = { aantal: number; eenheid: 'maand' | 'dag' }

export type Contractstand = {
  fase: Contractfase
  /** De eerstvolgende verlenging, eventueel doorgerold. `null` als er geen datum is. */
  verlengtOp: string | null
  /** Verlengingsdatum min opzegtermijn. `null` wanneer er geen termijn bekend is. */
  beslisUiterlijk: string | null
  /** Dagen van vandaag tot de beslisdatum. Negatief = voorbij. */
  dagenTotBeslissing: number | null
  /** De gebruikte opzegtermijn, met eenheid. `null` wanneer er geen bekend is. */
  termijn: Opzegtermijn | null
  /** Komt die termijn uit de wet (waar) of heb jij ze zelf ingevuld (onwaar)? */
  termijnUitWet: boolean
  /** De wettelijke regel achter deze soort, voor de uitleg op het scherm. */
  regel: Opzegregel | undefined
}

const GEEN: Contractstand = {
  fase: 'geen',
  verlengtOp: null,
  beslisUiterlijk: null,
  dagenTotBeslissing: null,
  termijn: null,
  termijnUitWet: false,
  regel: undefined,
}

/**
 * `datum` plus (of min) een aantal dagen, als 'JJJJ-MM-DD'.
 *
 * Alleen voor JOUW eigen termijn, die in dagen ingevuld wordt. De wettelijke termijn
 * loopt via `verschuifDatumMaanden`; zie `Opzegtermijn` hierboven voor waarom.
 * `datum` is hier altijd al gekeurd, dus deze som kan niet mislukken.
 */
function verschuifDagen(datum: string, dagen: number): string {
  const t = Date.parse(`${datum}T00:00:00Z`)
  return new Date(t + dagen * 86400000).toISOString().slice(0, 10)
}

/**
 * De eerstvolgende verlengingsdatum vanaf vandaag.
 *
 * Ligt de opgeslagen datum in het verleden en weet de app om de hoeveel maanden er
 * verlengd wordt, dan telt ze er periodes bij tot ze in de toekomst komt. Weet ze dat
 * niet, dan geeft ze `null` — en dan zegt het scherm dat de datum voorbij is in plaats
 * van er een te verzinnen. Dat is het verschil tussen een app die je een contract laat
 * missen en een app die je vraagt haar bij te werken.
 */
export function volgendeVerlenging(
  verlengtOp: string,
  verlengtElkeMaanden: number | undefined,
  vandaagISO: string,
): string | null {
  if (!isDagstempel(verlengtOp) || !isDagstempel(vandaagISO)) return null
  if (verlengtOp >= vandaagISO) return verlengtOp
  if (!verlengtElkeMaanden || verlengtElkeMaanden <= 0) return null

  // Bewust met een teller en telkens vanaf de OORSPRONKELIJKE datum, niet met een
  // deling en niet stap voor stap: bij een sprong over februari verschuift de dag
  // (31 januari + 1 maand = 28 februari), en zou de teller vanaf dáár verder rekenen,
  // dan gleed de 31e voorgoed weg naar de 28e.
  //
  // De bovengrens is er tegen een oneindige lus wanneer iemand een datum uit 1900
  // invult: honderd jaar aan periodes is ruim genoeg, en daarna geeft ze `null`,
  // wat het scherm netjes opvangt.
  const maxStappen = Math.ceil((100 * 12) / verlengtElkeMaanden)
  for (let n = 1; n <= maxStappen; n++) {
    const kandidaat = verschuifDatumMaanden(verlengtOp, n * verlengtElkeMaanden)
    if (kandidaat === null) return null
    if (kandidaat >= vandaagISO) return kandidaat
  }
  return null
}

/**
 * De stand van het contract achter één vaste last.
 *
 * Zuiver: geen React, geen database, en "vandaag" komt van buiten — deze module kijkt
 * zelf nooit op de klok.
 */
export function contractstand(post: TerugkerendePost, vandaagISO: string): Contractstand {
  const regel = opzegregelVan(post.contractsoort)
  if (!post.contractsoort || !post.verlengtOp) return { ...GEEN, regel }
  // Er STAAT een datum, maar het is er geen. Dat hoort zichtbaar te zijn.
  if (!isDagstempel(post.verlengtOp)) {
    return { ...GEEN, fase: 'onleesbaar', verlengtOp: post.verlengtOp, regel }
  }

  // Jouw eigen termijn wint altijd van de wettelijke. Wat in JOUW overeenkomst staat
  // kan korter zijn dan het wettelijke maximum, en dan is de wettelijke termijn een
  // datum die te vroeg ligt — vervelend, maar niet gevaarlijk. Andersom wel.
  //
  // Deze twee regels staan bewust VÓÓR de splitsing hieronder: in de nakijkronde stond
  // de tak 'verlopen' zijn eigen versie te berekenen, en die zette `termijnUitWet` op
  // waar terwijl er helemaal geen wettelijke termijn was. Eén plek, één antwoord.
  const eigenTermijn: Opzegtermijn | null =
    post.opzegtermijnMaanden !== undefined
      ? { aantal: post.opzegtermijnMaanden, eenheid: 'maand' }
      : post.opzegtermijnDagen !== undefined
        ? { aantal: post.opzegtermijnDagen, eenheid: 'dag' }
        : null
  const termijn: Opzegtermijn | null =
    eigenTermijn ??
    (regel?.standaardTermijnMaanden != null ? { aantal: regel.standaardTermijnMaanden, eenheid: 'maand' } : null)
  const termijnUitWet = eigenTermijn === null && termijn !== null

  const verlengtOp = volgendeVerlenging(post.verlengtOp, post.verlengtElkeMaanden, vandaagISO)
  if (verlengtOp === null) {
    return {
      fase: 'verlopen',
      verlengtOp: post.verlengtOp,
      beslisUiterlijk: null,
      dagenTotBeslissing: null,
      termijn,
      termijnUitWet,
      regel,
    }
  }

  if (termijn === null) {
    return {
      fase: 'zonder-termijn',
      verlengtOp,
      beslisUiterlijk: null,
      dagenTotBeslissing: null,
      termijn: null,
      termijnUitWet: false,
      regel,
    }
  }

  const beslisUiterlijk =
    termijn.eenheid === 'maand'
      ? verschuifDatumMaanden(verlengtOp, -termijn.aantal)
      : verschuifDagen(verlengtOp, -termijn.aantal)
  const dagenTotBeslissing = beslisUiterlijk === null ? null : dagenVerschil(vandaagISO, beslisUiterlijk)
  if (beslisUiterlijk === null || dagenTotBeslissing === null) return { ...GEEN, regel }

  const fase: Contractfase =
    dagenTotBeslissing < 0 ? 'verlengd' : dagenTotBeslissing <= BESLISVENSTER_DAGEN ? 'beslissen' : 'rustig'

  return { fase, verlengtOp, beslisUiterlijk, dagenTotBeslissing, termijn, termijnUitWet, regel }
}

/**
 * Alle vaste lasten waarover je binnenkort moet beslissen, de dringendste eerst.
 *
 * Welke posten meetellen, beslist `contractTeltNog` hieronder — dezelfde regel die de
 * lijst op de Plan-pagina gebruikt.
 */
export function tebeslissenContracten(
  posten: TerugkerendePost[],
  vandaagISO: string,
): { post: TerugkerendePost; stand: Contractstand }[] {
  return posten
    .map((post) => ({ post, stand: contractstand(post, vandaagISO) }))
    .filter(({ post, stand }) => {
      if (stand.fase !== 'beslissen' && stand.fase !== 'verlopen' && stand.fase !== 'onleesbaar') return false
      return contractTeltNog(post, stand, vandaagISO)
    })
    .sort((a, b) => {
      // Eerst wat de app niet kán uitrekenen — daar heeft ze jou het hardst nodig.
      // Daarna op hoe dichtbij de beslisdatum ligt, en ten slotte op id, anders hangt
      // de volgorde af van hoe de gegevens uit de database komen.
      const rang = (f: Contractfase) => (f === 'onleesbaar' ? 0 : f === 'verlopen' ? 1 : 2)
      return (
        rang(a.stand.fase) - rang(b.stand.fase) ||
        (a.stand.dagenTotBeslissing ?? 0) - (b.stand.dagenTotBeslissing ?? 0) ||
        (a.post.id < b.post.id ? -1 : a.post.id > b.post.id ? 1 : 0)
      )
    })
}

/**
 * Heeft dit contract vandaag nog iets te betekenen, of stopt de post er toch al mee?
 *
 * ⚠ Een post die al STOPT vóór zijn eigen verlenging, telt niet mee. Dat is scherper
 * dan "is hij vandaag al gestopt": zeg je in augustus een abonnement op tegen oktober,
 * terwijl het in november zou verlengen, dan hoef je over die verlenging niets meer te
 * beslissen — je bent er al weg. Zonder deze regel bleef de app je herinneren aan een
 * beslissing die je net genomen had. (`eindMaand` is de maand VANAF wanneer de post
 * niet meer telt; zie `isGestopt` in utils/vastelast.ts.)
 *
 * Staat hier apart sinds de tweede nakijkronde van ronde 57: het belletje paste deze
 * regel toe en de LIJST op de Plan-pagina niet. Wie december bekeek, las daar nog
 * "beslissen vóór 1 januari" over een contract dat sowieso eind december stopte,
 * terwijl het belletje er terecht over zweeg. Twee schermen, één feit, één regel.
 */
export function contractTeltNog(post: TerugkerendePost, stand: Contractstand, vandaagISO: string): boolean {
  if (!post.eindMaand) return true
  // Bij 'verlopen' en 'onleesbaar' staat er in `stand.verlengtOp` de OUDE of de
  // onleesbare datum. Daarmee vergelijken zou een post die intussen gestopt is toch
  // laten opduiken. Dan telt alleen of de post vandaag nog loopt. Anders telt wél de
  // verlengingsdatum: stop je vóór ze valt, dan hoef je niets meer te beslissen.
  const bruikbaar = stand.fase !== 'verlopen' && stand.fase !== 'onleesbaar' ? stand.verlengtOp : null
  return post.eindMaand > (bruikbaar ?? vandaagISO).slice(0, 7)
}
