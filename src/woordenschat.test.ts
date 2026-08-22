import { describe, it, expect } from 'vitest'
import { vertaalSleutels } from './i18n'

// Eén woord per ding (ronde 66).
//
// ⚠ WAAROM DEZE TEST BESTAAT. De doorlichting noemde dit de zwaarste vondst van
// allemaal, want ze maakt de app ONLEERBAAR: "boeking", "transactie", "regel" en
// "rij" duidden alle vier een ingevoerde uitgave aan — soms in dezelfde kaart. En
// omgekeerd droeg één woord, "Saldo", op drie schermen drie verschillende bedragen.
//
// Zo'n afspraak houdt zichzelf niet in stand. De volgende ronde die een zin
// toevoegt, schrijft weer "transactie" — het staat immers overal in de code, en het
// TYPE heet ook zo.
//
// ⚠ WAAROM DEZE TEST DE VERTAALTABEL LEEST EN NIET DE BRONCODE. Een eerdere versie
// zocht naar `t('…')` in de bestanden, en liet daardoor precies de gevallen door die
// je niet ziet aankomen: sleutels die via een VARIABELE bij `t()` komen (de
// `paren`-arrays in de verwijder-hulpmodules, `PERIODE_SLEUTELS`, `ROL_SLEUTELS`,
// `REKENING_TYPE_LABEL`, de paginalabels in `navigatie.ts`, `t(post.waarschuwing)`
// …). De Nederlandse sleutel ís de schermtekst — élke schermtekst staat in deze
// tabel, want `i18nDekking.test.ts` dwingt dat af. Eén bron, geen ontsnappingen.
//
// ⚠ Sleutels die NIET meer gebruikt worden, vallen hier ook door de mand. Dat is
// bedoeld: een wees met een verouderd woord erin is een val voor de volgende ronde.
//
// ⚠ In de CODE blijft alles gewoon `Transactie` heten. Die namen staan in het
// logboek, in elke back-up en in het schema; ze hernoemen zou elke bewaarde regel
// ongeldig maken. Deze test gaat alleen over wat een mens leest.

/** Elke Nederlandse schermtekst. Plaatshouders eruit: `{items}` leest niemand. */
function schermteksten(): string[] {
  return vertaalSleutels('en').map((s) => s.replace(/\{[^}]*\}/g, ' '))
}

function met(patroon: RegExp): string[] {
  return schermteksten().filter((tekst) => patroon.test(tekst))
}

describe('woordenschat — één woord per ding', () => {
  it('noemt een ingevoerde uitgave of inkomst overal een "boeking"', () => {
    expect(met(/transacti/i)).toEqual([])
  })

  it('gebruikt "Saldo" alleen nog voor de stand van een rekening', () => {
    // ⚠ "Saldo" is voortaan ALTIJD een rekeningstand. Het verschil tussen inkomsten
    // en uitgaven heet "Netto", en het verschil tussen twee ouders "te verrekenen".
    // Stond hetzelfde woord op alle drie, dan viel er niets te leren.
    //
    // Het kale woord mag maar op één plek staan: de tegel op Overzicht. Overal waar
    // het in een langere zin staat, draagt het zijn grootheid mee ("Saldo van de
    // pot", "Saldo op {datum}") en kan het niets anders betekenen.
    expect(met(/^Saldo$/)).toEqual(['Saldo'])
    expect(met(/^(Verschil|Binnengekomen|Eraf gegaan)$/)).toEqual([])
  })

  it('spreekt over de onderhoudsbijdrage, niet over alimentatie of onderhoudsgeld', () => {
    expect(met(/alimentatie|onderhoudsgeld|onderhoudsregeling/i)).toEqual([])
  })

  it('gebruikt de drie laagnamen van de categorieboom', () => {
    // De boom heeft drie lagen: hoofdcategorie → categorie → subcategorie. Voor de
    // onderste laag stonden er drie woorden door elkaar ("subcategorie", "item",
    // "product"), en het cijfer erboven noemde weer iets anders ("546 items").
    //
    // Een gekocht GOED mag wél een product heten — dat is iets anders dan een laag
    // in de boom.
    const overGoederen = /nieuw product|^Product$|Productnaam|per product/
    expect(met(/\bitems?\b/i)).toEqual([])
    expect(met(/\bproduct(en)?\b/i).filter((t) => !overGoederen.test(t))).toEqual([])
  })

  it('houdt de drie kengetallen op elk scherm bij dezelfde naam', () => {
    // Inkomsten · Uitgaven · Netto, op Overzicht, Boekingen, de Maandafsluiting en
    // een rekeningdetail. Vroeger heetten dezelfde drie getallen op twee van die
    // schermen "Binnengekomen · Eraf gegaan · Verschil".
    for (const woord of ['Inkomsten', 'Uitgaven', 'Netto']) {
      expect(met(new RegExp(`^${woord}$`))).toEqual([woord])
    }
  })
})
