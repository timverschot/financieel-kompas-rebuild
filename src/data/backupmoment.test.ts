import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { leesBackupMoment, noteerBackup, zorgVoorEersteGebruik } from './backupmoment'

beforeEach(async () => {
  await db.meta.clear()
})

describe('backupmoment', () => {
  it('weet van niets in een verse app', async () => {
    expect(await leesBackupMoment()).toEqual({})
  })

  it('onthoudt de dag van een back-up', async () => {
    await noteerBackup('2026-08-20')
    expect(await leesBackupMoment()).toEqual({ laatsteBackupOp: '2026-08-20' })
  })

  it('overschrijft de vorige back-updag', async () => {
    await noteerBackup('2026-08-20')
    await noteerBackup('2026-09-01')
    expect((await leesBackupMoment()).laatsteBackupOp).toBe('2026-09-01')
  })

  it('zet het vertrekpunt de eerste keer en laat het daarna staan', async () => {
    expect(await zorgVoorEersteGebruik('2026-01-05')).toBe('2026-01-05')
    // ⚠ Een tweede opstart mag het vertrekpunt NIET verzetten: dan zou de teller
    // elke dag opnieuw beginnen en zou de herinnering nooit afgaan.
    expect(await zorgVoorEersteGebruik('2026-03-09')).toBe('2026-01-05')
    expect((await leesBackupMoment()).eersteGebruikOp).toBe('2026-01-05')
  })

  it('raakt de andere sleutels in meta niet aan', async () => {
    await db.meta.put({ sleutel: 'toestelId', waarde: 'abc' })
    await noteerBackup('2026-08-20')
    await zorgVoorEersteGebruik('2026-08-20')
    expect((await db.meta.get('toestelId'))?.waarde).toBe('abc')
  })

  // ⚠ "Begin opnieuw" leegt álle tabellen. Dat MOET deze twee sleutels meenemen,
  // anders draagt een lege app een back-updatum van vóór het wissen mee en zwijgt
  // de herinnering een maand lang over gegevens die nergens staan.
  it('verdwijnt wanneer de tabellen geleegd worden', async () => {
    await noteerBackup('2026-08-20')
    await zorgVoorEersteGebruik('2026-08-20')
    await db.meta.clear()
    expect(await leesBackupMoment()).toEqual({})
  })
})
