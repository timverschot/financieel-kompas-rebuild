import { describe, it, expect, vi, beforeEach } from 'vitest'
import { alleTekst, tekstVanBlad, wisNepPdf, type NepPdf } from '../test/nepPdf'
import { ONDERGRENS, VOETTEKST_Y } from './pdfBlad'
import { vertaal } from '../i18n'
import { formatEuro } from './format'
import { bouwOpbouw } from './onderhoudsbijdrage'
import type { Dossier, Kind, Onderhoudsbijdrage } from '../data/schema'

const { nep } = vi.hoisted(() => ({
  nep: { teksten: [], afbeeldingen: [], bladen: 1, bewaardAls: null } as NepPdf,
}))
vi.mock('jspdf', async () => {
  const { nepJsPdfKlasse } = await import('../test/nepPdf')
  return { jsPDF: nepJsPdfKlasse(nep) }
})

const { exporteerIndexatiebriefPDF } = await import('./indexatiebriefPdf')

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

const dossier: Dossier = { id: 'd1', naam: 'Kinderen 2026', aandeelJij: 60 }
const kinderen: Kind[] = [{ id: 'k1', naam: 'Kind 1' }]
const VANDAAG = '2026-07-30'

const bijdrage: Onderhoudsbijdrage = {
  id: 'ob1',
  dossierId: 'd1',
  richting: 'jij-ontvangt',
  basisbedrag: 25000,
  datumRegeling: '2021-09-15',
  kindIds: ['k1'],
}

const opbouwVan = (b: Onderhoudsbijdrage) =>
  bouwOpbouw(
    {
      basisbedrag: b.basisbedrag,
      datumRegeling: b.datumRegeling,
      geindexeerd: b.geindexeerd,
      aanvangsindexHandmatig: b.aanvangsindexHandmatig,
      eigenIndexcijfers: b.eigenIndexcijfers,
      eindDatum: b.eindDatum,
    },
    VANDAAG,
  )

beforeEach(() => wisNepPdf(nep))

describe('exporteerIndexatiebriefPDF', () => {
  beforeEach(async () => {
    await exporteerIndexatiebriefPDF(t, dossier, bijdrage, opbouwVan(bijdrage), kinderen, VANDAAG)
  })

  it('begint met een begeleidende brief op blad 1, en pas daarna het overzicht', () => {
    // Wie enkel cijfers krijgt, moet zelf bedenken wat de bedoeling is. En twee
    // bijlagen meesturen is één handeling te veel: de brief zit in dezelfde PDF.
    const blad1 = tekstVanBlad(nep, 1).replace(/\n/g, ' ')
    expect(blad1).toContain('Betreft: indexatie van de onderhoudsbijdrage voor Kind 1')
    expect(blad1).toContain('volgt de gezondheidsindex')
    expect(blad1).toContain('Op het volgende blad staat de volledige berekening')
    expect(blad1).not.toContain('Per verjaardag')
    expect(nep.bladen).toBeGreaterThan(1)
  })

  it('noemt in de brief het bedrag van vandaag naast dat uit de regeling', () => {
    const o = opbouwVan(bijdrage)
    const blad1 = tekstVanBlad(nep, 1).replace(/\n/g, ' ')
    expect(blad1).toContain(formatEuro(o.huidigBedrag))
    expect(blad1).toContain(formatEuro(25000))
  })

  it('schrijft de brief zonder verwijt en zonder "jij"', () => {
    // Toon is hier een functionele eis: een blad dat als standpunt gelezen wordt,
    // maakt het gesprek erger in plaats van makkelijker.
    const blad1 = tekstVanBlad(nep, 1).replace(/\n/g, ' ')
    for (const woord of ['te weinig', 'achterstallig', 'verplicht u', 'jij ', ' jou']) {
      expect(blad1.toLowerCase()).not.toContain(woord.toLowerCase())
    }
    expect(blad1).toContain('laat het dan weten')
  })

  it('zegt in de brief zelf dat het geen juridisch standpunt is', () => {
    expect(tekstVanBlad(nep, 1).replace(/\n/g, ' ')).toContain('geen juridisch standpunt')
  })

  it('zet de datum van opmaak bovenaan de brief', () => {
    expect(tekstVanBlad(nep, 1)).toContain(VANDAAG)
  })

  it('zet de dossiernaam in de titel', () => {
    expect(alleTekst(nep)).toContain('Onderhoudsbijdrage — Kinderen 2026')
  })

  it('noemt de regeling, het basisbedrag en de richting', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Regeling van: 2021-09-15')
    expect(tekst).toContain(`Bedrag in de regeling: ${formatEuro(25000)}`)
    // Neutraal geformuleerd: het blad gaat naar de andere ouder, en die leest "jou"
    // als zichzelf — dan staat er letterlijk het omgekeerde van wat bedoeld is.
    expect(tekst).toContain('Betaald aan de ouder die dit overzicht opmaakte')
    expect(tekst).not.toContain('betaalt aan jou')
  })

  it('zet het bedrag van vandaag als eerste conclusie', () => {
    // Dat is de vraag waarvoor dit blad bestaat; het hoort niet onderaan te staan.
    const o = opbouwVan(bijdrage)
    expect(alleTekst(nep)).toContain(formatEuro(o.huidigBedrag))
  })

  it('schrijft de berekening per verjaardag uit', () => {
    // "€ 250,00 x 123,68 / 112,74 = € 274,26" — na te rekenen zonder de app.
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('123,68')
    expect(doorlopend).toContain('112,74')
    expect(doorlopend).toContain(formatEuro(27426))
  })

  it('zegt waar de aanvangsindex vandaan komt', () => {
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('de maand vóór de regeling')
  })

  it('noemt de bron en het basisjaar van de indexcijfers', () => {
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('Statbel')
    expect(doorlopend).toContain('2013 = 100')
  })

  it('geeft elke verjaardag een eigen regel', () => {
    const tekst = alleTekst(nep)
    for (const datum of ['2022-09-15', '2023-09-15', '2024-09-15', '2025-09-15']) {
      expect(tekst).toContain(datum)
    }
  })

  // Dezelfde grens als bij de bewijsmap, en hier weegt ze zwaarder.
  it('zegt dat dit geen juridisch advies en geen ingebrekestelling is', () => {
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('Wat dit blad is')
    expect(doorlopend).toContain('geen juridisch advies')
    expect(doorlopend).toContain('geen ingebrekestelling')
  })

  it('zegt dat de akte voorgaat op dit blad', () => {
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('gaat voor op wat hier staat')
  })

  it('gebruikt een gewone x en geen maalteken dat de PDF niet kan tonen', () => {
    expect(alleTekst(nep)).not.toContain('×')
  })

  it('zet op elk blad de voettekst met het bladnummer', () => {
    for (let n = 1; n <= nep.bladen; n++) {
      expect(tekstVanBlad(nep, n)).toContain('Onderhoudsbijdrage — Kinderen 2026 — 2026-07-30')
      expect(tekstVanBlad(nep, n)).toContain(`blad ${n} van ${nep.bladen}`)
    }
  })

  it('houdt alle tekst boven de voettekst', () => {
    for (const r of nep.teksten) {
      if (r.y === VOETTEKST_Y) continue
      if (r.y > ONDERGRENS) expect.fail(`"${r.tekst}" staat op ${r.y} mm, onder ${ONDERGRENS}`)
    }
  })

  it('bewaart het bestand met dossier en datum in de naam', () => {
    expect(nep.bewaardAls).toBe('onderhoudsbijdrage-kinderen-2026-2026-07-30.pdf')
  })
})

describe('exporteerIndexatiebriefPDF — grensgevallen', () => {
  it('zegt het wanneer er nog geen verjaardag geweest is', async () => {
    const nieuw = { ...bijdrage, datumRegeling: '2026-05-01' }
    await exporteerIndexatiebriefPDF(t, dossier, nieuw, opbouwVan(nieuw), kinderen, VANDAAG)
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('nog geen verjaardag van de regeling geweest')
  })

  it('zegt het wanneer de regeling indexatie uitsluit', async () => {
    const zonder = { ...bijdrage, geindexeerd: false }
    await exporteerIndexatiebriefPDF(t, dossier, zonder, opbouwVan(zonder), kinderen, VANDAAG)
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('sluit indexatie uit')
  })

  it('benoemt de maanden waarvoor er geen cijfer was, in plaats van te schatten', async () => {
    const augustus = { ...bijdrage, datumRegeling: '2021-08-10' }
    await exporteerIndexatiebriefPDF(
      t,
      dossier,
      augustus,
      bouwOpbouw({ basisbedrag: 25000, datumRegeling: '2021-08-10' }, '2026-08-20'),
      kinderen,
      '2026-08-20',
    )
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('Wat er nog ontbreekt')
    expect(doorlopend).toContain('juli 2026')
    expect(doorlopend).toContain('ongewijzigd gelaten in plaats van geschat')
  })

  it('meldt een aanvangsindex die uit de akte komt als zodanig', async () => {
    const uitAkte = { ...bijdrage, aanvangsindexHandmatig: 100 }
    await exporteerIndexatiebriefPDF(t, dossier, uitAkte, opbouwVan(uitAkte), kinderen, VANDAAG)
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('zoals ze in de akte staat')
  })

  it('werkt zonder kinderen', async () => {
    const zonderKind = { ...bijdrage, kindIds: undefined }
    await exporteerIndexatiebriefPDF(t, dossier, zonderKind, opbouwVan(zonderKind), [], VANDAAG)
    expect(alleTekst(nep)).toContain('Onderhoudsbijdrage — Kinderen 2026')
    expect(alleTekst(nep)).not.toContain('Kinderen:')
    // De onderwerpregel blijft neutraal in plaats van "voor " met niets erachter.
    expect(tekstVanBlad(nep, 1)).toContain('Betreft: indexatie van de onderhoudsbijdrage')
    expect(tekstVanBlad(nep, 1)).not.toContain('onderhoudsbijdrage voor')
  })

  it('schrijft in de brief geen aanpassing wanneer er er nog geen geweest is', async () => {
    const nieuw = { ...bijdrage, datumRegeling: '2026-05-01' }
    await exporteerIndexatiebriefPDF(t, dossier, nieuw, opbouwVan(nieuw), kinderen, VANDAAG)
    const blad1 = tekstVanBlad(nep, 1).replace(/\n/g, ' ')
    expect(blad1).toContain('bedraagt de bijdrage vandaag')
    expect(blad1).not.toContain('De laatste aanpassing viel op')
  })

  it('verdeelt een lange geschiedenis over meerdere bladen zonder over de voettekst te lopen', async () => {
    // Een regeling van 2015: elf verjaardagen.
    const oud = { ...bijdrage, datumRegeling: '2015-06-01' }
    await exporteerIndexatiebriefPDF(t, dossier, oud, opbouwVan(oud), kinderen, VANDAAG)
    expect(alleTekst(nep)).toContain('2025-06-01')
    for (const r of nep.teksten) {
      if (r.y === VOETTEKST_Y) continue
      expect(r.y).toBeLessThanOrEqual(ONDERGRENS)
    }
  })

  it('breekt een lange onderwerpregel af in plaats van hem van het blad te laten lopen', async () => {
    // jsPDF meldt niet dat tekst voorbij de marge staat; ze verdwijnt gewoon.
    const veel: Kind[] = [
      { id: 'k1', naam: 'Marie-Louise Vandenberghe' },
      { id: 'k2', naam: 'Jean-Baptiste Vandenberghe' },
      { id: 'k3', naam: 'Alexander Vandenberghe' },
      { id: 'k4', naam: 'Charlotte-Amelie Vandenberghe' },
    ]
    const alle = { ...bijdrage, kindIds: ['k1', 'k2', 'k3', 'k4'] }
    await exporteerIndexatiebriefPDF(t, dossier, alle, opbouwVan(alle), veel, VANDAAG)
    const onderwerpRegels = nep.teksten.filter((r) => r.tekst.includes('Vandenberghe'))
    expect(onderwerpRegels.length).toBeGreaterThan(1)
    expect(tekstVanBlad(nep, 1)).toContain('Charlotte-Amelie Vandenberghe')
  })
})

// Wat de brief BEWEERT moet altijd kloppen met wat de rekenkern zegt. Blad 1 en
// blad 2 die elkaar tegenspreken is erger dan geen brief: de andere ouder leest
// blad 1 het eerst, en dat is dan net het blad met de onjuiste zin.
describe('exporteerIndexatiebriefPDF — de brief spreekt blad 2 niet tegen', () => {
  const blad1Van = () => tekstVanBlad(nep, 1).replace(/\n/g, ' ')

  it('kondigt geen indexatie aan wanneer de regeling er geen kent', async () => {
    const zonder = { ...bijdrage, geindexeerd: false }
    await exporteerIndexatiebriefPDF(t, dossier, zonder, opbouwVan(zonder), kinderen, VANDAAG)
    const blad1 = blad1Van()
    expect(blad1).toContain('wordt volgens de regeling niet geïndexeerd')
    expect(blad1).not.toContain('volgt de gezondheidsindex')
    // Ook het onderwerp: "indexatie van..." bij een akte zonder indexatie leest
    // als een standpunt over die akte.
    expect(blad1).not.toContain('Betreft: indexatie')
    expect(blad1).toContain('Betreft: de onderhoudsbijdrage')
  })

  it('zegt "liep tot" in plaats van "vandaag" bij een afgelopen regeling', async () => {
    const gestopt = { ...bijdrage, datumRegeling: '2015-06-01', eindDatum: '2018-06-30' }
    await exporteerIndexatiebriefPDF(t, dossier, gestopt, opbouwVan(gestopt), kinderen, VANDAAG)
    const blad1 = blad1Van()
    expect(blad1).toContain('Deze regeling liep tot 2018-06-30')
    expect(blad1).not.toContain('vandaag')
    // En de kop van blad 2 mag dan evenmin "vandaag" zeggen.
    expect(alleTekst(nep)).toContain('Bijdrage bij het einde van de regeling')
    expect(alleTekst(nep)).not.toContain('De bijdrage vandaag')
  })

  it('noemt geen bedrag als vaststaand wanneer de aanvangsindex onbekend is', async () => {
    // Een regeling van vóór de reeks: dan is er geen aanvangsindex en is er niets
    // berekend — maar het huidige bedrag is wél gelijk aan het basisbedrag.
    const oud = { ...bijdrage, datumRegeling: '1990-06-01' }
    await exporteerIndexatiebriefPDF(t, dossier, oud, opbouwVan(oud), kinderen, VANDAAG)
    const blad1 = blad1Van()
    expect(blad1).toContain('is in deze app niet bekend')
    expect(blad1).toContain('het bedrag uit de regeling zelf')
    expect(blad1).not.toContain('bedraagt de bijdrage vandaag')
    expect(blad1).not.toContain('De laatste aanpassing viel op')
  })

  it('meldt op blad 1 dat een verjaardag nog niet toegepast kon worden', async () => {
    const augustus = { ...bijdrage, datumRegeling: '2021-08-10' }
    await exporteerIndexatiebriefPDF(
      t,
      dossier,
      augustus,
      bouwOpbouw({ basisbedrag: 25000, datumRegeling: '2021-08-10' }, '2026-08-20'),
      kinderen,
      '2026-08-20',
    )
    expect(blad1Van()).toContain('was er nog geen indexcijfer bekend')
  })

  it('verwijst niet naar verjaardagen wanneer er nog geen enkele geweest is', async () => {
    const nieuw = { ...bijdrage, datumRegeling: '2026-05-01' }
    await exporteerIndexatiebriefPDF(t, dossier, nieuw, opbouwVan(nieuw), kinderen, VANDAAG)
    const blad1 = blad1Van()
    expect(blad1).toContain('staat waarop dit gebaseerd is')
    expect(blad1).not.toContain('wat er per verjaardag uit kwam')
  })

  it('blijft in élk geval één blad zonder "jij" en zonder verwijt', async () => {
    const gevallen = [
      { ...bijdrage },
      { ...bijdrage, geindexeerd: false },
      { ...bijdrage, datumRegeling: '2015-06-01', eindDatum: '2018-06-30' },
      { ...bijdrage, datumRegeling: '1990-06-01' },
      { ...bijdrage, datumRegeling: '2026-05-01' },
      { ...bijdrage, richting: 'jij-betaalt' as const },
    ]
    for (const geval of gevallen) {
      wisNepPdf(nep)
      await exporteerIndexatiebriefPDF(t, dossier, geval, opbouwVan(geval), kinderen, VANDAAG)
      const blad1 = blad1Van()
      expect(nep.bladen).toBeGreaterThan(1)
      expect(blad1).not.toContain('Per verjaardag')
      expect(blad1).not.toContain('Wat dit blad is')
      for (const woord of ['te weinig', 'achterstallig', 'jij ', ' jou', 'moet betalen']) {
        expect(blad1.toLowerCase()).not.toContain(woord.toLowerCase())
      }
    }
  })
})

describe('exporteerIndexatiebriefPDF — een afgelopen regeling', () => {
  it('zet de einddatum in de kop en indexeert niet door', async () => {
    // Zonder de einddatum bleef de app jaar na jaar doorindexeren en drukte ze
    // bovenaan een bedrag af dat al jaren niet meer bestond.
    const gestopt = { ...bijdrage, datumRegeling: '2015-06-01', eindDatum: '2018-06-30' }
    await exporteerIndexatiebriefPDF(t, dossier, gestopt, opbouwVan(gestopt), kinderen, VANDAAG)
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Loopt tot: 2018-06-30')
    // Verjaardagen van 2016, 2017 en 2018 wél; die van 2019 en later niet.
    expect(tekst).toContain('2018-06-01')
    expect(tekst).not.toContain('2019-06-01')
    expect(tekst).not.toContain('2025-06-01')
  })
})
