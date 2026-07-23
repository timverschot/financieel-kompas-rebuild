import { db } from './db'
import { bewaarCategorie, bewaarRekening, bewaarTransactie } from './repository'

// Vult de database bij de allereerste start met wat voorbeelddata, zodat er
// meteen iets te zien is. Draait alleen wanneer de database nog leeg is.
export async function seedIndienLeeg(): Promise<void> {
  const aantal = await db.transacties.count()
  if (aantal > 0) return

  await bewaarRekening({ id: 'r1', naam: 'Betaalrekening', beginsaldo: 0 })

  await bewaarCategorie({ id: 'cat-inkomsten', naam: 'Inkomsten' })
  await bewaarCategorie({ id: 'cat-wonen', naam: 'Huisvesting' })
  await bewaarCategorie({ id: 'cat-voeding', naam: 'Voeding' })

  await bewaarTransactie({ id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1', categorieId: 'cat-inkomsten' })
  await bewaarTransactie({ id: 't2', datum: '2026-07-03', omschrijving: 'Huur', bedrag: -950, rekeningId: 'r1', categorieId: 'cat-wonen' })
  await bewaarTransactie({ id: 't3', datum: '2026-07-05', omschrijving: 'Boodschappen', bedrag: -320, rekeningId: 'r1', categorieId: 'cat-voeding' })
}
