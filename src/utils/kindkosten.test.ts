import { describe, it, expect } from 'vitest'
import type { Dossier, GedeeldeKost, Gezinslid, Transactie } from '../data/schema'
import { beschikbareKindjaren, kindkostenVanJaar, magDoorklikken } from './kindkosten'

// Ronde 53. Dit scherm beantwoordt "wat kost elk gezinslid mij per jaar", en dat
// cijfer kan in een gesprek met de andere ouder terechtkomen. Elke test hieronder
// is met de hand na te rekenen.

const LABELS = { gezin: 'Het gezin', onbekend: 'Onbekend gezinslid' }

const leden: Gezinslid[] = [
  { id: 'emma', naam: 'Emma' },
  { id: 'noah', naam: 'Noah' },
]

const dossier: Dossier = { id: 'd1', naam: 'Kinderen', aandeelJij: 60 }

const tx = (over: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-03-10',
  omschrijving: 'Winkel',
  bedrag: -5000,
  rekeningId: 'r1',
  ...over,
})

const kost = (over: Partial<GedeeldeKost> & { id: string }): GedeeldeKost => ({
  dossierId: 'd1',
  omschrijving: 'Schoolreis',
  bedrag: 9000,
  betaaldDoor: 'jij',
  datum: '2026-05-04',
  ...over,
})

function overzicht(over: Partial<Parameters<typeof kindkostenVanJaar>[0]> = {}) {
  return kindkostenVanJaar({ jaar: 2026, transacties: [], labels: LABELS, gezinsleden: leden, ...over })
}


function regelVan(o: ReturnType<typeof kindkostenVanJaar>, id: string | null) {
  return o.regels.find((r) => r.id === id)
}

describe('kindkostenVanJaar — je eigen boekingen', () => {
  it('telt het volledige bedrag van een boeking op naam van één gezinslid', () => {
    const o = overzicht({ transacties: [tx({ id: 'a', persoonIds: ['emma'] })] })
    expect(regelVan(o, 'emma')?.bedrag).toBe(5000)
    expect(regelVan(o, 'emma')?.uitBoekingen).toBe(5000)
    expect(regelVan(o, 'emma')?.uitDossiers).toBe(0)
  })

  it('verdeelt een boeking die aan twee gezinsleden hangt', () => {
    const o = overzicht({ transacties: [tx({ id: 'a', bedrag: -9000, persoonIds: ['emma', 'noah'] })] })
    expect(regelVan(o, 'emma')?.bedrag).toBe(4500)
    expect(regelVan(o, 'noah')?.bedrag).toBe(4500)
  })

  it('zet wat aan niemand hangt bij "Het gezin", achteraan', () => {
    const o = overzicht({ transacties: [tx({ id: 'a' }), tx({ id: 'b', bedrag: -9000, persoonIds: ['emma'] })] })
    expect(o.regels[o.regels.length - 1]).toMatchObject({ id: null, naam: 'Het gezin', bedrag: 5000 })
  })

  it('telt alleen uitgaven, en op regelniveau', () => {
    // Een kassaticket met een statiegeldregel erop kost je het uitgavedeel, niet het
    // nettobedrag — dezelfde regel als overal in deze app.
    const o = overzicht({
      transacties: [
        tx({ id: 'loon', bedrag: 200000, persoonIds: ['emma'] }),
        tx({ id: 'bon', bedrag: -5000, persoonIds: ['emma'], regels: [{ bedrag: -5300 }, { bedrag: 300 }] }),
      ],
    })
    expect(regelVan(o, 'emma')?.bedrag).toBe(5300)
  })

  it('laat boekingen van een ander jaar staan', () => {
    const o = overzicht({
      transacties: [tx({ id: 'a', persoonIds: ['emma'] }), tx({ id: 'oud', datum: '2025-03-10', persoonIds: ['emma'] })],
    })
    expect(regelVan(o, 'emma')?.bedrag).toBe(5000)
    expect(o.aantalBoekingen).toBe(1)
  })

  it('verzwijgt een verwijderd gezinslid niet', () => {
    // Het bedrag mag nooit stil uit het totaal verdwijnen.
    const o = overzicht({ transacties: [tx({ id: 'a', persoonIds: ['weg'] })] })
    expect(regelVan(o, 'weg')).toMatchObject({ naam: 'Onbekend gezinslid', bedrag: 5000 })
  })
})

describe('kindkostenVanJaar — jouw aandeel in een gedeelde kost', () => {
  it('rekent jouw percentage, niet het volle bedrag', () => {
    // € 90 aan 60 % is € 54, ook al betaalde jij de hele rekening: de andere € 36
    // komt terug via de afrekening.
    const o = overzicht({ dossiers: [dossier], gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })] })
    expect(regelVan(o, 'emma')?.bedrag).toBe(5400)
    expect(regelVan(o, 'emma')?.uitDossiers).toBe(5400)
  })

  it('telt ook een kost die de ANDERE ouder betaalde', () => {
    // Jij hebt niets uitgegeven, maar je bent je aandeel wel verschuldigd. Dat is
    // wat het jou kost.
    const o = overzicht({
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], betaaldDoor: 'partner' })],
    })
    expect(regelVan(o, 'emma')?.bedrag).toBe(5400)
  })

  it('volgt de verdeelsleutel van de kost zelf', () => {
    const o = overzicht({
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], aandeelJijOverride: 25 })],
    })
    expect(regelVan(o, 'emma')?.bedrag).toBe(2250)
  })

  it('laat een INGETROKKEN kost helemaal weg', () => {
    // Intrekken is sinds ronde 44 het eerlijke alternatief voor verwijderen; zo'n
    // kost telt nergens anders in de app nog mee.
    const o = overzicht({
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], ingetrokken: true })],
    })
    expect(regelVan(o, 'emma')).toBeUndefined()
    expect(o.totaal).toBe(0)
  })

  it('slaat een kost over waarvan het dossier niet meer bestaat', () => {
    // De verdeelsleutel staat op dat dossier. Stil op 100 % zetten zou een bedrag
    // opleveren dat nergens uit volgt.
    const o = overzicht({ dossiers: [], gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })] })
    expect(o.totaal).toBe(0)
    expect(o.aantalDossierkosten).toBe(0)
  })
})

describe('kindkostenVanJaar — de dubbeltelling', () => {
  // Koppel je een boeking aan een dossier, dan bestaat dezelfde uitgave twee keer.
  const boeking = tx({ id: 'schoolreis', bedrag: -9000, persoonIds: ['emma'] })
  const gekoppeld = kost({ id: 'k1', kindIds: ['emma'], transactieId: 'schoolreis' })

  it('telt zo’n uitgave één keer, en dan als jouw aandeel', () => {
    // Zonder ontdubbeling stond hier € 90 + € 54 = € 144.
    const o = overzicht({ transacties: [boeking], dossiers: [dossier], gedeeldeKosten: [gekoppeld] })
    expect(regelVan(o, 'emma')?.bedrag).toBe(5400)
    expect(regelVan(o, 'emma')?.uitBoekingen).toBe(0)
    expect(o.aantalOvergeslagen).toBe(1)
  })

  it('laat een INGETROKKEN koppeling de boeking weer meetellen', () => {
    // De kost telt niet meer mee, dus zou de uitgave anders helemaal verdwijnen.
    const o = overzicht({
      transacties: [boeking],
      dossiers: [dossier],
      gedeeldeKosten: [{ ...gekoppeld, ingetrokken: true }],
    })
    expect(regelVan(o, 'emma')?.bedrag).toBe(9000)
    expect(regelVan(o, 'emma')?.uitBoekingen).toBe(9000)
  })
})

describe('kindkostenVanJaar — de twee bronnen samen', () => {
  it('telt ze op en houdt ze apart zichtbaar', () => {
    const o = overzicht({
      transacties: [tx({ id: 'a', bedrag: -2000, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
    })
    expect(regelVan(o, 'emma')).toMatchObject({ bedrag: 7400, uitBoekingen: 2000, uitDossiers: 5400 })
    expect(o.totaal).toBe(7400)
  })

  it('telt het totaal over alle regels, "Het gezin" inbegrepen', () => {
    // Hier mág een totaal: het is dezelfde eenheid met dezelfde betekenis.
    const o = overzicht({
      transacties: [tx({ id: 'a', bedrag: -2000, persoonIds: ['emma'] }), tx({ id: 'b', bedrag: -1000 })],
    })
    expect(o.totaal).toBe(3000)
  })
})

describe('magDoorklikken', () => {
  // Een doorklik moet exact de verzameling tonen waaruit het cijfer komt.

  it('mag bij een rij die één op één uit gewone boekingen komt', () => {
    const o = overzicht({ transacties: [tx({ id: 'a', persoonIds: ['emma'] })] })
    expect(magDoorklikken(regelVan(o, 'emma')!, leden)).toBe(true)
  })

  it('mag NIET bij een gezinslid dat niet meer bestaat', () => {
    // Dan heeft de chip boven de lijst geen naam, en twee zulke rijen heten allebei
    // "Onbekend gezinslid" — dezelfde reden als op de Analyse-pagina sinds ronde 49.
    const o = overzicht({ transacties: [tx({ id: 'a', persoonIds: ['weg'] })] })
    expect(magDoorklikken(regelVan(o, 'weg')!, leden)).toBe(false)
  })

  it('mag altijd bij "Het gezin", want die groep bestaat per definitie', () => {
    const o = overzicht({ transacties: [tx({ id: 'a' })] })
    expect(magDoorklikken(regelVan(o, null)!, leden)).toBe(true)
  })

  it('mag NIET zodra er een aandeel uit een dossier in zit', () => {
    // Jouw 60 % van € 90 bestaat nergens als boeking.
    const o = overzicht({ dossiers: [dossier], gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })] })
    expect(magDoorklikken(regelVan(o, 'emma')!, leden)).toBe(false)
  })

  it('mag NIET wanneer een uitgave over twee gezinsleden verdeeld werd', () => {
    const o = overzicht({ transacties: [tx({ id: 'a', persoonIds: ['emma', 'noah'] })] })
    expect(magDoorklikken(regelVan(o, 'emma')!, leden)).toBe(false)
  })

  it('mag NIET wanneer er een boeking is overgeslagen', () => {
    // Die overgeslagen boeking zou in de gefilterde lijst wél opduiken, en dan toont
    // de lijst een groter bedrag dan de rij.
    const o = overzicht({
      transacties: [
        tx({ id: 'los', bedrag: -2000, persoonIds: ['emma'] }),
        tx({ id: 'gekoppeld', bedrag: -9000, persoonIds: ['emma'] }),
      ],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['noah'], transactieId: 'gekoppeld' })],
    })
    expect(regelVan(o, 'emma')?.uitDossiers).toBe(0)
    expect(regelVan(o, 'emma')?.gedeeld).toBe(false)
    expect(magDoorklikken(regelVan(o, 'emma')!, leden)).toBe(false)
  })
})

describe('beschikbareKindjaren', () => {
  it('neemt het huidige jaar altijd mee, ook zonder gegevens', () => {
    expect(beschikbareKindjaren([], [], '2026-08-17')).toEqual([2026])
  })

  it('voegt de jaren van je boekingen en je gedeelde kosten toe, nieuwste eerst', () => {
    const jaren = beschikbareKindjaren(
      [tx({ id: 'a', datum: '2024-02-02' })],
      [kost({ id: 'k1', datum: '2025-06-01' })],
      '2026-08-17',
    )
    expect(jaren).toEqual([2026, 2025, 2024])
  })

  it('telt een ingetrokken kost niet mee voor de jaarkeuze', () => {
    const jaren = beschikbareKindjaren([], [kost({ id: 'k1', datum: '2023-06-01', ingetrokken: true })], '2026-08-17')
    expect(jaren).toEqual([2026])
  })
})

describe('kindkostenVanJaar — wat de app NIET zeker weet', () => {
  // De ontdubbeling werkt via `transactieId`, en die koppeling ontstaat alleen in
  // het invoervenster. Lees je je bankuittreksel in en registreer je dezelfde kost
  // daarnaast in een dossier, dan staat ze hier twee keer.

  it('meldt een gedeelde kost die samenvalt met een losse boeking', () => {
    const o = overzicht({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9000, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
    })
    expect(o.mogelijkeDubbels).toBe(1)
    // De app beslist NIET: ze telt allebei mee en zegt dat er iets verdachts is.
    expect(regelVan(o, 'emma')?.bedrag).toBe(14400)
  })

  it('meldt niets wanneer de kost wél aan die boeking gekoppeld is', () => {
    const o = overzicht({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9000, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], transactieId: 'a' })],
    })
    expect(o.mogelijkeDubbels).toBe(0)
    expect(regelVan(o, 'emma')?.bedrag).toBe(5400)
  })

  it('meldt niets bij een ander bedrag', () => {
    const o = overzicht({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9500, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
    })
    expect(o.mogelijkeDubbels).toBe(0)
  })

  it('meldt ook een paar dat een paar dagen uit elkaar ligt (ronde 54)', () => {
    // Dit is de gewóne vorm van de fout: de bank boekt je kaartbetaling van vrijdag
    // pas op maandag, terwijl je de gedeelde kost op de datum van de rekening zet.
    // Keek de app op de dag exact, dan bleef de waarschuwing precies dan weg.
    for (const datum of ['2026-05-01', '2026-05-03', '2026-05-05', '2026-05-07']) {
      const o = overzicht({
        transacties: [tx({ id: 'a', datum, bedrag: -9000, persoonIds: ['emma'] })],
        dossiers: [dossier],
        gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
      })
      expect({ datum, dubbels: o.mogelijkeDubbels }).toEqual({ datum, dubbels: 1 })
    }
  })

  it('houdt op bij vier dagen verschil', () => {
    // De marge is drie dagen. Ruimer maken laat twee losse boodschappen van hetzelfde
    // bedrag in dezelfde week elkaar "verklaren", en een waarschuwing die vaak vals
    // is, wordt genegeerd.
    for (const datum of ['2026-04-30', '2026-05-08']) {
      const o = overzicht({
        transacties: [tx({ id: 'a', datum, bedrag: -9000, persoonIds: ['emma'] })],
        dossiers: [dossier],
        gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
      })
      expect({ datum, dubbels: o.mogelijkeDubbels }).toEqual({ datum, dubbels: 0 })
    }
  })

  it('laat één boeking maar één kost verklaren', () => {
    // Twee gedeelde kosten van € 90 in dezelfde week en maar één losse boeking van
    // € 90: dan is er hoogstens één dubbel. Zou de boeking twee keer meetellen, dan
    // stond er een waarschuwing over een uitgave die maar één keer bestaat.
    const o = overzicht({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9000, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [
        kost({ id: 'k1', kindIds: ['emma'], datum: '2026-05-04' }),
        kost({ id: 'k2', kindIds: ['emma'], datum: '2026-05-05' }),
      ],
    })
    expect(o.mogelijkeDubbels).toBe(1)
  })

  it('verdeelt de boekingen zo dat er zoveel mogelijk paren overblijven', () => {
    // Boekingen op 2 en 5 mei, kosten op 5 en 8 mei. Pakt de kost van 5 mei de
    // boeking van dezelfde dag, dan vindt de kost van 8 mei alleen die van 2 mei
    // nog — zes dagen, te ver — en telt de app één paar. Er staan er twee, allebei
    // precies drie dagen uit elkaar.
    const o = overzicht({
      transacties: [
        tx({ id: 'a', datum: '2026-05-02', bedrag: -9000, persoonIds: ['emma'] }),
        tx({ id: 'b', datum: '2026-05-05', bedrag: -9000, persoonIds: ['emma'] }),
      ],
      dossiers: [dossier],
      gedeeldeKosten: [
        kost({ id: 'k1', kindIds: ['emma'], datum: '2026-05-05' }),
        kost({ id: 'k2', kindIds: ['emma'], datum: '2026-05-08' }),
      ],
    })
    expect(o.mogelijkeDubbels).toBe(2)
  })

  it('geeft hetzelfde getal, welke volgorde de boekingen ook binnenkomen', () => {
    // De gegevens komen uit de database op id gesorteerd, niet op datum. Zou de
    // uitkomst daarvan afhangen, dan zag je op je gsm een ander aantal dan op je
    // laptop, met exact dezelfde boekingen.
    const a = tx({ id: 'a', datum: '2026-05-02', bedrag: -9000, persoonIds: ['emma'] })
    const b = tx({ id: 'b', datum: '2026-05-08', bedrag: -9000, persoonIds: ['emma'] })
    const kosten = [
      kost({ id: 'k1', kindIds: ['emma'], datum: '2026-05-05' }),
      kost({ id: 'k2', kindIds: ['emma'], datum: '2026-05-11' }),
    ]
    const heen = overzicht({ transacties: [a, b], dossiers: [dossier], gedeeldeKosten: kosten })
    const terug = overzicht({ transacties: [b, a], dossiers: [dossier], gedeeldeKosten: kosten })
    expect(heen.mogelijkeDubbels).toBe(terug.mogelijkeDubbels)
    expect(heen.mogelijkeDubbels).toBe(2)
  })

  it('zwijgt over een kost die de andere ouder betaalde', () => {
    // Die staat per definitie niet op jouw rekeninguittreksel, dus ze kan onmogelijk
    // dezelfde uitgave zijn als een van jouw boekingen. In een dossier is dat ruwweg
    // de helft van alle kosten; zonder deze regel waarschuwde het scherm over
    // uitgaven waar niets mis mee was.
    const o = overzicht({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9000 })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], betaaldDoor: 'partner' })],
    })
    expect(o.mogelijkeDubbels).toBe(0)
  })

  it('zwijgt over een kost die met 0 % niets bijdraagt', () => {
    // Die telt hier voor niets mee, dus ze kan dit bedrag ook niet te hoog maken.
    const o = overzicht({
      transacties: [tx({ id: 'a', datum: '2026-05-04', bedrag: -9000, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], aandeelJijOverride: 0 })],
    })
    expect(o.aantalDossierkosten).toBe(0)
    expect(o.mogelijkeDubbels).toBe(0)
  })
})

describe('kindkostenVanJaar — een gekoppelde kost die nadien wijzigde', () => {
  it('laat het deel dat niet gedeeld werd bij jou staan', () => {
    // Bij het koppelen krijgt de kost het volle bedrag van de boeking, maar je kan
    // dat nadien vrij wijzigen. Zet je de kost van € 90 naar € 60, dan is € 30 van
    // die boeking helemaal van jou, en de gedeelde € 60 kosten je 60 % = € 36.
    const o = overzicht({
      transacties: [tx({ id: 'a', bedrag: -9000, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], bedrag: 6000, transactieId: 'a' })],
    })
    expect(regelVan(o, 'emma')).toMatchObject({ bedrag: 6600, uitBoekingen: 3000, uitDossiers: 3600 })
  })
})

describe('kindkostenVanJaar — een kost en haar boeking in verschillende jaren', () => {
  it('telt de uitgave niet in allebei de jaren', () => {
    // Boeking op 30 december, kost op 2 januari. Zonder een koppeling die over de
    // jaargrens heen geldt, stond 2025 op € 90 en 2026 op € 54 voor dezelfde reis.
    const invoer = {
      transacties: [tx({ id: 'a', datum: '2025-12-30', bedrag: -9000, persoonIds: ['emma'] })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', datum: '2026-01-02', kindIds: ['emma'], transactieId: 'a' })],
    }
    expect(overzicht({ ...invoer, jaar: 2025 }).totaal).toBe(0)
    expect(overzicht({ ...invoer, jaar: 2026 }).totaal).toBe(5400)
  })
})

describe('kindkostenVanJaar — een verweesd dossier', () => {
  it('laat de boeking gewoon meetellen in plaats van haar te laten verdwijnen', () => {
    // De kost levert geen aandeel op (de verdeelsleutel staat op dat dossier), dus
    // ze mag de boeking ook niet afdekken. Anders staat er € 0,00 én zegt het scherm
    // dat de uitgave als gedeelde kost geteld is.
    const o = overzicht({
      transacties: [tx({ id: 'a', bedrag: -9000, persoonIds: ['emma'] })],
      dossiers: [],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], transactieId: 'a' })],
    })
    expect(regelVan(o, 'emma')?.bedrag).toBe(9000)
    expect(o.aantalOvergeslagen).toBe(0)
  })
})

describe('kindkostenVanJaar — de tellingen in de kop', () => {
  it('telt een kost pas mee wanneer ze ook iets bijdroeg', () => {
    // Bij 0 % stond er "1 gedeelde kost" boven een leeg scherm.
    const o = overzicht({
      dossiers: [{ ...dossier, aandeelJij: 0 }],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'] })],
    })
    expect(o.aantalDossierkosten).toBe(0)
    expect(o.regels).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Het gesplitste kassaticket (ronde 55)
//
// Het open punt uit ronde 54: de vergelijking gebeurde altijd op het TOTAAL van de
// boeking. Koop je voor € 90 waarvan € 45 school, en staat die € 45 ook als gedeelde
// kost, dan telde ze dubbel zonder één waarschuwing — terwijl de huisregel juist zegt
// dat een gesplitst ticket overal uitgesplitst hoort te worden.
// ---------------------------------------------------------------------------
describe('kindkostenVanJaar — een gesplitst kassaticket', () => {
  // Eén ticket van € 90: € 45 school, € 30 kleren, € 15 eten.
  const ticket = tx({
    id: 'ticket',
    datum: '2026-05-04',
    bedrag: -9000,
    persoonIds: ['emma'],
    regels: [
      { bedrag: -4500, categorieId: 'school', omschrijving: 'Schoolreis' },
      { bedrag: -3000, categorieId: 'kleren', omschrijving: 'Trui' },
      { bedrag: -1500, categorieId: 'eten', omschrijving: 'Brood' },
    ],
  })

  it('herkent een gedeelde kost die één REGEL van het ticket is', () => {
    const o = overzicht({
      transacties: [ticket],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], bedrag: 4500 })],
    })
    expect(o.mogelijkeDubbels).toBe(1)
  })

  it('herkent nog altijd een kost die het hele ticket is', () => {
    const o = overzicht({
      transacties: [ticket],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], bedrag: 9000 })],
    })
    expect(o.mogelijkeDubbels).toBe(1)
  })

  it('herkent twee regels van hetzelfde ticket als twee aparte kosten', () => {
    // Dat zijn andere euro's, dus dit zijn er echt twee.
    const o = overzicht({
      transacties: [ticket],
      dossiers: [dossier],
      gedeeldeKosten: [
        kost({ id: 'k1', kindIds: ['emma'], bedrag: 4500 }),
        kost({ id: 'k2', kindIds: ['emma'], bedrag: 3000 }),
      ],
    })
    expect(o.mogelijkeDubbels).toBe(2)
  })

  it('laat het totaal en een regel van hetzelfde ticket NIET allebei meetellen', () => {
    // Anders zou één ticket van € 90 twee kosten verklaren met dezelfde euro's.
    const o = overzicht({
      transacties: [ticket],
      dossiers: [dossier],
      gedeeldeKosten: [
        kost({ id: 'k1', kindIds: ['emma'], bedrag: 9000 }),
        kost({ id: 'k2', kindIds: ['emma'], bedrag: 4500 }),
      ],
    })
    expect(o.mogelijkeDubbels).toBe(1)
  })

  it('telt een boeking met één regel niet twee keer', () => {
    // Bij één regel ís die regel het totaal. Stond ze er twee keer in, dan zouden
    // twee kosten van € 50 door één boeking van € 50 "verklaard" worden.
    const enkel = tx({
      id: 'enkel',
      datum: '2026-05-04',
      bedrag: -5000,
      persoonIds: ['emma'],
      regels: [{ bedrag: -5000, categorieId: 'school' }],
    })
    const o = overzicht({
      transacties: [enkel],
      dossiers: [dossier],
      gedeeldeKosten: [
        kost({ id: 'k1', kindIds: ['emma'], bedrag: 5000 }),
        kost({ id: 'k2', kindIds: ['emma'], bedrag: 5000 }),
      ],
    })
    expect(o.mogelijkeDubbels).toBe(1)
  })

  it('kijkt naar het uitgavedeel van een regel, niet naar het nettobedrag', () => {
    // Statiegeld op hetzelfde ticket: die regel is een INKOMST en is dus nooit
    // dezelfde uitgave als een gedeelde kost.
    const metStatiegeld = tx({
      id: 'stat',
      datum: '2026-05-04',
      bedrag: -4200,
      persoonIds: ['emma'],
      regels: [
        { bedrag: -4500, categorieId: 'school' },
        { bedrag: 300, categorieId: 'statiegeld' },
      ],
    })
    const raak = overzicht({
      transacties: [metStatiegeld],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], bedrag: 4500 })],
    })
    expect(raak.mogelijkeDubbels).toBe(1)

    const mis = overzicht({
      transacties: [metStatiegeld],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], bedrag: 300 })],
    })
    expect(mis.mogelijkeDubbels).toBe(0)
  })

  it('werkt ook met de speling van drie dagen', () => {
    const o = overzicht({
      transacties: [tx({ ...ticket, id: 'ticket2', datum: '2026-05-01' })],
      dossiers: [dossier],
      gedeeldeKosten: [kost({ id: 'k1', kindIds: ['emma'], bedrag: 4500 })],
    })
    expect(o.mogelijkeDubbels).toBe(1)
  })

  it('geeft hetzelfde antwoord ongeacht de volgorde waarin de gegevens binnenkomen', () => {
    // Dexie levert op id, niet op datum. Twee toestellen moeten hetzelfde getal tonen.
    const kosten = [
      kost({ id: 'k1', kindIds: ['emma'], bedrag: 4500 }),
      kost({ id: 'k2', kindIds: ['emma'], bedrag: 3000 }),
    ]
    const heen = overzicht({ transacties: [ticket], dossiers: [dossier], gedeeldeKosten: kosten })
    const terug = overzicht({ transacties: [ticket], dossiers: [dossier], gedeeldeKosten: [...kosten].reverse() })
    expect(heen.mogelijkeDubbels).toBe(terug.mogelijkeDubbels)
  })
})

// Nakijkronde ronde 55: het aantal vermoedens mag niet afhangen van de volgorde
// waarin de gedeelde kosten uit de database komen. Dexie levert op id.
describe('kindkostenVanJaar — hetzelfde antwoord op elk toestel', () => {
  it('geeft hetzelfde aantal bij een ticket waarvan het totaal én twee regels passen', () => {
    const ticket = tx({
      id: 'ticket',
      datum: '2026-05-04',
      bedrag: -9000,
      persoonIds: ['emma'],
      regels: [
        { bedrag: -3000, categorieId: 'a' },
        { bedrag: -3000, categorieId: 'b' },
        { bedrag: -3000, categorieId: 'c' },
      ],
    })
    const kosten = [
      kost({ id: 'k-groot', kindIds: ['emma'], bedrag: 9000 }),
      kost({ id: 'k-klein-1', kindIds: ['emma'], bedrag: 3000 }),
      kost({ id: 'k-klein-2', kindIds: ['emma'], bedrag: 3000 }),
    ]
    const volgordes = [
      [kosten[0], kosten[1], kosten[2]],
      [kosten[1], kosten[2], kosten[0]],
      [kosten[2], kosten[0], kosten[1]],
      [...kosten].reverse(),
    ]
    const uitkomsten = volgordes.map(
      (gedeeldeKosten) => overzicht({ transacties: [ticket], dossiers: [dossier], gedeeldeKosten }).mogelijkeDubbels,
    )
    expect(new Set(uitkomsten).size).toBe(1)
    // De twee regels wegen zwaarder dan het totaal: ze wijzen preciezer aan wat er
    // dubbel staat.
    expect(uitkomsten[0]).toBe(2)
  })
})
