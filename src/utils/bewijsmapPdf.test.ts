import { describe, it, expect, vi, beforeEach } from 'vitest'
import { alleTekst, tekstVanBlad, wisNepPdf, type NepPdf } from '../test/nepPdf'
import { ONDERGRENS, VOETTEKST_Y } from './pdfBlad'
import { vertaal } from '../i18n'
import { bouwAfrekeningOverzicht } from './afrekeningOverzicht'
import { formatEuro } from './format'
import type { Dossier, DossierDocument, GedeeldeKost, Kind, Verrekening } from '../data/schema'

const { nep } = vi.hoisted(() => ({
  nep: { teksten: [], afbeeldingen: [], bladen: 1, bewaardAls: null } as NepPdf,
}))
vi.mock('jspdf', async () => {
  const { nepJsPdfKlasse } = await import('../test/nepPdf')
  return { jsPDF: nepJsPdfKlasse(nep) }
})

const { bouwBijlagen, exporteerBewijsmapPDF } = await import('./bewijsmapPdf')

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

const BON = 'data:image/jpeg;base64,AAAA'
const BON_KAPOT = 'data:image/jpeg;base64,KAPOT'
const BON_PDF = 'data:application/pdf;base64,AAAA'

const dossier: Dossier = { id: 'd1', naam: 'Kinderen 2026', aandeelJij: 60 }
const kinderen: Kind[] = [
  { id: 'k1', naam: 'Kind 1' },
  { id: 'k2', naam: 'Kind 2' },
]

const kost = (over: Partial<GedeeldeKost> & { id: string }): GedeeldeKost => ({
  dossierId: 'd1',
  omschrijving: 'Schoolrekening',
  bedrag: 12000,
  betaaldDoor: 'jij',
  datum: '2026-03-04',
  ...over,
})

const kosten: GedeeldeKost[] = [
  kost({ id: 'k-school', datum: '2026-03-04', omschrijving: 'Schoolrekening', bedrag: 12000, bonnetje: BON, kindIds: ['k1'] }),
  kost({ id: 'k-dokter', datum: '2026-03-11', omschrijving: 'Dokter', bedrag: 4500, betaaldDoor: 'partner' }),
  kost({ id: 'k-turnpak', datum: '2026-03-20', omschrijving: 'Turnpak', bedrag: 3200, bonnetje: BON_PDF }),
]

const afrekening: Verrekening = {
  id: 'v1',
  dossierId: 'd1',
  datum: '2026-04-01',
  bedrag: 0,
  periodeVan: '2026-03-01',
  periodeTot: '2026-03-31',
  kostIds: kosten.map((k) => k.id),
}

const documenten: DossierDocument[] = [
  {
    id: 'doc1',
    dossierId: 'd1',
    naam: 'Ouderschapsovereenkomst',
    soort: 'overeenkomst',
    bestand: BON,
    toegevoegdOp: '2026-01-15',
    notitie: 'ondertekend bij de notaris',
  },
  { id: 'doc2', dossierId: 'ander-dossier', naam: 'Niet van dit dossier', soort: 'ander', bestand: BON, toegevoegdOp: '2026-01-16' },
]

const NU = new Date(2026, 6, 29)

beforeEach(() => wisNepPdf(nep))

describe('bouwBijlagen', () => {
  const o = bouwAfrekeningOverzicht(dossier, afrekening, kosten, kinderen)

  it('nummert doorlopend vanaf 1', () => {
    const bijlagen = bouwBijlagen(t, o.regels, kosten, documenten, 'd1')
    expect(bijlagen.map((b) => b.nummer)).toEqual([1, 2, 3])
  })

  it('slaat kosten zonder bon over', () => {
    const bijlagen = bouwBijlagen(t, o.regels, kosten, [], 'd1')
    expect(bijlagen.map((b) => b.kostId)).toEqual(['k-school', 'k-turnpak'])
  })

  it('houdt de chronologische volgorde van de kostenlijst aan', () => {
    const bijlagen = bouwBijlagen(t, o.regels, kosten, [], 'd1')
    expect(bijlagen[0].titel).toContain('2026-03-04')
    expect(bijlagen[1].titel).toContain('2026-03-20')
  })

  it('zet de documenten van de kluis achter de bonnen', () => {
    const bijlagen = bouwBijlagen(t, o.regels, kosten, documenten, 'd1')
    // De soort staat sinds de review vooraan: een vonnis en een losse foto stonden
    // er anders identiek in.
    expect(bijlagen[2].titel).toBe('Overeenkomst: Ouderschapsovereenkomst')
    expect(bijlagen[2].kostId).toBeUndefined()
  })

  it('neemt geen documenten van een ander dossier mee', () => {
    const bijlagen = bouwBijlagen(t, o.regels, kosten, documenten, 'd1')
    expect(bijlagen.map((b) => b.titel).join(' ')).not.toContain('Niet van dit dossier')
  })

  it('merkt een PDF-bon als zodanig', () => {
    const bijlagen = bouwBijlagen(t, o.regels, kosten, [], 'd1')
    expect(bijlagen.find((b) => b.kostId === 'k-turnpak')?.isPdf).toBe(true)
    expect(bijlagen.find((b) => b.kostId === 'k-school')?.isPdf).toBe(false)
  })

  it('zet het bedrag bij een bon van een kost', () => {
    const bijlagen = bouwBijlagen(t, o.regels, kosten, [], 'd1')
    expect(bijlagen[0].meta.join(' ')).toContain('120,00')
  })
})

describe('exporteerBewijsmapPDF — de kop en het voorbehoud', () => {
  beforeEach(async () => {
    await exporteerBewijsmapPDF(t, dossier, afrekening, kosten, kinderen, [], documenten, NU)
  })

  it('noemt het document een bewijsmap met de dossiernaam', () => {
    expect(alleTekst(nep)).toContain('Bewijsmap — Kinderen 2026')
  })

  it('zet de periode, de kinderen en beide datums in de kop', () => {
    const tekst = alleTekst(nep)
    expect(tekst).toContain('2026-03-01 – 2026-03-31')
    expect(tekst).toContain('Datum van de afrekening: 2026-04-01')
    expect(tekst).toContain('Opgemaakt op: 2026-07-29')
  })

  it('zegt hoeveel kosten en hoeveel bijlagen erin zitten', () => {
    expect(alleTekst(nep)).toContain('3 kost(en), 3 bijlage(n)')
  })

  // Dit is de grens uit het werkplan, en ze staat in het document zelf.
  it('zegt zwart op wit dat dit geen juridisch advies is', () => {
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('Wat dit document is')
    expect(doorlopend).toContain('geen juridisch advies')
    expect(doorlopend).toContain('De app rekent')
  })

  it('waarschuwt in de kop al dat een PDF-bon niet ingevoegd kan worden', () => {
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('niet als afbeelding in dit document')
  })
})

describe('exporteerBewijsmapPDF — de berekening per kost', () => {
  beforeEach(async () => {
    await exporteerBewijsmapPDF(t, dossier, afrekening, kosten, kinderen, [], documenten, NU)
  })

  it('zet de kosten chronologisch onder elkaar', () => {
    const tekst = alleTekst(nep)
    expect(tekst.indexOf('Schoolrekening')).toBeLessThan(tekst.indexOf('Dokter'))
    expect(tekst.indexOf('Dokter')).toBeLessThan(tekst.indexOf('Turnpak'))
  })

  it('schrijft de berekening uit: bedrag, percentage en uitkomst', () => {
    // "€ 120,00 x 60% = € 72,00 voor jou, € 48,00 voor partner". De verwachting
    // wordt met formatEuro gebouwd: dat zet een vast spatieteken tussen € en het
    // getal, en een gewone spatie in de test zou daar nooit op matchen.
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain(`${formatEuro(12000)} x 60%`)
    expect(doorlopend).toContain(`${formatEuro(7200)} voor jou`)
  })

  it('zegt "geen bon" precies één keer bij een kost zonder bon', () => {
    // `regelMeta` eindigt zelf al met de bon-status; die stond er daardoor twee keer.
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend.match(/geen bon/g)).toHaveLength(1)
  })

  it('kapt een lange groepsnaam niet af maar laat hem doorlopen', () => {
    // "Niet toegewezen aan een kind" werd stil "Niet toegewezen aan een".
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('Niet toegewezen aan een kind')
  })

  it('gebruikt een gewone x en geen maalteken dat de PDF niet kan tonen', () => {
    expect(alleTekst(nep)).not.toContain('×')
  })

  it('zegt bij elke kost waarom die verdeelsleutel gold', () => {
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('standaardverdeling van het dossier')
  })

  it('verwijst van een kost naar het bijlagenummer van haar bon', () => {
    expect(alleTekst(nep)).toContain('zie bijlage 1')
  })

  it('zegt het wanneer een kost geen bon heeft', () => {
    expect(alleTekst(nep)).toContain('geen bon')
  })
})

describe('exporteerBewijsmapPDF — de bijlagen', () => {
  beforeEach(async () => {
    await exporteerBewijsmapPDF(t, dossier, afrekening, kosten, kinderen, [], documenten, NU)
  })

  it('geeft elke bijlage haar eigen bladzijde', () => {
    // Drie bijlagen, elk op een nieuw blad, plus minstens één blad met de lijst.
    const koppen = nep.teksten.filter((r) => /^Bijlage \d+$/.test(r.tekst))
    expect(koppen.map((r) => r.tekst)).toEqual(['Bijlage 1', 'Bijlage 2', 'Bijlage 3'])
    // Elke kop op een ander blad.
    expect(new Set(koppen.map((r) => r.blad)).size).toBe(3)
  })

  it('voegt de afbeeldingen in, één per bladzijde', () => {
    // Twee van de drie bijlagen zijn afbeeldingen; de derde is een PDF.
    expect(nep.afbeeldingen).toHaveLength(2)
    expect(new Set(nep.afbeeldingen.map((a) => a.blad)).size).toBe(2)
  })

  it('schaalt een bon met de juiste verhouding en rekt hem niet op', () => {
    const beeld = nep.afbeeldingen[0]
    // De nep-bon is 800 x 600, dus 4:3.
    expect(beeld.breedte / beeld.hoogte).toBeCloseTo(800 / 600, 2)
    // En hij past binnen de tekstbreedte van het blad (190 - 20 = 170 mm).
    expect(beeld.breedte).toBeLessThanOrEqual(170)
  })

  it('zegt bij een PDF-bon wat er aan de hand is in plaats van een blanco blad', () => {
    const doorlopend = alleTekst(nep).replace(/\n/g, ' ')
    expect(doorlopend).toContain('Vraag het losse bestand op')
  })

  it('zet de notitie van een kluisdocument bij de bijlage', () => {
    // De meta-regel breekt af over meerdere regels, dus zoeken we op het geheel.
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('toegevoegd op 2026-01-15 · ondertekend bij de notaris')
  })

  it('zet de bewijsmap-voettekst op elk blad', () => {
    for (let blad = 1; blad <= nep.bladen; blad++) {
      expect(tekstVanBlad(nep, blad)).toContain('Bewijsmap — Kinderen 2026 — 2026-07-29')
      expect(tekstVanBlad(nep, blad)).toContain(`blad ${blad} van ${nep.bladen}`)
    }
  })

  it('bewaart het bestand met dossier en datum in de naam', () => {
    expect(nep.bewaardAls).toBe('bewijsmap-kinderen-2026-2026-04-01.pdf')
  })
})

describe('exporteerBewijsmapPDF — grensgevallen', () => {
  it('zegt het wanneer er geen enkele bon of document is', async () => {
    const zonder = [kost({ id: 'k1', bonnetje: undefined })]
    await exporteerBewijsmapPDF(
      t,
      dossier,
      { ...afrekening, kostIds: ['k1'] },
      zonder,
      kinderen,
      [],
      [],
      NU,
    )
    expect(alleTekst(nep)).toContain('Bijlagen')
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('geen bonnen of documenten')
    expect(nep.afbeeldingen).toHaveLength(0)
  })

  it('loopt niet stuk op een beschadigde bon maar meldt het', async () => {
    const stuk = [kost({ id: 'k1', bonnetje: BON_KAPOT })]
    await exporteerBewijsmapPDF(t, dossier, { ...afrekening, kostIds: ['k1'] }, stuk, kinderen, [], [], NU)
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('kon niet worden weergegeven')
    expect(nep.afbeeldingen).toHaveLength(0)
    // De bijlage bestaat wél, met haar nummer: dan weet de lezer dat er iets was.
    expect(alleTekst(nep)).toContain('Bijlage 1')
  })

  it('werkt zonder documentkluis', async () => {
    await exporteerBewijsmapPDF(t, dossier, afrekening, kosten, kinderen, [], [], NU)
    expect(alleTekst(nep)).toContain('2 bijlage(n)')
  })

  it('verwijst naar de juiste bijlage bij twee kosten met dezelfde datum en naam', async () => {
    // Zou de verwijzing op de titel gaan in plaats van op het kost-id, dan wezen
    // beide kosten naar dezelfde bon.
    const dubbel: GedeeldeKost[] = [
      kost({ id: 'a', datum: '2026-03-04', omschrijving: 'Schoolrekening', bedrag: 10000, bonnetje: BON }),
      kost({ id: 'b', datum: '2026-03-04', omschrijving: 'Schoolrekening', bedrag: 20000, bonnetje: BON }),
    ]
    await exporteerBewijsmapPDF(
      t,
      dossier,
      { ...afrekening, kostIds: ['a', 'b'] },
      dubbel,
      kinderen,
      [],
      [],
      NU,
    )
    const tekst = alleTekst(nep)
    expect(tekst).toContain('zie bijlage 1')
    expect(tekst).toContain('zie bijlage 2')
  })

  it('toont de uitsplitsing per kind met de echte kindnamen', async () => {
    await exporteerBewijsmapPDF(t, dossier, afrekening, kosten, kinderen, [], documenten, NU)
    // De KOP erbij: 'Kind 1' staat ook in de meta-regel onder de kost, dus zonder deze
    // assertie zou de test blijven slagen als de hele tabel wegvalt.
    expect(alleTekst(nep)).toContain('Per kind')
    const naKop = alleTekst(nep).slice(alleTekst(nep).indexOf('Per kind'))
    expect(naKop).toContain('Kind 1')
  })
})

describe('een bon die aan de transactie hangt in plaats van aan de kost', () => {
  // De gewóne weg: je boekt een uitgave, hangt de bonfoto eraan en vinkt "delen in
  // een dossier" aan. De bon zit dan in de documentkluis onder `transactieId` en NIET
  // op de gedeelde kost. Vóór de review zei de bewijsmap dan "geen bon" en "waarvan
  // 0 met bon" bij een kost waar wél een bon van bestond — precies het bewijsstuk dat
  // je wilde meesturen ontbrak.
  const kostViaTransactie = kost({ id: 'k-tx', omschrijving: 'Turnles', bedrag: 6000, transactieId: 'tx1' })
  const bonInKluis: DossierDocument = {
    id: 'docTx',
    transactieId: 'tx1',
    naam: 'Bon turnles',
    soort: 'bon',
    bestand: BON,
    toegevoegdOp: '2026-03-05',
  }

  beforeEach(async () => {
    await exporteerBewijsmapPDF(
      t,
      dossier,
      { ...afrekening, kostIds: ['k-tx'] },
      [kostViaTransactie],
      kinderen,
      [],
      [bonInKluis],
      NU,
    )
  })

  it('zet die bon wél als bijlage in het document', () => {
    expect(nep.afbeeldingen).toHaveLength(1)
    expect(alleTekst(nep)).toContain('Bijlage 1')
  })

  it('verwijst er vanuit de kostenlijst naar', () => {
    expect(alleTekst(nep)).toContain('zie bijlage 1')
    expect(alleTekst(nep).replace(/\n/g, ' ')).not.toContain('geen bon')
  })

  it('telt hem mee in "waarvan n met bon"', () => {
    // De telling, de regel onder de kost en de bijlagelijst horen hetzelfde te zeggen.
    expect(alleTekst(nep)).toContain('1 kost(en), 1 bijlage(n)')
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('waarvan 1 met bon')
  })
})

describe('de grondslag uit de documentkluis', () => {
  const overeenkomst: DossierDocument = {
    id: 'd-oud',
    dossierId: 'd1',
    naam: 'Ouderschapsovereenkomst',
    soort: 'overeenkomst',
    bestand: BON,
    toegevoegdOp: '2024-01-10',
  }
  const vonnis: DossierDocument = {
    id: 'd-nieuw',
    dossierId: 'd1',
    naam: 'Beschikking rechtbank',
    soort: 'vonnis',
    bestand: BON,
    toegevoegdOp: '2026-05-20',
  }

  beforeEach(async () => {
    // Bewust nieuwste eerst meegegeven, zoals de app ze op het scherm heeft staan.
    await exporteerBewijsmapPDF(t, dossier, afrekening, kosten, kinderen, [], [vonnis, overeenkomst], NU)
  })

  it('zet de soort van elk document erbij', () => {
    // Een vonnis en een losse foto stonden er anders identiek in, en juist bij een
    // bewijsstuk is dat het verschil dat telt.
    const tekst = alleTekst(nep)
    expect(tekst).toContain('Overeenkomst: Ouderschapsovereenkomst')
    expect(tekst).toContain('Vonnis: Beschikking rechtbank')
  })

  it('zet ze chronologisch, oudste eerst', () => {
    // `documentenVan` sorteert nieuwste eerst — juist voor het scherm, verkeerd voor
    // een dossier: de overeenkomst uit 2024 komt vóór de beschikking van 2026.
    const tekst = alleTekst(nep)
    expect(tekst.indexOf('Ouderschapsovereenkomst')).toBeLessThan(tekst.indexOf('Beschikking rechtbank'))
  })
})

describe('een lange bijlagetitel', () => {
  it('schrijft niet over de bon heen', async () => {
    // De bon stond eerst op een vaste hoogte van 42 mm terwijl de titel vrij mocht
    // doorlopen. Bij vier afgebroken titelregels werd de afbeelding bovenop de tekst
    // getekend.
    const lang = kost({
      id: 'k-lang',
      omschrijving:
        'Inschrijving buitenschoolse opvang en kinderbegeleiding voor het volledige schooljaar, inclusief warme maaltijden, uitstappen en het remgeld van de zwemlessen op donderdag',
      bedrag: 45000,
      bonnetje: BON,
    })
    await exporteerBewijsmapPDF(t, dossier, { ...afrekening, kostIds: ['k-lang'] }, [lang], kinderen, [], [], NU)

    const beeld = nep.afbeeldingen[0]
    expect(beeld).toBeDefined()
    // Elke tekst op de bijlagebladzijde staat boven de afbeelding.
    const opBladVanBeeld = nep.teksten.filter((r) => r.blad === beeld.blad && r.y < 280)
    for (const r of opBladVanBeeld) expect(r.y).toBeLessThan(beeld.y)
  })
})

describe('een dossier met veel bijlagen', () => {
  // Acht bonnen: genoeg om de nummering, de bladen en de verwijzingen voorbij één
  // cijfer te duwen. In de tests hierboven blijft het bij drie.
  const veel: GedeeldeKost[] = Array.from({ length: 8 }, (_, i) =>
    kost({ id: `kv${i}`, omschrijving: `Kost ${i}`, bedrag: 1000 * (i + 1), datum: `2026-03-${String(i + 1).padStart(2, '0')}`, bonnetje: BON }),
  )

  beforeEach(async () => {
    await exporteerBewijsmapPDF(
      t,
      dossier,
      { ...afrekening, kostIds: veel.map((k) => k.id) },
      veel,
      kinderen,
      [],
      [],
      NU,
    )
  })

  it('nummert alle acht bijlagen doorlopend, elk op een eigen blad', () => {
    const koppen = nep.teksten.filter((r) => /^Bijlage \d+$/.test(r.tekst))
    expect(koppen.map((r) => r.tekst)).toEqual(Array.from({ length: 8 }, (_, i) => `Bijlage ${i + 1}`))
    expect(new Set(koppen.map((r) => r.blad)).size).toBe(8)
  })

  it('verwijst vanuit elke kost naar haar eigen bijlage', () => {
    const tekst = alleTekst(nep)
    for (let n = 1; n <= 8; n++) expect(tekst).toContain(`zie bijlage ${n}`)
  })

  it('zet op elk blad het juiste bladnummer', () => {
    for (let n = 1; n <= nep.bladen; n++) {
      expect(tekstVanBlad(nep, n)).toContain(`blad ${n} van ${nep.bladen}`)
    }
  })

  it('houdt alle tekst boven de voettekst', () => {
    // De kostenlijst schrijft met rauwe doc.text en één handberekende ruimte() vooraf.
    // Zit daar een verkeerde factor in, dan loopt de tekst over het bladnummer heen.
    for (const r of nep.teksten) {
      if (r.y === VOETTEKST_Y) continue
      if (r.y > ONDERGRENS) expect.fail(`"${r.tekst}" staat op ${r.y} mm, onder ${ONDERGRENS}`)
    }
  })
})

describe('twee bewijsstukken voor dezelfde kost', () => {
  // Je boekt een uitgave met een bonfoto (die gaat naar de kluis onder de transactie)
  // en voegt later op de Dossiers-pagina de factuur toe aan diezelfde kost. Dat zijn
  // twee bewijsstukken; er mag er geen stil wegvallen.
  const FACTUUR = 'data:image/jpeg;base64,FACTUUR'
  const beide = kost({ id: 'k-beide', omschrijving: 'Schoolrekening', bedrag: 12000, bonnetje: FACTUUR, transactieId: 'tx9' })
  const bonInKluis: DossierDocument = {
    id: 'docTx9',
    transactieId: 'tx9',
    naam: 'Bonfoto',
    soort: 'bon',
    bestand: BON,
    toegevoegdOp: '2026-03-05',
  }

  beforeEach(async () => {
    await exporteerBewijsmapPDF(
      t,
      dossier,
      { ...afrekening, kostIds: ['k-beide'] },
      [beide],
      kinderen,
      [],
      [bonInKluis],
      NU,
    )
  })

  it('neemt ze allebei op als eigen bijlage', () => {
    expect(nep.afbeeldingen).toHaveLength(2)
    expect(alleTekst(nep)).toContain('Bijlage 1')
    expect(alleTekst(nep)).toContain('Bijlage 2')
  })

  it('verwijst vanuit de kost naar beide bijlagen', () => {
    expect(alleTekst(nep)).toContain('zie bijlage 1, 2')
  })

  it('zegt in de titel welke van de twee het is', () => {
    const tekst = alleTekst(nep).replace(/\n/g, ' ')
    expect(tekst).toContain('1 van 2')
    expect(tekst).toContain('2 van 2')
  })
})

describe('een kluisdocument dat een PDF is', () => {
  it('wordt gemeld in plaats van als lege bladzijde ingevoegd', async () => {
    const pdfDoc: DossierDocument = {
      id: 'docPdf',
      dossierId: 'd1',
      naam: 'Vonnis',
      soort: 'vonnis',
      bestand: 'data:application/pdf;base64,AAAA',
      toegevoegdOp: '2026-01-02',
    }
    await exporteerBewijsmapPDF(t, dossier, { ...afrekening, kostIds: [] }, [], kinderen, [], [pdfDoc], NU)
    expect(alleTekst(nep).replace(/\n/g, ' ')).toContain('Vraag het losse bestand op')
    expect(nep.afbeeldingen).toHaveLength(0)
    expect(alleTekst(nep)).toContain('Vonnis: Vonnis')
  })
})

describe('een staande bon', () => {
  it('krijgt de volle hoogte van de bladzijde', async () => {
    // De normale vorm van een gefotografeerd kassaticket. In de andere tests is de bon
    // liggend, en dan bindt een andere grens dan in werkelijkheid.
    nep.beeldmaten = { width: 900, height: 1200 }
    await exporteerBewijsmapPDF(t, dossier, { ...afrekening, kostIds: ['k-school'] }, [kosten[0]], kinderen, [], [], NU)
    const beeld = nep.afbeeldingen[0]
    expect(beeld).toBeDefined()
    // Ze past op het blad en loopt niet tot onder de voettekst.
    expect(beeld.y + beeld.hoogte).toBeLessThanOrEqual(ONDERGRENS + 0.01)
    // En ze is niet onnodig klein gemaakt: minstens de helft van de beschikbare hoogte.
    expect(beeld.hoogte).toBeGreaterThan((ONDERGRENS - beeld.y) / 2)
  })
})
