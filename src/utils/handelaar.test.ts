import { describe, it, expect } from 'vitest'
import { handelaarNaam, handelaarSleutel, zelfdeHandelaar } from './handelaar'

describe('handelaarSleutel', () => {
  it('haalt weg wat van de bank komt en niet van de winkel', () => {
    expect(handelaarSleutel('BETALING MAESTRO 6703 NETFLIX.COM 15/03 REF 1234567')).toBe('netflix com')
    expect(handelaarSleutel('DOMICILIERING PROXIMUS NV 0987654321')).toBe('proximus nv')
    expect(handelaarSleutel('Aankoop Bancontact DELHAIZE 2530 15-03-2026')).toBe('delhaize')
  })

  it('herkent dezelfde winkel ondanks een ander kaartnummer en een andere datum', () => {
    // Dit is de hele reden dat deze functie bestaat: zonder haar was elke maand
    // een andere handelaar en viel er niets over prijzen te zeggen.
    expect(
      zelfdeHandelaar('BETALING MAESTRO 6703 NETFLIX.COM 15/03', 'BETALING MAESTRO 6703 NETFLIX.COM 15/04'),
    ).toBe(true)
  })

  it('laat accenten en hoofdletters niet meetellen', () => {
    expect(handelaarSleutel('Domiciliëring ETHIAS')).toBe('ethias')
    expect(zelfdeHandelaar('colruyt', ' COLRUYT ')).toBe(true)
  })

  it('haalt een bankwoord niet weg wanneer er niets anders overblijft', () => {
    // Anders zou een boeking die letterlijk "Overschrijving" heet, leeg worden en
    // stil bij elke andere naamloze boeking op één hoop belanden.
    expect(handelaarSleutel('Overschrijving')).toBe('overschrijving')
  })

  it('geeft een lege sleutel wanneer er niets herkenbaars overblijft', () => {
    // Een prijsvergelijking op "12345678" zegt niets; de aanroeper hoort zo'n groep
    // over te slaan.
    expect(handelaarSleutel('12345678')).toBe('')
    expect(handelaarSleutel('   ')).toBe('')
    expect(zelfdeHandelaar('12345678', '87654321')).toBe(false)
  })

  it('houdt twee verschillende winkels uit elkaar', () => {
    expect(zelfdeHandelaar('Colruyt Gent', 'Delhaize Gent')).toBe(false)
  })

  it('laat een cijfer dat bij de naam hoort staan', () => {
    // Q8 is een merknaam, geen referentienummer: te kort om weggegooid te worden.
    expect(handelaarSleutel('Q8 KORTRIJK')).toBe('q8 kortrijk')
  })
})

describe('handelaarSleutel — de punten uit de review', () => {
  it('houdt "H&M" en "C&A" uit elkaar', () => {
    // Het & werd een spatie en losse letters werden weggegooid, dus beide werden
    // gewoon "gent" — en dan meldde de app een prijsstijging tussen twee winkels.
    expect(zelfdeHandelaar('H&M GENT', 'C&A GENT')).toBe(false)
    expect(handelaarSleutel('H&M')).not.toBe('')
  })

  it('houdt "Kind 1" en "Kind 2" uit elkaar', () => {
    // Precies de naamgeving die deze app zelf aanmoedigt.
    expect(zelfdeHandelaar('School Kind 1', 'School Kind 2')).toBe(false)
    expect(zelfdeHandelaar('Turnles Kind 1', 'Turnles Kind 1')).toBe(true)
  })

  it('eet een naam niet op die met een bankwoord begint', () => {
    // "ONLINE SHOP" werd "shop": 'online' en 'kaart' zijn te generiek om als
    // bankwoord te gelden.
    expect(handelaarSleutel('ONLINE SHOP')).toBe('online shop')
  })

  it('houdt de hoofdletters van de gebruiker in de weergavenaam', () => {
    expect(handelaarNaam('BETALING MAESTRO 6703 NETFLIX.COM 15/03 REF 1234567')).toBe('NETFLIX COM')
    expect(handelaarNaam('Bol.com')).toBe('Bol com')
  })
})
