import { describe, it, expect } from 'vitest'
import { BASISDREMPEL, percentageZinvol, VERHOUDINGSGRENS } from './verhouding'

// Ronde 104. Drie schermen toonden een percentage dat volledig door één cent bepaald werd:
// een spaarquote van −496000 %, een besparing van +79900 % en een budget van 8000 %.

describe('percentageZinvol', () => {
  it('zegt nee zonder basis', () => {
    // Zonder deze regel is het "oneindig procent", en dat is geen getal.
    expect(percentageZinvol(0, 100)).toBe(false)
    expect(percentageZinvol(-5, 100)).toBe(false)
  })

  it('zegt nee zodra de basis onder een tiende van de waarde zakt', () => {
    // ⚠ DIT IS DE GRENS ZELF, en ze wordt aan beide kanten geraakt: precies op de grens
    // hoort het percentage er nog te zijn, één cent eronder niet meer. Zonder die twee
    // regels mag de factor alles zijn tussen 2 en 3800 zonder dat een test knippert —
    // dat is met een mutatie aangetoond in een eerdere versie van deze reeks.
    expect(percentageZinvol(1000, 10000)).toBe(true)
    expect(percentageZinvol(999, 10000)).toBe(false)
  })

  it('zegt ja wanneer de twee in dezelfde orde van grootte liggen', () => {
    expect(percentageZinvol(50000, 40000)).toBe(true)
    expect(percentageZinvol(40000, 50000)).toBe(true)
  })

  it('houdt de grens op een tiende', () => {
    // Een positieve controle op het getal zelf: verandert iemand de constante, dan hoort
    // dat een bewuste wijziging te zijn met een nieuwe meting erbij.
    expect(VERHOUDINGSGRENS).toBe(10)
  })

  it('zegt nee zodra de basis zelf kleingeld is, ook bij een nette verhouding', () => {
    // ⚠ RONDE 106. De verhoudingsgrens alleen vangt "klein tegenover groot" en laat "klein
    // tegenover klein" door: € 0,25 tegenover € 2,25 heeft een verhouding van 9 en gaf
    // "−800%". Ook deze grens wordt aan beide kanten geraakt.
    expect(percentageZinvol(25, 225)).toBe(false)
    expect(percentageZinvol(1000, 2000)).toBe(true)
    expect(percentageZinvol(999, 2000)).toBe(false)
  })

  it('houdt de basisdrempel op tien euro', () => {
    // Laag genoeg dat een gewone vergelijking blijft staan, hoog genoeg dat kleingeld geen
    // percentage meer krijgt. Verandert dit getal, dan hoort dat een bewuste keuze te zijn.
    expect(BASISDREMPEL).toBe(1000)
    // € 30,00 vorige maand tegenover € 45,00 deze maand hoort er gewoon te staan.
    expect(percentageZinvol(3000, 4500)).toBe(true)
  })

  it('laat het echte geval van de spaarquote vallen', () => {
    // € 0,25 statiegeld tegenover € 1.240,25 uitgaven — het geval waarmee deze regel begon.
    expect(percentageZinvol(25, 124025)).toBe(false)
  })
})
