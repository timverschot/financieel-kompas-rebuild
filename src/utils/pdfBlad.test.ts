import { describe, it, expect, beforeEach } from 'vitest'
import { leegNepPdf, nepJsPdfKlasse, type NepPdf } from '../test/nepPdf'
import { BOVEN, LINKS, ONDERGRENS, RECHTS, VOETTEKST_Y, maakBlad, plaatsAfbeelding } from './pdfBlad'
import { vertaal } from '../i18n'

// Dit bestand bestaat omdat drie documenten dezelfde maatvoering en paginabreuk
// delen (ronde 41). Precies daarom hoort het eigen tests te hebben: een fout hier
// zit in de afrekening, in het maandrapport én in de bewijsmap tegelijk, en de tests
// van die drie documenten kijken naar hun inhoud, niet naar de millimeters.

const t = (s: string, p?: Record<string, string | number>) => vertaal('nl', s, p)

let nep: NepPdf
// Het type van de nep-doc: precies de methodes die pdfBlad gebruikt. Niet `any` —
// dan zou een tikfout in een methodenaam hier stil doorgaan.
let doc: InstanceType<ReturnType<typeof nepJsPdfKlasse>>

beforeEach(() => {
  nep = leegNepPdf()
  const Klasse = nepJsPdfKlasse(nep)
  doc = new Klasse()
})

describe('maakBlad — waar de tekst landt', () => {
  it('begint bovenaan het blad', () => {
    const blad = maakBlad(doc)
    expect(blad.positie()).toBe(BOVEN)
  })

  it('zet gewone tekst tegen de linkermarge', () => {
    const blad = maakBlad(doc)
    blad.regel('hallo')
    expect(nep.teksten[0]).toMatchObject({ tekst: 'hallo', x: LINKS })
  })

  it('lijnt de waarde van een label/waarde-regel rechts uit', () => {
    const blad = maakBlad(doc)
    blad.labelWaarde('Totaal', '€ 12,50')
    expect(nep.teksten.map((r) => r.x)).toEqual([LINKS, RECHTS])
  })

  it('schuift na elke regel op', () => {
    const blad = maakBlad(doc)
    const start = blad.positie()
    blad.regel('een')
    expect(blad.positie()).toBeGreaterThan(start)
  })

  it('houdt een ingesprongen regel binnen de marges', () => {
    const blad = maakBlad(doc)
    blad.regel('meta', { indent: 4 })
    expect(nep.teksten[0].x).toBe(LINKS + 4)
  })
})

describe('maakBlad — de paginabreuk', () => {
  it('blijft op één blad zolang er plaats is', () => {
    const blad = maakBlad(doc)
    for (let i = 0; i < 10; i++) blad.regel(`regel ${i}`)
    expect(nep.bladen).toBe(1)
  })

  it('begint een nieuw blad zodra de ondergrens bereikt is', () => {
    const blad = maakBlad(doc)
    // Genoeg regels van 5 mm om ruim voorbij de ondergrens te komen.
    for (let i = 0; i < 80; i++) blad.regel(`regel ${i}`)
    expect(nep.bladen).toBeGreaterThan(1)
  })

  it('schrijft nooit onder de ondergrens, en dus nooit over de voettekst', () => {
    // Dit is de belangrijkste test van dit bestand: viel er tekst onder deze grens,
    // dan zou ze in élk document over de voettekst en het bladnummer heen komen.
    const blad = maakBlad(doc)
    for (let i = 0; i < 200; i++) blad.regel(`regel ${i}`)
    blad.kop('Een kop verderop')
    blad.labelWaarde('Totaal', '€ 1,00')
    blad.alinea('Een langere alinea die over meerdere regels afbreekt en dus meer hoogte nodig heeft dan één regel.')
    for (const r of nep.teksten) expect(r.y).toBeLessThanOrEqual(ONDERGRENS)
  })

  it('zet de schrijfpositie op een nieuw blad terug naar boven', () => {
    const blad = maakBlad(doc)
    for (let i = 0; i < 80; i++) blad.regel(`regel ${i}`)
    const opNieuwBlad = nep.teksten.filter((r) => r.blad === 2)
    expect(opNieuwBlad[0].y).toBe(BOVEN)
  })

  it('begint met nieuwBlad() hoe dan ook opnieuw, ook halverwege', () => {
    const blad = maakBlad(doc)
    blad.regel('boven')
    blad.nieuwBlad()
    blad.regel('op het volgende blad')
    expect(nep.bladen).toBe(2)
    expect(nep.teksten[1]).toMatchObject({ blad: 2, y: BOVEN })
  })

  it('reserveert met ruimte() plaats voor een blok dat bij elkaar moet blijven', () => {
    const blad = maakBlad(doc)
    // Tot net onder de grens vullen…
    while (blad.positie() < ONDERGRENS - 12) blad.regel('vul')
    const voor = nep.bladen
    // …en dan een blok van 20 mm vragen: dat past niet meer.
    blad.ruimte(20)
    expect(nep.bladen).toBe(voor + 1)
  })
})

describe('maakBlad — de voettekst', () => {
  it('zet op elk blad dezelfde linkertekst en een eigen bladnummer', () => {
    const blad = maakBlad(doc)
    for (let i = 0; i < 80; i++) blad.regel(`regel ${i}`)
    const bladen = nep.bladen
    blad.voettekst(t, 'Financieel Kompas')

    for (let n = 1; n <= bladen; n++) {
      const opDitBlad = nep.teksten.filter((r) => r.blad === n && r.y === VOETTEKST_Y).map((r) => r.tekst)
      expect(opDitBlad).toContain('Financieel Kompas')
      expect(opDitBlad).toContain(`blad ${n} van ${bladen}`)
    }
  })

  it('voegt zelf geen bladen toe', () => {
    const blad = maakBlad(doc)
    blad.regel('een')
    blad.voettekst(t, 'Kop')
    expect(nep.bladen).toBe(1)
  })
})

describe('plaatsAfbeelding', () => {
  const vak = { x: LINKS, y: 40, breedte: RECHTS - LINKS, hoogte: 200 }

  it('houdt de verhouding van de afbeelding', () => {
    expect(plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', vak)).toBe(true)
    const beeld = nep.afbeeldingen[0]
    // De nep-bon is 800 x 600.
    expect(beeld.breedte / beeld.hoogte).toBeCloseTo(800 / 600, 3)
  })

  it('houdt de afbeelding binnen het vak', () => {
    plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', vak)
    const beeld = nep.afbeeldingen[0]
    expect(beeld.breedte).toBeLessThanOrEqual(vak.breedte)
    expect(beeld.hoogte).toBeLessThanOrEqual(vak.hoogte)
    expect(beeld.x).toBeGreaterThanOrEqual(vak.x)
    expect(beeld.x + beeld.breedte).toBeLessThanOrEqual(vak.x + vak.breedte + 0.01)
  })

  it('centreert de afbeelding in het vak', () => {
    plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', vak)
    const beeld = nep.afbeeldingen[0]
    const linksVrij = beeld.x - vak.x
    const rechtsVrij = vak.x + vak.breedte - (beeld.x + beeld.breedte)
    expect(linksVrij).toBeCloseTo(rechtsVrij, 3)
  })

  it('rekt een kleine bon niet uit tot een wazige vlek', () => {
    // 200 beeldpunten breed mag bij 100 ppi hoogstens ~51 mm worden, niet de volle
    // 170 mm van het vak.
    nep.beeldmaten = { width: 200, height: 150 }
    plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', vak)
    const beeld = nep.afbeeldingen[0]
    expect(beeld.breedte).toBeLessThan(60)
    expect((200 / beeld.breedte) * 25.4).toBeGreaterThanOrEqual(100)
  })

  it('geeft een gewone staande bon wél de volle breedte', () => {
    // Dit is de normale vorm: `verkleinAfbeelding` maakt van een gefotografeerd
    // kassaticket 900 x 1200. Die hoort niet door de scherpte-ondergrens kleiner
    // gemaakt te worden — dat zou het bewijsstuk zonder reden verkleinen.
    nep.beeldmaten = { width: 900, height: 1200 }
    plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', vak)
    const beeld = nep.afbeeldingen[0]
    // Hier bindt de HOOGTE van het vak (200 mm), niet de scherpte-ondergrens.
    expect(beeld.hoogte).toBeCloseTo(vak.hoogte, 1)
    expect(beeld.breedte).toBeCloseTo((900 / 1200) * vak.hoogte, 1)
  })

  it('laat een liggende bon door de breedte van het vak begrenzen', () => {
    nep.beeldmaten = { width: 1200, height: 900 }
    plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', vak)
    const beeld = nep.afbeeldingen[0]
    expect(beeld.breedte).toBeCloseTo(vak.breedte, 1)
  })

  it('weigert een vak zonder plaats in plaats van een onzichtbare afbeelding te tekenen', () => {
    // jsPDF klaagt niet over negatieve maten: het tekent dan niets, en dan zou er een
    // blanco bijlagebladzijde uitkomen zonder één woord uitleg.
    expect(plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', { ...vak, hoogte: -12 })).toBe(false)
    expect(plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', { ...vak, hoogte: 0 })).toBe(false)
    expect(plaatsAfbeelding(doc, 'data:image/jpeg;base64,AAAA', { ...vak, breedte: 0 })).toBe(false)
    expect(nep.afbeeldingen).toHaveLength(0)
  })

  it('weigert een afbeelding waarvan de bibliotheek geen maten kent', () => {
    expect(plaatsAfbeelding(doc, 'data:image/jpeg;base64,NULMAAT', vak)).toBe(false)
    expect(nep.afbeeldingen).toHaveLength(0)
  })

  it('geeft false terug bij een bon die niet te lezen is, in plaats van te ontploffen', () => {
    expect(plaatsAfbeelding(doc, 'data:image/jpeg;base64,KAPOT', vak)).toBe(false)
    expect(nep.afbeeldingen).toHaveLength(0)
  })
})
