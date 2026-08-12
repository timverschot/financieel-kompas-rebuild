import { describe, it, expect } from 'vitest'
import {
  bouwUitwisselBestand,
  leesUitwisselBestand,
  vergelijkMetDossier,
  naarEigenKost,
  metWijziging,
  metReactie,
  metIntrekking,
  zonderIntrekking,
  metKoppeling,
  uitwisselIdVan,
  reactieVervallen,
  rondPercentage,
  uitwisselBestandsnaam,
  MAX_BON,
  type UitwisselBestand,
} from './uitwisseling'
import type { Dossier, GedeeldeKost, Kind } from '../data/schema'
import { veiligeBestandsnaam } from './download'
import { isOpenKost } from './afrekening'

const NU = '2026-08-12T09:00:00.000Z'
const LEEG = new Set<string>()
const GEEN_DOSSIERNAAM = () => undefined

const dossier = (over: Partial<Dossier> = {}): Dossier => ({
  id: 'd1',
  naam: 'Kinderen',
  aandeelJij: 50,
  ...over,
})

const kost = (over: Partial<GedeeldeKost> = {}): GedeeldeKost => ({
  id: 'k1',
  dossierId: 'd1',
  omschrijving: 'Turnpak',
  bedrag: 4000,
  betaaldDoor: 'jij',
  datum: '2026-07-03',
  ...over,
})

// Kosten die in dossier 'da' horen (de exportkant van de heen-en-weer-tests).
const kostA = (over: Partial<GedeeldeKost> = {}): GedeeldeKost => kost({ dossierId: 'da', ...over })

const kinderen: Kind[] = [
  { id: 'kind-a', naam: 'Lena' },
  { id: 'kind-b', naam: 'Sam' },
]

function heenEnWeer(bestand: UitwisselBestand): UitwisselBestand {
  const gelezen = leesUitwisselBestand(JSON.stringify(bestand))
  if (!gelezen.ok) throw new Error(`bestand niet leesbaar: ${gelezen.fout}`)
  return gelezen.bestand
}

describe('bouwUitwisselBestand', () => {
  it('stuurt standaard alleen wat JIJ betaalde', () => {
    // Twee ouders die elk hun eigen uitgaven sturen, hebben samen het volledige
    // dossier en niets dubbel. Stuur je ook wat de ander betaalde, dan krijgt hij
    // zijn eigen kosten van jou terug.
    const { bestand } = bouwUitwisselBestand(
      dossier(),
      [kost({ id: 'k1' }), kost({ id: 'k2', betaaldDoor: 'partner', omschrijving: 'Schoolreis' })],
      kinderen,
      [],
      NU,
    )
    expect(bestand.kosten.map((k) => k.omschrijving)).toEqual(['Turnpak'])
  })

  it('stuurt de kosten van de partner mee wanneer je daarvoor kiest', () => {
    const { bestand } = bouwUitwisselBestand(
      dossier(),
      [kost({ id: 'k1' }), kost({ id: 'k2', betaaldDoor: 'partner' })],
      kinderen,
      [],
      NU,
      { ookVanPartner: true },
    )
    expect(bestand.kosten).toHaveLength(2)
    expect(bestand.kosten.map((k) => k.betaaldDoorAfzender)).toEqual([true, false])
  })

  it('laat afgerekende kosten thuis', () => {
    // Anders staat een periode die je al per overschrijving regelde opnieuw open
    // bij de andere ouder, en wordt er een tweede keer voor betaald.
    const { bestand } = bouwUitwisselBestand(
      dossier(),
      [kost({ id: 'k1', afgerekend: true }), kost({ id: 'k2' })],
      kinderen,
      [],
      NU,
    )
    expect(bestand.kosten.map((k) => k.id)).toEqual(['k2'])
  })

  it('schrijft het perspectief vanuit de afzender, niet als jij/partner', () => {
    const { bestand } = bouwUitwisselBestand(dossier(), [kost()], kinderen, [], NU)
    expect(bestand.kosten[0].betaaldDoorAfzender).toBe(true)
    expect(JSON.stringify(bestand)).not.toContain('"betaaldDoor"')
  })

  it('stuurt kindnamen, geen kind-ids', () => {
    // Gezinsleden krijgen in elke installatie een eigen willekeurige id.
    const { bestand } = bouwUitwisselBestand(
      dossier(),
      [kost({ kindIds: ['kind-a'] })],
      kinderen,
      [],
      NU,
    )
    expect(bestand.kosten[0].kinderen).toEqual(['Lena'])
    expect(JSON.stringify(bestand)).not.toContain('kind-a')
  })

  it('stuurt de id van een INGEBOUWDE categorie wel mee', () => {
    // Die is in elke installatie identiek; het label verschilt per taal.
    const { bestand } = bouwUitwisselBestand(
      dossier(),
      [kost({ categorieId: 'ov-voeding' })],
      kinderen,
      [],
      NU,
    )
    expect(bestand.kosten[0].categorieId).toBe('ov-voeding')
    expect(bestand.kosten[0].categorie).toBe('Voeding')
  })

  it('stuurt de id van een EIGEN categorie niet mee, wel haar naam', () => {
    const { bestand } = bouwUitwisselBestand(
      dossier(),
      [kost({ categorieId: 'eigen-uuid-123' })],
      kinderen,
      [{ id: 'eigen-uuid-123', naam: 'Turnclub' }],
      NU,
    )
    expect(bestand.kosten[0].categorieId).toBeUndefined()
    expect(bestand.kosten[0].categorie).toBe('Turnclub')
  })

  it('laat de eigen boekhouding thuis', () => {
    const { bestand } = bouwUitwisselBestand(
      dossier(),
      [kost({ transactieId: 'tx-geheim', bonnetje: 'data:image/jpeg;base64,AAA' })],
      kinderen,
      [],
      NU,
    )
    const json = JSON.stringify(bestand)
    expect(json).not.toContain('tx-geheim')
    expect(json).not.toContain('data:image')
  })

  it('stuurt bonnen mee wanneer je dat vraagt, maar niet de te grote', () => {
    const groot = 'data:image/jpeg;base64,' + 'A'.repeat(MAX_BON)
    const { bestand, bonnenOvergeslagen } = bouwUitwisselBestand(
      dossier(),
      [kost({ id: 'k1', bonnetje: 'data:image/jpeg;base64,AAA' }), kost({ id: 'k2', bonnetje: groot })],
      kinderen,
      [],
      NU,
      { metBonnen: true },
    )
    expect(bestand.kosten[0].bon).toBe('data:image/jpeg;base64,AAA')
    expect(bestand.kosten[1].bon).toBeUndefined()
    expect(bonnenOvergeslagen).toBe(1)
  })

  it('draagt het effectieve percentage, niet de dossier-standaard', () => {
    const { bestand } = bouwUitwisselBestand(
      dossier({ aandeelJij: 50 }),
      [kost({ aandeelJijOverride: 70 })],
      kinderen,
      [],
      NU,
    )
    expect(bestand.kosten[0].aandeelAfzender).toBe(70)
  })
})

describe('identiteit over meerdere heen-en-weers', () => {
  it('houdt dezelfde identiteit vast bij A -> B -> A -> B', () => {
    // Dit is de kern van het hele ontwerp. Zonder deze regel komt een kost die A
    // ooit van B kreeg bij B terug als nieuwe kost — elke ronde opnieuw.
    const A = dossier({ id: 'da', naam: 'Kinderen' })
    const B = dossier({ id: 'db', naam: 'Kinderen' })

    // Ronde 1: A stuurt zijn kost naar B.
    const eigenA = kostA({ id: 'a-1' })
    const b1 = heenEnWeer(bouwUitwisselBestand(A, [eigenA], [], [], NU).bestand)
    expect(b1.kosten[0].id).toBe('a-1')
    const bijB = naarEigenKost(b1.kosten[0], 'db', [], 'b-lokaal-1')
    expect(bijB.id).toBe('b-lokaal-1')
    expect(bijB.uitwisselId).toBe('a-1')
    expect(bijB.betaaldDoor).toBe('partner')

    // Ronde 2: B stuurt terug. Zijn kopie draagt nog altijd de identiteit 'a-1',
    // dus A herkent hem als de zijne en leest hem niet opnieuw in.
    const b2 = heenEnWeer(bouwUitwisselBestand(B, [bijB], [], [], NU, { ookVanPartner: true }).bestand)
    expect(b2.kosten[0].id).toBe('a-1')
    const overzichtA = vergelijkMetDossier(b2, A, [eigenA], LEEG, GEEN_DOSSIERNAAM)
    expect(overzichtA.vergelijkingen[0].oordeel).toBe('ongewijzigd')

    // Ronde 3: A stuurt nog eens. B herkent zijn eigen kopie.
    const b3 = heenEnWeer(bouwUitwisselBestand(A, [kostA({ id: 'a-1' })], [], [], NU).bestand)
    const overzichtB = vergelijkMetDossier(b3, B, [bijB], LEEG, GEEN_DOSSIERNAAM)
    expect(overzichtB.vergelijkingen[0].oordeel).toBe('ongewijzigd')
  })

  it('verdubbelt niets wanneer je hetzelfde bestand twee keer inleest', () => {
    const A = dossier({ id: 'da' })
    const B = dossier({ id: 'db' })
    const bestand = heenEnWeer(bouwUitwisselBestand(A, [kostA({ id: 'a-1' })], [], [], NU).bestand)

    const eerste = vergelijkMetDossier(bestand, B, [], LEEG, GEEN_DOSSIERNAAM)
    expect(eerste.vergelijkingen[0].oordeel).toBe('nieuw')
    const ingelezen = naarEigenKost(bestand.kosten[0], 'db', [], 'b-1')

    const tweede = vergelijkMetDossier(bestand, B, [ingelezen], LEEG, GEEN_DOSSIERNAAM)
    expect(tweede.vergelijkingen[0].oordeel).toBe('ongewijzigd')
  })

  it('overleeft een bewerking van de ingelezen kost', () => {
    // De identiteit zit op de kost. Wist een bewerking hem, dan komt dezelfde
    // kost bij de volgende uitwisseling een tweede keer binnen.
    const ingelezen = naarEigenKost(
      { id: 'a-1', omschrijving: 'Turnpak', bedrag: 4000, datum: '2026-07-03', betaaldDoorAfzender: true, aandeelAfzender: 50 },
      'db',
      [],
      'b-1',
    )
    const bewerkt: GedeeldeKost = { ...ingelezen, omschrijving: 'Turnpak Lena' }
    expect(uitwisselIdVan(bewerkt)).toBe('a-1')
  })
})

describe('vergelijkMetDossier', () => {
  const A = dossier({ id: 'da' })
  const B = dossier({ id: 'db' })
  const bestandVan = (kosten: GedeeldeKost[], keuze = {}) =>
    heenEnWeer(bouwUitwisselBestand(A, kosten, [], [], NU, keuze).bestand)

  it('meldt een gewijzigd bedrag in plaats van het stil over te slaan', () => {
    // A boekte € 40, stuurde door, en merkte dan dat het € 400 was. Sloeg de
    // import dat over als "al gekend", dan verschillen de twee dossiers € 360.
    const bestand = bestandVan([kostA({ id: 'a-1', bedrag: 40000 })])
    const bijB = naarEigenKost({ ...bestand.kosten[0], bedrag: 4000 }, 'db', [], 'b-1')
    const overzicht = vergelijkMetDossier(bestand, B, [bijB], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.vergelijkingen[0].oordeel).toBe('gewijzigd')
    expect(overzicht.vergelijkingen[0].eigen?.bedrag).toBe(4000)
  })

  it('herkent een vermoedelijke dubbel op datum en bedrag', () => {
    // Beide ouders boekten dezelfde kost zelf in. Zonder deze controle staat ze
    // twee keer in het dossier en is het saldo dubbel zo groot.
    const bestand = bestandVan([kostA({ id: 'a-1', bedrag: 4000, datum: '2026-07-03' })])
    const eigenGeboekt = kost({ id: 'b-eigen', dossierId: 'db', bedrag: 4000, datum: '2026-07-03', betaaldDoor: 'partner' })
    const overzicht = vergelijkMetDossier(bestand, B, [eigenGeboekt], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.vergelijkingen[0].oordeel).toBe('dubbel')
    expect(overzicht.vergelijkingen[0].eigen?.id).toBe('b-eigen')
  })

  it('raakt een kost niet aan die al in een afrekening vastzit', () => {
    const bestand = bestandVan([kostA({ id: 'a-1', bedrag: 9999 })])
    const bijB = naarEigenKost({ ...bestand.kosten[0], bedrag: 4000 }, 'db', [], 'b-1')
    const overzicht = vergelijkMetDossier(bestand, B, [bijB], new Set(['b-1']), GEEN_DOSSIERNAAM)
    expect(overzicht.vergelijkingen[0].oordeel).toBe('vast')
  })

  it('zegt het wanneer dezelfde kost in een ANDER dossier staat', () => {
    // Anders lees je bij een vergissing hetzelfde bestand in twee dossiers in en
    // telt het geld twee keer.
    const bestand = bestandVan([kostA({ id: 'a-1' })])
    const elders = naarEigenKost(bestand.kosten[0], 'ander-dossier', [], 'b-1')
    const overzicht = vergelijkMetDossier(bestand, B, [elders], LEEG, (id) => (id === 'ander-dossier' ? 'Auto' : undefined))
    expect(overzicht.vergelijkingen[0].anderDossier).toBe('Auto')
  })

  it('meldt het wanneer de verdeelsleutel van de ander afwijkt van jouw dossier', () => {
    // 60/40 bij A tegenover 50/50 bij B: dat moet je zien, niet stil overnemen.
    const bestand = heenEnWeer(
      bouwUitwisselBestand(dossier({ id: 'da', aandeelJij: 60 }), [kostA({ id: 'a-1' })], [], [], NU).bestand,
    )
    const overzicht = vergelijkMetDossier(bestand, dossier({ id: 'db', aandeelJij: 50 }), [], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.vergelijkingen[0].aandeelJij).toBe(40)
    expect(overzicht.vergelijkingen[0].anderePctDanDossier).toBe(true)
  })

  it('zwijgt wanneer de verdeelsleutel wel overeenkomt', () => {
    const bestand = bestandVan([kostA({ id: 'a-1' })])
    const overzicht = vergelijkMetDossier(bestand, dossier({ id: 'db', aandeelJij: 50 }), [], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.vergelijkingen[0].anderePctDanDossier).toBe(false)
  })

  it('legt de twee saldo-uitkomsten naast elkaar in plaats van er stil één te kiezen', () => {
    // Eén kost van € 25,01 fiftyfifty: beide kanten ronden hun eigen aandeel af en
    // komen één cent uit elkaar. Dat mag geen twee documenten opleveren die
    // elkaar zwijgend tegenspreken.
    const bestand = bestandVan([kostA({ id: 'a-1', bedrag: 2501 })])
    const overzicht = vergelijkMetDossier(bestand, B, [], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.saldoAfzender).toBe(-1250)
    expect(overzicht.saldoJij).toBe(-1251)
    expect(Math.abs(overzicht.saldoJij - overzicht.saldoAfzender!)).toBe(1)
  })

  it('komt op hetzelfde saldo uit wanneer er niets af te ronden valt', () => {
    const bestand = bestandVan([kostA({ id: 'a-1', bedrag: 4000 })])
    const overzicht = vergelijkMetDossier(bestand, B, [], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.saldoJij).toBe(overzicht.saldoAfzender)
    expect(overzicht.saldoJij).toBe(-2000)
  })
})

describe('reacties', () => {
  const A = dossier({ id: 'da' })
  const B = dossier({ id: 'db' })

  it('brengt de reactie van de ander terug bij de juiste eigen kost', () => {
    const eigen = kost({ id: 'a-1', dossierId: 'da' })
    const heen = heenEnWeer(bouwUitwisselBestand(A, [eigen], [], [], NU).bestand)
    const bijB = metReactie(naarEigenKost(heen.kosten[0], 'db', [], 'b-1'), {
      uitwisselId: 'a-1',
      soort: 'betwist',
      op: '2026-08-12',
      reden: 'Dit betaalde ik zelf',
    })
    const terug = heenEnWeer(bouwUitwisselBestand(B, [bijB], [], [], NU, { ookVanPartner: true }).bestand)

    const overzicht = vergelijkMetDossier(terug, A, [eigen], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.reacties).toHaveLength(1)
    expect(overzicht.reacties[0].reactie.soort).toBe('betwist')
    expect(overzicht.reacties[0].reactie.reden).toBe('Dit betaalde ik zelf')
    expect(overzicht.reacties[0].eigen.id).toBe('a-1')
  })

  it('telt een reactie op een kost die je niet (meer) hebt apart', () => {
    const terug: UitwisselBestand = {
      app: 'financieel-kompas',
      soort: 'uitwisseling',
      versie: 1,
      gemaaktOp: NU,
      dossierNaam: 'Kinderen',
      kosten: [],
      reacties: [{ uitwisselId: 'bestaat-niet', soort: 'akkoord', op: '2026-08-12' }],
    }
    const overzicht = vergelijkMetDossier(heenEnWeer(terug), A, [], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.reacties).toHaveLength(0)
    expect(overzicht.reactiesZonderKost).toBe(1)
  })

  it('laat een akkoord vervallen zodra het bedrag nadien wijzigt', () => {
    // Een akkoord over € 40 is geen akkoord over € 400. Zonder deze controle
    // staat er in de bewijsmap dat de andere ouder akkoord ging met een bedrag
    // dat hij nooit gezien heeft.
    const met = metReactie(kost({ bedrag: 4000 }), { uitwisselId: 'a-1', soort: 'akkoord', op: '2026-08-12' })
    expect(reactieVervallen(met)).toBe(false)
    expect(reactieVervallen({ ...met, bedrag: 40000 })).toBe(true)
    expect(reactieVervallen({ ...met, datum: '2026-09-01' })).toBe(true)
  })

  it('gooit een reactie weg zodra je de wijziging van de ander overneemt', () => {
    const met = metReactie(kost({ bedrag: 4000 }), { uitwisselId: 'a-1', soort: 'akkoord', op: '2026-08-12' })
    const bijgewerkt = metWijziging(met, {
      id: 'a-1',
      omschrijving: 'Turnpak',
      bedrag: 40000,
      datum: '2026-07-03',
      betaaldDoorAfzender: true,
      aandeelAfzender: 50,
    })
    expect(bijgewerkt.reactie).toBeUndefined()
    expect(bijgewerkt.bedrag).toBe(40000)
  })

  it('houdt de eigen velden vast bij het overnemen van een wijziging', () => {
    const met = kost({ bedrag: 4000, kindIds: ['kind-a'], bonnetje: 'data:image/jpeg;base64,AAA' })
    const bijgewerkt = metWijziging(met, {
      id: 'a-1',
      omschrijving: 'Turnpak',
      bedrag: 40000,
      datum: '2026-07-03',
      betaaldDoorAfzender: true,
      aandeelAfzender: 50,
    })
    expect(bijgewerkt.kindIds).toEqual(['kind-a'])
    expect(bijgewerkt.bonnetje).toBe('data:image/jpeg;base64,AAA')
  })
})

describe('intrekken', () => {
  it('laat een intrekking meereizen in plaats van de kost stil te laten verdwijnen', () => {
    // Afwezigheid in een bestand kan nooit "verwijderd" betekenen: een bestand is
    // altijd een selectie.
    const A = dossier({ id: 'da' })
    const B = dossier({ id: 'db' })
    const ingetrokken = metIntrekking(kost({ id: 'a-1', dossierId: 'da' }))
    const bestand = heenEnWeer(bouwUitwisselBestand(A, [ingetrokken], [], [], NU).bestand)
    expect(bestand.ingetrokken).toEqual(['a-1'])

    const bijB = naarEigenKost(
      { id: 'a-1', omschrijving: 'Turnpak', bedrag: 4000, datum: '2026-07-03', betaaldDoorAfzender: true, aandeelAfzender: 50 },
      'db',
      [],
      'b-1',
    )
    const overzicht = vergelijkMetDossier(bestand, B, [bijB], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.ingetrokken.map((k) => k.id)).toEqual(['b-1'])
  })

  it('stuurt een ingetrokken kost niet als gewone kost mee', () => {
    const { bestand } = bouwUitwisselBestand(dossier(), [metIntrekking(kost({ id: 'a-1' }))], [], [], NU)
    expect(bestand.kosten).toHaveLength(0)
  })
})

describe('naarEigenKost', () => {
  const basis = {
    id: 'a-1',
    omschrijving: 'Turnpak',
    bedrag: 4000,
    datum: '2026-07-03',
    betaaldDoorAfzender: true,
    aandeelAfzender: 40,
  }

  it('keert het perspectief om en pint het aandeel vast', () => {
    const k = naarEigenKost(basis, 'db', [], 'b-1')
    expect(k.betaaldDoor).toBe('partner')
    expect(k.aandeelJijOverride).toBe(60)
  })

  it('koppelt een kind op naam, hoofdletters en spaties niet meegerekend', () => {
    const k = naarEigenKost({ ...basis, kinderen: [' lena '] }, 'db', kinderen, 'b-1')
    expect(k.kindIds).toEqual(['kind-a'])
  })

  it('maakt geen nieuwe gezinsleden aan voor een naam die je niet kent', () => {
    // De gezinsledenlijst geldt over alle dossiers heen; die vervuil je niet met
    // namen uit het huishouden van de andere ouder.
    const k = naarEigenKost({ ...basis, kinderen: ['Onbekend Kind'] }, 'db', kinderen, 'b-1')
    expect(k.kindIds).toBeUndefined()
  })

  it('krijgt altijd een NIEUWE eigen id, nooit die van de afzender', () => {
    // Met de id van de afzender zou de import via het append-only logboek stil
    // een eigen kost kunnen overschrijven.
    const k = naarEigenKost(basis, 'db', [], 'b-1')
    expect(k.id).toBe('b-1')
    expect(k.uitwisselId).toBe('a-1')
  })
})

describe('leesUitwisselBestand', () => {
  const geldig = () =>
    bouwUitwisselBestand(dossier(), [kost({ id: 'a-1' })], [], [], NU).bestand

  it('weigert wat geen json is', () => {
    expect(leesUitwisselBestand('dit is geen json')).toEqual({ ok: false, fout: 'geen-json' })
  })

  it('weigert een ander soort bestand', () => {
    const backup = JSON.stringify({ app: 'financieel-kompas', soort: 'backup', versie: 1, gemaaktOp: NU, events: [] })
    expect(leesUitwisselBestand(backup)).toEqual({ ok: false, fout: 'geen-uitwisseling' })
  })

  it('weigert een bestand van een nieuwere versie in plaats van het half te lezen', () => {
    const nieuwer = JSON.stringify({ ...geldig(), versie: 99 })
    expect(leesUitwisselBestand(nieuwer)).toEqual({ ok: false, fout: 'nieuwere-versie' })
  })

  it('slaat een rotte regel over en telt hem, in plaats van het hele bestand te weigeren', () => {
    const met = { ...geldig(), kosten: [...geldig().kosten, { id: 'stuk', bedrag: -5 }] }
    const uit = leesUitwisselBestand(JSON.stringify(met))
    expect(uit.ok).toBe(true)
    if (!uit.ok) return
    expect(uit.bestand.kosten).toHaveLength(1)
    expect(uit.overgeslagen).toBe(1)
  })

  it('weigert een bedrag dat geen positief geheel getal is', () => {
    for (const bedrag of [0, -100, 12.5, Number.NaN]) {
      const met = { ...geldig(), kosten: [{ ...geldig().kosten[0], bedrag }] }
      const uit = leesUitwisselBestand(JSON.stringify(met))
      expect(uit.ok && uit.bestand.kosten).toHaveLength(0)
    }
  })

  it('weigert een percentage buiten 0-100', () => {
    const met = { ...geldig(), kosten: [{ ...geldig().kosten[0], aandeelAfzender: 140 }] }
    const uit = leesUitwisselBestand(JSON.stringify(met))
    expect(uit.ok && uit.bestand.kosten).toHaveLength(0)
  })

  it('laat twee kosten met dezelfde identiteit niet allebei binnen', () => {
    const met = { ...geldig(), kosten: [geldig().kosten[0], geldig().kosten[0]] }
    const uit = leesUitwisselBestand(JSON.stringify(met))
    expect(uit.ok).toBe(true)
    if (!uit.ok) return
    expect(uit.bestand.kosten).toHaveLength(1)
    expect(uit.overgeslagen).toBe(1)
  })

  it('weigert een bon die de bovengrens overschrijdt', () => {
    const met = {
      ...geldig(),
      kosten: [{ ...geldig().kosten[0], bon: 'A'.repeat(MAX_BON + 1) }],
    }
    const uit = leesUitwisselBestand(JSON.stringify(met))
    expect(uit.ok && uit.bestand.kosten).toHaveLength(0)
  })

  it('weigert een bestand met absurd veel kosten', () => {
    const met = { ...geldig(), kosten: Array.from({ length: 2001 }, () => geldig().kosten[0]) }
    expect(leesUitwisselBestand(JSON.stringify(met))).toEqual({ ok: false, fout: 'te-groot' })
  })
})

describe('percentages', () => {
  it('overleeft een heen-en-weer met een niet-geheel percentage', () => {
    // 100 - (100 - 33.4) is in drijvende komma niet 33.4, en dan toont de
    // bewijsmap twee verdeelsleutel-regels voor één afspraak.
    const heen = rondPercentage(100 - 33.4)
    const terug = rondPercentage(100 - heen)
    expect(terug).toBe(33.4)
  })

  it('laat een geheel percentage geheel', () => {
    expect(rondPercentage(50)).toBe(50)
    expect(rondPercentage(100 - 60)).toBe(40)
  })
})

describe('uitwisselBestandsnaam', () => {
  it('zet de dossiernaam en de dag in de naam', () => {
    expect(uitwisselBestandsnaam('Kinderen', NU, veiligeBestandsnaam)).toBe(
      'kompas-uitwisseling-kinderen-2026-08-12.json',
    )
  })

  it('valt terug op een vaste naam wanneer er niets bruikbaars overblijft', () => {
    expect(uitwisselBestandsnaam('///', NU, veiligeBestandsnaam)).toBe(
      'kompas-uitwisseling-dossier-2026-08-12.json',
    )
  })
})

describe('wat de review na het bouwen ving', () => {
  const A = dossier({ id: 'da' })
  const B = dossier({ id: 'db' })

  it('stempelt een akkoord op het bedrag waarop het SLOEG, niet op het huidige', () => {
    // Je stuurt EUR 40 door, de ander gaat akkoord, jij corrigeert intussen naar
    // EUR 400, en dan pas lees je het antwoord in. Nam de app hier het huidige
    // bedrag over, dan zei de bewijsmap "aanvaard door de andere ouder" bij een
    // bedrag dat hij nooit gezien heeft.
    const eigen = kostA({ id: 'a-1', bedrag: 40000 })
    const met = metReactie(eigen, { uitwisselId: 'a-1', soort: 'akkoord', op: '2026-08-12', bedrag: 4000, datum: '2026-07-03' })
    expect(met.reactie?.bedrag).toBe(4000)
    expect(reactieVervallen(met)).toBe(true)
  })

  it('rekent het meegestuurde saldo met hetzelfde afgeronde percentage als de rijen', () => {
    // Bij een dossier op 33,333 % scheelde dat tien cent, en dan meldde de
    // ontvanger een inhoudelijk verschil dat er niet was.
    const derde = dossier({ id: 'da', aandeelJij: 33.333 })
    const bestand = heenEnWeer(
      bouwUitwisselBestand(derde, [kostA({ id: 'a-1', bedrag: 100000 }), kostA({ id: 'a-2', bedrag: 250000 })], [], [], NU)
        .bestand,
    )
    const overzicht = vergelijkMetDossier(bestand, B, [], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.saldoJij).toBe(overzicht.saldoAfzender)
  })

  it('laat een intrekking niet los op een kost die JIJ betaalde', () => {
    // Anders haalt een bestand met jouw eigen kost-id een kost van EUR 400 uit je
    // saldo, met alleen een telling op het scherm als waarschuwing.
    const eigen = kostA({ id: 'a-1', betaaldDoor: 'jij' })
    const bestand = heenEnWeer({
      app: 'financieel-kompas' as const,
      soort: 'uitwisseling' as const,
      versie: 1,
      gemaaktOp: NU,
      dossierNaam: 'Kinderen',
      kosten: [],
      ingetrokken: ['a-1'],
    })
    const overzicht = vergelijkMetDossier(bestand, A, [eigen], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.ingetrokken).toHaveLength(0)
  })

  it('laat een intrekking wel toe op een kost die van de ander kwam', () => {
    const vanHen = naarEigenKost(
      { id: 'a-1', omschrijving: 'Turnpak', bedrag: 4000, datum: '2026-07-03', betaaldDoorAfzender: true, aandeelAfzender: 50 },
      'db',
      [],
      'b-1',
    )
    const bestand = heenEnWeer({
      app: 'financieel-kompas' as const,
      soort: 'uitwisseling' as const,
      versie: 1,
      gemaaktOp: NU,
      dossierNaam: 'Kinderen',
      kosten: [],
      ingetrokken: ['a-1'],
    })
    const overzicht = vergelijkMetDossier(bestand, B, [vanHen], LEEG, GEEN_DOSSIERNAAM)
    expect(overzicht.ingetrokken.map((k) => k.id)).toEqual(['b-1'])
  })

  it('haalt een ingetrokken kost uit het saldo en zet ze er weer in', () => {
    const k = kostA({ id: 'a-1' })
    expect(isOpenKost(k)).toBe(true)
    expect(isOpenKost(metIntrekking(k))).toBe(false)
    expect(isOpenKost(zonderIntrekking(metIntrekking(k)))).toBe(true)
    expect('ingetrokken' in zonderIntrekking(metIntrekking(k))).toBe(false)
  })

  it('laat een gekoppelde dubbel niet elke ronde terugkomen', () => {
    // Zonder metKoppeling blijft dezelfde kost eeuwig als "dubbel" opduiken en is
    // er geen manier om te zeggen dat het om hetzelfde gaat.
    const bestand = heenEnWeer(bouwUitwisselBestand(A, [kostA({ id: 'a-1' })], [], [], NU).bestand)
    const eigenGeboekt = kost({ id: 'b-eigen', dossierId: 'db', betaaldDoor: 'partner' })
    expect(vergelijkMetDossier(bestand, B, [eigenGeboekt], LEEG, GEEN_DOSSIERNAAM).vergelijkingen[0].oordeel).toBe('dubbel')

    const gekoppeld = metKoppeling(eigenGeboekt, bestand.kosten[0])
    expect(vergelijkMetDossier(bestand, B, [gekoppeld], LEEG, GEEN_DOSSIERNAAM).vergelijkingen[0].oordeel).toBe(
      'ongewijzigd',
    )
  })

  it('geeft voorrang aan de kost in DIT dossier boven een kopie elders', () => {
    const bestand = heenEnWeer(bouwUitwisselBestand(A, [kostA({ id: 'a-1' })], [], [], NU).bestand)
    const hier = naarEigenKost(bestand.kosten[0], 'db', [], 'b-hier')
    const elders = naarEigenKost(bestand.kosten[0], 'ergens-anders', [], 'b-elders')
    const overzicht = vergelijkMetDossier(bestand, B, [elders, hier], LEEG, () => 'Auto')
    expect(overzicht.vergelijkingen[0].anderDossier).toBeUndefined()
    expect(overzicht.vergelijkingen[0].eigen?.id).toBe('b-hier')
  })

  it('stuurt geen antwoord meer mee over een kost die al afgerekend is', () => {
    // Anders blijft dat antwoord eeuwig meereizen en wordt het bij elke import
    // opnieuw op een afgesloten kost geschreven.
    const afgerekend = metReactie(kostA({ id: 'a-1', uitwisselId: 'x-1', afgerekend: true }), {
      uitwisselId: 'x-1',
      soort: 'akkoord',
      op: '2026-08-12',
    })
    const { bestand } = bouwUitwisselBestand(A, [afgerekend], [], [], NU)
    expect(bestand.reacties).toBeUndefined()
  })
})

