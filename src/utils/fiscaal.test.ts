import { describe, it, expect } from 'vitest'
import type { DossierDocument, Onderhoudsbetaling, Onderhoudsbijdrage, Transactie } from '../data/schema'
import { beschikbareJaren, fiscaalJaaroverzicht } from './fiscaal'
import { onderhoudPercentage, aanslagjaarVan } from '../data/fiscalePosten'

// Ronde 50. Dit zijn cijfers waarmee iemand zijn belastingaangifte invult, dus elke
// regel hieronder is met de hand na te rekenen.
//
// De categorie-id's komen uit de ingebouwde boom:
//   i-cr-che-9817          crèche, valt onder cat-kinderopvang
//   i-babysit-6707         babysit, valt onder cat-kinderopvang
//   i-brood--wit-9238      brood — hoort NERGENS bij een fiscale post
//   i-pensioensparen-6807  pensioensparen

const tx = (over: Partial<Transactie> & { id: string }): Transactie => ({
  datum: '2026-03-10',
  omschrijving: 'Crèche De Zonnebloem',
  bedrag: -25000,
  rekeningId: 'r1',
  categorieId: 'i-cr-che-9817',
  ...over,
})

function regelVan(overzicht: ReturnType<typeof fiscaalJaaroverzicht>, postId: string) {
  return overzicht.regels.find((r) => r.post.id === postId)
}

describe('fiscaalJaaroverzicht — het jaartal', () => {
  it('noemt zowel het inkomstenjaar als het aanslagjaar', () => {
    // De meest gemaakte fout in dit onderwerp: wat je in 2026 betaalt, geef je aan in
    // de aangifte van aanslagjaar 2027.
    const o = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [] })
    expect(o.inkomstenjaar).toBe(2026)
    expect(o.aanslagjaar).toBe(2027)
  })

  it('zegt het wanneer het gegevensbestand een jaar niet beschrijft', () => {
    // Voor oudere jaren zou de lijst te kort zijn, en een te korte lijst leest als
    // "er valt niets af te trekken". Dat is erger dan zeggen dat we het niet weten.
    expect(fiscaalJaaroverzicht({ inkomstenjaar: 2023, transacties: [] }).gekend).toBe(false)
    expect(fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [] }).gekend).toBe(true)
  })
})

describe('fiscaalJaaroverzicht — wat er onder een post valt', () => {
  it('telt de boekingen van dat jaar op onder de juiste post', () => {
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [tx({ id: 'a' }), tx({ id: 'b', bedrag: -18000, datum: '2026-09-02' })],
    })
    expect(regelVan(o, 'kinderopvang')?.bedrag).toBe(43000)
    expect(regelVan(o, 'kinderopvang')?.boekingen).toHaveLength(2)
  })

  it('vangt een item via zijn middencategorie', () => {
    // De post is gekoppeld aan `cat-kinderopvang`; de boeking staat op een item
    // eronder. Dezelfde regel als elders in de app: een categorie vangt alles
    // wat eronder hangt.
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [tx({ id: 'a', categorieId: 'i-babysit-6707' })],
    })
    expect(regelVan(o, 'kinderopvang')?.bedrag).toBe(25000)
  })

  it('laat boekingen van een ander jaar staan', () => {
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [tx({ id: 'a' }), tx({ id: 'oud', datum: '2025-11-04' })],
    })
    expect(regelVan(o, 'kinderopvang')?.boekingen.map((b) => b.id)).toEqual(['a'])
  })

  it('telt alleen de REGEL die onder de post valt, niet de hele bon', () => {
    // Een schoolfactuur met opvang én maaltijden erop: alleen het opvangdeel telt.
    // Dat is precies waarom dit op regelniveau rekent en niet op de boeking.
    const gesplitst = tx({
      id: 'school',
      bedrag: -30000,
      categorieId: undefined,
      regels: [
        { categorieId: 'i-cr-che-9817', bedrag: -12000 },
        { categorieId: 'i-brood--wit-9238', bedrag: -18000 },
      ],
    })
    const o = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [gesplitst] })
    expect(regelVan(o, 'kinderopvang')?.bedrag).toBe(12000)
  })

  it('telt inkomsten niet mee', () => {
    // Een terugbetaling van de opvang is geen uitgave; het attest telt ook alleen
    // wat je effectief betaalde.
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [tx({ id: 'terug', bedrag: 5000 })],
    })
    expect(regelVan(o, 'kinderopvang')?.bedrag).toBe(0)
  })

  it('laat een post zonder boekingen gewoon op nul staan', () => {
    // Belangrijk dat de post er wél staat: dan zie je dat de app er niets vond, in
    // plaats van dat ze stilzwijgend verdwijnt.
    const o = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [] })
    expect(regelVan(o, 'pensioensparen')?.bedrag).toBe(0)
    expect(regelVan(o, 'pensioensparen')).toBeDefined()
  })
})

describe('fiscaalJaaroverzicht — betaalde onderhoudsuitkeringen', () => {
  const bijdrageBetaal: Onderhoudsbijdrage = {
    id: 'ob1',
    dossierId: 'd1',
    richting: 'jij-betaalt',
    basisbedrag: 30000,
    datumRegeling: '2022-06-15',
  }
  const bijdrageOntvang: Onderhoudsbijdrage = { ...bijdrageBetaal, id: 'ob2', richting: 'jij-ontvangt' }
  const betaling = (id: string, bijdrageId: string, datum: string, bedrag: number): Onderhoudsbetaling => ({
    id,
    bijdrageId,
    datum,
    bedrag,
  })

  it('telt alleen wat JIJ betaalt, niet wat je ontvangt', () => {
    // Wat je ontvangt is aan de andere kant belastbaar; dat hoort niet in deze lijst.
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [],
      onderhoudsbijdragen: [bijdrageBetaal, bijdrageOntvang],
      onderhoudsbetalingen: [
        betaling('p1', 'ob1', '2026-01-05', 30000),
        betaling('p2', 'ob2', '2026-01-05', 45000),
      ],
    })
    expect(regelVan(o, 'onderhoudsuitkeringen')?.bedrag).toBe(30000)
  })

  it('noemt het aftrekbare deel met het percentage van het BETALINGSJAAR', () => {
    // 2026 is 60 %. Dat percentage volgt het jaar waarin je betaalde, niet het
    // aanslagjaar — zo staat het in de circulaire.
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [],
      onderhoudsbijdragen: [bijdrageBetaal],
      onderhoudsbetalingen: [betaling('p1', 'ob1', '2026-01-05', 30000)],
    })
    const r = regelVan(o, 'onderhoudsuitkeringen')
    expect(r?.percentage).toBe(60)
    expect(r?.aftrekbaar).toBe(18000)
  })

  it('gebruikt voor 2025 nog 70 %', () => {
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2025,
      transacties: [],
      onderhoudsbijdragen: [bijdrageBetaal],
      onderhoudsbetalingen: [betaling('p1', 'ob1', '2025-03-05', 30000)],
    })
    expect(regelVan(o, 'onderhoudsuitkeringen')?.percentage).toBe(70)
    expect(regelVan(o, 'onderhoudsuitkeringen')?.aftrekbaar).toBe(21000)
  })

  it('rondt het aftrekbare deel naar BENEDEN af', () => {
    // Liever een cent te weinig opgeven dan een cent te veel.
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [],
      onderhoudsbijdragen: [bijdrageBetaal],
      onderhoudsbetalingen: [betaling('p1', 'ob1', '2026-01-05', 1001)],
    })
    // 1001 × 60 % = 600,6 centen
    expect(regelVan(o, 'onderhoudsuitkeringen')?.aftrekbaar).toBe(600)
  })

  it('noemt geen percentage wanneer er niets betaald is', () => {
    const o = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [] })
    expect(regelVan(o, 'onderhoudsuitkeringen')?.aftrekbaar).toBeUndefined()
  })

  it('geeft de andere posten GEEN aftrekbaar deel', () => {
    // Alleen waar de wet een vast percentage oplegt mag de app er een noemen. Bij de
    // rest hangt het voordeel van de hele aangifte af.
    const o = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [tx({ id: 'a' })] })
    expect(regelVan(o, 'kinderopvang')?.aftrekbaar).toBeUndefined()
    expect(regelVan(o, 'kinderopvang')?.percentage).toBeUndefined()
  })
})

describe('fiscaalJaaroverzicht — posten die niet meer bestaan', () => {
  const dienstencheque = tx({ id: 'dc', categorieId: 'i-dienstencheques-9094', bedrag: -9000 })

  it('toont een afgeschafte post alleen wanneer je er dat jaar boekingen onder hebt', () => {
    const leeg = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [] })
    expect(leeg.vervallen).toHaveLength(0)

    const met = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [dienstencheque] })
    expect(met.vervallen.map((r) => r.post.id)).toEqual(['dienstencheques'])
    expect(met.vervallen[0].bedrag).toBe(9000)
  })

  it('houdt een vervallen post buiten de gewone lijst', () => {
    // Anders zou ze tussen de posten staan die je nog kan invullen, en dat suggereert
    // een voordeel dat niet meer bestaat.
    const o = fiscaalJaaroverzicht({ inkomstenjaar: 2026, transacties: [dienstencheque, tx({ id: 'a' })] })
    expect(o.regels.map((r) => r.post.id)).not.toContain('dienstencheques')
    expect(regelVan(o, 'kinderopvang')?.bedrag).toBe(25000)
  })
})

describe('fiscaalJaaroverzicht — hoe ver de wet vandaag reikt', () => {
  const bijdrage: Onderhoudsbijdrage = {
    id: 'ob1',
    dossierId: 'd1',
    richting: 'jij-betaalt',
    basisbedrag: 30000,
    datumRegeling: '2022-06-15',
  }
  const met = (jaar: number) =>
    fiscaalJaaroverzicht({
      inkomstenjaar: jaar,
      transacties: [],
      onderhoudsbijdragen: [bijdrage],
      onderhoudsbetalingen: [{ id: 'p1', bijdrageId: 'ob1', datum: `${jaar}-03-05`, bedrag: 30000 }],
    })

  it('zegt in 2026 dat het percentage nog daalt, en in 2027 niet meer', () => {
    // De wet legt vandaag tot 50 % vast en niet verder. "Wordt verder afgebouwd" is
    // dus waar in 2026 en onwaar in 2027 — het scherm mag dat niet als vaste zin
    // zetten.
    expect(regelVan(met(2026), 'onderhoudsuitkeringen')?.bouwtVerderAf).toBe(true)
    expect(regelVan(met(2027), 'onderhoudsuitkeringen')?.bouwtVerderAf).toBe(false)
  })
})

describe('onderhoudPercentage', () => {
  it('volgt de trap uit de wet', () => {
    expect(onderhoudPercentage(2024)).toBe(80)
    expect(onderhoudPercentage(2025)).toBe(70)
    expect(onderhoudPercentage(2026)).toBe(60)
    expect(onderhoudPercentage(2027)).toBe(50)
    // 50 % is het laatste niveau dat de wet vandaag vastlegt.
    expect(onderhoudPercentage(2030)).toBe(50)
  })
})

describe('beschikbareJaren', () => {
  it('neemt het huidige jaar altijd mee, ook zonder boekingen', () => {
    expect(beschikbareJaren([], '2026-08-16')).toEqual([2026])
  })

  it('voegt de jaren van je boekingen toe, nieuwste eerst', () => {
    const jaren = beschikbareJaren([tx({ id: 'a', datum: '2025-04-01' }), tx({ id: 'b' })], '2026-08-16')
    expect(jaren).toEqual([2026, 2025])
  })

  it('laat jaren weg die het gegevensbestand niet beschrijft', () => {
    const jaren = beschikbareJaren([tx({ id: 'oud', datum: '2019-04-01' })], '2026-08-16')
    expect(jaren).toEqual([2026])
    expect(aanslagjaarVan(2019)).toBe(2020)
  })

  it('neemt ook de jaren mee waarin je alleen alimentatie betaalde', () => {
    // Wie zijn alimentatie enkel in Dossiers bijhoudt en dat jaar geen gewone
    // boekingen had, kon zijn belangrijkste post anders niet eens kiezen.
    const jaren = beschikbareJaren([], '2026-08-16', [
      { id: 'p1', bijdrageId: 'ob1', datum: '2025-02-05', bedrag: 30000 },
    ])
    expect(jaren).toEqual([2026, 2025])
  })
})

describe('fiscaalJaaroverzicht — de bonnen', () => {
  const bon: DossierDocument = {
    id: 'doc1',
    transactieId: 'a',
    naam: 'Attest crèche',
    soort: 'attest',
    bestand: 'data:application/pdf;base64,AAA=',
    toegevoegdOp: '2026-03-11',
  }

  it('telt per post hoeveel boekingen een bon in de kluis hebben', () => {
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [tx({ id: 'a' }), tx({ id: 'b', datum: '2026-04-10' })],
      documenten: [bon],
    })
    const r = regelVan(o, 'kinderopvang')
    expect(r?.metBon).toBe(1)
    expect(r?.boekingen.find((b) => b.id === 'a')?.bon).toBe(true)
    expect(r?.boekingen.find((b) => b.id === 'b')?.bon).toBe(false)
  })

  it('zegt "weet ik niet" in plaats van "nee" bij een alimentatiebetaling', () => {
    // Die wordt in Dossiers geregistreerd en heeft daar geen documentkluis. Juist bij
    // deze post is bewijs een wettelijke voorwaarde, dus "nee" zou onwaar zijn.
    const o = fiscaalJaaroverzicht({
      inkomstenjaar: 2026,
      transacties: [],
      onderhoudsbijdragen: [
        { id: 'ob1', dossierId: 'd1', richting: 'jij-betaalt', basisbedrag: 30000, datumRegeling: '2022-06-15' },
      ],
      onderhoudsbetalingen: [{ id: 'p1', bijdrageId: 'ob1', datum: '2026-01-05', bedrag: 30000 }],
    })
    const r = regelVan(o, 'onderhoudsuitkeringen')
    expect(r?.boekingen[0].bon).toBeNull()
    expect(r?.metBon).toBe(0)
  })
})
