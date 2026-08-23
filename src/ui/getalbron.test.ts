import { describe, it, expect } from 'vitest'
import { naamMetBron } from './getalbron'

// Ronde 69. De herkomstzin staat zichtbaar in een doorklikbaar cijfer, maar op een
// knop vervangt `aria-label` alle tekst binnenin. Zonder deze functie zag een ziende
// gebruiker "alleen terugkerende posten" staan en hoorde een schermlezer het niet.
describe('naamMetBron', () => {
  it('laat de naam ongemoeid wanneer er geen bron is', () => {
    expect(naamMetBron('Netto € 1.500,00 — bekijk de boekingen')).toBe('Netto € 1.500,00 — bekijk de boekingen')
    expect(naamMetBron('Netto € 1.500,00', '')).toBe('Netto € 1.500,00')
  })

  it('plakt de bron erachter met een punt ertussen', () => {
    expect(naamMetBron('Netto € 1.500,00 — bekijk de boekingen', 'Alleen deze maand.')).toBe(
      'Netto € 1.500,00 — bekijk de boekingen. Alleen deze maand.',
    )
  })

  it('zet er geen tweede leesteken bij wanneer de naam er al een heeft', () => {
    // Anders: "… bekijk de boekingen.. Alleen deze maand."
    expect(naamMetBron('Netto — bekijk de boekingen.', 'Alleen deze maand.')).toBe(
      'Netto — bekijk de boekingen. Alleen deze maand.',
    )
    expect(naamMetBron('Hoeveel hou je over?', 'Alleen deze maand.')).toBe('Hoeveel hou je over? Alleen deze maand.')
  })
})
