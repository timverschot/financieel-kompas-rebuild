import type {
  DossierDocument,
  Kindrekening,
  Onderhoudsbijdrage,
  Verrekening,
} from '../data/schema'

// De onderdelen van een dossier (afgesplitst in ronde 60).
//
// Waarom een eigen bestand: dit zijn gegevens en twee zuivere functies, geen
// component. Ze worden gelezen door het dossierscherm, door het formulier dat een
// nieuw dossier maakt, en door de tests. Stonden ze in het componentbestand, dan
// exporteerde dat naast een component ook constanten, en dat breekt het live
// herladen tijdens het ontwikkelen.

// De onderdelen van een dossier die je kan wegklikken.
//
// Niet elk dossier gebruikt alles. De ene co-ouder rekent alles fiftyfifty af en
// heeft nooit een verdeelsleutel per categorie nodig; de andere heeft geen
// gezamenlijke pot en bewaart de papieren elders. Die kaarten scrollen dan eeuwig
// mee zonder ooit iets te doen.
//
// Wat er BEWUST niet in staat: de lijst met open kosten. Dat is waar een dossier
// voor bestaat — verberg je die, dan blijft er een lege pagina over. De keuze zit
// op het dossier (`Dossier.verborgenOnderdelen`), dus ze klopt ook op je gsm.
//
// 'verrekeningen' kwam er in ronde 36 bij: wie zijn kosten gewoon bijhoudt en pas
// op het einde van het jaar afrekent, scrolt anders elke keer voorbij twee kaarten
// die hij nooit gebruikt.
//
// ⚠ `standaard` bepaalt wat een NIEUW dossier toont (ronde 60). Vóór die ronde
// stonden alle acht meteen open: je maakte een dossier aan om kosten bij te houden
// en kreeg acht lege kaarten onder elkaar, met de enige die je nodig had ergens
// halverwege. Nu begin je met de kern — kosten en afrekenen — en zet je erbij wat je
// nodig hebt. De chips staan bovenaan, dus het is één tik.
//
// ⚠ Alleen voor NIEUWE dossiers. Een bestaand dossier heeft geen `verborgenOnderdelen`
// of een eigen keuze, en verandert dus niet: wat je gisteren zag, zie je vandaag ook.
// ⚠ RONDE 93 — `label` IS EEN CHIPNAAM, GEEN KAARTTITEL. Gemeten in Chromium op een scherm
// van 360 px: met alle acht de volledige kaarttitels als chipnaam besloeg deze rij 306 px in
// ACHT rijen chips, en het blok eromheen 459 px — twee derde van een telefoonscherm, bovenaan
// élk dossier, elke keer. Met vijf namen ingekort is dat 189 px in VIJF rijen en een blok van
// 300 px. Dezelfde les als in ronde 90: de winst zit in de namen, niet in het wegklappen.
//
// ⚠ ELKE NAAM KOMT LETTERLIJK VOOR IN DE TITEL VAN DE KAART DIE ZE BEDIENT — "Kindrekening"
// in "Kindrekening (gezamenlijke pot)", "Uitwisselen" in "Uitwisselen met de andere ouder".
// Zo weet je bij het uitzetten welk blok verdwijnt. `dossieronderdelen.test.ts` bewaakt dat,
// met `afrekening-detail` als enige uitzondering: die bedient geen kaart maar de opbouw
// BINNEN de afrekeningenkaart.
//
// ⚠ EN DE TWEE VERDEELSLEUTELS BLIJVEN VOLUIT (doorlichting). "Verdeling per categorie" leek
// in te korten tot "Per categorie" — tot bleek dat er in de opbouw van een afrekening al een
// kopje "Per categorie" staat dat deze chip NIET uitzet. Dan belooft de naam iets wat ze niet
// waarmaakt. Bovendien draagt dezelfde naam de regel "{onderdeel} staat uit, maar er staat wel
// iets in": "Per kostensoort staat uit …" is geen Nederlands, "Verdeling per kostensoort staat
// uit …" wel. Dat kost twee rijen chips, en die zijn het waard.
//
// ⚠ Dezelfde naam draagt óók de knop "Toon {onderdeel}" ernaast. Bij de vijf andere werkt kort
// daar even goed: "Kindrekening staat uit, maar er staat wel iets in."
export const DOSSIER_ONDERDELEN = [
  { id: 'verdeling-categorie', label: 'Verdeling per categorie', standaard: false },
  { id: 'verdeling-kostensoort', label: 'Verdeling per kostensoort', standaard: false },
  // ⚠ RONDE 91 — HET LABEL HEET 'Afrekeningen', DE SLEUTEL BLIJFT 'verrekeningen'. Het
  // gegevenstype heet `Verrekening`, maar wat erin zit IS een afrekening: "een momentopname
  // van het te verrekenen bedrag over een gekozen periode" (zie `VerrekeningSchema`). Deze
  // chip zet dan ook precies de kaarten "Nieuwe afrekening" en "Afrekeningen" aan en uit.
  // Twee Nederlandse woorden voor één ding is precies wat ronde 66 verbood — en het Engels
  // en het Frans erfden die dubbelheid met één woord voor allebei.
  // ⚠ De ID verandert NIET: die staat in `Dossier.verborgenOnderdelen` op de schijf van
  // iedereen, en is taal-onafhankelijk (anti-verwarringsregel 7).
  { id: 'verrekeningen', label: 'Afrekeningen', standaard: true },
  // Ronde 40: een eigen sleutel, bewust NIET aan 'verrekeningen' gehangen. Die
  // vlag dekt al twee kaarten; er een derde bij zetten zou betekenen dat wie de
  // opbouw niet wil zien ook de knop kwijtraakt om een afrekening te maken.
  { id: 'afrekening-detail', label: 'Opbouw', standaard: true },
  { id: 'onderhoudsbijdrage', label: 'Onderhoudsbijdrage', standaard: false },
  { id: 'gezamenlijke-pot', label: 'Kindrekening', standaard: false },
  { id: 'documentkluis', label: 'Documentkluis', standaard: false },
  // Ronde 44. Wie zijn dossier alleen bijhoudt, wisselt niets uit en hoort deze
  // kaart niet elke keer voorbij te scrollen.
  { id: 'uitwisseling', label: 'Uitwisselen', standaard: false },
] as const

/**
 * Wat een nieuw dossier verbergt: alles wat niet standaard aan staat.
 *
 * Staat hier en niet in het formulier, zodat de lijst en de keuze niet uit elkaar
 * kunnen lopen wanneer er ooit een onderdeel bijkomt.
 */
export function verborgenBijNieuwDossier(): DossierOnderdeel[] {
  return DOSSIER_ONDERDELEN.filter((o) => !o.standaard).map((o) => o.id)
}

export type DossierOnderdeel = (typeof DOSSIER_ONDERDELEN)[number]['id']

/**
 * De nieuwe lijst met verborgen onderdelen na één klik op een chip.
 *
 * Zuiver, zodat de regel te toetsen is zonder klok en zonder wedloop — en dat is
 * hier nodig: de fout die deze functie oplost, viel in een componenttest maar één
 * keer op de drie om (nakijkronde ronde 60).
 *
 * ⚠ ONTDUBBELT. Tik je twee keer snel op dezelfde chip, dan ziet de tweede tik nog
 * de oude toestand — de opslag is dan nog onderweg — en vroeg hij dus opnieuw om
 * "verbergen". Zonder deze `Set` stond de sleutel er twee keer in, in het logboek en
 * al. Dat is geen ramp, maar het is wél een record dat niemand bedoeld heeft.
 */
export function volgendeVerborgenLijst(basis: readonly string[], id: string, zichtbaar: boolean): string[] {
  return zichtbaar ? basis.filter((v) => v !== id) : Array.from(new Set([...basis, id]))
}

/**
 * Welke UITGEZETTE onderdelen dragen toch gegevens? (ronde 60)
 *
 * ⚠ WAAROM DIT MOET BESTAAN. Sinds een nieuw dossier met minder begint, kan er iets
 * in een onderdeel belanden dat niet getoond wordt. Dat gebeurt echt: de rekenhulp
 * "Indexatie" kan een onderhoudsbijdrage rechtstreeks in een dossier bewaren, en de
 * bewijsmap verwijst naar documenten in de kluis. Stond dat onderdeel uit, dan zag
 * je die gegevens nergens meer — en een app die gegevens verbergt zonder het te
 * zeggen, is erger dan een app met één kaart te veel.
 *
 * De tekst op het scherm zegt dus niet "je hebt iets uitgezet" maar "hier staat
 * iets in dat je niet ziet", met de knop om het aan te zetten ernaast.
 */
export function verborgenMetInhoud(
  dossierId: string,
  // Bewust `string[]`: zo staat het in het schema. Een oud logboekbestand kan een
  // sleutel dragen die deze versie niet meer kent, en die hoort hier gewoon buiten
  // de lijst te vallen in plaats van de app te laten struikelen.
  verborgen: readonly string[],
  gegevens: {
    verrekeningen: Verrekening[]
    kindrekeningen: Kindrekening[]
    onderhoudsbijdragen?: Onderhoudsbijdrage[]
    documenten?: DossierDocument[]
    /**
     * De afwijkende verdeelsleutels van dít dossier (nakijkronde ronde 60).
     *
     * ⚠ Deze twee zijn geen passieve gegevens: `effectiefAandeel` past ze toe op ÉLKE
     * kost, ook wanneer de kaart uitstaat, en de afrekening en de bewijsmap rekenen
     * ermee. Zet je de kaart uit nadat je Voeding op 30 % zette, dan blijft elke
     * afrekening 30/70 verdelen terwijl nergens op het scherm nog te zien is dát er
     * een afwijking bestaat. Precies het geval waarvoor deze functie bedoeld is.
     */
    categorieAandelen?: Record<string, number>
    typeAandelen?: Record<string, number>
  },
): DossierOnderdeel[] {
  const heeft: Partial<Record<DossierOnderdeel, boolean>> = {
    verrekeningen: gegevens.verrekeningen.some((v) => v.dossierId === dossierId),
    'gezamenlijke-pot': gegevens.kindrekeningen.some((k) => k.dossierId === dossierId),
    onderhoudsbijdrage: (gegevens.onderhoudsbijdragen ?? []).some((b) => b.dossierId === dossierId),
    documentkluis: (gegevens.documenten ?? []).some((d) => d.dossierId === dossierId),
    'verdeling-categorie': Object.keys(gegevens.categorieAandelen ?? {}).length > 0,
    'verdeling-kostensoort': Object.keys(gegevens.typeAandelen ?? {}).length > 0,
  }
  // De volgorde van `DOSSIER_ONDERDELEN` aanhouden, niet die van `verborgen`: anders
  // hangt de volgorde op het scherm af van de volgorde waarin je ooit dingen uitzette.
  return DOSSIER_ONDERDELEN.filter((o) => verborgen.includes(o.id) && heeft[o.id]).map((o) => o.id)
}
