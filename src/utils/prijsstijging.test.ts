import { describe, it, expect } from 'vitest'
import type { TerugkerendePost, Transactie } from '../data/schema'
import { bouwPrijsbeeld, verouderdeVasteLasten } from './prijsstijging'

const VANDAAG = '2026-07-15'

const tx = (datum: string, bedrag: number, omschrijving: string, id = `${omschrijving}-${datum}`): Transactie => ({
  id,
  datum,
  omschrijving,
  bedrag,
  rekeningId: 'r1',
})

/** Elke maand dezelfde betaling, met een prijssprong vanaf 'vanafMaand'. */
function reeks(
  naam: string,
  maanden: string[],
  bedragen: number[],
): Transactie[] {
  return maanden.map((m, i) => tx(`${m}-05`, -bedragen[i], naam))
}

const beeld = (extra: Partial<Parameters<typeof bouwPrijsbeeld>[0]> = {}) =>
  bouwPrijsbeeld({ transacties: [], terugkerendePosten: [], vandaagISO: VANDAAG, ...extra })

const MAANDEN = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']

describe('bouwPrijsbeeld — een vaste handelaar', () => {
  it('vindt de prijssprong met het oude en het nieuwe bedrag', () => {
    // Netflix: € 11,99 tot en met februari, daarna € 13,99.
    const transacties = reeks('Netflix', MAANDEN, [1199, 1199, 1399, 1399, 1399, 1399, 1399])
    const w = beeld({ transacties }).wijzigingen
    expect(w).toHaveLength(1)
    expect(w[0].naam).toBe('Netflix')
    expect(w[0].bron).toBe('handelaar')
    expect(w[0].oudBedrag).toBe(1199)
    expect(w[0].nieuwBedrag).toBe(1399)
    expect(w[0].verschil).toBe(200)
    expect(w[0].sindsDatum).toBe('2026-03-05')
    expect(w[0].zekerheid).toBe('hoog')
  })

  it('zwijgt over een handelaar die nooit van prijs veranderde', () => {
    expect(beeld({ transacties: reeks('Netflix', MAANDEN, [1399, 1399, 1399, 1399, 1399, 1399, 1399]) }).wijzigingen)
      .toHaveLength(0)
  })

  it('zwijgt over een supermarkt: elke keer een ander bedrag, meerdere keren per maand', () => {
    // Precies het vals alarm dat deze feature onbruikbaar zou maken.
    const boodschappen: Transactie[] = []
    for (const m of MAANDEN) {
      for (const dag of ['03', '10', '17', '24']) {
        boodschappen.push(tx(`${m}-${dag}`, -(3000 + Number(dag) * 37), 'Colruyt', `c-${m}-${dag}`))
      }
    }
    expect(beeld({ transacties: boodschappen }).wijzigingen).toHaveLength(0)
  })

  it('zwijgt over een handelaar met te weinig betalingen', () => {
    const kort = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07']
    expect(beeld({ transacties: reeks('Spotify', kort, [1099, 1099, 1299, 1299, 1299]) }).wijzigingen).toHaveLength(0)
  })

  it('zwijgt over een winkel waar je toevallig vier maanden na elkaar kwam', () => {
    // Vier bezoeken in vier maanden haalde de cadans-toets, en met twee bedragen die
    // toevallig dicht bij elkaar lagen kwam er een "prijsstijging" uit.
    const vier = ['2026-04', '2026-05', '2026-06', '2026-07']
    expect(beeld({ transacties: reeks('Colruyt', vier, [3000, 3010, 5000, 5020]) }).wijzigingen).toHaveLength(0)
  })

  it('negeert een verschil dat te klein is om iets te betekenen', () => {
    // Van € 12,00 naar € 12,30: dertig cent, geen prijsverhoging maar afronding.
    expect(beeld({ transacties: reeks('Netflix', MAANDEN, [1200, 1200, 1230, 1230, 1230, 1230, 1230]) }).wijzigingen)
      .toHaveLength(0)
  })

  it('negeert een verschil dat groot lijkt maar procentueel niets is', () => {
    // Een energiefactuur van € 210 die € 211,50 wordt.
    expect(
      beeld({ transacties: reeks('Energie', MAANDEN, [21000, 21000, 21150, 21150, 21150, 21150, 21150]) })
        .wijzigingen,
    ).toHaveLength(0)
  })

  it('vraagt minstens twee betalingen aan het oude bedrag', () => {
    // Eén afwijkend bedrag ervoor is geen prijs, dat is een toeval.
    const transacties = reeks('Netflix', MAANDEN, [1399, 1199, 1399, 1399, 1399, 1399, 1399])
    expect(beeld({ transacties }).wijzigingen).toHaveLength(0)
  })

  it('zwijgt bij één afwijkende laatste betaling', () => {
    // Dit is de jaarafrekening-val: zes voorschotten van € 150 en dan één factuur
    // van € 480 werd gemeld als "€ 330 per maand duurder". Eén uitschieter is geen
    // prijs.
    const transacties = reeks('Energie', MAANDEN, [15000, 15000, 15000, 15000, 15000, 15000, 48000])
    expect(beeld({ transacties }).wijzigingen).toHaveLength(0)
  })

  it('noemt twee betalingen aan het nieuwe bedrag nog niet helemaal zeker', () => {
    const transacties = reeks('Netflix', MAANDEN, [1199, 1199, 1199, 1199, 1199, 1399, 1399])
    const w = beeld({ transacties }).wijzigingen
    expect(w).toHaveLength(1)
    expect(w[0].aantalNieuw).toBe(2)
    expect(w[0].zekerheid).toBe('gemiddeld')
  })

  it('neemt de LAATSTE sprong wanneer er dit jaar twee waren', () => {
    // Dat is het bedrag dat je vandaag betaalt.
    const transacties = reeks('Netflix', MAANDEN, [999, 999, 1199, 1199, 1399, 1399, 1399])
    const w = beeld({ transacties }).wijzigingen
    expect(w[0].oudBedrag).toBe(1199)
    expect(w[0].nieuwBedrag).toBe(1399)
  })

  it('telt een inkomst niet mee', () => {
    const loon = MAANDEN.map((m, i) => tx(`${m}-01`, i < 3 ? 240000 : 260000, 'Loon'))
    expect(beeld({ transacties: loon }).wijzigingen).toHaveLength(0)
  })

  it('laat een gesplitst kassaticket met rust', () => {
    // Dat heeft geen "prijs" die je over de tijd kan volgen.
    const tickets = MAANDEN.map((m, i) => ({
      ...tx(`${m}-05`, i < 3 ? -3000 : -4000, 'Delhaize'),
      regels: [{ categorieId: 'ov-voeding', bedrag: i < 3 ? -3000 : -4000 }],
    }))
    expect(beeld({ transacties: tickets }).wijzigingen).toHaveLength(0)
  })

  it('kijkt niet verder terug dan het venster', () => {
    const oud = reeks('Netflix', ['2023-01', '2023-02', '2023-03', '2023-04'], [999, 999, 999, 999])
    const nu = reeks('Netflix', MAANDEN, [1399, 1399, 1399, 1399, 1399, 1399, 1399])
    // De prijs van 2023 geldt niet als "de oude prijs".
    expect(beeld({ transacties: [...oud, ...nu] }).wijzigingen).toHaveLength(0)
  })

  it('telt een boeking met een datum in de toekomst nog niet mee', () => {
    const transacties = [
      ...reeks('Netflix', MAANDEN, [1199, 1199, 1199, 1199, 1199, 1199, 1199]),
      tx('2026-09-05', -1399, 'Netflix'),
    ]
    expect(beeld({ transacties }).wijzigingen).toHaveLength(0)
  })
})

describe('bouwPrijsbeeld — een vaste last', () => {
  const post: TerugkerendePost = {
    id: 'p1',
    omschrijving: 'Autoverzekering',
    bedrag: -6200,
    rekeningId: 'r1',
    dag: 12,
  }

  it('herkent een vaste last aan haar naam en noemt ze zo', () => {
    const transacties = reeks('Autoverzekering', MAANDEN, [6200, 6200, 7100, 7100, 7100, 7100, 7100])
    const w = beeld({ transacties, terugkerendePosten: [post] }).wijzigingen
    expect(w).toHaveLength(1)
    expect(w[0].bron).toBe('vastelast')
    expect(w[0].postId).toBe('p1')
    expect(w[0].zekerheid).toBe('hoog')
    expect(w[0].verschil).toBe(900)
  })

  it('rekent een halfjaarlijkse premie om naar per maand', () => {
    // Zonder die omrekening telt een premie zes keer te zwaar mee in het totaal.
    // De cadans komt uit de GEGEVENS, niet uit het label van de vaste last: een post
    // die "kwartaal" heet maar maandelijks geboekt wordt, zou anders drie keer te
    // licht wegen.
    const halfjaarlijks: TerugkerendePost = { ...post, frequentie: 'semester' }
    const transacties = [
      tx('2025-07-12', -60000, 'Autoverzekering'),
      tx('2026-01-12', -60000, 'Autoverzekering'),
      tx('2026-07-12', -72000, 'Autoverzekering'),
      tx('2026-07-13', -72000, 'Autoverzekering', 'extra'),
    ]
    const w = beeld({ transacties, terugkerendePosten: [halfjaarlijks] }).wijzigingen
    expect(w).toHaveLength(1)
    expect(w[0].verschil).toBe(12000)
    // Zes maanden tussen twee betalingen: € 120 verschil is € 20 per maand.
    expect(w[0].verschilPerMaand).toBe(2000)
  })

  it('laat een opgezegde vaste last met rust', () => {
    // Die betaal je niet meer; advies erover is enkel ruis.
    const gestopt: TerugkerendePost = { ...post, eindMaand: '2026-04' }
    const transacties = reeks('Autoverzekering', MAANDEN, [6200, 6200, 7100, 7100, 7100, 7100, 7100])
    const w = beeld({ transacties, terugkerendePosten: [gestopt] }).wijzigingen
    // Ze mag hoogstens nog als gewone handelaar meetellen, nooit als vaste last.
    expect(w.every((x) => x.bron === 'handelaar')).toBe(true)
  })

  it('voegt twee vaste lasten met bijna dezelfde naam niet samen', () => {
    // "Turnles Kind 1" en "Turnles Kind 2" zijn twee posten, geen prijsstijging.
    const kind1: TerugkerendePost = { ...post, id: 'p1', omschrijving: 'Turnles Kind 1', bedrag: -5000 }
    const kind2: TerugkerendePost = { ...post, id: 'p2', omschrijving: 'Turnles Kind 2', bedrag: -9000 }
    const transacties = [
      ...reeks('Turnles Kind 1', MAANDEN, [5000, 5000, 5000, 5000, 5000, 5000, 5000]),
      ...reeks('Turnles Kind 2', MAANDEN, [9000, 9000, 9000, 9000, 9000, 9000, 9000]),
    ]
    expect(beeld({ transacties, terugkerendePosten: [kind1, kind2] }).wijzigingen).toHaveLength(0)
  })

  it('slaat een vaste inkomst over', () => {
    const inkomst: TerugkerendePost = { ...post, id: 'p2', omschrijving: 'Loon', bedrag: 240000 }
    // Een inkomst is positief; die hoort niet in een lijst met prijsstijgingen.
    const transacties = MAANDEN.map((m, i) => tx(`${m}-01`, i < 3 ? 240000 : 260000, 'Loon'))
    expect(beeld({ transacties, terugkerendePosten: [inkomst] }).wijzigingen).toHaveLength(0)
  })
})

describe('bouwPrijsbeeld — het totaal', () => {
  it('telt op wat er duurder werd en wat er goedkoper werd', () => {
    const transacties = [
      ...reeks('Netflix', MAANDEN, [1199, 1199, 1399, 1399, 1399, 1399, 1399]),
      ...reeks('Sportclub', MAANDEN, [4000, 4000, 3000, 3000, 3000, 3000, 3000]),
    ]
    const b = beeld({ transacties })
    expect(b.duurderPerMaand).toBe(200)
    expect(b.goedkoperPerMaand).toBe(1000)
    expect(b.nettoPerMaand).toBe(-800)
  })

  it('zet de zwaarste wijziging bovenaan', () => {
    const transacties = [
      ...reeks('Netflix', MAANDEN, [1199, 1199, 1399, 1399, 1399, 1399, 1399]),
      ...reeks('Telecom', MAANDEN, [4500, 4500, 5500, 5500, 5500, 5500, 5500]),
    ]
    expect(beeld({ transacties }).wijzigingen.map((w) => w.naam)).toEqual(['Telecom', 'Netflix'])
  })

  it('geeft een leeg beeld terug zonder boekingen', () => {
    const b = beeld()
    expect(b.wijzigingen).toEqual([])
    expect(b.nettoPerMaand).toBe(0)
  })
})

describe('verouderdeVasteLasten', () => {
  const post: TerugkerendePost = {
    id: 'p1',
    omschrijving: 'Autoverzekering',
    bedrag: -6200,
    rekeningId: 'r1',
    dag: 12,
  }

  it('meldt een vaste last waarvan het bedrag niet meer klopt', () => {
    // Zolang die niet bijgewerkt is, rekent de app in je vooruitblik, je buffer en
    // je "nog niet ingeboekt"-meldingen met een bedrag dat niet meer bestaat.
    const transacties = reeks('Autoverzekering', MAANDEN, [6200, 6200, 7100, 7100, 7100, 7100, 7100])
    const b = beeld({ transacties, terugkerendePosten: [post] })
    expect(verouderdeVasteLasten(b, [post]).map((w) => w.postId)).toEqual(['p1'])
  })

  it('zwijgt wanneer de vaste last al bijgewerkt is', () => {
    const bijgewerkt = { ...post, bedrag: -7100 }
    const transacties = reeks('Autoverzekering', MAANDEN, [6200, 6200, 7100, 7100, 7100, 7100, 7100])
    const b = beeld({ transacties, terugkerendePosten: [bijgewerkt] })
    expect(verouderdeVasteLasten(b, [bijgewerkt])).toHaveLength(0)
  })

  it('laat een gewone handelaar erbuiten', () => {
    const transacties = reeks('Netflix', MAANDEN, [1199, 1199, 1399, 1399, 1399, 1399, 1399])
    const b = beeld({ transacties })
    expect(verouderdeVasteLasten(b, [])).toHaveLength(0)
  })
})
