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

  // ⚠ RONDE 94 — "kost" betekende twee dingen, en dat viel op langs de VERTALING.
  //
  // In de dossiermodule is een "kost" een gedeelde kost; in de vaste-lastenmodule
  // (spaardoelen, het verwijdervenster, de opstelling) stond "die kost" gewoon voor een
  // vaste last. Zeventien schermteksten deden dat. Het Frans zei daar `charge` — en dat is
  // het woord van "vaste last", terwijl een gedeelde kost `frais` heet. De vertaling liep
  // niet uiteen door slordigheid; ze beschreef twee verschillende dingen met één Nederlands
  // woord.
  //
  // ⚠ DEZE CONTROLE KIJKT NAAR HET BESTAND, NIET NAAR DE TEKST. Een eerdere opzet probeerde
  // aan de zin zélf te zien of het over een gedeelde kost ging ("dossier", "afrekening",
  // "co-ouder" …) en meldde tien teksten die alle tien in orde waren: over een uitwisseling,
  // een bewijsmap, "eigen percentage op de kost". De context zit niet in de woorden maar in
  // de MODULE waar de tekst staat.
  //
  // ⚠ EN ZE STAAT OMGEKEERD (doorlichting ronde 94). De eerste opzet somde de ACHT bestanden
  // van de vaste-lastenmodule op en keek alleen daar. Drie gaten tegelijk: `OpstellingSectie.tsx`
  // stond er niet bij terwijl deze ronde het bestand wél veranderde, een NIEUW bestand zou
  // vanzelf buiten schot vallen, en het lidwoordpatroon (`de|die|deze|een …`) liet vier van de
  // zeventien hernoemingen van deze ronde zelf ontsnappen ("Onbekende kost", "{n} kosten
  // toegevoegd", "Kost toevoegen"). Nu geldt het omgekeerde: ELK woord "kost" in ELK bestand is
  // verdacht, tenzij het bestand tot de dossiermodule hoort, de tekst "gedeelde kost" zegt (dan
  // benoemt het bijvoeglijk naamwoord het ding zelf), of de tekst hieronder met reden vrijgesteld
  // is. Een nieuw bestand is dus vanaf zijn eerste regel bewaakt.

  /** Bestanden waar een "kost" per definitie een GEDEELDE kost is. */
  const DOSSIERMODULE: Record<string, string> = {
    'components/DossierSectie.tsx': 'de dossierpagina zelf',
    'components/GedeeldeKostFormulier.tsx': 'het invulvenster van een gedeelde kost',
    'components/UitwisselingKaart.tsx': 'het heen-en-weer met de andere ouder',
    'components/KindkostenSectie.tsx': 'wat elk gezinslid kost, inclusief aandelen uit dossiers',
    'components/KindrekeningSectie.tsx': 'de gezamenlijke pot van twee ouders',
    'components/NieuwDossierKiezer.tsx': 'de keuze welk soort dossier je begint',
    'utils/afrekeningOverzicht.ts': 'de opbouw onder een afrekening',
    'utils/afrekeningTekst.ts': 'de samenvatting en de PDF van een afrekening',
    'utils/afrekeningverwijdering.ts': 'wat je kwijtraakt als je een afrekening wist',
    'utils/bewijsmapPdf.ts': 'de bewijsmap bij een afrekening',
    'utils/dossierverwijdering.ts': 'wat je kwijtraakt als je een dossier wist',
    'utils/gezinslidverwijdering.ts': 'wat je kwijtraakt als je een gezinslid wist',
    'utils/kostensoort.ts': 'de indicatieve lijst gewone/buitengewone kosten',
  }

  /** Teksten buiten de dossiermodule waar "kost" om een andere reden juist is. */
  const KOST_MET_REDEN: Record<string, string> = {
    'Kost verwijderd': 'de terugmelding na het wissen van een gedeelde kost',
    'Alle uitgaven in de gekozen periode. Een kost voor meerdere gezinsleden is gelijk over hen verdeeld; het totaal telt elke boeking één keer.':
      'gaat over een boeking die aan meerdere gezinsleden hangt',
    'Wat aan niemand persoonlijk hangt, staat bij "Het gezin". Een kost voor meerdere gezinsleden wordt gelijk verdeeld; zo’n aandeel bestaat niet als aparte boeking, dus die rij klikt niet door.':
      'gaat over een boeking die aan meerdere gezinsleden hangt',
    'Houdt dit een jaar aan, dan kost het {bedrag} extra. {tip}': 'werkwoord',
    'Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten en of ze stijgen.':
      'werkwoord',
    'Stel je gezinsleden één keer in; je kan er kosten, doelen, leningen en garanties aan koppelen.':
      'somt op wat er aan een gezinslid kan hangen, waaronder dossierkosten',
    'Nog geen gezinsleden ingesteld. Vul hieronder een naam in; daarna kan je er kosten, doelen en garanties aan koppelen.':
      'somt op wat er aan een gezinslid kan hangen, waaronder dossierkosten',
    'Deel je kosten met iemand?': 'de vraag in de opstelling of je een dossier wil',
    'Over het hele jaar kosten je vaste lasten gemiddeld {bedrag} per maand.': 'werkwoord',
    'Wat kost een lening per maand, en wat levert extra aflossen op?': 'werkwoord',
    'Dit is {over} meer dan {naam} kost ({bedrag}).': 'werkwoord',
    '{naam} kost {bedrag} en valt de volgende keer op {datum}. Zolang dit doel eraan hangt, rekent Budget onder "Opzij voor later" met jouw streefbedrag in plaats van met het volle bedrag gedeeld over de maanden.':
      'werkwoord',
    '{naam} kost {bedrag}, maar er komt geen betaling meer.': 'werkwoord',
    'Die vaste last kost {bedrag}; jouw doelbedrag staat op {doel}.': 'werkwoord',
    'Elke maand kost je evenveel: {bedrag} aan vaste lasten.': 'werkwoord',
    'Van wat de app kan plaatsen kost elke maand evenveel: {bedrag}.': 'werkwoord',
    'Soort kost': 'het dossierdeel van het boekingsvenster: gewoon of buitengewoon',
    'Gewone kost': 'het dossierdeel van het boekingsvenster: gewoon of buitengewoon',
    'Buitengewone kost': 'het dossierdeel van het boekingsvenster: gewoon of buitengewoon',
    'Je betaalde deze uitgave zelf. De verdeling volgt de afspraak van het dossier; op de Dossiers-pagina kan je ze voor deze kost nog aanpassen.':
      'het dossierdeel van het boekingsvenster',
    'Wat kost elk gezinslid?': 'werkwoord',
    'Wat elk gezinslid je per maand kost.': 'werkwoord',
    'Kosten delen met de andere ouder, geld dat je uitleende, en je garantiebewijzen.':
      'de omschrijving van de Dossiers-pagina',
    'Syndicus of gemeenschappelijke kosten': 'de naam van een vaste-lastvoorstel uit de opstelling',
  }

  /** Het woord zelf. Eén constante, want twee kopieën lopen uit elkaar. */
  const KOST = /\bkost(en)?\b/i
  /** "gedeelde kost(en)": het bijvoeglijk naamwoord benoemt het ding al. */
  const GEDEELD = /gedeelde kost/i

  const BRON_RUW = {
    ...(import.meta.glob('./**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
    ...(import.meta.glob('./**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
  }

  /**
   * De losse tekenreeksen uit één bronbestand, met commentaar overgeslagen.
   *
   * ⚠ NIET alleen `t('…')`. De verwijder-hulpmodules zetten hun zinnen in een
   * `paren`-array en geven ze later door aan `t()`; wie op `t('` zoekt, ziet die nooit.
   * Daarom: élke enkelgequote tekenreeks, en verderop houden we alleen wat ook echt een
   * sleutel in de vertaaltabel is.
   */
  function tekenreeksen(ruw: string): string[] {
    const uit: string[] = []
    let i = 0
    while (i < ruw.length) {
      const c = ruw[i]
      if (c === '/' && ruw[i + 1] === '/') {
        while (i < ruw.length && ruw[i] !== '\n') i += 1
      } else if (c === '/' && ruw[i + 1] === '*') {
        i += 2
        while (i + 1 < ruw.length && !(ruw[i] === '*' && ruw[i + 1] === '/')) i += 1
        i += 2
      } else if (c === "'") {
        let j = i + 1
        let buf = ''
        while (j < ruw.length && ruw[j] !== "'") {
          if (ruw[j] === '\\') {
            buf += ruw.slice(j, j + 2)
            j += 2
            continue
          }
          buf += ruw[j]
          j += 1
        }
        uit.push(buf)
        i = j + 1
      } else if (c === '"' || c === '`') {
        let j = i + 1
        while (j < ruw.length && ruw[j] !== c) j += ruw[j] === '\\' ? 2 : 1
        i = j + 1
      } else {
        i += 1
      }
    }
    return uit
  }

  /**
   * `zo’n` in de bron is `zo’n` op het scherm.
   *
   * ⚠ Zonder deze stap valt élke tekst met een ontsnapping stilletjes buiten de controle —
   * ze staat dan niet in de vertaaltabel en wordt dus niet als schermtekst herkend.
   */
  function ontsnap(letterlijk: string): string {
    return letterlijk.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, wat: string) => {
      if (wat[0] === 'u') return String.fromCharCode(parseInt(wat.slice(1), 16))
      if (wat === 'n') return '\n'
      if (wat === 't') return '\t'
      return wat
    })
  }

  /** Per bestand: de schermteksten met het woord "kost" erin. */
  function kostteksten(): Record<string, string[]> {
    const sleutels = new Set(vertaalSleutels('en'))
    const uit: Record<string, string[]> = {}
    for (const [pad, ruw] of Object.entries(BRON_RUW)) {
      const bestand = pad.replace(/^\.\//, '')
      if (bestand === 'i18n.tsx' || /\.test\.tsx?$/.test(bestand)) continue
      const gevonden = [...new Set(tekenreeksen(ruw).map(ontsnap))].filter((s) => sleutels.has(s) && KOST.test(s))
      if (gevonden.length > 0) uit[bestand] = gevonden.sort()
    }
    return uit
  }

  /** Zuiver, dus beproefbaar op verzonnen invoer. */
  function schendingen(
    perBestand: Record<string, string[]>,
    dossier: Record<string, string>,
    metReden: Record<string, string>,
  ): string[] {
    const uit: string[] = []
    for (const [bestand, teksten] of Object.entries(perBestand)) {
      if (bestand in dossier) continue
      for (const tekst of teksten) {
        if (!KOST.test(tekst)) continue
        if (GEDEELD.test(tekst)) continue
        if (tekst in metReden) continue
        uit.push(`${bestand}: "${tekst}"`)
      }
    }
    return uit.sort()
  }

  /** Vrijstellingen die niets meer vrijstellen — die horen weg, anders bewaken ze schijn. */
  function overbodigeUitzonderingen(
    perBestand: Record<string, string[]>,
    dossier: Record<string, string>,
    metReden: Record<string, string>,
  ): string[] {
    const uit: string[] = []
    for (const bestand of Object.keys(dossier)) {
      const teksten = perBestand[bestand] ?? []
      if (!teksten.some((t) => KOST.test(t))) uit.push(`dossiermodule: ${bestand}`)
    }
    const buitenDossier = Object.entries(perBestand)
      .filter(([bestand]) => !(bestand in dossier))
      .flatMap(([, teksten]) => teksten)
    for (const tekst of Object.keys(metReden)) {
      if (!buitenDossier.includes(tekst)) uit.push(`met reden: "${tekst}"`)
      else if (GEDEELD.test(tekst)) uit.push(`met reden maar al "gedeelde kost": "${tekst}"`)
    }
    return uit.sort()
  }

  it('noemt een vaste last nooit gewoon "een kost" (ronde 94)', () => {
    expect(schendingen(kostteksten(), DOSSIERMODULE, KOST_MET_REDEN)).toEqual([])
  })

  it('houdt geen vrijstelling staan die niets meer vrijstelt', () => {
    expect(overbodigeUitzonderingen(kostteksten(), DOSSIERMODULE, KOST_MET_REDEN)).toEqual([])
  })

  it('leest écht elk bronbestand, ook de `.ts` met losse zinnen in een array', () => {
    // ⚠ De vorige opzet las alleen `.tsx` én alleen `t('…')`. Twee hele bestanden vielen
    // daardoor buiten de controle. Deze drie ankers laten dat niet terugkeren.
    const perBestand = kostteksten()
    expect(Object.keys(perBestand)).toContain('utils/categorieverwijdering.ts')
    expect(perBestand['utils/categorieverwijdering.ts']).toContain(
      '{n} gedeelde kost(en) in een dossier verliezen hun categorie.',
    )
    expect(Object.keys(perBestand)).toContain('components/OpstellingSectie.tsx')
  })

  it('vindt élke schermtekst met "kost" ergens terug in de broncode', () => {
    // ⚠ HET ENIGE GAT DAT DEZE OPZET NOG HAD. De controle leest de BRONBESTANDEN, want alleen
    // daar staat in welke module een tekst hoort. Een sleutel die nergens letterlijk in een
    // bestand staat — bijvoorbeeld eentje die alleen via `i18n.tsx` bestaat — zou dus door
    // niemand bekeken worden. Deze test dwingt af dat zoiets niet kan ontstaan: staat er een
    // "kost" in de vertaaltabel, dan moet een bestand hem ook echt bevatten.
    const gezien = new Set(Object.values(kostteksten()).flat())
    const gemist = vertaalSleutels('en').filter((s) => KOST.test(s) && !gezien.has(s))
    expect(gemist).toEqual([])
    // POSITIEF: zonder dit slaagt bovenstaande ook wanneer er geen enkele sleutel meer is.
    expect(gezien.size).toBeGreaterThan(50)
  })

  it('zou zo\'n "kost" ook écht aanwijzen', () => {
    // ⚠ Een controle die alleen kán falen wanneer er al iets fout staat, bewijst niets.
    // Dus: verzonnen invoer, waarvan we het antwoord vooraf weten.
    const dossier = { 'utils/verzonnen.ts': 'verzonnen' }
    const metReden = { '{naam} kost {bedrag}.': 'werkwoord' }
    const perBestand = {
      'utils/verzonnen.ts': ['Kost toevoegen'],
      'components/Vast.tsx': ['{naam} kost {bedrag}.', '{n} gedeelde kost(en)', 'Onbekende kost', 'Vaste last'],
    }
    expect(schendingen(perBestand, dossier, metReden)).toEqual(['components/Vast.tsx: "Onbekende kost"'])
    expect(overbodigeUitzonderingen(perBestand, dossier, metReden)).toEqual([])
    // Een dossierbestand zonder één "kost" erin is een dode vrijstelling:
    expect(overbodigeUitzonderingen({ 'components/Vast.tsx': ['Vaste last'] }, dossier, {})).toEqual([
      'dossiermodule: utils/verzonnen.ts',
    ])
    // En een reden voor een tekst die nergens meer staat, ook:
    expect(overbodigeUitzonderingen({ 'components/Vast.tsx': ['Vaste last'] }, {}, metReden)).toEqual([
      'met reden: "{naam} kost {bedrag}."',
    ])
    // Het lezen van de bron zelf: commentaar telt niet mee, ontsnappingen wel.
    expect(tekenreeksen("const a = t('Hallo') // t('Niet dit')")).toEqual(['Hallo'])
    expect(tekenreeksen("/* t('Ook niet') */ const b = 'Wel dit'")).toEqual(['Wel dit'])
    expect(tekenreeksen('const c = "dubbel" + `sjabloon`')).toEqual([])
    expect(ontsnap('zo\\u2019n aandeel')).toBe('zo’n aandeel')
    expect(ontsnap("het \\'ding\\'")).toBe("het 'ding'")
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
