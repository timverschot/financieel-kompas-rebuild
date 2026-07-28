import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './db'
import {
  bewaarDossier,
  bewaarDossierDocument,
  bewaarGedeeldeKost,
  bewaarKindrekening,
  bewaarKindrekeningpost,
  bewaarTransactie,
  bewaarVerrekening,
  laadDossierDocumenten,
  laadDossiers,
  laadGedeeldeKosten,
  laadKindrekeningen,
  laadKindrekeningposten,
  laadTransacties,
  laadVerrekeningen,
  verwijderDossierMetAanhang,
  verwijderTransactie,
  verwijderTransactieMetAanhang,
  bewaarGarantie,
  laadGaranties,
} from './repository'
import type { Transactie } from './schema'

beforeEach(async () => {
  await db.transacties.clear()
  await db.rekeningen.clear()
  await db.events.clear()
  await db.meta.clear()
  await db.dossiers.clear()
  await db.gedeeldeKosten.clear()
  await db.verrekeningen.clear()
  await db.kindrekeningen.clear()
  await db.kindrekeningposten.clear()
  await db.dossierdocumenten.clear()
  await db.garanties.clear()
})

const t1: Transactie = { id: 't1', datum: '2026-07-01', omschrijving: 'Loon', bedrag: 2400, rekeningId: 'r1' }

describe('repository', () => {
  it('bewaart en laadt een transactie (round-trip)', async () => {
    await bewaarTransactie(t1)
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(1)
    expect(res.geldig[0].omschrijving).toBe('Loon')
    expect(res.ongeldig).toBe(0)
  })

  it('weigert ongeldige data bij het schrijven', async () => {
    // @ts-expect-error - opzettelijk fout type om de validatie te testen
    await expect(bewaarTransactie({ id: 't1', bedrag: 'fout' })).rejects.toThrow()
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(0)
  })

  it('detecteert corrupte data bij het lezen en telt ze als ongeldig', async () => {
    // Schrijf bewust een corrupt record rechtstreeks in de database, buiten de validatie om.
    await db.transacties.put({ id: 'kapot', bedrag: 'geen getal' } as unknown as Transactie)
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(0)
    expect(res.ongeldig).toBe(1)
  })

  it('verwijdert een transactie', async () => {
    await bewaarTransactie(t1)
    await verwijderTransactie('t1')
    const res = await laadTransacties()
    expect(res.geldig).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — verwijderen als ÉÉN ondeelbare stap.
//
// Alles wat aan een transactie of een dossier hangt, moet samen verdwijnen. Ging
// dat als losse schrijfacties en brak het halverwege af, dan bleef er een
// onzichtbare weeskost in een dossier staan die wél meesynchroniseerde — en die
// later meetelde in de afrekening met de andere ouder.
// ---------------------------------------------------------------------------

describe('verwijderen met aanhang', () => {
  it('haalt een transactie samen met haar gedeelde kost en haar bon weg', async () => {
    await bewaarTransactie(t1)
    await bewaarGedeeldeKost({
      id: 'k1',
      dossierId: 'd1',
      transactieId: 't1',
      omschrijving: 'Dokter',
      bedrag: 2500,
      datum: '2026-07-01',
      betaaldDoor: 'jij',
      kostenType: 'gewoon',
    })
    await bewaarDossierDocument({
      id: 'doc1',
      transactieId: 't1',
      naam: 'Factuur',
      soort: 'bon',
      bestand: 'data:image/jpeg;base64,AAAA',
      toegevoegdOp: '2026-07-01',
    })

    // Ronde 36: het garantiebewijs dat je vanuit deze boeking maakte, gaat mee.
    // Bleef het staan, dan had je een garantiebewijs zonder aankoopbewijs — want
    // de bon van die boeking verdwijnt hier wél.
    await bewaarGarantie({
      id: 'g1',
      product: 'Laptop',
      aankoopdatum: '2026-07-01',
      garantieMaanden: 24,
      transactieId: 't1',
    })

    await verwijderTransactieMetAanhang('t1', { gedeeldeKostId: 'k1', documentId: 'doc1', garantieId: 'g1' })

    expect((await laadTransacties()).geldig).toHaveLength(0)
    expect((await laadGedeeldeKosten()).geldig).toHaveLength(0)
    expect((await laadDossierDocumenten()).geldig).toHaveLength(0)
    expect((await laadGaranties()).geldig).toHaveLength(0)
  })

  it('haalt een dossier samen met kosten, afrekeningen en kindrekeningen weg', async () => {
    await bewaarDossier({ id: 'd1', naam: 'Co-ouderschap', aandeelJij: 50 })
    await bewaarGedeeldeKost({
      id: 'k1',
      dossierId: 'd1',
      omschrijving: 'Schoolrekening',
      bedrag: 12000,
      datum: '2026-07-01',
      betaaldDoor: 'jij',
      kostenType: 'gewoon',
    })
    await bewaarVerrekening({ id: 'v1', dossierId: 'd1', datum: '2026-07-05', bedrag: 6000 })
    await bewaarKindrekening({ id: 'kr1', dossierId: 'd1', naam: 'Spaarrekening Kind 1', beginsaldo: 0 })
    await bewaarKindrekeningpost({
      id: 'krp1',
      kindrekeningId: 'kr1',
      datum: '2026-07-01',
      soort: 'storting',
      omschrijving: 'Storting',
      bedrag: 5000,
    })

    await verwijderDossierMetAanhang('d1', {
      gedeeldeKostIds: ['k1'],
      verrekeningIds: ['v1'],
      kindrekeningIds: ['kr1'],
      kindrekeningpostIds: ['krp1'],
    })

    expect((await laadDossiers()).geldig).toHaveLength(0)
    expect((await laadGedeeldeKosten()).geldig).toHaveLength(0)
    expect((await laadVerrekeningen()).geldig).toHaveLength(0)
    expect((await laadKindrekeningen()).geldig).toHaveLength(0)
    expect((await laadKindrekeningposten()).geldig).toHaveLength(0)
  })

  it('schrijft dat alles weg als één blok in het logboek', async () => {
    await bewaarDossier({ id: 'd1', naam: 'Lening', aandeelJij: 50 })
    await bewaarGedeeldeKost({
      id: 'k1',
      dossierId: 'd1',
      omschrijving: 'Voorschot',
      bedrag: 1000,
      datum: '2026-07-01',
      betaaldDoor: 'jij',
      kostenType: 'gewoon',
    })
    const voor = await db.events.count()

    await verwijderDossierMetAanhang('d1', { gedeeldeKostIds: ['k1'] })

    // Twee gebeurtenissen, met opeenvolgende volgnummers uit dezelfde transactie:
    // een ander toestel speelt ze straks in exact deze volgorde opnieuw af.
    // (Sorteren op volgnummer, want de tabel geeft terug op sleutel, niet op tijd.)
    const alles = (await db.events.toArray()).sort((a, b) => a.volgnummer - b.volgnummer)
    const regels = alles.slice(voor)
    expect(regels).toHaveLength(2)
    expect(regels.map((r) => r.gebeurtenis.type)).toEqual(['dossier.verwijderd', 'gedeeldekost.verwijderd'])
    expect(regels[1].volgnummer).toBe(regels[0].volgnummer + 1)
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — ondeelbaarheid, écht getest.
//
// De hele rechtvaardiging van `pasGebeurtenissenToe` is: ofwel gaat alles door,
// ofwel niets. Dat was tot nu toe alleen beschreven, niet bewaakt. Deze test
// breekt de reeks halverwege af en controleert dat er niets van overblijft — noch
// in het logboek, noch in de gegevens zelf.
// ---------------------------------------------------------------------------

describe('een afgebroken reeks laat niets half achter', () => {
  it('draait alles terug wanneer een schrijfactie halverwege mislukt', async () => {
    await bewaarDossier({ id: 'd1', naam: 'Co-ouderschap', aandeelJij: 50 })
    await bewaarGedeeldeKost({
      id: 'k1',
      dossierId: 'd1',
      omschrijving: 'Schoolrekening',
      bedrag: 12000,
      datum: '2026-07-01',
      betaaldDoor: 'jij',
      kostenType: 'gewoon',
    })
    const logboekVoor = await db.events.count()

    // De tweede schrijfactie laten mislukken. Zo gedraagt een echte onderbreking
    // zich ook: de opslag zit vol, of het tabblad gaat dicht, precies tussen twee
    // records in.
    const stuk = vi.spyOn(db.gedeeldeKosten, 'delete').mockImplementation(() => {
      throw new Error('opslag vol')
    })

    await expect(verwijderDossierMetAanhang('d1', { gedeeldeKostIds: ['k1'] })).rejects.toThrow()
    stuk.mockRestore()

    // Niets half: het dossier staat er nog, de kost staat er nog, en het logboek
    // is niet gegroeid. Zonder de gedeelde transactie zou het dossier weg zijn en
    // de kost blijven staan — een weeskost die meetelt in de volgende afrekening.
    expect((await laadDossiers()).geldig.map((d) => d.id)).toEqual(['d1'])
    expect((await laadGedeeldeKosten()).geldig.map((k) => k.id)).toEqual(['k1'])
    expect(await db.events.count()).toBe(logboekVoor)
  })

  it('laat ook het volgnummer ongemoeid na een mislukking', async () => {
    await bewaarDossier({ id: 'd2', naam: 'Lening', aandeelJij: 50 })
    const volgVoor = (await db.meta.get('volgnummer'))?.waarde

    const stuk = vi.spyOn(db.dossiers, 'delete').mockImplementation(() => {
      throw new Error('geweigerd')
    })
    await expect(verwijderDossierMetAanhang('d2')).rejects.toThrow()
    stuk.mockRestore()

    // Zou het volgnummer wél opgeschoven zijn, dan ontstaat er een gat in het
    // logboek en denkt een ander toestel bij het synchroniseren dat het een regel
    // gemist heeft.
    expect((await db.meta.get('volgnummer'))?.waarde).toBe(volgVoor)
  })
})
