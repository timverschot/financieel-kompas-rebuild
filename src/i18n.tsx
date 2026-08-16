import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Meertaligheid (NL/EN/FR). Bewust eenvoudig gehouden: de SLEUTEL is de
// Nederlandse tekst zelf. Ontbreekt een vertaling voor de gekozen taal, dan valt
// de app terug op het Nederlands. Zo werkt alles altijd — ook zolang EN/FR nog
// niet volledig ingevuld zijn — en kunnen teksten geleidelijk door t() lopen.
//
// Opgeslagen (interne) waarden — categorie-id's, rekeningtypes, kindnamen — blijven
// taal-onafhankelijk; enkel de weergave wordt vertaald.

export type Taal = 'nl' | 'en' | 'fr'

export const TALEN: { waarde: Taal; label: string }[] = [
  { waarde: 'nl', label: 'Nederlands' },
  { waarde: 'en', label: 'English' },
  { waarde: 'fr', label: 'Français' },
]

// Vertaaltabellen: Nederlandse tekst -> vertaling. Wat (nog) ontbreekt, valt
// automatisch terug op het Nederlands. Plaatshouders zoals {naam} blijven staan.
const en: Record<string, string> = {
  // Algemeen
  'Annuleer': 'Cancel',
  '— kies —': '— choose —',
  'optioneel': 'optional',
  'Geen categorie': 'No category',
  'Toevoegen': 'Add',
  'Wijzigen': 'Update',
  'Bewaar': 'Save',
  'onbekende fout': 'unknown error',
  // App — kop & maandoverzicht
  'Rekeningen, categorieën, budgetten en transacties — met backup en synchronisatie':
    'Accounts, categories, budgets and transactions — with backup and sync',
  'Taal': 'Language',
  'Laden…': 'Loading…',
  'Let op: {n} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.':
    'Note: {n} record(s) were skipped because they did not match the schema.',
  'Maandoverzicht': 'Monthly overview',
  'Vorige maand': 'Previous month',
  'Volgende maand': 'Next month',
  'Inkomsten': 'Income',
  'Uitgaven': 'Expenses',
  'Netto': 'Net',
  'Uitgaven per maand': 'Expenses per month',
  'Inkomsten per categorie': 'Income per category',
  // App — rekeningen
  'Rekeningen': 'Accounts',
  'startsaldo {saldo}': 'starting balance {saldo}',
  'gearchiveerd': 'archived',
  'Bewerk rekening {naam}': 'Edit account {naam}',
  'Archiveer rekening {naam}': 'Archive account {naam}',
  'Herstel rekening {naam}': 'Restore account {naam}',
  'Verwijder rekening {naam}': 'Delete account {naam}',
  'archiveer': 'archive',
  'herstel': 'restore',
  // App — categorieën
  'Categorieën': 'Categories',
  'Bewerk categorie {naam}': 'Edit category {naam}',
  'Verwijder categorie {naam}': 'Delete category {naam}',
  // App — budgetten
  'Budgetten': 'Budgets',
  'voor {maand}': 'for {maand}',
  'Nog geen budgetten ingesteld.': 'No budgets set yet.',
  'Verwijder budget {naam}': 'Delete budget {naam}',
  // App — transacties
  'Transactie bewerken': 'Edit transaction',
  'Transactie toevoegen': 'Add transaction',
  'Bewerk {oms}': 'Edit {oms}',
  'Verwijder {oms}': 'Delete {oms}',
  'Saldo': 'Balance',
  // App — back-up & drive
  'Back-up & herstel': 'Backup & restore',
  'Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.':
    'A separate safety net on your own device, independent of Google Drive. Keep the file somewhere safe; restoring only adds and never overwrites.',
  'Exporteer back-up': 'Export backup',
  'Herstel uit back-up': 'Restore from backup',
  'Back-up gedownload.': 'Backup downloaded.',
  'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig.':
    'Restored: {toegevoegd} added, {overgeslagen} already present, {ongeldig} invalid.',
  'Herstellen mislukte: {fout}': 'Restore failed: {fout}',
  'Verbind met Google Drive': 'Connect to Google Drive',
  'Synchroniseer nu': 'Sync now',
  'Bezig…': 'Working…',
  'Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.':
    'Synced: {gepusht} sent, {opgehaald} received.',
  'Automatisch gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.':
    'Auto-synced: {gepusht} sent, {opgehaald} received.',
  'Verbinden mislukte: {fout}': 'Connection failed: {fout}',
  'Synchroniseren mislukte: {fout}': 'Sync failed: {fout}',
  // Undo-meldingen
  'Ongedaan maken': 'Undo',
  'Rekening verwijderd': 'Account deleted',
  'Categorie verwijderd': 'Category deleted',
  'Budget verwijderd': 'Budget deleted',
  'Dossier verwijderd': 'Case deleted',
  'Kost verwijderd': 'Expense deleted',
  'Spaardoel verwijderd': 'Savings goal deleted',
  'Subcategorie verwijderd': 'Subcategory deleted',
  'Vaste post verwijderd': 'Recurring item deleted',
  'Transactie verwijderd': 'Transaction deleted',
  'Overboeking verwijderd': 'Transfer deleted',
  // Rekeningformulier
  'Rekeningnaam': 'Account name',
  'Type': 'Type',
  'Beginsaldo (€)': 'Starting balance (€)',
  'Rekeningnummer (IBAN)': 'Account number (IBAN)',
  'BE.. (optioneel)': 'BE.. (optional)',
  'Rubriek': 'Group',
  'optionele groepsnaam': 'optional group name',
  'Rekening wijzigen': 'Update account',
  'Rekening toevoegen': 'Add account',
  'Betaalrekening': 'Current account',
  'Spaarrekening': 'Savings account',
  'Termijnrekening': 'Term account',
  'Effectenrekening': 'Securities account',
  'Breng je situatie in kaart': 'Map out your situation',
  'Breng in kaart wat er vastligt. Loop de blokken door die op jou van toepassing zijn — je mag er elk overslaan en later terugkomen.': 'Map out what is committed. Work through the blocks that apply to you — you may skip any of them and come back later.',
  'Nog geen rekeningen. Vul het formulier in, of begin bij je situatie.': 'No accounts yet. Fill in the form, or start with your situation.',
  'Nog niets geboekt deze maand. Voeg een transactie toe, of lees een bankuittreksel in.': 'Nothing booked this month yet. Add a transaction, or import a bank statement.',
  '{gedaan} van {totaal} aangevinkt.': '{gedaan} of {totaal} ticked.',
  // Ronde 39 — De Opstelling
  'Je situatie': 'Your situation',
  'Dit is je situatie': 'This is your situation',
  'Vaste lasten per maand': 'Fixed costs per month',
  'Waarvan sluipend': 'Of which subscriptions',
  'Zo lang kom je toe': 'How long you can get by',
  'Netto vermogen': 'Net worth',
  '{n} maanden': '{n} months',
  'Je sluipende kosten zijn {maand} per maand, oftewel {jaar} per jaar.': 'Your small subscriptions come to {maand} a month, or {jaar} a year.',
  'Ingevulde blokken': 'Blocks filled in',
  'Je hebt alle blokken ingevuld. Je kan hier altijd terugkomen om iets bij te werken.': 'You have filled in every block. You can always come back here to update something.',
  '{klaar} van {totaal} blokken ingevuld. Wat je overslaat, kan je later nog aanvullen.': '{klaar} of {totaal} blocks filled in. Whatever you skip, you can add later.',
  'Naar je overzicht': 'To your overview',
  'Onderdeel': 'Section',
  'Je geld': 'Your money',
  'Voor later': 'For later',
  'Vaste kosten': 'Fixed costs',
  'Sluipende kosten': 'Small subscriptions',
  'Je gezin': 'Your family',
  'Delen': 'Sharing',
  'Waar staat je geld?': 'Where is your money?',
  'Je betaalrekening, je spaarrekening, je portemonnee. Voeg ze één voor één toe; het formulier blijft staan.': 'Your current account, your savings account, your wallet. Add them one by one; the form stays put.',
  'Nog geen rekeningen. Begin met de rekening waar je loon op komt.': 'No accounts yet. Start with the account your salary lands in.',
  'Een kredietkaart of kredietopening?': 'A credit card or credit line?',
  'Nog geen kredietkaart ingegeven.': 'No credit card entered yet.',
  'Een lening, hypotheek of autofinanciering?': 'A loan, mortgage or car finance?',
  'Wat je nog moet terugbetalen, gaat af van je vermogen. Wat je hebt uitgeleend, komt erbij.': 'What you still owe comes off your net worth. What you lent out is added to it.',
  'Nog geen leningen ingegeven.': 'No loans entered yet.',
  'Wat staat er voor later?': 'What is set aside for later?',
  'Beleggingen, een termijnrekening, pensioensparen. Kies bij Type "Effectenrekening" of "Termijnrekening"; je kan de waarde later bijwerken bij de rekening zelf.': 'Investments, a term account, pension savings. Pick "Securities account" or "Term account" under Type; you can update the value later on the account itself.',
  'Nog niets voor later ingegeven.': 'Nothing set aside for later yet.',
  'Je vaste kosten': 'Your fixed costs',
  'Vink aan wat je betaalt en tik het bedrag in. Herkennen gaat sneller dan bedenken.': 'Tick what you pay and type the amount. Recognising is quicker than remembering.',
  'Je sluipende kosten': 'Your small subscriptions',
  'De kleine abonnementen waar je nooit meer naar omkijkt. Samen zijn ze vaak groter dan je denkt.': 'The small subscriptions you never look at again. Together they are often bigger than you think.',
  'Staat het er niet bij? Je kan altijd zelf iets toevoegen op de Budget-pagina.': 'Not in the list? You can always add something yourself on the Budget page.',
  'Naar Budget': 'To Budget',
  'Naar Dossiers': 'To Cases',
  'Deel je kosten met iemand?': 'Do you share costs with someone?',
  'Bijvoorbeeld met de andere ouder van je kinderen. Kompal houdt dan bij wie wat betaalde en rekent het voor je af.': 'With the other parent of your children, for instance. Kompal then tracks who paid what and settles it for you.',
  'Nog geen dossiers. Maak er hieronder een aan, of sla dit blok over.': 'No cases yet. Create one below, or skip this block.',
  '{n}% voor jou': '{n}% for you',
  'Uitgeleend geld en aankopen met garantie horen ook bij Dossiers.': 'Money you lent out and purchases with a warranty belong under Cases too.',
  'Tip: begin bij "Je geld". Zonder rekening kan de app nog niets uitrekenen.': 'Tip: start with "Your money". Without an account the app cannot work anything out yet.',
  'Maak eerst een rekening aan bij "Je geld" — een vaste kost moet ergens vanaf gaan.': 'First create an account under "Your money" — a fixed cost has to come off something.',
  '{naam} toegevoegd: {bedrag}, van {rekening}.': '{naam} added: {bedrag}, from {rekening}.',
  'Toevoegen is niet gelukt. Probeer het opnieuw.': 'Adding failed. Please try again.',
  'Voeg {naam} toe': 'Add {naam}',
  'bedrag': 'amount',
  'toegevoegd': 'added',
  'meestal één keer per jaar': 'usually once a year',
  'Nog geen inkomsten deze maand.': 'No income this month yet.',
  'Zodra je een rekening hebt toegevoegd, zie je hier hoe je bezit evolueert.': 'Once you have added an account, you will see how your assets evolve here.',
  'Je hebt nog geen vaste lasten ingesteld. Zonder die weet de app niet wat er nog moet komen.': 'You have not set up any fixed costs yet. Without them the app cannot know what is still coming.',
  'Je hebt nog geen eigen categorieën. De ingebouwde boom staat hieronder.': 'You have no categories of your own yet. The built-in tree is below.',
  'Loop "Je situatie" door: je rekeningen, je vaste kosten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.':
    'Work through "Your situation": your accounts, your fixed costs and your subscriptions. After ten minutes you will know what is committed each month and what you are worth — before you enter a single transaction.',
  'Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig. Voeg er een toe bij "Je geld".':
    'For "how long you can get by" the app needs a savings account or cash. Add one under "Your money".',
  'Hypotheek': 'Mortgage',
  'Elektriciteit en gas': 'Electricity and gas',
  'Je maandelijkse voorschot': 'Your monthly advance payment',
  'Water': 'Water',
  'Internet, tv en gsm': 'Internet, TV and mobile',
  'Brand- en familiale verzekering': 'Home and liability insurance',
  'Autoverzekering': 'Car insurance',
  'Hospitalisatieverzekering': 'Hospitalisation insurance',
  'Schuldsaldoverzekering': 'Mortgage life insurance',
  'Autolening': 'Car loan',
  'Onroerende voorheffing': 'Property tax',
  'Gemeentebelasting': 'Municipal tax',
  'Syndicus of gemeenschappelijke kosten': 'Building manager or shared costs',
  'Schoolkosten': 'School costs',
  'Kinderopvang': 'Childcare',
  'Abonnement openbaar vervoer': 'Public transport pass',
  'Vakbond': 'Trade union',
  'Mutualiteit': 'Health insurance fund',
  'Huisvuil': 'Household waste',
  'Fitness': 'Gym',
  'Sportclub': 'Sports club',
  'App- of software-abonnement': 'App or software subscription',
  'Cloudopslag': 'Cloud storage',
  'Krant': 'Newspaper',
  'Tijdschrift': 'Magazine',
  'Gift aan een goed doel': 'Donation to charity',
  'Domeinnaam of webhosting': 'Domain name or web hosting',
  'Gaming-abonnement': 'Gaming subscription',
  'Dating-app': 'Dating app',
  'Online opleiding': 'Online course',
  'Luisterboeken': 'Audiobooks',
  'Let op: de boekingen tot en met {datum} zitten al in de waarde die je toen hebt vastgelegd. Ze tellen hieronder wel mee, maar niet meer in het saldo bovenaan.': 'Note: the transactions up to and including {datum} are already part of the value you recorded then. They still count below, but no longer in the balance at the top.',
  'geldt nu': 'in effect',
  // Doorklikken van een cijfer naar zijn boekingen (ronde 48/49)
  'Het gezin (zonder gezinslid)': 'The household (no family member)',
  'Wat aan niemand persoonlijk hangt, staat bij "Het gezin". Een kost voor meerdere gezinsleden wordt gelijk verdeeld; zo’n aandeel bestaat niet als aparte boeking, dus die rij klikt niet door.':
    'Anything not tied to one person is listed under "The household". A cost for several family members is split equally; such a share does not exist as a separate transaction, so that row does not link through.',
  'Subcategorieën — brood, koffiekoeken, elektriciteit… Klik je door, dan zie je de volledige boeking, dus een gesplitst kassaticket komt in zijn geheel in beeld.':
    'Subcategories — bread, pastries, electricity… Clicking through shows the whole transaction, so a split receipt appears in full.',
  'Inkomsten {bedrag} — bekijk de boekingen': 'Income {bedrag} — view the transactions',
  'Uitgaven {bedrag} — bekijk de boekingen': 'Spending {bedrag} — view the transactions',
  'Netto {bedrag} — bekijk alle boekingen van deze maand': 'Net {bedrag} — view all transactions for this month',
  '{maand} — bekijk de boekingen': '{maand} — view the transactions',
  'Verschil {bedrag} — bekijk de boekingen van deze maand': 'Difference {bedrag} — view this month’s transactions',
  '{oms} {bedrag} op {datum} — open deze boeking': '{oms} {bedrag} on {datum} — open this transaction',
  'Bekijk ze allemaal': 'View them all',
  '{naam} {pct}% {bedrag} — bekijk de boekingen': '{naam} {pct}% {bedrag} — view the transactions',
  'Uit je boeking van {datum}: {oms} — {bedrag}. Open die boeking.':
    'From your transaction of {datum}: {oms} — {bedrag}. Open that transaction.',
  'Bekijk die boekingen': 'View those transactions',
  'Bekijk die boekingen — er kwam deze maand {gekregen} binnen':
    'View those transactions — {gekregen} came in this month',
  'Netto vermogen {bedrag} — bekijk het op je overzicht': 'Net worth {bedrag} — see it on your overview',
  // Twee indexreeksen door elkaar (ronde 47)
  'De app rekent niet meer met deze regeling. De indexcijfers die je zelf bijzette staan in basis {eigen} = 100, en de tabel in de app staat nu in basis {tabel} = 100. Dat zijn twee verschillende maatstaven; ze combineren geeft een bedrag dat er tientallen procenten naast zit. Verwijder je eigen cijfers hieronder en zet ze opnieuw met de cijfers uit de huidige reeks.':
    'The app no longer calculates with this arrangement. The index figures you added yourself are on base {eigen} = 100, while the table in the app is now on base {tabel} = 100. Those are two different yardsticks; combining them gives an amount that is tens of percent off. Remove your own figures below and enter them again using the current series.',
  'De app rekent niet met deze regeling. Je vulde zelf aanvangsindex {eigen} in, maar voor {maand} kent de app {tabel}. Dat verschil wijst erop dat je cijfer uit een oudere indexreeks komt (de index wordt om de zoveel jaar herbaseerd). Combineren met de tabel geeft een bedrag dat er tientallen procenten naast zit. Klopt {tabel} met je akte, laat het veld dan leeg. Klopt het niet, vul dan ook de cijfers van {maanden} zelf in, uit dezelfde reeks als je akte.':
    'The app does not calculate with this arrangement. You entered starting index {eigen} yourself, but for {maand} the app has {tabel}. That difference suggests your figure comes from an older index series (the index is rebased every so many years). Combining it with the table gives an amount that is tens of percent off. If {tabel} matches your deed, leave the field empty. If it does not, also enter the figures for {maanden} yourself, from the same series as your deed.',
  'De app rekent niet met deze regeling. Je vulde de aanvangsindex zelf in, maar de jaarlijkse cijfers zou de app uit haar eigen tabel halen (basis {tabel} = 100). Staat je akte in een oudere reeks, dan zit het bedrag er tientallen procenten naast. Vul daarom ook de indexcijfers van {maanden} zelf in, uit dezelfde reeks als je akte.':
    'The app does not calculate with this arrangement. You entered the starting index yourself, but the app would take the yearly figures from its own table (base {tabel} = 100). If your deed uses an older series, the amount is tens of percent off. So also enter the index figures for {maanden} yourself, from the same series as your deed.',
  'De onderhoudsbijdrage van {dossier} wordt niet meer geïndexeerd: de indexcijfers komen uit twee verschillende reeksen. Open de regeling om het op te lossen.':
    'The maintenance payment for {dossier} is no longer being indexed: the index figures come from two different series. Open the arrangement to resolve it.',
  'De indexatie kon niet berekend worden omdat de gebruikte indexcijfers niet uit dezelfde reeks komen. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.':
    'The indexation could not be calculated because the index figures used do not come from the same series. Below is therefore still the amount from the arrangement itself: {basis} per month.',
  'De verjaardagen zijn niet berekend, omdat de gebruikte indexcijfers niet uit dezelfde reeks komen.':
    'The anniversaries have not been calculated, because the index figures used do not come from the same series.',
  'het bedrag uit de regeling van {datum}; de indexatie is niet berekend':
    'the amount from the arrangement of {datum}; the indexation has not been calculated',
  'De opbouw is niet berekend, want de indexcijfers komen niet uit dezelfde reeks. Bovenaan de kaart staat wat er moet gebeuren.':
    'The breakdown has not been calculated, because the index figures do not come from the same series. What needs to happen is stated at the top of the card.',
  'De brief staat uit zolang de indexcijfers niet uit dezelfde reeks komen: ze zou een bedrag bevatten dat de app niet kan verantwoorden.':
    'The letter is switched off as long as the index figures do not come from the same series: it would contain an amount the app cannot account for.',
  'Wat er openstaat is niet te berekenen: elke maand zou hier aan het bedrag uit de regeling geteld worden, zonder de indexatie. Het echte bedrag ligt hoger. Los eerst de indexcijfers bovenaan op.':
    'What is outstanding cannot be calculated: every month would be counted here at the amount from the arrangement, without the indexation. The real amount is higher. First resolve the index figures at the top.',
  'Je eerdere indexcijfers stonden in basis {oud} = 100 en zijn verwijderd. Zet ze opnieuw met de cijfers uit de huidige reeks.':
    'Your earlier index figures were on base {oud} = 100 and have been removed. Enter them again using the figures from the current series.',
  'Kies eerst van welke rekening naar welke rekening je overboekt.':
    'First choose which account you are transferring from and to.',
  // De eenheid van een logregel (ronde 46)
  'Dit bestand komt van een oudere versie van de app. De bedragen erin zijn niet betrouwbaar te lezen; vraag de andere ouder om een nieuw bestand.':
    'This file comes from an older version of the app. Its amounts cannot be read reliably; ask the other parent for a new file.',
  'Let op: van {n} regel(s) kan de app niet zien in welke eenheid de bedragen staan. Ze zijn daarom NIET ingelezen: als eenheid gelezen zou € 2.400 er als € 24 komen te staan. Er is niets van je huidige gegevens veranderd. Komen die regels van een ander toestel, werk de app daar dan ook bij.':
    'Note: for {n} record(s) the app cannot tell what unit the amounts are in. They were therefore NOT imported: read in the wrong unit, €\u00a02,400 would show up as €\u00a024. Nothing in your current data has changed. If those records come from another device, update the app there too.',
  'Let op: {n} regel(s) komen van een toestel met een NIEUWERE versie van de app. Deze app kan ze nog niet lezen, dus ze zijn niet ingelezen. Werk deze app bij (sluit hem helemaal af en open hem opnieuw) en probeer het dan nog eens.':
    'Note: {n} record(s) come from a device running a NEWER version of the app. This app cannot read them yet, so they were not imported. Update this app (close it completely and reopen it) and try again.',
  'Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet leesbaar.':
    'Synced: {gepusht} sent, {opgehaald} received, {geweigerd} unreadable.',
  'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig, {verouderd} uit een te oude versie (niet ingelezen).':
    'Restored: {toegevoegd} added, {overgeslagen} already present, {ongeldig} invalid, {verouderd} from too old a version (not imported).',
  // Product opzoeken (ronde 45)
  'De camera doet het niet': 'The camera is not working',
  'Streepjescode {code} staat niet in de databank. Typ de naam zelf.':
    'Barcode {code} is not in the database. Type the name yourself.',
  'Niets gevonden. Typ de naam zelf.': 'Nothing found. Type the name yourself.',
  'Product opzoeken': 'Look up product',
  'Of typ de streepjescode': 'Or type the barcode',
  'Of zoek op productnaam': 'Or search by product name',
  'Opzoeken': 'Look up',
  'bijv. 5410041001008': 'e.g. 5410041001008',
  'bijv. choco of volle melk': 'e.g. chocolate spread or whole milk',
  'Een streepjescode heeft 8, 12, 13 of 14 cijfers.': 'A barcode has 8, 12, 13 or 14 digits.',
  'Zoeken…': 'Searching…',
  'Niets gevonden. Probeer een ander woord, of typ de omschrijving zelf.':
    'Nothing found. Try another word, or type the description yourself.',
  'Houd de code een handbreedte van de lens en zorg voor licht. Lukt het niet? Typ de code of zoek op naam.':
    'Hold the code a hand’s width from the lens and make sure there is light. Not working? Type the code or search by name.',
  // Uitwisselen met de andere ouder (ronde 44)
  'Categorie (optioneel)': 'Category (optional)',
  'Subcategorie (optioneel)': 'Subcategory (optional)',
  'minder': 'less',
  'Intrekken': 'Withdraw',
  'Terugdraaien': 'Undo',
  'Dit is dezelfde': 'This is the same one',
  'Toch niet dezelfde': 'Not the same after all',
  'Ingetrokken': 'Withdrawn',
  'telt niet mee in het saldo': 'does not count towards the balance',
  'Wat de andere ouder van jouw kosten vindt': 'What the other parent thinks of your costs',
  'Ingetrokken. Stuur het bestand door zodat de andere ouder het ziet.':
    'Withdrawn. Send the file so the other parent sees it.',
  'De intrekking is teruggedraaid.': 'The withdrawal has been undone.',
  'Over de {n} kost(en) in dit bestand komen jullie allebei op {bedrag} uit. Je eigen kosten zitten er niet in.':
    'Over the {n} cost(s) in this file you both arrive at {bedrag}. Your own costs are not included.',
  'Vink alleen aan wat echt een andere kost is. Anders telt hetzelfde geld twee keer. Is het dezelfde kost, kies dan "Dit is dezelfde" — anders komt ze elke ronde opnieuw terug.':
    'Only tick what really is a different cost. Otherwise the same money counts twice. If it is the same cost, choose "This is the same one" \u2014 otherwise it returns every round.',
  '{n} kost(en) liggen hier vast (afgerekend, ingetrokken of in een afrekening) en blijven zoals ze zijn.':
    '{n} cost(s) are fixed here (settled, withdrawn or part of a settlement) and stay as they are.',
  'De andere ouder trekt in: {namen}. Ze blijven staan, maar tellen niet meer mee.':
    'The other parent withdraws: {namen}. They stay visible, but no longer count.',
  'Uitwisselen met de andere ouder': 'Exchange with the other parent',
  '1. Doorsturen': '1. Send',
  '2. Inlezen wat je kreeg': '2. Read what you received',
  '3. Je antwoord': '3. Your answer',
  'Bestand klaarzetten': 'Prepare file',
  'Kies een uitwisselbestand': 'Choose an exchange file',
  'Neem over': 'Apply',
  'Akkoord': 'Agree',
  'Betwist': 'Dispute',
  'percentage zoals opgegeven door de andere ouder': 'percentage as given by the other parent',
  'Nieuw voor jou': 'New to you',
  'Gewijzigd door de andere ouder': 'Changed by the other parent',
  'Lijkt op een kost die je al hebt': 'Looks like a cost you already have',
  'Reden (alleen bij betwisten)': 'Reason (only when disputing)',
  'Reden om {naam} te betwisten': 'Reason for disputing {naam}',
  'betaald door de andere ouder': 'paid by the other parent',
  'betaald door jou': 'paid by you',
  'Bij jou: {bedrag} op {datum}': 'At your end: {bedrag} on {datum}',
  'Er gaan {n} kost(en) mee, samen {bedrag}. Alleen wat nog niet afgerekend is. Je stuurt het bestand door zoals je een foto doorstuurt; de andere ouder leest het in zijn eigen Financieel Kompas in.':
    '{n} cost(s) will be included, {bedrag} in total. Only what has not been settled yet. You send the file the way you send a photo; the other parent reads it into their own Financieel Kompas.',
  'Ook de kosten meesturen die de andere ouder betaalde': 'Also include the costs the other parent paid',
  'Standaard uit: die staan bij hem al, en dan krijgt hij ze van jou terug als vermoedelijke dubbel.':
    'Off by default: they already have those, and would get them back from you as a suspected duplicate.',
  'Bonnen meesturen': 'Include receipts',
  'Maakt het bestand een stuk groter. Zonder bonnen blijft het klein genoeg om te mailen.':
    'Makes the file considerably larger. Without receipts it stays small enough to email.',
  'De app legt het bestand eerst naast dit dossier. Er verandert niets tot je het bevestigt.':
    'The app first lays the file next to this case. Nothing changes until you confirm.',
  'Wat je hier antwoordt, reist mee in het volgende bestand dat je klaarzet. Betwist een kost liever dan hem te verwijderen: verwijder je hem, dan komt hij bij de volgende uitwisseling gewoon terug.':
    'What you answer here travels along in the next file you prepare. Dispute a cost rather than deleting it: if you delete it, it simply comes back at the next exchange.',
  'Er staan nog geen kosten van de andere ouder in dit dossier.':
    'There are no costs from the other parent in this case yet.',
  'Uit het dossier "{naam}", klaargezet op {datum}.': 'From the case "{naam}", prepared on {datum}.',
  'Jullie komen allebei op {bedrag} uit.': 'You both arrive at {bedrag}.',
  'De andere ouder komt op {hun}, jij op {jouw}. Eén cent verschil, door afronding.':
    'The other parent arrives at {hun}, you at {jouw}. One cent apart, due to rounding.',
  'Let op: de andere ouder komt op {hun}, jij op {jouw}.':
    'Note: the other parent arrives at {hun}, you at {jouw}.',
  'Vink alleen aan wat echt een andere kost is. Anders telt hetzelfde geld twee keer.':
    'Only tick what really is a different cost. Otherwise the same money counts twice.',
  '{n} kost(en) staan er al en zijn ongewijzigd.': '{n} cost(s) are already there and unchanged.',
  '{n} kost(en) zitten al vast in een afrekening en blijven zoals ze zijn.':
    '{n} cost(s) are already locked into a settlement and stay as they are.',
  '{n} kost(en) staan in een ander dossier ({naam}) en worden hier niet nog eens ingelezen.':
    '{n} cost(s) are in another case ({naam}) and will not be read in here again.',
  '{n} antwoord(en) op jouw kosten. Die worden altijd overgenomen.':
    '{n} answer(s) to your costs. Those are always applied.',
  '{n} kost(en) heeft de andere ouder ingetrokken. Ze blijven staan, maar tellen niet meer mee.':
    'The other parent withdrew {n} cost(s). They stay visible, but no longer count.',
  '{n} antwoord(en) horen bij een kost die hier niet (meer) staat.':
    '{n} answer(s) belong to a cost that is no longer here.',
  '{n} kost(en) gebruiken een andere verdeelsleutel dan dit dossier. De app houdt het percentage van de andere ouder aan, zodat jullie hetzelfde bedrag zien.':
    '{n} cost(s) use a different split than this case. The app keeps the other parent\u2019s percentage, so you both see the same amount.',
  '{n} regel(s) in het bestand waren onleesbaar en zijn overgeslagen.':
    '{n} line(s) in the file were unreadable and were skipped.',
  '{naam} klaargezet: {n} kost(en).': '{naam} prepared: {n} cost(s).',
  '{naam} klaargezet: {n} kost(en). {b} bon(nen) waren te groot om mee te sturen.':
    '{naam} prepared: {n} cost(s). {b} receipt(s) were too large to include.',
  'Het bestand kon niet klaargezet worden.': 'The file could not be prepared.',
  'Het bestand kon niet gelezen worden.': 'The file could not be read.',
  'Dit bestand komt van een nieuwere versie van de app. Werk eerst bij.':
    'This file comes from a newer version of the app. Update first.',
  'Dit bestand is te groot om in te lezen.': 'This file is too large to read.',
  'Dit is geen uitwisselbestand van Financieel Kompas.': 'This is not a Financieel Kompas exchange file.',
  'Er viel niets over te nemen.': 'There was nothing to apply.',
  '{n} kost(en) bijgewerkt of toegevoegd.': '{n} cost(s) updated or added.',
  'Het overnemen is niet gelukt. Er is niets gewijzigd.': 'Applying failed. Nothing was changed.',
  'Genoteerd als akkoord. Stuur het bestand door zodat de andere ouder het ziet.':
    'Recorded as agreed. Send the file so the other parent sees it.',
  'Genoteerd als betwist. Stuur het bestand door zodat de andere ouder het ziet.':
    'Recorded as disputed. Send the file so the other parent sees it.',
  'Je antwoord kon niet bewaard worden.': 'Your answer could not be saved.',
  '{n} kost(en) al beantwoord.': '{n} cost(s) already answered.',
  'De andere ouder betwist {n} kost(en). {rest}': 'The other parent disputes {n} cost(s). {rest}',
  '{k} kost(en) klaar om door te sturen.': '{k} cost(s) ready to send.',
  '{n} kost(en) van de andere ouder wachten op je antwoord.':
    '{n} cost(s) from the other parent are waiting for your answer.',
  'Niets om door te sturen: er staan geen open kosten in dit dossier.':
    'Nothing to send: there are no open costs in this case.',
  '{n} kost(en) klaar om door te sturen, samen {bedrag}.': '{n} cost(s) ready to send, {bedrag} in total.',
  'Uitwisseling met de andere ouder': 'Exchange with the other parent',
  'betwist door de andere ouder': 'disputed by the other parent',
  'aanvaard door de andere ouder': 'accepted by the other parent',
  'waarvan {n} betwist door de andere ouder': 'of which {n} disputed by the other parent',
  // Prijsstijgingen (ronde 43)
  'Wat werd er duurder?': 'What got more expensive?',
  'Nog niets gevonden. Daar is minstens een half jaar aan boekingen bij dezelfde handelaar voor nodig.':
    'Nothing found yet. That needs at least half a year of entries with the same merchant.',
  '{duurder} per maand duurder, {goedkoper} goedkoper — netto {netto} per maand.':
    '{duurder} a month more expensive, {goedkoper} cheaper — net {netto} a month.',
  '{bedrag} per maand duurder dan voorheen, over {n} post(en).':
    '{bedrag} a month more expensive than before, across {n} item(s).',
  '{bedrag} per maand goedkoper dan voorheen.': '{bedrag} a month cheaper than before.',
  '{oud} → {nieuw} sinds {datum}': '{oud} → {nieuw} since {datum}',
  'per maand': 'a month',
  'vaste last': 'fixed cost',
  'nog onzeker': 'not certain yet',
  'Je vaste last staat op een ander bedrag dan wat je nu betaalt. Pas ze aan bij Budget.':
    'Your fixed cost holds a different amount from what you now pay. Change it under Budget.',
  'Nog {n} andere, kleinere wijzigingen.': '{n} more, smaller changes.',
  'De app vergelijkt het bedrag dat bij dezelfde handelaar elke keer terugkomt. Ze kijkt achttien maanden terug, vraagt minstens zes betalingen, en zwijgt over winkels waar je bedrag elke keer anders is.':
    'The app compares the amount that recurs with the same merchant. It looks eighteen months back, asks for at least six payments, and stays quiet about shops where your amount differs every time.',
  'Je terugkerende kosten liggen intussen {bedrag} per maand hoger dan voorheen. Op Analyse staat wat er precies duurder werd.':
    'Your recurring costs are now {bedrag} a month higher than before. Analysis shows exactly what got more expensive.',
  'Verberg': 'Hide',
  'Toon': 'Show',
  // De maandafsluiting (ronde 43)
  'Maandafsluiting': 'Month close',
  'Drie stappen, en dan is je maand rond. Vijf minuten, één keer per maand.':
    'Three steps and your month is done. Five minutes, once a month.',
  'Welke maand sluit je af?': 'Which month are you closing?',
  'Er staan nog {n} maanden open. Werk de oudste eerst af, dan sluiten je cijfers op elkaar aan.':
    '{n} months are still open. Do the oldest first, so your figures follow on from each other.',
  'Stap 1': 'Step 1',
  'Stap 2': 'Step 2',
  'Stap 3': 'Step 3',
  'Staat alles erin?': 'Is everything in?',
  'Lees je bankuittreksel in, of tik de laatste boekingen zelf bij.':
    'Import your bank statement, or type in the last few entries yourself.',
  'Er staat nog geen enkele boeking in {maand}.': 'There is not a single entry in {maand} yet.',
  '{n} boeking(en) in {maand}.': '{n} entr(ies) in {maand}.',
  'Uittreksel inlezen': 'Import a statement',
  'Bekijk de boekingen ›': 'View the entries ›',
  'Waar hoort het bij?': 'Where does it belong?',
  'Wat geen categorie heeft, telt nergens mee — niet in je budget en niet in je analyse.':
    'Anything without a category counts nowhere — not in your budget and not in your analysis.',
  'Alles heeft een categorie. Niets te doen.': 'Everything has a category. Nothing to do.',
  '{n} boeking(en) wachten nog op een categorie.': '{n} entr(ies) are still waiting for a category.',
  'Nog {n} andere. Werk deze eerst weg; de rest schuift dan vanzelf op.':
    '{n} more after these. Clear these first; the rest moves up by itself.',
  'Bekijk ze in de lijst ›': 'View them in the list ›',
  'Hoe is de maand geweest?': 'How was the month?',
  'De cijfers waarvoor je het allemaal deed.': 'The figures you did all this for.',
  'Je hield {bedrag} over.': 'You had {bedrag} left over.',
  'Je kwam {bedrag} tekort.': 'You were {bedrag} short.',
  'Je kwam precies uit.': 'You came out exactly even.',
  '{n} budget(ten) gingen over hun grens.': '{n} budget(s) went over their limit.',
  '{n} vaste last(en) staan nog niet ingeboekt in deze maand.':
    '{n} fixed cost(s) have not been recorded in this month yet.',
  'Klaar?': 'Done?',
  '{maand} is afgesloten op {datum}.': '{maand} was closed on {datum}.',
  'Toch nog openzetten': 'Reopen it after all',
  'Er staat nog werk open. Je mag toch afsluiten — de app onthoudt dan wat er bleef liggen.':
    'There is still work open. You may close anyway — the app then remembers what was left.',
  'Alles is rond. Sluit de maand af, dan weet je later dat je ernaar gekeken hebt.':
    'Everything is done. Close the month, so later you know you have looked at it.',
  'Maand afsluiten': 'Close the month',
  '{maand} is afgesloten.': '{maand} has been closed.',
  '{maand} staat weer open.': '{maand} is open again.',
  'Afsluiten is niet gelukt. Probeer het opnieuw.': 'Closing failed. Please try again.',
  'Heropenen is niet gelukt. Probeer het opnieuw.': 'Reopening failed. Please try again.',
  'rond': 'done',
  'open': 'open',
  'voorstel: {naam}': 'suggestion: {naam}',
  'Categorie voor {naam}': 'Category for {naam}',
  'Zonder omschrijving': 'No description',
  '{maand} is nog niet afgesloten.': '{maand} has not been closed yet.',
  '{maand} is nog niet afgesloten, en de {n} maand(en) daarna ook niet.':
    '{maand} has not been closed yet, nor have the {n} month(s) after it.',
  'Neem {naam} over': 'Use {naam}',
  // De indexatiehulp die haar uitkomst kan bewaren
  'Vier kleine rekenmachines die live meerekenen. De indexatiehulp kan haar uitkomst ook als lopende regeling in een dossier bewaren.':
    'Four small calculators that update as you type. The indexation helper can also store its result as an ongoing arrangement in a case.',
  'Bewaar als onderhoudsbijdrage': 'Save as a maintenance contribution',
  'Bewaar in dossier': 'Save to case',
  'In welk dossier': 'In which case',
  'Het basisbedrag en de aanvangsindex gaan mee. Het nieuwe indexcijfer niet: dat hoort bij één bepaalde maand, en in je dossier zoekt de app dat voortaan zelf op.':
    'The base amount and the starting index carry over. The new index figure does not: it belongs to one particular month, and in your case the app looks that up itself from now on.',
  'Bewaard in {dossier}. De app indexeert dit voortaan zelf op de verjaardag van de regeling.':
    'Saved in {dossier}. From now on the app indexes this itself on the anniversary of the arrangement.',
  'Bewaren is niet gelukt. Probeer het opnieuw.': 'Saving failed. Please try again.',
  'Let op: voor {maand} kent de app zelf het cijfer {kent}, terwijl jij {getikt} intikte. Jouw cijfer wordt bewaard als "zoals ze in de akte staat". Komt het uit een ouder basisjaar, dan geven de volgende berekeningen een bedrag dat er juist uitziet en het niet is.':
    'Note: for {maand} the app itself has the figure {kent}, while you entered {getikt}. Your figure is stored as "as it appears in the deed". If it comes from an older base year, the calculations that follow will give an amount that looks right and is not.',
  'Wil je dit als lopende regeling bijhouden, maak dan eerst een dossier aan bij Dossiers.':
    'If you want to track this as an ongoing arrangement, first create a case under Cases.',
  'Al je dossiers hebben al een onderhoudsbijdrage. Pas ze daar aan in plaats van hier een tweede te maken.':
    'All your cases already have a maintenance contribution. Change it there instead of creating a second one here.',
  'Vul de datum van het vonnis of de overeenkomst in: die bepaalt op welke dag er elk jaar geïndexeerd wordt.':
    'Fill in the date of the court order or agreement: it determines the day of the annual indexation.',
  // Onderhoudsbijdrage — de melding in het belletje
  'De onderhoudsbijdrage van {dossier} is sinds {datum} geïndexeerd: van {oud} naar {nieuw} per maand.':
    'The maintenance contribution for {dossier} has been indexed since {datum}: from {oud} to {nieuw} per month.',
  'De onderhoudsbijdrage van {dossier} moest op {datum} geïndexeerd worden, maar het indexcijfer van {maand} is nog niet bekend.':
    'The maintenance contribution for {dossier} was due for indexation on {datum}, but the index figure for {maand} is not known yet.',
  'De onderhoudsbijdrage van {dossier} kan niet geïndexeerd worden: de app kent geen aanvangsindex voor {maand}. Vul ze in bij de regeling, zoals ze in de akte staat.':
    'The maintenance contribution for {dossier} cannot be indexed: the app has no starting index for {maand}. Enter it in the arrangement, as it appears in the deed.',
  '{bedrag} open': '{bedrag} outstanding',
  '{bedrag} tegoed': '{bedrag} credit',
  'niets open': 'nothing outstanding',
  // Kredietkaart (ronde 43)
  'Afsluitdag van de kaart': 'Card statement day',
  'De dag waarop je kaartrekening wordt opgemaakt. Vanaf de dag erna loopt de volgende periode.':
    'The day your card statement is drawn up. The next period starts the day after.',
  'Dag waarop het bedrag afgeboekt wordt': 'Day the amount is debited',
  'De dag waarop de afsluiting effectief van je betaalrekening gaat. Meestal een dag in de maand na de afsluiting.':
    'The day the statement amount actually leaves your current account. Usually a day in the month after the statement.',
  'Openstaand bij de start (€)': 'Outstanding at the start (€)',
  'Wat er op deze kaart nog openstaat wanneer je ze hier invoert. Vul een gewoon positief bedrag in — de app weet dat dit een schuld is. Staat er niets open, vul dan 0 in.':
    'What is still outstanding on this card when you enter it here. Fill in a plain positive amount — the app knows this is a debt. If nothing is outstanding, enter 0.',
  'Nog openstaand': 'Still outstanding',
  'Tegoed op de kaart': 'Credit on the card',
  'bij de start stond er {saldo} open': '{saldo} was outstanding at the start',
  'bij de start {saldo} open': '{saldo} outstanding at the start',
  'Er staat een tegoed op deze kaart, geen schuld. Bedoelde je dat dit bedrag nog openstaat? Pas het dan aan bij Bewerken — vul daar in wat je nog schuldig bent, als positief bedrag.':
    'This card shows a credit, not a debt. Did you mean that this amount is still outstanding? Change it under Edit — enter what you still owe, as a positive amount.',
  'De afrekening': 'The statement',
  'Afgesloten op {datum}: {bedrag}': 'Closed on {datum}: {bedrag}',
  'Volledig betaald.': 'Paid in full.',
  'Nog te betalen: {bedrag}. Vul een afboekdag in om te weten wanneer dit van je rekening gaat.':
    'Still to pay: {bedrag}. Fill in a debit day to know when this leaves your account.',
  'Nog te betalen: {bedrag}. Dat bedrag ging op {datum} van je betaalrekening — boek het hieronder in.':
    'Still to pay: {bedrag}. That amount left your current account on {datum} — record it below.',
  'Nog te betalen: {bedrag}, gaat op {datum} van je betaalrekening.':
    'Still to pay: {bedrag}, leaves your current account on {datum}.',
  'Sinds de afsluiting kwam er {bedrag} bij op de kaart. Die periode sluit op {datum}.':
    'Since the statement, {bedrag} has been added to the card. That period closes on {datum}.',
  'Sinds de afsluiting ging er {bedrag} van de kaart af. Die periode sluit op {datum}.':
    'Since the statement, {bedrag} has come off the card. That period closes on {datum}.',
  'Er staat al een overboeking van {bedrag} klaar. Ze telt mee zodra die dag er is.':
    'A transfer of {bedrag} is already scheduled. It counts as soon as that day arrives.',
  'Om de afrekening te boeken heb je nog een andere rekening nodig om ze van af te halen.':
    'To record the statement you need another account to pay it from.',
  'bij de start {saldo} tegoed': '{saldo} credit at the start',
  'bij de start stond er {saldo} tegoed': 'there was {saldo} credit at the start',
  'Hoeveel je maximaal mag opnemen op deze kaart.': 'How much you may draw on this card at most.',
  'Hier staat nu een tegoed, geen schuld. Bedoelde je dat dit bedrag nog openstaat? Haal dan het minteken weg.':
    'This currently shows a credit, not a debt. Did you mean that this amount is still outstanding? Then remove the minus sign.',
  'Kies bij Type "Kredietkaart". Vul bij het bedrag in wat er nog openstaat, als een gewoon positief getal, en bij de limiet hoeveel je maximaal mag opnemen.':
    'Pick "Credit card" under Type. For the amount, enter what is still outstanding as a plain positive number, and for the limit how much you may draw at most.',
  'Vul een afsluitdag in bij Bewerken, dan rekent de app uit wat er afgesloten is en wanneer het van je rekening gaat.':
    'Fill in a statement day under Edit, and the app works out what has been closed and when it leaves your account.',
  'Afrekening boeken': 'Record the statement',
  'Sluit': 'Close',
  'Van welke rekening': 'From which account',
  'Boek de overboeking': 'Record the transfer',
  'Afrekening kredietkaart': 'Credit card statement',
  'De afrekening is geboekt als overboeking van {datum}.': 'The statement has been recorded as a transfer dated {datum}.',
  'De afrekening kon niet geboekt worden. Probeer het opnieuw.': 'The statement could not be recorded. Please try again.',
  'Dit wordt een overboeking, geen uitgave: de aankopen zelf zijn al geboekt op de kaart.':
    'This becomes a transfer, not an expense: the purchases themselves are already recorded on the card.',
  'De laatste keer is {maand}. Daarna telt deze post niet meer mee.': 'The last time is {maand}. After that this entry no longer counts.',
  'De {n} boeking(en) van vóór en op deze dag tellen daarna niet meer apart mee — ze zitten al in dit bedrag. Ze blijven wel gewoon in je lijst staan.': 'The {n} transaction(s) on and before this day will no longer count separately — they are already part of this amount. They do stay in your list.',
  'Er staat al een boeking van {bedrag} op {datum} ({naam}). Is dat dezelfde betaling?': 'There is already a transaction of {bedrag} on {datum} ({naam}). Is that the same payment?',
  'Er staat al een waarde voor deze dag ({bedrag}). Die wordt vervangen.': 'There is already a value for this day ({bedrag}). It will be replaced.',
  'Geef een bedrag boven nul, of laat het veld leeg.': 'Enter an amount above zero, or leave the field empty.',
  'Gekoppeld aan een boeking': 'Linked to a transaction',
  'Gestopt na {maand}': 'Stopped after {maand}',
  'Ja, koppelen': 'Yes, link them',
  'Je rekeningen staan op {bezit}, met {teBetalen} nog te betalen.': 'Your accounts hold {bezit}, with {teBetalen} still to repay.',
  'Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen en {teBetalen} nog te betalen.': 'Your accounts hold {bezit}, with {teOntvangen} still to receive and {teBetalen} still to repay.',
  'Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen.': 'Your accounts hold {bezit}, with {teOntvangen} still to receive.',
  'Kies een dag tussen 1 en 28, of laat het veld leeg.': 'Pick a day between 1 and 28, or leave the field empty.',
  'Meer pagina\'s': 'More pages',
  'Notitie': 'Note',
  'Vastgelegd: op {datum} stond er {bedrag}.': 'Recorded: on {datum} the balance was {bedrag}.',
  'gekoppeld': 'linked',
  'nog {bedrag} van je limiet van {limiet} beschikbaar': '{bedrag} of your {limiet} limit still available',
  'sinds de waarde van {datum}: {saldo}': 'since the value of {datum}: {saldo}',
  // Ronde 38 — kredietrekening, waardering, netto vermogen, einddatum vaste last
  'Kredietkaart of kredietopening': 'Credit card or credit line',
  'Kredietlimiet (€)': 'Credit limit (€)',
  '1-28, optioneel': '1-28, optional',
  'Waarde bijwerken': 'Update value',
  'Voor rekeningen die van waarde veranderen zonder boeking, zoals beleggingen of pensioensparen. Je geschiedenis blijft staan; de app rekent vanaf deze dag verder met het bedrag dat je hier invult.': 'For accounts whose value changes without any transaction, such as investments or pension savings. Your history stays intact; from this day on the app continues from the amount you enter here.',
  'Op welke dag?': 'On which day?',
  'Werkelijke waarde (€)': 'Actual value (€)',
  'Waarde vastleggen': 'Record value',
  'Vul een datum en een bedrag in.': 'Enter a date and an amount.',
  'Bijwerken is niet gelukt. Probeer het opnieuw.': 'Updating failed. Please try again.',
  'Eerder vastgelegd': 'Recorded earlier',
  'Verwijder waardering van {datum}': 'Delete valuation of {datum}',
  'Waardering verwijderd': 'Valuation deleted',
  'Netto vermogen {bedrag}': 'Net worth {bedrag}',
  'Loopt tot en met': 'Runs through',
  'Laat leeg zolang de post doorloopt. Vul hem in wanneer je opzegt — de post blijft dan gewoon in je historiek staan.': 'Leave empty while the entry continues. Fill it in when you cancel — the entry then simply stays in your history.',
  'Gestopt': 'Stopped',
  '{naam} loopt niet meer vanaf {maand}. Er is niets geboekt.': '{naam} no longer runs from {maand}. Nothing was booked.',
  'Cash': 'Cash',
  // Categorieformulier
  'Categorienaam': 'Category name',
  'Categorie wijzigen': 'Update category',
  'Categorie toevoegen': 'Add category',
  // Budgetformulier
  'Budgetcategorie': 'Budget category',
  'Hoofdcategorieën': 'Main categories',
  'Eigen categorieën': 'Own categories',
  'Maandbudget (€)': 'Monthly budget (€)',
  'Budget instellen': 'Set budget',
  // Transactieformulier
  'Handelaar / winkel': 'Merchant / store',
  'Bedrag (€)': 'Amount (€)',
  ' — totaal van het ticket': ' — receipt total',
  'Kassaticket splitsen': 'Split receipt',
  'Deelbedrag': 'Line amount',
  'Verwijder regel {n}': 'Delete line {n}',
  '+ Regel toevoegen': '+ Add line',
  'Verdeeld:': 'Distributed:',
  'van': 'of',
  '(nog {bedrag})': '(remaining {bedrag})',
  'Datum': 'Date',
  'Rekening': 'Account',
  'Uitgave': 'Expense',
  'Inkomst': 'Income',
  // Categoriekiezer
  'Categorie:': 'Category:',
  'Geen': 'None',
  'wissen': 'clear',
  'Zoek categorie of item': 'Search category or item',
  'Typ om te zoeken (vanaf 2 letters)…': 'Type to search (from 2 letters)…',
  'eigen': 'own',
  // Itemzoeker
  'Item zoeken': 'Search item',
  'Zoek een product (vanaf 2 letters)…': 'Search a product (from 2 letters)…',
  // Categorieboom
  'Alle categorieën': 'All categories',
  'Vouw open om te bekijken. Voeg subcategorieën toe of hernoem bestaande.':
    'Expand to view. Add subcategories or rename existing ones.',
  '{n} items': '{n} items',
  'Nieuwe naam voor {naam}': 'New name for {naam}',
  'Wijzig {naam}': 'Edit {naam}',
  'Verwijder {naam}': 'Delete {naam}',
  'Nieuwe subcategorie in {naam}': 'New subcategory in {naam}',
  'Naam subcategorie': 'Subcategory name',
  'Voeg subcategorie toe aan {naam}': 'Add subcategory to {naam}',
  '+ subcategorie': '+ subcategory',
  // Donut
  'uitgaven': 'expenses',
  'inkomsten': 'income',
  '{label} per categorie': '{label} per category',
  // Dossiers
  'Partner is jou {bedrag} verschuldigd': 'Partner owes you {bedrag}',
  'Jij bent partner {bedrag} verschuldigd': 'You owe partner {bedrag}',
  'Niets te verrekenen': 'Nothing to settle',
  'Dossiers (gedeelde kosten)': 'Cases (shared expenses)',
  'Nog geen dossiers. Maak er hieronder een aan.': 'No cases yet. Create one below.',
  'Gekozen dossier': 'Selected case',
  '(jij {p}%)': '(you {p}%)',
  'Verwijder dossier {naam}': 'Delete case {naam}',
  'betaald door {wie}': 'paid by {wie}',
  'jou': 'you',
  'partner': 'partner',
  'Bewerk kost {naam}': 'Edit expense {naam}',
  'Verwijder kost {naam}': 'Delete expense {naam}',
  'Leg afrekening vast': 'Record settlement',
  'Vastgelegde afrekeningen': 'Recorded settlements',
  'Dossiernaam': 'Case name',
  'Aandeel jij (%)': 'Your share (%)',
  'Dossier toevoegen': 'Add case',
  'Kostomschrijving': 'Expense description',
  'Kostbedrag (€)': 'Expense amount (€)',
  'Betaald door:': 'Paid by:',
  'Jij': 'You',
  'Partner': 'Partner',
  'Kost wijzigen': 'Update expense',
  'Kost toevoegen': 'Add expense',
  // Ronde 6: bovenbalk, zijpaneel en hulpteksten bij formulieren
  'Opgeslagen': 'Saved',
  'Niet verbonden': 'Not connected',
  'Bezig met synchroniseren…': 'Syncing…',
  'Synchronisatie mislukt': 'Sync failed',
  'Versie {v}': 'Version {v}',
  'Uitloggen': 'Sign out',
  'Meldingen': 'Notifications',
  'Verbinding met Google Drive verbroken. Je gegevens blijven op dit toestel staan.':
    'Disconnected from Google Drive. Your data stays on this device.',
  'Geef een naam en een geldig bedrag om op te slaan.': 'Enter a name and a valid amount to save.',
  'Geef een naam en een percentage tussen 0 en 100.': 'Enter a name and a percentage between 0 and 100.',
  'Kies een categorie en geef een bedrag.': 'Pick a category and enter an amount.',
  // Ronde 7: correcte cijfers, leningen afsluiten, vooruitblik
  'Nieuwe transactie': 'New transaction',
  'Uitgaven per categorie': 'Spending by category',
  'Deze rekening heeft nog {n} boeking(en). Archiveer ze in plaats van ze te verwijderen.':
    'This account still has {n} entr(ies). Archive it instead of deleting it.',
  'Een terugbetaling in dezelfde categorie verlaagt het verbruik. Daardoor kan dit cijfer lager liggen dan de uitgaven in de Analyse.':
    'A refund in the same category lowers the amount used. That is why this figure can be lower than the spending shown in Analysis.',
  'Achterstallig — inkomsten': 'Overdue — income',
  'Achterstallig — uitgaven': 'Overdue — expenses',
  '{n} vaste last(en) achterstallig — de dag is voorbij': '{n} recurring item(s) overdue — the day has passed',
  'De einddatum ligt vóór de begindatum.': 'The end date is before the start date.',
  'sluit af': 'close',
  'heropen': 'reopen',
  'Sluit lening {naam} af': 'Close loan {naam}',
  'Heropen lening {naam}': 'Reopen loan {naam}',
  'afgesloten': 'closed',
  'afgesloten, telt niet meer mee': 'closed, no longer counted',
  'Nog te ontvangen': 'Still to receive',
  'Nog te betalen': 'Still to pay',
  'Dit is meer dan er nog openstaat ({open}).': 'This is more than the outstanding amount ({open}).',
  'Zet op {open}': 'Set to {open}',
  'De eerdere maanden tellen aan de niet-geïndexeerde bijdrage; enkel de lopende maand telt geïndexeerd. Zo weegt de indexatie niet met terugwerkende kracht.':
    'Earlier months are counted at the non-indexed contribution; only the current month is counted as indexed. That way indexation does not apply retroactively.',
  // Ronde 8: iconen, filters en subcategorieën ter plekke
  'je financieel kompas': 'your financial compass',
  'Filters': 'Filters',
  'Filters · {n}': 'Filters · {n}',
  'Van {datum}': 'From {datum}',
  'Tot {datum}': 'Until {datum}',
  'Wis filter {naam}': 'Clear filter {naam}',
  '+ “{naam}” toevoegen aan …': '+ Add “{naam}” to …',
  'Nieuwe subcategorie “{naam}”': 'New subcategory “{naam}”',
  'Onder welke categorie': 'Under which category',
  'Subcategorie toevoegen': 'Add subcategory',
  'Kies een categorie en geef een naam.': 'Pick a category and enter a name.',
  'Zet een eigen item onder een bestaande categorie, zonder de boom te doorlopen.':
    'Add your own item under an existing category, without walking through the tree.',
  'bv. Kefir': 'e.g. Kefir',
  // Ronde 9: desktoplayout
  'Alle': 'All',
  'Recente transacties': 'Recent transactions',
  'Budgetstatus': 'Budget status',
  'Nog geen transacties.': 'No transactions yet.',
  'Nieuwe rekening': 'New account',
  'Rekening bewerken': 'Edit account',
  'Nieuwe categorie': 'New category',
  'Categorie bewerken': 'Edit category',
  // Ronde 10: gezinsleden, dossiersoorten en rekenhulpen
  'Gezinsleden': 'Family members',
  'Stel je gezinsleden één keer in; je kan er kosten, doelen, leningen en garanties aan koppelen.':
    'Set up your family members once; you can link expenses, goals, loans and warranties to them.',
  'Nog geen gezinsleden ingesteld.': 'No family members set up yet.',
  'Naam gezinslid': 'Family member name',
  'Gezinslid toevoegen': 'Add family member',
  'Rol van {naam}': 'Role of {naam}',
  'Wijzig gezinslid {naam}': 'Edit family member {naam}',
  'Archiveer gezinslid {naam}': 'Archive family member {naam}',
  'Heropen gezinslid {naam}': 'Reopen family member {naam}',
  'Verwijder gezinslid {naam}': 'Delete family member {naam}',
  'Gearchiveerd': 'Archived',
  'Gearchiveerde gezinsleden verdwijnen uit de keuzelijsten, maar hun naam blijft staan waar ze al gebruikt zijn.':
    'Archived family members disappear from the pickers, but their name stays wherever it was already used.',
  '— niemand —': '— nobody —',
  'Voor wie is dit doel?': 'Who is this goal for?',
  'Gezinslid (optioneel)': 'Family member (optional)',
  'Een bank of winkel vul je hierboven in als vrije tekst; gaat het om iemand van het gezin, kies hem hier.':
    'Enter a bank or shop above as free text; if it concerns someone in the family, pick them here.',
  'Van wie is dit?': 'Whose is this?',
  'voor {naam}': 'for {naam}',
  'Uitgaven per gezinslid': 'Spending per family member',
  'Inkomsten per gezinslid': 'Income per family member',
  'Hangt een transactie aan meerdere gezinsleden, dan wordt het bedrag gelijk over hen verdeeld.':
    'If a transaction is linked to several family members, the amount is split equally between them.',
  'Het gezin': 'The family',
  'Onbekend gezinslid': 'Unknown family member',
  'Nieuw dossier': 'New case',
  'Wat wil je bijhouden?': 'What do you want to track?',
  // Ronde 29 — de subtabs op de Dossiers-pagina en de keuze welke onderdelen van
  // een dossier je toont.
  'Soort dossier': 'Type of case',
  'Facturen & garantiebewijzen': 'Invoices & warranties',
  'Wat je uitzet, verdwijnt alleen uit beeld — er gaat niets verloren.':
    'What you switch off only disappears from view — nothing is lost.',
  'Gedeelde kosten': 'Shared expenses',
  'Kosten verdelen met een co-ouder of ex-partner, met een verdeelsleutel en afrekeningen.':
    'Split expenses with a co-parent or ex-partner, with a split key and settlements.',
  'Lening of krediet': 'Loan or credit',
  'Geld dat jij uitleende of zelf leende, met terugbetalingen en openstaand kapitaal.':
    'Money you lent out or borrowed, with repayments and outstanding capital.',
  'Aankoop met garantie': 'Purchase with warranty',
  'Een aankoop met bon of factuur, waarvan de app de garantieperiode bewaakt.':
    'A purchase with a receipt or invoice, whose warranty period the app keeps an eye on.',
  'Rekenhulpen': 'Calculators',
  'Vier kleine rekenmachines. Ze rekenen live mee en bewaren niets.':
    'Four small calculators. They update as you type and store nothing.',
  'Alimentatie': 'Maintenance',
  'Huur': 'Rent',
  'Huurindexatie': 'Rent indexation',
  'Geïndexeerde huur = basishuur × nieuwe index / aanvangsindex (Belgische formule).':
    'Indexed rent = base rent × new index / starting index (Belgian formula).',
  'Voor huur gebruik je de gezondheidsindex: de aanvangsindex is die van de maand vóór de ondertekening van het huurcontract.':
    'For rent, use the health index: the starting index is the one for the month before the lease was signed.',
  'Voor onderhoudsgeld is de aanvangsindex die van de maand waarin het bedrag werd vastgelegd.':
    'For maintenance payments, the starting index is the one for the month in which the amount was set.',
  'Dat is {verschil} meer ({procent}).': 'That is {verschil} more ({procent}).',
  'Dat is {verschil} minder ({procent}).': 'That is {verschil} less ({procent}).',
  'Het bedrag blijft gelijk.': 'The amount stays the same.',
  'Vul een basisbedrag groter dan nul in.': 'Enter a base amount greater than zero.',
  'Vul twee indexcijfers groter dan nul in.': 'Enter two index figures greater than zero.',
  'Lening en aflossing': 'Loan and repayment',
  'Wat kost een lening per maand, en wat levert extra aflossen op?':
    'What does a loan cost per month, and what does paying extra save?',
  'Geleend bedrag (€)': 'Amount borrowed (€)',
  'Jaarlijkse rentevoet (%)': 'Annual interest rate (%)',
  'Looptijd (maanden)': 'Term (months)',
  'Extra per maand (€)': 'Extra per month (€)',
  'Maandlast': 'Monthly payment',
  'Totale interest': 'Total interest',
  'Totaal terugbetaald': 'Total repaid',
  'Met {extra} extra per maand ben je {maanden} maanden vroeger klaar en bespaar je {interest} interest.':
    'With {extra} extra per month you finish {maanden} months sooner and save {interest} in interest.',
  'Met {extra} extra per maand bespaar je {interest} interest.':
    'With {extra} extra per month you save {interest} in interest.',
  'Spaardoel': 'Savings goal',
  'Hoeveel per maand, of wanneer haal je het?': 'How much per month, or when will you get there?',
  'Hoeveel per maand?': 'How much per month?',
  'Wanneer haal ik het?': 'When will I get there?',
  'Zonder rente gerekend, net zoals de spaardoelen in de app.':
    'Calculated without interest, just like the savings goals in the app.',
  'Al gespaard (€)': 'Already saved (€)',
  'Streefdatum': 'Target date',
  'Bedrag per maand (€)': 'Amount per month (€)',
  'Per maand opzijzetten': 'Set aside per month',
  'Nog nodig': 'Still needed',
  'Aantal maanden': 'Number of months',
  'Klaar op': 'Done by',
  'Je doel is al bereikt.': 'You have already reached your goal.',
  '{maanden} stortingen van {bedrag} tot {datum}.': '{maanden} deposits of {bedrag} until {datum}.',
  'Vanaf vandaag ({vandaag}) duurt dat nog {maanden} maanden.':
    'Starting today ({vandaag}) that takes another {maanden} months.',
  'Prijs per eenheid': 'Price per unit',
  'Welke verpakking is echt het voordeligst?': 'Which pack is really the best value?',
  'Gram en milliliter worden omgerekend, zodat 750 g en 1 kg eerlijk vergelijken.':
    'Grams and millilitres are converted, so 750 g and 1 kg compare fairly.',
  'Naam (optioneel)': 'Name (optional)',
  'Prijs (€)': 'Price (€)',
  'Hoeveelheid': 'Quantity',
  'Eenheid': 'Unit',
  'gram (g)': 'grams (g)',
  'kilogram (kg)': 'kilograms (kg)',
  'milliliter (ml)': 'millilitres (ml)',
  'liter (l)': 'litres (l)',
  'Aanbieding {n}': 'Offer {n}',
  'Verwijder aanbieding {n}': 'Remove offer {n}',
  'Nog een aanbieding': 'Another offer',
  '{procent} duurder': '{procent} more expensive',
  // Ronde 11: afrekeningen uitsplitsen en verdeelsleutels
  'Kosten zonder kind ook meetellen': 'Also include costs without a child',
  'Bv. een gezamenlijke schoolrekening zonder kind erbij. Vink je dit uit, dan blijven die kosten open staan.':
    'For example a joint school bill with no child attached. Uncheck this and those costs stay open.',
  '{n} kosten zitten al in een andere afrekening': '{n} costs are already in another settlement',
  'Kies eerst een categorie en geef een percentage van 0 tot 100.':
    'Pick a category first and enter a percentage from 0 to 100.',
  'Geef een percentage van 0 tot 100 om deze verdeling toe te voegen.':
    'Enter a percentage from 0 to 100 to add this split.',
  'Verdeling per kostensoort': 'Split by cost type',
  'Voor buitengewone kosten (medisch, schools, ontwikkeling) spreken ouders vaak een andere sleutel af dan voor gewone kosten. Leeg laten = de standaard van het dossier ({p}%).':
    'For extraordinary costs (medical, school, development) parents often agree on a different key than for ordinary costs. Leave empty = the case default ({p}%).',
  'Gewone kosten (% jij)': 'Ordinary costs (% you)',
  'Buitengewone kosten (% jij)': 'Extraordinary costs (% you)',
  'leeg = {p}%': 'empty = {p}%',
  'Bewaar verdeling per kostensoort': 'Save split by cost type',
  'Geef een percentage van 0 tot 100, of laat het veld leeg.':
    'Enter a percentage from 0 to 100, or leave the field empty.',
  'Verdeelsleutel': 'Split key',
  'Totalen': 'Totals',
  'Totaal kosten': 'Total costs',
  'Aantal kosten': 'Number of costs',
  'Jij betaalde': 'You paid',
  'Partner betaalde': 'Partner paid',
  'Jouw aandeel': 'Your share',
  'Aandeel partner': 'Partner share',
  'Per kind': 'Per child',
  'Per categorie': 'Per category',
  'Per kostensoort': 'Per cost type',
  'Detail': 'Detail',
  'Opgemaakt op': 'Drawn up on',
  'Niet toegewezen aan een kind': 'Not assigned to a child',
  'Gewone kosten': 'Ordinary costs',
  'Buitengewone kosten': 'Extraordinary costs',
  'gewone kosten': 'ordinary costs',
  'buitengewone kosten': 'extraordinary costs',
  'saldo': 'balance',
  'jouw deel': 'your part',
  'bon toegevoegd': 'receipt attached',
  'geen bon': 'no receipt',
  'standaardverdeling van het dossier': 'case default split',
  'eigen percentage op de kost': 'own percentage on the cost',
  'afwijkende verdeling': 'different split',
  'afspraak voor {bron}': 'agreement for {bron}',
  'afspraak voor categorie {bron}': 'agreement for category {bron}',
  'jij {p}% / partner {q}%': 'you {p}% / partner {q}%',
  'jij {jij} / partner {partner}': 'you {jij} / partner {partner}',
  '{n} kost(en), {bedrag}': '{n} cost(s), {bedrag}',
  '{n}, waarvan {m} met bon': '{n}, of which {m} with a receipt',
  'blad {n} van {totaal}': 'page {n} of {totaal}',
  'Saldo: plus = partner betaalt jou, min = jij betaalt partner.':
    'Balance: plus = partner pays you, minus = you pay partner.',
  'Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.':
    'Note: when generated this was {bedrag}; the split for this case has changed since.',
  // Ronde 12: icoon en kleur voor eigen categorieën
  'Voorbeeld': 'Preview',
  'Zo verschijnt ze straks in de transactielijst.': 'This is how it will appear in the transaction list.',
  'Icoon': 'Icon',
  'Kies icoon {icoon}': 'Choose icon {icoon}',
  'Gekozen icoon: {icoon}': 'Chosen icon: {icoon}',
  'Nog geen icoon gekozen.': 'No icon chosen yet.',
  'Eigen teken': 'Own character',
  'bv. 🧺': 'e.g. 🧺',
  'Kies kleur {kleur}': 'Choose colour {kleur}',
  'Gekozen kleur: {kleur}': 'Chosen colour: {kleur}',
  'Nog geen kleur gekozen — de grafiek gebruikt dan haar standaardkleur.':
    'No colour chosen — the chart will use its default colour.',
  'Rol': 'Role',
  // Namen van de iconen (voor schermlezers en de gekozen-regel)
  'Eten': 'Food',
  'Boodschappen': 'Groceries',
  'Drank': 'Drinks',
  'Huis': 'Home',
  'Energie': 'Energy',
  'Huishouden': 'Household',
  'Auto': 'Car',
  'Brandstof': 'Fuel',
  'Openbaar vervoer': 'Public transport',
  'Fiets': 'Bicycle',
  'Gezondheid': 'Health',
  'Apotheek': 'Pharmacy',
  'Tandarts': 'Dentist',
  'School': 'School',
  'Boeken': 'Books',
  'Sport': 'Sport',
  'Ontspanning': 'Leisure',
  'Cadeau': 'Gift',
  'Reizen': 'Travel',
  'Vakantie': 'Holiday',
  'Kleding': 'Clothing',
  'Verzorging': 'Personal care',
  'Huisdier': 'Pet',
  'Gereedschap': 'Tools',
  'Tuin': 'Garden',
  'Telefoon': 'Phone',
  'Internet': 'Internet',
  'Abonnement': 'Subscription',
  'Verzekering': 'Insurance',
  'Bank': 'Bank',
  'Spaarpot': 'Piggy bank',
  'Inkomen': 'Income',
  'Administratie': 'Paperwork',
  // Namen van de kleuren
  'Amber': 'Amber',
  'Oranje': 'Orange',
  'Terracotta': 'Terracotta',
  'Rood': 'Red',
  'Oudroze': 'Dusty pink',
  'Paars': 'Purple',
  'Mosgroen': 'Moss green',
  'Zeegroen': 'Sea green',
  'Turkoois': 'Turquoise',
  'Bruin': 'Brown',
  'Zandbruin': 'Sand',
  'Grijs': 'Grey',
  // Ronde 13: transactietabel op desktop en het rekeningdetail
  'Categorie': 'Category',
  'Bedrag': 'Amount',
  'Toon rekening {naam}': 'Show account {naam}',
  'Saldo vandaag': 'Balance today',
  'Binnengekomen': 'Came in',
  'Eraf gegaan': 'Went out',
  'Verschil': 'Difference',
  'Overboekingen tellen hier niet mee: die verschuiven enkel geld tussen je eigen rekeningen.':
    'Transfers are not counted here: they only move money between your own accounts.',
  'Laatste transacties': 'Latest transactions',
  'Nog geen boekingen op deze rekening.': 'No entries on this account yet.',
  '+ nog {n}': '+ {n} more',
  'van {naam}': 'from {naam}',
  'naar {naam}': 'to {naam}',
  'Bewerken': 'Edit',
  'Archiveren': 'Archive',
  'Heropenen': 'Reopen',
  'Verwijderen': 'Delete',
  // Spaardoelen
  'Spaardoelen': 'Savings goals',
  'Leningen': 'Loans',
  'Garanties': 'Warranties',
  'Langetermijndoelen — buffers, grote aankopen, schuldenvrij.':
    'Long-term goals — buffers, big purchases, debt-free.',
  'Nog geen doelen. Voeg je eerste doel toe!': 'No goals yet. Add your first goal!',
  '{a} van {b}': '{a} of {b}',
  'Bewerk doel {naam}': 'Edit goal {naam}',
  'Verwijder doel {naam}': 'Delete goal {naam}',
  'nog {bedrag}': '{bedrag} to go',
  '{bedrag}/mnd': '{bedrag}/mo',
  ' · tegen {datum}': ' · by {datum}',
  'Huidig bedrag {naam}': 'Current amount {naam}',
  'Huidig bedrag': 'Current amount',
  'Bedrag bijwerken': 'Update amount',
  'Doelnaam': 'Goal name',
  'Bv. Communie Kind 1': 'E.g. Communion Child 1',
  'Doelbedrag (€)': 'Target amount (€)',
  'Gekoppelde rekening': 'Linked account',
  'Geen — manueel bijhouden': 'None — track manually',
  'Huidig bedrag (€)': 'Current amount (€)',
  'Doeldatum (optioneel)': 'Target date (optional)',
  'Maandelijks streefbedrag (€, optioneel)': 'Monthly target (€, optional)',
  'Kleur': 'Color',
  'Doel wijzigen': 'Update goal',
  'Doel toevoegen': 'Add goal',
  // Vaste lasten
  'Vaste lasten': 'Fixed costs',
  'Inboeken voor {maand}': 'Book for {maand}',
  '{bedrag} · dag {dag}': '{bedrag} · day {dag}',
  'Geboekt ✓': 'Booked ✓',
  'Boek in': 'Book',
  'Bewerk vaste post {naam}': 'Edit recurring item {naam}',
  'Verwijder vaste post {naam}': 'Delete recurring item {naam}',
  'Vaste omschrijving': 'Recurring description',
  'Vast bedrag (€)': 'Fixed amount (€)',
  'Vaste rekening': 'Recurring account',
  'Vaste categorie': 'Recurring category',
  'Dag van de maand': 'Day of the month',
  'Vaste post wijzigen': 'Update recurring item',
  'Vaste post toevoegen': 'Add recurring item',
  // Indexatie
  'Alimentatie-indexatie': 'Alimony indexation',
  'Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).':
    'Indexed amount = base amount × new index / initial index (Belgian formula).',
  'Basisbedrag (€)': 'Base amount (€)',
  'Aanvangsindex': 'Initial index',
  'Nieuwe index': 'New index',
  'Geïndexeerd bedrag: {bedrag}': 'Indexed amount: {bedrag}',
  // Overboekingen
  'Overboekingen': 'Transfers',
  'Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).':
    'Move money between your own accounts (not income or an expense).',
  'Je hebt minstens twee rekeningen nodig om over te boeken.':
    'You need at least two accounts to make a transfer.',
  'Bewerk overboeking {van} naar {naar}': 'Edit transfer {van} to {naar}',
  'Verwijder overboeking {van} naar {naar}': 'Delete transfer {van} to {naar}',
  'Van rekening': 'From account',
  'Naar rekening': 'To account',
  'Kies twee verschillende rekeningen.': 'Choose two different accounts.',
  'Over te boeken bedrag (€)': 'Amount to transfer (€)',
  'Datum overboeking': 'Transfer date',
  'Omschrijving': 'Description',
  'Overboeking wijzigen': 'Update transfer',
  'Overboeking toevoegen': 'Add transfer',
  'onbekende rekening': 'unknown account',
  // Kinderen & dossier-uitbreidingen (Ronde 2)
  'Kinderen': 'Children',
  'Stel je kinderen één keer in; je kan gedeelde kosten eraan koppelen.': 'Set up your children once; you can link shared expenses to them.',
  'Nog geen kinderen ingesteld.': 'No children set up yet.',
  'Naam kind': 'Child name',
  'Kind toevoegen': 'Add child',
  'Wijzig kind {naam}': 'Edit child {naam}',
  'Verwijder kind {naam}': 'Delete child {naam}',
  'Kind verwijderd': 'Child deleted',
  'Voor wie? (optioneel)': 'For whom? (optional)',
  'Voor wie?': 'For whom?',
  'Duid je niemand aan, dan telt dit als een uitgave voor het gezin.':
    'If you select no one, this counts as an expense for the family.',
  // Ronde 30 — de hoofdcategorieën zitten achter één knop, en hun volgorde is
  // instelbaar op de Categorieën-pagina.
  'Selecteer hoofdcategorie (optioneel)': 'Select a main category (optional)',
  // Ronde 35 — correctheid, zichtbare mislukkingen en documenten die openen.
  '({bedrag} te veel)': '({bedrag} too much)',
  '{naam} lijkt al geboekt op {datum} ({bedrag}). Er is niets bijgemaakt — controleer je transacties.':
    '{naam} appears to be recorded already on {datum} ({bedrag}). Nothing was added — please check your transactions.',
  'Melding sluiten': 'Dismiss message',
  'Meer pagina’s': 'More pages',
  'stuks': 'pieces',
  'goedkoopste': 'cheapest',
  'De opslag van dit toestel zit vol. Verwijder een paar bonnetjes of foto’s en probeer opnieuw.':
    'This device’s storage is full. Delete a few receipts or photos and try again.',
  'Opslaan is niet gelukt. Je invoer staat er nog.': 'Saving failed. Your entry is still here.',
  'Toon alle maanden — wis het maandfilter': 'Show all months — clear the month filter',
  'Er ging iets mis, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.':
    'Something went wrong, but your data is safe. The rest of the app keeps working.',
  'Er ging iets mis in {naam}, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.':
    'Something went wrong in {naam}, but your data is safe. The rest of the app keeps working.',
  'Probeer opnieuw': 'Try again',
  'Zonder categorie': 'Uncategorised',
  'Onbekend': 'Unknown',
  'Bewaard document': 'Saved document',
  'Bewaren lukte niet. Je kan het bestand hierboven wel gewoon bekijken.':
    'Saving failed. You can still simply view the file above.',
  'Blijft het vak leeg? Bewaar het bestand hieronder en open het met je eigen pdf-lezer.':
    'Is the panel blank? Save the file below and open it with your own PDF reader.',
  'Deze afbeelding kan niet getoond worden. Ze is mogelijk beschadigd bij het bewaren.':
    'This image cannot be displayed. It may have been damaged while being saved.',
  'Foto van bon of factuur: {naam}': 'Photo of receipt or invoice: {naam}',
  'Pdf-bestand: {naam}': 'PDF file: {naam}',
  'Bewaren mislukte: {fout}. Je invoer staat er nog — probeer het opnieuw.':
    'Saving failed: {fout}. Your entry is still here — please try again.',
  'Bewaren op dit toestel': 'Save to this device',
  'Bewaren…': 'Saving…',
  'Bon of factuur': 'Receipt or invoice',
  'Contract of bewijs': 'Contract or proof',
  'De gegevens konden niet geopend worden': 'Your data could not be opened',
  'De regels verdelen meer dan het totaalbedrag. Pas een regel of het totaal aan.':
    'The lines add up to more than the total. Adjust a line or the total.',
  'Je gegevens zijn niet weg — de app kan de opslag van deze browser alleen niet openen. Dat gebeurt in een privévenster, wanneer de opslag vol zit, of wanneer deze pagina nog een oudere versie van de app is.':
    'Your data is not lost — the app simply cannot open this browser\u2019s storage. That happens in a private window, when storage is full, or when this page is still running an older version of the app.',
  'Opnieuw proberen': 'Try again',
  'Technische melding: {fout}': 'Technical message: {fout}',

  // Ronde 32 — beweging, de opgeruimde Transacties-pagina en de kleine punten.
  'Indexatie-tools': 'Indexation tools',
  'Naar Overzicht': 'To Overview',
  'Zoek: {term}': 'Search: {term}',
  'Zoeken': 'Search',
  'Zoeken en filteren': 'Search and filter',
  'Zoeken en filteren · {n}': 'Search and filter · {n}',

  // Ronde 31 — het herwerkte Overzicht en de Analyse-pagina.
  '* Deze maand loopt nog, dus die staaf is nog niet volledig.':
    '* This month is still running, so that bar is not complete yet.',
  'Bekijk alle {n} in Analyse ›': 'View all {n} in Analysis ›',
  'Bekijk in Analyse ›': 'View in Analysis ›',
  'Even veel als de vorige periode. {tip}': 'The same as the previous period. {tip}',
  'Gemiddeld {bedrag} per maand': 'On average {bedrag} per month',
  'Het lijntje loopt over {venster}. Het verschil ernaast vergelijkt {periode} met de vorige even lange periode.':
    'The line covers {venster}. The difference next to it compares {periode} with the previous period of the same length.',
  'Het lijntje loopt over {venster}. Kies een periode (niet Alles) om er een verschil bij te zien.':
    'The line covers {venster}. Pick a period (not All) to see a difference alongside it.',
  'Houdt dit een jaar aan, dan bespaar je {bedrag}. {tip}': 'If this keeps up for a year, you save {bedrag}. {tip}',
  'Houdt dit een jaar aan, dan kost het {bedrag} extra. {tip}':
    'If this keeps up for a year, it costs {bedrag} extra. {tip}',
  'Inkomsten en uitgaven per maand': 'Income and expenses per month',
  'Nog geen uitgaven in deze vier domeinen.': 'No expenses in these four areas yet.',
  'Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten en of ze stijgen.':
    'No expenses in these four areas yet. As soon as you record groceries, energy, telecom or insurance, you will see here what they cost and whether they are rising.',
  'Nog niets geboekt in deze maanden.': 'Nothing recorded in these months yet.',
  'Per hoofdcategorie — klik een rij open voor de details erachter.':
    'Per main category — click a row to see what is behind it.',
  'Samen {bedrag} in deze periode.': '{bedrag} in total this period.',
  'Samen {bedrag}. Sterkst gestegen: {naam}, {verschil} meer.':
    '{bedrag} in total. Biggest rise: {naam}, {verschil} more.',
  'Toon details': 'Show details',
  'Verberg details': 'Hide details',
  'Verloop per categorie': 'Trend per category',
  'Verloop van {naam} over {venster}': 'Trend of {naam} over {venster}',
  'Vorige periode: {bedrag}. {tip}': 'Previous period: {bedrag}. {tip}',
  'Waar loopt het op?': 'Where is it adding up?',
  'in': 'in',
  'loopt nog': 'still running',
  'uit': 'out',
  '{label} per categorie: {inhoud}': '{label} per category: {inhoud}',
  'Hoofdcategorie: {naam}': 'Main category: {naam}',
  'Zet {naam} hoger': 'Move {naam} up',
  'Zet {naam} lager': 'Move {naam} down',
  '{hoofd} · hele categorie': '{hoofd} · whole category',
  'Eigen verdeling (% jij, optioneel)': 'Custom split (% you, optional)',
  'leeg = standaard van het dossier': 'empty = case default',
  'voor {namen}': 'for {namen}',
  'jij {p}%': 'you {p}%',
  'Soort kost': 'Type of expense',
  'Gewone kost': 'Ordinary expense',
  'Buitengewone kost': 'Extraordinary expense',
  'buitengewoon': 'extraordinary',
  'Verdeling per categorie': 'Split per category',
  'Standaard draag jij {p}%. Stel hier per categorie een afwijkend percentage in.':
    'By default you bear {p}%. Set a different percentage per category here.',
  'Verwijder verdeling {naam}': 'Remove split {naam}',
  'Percentage jij': 'Your percentage',
  // Modulaire afrekening (Ronde 2 · Brok C)
  'Openstaand': 'Outstanding',
  'Nieuwe afrekening': 'New settlement',
  'Kies een periode en (optioneel) kinderen. Dit blokkeert niets — je kan meerdere afrekeningen maken.':
    'Choose a period and (optionally) children. This blocks nothing — you can make several settlements.',
  'Periode van': 'Period from',
  'Periode tot': 'Period to',
  'Voor welke kinderen? (leeg = allemaal)': 'For which children? (empty = all)',
  'In deze selectie: {n} kost(en), {saldo}': 'In this selection: {n} expense(s), {saldo}',
  'Genereer afrekening': 'Generate settlement',
  'Afrekeningen': 'Settlements',
  'alle periodes': 'all periods',
  'alle kinderen': 'all children',
  'Overgemaakt': 'Transferred',
  'Verwijder afrekening {datum}': 'Delete settlement {datum}',
  // PDF, samenvatting & bonnetje (Ronde 2 · Brok D)
  'Bon/factuur (optioneel)': 'Receipt/invoice (optional)',
  'Bon/factuur': 'Receipt/invoice',
  'bekijken': 'view',
  'verwijderen': 'remove',
  'bezig…': 'working…',
  'Kopieer': 'Copy',
  'Gekopieerd ✓': 'Copied ✓',
  'bon': 'receipt',
  'Afrekening — {naam}': 'Settlement — {naam}',
  'Periode': 'Period',
  'Resultaat': 'Result',
  // Kindrekening (Ronde 2 · Brok E)
  'Kindrekening': 'Children\'s account',
  'Kindrekening (gezamenlijke pot)': 'Children\'s account (shared pot)',
  'Een gezamenlijke pot waarop beide ouders storten en waaruit kosten rechtstreeks betaald worden. Een tweede manier van afrekenen naast het verschil-model.':
    'A shared pot both parents pay into and from which costs are paid directly. A second way to settle, alongside the difference model.',
  'Kindrekening aanzetten': 'Enable children\'s account',
  'Kindrekening uitzetten': 'Disable children\'s account',
  'Kindrekening uitgezet': 'Children\'s account disabled',
  'Saldo van de pot': 'Pot balance',
  'Storting': 'Deposit',
  'Storting (geld erin)': 'Deposit (money in)',
  'Uitgave (geld eruit)': 'Expense (money out)',
  'Soort beweging': 'Type of movement',
  'Bedrag pot (€)': 'Amount pot (€)',
  'Omschrijving (optioneel)': 'Description (optional)',
  'Gestort door:': 'Deposited by:',
  'Beweging wijzigen': 'Change movement',
  'Beweging toevoegen': 'Add movement',
  'Beweging verwijderd': 'Movement deleted',
  'Bewerk beweging': 'Edit movement',
  'Verwijder beweging': 'Delete movement',
  'door {wie}': 'by {wie}',
  'Maandbijdrage': 'Monthly contribution',
  'Maandbijdrage-afspraak instellen': 'Set monthly contribution',
  'Afspraak verbergen': 'Hide agreement',
  'Afspraak bewaren': 'Save agreement',
  'De afgesproken maandelijkse storting per ouder. Vul een aanvangs- en huidige index in om de bijdrage te indexeren (Belgische formule).':
    'The agreed monthly deposit per parent. Enter a base and current index to index the contribution (Belgian formula).',
  'Bijdrage jij (€/maand)': 'Your contribution (€/month)',
  'Bijdrage partner (€/maand)': 'Partner contribution (€/month)',
  'Startdatum afspraak': 'Agreement start date',
  'Aanvangsindex (optioneel)': 'Base index (optional)',
  'Huidige index (optioneel)': 'Current index (optional)',
  'Geïndexeerde bijdrage jij: {bedrag}': 'Your indexed contribution: {bedrag}',
  'geïndexeerd': 'indexed',
  'jij {jij}': 'you {jij}',
  'partner {partner}': 'partner {partner}',
  'gestort: {bedrag}': 'deposited: {bedrag}',
  'gestort {gestort}, loopt {achter} achter': 'deposited {gestort}, {achter} behind',
  'gestort {gestort}, {voor} vooruit': 'deposited {gestort}, {voor} ahead',
  'gestort {gestort}, precies bij': 'deposited {gestort}, exactly on track',
  // Leningen & kredieten (Ronde 2b · Brok F)
  'Leningen & kredieten': 'Loans & credits',
  'Geld dat jij uitleende of zelf leende. Log terugbetalingen; de app houdt het openstaand kapitaal en de geschiedenis bij.':
    'Money you lent out or borrowed yourself. Log repayments; the app tracks the outstanding balance and history.',
  'Nog geen leningen. Voeg er hieronder een toe.': 'No loans yet. Add one below.',
  'Nieuwe lening': 'New loan',
  'Lening bewerken': 'Edit loan',
  'Lening toevoegen': 'Add loan',
  'Lening wijzigen': 'Change loan',
  'Lening verwijderd': 'Loan deleted',
  'Soort': 'Type',
  'Ik leende uit (iemand is mij verschuldigd)': 'I lent out (someone owes me)',
  'Ik leende / een krediet (ik betaal af)': 'I borrowed / a credit (I repay)',
  'Naam': 'Name',
  'bv. Lening aan broer of Autolening': 'e.g. Loan to brother or Car loan',
  'Startbedrag / openstaand kapitaal (€)': 'Starting amount / outstanding capital (€)',
  'Kredietgever (optioneel)': 'Lender (optional)',
  'Wie (optioneel)': 'Who (optional)',
  'Startdatum': 'Start date',
  'Rentevoet % (optioneel)': 'Interest rate % (optional)',
  'Maandbedrag € (optioneel)': 'Monthly amount € (optional)',
  'Einddatum / termijn (optioneel)': 'End date / term (optional)',
  'Notitie (optioneel)': 'Note (optional)',
  'Contract/bewijs (optioneel)': 'Contract/proof (optional)',
  'Contract/bewijs': 'Contract/proof',
  'contract/bewijs': 'contract/proof',
  'uitgeleend': 'lent out',
  'geleend': 'borrowed',
  'nog te ontvangen': 'still to receive',
  'nog te betalen': 'still to pay',
  'afbetaald': 'paid off',
  'Bewerk lening {naam}': 'Edit loan {naam}',
  'Verwijder lening {naam}': 'Delete loan {naam}',
  '{afgelost} van {hoofdsom} afgelost ({pct}%)': '{afgelost} of {hoofdsom} repaid ({pct}%)',
  'rente {r}%': 'interest {r}%',
  '{bedrag}/maand': '{bedrag}/month',
  'nog {n} maand(en) tot {datum}': '{n} month(s) left until {datum}',
  'termijn verstreken sinds {datum}': 'term expired since {datum}',
  'termijn loopt deze maand af': 'term ends this month',
  'Geschiedenis tonen ({n})': 'Show history ({n})',
  'Geschiedenis verbergen': 'Hide history',
  'Aflossing (€)': 'Repayment (€)',
  'Datum aflossing': 'Repayment date',
  'Aflossing toevoegen': 'Add repayment',
  'Aflossing verwijderd': 'Repayment deleted',
  'Verwijder aflossing {datum}': 'Delete repayment {datum}',
  // Garanties & facturen (Ronde 2b · Brok G)
  'Garanties & facturen': 'Warranties & invoices',
  'Hou per aankoop de garantie en de factuur bij. De app berekent de vervaldatum en waarschuwt vóór ze afloopt.':
    'Keep the warranty and invoice for each purchase. The app computes the expiry date and warns before it ends.',
  'Nog geen aankopen. Voeg er hieronder een toe.': 'No purchases yet. Add one below.',
  'Nieuwe aankoop': 'New purchase',
  'Aankoop bewerken': 'Edit purchase',
  'Garantie toevoegen': 'Add warranty',
  'Garantie wijzigen': 'Change warranty',
  'Garantie verwijderd': 'Warranty deleted',
  'Koppel aan transactie (optioneel)': 'Link to transaction (optional)',
  'Niet gekoppeld': 'Not linked',
  'Product': 'Product',
  'bv. Wasmachine': 'e.g. Washing machine',
  'Winkel (optioneel)': 'Store (optional)',
  'Aankoopdatum': 'Purchase date',
  'Prijs € (optioneel)': 'Price € (optional)',
  'Garantie in maanden': 'Warranty in months',
  '24 = wettelijk (2 jaar); tweedehands minstens 12; langere commerciële garantie mag ook.':
    '24 = legal (2 years); second-hand at least 12; a longer commercial warranty is fine too.',
  'Bewerk garantie {naam}': 'Edit warranty {naam}',
  'Verwijder garantie {naam}': 'Delete warranty {naam}',
  'gekocht {datum}': 'bought {datum}',
  'vervalt {datum}': 'expires {datum}',
  'bon/factuur': 'receipt/invoice',
  'verlopen': 'expired',
  'nog {n} dag(en)': '{n} day(s) left',
  'nog {n} maand(en)': '{n} month(s) left',
  // Zoeken & filteren over transacties (Ronde 3 · Brok H)
  'Zoek in transacties': 'Search transactions',
  'Zoek op omschrijving…': 'Search by description…',
  'Richting': 'Direction',
  'Alles': 'All',
  'Alle rekeningen': 'All accounts',
  'Hoofdcategorie': 'Main category',
  'Subcategorie': 'Subcategory',
  'Alle subcategorieën': 'All subcategories',
  'Van': 'From',
  'Tot': 'To',
  'Wis filters': 'Clear filters',
  '{n} transactie(s) gevonden': '{n} transaction(s) found',
  '{n} transactie(s) getoond': '{n} transaction(s) shown',
  'Geen transacties gevonden.': 'No transactions found.',
  'Toon oudere transacties ({n} ouder dan {maanden} maanden)': 'Show older transactions ({n} older than {maanden} months)',
  'Toon enkel recente maanden': 'Show only recent months',
  // Instellingen (Ronde 3 · Brok I)
  'Instellingen': 'Settings',
  // Navigatie / pagina's (Ronde 5 · Brok Q)
  'Hoofdnavigatie': 'Main navigation',
  'Overzicht': 'Overview',
  'Transacties': 'Transactions',
  'Budget': 'Budget',
  'Dossiers': 'Cases',
  'Meer': 'More',
  // Analyse (Ronde 5 · Brok R)
  'Analyse': 'Analysis',
  'Deze maand': 'This month',
  'Dit jaar': 'This year',
  'Aangepast': 'Custom',
  't/m': 'to',
  'Verdeling uitgaven': 'Expense breakdown',
  'Verdeling inkomsten': 'Income breakdown',
  'Per hoofdcategorie': 'By main category',
  'Geen uitgaven in deze periode': 'No expenses in this period',
  'Geen inkomsten in deze periode': 'No income in this period',
  'Ranglijst': 'Ranking',
  'klik voor detail': 'click for detail',
  'Verdeling per product/dienst': 'Breakdown by product/service',
  'Subcategorieën — brood, koffiekoeken, elektriciteit…': 'Subcategories — bread, pastries, electricity…',
  'Uitgaven per winkel': 'Expenses by store',
  'Inkomsten per bron': 'Income by source',
  'Gebaseerd op de omschrijving bij elke transactie': 'Based on the description entered for each transaction',
  'Toon minder': 'Show less',
  'Toon alle {n} — incl. {m} overige': 'Show all {n} — incl. {m} other',
  'Overige ({n})': 'Other ({n})',
  'Totaal': 'Total',
  'Terug': 'Back',
  '{n} transacties in de periode': '{n} transactions in the period',
  'van het totaal': 'of the total',
  'Per subcategorie': 'By subcategory',
  'Alle transacties': 'All transactions',
  'Kassaticket gesplitst': 'Receipt split',
  // Vermogensevolutie (Ronde 5 · Brok S)
  'Vermogensevolutie': 'Net worth over time',
  // Trends & stijgers/dalers (Ronde 5 · Brok T)
  'Stijgers en dalers': 'Movers',
  't.o.v. de vorige periode': 'vs the previous period',
  'Kies een periode (niet Alles) om te vergelijken.': 'Choose a period (not All) to compare.',
  'Geen verschillen om te tonen.': 'No differences to show.',
  'Per categorie per maand': 'By category per month',
  'Verloop over de laatste 6 maanden': 'Trend over the last 6 months',
  // Vooruitblik & spaarquote (Ronde 5 · Brok V)
  'Vooruitblik & spaarquote': 'Outlook & savings rate',
  'Spaarquote': 'Savings rate',
  'Nog geen inkomsten in deze periode': 'No income in this period yet',
  '{saldo} van {inkomsten} inkomsten overgehouden': '{saldo} of {inkomsten} income kept',
  'Vooruitblik — {maand}': 'Outlook — {maand}',
  'spaarquote': 'savings rate',
  'Al geboekt — inkomsten': 'Booked — income',
  'Al geboekt — uitgaven': 'Booked — expenses',
  'Nog te komen — inkomsten': 'Still to come — income',
  'Nog te komen — uitgaven': 'Still to come — expenses',
  // Weergave / thema (Ronde 5 · Brok O)
  'Weergave': 'Appearance',
  'Kies licht of donker, of laat de app de voorkeur van je toestel volgen.':
    'Choose light or dark, or let the app follow your device preference.',
  'Licht': 'Light',
  'Donker': 'Dark',
  'Systeem': 'System',
  'Synchronisatie (Google Drive)': 'Sync (Google Drive)',
  'Synchroniseer je gegevens veilig tussen je toestellen via je eigen Google Drive. Enkel een back-uplogboek; je data blijft lokaal-eerst.':
    'Sync your data safely across your devices via your own Google Drive. Only a backup log; your data stays local-first.',
  // Barcode-scanner (Ronde 4 · Brok L)
  'Streepjescode scannen': 'Scan barcode',
  'Richt de camera op de streepjescode': 'Point the camera at the barcode',
  'Camera niet beschikbaar: {fout}': 'Camera not available: {fout}',
  'Sluiten': 'Close',
  'Scan streepjescode voor regel {n}': 'Scan barcode for line {n}',
  'Nutri-Score': 'Nutri-Score',
  // --- Documentkluis per dossier ---
  'Documentkluis': 'Document vault',
  'Bewaar de ouderschapsovereenkomst, attesten, bonnen en het vonnis van dit dossier op één plek.':
    'Keep the parenting agreement, certificates, receipts and the court order for this case in one place.',
  'Nog geen documenten. Voeg er hieronder een toe.': 'No documents yet. Add one below.',
  'Nieuw document': 'New document',
  'Overeenkomst': 'Agreement',
  'Attest': 'Certificate',
  'Bon': 'Receipt',
  'Vonnis': 'Court order',
  'Ander': 'Other',
  'Bekijken': 'View',
  'Openen': 'Open',
  'Bewaren': 'Save to device',
  'Ja, verwijder': 'Yes, delete',
  'Verwijder document {naam}': 'Delete document {naam}',
  'Bestand (foto of PDF)': 'File (photo or PDF)',
  'Gekozen bestand': 'Selected file',
  'Ander bestand kiezen': 'Choose another file',
  'Document toevoegen': 'Add document',
  'bv. Ouderschapsovereenkomst 2026': 'e.g. Parenting agreement 2026',
  'Geef een naam en kies een bestand om op te slaan.': 'Enter a name and choose a file to save.',
  'Dit bestand is te groot (max. 4 MB). Kies een kleinere scan of foto.':
    'This file is too large (max. 4 MB). Choose a smaller scan or photo.',
  'Dit bestand kon niet gelezen worden. Probeer een andere scan of foto.':
    'This file could not be read. Try another scan or photo.',
  'Opslaan is mislukt. Probeer het opnieuw; je invoer blijft staan.':
    'Saving failed. Please try again; your input is kept.',
  'Document verwijderd': 'Document deleted',
  'Bewaar de leningovereenkomst en de betalingsbewijzen van deze lening op één plek.':
    'Keep the loan agreement and the proofs of payment for this loan in one place.',
  'Bewaar de factuur, het aankoopbewijs, het garantiebewijs en de handleiding van deze aankoop op één plek.':
    'Keep the invoice, proof of purchase, warranty certificate and manual for this purchase in one place.',
  'bv. Leningovereenkomst': 'e.g. Loan agreement',
  'bv. Factuur wasmachine': 'e.g. Invoice washing machine',
  'Documenten': 'Documents',
  'Documenten ({n})': 'Documents ({n})',
  'Documenten verbergen': 'Hide documents',
  'Nieuw doel': 'New goal',
  'Doel bewerken': 'Edit goal',
  // --- Begin opnieuw ---
  'Begin opnieuw': 'Start over',
  'Begin opnieuw…': 'Start over…',
  'Wist al je gegevens op dit toestel en begint met een schone lei.':
    'Erases all your data on this device and starts you with a clean slate.',
  'Ook de logbestanden in je Google Drive-back-up worden opgeruimd, anders komt alles bij de volgende synchronisatie gewoon terug. Ze gaan naar de prullenbak van Drive, dus je kan ze daar nog terughalen.':
    'The log files in your Google Drive backup are cleared too, otherwise everything would simply come back at the next sync. They go to the Drive bin, so you can still recover them there.',
  'Er is nu geen Google Drive-back-up verbonden. Gebruik je de app op meerdere toestellen, doe dit dan ook daar — anders komt hun data bij een volgende synchronisatie terug.':
    'No Google Drive backup is connected right now. If you use the app on more than one device, do this there as well — otherwise their data comes back at the next sync.',
  'Dit kan niet ongedaan gemaakt worden. Maak eerst een back-up als je je gegevens wil bewaren.':
    'This cannot be undone. Make a backup first if you want to keep your data.',
  'Typ WISSEN om te bevestigen': 'Type ERASE to confirm',
  'WISSEN': 'ERASE',
  'Alles wissen': 'Erase everything',
  'Alles is gewist. Je begint met een schone lei.': 'Everything has been erased. You are starting with a clean slate.',
  'Lokaal is alles gewist, maar de back-up kon niet opgeruimd worden. Verbind opnieuw en probeer het nog eens, anders komt je oude data bij de volgende synchronisatie terug.':
    'Everything was erased locally, but the backup could not be cleared. Reconnect and try again, otherwise your old data will come back at the next sync.',
  'Alles is gewist op dit toestel.': 'Everything has been erased on this device.',
  'Wissen is mislukt. Er is niets gewist.': 'Erasing failed. Nothing has been erased.',
  // --- Lege app: eerste stap ---
  'Welkom bij Kompal': 'Welcome to Kompal',
  'De app is nog helemaal leeg — alles wat er straks in staat, is van jou.':
    'The app is still completely empty — everything that ends up in it will be yours.',
  'Begin met een rekening: je betaalrekening, je spaarrekening, of gewoon je portemonnee. Daarna kan je transacties ingeven.':
    'Start with an account: your current account, your savings account, or simply your wallet. After that you can enter transactions.',
  'Maak je eerste rekening aan': 'Create your first account',
  'Wil je je gegevens ook op je andere toestellen? Verbind dan later even met Google Drive via Instellingen.':
    'Want your data on your other devices too? Connect to Google Drive later via Settings.',
  'Maak eerst een rekening aan — een transactie moet ergens op geboekt worden.':
    'Create an account first — a transaction has to be booked somewhere.',
  'Geef een handelaar en een bedrag om op te slaan.': 'Enter a merchant and an amount to save.',
  'Zo verschijnt dit doel straks in de lijst.': 'This is how the goal will look in the list.',
  // Ronde 17 — meldingen, balans, besparen en privacy
  'Budget {naam} is overschreden ({pct}%)': 'Budget {naam} is over budget ({pct}%)',
  'Budget {naam} is {pct}% verbruikt': 'Budget {naam} is {pct}% used',
  'Garantie op {product} verloopt binnen {n} dag(en)': 'Warranty on {product} expires in {n} day(s)',
  '{n} vaste last(en) van deze maand staan nog niet ingeboekt':
    '{n} recurring item(s) for this month have not been recorded yet',
  'Meldingen ({n})': 'Notifications ({n})',
  'Niets om te melden. Al je budgetten en garanties zijn in orde.':
    'Nothing to report. Your budgets and warranties are all fine.',
  'Overschot': 'Surplus',
  'Tekort': 'Shortfall',
  'In balans': 'Balanced',
  'Je houdt deze maand {bedrag} over. Dat is het deel dat naar sparen of een doel kan.':
    'You have {bedrag} left this month. That is the part you can put towards savings or a goal.',
  'Je geeft deze maand {bedrag} meer uit dan er binnenkomt. Dat komt uit je spaargeld of van je rekening.':
    'This month you are spending {bedrag} more than comes in. That comes out of your savings or your account.',
  'Inkomsten en uitgaven zijn deze maand exact gelijk: je houdt niets over, maar komt ook niets tekort.':
    'Income and expenses are exactly equal this month: nothing left over, but nothing short either.',
  'Telecom en abonnementen': 'Telecom and subscriptions',
  'Verzekeringen': 'Insurance',
  'Vergelijk de prijzen van de winkels in je buurt en overloop je kassabonnen.':
    'Compare prices at the shops near you and go through your receipts.',
  'Pas je verbruik aan en vergelijk de contracten van de leveranciers.':
    'Adjust your usage and compare the suppliers’ contracts.',
  'Vergelijk de pakketten voor internet, tv en gsm — en schrap wat je niet gebruikt.':
    'Compare internet, TV and mobile bundles — and drop what you do not use.',
  'Vergelijk je polissen; vooral auto en hospitalisatie schelen vaak veel.':
    'Compare your policies; car and hospital cover in particular often differ a lot.',
  'Waar kan je besparen?': 'Where can you save?',
  'De vier domeinen waar voor een gezin doorgaans het meeste te winnen valt.':
    'The four areas where a household usually has the most to gain.',
  'Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten.':
    'No spending in these four areas yet. As soon as you record groceries, energy, telecom or insurance, you will see what they cost here.',
  'Het belletje bovenaan waarschuwt je zodra een budget van deze maand tegen zijn grens loopt.':
    'The bell at the top warns you as soon as one of this month’s budgets approaches its limit.',
  'Waarschuw vanaf': 'Warn from',
  '{n}% verbruikt': '{n}% used',
  'Een overschreden budget, een garantie die bijna verloopt en een vaste last die nog niet geboekt is, meldt de app altijd — die staan los van deze keuze.':
    'An exceeded budget, a warranty about to expire and an unrecorded recurring item are always reported — those do not depend on this setting.',
  'Je gegevens en je privacy': 'Your data and your privacy',
  'Waar je cijfers staan, en wat de app wel en niet verstuurt.':
    'Where your figures live, and what the app does and does not send.',
  'Alles staat op dit toestel': 'Everything is on this device',
  'Je rekeningen, transacties en documenten zitten in de database van deze browser, op dit toestel. Er is geen account nodig en er staat geen kopie op een server van ons — die server bestaat niet.':
    'Your accounts, transactions and documents sit in this browser’s database, on this device. No account is required and there is no copy on a server of ours — that server does not exist.',
  'De back-up staat in jouw Google Drive': 'The backup is in your own Google Drive',
  'Verbind je Drive, dan schrijft de app een logboek in één eigen map in jouw Drive. De app krijgt alleen toegang tot de bestanden die ze zelf maakt, niet tot de rest van je Drive. Die back-up is niet extra versleuteld: wie bij je Google-account kan, kan ze lezen — beveilig dat account dus goed.':
    'If you connect Drive, the app writes a log into a single folder of its own in your Drive. It can only reach the files it creates itself, not the rest of your Drive. That backup is not separately encrypted: anyone who can reach your Google account can read it — so protect that account well.',
  'Wat er wél het toestel verlaat': 'What does leave the device',
  'Scan je een streepjescode, dan gaat enkel die code naar de open productendatabank Open Food Facts om de productnaam op te halen. Loopt de app vast, dan wordt een technisch foutrapport verstuurd (welke fout, welke browser) — nooit een bedrag of een naam. Verder gaat er niets weg.':
    'When you scan a barcode, only that code goes to the open product database Open Food Facts to look up the product name. If the app crashes, a technical error report is sent (which error, which browser) — never an amount or a name. Nothing else leaves.',
  'Geen advertenties, geen doorverkoop': 'No ads, no reselling',
  'Er zit geen advertentie- of volgcode in de app, en je gegevens gaan naar niemand anders.':
    'There is no advertising or tracking code in the app, and your data goes to no one else.',
  // Ronde 18 — spaardoelen, buffer en auto-categorisatie
  'Doel gehaald': 'Goal reached',
  'Datum voorbij': 'Date passed',
  'De doeldatum is verstreken. Zet een nieuwe datum om weer een tempo te kunnen berekenen.':
    'The target date has passed. Set a new date to get a pace again.',
  'Op schema': 'On track',
  'Achter op schema': 'Behind schedule',
  '{bedrag} per maand nodig ({n} mnd te gaan)': '{bedrag} per month needed ({n} mo to go)',
  'jouw streefbedrag: {bedrag}': 'your target amount: {bedrag}',
  'je tempo: {bedrag} per maand (gemiddeld over {n} maanden)':
    'your pace: {bedrag} per month (average over {n} months)',
  'zo klaar rond {datum}': 'at that pace, done around {datum}',
  'Zet een doeldatum of een maandbedrag om te zien of je op schema zit.':
    'Set a target date or a monthly amount to see whether you are on track.',
  'Koppel een rekening of zet een doeldatum om te zien of je op schema zit.':
    'Link an account or set a target date to see whether you are on track.',
  '{n} maanden buffer': '{n} months of buffer',
  '1 maand buffer': '1 month of buffer',
  'Je vaste lasten zijn {last} per maand. Met {geld} op je spaar- en cashrekeningen kom je zo lang toe zonder inkomen — eten en tanken komen daar nog bij.':
    'Your fixed costs are {last} per month. With {geld} in your savings and cash accounts you would last that long without income — food and fuel come on top of that.',
  'Vorige keer bij deze handelaar:': 'Last time at this merchant:',
  'Gebruik {naam}, zoals de vorige keer': 'Use {naam}, same as last time',
  // Ronde 19 — installeren, venster en categorielijsten
  'Op je beginscherm': 'On your home screen',
  'Je gebruikt Kompal al als app. Zo werkt ze ook zonder internet.':
    'You are already using Kompal as an app. That way it also works without internet.',
  'Op je beginscherm zetten': 'Add to your home screen',
  'Zet Kompal bij je andere apps: ze opent dan zonder browserbalken en werkt ook zonder internet.':
    'Put Kompal next to your other apps: it then opens without browser bars and works without internet too.',
  'Zet op beginscherm': 'Add to home screen',
  'De app staat nu op je beginscherm.': 'The app is now on your home screen.',
  'Niet toegevoegd. Je kan het later opnieuw proberen.': 'Not added. You can try again later.',
  'Open deze pagina in Safari (niet in een andere browser).': 'Open this page in Safari (not in another browser).',
  'Tik op de drie puntjes rechts van de adresbalk en kies "Deel".':
    'Tap the three dots to the right of the address bar and choose “Share”.',
  'Scroll in die lijst naar onder tot "Zet op beginscherm".': 'Scroll down that list until “Add to Home Screen”.',
  'Zet de schakelaar "Open as Web App" AAN — anders krijg je enkel een bladwijzer.':
    'Turn the “Open as Web App” switch ON — otherwise you only get a bookmark.',
  'Tik op "Voeg toe".': 'Tap “Add”.',
  'Je browser biedt hier nu niets aan. Op een telefoon lukt het meestal via het menu van je browser, met een keuze als "Toevoegen aan beginscherm" of "App installeren".':
    'Your browser is not offering anything here right now. On a phone it usually works through your browser’s menu, with an option like “Add to home screen” or “Install app”.',
  '{n} oudere boeking(en) vallen buiten dit venster van {maanden} maanden.':
    '{n} older entry/entries fall outside this window of {maanden} months.',
  'Toon ze ook': 'Show those too',
  // Ronde 21 — de invoerpopup
  'Wat wil je boeken?': 'What do you want to record?',
  'Vaste last': 'Fixed cost',
  'Sparen': 'Save',
  'Uitgave toevoegen': 'Add an expense',
  'Inkomst toevoegen': 'Add income',
  'Vaste last toevoegen': 'Add a fixed cost',
  'Opslaan + volgende': 'Save + next',
  'Komt dit geld binnen of gaat het eruit?': 'Is this money coming in or going out?',
  'Een vaste last komt elke maand terug. Je boekt ze per maand in, ze wordt niet automatisch afgeschreven.':
    'A fixed cost comes back every month. You record it per month; it is not deducted automatically.',
  'Sparen is geld verschuiven tussen je eigen rekeningen. Het is geen uitgave en telt nergens in een budget mee.':
    'Saving moves money between your own accounts. It is not an expense and never counts towards a budget.',
  // Ronde 22 — invoer completeren
  'Meer opties': 'More options',
  'Meer opties ({n} ingevuld)': 'More options ({n} filled in)',
  'Minder opties': 'Fewer options',
  'Delen in een dossier (optioneel)': 'Share in a case (optional)',
  'Niet delen': 'Do not share',
  'Je betaalde deze uitgave zelf. De verdeling volgt de afspraak van het dossier; op de Dossiers-pagina kan je ze voor deze kost nog aanpassen.':
    'You paid this expense yourself. The split follows the case’s arrangement; on the Cases page you can still adjust it for this expense.',
  'Deze uitgave zit al in een afrekening van een dossier en wordt hier niet meer gewijzigd.':
    'This expense is already part of a case settlement and is no longer changed here.',
  'Een inkomst kan geen gedeelde kost zijn. Bewaar je dit zo, dan verdwijnt de koppeling met het dossier.':
    'Income cannot be a shared expense. If you save it like this, the link with the case disappears.',
  'Bewaar de bon of factuur van deze transactie.': 'Keep the receipt or invoice for this transaction.',
  'bv. Kassaticket Colruyt': 'e.g. Colruyt receipt',
  // Ronde 23 — de Plan-pagina en vaste lasten met andere termijnen
  'Hoe vaak?': 'How often?',
  'Elke maand': 'Every month',
  'Om de 3 maanden': 'Every 3 months',
  'Om de 6 maanden': 'Every 6 months',
  'Eén keer per jaar': 'Once a year',
  'Eerste betaling in': 'First payment in',
  'Hier maandelijks voor opzijzetten': 'Set money aside for this every month',
  'In de maanden zonder betaling rekent je plan op {bedrag} opzij.':
    'In the months without a payment, your plan sets {bedrag} aside.',
  'Zonder dit staat het volle bedrag in één keer in je plan, in de maand dat het vervalt.':
    'Without this, the full amount lands in your plan in one go, in the month it is due.',
  'Niet deze maand': 'Not this month',
  'volgende keer {datum}': 'next time {datum}',
  ' · {bedrag} per maand opzij': ' · {bedrag} a month set aside',
  ' · {bedrag} per maand omgerekend': ' · {bedrag} a month when spread out',
  'Wat ligt vast, wat blijft over': 'What is committed, what is left',
  'Op basis van je vaste lasten en je verwachte inkomsten deze maand.':
    'Based on your fixed costs and the income you expect this month.',
  'Verwachte inkomsten': 'Expected income',
  'Vaste lasten deze maand': 'Fixed costs this month',
  'Opzij voor later': 'Set aside for later',
  'Te verdelen': 'Left to allocate',
  'Je budgetten vragen samen {gebudgetteerd} hiervan.': 'Your budgets claim {gebudgetteerd} of this.',
  'Je budgetten vragen samen {gebudgetteerd} — dat is meer dan er te verdelen valt.':
    'Your budgets claim {gebudgetteerd} together — more than there is to allocate.',
  'Over het hele jaar kosten je vaste lasten gemiddeld {bedrag} per maand.':
    'Across the year, your fixed costs average {bedrag} a month.',
  '{naam} staat nog niet ingeboekt deze maand': '{naam} has not been recorded this month yet',
  // Ronde 24 — de Transacties-pagina
  'Alle maanden': 'All months',
  'Meer filters': 'More filters',
  'Meer filters · {n}': 'More filters · {n}',
  'Sorteer op': 'Sort by',
  'Sorteer op {kolom}': 'Sort by {kolom}',
  'Alles selecteren': 'Select all',
  'Selecteer {oms}': 'Select {oms}',
  '{n} geselecteerd': '{n} selected',
  'Categorie toekennen': 'Assign category',
  'Selectie wissen': 'Clear selection',
  'Ja, verwijder {n}': 'Yes, delete {n}',
  '{n} gesplitst(e) kassaticket(s) krijgen geen categorie: die hebben er een per regel.':
    '{n} split receipt(s) get no category: those have one per line.',
  'Categorie voor de selectie': 'Category for the selection',
  'Gedeeld in een dossier': 'Shared in a case',
  'gedeeld': 'shared',
  '{n} transactie(s) verwijderd': '{n} transaction(s) deleted',
  '{n} transactie(s) gewijzigd': '{n} transaction(s) updated',
  // Ronde 25 — vaste inkomsten, budgetdiepte en inboeken ongedaan maken
  'Vaste inkomsten': 'Recurring income',
  'Vaste inkomst toevoegen': 'Add recurring income',
  'Je loon en alles wat elke maand binnenkomt. Hierop rekent je plan.':
    'Your salary and everything that comes in every month. This is what your plan is based on.',
  'Nog geen vaste inkomsten. Vul hieronder je loon in, anders weet je plan niet wat er te verdelen valt.':
    'No recurring income yet. Add your salary below, otherwise your plan cannot tell what there is to allocate.',
  'Nog geen vaste lasten.': 'No fixed costs yet.',
  'Vul hieronder je vaste inkomsten in — je loon bijvoorbeeld — dan berekent de app wat er te verdelen valt.':
    'Add your recurring income below — your salary, for instance — and the app will work out what there is to allocate.',
  'Er kwam deze maand {gekregen} binnen — precies je vaste inkomsten.':
    '{gekregen} came in this month — exactly your recurring income.',
  'Er kwam deze maand {gekregen} binnen — {verschil} meer dan je vaste inkomsten.':
    '{gekregen} came in this month — {verschil} more than your recurring income.',
  'Er kwam deze maand {gekregen} binnen — {verschil} minder dan je vaste inkomsten.':
    '{gekregen} came in this month — {verschil} less than your recurring income.',
  'Uitboeken': 'Unrecord',
  'Uitboeken: wis de transactie van {naam}': 'Unrecord: delete the transaction for {naam}',
  'Inboeken ongedaan gemaakt': 'Recording undone',
  '{naam} ingeboekt': '{naam} recorded',
  // Ronde 26 — de Analyse-pagina
  'Klik een rij open voor de details erachter.': 'Open a row for the details behind it.',
  'Toon details van {naam}': 'Show details for {naam}',
  // Ronde 27 — een eigen boom en de Categorieën-pagina
  '+ categorie': '+ category',
  'Naam categorie': 'Category name',
  'Nieuwe categorie in {naam}': 'New category in {naam}',
  'Voeg categorie toe aan {naam}': 'Add a category to {naam}',
  'Vouw open om te bekijken. Je kan op elk niveau iets toevoegen.':
    'Expand to browse. You can add something at every level.',
  '{c} cat. · {i} items': '{c} cat. · {i} items',
  'Zoek een categorie': 'Search for a category',
  'Typ om ook subcategorieën en producten te zoeken…': 'Type to search subcategories and products too…',
  'Niets gevonden voor deze zoekterm.': 'Nothing found for this search.',
  'Je kan een budget ook op een subcategorie of op één product zetten — typ dan de naam.':
    'You can also set a budget on a subcategory or on a single product — just type its name.',
  // Ronde 36 — gewone versus buitengewone kosten, de onderdelen van een dossier,
  // en de brug tussen een boeking en een garantiebewijs.
  'Voorstel: buitengewone kost — {reden}. Je kan dit zelf aanpassen.':
    'Suggestion: extraordinary expense — {reden}. You can change this yourself.',
  'Deze categorie staat niet op de indicatieve lijst, dus stellen we een gewone kost voor. Je kan dit zelf aanpassen.':
    'This category is not on the indicative list, so we suggest an ordinary expense. You can change this yourself.',
  'Je koos zelf {soort}; het voorstel was {voorstel}.':
    'You chose {soort} yourself; the suggestion was {voorstel}.',
  'Voorstel volgen': 'Use the suggestion',
  'Indicatieve lijst uit het KB van 22 april 2019':
    'Indicative list from the Belgian Royal Decree of 22 April 2019',
  'Medische en paramedische kosten': 'Medical and paramedical costs',
  'Kosten van de schoolse opleiding': 'Costs of schooling',
  'Kosten voor ontwikkeling en ontplooiing': 'Costs for development and personal growth',
  'Staat niet in de indicatieve lijst van buitengewone kosten':
    'Not on the indicative list of extraordinary costs',
  'Verrekeningen': 'Settlements',
  'Wat toon je in dit dossier?': 'What do you show for this case?',
  'Garantiebewijs bijhouden': 'Keep a proof of warranty',
  'Kompal maakt er een garantiebewijs bij met deze boeking als aankoopbewijs, en verwittigt je voor de garantie afloopt.':
    'Kompal creates a proof of warranty with this entry as the proof of purchase, and warns you before the warranty runs out.',
  'Garantie (maanden)': 'Warranty (months)',
  'Wettelijk minimum op een nieuw product: 24 maanden.': 'Legal minimum on a new product: 24 months.',
  'Dit bewijs bestaat al; je past hier alleen de garantieduur aan.':
    'This proof already exists; here you only change the warranty period.',
  'Een inkomst heeft geen garantiebewijs. Bewaar je dit zo, dan blijft het bewijs bestaan bij je garanties, maar hangt het niet meer aan deze boeking.':
    'Income has no proof of warranty. If you save it like this, the proof stays with your warranties but is no longer linked to this entry.',
  'Vul een aantal maanden in, bijvoorbeeld 24.': 'Enter a number of months, for example 24.',
  '{naam} toegevoegd, onderaan de lijst.': '{naam} added, at the bottom of the list.',
  'garantie': 'warranty',
  'Er hangt een garantiebewijs aan deze boeking': 'A proof of warranty is attached to this entry',
  'Uit je boeking van {datum}: {oms}': 'From your entry of {datum}: {oms}',
  'bon van de boeking': 'receipt from the entry',
  // Ronde 37 — een bankuittreksel inlezen (CSV).
  'Inlezen': 'Import',
  'Bankuittreksel inlezen': 'Import a bank statement',
  'Kies het CSV-bestand dat je bij je bank downloadt. Het blijft op dit toestel — er wordt niets verstuurd.':
    'Choose the CSV file you download from your bank. It stays on this device — nothing is sent anywhere.',
  'Maak eerst een rekening aan; een boeking moet ergens op staan.':
    'Create an account first; an entry has to belong somewhere.',
  'Bestand': 'File',
  'Op welke rekening?': 'On which account?',
  'Dit bestand bevat geen regels.': 'This file contains no rows.',
  'Dit bestand bevat alleen kolomnamen en geen boekingen.':
    'This file only contains column names and no entries.',
  'Kloppen de kolommen?': 'Are the columns right?',
  'Dit formaat kennen we van de vorige keer — de kolommen staan al goed.':
    'We know this format from last time — the columns are already set.',
  'Kompal heeft geraden. Klopt er iets niet, zet het dan hier recht; de volgende keer onthoudt ze het.':
    'Kompal guessed. If something is wrong, correct it here; next time it will remember.',
  '{naam} · {n} regels': '{naam} · {n} rows',
  'Kolom {n}': 'Column {n}',
  '(leeg)': '(empty)',
  'Wat staat er in de kolom {naam}?': 'What is in the column {naam}?',
  'Duid aan welke kolom de datum bevat.': 'Select which column contains the date.',
  'Duid aan welke kolom het bedrag bevat.': 'Select which column contains the amount.',
  'niet gebruiken': 'do not use',
  'Tegenpartij': 'Counterparty',
  'Mededeling': 'Message',
  'Bedrag af (debet)': 'Amount out (debit)',
  'Bedrag bij (credit)': 'Amount in (credit)',
  'Nakijken en inlezen': 'Review and import',
  'Met deze kolommen valt er geen enkele boeking te lezen.':
    'With these columns not a single entry can be read.',
  '{gekozen} van {totaal} geselecteerd': '{gekozen} of {totaal} selected',
  'Neem {oms} van {datum} mee': 'Include {oms} of {datum}',
  'Deze boeking staat er waarschijnlijk al': 'This entry is probably already there',
  'lijkt al geboekt': 'looks already recorded',
  'Lees {n} boeking(en) in': 'Import {n} entr(y/ies)',
  'Ze komen op {rekening} te staan. Categorieën worden voorgesteld op basis van wat je eerder boekte bij dezelfde winkel.':
    'They will be placed on {rekening}. Categories are suggested from what you recorded before at the same shop.',
  '{n} boeking(en) ingelezen': '{n} entr(y/ies) imported',
  '{n} boeking(en) ingelezen.': '{n} entr(y/ies) imported.',
  '{n}× geen datum gevonden': '{n}× no date found',
  '{n}× geen bedrag gevonden': '{n}× no amount found',
  '{n} regels overgeslagen: {redenen}.': '{n} rows skipped: {redenen}.',
  'Dit lijkt geen CSV-bestand. Kies bij je bank de export als CSV — een pdf of een Excel-bestand kan Kompal niet lezen.':
    'This does not look like a CSV file. At your bank, choose the CSV export — Kompal cannot read a PDF or an Excel file.',
  '{n} regel(s) bovenaan overgeslagen (geen boekingen)': '{n} row(s) at the top skipped (not entries)',
  'Vink aan wat je wil overnemen. Wat al geboekt lijkt, staat standaard uit.':
    'Tick what you want to take over. Anything that looks already recorded is off by default.',
  '{n} boekingen van {van} t/m {tot}, samen {saldo}': '{n} entries from {van} to {tot}, {saldo} in total',
  'Alles aan': 'All on',
  'Alles uit': 'All off',
  'Zet de {n} vermoedelijke dubbels uit': 'Turn off the {n} likely duplicates',
  'Vink minstens één boeking aan.': 'Tick at least one entry.',
  'Het inlezen is niet gelukt. Je selectie staat er nog, dus je kan het opnieuw proberen.':
    'The import did not succeed. Your selection is still here, so you can try again.',
  'Toon {n} regels meer ({rest} nog niet getoond)': 'Show {n} more rows ({rest} not shown yet)',
  'de eerste {n} zijn zichtbaar, maar alles wat aanstaat wordt ingelezen':
    'the first {n} are visible, but everything that is on will be imported',
  'Boeking zonder omschrijving': 'Entry without a description',
  'Waar vind ik dat bestand bij mijn bank?': 'Where do I find that file at my bank?',
  'In je bankapp of op de website van je bank zoek je bij je rekeninguittreksels naar "exporteren" of "downloaden". Kies daar het formaat CSV (soms staat er "CSV/Excel"). Kompal kan geen pdf lezen — dat is een afdruk, geen bestand met cijfers erin.':
    'In your banking app or on your bank\u2019s website, look for "export" or "download" near your statements. Choose the CSV format there (sometimes labelled "CSV/Excel"). Kompal cannot read a PDF — that is a printout, not a file with figures in it.',
  'Categorie voor de {n} regels zonder voorstel (optioneel)':
    'Category for the {n} rows without a suggestion (optional)',
  // Ronde 40 — doorklikken, vindbaarheid en de klokken
  'Bekijk de boekingen van {naam} ›': 'View the entries for {naam} ›',
  'Bekijk in Transacties ›': 'View in Transactions ›',
  'Wat er op je rekeningen staat, van {van} tot {tot}': 'What is in your accounts, from {van} to {tot}',
  'over {n} maanden': 'over {n} months',
  '{van} t.e.m. {tot}, met je gemiddelde als lijn.': '{van} through {tot}, with your average as a line.',
  'dag {dag}': 'day {dag}',
  'Niets gevonden voor “{term}”': 'Nothing found for “{term}”',
  'Opbouw van een afrekening': 'Breakdown of a settlement',
  'Toon opbouw': 'Show breakdown',
  'Verberg opbouw': 'Hide breakdown',
  'Geen kosten in deze afrekening.': 'No costs in this settlement.',
  'Bewerk {oms} — {datum}, {bedrag}': 'Edit {oms} — {datum}, {bedrag}',
  'Bekijk de boekingen van {naam} — {bedrag}': 'View the entries for {naam} — {bedrag}',
  'Bekijk de boekingen van {naam} — {bedrag}, {periode}': 'View the entries for {naam} — {bedrag}, {periode}',
  '{label} — open het dossier van {oms}': '{label} — open the case for {oms}',
  '{label} — open het garantiebewijs van {oms}': '{label} — open the warranty for {oms}',
  'Boek {naam} in': 'Record {naam}',
  '{n} treffer(s) in {m} hoofdcategorie(ën)': '{n} match(es) in {m} main category/ies',
  'Zoek een categorie of subcategorie (vanaf {n} letters)…': 'Search for a category or subcategory (from {n} letters)…',
  '{n} vaste last(en) nog in te boeken in {maand}': '{n} fixed cost(s) still to record in {maand}',
  'verwacht in {maand}': 'expected in {maand}',
  'Alle vaste lasten voor {maand} zijn al ingeboekt': 'All fixed costs for {maand} have already been recorded',
  // Ronde 41 — exporteren en de bewijsmap
  'Exporteer CSV': 'Export CSV',
  'Toelichting': 'Note',
  'Ticket': 'Receipt',
  'inkomst': 'income',
  'uitgave': 'expense',
  'alle transacties': 'all transactions',
  'Het bestand kon niet gedownload worden. Probeer het opnieuw.': 'The file could not be downloaded. Please try again.',
  'Rapport en print': 'Report and print',
  'De kengetallen, de uitsplitsing per categorie en de volledige boekingenlijst — cijfers en lijsten, geen grafieken.':
    'The key figures, the breakdown per category and the full list of entries — figures and lists, no charts.',
  '{periode} als PDF': '{periode} as PDF',
  'Heel {jaar} als PDF': 'All of {jaar} as PDF',
  'Print deze pagina': 'Print this page',
  'Het rapport kon niet gemaakt worden. Probeer het opnieuw.': 'The report could not be created. Please try again.',
  'Jaarrapport {periode}': 'Annual report {periode}',
  'Maandrapport {periode}': 'Monthly report {periode}',
  '{n} boeking(en) in deze periode': '{n} entry/entries in this period',
  'Kengetallen': 'Key figures',
  'Saldo op {datum}': 'Balance on {datum}',
  'Netto is inkomsten min uitgaven in deze periode. Het saldo is de stand van al je rekeningen samen op {datum}.':
    'Net is income minus expenses in this period. The balance is the total of all your accounts on {datum}.',
  'Aandeel': 'Share',
  'Een kassaticket dat over meerdere categorieën verdeeld is, staat hierboven per categorie apart — het totaal blijft daardoor gelijk aan de kengetallen.':
    'A receipt split across several categories appears above per category — so the total still matches the key figures.',
  'Per maand': 'Per month',
  'Boekingen': 'Entries',
  'Er staan geen boekingen in deze periode.': 'There are no entries in this period.',
  'zonder omschrijving': 'without description',
  'Bewijsmap': 'Evidence file',
  'Bewijsmap met bonnen van de afrekening van {datum}': 'Evidence file with receipts for the settlement of {datum}',
  'De bewijsmap kon niet gemaakt worden. Probeer het opnieuw.': 'The evidence file could not be created. Please try again.',
  'Kopieer stuurt een korte samenvatting door. PDF is diezelfde samenvatting als document. De bewijsmap is het volledige dossier: per kost de berekening en elke bon als bijlage.':
    'Copy sends a short summary. PDF is that same summary as a document. The evidence file is the complete case: the calculation for every cost and every receipt as an attachment.',
  'Bewijsmap — {naam}': 'Evidence file — {naam}',
  'Datum van de afrekening': 'Date of the settlement',
  '{n} kost(en), {m} bijlage(n)': '{n} cost(s), {m} attachment(s)',
  'Wat dit document is': 'What this document is',
  'Dit document is een overzicht van de kosten en berekeningen zoals ze in Financieel Kompas zijn ingevoerd.':
    'This document is an overview of the costs and calculations as they were entered in Financieel Kompas.',
  'De bedragen en verdeelsleutels komen uit die invoer. Wie ze invoerde, blijft er verantwoordelijk voor.':
    'The amounts and allocation keys come from that input. Whoever entered them remains responsible for them.',
  'Dit is geen juridisch advies en geen uitspraak over wie waar recht op heeft. De app rekent; de afspraak of de rechter beslist.':
    'This is not legal advice and not a ruling on who is entitled to what. The app calculates; the agreement or the court decides.',
  'Een bon die als PDF-bestand werd toegevoegd, kan niet als afbeelding in dit document. Die staat als aparte bijlage vermeld en is los op te vragen.':
    'A receipt added as a PDF file cannot be embedded as an image in this document. It is listed as a separate attachment and can be requested separately.',
  'Elke kost is verdeeld volgens een van deze afspraken. Achter elke regel staat op hoeveel kosten ze van toepassing was.':
    'Every cost is split according to one of these agreements. Each line states how many costs it applied to.',
  'De kosten, chronologisch': 'The costs, in chronological order',
  'Per kost: het bedrag, de verdeling die erop is toegepast en waarom die gold. Zo is elke rij na te rekenen.':
    'Per cost: the amount, the split applied to it and why it applied. That makes every line verifiable.',
  '{bedrag} x {p}% = {jouw} voor jou, {partner} voor partner': '{bedrag} x {p}% = {jouw} for you, {partner} for partner',
  'zie bijlage {n}': 'see attachment {n}',
  'Bijlagen': 'Attachments',
  'Bijlage {n}': 'Attachment {n}',
  'toegevoegd op {datum}': 'added on {datum}',
  'Er zijn geen bonnen of documenten toegevoegd aan de kosten van deze afrekening.':
    'No receipts or documents have been added to the costs in this settlement.',
  'Deze bon is als PDF-bestand toegevoegd en kan niet als afbeelding worden ingevoegd. Vraag het losse bestand op.':
    'This receipt was added as a PDF file and cannot be embedded as an image. Request the separate file.',
  'Deze bon kon niet worden weergegeven. Het bestand is beschadigd of van een onbekend type.':
    'This receipt could not be displayed. The file is damaged or of an unknown type.',
  // Ronde 41 — na de review: meldingen en wachttoestanden
  'De back-up kon niet gedownload worden. Probeer het opnieuw.': 'The backup could not be downloaded. Please try again.',
  'Het rapport van {periode} is gedownload.': 'The report for {periode} has been downloaded.',
  '{periode} als PDF — bezig…': '{periode} as PDF — working…',
  'Heel {jaar} als PDF — bezig…': 'All of {jaar} as PDF — working…',
  '{n} rij(en) gedownload als CSV-bestand.': '{n} row(s) downloaded as a CSV file.',
  'De CSV bevat precies deze rijen, in deze volgorde. Je opent hem met Excel of Numbers.':
    'The CSV contains exactly these rows, in this order. You open it with Excel or Numbers.',
  'De PDF van {datum} is gedownload.': 'The PDF for {datum} has been downloaded.',
  'De PDF van {datum} kon niet gemaakt worden. Probeer het opnieuw.':
    'The PDF for {datum} could not be created. Please try again.',
  'De bewijsmap van {datum} is gedownload.': 'The evidence file for {datum} has been downloaded.',
  'De bewijsmap van {datum} kon niet gemaakt worden. Probeer het opnieuw.':
    'The evidence file for {datum} could not be created. Please try again.',
  'Bewijsmap van {datum} — bezig…': 'Evidence file for {datum} — working…',
  '{n} van {totaal}': '{n} of {totaal}',
  // Ronde 42 — de onderhoudsbijdrage
  'Onderhoudsbijdrage': 'Maintenance contribution',
  'Het vaste maandbedrag uit je vonnis of overeenkomst. De app houdt de jaarlijkse indexatie bij en rekent uit wat er betaald is.':
    'The fixed monthly amount from your court order or agreement. The app tracks the yearly indexation and works out what has been paid.',
  'Nog geen onderhoudsbijdrage ingesteld voor dit dossier.':
    'No maintenance contribution set for this case yet.',
  'Onderhoudsbijdrage instellen': 'Set up maintenance contribution',
  'De brief is gedownload.': 'The letter has been downloaded.',
  'De brief kon niet gemaakt worden. Probeer het opnieuw.':
    'The letter could not be created. Please try again.',
  'Onderhoudsbijdrage verwijderen': 'Delete maintenance contribution',
  'Bijdrage vandaag': 'Contribution today',
  'gelijk aan het bedrag uit de regeling van {datum}':
    'same as the amount in the {datum} arrangement',
  'geïndexeerd; in de regeling van {datum} stond {basis}':
    'indexed; the {datum} arrangement stated {basis}',
  'Sinds {datum} staat de bijdrage op {bedrag}. Loopt de betaling nog op het oude bedrag, dan is dat sindsdien elke maand een verschil.':
    'Since {datum} the contribution is {bedrag}. If the payment is still at the old amount, that is a difference every month since then.',
  'De app kent nog geen indexcijfer voor {maanden}. Ze kent cijfers tot {laatste}. Vul het ontbrekende cijfer hieronder zelf in, dan is de berekening volledig.':
    'The app has no index figure for {maanden} yet. It knows figures up to {laatste}. Enter the missing figure below and the calculation is complete.',
  'Verberg de opbouw': 'Hide the breakdown',
  'Toon de opbouw': 'Show the breakdown',
  'Verberg wat er betaald is': 'Hide what has been paid',
  'Toon wat er betaald is': 'Show what has been paid',
  'Brief met de berekening': 'Letter with the calculation',
  'Sluit de regeling': 'Close the arrangement',
  'Wijzig de regeling': 'Change the arrangement',
  'Hoe dit bedrag tot stand komt': 'How this amount is arrived at',
  'Elke verjaardag rekent opnieuw vanaf het bedrag uit de regeling, niet vanaf dat van vorig jaar — zo stapelen afrondingen zich niet op.':
    'Every anniversary is calculated afresh from the amount in the arrangement, not from last year’s — that way rounding does not accumulate.',
  'De regeling sluit indexatie uit, dus het bedrag blijft ongewijzigd.':
    'The arrangement excludes indexation, so the amount stays unchanged.',
  'De eerste verjaardag van de regeling moet nog komen: op {datum}.':
    'The first anniversary of the arrangement is still to come: on {datum}.',
  'index van {maand} nog niet bekend — bedrag ongewijzigd gelaten':
    'index for {maand} not known yet — amount left unchanged',
  'index {index} uit {maand}': 'index {index} from {maand}',
  'De app kent indexcijfers tot {laatste}, in basis {jaar} = 100.':
    'The app knows index figures up to {laatste}, base {jaar} = 100.',
  'Vul een bedrag groter dan nul in.': 'Enter an amount greater than zero.',
  'Wat er verschuldigd was en wat er betaald is': 'What was owed and what has been paid',
  'Verschuldigd': 'Owed',
  'over {n} maand(en)': 'over {n} month(s)',
  'Betaald': 'Paid',
  '{n} betaling(en) geregistreerd': '{n} payment(s) recorded',
  'Betaling toevoegen': 'Add payment',
  'Voor de maand': 'For the month',
  'Nog geen betalingen geregistreerd.': 'No payments recorded yet.',
  'Verwijder betaling van {datum}': 'Delete payment of {datum}',
  'Kies een maand en vul een indexcijfer groter dan nul in.':
    'Choose a month and enter an index figure greater than zero.',
  'De regeling': 'The arrangement',
  'Bedrag uit de regeling': 'Amount in the arrangement',
  'Datum vonnis of overeenkomst': 'Date of court order or agreement',
  'De andere ouder betaalt aan jou': 'The other parent pays you',
  'Jij betaalt aan de andere ouder': 'You pay the other parent',
  'De datum bepaalt twee dingen: de aanvangsindex (de maand ervóór) en de dag waarop er elk jaar geïndexeerd wordt.':
    'The date determines two things: the starting index (the month before) and the day of the yearly indexation.',
  'Jaarlijks indexeren (de wettelijke regel, tenzij de akte iets anders zegt)':
    'Index yearly (the legal rule, unless the deed says otherwise)',
  'Aanvangsindex uit de akte (optioneel)': 'Starting index from the deed (optional)',
  'leeg = de app zoekt ze zelf op': 'empty = the app looks it up itself',
  'Bewaar de regeling': 'Save the arrangement',
  'Zelf een indexcijfer toevoegen': 'Add an index figure yourself',
  'De app kent cijfers tot {laatste}. Loopt je verjaardag daarop vooruit, vul het cijfer dan hier in — je vindt het bij Statbel.':
    'The app knows figures up to {laatste}. If your anniversary is later, enter the figure here — you will find it at Statbel.',
  'Maand': 'Month',
  'Gezondheidsindex': 'Health index',
  'De app kent deze maand al. Vul je hier iets in, dan gaat jouw cijfer voor.':
    'The app already knows this month. If you enter something here, your figure takes precedence.',
  'Indexcijfer toevoegen': 'Add index figure',
  'Verwijder je eigen indexcijfer voor {maand}': 'Delete your own index figure for {maand}',
  'Voor welke kinderen de bijdrage geldt, stel je in bij de gezinsleden van dit dossier.':
    'Which children the contribution applies to is set with the family members of this case.',
  '{basis} x {nieuw} / {aanvang} = {uit}': '{basis} x {nieuw} / {aanvang} = {uit}',
  'De aanvangsindex is niet bekend: de app kent geen indexcijfer voor {maand}.':
    'The starting index is unknown: the app has no index figure for {maand}.',
  'Aanvangsindex {index}, zoals ze in de akte staat.':
    'Starting index {index}, as stated in the deed.',
  'Aanvangsindex {index}: de gezondheidsindex van {maand}, de maand vóór de regeling.':
    'Starting index {index}: the health index of {maand}, the month before the arrangement.',
  'Let op: de indexcijfers van de app staan in basis {jaar} = 100. Staat er in je vonnis een aanvangsindex uit een ouder basisjaar, vul die dan hier in én gebruik ook voor de nieuwe index een cijfer uit datzelfde basisjaar. Twee cijfers uit verschillende basisjaren geven een bedrag dat er juist uitziet en het niet is.':
    'Note: the app’s index figures use base {jaar} = 100. If your court order states a starting index from an older base year, enter it here and also use a figure from that same base year for the new index. Two figures from different base years produce an amount that looks right and is not.',
  'Per maand geteld vanaf de maand van de regeling, telkens met het bedrag dat op de eerste van die maand gold. Een aanpassing die halverwege een maand ingaat, telt dus vanaf de maand erna.':
    'Counted month by month from the month of the arrangement, each time with the amount that applied on the first of that month. An adjustment taking effect mid-month therefore counts from the following month.',
  'Dit blad is een berekening op basis van wat er in Financieel Kompas is ingevoerd: het bedrag uit de regeling, de datum ervan en de gezondheidsindex.':
    'This sheet is a calculation based on what was entered in Financieel Kompas: the amount in the arrangement, its date and the health index.',
  'De indexatie gebeurt in België van rechtswege, jaarlijks op de verjaardag van de regeling — tenzij de akte iets anders bepaalt. Wat er in jouw akte staat, gaat voor op wat hier staat.':
    'In Belgium indexation applies by operation of law, yearly on the anniversary of the arrangement — unless the deed provides otherwise. What your deed says takes precedence over what is stated here.',
  'Dit is geen juridisch advies en geen ingebrekestelling. De app rekent; wat je met het cijfer doet, beslis jij.':
    'This is not legal advice and not a formal notice of default. The app calculates; what you do with the figure is up to you.',
  'Betaald en verschuldigd zijn precies gelijk.': 'Paid and owed are exactly equal.',
  'Er staat nog {bedrag} open die jij verschuldigd bent.':
    '{bedrag} is still outstanding that you owe.',
  'Er staat nog {bedrag} open die aan jou verschuldigd is.':
    '{bedrag} is still outstanding that is owed to you.',
  'Er is {bedrag} meer betaald dan berekend.': '{bedrag} more has been paid than calculated.',
  'Er is {bedrag} meer ontvangen dan berekend.':
    '{bedrag} more has been received than calculated.',
  'Onderhoudsbijdrage — {naam}': 'Maintenance contribution — {naam}',
  'Regeling van': 'Arrangement of',
  'Bedrag in de regeling': 'Amount in the arrangement',
  'De bijdrage vandaag': 'The contribution today',
  'De regeling sluit indexatie uit; het bedrag blijft dus ongewijzigd.':
    'The arrangement excludes indexation; the amount therefore stays unchanged.',
  'Hoe dit berekend is': 'How this was calculated',
  'De onderhoudsbijdrage volgt de gezondheidsindex. Het nieuwe bedrag is telkens: het bedrag uit de regeling, maal de index van de maand vóór de verjaardag, gedeeld door de aanvangsindex.':
    'The maintenance contribution follows the health index. The new amount is always: the amount in the arrangement, times the index of the month before the anniversary, divided by the starting index.',
  'De indexcijfers komen van Statbel en staan in basis {jaar} = 100. De app kent cijfers tot {laatste}.':
    'The index figures come from Statbel and use base {jaar} = 100. The app knows figures up to {laatste}.',
  'Per verjaardag': 'Per anniversary',
  'Er is nog geen verjaardag van de regeling geweest.':
    'There has not been an anniversary of the arrangement yet.',
  'Wat er nog ontbreekt': 'What is still missing',
  'Voor deze maanden is er geen indexcijfer gebruikt: {maanden}. De bedragen van die verjaardagen zijn daarom ongewijzigd gelaten in plaats van geschat.':
    'No index figure was used for these months: {maanden}. The amounts for those anniversaries were therefore left unchanged rather than estimated.',
  'Wat dit blad is': 'What this sheet is',
  'Onderhoudsbijdrage verwijderd': 'Maintenance contribution deleted',
  'Betaling verwijderd': 'Payment deleted',
  // Ronde 42 — na de review
  'Nog geen onderhoudsbijdrage ingesteld voor dit dossier. Je hebt het bedrag en de datum uit je vonnis of overeenkomst nodig.':
    'No maintenance contribution set for this case yet. You will need the amount and the date from your court order or agreement.',
  'Bijdrage bij het einde van de regeling': 'Contribution at the end of the arrangement',
  'Deze regeling liep tot {datum}; daarna is er niets meer bijgekomen.':
    'This arrangement ran until {datum}; nothing has been added since.',
  'De aanvangsindex is geen geldig getal. Laat het veld leeg om de app het cijfer zelf te laten opzoeken.':
    'The starting index is not a valid number. Leave the field empty to let the app look the figure up itself.',
  'Loopt tot (optioneel)': 'Runs until (optional)',
  'Voor welke kinderen (optioneel)': 'For which children (optional)',
  'Per maand geteld vanaf de maand van de regeling, telkens met het bedrag dat op de eerste van die maand gold. Twee gevolgen die je moet kennen voor je dit cijfer gebruikt: de maand van de regeling telt volledig mee, ook als ze halverwege begon, en de maand waarin er geïndexeerd wordt telt nog aan het oude, lagere bedrag. Klopt dat niet met jouw afspraak, corrigeer het dan met een betaling.':
    'Counted month by month from the month of the arrangement, each time with the amount that applied on the first of that month. Two consequences to know before you use this figure: the month of the arrangement counts in full, even if it started mid-month, and the month in which indexation takes effect still counts at the old, lower amount. If that does not match your agreement, correct it with a payment.',
  'Betaald door de ouder die dit overzicht opmaakte':
    'Paid by the parent who produced this overview',
  'Betaald aan de ouder die dit overzicht opmaakte':
    'Paid to the parent who produced this overview',
  'Loopt tot': 'Runs until',
  'Voor onderhoudsgeld is de aanvangsindex die van de maand vóór de maand waarin het bedrag werd vastgelegd — dezelfde regel als bij huur. Hou je een lopende regeling bij, gebruik dan de onderhoudsbijdrage in je dossier: die zoekt de indexcijfers zelf op.':
    'For maintenance, the starting index is that of the month before the month in which the amount was set — the same rule as for rent. If you are tracking an ongoing arrangement, use the maintenance contribution in your case: it looks the index figures up itself.',
  // Onderhoudsbijdrage — de begeleidende brief
  'Betreft: indexatie van de onderhoudsbijdrage voor {namen}':
    'Subject: indexation of the maintenance contribution for {namen}',
  'Betreft: indexatie van de onderhoudsbijdrage':
    'Subject: indexation of the maintenance contribution',
  'De onderhoudsbijdrage die op {datum} werd vastgelegd, volgt de gezondheidsindex. Die aanpassing gebeurt jaarlijks op de verjaardag van de regeling.':
    'The maintenance contribution set on {datum} follows the health index. That adjustment takes place annually on the anniversary of the arrangement.',
  'De laatste aanpassing viel op {datum}. Vanaf die datum bedraagt de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.':
    'The most recent adjustment fell on {datum}. From that date the contribution is {bedrag} per month, against {basis} in the arrangement itself.',
  'Volgens deze berekening bedraagt de bijdrage vandaag {bedrag} per maand.':
    'According to this calculation the contribution today is {bedrag} per month.',
  'Op het volgende blad staat de volledige berekening: het bedrag uit de regeling, de gebruikte indexcijfers en wat er per verjaardag uit kwam. Zo is elke regel na te rekenen zonder deze app.':
    'The next page contains the full calculation: the amount from the arrangement, the index figures used, and the result for each anniversary. That way every line can be checked without this app.',
  'Klopt er iets niet met de gegevens hierboven, laat het dan weten — dan kan de berekening aangepast worden.':
    'If anything in the details above is incorrect, please say so — then the calculation can be adjusted.',
  'Betreft: de onderhoudsbijdrage voor {namen}': 'Subject: the maintenance contribution for {namen}',
  'Betreft: de onderhoudsbijdrage': 'Subject: the maintenance contribution',
  'De onderhoudsbijdrage die op {datum} werd vastgelegd, wordt volgens de regeling niet geïndexeerd. Het bedrag blijft daarom ongewijzigd.':
    'According to the arrangement, the maintenance contribution set on {datum} is not indexed. The amount therefore stays unchanged.',
  'De aanvangsindex van {maand} is in deze app niet bekend, waardoor de indexatie niet berekend kon worden. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.':
    'The starting index for {maand} is not known in this app, so the indexation could not be calculated. The amount below is therefore still the one from the arrangement itself: {basis} per month.',
  'Deze regeling liep tot {eind}. Bij het einde ervan bedroeg de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.':
    'This arrangement ran until {eind}. At its end the contribution was {bedrag} per month, against {basis} in the arrangement itself.',
  'Voor één of meer verjaardagen was er nog geen indexcijfer bekend. Die aanpassing zit dus nog niet in dit bedrag; op het volgende blad staat om welke maanden het gaat.':
    'For one or more anniversaries no index figure was known yet. That adjustment is therefore not included in this amount; the next page states which months are involved.',
  'Op het volgende blad staat waarop dit gebaseerd is: het bedrag uit de regeling en de gegevens die daarbij horen. Zo is alles na te kijken zonder deze app.':
    'The next page states what this is based on: the amount from the arrangement and the details that go with it. That way everything can be checked without this app.',
  'Deze brief is opgemaakt met Financieel Kompas. Hij bevat een berekening en geen juridisch standpunt.':
    'This letter was produced with Financieel Kompas. It contains a calculation, not a legal position.',
}
const fr: Record<string, string> = {
  // Algemeen
  'Annuleer': 'Annuler',
  '— kies —': '— choisir —',
  'optioneel': 'optionnel',
  'Geen categorie': 'Aucune catégorie',
  'Toevoegen': 'Ajouter',
  'Wijzigen': 'Modifier',
  'Bewaar': 'Enregistrer',
  'onbekende fout': 'erreur inconnue',
  // App — kop & maandoverzicht
  'Rekeningen, categorieën, budgetten en transacties — met backup en synchronisatie':
    'Comptes, catégories, budgets et transactions — avec sauvegarde et synchronisation',
  'Taal': 'Langue',
  'Laden…': 'Chargement…',
  'Let op: {n} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.':
    'Attention : {n} enregistrement(s) ont été ignorés car non conformes au schéma.',
  'Maandoverzicht': 'Aperçu mensuel',
  'Vorige maand': 'Mois précédent',
  'Volgende maand': 'Mois suivant',
  'Inkomsten': 'Revenus',
  'Uitgaven': 'Dépenses',
  'Netto': 'Net',
  'Uitgaven per maand': 'Dépenses par mois',
  'Inkomsten per categorie': 'Revenus par catégorie',
  // App — rekeningen
  'Rekeningen': 'Comptes',
  'startsaldo {saldo}': 'solde initial {saldo}',
  'gearchiveerd': 'archivé',
  'Bewerk rekening {naam}': 'Modifier le compte {naam}',
  'Archiveer rekening {naam}': 'Archiver le compte {naam}',
  'Herstel rekening {naam}': 'Restaurer le compte {naam}',
  'Verwijder rekening {naam}': 'Supprimer le compte {naam}',
  'archiveer': 'archiver',
  'herstel': 'restaurer',
  // App — categorieën
  'Categorieën': 'Catégories',
  'Bewerk categorie {naam}': 'Modifier la catégorie {naam}',
  'Verwijder categorie {naam}': 'Supprimer la catégorie {naam}',
  // App — budgetten
  'Budgetten': 'Budgets',
  'voor {maand}': 'pour {maand}',
  'Nog geen budgetten ingesteld.': 'Aucun budget défini.',
  'Verwijder budget {naam}': 'Supprimer le budget {naam}',
  // App — transacties
  'Transactie bewerken': 'Modifier la transaction',
  'Transactie toevoegen': 'Ajouter une transaction',
  'Bewerk {oms}': 'Modifier {oms}',
  'Verwijder {oms}': 'Supprimer {oms}',
  'Saldo': 'Solde',
  // App — back-up & drive
  'Back-up & herstel': 'Sauvegarde et restauration',
  'Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.':
    'Un filet de sécurité distinct sur votre appareil, indépendant de Google Drive. Conservez le fichier en lieu sûr ; la restauration ne fait qu’ajouter et n’écrase jamais.',
  'Exporteer back-up': 'Exporter la sauvegarde',
  'Herstel uit back-up': 'Restaurer depuis la sauvegarde',
  'Back-up gedownload.': 'Sauvegarde téléchargée.',
  'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig.':
    'Restauré : {toegevoegd} ajouté(s), {overgeslagen} déjà présent(s), {ongeldig} invalide(s).',
  'Herstellen mislukte: {fout}': 'Échec de la restauration : {fout}',
  'Verbind met Google Drive': 'Se connecter à Google Drive',
  'Synchroniseer nu': 'Synchroniser maintenant',
  'Bezig…': 'En cours…',
  'Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.':
    'Synchronisé : {gepusht} envoyé(s), {opgehaald} reçu(s).',
  'Automatisch gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.':
    'Synchronisé automatiquement : {gepusht} envoyé(s), {opgehaald} reçu(s).',
  'Verbinden mislukte: {fout}': 'Échec de la connexion : {fout}',
  'Synchroniseren mislukte: {fout}': 'Échec de la synchronisation : {fout}',
  // Undo-meldingen
  'Ongedaan maken': 'Annuler',
  'Rekening verwijderd': 'Compte supprimé',
  'Categorie verwijderd': 'Catégorie supprimée',
  'Budget verwijderd': 'Budget supprimé',
  'Dossier verwijderd': 'Dossier supprimé',
  'Kost verwijderd': 'Frais supprimés',
  'Spaardoel verwijderd': 'Objectif d’épargne supprimé',
  'Subcategorie verwijderd': 'Sous-catégorie supprimée',
  'Vaste post verwijderd': 'Poste fixe supprimé',
  'Transactie verwijderd': 'Transaction supprimée',
  'Overboeking verwijderd': 'Virement supprimé',
  // Rekeningformulier
  'Rekeningnaam': 'Nom du compte',
  'Type': 'Type',
  'Beginsaldo (€)': 'Solde initial (€)',
  'Rekeningnummer (IBAN)': 'Numéro de compte (IBAN)',
  'BE.. (optioneel)': 'BE.. (optionnel)',
  'Rubriek': 'Rubrique',
  'optionele groepsnaam': 'nom de groupe optionnel',
  'Rekening wijzigen': 'Modifier le compte',
  'Rekening toevoegen': 'Ajouter un compte',
  'Betaalrekening': 'Compte courant',
  'Spaarrekening': 'Compte d’épargne',
  'Termijnrekening': 'Compte à terme',
  'Effectenrekening': 'Compte-titres',
  'Breng je situatie in kaart': 'Fais le point sur ta situation',
  'Breng in kaart wat er vastligt. Loop de blokken door die op jou van toepassing zijn — je mag er elk overslaan en later terugkomen.': 'Fais le point sur ce qui est engagé. Parcours les blocs qui te concernent — tu peux en sauter et y revenir plus tard.',
  'Nog geen rekeningen. Vul het formulier in, of begin bij je situatie.': 'Pas encore de comptes. Remplis le formulaire, ou commence par ta situation.',
  'Nog niets geboekt deze maand. Voeg een transactie toe, of lees een bankuittreksel in.': 'Rien d’enregistré ce mois-ci. Ajoute une opération, ou importe un extrait bancaire.',
  '{gedaan} van {totaal} aangevinkt.': '{gedaan} sur {totaal} cochés.',
  // Ronde 39
  'Je situatie': 'Ta situation',
  'Dit is je situatie': 'Voici ta situation',
  'Vaste lasten per maand': 'Charges fixes par mois',
  'Waarvan sluipend': 'Dont dépenses discrètes',
  'Zo lang kom je toe': 'Combien de temps tu tiens',
  'Netto vermogen': 'Patrimoine net',
  '{n} maanden': '{n} mois',
  'Je sluipende kosten zijn {maand} per maand, oftewel {jaar} per jaar.': 'Tes dépenses discrètes s’élèvent à {maand} par mois, soit {jaar} par an.',
  'Ingevulde blokken': 'Blocs complétés',
  'Je hebt alle blokken ingevuld. Je kan hier altijd terugkomen om iets bij te werken.': 'Tu as complété tous les blocs. Tu peux toujours revenir ici pour mettre quelque chose à jour.',
  '{klaar} van {totaal} blokken ingevuld. Wat je overslaat, kan je later nog aanvullen.': '{klaar} blocs sur {totaal} complétés. Ce que tu sautes, tu peux l’ajouter plus tard.',
  'Naar je overzicht': 'Vers ton aperçu',
  'Onderdeel': 'Section',
  'Je geld': 'Ton argent',
  'Voor later': 'Pour plus tard',
  'Vaste kosten': 'Charges fixes',
  'Sluipende kosten': 'Dépenses discrètes',
  'Je gezin': 'Ta famille',
  'Delen': 'Partage',
  'Waar staat je geld?': 'Où se trouve ton argent ?',
  'Je betaalrekening, je spaarrekening, je portemonnee. Voeg ze één voor één toe; het formulier blijft staan.': 'Ton compte courant, ton compte d’épargne, ton portefeuille. Ajoute-les un par un ; le formulaire reste en place.',
  'Nog geen rekeningen. Begin met de rekening waar je loon op komt.': 'Pas encore de comptes. Commence par celui où tombe ton salaire.',
  'Een kredietkaart of kredietopening?': 'Une carte de crédit ou une ouverture de crédit ?',
  'Nog geen kredietkaart ingegeven.': 'Aucune carte de crédit saisie.',
  'Een lening, hypotheek of autofinanciering?': 'Un prêt, un crédit logement ou un financement auto ?',
  'Wat je nog moet terugbetalen, gaat af van je vermogen. Wat je hebt uitgeleend, komt erbij.': 'Ce que tu dois encore se soustrait de ton patrimoine. Ce que tu as prêté s’y ajoute.',
  'Nog geen leningen ingegeven.': 'Aucun prêt saisi.',
  'Wat staat er voor later?': 'Qu’y a-t-il pour plus tard ?',
  'Beleggingen, een termijnrekening, pensioensparen. Kies bij Type "Effectenrekening" of "Termijnrekening"; je kan de waarde later bijwerken bij de rekening zelf.': 'Placements, compte à terme, épargne-pension. Choisis « Compte-titres » ou « Compte à terme » sous Type ; tu pourras mettre la valeur à jour plus tard sur le compte lui-même.',
  'Nog niets voor later ingegeven.': 'Rien de prévu pour plus tard.',
  'Je vaste kosten': 'Tes charges fixes',
  'Vink aan wat je betaalt en tik het bedrag in. Herkennen gaat sneller dan bedenken.': 'Coche ce que tu paies et saisis le montant. Reconnaître va plus vite que se souvenir.',
  'Je sluipende kosten': 'Tes dépenses discrètes',
  'De kleine abonnementen waar je nooit meer naar omkijkt. Samen zijn ze vaak groter dan je denkt.': 'Les petits abonnements que tu ne regardes plus jamais. Ensemble, ils pèsent souvent plus que tu ne crois.',
  'Staat het er niet bij? Je kan altijd zelf iets toevoegen op de Budget-pagina.': 'Pas dans la liste ? Tu peux toujours ajouter quelque chose toi-même sur la page Budget.',
  'Naar Budget': 'Vers Budget',
  'Naar Dossiers': 'Vers Dossiers',
  'Deel je kosten met iemand?': 'Partages-tu des frais avec quelqu’un ?',
  'Bijvoorbeeld met de andere ouder van je kinderen. Kompal houdt dan bij wie wat betaalde en rekent het voor je af.': 'Par exemple avec l’autre parent de tes enfants. Kompal note alors qui a payé quoi et fait le décompte pour toi.',
  'Nog geen dossiers. Maak er hieronder een aan, of sla dit blok over.': 'Pas encore de dossiers. Crées-en un ci-dessous, ou saute ce bloc.',
  '{n}% voor jou': '{n}% pour toi',
  'Uitgeleend geld en aankopen met garantie horen ook bij Dossiers.': 'L’argent prêté et les achats sous garantie relèvent aussi des Dossiers.',
  'Tip: begin bij "Je geld". Zonder rekening kan de app nog niets uitrekenen.': 'Conseil : commence par « Ton argent ». Sans compte, l’app ne peut encore rien calculer.',
  'Maak eerst een rekening aan bij "Je geld" — een vaste kost moet ergens vanaf gaan.': 'Crée d’abord un compte sous « Ton argent » — une charge fixe doit être prélevée quelque part.',
  '{naam} toegevoegd: {bedrag}, van {rekening}.': '{naam} ajouté : {bedrag}, depuis {rekening}.',
  'Toevoegen is niet gelukt. Probeer het opnieuw.': 'L’ajout a échoué. Réessaie.',
  'Voeg {naam} toe': 'Ajouter {naam}',
  'bedrag': 'montant',
  'toegevoegd': 'ajouté',
  'meestal één keer per jaar': 'en général une fois par an',
  'Nog geen inkomsten deze maand.': 'Pas encore de revenus ce mois-ci.',
  'Zodra je een rekening hebt toegevoegd, zie je hier hoe je bezit evolueert.': 'Dès que tu auras ajouté un compte, tu verras ici l’évolution de tes avoirs.',
  'Je hebt nog geen vaste lasten ingesteld. Zonder die weet de app niet wat er nog moet komen.': 'Tu n’as encore défini aucune charge fixe. Sans elles, l’app ne peut pas savoir ce qui doit encore arriver.',
  'Je hebt nog geen eigen categorieën. De ingebouwde boom staat hieronder.': 'Tu n’as pas encore de catégories personnelles. L’arborescence intégrée se trouve ci-dessous.',
  'Loop "Je situatie" door: je rekeningen, je vaste kosten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.':
    'Parcours « Ta situation » : tes comptes, tes charges fixes et tes abonnements. Après dix minutes, tu sauras ce qui est engagé chaque mois et ce que tu vaux — avant même de saisir une seule opération.',
  'Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig. Voeg er een toe bij "Je geld".':
    'Pour « combien de temps tu tiens », l\'app a besoin d\'un compte d\'épargne ou d\'espèces. Ajoutes-en un dans « Ton argent ».',
  'Hypotheek': 'Crédit logement',
  'Elektriciteit en gas': 'Électricité et gaz',
  'Je maandelijkse voorschot': 'Ton acompte mensuel',
  'Water': 'Eau',
  'Internet, tv en gsm': 'Internet, TV et GSM',
  'Brand- en familiale verzekering': 'Assurance incendie et familiale',
  'Autoverzekering': 'Assurance auto',
  'Hospitalisatieverzekering': 'Assurance hospitalisation',
  'Schuldsaldoverzekering': 'Assurance solde restant dû',
  'Autolening': 'Prêt auto',
  'Onroerende voorheffing': 'Précompte immobilier',
  'Gemeentebelasting': 'Taxe communale',
  'Syndicus of gemeenschappelijke kosten': 'Syndic ou charges communes',
  'Schoolkosten': 'Frais scolaires',
  'Kinderopvang': 'Garde d’enfants',
  'Abonnement openbaar vervoer': 'Abonnement transports en commun',
  'Vakbond': 'Syndicat',
  'Mutualiteit': 'Mutuelle',
  'Huisvuil': 'Déchets ménagers',
  'Fitness': 'Fitness',
  'Sportclub': 'Club de sport',
  'App- of software-abonnement': 'Abonnement app ou logiciel',
  'Cloudopslag': 'Stockage en ligne',
  'Krant': 'Journal',
  'Tijdschrift': 'Magazine',
  'Gift aan een goed doel': 'Don à une bonne cause',
  'Domeinnaam of webhosting': 'Nom de domaine ou hébergement',
  'Gaming-abonnement': 'Abonnement gaming',
  'Dating-app': 'Application de rencontre',
  'Online opleiding': 'Formation en ligne',
  'Luisterboeken': 'Livres audio',
  'Let op: de boekingen tot en met {datum} zitten al in de waarde die je toen hebt vastgelegd. Ze tellen hieronder wel mee, maar niet meer in het saldo bovenaan.': 'Attention : les opérations jusqu’au {datum} inclus sont déjà comprises dans la valeur que tu as enregistrée alors. Elles comptent encore ci-dessous, mais plus dans le solde en haut.',
  'geldt nu': 'en vigueur',
  // Passer d’un chiffre à ses opérations (ronde 48/49)
  'Het gezin (zonder gezinslid)': 'Le ménage (sans membre de la famille)',
  'Wat aan niemand persoonlijk hangt, staat bij "Het gezin". Een kost voor meerdere gezinsleden wordt gelijk verdeeld; zo’n aandeel bestaat niet als aparte boeking, dus die rij klikt niet door.':
    'Ce qui n’est lié à personne figure sous « Le ménage ». Un coût pour plusieurs membres de la famille est réparti également ; une telle part n’existe pas comme opération distincte, donc cette ligne ne mène nulle part.',
  'Subcategorieën — brood, koffiekoeken, elektriciteit… Klik je door, dan zie je de volledige boeking, dus een gesplitst kassaticket komt in zijn geheel in beeld.':
    'Sous-catégories — pain, viennoiseries, électricité… En cliquant, tu vois l’opération complète : un ticket ventilé apparaît donc en entier.',
  'Inkomsten {bedrag} — bekijk de boekingen': 'Revenus {bedrag} — voir les opérations',
  'Uitgaven {bedrag} — bekijk de boekingen': 'Dépenses {bedrag} — voir les opérations',
  'Netto {bedrag} — bekijk alle boekingen van deze maand': 'Net {bedrag} — voir toutes les opérations de ce mois',
  '{maand} — bekijk de boekingen': '{maand} — voir les opérations',
  'Verschil {bedrag} — bekijk de boekingen van deze maand': 'Différence {bedrag} — voir les opérations de ce mois',
  '{oms} {bedrag} op {datum} — open deze boeking': '{oms} {bedrag} le {datum} — ouvrir cette opération',
  'Bekijk ze allemaal': 'Voir toutes',
  '{naam} {pct}% {bedrag} — bekijk de boekingen': '{naam} {pct}% {bedrag} — voir les opérations',
  'Uit je boeking van {datum}: {oms} — {bedrag}. Open die boeking.':
    'Issu de ton opération du {datum} : {oms} — {bedrag}. Ouvrir cette opération.',
  'Bekijk die boekingen': 'Voir ces opérations',
  'Bekijk die boekingen — er kwam deze maand {gekregen} binnen':
    'Voir ces opérations — {gekregen} sont rentrés ce mois-ci',
  'Netto vermogen {bedrag} — bekijk het op je overzicht': 'Patrimoine net {bedrag} — le voir sur ton aperçu',
  // Deux séries d’indices mélangées (ronde 47)
  'De app rekent niet meer met deze regeling. De indexcijfers die je zelf bijzette staan in basis {eigen} = 100, en de tabel in de app staat nu in basis {tabel} = 100. Dat zijn twee verschillende maatstaven; ze combineren geeft een bedrag dat er tientallen procenten naast zit. Verwijder je eigen cijfers hieronder en zet ze opnieuw met de cijfers uit de huidige reeks.':
    'L’app ne calcule plus avec cet arrangement. Les indices que tu as ajoutés toi-même sont exprimés en base {eigen} = 100, alors que la table de l’app est désormais en base {tabel} = 100. Ce sont deux étalons différents ; les combiner donne un montant erroné de plusieurs dizaines de pour cent. Supprime tes propres indices ci-dessous et réencode-les d’après la série actuelle.',
  'De app rekent niet met deze regeling. Je vulde zelf aanvangsindex {eigen} in, maar voor {maand} kent de app {tabel}. Dat verschil wijst erop dat je cijfer uit een oudere indexreeks komt (de index wordt om de zoveel jaar herbaseerd). Combineren met de tabel geeft een bedrag dat er tientallen procenten naast zit. Klopt {tabel} met je akte, laat het veld dan leeg. Klopt het niet, vul dan ook de cijfers van {maanden} zelf in, uit dezelfde reeks als je akte.':
    'L’app ne calcule pas avec cet arrangement. Tu as encodé toi-même l’indice de départ {eigen}, mais pour {maand} l’app connaît {tabel}. Cet écart indique que ton chiffre provient d’une série d’indices plus ancienne (l’indice est rebasé tous les quelques années). Le combiner avec la table donne un montant erroné de plusieurs dizaines de pour cent. Si {tabel} correspond à ton acte, laisse le champ vide. Sinon, encode aussi toi-même les indices de {maanden}, issus de la même série que ton acte.',
  'De app rekent niet met deze regeling. Je vulde de aanvangsindex zelf in, maar de jaarlijkse cijfers zou de app uit haar eigen tabel halen (basis {tabel} = 100). Staat je akte in een oudere reeks, dan zit het bedrag er tientallen procenten naast. Vul daarom ook de indexcijfers van {maanden} zelf in, uit dezelfde reeks als je akte.':
    'L’app ne calcule pas avec cet arrangement. Tu as encodé toi-même l’indice de départ, mais l’app prendrait les indices annuels dans sa propre table (base {tabel} = 100). Si ton acte utilise une série plus ancienne, le montant est erroné de plusieurs dizaines de pour cent. Encode donc aussi toi-même les indices de {maanden}, issus de la même série que ton acte.',
  'De onderhoudsbijdrage van {dossier} wordt niet meer geïndexeerd: de indexcijfers komen uit twee verschillende reeksen. Open de regeling om het op te lossen.':
    'La contribution alimentaire de {dossier} n’est plus indexée : les indices proviennent de deux séries différentes. Ouvre l’arrangement pour résoudre le problème.',
  'De indexatie kon niet berekend worden omdat de gebruikte indexcijfers niet uit dezelfde reeks komen. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.':
    'L’indexation n’a pas pu être calculée parce que les indices utilisés ne proviennent pas de la même série. Ci-dessous figure donc encore le montant de l’arrangement lui-même : {basis} par mois.',
  'De verjaardagen zijn niet berekend, omdat de gebruikte indexcijfers niet uit dezelfde reeks komen.':
    'Les anniversaires n’ont pas été calculés, parce que les indices utilisés ne proviennent pas de la même série.',
  'het bedrag uit de regeling van {datum}; de indexatie is niet berekend':
    'le montant de l’arrangement du {datum} ; l’indexation n’a pas été calculée',
  'De opbouw is niet berekend, want de indexcijfers komen niet uit dezelfde reeks. Bovenaan de kaart staat wat er moet gebeuren.':
    'Le détail n’a pas été calculé, car les indices ne proviennent pas de la même série. Ce qu’il faut faire est indiqué en haut de la fiche.',
  'De brief staat uit zolang de indexcijfers niet uit dezelfde reeks komen: ze zou een bedrag bevatten dat de app niet kan verantwoorden.':
    'La lettre est désactivée tant que les indices ne proviennent pas de la même série : elle contiendrait un montant que l’app ne peut pas justifier.',
  'Wat er openstaat is niet te berekenen: elke maand zou hier aan het bedrag uit de regeling geteld worden, zonder de indexatie. Het echte bedrag ligt hoger. Los eerst de indexcijfers bovenaan op.':
    'Ce qui reste dû n’est pas calculable : chaque mois serait compté ici au montant de l’arrangement, sans l’indexation. Le montant réel est plus élevé. Résous d’abord les indices en haut.',
  'Je eerdere indexcijfers stonden in basis {oud} = 100 en zijn verwijderd. Zet ze opnieuw met de cijfers uit de huidige reeks.':
    'Tes indices précédents étaient exprimés en base {oud} = 100 et ont été supprimés. Réencode-les avec les chiffres de la série actuelle.',
  'Kies eerst van welke rekening naar welke rekening je overboekt.':
    'Choisis d’abord de quel compte vers quel compte tu transfères.',
  // L’unité d’une ligne du journal (ronde 46)
  'Dit bestand komt van een oudere versie van de app. De bedragen erin zijn niet betrouwbaar te lezen; vraag de andere ouder om een nieuw bestand.':
    'Ce fichier provient d’une version plus ancienne de l’app. Ses montants ne sont pas lisibles de façon fiable ; demande un nouveau fichier à l’autre parent.',
  'Let op: van {n} regel(s) kan de app niet zien in welke eenheid de bedragen staan. Ze zijn daarom NIET ingelezen: als eenheid gelezen zou € 2.400 er als € 24 komen te staan. Er is niets van je huidige gegevens veranderd. Komen die regels van een ander toestel, werk de app daar dan ook bij.':
    'Attention : pour {n} ligne(s), l’app ne peut pas déterminer l’unité des montants. Elles n’ont donc PAS été importées : lues dans la mauvaise unité, 2 400 € s’afficheraient comme 24 €. Rien n’a changé dans tes données actuelles. Si ces lignes viennent d’un autre appareil, mets aussi l’app à jour là-bas.',
  'Let op: {n} regel(s) komen van een toestel met een NIEUWERE versie van de app. Deze app kan ze nog niet lezen, dus ze zijn niet ingelezen. Werk deze app bij (sluit hem helemaal af en open hem opnieuw) en probeer het dan nog eens.':
    'Attention : {n} ligne(s) proviennent d’un appareil avec une version PLUS RÉCENTE de l’app. Cette app ne peut pas encore les lire, elles n’ont donc pas été importées. Mets cette app à jour (ferme-la complètement et rouvre-la) puis réessaie.',
  'Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet leesbaar.':
    'Synchronisé : {gepusht} envoyée(s), {opgehaald} récupérée(s), {geweigerd} illisible(s).',
  'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig, {verouderd} uit een te oude versie (niet ingelezen).':
    'Restauré : {toegevoegd} ajoutée(s), {overgeslagen} déjà présente(s), {ongeldig} invalide(s), {verouderd} d’une version trop ancienne (non importée).',
  // Rechercher un produit (ronde 45)
  'De camera doet het niet': 'La caméra ne fonctionne pas',
  'Streepjescode {code} staat niet in de databank. Typ de naam zelf.':
    'Le code-barres {code} n’est pas dans la base de données. Tape le nom toi-même.',
  'Niets gevonden. Typ de naam zelf.': 'Rien trouvé. Tape le nom toi-même.',
  'Product opzoeken': 'Rechercher un produit',
  'Of typ de streepjescode': 'Ou tape le code-barres',
  'Of zoek op productnaam': 'Ou cherche par nom de produit',
  'Opzoeken': 'Rechercher',
  'bijv. 5410041001008': 'p. ex. 5410041001008',
  'bijv. choco of volle melk': 'p. ex. pâte à tartiner ou lait entier',
  'Een streepjescode heeft 8, 12, 13 of 14 cijfers.': 'Un code-barres compte 8, 12, 13 ou 14 chiffres.',
  'Zoeken…': 'Recherche…',
  'Niets gevonden. Probeer een ander woord, of typ de omschrijving zelf.':
    'Rien trouvé. Essaie un autre mot, ou tape la description toi-même.',
  'Houd de code een handbreedte van de lens en zorg voor licht. Lukt het niet? Typ de code of zoek op naam.':
    'Tiens le code à une main de l’objectif et veille à la lumière. Ça ne marche pas ? Tape le code ou cherche par nom.',
  // Échange avec l’autre parent (ronde 44)
  'Categorie (optioneel)': 'Catégorie (facultatif)',
  'Subcategorie (optioneel)': 'Sous-catégorie (facultatif)',
  'minder': 'moins',
  'Intrekken': 'Retirer',
  'Terugdraaien': 'Annuler',
  'Dit is dezelfde': 'C’est le même',
  'Toch niet dezelfde': 'Finalement pas le même',
  'Ingetrokken': 'Retiré',
  'telt niet mee in het saldo': 'ne compte pas dans le solde',
  'Wat de andere ouder van jouw kosten vindt': 'Ce que l’autre parent pense de tes frais',
  'Ingetrokken. Stuur het bestand door zodat de andere ouder het ziet.':
    'Retiré. Transmets le fichier pour que l’autre parent le voie.',
  'De intrekking is teruggedraaid.': 'Le retrait a été annulé.',
  'Over de {n} kost(en) in dit bestand komen jullie allebei op {bedrag} uit. Je eigen kosten zitten er niet in.':
    'Sur les {n} frais de ce fichier, vous arrivez tous les deux à {bedrag}. Tes propres frais n’y figurent pas.',
  'Vink alleen aan wat echt een andere kost is. Anders telt hetzelfde geld twee keer. Is het dezelfde kost, kies dan "Dit is dezelfde" — anders komt ze elke ronde opnieuw terug.':
    'Ne coche que ce qui est réellement un autre frais. Sinon le même argent compte deux fois. S’il s’agit du même frais, choisis « C’est le même » — sinon il reviendra à chaque tour.',
  '{n} kost(en) liggen hier vast (afgerekend, ingetrokken of in een afrekening) en blijven zoals ze zijn.':
    '{n} frais sont figés ici (réglés, retirés ou dans un décompte) et restent tels quels.',
  'De andere ouder trekt in: {namen}. Ze blijven staan, maar tellen niet meer mee.':
    'L’autre parent retire : {namen}. Ils restent visibles, mais ne comptent plus.',
  'Uitwisselen met de andere ouder': 'Échanger avec l’autre parent',
  '1. Doorsturen': '1. Envoyer',
  '2. Inlezen wat je kreeg': '2. Lire ce que tu as reçu',
  '3. Je antwoord': '3. Ta réponse',
  'Bestand klaarzetten': 'Préparer le fichier',
  'Kies een uitwisselbestand': 'Choisis un fichier d’échange',
  'Neem over': 'Appliquer',
  'Akkoord': 'D’accord',
  'Betwist': 'Conteste',
  'percentage zoals opgegeven door de andere ouder': 'pourcentage tel qu’indiqué par l’autre parent',
  'Nieuw voor jou': 'Nouveau pour toi',
  'Gewijzigd door de andere ouder': 'Modifié par l’autre parent',
  'Lijkt op een kost die je al hebt': 'Ressemble à un frais que tu as déjà',
  'Reden (alleen bij betwisten)': 'Motif (uniquement en cas de contestation)',
  'Reden om {naam} te betwisten': 'Motif de contestation de {naam}',
  'betaald door de andere ouder': 'payé par l’autre parent',
  'betaald door jou': 'payé par toi',
  'Bij jou: {bedrag} op {datum}': 'Chez toi : {bedrag} le {datum}',
  'Er gaan {n} kost(en) mee, samen {bedrag}. Alleen wat nog niet afgerekend is. Je stuurt het bestand door zoals je een foto doorstuurt; de andere ouder leest het in zijn eigen Financieel Kompas in.':
    '{n} frais seront inclus, {bedrag} au total. Uniquement ce qui n’est pas encore réglé. Tu transmets le fichier comme une photo ; l’autre parent le lit dans son propre Financieel Kompas.',
  'Ook de kosten meesturen die de andere ouder betaalde': 'Inclure aussi les frais payés par l’autre parent',
  'Standaard uit: die staan bij hem al, en dan krijgt hij ze van jou terug als vermoedelijke dubbel.':
    'Désactivé par défaut : il les a déjà, et il les recevrait de toi comme doublon présumé.',
  'Bonnen meesturen': 'Inclure les justificatifs',
  'Maakt het bestand een stuk groter. Zonder bonnen blijft het klein genoeg om te mailen.':
    'Cela alourdit fortement le fichier. Sans justificatifs, il reste assez léger pour un e-mail.',
  'De app legt het bestand eerst naast dit dossier. Er verandert niets tot je het bevestigt.':
    'L’app compare d’abord le fichier à ce dossier. Rien ne change tant que tu ne confirmes pas.',
  'Wat je hier antwoordt, reist mee in het volgende bestand dat je klaarzet. Betwist een kost liever dan hem te verwijderen: verwijder je hem, dan komt hij bij de volgende uitwisseling gewoon terug.':
    'Ce que tu réponds ici accompagne le prochain fichier que tu prépares. Conteste un frais plutôt que de le supprimer : si tu le supprimes, il reviendra au prochain échange.',
  'Er staan nog geen kosten van de andere ouder in dit dossier.':
    'Il n’y a pas encore de frais de l’autre parent dans ce dossier.',
  'Uit het dossier "{naam}", klaargezet op {datum}.': 'Du dossier « {naam} », préparé le {datum}.',
  'Jullie komen allebei op {bedrag} uit.': 'Vous arrivez tous les deux à {bedrag}.',
  'De andere ouder komt op {hun}, jij op {jouw}. Eén cent verschil, door afronding.':
    'L’autre parent arrive à {hun}, toi à {jouw}. Un centime d’écart, dû à l’arrondi.',
  'Let op: de andere ouder komt op {hun}, jij op {jouw}.':
    'Attention : l’autre parent arrive à {hun}, toi à {jouw}.',
  'Vink alleen aan wat echt een andere kost is. Anders telt hetzelfde geld twee keer.':
    'Ne coche que ce qui est réellement un autre frais. Sinon le même argent compte deux fois.',
  '{n} kost(en) staan er al en zijn ongewijzigd.': '{n} frais y figurent déjà et sont inchangés.',
  '{n} kost(en) zitten al vast in een afrekening en blijven zoals ze zijn.':
    '{n} frais sont déjà fixés dans un décompte et restent tels quels.',
  '{n} kost(en) staan in een ander dossier ({naam}) en worden hier niet nog eens ingelezen.':
    '{n} frais figurent dans un autre dossier ({naam}) et ne seront pas relus ici.',
  '{n} antwoord(en) op jouw kosten. Die worden altijd overgenomen.':
    '{n} réponse(s) à tes frais. Elles sont toujours reprises.',
  '{n} kost(en) heeft de andere ouder ingetrokken. Ze blijven staan, maar tellen niet meer mee.':
    'L’autre parent a retiré {n} frais. Ils restent visibles, mais ne comptent plus.',
  '{n} antwoord(en) horen bij een kost die hier niet (meer) staat.':
    '{n} réponse(s) concernent un frais qui ne figure plus ici.',
  '{n} kost(en) gebruiken een andere verdeelsleutel dan dit dossier. De app houdt het percentage van de andere ouder aan, zodat jullie hetzelfde bedrag zien.':
    '{n} frais utilisent une autre clé de répartition que ce dossier. L’app retient le pourcentage de l’autre parent, afin que vous voyiez le même montant.',
  '{n} regel(s) in het bestand waren onleesbaar en zijn overgeslagen.':
    '{n} ligne(s) du fichier étaient illisibles et ont été ignorées.',
  '{naam} klaargezet: {n} kost(en).': '{naam} préparé : {n} frais.',
  '{naam} klaargezet: {n} kost(en). {b} bon(nen) waren te groot om mee te sturen.':
    '{naam} préparé : {n} frais. {b} justificatif(s) étaient trop volumineux pour être inclus.',
  'Het bestand kon niet klaargezet worden.': 'Le fichier n’a pas pu être préparé.',
  'Het bestand kon niet gelezen worden.': 'Le fichier n’a pas pu être lu.',
  'Dit bestand komt van een nieuwere versie van de app. Werk eerst bij.':
    'Ce fichier provient d’une version plus récente de l’app. Mets-la d’abord à jour.',
  'Dit bestand is te groot om in te lezen.': 'Ce fichier est trop volumineux à lire.',
  'Dit is geen uitwisselbestand van Financieel Kompas.': 'Ceci n’est pas un fichier d’échange de Financieel Kompas.',
  'Er viel niets over te nemen.': 'Il n’y avait rien à reprendre.',
  '{n} kost(en) bijgewerkt of toegevoegd.': '{n} frais mis à jour ou ajoutés.',
  'Het overnemen is niet gelukt. Er is niets gewijzigd.': 'La reprise a échoué. Rien n’a été modifié.',
  'Genoteerd als akkoord. Stuur het bestand door zodat de andere ouder het ziet.':
    'Noté comme accord. Transmets le fichier pour que l’autre parent le voie.',
  'Genoteerd als betwist. Stuur het bestand door zodat de andere ouder het ziet.':
    'Noté comme contesté. Transmets le fichier pour que l’autre parent le voie.',
  'Je antwoord kon niet bewaard worden.': 'Ta réponse n’a pas pu être enregistrée.',
  '{n} kost(en) al beantwoord.': '{n} frais déjà répondus.',
  'De andere ouder betwist {n} kost(en). {rest}': 'L’autre parent conteste {n} frais. {rest}',
  '{k} kost(en) klaar om door te sturen.': '{k} frais prêts à être envoyés.',
  '{n} kost(en) van de andere ouder wachten op je antwoord.':
    '{n} frais de l’autre parent attendent ta réponse.',
  'Niets om door te sturen: er staan geen open kosten in dit dossier.':
    'Rien à envoyer : il n’y a pas de frais ouverts dans ce dossier.',
  '{n} kost(en) klaar om door te sturen, samen {bedrag}.': '{n} frais prêts à être envoyés, {bedrag} au total.',
  'Uitwisseling met de andere ouder': 'Échange avec l’autre parent',
  'betwist door de andere ouder': 'contesté par l’autre parent',
  'aanvaard door de andere ouder': 'accepté par l’autre parent',
  'waarvan {n} betwist door de andere ouder': 'dont {n} contesté(s) par l’autre parent',
  // Hausses de prix (ronde 43)
  'Wat werd er duurder?': 'Qu’est-ce qui a augmenté ?',
  'Nog niets gevonden. Daar is minstens een half jaar aan boekingen bij dezelfde handelaar voor nodig.':
    'Rien trouvé pour l’instant. Il faut au moins six mois d’écritures chez le même commerçant.',
  '{duurder} per maand duurder, {goedkoper} goedkoper — netto {netto} per maand.':
    '{duurder} de plus par mois, {goedkoper} de moins — net {netto} par mois.',
  '{bedrag} per maand duurder dan voorheen, over {n} post(en).':
    '{bedrag} de plus par mois qu’avant, sur {n} poste(s).',
  '{bedrag} per maand goedkoper dan voorheen.': '{bedrag} de moins par mois qu’avant.',
  '{oud} → {nieuw} sinds {datum}': '{oud} → {nieuw} depuis le {datum}',
  'per maand': 'par mois',
  'vaste last': 'charge fixe',
  'nog onzeker': 'pas encore certain',
  'Je vaste last staat op een ander bedrag dan wat je nu betaalt. Pas ze aan bij Budget.':
    'Ta charge fixe indique un montant différent de ce que tu paies aujourd’hui. Modifie-la sous Budget.',
  'Nog {n} andere, kleinere wijzigingen.': '{n} autres changements, plus petits.',
  'De app vergelijkt het bedrag dat bij dezelfde handelaar elke keer terugkomt. Ze kijkt achttien maanden terug, vraagt minstens zes betalingen, en zwijgt over winkels waar je bedrag elke keer anders is.':
    'L’application compare le montant qui revient chez le même commerçant. Elle remonte dix-huit mois, exige au moins six paiements et se tait sur les commerces où ton montant diffère à chaque fois.',
  'Je terugkerende kosten liggen intussen {bedrag} per maand hoger dan voorheen. Op Analyse staat wat er precies duurder werd.':
    'Tes charges récurrentes sont désormais {bedrag} par mois plus élevées qu’avant. L’Analyse montre précisément ce qui a augmenté.',
  'Verberg': 'Masquer',
  'Toon': 'Afficher',
  // La clôture mensuelle (ronde 43)
  'Maandafsluiting': 'Clôture du mois',
  'Drie stappen, en dan is je maand rond. Vijf minuten, één keer per maand.':
    'Trois étapes et ton mois est bouclé. Cinq minutes, une fois par mois.',
  'Welke maand sluit je af?': 'Quel mois clôtures-tu ?',
  'Er staan nog {n} maanden open. Werk de oudste eerst af, dan sluiten je cijfers op elkaar aan.':
    '{n} mois sont encore ouverts. Commence par le plus ancien : tes chiffres s’enchaîneront.',
  'Stap 1': 'Étape 1',
  'Stap 2': 'Étape 2',
  'Stap 3': 'Étape 3',
  'Staat alles erin?': 'Tout est-il encodé ?',
  'Lees je bankuittreksel in, of tik de laatste boekingen zelf bij.':
    'Importe ton extrait bancaire, ou encode toi-même les dernières écritures.',
  'Er staat nog geen enkele boeking in {maand}.': 'Il n’y a pas encore la moindre écriture en {maand}.',
  '{n} boeking(en) in {maand}.': '{n} écriture(s) en {maand}.',
  'Uittreksel inlezen': 'Importer un extrait',
  'Bekijk de boekingen ›': 'Voir les écritures ›',
  'Waar hoort het bij?': 'À quoi cela se rattache-t-il ?',
  'Wat geen categorie heeft, telt nergens mee — niet in je budget en niet in je analyse.':
    'Ce qui n’a pas de catégorie ne compte nulle part — ni dans ton budget, ni dans ton analyse.',
  'Alles heeft een categorie. Niets te doen.': 'Tout a une catégorie. Rien à faire.',
  '{n} boeking(en) wachten nog op een categorie.': '{n} écriture(s) attendent encore une catégorie.',
  'Nog {n} andere. Werk deze eerst weg; de rest schuift dan vanzelf op.':
    '{n} autres suivent. Traite d’abord celles-ci ; le reste remontera tout seul.',
  'Bekijk ze in de lijst ›': 'Les voir dans la liste ›',
  'Hoe is de maand geweest?': 'Comment s’est passé le mois ?',
  'De cijfers waarvoor je het allemaal deed.': 'Les chiffres pour lesquels tu as fait tout cela.',
  'Je hield {bedrag} over.': 'Il te reste {bedrag}.',
  'Je kwam {bedrag} tekort.': 'Il t’a manqué {bedrag}.',
  'Je kwam precies uit.': 'Tu es tombé juste.',
  '{n} budget(ten) gingen over hun grens.': '{n} budget(s) ont dépassé leur limite.',
  '{n} vaste last(en) staan nog niet ingeboekt in deze maand.':
    '{n} charge(s) fixe(s) ne sont pas encore encodées pour ce mois.',
  'Klaar?': 'Terminé ?',
  '{maand} is afgesloten op {datum}.': '{maand} a été clôturé le {datum}.',
  'Toch nog openzetten': 'Rouvrir malgré tout',
  'Er staat nog werk open. Je mag toch afsluiten — de app onthoudt dan wat er bleef liggen.':
    'Il reste du travail. Tu peux clôturer quand même — l’application retiendra ce qui est resté en suspens.',
  'Alles is rond. Sluit de maand af, dan weet je later dat je ernaar gekeken hebt.':
    'Tout est bouclé. Clôture le mois : tu sauras plus tard que tu l’as bien examiné.',
  'Maand afsluiten': 'Clôturer le mois',
  '{maand} is afgesloten.': '{maand} est clôturé.',
  '{maand} staat weer open.': '{maand} est de nouveau ouvert.',
  'Afsluiten is niet gelukt. Probeer het opnieuw.': 'La clôture a échoué. Réessaie.',
  'Heropenen is niet gelukt. Probeer het opnieuw.': 'La réouverture a échoué. Réessaie.',
  'rond': 'bouclé',
  'open': 'ouvert',
  'voorstel: {naam}': 'suggestion : {naam}',
  'Categorie voor {naam}': 'Catégorie pour {naam}',
  'Zonder omschrijving': 'Sans description',
  '{maand} is nog niet afgesloten.': '{maand} n’est pas encore clôturé.',
  '{maand} is nog niet afgesloten, en de {n} maand(en) daarna ook niet.':
    '{maand} n’est pas encore clôturé, ni le(s) {n} mois suivant(s).',
  'Neem {naam} over': 'Utiliser {naam}',
  // L’aide à l’indexation qui peut enregistrer son résultat
  'Vier kleine rekenmachines die live meerekenen. De indexatiehulp kan haar uitkomst ook als lopende regeling in een dossier bewaren.':
    'Quatre petites calculatrices qui se mettent à jour au fil de la saisie. L’aide à l’indexation peut aussi enregistrer son résultat comme accord en cours dans un dossier.',
  'Bewaar als onderhoudsbijdrage': 'Enregistrer comme contribution alimentaire',
  'Bewaar in dossier': 'Enregistrer dans le dossier',
  'In welk dossier': 'Dans quel dossier',
  'Het basisbedrag en de aanvangsindex gaan mee. Het nieuwe indexcijfer niet: dat hoort bij één bepaalde maand, en in je dossier zoekt de app dat voortaan zelf op.':
    'Le montant de base et l’indice de départ sont repris. Le nouvel indice non : il correspond à un mois précis, et dans ton dossier l’application le recherche désormais elle-même.',
  'Bewaard in {dossier}. De app indexeert dit voortaan zelf op de verjaardag van de regeling.':
    'Enregistré dans {dossier}. L’application indexera désormais elle-même à la date anniversaire de l’accord.',
  'Bewaren is niet gelukt. Probeer het opnieuw.': 'L’enregistrement a échoué. Réessaie.',
  'Let op: voor {maand} kent de app zelf het cijfer {kent}, terwijl jij {getikt} intikte. Jouw cijfer wordt bewaard als "zoals ze in de akte staat". Komt het uit een ouder basisjaar, dan geven de volgende berekeningen een bedrag dat er juist uitziet en het niet is.':
    'Attention : pour {maand}, l’application connaît elle-même l’indice {kent}, alors que tu as encodé {getikt}. Ton chiffre est enregistré comme « tel qu’il figure dans l’acte ». S’il provient d’une année de base plus ancienne, les calculs suivants donneront un montant qui paraît correct sans l’être.',
  'Wil je dit als lopende regeling bijhouden, maak dan eerst een dossier aan bij Dossiers.':
    'Si tu veux suivre cela comme un accord en cours, crée d’abord un dossier sous Dossiers.',
  'Al je dossiers hebben al een onderhoudsbijdrage. Pas ze daar aan in plaats van hier een tweede te maken.':
    'Tous tes dossiers ont déjà une contribution alimentaire. Modifie-la là plutôt que d’en créer une deuxième ici.',
  'Vul de datum van het vonnis of de overeenkomst in: die bepaalt op welke dag er elk jaar geïndexeerd wordt.':
    'Indique la date du jugement ou de la convention : elle détermine le jour de l’indexation annuelle.',
  // Contribution alimentaire — la notification de la cloche
  'De onderhoudsbijdrage van {dossier} is sinds {datum} geïndexeerd: van {oud} naar {nieuw} per maand.':
    'La contribution alimentaire de {dossier} est indexée depuis le {datum} : de {oud} à {nieuw} par mois.',
  'De onderhoudsbijdrage van {dossier} moest op {datum} geïndexeerd worden, maar het indexcijfer van {maand} is nog niet bekend.':
    'La contribution alimentaire de {dossier} devait être indexée le {datum}, mais l’indice de {maand} n’est pas encore connu.',
  'De onderhoudsbijdrage van {dossier} kan niet geïndexeerd worden: de app kent geen aanvangsindex voor {maand}. Vul ze in bij de regeling, zoals ze in de akte staat.':
    'La contribution alimentaire de {dossier} ne peut pas être indexée : l’application n’a pas d’indice de départ pour {maand}. Encode-le dans l’accord, tel qu’il figure dans l’acte.',
  '{bedrag} open': '{bedrag} dû',
  '{bedrag} tegoed': '{bedrag} d’avoir',
  'niets open': 'rien de dû',
  // Carte de crédit (ronde 43)
  'Afsluitdag van de kaart': 'Jour d’arrêté de la carte',
  'De dag waarop je kaartrekening wordt opgemaakt. Vanaf de dag erna loopt de volgende periode.':
    'Le jour où le relevé de ta carte est établi. La période suivante démarre le lendemain.',
  'Dag waarop het bedrag afgeboekt wordt': 'Jour du débit du montant',
  'De dag waarop de afsluiting effectief van je betaalrekening gaat. Meestal een dag in de maand na de afsluiting.':
    'Le jour où le montant du relevé quitte effectivement ton compte courant. En général un jour du mois suivant l’arrêté.',
  'Openstaand bij de start (€)': 'Encours au départ (€)',
  'Wat er op deze kaart nog openstaat wanneer je ze hier invoert. Vul een gewoon positief bedrag in — de app weet dat dit een schuld is. Staat er niets open, vul dan 0 in.':
    'Ce qui reste dû sur cette carte au moment où tu l’encodes. Indique un montant positif tout simple — l’application sait qu’il s’agit d’une dette. Si rien n’est dû, indique 0.',
  'Nog openstaand': 'Encore dû',
  'Tegoed op de kaart': 'Avoir sur la carte',
  'bij de start stond er {saldo} open': '{saldo} restait dû au départ',
  'bij de start {saldo} open': '{saldo} dû au départ',
  'Er staat een tegoed op deze kaart, geen schuld. Bedoelde je dat dit bedrag nog openstaat? Pas het dan aan bij Bewerken — vul daar in wat je nog schuldig bent, als positief bedrag.':
    'Cette carte affiche un avoir, pas une dette. Voulais-tu dire que ce montant reste dû ? Corrige-le via Modifier — indique ce que tu dois encore, en montant positif.',
  'De afrekening': 'Le décompte',
  'Afgesloten op {datum}: {bedrag}': 'Arrêté le {datum} : {bedrag}',
  'Volledig betaald.': 'Entièrement payé.',
  'Nog te betalen: {bedrag}. Vul een afboekdag in om te weten wanneer dit van je rekening gaat.':
    'Reste à payer : {bedrag}. Indique un jour de débit pour savoir quand ce montant quittera ton compte.',
  'Nog te betalen: {bedrag}. Dat bedrag ging op {datum} van je betaalrekening — boek het hieronder in.':
    'Reste à payer : {bedrag}. Ce montant a quitté ton compte courant le {datum} — encode-le ci-dessous.',
  'Nog te betalen: {bedrag}, gaat op {datum} van je betaalrekening.':
    'Reste à payer : {bedrag}, sera débité de ton compte courant le {datum}.',
  'Sinds de afsluiting kwam er {bedrag} bij op de kaart. Die periode sluit op {datum}.':
    'Depuis l’arrêté, {bedrag} se sont ajoutés sur la carte. Cette période se clôture le {datum}.',
  'Sinds de afsluiting ging er {bedrag} van de kaart af. Die periode sluit op {datum}.':
    'Depuis l’arrêté, {bedrag} ont été retirés de la carte. Cette période se clôture le {datum}.',
  'Er staat al een overboeking van {bedrag} klaar. Ze telt mee zodra die dag er is.':
    'Un virement de {bedrag} est déjà encodé. Il comptera dès que ce jour sera arrivé.',
  'Om de afrekening te boeken heb je nog een andere rekening nodig om ze van af te halen.':
    'Pour encoder le décompte, il te faut un autre compte depuis lequel le payer.',
  'bij de start {saldo} tegoed': '{saldo} d’avoir au départ',
  'bij de start stond er {saldo} tegoed': 'il y avait {saldo} d’avoir au départ',
  'Hoeveel je maximaal mag opnemen op deze kaart.': 'Le montant maximum que tu peux utiliser sur cette carte.',
  'Hier staat nu een tegoed, geen schuld. Bedoelde je dat dit bedrag nog openstaat? Haal dan het minteken weg.':
    'Ceci indique un avoir, pas une dette. Voulais-tu dire que ce montant reste dû ? Retire alors le signe moins.',
  'Kies bij Type "Kredietkaart". Vul bij het bedrag in wat er nog openstaat, als een gewoon positief getal, en bij de limiet hoeveel je maximaal mag opnemen.':
    'Choisis « Carte de crédit » sous Type. Pour le montant, indique ce qui reste dû, en nombre positif tout simple, et pour la limite le maximum que tu peux utiliser.',
  'Vul een afsluitdag in bij Bewerken, dan rekent de app uit wat er afgesloten is en wanneer het van je rekening gaat.':
    'Indique un jour d’arrêté via Modifier : l’application calcule alors ce qui est arrêté et quand cela quittera ton compte.',
  'Afrekening boeken': 'Encoder le décompte',
  'Sluit': 'Fermer',
  'Van welke rekening': 'Depuis quel compte',
  'Boek de overboeking': 'Encoder le virement',
  'Afrekening kredietkaart': 'Décompte carte de crédit',
  'De afrekening is geboekt als overboeking van {datum}.': 'Le décompte a été encodé comme virement daté du {datum}.',
  'De afrekening kon niet geboekt worden. Probeer het opnieuw.': 'Le décompte n’a pas pu être encodé. Réessaie.',
  'Dit wordt een overboeking, geen uitgave: de aankopen zelf zijn al geboekt op de kaart.':
    'Il s’agit d’un virement, pas d’une dépense : les achats eux-mêmes sont déjà encodés sur la carte.',
  'De laatste keer is {maand}. Daarna telt deze post niet meer mee.': 'La dernière fois est {maand}. Ensuite, ce poste ne compte plus.',
  'De {n} boeking(en) van vóór en op deze dag tellen daarna niet meer apart mee — ze zitten al in dit bedrag. Ze blijven wel gewoon in je lijst staan.': 'Les {n} opération(s) de ce jour et d’avant ne compteront plus séparément — elles sont déjà comprises dans ce montant. Elles restent dans ta liste.',
  'Er staat al een boeking van {bedrag} op {datum} ({naam}). Is dat dezelfde betaling?': 'Il existe déjà une opération de {bedrag} le {datum} ({naam}). Est-ce le même paiement ?',
  'Er staat al een waarde voor deze dag ({bedrag}). Die wordt vervangen.': 'Une valeur existe déjà pour ce jour ({bedrag}). Elle sera remplacée.',
  'Geef een bedrag boven nul, of laat het veld leeg.': 'Indique un montant supérieur à zéro, ou laisse le champ vide.',
  'Gekoppeld aan een boeking': 'Lié à une opération',
  'Gestopt na {maand}': 'Arrêté après {maand}',
  'Ja, koppelen': 'Oui, les lier',
  'Je rekeningen staan op {bezit}, met {teBetalen} nog te betalen.': 'Tes comptes affichent {bezit}, avec {teBetalen} encore à rembourser.',
  'Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen en {teBetalen} nog te betalen.': 'Tes comptes affichent {bezit}, avec {teOntvangen} encore à recevoir et {teBetalen} encore à rembourser.',
  'Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen.': 'Tes comptes affichent {bezit}, avec {teOntvangen} encore à recevoir.',
  'Kies een dag tussen 1 en 28, of laat het veld leeg.': 'Choisis un jour entre 1 et 28, ou laisse le champ vide.',
  'Meer pagina\'s': 'Plus de pages',
  'Notitie': 'Note',
  'Vastgelegd: op {datum} stond er {bedrag}.': 'Enregistré : le {datum}, le solde était de {bedrag}.',
  'gekoppeld': 'lié',
  'nog {bedrag} van je limiet van {limiet} beschikbaar': '{bedrag} encore disponibles sur ta limite de {limiet}',
  'sinds de waarde van {datum}: {saldo}': 'depuis la valeur du {datum} : {saldo}',
  // Ronde 38
  'Kredietkaart of kredietopening': 'Carte de crédit ou ouverture de crédit',
  'Kredietlimiet (€)': 'Limite de crédit (€)',
  '1-28, optioneel': '1-28, facultatif',
  'Waarde bijwerken': 'Mettre la valeur à jour',
  'Voor rekeningen die van waarde veranderen zonder boeking, zoals beleggingen of pensioensparen. Je geschiedenis blijft staan; de app rekent vanaf deze dag verder met het bedrag dat je hier invult.': 'Pour les comptes dont la valeur change sans opération, comme les placements ou l’épargne-pension. Ton historique reste intact ; à partir de ce jour, l’app poursuit avec le montant que tu indiques ici.',
  'Op welke dag?': 'À quelle date ?',
  'Werkelijke waarde (€)': 'Valeur réelle (€)',
  'Waarde vastleggen': 'Enregistrer la valeur',
  'Vul een datum en een bedrag in.': 'Indique une date et un montant.',
  'Bijwerken is niet gelukt. Probeer het opnieuw.': 'La mise à jour a échoué. Réessaie.',
  'Eerder vastgelegd': 'Enregistré précédemment',
  'Verwijder waardering van {datum}': 'Supprimer la valorisation du {datum}',
  'Waardering verwijderd': 'Valorisation supprimée',
  'Netto vermogen {bedrag}': 'Patrimoine net {bedrag}',
  'Loopt tot en met': 'Court jusqu’en',
  'Laat leeg zolang de post doorloopt. Vul hem in wanneer je opzegt — de post blijft dan gewoon in je historiek staan.': 'Laisse vide tant que le poste continue. Complète-le lors de la résiliation — le poste reste alors dans ton historique.',
  'Gestopt': 'Arrêté',
  '{naam} loopt niet meer vanaf {maand}. Er is niets geboekt.': '{naam} ne court plus à partir de {maand}. Rien n’a été enregistré.',
  'Cash': 'Espèces',
  // Categorieformulier
  'Categorienaam': 'Nom de la catégorie',
  'Categorie wijzigen': 'Modifier la catégorie',
  'Categorie toevoegen': 'Ajouter une catégorie',
  // Budgetformulier
  'Budgetcategorie': 'Catégorie de budget',
  'Hoofdcategorieën': 'Catégories principales',
  'Eigen categorieën': 'Catégories personnelles',
  'Maandbudget (€)': 'Budget mensuel (€)',
  'Budget instellen': 'Définir le budget',
  // Transactieformulier
  'Handelaar / winkel': 'Commerçant / magasin',
  'Bedrag (€)': 'Montant (€)',
  ' — totaal van het ticket': ' — total du ticket',
  'Kassaticket splitsen': 'Diviser le ticket',
  'Deelbedrag': 'Montant partiel',
  'Verwijder regel {n}': 'Supprimer la ligne {n}',
  '+ Regel toevoegen': '+ Ajouter une ligne',
  'Verdeeld:': 'Réparti :',
  'van': 'sur',
  '(nog {bedrag})': '(reste {bedrag})',
  'Datum': 'Date',
  'Rekening': 'Compte',
  'Uitgave': 'Dépense',
  'Inkomst': 'Revenu',
  // Categoriekiezer
  'Categorie:': 'Catégorie :',
  'Geen': 'Aucune',
  'wissen': 'effacer',
  'Zoek categorie of item': 'Rechercher une catégorie ou un article',
  'Typ om te zoeken (vanaf 2 letters)…': 'Tapez pour rechercher (à partir de 2 lettres)…',
  'eigen': 'perso',
  // Itemzoeker
  'Item zoeken': 'Rechercher un article',
  'Zoek een product (vanaf 2 letters)…': 'Rechercher un produit (à partir de 2 lettres)…',
  // Categorieboom
  'Alle categorieën': 'Toutes les catégories',
  'Vouw open om te bekijken. Voeg subcategorieën toe of hernoem bestaande.':
    'Développez pour voir. Ajoutez des sous-catégories ou renommez-les.',
  '{n} items': '{n} éléments',
  'Nieuwe naam voor {naam}': 'Nouveau nom pour {naam}',
  'Wijzig {naam}': 'Modifier {naam}',
  'Verwijder {naam}': 'Supprimer {naam}',
  'Nieuwe subcategorie in {naam}': 'Nouvelle sous-catégorie dans {naam}',
  'Naam subcategorie': 'Nom de la sous-catégorie',
  'Voeg subcategorie toe aan {naam}': 'Ajouter une sous-catégorie à {naam}',
  '+ subcategorie': '+ sous-catégorie',
  // Donut
  'uitgaven': 'dépenses',
  'inkomsten': 'revenus',
  '{label} per categorie': '{label} par catégorie',
  // Dossiers
  'Partner is jou {bedrag} verschuldigd': 'Le partenaire vous doit {bedrag}',
  'Jij bent partner {bedrag} verschuldigd': 'Vous devez {bedrag} au partenaire',
  'Niets te verrekenen': 'Rien à régler',
  'Dossiers (gedeelde kosten)': 'Dossiers (frais partagés)',
  'Nog geen dossiers. Maak er hieronder een aan.': 'Aucun dossier. Créez-en un ci-dessous.',
  'Gekozen dossier': 'Dossier sélectionné',
  '(jij {p}%)': '(vous {p}%)',
  'Verwijder dossier {naam}': 'Supprimer le dossier {naam}',
  'betaald door {wie}': 'payé par {wie}',
  'jou': 'vous',
  'partner': 'partenaire',
  'Bewerk kost {naam}': 'Modifier les frais {naam}',
  'Verwijder kost {naam}': 'Supprimer les frais {naam}',
  'Leg afrekening vast': 'Enregistrer le décompte',
  'Vastgelegde afrekeningen': 'Décomptes enregistrés',
  'Dossiernaam': 'Nom du dossier',
  'Aandeel jij (%)': 'Votre part (%)',
  'Dossier toevoegen': 'Ajouter un dossier',
  'Kostomschrijving': 'Description des frais',
  'Kostbedrag (€)': 'Montant des frais (€)',
  'Betaald door:': 'Payé par :',
  'Jij': 'Vous',
  'Partner': 'Partenaire',
  'Kost wijzigen': 'Modifier les frais',
  'Kost toevoegen': 'Ajouter des frais',
  // Ronde 6 : barre supérieure, panneau latéral et textes d'aide
  'Opgeslagen': 'Enregistré',
  'Niet verbonden': 'Non connecté',
  'Bezig met synchroniseren…': 'Synchronisation…',
  'Synchronisatie mislukt': 'Échec de la synchronisation',
  'Versie {v}': 'Version {v}',
  'Uitloggen': 'Se déconnecter',
  'Meldingen': 'Notifications',
  'Verbinding met Google Drive verbroken. Je gegevens blijven op dit toestel staan.':
    'Déconnecté de Google Drive. Vos données restent sur cet appareil.',
  'Geef een naam en een geldig bedrag om op te slaan.': 'Indiquez un nom et un montant valide pour enregistrer.',
  'Geef een naam en een percentage tussen 0 en 100.': 'Indiquez un nom et un pourcentage entre 0 et 100.',
  'Kies een categorie en geef een bedrag.': 'Choisissez une catégorie et indiquez un montant.',
  // Ronde 7 : chiffres corrects, clôture des prêts, perspectives
  'Nieuwe transactie': 'Nouvelle transaction',
  'Uitgaven per categorie': 'Dépenses par catégorie',
  'Deze rekening heeft nog {n} boeking(en). Archiveer ze in plaats van ze te verwijderen.':
    'Ce compte comporte encore {n} écriture(s). Archivez-le au lieu de le supprimer.',
  'Een terugbetaling in dezelfde categorie verlaagt het verbruik. Daardoor kan dit cijfer lager liggen dan de uitgaven in de Analyse.':
    'Un remboursement dans la même catégorie réduit la consommation. Ce chiffre peut donc être inférieur aux dépenses affichées dans l’Analyse.',
  'Achterstallig — inkomsten': 'En retard — revenus',
  'Achterstallig — uitgaven': 'En retard — dépenses',
  '{n} vaste last(en) achterstallig — de dag is voorbij': '{n} charge(s) fixe(s) en retard — le jour est passé',
  'De einddatum ligt vóór de begindatum.': 'La date de fin précède la date de début.',
  'sluit af': 'clôturer',
  'heropen': 'rouvrir',
  'Sluit lening {naam} af': 'Clôturer le prêt {naam}',
  'Heropen lening {naam}': 'Rouvrir le prêt {naam}',
  'afgesloten': 'clôturé',
  'afgesloten, telt niet meer mee': 'clôturé, plus comptabilisé',
  'Nog te ontvangen': 'Encore à recevoir',
  'Nog te betalen': 'Encore à payer',
  'Dit is meer dan er nog openstaat ({open}).': 'C’est plus que le montant restant dû ({open}).',
  'Zet op {open}': 'Mettre à {open}',
  'De eerdere maanden tellen aan de niet-geïndexeerde bijdrage; enkel de lopende maand telt geïndexeerd. Zo weegt de indexatie niet met terugwerkende kracht.':
    'Les mois antérieurs sont comptés à la contribution non indexée ; seul le mois en cours est indexé. L’indexation ne s’applique donc pas rétroactivement.',
  // Ronde 8 : icônes, filtres et sous-catégories sur place
  'je financieel kompas': 'votre boussole financière',
  'Filters': 'Filtres',
  'Filters · {n}': 'Filtres · {n}',
  'Van {datum}': 'Du {datum}',
  'Tot {datum}': 'Au {datum}',
  'Wis filter {naam}': 'Effacer le filtre {naam}',
  '+ “{naam}” toevoegen aan …': '+ Ajouter “{naam}” à …',
  'Nieuwe subcategorie “{naam}”': 'Nouvelle sous-catégorie “{naam}”',
  'Onder welke categorie': 'Sous quelle catégorie',
  'Subcategorie toevoegen': 'Ajouter une sous-catégorie',
  'Kies een categorie en geef een naam.': 'Choisissez une catégorie et indiquez un nom.',
  'Zet een eigen item onder een bestaande categorie, zonder de boom te doorlopen.':
    'Ajoutez votre propre élément sous une catégorie existante, sans parcourir l’arborescence.',
  'bv. Kefir': 'p. ex. Kéfir',
  // Ronde 9 : mise en page bureau
  'Alle': 'Tout',
  'Recente transacties': 'Transactions récentes',
  'Budgetstatus': 'État des budgets',
  'Nog geen transacties.': 'Aucune transaction pour l’instant.',
  'Nieuwe rekening': 'Nouveau compte',
  'Rekening bewerken': 'Modifier le compte',
  'Nieuwe categorie': 'Nouvelle catégorie',
  'Categorie bewerken': 'Modifier la catégorie',
  // Ronde 10 : membres du foyer, types de dossiers et calculatrices
  'Gezinsleden': 'Membres du foyer',
  'Stel je gezinsleden één keer in; je kan er kosten, doelen, leningen en garanties aan koppelen.':
    'Configurez vos membres du foyer une seule fois ; vous pouvez y rattacher des frais, des objectifs, des prêts et des garanties.',
  'Nog geen gezinsleden ingesteld.': 'Aucun membre du foyer configuré.',
  'Naam gezinslid': 'Nom du membre',
  'Gezinslid toevoegen': 'Ajouter un membre',
  'Rol van {naam}': 'Rôle de {naam}',
  'Wijzig gezinslid {naam}': 'Modifier le membre {naam}',
  'Archiveer gezinslid {naam}': 'Archiver le membre {naam}',
  'Heropen gezinslid {naam}': 'Rouvrir le membre {naam}',
  'Verwijder gezinslid {naam}': 'Supprimer le membre {naam}',
  'Gearchiveerd': 'Archivé',
  'Gearchiveerde gezinsleden verdwijnen uit de keuzelijsten, maar hun naam blijft staan waar ze al gebruikt zijn.':
    'Les membres archivés disparaîtront des listes de choix, mais leur nom reste là où il est déjà utilisé.',
  '— niemand —': '— personne —',
  'Voor wie is dit doel?': 'Pour qui est cet objectif ?',
  'Gezinslid (optioneel)': 'Membre du foyer (facultatif)',
  'Een bank of winkel vul je hierboven in als vrije tekst; gaat het om iemand van het gezin, kies hem hier.':
    'Indiquez une banque ou un magasin ci-dessus en texte libre ; s’il s’agit d’un membre du foyer, choisissez-le ici.',
  'Van wie is dit?': 'À qui est-ce ?',
  'voor {naam}': 'pour {naam}',
  'Uitgaven per gezinslid': 'Dépenses par membre du foyer',
  'Inkomsten per gezinslid': 'Revenus par membre du foyer',
  'Hangt een transactie aan meerdere gezinsleden, dan wordt het bedrag gelijk over hen verdeeld.':
    'Si une transaction concerne plusieurs membres, le montant est réparti également entre eux.',
  'Het gezin': 'La famille',
  'Onbekend gezinslid': 'Membre inconnu',
  'Nieuw dossier': 'Nouveau dossier',
  // Ronde 29 — les sous-onglets de la page Dossiers.
  'Soort dossier': 'Type de dossier',
  'Facturen & garantiebewijzen': 'Factures & garanties',
  'Wat je uitzet, verdwijnt alleen uit beeld — er gaat niets verloren.':
    'Ce que vous désactivez disparaît seulement de l’écran — rien n’est perdu.',
  'Wat wil je bijhouden?': 'Que voulez-vous suivre ?',
  'Gedeelde kosten': 'Frais partagés',
  'Kosten verdelen met een co-ouder of ex-partner, met een verdeelsleutel en afrekeningen.':
    'Partager les frais avec un coparent ou un ex-partenaire, avec une clé de répartition et des décomptes.',
  'Lening of krediet': 'Prêt ou crédit',
  'Geld dat jij uitleende of zelf leende, met terugbetalingen en openstaand kapitaal.':
    'De l’argent que vous avez prêté ou emprunté, avec les remboursements et le capital restant dû.',
  'Aankoop met garantie': 'Achat sous garantie',
  'Een aankoop met bon of factuur, waarvan de app de garantieperiode bewaakt.':
    'Un achat avec ticket ou facture, dont l’application surveille la période de garantie.',
  'Rekenhulpen': 'Calculatrices',
  'Vier kleine rekenmachines. Ze rekenen live mee en bewaren niets.':
    'Quatre petites calculatrices. Elles calculent en direct et n’enregistrent rien.',
  'Alimentatie': 'Pension alimentaire',
  'Huur': 'Loyer',
  'Huurindexatie': 'Indexation du loyer',
  'Geïndexeerde huur = basishuur × nieuwe index / aanvangsindex (Belgische formule).':
    'Loyer indexé = loyer de base × nouvel indice / indice de départ (formule belge).',
  'Voor huur gebruik je de gezondheidsindex: de aanvangsindex is die van de maand vóór de ondertekening van het huurcontract.':
    'Pour le loyer, utilisez l’indice-santé : l’indice de départ est celui du mois précédant la signature du bail.',
  'Voor onderhoudsgeld is de aanvangsindex die van de maand waarin het bedrag werd vastgelegd.':
    'Pour la pension alimentaire, l’indice de départ est celui du mois où le montant a été fixé.',
  'Dat is {verschil} meer ({procent}).': 'Soit {verschil} de plus ({procent}).',
  'Dat is {verschil} minder ({procent}).': 'Soit {verschil} de moins ({procent}).',
  'Het bedrag blijft gelijk.': 'Le montant reste identique.',
  'Vul een basisbedrag groter dan nul in.': 'Indiquez un montant de base supérieur à zéro.',
  'Vul twee indexcijfers groter dan nul in.': 'Indiquez deux indices supérieurs à zéro.',
  'Lening en aflossing': 'Prêt et remboursement',
  'Wat kost een lening per maand, en wat levert extra aflossen op?':
    'Combien coûte un prêt par mois, et que rapporte un remboursement anticipé ?',
  'Geleend bedrag (€)': 'Montant emprunté (€)',
  'Jaarlijkse rentevoet (%)': 'Taux d’intérêt annuel (%)',
  'Looptijd (maanden)': 'Durée (mois)',
  'Extra per maand (€)': 'Supplément par mois (€)',
  'Maandlast': 'Mensualité',
  'Totale interest': 'Intérêts totaux',
  'Totaal terugbetaald': 'Total remboursé',
  'Met {extra} extra per maand ben je {maanden} maanden vroeger klaar en bespaar je {interest} interest.':
    'Avec {extra} de plus par mois, vous terminez {maanden} mois plus tôt et économisez {interest} d’intérêts.',
  'Met {extra} extra per maand bespaar je {interest} interest.':
    'Avec {extra} de plus par mois, vous économisez {interest} d’intérêts.',
  'Spaardoel': 'Objectif d’épargne',
  'Hoeveel per maand, of wanneer haal je het?': 'Combien par mois, ou quand y arriverez-vous ?',
  'Hoeveel per maand?': 'Combien par mois ?',
  'Wanneer haal ik het?': 'Quand y arriverai-je ?',
  'Zonder rente gerekend, net zoals de spaardoelen in de app.':
    'Calcul sans intérêts, comme les objectifs d’épargne de l’application.',
  'Al gespaard (€)': 'Déjà épargné (€)',
  'Streefdatum': 'Date cible',
  'Bedrag per maand (€)': 'Montant par mois (€)',
  'Per maand opzijzetten': 'À mettre de côté par mois',
  'Nog nodig': 'Encore nécessaire',
  'Aantal maanden': 'Nombre de mois',
  'Klaar op': 'Terminé le',
  'Je doel is al bereikt.': 'Votre objectif est déjà atteint.',
  '{maanden} stortingen van {bedrag} tot {datum}.': '{maanden} versements de {bedrag} jusqu’au {datum}.',
  'Vanaf vandaag ({vandaag}) duurt dat nog {maanden} maanden.':
    'À partir d’aujourd’hui ({vandaag}), cela prend encore {maanden} mois.',
  'Prijs per eenheid': 'Prix à l’unité',
  'Welke verpakking is echt het voordeligst?': 'Quel format est vraiment le plus avantageux ?',
  'Gram en milliliter worden omgerekend, zodat 750 g en 1 kg eerlijk vergelijken.':
    'Les grammes et les millilitres sont convertis, pour comparer 750 g et 1 kg équitablement.',
  'Naam (optioneel)': 'Nom (facultatif)',
  'Prijs (€)': 'Prix (€)',
  'Hoeveelheid': 'Quantité',
  'Eenheid': 'Unité',
  'gram (g)': 'grammes (g)',
  'kilogram (kg)': 'kilogrammes (kg)',
  'milliliter (ml)': 'millilitres (ml)',
  'liter (l)': 'litres (l)',
  'Aanbieding {n}': 'Offre {n}',
  'Verwijder aanbieding {n}': 'Supprimer l’offre {n}',
  'Nog een aanbieding': 'Une autre offre',
  '{procent} duurder': '{procent} plus cher',
  // Ronde 11 : ventilation des décomptes et clés de répartition
  'Kosten zonder kind ook meetellen': 'Inclure aussi les frais sans enfant',
  'Bv. een gezamenlijke schoolrekening zonder kind erbij. Vink je dit uit, dan blijven die kosten open staan.':
    'Par exemple une facture scolaire commune sans enfant associé. Si vous décochez, ces frais restent ouverts.',
  '{n} kosten zitten al in een andere afrekening': '{n} frais figurent déjà dans un autre décompte',
  'Kies eerst een categorie en geef een percentage van 0 tot 100.':
    'Choisissez d’abord une catégorie et indiquez un pourcentage de 0 à 100.',
  'Geef een percentage van 0 tot 100 om deze verdeling toe te voegen.':
    'Indiquez un pourcentage de 0 à 100 pour ajouter cette répartition.',
  'Verdeling per kostensoort': 'Répartition par type de frais',
  'Voor buitengewone kosten (medisch, schools, ontwikkeling) spreken ouders vaak een andere sleutel af dan voor gewone kosten. Leeg laten = de standaard van het dossier ({p}%).':
    'Pour les frais extraordinaires (médicaux, scolaires, développement), les parents conviennent souvent d’une autre clé que pour les frais ordinaires. Laisser vide = la valeur par défaut du dossier ({p}%).',
  'Gewone kosten (% jij)': 'Frais ordinaires (% vous)',
  'Buitengewone kosten (% jij)': 'Frais extraordinaires (% vous)',
  'leeg = {p}%': 'vide = {p}%',
  'Bewaar verdeling per kostensoort': 'Enregistrer la répartition par type',
  'Geef een percentage van 0 tot 100, of laat het veld leeg.':
    'Indiquez un pourcentage de 0 à 100, ou laissez le champ vide.',
  'Verdeelsleutel': 'Clé de répartition',
  'Totalen': 'Totaux',
  'Totaal kosten': 'Total des frais',
  'Aantal kosten': 'Nombre de frais',
  'Jij betaalde': 'Vous avez payé',
  'Partner betaalde': 'Le partenaire a payé',
  'Jouw aandeel': 'Votre part',
  'Aandeel partner': 'Part du partenaire',
  'Per kind': 'Par enfant',
  'Per categorie': 'Par catégorie',
  'Per kostensoort': 'Par type de frais',
  'Detail': 'Détail',
  'Opgemaakt op': 'Établi le',
  'Niet toegewezen aan een kind': 'Non attribué à un enfant',
  'Gewone kosten': 'Frais ordinaires',
  'Buitengewone kosten': 'Frais extraordinaires',
  'gewone kosten': 'frais ordinaires',
  'buitengewone kosten': 'frais extraordinaires',
  'saldo': 'solde',
  'jouw deel': 'votre part',
  'bon toegevoegd': 'reçu joint',
  'geen bon': 'pas de reçu',
  'standaardverdeling van het dossier': 'répartition par défaut du dossier',
  'eigen percentage op de kost': 'pourcentage propre sur le frais',
  'afwijkende verdeling': 'répartition différente',
  'afspraak voor {bron}': 'accord pour {bron}',
  'afspraak voor categorie {bron}': 'accord pour la catégorie {bron}',
  'jij {p}% / partner {q}%': 'vous {p}% / partenaire {q}%',
  'jij {jij} / partner {partner}': 'vous {jij} / partenaire {partner}',
  '{n} kost(en), {bedrag}': '{n} frais, {bedrag}',
  '{n}, waarvan {m} met bon': '{n}, dont {m} avec ticket',
  'blad {n} van {totaal}': 'page {n} sur {totaal}',
  'Saldo: plus = partner betaalt jou, min = jij betaalt partner.':
    'Solde : plus = le partenaire vous paie, moins = vous payez le partenaire.',
  'Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.':
    'Attention : lors de la génération, il s’agissait de {bedrag} ; la répartition du dossier a changé depuis.',
  // Ronde 12 : icône et couleur pour les catégories personnelles
  'Voorbeeld': 'Aperçu',
  'Zo verschijnt ze straks in de transactielijst.': 'Voici comment elle apparaîtra dans la liste des transactions.',
  'Icoon': 'Icône',
  'Kies icoon {icoon}': 'Choisir l’icône {icoon}',
  'Gekozen icoon: {icoon}': 'Icône choisie : {icoon}',
  'Nog geen icoon gekozen.': 'Aucune icône choisie.',
  'Eigen teken': 'Caractère personnel',
  'bv. 🧺': 'p. ex. 🧺',
  'Kies kleur {kleur}': 'Choisir la couleur {kleur}',
  'Gekozen kleur: {kleur}': 'Couleur choisie : {kleur}',
  'Nog geen kleur gekozen — de grafiek gebruikt dan haar standaardkleur.':
    'Aucune couleur choisie — le graphique utilisera sa couleur par défaut.',
  'Rol': 'Rôle',
  // Namen van de iconen
  'Eten': 'Repas',
  'Boodschappen': 'Courses',
  'Drank': 'Boissons',
  'Huis': 'Maison',
  'Energie': 'Énergie',
  'Huishouden': 'Ménage',
  'Auto': 'Voiture',
  'Brandstof': 'Carburant',
  'Openbaar vervoer': 'Transports en commun',
  'Fiets': 'Vélo',
  'Gezondheid': 'Santé',
  'Apotheek': 'Pharmacie',
  'Tandarts': 'Dentiste',
  'School': 'École',
  'Boeken': 'Livres',
  'Sport': 'Sport',
  'Ontspanning': 'Loisirs',
  'Cadeau': 'Cadeau',
  'Reizen': 'Voyages',
  'Vakantie': 'Vacances',
  'Kleding': 'Vêtements',
  'Verzorging': 'Soins',
  'Huisdier': 'Animal',
  'Gereedschap': 'Outils',
  'Tuin': 'Jardin',
  'Telefoon': 'Téléphone',
  'Internet': 'Internet',
  'Abonnement': 'Abonnement',
  'Verzekering': 'Assurance',
  'Bank': 'Banque',
  'Spaarpot': 'Tirelire',
  'Inkomen': 'Revenu',
  'Administratie': 'Administratif',
  // Namen van de kleuren
  'Amber': 'Ambre',
  'Oranje': 'Orange',
  'Terracotta': 'Terre cuite',
  'Rood': 'Rouge',
  'Oudroze': 'Vieux rose',
  'Paars': 'Violet',
  'Mosgroen': 'Vert mousse',
  'Zeegroen': 'Vert d’eau',
  'Turkoois': 'Turquoise',
  'Bruin': 'Brun',
  'Zandbruin': 'Sable',
  'Grijs': 'Gris',
  // Ronde 13 : tableau des transactions et détail du compte
  'Categorie': 'Catégorie',
  'Bedrag': 'Montant',
  'Toon rekening {naam}': 'Afficher le compte {naam}',
  'Saldo vandaag': 'Solde aujourd’hui',
  'Binnengekomen': 'Entrées',
  'Eraf gegaan': 'Sorties',
  'Verschil': 'Différence',
  'Overboekingen tellen hier niet mee: die verschuiven enkel geld tussen je eigen rekeningen.':
    'Les virements ne sont pas comptés ici : ils déplacent seulement de l’argent entre vos propres comptes.',
  'Laatste transacties': 'Dernières transactions',
  'Nog geen boekingen op deze rekening.': 'Aucune écriture sur ce compte.',
  '+ nog {n}': '+ {n} de plus',
  'van {naam}': 'de {naam}',
  'naar {naam}': 'vers {naam}',
  'Bewerken': 'Modifier',
  'Archiveren': 'Archiver',
  'Heropenen': 'Rouvrir',
  'Verwijderen': 'Supprimer',
  // Spaardoelen
  'Spaardoelen': 'Objectifs d’épargne',
  'Leningen': 'Prêts',
  'Garanties': 'Garanties',
  'Langetermijndoelen — buffers, grote aankopen, schuldenvrij.':
    'Objectifs à long terme — réserves, gros achats, sans dettes.',
  'Nog geen doelen. Voeg je eerste doel toe!': 'Aucun objectif. Ajoutez votre premier objectif !',
  '{a} van {b}': '{a} sur {b}',
  'Bewerk doel {naam}': 'Modifier l’objectif {naam}',
  'Verwijder doel {naam}': 'Supprimer l’objectif {naam}',
  'nog {bedrag}': 'encore {bedrag}',
  '{bedrag}/mnd': '{bedrag}/mois',
  ' · tegen {datum}': ' · pour {datum}',
  'Huidig bedrag {naam}': 'Montant actuel {naam}',
  'Huidig bedrag': 'Montant actuel',
  'Bedrag bijwerken': 'Mettre à jour le montant',
  'Doelnaam': 'Nom de l’objectif',
  'Bv. Communie Kind 1': 'Ex. Communion Enfant 1',
  'Doelbedrag (€)': 'Montant cible (€)',
  'Gekoppelde rekening': 'Compte lié',
  'Geen — manueel bijhouden': 'Aucun — suivi manuel',
  'Huidig bedrag (€)': 'Montant actuel (€)',
  'Doeldatum (optioneel)': 'Date cible (optionnelle)',
  'Maandelijks streefbedrag (€, optioneel)': 'Objectif mensuel (€, optionnel)',
  'Kleur': 'Couleur',
  'Doel wijzigen': 'Modifier l’objectif',
  'Doel toevoegen': 'Ajouter un objectif',
  // Vaste lasten
  'Vaste lasten': 'Charges fixes',
  'Inboeken voor {maand}': 'Comptabiliser pour {maand}',
  '{bedrag} · dag {dag}': '{bedrag} · jour {dag}',
  'Geboekt ✓': 'Comptabilisé ✓',
  'Boek in': 'Comptabiliser',
  'Bewerk vaste post {naam}': 'Modifier le poste fixe {naam}',
  'Verwijder vaste post {naam}': 'Supprimer le poste fixe {naam}',
  'Vaste omschrijving': 'Description fixe',
  'Vast bedrag (€)': 'Montant fixe (€)',
  'Vaste rekening': 'Compte (fixe)',
  'Vaste categorie': 'Catégorie (fixe)',
  'Dag van de maand': 'Jour du mois',
  'Vaste post wijzigen': 'Modifier le poste fixe',
  'Vaste post toevoegen': 'Ajouter un poste fixe',
  // Indexatie
  'Alimentatie-indexatie': 'Indexation de la pension alimentaire',
  'Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).':
    'Montant indexé = montant de base × nouvel indice / indice initial (formule belge).',
  'Basisbedrag (€)': 'Montant de base (€)',
  'Aanvangsindex': 'Indice initial',
  'Nieuwe index': 'Nouvel indice',
  'Geïndexeerd bedrag: {bedrag}': 'Montant indexé : {bedrag}',
  // Overboekingen
  'Overboekingen': 'Virements',
  'Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).':
    'Déplacer de l’argent entre vos propres comptes (ni revenu ni dépense).',
  'Je hebt minstens twee rekeningen nodig om over te boeken.':
    'Il vous faut au moins deux comptes pour effectuer un virement.',
  'Bewerk overboeking {van} naar {naar}': 'Modifier le virement {van} vers {naar}',
  'Verwijder overboeking {van} naar {naar}': 'Supprimer le virement {van} vers {naar}',
  'Van rekening': 'Du compte',
  'Naar rekening': 'Vers le compte',
  'Kies twee verschillende rekeningen.': 'Choisissez deux comptes différents.',
  'Over te boeken bedrag (€)': 'Montant à virer (€)',
  'Datum overboeking': 'Date du virement',
  'Omschrijving': 'Description',
  'Overboeking wijzigen': 'Modifier le virement',
  'Overboeking toevoegen': 'Ajouter un virement',
  'onbekende rekening': 'compte inconnu',
  // Kinderen & dossier-uitbreidingen (Ronde 2)
  'Kinderen': 'Enfants',
  'Stel je kinderen één keer in; je kan gedeelde kosten eraan koppelen.': 'Configurez vos enfants une fois ; vous pouvez y associer des frais partagés.',
  'Nog geen kinderen ingesteld.': 'Aucun enfant configuré.',
  'Naam kind': 'Nom de l’enfant',
  'Kind toevoegen': 'Ajouter un enfant',
  'Wijzig kind {naam}': 'Modifier l’enfant {naam}',
  'Verwijder kind {naam}': 'Supprimer l’enfant {naam}',
  'Kind verwijderd': 'Enfant supprimé',
  'Voor wie? (optioneel)': 'Pour qui ? (optionnel)',
  'Voor wie?': 'Pour qui ?',
  'Duid je niemand aan, dan telt dit als een uitgave voor het gezin.':
    'Si vous ne sélectionnez personne, cette dépense compte pour la famille.',
  // Ronde 30
  'Selecteer hoofdcategorie (optioneel)': 'Choisir une catégorie principale (facultatif)',
  // Ronde 35
  '({bedrag} te veel)': '({bedrag} de trop)',
  '{naam} lijkt al geboekt op {datum} ({bedrag}). Er is niets bijgemaakt — controleer je transacties.':
    '{naam} semble déjà enregistré le {datum} ({bedrag}). Rien n’a été ajouté — vérifiez vos transactions.',
  'Melding sluiten': 'Fermer le message',
  'Meer pagina’s': 'Plus de pages',
  'stuks': 'pièces',
  'goedkoopste': 'le moins cher',
  'De opslag van dit toestel zit vol. Verwijder een paar bonnetjes of foto’s en probeer opnieuw.':
    'Le stockage de cet appareil est plein. Supprimez quelques reçus ou photos et réessayez.',
  'Opslaan is niet gelukt. Je invoer staat er nog.':
    'L’enregistrement a échoué. Votre saisie est toujours là.',
  'Toon alle maanden — wis het maandfilter': 'Afficher tous les mois — effacer le filtre de mois',
  'Er ging iets mis, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.':
    'Une erreur est survenue, mais vos données sont en sécurité. Le reste de l’application continue de fonctionner.',
  'Er ging iets mis in {naam}, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.':
    'Une erreur est survenue dans {naam}, mais vos données sont en sécurité. Le reste de l’application continue de fonctionner.',
  'Probeer opnieuw': 'Réessayer',
  'Zonder categorie': 'Sans catégorie',
  'Onbekend': 'Inconnu',
  'Bewaard document': 'Document enregistré',
  'Bewaren lukte niet. Je kan het bestand hierboven wel gewoon bekijken.':
    'L\u2019enregistrement a échoué. Vous pouvez toujours consulter le fichier ci-dessus.',
  'Blijft het vak leeg? Bewaar het bestand hieronder en open het met je eigen pdf-lezer.':
    'Le cadre reste vide ? Enregistrez le fichier ci-dessous et ouvrez-le avec votre lecteur PDF.',
  'Deze afbeelding kan niet getoond worden. Ze is mogelijk beschadigd bij het bewaren.':
    'Cette image ne peut pas être affichée. Elle a peut-être été endommagée lors de l\u2019enregistrement.',
  'Foto van bon of factuur: {naam}': 'Photo du reçu ou de la facture : {naam}',
  'Pdf-bestand: {naam}': 'Fichier PDF : {naam}',
  'Bewaren mislukte: {fout}. Je invoer staat er nog — probeer het opnieuw.':
    'L\u2019enregistrement a échoué : {fout}. Votre saisie est toujours là — réessayez.',
  'Bewaren op dit toestel': 'Enregistrer sur cet appareil',
  'Bewaren…': 'Enregistrement…',
  'Bon of factuur': 'Reçu ou facture',
  'Contract of bewijs': 'Contrat ou justificatif',
  'De gegevens konden niet geopend worden': 'Impossible d\u2019ouvrir vos données',
  'De regels verdelen meer dan het totaalbedrag. Pas een regel of het totaal aan.':
    'Les lignes dépassent le montant total. Ajustez une ligne ou le total.',
  'Je gegevens zijn niet weg — de app kan de opslag van deze browser alleen niet openen. Dat gebeurt in een privévenster, wanneer de opslag vol zit, of wanneer deze pagina nog een oudere versie van de app is.':
    'Vos données ne sont pas perdues — l\u2019application ne parvient simplement pas à ouvrir le stockage de ce navigateur. Cela arrive en navigation privée, lorsque le stockage est plein, ou lorsque cette page utilise encore une version plus ancienne de l\u2019application.',
  'Opnieuw proberen': 'Réessayer',
  'Technische melding: {fout}': 'Message technique : {fout}',

  // Ronde 32
  'Indexatie-tools': 'Outils d’indexation',
  'Naar Overzicht': 'Vers l’aperçu',
  'Zoek: {term}': 'Recherche : {term}',
  'Zoeken': 'Rechercher',
  'Zoeken en filteren': 'Rechercher et filtrer',
  'Zoeken en filteren · {n}': 'Rechercher et filtrer · {n}',

  // Ronde 31
  '* Deze maand loopt nog, dus die staaf is nog niet volledig.':
    '* Ce mois est en cours, cette barre n’est donc pas complète.',
  'Bekijk alle {n} in Analyse ›': 'Voir les {n} dans Analyse ›',
  'Bekijk in Analyse ›': 'Voir dans Analyse ›',
  'Even veel als de vorige periode. {tip}': 'Autant que la période précédente. {tip}',
  'Gemiddeld {bedrag} per maand': 'En moyenne {bedrag} par mois',
  'Het lijntje loopt over {venster}. Het verschil ernaast vergelijkt {periode} met de vorige even lange periode.':
    'La courbe couvre {venster}. La différence à côté compare {periode} à la période précédente de même durée.',
  'Het lijntje loopt over {venster}. Kies een periode (niet Alles) om er een verschil bij te zien.':
    'La courbe couvre {venster}. Choisissez une période (pas Tout) pour voir une différence.',
  'Houdt dit een jaar aan, dan bespaar je {bedrag}. {tip}': 'Si cela dure un an, vous économisez {bedrag}. {tip}',
  'Houdt dit een jaar aan, dan kost het {bedrag} extra. {tip}':
    'Si cela dure un an, cela coûte {bedrag} de plus. {tip}',
  'Inkomsten en uitgaven per maand': 'Revenus et dépenses par mois',
  'Nog geen uitgaven in deze vier domeinen.': 'Pas encore de dépenses dans ces quatre domaines.',
  'Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten en of ze stijgen.':
    'Pas encore de dépenses dans ces quatre domaines. Dès que vous enregistrez des courses, de l’énergie, des télécoms ou des assurances, vous verrez ici ce qu’elles coûtent et si elles augmentent.',
  'Nog niets geboekt in deze maanden.': 'Rien d’enregistré durant ces mois.',
  'Per hoofdcategorie — klik een rij open voor de details erachter.':
    'Par catégorie principale — cliquez sur une ligne pour voir le détail.',
  'Samen {bedrag} in deze periode.': '{bedrag} au total sur cette période.',
  'Samen {bedrag}. Sterkst gestegen: {naam}, {verschil} meer.':
    '{bedrag} au total. Plus forte hausse : {naam}, {verschil} de plus.',
  'Toon details': 'Afficher le détail',
  'Verberg details': 'Masquer le détail',
  'Verloop per categorie': 'Évolution par catégorie',
  'Verloop van {naam} over {venster}': 'Évolution de {naam} sur {venster}',
  'Vorige periode: {bedrag}. {tip}': 'Période précédente : {bedrag}. {tip}',
  'Waar loopt het op?': 'Où cela s’accumule-t-il ?',
  'in': 'in',
  'loopt nog': 'en cours',
  'uit': 'out',
  '{label} per categorie: {inhoud}': '{label} par catégorie : {inhoud}',
  'Hoofdcategorie: {naam}': 'Catégorie principale : {naam}',
  'Zet {naam} hoger': 'Monter {naam}',
  'Zet {naam} lager': 'Descendre {naam}',
  '{hoofd} · hele categorie': '{hoofd} · catégorie entière',
  'Eigen verdeling (% jij, optioneel)': 'Répartition personnalisée (% vous, optionnel)',
  'leeg = standaard van het dossier': 'vide = valeur par défaut du dossier',
  'voor {namen}': 'pour {namen}',
  'jij {p}%': 'vous {p}%',
  'Soort kost': 'Type de frais',
  'Gewone kost': 'Frais ordinaires',
  'Buitengewone kost': 'Frais extraordinaires',
  'buitengewoon': 'extraordinaire',
  'Verdeling per categorie': 'Répartition par catégorie',
  'Standaard draag jij {p}%. Stel hier per categorie een afwijkend percentage in.':
    'Par défaut vous supportez {p}%. Définissez ici un pourcentage différent par catégorie.',
  'Verwijder verdeling {naam}': 'Supprimer la répartition {naam}',
  'Percentage jij': 'Votre pourcentage',
  // Modulaire afrekening (Ronde 2 · Brok C)
  'Openstaand': 'À régler',
  'Nieuwe afrekening': 'Nouveau décompte',
  'Kies een periode en (optioneel) kinderen. Dit blokkeert niets — je kan meerdere afrekeningen maken.':
    'Choisissez une période et (facultatif) des enfants. Cela ne bloque rien — vous pouvez faire plusieurs décomptes.',
  'Periode van': 'Période du',
  'Periode tot': 'Période au',
  'Voor welke kinderen? (leeg = allemaal)': 'Pour quels enfants ? (vide = tous)',
  'In deze selectie: {n} kost(en), {saldo}': 'Dans cette sélection : {n} frais, {saldo}',
  'Genereer afrekening': 'Générer le décompte',
  'Afrekeningen': 'Décomptes',
  'alle periodes': 'toutes les périodes',
  'alle kinderen': 'tous les enfants',
  'Overgemaakt': 'Payé',
  'Verwijder afrekening {datum}': 'Supprimer le décompte {datum}',
  // PDF, samenvatting & bonnetje (Ronde 2 · Brok D)
  'Bon/factuur (optioneel)': 'Reçu/facture (optionnel)',
  'Bon/factuur': 'Reçu/facture',
  'bekijken': 'consulter',
  'verwijderen': 'supprimer',
  'bezig…': 'en cours…',
  'Kopieer': 'Copier',
  'Gekopieerd ✓': 'Copié ✓',
  'bon': 'reçu',
  'Afrekening — {naam}': 'Décompte — {naam}',
  'Periode': 'Période',
  'Resultaat': 'Résultat',
  // Kindrekening (Ronde 2 · Brok E)
  'Kindrekening': 'Compte des enfants',
  'Kindrekening (gezamenlijke pot)': 'Compte des enfants (pot commun)',
  'Een gezamenlijke pot waarop beide ouders storten en waaruit kosten rechtstreeks betaald worden. Een tweede manier van afrekenen naast het verschil-model.':
    'Un pot commun que les deux parents alimentent et depuis lequel les frais sont payés directement. Une deuxième façon de régler, à côté du modèle de différence.',
  'Kindrekening aanzetten': 'Activer le compte des enfants',
  'Kindrekening uitzetten': 'Désactiver le compte des enfants',
  'Kindrekening uitgezet': 'Compte des enfants désactivé',
  'Saldo van de pot': 'Solde du pot',
  'Storting': 'Versement',
  'Storting (geld erin)': 'Versement (argent entrant)',
  'Uitgave (geld eruit)': 'Dépense (argent sortant)',
  'Soort beweging': 'Type de mouvement',
  'Bedrag pot (€)': 'Montant pot (€)',
  'Omschrijving (optioneel)': 'Description (optionnel)',
  'Gestort door:': 'Versé par :',
  'Beweging wijzigen': 'Modifier le mouvement',
  'Beweging toevoegen': 'Ajouter un mouvement',
  'Beweging verwijderd': 'Mouvement supprimé',
  'Bewerk beweging': 'Modifier le mouvement',
  'Verwijder beweging': 'Supprimer le mouvement',
  'door {wie}': 'par {wie}',
  'Maandbijdrage': 'Contribution mensuelle',
  'Maandbijdrage-afspraak instellen': 'Définir la contribution mensuelle',
  'Afspraak verbergen': 'Masquer la convention',
  'Afspraak bewaren': 'Enregistrer la convention',
  'De afgesproken maandelijkse storting per ouder. Vul een aanvangs- en huidige index in om de bijdrage te indexeren (Belgische formule).':
    'Le versement mensuel convenu par parent. Saisissez un index de départ et actuel pour indexer la contribution (formule belge).',
  'Bijdrage jij (€/maand)': 'Ta contribution (€/mois)',
  'Bijdrage partner (€/maand)': 'Contribution du partenaire (€/mois)',
  'Startdatum afspraak': 'Date de début de la convention',
  'Aanvangsindex (optioneel)': 'Index de départ (optionnel)',
  'Huidige index (optioneel)': 'Index actuel (optionnel)',
  'Geïndexeerde bijdrage jij: {bedrag}': 'Ta contribution indexée : {bedrag}',
  'geïndexeerd': 'indexé',
  'jij {jij}': 'toi {jij}',
  'partner {partner}': 'partenaire {partner}',
  'gestort: {bedrag}': 'versé : {bedrag}',
  'gestort {gestort}, loopt {achter} achter': 'versé {gestort}, {achter} de retard',
  'gestort {gestort}, {voor} vooruit': 'versé {gestort}, {voor} en avance',
  'gestort {gestort}, precies bij': 'versé {gestort}, pile à jour',
  // Leningen & kredieten (Ronde 2b · Brok F)
  'Leningen & kredieten': 'Prêts & crédits',
  'Geld dat jij uitleende of zelf leende. Log terugbetalingen; de app houdt het openstaand kapitaal en de geschiedenis bij.':
    'De l\'argent que tu as prêté ou emprunté. Enregistre les remboursements ; l\'app suit le capital restant et l\'historique.',
  'Nog geen leningen. Voeg er hieronder een toe.': 'Aucun prêt pour l\'instant. Ajoutez-en un ci-dessous.',
  'Nieuwe lening': 'Nouveau prêt',
  'Lening bewerken': 'Modifier le prêt',
  'Lening toevoegen': 'Ajouter un prêt',
  'Lening wijzigen': 'Modifier le prêt',
  'Lening verwijderd': 'Prêt supprimé',
  'Soort': 'Type',
  'Ik leende uit (iemand is mij verschuldigd)': 'J\'ai prêté (on me doit)',
  'Ik leende / een krediet (ik betaal af)': 'J\'ai emprunté / un crédit (je rembourse)',
  'Naam': 'Nom',
  'bv. Lening aan broer of Autolening': 'p.ex. Prêt au frère ou Prêt auto',
  'Startbedrag / openstaand kapitaal (€)': 'Montant initial / capital restant (€)',
  'Kredietgever (optioneel)': 'Prêteur (optionnel)',
  'Wie (optioneel)': 'Qui (optionnel)',
  'Startdatum': 'Date de début',
  'Rentevoet % (optioneel)': 'Taux d\'intérêt % (optionnel)',
  'Maandbedrag € (optioneel)': 'Montant mensuel € (optionnel)',
  'Einddatum / termijn (optioneel)': 'Date de fin / échéance (optionnel)',
  'Notitie (optioneel)': 'Note (optionnel)',
  'Contract/bewijs (optioneel)': 'Contrat/preuve (optionnel)',
  'Contract/bewijs': 'Contrat/preuve',
  'contract/bewijs': 'contrat/preuve',
  'uitgeleend': 'prêté',
  'geleend': 'emprunté',
  'nog te ontvangen': 'encore à recevoir',
  'nog te betalen': 'encore à payer',
  'afbetaald': 'remboursé',
  'Bewerk lening {naam}': 'Modifier le prêt {naam}',
  'Verwijder lening {naam}': 'Supprimer le prêt {naam}',
  '{afgelost} van {hoofdsom} afgelost ({pct}%)': '{afgelost} sur {hoofdsom} remboursé ({pct}%)',
  'rente {r}%': 'intérêt {r}%',
  '{bedrag}/maand': '{bedrag}/mois',
  'nog {n} maand(en) tot {datum}': 'encore {n} mois jusqu\'au {datum}',
  'termijn verstreken sinds {datum}': 'échéance dépassée depuis {datum}',
  'termijn loopt deze maand af': 'échéance ce mois-ci',
  'Geschiedenis tonen ({n})': 'Afficher l\'historique ({n})',
  'Geschiedenis verbergen': 'Masquer l\'historique',
  'Aflossing (€)': 'Remboursement (€)',
  'Datum aflossing': 'Date du remboursement',
  'Aflossing toevoegen': 'Ajouter un remboursement',
  'Aflossing verwijderd': 'Remboursement supprimé',
  'Verwijder aflossing {datum}': 'Supprimer le remboursement {datum}',
  // Garanties & facturen (Ronde 2b · Brok G)
  'Garanties & facturen': 'Garanties & factures',
  'Hou per aankoop de garantie en de factuur bij. De app berekent de vervaldatum en waarschuwt vóór ze afloopt.':
    'Conservez la garantie et la facture par achat. L\'app calcule la date d\'expiration et prévient avant la fin.',
  'Nog geen aankopen. Voeg er hieronder een toe.': 'Aucun achat pour l\'instant. Ajoutez-en un ci-dessous.',
  'Nieuwe aankoop': 'Nouvel achat',
  'Aankoop bewerken': 'Modifier l\'achat',
  'Garantie toevoegen': 'Ajouter une garantie',
  'Garantie wijzigen': 'Modifier la garantie',
  'Garantie verwijderd': 'Garantie supprimée',
  'Koppel aan transactie (optioneel)': 'Lier à une transaction (optionnel)',
  'Niet gekoppeld': 'Non lié',
  'Product': 'Produit',
  'bv. Wasmachine': 'p.ex. Lave-linge',
  'Winkel (optioneel)': 'Magasin (optionnel)',
  'Aankoopdatum': 'Date d\'achat',
  'Prijs € (optioneel)': 'Prix € (optionnel)',
  'Garantie in maanden': 'Garantie en mois',
  '24 = wettelijk (2 jaar); tweedehands minstens 12; langere commerciële garantie mag ook.':
    '24 = légal (2 ans) ; occasion au moins 12 ; une garantie commerciale plus longue est possible.',
  'Bewerk garantie {naam}': 'Modifier la garantie {naam}',
  'Verwijder garantie {naam}': 'Supprimer la garantie {naam}',
  'gekocht {datum}': 'acheté {datum}',
  'vervalt {datum}': 'expire {datum}',
  'bon/factuur': 'reçu/facture',
  'verlopen': 'expiré',
  'nog {n} dag(en)': '{n} jour(s) restant(s)',
  'nog {n} maand(en)': '{n} mois restant(s)',
  // Zoeken & filteren over transacties (Ronde 3 · Brok H)
  'Zoek in transacties': 'Rechercher des transactions',
  'Zoek op omschrijving…': 'Rechercher par description…',
  'Richting': 'Sens',
  'Alles': 'Tout',
  'Alle rekeningen': 'Tous les comptes',
  'Hoofdcategorie': 'Catégorie principale',
  'Subcategorie': 'Sous-catégorie',
  'Alle subcategorieën': 'Toutes les sous-catégories',
  'Van': 'Du',
  'Tot': 'Au',
  'Wis filters': 'Effacer les filtres',
  '{n} transactie(s) gevonden': '{n} transaction(s) trouvée(s)',
  '{n} transactie(s) getoond': '{n} transaction(s) affichée(s)',
  'Geen transacties gevonden.': 'Aucune transaction trouvée.',
  'Toon oudere transacties ({n} ouder dan {maanden} maanden)': 'Afficher les transactions plus anciennes ({n} de plus de {maanden} mois)',
  'Toon enkel recente maanden': 'Afficher uniquement les mois récents',
  // Instellingen (Ronde 3 · Brok I)
  'Instellingen': 'Paramètres',
  // Navigatie / pagina's (Ronde 5 · Brok Q)
  'Hoofdnavigatie': 'Navigation principale',
  'Overzicht': 'Aperçu',
  'Transacties': 'Transactions',
  'Budget': 'Budget',
  'Dossiers': 'Dossiers',
  'Meer': 'Plus',
  // Analyse (Ronde 5 · Brok R)
  'Analyse': 'Analyse',
  'Deze maand': 'Ce mois',
  'Dit jaar': 'Cette année',
  'Aangepast': 'Personnalisé',
  't/m': 'au',
  'Verdeling uitgaven': 'Répartition des dépenses',
  'Verdeling inkomsten': 'Répartition des revenus',
  'Per hoofdcategorie': 'Par catégorie principale',
  'Geen uitgaven in deze periode': 'Aucune dépense pour cette période',
  'Geen inkomsten in deze periode': 'Aucun revenu pour cette période',
  'Ranglijst': 'Classement',
  'klik voor detail': 'cliquez pour le détail',
  'Verdeling per product/dienst': 'Répartition par produit/service',
  'Subcategorieën — brood, koffiekoeken, elektriciteit…': 'Sous-catégories — pain, viennoiseries, électricité…',
  'Uitgaven per winkel': 'Dépenses par magasin',
  'Inkomsten per bron': 'Revenus par source',
  'Gebaseerd op de omschrijving bij elke transactie': 'Basé sur la description saisie pour chaque transaction',
  'Toon minder': 'Afficher moins',
  'Toon alle {n} — incl. {m} overige': 'Afficher les {n} — dont {m} autres',
  'Overige ({n})': 'Autres ({n})',
  'Totaal': 'Total',
  'Terug': 'Retour',
  '{n} transacties in de periode': '{n} transactions sur la période',
  'van het totaal': 'du total',
  'Per subcategorie': 'Par sous-catégorie',
  'Alle transacties': 'Toutes les transactions',
  'Kassaticket gesplitst': 'Ticket divisé',
  // Vermogensevolutie (Ronde 5 · Brok S)
  'Vermogensevolutie': 'Évolution du patrimoine',
  // Trends & stijgers/dalers (Ronde 5 · Brok T)
  'Stijgers en dalers': 'Hausses et baisses',
  't.o.v. de vorige periode': 'p.r. à la période précédente',
  'Kies een periode (niet Alles) om te vergelijken.': 'Choisissez une période (pas Tout) pour comparer.',
  'Geen verschillen om te tonen.': 'Aucune différence à afficher.',
  'Per categorie per maand': 'Par catégorie par mois',
  'Verloop over de laatste 6 maanden': 'Évolution sur les 6 derniers mois',
  // Vooruitblik & spaarquote (Ronde 5 · Brok V)
  'Vooruitblik & spaarquote': 'Aperçu & taux d\'épargne',
  'Spaarquote': 'Taux d\'épargne',
  'Nog geen inkomsten in deze periode': 'Pas encore de revenus sur cette période',
  '{saldo} van {inkomsten} inkomsten overgehouden': '{saldo} conservés sur {inkomsten} de revenus',
  'Vooruitblik — {maand}': 'Aperçu — {maand}',
  'spaarquote': 'taux d\'épargne',
  'Al geboekt — inkomsten': 'Déjà comptabilisé — revenus',
  'Al geboekt — uitgaven': 'Déjà comptabilisé — dépenses',
  'Nog te komen — inkomsten': 'À venir — revenus',
  'Nog te komen — uitgaven': 'À venir — dépenses',
  // Weergave / thema (Ronde 5 · Brok O)
  'Weergave': 'Apparence',
  'Kies licht of donker, of laat de app de voorkeur van je toestel volgen.':
    'Choisissez clair ou sombre, ou laissez l\'app suivre la préférence de votre appareil.',
  'Licht': 'Clair',
  'Donker': 'Sombre',
  'Systeem': 'Système',
  'Synchronisatie (Google Drive)': 'Synchronisation (Google Drive)',
  'Synchroniseer je gegevens veilig tussen je toestellen via je eigen Google Drive. Enkel een back-uplogboek; je data blijft lokaal-eerst.':
    'Synchronisez vos données en toute sécurité entre vos appareils via votre propre Google Drive. Uniquement un journal de sauvegarde ; vos données restent local-first.',
  // Barcode-scanner (Ronde 4 · Brok L)
  'Streepjescode scannen': 'Scanner le code-barres',
  'Richt de camera op de streepjescode': 'Dirigez la caméra vers le code-barres',
  'Camera niet beschikbaar: {fout}': 'Caméra indisponible : {fout}',
  'Sluiten': 'Fermer',
  'Scan streepjescode voor regel {n}': 'Scanner le code-barres pour la ligne {n}',
  'Nutri-Score': 'Nutri-Score',
  // --- Coffre à documents par dossier ---
  'Documentkluis': 'Coffre à documents',
  'Bewaar de ouderschapsovereenkomst, attesten, bonnen en het vonnis van dit dossier op één plek.':
    'Conservez la convention parentale, les attestations, les tickets et le jugement de ce dossier au même endroit.',
  'Nog geen documenten. Voeg er hieronder een toe.': 'Pas encore de documents. Ajoutez-en un ci-dessous.',
  'Nieuw document': 'Nouveau document',
  'Overeenkomst': 'Convention',
  'Attest': 'Attestation',
  'Bon': 'Reçu',
  'Vonnis': 'Jugement',
  'Ander': 'Autre',
  'Bekijken': 'Consulter',
  'Openen': 'Ouvrir',
  'Bewaren': 'Enregistrer',
  'Ja, verwijder': 'Oui, supprimer',
  'Verwijder document {naam}': 'Supprimer le document {naam}',
  'Bestand (foto of PDF)': 'Fichier (photo ou PDF)',
  'Gekozen bestand': 'Fichier choisi',
  'Ander bestand kiezen': 'Choisir un autre fichier',
  'Document toevoegen': 'Ajouter le document',
  'bv. Ouderschapsovereenkomst 2026': 'p. ex. Convention parentale 2026',
  'Geef een naam en kies een bestand om op te slaan.': 'Indiquez un nom et choisissez un fichier pour enregistrer.',
  'Dit bestand is te groot (max. 4 MB). Kies een kleinere scan of foto.':
    'Ce fichier est trop volumineux (max. 4 Mo). Choisissez un scan ou une photo plus petite.',
  'Dit bestand kon niet gelezen worden. Probeer een andere scan of foto.':
    'Ce fichier n’a pas pu être lu. Essayez un autre scan ou une autre photo.',
  'Opslaan is mislukt. Probeer het opnieuw; je invoer blijft staan.':
    'Échec de l’enregistrement. Réessayez ; votre saisie est conservée.',
  'Document verwijderd': 'Document supprimé',
  'Bewaar de leningovereenkomst en de betalingsbewijzen van deze lening op één plek.':
    'Conservez le contrat de prêt et les preuves de paiement de ce prêt au même endroit.',
  'Bewaar de factuur, het aankoopbewijs, het garantiebewijs en de handleiding van deze aankoop op één plek.':
    'Conservez la facture, la preuve d’achat, le certificat de garantie et le mode d’emploi de cet achat au même endroit.',
  'bv. Leningovereenkomst': 'p. ex. Contrat de prêt',
  'bv. Factuur wasmachine': 'p. ex. Facture lave-linge',
  'Documenten': 'Documents',
  'Documenten ({n})': 'Documents ({n})',
  'Documenten verbergen': 'Masquer les documents',
  'Nieuw doel': 'Nouvel objectif',
  'Doel bewerken': 'Modifier l’objectif',
  // --- Recommencer à zéro ---
  'Begin opnieuw': 'Recommencer à zéro',
  'Begin opnieuw…': 'Recommencer à zéro…',
  'Wist al je gegevens op dit toestel en begint met een schone lei.':
    'Efface toutes vos données sur cet appareil et repart de zéro.',
  'Ook de logbestanden in je Google Drive-back-up worden opgeruimd, anders komt alles bij de volgende synchronisatie gewoon terug. Ze gaan naar de prullenbak van Drive, dus je kan ze daar nog terughalen.':
    'Les fichiers journaux de votre sauvegarde Google Drive sont également supprimés ; sinon, tout reviendrait à la prochaine synchronisation. Ils vont à la corbeille de Drive, vous pouvez donc encore les récupérer.',
  'Er is nu geen Google Drive-back-up verbonden. Gebruik je de app op meerdere toestellen, doe dit dan ook daar — anders komt hun data bij een volgende synchronisatie terug.':
    'Aucune sauvegarde Google Drive n’est connectée pour le moment. Si vous utilisez l’application sur plusieurs appareils, faites-le aussi sur ceux-ci — sinon leurs données reviendront à la prochaine synchronisation.',
  'Dit kan niet ongedaan gemaakt worden. Maak eerst een back-up als je je gegevens wil bewaren.':
    'Cette action est irréversible. Faites d’abord une sauvegarde si vous souhaitez conserver vos données.',
  'Typ WISSEN om te bevestigen': 'Tapez EFFACER pour confirmer',
  'WISSEN': 'EFFACER',
  'Alles wissen': 'Tout effacer',
  'Alles is gewist. Je begint met een schone lei.': 'Tout a été effacé. Vous repartez de zéro.',
  'Lokaal is alles gewist, maar de back-up kon niet opgeruimd worden. Verbind opnieuw en probeer het nog eens, anders komt je oude data bij de volgende synchronisatie terug.':
    'Tout a été effacé localement, mais la sauvegarde n’a pas pu être nettoyée. Reconnectez-vous et réessayez, sinon vos anciennes données reviendront à la prochaine synchronisation.',
  'Alles is gewist op dit toestel.': 'Tout a été effacé sur cet appareil.',
  'Wissen is mislukt. Er is niets gewist.': 'L’effacement a échoué. Rien n’a été effacé.',
  // --- Application vide : premiere etape ---
  'Welkom bij Kompal': 'Bienvenue dans Kompal',
  'De app is nog helemaal leeg — alles wat er straks in staat, is van jou.':
    'L’application est encore totalement vide — tout ce qui s’y trouvera sera à vous.',
  'Begin met een rekening: je betaalrekening, je spaarrekening, of gewoon je portemonnee. Daarna kan je transacties ingeven.':
    'Commencez par un compte : votre compte courant, votre compte d’épargne, ou simplement votre portefeuille. Ensuite, vous pourrez saisir des transactions.',
  'Maak je eerste rekening aan': 'Créer votre premier compte',
  'Wil je je gegevens ook op je andere toestellen? Verbind dan later even met Google Drive via Instellingen.':
    'Vous voulez vos données sur vos autres appareils ? Connectez-vous plus tard à Google Drive via les Paramètres.',
  'Maak eerst een rekening aan — een transactie moet ergens op geboekt worden.':
    'Créez d’abord un compte — une transaction doit être imputée quelque part.',
  'Geef een handelaar en een bedrag om op te slaan.': 'Indiquez un commerçant et un montant pour enregistrer.',
  'Zo verschijnt dit doel straks in de lijst.': 'Voici comment cet objectif apparaîtra dans la liste.',
  // Ronde 17 — meldingen, balans, besparen en privacy
  'Budget {naam} is overschreden ({pct}%)': 'Le budget {naam} est dépassé ({pct}%)',
  'Budget {naam} is {pct}% verbruikt': 'Le budget {naam} est utilisé à {pct}%',
  'Garantie op {product} verloopt binnen {n} dag(en)': 'La garantie de {product} expire dans {n} jour(s)',
  '{n} vaste last(en) van deze maand staan nog niet ingeboekt':
    '{n} charge(s) fixe(s) de ce mois ne sont pas encore enregistrée(s)',
  'Meldingen ({n})': 'Notifications ({n})',
  'Niets om te melden. Al je budgetten en garanties zijn in orde.':
    'Rien à signaler. Vos budgets et vos garanties sont en ordre.',
  'Overschot': 'Excédent',
  'Tekort': 'Déficit',
  'In balans': 'Équilibré',
  'Je houdt deze maand {bedrag} over. Dat is het deel dat naar sparen of een doel kan.':
    'Il vous reste {bedrag} ce mois-ci. C’est la part que vous pouvez mettre de côté ou affecter à un objectif.',
  'Je geeft deze maand {bedrag} meer uit dan er binnenkomt. Dat komt uit je spaargeld of van je rekening.':
    'Ce mois-ci, vous dépensez {bedrag} de plus qu’il n’entre. Cela vient de votre épargne ou de votre compte.',
  'Inkomsten en uitgaven zijn deze maand exact gelijk: je houdt niets over, maar komt ook niets tekort.':
    'Revenus et dépenses sont exactement égaux ce mois-ci : rien ne reste, mais rien ne manque non plus.',
  'Telecom en abonnementen': 'Télécom et abonnements',
  'Verzekeringen': 'Assurances',
  'Vergelijk de prijzen van de winkels in je buurt en overloop je kassabonnen.':
    'Comparez les prix des magasins de votre quartier et relisez vos tickets de caisse.',
  'Pas je verbruik aan en vergelijk de contracten van de leveranciers.':
    'Adaptez votre consommation et comparez les contrats des fournisseurs.',
  'Vergelijk de pakketten voor internet, tv en gsm — en schrap wat je niet gebruikt.':
    'Comparez les formules internet, TV et mobile — et supprimez ce que vous n’utilisez pas.',
  'Vergelijk je polissen; vooral auto en hospitalisatie schelen vaak veel.':
    'Comparez vos polices ; l’auto et l’hospitalisation font souvent une grosse différence.',
  'Waar kan je besparen?': 'Où pouvez-vous économiser ?',
  'De vier domeinen waar voor een gezin doorgaans het meeste te winnen valt.':
    'Les quatre domaines où un ménage a généralement le plus à gagner.',
  'Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten.':
    'Pas encore de dépenses dans ces quatre domaines. Dès que vous enregistrez des courses, de l’énergie, du télécom ou des assurances, vous verrez ici ce qu’elles coûtent.',
  'Het belletje bovenaan waarschuwt je zodra een budget van deze maand tegen zijn grens loopt.':
    'La cloche en haut vous avertit dès qu’un budget de ce mois approche de sa limite.',
  'Waarschuw vanaf': 'Avertir à partir de',
  '{n}% verbruikt': '{n}% utilisé',
  'Een overschreden budget, een garantie die bijna verloopt en een vaste last die nog niet geboekt is, meldt de app altijd — die staan los van deze keuze.':
    'Un budget dépassé, une garantie qui expire bientôt et une charge fixe non enregistrée sont toujours signalés — indépendamment de ce choix.',
  'Je gegevens en je privacy': 'Vos données et votre vie privée',
  'Waar je cijfers staan, en wat de app wel en niet verstuurt.':
    'Où vivent vos chiffres, et ce que l’application envoie ou non.',
  'Alles staat op dit toestel': 'Tout se trouve sur cet appareil',
  'Je rekeningen, transacties en documenten zitten in de database van deze browser, op dit toestel. Er is geen account nodig en er staat geen kopie op een server van ons — die server bestaat niet.':
    'Vos comptes, transactions et documents se trouvent dans la base de données de ce navigateur, sur cet appareil. Aucun compte n’est nécessaire et il n’existe aucune copie sur un serveur à nous — ce serveur n’existe pas.',
  'De back-up staat in jouw Google Drive': 'La sauvegarde se trouve dans votre propre Google Drive',
  'Verbind je Drive, dan schrijft de app een logboek in één eigen map in jouw Drive. De app krijgt alleen toegang tot de bestanden die ze zelf maakt, niet tot de rest van je Drive. Die back-up is niet extra versleuteld: wie bij je Google-account kan, kan ze lezen — beveilig dat account dus goed.':
    'Si vous connectez Drive, l’application écrit un journal dans un seul dossier qui lui appartient, dans votre Drive. Elle n’accède qu’aux fichiers qu’elle crée elle-même, pas au reste de votre Drive. Cette sauvegarde n’est pas chiffrée en plus : qui accède à votre compte Google peut la lire — protégez donc bien ce compte.',
  'Wat er wél het toestel verlaat': 'Ce qui quitte bel et bien l’appareil',
  'Scan je een streepjescode, dan gaat enkel die code naar de open productendatabank Open Food Facts om de productnaam op te halen. Loopt de app vast, dan wordt een technisch foutrapport verstuurd (welke fout, welke browser) — nooit een bedrag of een naam. Verder gaat er niets weg.':
    'Quand vous scannez un code-barres, seul ce code est envoyé à la base de données ouverte Open Food Facts pour retrouver le nom du produit. Si l’application plante, un rapport d’erreur technique est envoyé (quelle erreur, quel navigateur) — jamais un montant ni un nom. Rien d’autre ne sort.',
  'Geen advertenties, geen doorverkoop': 'Pas de publicité, pas de revente',
  'Er zit geen advertentie- of volgcode in de app, en je gegevens gaan naar niemand anders.':
    'L’application ne contient aucun code publicitaire ou de pistage, et vos données ne vont à personne d’autre.',
  // Ronde 18 — spaardoelen, buffer en auto-categorisatie
  'Doel gehaald': 'Objectif atteint',
  'Datum voorbij': 'Date dépassée',
  'De doeldatum is verstreken. Zet een nieuwe datum om weer een tempo te kunnen berekenen.':
    'La date cible est dépassée. Fixez une nouvelle date pour obtenir à nouveau un rythme.',
  'Op schema': 'Dans les temps',
  'Achter op schema': 'En retard',
  '{bedrag} per maand nodig ({n} mnd te gaan)': '{bedrag} par mois nécessaires ({n} mois restants)',
  'jouw streefbedrag: {bedrag}': 'votre montant cible : {bedrag}',
  'je tempo: {bedrag} per maand (gemiddeld over {n} maanden)':
    'votre rythme : {bedrag} par mois (moyenne sur {n} mois)',
  'zo klaar rond {datum}': 'à ce rythme, terminé vers {datum}',
  'Zet een doeldatum of een maandbedrag om te zien of je op schema zit.':
    'Fixez une date cible ou un montant mensuel pour voir si vous êtes dans les temps.',
  'Koppel een rekening of zet een doeldatum om te zien of je op schema zit.':
    'Liez un compte ou fixez une date cible pour voir si vous êtes dans les temps.',
  '{n} maanden buffer': '{n} mois de réserve',
  '1 maand buffer': '1 mois de réserve',
  'Je vaste lasten zijn {last} per maand. Met {geld} op je spaar- en cashrekeningen kom je zo lang toe zonder inkomen — eten en tanken komen daar nog bij.':
    'Vos charges fixes sont de {last} par mois. Avec {geld} sur vos comptes d’épargne et en liquide, vous tiendriez ce temps-là sans revenu — la nourriture et le carburant viennent en plus.',
  'Vorige keer bij deze handelaar:': 'La dernière fois chez ce commerçant :',
  'Gebruik {naam}, zoals de vorige keer': 'Utiliser {naam}, comme la dernière fois',
  // Ronde 19 — installeren, venster en categorielijsten
  'Op je beginscherm': 'Sur votre écran d’accueil',
  'Je gebruikt Kompal al als app. Zo werkt ze ook zonder internet.':
    'Vous utilisez déjà Kompal comme application. Ainsi elle fonctionne aussi sans internet.',
  'Op je beginscherm zetten': 'Ajouter à votre écran d’accueil',
  'Zet Kompal bij je andere apps: ze opent dan zonder browserbalken en werkt ook zonder internet.':
    'Placez Kompal à côté de vos autres applications : elle s’ouvre alors sans les barres du navigateur et fonctionne aussi sans internet.',
  'Zet op beginscherm': 'Ajouter à l’écran d’accueil',
  'De app staat nu op je beginscherm.': 'L’application est maintenant sur votre écran d’accueil.',
  'Niet toegevoegd. Je kan het later opnieuw proberen.': 'Non ajoutée. Vous pouvez réessayer plus tard.',
  'Open deze pagina in Safari (niet in een andere browser).': 'Ouvrez cette page dans Safari (pas dans un autre navigateur).',
  'Tik op de drie puntjes rechts van de adresbalk en kies "Deel".':
    'Touchez les trois points à droite de la barre d’adresse et choisissez « Partager ».',
  'Scroll in die lijst naar onder tot "Zet op beginscherm".':
    'Faites défiler cette liste jusqu’à « Sur l’écran d’accueil ».',
  'Zet de schakelaar "Open as Web App" AAN — anders krijg je enkel een bladwijzer.':
    'Activez le commutateur « Open as Web App » — sinon vous n’obtenez qu’un signet.',
  'Tik op "Voeg toe".': 'Touchez « Ajouter ».',
  'Je browser biedt hier nu niets aan. Op een telefoon lukt het meestal via het menu van je browser, met een keuze als "Toevoegen aan beginscherm" of "App installeren".':
    'Votre navigateur ne propose rien ici pour le moment. Sur un téléphone, cela passe généralement par le menu du navigateur, avec une option comme « Ajouter à l’écran d’accueil » ou « Installer l’application ».',
  '{n} oudere boeking(en) vallen buiten dit venster van {maanden} maanden.':
    '{n} écriture(s) plus ancienne(s) se situent en dehors de cette fenêtre de {maanden} mois.',
  'Toon ze ook': 'Les afficher aussi',
  // Ronde 21 — de invoerpopup
  'Wat wil je boeken?': 'Que voulez-vous enregistrer ?',
  'Vaste last': 'Charge fixe',
  'Sparen': 'Épargner',
  'Uitgave toevoegen': 'Ajouter une dépense',
  'Inkomst toevoegen': 'Ajouter un revenu',
  'Vaste last toevoegen': 'Ajouter une charge fixe',
  'Opslaan + volgende': 'Enregistrer + suivant',
  'Komt dit geld binnen of gaat het eruit?': "Cet argent entre-t-il ou sort-il ?",
  'Een vaste last komt elke maand terug. Je boekt ze per maand in, ze wordt niet automatisch afgeschreven.':
    "Une charge fixe revient chaque mois. Vous l'enregistrez mois par mois ; elle n'est pas prélevée automatiquement.",
  'Sparen is geld verschuiven tussen je eigen rekeningen. Het is geen uitgave en telt nergens in een budget mee.':
    "Épargner, c'est déplacer de l'argent entre vos propres comptes. Ce n'est pas une dépense et cela ne compte dans aucun budget.",
  // Ronde 22 — invoer completeren
  'Meer opties': "Plus d'options",
  'Meer opties ({n} ingevuld)': "Plus d'options ({n} rempli(s))",
  'Minder opties': "Moins d'options",
  'Delen in een dossier (optioneel)': 'Partager dans un dossier (optionnel)',
  'Niet delen': 'Ne pas partager',
  'Je betaalde deze uitgave zelf. De verdeling volgt de afspraak van het dossier; op de Dossiers-pagina kan je ze voor deze kost nog aanpassen.':
    "Vous avez payé cette dépense vous-même. La répartition suit l'accord du dossier ; sur la page Dossiers, vous pouvez encore l'ajuster pour ce frais.",
  'Deze uitgave zit al in een afrekening van een dossier en wordt hier niet meer gewijzigd.':
    "Cette dépense figure déjà dans un décompte de dossier et n'est plus modifiée ici.",
  'Een inkomst kan geen gedeelde kost zijn. Bewaar je dit zo, dan verdwijnt de koppeling met het dossier.':
    'Un revenu ne peut pas être un frais partagé. Si vous enregistrez ainsi, le lien avec le dossier disparaît.',
  'Bewaar de bon of factuur van deze transactie.': 'Conservez le reçu ou la facture de cette transaction.',
  'bv. Kassaticket Colruyt': 'p.ex. ticket de caisse Colruyt',
  // Ronde 23 — de Plan-pagina en vaste lasten met andere termijnen
  'Hoe vaak?': 'À quelle fréquence ?',
  'Elke maand': 'Chaque mois',
  'Om de 3 maanden': 'Tous les 3 mois',
  'Om de 6 maanden': 'Tous les 6 mois',
  'Eén keer per jaar': 'Une fois par an',
  'Eerste betaling in': 'Premier paiement en',
  'Hier maandelijks voor opzijzetten': 'Mettre de côté chaque mois pour ceci',
  'In de maanden zonder betaling rekent je plan op {bedrag} opzij.':
    "Les mois sans paiement, votre plan met {bedrag} de côté.",
  'Zonder dit staat het volle bedrag in één keer in je plan, in de maand dat het vervalt.':
    "Sans cela, le montant complet apparaît en une fois dans votre plan, le mois de l'échéance.",
  'Niet deze maand': 'Pas ce mois-ci',
  'volgende keer {datum}': 'prochaine fois le {datum}',
  ' · {bedrag} per maand opzij': ' · {bedrag} par mois de côté',
  ' · {bedrag} per maand omgerekend': ' · {bedrag} par mois une fois réparti',
  'Wat ligt vast, wat blijft over': 'Ce qui est engagé, ce qui reste',
  'Op basis van je vaste lasten en je verwachte inkomsten deze maand.':
    'Sur la base de vos charges fixes et des revenus attendus ce mois-ci.',
  'Verwachte inkomsten': 'Revenus attendus',
  'Vaste lasten deze maand': 'Charges fixes ce mois-ci',
  'Opzij voor later': 'Mis de côté pour plus tard',
  'Te verdelen': 'À répartir',
  'Je budgetten vragen samen {gebudgetteerd} hiervan.': 'Vos budgets en réclament {gebudgetteerd}.',
  'Je budgetten vragen samen {gebudgetteerd} — dat is meer dan er te verdelen valt.':
    "Vos budgets réclament {gebudgetteerd} au total — plus qu'il n'y a à répartir.",
  'Over het hele jaar kosten je vaste lasten gemiddeld {bedrag} per maand.':
    'Sur toute l’année, vos charges fixes reviennent en moyenne à {bedrag} par mois.',
  '{naam} staat nog niet ingeboekt deze maand': "{naam} n'a pas encore été enregistré ce mois-ci",
  // Ronde 24 — de Transacties-pagina
  'Alle maanden': 'Tous les mois',
  'Meer filters': 'Plus de filtres',
  'Meer filters · {n}': 'Plus de filtres · {n}',
  'Sorteer op': 'Trier par',
  'Sorteer op {kolom}': 'Trier par {kolom}',
  'Alles selecteren': 'Tout sélectionner',
  'Selecteer {oms}': 'Sélectionner {oms}',
  '{n} geselecteerd': '{n} sélectionné(s)',
  'Categorie toekennen': 'Attribuer une catégorie',
  'Selectie wissen': 'Effacer la sélection',
  'Ja, verwijder {n}': 'Oui, supprimer {n}',
  '{n} gesplitst(e) kassaticket(s) krijgen geen categorie: die hebben er een per regel.':
    "{n} ticket(s) ventilé(s) ne reçoivent pas de catégorie : ils en ont une par ligne.",
  'Categorie voor de selectie': 'Catégorie pour la sélection',
  'Gedeeld in een dossier': 'Partagé dans un dossier',
  'gedeeld': 'partagé',
  '{n} transactie(s) verwijderd': '{n} transaction(s) supprimée(s)',
  '{n} transactie(s) gewijzigd': '{n} transaction(s) modifiée(s)',
  // Ronde 25 — vaste inkomsten, budgetdiepte en inboeken ongedaan maken
  'Vaste inkomsten': 'Revenus réguliers',
  'Vaste inkomst toevoegen': 'Ajouter un revenu régulier',
  'Je loon en alles wat elke maand binnenkomt. Hierop rekent je plan.':
    "Votre salaire et tout ce qui rentre chaque mois. C'est la base de votre plan.",
  'Nog geen vaste inkomsten. Vul hieronder je loon in, anders weet je plan niet wat er te verdelen valt.':
    "Pas encore de revenus réguliers. Ajoutez votre salaire ci-dessous, sinon votre plan ne sait pas ce qu'il y a à répartir.",
  'Nog geen vaste lasten.': 'Pas encore de charges fixes.',
  'Vul hieronder je vaste inkomsten in — je loon bijvoorbeeld — dan berekent de app wat er te verdelen valt.':
    "Ajoutez vos revenus réguliers ci-dessous — votre salaire par exemple — et l'application calculera ce qu'il y a à répartir.",
  'Er kwam deze maand {gekregen} binnen — precies je vaste inkomsten.':
    '{gekregen} sont rentrés ce mois-ci — exactement vos revenus réguliers.',
  'Er kwam deze maand {gekregen} binnen — {verschil} meer dan je vaste inkomsten.':
    '{gekregen} sont rentrés ce mois-ci — {verschil} de plus que vos revenus réguliers.',
  'Er kwam deze maand {gekregen} binnen — {verschil} minder dan je vaste inkomsten.':
    '{gekregen} sont rentrés ce mois-ci — {verschil} de moins que vos revenus réguliers.',
  'Uitboeken': 'Annuler l’écriture',
  'Uitboeken: wis de transactie van {naam}': 'Annuler l’écriture : supprimer la transaction de {naam}',
  'Inboeken ongedaan gemaakt': 'Enregistrement annulé',
  '{naam} ingeboekt': '{naam} enregistré',
  // Ronde 26 — de Analyse-pagina
  'Klik een rij open voor de details erachter.': 'Ouvrez une ligne pour voir le détail.',
  'Toon details van {naam}': 'Afficher le détail de {naam}',
  // Ronde 27 — een eigen boom en de Categorieën-pagina
  '+ categorie': '+ catégorie',
  'Naam categorie': 'Nom de la catégorie',
  'Nieuwe categorie in {naam}': 'Nouvelle catégorie dans {naam}',
  'Voeg categorie toe aan {naam}': 'Ajouter une catégorie à {naam}',
  'Vouw open om te bekijken. Je kan op elk niveau iets toevoegen.':
    "Dépliez pour parcourir. Vous pouvez ajouter quelque chose à chaque niveau.",
  '{c} cat. · {i} items': '{c} cat. · {i} articles',
  'Zoek een categorie': 'Rechercher une catégorie',
  'Typ om ook subcategorieën en producten te zoeken…': 'Tapez pour chercher aussi les sous-catégories et produits…',
  'Niets gevonden voor deze zoekterm.': 'Rien trouvé pour cette recherche.',
  'Je kan een budget ook op een subcategorie of op één product zetten — typ dan de naam.':
    "Vous pouvez aussi définir un budget sur une sous-catégorie ou sur un seul produit — tapez alors son nom.",
  // Ronde 36
  'Voorstel: buitengewone kost — {reden}. Je kan dit zelf aanpassen.':
    'Suggestion : frais extraordinaires — {reden}. Vous pouvez le modifier vous-même.',
  'Deze categorie staat niet op de indicatieve lijst, dus stellen we een gewone kost voor. Je kan dit zelf aanpassen.':
    'Cette catégorie ne figure pas sur la liste indicative ; nous suggérons donc des frais ordinaires. Vous pouvez le modifier vous-même.',
  'Je koos zelf {soort}; het voorstel was {voorstel}.':
    'Vous avez choisi {soort} ; la suggestion était {voorstel}.',
  'Voorstel volgen': 'Suivre la suggestion',
  'Indicatieve lijst uit het KB van 22 april 2019':
    'Liste indicative de l’AR du 22 avril 2019',
  'Medische en paramedische kosten': 'Frais médicaux et paramédicaux',
  'Kosten van de schoolse opleiding': 'Frais de scolarité',
  'Kosten voor ontwikkeling en ontplooiing': 'Frais de développement et d’épanouissement',
  'Staat niet in de indicatieve lijst van buitengewone kosten':
    'Ne figure pas sur la liste indicative des frais extraordinaires',
  'Verrekeningen': 'Décomptes',
  'Wat toon je in dit dossier?': 'Qu’affichez-vous dans ce dossier ?',
  'Garantiebewijs bijhouden': 'Conserver une preuve de garantie',
  'Kompal maakt er een garantiebewijs bij met deze boeking als aankoopbewijs, en verwittigt je voor de garantie afloopt.':
    'Kompal crée une preuve de garantie avec cette écriture comme preuve d’achat, et vous prévient avant la fin de la garantie.',
  'Garantie (maanden)': 'Garantie (mois)',
  'Wettelijk minimum op een nieuw product: 24 maanden.': 'Minimum légal sur un produit neuf : 24 mois.',
  'Dit bewijs bestaat al; je past hier alleen de garantieduur aan.':
    'Cette preuve existe déjà ; vous ne modifiez ici que la durée de garantie.',
  'Een inkomst heeft geen garantiebewijs. Bewaar je dit zo, dan blijft het bewijs bestaan bij je garanties, maar hangt het niet meer aan deze boeking.':
    'Une recette n’a pas de preuve de garantie. Si vous enregistrez ainsi, la preuve reste dans vos garanties mais n’est plus liée à cette écriture.',
  'Vul een aantal maanden in, bijvoorbeeld 24.': 'Indiquez un nombre de mois, par exemple 24.',
  '{naam} toegevoegd, onderaan de lijst.': '{naam} ajouté, en bas de la liste.',
  'garantie': 'garantie',
  'Er hangt een garantiebewijs aan deze boeking': 'Une preuve de garantie est liée à cette écriture',
  'Uit je boeking van {datum}: {oms}': 'De votre écriture du {datum} : {oms}',
  'bon van de boeking': 'justificatif de l’écriture',
  // Ronde 37
  'Inlezen': 'Importer',
  'Bankuittreksel inlezen': 'Importer un extrait bancaire',
  'Kies het CSV-bestand dat je bij je bank downloadt. Het blijft op dit toestel — er wordt niets verstuurd.':
    'Choisissez le fichier CSV que vous téléchargez chez votre banque. Il reste sur cet appareil — rien n’est envoyé.',
  'Maak eerst een rekening aan; een boeking moet ergens op staan.':
    'Créez d’abord un compte ; une écriture doit bien se rattacher à quelque chose.',
  'Bestand': 'Fichier',
  'Op welke rekening?': 'Sur quel compte ?',
  'Dit bestand bevat geen regels.': 'Ce fichier ne contient aucune ligne.',
  'Dit bestand bevat alleen kolomnamen en geen boekingen.':
    'Ce fichier ne contient que des noms de colonnes et aucune écriture.',
  'Kloppen de kolommen?': 'Les colonnes sont-elles correctes ?',
  'Dit formaat kennen we van de vorige keer — de kolommen staan al goed.':
    'Nous connaissons ce format depuis la dernière fois — les colonnes sont déjà réglées.',
  'Kompal heeft geraden. Klopt er iets niet, zet het dan hier recht; de volgende keer onthoudt ze het.':
    'Kompal a deviné. Si quelque chose ne va pas, corrigez-le ici ; la prochaine fois, il s’en souviendra.',
  '{naam} · {n} regels': '{naam} · {n} lignes',
  'Kolom {n}': 'Colonne {n}',
  '(leeg)': '(vide)',
  'Wat staat er in de kolom {naam}?': 'Que contient la colonne {naam} ?',
  'Duid aan welke kolom de datum bevat.': 'Indiquez quelle colonne contient la date.',
  'Duid aan welke kolom het bedrag bevat.': 'Indiquez quelle colonne contient le montant.',
  'niet gebruiken': 'ne pas utiliser',
  'Tegenpartij': 'Contrepartie',
  'Mededeling': 'Communication',
  'Bedrag af (debet)': 'Montant débit',
  'Bedrag bij (credit)': 'Montant crédit',
  'Nakijken en inlezen': 'Vérifier et importer',
  'Met deze kolommen valt er geen enkele boeking te lezen.':
    'Avec ces colonnes, aucune écriture ne peut être lue.',
  '{gekozen} van {totaal} geselecteerd': '{gekozen} sur {totaal} sélectionnés',
  'Neem {oms} van {datum} mee': 'Inclure {oms} du {datum}',
  'Deze boeking staat er waarschijnlijk al': 'Cette écriture existe probablement déjà',
  'lijkt al geboekt': 'semble déjà enregistré',
  'Lees {n} boeking(en) in': 'Importer {n} écriture(s)',
  'Ze komen op {rekening} te staan. Categorieën worden voorgesteld op basis van wat je eerder boekte bij dezelfde winkel.':
    'Elles seront placées sur {rekening}. Les catégories sont suggérées à partir de vos écritures précédentes chez le même commerçant.',
  '{n} boeking(en) ingelezen': '{n} écriture(s) importée(s)',
  '{n} boeking(en) ingelezen.': '{n} écriture(s) importée(s).',
  '{n}× geen datum gevonden': '{n}× aucune date trouvée',
  '{n}× geen bedrag gevonden': '{n}× aucun montant trouvé',
  '{n} regels overgeslagen: {redenen}.': '{n} lignes ignorées : {redenen}.',
  'Dit lijkt geen CSV-bestand. Kies bij je bank de export als CSV — een pdf of een Excel-bestand kan Kompal niet lezen.':
    'Cela ne ressemble pas à un fichier CSV. Choisissez l’export CSV chez votre banque — Kompal ne peut pas lire un PDF ni un fichier Excel.',
  '{n} regel(s) bovenaan overgeslagen (geen boekingen)': '{n} ligne(s) en haut ignorée(s) (pas des écritures)',
  'Vink aan wat je wil overnemen. Wat al geboekt lijkt, staat standaard uit.':
    'Cochez ce que vous voulez reprendre. Ce qui semble déjà enregistré est décoché par défaut.',
  '{n} boekingen van {van} t/m {tot}, samen {saldo}': '{n} écritures du {van} au {tot}, {saldo} au total',
  'Alles aan': 'Tout cocher',
  'Alles uit': 'Tout décocher',
  'Zet de {n} vermoedelijke dubbels uit': 'Décocher les {n} doublons probables',
  'Vink minstens één boeking aan.': 'Cochez au moins une écriture.',
  'Het inlezen is niet gelukt. Je selectie staat er nog, dus je kan het opnieuw proberen.':
    'L’importation a échoué. Votre sélection est toujours là, vous pouvez réessayer.',
  'Toon {n} regels meer ({rest} nog niet getoond)': 'Afficher {n} lignes de plus ({rest} pas encore affichées)',
  'de eerste {n} zijn zichtbaar, maar alles wat aanstaat wordt ingelezen':
    'les {n} premières sont visibles, mais tout ce qui est coché sera importé',
  'Boeking zonder omschrijving': 'Écriture sans description',
  'Waar vind ik dat bestand bij mijn bank?': 'Où trouver ce fichier chez ma banque ?',
  'In je bankapp of op de website van je bank zoek je bij je rekeninguittreksels naar "exporteren" of "downloaden". Kies daar het formaat CSV (soms staat er "CSV/Excel"). Kompal kan geen pdf lezen — dat is een afdruk, geen bestand met cijfers erin.':
    'Dans votre application bancaire ou sur le site de votre banque, cherchez « exporter » ou « télécharger » près de vos extraits. Choisissez-y le format CSV (parfois « CSV/Excel »). Kompal ne peut pas lire un PDF — c\u2019est une impression, pas un fichier avec des chiffres.',
  'Categorie voor de {n} regels zonder voorstel (optioneel)':
    'Catégorie pour les {n} lignes sans suggestion (facultatif)',



  // Ronde 40 — doorklikken, vindbaarheid en de klokken
  'Bekijk de boekingen van {naam} ›': 'Voir les écritures de {naam} ›',
  'Bekijk in Transacties ›': 'Voir dans Transactions ›',
  'Wat er op je rekeningen staat, van {van} tot {tot}': 'Ce qu’il y a sur vos comptes, de {van} à {tot}',
  'over {n} maanden': 'sur {n} mois',
  '{van} t.e.m. {tot}, met je gemiddelde als lijn.': 'De {van} à {tot}, avec votre moyenne en ligne.',
  'dag {dag}': 'jour {dag}',
  'Niets gevonden voor “{term}”': 'Aucun résultat pour « {term} »',
  'Opbouw van een afrekening': 'Détail d’un décompte',
  'Toon opbouw': 'Afficher le détail',
  'Verberg opbouw': 'Masquer le détail',
  'Geen kosten in deze afrekening.': 'Aucun frais dans ce décompte.',
  'Bewerk {oms} — {datum}, {bedrag}': 'Modifier {oms} — {datum}, {bedrag}',
  'Bekijk de boekingen van {naam} — {bedrag}': 'Voir les écritures de {naam} — {bedrag}',
  'Bekijk de boekingen van {naam} — {bedrag}, {periode}': 'Voir les écritures de {naam} — {bedrag}, {periode}',
  '{label} — open het dossier van {oms}': '{label} — ouvrir le dossier de {oms}',
  '{label} — open het garantiebewijs van {oms}': '{label} — ouvrir la garantie de {oms}',
  'Boek {naam} in': 'Comptabiliser {naam}',
  '{n} treffer(s) in {m} hoofdcategorie(ën)': '{n} résultat(s) dans {m} catégorie(s) principale(s)',
  'Zoek een categorie of subcategorie (vanaf {n} letters)…': 'Rechercher une catégorie ou sous-catégorie (à partir de {n} lettres)…',
  '{n} vaste last(en) nog in te boeken in {maand}': '{n} charge(s) fixe(s) encore à comptabiliser en {maand}',
  'verwacht in {maand}': 'prévu en {maand}',
  'Alle vaste lasten voor {maand} zijn al ingeboekt': 'Toutes les charges fixes de {maand} sont déjà comptabilisées',
  // Ronde 41 — exporteren en de bewijsmap
  'Exporteer CSV': 'Exporter en CSV',
  'Toelichting': 'Précision',
  'Ticket': 'Ticket',
  'inkomst': 'recette',
  'uitgave': 'dépense',
  'alle transacties': 'toutes les transactions',
  'Het bestand kon niet gedownload worden. Probeer het opnieuw.': 'Le fichier n’a pas pu être téléchargé. Veuillez réessayer.',
  'Rapport en print': 'Rapport et impression',
  'De kengetallen, de uitsplitsing per categorie en de volledige boekingenlijst — cijfers en lijsten, geen grafieken.':
    'Les chiffres clés, la répartition par catégorie et la liste complète des écritures — des chiffres et des listes, pas de graphiques.',
  '{periode} als PDF': '{periode} en PDF',
  'Heel {jaar} als PDF': 'Toute l’année {jaar} en PDF',
  'Print deze pagina': 'Imprimer cette page',
  'Het rapport kon niet gemaakt worden. Probeer het opnieuw.': 'Le rapport n’a pas pu être créé. Veuillez réessayer.',
  'Jaarrapport {periode}': 'Rapport annuel {periode}',
  'Maandrapport {periode}': 'Rapport mensuel {periode}',
  '{n} boeking(en) in deze periode': '{n} écriture(s) dans cette période',
  'Kengetallen': 'Chiffres clés',
  'Saldo op {datum}': 'Solde au {datum}',
  'Netto is inkomsten min uitgaven in deze periode. Het saldo is de stand van al je rekeningen samen op {datum}.':
    'Le net correspond aux recettes moins les dépenses de cette période. Le solde est l’état de tous vos comptes réunis au {datum}.',
  'Aandeel': 'Part',
  'Een kassaticket dat over meerdere categorieën verdeeld is, staat hierboven per categorie apart — het totaal blijft daardoor gelijk aan de kengetallen.':
    'Un ticket réparti sur plusieurs catégories figure ci-dessus par catégorie — le total reste donc égal aux chiffres clés.',
  'Per maand': 'Par mois',
  'Boekingen': 'Écritures',
  'Er staan geen boekingen in deze periode.': 'Il n’y a aucune écriture dans cette période.',
  'zonder omschrijving': 'sans description',
  'Bewijsmap': 'Dossier de preuves',
  'Bewijsmap met bonnen van de afrekening van {datum}': 'Dossier de preuves avec justificatifs du décompte du {datum}',
  'De bewijsmap kon niet gemaakt worden. Probeer het opnieuw.': 'Le dossier de preuves n’a pas pu être créé. Veuillez réessayer.',
  'Kopieer stuurt een korte samenvatting door. PDF is diezelfde samenvatting als document. De bewijsmap is het volledige dossier: per kost de berekening en elke bon als bijlage.':
    'Copier envoie un bref résumé. Le PDF est ce même résumé sous forme de document. Le dossier de preuves est le dossier complet : le calcul de chaque frais et chaque justificatif en annexe.',
  'Bewijsmap — {naam}': 'Dossier de preuves — {naam}',
  'Datum van de afrekening': 'Date du décompte',
  '{n} kost(en), {m} bijlage(n)': '{n} frais, {m} annexe(s)',
  'Wat dit document is': 'Ce qu’est ce document',
  'Dit document is een overzicht van de kosten en berekeningen zoals ze in Financieel Kompas zijn ingevoerd.':
    'Ce document est un aperçu des frais et des calculs tels qu’ils ont été saisis dans Financieel Kompas.',
  'De bedragen en verdeelsleutels komen uit die invoer. Wie ze invoerde, blijft er verantwoordelijk voor.':
    'Les montants et les clés de répartition proviennent de cette saisie. La personne qui les a saisis en reste responsable.',
  'Dit is geen juridisch advies en geen uitspraak over wie waar recht op heeft. De app rekent; de afspraak of de rechter beslist.':
    'Ceci n’est pas un avis juridique ni une décision sur les droits de chacun. L’application calcule ; l’accord ou le juge décide.',
  'Een bon die als PDF-bestand werd toegevoegd, kan niet als afbeelding in dit document. Die staat als aparte bijlage vermeld en is los op te vragen.':
    'Un justificatif ajouté sous forme de fichier PDF ne peut pas être intégré comme image dans ce document. Il est mentionné en annexe distincte et peut être demandé séparément.',
  'Elke kost is verdeeld volgens een van deze afspraken. Achter elke regel staat op hoeveel kosten ze van toepassing was.':
    'Chaque frais est réparti selon l’un de ces accords. Chaque ligne indique à combien de frais il s’est appliqué.',
  'De kosten, chronologisch': 'Les frais, par ordre chronologique',
  'Per kost: het bedrag, de verdeling die erop is toegepast en waarom die gold. Zo is elke rij na te rekenen.':
    'Par frais : le montant, la répartition appliquée et la raison pour laquelle elle s’appliquait. Chaque ligne est ainsi vérifiable.',
  '{bedrag} x {p}% = {jouw} voor jou, {partner} voor partner': '{bedrag} x {p} % = {jouw} pour vous, {partner} pour le partenaire',
  'zie bijlage {n}': 'voir annexe {n}',
  'Bijlagen': 'Annexes',
  'Bijlage {n}': 'Annexe {n}',
  'toegevoegd op {datum}': 'ajouté le {datum}',
  'Er zijn geen bonnen of documenten toegevoegd aan de kosten van deze afrekening.':
    'Aucun justificatif ni document n’a été ajouté aux frais de ce décompte.',
  'Deze bon is als PDF-bestand toegevoegd en kan niet als afbeelding worden ingevoegd. Vraag het losse bestand op.':
    'Ce justificatif a été ajouté sous forme de fichier PDF et ne peut pas être intégré comme image. Demandez le fichier séparé.',
  'Deze bon kon niet worden weergegeven. Het bestand is beschadigd of van een onbekend type.':
    'Ce justificatif n’a pas pu être affiché. Le fichier est endommagé ou d’un type inconnu.',
  // Ronde 41 — na de review: meldingen en wachttoestanden
  'De back-up kon niet gedownload worden. Probeer het opnieuw.': 'La sauvegarde n’a pas pu être téléchargée. Veuillez réessayer.',
  'Het rapport van {periode} is gedownload.': 'Le rapport de {periode} a été téléchargé.',
  '{periode} als PDF — bezig…': '{periode} en PDF — en cours…',
  'Heel {jaar} als PDF — bezig…': 'Toute l’année {jaar} en PDF — en cours…',
  '{n} rij(en) gedownload als CSV-bestand.': '{n} ligne(s) téléchargée(s) dans un fichier CSV.',
  'De CSV bevat precies deze rijen, in deze volgorde. Je opent hem met Excel of Numbers.':
    'Le CSV contient exactement ces lignes, dans cet ordre. Vous l’ouvrez avec Excel ou Numbers.',
  'De PDF van {datum} is gedownload.': 'Le PDF du {datum} a été téléchargé.',
  'De PDF van {datum} kon niet gemaakt worden. Probeer het opnieuw.':
    'Le PDF du {datum} n’a pas pu être créé. Veuillez réessayer.',
  'De bewijsmap van {datum} is gedownload.': 'Le dossier de preuves du {datum} a été téléchargé.',
  'De bewijsmap van {datum} kon niet gemaakt worden. Probeer het opnieuw.':
    'Le dossier de preuves du {datum} n’a pas pu être créé. Veuillez réessayer.',
  'Bewijsmap van {datum} — bezig…': 'Dossier de preuves du {datum} — en cours…',
  '{n} van {totaal}': '{n} sur {totaal}',
  // Ronde 42 — de onderhoudsbijdrage
  'Onderhoudsbijdrage': 'Contribution alimentaire',
  'Het vaste maandbedrag uit je vonnis of overeenkomst. De app houdt de jaarlijkse indexatie bij en rekent uit wat er betaald is.':
    'Le montant mensuel fixe de votre jugement ou convention. L’application suit l’indexation annuelle et calcule ce qui a été payé.',
  'Nog geen onderhoudsbijdrage ingesteld voor dit dossier.':
    'Aucune contribution alimentaire définie pour ce dossier.',
  'Onderhoudsbijdrage instellen': 'Définir la contribution alimentaire',
  'De brief is gedownload.': 'La lettre a été téléchargée.',
  'De brief kon niet gemaakt worden. Probeer het opnieuw.':
    'La lettre n’a pas pu être créée. Veuillez réessayer.',
  'Onderhoudsbijdrage verwijderen': 'Supprimer la contribution alimentaire',
  'Bijdrage vandaag': 'Contribution aujourd’hui',
  'gelijk aan het bedrag uit de regeling van {datum}':
    'identique au montant de l’accord du {datum}',
  'geïndexeerd; in de regeling van {datum} stond {basis}':
    'indexé ; l’accord du {datum} indiquait {basis}',
  'Sinds {datum} staat de bijdrage op {bedrag}. Loopt de betaling nog op het oude bedrag, dan is dat sindsdien elke maand een verschil.':
    'Depuis le {datum}, la contribution s’élève à {bedrag}. Si le paiement est resté à l’ancien montant, cela fait une différence chaque mois depuis lors.',
  'De app kent nog geen indexcijfer voor {maanden}. Ze kent cijfers tot {laatste}. Vul het ontbrekende cijfer hieronder zelf in, dan is de berekening volledig.':
    'L’application ne connaît pas encore l’indice pour {maanden}. Elle connaît les chiffres jusqu’en {laatste}. Saisissez ci-dessous le chiffre manquant et le calcul sera complet.',
  'Verberg de opbouw': 'Masquer le détail',
  'Toon de opbouw': 'Afficher le détail',
  'Verberg wat er betaald is': 'Masquer ce qui a été payé',
  'Toon wat er betaald is': 'Afficher ce qui a été payé',
  'Brief met de berekening': 'Lettre avec le calcul',
  'Sluit de regeling': 'Fermer l’accord',
  'Wijzig de regeling': 'Modifier l’accord',
  'Hoe dit bedrag tot stand komt': 'Comment ce montant est obtenu',
  'Elke verjaardag rekent opnieuw vanaf het bedrag uit de regeling, niet vanaf dat van vorig jaar — zo stapelen afrondingen zich niet op.':
    'Chaque anniversaire est calculé à partir du montant de l’accord, et non de celui de l’an dernier — ainsi les arrondis ne s’accumulent pas.',
  'De regeling sluit indexatie uit, dus het bedrag blijft ongewijzigd.':
    'L’accord exclut l’indexation ; le montant reste donc inchangé.',
  'De eerste verjaardag van de regeling moet nog komen: op {datum}.':
    'Le premier anniversaire de l’accord est encore à venir : le {datum}.',
  'index van {maand} nog niet bekend — bedrag ongewijzigd gelaten':
    'indice de {maand} pas encore connu — montant laissé inchangé',
  'index {index} uit {maand}': 'indice {index} de {maand}',
  'De app kent indexcijfers tot {laatste}, in basis {jaar} = 100.':
    'L’application connaît les indices jusqu’en {laatste}, base {jaar} = 100.',
  'Vul een bedrag groter dan nul in.': 'Saisissez un montant supérieur à zéro.',
  'Wat er verschuldigd was en wat er betaald is': 'Ce qui était dû et ce qui a été payé',
  'Verschuldigd': 'Dû',
  'over {n} maand(en)': 'sur {n} mois',
  'Betaald': 'Payé',
  '{n} betaling(en) geregistreerd': '{n} paiement(s) enregistré(s)',
  'Betaling toevoegen': 'Ajouter un paiement',
  'Voor de maand': 'Pour le mois',
  'Nog geen betalingen geregistreerd.': 'Aucun paiement enregistré.',
  'Verwijder betaling van {datum}': 'Supprimer le paiement du {datum}',
  'Kies een maand en vul een indexcijfer groter dan nul in.':
    'Choisissez un mois et saisissez un indice supérieur à zéro.',
  'De regeling': 'L’accord',
  'Bedrag uit de regeling': 'Montant de l’accord',
  'Datum vonnis of overeenkomst': 'Date du jugement ou de la convention',
  'De andere ouder betaalt aan jou': 'L’autre parent vous paie',
  'Jij betaalt aan de andere ouder': 'Vous payez l’autre parent',
  'De datum bepaalt twee dingen: de aanvangsindex (de maand ervóór) en de dag waarop er elk jaar geïndexeerd wordt.':
    'La date détermine deux choses : l’indice de départ (le mois précédent) et le jour de l’indexation annuelle.',
  'Jaarlijks indexeren (de wettelijke regel, tenzij de akte iets anders zegt)':
    'Indexer chaque année (la règle légale, sauf mention contraire dans l’acte)',
  'Aanvangsindex uit de akte (optioneel)': 'Indice de départ figurant dans l’acte (facultatif)',
  'leeg = de app zoekt ze zelf op': 'vide = l’application le recherche elle-même',
  'Bewaar de regeling': 'Enregistrer l’accord',
  'Zelf een indexcijfer toevoegen': 'Ajouter vous-même un indice',
  'De app kent cijfers tot {laatste}. Loopt je verjaardag daarop vooruit, vul het cijfer dan hier in — je vindt het bij Statbel.':
    'L’application connaît les chiffres jusqu’en {laatste}. Si votre anniversaire est postérieur, saisissez le chiffre ici — vous le trouverez chez Statbel.',
  'Maand': 'Mois',
  'Gezondheidsindex': 'Indice santé',
  'De app kent deze maand al. Vul je hier iets in, dan gaat jouw cijfer voor.':
    'L’application connaît déjà ce mois. Si vous saisissez quelque chose ici, votre chiffre prévaut.',
  'Indexcijfer toevoegen': 'Ajouter l’indice',
  'Verwijder je eigen indexcijfer voor {maand}': 'Supprimer votre propre indice pour {maand}',
  'Voor welke kinderen de bijdrage geldt, stel je in bij de gezinsleden van dit dossier.':
    'Les enfants concernés par la contribution se règlent auprès des membres de la famille de ce dossier.',
  '{basis} x {nieuw} / {aanvang} = {uit}': '{basis} x {nieuw} / {aanvang} = {uit}',
  'De aanvangsindex is niet bekend: de app kent geen indexcijfer voor {maand}.':
    'L’indice de départ est inconnu : l’application n’a pas d’indice pour {maand}.',
  'Aanvangsindex {index}, zoals ze in de akte staat.':
    'Indice de départ {index}, tel qu’il figure dans l’acte.',
  'Aanvangsindex {index}: de gezondheidsindex van {maand}, de maand vóór de regeling.':
    'Indice de départ {index} : l’indice santé de {maand}, le mois précédant l’accord.',
  'Let op: de indexcijfers van de app staan in basis {jaar} = 100. Staat er in je vonnis een aanvangsindex uit een ouder basisjaar, vul die dan hier in én gebruik ook voor de nieuwe index een cijfer uit datzelfde basisjaar. Twee cijfers uit verschillende basisjaren geven een bedrag dat er juist uitziet en het niet is.':
    'Attention : les indices de l’application utilisent la base {jaar} = 100. Si votre jugement mentionne un indice de départ d’une base plus ancienne, saisissez-le ici et utilisez également un chiffre de cette même base pour le nouvel indice. Deux chiffres de bases différentes donnent un montant qui semble correct sans l’être.',
  'Per maand geteld vanaf de maand van de regeling, telkens met het bedrag dat op de eerste van die maand gold. Een aanpassing die halverwege een maand ingaat, telt dus vanaf de maand erna.':
    'Compté mois par mois à partir du mois de l’accord, chaque fois avec le montant en vigueur le premier de ce mois. Un ajustement prenant effet en cours de mois compte donc à partir du mois suivant.',
  'Dit blad is een berekening op basis van wat er in Financieel Kompas is ingevoerd: het bedrag uit de regeling, de datum ervan en de gezondheidsindex.':
    'Cette feuille est un calcul fondé sur ce qui a été saisi dans Financieel Kompas : le montant de l’accord, sa date et l’indice santé.',
  'De indexatie gebeurt in België van rechtswege, jaarlijks op de verjaardag van de regeling — tenzij de akte iets anders bepaalt. Wat er in jouw akte staat, gaat voor op wat hier staat.':
    'En Belgique, l’indexation s’applique de plein droit, chaque année à la date anniversaire de l’accord — sauf disposition contraire de l’acte. Ce que dit votre acte prévaut sur ce qui figure ici.',
  'Dit is geen juridisch advies en geen ingebrekestelling. De app rekent; wat je met het cijfer doet, beslis jij.':
    'Ceci n’est ni un avis juridique ni une mise en demeure. L’application calcule ; ce que vous faites du chiffre vous appartient.',
  'Betaald en verschuldigd zijn precies gelijk.': 'Le payé et le dû sont exactement égaux.',
  'Er staat nog {bedrag} open die jij verschuldigd bent.': 'Il reste {bedrag} que vous devez.',
  'Er staat nog {bedrag} open die aan jou verschuldigd is.': 'Il reste {bedrag} qui vous est dû.',
  'Er is {bedrag} meer betaald dan berekend.': '{bedrag} de plus a été payé que calculé.',
  'Er is {bedrag} meer ontvangen dan berekend.': '{bedrag} de plus a été reçu que calculé.',
  'Onderhoudsbijdrage — {naam}': 'Contribution alimentaire — {naam}',
  'Regeling van': 'Accord du',
  'Bedrag in de regeling': 'Montant de l’accord',
  'De bijdrage vandaag': 'La contribution aujourd’hui',
  'De regeling sluit indexatie uit; het bedrag blijft dus ongewijzigd.':
    'L’accord exclut l’indexation ; le montant reste donc inchangé.',
  'Hoe dit berekend is': 'Comment ce calcul a été fait',
  'De onderhoudsbijdrage volgt de gezondheidsindex. Het nieuwe bedrag is telkens: het bedrag uit de regeling, maal de index van de maand vóór de verjaardag, gedeeld door de aanvangsindex.':
    'La contribution alimentaire suit l’indice santé. Le nouveau montant est toujours : le montant de l’accord, multiplié par l’indice du mois précédant l’anniversaire, divisé par l’indice de départ.',
  'De indexcijfers komen van Statbel en staan in basis {jaar} = 100. De app kent cijfers tot {laatste}.':
    'Les indices proviennent de Statbel et utilisent la base {jaar} = 100. L’application connaît les chiffres jusqu’en {laatste}.',
  'Per verjaardag': 'Par anniversaire',
  'Er is nog geen verjaardag van de regeling geweest.':
    'Il n’y a pas encore eu d’anniversaire de l’accord.',
  'Wat er nog ontbreekt': 'Ce qui manque encore',
  'Voor deze maanden is er geen indexcijfer gebruikt: {maanden}. De bedragen van die verjaardagen zijn daarom ongewijzigd gelaten in plaats van geschat.':
    'Aucun indice n’a été utilisé pour ces mois : {maanden}. Les montants de ces anniversaires ont donc été laissés inchangés plutôt qu’estimés.',
  'Wat dit blad is': 'Ce qu’est cette feuille',
  'Onderhoudsbijdrage verwijderd': 'Contribution alimentaire supprimée',
  'Betaling verwijderd': 'Paiement supprimé',
  // Ronde 42 — na de review
  'Nog geen onderhoudsbijdrage ingesteld voor dit dossier. Je hebt het bedrag en de datum uit je vonnis of overeenkomst nodig.':
    'Aucune contribution alimentaire définie pour ce dossier. Vous aurez besoin du montant et de la date de votre jugement ou convention.',
  'Bijdrage bij het einde van de regeling': 'Contribution à la fin de l’accord',
  'Deze regeling liep tot {datum}; daarna is er niets meer bijgekomen.':
    'Cet accord a couru jusqu’au {datum} ; rien n’a été ajouté depuis.',
  'De aanvangsindex is geen geldig getal. Laat het veld leeg om de app het cijfer zelf te laten opzoeken.':
    'L’indice de départ n’est pas un nombre valide. Laissez le champ vide pour que l’application recherche elle-même le chiffre.',
  'Loopt tot (optioneel)': 'Court jusqu’au (facultatif)',
  'Voor welke kinderen (optioneel)': 'Pour quels enfants (facultatif)',
  'Per maand geteld vanaf de maand van de regeling, telkens met het bedrag dat op de eerste van die maand gold. Twee gevolgen die je moet kennen voor je dit cijfer gebruikt: de maand van de regeling telt volledig mee, ook als ze halverwege begon, en de maand waarin er geïndexeerd wordt telt nog aan het oude, lagere bedrag. Klopt dat niet met jouw afspraak, corrigeer het dan met een betaling.':
    'Compté mois par mois à partir du mois de l’accord, chaque fois avec le montant en vigueur le premier de ce mois. Deux conséquences à connaître avant d’utiliser ce chiffre : le mois de l’accord compte en entier, même s’il a commencé en cours de mois, et le mois où l’indexation prend effet compte encore à l’ancien montant, plus bas. Si cela ne correspond pas à votre accord, corrigez-le par un paiement.',
  'Betaald door de ouder die dit overzicht opmaakte': 'Payé par le parent qui a établi cet aperçu',
  'Betaald aan de ouder die dit overzicht opmaakte': 'Payé au parent qui a établi cet aperçu',
  'Loopt tot': 'Court jusqu’au',
  'Voor onderhoudsgeld is de aanvangsindex die van de maand vóór de maand waarin het bedrag werd vastgelegd — dezelfde regel als bij huur. Hou je een lopende regeling bij, gebruik dan de onderhoudsbijdrage in je dossier: die zoekt de indexcijfers zelf op.':
    'Pour la pension alimentaire, l’indice de départ est celui du mois précédant le mois où le montant a été fixé — la même règle que pour le loyer. Si vous suivez un accord en cours, utilisez la contribution alimentaire de votre dossier : elle recherche elle-même les indices.',
  // Contribution alimentaire — la lettre d’accompagnement
  'Betreft: indexatie van de onderhoudsbijdrage voor {namen}':
    'Objet : indexation de la contribution alimentaire pour {namen}',
  'Betreft: indexatie van de onderhoudsbijdrage': 'Objet : indexation de la contribution alimentaire',
  'De onderhoudsbijdrage die op {datum} werd vastgelegd, volgt de gezondheidsindex. Die aanpassing gebeurt jaarlijks op de verjaardag van de regeling.':
    'La contribution alimentaire fixée le {datum} suit l’indice santé. Cette adaptation a lieu chaque année à la date anniversaire de l’accord.',
  'De laatste aanpassing viel op {datum}. Vanaf die datum bedraagt de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.':
    'La dernière adaptation est intervenue le {datum}. À partir de cette date, la contribution s’élève à {bedrag} par mois, contre {basis} dans l’accord même.',
  'Volgens deze berekening bedraagt de bijdrage vandaag {bedrag} per maand.':
    'Selon ce calcul, la contribution s’élève aujourd’hui à {bedrag} par mois.',
  'Op het volgende blad staat de volledige berekening: het bedrag uit de regeling, de gebruikte indexcijfers en wat er per verjaardag uit kwam. Zo is elke regel na te rekenen zonder deze app.':
    'La page suivante contient le calcul complet : le montant de l’accord, les indices utilisés et le résultat pour chaque date anniversaire. Chaque ligne peut ainsi être vérifiée sans cette application.',
  'Klopt er iets niet met de gegevens hierboven, laat het dan weten — dan kan de berekening aangepast worden.':
    'Si une donnée ci-dessus est inexacte, faites-le savoir — le calcul sera adapté.',
  'Betreft: de onderhoudsbijdrage voor {namen}': 'Objet : la contribution alimentaire pour {namen}',
  'Betreft: de onderhoudsbijdrage': 'Objet : la contribution alimentaire',
  'De onderhoudsbijdrage die op {datum} werd vastgelegd, wordt volgens de regeling niet geïndexeerd. Het bedrag blijft daarom ongewijzigd.':
    'Selon l’accord, la contribution alimentaire fixée le {datum} n’est pas indexée. Le montant reste donc inchangé.',
  'De aanvangsindex van {maand} is in deze app niet bekend, waardoor de indexatie niet berekend kon worden. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.':
    'L’indice de départ de {maand} n’est pas connu dans cette application, de sorte que l’indexation n’a pas pu être calculée. Le montant ci-dessous est donc encore celui de l’accord même : {basis} par mois.',
  'Deze regeling liep tot {eind}. Bij het einde ervan bedroeg de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.':
    'Cet accord a couru jusqu’au {eind}. À son terme, la contribution s’élevait à {bedrag} par mois, contre {basis} dans l’accord même.',
  'Voor één of meer verjaardagen was er nog geen indexcijfer bekend. Die aanpassing zit dus nog niet in dit bedrag; op het volgende blad staat om welke maanden het gaat.':
    'Pour une ou plusieurs dates anniversaires, aucun indice n’était encore connu. Cette adaptation n’est donc pas comprise dans ce montant ; la page suivante indique de quels mois il s’agit.',
  'Op het volgende blad staat waarop dit gebaseerd is: het bedrag uit de regeling en de gegevens die daarbij horen. Zo is alles na te kijken zonder deze app.':
    'La page suivante indique sur quoi cela repose : le montant de l’accord et les données qui s’y rapportent. Tout peut ainsi être vérifié sans cette application.',
  'Deze brief is opgemaakt met Financieel Kompas. Hij bevat een berekening en geen juridisch standpunt.':
    'Cette lettre a été établie avec Financieel Kompas. Elle contient un calcul et non une position juridique.',
}
const woordenboeken: Record<Taal, Record<string, string>> = { nl: {}, en, fr }

// De sleutels die voor één taal ingevuld zijn. Bestaat vooral om in een test te
// kunnen controleren dat EN en FR gelijk lopen: een sleutel die maar in één van
// de twee zit, geeft in de andere taal stille Nederlandse tekst.
export function vertaalSleutels(taal: Taal): string[] {
  return Object.keys(woordenboeken[taal])
}

function pasParametersToe(tekst: string, params?: Record<string, string | number>): string {
  if (!params) return tekst
  return tekst.replace(/\{(\w+)\}/g, (_, naam) => (naam in params ? String(params[naam]) : `{${naam}}`))
}

// Zuivere vertaalfunctie, los testbaar.
export function vertaal(taal: Taal, sleutel: string, params?: Record<string, string | number>): string {
  const vertaald = taal === 'nl' ? sleutel : woordenboeken[taal][sleutel] ?? sleutel
  return pasParametersToe(vertaald, params)
}

export type Vertaler = (sleutel: string, params?: Record<string, string | number>) => string

type TaalContextType = { taal: Taal; zetTaal: (t: Taal) => void; t: Vertaler }

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests):
// dan is de taal Nederlands en geeft t() de sleutel ongewijzigd terug.
const standaard: TaalContextType = {
  taal: 'nl',
  zetTaal: () => {},
  t: (sleutel, params) => vertaal('nl', sleutel, params),
}

const TaalContext = createContext<TaalContextType>(standaard)

const OPSLAG_SLEUTEL = 'fk_taal'
function leesTaal(): Taal {
  try {
    const t = localStorage.getItem(OPSLAG_SLEUTEL)
    if (t === 'nl' || t === 'en' || t === 'fr') return t
  } catch {
    // localStorage niet beschikbaar: stil terugvallen op Nederlands.
  }
  return 'nl'
}

export function TaalProvider({ children }: { children: ReactNode }) {
  const [taal, setTaal] = useState<Taal>(leesTaal)
  useEffect(() => {
    try {
      localStorage.setItem(OPSLAG_SLEUTEL, taal)
    } catch {
      // stil negeren
    }
    document.documentElement.lang = taal
  }, [taal])
  const waarde: TaalContextType = { taal, zetTaal: setTaal, t: (sleutel, params) => vertaal(taal, sleutel, params) }
  return <TaalContext.Provider value={waarde}>{children}</TaalContext.Provider>
}

// Hook om te vertalen: const { t } = useT().
export function useT(): TaalContextType {
  return useContext(TaalContext)
}
