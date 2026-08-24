import type { Pagina } from '../components/navigatie'

// Wat je in Kompal kan uitzetten (ronde 75 — "Minder tegelijk").
//
// ⚠ DIT IS DE VIERDE EN LAATSTE RONDE UIT DE TWAALFJARIGETEST, en ze gaat over
// Timothy's tweede struikelblok: *"Er staat te veel tegelijk."* Zijn voorwaarde
// stond er meteen bij: **verbergen mag, maar verbergen is niet weghalen** — er moet
// een plek zijn waar je het weer aanzet, mét een zin die zegt wat het is.
//
// De app deed dat vóór deze ronde precies omgekeerd. Ze liet dingen STIL verdwijnen
// (drie van de vier verdelingskaarten op Analyse zodra er geen gegevens zijn; de
// kaart die uitlegt wát een dossier is zodra je er één hebt) en had nergens een
// schakelaar. Je ontdekte dus nooit dat de app iets kón.
//
// ⚠ HET MODEL BESTOND AL BINNEN DE APP: de chiprij "Wat toon je in dit dossier?"
// (`utils/dossieronderdelen.ts`, ronde 60), met de zin *"Wat je uitzet, verdwijnt
// alleen uit beeld — er gaat niets verloren."* Dit is dezelfde bouwsteen, één laag
// hoger: niet per dossier maar voor de hele app.

/**
 * Eén onderdeel dat je aan of uit kan zetten.
 *
 * `uitleg` is geen versiering maar de kern van de afspraak: een chip met alleen een
 * naam is een schakelaar waarvan je niet weet wat hij doet, en dan durf je hem niet
 * aan te raken. De zin zegt in gewone woorden wat er achter die pagina zit.
 */
export type AppOnderdeel = {
  pagina: Pagina
  /** Wat het is, in één zin. Wordt vertaald. */
  uitleg: string
}

/**
 * De pagina's die je mag uitzetten — en, minstens even belangrijk, welke NIET.
 *
 * ⚠ ZES PAGINA'S STAAN ER BEWUST NIET IN, en dat is een veiligheidskeuze:
 *
 *  - **Overzicht, Boekingen, Budget** — dat is de app. Wie die uitzet, houdt een
 *    lege schil over.
 *  - **Rekeningen** — alles in de app hangt aan een rekening; zonder dat scherm kan
 *    je er geen bijmaken en loopt elk formulier dood.
 *  - **Je situatie** — daar landt een gloednieuwe app (zie `beginpagina` in App.tsx).
 *    Een startpagina die je kan wegklikken is een deur die achter je dichtvalt.
 *  - **Instellingen** — daar staat deze schakelaar zelf. Wie die uitzet, kan nooit
 *    meer iets terugzetten. Dat is precies het soort val dat deze ronde moet
 *    uitroeien, niet er een van maken.
 */
export const APP_ONDERDELEN: AppOnderdeel[] = [
  {
    pagina: 'dossiers',
    uitleg: 'Kosten delen met de andere ouder, geld dat je uitleende, en je garantiebewijzen.',
  },
  {
    pagina: 'spaardoelen',
    uitleg: 'Potjes voor later: een buffer, een grote aankoop, of sparen voor een jaarafrekening.',
  },
  {
    pagina: 'analyse',
    uitleg: 'Grafieken over waar je geld naartoe ging, en hoe dat evolueert.',
  },
  {
    pagina: 'importeren',
    uitleg: 'Het bestand van je bank inlezen in plaats van je boekingen zelf in te tikken.',
  },
  {
    pagina: 'maandafsluiting',
    uitleg: 'Een maand rondmaken: staat alles erin, en wat hield je over?',
  },
  {
    pagina: 'categorieen',
    uitleg: 'De lijst waarin je boekingen ingedeeld worden, aanpassen of uitbreiden.',
  },
  {
    pagina: 'rekenhulpen',
    uitleg: 'Losse rekenmachines: hoeveel per maand voor een doel, en wat een indexatie doet.',
  },
  {
    pagina: 'fiscaal',
    uitleg: 'Een overzicht van de uitgaven die je op je belastingbrief kan zetten.',
  },
  {
    pagina: 'kindkosten',
    uitleg: 'Wat elk gezinslid je per maand kost.',
  },
]

/** De pagina's die je kan uitzetten, als verzameling — om er snel op te toetsen. */
export const UITZETBAAR: ReadonlySet<Pagina> = new Set(APP_ONDERDELEN.map((o) => o.pagina))

/**
 * Wat "alleen de basis" betekent: alles uit wat uit mag.
 *
 * ⚠ Dit is GEEN standaardwaarde. Wie de app al gebruikt, mag niet wakker worden met
 * negen verdwenen pagina's — dat is dezelfde regel als bij de dossieronderdelen van
 * ronde 60 ("wat je gisteren zag, zie je vandaag ook"). Alles staat standaard AAN;
 * dit is één knop die je zelf indrukt, met ernaast wat er dan weggaat.
 */
export const ALLEEN_DE_BASIS: Pagina[] = APP_ONDERDELEN.map((o) => o.pagina)

/**
 * Mag deze pagina getoond worden?
 *
 * ⚠ EEN PAGINA DIE NIET UITZETBAAR IS, IS ALTIJD ZICHTBAAR — ook wanneer haar id
 * per ongeluk in de lijst met verborgen pagina's belandt (een oude voorkeur, een
 * ander toestel, handmatig gerommel in localStorage). Zonder deze regel zou één
 * rare waarde in de opslag je Instellingen onbereikbaar maken, en daarmee de enige
 * plek waar je het kan herstellen.
 */
export function toontPagina(pagina: Pagina, verborgen: ReadonlySet<Pagina>): boolean {
  if (!UITZETBAAR.has(pagina)) return true
  return !verborgen.has(pagina)
}

/**
 * De nieuwe lijst met verborgen pagina's na één klik op een chip.
 *
 * Zuivere functie, net als `wisselOnderdeel` bij de dossiers: de component hoeft
 * niets over verzamelingen te weten, en de regel is apart te testen.
 */
export function wisselPagina(verborgen: ReadonlySet<Pagina>, pagina: Pagina): Pagina[] {
  if (!UITZETBAAR.has(pagina)) return [...verborgen]
  const uit = new Set(verborgen)
  if (uit.has(pagina)) uit.delete(pagina)
  else uit.add(pagina)
  return [...uit]
}

/**
 * Leest een bewaarde lijst en gooit alles weg wat vandaag geen uitzetbare pagina is.
 *
 * ⚠ Nodig omdat de voorkeur in `localStorage` staat en dus een vorige versie van de
 * app kan overleven. Verdwijnt een pagina ooit uit `APP_ONDERDELEN` — omdat ze niet
 * meer bestaat, of omdat ze te belangrijk geworden is om te verbergen — dan hoort
 * een oude voorkeur haar niet te blijven wegdrukken.
 */
export function keurVerborgen(ruw: unknown): Pagina[] {
  if (!Array.isArray(ruw)) return []
  const uit: Pagina[] = []
  for (const item of ruw) {
    if (typeof item !== 'string') continue
    const pagina = item as Pagina
    if (UITZETBAAR.has(pagina) && !uit.includes(pagina)) uit.push(pagina)
  }
  return uit
}
