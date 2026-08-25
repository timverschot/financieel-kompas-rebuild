import { describe, it, expect } from 'vitest'
import { bedragMetPeriode, knopnaamVoorPost, postKenmerk, postNaamMetKenmerk } from './postkenmerk'
import type { TerugkerendePost } from '../data/schema'

// ⚠ Elke '€' hieronder wordt gevolgd door een VASTE spatie (U+00A0), want dat is wat
// `formatEuro` schrijft. Een gewone spatie in een verwachte tekst laat de test falen
// op iets wat er identiek uitziet — de val die dit project al meermaals opliep.

// De vertaler van de test: geeft de sleutel terug met de parameters ingevuld, net
// zoals `vertaal` dat voor het Nederlands doet.
const t = (sleutel: string, params?: Record<string, string | number>) =>
  sleutel.replace(/\{(\w+)\}/g, (heel, naam) => String(params?.[naam] ?? heel))

const post = (over: Partial<TerugkerendePost> = {}): TerugkerendePost => ({
  id: 'p',
  omschrijving: 'Autoverzekering',
  bedrag: -62000,
  rekeningId: 'r1',
  dag: 5,
  ...over,
})

const auto = post({ id: 'a', bedrag: -62000, dag: 5, frequentie: 'jaar' })
const bestelwagen = post({ id: 'b', bedrag: -84000, dag: 12, frequentie: 'jaar' })
const huur = post({ id: 'h', omschrijving: 'Huur', bedrag: -95000, dag: 3 })

describe('bedragMetPeriode', () => {
  it('zet de periode achter het bedrag', () => {
    expect(bedragMetPeriode(t, post({ frequentie: 'jaar' }))).toBe('€ 620,00 per jaar')
  })

  it('noemt een post zonder frequentie "per maand"', () => {
    expect(bedragMetPeriode(t, post({ bedrag: -95000 }))).toBe('€ 950,00 per maand')
  })

  it('gebruikt de juiste periode voor kwartaal en semester', () => {
    // ⚠ De les van ronde 65: alles wat niet 'jaar' was, kreeg ooit "per maand".
    expect(bedragMetPeriode(t, post({ frequentie: 'kwartaal' }))).toContain('per kwartaal')
    expect(bedragMetPeriode(t, post({ frequentie: 'semester' }))).toContain('per half jaar')
  })

  it('toont het bedrag positief', () => {
    // Een vaste last staat negatief in de database; de lijsten tonen hem positief.
    expect(bedragMetPeriode(t, post({ bedrag: -95000 }))).not.toContain('-')
  })
})

describe('postKenmerk — trap 1: niets te onderscheiden', () => {
  it('zwijgt wanneer geen enkele andere post zo heet', () => {
    expect(postKenmerk(t, auto, [auto, huur])).toBe('')
  })

  it('zwijgt bij een lijst van één', () => {
    expect(postKenmerk(t, auto, [auto])).toBe('')
  })

  it('telt de post zelf niet als naamgenoot', () => {
    expect(postKenmerk(t, auto, [auto, { ...auto, id: 'kopie-id-maar-zelfde' }])).not.toBe('')
    expect(postKenmerk(t, auto, [])).toBe('')
  })
})

describe('postKenmerk — trap 2: bedrag en dag', () => {
  it('noemt bedrag en dag zodra een andere post net zo heet', () => {
    expect(postKenmerk(t, auto, [auto, bestelwagen])).toBe('€ 620,00 per jaar, dag 5')
  })

  it('geeft de twee naamgenoten een verschillend kenmerk', () => {
    const lijst = [auto, bestelwagen]
    expect(postKenmerk(t, auto, lijst)).not.toBe(postKenmerk(t, bestelwagen, lijst))
  })

  it('vergelijkt namen zonder hoofdletters en zonder witruimte eromheen', () => {
    // ⚠ HTML vouwt witruimte samen, dus "Autoverzekering " en "Autoverzekering" zijn
    // op het scherm identiek. Uitgerekend dat geval mag niet zwijgen. Dezelfde
    // vergelijking als de duplicaatwaarschuwing in het formulier.
    const slordig = { ...bestelwagen, omschrijving: '  autoverzekering ' }
    expect(postKenmerk(t, auto, [auto, slordig])).not.toBe('')
  })
})

describe('postKenmerk — trap 3: een teller', () => {
  // ⚠ Dit is geen bedacht geval. Het venster van ronde 76 duwt je naar "Liever
  // opzeggen": je oude Netflix blijft staan mét einddatum, je maakt een nieuwe. Zelfde
  // naam, zelfde bedrag, zelfde dag. En ronde 73 laat twee identieke posten bewust toe.
  const netflix = post({ id: 'n1', omschrijving: 'Netflix', bedrag: -1599, dag: 8 })
  const netflix2 = { ...netflix, id: 'n2' }

  it('nummert wanneer bedrag en dag óók gelijk zijn', () => {
    const lijst = [netflix, netflix2]
    expect(postKenmerk(t, netflix, lijst)).toBe('€ 15,99 per maand, dag 8 (1 van 2)')
    expect(postKenmerk(t, netflix2, lijst)).toBe('€ 15,99 per maand, dag 8 (2 van 2)')
  })

  it('houdt ze daarmee alsnog uit elkaar', () => {
    const lijst = [netflix, netflix2]
    expect(postKenmerk(t, netflix, lijst)).not.toBe(postKenmerk(t, netflix2, lijst))
  })

  it('volgt de volgorde van de lijst, niet die van de id', () => {
    // De aanroeper geeft de lijst door die hij ook rendert, dus "1 van 2" wijst naar de
    // eerste rij op het scherm.
    expect(postKenmerk(t, netflix, [netflix2, netflix])).toBe('€ 15,99 per maand, dag 8 (2 van 2)')
  })

  it('nummert niet wanneer de derde naamgenoot wél verschilt', () => {
    // Twee gelijke en één andere: de andere heeft genoeg aan bedrag en dag.
    const anders = { ...netflix, id: 'n3', bedrag: -2199 }
    expect(postKenmerk(t, anders, [netflix, netflix2, anders])).toBe('€ 21,99 per maand, dag 8')
  })
})

describe('knopnaamVoorPost', () => {
  it('houdt de naam kort wanneer er niets te onderscheiden valt', () => {
    // ⚠ 29 tekens in plaats van 55. Een schermlezer leest dit label bij élke knop op
    // élke rij voor; bij tien vaste lasten met drie knoppen zijn dat dertig keer.
    expect(knopnaamVoorPost(t, 'Verwijderen', auto, [auto, huur])).toBe('Verwijderen — Autoverzekering')
  })

  it('zet het kenmerk erbij zodra dat nodig is', () => {
    expect(knopnaamVoorPost(t, 'Verwijderen', auto, [auto, bestelwagen])).toBe(
      'Verwijderen — Autoverzekering, € 620,00 per jaar, dag 5',
    )
  })

  it('zet de actie vooraan (WCAG 2.5.3)', () => {
    for (const actie of ['Boek in', 'Uitboeken', 'Losmaken', 'Bewerken', 'Verwijderen']) {
      expect(knopnaamVoorPost(t, actie, auto, [auto]).startsWith(actie)).toBe(true)
      expect(knopnaamVoorPost(t, actie, auto, [auto, bestelwagen]).startsWith(actie)).toBe(true)
    }
  })

  it('geeft twee gelijknamige posten twee verschillende knopnamen', () => {
    const lijst = [auto, bestelwagen]
    expect(knopnaamVoorPost(t, 'Verwijderen', auto, lijst)).not.toBe(
      knopnaamVoorPost(t, 'Verwijderen', bestelwagen, lijst),
    )
  })
})

describe('postNaamMetKenmerk', () => {
  it('geeft de kale naam wanneer die uniek is', () => {
    expect(postNaamMetKenmerk(t, huur, [huur, auto])).toBe('Huur')
  })

  it('zet het kenmerk tussen haakjes erachter bij een naamgenoot', () => {
    expect(postNaamMetKenmerk(t, auto, [auto, bestelwagen])).toBe('Autoverzekering (€ 620,00 per jaar, dag 5)')
  })

  it('geeft twee naamgenoten twee verschillende namen', () => {
    const lijst = [auto, bestelwagen]
    expect(postNaamMetKenmerk(t, auto, lijst)).not.toBe(postNaamMetKenmerk(t, bestelwagen, lijst))
  })
})
