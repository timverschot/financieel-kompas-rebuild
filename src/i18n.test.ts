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
