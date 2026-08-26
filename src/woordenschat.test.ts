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

  it('noemt een terugkerende kost overal een "vaste last"', () => {
    // ⚠ RONDE 83. De kaart heet "Vaste lasten", maar daarnaast liepen er "vaste post",
    // "vaste kost" en "terugkerende post/kost" rond — vier woorden voor één ding, en
    // twee ervan stonden op Budget → Vast zelf.
    //
    // ⚠ De eerste versie van deze test toetste alléén op "vaste post", terwijl haar naam
    // "overal" beloofde. Een nakijkronde wees erop: een test die geruststelt zonder te
    // bewaken, is precies wat de volgende ronde laat ontsporen.
    expect(met(/vaste post|vaste kost|terugkerende (post|kost)/i)).toEqual([])
    // ⚠ En een POSITIEVE controle erbij (nakijkronde): zonder haar zou deze test ook
    // slagen op een lege tabel — en dan bewaakt ze niets.
    expect(schermteksten()).toContain('Vaste last wijzigen')
    expect(schermteksten()).toContain('Vaste lasten')
  })

  it('noemt de vier velden van het vaste-lastformulier zonder "vast" ervoor (ronde 88)', () => {
    // ⚠ Tot ronde 88 heetten de velden van het formulier voor een vaste last "Vaste
    // omschrijving", "Vast bedrag (€)", "Vaste rekening" en "Vaste categorie". Dat is
    // geen Nederlands — een rekening die vást is? — en het voorvoegsel stond er alleen om
    // botsingen met velden elders te vermijden.
    //
    // ⚠ Het deed dat nooit waar het nodig was: op Budget → Vast staan twee exemplaren van
    // dat formulier onder elkaar, en die zeiden allebei "Vaste omschrijving". Wat die twee
    // uit elkaar houdt, is de naam van het FORMULIER (ronde 83).
    //
    // ⚠ "Vaste last(en)", "Vaste inkomst(en)" en "Vaste kosten per maand" blijven staan:
    // daar hoort "vast" bij het ding zelf en niet bij het veld.
    // ⚠ ALLE VIER DE TAKKEN AAN BEIDE KANTEN VERANKERD (doorlichting). De eerste versie
    // liet `^Vast bedrag` los lopen: dan glipte "Vaste rekening voor deze post" er langs,
    // én viel élke toekomstige tegel die met "Vast bedrag" begint er ten onrechte onder.
    //
    // ⚠ EN DE NAAM VAN DEZE TEST BELOOFT PRECIES DEZE VIER, niet "elk veld dat met vast
    // begint". Een test die meer belooft dan ze toetst, is precies wat de test hierboven
    // over zichzelf opmerkte.
    expect(met(/^Vaste (omschrijving|rekening|categorie)$|^Vast bedrag \(€\)$/i)).toEqual([])
    // ⚠ En de POSITIEVE controle: zonder haar slaagt dit ook op een lege tabel. ⚠ Ze
    // bindt dit FORMULIER niet — die vier sleutels worden ook door de boeking, de
    // overboeking en het rekeningdetail gebruikt. De echte bewaking staat in
    // `TerugkerendeSectie.test.tsx`; leun niet op deze.
    expect(schermteksten()).toContain('Omschrijving')
    expect(schermteksten()).toContain('Bedrag (€)')
    expect(schermteksten()).toContain('Rekening')
    expect(schermteksten()).toContain('Categorie')
  })

  it('laat geen schermtekst met "Wijzig " beginnen — die knop heet "Bewerk…" (ronde 89)', () => {
    // ⚠ Twee families, en ze horen elk hun eigen woord te houden:
    //   • "Bewerken" / "Bewerk {ding} {naam}" — de knop op een RIJ die het scherm opent;
    //   • "{Ding} wijzigen" / "Wijzigen"      — de knop op het FORMULIER die opslaat.
    // Negen rijknoppen heetten al "Bewerk …"; drie zeiden "Wijzig …" ("Wijzig {naam}",
    // "Wijzig gezinslid {naam}", "Wijzig de regeling"). Die drie zijn omgezet.
    // ⚠ De NAAM van deze test zegt precies wat ze toetst (doorlichting ronde 89): één
    // verboden voorvoegsel, niet "overal". `\bWijzig\b(?!en)` laat "Wijzigen" en
    // "wijzigingen" met rust en vangt "Wijzig" waar het ook staat.
    expect(met(/\bWijzig\b(?!en)/)).toEqual([])
    // ⚠ POSITIEF: zonder deze regels slaagt dit ook op een lege tabel — én ze leggen vast
    // dat de opslaanfamilie WÉL blijft bestaan, zodat niemand haar "opruimt".
    expect(schermteksten()).toContain('Bewerken')
    expect(schermteksten()).toContain('Bewerk de regeling')
    expect(schermteksten()).toContain('Wijzigen')
    expect(schermteksten()).toContain('Vaste last wijzigen')
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
