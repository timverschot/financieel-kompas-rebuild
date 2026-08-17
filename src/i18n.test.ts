import { describe, it, expect } from 'vitest'
import { vertaal, vertaalSleutels } from './i18n'

describe('vertaal', () => {
  it('geeft de Nederlandse sleutel ongewijzigd terug voor taal nl', () => {
    expect(vertaal('nl', 'Rekeningen')).toBe('Rekeningen')
  })

  it('vertaalt naar het Engels en Frans wanneer de vertaling bestaat', () => {
    expect(vertaal('en', 'Rekeningen')).toBe('Accounts')
    expect(vertaal('fr', 'Budgetten')).toBe('Budgets')
  })

  it('valt terug op het Nederlands als een vertaling nog ontbreekt', () => {
    expect(vertaal('en', 'Een niet-vertaalde tekst')).toBe('Een niet-vertaalde tekst')
    expect(vertaal('fr', 'Een niet-vertaalde tekst')).toBe('Een niet-vertaalde tekst')
  })

  it('vult parameters in de tekst in', () => {
    expect(vertaal('nl', 'Verwijder rekening {naam}', { naam: 'Zicht' })).toBe('Verwijder rekening Zicht')
  })

  it('laat een onbekende parameter-plaatshouder ongemoeid', () => {
    expect(vertaal('nl', 'Hallo {x}')).toBe('Hallo {x}')
  })
})

// Drietalig blijven vraagt discipline: een sleutel die je alleen in het Engels
// invult, geeft in het Frans stille Nederlandse tekst. Deze test merkt dat op.
describe('vertaaltabellen', () => {
  it('heeft voor elke Engelse sleutel ook een Franse, en omgekeerd', () => {
    const en = new Set(vertaalSleutels('en'))
    const fr = new Set(vertaalSleutels('fr'))
    expect([...en].filter((k) => !fr.has(k))).toEqual([])
    expect([...fr].filter((k) => !en.has(k))).toEqual([])
  })

  it('vertaalt de nieuwe teksten van ronde 44', () => {
    expect(vertaal('en', 'Uitwisselen met de andere ouder')).toBe('Exchange with the other parent')
    expect(vertaal('fr', 'Neem over')).toBe('Appliquer')
    expect(vertaal('en', '{n} kost(en) bijgewerkt of toegevoegd.', { n: 3 })).toBe('3 cost(s) updated or added.')
    // De waarschuwing die het verschil tussen twee huishoudens zichtbaar maakt,
    // moet in elke taal even duidelijk zijn: hier gaat geld over.
    expect(vertaal('fr', 'Let op: de andere ouder komt op {hun}, jij op {jouw}.', { hun: 'A', jouw: 'B' })).toContain(
      'Attention',
    )
    expect(vertaal('en', 'Vink alleen aan wat echt een andere kost is. Anders telt hetzelfde geld twee keer.')).toContain(
      'counts twice',
    )
  })

  it('vertaalt de nieuwe teksten van ronde 41', () => {
    expect(vertaal('en', 'Exporteer CSV')).toBe('Export CSV')
    expect(vertaal('fr', 'Bewijsmap')).toBe('Dossier de preuves')
    expect(vertaal('en', 'Maandrapport {periode}', { periode: 'March 2026' })).toBe('Monthly report March 2026')
    expect(vertaal('fr', 'Heel {jaar} als PDF', { jaar: 2026 })).toBe('Toute l’année 2026 en PDF')
    expect(vertaal('en', 'zie bijlage {n}', { n: 3 })).toBe('see attachment 3')
    expect(vertaal('en', '{bedrag} x {p}% = {jouw} voor jou, {partner} voor partner', {
      bedrag: '€ 120,00',
      p: 60,
      jouw: '€ 72,00',
      partner: '€ 48,00',
    })).toBe('€ 120,00 x 60% = € 72,00 for you, € 48,00 for partner')
    // De grens die het document zelf moet uitspreken, in alle drie de talen.
    expect(vertaal('en', 'Dit is geen juridisch advies en geen uitspraak over wie waar recht op heeft. De app rekent; de afspraak of de rechter beslist.')).toContain('not legal advice')
    expect(vertaal('fr', 'Dit is geen juridisch advies en geen uitspraak over wie waar recht op heeft. De app rekent; de afspraak of de rechter beslist.')).toContain('avis juridique')
  })

  it('vertaalt de nieuwe teksten van ronde 40', () => {
    expect(vertaal('en', 'Bekijk in Transacties ›')).toBe('View in Transactions ›')
    expect(vertaal('fr', 'Toon opbouw')).toBe('Afficher le détail')
    expect(vertaal('en', 'Boek {naam} in', { naam: 'Rent' })).toBe('Record Rent')
    expect(vertaal('fr', '{n} treffer(s) in {m} hoofdcategorie(ën)', { n: 3, m: 1 })).toBe(
      '3 résultat(s) dans 1 catégorie(s) principale(s)',
    )
    expect(vertaal('en', '{label} — open het dossier van {oms}', { label: 'shared', oms: 'Colruyt' })).toBe(
      'shared — open the case for Colruyt',
    )
  })

  it('vertaalt de nieuwe teksten van ronde 21', () => {
    expect(vertaal('en', 'Vaste last')).toBe('Fixed cost')
    expect(vertaal('fr', 'Sparen')).toBe('Épargner')
    expect(vertaal('en', 'Opslaan + volgende')).toBe('Save + next')
    expect(vertaal('fr', 'Wat wil je boeken?')).toBe('Que voulez-vous enregistrer ?')
  })

  it('vertaalt de nieuwe teksten van ronde 25', () => {
    expect(vertaal('en', 'Vaste inkomsten')).toBe('Recurring income')
    expect(vertaal('fr', 'Uitboeken')).toBe('Annuler l’écriture')
    expect(vertaal('en', 'Zoek een categorie')).toBe('Search for a category')
    expect(vertaal('fr', 'Nog geen vaste lasten.')).toBe('Pas encore de charges fixes.')
    expect(vertaal('en', '{naam} ingeboekt', { naam: 'Rent' })).toBe('Rent recorded')
  })

  it('vertaalt de nieuwe teksten van ronde 24', () => {
    expect(vertaal('en', 'Te verdelen')).toBe('Left to allocate')
    expect(vertaal('fr', 'Alle maanden')).toBe('Tous les mois')
    expect(vertaal('en', 'Categorie toekennen')).toBe('Assign category')
    expect(vertaal('fr', 'gedeeld')).toBe('partagé')
  })

  it('vertaalt de nieuwe teksten van ronde 23', () => {
    expect(vertaal('en', 'Te verdelen')).toBe('Left to allocate')
    expect(vertaal('fr', 'Om de 6 maanden')).toBe('Tous les 6 mois')
    expect(vertaal('en', 'Eerste betaling in')).toBe('First payment in')
    expect(vertaal('fr', 'Niet deze maand')).toBe('Pas ce mois-ci')
    expect(vertaal('en', '{naam} staat nog niet ingeboekt deze maand', { naam: 'Rent' })).toBe(
      'Rent has not been recorded this month yet',
    )
  })

  it('vertaalt de nieuwe teksten van ronde 22', () => {
    expect(vertaal('en', 'Meer opties')).toBe('More options')
    expect(vertaal('fr', 'Minder opties')).toBe("Moins d'options")
    expect(vertaal('en', 'Delen in een dossier (optioneel)')).toBe('Share in a case (optional)')
    expect(vertaal('fr', 'Niet delen')).toBe('Ne pas partager')
    expect(vertaal('en', 'Meer opties ({n} ingevuld)', { n: 2 })).toBe('More options (2 filled in)')
  })

  it('vertaalt de nieuwe teksten van ronde 18', () => {
    expect(vertaal('en', 'Op schema')).toBe('On track')
    expect(vertaal('fr', 'Achter op schema')).toBe('En retard')
    expect(vertaal('en', '{n} maanden buffer', { n: '5,2' })).toBe('5,2 months of buffer')
    expect(vertaal('fr', 'Vorige keer bij deze handelaar:')).toBe('La dernière fois chez ce commerçant :')
  })

  it('vertaalt de nieuwe teksten van ronde 17', () => {
    expect(vertaal('en', 'Je gegevens en je privacy')).toBe('Your data and your privacy')
    expect(vertaal('fr', 'Waar kan je besparen?')).toBe('Où pouvez-vous économiser ?')
    expect(vertaal('en', 'Budget {naam} is {pct}% verbruikt', { naam: 'Food', pct: 92 })).toBe('Budget Food is 92% used')
    expect(vertaal('fr', 'Overschot')).toBe('Excédent')
  })
})

// --- Twee vangnetten die ronde 38 heeft opgeleverd ---------------------------
//
// De pariteitstest hierboven controleert alleen dat EN en FR dezelfde SLEUTELS
// hebben. Twee fouten glipten daar doorheen, en allebei zie je ze pas wanneer een
// Franstalige gebruiker het scherm opent.

describe('vertalingen — vangnetten', () => {
  it('houdt in en en fr exact dezelfde plaatshouders als in het Nederlands', () => {
    // Een ontbrekende of verkeerd gespelde {plaatshouder} blijft letterlijk op het
    // scherm staan: "Netto vermogen {bedrag}".
    const plaatshouders = (tekst: string) => (tekst.match(/\{\w+\}/g) ?? []).sort().join(',')
    const fouten: string[] = []
    for (const taal of ['en', 'fr'] as const) {
      for (const sleutel of vertaalSleutels(taal)) {
        if (plaatshouders(sleutel) !== plaatshouders(vertaal(taal, sleutel))) fouten.push(`${taal}: ${sleutel}`)
      }
    }
    expect(fouten).toEqual([])
  })

  it('heeft geen lijmwoord als sleutel', () => {
    // Een sleutel als ' en ' — spatie ervóór én erna — is een voegwoord dat twee
    // stukken aan elkaar plakt. Zo'n sleutel overleeft geen enkele bewerking die
    // tekst trimt, en dan staat er ineens een Nederlands woord midden in een
    // Engelse zin. Bovendien geeft hij de vertaler geen enkele context.
    //
    // Achtervoegsels als ' · {bedrag} per maand opzij' mogen wél: die beginnen met
    // een spatie maar dragen hun eigen betekenis, en trimmen kost daar hooguit een
    // spatie, geen taal.
    const lijmwoorden = vertaalSleutels('en').filter((s) => s.startsWith(' ') && s.endsWith(' '))
    expect(lijmwoorden).toEqual([])
  })
})

describe('vertaaltabellen — ronde 43', () => {
  it('vertaalt de teksten van de kredietkaart', () => {
    expect(vertaal('en', 'Nog openstaand')).toBe('Still outstanding')
    expect(vertaal('fr', 'Afsluitdag van de kaart')).toBe('Jour d’arrêté de la carte')
    expect(vertaal('en', 'Dag waarop het bedrag afgeboekt wordt')).toBe('Day the amount is debited')
    expect(vertaal('en', 'Afgesloten op {datum}: {bedrag}', { datum: '26-07-2026', bedrag: '€ 1.250,00' })).toBe(
      'Closed on 26-07-2026: € 1.250,00',
    )
    expect(vertaal('fr', 'Afrekening boeken')).toBe('Encoder le décompte')
    // De grens die de knop zelf moet uitspreken: dit is geen uitgave.
    expect(
      vertaal('en', 'Dit wordt een overboeking, geen uitgave: de aankopen zelf zijn al geboekt op de kaart.'),
    ).toContain('not an expense')
  })
})

describe('vertaaltabellen — de maandafsluiting', () => {
  it('vertaalt de teksten van het nieuwe scherm', () => {
    expect(vertaal('en', 'Maandafsluiting')).toBe('Month close')
    expect(vertaal('fr', 'Maand afsluiten')).toBe('Clôturer le mois')
    expect(vertaal('en', '{n} boeking(en) in {maand}.', { n: 12, maand: 'June 2026' })).toBe(
      '12 entr(ies) in June 2026.',
    )
    expect(vertaal('fr', '{maand} is nog niet afgesloten.', { maand: '2026-06' })).toContain('pas encore clôturé')
    // De belofte van het scherm hoort in alle drie de talen te staan.
    expect(vertaal('en', 'Drie stappen, en dan is je maand rond. Vijf minuten, één keer per maand.')).toContain(
      'Five minutes',
    )
  })
})

describe('vertaaltabellen — de prijsstijgingen', () => {
  it('vertaalt de teksten van de nieuwe kaart', () => {
    expect(vertaal('en', 'Wat werd er duurder?')).toBe('What got more expensive?')
    expect(vertaal('fr', 'vaste last')).toBe('charge fixe')
    expect(vertaal('en', '{oud} → {nieuw} sinds {datum}', { oud: '€ 11,99', nieuw: '€ 13,99', datum: '5 mrt 2026' })).toBe(
      '€ 11,99 → € 13,99 since 5 mrt 2026',
    )
    // De app moet uitleggen hoe ze aan het cijfer komt, in alle drie de talen.
    expect(
      vertaal(
        'fr',
        'De app vergelijkt het bedrag dat bij dezelfde handelaar elke keer terugkomt. Ze kijkt achttien maanden terug, vraagt minstens zes betalingen, en zwijgt over winkels waar je bedrag elke keer anders is.',
      ),
    ).toContain('dix-huit mois')
  })
})

describe('vertaaltabellen — het fiscale jaaroverzicht', () => {
  it('vertaalt de teksten van het nieuwe scherm', () => {
    expect(vertaal('en', 'Fiscaal jaaroverzicht')).toBe('Annual tax overview')
    expect(vertaal('fr', 'Inkomstenjaar')).toBe('Année de revenus')
    expect(vertaal('en', 'Wat je in {jaar} betaalde, geef je aan in de aangifte van aanslagjaar {aj}.', {
      jaar: 2026,
      aj: 2027,
    })).toBe('What you paid in 2026 goes into the return for assessment year 2027.')
  })

  it('vertaalt de grens die het scherm over zichzelf uitspreekt', () => {
    // Dit is de zin die dit scherm ervan weerhoudt belastingadvies te lijken. Valt ze
    // in één taal terug op het Nederlands, dan is precies die grens weg.
    expect(
      vertaal(
        'fr',
        'De app verzamelt en telt op. Ze rekent niet uit wat je terugkrijgt: dat hangt af van je volledige aangifte. Dit is geen belastingadvies.',
      ),
    ).toContain('conseil fiscal')
    expect(
      vertaal(
        'en',
        'De lijst is die van België. Waar een post gewestelijk is, staat ze zoals ze in Vlaanderen geldt; in Brussel en Wallonië gelden andere regels.',
      ),
    ).toContain('Flanders')
  })

  it('heeft allebei de varianten van de aftrekbaar-zin', () => {
    // De ene zegt dat het percentage nog daalt, de andere niet. Ontbreekt er één, dan
    // beweert de app in die taal iets over de toekomst wat de wet niet vastlegt.
    expect(
      vertaal(
        'en',
        '{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde en daalt de komende jaren nog. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.',
        { pct: 60, bedrag: '€ 180,00' },
      ),
    ).toContain('drops further')
    expect(
      vertaal(
        'fr',
        '{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.',
        { pct: 50, bedrag: '€ 150,00' },
      ),
    ).toContain('ligne de compte')
  })

  it('vertaalt de kolomkoppen van het CSV-bestand', () => {
    // Het bestand gaat naar een boekhouder; een kop die terugvalt op het Nederlands
    // maakt van een Franstalig bestand een half-Nederlands bestand.
    expect(vertaal('fr', 'Totaal per post')).toBe('Total par rubrique')
    expect(vertaal('en', 'Komt in aanmerking')).toBe('Qualifying amount')
    expect(vertaal('fr', 'Aantal met bon')).toBe('Nombre avec justificatif')
  })

  it('vertaalt de namen van de fiscale posten', () => {
    expect(vertaal('en', 'Betaalde onderhoudsuitkeringen')).toBe('Maintenance payments you made')
    expect(vertaal('fr', 'Uitgaven voor kinderoppas')).toBe('Frais de garde d’enfants')
    expect(vertaal('en', 'Vak VIII')).toBe('Box VIII')
    expect(vertaal('fr', 'Vak X')).toBe('Cadre X')
  })
})

describe('vertaaltabellen — de opruimronde', () => {
  it('vertaalt de nieuwe kolom en de nieuwe tegelknoppen', () => {
    // De kolomkop belandt in een bestand dat je doorstuurt; de knoptekst is de
    // toegankelijke naam die een schermlezer voorleest. Allebei mogen ze niet stil
    // terugvallen op het Nederlands.
    expect(vertaal('en', 'Gezinslid')).toBe('Family member')
    expect(vertaal('fr', 'Gezinslid')).toBe('Membre du foyer')
    expect(
      vertaal('en', 'Uitgaven {bedrag} — toon alleen deze boekingen', { bedrag: '€ 30,00' }),
    ).toContain('show only these entries')
    expect(
      vertaal('fr', 'Inkomsten {bedrag} — toon alleen deze boekingen', { bedrag: '€ 30,00' }),
    ).toContain('opérations')
  })
})
