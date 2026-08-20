import { describe, it, expect } from 'vitest'
import { backupHerinnering, versVangnet, BACKUP_HERINNERING_DAGEN } from './backupherinnering'

const basis = { heeftGegevens: true, vandaagISO: '2026-08-20' }

describe('backupHerinnering', () => {
  it('zwijgt in een lege app', () => {
    expect(
      backupHerinnering({ ...basis, heeftGegevens: false, eersteGebruikOp: '2020-01-01' }),
    ).toBeNull()
  })

  it('zwijgt zonder vertrekpunt', () => {
    expect(backupHerinnering({ ...basis })).toBeNull()
  })

  it('zwijgt zolang de dertig dagen niet om zijn', () => {
    // 2026-07-22 is 29 dagen vóór 2026-08-20.
    expect(backupHerinnering({ ...basis, eersteGebruikOp: '2026-07-22' })).toBeNull()
  })

  it('meldt het op de dertigste dag', () => {
    expect(backupHerinnering({ ...basis, eersteGebruikOp: '2026-07-21' })).toEqual({
      dagen: 30,
      bron: 'geen',
    })
  })

  it('zegt het anders wanneer je ooit een back-up maakte', () => {
    expect(
      backupHerinnering({ ...basis, eersteGebruikOp: '2025-01-01', laatsteBackupOp: '2026-06-01' }),
    ).toEqual({ dagen: 80, bron: 'backup' })
  })

  it('rekent ook een geslaagde synchronisatie als vangnet', () => {
    expect(backupHerinnering({ ...basis, eersteGebruikOp: '2025-01-01', laatsteSyncOp: '2026-08-19' })).toBeNull()
  })

  // ⚠ Dit is het geval waarvoor deze module bestaat: de schakelaar staat op
  // "verbonden", maar er vertrekt al maanden niets meer.
  it('waarschuwt wanneer Drive al lang niets meer doorgestuurd heeft', () => {
    expect(backupHerinnering({ ...basis, eersteGebruikOp: '2025-01-01', laatsteSyncOp: '2026-05-20' })).toEqual({
      dagen: 92,
      bron: 'drive',
    })
  })

  it('neemt het JONGSTE vangnet, welk van de twee dat ook is', () => {
    const met = { ...basis, eersteGebruikOp: '2020-01-01', laatsteBackupOp: '2026-08-01', laatsteSyncOp: '2026-05-01' }
    expect(backupHerinnering(met)).toBeNull()
    // En omgekeerd: nu is de synchronisatie de jongste, en die is te oud.
    expect(backupHerinnering({ ...met, laatsteBackupOp: '2026-05-01', laatsteSyncOp: '2026-06-01' })).toEqual({
      dagen: 80,
      bron: 'drive',
    })
  })

  it('laat een recente back-up het oude vertrekpunt overrulen', () => {
    expect(
      backupHerinnering({ ...basis, eersteGebruikOp: '2020-01-01', laatsteBackupOp: '2026-08-19' }),
    ).toBeNull()
  })

  it('zwijgt bij een onleesbare datum in plaats van te gokken', () => {
    expect(backupHerinnering({ ...basis, eersteGebruikOp: 'ooit' })).toBeNull()
  })

  // Een toestel waarvan de klok in de toekomst stond, zou anders meteen een
  // waarschuwing geven op een negatief aantal dagen.
  it('zwijgt bij een vertrekpunt in de toekomst', () => {
    expect(backupHerinnering({ ...basis, eersteGebruikOp: '2027-01-01' })).toBeNull()
  })

  // ⚠ Eén datum uit een verkeerd gezette klok mocht de herinnering niet voorgoed
  // stilleggen (tweede nakijkronde ronde 63): hij won als "jongste" kandidaat en
  // gaf een negatief aantal dagen.
  it('negeert een vangnet met een datum in de toekomst en kijkt naar het echte', () => {
    expect(
      backupHerinnering({
        ...basis,
        eersteGebruikOp: '2020-01-01',
        laatsteBackupOp: '2027-01-01',
        laatsteSyncOp: '2026-01-01',
      }),
    ).toEqual({ dagen: 231, bron: 'drive' })
  })

  it('gebruikt de drempel die de module zelf noemt', () => {
    expect(BACKUP_HERINNERING_DAGEN).toBe(30)
  })
})

// `versVangnet` bepaalt of het blok "Veilig bewaren" in de opstelling afgevinkt
// staat. Ze MOET dezelfde grens gebruiken als de herinnering hierboven, anders
// zegt dat blok "je hebt alles ingevuld" terwijl het belletje ernaast waarschuwt.
describe('versVangnet', () => {
  it('vindt niets vers zonder datum', () => {
    expect(versVangnet(undefined, '2026-08-20')).toBe(false)
  })

  it('noemt gisteren vers', () => {
    expect(versVangnet('2026-08-19', '2026-08-20')).toBe(true)
  })

  it('noemt vandaag vers', () => {
    expect(versVangnet('2026-08-20', '2026-08-20')).toBe(true)
  })

  it('legt de grens op dezelfde dag als de herinnering', () => {
    // 29 dagen: nog vers, en de herinnering zwijgt.
    expect(versVangnet('2026-07-22', '2026-08-20')).toBe(true)
    // 30 dagen: niet meer vers, en dan komt de herinnering.
    expect(versVangnet('2026-07-21', '2026-08-20')).toBe(false)
    expect(
      backupHerinnering({
        heeftGegevens: true,
        vandaagISO: '2026-08-20',
        laatsteBackupOp: '2026-07-21',
      }),
    ).not.toBeNull()
  })

  it('vertrouwt een datum in de toekomst niet', () => {
    expect(versVangnet('2027-01-01', '2026-08-20')).toBe(false)
  })

  it('vertrouwt een onleesbare datum niet', () => {
    expect(versVangnet('ooit', '2026-08-20')).toBe(false)
  })
})
