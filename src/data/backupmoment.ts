import { leesMeta, schrijfMeta } from './sync/lokaal'

// Wanneer heeft DIT toestel voor het laatst een back-up gemaakt, en sinds wanneer
// staat er hier eigenlijk iets?
//
// Waarom in de `meta`-tabel en niet in localStorage: dit hoort bij de database van
// dit toestel, niet bij je voorkeuren. Dat heeft twee gevolgen die precies goed
// zijn. "Begin opnieuw" leegt álle tabellen, dus ook deze twee sleutels — een lege
// app draagt dan geen back-updatum van vóór het wissen meer mee. En het gaat NIET
// mee naar Drive: een back-up maak je van dít toestel, dus de vraag "hoe lang
// geleden was dat" hoort ook per toestel beantwoord te worden.
//
// Het gaat om DAGEN ('JJJJ-MM-DD'), niet om tijdstippen. De herinnering rekent in
// dagen, en een datum is met het blote oog na te kijken in de database.

const SLEUTEL_BACKUP = 'laatsteBackupOp'
const SLEUTEL_SYNC = 'laatsteSyncOp'
const SLEUTEL_EERSTE = 'eersteGebruikOp'

export type BackupMoment = {
  /** De dag van de laatste geslaagde back-up; ontbreekt wanneer je er nooit een maakte. */
  laatsteBackupOp?: string
  /** De dag van de laatste geslaagde synchronisatie met Drive. Zie `sync.ts`. */
  laatsteSyncOp?: string
  /** De dag waarop dit toestel begon te tellen; het vertrekpunt zolang er geen back-up is. */
  eersteGebruikOp?: string
}

export async function leesBackupMoment(): Promise<BackupMoment> {
  const [laatsteBackupOp, laatsteSyncOp, eersteGebruikOp] = await Promise.all([
    leesMeta<string>(SLEUTEL_BACKUP),
    leesMeta<string>(SLEUTEL_SYNC),
    leesMeta<string>(SLEUTEL_EERSTE),
  ])
  return {
    ...(laatsteBackupOp ? { laatsteBackupOp } : {}),
    ...(laatsteSyncOp ? { laatsteSyncOp } : {}),
    ...(eersteGebruikOp ? { eersteGebruikOp } : {}),
  }
}

/** De metasleutel waarin `synchroniseer()` de dag van een geslaagde ronde zet. */
export const SLEUTEL_LAATSTE_SYNC = SLEUTEL_SYNC

/** Noteert dat er vandaag een back-up gemaakt is. */
export async function noteerBackup(dagISO: string): Promise<void> {
  await schrijfMeta(SLEUTEL_BACKUP, dagISO)
}

/**
 * Zorgt dat er een vertrekpunt is, en geeft het terug.
 *
 * ⚠ Alleen de EERSTE keer geschreven. Bij iemand die de app al maanden gebruikt,
 * begint die teller dus vandaag: de app kan niet weten sinds wanneer die gegevens
 * er staan, en een verzonnen datum zou meteen een herinnering afvuren die niets
 * bewijst. Liever dertig dagen te laat waarschuwen dan één keer onterecht.
 */
export async function zorgVoorEersteGebruik(dagISO: string): Promise<string> {
  const bestaand = await leesMeta<string>(SLEUTEL_EERSTE)
  if (bestaand) return bestaand
  await schrijfMeta(SLEUTEL_EERSTE, dagISO)
  return dagISO
}
