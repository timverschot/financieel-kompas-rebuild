import { describe, it, expect } from 'vitest'
import { afterEach } from 'vitest'
import { getalTekst, openTekst } from './onderhoudsbijdrageTekst'
import { zetOpmaaktaal } from './opmaaktaal'

// De zin onder het openstaande saldo. Ze wordt woord voor woord overgenomen in een
// gesprek met de andere ouder, dus ze mag niets bevestigen wat er niet berekend is.

const t = (sleutel: string, params?: Record<string, string | number>) =>
  sleutel.replace(/\{(\w+)\}/g, (_, naam) => String(params?.[naam] ?? `{${naam}}`))

describe('openTekst', () => {
  it('bevestigt niets wanneer de regeling nog niet loopt', () => {
    // ⚠ RONDE 66, slotronde. Ligt de datum van de regeling in een toekomstige maand,
    // dan zijn verschuldigd, betaald én open alle drie nul — en zei deze regel
    // "Betaald en verschuldigd zijn precies gelijk." Dat leest als "jullie staan
    // quitte" boven drie keer € 0,00, precies de valse geruststelling die ronde 65
    // uit de maandafsluiting gehaald heeft.
    expect(openTekst(t, 0, 'jij-betaalt', 0)).toContain('nog niet beginnen lopen')
    expect(openTekst(t, 0, 'jij-ontvangt', 0)).not.toContain('precies gelijk')
  })

  it('zegt "precies gelijk" wél zodra er maanden geteld zijn', () => {
    expect(openTekst(t, 0, 'jij-betaalt', 7)).toContain('precies gelijk')
  })

  it('noemt het openstaande bedrag met de juiste richting', () => {
    expect(openTekst(t, 12500, 'jij-betaalt', 3)).toContain('die jij verschuldigd bent')
    expect(openTekst(t, 12500, 'jij-ontvangt', 3)).toContain('die aan jou verschuldigd is')
    expect(openTekst(t, -5000, 'jij-betaalt', 3)).toContain('meer betaald dan berekend')
    expect(openTekst(t, -5000, 'jij-ontvangt', 3)).toContain('meer ontvangen dan berekend')
  })
})

describe('getalTekst — het indexcijfer volgt de taal (ronde 108)', () => {
  afterEach(() => zetOpmaaktaal('nl'))

  it('houdt de komma in het Nederlands en het Frans', () => {
    zetOpmaaktaal('nl')
    expect(getalTekst(124.05)).toBe('124,05')
    zetOpmaaktaal('fr')
    expect(getalTekst(124.05)).toBe('124,05')
  })

  it('zet een punt in het Engels, net als het bedrag ernaast', () => {
    // ⚠ RONDE 108. De Engelse indexatiebrief las "€250.00 x 124,05 / 112,83 = €274.86":
    // een punt bij het geld en een komma bij de indexcijfers, in dezelfde formule.
    zetOpmaaktaal('en')
    expect(getalTekst(124.05)).toBe('124.05')
  })

  it('houdt twee cijfers na de komma, ook bij een rond getal', () => {
    zetOpmaaktaal('nl')
    expect(getalTekst(100)).toBe('100,00')
  })
})
