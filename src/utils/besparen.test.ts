import { describe, it, expect } from 'vitest'
import type { Transactie } from '../data/schema'
import { BESPARINGSDOMEINEN, domeinVanCategorie, uitgavenPerBesparingsdomein, vergelijkBesparingsdomeinen, naamVanBesparingsdomein } from './besparen'

// Echte id's uit de ingebouwde boom (data/categorieen/ingebouwd.ts). Ze staan
// hier bewust letterlijk: zou er ooit een id verdwijnen, dan faalt deze test —
// wat precies de bedoeling is.
const ITEM_BROOD = 'i-brood--wit-9238' // Voeding > Broodwaren
const HOOFD_VOEDING = 'ov-voeding'
const CAT_ENERGIE = 'cat-energie-en-nutsvoorzieningen'
const CAT_VERZEKERINGEN = 'cat-verzekeringen'

function tx(datum: string, bedrag: number, categorieId?: string): Transactie {
  return { id: `t-${datum}-${bedrag}-${categorieId ?? 'x'}`, datum, omschrijving: 'x', bedrag, rekeningId: 'r1', categorieId }
}

describe('domeinVanCategorie', () => {
  it('rolt een ingebouwd item op naar zijn domein', () => {
    expect(domeinVanCategorie(ITEM_BROOD)).toBe('boodschappen')
  })

  it('herkent een hoofdcategorie', () => {
    expect(domeinVanCategorie(HOOFD_VOEDING)).toBe('boodschappen')
  })

  it('herkent een mid-categorie die zelf een domein is', () => {
    expect(domeinVanCategorie(CAT_ENERGIE)).toBe('energie')
    expect(domeinVanCategorie(CAT_VERZEKERINGEN)).toBe('verzekeringen')
  })

  it('geeft null voor geen, onbekende of eigen categorieën', () => {
    expect(domeinVanCategorie(undefined)).toBeNull()
    expect(domeinVanCategorie('eigen-categorie-van-timothy')).toBeNull()
    expect(domeinVanCategorie('ov-huisdieren')).toBeNull()
  })
})

describe('uitgavenPerBesparingsdomein', () => {
  it('geeft altijd alle vier de domeinen terug, in vaste volgorde', () => {
    const uit = uitgavenPerBesparingsdomein([], {})
    expect(uit.map((d) => d.sleutel)).toEqual(['boodschappen', 'energie', 'telecom', 'verzekeringen'])
    expect(uit.every((d) => d.bedrag === 0)).toBe(true)
    expect(uit).toHaveLength(BESPARINGSDOMEINEN.length)
  })

  it('telt uitgaven op per domein', () => {
    const uit = uitgavenPerBesparingsdomein(
      [tx('2026-07-02', -5000, ITEM_BROOD), tx('2026-07-03', -12000, CAT_ENERGIE), tx('2026-07-04', -2500, HOOFD_VOEDING)],
      {},
    )
    const perSleutel = Object.fromEntries(uit.map((d) => [d.sleutel, d.bedrag]))
    expect(perSleutel.boodschappen).toBe(7500)
    expect(perSleutel.energie).toBe(12000)
    expect(perSleutel.telecom).toBe(0)
  })

  it('negeert inkomsten', () => {
    const uit = uitgavenPerBesparingsdomein([tx('2026-07-02', 5000, ITEM_BROOD)], {})
    expect(uit.find((d) => d.sleutel === 'boodschappen')!.bedrag).toBe(0)
  })

  it('houdt zich aan de periode', () => {
    const transacties = [tx('2026-06-30', -5000, ITEM_BROOD), tx('2026-07-02', -3000, ITEM_BROOD)]
    const uit = uitgavenPerBesparingsdomein(transacties, { van: '2026-07-01', tot: '2026-07-31' })
    expect(uit.find((d) => d.sleutel === 'boodschappen')!.bedrag).toBe(3000)
  })

  it('splitst een gesplitst kassaticket uit over de domeinen', () => {
    const ticket: Transactie = {
      id: 'ticket',
      datum: '2026-07-04',
      omschrijving: 'Colruyt',
      bedrag: -8000,
      rekeningId: 'r1',
      regels: [
        { bedrag: -6000, categorieId: ITEM_BROOD },
        { bedrag: -2000, categorieId: 'ov-huisdieren' },
      ],
    }
    const uit = uitgavenPerBesparingsdomein([ticket], {})
    // Alleen de € 60 broodregel hoort bij boodschappen — niet de hele € 80.
    expect(uit.find((d) => d.sleutel === 'boodschappen')!.bedrag).toBe(6000)
  })

  it('draagt voor elk domein een kleur mee, uit hetzelfde object als het bedrag', () => {
    const uit = uitgavenPerBesparingsdomein([], {})
    expect(uit.every((d) => /^#[0-9A-F]{6}$/i.test(d.kleur))).toBe(true)
  })
})

// Ronde 31: een bedrag alleen zegt niets. Pas een vergelijking met de vorige even
// lange periode maakt er informatie van waar je iets mee kan.
describe('vergelijkBesparingsdomeinen', () => {
  const juli = { van: '2026-07-01', tot: '2026-07-31' }
  const juni = { van: '2026-06-01', tot: '2026-06-30' }
  const energie = (datum: string, centen: number): Transactie => ({
    id: `e-${datum}`,
    datum,
    omschrijving: 'x',
    bedrag: -centen,
    rekeningId: 'r1',
    categorieId: 'cat-energie-en-nutsvoorzieningen',
  })

  function domein(uit: ReturnType<typeof vergelijkBesparingsdomeinen>, sleutel: string) {
    return uit.find((d) => d.sleutel === sleutel)!
  }

  it('rekent het verschil en het percentage uit', () => {
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 12000), energie('2026-06-03', 8000)], juli, juni)
    const e = domein(uit, 'energie')
    expect(e.bedrag).toBe(12000)
    expect(e.vorig).toBe(8000)
    expect(e.verschil).toBe(4000)
    expect(e.procent).toBe(50)
  })

  it('meldt een daling met een negatief verschil', () => {
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 6000), energie('2026-06-03', 8000)], juli, juni)
    expect(domein(uit, 'energie').verschil).toBe(-2000)
    expect(domein(uit, 'energie').procent).toBe(-25)
  })

  it('zwijgt over het percentage wanneer je in dit domein vorige periode niets uitgaf', () => {
    // "Oneindig procent meer" is geen bruikbaar getal; dan tonen we enkel het bedrag.
    //
    // ⚠ Juni moet wél een echte maand zijn: er staat een boodschappenboeking in. Zonder die
    // ene boeking is juni een maand waarin de app nog niet bestond, en dan hoort er
    // helemaal geen vergelijking te staan — zie de test hieronder.
    const uit = vergelijkBesparingsdomeinen(
      [energie('2026-07-03', 6000), tx('2026-06-05', -4000, ITEM_BROOD)],
      juli,
      juni,
    )
    expect(domein(uit, 'energie').verschil).toBe(6000)
    expect(domein(uit, 'energie').procent).toBeNull()
  })

  it('vergelijkt niet met een periode waarin je helemaal niets boekte (ronde 106)', () => {
    // ⚠ RONDE 106. Bij je allereerste boeking ooit stond er "Sterkst gestegen: Energie,
    // € 60,00 meer" met een rood ▲ en een jaarprojectie — tegenover een maand waarin de app
    // nog niet bestond. Het kalenderbereik van juni bestaat altijd; je gegevens niet.
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 6000)], juli, juni)
    expect(domein(uit, 'energie').vorig).toBeNull()
    expect(domein(uit, 'energie').verschil).toBeNull()
    expect(domein(uit, 'energie').procent).toBeNull()
    // En de lege domeinen zeggen dan niet "Even veel als de vorige periode".
    expect(domein(uit, 'telecom').verschil).toBeNull()
  })

  it('geeft geen vergelijking wanneer er geen vorige periode is', () => {
    const uit = vergelijkBesparingsdomeinen([energie('2026-07-03', 6000)], juli, null)
    expect(domein(uit, 'energie').bedrag).toBe(6000)
    expect(domein(uit, 'energie').vorig).toBeNull()
    expect(domein(uit, 'energie').verschil).toBeNull()
  })

  it('houdt de vaste volgorde van de vier domeinen aan', () => {
    const uit = vergelijkBesparingsdomeinen([], juli, juni)
    expect(uit.map((d) => d.sleutel)).toEqual(['boodschappen', 'energie', 'telecom', 'verzekeringen'])
  })
})

// --- Ronde 40: het domeinfilter in de transactielijst heeft een naam nodig -----

describe('naamVanBesparingsdomein', () => {
  it('geeft de naam van een bestaand domein', () => {
    expect(naamVanBesparingsdomein('boodschappen')).toBe('Boodschappen')
    expect(naamVanBesparingsdomein('energie')).toBe('Energie')
  })

  it('geeft null bij een onbekende sleutel, zodat de aanroeper zelf kan terugvallen', () => {
    expect(naamVanBesparingsdomein('bestaat-niet')).toBeNull()
  })

  it('haalt de naam uit dezelfde tabel als de rekenkern', () => {
    // Eén bron: zo kan de chip in de transactielijst niet uit de pas lopen met het
    // bedrag op de kaart "Waar loopt het op?".
    for (const d of BESPARINGSDOMEINEN) expect(naamVanBesparingsdomein(d.sleutel)).toBe(d.naam)
  })
})

describe('vergelijkBesparingsdomeinen — het percentage moet iets betekenen (ronde 104)', () => {
  const tx = (id: string, datum: string, bedrag: number, categorieId: string) => ({
    id,
    datum,
    omschrijving: id,
    bedrag,
    rekeningId: 'r1',
    categorieId,
  })
  const JULI = { van: '2026-07-01', tot: '2026-07-31' }
  const JUNI = { van: '2026-06-01', tot: '2026-06-30' }
  // `ITEM_BROOD` valt in het domein 'boodschappen' — dat legt de eerste test in dit
  // bestand al vast, dus hier hoeft niets afgeleid te worden.
  const domeinCat = 'boodschappen'

  it('zwijgt wanneer je vorige periode bijna niets uitgaf', () => {
    // ⚠ € 0,50 vorige maand tegenover € 400,00 deze maand gaf "▲ € 399,50 (79900%)".
    // Het commentaar bij dit veld ving "oneindig procent" al af bij NUL; vijftig cent is
    // even misleidend. Het BEDRAG blijft wel staan — dat klopt.
    const r = vergelijkBesparingsdomeinen(
      [tx('nu', '2026-07-02', -40000, ITEM_BROOD), tx('toen', '2026-06-02', -50, ITEM_BROOD)],
      JULI,
      JUNI,
    ).find((d) => d.sleutel === domeinCat)
    expect(r?.verschil).toBe(39950)
    expect(r?.procent).toBeNull()
  })

  it('geeft het percentage wél zodra de twee in dezelfde orde van grootte liggen', () => {
    // De positieve tegencontrole, op de grens: € 40,00 tegenover € 400,00 is precies een
    // tiende. Eén cent minder en het percentage hoort weg te vallen.
    const metGrens = (vorig: number) =>
      vergelijkBesparingsdomeinen(
        [
          tx('nu', '2026-07-02', -40000, ITEM_BROOD),
          tx('toen', '2026-06-02', -vorig, ITEM_BROOD),
        ],
        JULI,
        JUNI,
      ).find((d) => d.sleutel === domeinCat)
    expect(metGrens(4000)?.procent).toBe(900)
    expect(metGrens(3999)?.procent).toBeNull()
  })
})

