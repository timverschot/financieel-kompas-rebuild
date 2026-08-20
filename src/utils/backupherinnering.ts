import { dagenVerschil } from './datum'

// Wanneer stonden je gegevens voor het laatst ergens ANDERS dan in deze browser?
//
// Kompal bewaart alles in de database van je browser. Dat is het hele idee — geen
// account, geen server van ons — maar het betekent ook dat een opgeruimde browser,
// een kapotte telefoon of een toestel dat plaats nodig heeft je jaren aan
// boekingen kost. Er zijn twee vangnetten: Google Drive (vanzelf) en een
// back-upbestand (met de hand). Wie geen van beide heeft, hoort dat te weten.
//
// ⚠ De vraag is bewust NIET "staat Drive aan?" maar "wanneer is er voor het laatst
// iets weggeschreven?". Een verbinding die maanden geleden stilviel — een token
// dat niet meer vernieuwd raakt, een map die je hernoemde — laat de schakelaar op
// "verbonden" staan terwijl er niets meer vertrekt. Precies dan mag de app niet
// zwijgen.
//
// Zuivere functie: "vandaag" komt van buiten, net als bij `bouwMeldingen`.

/** Na zoveel dagen zonder vangnet komt de herinnering. */
export const BACKUP_HERINNERING_DAGEN = 30

export type BackupToestand = {
  /** De dag van de laatste back-up op dit toestel, als je er ooit een maakte. */
  laatsteBackupOp?: string
  /** De dag van de laatste geslaagde synchronisatie met Drive. */
  laatsteSyncOp?: string
  /** Sinds wanneer dit toestel meetelt; het vertrekpunt zolang er geen vangnet was. */
  eersteGebruikOp?: string
  /** Valt er iets te verliezen? Een lege app krijgt geen herinnering. */
  heeftGegevens: boolean
  /** 'JJJJ-MM-DD'. */
  vandaagISO: string
}

/** Waar het laatste vangnet vandaan kwam. Bepaalt welke zin je leest. */
export type VangnetBron = 'geen' | 'backup' | 'drive'

export type BackupHerinnering = {
  /** Hoeveel dagen geleden het laatste vangnet er was (of het toestel begon te tellen). */
  dagen: number
  bron: VangnetBron
}

/**
 * Geeft de herinnering terug, of `null` wanneer er niets te melden valt.
 *
 * ⚠ Twee redenen om te zwijgen, en allebei bewust:
 *
 *  1. **Er staat niets in.** Wie de app net opende, heeft niets te verliezen; een
 *     waarschuwing op dag één leert je alleen om het belletje weg te klikken.
 *  2. **Er is geen vertrekpunt.** Zonder datum weten we niet hoe lang het geleden
 *     is, en dan verzinnen we het niet.
 */
/**
 * Is dit vangnet nog VERS — jonger dan de herinneringstermijn?
 *
 * Bestaat omdat het scherm dezelfde grens moet gebruiken als het belletje. Deed het
 * dat niet, dan zou de opstelling "je hebt alle blokken ingevuld" zeggen terwijl het
 * belletje ernaast waarschuwt dat je laatste back-up van vorig jaar is.
 */
export function versVangnet(dagISO: string | undefined, vandaagISO: string): boolean {
  if (!dagISO) return false
  const dagen = dagenVerschil(dagISO, vandaagISO)
  // Een datum in de toekomst is geen bewijs; die komt van een verkeerd gezette klok.
  return dagen !== null && dagen >= 0 && dagen < BACKUP_HERINNERING_DAGEN
}

export function backupHerinnering(toestand: BackupToestand): BackupHerinnering | null {
  if (!toestand.heeftGegevens) return null

  // Het JONGSTE vangnet telt. Wie gisteren synchroniseerde, hoort niets — ook al
  // dateert zijn laatste bestandsback-up van vorig jaar.
  //
  // ⚠ Onbruikbare datums vallen er EERST uit (tweede nakijkronde ronde 63). Een
  // datum in de toekomst — een toestel waarvan de klok vooruit stond — is geen
  // bewijs van iets. Kwam die er nog bij als kandidaat, dan won hij als "jongste",
  // werd het verschil negatief en zweeg de app voorgoed over een échte back-up van
  // acht maanden oud die er wél lag.
  const bruikbaar = (dag: string | undefined): dag is string => {
    if (!dag) return false
    const d = dagenVerschil(dag, toestand.vandaagISO)
    return d !== null && d >= 0
  }
  const kandidaten: { dag: string; bron: VangnetBron }[] = [
    ...(bruikbaar(toestand.laatsteBackupOp) ? [{ dag: toestand.laatsteBackupOp, bron: 'backup' as const }] : []),
    ...(bruikbaar(toestand.laatsteSyncOp) ? [{ dag: toestand.laatsteSyncOp, bron: 'drive' as const }] : []),
  ]
  // Gewone tekstvergelijking: 'JJJJ-MM-DD' sorteert als datum. ⚠ Geen
  // `localeCompare` — die volgt de taal van het toestel (ronde 62).
  kandidaten.sort((a, b) => (a.dag < b.dag ? 1 : a.dag > b.dag ? -1 : 0))

  const jongste = kandidaten[0]
  const vertrekpunt = jongste?.dag ?? toestand.eersteGebruikOp
  if (!vertrekpunt) return null

  const dagen = dagenVerschil(vertrekpunt, toestand.vandaagISO)
  // Een onleesbare datum is geen reden om te waarschuwen. En een vertrekpunt in de
  // TOEKOMST (een toestel waarvan de klok verkeerd stond) geeft een negatief
  // getal; dat is geen dertig dagen geleden.
  if (dagen === null || dagen < BACKUP_HERINNERING_DAGEN) return null

  return { dagen, bron: jongste?.bron ?? 'geen' }
}
