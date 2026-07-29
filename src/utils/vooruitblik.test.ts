import { describe, it, expect } from 'vitest'
import type { TerugkerendePost, Transactie, TransactieRegel } from '../data/schema'
import {
  boekingDieDezePostAfdekt,
  geboekteVasteLasten,
  geboekteVasteLastenMet,
  spaarquote,
  maandVooruitblik,
  vasteLastTransactieId,
} from './vooruitblik'

function tx(id: string, datum: string, bedrag: number, regels?: TransactieRegel[]): Transactie {
  return { id, datum, omschrijving: '', bedrag, rekeningId: 'r', ...(regels ? { regels } : {}) }
}
function post(id: string, bedrag: number, dag = 1, extra: Partial<TerugkerendePost> = {}): TerugkerendePost {
  return { id, omschrijving: id, bedrag, rekeningId: 'r', dag, ...extra }
}
// Vaste 'vandaag' in de tests: de eerste van de maand, zodat een post van dag 1
// nog 'te komen' is. Zo hangt de test niet af van de dag waarop hij draait.
const EERSTE_JULI = '2026-07-01'

const JULI = { van: '2026-07-01', tot: '2026-07-31' }

describe('vooruitblik — spaarquote', () => {
  it('berekent inkomsten, uitgaven, saldo en het overgehouden percentage', () => {
    const txs = [tx('a', '2026-07-03', 200000), tx('b', '2026-07-10', -50000)]
    const r = spaarquote(txs, JULI)
    expect(r).toEqual({ inkomsten: 200000, uitgaven: 50000, saldo: 150000, quote: 75 })
  })

  it('telt op regelniveau, zodat een positieve regel in een gesplitst ticket apart meetelt', () => {
    // Uitgave van 30€ met een statiegeld-teruggave van 20€ ertussen: aan de kassa
    // 50€ uit, 20€ terug. Op regelniveau: 20000 inkomst, 50000 uitgave.
    const split = tx('s', '2026-07-05', -30000, [
      { bedrag: -50000 },
      { bedrag: 20000, omschrijving: 'statiegeld' },
    ])
    const r = spaarquote([split], JULI)
    expect(r.inkomsten).toBe(20000)
    expect(r.uitgaven).toBe(50000)
    expect(r.saldo).toBe(-30000)
    expect(r.quote).toBe(-150)
  })

  it('geeft quote null als er geen inkomsten zijn', () => {
    const r = spaarquote([tx('a', '2026-07-03', -50000)], JULI)
    expect(r.inkomsten).toBe(0)
    expect(r.quote).toBeNull()
  })

  it('respecteert de periode: een transactie erbuiten telt niet mee', () => {
    const txs = [tx('a', '2026-07-03', 200000), tx('oud', '2026-06-20', 999999)]
    expect(spaarquote(txs, JULI).inkomsten).toBe(200000)
  })
})

describe('vooruitblik — maandVooruitblik', () => {
  it('telt het geboekte van de maand plus de nog niet ingeboekte vaste lasten', () => {
    const txs = [
      tx('inkomen', '2026-07-01', 100000), // geboekt inkomen
      tx(vasteLastTransactieId('p1', '2026-07'), '2026-07-01', -60000), // p1 al ingeboekt
      tx('juni', '2026-06-15', -777777), // vorige maand: telt niet mee
    ]
    const posten = [
      post('p1', -60000), // al ingeboekt -> niet meer 'komend'
      post('p2', -40000), // nog te komen (uitgave)
      post('p3', 5000), // nog te komen (inkomst)
    ]
    const r = maandVooruitblik(txs, posten, '2026-07', EERSTE_JULI)
    expect(r.geboekt).toEqual({ inkomsten: 100000, uitgaven: 60000 })
    expect(r.komend).toEqual({ inkomsten: 5000, uitgaven: 40000 })
    expect(r.aantalKomend).toBe(2)
    expect(r.verwachteInkomsten).toBe(105000)
    expect(r.verwachteUitgaven).toBe(100000)
    expect(r.verwachtSaldo).toBe(5000)
    expect(r.verwachteQuote).toBeCloseTo((5000 / 105000) * 100, 5)
  })

  it('geeft alleen het geboekte terug wanneer alle vaste lasten al ingeboekt zijn', () => {
    const txs = [
      tx('inkomen', '2026-07-01', 100000),
      tx(vasteLastTransactieId('p1', '2026-07'), '2026-07-08', -60000),
    ]
    const r = maandVooruitblik(txs, [post('p1', -60000)], '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(0)
    expect(r.komend).toEqual({ inkomsten: 0, uitgaven: 0 })
    expect(r.verwachtSaldo).toBe(40000)
  })
})

describe('vooruitblik — handmatig geboekte vaste lasten', () => {
  // De kern van de fix: wie zijn huur gewoon zelf intikt, mag ze niet dubbel
  // zien meetellen (één keer geboekt + één keer 'nog te komen').
  const huur = post('huur', -90000, 1, { categorieId: 'c-wonen' })

  it('herkent een zelf ingetikte huur als geboekt (zelfde rekening, bedrag en categorie)', () => {
    const eigen: Transactie = {
      id: 'eigen-1',
      datum: '2026-07-02',
      omschrijving: 'Huur juli',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'c-wonen',
    }
    const r = maandVooruitblik([eigen], [huur], '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(0)
    expect(r.aantalAchterstallig).toBe(0)
    expect(r.komend).toEqual({ inkomsten: 0, uitgaven: 0 })
    // Vóór de fix was dit 180000 (één keer geboekt, één keer 'nog te komen').
    expect(r.verwachteUitgaven).toBe(90000)
  })

  it('gebruikt één transactie hoogstens één keer: twee gelijke posten, één betaling', () => {
    const eigen: Transactie = { id: 'eigen-1', datum: '2026-07-02', omschrijving: 'Abonnement', bedrag: -2000, rekeningId: 'r' }
    const posten = [post('a1', -2000), post('a2', -2000)]
    const r = maandVooruitblik([eigen], posten, '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(1)
    expect(r.komend.uitgaven).toBe(2000)
    expect(r.verwachteUitgaven).toBe(4000) // 2000 geboekt + 2000 nog te komen
  })

  it('is streng: ander bedrag, andere rekening of andere categorie telt niet als geboekt', () => {
    const anderBedrag: Transactie = { id: 'x1', datum: '2026-07-02', omschrijving: '', bedrag: -90001, rekeningId: 'r', categorieId: 'c-wonen' }
    const andereRekening: Transactie = { id: 'x2', datum: '2026-07-02', omschrijving: '', bedrag: -90000, rekeningId: 'ander', categorieId: 'c-wonen' }
    const andereCategorie: Transactie = { id: 'x3', datum: '2026-07-02', omschrijving: '', bedrag: -90000, rekeningId: 'r', categorieId: 'c-vervoer' }
    for (const t of [anderBedrag, andereRekening, andereCategorie]) {
      expect(maandVooruitblik([t], [huur], '2026-07', EERSTE_JULI).aantalKomend).toBe(1)
    }
  })

  it('negeert een gesplitst kassaticket, ook al klopt het totaal toevallig', () => {
    const ticket: Transactie = {
      id: 'ticket',
      datum: '2026-07-02',
      omschrijving: 'Colruyt',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'c-wonen',
      regels: [{ bedrag: -50000 }, { bedrag: -40000 }],
    }
    expect(maandVooruitblik([ticket], [huur], '2026-07', EERSTE_JULI).aantalKomend).toBe(1)
  })

  it('kijkt enkel binnen de maand zelf', () => {
    const vorigeMaand: Transactie = { id: 'juni', datum: '2026-06-30', omschrijving: '', bedrag: -90000, rekeningId: 'r', categorieId: 'c-wonen' }
    expect(maandVooruitblik([vorigeMaand], [huur], '2026-07', EERSTE_JULI).aantalKomend).toBe(1)
  })

  it('geeft de id-herkenning voorrang, zodat een losse gelijke uitgave niet opgesnoept wordt', () => {
    const geboekt: Transactie = {
      id: vasteLastTransactieId('huur', '2026-07'),
      datum: '2026-07-01',
      omschrijving: 'Huur',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'c-wonen',
    }
    const tweedePost = post('huur2', -90000, 1, { categorieId: 'c-wonen' })
    const r = maandVooruitblik([geboekt], [huur, tweedePost], '2026-07', EERSTE_JULI)
    expect(r.aantalKomend).toBe(1) // huur2 blijft openstaan
    expect(r.komend.uitgaven).toBe(90000)
  })
})

describe('vooruitblik — achterstallige vaste lasten', () => {
  it('zet een post waarvan de dag voorbij is bij achterstallig, niet bij nog te komen', () => {
    const posten = [post('vroeg', -50000, 1), post('laat', -20000, 28)]
    const r = maandVooruitblik([], posten, '2026-08', '2026-08-15')
    expect(r.aantalAchterstallig).toBe(1)
    expect(r.achterstallig.uitgaven).toBe(50000)
    expect(r.aantalKomend).toBe(1)
    expect(r.komend.uitgaven).toBe(20000)
    // Achterstallig telt nog steeds mee in de verwachting: het moet nog gebeuren.
    expect(r.verwachteUitgaven).toBe(70000)
  })

  it('rekent de dag van vandaag zelf nog als nog te komen', () => {
    const r = maandVooruitblik([], [post('p', -10000, 15)], '2026-08', '2026-08-15')
    expect(r.aantalKomend).toBe(1)
    expect(r.aantalAchterstallig).toBe(0)
  })

  it('een maand in het verleden is helemaal voorbij, een maand in de toekomst nog niet', () => {
    const p = [post('p', -10000, 28)]
    expect(maandVooruitblik([], p, '2026-07', '2026-08-01').aantalAchterstallig).toBe(1)
    expect(maandVooruitblik([], p, '2026-09', '2026-08-01').aantalKomend).toBe(1)
  })
})

// Ronde 35. Twee dingen die stil misgingen rond de herkenning van een handmatig
// ingetikte vaste last.
describe('vooruitblik — strengere herkenning en één gedeelde bepaling', () => {
  it('laat een boeting MET categorie een post ZONDER categorie niet afdekken', () => {
    // Het scenario: een jaarlijkse clubbijdrage van € 120 zonder categorie, en in
    // dezelfde maand sportkledij van exact € 120 op dezelfde rekening. Vroeger
    // dekte die aankoop de bijdrage af en hoorde je nooit meer dat ze nog betaald
    // moest worden.
    const bijdrage = post('club', -12000, 1)
    const kledij: Transactie = {
      id: 'kledij',
      datum: '2026-07-02',
      omschrijving: 'Decathlon',
      bedrag: -12000,
      rekeningId: 'r',
      categorieId: 'c-vrije-tijd',
    }
    expect(maandVooruitblik([kledij], [bijdrage], '2026-07', EERSTE_JULI).aantalKomend).toBe(1)
  })

  it('herkent een boeking zonder categorie nog wel bij een post zonder categorie', () => {
    const bijdrage = post('club', -12000, 1)
    const betaald: Transactie = { id: 'b', datum: '2026-07-02', omschrijving: 'Club', bedrag: -12000, rekeningId: 'r' }
    expect(maandVooruitblik([betaald], [bijdrage], '2026-07', EERSTE_JULI).aantalKomend).toBe(0)
  })

  it('geboekteVasteLasten geeft hetzelfde antwoord als de vooruitblik', () => {
    // De Plan-pagina en het belletje moeten het altijd eens zijn. Waren ze dat
    // niet, dan zei de ene "geboekt" en zette de andere er "Boek in" naast — één
    // klik en je huur stond twee keer in je maand.
    const huurPost = post('huur', -90000, 1, { categorieId: 'c-wonen' })
    const handmatig: Transactie = {
      id: 'eigen',
      datum: '2026-07-02',
      omschrijving: 'Huur juli',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'c-wonen',
    }
    const ids = geboekteVasteLasten([handmatig], [huurPost], '2026-07')
    expect(ids.has('huur')).toBe(true)
    expect(maandVooruitblik([handmatig], [huurPost], '2026-07', EERSTE_JULI).aantalKomend).toBe(0)
  })

  it('laat één boeking hoogstens één post afdekken', () => {
    const a = post('a', -2000)
    const b = post('b', -2000)
    const eenmalig: Transactie = { id: 'e', datum: '2026-07-02', omschrijving: 'Abo', bedrag: -2000, rekeningId: 'r' }
    expect(geboekteVasteLasten([eenmalig], [a, b], '2026-07').size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Ronde 35 — de controle die "Boek in" gebruikt vóór hij iets aanmaakt.
//
// Die deed eerst een eigen, veel ruwere zoekactie: "staat er in deze maand een
// boeking van hetzelfde bedrag op dezelfde rekening?". Dat blokkeerde je tweede
// abonnement van € 9,99 zodra het eerste geboekt was — en dan was dat tweede
// abonnement die maand met geen enkele knop meer in te boeken.
// ---------------------------------------------------------------------------

describe('geboekteVasteLastenMet — welke boeking dekt welke post af', () => {
  it('wijst de boeking aan die de post afdekt', () => {
    const huur = post('huur', -95000)
    const geboekt: Transactie = {
      id: vasteLastTransactieId('huur', '2026-07'),
      datum: '2026-07-01',
      omschrijving: 'huur',
      bedrag: -95000,
      rekeningId: 'r',
    }
    const kaart = geboekteVasteLastenMet([geboekt], [huur], '2026-07')
    expect(kaart.get('huur')?.id).toBe(geboekt.id)
  })

  it('blokkeert het tweede abonnement van hetzelfde bedrag NIET', () => {
    // Netflix en Spotify staan allebei op € 9,99, op dezelfde rekening.
    const netflix = post('netflix', -999)
    const spotify = post('spotify', -999)
    const netflixGeboekt: Transactie = {
      id: vasteLastTransactieId('netflix', '2026-07'),
      datum: '2026-07-01',
      omschrijving: 'netflix',
      bedrag: -999,
      rekeningId: 'r',
    }

    // Netflix is geboekt, Spotify niet. Zou Spotify hier wél als geboekt gelden,
    // dan weigerde "Boek in" hem met een melding die niet klopt, en stond hij die
    // maand vast — met geen enkele knop nog in te boeken.
    const kaart = geboekteVasteLastenMet([netflixGeboekt], [netflix, spotify], '2026-07')
    expect(kaart.has('netflix')).toBe(true)
    expect(kaart.has('spotify')).toBe(false)
  })

  it('herkent wél een handmatig ingetikte boeking van dezelfde post', () => {
    const huur = post('huur', -95000)
    const handmatig: Transactie = {
      id: 'zelf-getikt',
      datum: '2026-07-04',
      omschrijving: 'Huur juli',
      bedrag: -95000,
      rekeningId: 'r',
    }
    expect(geboekteVasteLastenMet([handmatig], [huur], '2026-07').get('huur')?.id).toBe('zelf-getikt')
  })

  it('geeft precies dezelfde posten terug als geboekteVasteLasten', () => {
    const a = post('a', -2000)
    const b = post('b', -2000)
    const eenmalig: Transactie = { id: 'e', datum: '2026-07-02', omschrijving: 'Abo', bedrag: -2000, rekeningId: 'r' }
    expect([...geboekteVasteLastenMet([eenmalig], [a, b], '2026-07').keys()]).toEqual([
      ...geboekteVasteLasten([eenmalig], [a, b], '2026-07'),
    ])
  })
})


// ---------------------------------------------------------------------------
// Ronde 35 — de controle die "Boek in" zélf doet vóór hij iets aanmaakt.
//
// Die is bewust strenger dan de toewijzing hierboven. Een post die ten onrechte
// blijft staan is een ergernis; een post die dubbel geboekt wordt is een bedrag dat
// stil van je overzicht af wijkt.
// ---------------------------------------------------------------------------

describe('boekingDieDezePostAfdekt', () => {
  const netflix = post('netflix', -999)
  const spotify = post('spotify', -999)

  it('ziet de eigen boeking van de knop "Boek in"', () => {
    const geboekt: Transactie = {
      id: vasteLastTransactieId('netflix', '2026-07'),
      datum: '2026-07-01',
      omschrijving: 'netflix',
      bedrag: -999,
      rekeningId: 'r',
    }
    expect(boekingDieDezePostAfdekt([geboekt], [netflix, spotify], netflix, '2026-07')?.id).toBe(geboekt.id)
  })

  it('houdt de boeking van een ánder abonnement van hetzelfde bedrag erbuiten', () => {
    // Netflix is via de knop geboekt. Spotify staat op hetzelfde bedrag en moet
    // gewoon nog te boeken zijn — anders zit hij die maand vast.
    const geboekt: Transactie = {
      id: vasteLastTransactieId('netflix', '2026-07'),
      datum: '2026-07-01',
      omschrijving: 'netflix',
      bedrag: -999,
      rekeningId: 'r',
    }
    expect(boekingDieDezePostAfdekt([geboekt], [netflix, spotify], spotify, '2026-07')).toBeUndefined()
  })

  it('blokkeert wél op een handmatig ingetikte betaling van hetzelfde bedrag', () => {
    // Dit is het geval dat de toewijzing NIET afdekt: die geeft de boeking aan de
    // eerste post die past, en dan zou "Boek in" voor de andere post gewoon een
    // tweede transactie bijmaken — € 19,98 in je maand terwijl er € 9,99 wegging.
    const zelfGetikt: Transactie = {
      id: 'zelf',
      datum: '2026-07-03',
      omschrijving: 'Netflix',
      bedrag: -999,
      rekeningId: 'r',
    }
    expect(boekingDieDezePostAfdekt([zelfGetikt], [spotify, netflix], netflix, '2026-07')?.id).toBe('zelf')
    expect(boekingDieDezePostAfdekt([zelfGetikt], [spotify, netflix], spotify, '2026-07')?.id).toBe('zelf')
  })

  it('geeft niets terug wanneer er echt nog niets staat', () => {
    expect(boekingDieDezePostAfdekt([], [netflix], netflix, '2026-07')).toBeUndefined()
  })

  // Dit is het geval waarvóór dit vangnet geschreven is, en precies het geval dat
  // de strenge herkenning NIET ziet: de post staat zonder categorie, jij tikt de
  // betaling in mét categorie. Zou de app hier niets zien, dan maakte één klik op
  // "Boek in" een tweede boeking van € 900 — € 1.800 in je maand terwijl er € 900
  // van je rekening ging, zonder één signaal.
  const huurZonderCategorie = post('huur', -90000)
  const huurMetCategorie = post('huur2', -90000, 1, { categorieId: 'ov-wonen' })

  it('ziet de betaling ook wanneer de categorieën verschillen', () => {
    const zelfGetikt: Transactie = {
      id: 'zelf',
      datum: '2026-07-04',
      omschrijving: 'Huur juli',
      bedrag: -90000,
      rekeningId: 'r',
      categorieId: 'ov-wonen',
    }
    // post zonder categorie, betaling mét
    expect(boekingDieDezePostAfdekt([zelfGetikt], [huurZonderCategorie], huurZonderCategorie, '2026-07')?.id).toBe(
      'zelf',
    )
    // post mét categorie, betaling zonder
    const zonder: Transactie = { ...zelfGetikt, categorieId: undefined }
    expect(boekingDieDezePostAfdekt([zonder], [huurMetCategorie], huurMetCategorie, '2026-07')?.id).toBe('zelf')
    // allebei een categorie, maar verschillende
    const andere: Transactie = { ...zelfGetikt, categorieId: 'ov-vervoer' }
    expect(boekingDieDezePostAfdekt([andere], [huurMetCategorie], huurMetCategorie, '2026-07')?.id).toBe('zelf')
  })

  it('kijkt niet naar een gesplitst kassaticket van hetzelfde bedrag', () => {
    // Een winkelbezoek met item-regels is per definitie geen vaste last; dat mag je
    // huur niet blokkeren.
    const ticket: Transactie = {
      id: 'ticket',
      datum: '2026-07-04',
      omschrijving: 'Colruyt',
      bedrag: -90000,
      rekeningId: 'r',
      regels: [{ bedrag: -50000 }, { bedrag: -40000 }],
    }
    expect(boekingDieDezePostAfdekt([ticket], [huurZonderCategorie], huurZonderCategorie, '2026-07')).toBeUndefined()
  })

  it('kijkt niet naar een andere rekening of een andere maand', () => {
    const anders: Transactie = {
      id: 'x',
      datum: '2026-07-04',
      omschrijving: 'Huur',
      bedrag: -90000,
      rekeningId: 'r2',
    }
    expect(boekingDieDezePostAfdekt([anders], [huurZonderCategorie], huurZonderCategorie, '2026-07')).toBeUndefined()
    const vorigeMaand: Transactie = { ...anders, id: 'y', rekeningId: 'r', datum: '2026-06-04' }
    expect(boekingDieDezePostAfdekt([vorigeMaand], [huurZonderCategorie], huurZonderCategorie, '2026-07')).toBeUndefined()
  })
})

describe('maandVooruitblik — een gestopte post (ronde 38)', () => {
  it('laat een gestopte post volledig uit de vooruitblik', () => {
    const gestopt = post('weg', -50_00, 5, { eindMaand: '2026-07' })
    const blik = maandVooruitblik([], [gestopt], '2026-07', EERSTE_JULI)
    expect(blik.achterstalligeIds).not.toContain('weg')
    expect(blik.aantalKomend).toBe(0)
    expect(blik.aantalAchterstallig).toBe(0)
    expect(blik.verwachteUitgaven).toBe(0)
  })

  it('telt hem in de maand vóór de eindmaand nog gewoon mee', () => {
    const stoptStraks = post('nog', -50_00, 5, { eindMaand: '2026-08' })
    expect(maandVooruitblik([], [stoptStraks], '2026-07', EERSTE_JULI).verwachteUitgaven).toBe(50_00)
  })
})

// --- Ronde 40 -----------------------------------------------------------------
//
// De regel "3 vaste lasten nog in te boeken deze maand" kon nergens heen: er was
// alleen een aantal, geen lijst met id's. Dit is de spiegel van `achterstalligeIds`.

describe('vooruitblik — komendeIds', () => {
  const post = (over: Partial<TerugkerendePost> & { id: string; dag: number; bedrag: number }): TerugkerendePost => ({
    omschrijving: over.id,
    rekeningId: 'r1',
    ...over,
  })

  it('somt de posten op die deze maand nog moeten komen', () => {
    // Vandaag is de 10e: dag 20 moet nog komen, dag 3 is achterstallig.
    const vb = maandVooruitblik([], [post({ id: 'later', dag: 20, bedrag: -1000 }), post({ id: 'te-laat', dag: 3, bedrag: -2000 })], '2026-07', '2026-07-10')
    expect(vb.komendeIds).toEqual(['later'])
    expect(vb.achterstalligeIds).toEqual(['te-laat'])
    expect(vb.aantalKomend).toBe(1)
  })

  it('laat een al geboekte post weg uit beide lijsten', () => {
    const p = post({ id: 'p1', dag: 20, bedrag: -1000 })
    const geboekt = {
      id: vasteLastTransactieId('p1', '2026-07'),
      datum: '2026-07-20',
      omschrijving: 'p1',
      bedrag: -1000,
      rekeningId: 'r1',
    }
    const vb = maandVooruitblik([geboekt], [p], '2026-07', '2026-07-10')
    expect(vb.komendeIds).toEqual([])
    expect(vb.achterstalligeIds).toEqual([])
  })

  it('zet in een maand die al voorbij is alles bij achterstallig en niets bij komend', () => {
    const vb = maandVooruitblik([], [post({ id: 'p1', dag: 20, bedrag: -1000 })], '2026-05', '2026-07-10')
    expect(vb.komendeIds).toEqual([])
    expect(vb.achterstalligeIds).toEqual(['p1'])
  })

  it('houdt de lijst en de teller gelijk', () => {
    const posten = [
      post({ id: 'a', dag: 20, bedrag: -1000 }),
      post({ id: 'b', dag: 25, bedrag: -1000 }),
      post({ id: 'c', dag: 2, bedrag: -1000 }),
    ]
    const vb = maandVooruitblik([], posten, '2026-07', '2026-07-10')
    expect(vb.komendeIds.length).toBe(vb.aantalKomend)
    expect(vb.achterstalligeIds.length).toBe(vb.aantalAchterstallig)
  })
})
