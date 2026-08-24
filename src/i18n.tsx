import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { TAAL_OPSLAG_SLEUTEL, leesTaal, zetOpmaaktaal } from './utils/opmaaktaal'

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
  // Ronde 66 — slotronde: de eerste stap waar ze nog ontbrak
  'Naar "Je situatie"': 'To "Your situation"',
  'Eerst een rekening': 'An account first',
  'Maak je eerste rekening aan': 'Create your first account',
  'Een boeking moet ergens op staan. Maak eerst een rekening aan — je betaalrekening, je spaarrekening, of gewoon je portemonnee.':
    'An entry has to sit somewhere. Create an account first — your current account, your savings account, or simply your wallet.',
  'Vul je vaste inkomsten in': 'Enter your fixed income',
  'De app kent je vaste inkomsten nog niet — je loon bijvoorbeeld. Vul je die in bij "Vast", dan berekent ze wat er te verdelen valt.':
    'The app does not know your fixed income yet — your salary, for instance. Enter it under "Fixed" and it will work out what is left to spend.',
  'Nog geen boekingen. Hier komt elke uitgave en elke inkomst te staan die je ingeeft.':
    'No entries yet. Every expense and every bit of income you enter will appear here.',
  // Ronde 66 — slotronde, tweede reeks
  'Stel je gezinsleden in': 'Set up your household members',
  'Je hebt nog geen gezinsleden ingesteld. Zodra ze er zijn, kan je ze bij een boeking of bij een gedeelde kost aanduiden — en verschijnt hier per gezinslid wat het kost.':
    'You have not set up any household members yet. Once they exist you can tag them on an entry or on a shared cost — and this page will show what each of them costs.',
  'Maak eerst een rekening aan — een vaste kost moet ergens vanaf gaan.':
    'Create an account first — a fixed cost has to come out of something.',
  'Maak eerst een rekening aan — een vaste kost of inkomst moet ergens vanaf gaan of op binnenkomen.':
    'Create an account first — a fixed cost or income has to come out of, or into, something.',
  // Ronde 66 — slotronde, derde reeks
  'Er staat nog geen enkele boeking in de app. Zodra je er een ingeeft — zelf of via een uittreksel — zie je hier waar je geld naartoe gaat.':
    'There is not a single entry in the app yet. As soon as you add one — yourself or from a statement — you will see here where your money goes.',
  'Er staat nog geen enkele boeking in de app, dus valt er voor {jaar} niets samen te tellen. Hieronder zie je alvast waar dit scherm straks naar kijkt.':
    'There is not a single entry in the app yet, so there is nothing to add up for {jaar}. Below you can already see where this page will look.',
  'Er staat nog geen enkele boeking in deze maand. Afsluiten mag, maar er valt dan niets na te kijken — begin met je uittreksel in te lezen.':
    'There is not a single entry in this month. You may still close it, but there is nothing to check — start by importing your statement.',
  'Toch afsluiten': 'Close it anyway',
  'Bekijk je budgetten': 'View your budgets',
  'Voor {maand} vervalt er geen enkele vaste last.': 'No fixed cost falls due in {maand}.',
  // Ronde 66 — slotronde, vierde reeks
  'Deze tab rekent uit wat er overblijft van je inkomen. Daarvoor moet ze weten wat er binnenkomt en wat er elke maand vastligt — en dat moet ergens vanaf gaan. Begin dus bij een rekening.':
    'This tab works out what is left of your income. For that it needs to know what comes in and what is committed each month — and that has to come out of something. So start with an account.',
  'Niets om te melden. Zodra er iets je aandacht nodig heeft — een budget dat vol raakt, een garantie die afloopt, een vaste last die nog niet geboekt is — zie je het hier.':
    'Nothing to report. As soon as something needs your attention — a budget filling up, a warranty running out, a fixed cost not yet entered — you will see it here.',
  'Alle budgetten': 'All budgets',
  'Bekijk de boekingen van {naam} in je budget — {bedrag}': 'View the entries for {naam} in your budget — {bedrag}',
  'Nog geen doelen. Met het formulier op deze pagina zet je je eerste doel — een buffer, een grote aankoop, of schuldenvrij zijn.':
    'No goals yet. Use the form on this page to set your first one — a buffer, a big purchase, or being debt-free.',
  'Bekijk alle {n} inkomsten in Analyse ›': 'View all {n} income categories in Analysis ›',
  'Bekijk alle {n} uitgaven in Analyse ›': 'View all {n} expense categories in Analysis ›',
  'Bekijk je inkomsten in Analyse ›': 'View your income in Analysis ›',
  'Bekijk je uitgaven in Analyse ›': 'View your expenses in Analysis ›',
  'Er staat nog geen enkele boeking in de app. Zodra je er een ingeeft — zelf of via een uittreksel — zie je hier wat er duurder of goedkoper werd.':
    'There is not a single entry in the app yet. As soon as you add one — yourself or from a statement — you will see here what got more or less expensive.',
  'Deze regeling is nog niet beginnen lopen — er is dus nog niets verschuldigd.':
    'This arrangement has not started yet — so nothing is owed.',
  // Ronde 66 — slotronde, vijfde reeks
  'Voeg deze categorie toe in {naam}': 'Add this category in {naam}',
  'Annuleer nieuwe categorie in {naam}': 'Cancel new category in {naam}',
  'Voeg deze subcategorie toe in {naam}': 'Add this subcategory in {naam}',
  'Annuleer nieuwe subcategorie in {naam}': 'Cancel new subcategory in {naam}',
  'Nog geen kosten in dit dossier. Voeg er hieronder een toe; zodra er kosten staan, rekent de app uit wie wie wat verschuldigd is.':
    'No costs in this case yet. Add one below; as soon as there are costs, the app works out who owes whom what.',
  'Er staat nog geen enkele boeking in deze maand, en er is nog geen rekening om erop te boeken. Afsluiten mag, maar er valt dan niets na te kijken.':
    'There is not a single entry in this month, and there is no account to put one on. You may still close it, but there is nothing to check.',
  'Kosten delen met een co-ouder': 'Share costs with a co-parent',
  'Een lening bijhouden': 'Track a loan',
  'Een aankoop met garantie bijhouden': 'Track a purchase with a warranty',
  'De app kent nog geen indexcijfer voor {maanden}. Ze kent cijfers tot {laatste}. Vul het ontbrekende cijfer zelf in via "Wijzig de regeling", dan is de berekening volledig.':
    'The app does not know an index figure for {maanden} yet. It knows figures up to {laatste}. Enter the missing figure yourself via "Change the arrangement" and the calculation will be complete.',
  'Vul het indexcijfer in': 'Enter the index figure',
  'Nog geen vaste inkomsten. Zodra je een rekening hebt, vul je hier je loon in.':
    'No recurring income yet. As soon as you have an account, you enter your salary here.',
  // Ronde 66 — slotronde, zesde reeks
  'Afrekening {datum} is overgemaakt': 'Settlement of {datum} has been transferred',
  'Kopieer de afrekening van {datum}': 'Copy the settlement of {datum}',
  'PDF van de afrekening van {datum}': 'PDF of the settlement of {datum}',
  'Toon de opbouw van de afrekening van {datum}': 'Show how the settlement of {datum} was built up',
  'Verberg de opbouw van de afrekening van {datum}': 'Hide how the settlement of {datum} was built up',
  'Elke regel uit dit bestand staat al in de app. Vink zelf aan wat je tóch wil inlezen.':
    'Every row in this file is already in the app. Tick whatever you still want to import.',
  'Niets aangevinkt. Vink aan wat je wil inlezen.': 'Nothing ticked. Tick what you want to import.',
  'Nog geen bewegingen op deze rekening. Voeg er hieronder een toe.':
    'No movements on this account yet. Add one below.',
  'Bewerk beweging {naam} van {datum}': 'Edit movement {naam} of {datum}',
  'Verwijder beweging {naam} van {datum}': 'Delete movement {naam} of {datum}',
  'beweging': 'movement',
  'Deelbedrag {n}': 'Part amount {n}',
  'Je hebt minstens twee rekeningen nodig om over te boeken.': 'You need at least two accounts to transfer between them.',
  // Ronde 67 — een nieuwe tak aanmaken vanuit het boekingsvenster
  'Kies eerst een hoofdcategorie.': 'Pick a main category first.',
  'Geef je nieuwe hoofdcategorie een naam.': 'Give your new main category a name.',
  'Kies eerst een categorie.': 'Pick a category first.',
  'Geef je nieuwe categorie een naam.': 'Give your new category a name.',
  'Toevoegen is niet gelukt. Je invoer staat er nog — probeer het opnieuw.':
    'Adding it did not work. What you typed is still there — please try again.',
  '+ Nieuwe hoofdcategorie…': '+ New main category…',
  'Naam van de nieuwe hoofdcategorie': 'Name of the new main category',
  'bv. Huisraad': 'e.g. Household goods',
  '+ Nieuwe categorie…': '+ New category…',
  'Naam van de nieuwe categorie': 'Name of the new category',
  'bv. Meubels en toestellen': 'e.g. Furniture and appliances',
  'Bezig met toevoegen…': 'Adding…',
  'Nieuwe subcategorie': 'New subcategory',
  'Typ hierboven een naam voor je nieuwe subcategorie.': 'Type a name for your new subcategory above.',
  'Rond eerst je nieuwe categorie af, of annuleer ze.': 'Finish your new category first, or cancel it.',
  '“{naam}” is toegevoegd en staat nu op deze boeking.': '“{naam}” has been added and is now on this entry.',
  'Er bestaat al een hoofdcategorie “{naam}”.': 'A main category “{naam}” already exists.',
  'Er bestaat hier al een categorie “{naam}”.': 'A category “{naam}” already exists here.',
  'Er bestaat hier al een subcategorie “{naam}”. Annuleer en kies ze uit de lijst.':
    'A subcategory “{naam}” already exists here. Cancel and pick it from the list.',
  // Ronde 66 — teksten die via een tabel bij t() komen en daardoor nooit vertaald raakten
  'Overboekingen': 'Transfers',
  'Vul een bedrag in.': 'Enter an amount.',
  'Vul een rentevoet van nul of meer in.': 'Enter an interest rate of zero or more.',
  'Vul een looptijd in hele maanden in (minstens 1).': 'Enter a term in whole months (at least 1).',
  'Vul een extra bedrag groter dan nul in.': 'Enter an extra amount greater than zero.',
  'Deze maandlast dekt de interest niet: zo raakt de lening nooit afbetaald.':
    'This monthly payment does not cover the interest: the loan would never be paid off.',
  'Kies een geldige datum.': 'Pick a valid date.',
  'Kies een streefdatum in de toekomst.': 'Pick a target date in the future.',
  'Vul een maandbedrag groter dan nul in.': 'Enter a monthly amount greater than zero.',
  'Zo duurt het langer dan honderd jaar. Verhoog het maandbedrag.':
    'That would take more than a hundred years. Raise the monthly amount.',
  'Vul bij elke aanbieding een hoeveelheid groter dan nul in.': 'Enter a quantity greater than zero for every offer.',
  'Vergelijk gewicht met gewicht, inhoud met inhoud, of stuks met stuks.':
    'Compare weight with weight, volume with volume, or pieces with pieces.',
  'Vul minstens twee aanbiedingen in om te vergelijken.': 'Enter at least two offers to compare.',
  'per kilo': 'per kilo',
  'per liter': 'per litre',
  'per stuk': 'per piece',
  'Kind': 'Child',
  'Ikzelf': 'Myself',
  'Wat aan niemand persoonlijk hangt, staat bij "Het gezin". Een kost voor meerdere gezinsleden wordt gelijk verdeeld; zo’n aandeel bestaat niet als aparte boeking, dus die rij klikt niet door.':
    'Whatever is not attached to anyone in particular sits under "The household". A cost for several family members is split equally; such a share does not exist as a separate entry, so that row does not click through.',
  // Ronde 66 — tweede nakijkronde
  'Wat je met iemand anders moet afrekenen of over tijd moet opvolgen: gedeelde kosten, leningen, en facturen met hun garantiebewijs.':
    'What you need to settle with someone else or follow up over time: shared costs, loans, and invoices with their warranty.',
  '{n} kost(en) komen weer op "nog niet afgerekend" te staan en tellen dus opnieuw mee in wat er te verrekenen valt.':
    '{n} cost(s) go back to "not settled yet", so they count again towards what is to be settled.',
  // Ronde 66 — nakijkronde
  'Netto {bedrag} — bekijk de boekingen van deze maand': 'Net {bedrag} — view this month’s entries',
  'Je uitgaven en inkomsten van de laatste maanden, nieuwste eerst. Zoek, filter, of tik er een aan om ze te wijzigen; oudere haal je onderaan erbij.':
    'Your spending and income of the last few months, newest first. Search, filter, or tap one to change it; older ones you pull in at the bottom.',
  'Nog geen budgetten ingesteld. Met het formulier op deze pagina zet je een grens op een categorie.':
    'No budgets set yet. With the form on this page you put a limit on a category.',
  'Facturen & garantiebewijzen — een aankoop met bon of factuur. De app bewaakt de garantieperiode en waarschuwt je vóór ze afloopt.':
    'Invoices & warranties — a purchase with a receipt or invoice. The app watches the warranty period and warns you before it runs out.',
  'Waar je geld staat: je betaal- en spaarrekeningen, je cash, je kredietkaarten en je beleggingen. Tik een rekening aan om te zien wat erop gebeurde.':
    'Where your money is: your current and savings accounts, your cash, your credit cards and your investments. Tap an account to see what happened on it.',
  'Een hoofdcategorie is een groot gebied van je leven: Voeding, of Woning en vaste lasten.':
    'A main category is a broad area of your life: Food, or Housing and fixed costs.',
  'Je hoeft niets van dit alles zelf te maken — de app brengt de hele indeling al mee. Vind je iets niet terug, dan zet je het er op de juiste plek bij; hernoemen mag ook, en dat kan je altijd terugdraaien.':
    'You do not have to create any of this yourself — the app brings the whole structure with it. If you cannot find something, add it in the right place; renaming is fine too, and you can always undo it.',
  'Waar je geld naartoe ging, wat er duurder werd, en wat er nog aankomt. Kies bovenaan wat je bekijkt en over welke periode, en daaronder je vraag.':
    'Where your money went, what got more expensive, and what is still coming. At the top you choose what you are looking at and over which period, and below that your question.',
  'Begin bij "Je geld"': 'Start with "Your money"',
  '{c} cat. · {i} subcat.': '{c} cat. · {i} subcat.',
  '{n} subcat.': '{n} subcat.',
  '{n} subcategorie(ën) daarin': '{n} subcategor(y/ies) in them',
  '{naam} verwijderd, met {items} subcategorie(ën)': '{naam} deleted, with {items} subcategor(y/ies)',
  '{naam} verwijderd, met {midden} categorie(ën) en {items} subcategorie(ën)':
    '{naam} deleted, with {midden} categor(y/ies) and {items} subcategor(y/ies)',
  // Ronde 66 — nog een reeks "boeking"
  'Boeking verwijderd': 'Entry deleted',
  'Gebaseerd op de omschrijving bij elke boeking': 'Based on the description on each entry',
  'Bekijk bij Boekingen ›': 'View under Entries ›',
  'Bewaar de bon of factuur van deze boeking.': 'Keep the receipt or invoice for this entry.',
  'Koppel aan een boeking (optioneel)': 'Link to an entry (optional)',
  'Zo verschijnt ze straks in je lijst met boekingen.': 'This is how it will appear in your list of entries.',
  'Je rekeningen, boekingen en documenten zitten in de database van deze browser, op dit toestel. Er is geen account nodig en er staat geen kopie op een server van ons — die server bestaat niet.':
    'Your accounts, entries and documents sit in this browser’s database, on this device. No account is needed and there is no copy on a server of ours — that server does not exist.',
  'Uitboeken: wis de boeking van {naam}': 'Unbook: erase the entry for {naam}',
  'Geen boekingen gevonden.': 'No entries found.',
  'alle boekingen': 'all entries',
  // Ronde 66 — elk scherm zegt wat het is
  // De uitlegzinnen onder de paginatitels
  'Hoe je er deze maand voor staat: wat er binnenkwam, wat eraf ging, en wat er op je rekeningen staat.':
    'How you are doing this month: what came in, what went out, and what is on your accounts.',
  'De indeling waarmee de app je uitgaven groepeert. Ze is al ingevuld; je kan overal iets eigens bij zetten of hernoemen.':
    'The structure the app groups your spending by. It is already filled in; you can add your own anywhere, or rename things.',
  'Zet in één keer een hele maand aan boekingen in de app, uit het CSV-bestand van je bank. Jij kiest daarna wat er echt in mag.':
    'Put a whole month of entries into the app at once, from your bank’s CSV file. You then choose what actually goes in.',
  // De uitlegblokken
  'Wat betekenen deze vier cijfers?': 'What do these four figures mean?',
  'Saldo is de stand van al je rekeningen samen, vandaag. Dat cijfer verandert niet mee met de maand die je bovenaan koos — het is wat er nú staat.':
    'Balance is the standing of all your accounts together, today. That figure does not follow the month you picked at the top — it is what is there right now.',
  'Inkomsten, Uitgaven en Netto gaan wél over de gekozen maand. Netto is inkomsten min uitgaven: wat je die maand overhield of tekortkwam. Tik op een van de drie om de boekingen erachter te zien.':
    'Income, Expenses and Net do follow the month you picked. Net is income minus expenses: what you had left over or fell short that month. Tap any of the three to see the entries behind it.',
  'Wat kan je hier bijhouden?': 'What can you keep track of here?',
  'Gedeelde kosten — kosten verdelen met een co-ouder of ex-partner. Je legt één keer vast wie welk deel betaalt, geeft de kosten in, en de app rekent uit wie wie wat verschuldigd is. Van een afrekening maakt ze een PDF met de opbouw erbij.':
    'Shared costs — splitting costs with a co-parent or ex-partner. You set out once who pays which share, enter the costs, and the app works out who owes whom what. It turns a settlement into a PDF with the breakdown included.',
  'Lening of krediet — geld dat jij uitleende of zelf leende. De app houdt bij hoeveel er nog openstaat en wat er al terugbetaald is.':
    'Loan or credit — money you lent out or borrowed yourself. The app keeps track of how much is still outstanding and what has been repaid.',
  'Hoe deze indeling in elkaar zit': 'How this structure works',
  'Er zijn drie lagen, van breed naar smal:': 'There are three layers, from broad to narrow:',
  'Een categorie is een stuk daarvan: onder Voeding bijvoorbeeld Broodwaren.':
    'A category is a part of that: under Food, for instance, Bread.',
  'Een subcategorie is één ding dat je koopt: onder Broodwaren bijvoorbeeld Stokbrood.':
    'A subcategory is one thing you buy: under Bread, for instance, Baguette.',
  'Zo vind je dat bestand bij je bank': 'How to find that file at your bank',
  // Eén woord per ding
  'Nieuwe boeking': 'New entry',
  'Boeking bewerken': 'Edit entry',
  'Boeking toevoegen': 'Add an entry',
  'Recente boekingen': 'Recent entries',
  'Laatste boekingen': 'Latest entries',
  'Alle boekingen': 'All entries',
  'Nog geen boekingen.': 'No entries yet.',
  'Zoek in je boekingen': 'Search your entries',
  '{n} boeking(en) gevonden': '{n} entry/entries found',
  '{n} boeking(en) getoond': '{n} entry/entries shown',
  '{n} boeking(en) verwijderd': '{n} entry/entries deleted',
  '{n} boeking(en) gedownload als CSV-bestand.': '{n} entry/entries downloaded as a CSV file.',
  '{n} boekingen in de periode': '{n} entries in this period',
  'Toon oudere boekingen ({n} ouder dan {maanden} maanden)': 'Show older entries ({n} older than {maanden} months)',
  '{naam} lijkt al geboekt op {datum} ({bedrag}). Er is niets bijgemaakt — kijk het na in je boekingen.':
    '{naam} appears to be booked already on {datum} ({bedrag}). Nothing was added — check it in your entries.',
  'Maak eerst een rekening aan — een boeking moet ergens op staan.':
    'Create an account first — an entry has to sit somewhere.',
  'Nog geen boekingen op deze rekening. Ze verschijnen hier zodra je er een ingeeft of een uittreksel inleest.':
    'No entries on this account yet. They appear here as soon as you enter one or import a statement.',
  // De drie lagen van de categorieboom
  'Naam hoofdcategorie': 'Main category name',
  'Hoofdcategorie toevoegen': 'Add main category',
  'Hoofdcategorie wijzigen': 'Change main category',
  'Hoofdcategorie bewerken': 'Edit main category',
  'Nieuwe hoofdcategorie': 'New main category',
  'Bewerk hoofdcategorie {naam}': 'Edit main category {naam}',
  'Verwijder hoofdcategorie {naam}': 'Delete main category {naam}',
  'Je hebt nog geen eigen hoofdcategorieën. De ingebouwde boom staat hieronder — daar kan je op elk niveau iets toevoegen.':
    'You have no main categories of your own yet. The built-in tree is below — you can add something at any level there.',
  'Zoek een categorie of subcategorie': 'Search a category or subcategory',
  'Subcategorie zoeken': 'Search subcategory',
  'Zoek een subcategorie (vanaf 2 letters)…': 'Search a subcategory (from 2 letters)…',
  'Typ om ook subcategorieën te zoeken…': 'Type to search subcategories too…',
  'Je kan een budget ook op één subcategorie zetten — typ dan de naam.':
    'You can also put a budget on a single subcategory — just type its name.',
  'Zet je een budget op een hoofdcategorie, dan telt alles eronder mee. Zet je het op één subcategorie, dan telt alleen die.':
    'Put a budget on a main category and everything under it counts. Put it on one subcategory and only that one counts.',
  'Verdeling per subcategorie': 'Breakdown by subcategory',
  // Te verrekenen
  'Te verrekenen': 'To settle',
  'te verrekenen': 'to settle',
  'Te verrekenen: plus = partner betaalt jou, min = jij betaalt partner.':
    'To settle: plus = partner pays you, minus = you pay partner.',
  'telt niet mee in wat er te verrekenen valt': 'does not count towards what is to be settled',
  // De onderhoudsbijdrage, overal hetzelfde woord
  'Kijkt in: je betalingen op een onderhoudsbijdrage in Dossiers.':
    'Looks at: your payments on a maintenance contribution in Cases.',
  'Voor een onderhoudsbijdrage gebruik je de consumptieprijsindex, en is de aanvangsindex die van de maand vóór de maand waarin het bedrag werd vastgelegd. Hou je er een blijvend bij, doe dat dan in een dossier: daar zoekt de app de indexcijfers zelf op.':
    'For a maintenance contribution you use the consumer price index, and the starting index is the one for the month before the month in which the amount was set. If you are keeping one going, do it in a case: there the app looks the index figures up itself.',
  'Wil je deze onderhoudsbijdrage blijvend bijhouden, maak dan eerst een dossier aan bij Dossiers.':
    'To keep this maintenance contribution going, create a case under Cases first.',
  // De eerste stap in een lege toestand
  'Nog niets geboekt deze maand.': 'Nothing recorded this month yet.',
  'Zet je eerste budget': 'Set your first budget',
  'Maak een rekening aan': 'Create an account',
  'Vul je vaste lasten in': 'Enter your fixed costs',
  'Loop de blokken hieronder door: je rekeningen, je vaste kosten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.':
    'Work through the blocks below: your accounts, your fixed costs and your subscriptions. After ten minutes you know what is committed every month and what you are worth — before you enter a single entry.',
  'Nog geen gezinsleden ingesteld. Vul hieronder een naam in; daarna kan je er kosten, doelen en garanties aan koppelen.':
    'No family members set up yet. Enter a name below; after that you can attach costs, goals and warranties to them.',
  'Nog geen budgetten ingesteld. Op de Budget-pagina zet je een grens op een categorie.':
    'No budgets set yet. On the Budget page you put a limit on a category.',
  // Ronde 65 — derde nakijkronde
  'Dit verandert er:': 'What changes:',
  'Afrekening gemarkeerd als overgemaakt': 'Settlement marked as transferred',
  'Afrekening weer opengezet': 'Settlement reopened',
  'Ter controle: {huidig} ligt een eind van {laatste} — het laatste cijfer dat de app zelf kent, in basis {jaar} = 100. Statbel publiceert sinds 2026 ook een kolom in basis 2025 = 100. Staan je twee cijfers allebei in dezelfde reeks en hetzelfde basisjaar, dan klopt de berekening; anders zit het bedrag er tientallen procenten naast.':
    'Just to check: {huidig} is some way off {laatste} — the latest figure the app itself knows, in base {jaar} = 100. Since 2026 Statbel also publishes a column in base 2025 = 100. If both your figures are in the same series and the same base year the calculation is right; otherwise the amount is off by tens of percent.',
  // Ronde 65 — tweede nakijkronde
  'Het terugzetten is niet gelukt. Probeer het opnieuw.': 'Restoring did not work. Please try again.',
  'een andere rekening': 'another account',
  // Ronde 65 — nakijkronde
  'De app kan hier niet nakijken waar deze naam nog gebruikt wordt.':
    'The app cannot check here where this name is still used.',
  'het cijfer uit je akte': 'the figure from your agreement',
  'het cijfer van nu': "today's figure",
  'per kwartaal': 'per quarter',
  'per half jaar': 'per half-year',
  '{n} vaste last(en) verliezen hun categorie.': '{n} fixed cost(s) lose their category.',
  '{n} gedeelde kost(en) in een dossier verliezen hun categorie.': '{n} shared cost(s) in a case lose their category.',
  '{n} post(en) op een kindrekening verliezen hun categorie.': '{n} movement(s) on a child account lose their category.',
  '{n} dossier(s) hebben hiervoor een eigen verdeelsleutel — die valt terug op de dossierstandaard, en dan verandert je afrekeningsbedrag.':
    '{n} case(s) have their own split for this — that falls back to the case default, and then your settlement amount changes.',
  // Ronde 65 — fouten die zichzelf verbergen
  'De periode hierboven geldt op deze tab alleen voor je spaarquote. De rest volgt de maand die je bovenaan koos — behalve "Wat komt eraan", dat vertrekt van de lopende maand.':
    'On this tab the period above only applies to your savings rate. The rest follows the month you picked at the top — except "What is coming up", which starts from the current month.',
  'Alle overboekingen': 'All transfers',
  'Overboekingen van deze rekening': 'Transfers on this account',
  'per jaar': 'per year',
  'Let op: {n} van deze regels staan al op {rekening}. Staat hierboven wel de juiste rekening?':
    'Careful: {n} of these lines are already on {rekening}. Is the right account selected above?',
  'Er is deze maand nog niets geboekt, dus valt er ook niets te categoriseren.':
    'Nothing has been recorded this month, so there is nothing to categorise either.',
  'Er is deze maand nog niets geboekt, dus valt er nog niets te zeggen over hoe ze geweest is.':
    'Nothing has been recorded this month, so there is nothing to say yet about how it went.',
  'Om te indexeren heeft de app allebei de cijfers nodig: de aanvangsindex én de huidige. Laat ze allebei leeg om niet te indexeren.':
    'To index, the app needs both figures: the starting index and the current one. Leave both empty not to index.',
  '"{invoer}" is geen indexcijfer. Vul een getal groter dan nul in, of laat het veld leeg om niet te indexeren.':
    '"{invoer}" is not an index figure. Enter a number greater than zero, or leave the field empty not to index.',
  // Ronde 65 — niets kan stil kapotgaan
  'Deze afrekening verwijderen?': 'Delete this settlement?',
  'De afrekening van {datum} verwijderen?': 'Delete the settlement of {datum}?',
  'Het bedrag van {bedrag} en de opbouw erachter — welke kosten, welke periode, welk aandeel.':
    'The amount of {bedrag} and the breakdown behind it — which costs, which period, which share.',
  '{n} gedeelde kost(en) blijven bestaan; alleen hun plek in deze afrekening verdwijnt.':
    '{n} shared cost(s) stay; only their place in this settlement disappears.',
  'Afrekening verwijderd': 'Settlement deleted',
  'Gezinslid verwijderen?': 'Delete family member?',
  '{naam} verwijderen?': 'Delete {naam}?',
  'Liever archiveren': 'Archive instead',
  // Ronde 76 — de vraag vóór het verwijderen van een vaste last.
  'Vaste post verwijderen?': 'Delete recurring item?',
  'Liever opzeggen': 'End it instead',
  'Hier hangt nog dit aan:': 'This is still attached to it:',
  'Er hangt niets aan deze kost.': 'Nothing is attached to this cost.',
  'De app kan hier niet nakijken wat er aan deze kost hangt.': 'The app cannot check here what is attached to this cost.',
  '{n} boeking(en) die je hier inboekte': '{n} entry/entries you booked here',
  'Ze blijven staan als gewone boeking; alleen de knop "Uitboeken" verdwijnt, want die hoort bij de kost.': 'They stay as ordinary entries; only the "Unrecord" button disappears, because it belongs to the cost.',
  '{n} boeking(en) waarvan je zei dat ze deze kost zijn': '{n} entry/entries you marked as this cost',
  'Ze blijven staan en tellen daarna weer mee als een gewone boeking — de app mag ze dus opnieuw bij een andere vaste last voorstellen.': 'They stay and count as ordinary entries again — so the app may suggest them for another fixed cost.',
  '{n} spaardoel(en) sparen hiervoor': '{n} savings goal(s) save for this',
  'Ze blijven lopen, maar weten daarna niet meer waarvoor.': 'They keep running, but no longer know what for.',
  'Zet je hem stop? Vul dan "Loopt tot en met" in — de maand die je daar kiest, is de laatste keer dat hij meetelt. De kost blijft in je historiek staan.': 'Are you ending it? Then fill in "Runs through" — the month you pick there is the last time it counts. The cost stays in your history.',
  'Bedenk je je meteen, dan zet "Ongedaan maken" onderaan het scherm de kost terug — mét al deze koppelingen.': 'Change your mind right away and "Undo" at the bottom of the screen brings the cost back — with all these links.',
  'Deze naam wordt nu nog gebruikt in:': 'This name is still used in:',
  'Dit gezinslid wordt nergens gebruikt.': 'This family member is not used anywhere.',
  'Verwijder je het lid, dan blijft het overal waar het al gebruikt is als naamloze verwijzing staan. Archiveren haalt het alleen uit de keuzelijsten en laat elke naam staan.':
    'If you delete the member, it stays as a nameless reference everywhere it is already used. Archiving only takes it out of the pickers and leaves every name in place.',
  '{n} gedeelde kost(en) in een dossier': '{n} shared cost(s) in a case',
  '{n} afrekening(en)': '{n} settlement(s)',
  '{n} post(en) op een kindrekening': '{n} movement(s) on a child account',
  '{n} spaardoel(en)': '{n} savings goal(s)',
  '{n} lening(en)': '{n} loan(s)',
  '{n} garantie(s)': '{n} warranty/warranties',
  'Categorie verwijderen?': 'Delete category?',
  '{n} categorie(ën) eronder': '{n} categor(y/ies) below it',
  '{n} boeking(en) blijven bestaan, maar staan daarna zonder categorienaam.':
    '{n} entry/entries stay, but afterwards they have no category name.',
  '{n} budget(ten) hierop verliezen hun categorie.': '{n} budget(s) on it lose their category.',
  'Er hangt niets aan deze categorie.': 'Nothing is attached to this category.',
  '{naam} verwijderd': '{naam} deleted',
  '{oud} heet nu {nieuw}': '{oud} is now called {nieuw}',
  '{naam} gearchiveerd — ze staat niet meer in de keuzelijsten':
    '{naam} archived — it is no longer in the pickers',
  '{naam} heropend': '{naam} reopened',
  // De navigatie en de analysetabs (ronde 60)
  '{onderdeel} staat uit, maar er staat wel iets in.': '{onderdeel} is switched off, but there is something in it.',
  'Toon het': 'Show it',
  'Toon {onderdeel}': 'Show {onderdeel}',
  'Onderdeel van de analyse': 'Section of the analysis',
  'Verdeling': 'Breakdown',
  'Wat verandert': 'What is changing',
  'Vooruit': 'Ahead',
  'Af en toe': 'Now and then',
  // Een dossier verwijderen, met de vraag ervóór (ronde 59)
  '{n} kindrekening(en)': '{n} child account(s)',
  'Dit dossier verwijderen?': 'Delete this case?',
  'Nee, behouden': 'No, keep it',
  'Je staat op het punt {naam} te verwijderen, met alles wat eraan hangt:': 'You are about to delete {naam}, along with everything attached to it:',
  'Je kan dit meteen daarna nog ongedaan maken met de balk onderaan, maar die blijft niet lang staan.': 'You can still undo this right afterwards with the bar at the bottom, but it does not stay for long.',
  'Er staat nog niets in dit dossier.': 'There is nothing in this case yet.',
  '{n} gedeelde kost(en)': '{n} shared cost(s)',
  '{n} verrekening(en)': '{n} settlement(s)',
  '{n} post(en) op de kindrekening': '{n} movement(s) on the child account',
  '{n} regeling(en) voor de onderhoudsbijdrage': '{n} maintenance arrangement(s)',
  '{n} betaling(en) van de onderhoudsbijdrage': '{n} maintenance payment(s)',
  '{n} bewaard(e) document(en) — bonnen, scans, overeenkomsten': '{n} stored document(s) — receipts, scans, agreements',
  // Indexreeksen bij de onderhoudsbijdrage (ronde 58)
  'Kompal rekende de onderhoudsbijdrage van {dossier} vroeger met de gezondheidsindex. De wet noemt de consumptieprijzen, en daar rekent de app nu mee — het bedrag kan daardoor verschillen. Open de regeling en bevestig welke index in je akte staat.': 'Kompal used to calculate the maintenance contribution for {dossier} with the health index. The law names the consumer price index, which the app now uses — so the amount may differ. Open the arrangement and confirm which index your deed names.',
  'Gerekend met de {reeks}.': 'Calculated with the {reeks}.',
  'Gerekend met de {reeks}, de wettelijke reeks. Tot augustus 2026 gebruikte Kompal hier de gezondheidsindex; daardoor kan dit bedrag iets verschillen van vroeger. Noemt je akte uitdrukkelijk de gezondheidsindex, zet ze dan om bij "Wijzig de regeling".': 'Calculated with the {reeks}, the series the law prescribes. Until August 2026 Kompal used the health index here, so this amount may differ slightly from before. If your deed explicitly names the health index, switch it under "Change the arrangement".',
  'Je eigen indexcijfers stonden in de vorige reeks en zijn verwijderd. Zet ze opnieuw met cijfers uit de {nieuw}.': 'Your own index figures were in the previous series and have been removed. Enter them again using figures from the {nieuw}.',
  'Je eerdere indexcijfers kwamen uit de {oud} en zijn verwijderd. Zet ze opnieuw met cijfers uit de {nieuw}.': 'Your earlier index figures came from the {oud} and have been removed. Enter them again using figures from the {nieuw}.',
  'Zodra je bewaart, rekent de app alle bedragen opnieuw met deze reeks. Je eigen indexcijfers stonden in de vorige reeks en worden dan verwijderd.': 'Once you save, the app recalculates every amount with this series. Your own index figures were in the previous series and will be removed.',
  'Dat cijfer ligt te ver van {laatste} — het laatste dat de app voor de {reeks} kent. Staat het in een ander basisjaar? Statbel publiceert sinds 2026 standaard in basis 2025 = 100; de app rekent in basis {jaar} = 100. Neem het cijfer uit de kolom met basis {jaar}.': 'That figure is too far from {laatste} — the most recent one the app knows for the {reeks}. Is it on a different base year? Since 2026 Statbel publishes on base 2025 = 100 by default; the app works on base {jaar} = 100. Take the figure from the base {jaar} column.',
  'De app rekent niet met deze regeling. De indexcijfers die je zelf bijzette komen uit de {eigen}, en deze regeling rekent met de {gekozen}. Dat zijn twee verschillende reeksen; ze combineren geeft een bedrag dat niet na te rekenen is. Verwijder je eigen cijfers hieronder en zet ze opnieuw met cijfers uit de {gekozen}.': 'The app is not calculating with this arrangement. The index figures you added yourself come from the {eigen}, while this arrangement uses the {gekozen}. Those are two different series; combining them gives an amount nobody can verify. Remove your own figures below and enter them again using figures from the {gekozen}.',
  'Consumptieprijsindex': 'Consumer price index',
  'consumptieprijsindex': 'consumer price index',
  'Gezondheidsindex': 'Health index',
  'gezondheidsindex': 'health index',
  'De wettelijke standaard voor een onderhoudsbijdrage. Artikel 203quater van het oud Burgerlijk Wetboek bindt de bijdrage aan het indexcijfer van de consumptieprijzen.': 'The legal default for a maintenance contribution. Article 203quater of the old Civil Code ties the contribution to the consumer price index.',
  'Dezelfde korf min tabak, alcohol, benzine en diesel. Kies deze alleen wanneer je akte haar uitdrukkelijk noemt; voor huur is zij wél de juiste.': 'The same basket minus tobacco, alcohol, petrol and diesel. Choose this one only if your deed names it explicitly; for rent it is the correct one.',
  'Welke index staat er in je akte?': 'Which index does your deed name?',
  'Zodra je bewaart, rekent de app alle bedragen opnieuw met deze reeks. Het bedrag kan daardoor veranderen.': 'Once you save, the app recalculates every amount with this series. The amount may change as a result.',
  'Tot augustus 2026 rekende Kompal hier altijd met de gezondheidsindex. Dat was fout: de wet noemt de consumptieprijzen. Staat er in jouw akte uitdrukkelijk "gezondheidsindex", zet ze dan hierboven om.': 'Until August 2026 Kompal always used the health index here. That was wrong: the law names the consumer price index. If your deed explicitly says "health index", switch it above.',
  'De app rekent met de {reeks} en kent cijfers tot {laatste}, in basis {jaar} = 100.': 'The app uses the {reeks} and knows figures up to {laatste}, on base {jaar} = 100.',
  'Aanvangsindex {index}: de {reeks} van {maand}, de maand vóór de regeling.': 'Starting index {index}: the {reeks} for {maand}, the month before the arrangement.',
  'Dit blad is een berekening op basis van wat er in Financieel Kompas is ingevoerd: het bedrag uit de regeling, de datum ervan en de {reeks}.': 'This page is a calculation based on what was entered in Financieel Kompas: the amount from the arrangement, its date and the {reeks}.',
  'De onderhoudsbijdrage die op {datum} werd vastgelegd, volgt de {reeks}. Die aanpassing gebeurt jaarlijks op de verjaardag van de regeling.': 'The maintenance contribution set on {datum} follows the {reeks}. That adjustment happens yearly on the anniversary of the arrangement.',
  'De onderhoudsbijdrage volgt de {reeks}. Het nieuwe bedrag is telkens: het bedrag uit de regeling, maal de index van de maand vóór de verjaardag, gedeeld door de aanvangsindex.': 'The maintenance contribution follows the {reeks}. The new amount is always: the amount from the arrangement, times the index of the month before the anniversary, divided by the starting index.',
  // Contract- en opzegdata bij een vaste last (ronde 57)
  'Je eigen opzegtermijn (optioneel)': 'Your own notice period (optional)',
  'Eenheid van de opzegtermijn': 'Unit of the notice period',
  'maanden': 'months',
  'dagen': 'days',
  'Vul een heel aantal maanden in, van 0 tot 24. Zolang dit niet klopt, kan je niet opslaan.': 'Enter a whole number of months, from 0 to 24. As long as this is not right, you cannot save.',
  'De app rekent met jouw {n} maand(en).': 'The app uses your {n} month(s).',
  'De app rekent met de wettelijke {n} maand(en). Staat er in jouw overeenkomst een kortere termijn, vul die dan hier in.': 'The app uses the legal {n} month(s). If your agreement states a shorter period, enter it here.',
  '⚠ De verlengdatum is onleesbaar. Zet ze opnieuw.': '⚠ The renewal date cannot be read. Set it again.',
  '⚠ De verlengdatum ({datum}) is voorbij. Zet de nieuwe.': '⚠ The renewal date ({datum}) has passed. Set the new one.',
  'verlengt {datum} · beslisdatum voorbij, opzegtermijn {n} maand(en)': 'renews {datum} · decision date passed, notice period {n} month(s)',
  'verlengt {datum} · beslisdatum voorbij, opzegtermijn {n} dag(en)': 'renews {datum} · decision date passed, notice period {n} day(s)',
  '(wettelijke termijn)': '(legal period)',
  'De verlengdatum van {naam} is onleesbaar. Zet ze opnieuw, anders kan de app niets uitrekenen.': 'The renewal date of {naam} cannot be read. Set it again, otherwise the app cannot calculate anything.',
  'Vandaag is volgens de wettelijke termijn de laatste dag om {naam} op te zeggen. Kijk je eigen contract na.': 'By the legal period, today is the last day to cancel {naam}. Check your own contract.',
  'Nog {n} dag(en) om te beslissen over {naam}, gerekend met de wettelijke termijn. Kijk je eigen contract na.': '{n} day(s) left to decide about {naam}, calculated with the legal period. Check your own contract.',
  'Een huishoudelijke afnemer mag een energiecontract op elk ogenblik beëindigen met één maand opzegtermijn — ook een contract met een vaste prijs. De vraag is dus meestal niet óf je weg kan, maar of je wil dat de volgende periode aan de nieuwe prijs loopt.': 'A household customer may end an energy contract at any time with one month’s notice — including a fixed-price contract. So the question is usually not whether you can leave, but whether you want the next period to run at the new price.',
  'De app rekent alleen met de opzegtermijn. Over vergoedingen of boetes zegt ze niets: dat zijn bedragen die van jouw contract afhangen, en die kan ze niet narekenen.': 'The app works with the notice period only. It says nothing about fees or penalties: those are amounts that depend on your contract, and it cannot verify them.',
  'Na de eerste zes maanden kan je een telecomcontract opzeggen zonder opzegvergoeding, hoe lang de looptijd ook is. De opzegtermijn in je contract mag niet meer dan twee maanden bedragen.': 'After the first six months you can cancel a telecom contract without an early-termination fee, however long its term. The notice period in your contract may not exceed two months.',
  'Twee maanden is het WETTELIJKE MAXIMUM. Wat in jouw contract staat, kan korter zijn — kijk het na en pas de termijn hieronder aan. Kreeg je een toestel bij je abonnement, dan mag de operator nog de restwaarde ervan aanrekenen; die staat in de aflossingstabel bij je contract. Zeg je op in de eerste zes maanden, dan betaal je het abonnement nog tot het einde van de zesde maand.': 'Two months is the LEGAL MAXIMUM. Your own contract may state less — check it and adjust the period below. If you received a device with your subscription, the operator may still charge its residual value; that figure is in the amortisation table attached to your contract. If you cancel within the first six months, you still pay the subscription until the end of the sixth month.',
  'Voor een niet-levensverzekering geldt sinds 1 oktober 2024 twee maanden: in het eerste jaar zeg je op tegen de jaarlijkse vervaldag met twee maanden vooraf, en vanaf het tweede jaar kan je op elk moment opzeggen met twee maanden opzegtermijn.': 'For a non-life policy, two months has applied since 1 October 2024: in the first year you cancel as of the annual renewal date, two months in advance, and from the second year you can cancel at any time with two months’ notice.',
  'Dit geldt voor niet-levensverzekeringen zoals auto, woning en familiale, en voor contracten die vanaf 1 oktober 2024 gesloten of stilzwijgend verlengd zijn. Voor een gezondheids- of hospitalisatieverzekering (drie maanden vóór de jaarlijkse vervaldag) en voor levensverzekeringen gelden andere regels: vul de termijn dan zelf in.': 'This applies to non-life policies such as car, home and liability insurance, and to contracts concluded or tacitly renewed from 1 October 2024 onwards. Health and hospitalisation cover (three months before the annual renewal date) and life insurance follow different rules: enter the period yourself in that case.',
  'Is je dienstencontract van bepaalde duur stilzwijgend verlengd, dan kan je het op elk ogenblik zonder vergoeding opzeggen. De opzegtermijn uit je contract geldt, maar mag niet meer dan twee maanden bedragen.': 'If your fixed-term service contract has been tacitly renewed, you can cancel it at any time without compensation. The notice period from your contract applies, but may not exceed two months.',
  'Deze regel geldt voor DIENSTEN (artikel VI.91 WER) en pas NA een stilzwijgende verlenging. Zit het contract nog in zijn eerste periode, dan telt wat er in de overeenkomst staat. Twee maanden is het wettelijke maximum; korter kan.': 'This rule covers SERVICES (article VI.91 of the Code of Economic Law) and only AFTER a tacit renewal. While the contract is still in its first term, what the agreement says counts. Two months is the legal maximum; shorter is allowed.',
  'Vul een heel aantal dagen in, van 0 tot 365. Zolang dit niet klopt, kan je niet opslaan.': 'Enter a whole number of days, from 0 to 365. As long as this is not right, you cannot save.',
  'Vul hier een heel aantal maanden in, van 1 tot 120 — of laat het leeg.': 'Enter a whole number of months here, from 1 to 120 — or leave it empty.',
  'Let op:': 'Note:',
  'In het contractblok staat een getal dat de app niet kan gebruiken. Pas het aan om op te slaan.': 'The contract section contains a number the app cannot use. Correct it to save.',
  'Sla je zo op, dan wis je de verlengdatum en de opzegtermijn van deze post.': 'If you save it like this, you erase the renewal date and the notice period of this item.',
  'Zit hier een contract achter? (optioneel)': 'Is there a contract behind this? (optional)',
  'Nee, gewoon een vaste last': 'No, just a fixed cost',
  'Verlengt of loopt af op': 'Renews or ends on',
  'Om de hoeveel maanden? (optioneel)': 'Renewal period, in months (optional)',
  'De app schuift deze datum vanzelf op zodra ze voorbij is.': 'The app moves this date forward by itself once it has passed.',
  'Zonder dit getal schuift de app de datum NIET zelf op: ze vraagt je de nieuwe. Ze kan niet weten voor hoe lang er verlengd is.': 'Without this number the app does NOT move the date forward by itself: it asks you for the new one. It cannot know how long the renewal runs.',
  'Zonder termijn toont de app alleen de datum en rekent ze niets uit.': 'Without a notice period the app only shows the date and calculates nothing.',
  'De app rekent met jouw {n} dagen.': 'The app uses your {n} days.',
  'verlengt {datum} · geen opzegtermijn ingevuld': 'renews {datum} · no notice period entered',
  'verlengt {datum} · beslissen vóór {beslis}': 'renews {datum} · decide before {beslis}',
  'De verlengdatum van {naam} is voorbij. Zet de nieuwe datum, anders kan de app niets meer uitrekenen.': 'The renewal date of {naam} has passed. Set the new date, otherwise the app cannot calculate anything.',
  'Vandaag is de laatste dag om {naam} op te zeggen vóór de verlenging.': 'Today is the last day to cancel {naam} before it renews.',
  'Nog {n} dag(en) om te beslissen over {naam} vóór het verlengt.': '{n} day(s) left to decide about {naam} before it renews.',
  'Energie (elektriciteit of gas)': 'Energy (electricity or gas)',
  'Telecom (internet, gsm of tv)': 'Telecom (internet, mobile or TV)',
  'Abonnement met stilzwijgende verlenging': 'Subscription with tacit renewal',
  'Ander contract': 'Other contract',
  'De app kent voor dit soort contract geen wettelijke termijn. Vul zelf in wat er in je overeenkomst staat; zonder termijn toont ze alleen de datum en rekent ze niets uit.': 'The app knows no legal period for this kind of contract. Enter what your agreement states yourself; without a period it only shows the date and calculates nothing.',
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
  'Taal': 'Language',
  'Laden…': 'Loading…',
  'Let op: {n} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.':
    'Note: {n} record(s) were skipped because they did not match the schema.',
  'Vorige maand': 'Previous month',
  'Volgende maand': 'Next month',
  'Inkomsten': 'Income',
  'Uitgaven': 'Expenses',
  'Netto': 'Net',
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
  // App — categorieën
  'Categorieën': 'Categories',
  'Verwijder categorie {naam}': 'Delete category {naam}',
  // App — budgetten
  'Budgetten': 'Budgets',
  'voor {maand}': 'for {maand}',
  'Verwijder budget {naam}': 'Delete budget {naam}',
  // App — transacties
  'Verwijder {oms}': 'Delete {oms}',
  'Saldo': 'Balance',
  // App — back-up & drive
  'Back-up & herstel': 'Backup & restore',
  'Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.':
    'A separate safety net on your own device, independent of Google Drive. Keep the file somewhere safe; restoring only adds and never overwrites.',
  'Exporteer back-up': 'Export backup',
  'Herstel uit back-up': 'Restore from backup',
  'Back-up gedownload.': 'Backup downloaded.',
  'Verwijderen is mislukt. Het document staat er nog; probeer het opnieuw.': 'Deleting did not work. The document is still there; please try again.',
  'Inboeken is niet gelukt. Er is niets geboekt.': 'Recording it did not work. Nothing has been recorded.',
  'Verwijderen is niet gelukt. De waardering staat er nog.': 'Deleting did not work. The valuation is still there.',
  'Verwijderen is niet gelukt. Er is niets weggehaald.': 'Deleting did not work. Nothing has been removed.',
  'Dat is niet gelukt. Je invoer staat er nog.': 'That did not work. What you typed is still there.',
  'Dat is niet gelukt. Er is niets veranderd.': 'That did not work. Nothing has changed.',
  'Je antwoord is niet bewaard. Er is niets veranderd.': 'Your answer was not saved. Nothing has changed.',
  'Niets hersteld: dit bestand komt van een nieuwere versie van de app ({n} regels). Werk deze app eerst bij en probeer het dan opnieuw.':
    'Nothing restored: this file comes from a newer version of the app ({n} lines). Update this app first, then try again.',
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
  'Budget verwijderd': 'Budget deleted',
  'Dossier verwijderd': 'Case deleted',
  'Kost verwijderd': 'Expense deleted',
  'Spaardoel verwijderd': 'Savings goal deleted',
  'Subcategorie verwijderd': 'Subcategory deleted',
  // Ronde 76 — de ongedaan-balk zegt WELKE vaste last weg is en wat er aan hing.
  '{naam} verwijderd, {n} boeking(en) blijven staan': '{naam} deleted, {n} entry/entries stay',
  '{naam} verwijderd, {n} spaardoel(en) blijven lopen': '{naam} deleted, {n} savings goal(s) keep running',
  '{naam} verwijderd, {n} boeking(en) blijven staan en {d} spaardoel(en) blijven lopen': '{naam} deleted, {n} entry/entries stay and {d} savings goal(s) keep running',
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
  'Je sluipende kosten': 'Your small subscriptions',
  'Naar Dossiers': 'To Cases',
  'Deel je kosten met iemand?': 'Do you share costs with someone?',
  'Bijvoorbeeld met de andere ouder van je kinderen. Kompal houdt dan bij wie wat betaalde en rekent het voor je af.': 'With the other parent of your children, for instance. Kompal then tracks who paid what and settles it for you.',
  'Nog geen dossiers. Maak er hieronder een aan, of sla dit blok over.': 'No cases yet. Create one below, or skip this block.',
  '{n}% voor jou': '{n}% for you',
  'Uitgeleend geld en aankopen met garantie horen ook bij Dossiers.': 'Money you lent out and purchases with a warranty belong under Cases too.',
  'bedrag': 'amount',
  'Nog geen inkomsten deze maand.': 'No income this month yet.',
  'Zodra je een rekening hebt toegevoegd, zie je hier hoe je bezit evolueert.': 'Once you have added an account, you will see how your assets evolve here.',
  'Je hebt nog geen vaste lasten ingesteld. Zonder die weet de app niet wat er nog moet komen.': 'You have not set up any fixed costs yet. Without them the app cannot know what is still coming.',
  'Loop "Je situatie" door: je rekeningen, je vaste kosten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.':
    'Work through "Your situation": your accounts, your fixed costs and your subscriptions. After ten minutes you will know what is committed each month and what you are worth — before you enter a single entry.',
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
  'Let op: de boekingen tot en met {datum} zitten al in de waarde die je toen hebt vastgelegd. Ze tellen hieronder wel mee, maar niet meer in het saldo bovenaan.': 'Note: the entries up to and including {datum} are already part of the value you recorded then. They still count below, but no longer in the balance at the top.',
  'geldt nu': 'in effect',
  // Wat kost elk gezinslid? (ronde 53)
  '{naam} {bedrag} — bekijk de boekingen': '{naam} {bedrag} — view the entries',
  'Een rij met een aandeel uit een gedeelde kost klikt niet door: zo’n aandeel is een berekening en bestaat nergens als losse boeking.':
    'A row containing a share of a shared cost does not click through: such a share is a calculation and exists nowhere as a separate entry.',
  'Let op: {n} gedeelde kost(en) komen op hetzelfde bedrag uit als een losse boeking van rond dezelfde datum (hoogstens {dagen} dagen ernaast). Staat dezelfde uitgave hier twee keer, dan is dit bedrag te hoog. Koppel zo’n boeking aan het dossier in het invoervenster, dan telt ze maar één keer.': 'Careful: {n} shared cost(s) come to the same amount as a separate entry from around the same date (at most {dagen} days apart). If the same expense is in here twice, this amount is too high. Link such an entry to the case in the entry window and it will only count once.',
  'Wat kost elk gezinslid?': 'What does each family member cost?',
  'Wat jij dat jaar uitgaf voor elk gezinslid: je eigen boekingen plus jouw aandeel in de gedeelde kosten.':
    'What you spent that year on each family member: your own entries plus your share of the shared costs.',
  'Jaar': 'Year',
  'Samen in {jaar}': 'Together in {jaar}',
  '{n} boeking(en) en {m} gedeelde kost(en)': '{n} entry/entries and {m} shared cost(s)',
  '{jaar} loopt nog: dit bedrag groeit nog aan tot 31 december.':
    '{jaar} is still running: this amount will keep growing until 31 December.',
  'In {jaar} staat er nog niets op naam van een gezinslid. Zet een gezinslid bij een boeking, of hang een kost in een dossier aan een kind.':
    'Nothing is assigned to a family member in {jaar} yet. Add a family member to an entry, or attach a cost in a case to a child.',
  'Per gezinslid': 'Per family member',
  '{bedrag} uit je boekingen': '{bedrag} from your own entries',
  '{bedrag} uit gedeelde kosten': '{bedrag} from shared costs',
  'Wat hier NIET in zit': 'What is NOT included here',
  'De onderhoudsbijdrage': 'The maintenance contribution',
  'Die is niet per kind toe te wijzen zonder een verdeling te verzinnen die in geen enkele akte staat. Je vindt ze op het dossier zelf.':
    'It cannot be assigned per child without inventing a split that appears in no agreement. You will find it on the case itself.',
  'De gezamenlijke pot': 'The joint pot',
  'Daar zit ook geld van de andere ouder in. Meetellen zou "wat kost het mij" te hoog maken.':
    'It also holds money from the other parent. Including it would make "what does it cost me" too high.',
  'Een gedeelde kost telt hier voor JOUW aandeel, ook wanneer de andere ouder ze betaalde — dat aandeel ben je verschuldigd. Betaalde jij ze zelf, dan telt ze ook maar voor jouw aandeel, want de rest komt terug via de afrekening.':
    'A shared cost counts here for YOUR share, even when the other parent paid it — you owe that share. If you paid it yourself, it also counts only for your share, because the rest comes back through the settlement.',
  '{n} boeking(en) staan hier als gedeelde kost en niet als boeking, omdat je ze aan een dossier koppelde. Zo telt dezelfde uitgave maar één keer.':
    '{n} entry/entries appear here as a shared cost rather than as an entry, because you linked them to a case. That way the same expense is counted only once.',
  // De grondslag van de verdeling (ronde 52)
  'Waarop steunt deze verdeling?': 'What is this split based on?',
  'Duid de overeenkomst of het vonnis aan waarin de verdeling staat. De bewijsmap verwijst er dan bij elke afspraak naar, met het bijlagenummer erbij.':
    'Point to the agreement or court order that sets out the split. The evidence file will then refer to it at every arrangement, with the appendix number.',
  'Document': 'Document',
  'Geen document aangeduid': 'No document selected',
  'Het document dat je hier had aangeduid, staat niet meer in de kluis van dit dossier. Kies er een ander, of voeg het opnieuw toe.':
    'The document you selected here is no longer in this case’s vault. Pick another one, or add it again.',
  'De app leest dit document niet en controleert de inhoud ervan niet; ze noemt het alleen als de afspraak die jij aanduidde.':
    'The app does not read this document and does not check its contents; it only names it as the arrangement you pointed to.',
  'Waar hierboven een afspraak staat, komt die uit: {naam} (bijlage {n}). De app heeft dat document niet gelezen; je hebt het zelf aangeduid.':
    'Where an arrangement appears above, it comes from: {naam} (appendix {n}). The app has not read that document; you selected it yourself.',
  'Voor deze afspraken is geen document aangeduid. Voeg de overeenkomst of het vonnis toe aan de documentkluis van dit dossier en duid ze daar aan, dan staat ze hier met haar bijlagenummer.':
    'No document has been selected for these arrangements. Add the agreement or court order to this case’s document vault and select it there, and it will appear here with its appendix number.',
  'Dit document is als PDF-bestand toegevoegd en kan niet als afbeelding worden ingevoegd. Vraag het losse bestand op.':
    'This document was added as a PDF file and cannot be inserted as an image. Ask for the separate file.',
  // De opruimronde (ronde 51)
  'Gezinslid': 'Family member',
  'Inkomsten {bedrag} — toon alleen deze boekingen': 'Income {bedrag} — show only these entries',
  'De tegel {naam} klikt nu niet door: met de filters die aanstaan bestaat er geen lijst die precies dat bedrag oplevert. Dat gebeurt bij een gesplitst kassaticket, waar één boeking zowel geld in als geld uit bevat.': 'The {naam} tile does not open a list right now: with the filters that are on, there is no list that adds up to exactly that amount. This happens with a split receipt, where one entry holds both money in and money out.',
  'De tegels Inkomsten en Uitgaven klikken nu niet door: met de filters die aanstaan bestaat er geen lijst die precies dat bedrag oplevert. Dat gebeurt bij een gesplitst kassaticket, waar één boeking zowel geld in als geld uit bevat.': 'The Income and Expenses tiles do not open a list right now: with the filters that are on, there is no list that adds up to exactly that amount. This happens with a split receipt, where one entry holds both money in and money out.',
  'Uitgaven {bedrag} — toon alleen deze boekingen': 'Expenses {bedrag} — show only these entries',
  // Het fiscale jaaroverzicht (ronde 50)
  'Fiscaal jaaroverzicht {jaar}': 'Annual tax overview {jaar}',
  'Meegeven aan je boekhouder': 'To hand to your accountant',
  'De PDF leest als een blad: elk bedrag met zijn voorbehoud erbij. De CSV is om zelf mee te rekenen — één rij per boeking.':
    'The PDF reads like a sheet: every amount with its caveat next to it. The CSV is for working with yourself — one row per entry.',
  'PDF voor je boekhouder': 'PDF for your accountant',
  'PDF voor je boekhouder — bezig…': 'PDF for your accountant — working…',
  'Het document is gedownload.': 'The document has been downloaded.',
  'Het document kon niet gemaakt worden. Probeer het opnieuw.': 'The document could not be created. Try again.',
  'Dit jaar staat niet in de app': 'This year is not in the app',
  'Niets gevonden': 'Nothing found',
  'Bron': 'Source',
  'Lees de voorwaarden bij de bron': 'Read the conditions at the source',
  'De lijst is die van België. Waar een post gewestelijk is, staat ze zoals ze in Vlaanderen geldt; in Brussel en Wallonië gelden andere regels.':
    'The list is the Belgian one. Where an item is regional, it is shown as it applies in Flanders; different rules apply in Brussels and Wallonia.',
  '{jaar} loopt nog: deze bedragen groeien nog aan tot 31 december.':
    '{jaar} is still running: these amounts will keep growing until 31 December.',
  '{jaar} loopt nog: deze bedragen groeien nog aan tot 31 december. Vul je nu je aangifte in, kies dan het jaar ervóór.':
    '{jaar} is still running: these amounts will keep growing until 31 December. If you are filling in your return now, pick the year before.',
  'Kijkt in: {categorieen}.': 'Looks in: {categorieen}.',
  'Twee dingen ziet dit scherm nooit: een overboeking tussen je eigen rekeningen (dat is geen uitgave) en een aflossing die je los van een categorie boekt. Staat je storting of je lening zo in de app, boek ze dan als uitgave met de juiste categorie.':
    'Two things this screen never sees: a transfer between your own accounts (that is not an expense) and a repayment you book without a category. If your contribution or your loan is entered that way, book it as an expense with the right category instead.',
  'Totaal per post': 'Total per item',
  'Komt in aanmerking': 'Qualifying amount',
  'Aantal met bon': 'Number with receipt',
  'Fiscaal jaaroverzicht': 'Annual tax overview',
  'Wat je dat jaar uitgaf onder een post die in je belastingaangifte staat, met het vak en de code erbij.':
    'What you spent that year under an item that appears in your tax return, with the box and code alongside.',
  'Inkomstenjaar': 'Income year',
  'Wat je in {jaar} betaalde, geef je aan in de aangifte van aanslagjaar {aj}.':
    'What you paid in {jaar} goes into the return for assessment year {aj}.',
  'De app verzamelt en telt op. Ze rekent niet uit wat je terugkrijgt: dat hangt af van je volledige aangifte. Dit is geen belastingadvies.':
    'The app collects and adds up. It does not work out what you get back: that depends on your full return. This is not tax advice.',
  'Voor aanslagjaar {aj} heeft de app geen lijst. In aanslagjaar 2026 verdween een reeks belastingverminderingen in één keer, dus een lijst uit die tijd zou vandaag posten tonen die niet meer bestaan — en een te korte lijst leest als "er valt niets af te trekken".':
    'The app has no list for assessment year {aj}. A whole set of tax reductions disappeared at once in assessment year 2026, so a list from back then would show items that no longer exist today — and a list that is too short reads as "there is nothing to deduct".',
  'De app vond in {jaar} geen boekingen onder een fiscale post. Boek je die uitgaven onder een andere categorie, dan vindt ze hier niets — hieronder staat per post waar ze kijkt.':
    'The app found no entries under a tax item in {jaar}. If you book those expenses under a different category, it will find nothing here — below you can see where it looks for each item.',
  'Dit bestaat niet meer': 'This no longer exists',
  'Je hebt hier nog boekingen onder staan, maar voor aanslagjaar {aj} valt er niets meer in te vullen.':
    'You still have entries under this, but there is nothing left to fill in for assessment year {aj}.',
  'Waar de app nog gekeken heeft': 'Where else the app looked',
  'Onder deze posten vond ze in {jaar} niets. Staat er iets dat je wél betaalde, dan is het waarschijnlijk onder een andere categorie geboekt.':
    'It found nothing under these items in {jaar}. If something here is an expense you did pay, it was probably booked under a different category.',
  'Exporteer als CSV': 'Export as CSV',
  'Het bestand is gedownload.': 'The file has been downloaded.',
  'Het bestand kon niet gemaakt worden. Probeer het opnieuw.': 'The file could not be created. Try again.',
  'Betaald in dit jaar': 'Paid this year',
  '{n} boeking(en)': '{n} entry/entries',
  '{n} met bon': '{n} with receipt',
  'Toon de {n} boeking(en)': 'Show the {n} entry/entries',
  'Verberg de boekingen': 'Hide the entries',
  '{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde en daalt de komende jaren nog. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.':
    '{pct}% of this amount qualifies: {bedrag}. That percentage belongs to the year in which you paid and drops further in the coming years. Whether you may actually claim the deduction depends on the conditions below.',
  '{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.':
    '{pct}% of this amount qualifies: {bedrag}. That percentage belongs to the year in which you paid. Whether you may actually claim the deduction depends on the conditions below.',
  '{vak} · code {codes}': '{vak} · code {codes}',
  '{vak} — de code hangt af van je situatie en staat op je attest':
    '{vak} — the code depends on your situation and is stated on your certificate',
  'Betaling': 'Payment',
  'Vak VIII': 'Box VIII',
  'Vak IX': 'Box IX',
  'Vak X': 'Box X',
  'Post': 'Item',
  'Vak': 'Box',
  'Code': 'Code',
  'Let op': 'Note',
  'Boeking': 'Entry',
  'Vervallen': 'Discontinued',
  'waarvan {pct}% aftrekbaar: {bedrag}': 'of which {pct}% deductible: {bedrag}',
  'ja': 'yes',
  'nee': 'no',
  'Betaalde onderhoudsuitkeringen': 'Maintenance payments you made',
  'Betalingen voor het pensioensparen': 'Pension savings contributions',
  'Premies van individuele levensverzekeringen (langetermijnsparen)':
    'Individual life insurance premiums (long-term savings)',
  'Giften': 'Donations',
  'Uitgaven voor kinderoppas': 'Childcare expenses',
  'Hypothecaire lening voor je eigen woning': 'Mortgage on your own home',
  'Dienstencheques': 'Service vouchers',
  'Alleen wat je regelmatig betaalt op grond van een wettelijke onderhoudsplicht, aan iemand die niet bij jou woont en in de EER of Zwitserland verblijft.':
    'Only what you pay regularly under a legal maintenance obligation, to someone who does not live with you and resides in the EEA or Switzerland.',
  'Je bent minstens 18, je laatste storting valt in het jaar waarin je 64 wordt, en de begunstigde moet aan de voorwaarden voldoen — een feitelijk samenwonende partner mag het niet zijn.':
    'You are at least 18, your last contribution falls in the year you turn 64, and the beneficiary must meet the conditions — a cohabiting partner is not allowed.',
  'Een contract van minstens tien jaar, afgesloten vóór je 65e, met jezelf of een verwante als begunstigde.':
    'A contract of at least ten years, taken out before you turn 65, with yourself or a relative as beneficiary.',
  'Alleen aan een ERKENDE instelling, die je daarvoor een fiscaal attest bezorgt.':
    'Only to a RECOGNISED institution, which gives you a tax certificate for it.',
  'Voor een kind ten laste jonger dan 14 jaar (jonger dan 21 bij een zware handicap), en je moet zelf een beroepsinkomen hebben.':
    'For a dependent child under 14 (under 21 with a severe disability), and you must have earned income yourself.',
  'Alleen voor leningen die al liepen: Vlaanderen schafte de woonbonus af voor nieuwe leningen, en de federale regeling verdween met aanslagjaar 2026.':
    'Only for loans already running: Flanders abolished the housing bonus for new loans, and the federal scheme ended with assessment year 2026.',
  'Gold voor cheques die je zelf kocht, met een attest van de uitgever.':
    'Applied to vouchers you bought yourself, with a certificate from the issuer.',
  'Kies je voor fiscaal co-ouderschap (de toeslag op de belastingvrije som delen), dan kan je deze aftrek in de regel niet óók vragen; alleen in het jaar van de feitelijke scheiding zelf kunnen ze samengaan. Dat is een keuze, geen berekening — de app maakt ze niet voor jou. Doen jullie een gezamenlijke aangifte en is de uitkering door jullie samen verschuldigd, dan bestaat daar een aparte code voor.':
    'If you opt for split tax parenthood (sharing the increase in the tax-free allowance), you generally cannot claim this deduction as well; only in the year of the actual separation can the two go together. That is a choice, not a calculation — the app does not make it for you. If you file jointly and the payment is owed by both of you together, there is a separate code for that.',
  'Op je rekeningafschrift ziet een storting voor pensioensparen er hetzelfde uit als een storting voor langetermijnsparen: dezelfde bank, hetzelfde soort bedrag. Welke van de twee het is, staat op het attest van je bank of verzekeraar. Neem het bedrag hieronder dus als geheugensteun, niet als eindcijfer.':
    'On your bank statement a pension savings contribution looks exactly like a long-term savings contribution: same bank, same kind of amount. Which of the two it is, is stated on the certificate from your bank or insurer. So take the amount below as a reminder, not as a final figure.',
  'Je maximum hangt af van je beroepsinkomen, en de storting is op je afschrift niet te onderscheiden van pensioensparen. Het attest van je verzekeraar bepaalt het bedrag.':
    'Your maximum depends on your earned income, and on your statement the contribution is indistinguishable from pension savings. The certificate from your insurer determines the amount.',
  'Twee dingen die de app niet aan een overschrijving kan zien: of de instelling erkend is, en of je bij díe instelling boven de jaarlijkse drempel komt. Die drempel geldt per instelling per jaar, niet over al je giften samen.':
    'Two things the app cannot tell from a transfer: whether the institution is recognised, and whether you pass the annual threshold at that particular institution. That threshold applies per institution per year, not across all your donations together.',
  'Het maximum geldt PER OPVANGDAG, en een schoolfactuur mengt opvang met maaltijden, uitstappen en materiaal — alleen het opvangdeel telt. Het attest van de opvang splitst dat; je bankboeking niet.':
    'The maximum applies PER DAY OF CARE, and a school invoice mixes childcare with meals, outings and materials — only the childcare part counts. The certificate from the childcare provider splits that out; your bank entry does not.',
  'Je maandelijkse domiciliëring is kapitaal, interest en schuldsaldoverzekering in één bedrag. Alleen het bankattest splitst dat, en alleen die opsplitsing hoort in de aangifte. Het bedrag hieronder is dus wat er van je rekening ging, niet wat je invult.':
    'Your monthly direct debit is capital, interest and mortgage protection insurance in one amount. Only the bank certificate splits that out, and only that breakdown belongs in the return. So the amount below is what left your account, not what you fill in.',
  'In Vlaanderen geven dienstencheques die je vanaf 2025 kocht geen belastingvoordeel meer, en er worden ook geen attesten meer uitgereikt. In Brussel en Wallonië bestaat de vermindering nog wél — daar gelden andere bedragen.':
    'In Flanders, service vouchers bought from 2025 onwards no longer give a tax benefit, and certificates are no longer issued. In Brussels and Wallonia the reduction does still exist — with different amounts.',
  // Doorklikken van een cijfer naar zijn boekingen (ronde 48/49)
  'Het gezin (zonder gezinslid)': 'The household (no family member)',
  'Subcategorieën — brood, koffiekoeken, elektriciteit… Klik je door, dan zie je de volledige boeking, dus een gesplitst kassaticket komt in zijn geheel in beeld.':
    'Subcategories — bread, pastries, electricity… Clicking through shows the whole entry, so a split receipt appears in full.',
  'Inkomsten {bedrag} — bekijk de boekingen': 'Income {bedrag} — view the entries',
  'Uitgaven {bedrag} — bekijk de boekingen': 'Expenses {bedrag} — view the entries',
  'Netto {bedrag} — bekijk alle boekingen van deze maand': 'Net {bedrag} — view all entries for this month',
  '{maand} — bekijk de boekingen': '{maand} — view the entries',
  '{oms} {bedrag} op {datum} — open deze boeking': '{oms} {bedrag} on {datum} — open this entry',
  'Bekijk ze allemaal': 'View them all',
  '{naam} {pct}% {bedrag} — bekijk de boekingen': '{naam} {pct}% {bedrag} — view the entries',
  'Uit je boeking van {datum}: {oms} — {bedrag}. Open die boeking.':
    'From your entry of {datum}: {oms} — {bedrag}. Open that entry.',
  'Bekijk die boekingen': 'View those entries',
  'Bekijk die boekingen — er kwam deze maand {gekregen} binnen':
    'View those entries — {gekregen} came in this month',
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
    'Note: for {n} record(s) the app cannot tell what unit the amounts are in. They were therefore NOT imported: read in the wrong unit, € 2,400 would show up as € 24. Nothing in your current data has changed. If those records come from another device, update the app there too.',
  'Let op: {n} regel(s) komen van een toestel met een NIEUWERE versie van de app. Deze app kan ze nog niet lezen, dus ze zijn niet ingelezen. Werk deze app bij (sluit hem helemaal af en open hem opnieuw) en probeer het dan nog eens.':
    'Note: {n} record(s) come from a device running a NEWER version of the app. This app cannot read them yet, so they were not imported. Update this app (close it completely and reopen it) and try again.',
  'Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet leesbaar.':
    'Synced: {gepusht} sent, {opgehaald} received, {geweigerd} unreadable.',
  'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig, {verouderd} uit een te oude versie (niet ingelezen).':
    'Restored: {toegevoegd} added, {overgeslagen} already present, {ongeldig} invalid, {verouderd} from too old a version (not imported).',
  // Uitwisselen met de andere ouder (ronde 44)
  'Categorie (optioneel)': 'Category (optional)',
  'Subcategorie (optioneel)': 'Subcategory (optional)',
  'minder': 'less',
  'Intrekken': 'Withdraw',
  'Terugdraaien': 'Undo',
  'Dit is dezelfde': 'This is the same one',
  'Toch niet dezelfde': 'Not the same after all',
  'Ingetrokken': 'Withdrawn',
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
  'De andere ouder komt op {hun}, jij op {jouw}. Eén cent verschil, door afronding.':
    'The other parent arrives at {hun}, you at {jouw}. One cent apart, due to rounding.',
  'Let op: de andere ouder komt op {hun}, jij op {jouw}.':
    'Note: the other parent arrives at {hun}, you at {jouw}.',
  '{n} kost(en) staan er al en zijn ongewijzigd.': '{n} cost(s) are already there and unchanged.',
  '{n} kost(en) staan in een ander dossier ({naam}) en worden hier niet nog eens ingelezen.':
    '{n} cost(s) are in another case ({naam}) and will not be read in here again.',
  '{n} antwoord(en) op jouw kosten. Die worden altijd overgenomen.':
    '{n} answer(s) to your costs. Those are always applied.',
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
  'De laatste keer is {maand}. Daarna telt deze post niet meer mee.': 'The last time is {maand}. After that this fixed cost no longer counts.',
  'De {n} boeking(en) van vóór en op deze dag tellen daarna niet meer apart mee — ze zitten al in dit bedrag. Ze blijven wel gewoon in je lijst staan.': 'The {n} entry/entries on and before this day will no longer count separately — they are already part of this amount. They do stay in your list.',
  'Er staat al een boeking van {bedrag} op {datum} ({naam}). Is dat dezelfde betaling?': 'There is already an entry of {bedrag} on {datum} ({naam}). Is that the same payment?',
  'Er staat al een waarde voor deze dag ({bedrag}). Die wordt vervangen.': 'There is already a value for this day ({bedrag}). It will be replaced.',
  'Geef een bedrag boven nul, of laat het veld leeg.': 'Enter an amount above zero, or leave the field empty.',
  'Gekoppeld aan een boeking': 'Linked to an entry',
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
  'Voor rekeningen die van waarde veranderen zonder boeking, zoals beleggingen of pensioensparen. Je geschiedenis blijft staan; de app rekent vanaf deze dag verder met het bedrag dat je hier invult.': 'For accounts whose value changes without any entry, such as investments or pension savings. Your history stays intact; from this day on the app continues from the amount you enter here.',
  'Op welke dag?': 'On which day?',
  'Werkelijke waarde (€)': 'Actual value (€)',
  'Waarde vastleggen': 'Record value',
  'Vul een datum en een bedrag in.': 'Enter a date and an amount.',
  'Bijwerken is niet gelukt. Probeer het opnieuw.': 'Updating failed. Please try again.',
  'Eerder vastgelegd': 'Recorded earlier',
  'Verwijder waardering van {datum}': 'Delete valuation of {datum}',
  'Waardering verwijderd': 'Valuation deleted',
  'Netto vermogen {bedrag}': 'Net worth {bedrag}',
  'Je zet er wel al {bedrag} per maand voor opzij; dat staat op Budget.': 'You do already set {bedrag} a month aside for it; you will find that on Budget.',
  'Je vaste lasten beginnen pas later. Zodra de eerste betaling er is, staat hier hoelang je toekomt.': 'Your fixed costs only start later. Once the first payment is there, this shows how long you can go.',
  'Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig, én vaste lasten om ze tegen af te zetten.': 'For "how long you can go" the app needs a savings or cash account, and fixed costs to weigh it against.',
  '{bedrag} telt hier nog niet mee: die kost begint pas later.': '{bedrag} does not count here yet: that cost only starts later.',
  '{bedrag} telt hier nog niet mee: die kosten beginnen pas later.': '{bedrag} does not count here yet: those costs only start later.',
  '{hoevaak}, vanaf een maand die je nog moet kiezen': '{hoevaak}, from a month you still have to pick',
  '{hoevaak}, vanaf {maand}': '{hoevaak}, from {maand}',
  'Eén oudere boeking valt buiten dit venster van {maanden} maanden.': 'One older entry falls outside this window of {maanden} months.',
  '{n} oudere boekingen vallen buiten dit venster van {maanden} maanden.': '{n} older entries fall outside this window of {maanden} months.',
  'Alle inkomsten in de gekozen periode, per hoofdcategorie. Een gesplitst kassaticket telt per regel mee.': 'All income in the chosen period, by main category. A split receipt counts line by line.',
  'Alle uitgaven in de gekozen periode, per hoofdcategorie. Een gesplitst kassaticket telt per regel mee.': 'All spending in the chosen period, by main category. A split receipt counts line by line.',
  'Alle inkomsten in de gekozen periode. Een bedrag voor meerdere gezinsleden is gelijk over hen verdeeld; het totaal telt elke boeking één keer.': 'All income in the chosen period. An amount for several family members is split equally between them; the total counts every entry once.',
  'Alle uitgaven in de gekozen periode. Een kost voor meerdere gezinsleden is gelijk over hen verdeeld; het totaal telt elke boeking één keer.': 'All spending in the chosen period. A cost for several family members is split equally between them; the total counts every entry once.',
  'Ook de rijen achter “Toon alle” tellen mee.': 'The rows behind “Show all” count too.',
  'Alle inkomsten in de gekozen periode, per subcategorie geteld — een gesplitst kassaticket dus per regel.': 'All income in the chosen period, counted per subcategory — so a split receipt counts line by line.',
  'Alle uitgaven in de gekozen periode, per subcategorie geteld — een gesplitst kassaticket dus per regel.': 'All spending in the chosen period, counted per subcategory — so a split receipt counts line by line.',
  'Alleen inkomsten met een omschrijving; een boeking zonder omschrijving staat hier niet in. Daardoor kan dit totaal lager zijn dan dat van de verdeling per categorie.': 'Only income with a description; an entry without one is not in here. This total can therefore be lower than the one for the breakdown by category.',
  'Alleen uitgaven met een omschrijving; een boeking zonder omschrijving staat hier niet in. Daardoor kan dit totaal lager zijn dan dat van de verdeling per categorie.': 'Only spending with a description; an entry without one is not in here. This total can therefore be lower than the one for the breakdown by category.',
  'betwist': 'disputed',
  'Alle kosten in dit dossier die nog niet afgerekend zijn, ongeacht de periode. Wat ingetrokken is telt niet mee; wat al in een afrekening staat die je nog niet als overgemaakt aanvinkte, telt hier nog wel mee.': 'Every cost in this file that has not been settled yet, whatever the period. Anything withdrawn does not count; anything already in a settlement you have not ticked as transferred still counts here.',
  'Alleen het openstaande kapitaal: hoofdsom min wat er terugbetaald is. Interest zit er niet in, en een afgesloten lening telt niet meer mee.': 'Only the outstanding capital: principal minus what has been repaid. Interest is not included, and a closed loan no longer counts.',
  'Alleen het openstaande kapitaal: hoofdsom min wat je al afbetaalde. De interest die je nog betaalt zit er niet in, en een afgesloten lening telt niet meer mee.': 'Only the outstanding capital: principal minus what you have already paid off. The interest you still pay is not included, and a closed loan no longer counts.',
  'Omgerekend naar één maand: een jaarpremie van € 1.200 telt hier als € 100. Op Budget staat daarnaast wat er in déze maand effectief vervalt — bij een post per kwartaal of per jaar is dat een ander bedrag.': 'Converted to one month: a yearly premium of €1,200 counts as €100 here. Budget also shows what actually falls due this particular month — for a quarterly or yearly entry that is a different amount.',
  'Je spaar- en cashrekeningen gedeeld door je vaste lasten per maand. Eten, tanken en andere losse uitgaven komen daar nog bij.': 'Your savings and cash accounts divided by your fixed costs per month. Food, fuel and other loose spending come on top of that.',
  '1 maand': '1 month',
  'Je rekeningen, plus wat men jou nog schuldig is, min wat jij nog schuldig bent. Alleen het openstaande kapitaal van een lening; de interest komt daar nog bij.': 'Your accounts, plus what others still owe you, minus what you still owe. Only the outstanding capital of a loan; the interest comes on top of that.',
  'Een gesplitst kassaticket telt per regel mee.': 'A split receipt counts line by line.',
  'Het eerste bedrag hierboven is het volledige saldo van {rekening} zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.': 'The first amount above is the full balance of {rekening} as it stands today — not just what you set aside since this goal.',
  'Deze drie cijfers gaan over de boekingen vanaf {maand}; oudere boekingen tellen niet mee.': 'These three figures cover the entries from {maand} onwards; older entries do not count.',
  'Het laatste punt is de stand aan het einde van de maand. Eén boeking van later deze maand telt er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.': 'The last point is the position at the end of the month. One entry dated later this month is already included, while the balance on your Overview counts up to today.',
  'Het laatste punt is de stand aan het einde van de maand. {n} boekingen van later deze maand tellen er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.': 'The last point is the position at the end of the month. {n} entries dated later this month are already included, while the balance on your Overview counts up to today.',
  'Hierin zit wat er deze maand al geboekt is, plus de terugkerende posten die déze maand vervallen — ook de te late. Losse uitgaven die nog komen — boodschappen, tanken — zitten er niet in.': 'This covers what has already been booked this month, plus the recurring entries that fall due this particular month — the late ones included. Loose spending still to come — groceries, fuel — is not in it.',
  'Eén ervan is betwist door de andere ouder en telt hier toch mee.': 'One of them is disputed by the other parent and still counts here.',
  '{n} ervan zijn betwist door de andere ouder en tellen hier toch mee.': '{n} of them are disputed by the other parent and still count here.',
  '1 betaling valt buiten deze periode en telt niet mee': '1 payment falls outside this period and does not count',
  '{n} betalingen vallen buiten deze periode en tellen niet mee': '{n} payments fall outside this period and do not count',
  'Alleen de posten in de categorieën uit de lijst “Sluipende kosten” hieronder. Een eigen categorie telt hier niet mee.': 'Only the entries in the categories from the “Creeping costs” list below. A category of your own does not count here.',
  'Er hangt nog een doel aan diezelfde rekening: hetzelfde geld telt bij allebei mee.': 'Another goal is linked to that same account: the same money counts towards both.',
  'Er hangen nog {n} doelen aan diezelfde rekening: hetzelfde geld telt bij allemaal mee.': '{n} other goals are linked to that same account: the same money counts towards all of them.',
  'Deze drie cijfers gaan over de {n} boekingen die je filters overhouden, en over niets anders.': 'These three figures cover the {n} entries your filters leave, and nothing else.',
  'Deze drie cijfers gaan over de ene boeking die je filters overhouden, en over niets anders.': 'These three figures cover the one entry your filters leave, and nothing else.',
  'Het bedrag rechts is dat van {maand}.': 'The amount on the right is the one for {maand}.',
  'Bekijk de boekingen van {naam} — {bedrag} in {maand}; de doorklik toont {periode}': 'View the entries for {naam} — {bedrag} in {maand}; the link shows {periode}',
  'Bij wat je nog moet betalen telt alleen het openstaande kapitaal mee; de interest komt daar nog bij.':
    'What you still owe counts only the outstanding capital; interest comes on top of that.',
  'Loopt tot en met': 'Runs through',
  'Laat leeg zolang de post doorloopt. Vul hem in wanneer je opzegt — de post blijft dan gewoon in je historiek staan.': 'Leave empty while the fixed cost continues. Fill it in when you cancel — the fixed cost then simply stays in your history.',
  'Gestopt': 'Stopped',
  '{naam} loopt niet meer vanaf {maand}. Er is niets geboekt.': '{naam} no longer runs from {maand}. Nothing was booked.',
  'Cash': 'Cash',
  // Categorieformulier
  // Budgetformulier
  'Budgetcategorie': 'Budget category',
  'Hoofdcategorieën': 'Main categories',
  'Eigen categorieën': 'Own categories',
  'Maandbudget (€)': 'Monthly budget (€)',
  'Voor welke maanden geldt dit?': 'Which months does this apply to?',
  'Alleen {maand}': 'Only {maand}',
  'Je vaste budget blijft staan; deze maand geldt dit bedrag.':
    'Your regular budget stays; this amount applies to this month.',
  'Dit bedrag geldt elke maand — behalve de maanden waarvoor je een apart budget zette.':
    'This amount applies every month — except the months you set a separate budget for.',
  'Alleen voor {maand} — je hebt hier geen vast budget voor.':
    'For {maand} only — you have no regular budget for this.',
  'Alleen voor {maand} — normaal is dit {bedrag}.': 'For {maand} only — normally this is {bedrag}.',
  'Verwijder het budget van {naam} voor {maand}': 'Delete the budget for {naam} for {maand}',
  'Je hebt ook een apart budget voor:': 'You also have a separate budget for:',
  'Voor deze maand staat er geen budget. Je budgetten gelden voor een andere maand.':
    'There is no budget for this month. Your budgets apply to another month.',
  'Budget instellen': 'Set budget',
  // Transactieformulier
  'Handelaar / winkel': 'Merchant / store',
  'Bedrag (€)': 'Amount (€)',
  ' — totaal van het ticket': ' — receipt total',
  'Kassaticket splitsen': 'Split receipt',
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
  'Typ om te zoeken (vanaf 2 letters)…': 'Type to search (from 2 letters)…',
  'eigen': 'own',
  // Itemzoeker
  // Categorieboom
  'Alle categorieën': 'All categories',
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
  'Nog geen dossiers. Maak er hieronder een aan.': 'No cases yet. Create one below.',
  'Gekozen dossier': 'Selected case',
  '(jij {p}%)': '(you {p}%)',
  'Verwijder dossier {naam}': 'Delete case {naam}',
  'betaald door {wie}': 'paid by {wie}',
  'jou': 'you',
  'partner': 'partner',
  'Bewerk kost {naam}': 'Edit expense {naam}',
  'Verwijder kost {naam}': 'Delete expense {naam}',
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
  'Uitgaven per categorie': 'Spending by category',
  'Deze rekening heeft nog {n} boeking(en). Archiveer ze in plaats van ze te verwijderen.':
    'This account still has {n} entr(ies). Archive it instead of deleting it.',
  'Een terugbetaling in dezelfde categorie verlaagt het verbruik. Daardoor kan dit cijfer lager liggen dan de uitgaven in de Analyse.':
    'A refund in the same category lowers the amount used. That is why this figure can be lower than the spending shown in Analysis.',
  'Achterstallig — inkomsten': 'Overdue — income',
  'Achterstallig — uitgaven': 'Overdue — expenses',
  '{n} vaste last(en) achterstallig — de dag is voorbij': '{n} fixed cost(s) overdue — the day has passed',
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
  'Van {datum}': 'From {datum}',
  'Tot {datum}': 'Until {datum}',
  'Wis filter {naam}': 'Clear filter {naam}',
  '+ “{naam}” toevoegen aan …': '+ Add “{naam}” to …',
  'Nieuwe subcategorie “{naam}”': 'New subcategory “{naam}”',
  'Subcategorie toevoegen': 'Add subcategory',
  // Ronde 9: desktoplayout
  'Budgetstatus': 'Budget status',
  'Nieuwe rekening': 'New account',
  'Rekening bewerken': 'Edit account',
  // Ronde 10: gezinsleden, dossiersoorten en rekenhulpen
  'Gezinsleden': 'Family members',
  'Stel je gezinsleden één keer in; je kan er kosten, doelen, leningen en garanties aan koppelen.':
    'Set up your family members once; you can link expenses, goals, loans and warranties to them.',
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
  'Geld dat jij uitleende of zelf leende, met terugbetalingen en openstaand kapitaal.':
    'Money you lent out or borrowed, with repayments and outstanding capital.',
  'Een aankoop met bon of factuur, waarvan de app de garantieperiode bewaakt.':
    'A purchase with a receipt or invoice, whose warranty period the app keeps an eye on.',
  'Rekenhulpen': 'Calculators',
  'Huur': 'Rent',
  'Geïndexeerde huur = basishuur × nieuwe index / aanvangsindex (Belgische formule).':
    'Indexed rent = base rent × new index / starting index (Belgian formula).',
  'Voor huur gebruik je de gezondheidsindex: de aanvangsindex is die van de maand vóór de ondertekening van het huurcontract.':
    'For rent, use the health index: the starting index is the one for the month before the lease was signed.',
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
  'Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.':
    'Note: when generated this was {bedrag}; the split for this case has changed since.',
  // Ronde 12: icoon en kleur voor eigen categorieën
  'Voorbeeld': 'Preview',
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
  'Overboekingen tellen hier niet mee: die verschuiven enkel geld tussen je eigen rekeningen.':
    'Transfers are not counted here: they only move money between your own accounts.',
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
  'Langetermijndoelen — buffers, grote aankopen, schuldenvrij.':
    'Long-term goals — buffers, big purchases, debt-free.',
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
  'Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).':
    'Indexed amount = base amount × new index / initial index (Belgian formula).',
  'Basisbedrag (€)': 'Base amount (€)',
  'Aanvangsindex': 'Initial index',
  'Nieuwe index': 'New index',
  'Geïndexeerd bedrag: {bedrag}': 'Indexed amount: {bedrag}',
  // Overboekingen
  'Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).':
    'Move money between your own accounts (not income or an expense).',
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
  'Voor wie? (optioneel)': 'For whom? (optional)',
  'Voor wie?': 'For whom?',
  'Duid je niemand aan, dan telt dit als een uitgave voor het gezin.':
    'If you select no one, this counts as an expense for the family.',
  // Ronde 30 — de hoofdcategorieën zitten achter één knop, en hun volgorde is
  // instelbaar op de Categorieën-pagina.
  'Selecteer hoofdcategorie (optioneel)': 'Select a main category (optional)',
  // Ronde 35 — correctheid, zichtbare mislukkingen en documenten die openen.
  '({bedrag} te veel)': '({bedrag} too much)',
  'Melding sluiten': 'Dismiss message',
  'stuks': 'pieces',
  'goedkoopste': 'cheapest',
  'De opslag van dit toestel zit vol. Verwijder een paar bonnetjes of foto’s en probeer opnieuw.':
    'This device’s storage is full. Delete a few receipts or photos and try again.',
  'Opslaan is niet gelukt. Je invoer staat er nog.': 'Saving failed. What you typed is still here.',
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
  'Hou per aankoop de garantie en de factuur bij. De app berekent de vervaldatum en waarschuwt vóór ze afloopt.':
    'Keep the warranty and invoice for each purchase. The app computes the expiry date and warns before it ends.',
  'Nog geen aankopen. Voeg er hieronder een toe.': 'No purchases yet. Add one below.',
  'Nieuwe aankoop': 'New purchase',
  'Aankoop bewerken': 'Edit purchase',
  'Garantie toevoegen': 'Add warranty',
  'Garantie wijzigen': 'Change warranty',
  'Garantie verwijderd': 'Warranty deleted',
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
  'aankoopdatum onleesbaar': 'purchase date unreadable',
  'vervaldatum onbekend': 'expiry date unknown',
  'verlopen': 'expired',
  'nog {n} dag(en)': '{n} day(s) left',
  'nog {n} maand(en)': '{n} month(s) left',
  // Zoeken & filteren over transacties (Ronde 3 · Brok H)
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
  'Toon enkel recente maanden': 'Show only recent months',
  // Instellingen (Ronde 3 · Brok I)
  'Instellingen': 'Settings',
  // Navigatie / pagina's (Ronde 5 · Brok Q)
  'Hoofdnavigatie': 'Main navigation',
  'Ga naar de inhoud': 'Skip to content',
  'Overzicht': 'Overview',
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
  'Uitgaven per winkel': 'Expenses by store',
  'Inkomsten per bron': 'Income by source',
  'Toon minder': 'Show less',
  'Toon alle {n} — incl. {m} overige': 'Show all {n} — incl. {m} other',
  'Overige ({n})': 'Other ({n})',
  'Totaal': 'Total',
  'Terug': 'Back',
  'van het totaal': 'of the total',
  'Per subcategorie': 'By subcategory',
  'Kassaticket gesplitst': 'Receipt split',
  // Vermogensevolutie (Ronde 5 · Brok S)
  'Vermogensevolutie': 'Net worth over time',
  // Trends & stijgers/dalers (Ronde 5 · Brok T)
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
  'Synchronisatie (Google Drive)': 'Sync (Google Drive)',
  'Synchroniseer je gegevens veilig tussen je toestellen via je eigen Google Drive. Enkel een back-uplogboek; je data blijft lokaal-eerst.':
    'Sync your data safely across your devices via your own Google Drive. Only a backup log; your data stays local-first.',
  'Sluiten': 'Close',
  // De vraag bij het sluiten van een half ingevuld formulier (ronde 55)
  'Je invoer is nog niet opgeslagen': 'What you typed has not been saved yet',
  'Je invoer is nog niet opgeslagen. Wil je ze weggooien?': 'What you typed has not been saved yet. Do you want to discard it?',
  'Verder invullen': 'Keep filling in',
  // De melding dat er een nieuwe versie klaarstaat (ronde 56)
  'Er is een nieuwe versie van de app. Herlaad om ze te gebruiken — je gegevens blijven staan.':
    'There is a new version of the app. Reload to use it — your data stays put.',
  'Herlaad': 'Reload',
  'Dit onderdeel kon niet geladen worden. Herlaad de pagina en probeer het opnieuw.':
    'This part could not be loaded. Reload the page and try again.',
  'Dit onderdeel kon niet geladen worden omdat je geen verbinding hebt. Probeer het opnieuw zodra je weer online bent.':
    'This part could not be loaded because you are offline. Try again once you are back online.',
  'Weggooien': 'Discard',
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
  'Dat is niet bewaard — je scherm staat weer zoals het was.':
    'That was not saved — your screen is back the way it was.',
  'Document verwijderd': 'Document deleted',
  'Document verwijderd. Het stond in dit dossier als grondslag van de verdeling; die aanduiding is mee weg.': 'Document deleted. It was selected in this case as the basis for the split; that selection is gone with it.',
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
  'Typ {woord} om te bevestigen': 'Type {woord} to confirm',
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
  'Wil je je gegevens ook op je andere toestellen? Verbind dan later even met Google Drive via Instellingen.':
    'Want your data on your other devices too? Connect to Google Drive later via Settings.',
  'Geef een handelaar en een bedrag om op te slaan.': 'Enter a merchant and an amount to save.',
  'Zo verschijnt dit doel straks in de lijst.': 'This is how the goal will look in the list.',
  // Ronde 17 — meldingen, balans, besparen en privacy
  'Budget {naam} is overschreden ({pct}%)': 'Budget {naam} is over budget ({pct}%)',
  'Budget {naam} is {pct}% verbruikt': 'Budget {naam} is {pct}% used',
  'Garantie op {product} verloopt binnen {n} dag(en)': 'Warranty on {product} expires in {n} day(s)',
  'Meldingen ({n})': 'Notifications ({n})',
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
  'De back-up staat in jouw Google Drive': 'The backup is in your own Google Drive',
  'Verbind je Drive, dan schrijft de app een logboek in één eigen map in jouw Drive. De app krijgt alleen toegang tot de bestanden die ze zelf maakt, niet tot de rest van je Drive. Die back-up is niet extra versleuteld: wie bij je Google-account kan, kan ze lezen — beveilig dat account dus goed.':
    'If you connect Drive, the app writes a log into a single folder of its own in your Drive. It can only reach the files it creates itself, not the rest of your Drive. That backup is not separately encrypted: anyone who can reach your Google account can read it — so protect that account well.',
  'Wat er wél het toestel verlaat': 'What does leave the device',
  'Loopt de app vast, dan wordt een technisch foutrapport verstuurd (welke fout, welke browser) — nooit een bedrag of een naam. Verder gaat er niets weg.':
    'If the app crashes, a technical error report is sent (which error, which browser) — never an amount or a name. Nothing else leaves.',
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
  'Sorteer op': 'Sort by',
  'Sorteer op {kolom}': 'Sort by {kolom}',
  'Alles selecteren': 'Select all',
  'Selecteer {oms}': 'Select {oms}',
  '{n} geselecteerd': '{n} selected',
  'Selectie wissen': 'Clear selection',
  'Ja, verwijder {n}': 'Yes, delete {n}',
  'Gedeeld in een dossier': 'Shared in a case',
  'gedeeld': 'shared',
  // Ronde 25 — vaste inkomsten, budgetdiepte en inboeken ongedaan maken
  'Vaste inkomsten': 'Recurring income',
  'Vaste inkomst toevoegen': 'Add recurring income',
  'Je loon en alles wat elke maand binnenkomt. Hierop rekent je plan.':
    'Your salary and everything that comes in every month. This is what your plan is based on.',
  'Nog geen vaste inkomsten. Vul hieronder je loon in, anders weet je plan niet wat er te verdelen valt.':
    'No recurring income yet. Add your salary below, otherwise your plan cannot tell what there is to allocate.',
  'Nog geen vaste lasten.': 'No fixed costs yet.',
  'Er kwam deze maand {gekregen} binnen — precies je vaste inkomsten.':
    '{gekregen} came in this month — exactly your recurring income.',
  'Er kwam deze maand {gekregen} binnen — {verschil} meer dan je vaste inkomsten.':
    '{gekregen} came in this month — {verschil} more than your recurring income.',
  'Er kwam deze maand {gekregen} binnen — {verschil} minder dan je vaste inkomsten.':
    '{gekregen} came in this month — {verschil} less than your recurring income.',
  'Uitboeken': 'Unrecord',
  'Inboeken ongedaan gemaakt': 'Recording undone',
  '{naam} ingeboekt': '{naam} recorded',
  // Ronde 26 — de Analyse-pagina
  'Toon details van {naam}': 'Show details for {naam}',
  // Ronde 27 — een eigen boom en de Categorieën-pagina
  '+ categorie': '+ category',
  'Naam categorie': 'Category name',
  'Nieuwe categorie in {naam}': 'New category in {naam}',
  'Voeg categorie toe aan {naam}': 'Add a category to {naam}',
  'Vouw open om te bekijken. Je kan op elk niveau iets toevoegen.':
    'Expand to browse. You can add something at every level.',
  'Zoek een categorie': 'Search for a category',
  'Niets gevonden voor deze zoekterm.': 'Nothing found for this search.',
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
  'In je bankapp of op de website van je bank zoek je bij je rekeninguittreksels naar "exporteren" of "downloaden". Kies daar het formaat CSV (soms staat er "CSV/Excel"). Kompal kan geen pdf lezen — dat is een afdruk, geen bestand met cijfers erin.':
    'In your banking app or on your bank\u2019s website, look for "export" or "download" near your statements. Choose the CSV format there (sometimes labelled "CSV/Excel"). Kompal cannot read a PDF — that is a printout, not a file with figures in it.',
  'Categorie voor de {n} regels zonder voorstel (optioneel)':
    'Category for the {n} rows without a suggestion (optional)',
  // Ronde 40 — doorklikken, vindbaarheid en de klokken
  'Bekijk de boekingen van {naam} ›': 'View the entries for {naam} ›',
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
  'Vul een bedrag groter dan nul in.': 'Enter an amount greater than zero.',
  'Er staat geen enkele open kost in deze selectie.': 'There is no open cost in this selection.',
  'Geef een naam om op te slaan.': 'Enter a name to save.',
  'Geef een productnaam en een garantieduur in maanden om op te slaan.':
    'Enter a product name and a warranty period in months to save.',
  'Er staat een getal bij de kredietkaart dat de app niet kan gebruiken. Pas het aan om op te slaan.':
    'There is a number in the credit card fields the app cannot use. Change it to save.',
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
  'De app kent deze maand al. Vul je hier iets in, dan gaat jouw cijfer voor.':
    'The app already knows this month. If you enter something here, your figure takes precedence.',
  'Indexcijfer toevoegen': 'Add index figure',
  'Verwijder je eigen indexcijfer voor {maand}': 'Delete your own index figure for {maand}',
  '{basis} x {nieuw} / {aanvang} = {uit}': '{basis} x {nieuw} / {aanvang} = {uit}',
  'De aanvangsindex is niet bekend: de app kent geen indexcijfer voor {maand}.':
    'The starting index is unknown: the app has no index figure for {maand}.',
  'Aanvangsindex {index}, zoals ze in de akte staat.':
    'Starting index {index}, as stated in the deed.',
  'Let op: de indexcijfers van de app staan in basis {jaar} = 100. Staat er in je vonnis een aanvangsindex uit een ouder basisjaar, vul die dan hier in én gebruik ook voor de nieuwe index een cijfer uit datzelfde basisjaar. Twee cijfers uit verschillende basisjaren geven een bedrag dat er juist uitziet en het niet is.':
    'Note: the app’s index figures use base {jaar} = 100. If your court order states a starting index from an older base year, enter it here and also use a figure from that same base year for the new index. Two figures from different base years produce an amount that looks right and is not.',
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
  // Onderhoudsbijdrage — de begeleidende brief
  'Betreft: indexatie van de onderhoudsbijdrage voor {namen}':
    'Subject: indexation of the maintenance contribution for {namen}',
  'Betreft: indexatie van de onderhoudsbijdrage':
    'Subject: indexation of the maintenance contribution',
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
  // Ronde 64 — de Budget-pagina legt zichzelf uit
  'Nog niets om te verdelen': 'Nothing to divide yet',
  'Deze tab rekent uit wat er overblijft van je inkomen. Daarvoor moet ze weten wat er binnenkomt en wat er elke maand vastligt — dat vul je in bij "Vast".':
    'This tab works out what is left of your income. For that it needs to know what comes in and what is fixed each month — you enter that under "Fixed".',
  'Naar je vaste inkomsten en lasten': 'To your fixed income and costs',
  'Losmaken': 'Unlink',
  'Losmaken: {naam} telt dan weer als niet geboekt': 'Unlink: {naam} counts as not booked again',
  'Je plan voor deze maand: wat er binnenkomt, wat vastligt, en waar je zelf een grens op zet.':
    'Your plan for this month: what comes in, what is fixed, and where you set your own limit.',
  'Onderdeel van je budget': 'Part of your budget',
  'Vast': 'Fixed',
  'Zo werkt dit': 'How this works',
  'Wat blijft er over? — zo werkt dit': 'What is left? — how this works',
  'Kompal telt op wat er deze maand al binnenkwam plus je vaste inkomsten die nog moeten komen, trekt daar je vaste lasten van af en ook wat je maandelijks opzijzet, en wat overblijft is wat je vrij te verdelen hebt.':
    'Kompal adds up what already came in this month plus the fixed income still to come, subtracts your fixed costs and what you set aside each month, and what remains is yours to divide freely.',
  'Klopt dit cijfer niet? Kijk dan bij "Vast" of je loon en al je vaste lasten erin staan. Deze tab rekent alleen; invullen doe je daar.':
    'Does this figure look wrong? Check under "Fixed" whether your salary and all your fixed costs are in there. This tab only calculates; you enter things there.',
  'Wat ligt vast? — zo werkt dit': 'What is fixed? — how this works',
  'Hier zet je alles wat elke maand terugkomt: je loon, je huur, je abonnementen. Je geeft het één keer in, en Kompal weet er daarna elke maand van.':
    'This is where you put everything that comes back every month: your salary, your rent, your subscriptions. You enter it once, and Kompal knows about it every month after that.',
  'Zo’n vaste last is nog geen boeking. Betaal je hem, dan tik je die betaling gewoon in zoals elke andere uitgave — herkent Kompal ze als deze vaste last, dan vraagt ze of die betaling erbij hoort. Of je drukt hier op "Boek in" en dan maakt ze de boeking voor je.':
    'A fixed cost is not an entry yet. When you pay it, you enter that payment like any other expense — if Kompal recognises it as this fixed cost, it asks whether it may join the two. Or you press "Book" here and it creates the entry for you.',
  'Pas als er een boeking is, telt het bedrag mee in je budgetten en in de analyse.':
    'Only once there is an entry does the amount count towards your budgets and your analysis.',
  'Wat wil je beperken? — zo werkt dit': 'What do you want to limit? — how this works',
  'Een budget is een grens die je zelf op een categorie zet: "aan Voeding wil ik deze maand niet meer dan € 400 uitgeven". Kompal telt er alle boekingen van die categorie in deze maand bij op en laat de balk meelopen.':
    'A budget is a limit you set on a category yourself: "this month I do not want to spend more than € 400 on Groceries". Kompal adds up every entry in that category this month and moves the bar along.',
  'Een vaste last verbruikt je budget zodra ze geboekt is — precies zoals elke andere uitgave in die categorie.':
    'A fixed cost uses up your budget as soon as it is booked — exactly like any other expense in that category.',
  'Staat het er niet bij? Voeg het zelf toe bij je vaste lasten.':
    'Not in the list? Add it yourself under your fixed costs.',
  'Naar je vaste lasten': 'To your fixed costs',
  // De vraag "is dit je vaste last?"
  'Hoort dit bij een vaste last?': 'Does this belong to a fixed cost?',
  'Is dit al betaald?': 'Has this already been paid?',
  'Je boekte {bedrag} en dat lijkt op je vaste last {naam} ({vast} per maand) — zelfde rekening, zelfde categorie, en die is deze maand nog niet afgepunt.':
    'You booked {bedrag}, and that looks like your fixed cost {naam} ({vast} per month) — same account, same category, and it has not been ticked off this month.',
  'Er staat deze maand al een boeking van {bedrag} op {datum} ({omschrijving}) die op {naam} lijkt. Je vaste last staat op {vast}.':
    'There is already an entry of {bedrag} on {datum} ({omschrijving}) this month that looks like {naam}. Your fixed cost is set to {vast}.',
  'Zeg je ja, dan telt deze boeking als je vaste last van deze maand: ze verdwijnt uit "nog te boeken" en het belletje zwijgt erover. Er wordt niets bijgemaakt en je bedrag verandert niet.':
    'If you say yes, this entry counts as your fixed cost for this month: it disappears from "still to book" and the bell goes quiet about it. Nothing is added and your amount does not change.',
  'Ja, dit is die betaling': 'Yes, this is that payment',
  'Nee, aparte uitgave': 'No, separate expense',
  'Nee, boek {vast} bij': 'No, add {vast}',
  '{naam} staat nu als betaald voor deze maand.': '{naam} now counts as paid for this month.',
  // Ronde 63 — je gegevens raken niet kwijt
  'Laatste synchronisatie: {datum}.': 'Last sync: {datum}.',
  'Niet verbonden. Laatste synchronisatie: {datum}.': 'Not connected. Last sync: {datum}.',
  'Verbonden, maar er ging nog niets naar Drive.': 'Connected, but nothing has gone to Drive yet.',
  'Je browser heeft toegezegd deze gegevens niet zomaar te wissen.':
    'Your browser has promised not to clear this data on a whim.',
  'Je browser mag deze gegevens wissen wanneer je toestel plaats nodig heeft. Zet de app op je beginscherm en maak af en toe een back-up.':
    'Your browser may clear this data when your device needs space. Add the app to your home screen and make a backup now and then.',
  'Laatste back-up op dit toestel: {datum}.': 'Last backup on this device: {datum}.',
  'Je maakte op dit toestel nog geen enkele back-up.': 'You have not made a single backup on this device yet.',
  'Niet verbonden. Je gegevens staan alleen in deze browser, op dit toestel.':
    'Not connected. Your data lives only in this browser, on this device.',
  'Veilig bewaren': 'Keeping it safe',
  'Waar staan je gegevens?': 'Where is your data?',
  'Kompal bewaart alles in deze browser, op dit toestel. Dat is de reden dat je geen account nodig hebt — en meteen ook de reden dat je er zelf een kopie van moet hebben.':
    'Kompal keeps everything in this browser, on this device. That is why you need no account — and also why you need a copy of your own.',
  'Een browser die opgeruimd wordt, een toestel dat stukgaat of verloren raakt: dan is alles weg. Er zijn twee vangnetten, en één ervan volstaat. Google Drive doet het vanzelf; een back-upbestand doe je zelf, en dat werkt ook zonder Google.':
    'A browser that gets cleaned up, a device that breaks or goes missing: then everything is gone. There are two safety nets, and one of them is enough. Google Drive does it by itself; a backup file you do yourself, and that works without Google too.',
  // Het belletje (deze drie staan in meldingen.ts en vallen dus buiten de dekkingstest)
  'Je maakte nog nooit een back-up. Je gegevens staan alleen in deze browser.':
    'You have never made a backup. Your data lives only in this browser.',
  'Je laatste back-up is {dagen} dagen geleden. Je gegevens staan alleen op dit toestel.':
    'Your last backup was {dagen} days ago. Your data lives only on this device.',
  'Er ging al {dagen} dagen niets meer naar Google Drive. Kijk je verbinding na of maak een back-up.':
    'Nothing has gone to Google Drive for {dagen} days. Check your connection or make a backup.',
  // Ronde 72 — "Wat komt eraan": je vaste lasten over twaalf maanden
  'Wat komt eraan': 'What is coming up',
  'Je vaste lasten per maand, {venster}.': 'Your fixed costs per month, {venster}.',
  'Zodra je vaste lasten hebt ingevuld, zie je hier in welke maand ze vervallen.':
    'Once you have entered your fixed costs, you will see here in which month they fall due.',
  'Elke staaf is wat er die maand aan vaste lasten vervalt, met het volle bedrag — een jaarpremie staat dus één keer voluit en elf maanden op nul. Je inkomsten en je losse uitgaven zoals boodschappen zitten er niet in, en ook niet wat je apart bijhoudt bij Leningen, bij een onderhoudsbijdrage, bij de kindrekening of bij een spaardoel.':
    'Each bar is the fixed costs falling due that month, at their full amount — an annual premium therefore appears once in full and at zero for eleven months. Your income and your day-to-day spending such as groceries are not included, and neither is anything you keep separately under Loans, a maintenance contribution, the children\'s account or a savings goal.',
  'Alleen wat je bij je vaste lasten invulde, met het volle bedrag in de maand dat het vervalt — geen inkomsten, geen losse uitgaven, en niet wat je apart bijhoudt bij Leningen of bij een onderhoudsbijdrage.':
    'Only what you entered as fixed costs, at its full amount in the month it falls due — no income, no day-to-day spending, and nothing you keep separately under Loans or a maintenance contribution.',
  '{maand}: geen vaste lasten': '{maand}: no fixed costs',
  '{maand}: {bedrag} aan vaste lasten': '{maand}: {bedrag} in fixed costs',
  '{maand}: {bedrag} aan vaste lasten — deze maand loopt al':
    '{maand}: {bedrag} in fixed costs — this month is already under way',
  'Gemiddeld {bedrag} aan vaste lasten per maand over deze twaalf maanden':
    'On average {bedrag} in fixed costs a month over these twelve months',
  '* {maand} loopt al; een deel van die staaf is wellicht al betaald.':
    '* {maand} is already under way; part of that bar may already have been paid.',
  'Je zwaarste maand is {maand}: {bedrag} aan vaste lasten.':
    'Your heaviest month is {maand}: {bedrag} in fixed costs.',
  '{n} maanden zijn even zwaar, met {bedrag} aan vaste lasten. De eerste is {maand}.':
    '{n} months are equally heavy, at {bedrag} in fixed costs. The first is {maand}.',
  'Elke maand kost je evenveel: {bedrag} aan vaste lasten.': 'Every month costs you the same: {bedrag} in fixed costs.',
  'Van wat de app kan plaatsen kost elke maand evenveel: {bedrag}.':
    'Of what the app can place, every month costs the same: {bedrag}.',
  'Van wat de app kan plaatsen is {maand} de zwaarste maand: {bedrag}.':
    'Of what the app can place, {maand} is the heaviest month: {bedrag}.',
  'Van wat de app kan plaatsen zijn {n} maanden even zwaar, met {bedrag}. De eerste is {maand}.':
    'Of what the app can place, {n} months are equally heavy, at {bedrag}. The first is {maand}.',
  'In deze twaalf maanden vervalt er geen enkele vaste last.': 'No fixed cost falls due in these twelve months.',
  'In deze twaalf maanden vervalt er geen enkele vaste last waarvan de app de maand kent.':
    'No fixed cost whose month the app knows falls due in these twelve months.',
  '{n} vaste last(en) staan hier niet in, omdat de app niet weet in welke maand ze vervallen: {namen}. Ze tellen nergens op deze kaart mee. Vul bij Budget › Vast hun eerste betaling in.':
    '{n} fixed cost(s) are missing here, because the app does not know in which month they fall due: {namen}. Nothing on this card counts them. Enter their first payment under Budget › Fixed.',
  'Van wat de app kan plaatsen vervalt er na {maand} niets meer. Van de vaste last(en) waarvan ze de maand niet kent, kan ze niets zeggen.':
    'Of what the app can place, nothing falls due after {maand}. About the fixed cost(s) whose month it does not know, it can say nothing.',
  '{n} vaste last(en) staan hier niet in en tellen niet mee in deze cijfers: de app weet niet in welke maand ze vervallen.':
    '{n} fixed cost(s) are missing here and are left out of these figures: the app does not know in which month they fall due.',
  '{namen} en {n} andere': '{namen} and {n} more',
  'Over wat de app kan plaatsen verandert er verder vooruit niets meer. Van de vaste last(en) waarvan ze de maand niet kent, kan ze niets zeggen.':
    'For what the app can place, nothing changes further ahead. About the fixed cost(s) whose month it does not know, it can say nothing.',
  '‹ Vorige twaalf maanden': '‹ Previous twelve months',
  'Volgende twaalf maanden ›': 'Next twelve months ›',
  'Verder vooruit verandert er niets meer: vanaf hier herhaalt elk jaar zich.':
    'Nothing changes further ahead: from here on every year repeats itself.',
  'Na {maand} vervalt er geen enkele vaste last meer.': 'After {maand} no fixed cost falls due any more.',
  'Verder vooruit verandert er niets meer.': 'Nothing changes further ahead.',
  'Toon per maand': 'Show per month',
  'Verberg per maand': 'Hide per month',
  'geen vaste lasten': 'no fixed costs',
  '{n} vaste last(en)': '{n} fixed cost(s)',
  'waaronder {namen}': 'including {namen}',
  'Bekijk vooruit': 'Look ahead',
  // Ronde 73 — de aanvinklijst wordt een lijst met voorstellen
  'Nog niets toegevoegd': 'Nothing added yet',
  '{n} kosten toegevoegd': '{n} costs added',
  'Hier heb je nog niets toegevoegd. Gebruik de knop hiernaast.':
    'You have not added anything here yet. Use the button next to it.',
  'Je vulde er {gedaan} van de {totaal} in.': 'You filled in {gedaan} of {totaal}.',
  'Klap alles open': 'Expand all',
  'Klap alles dicht': 'Collapse all',
  'Klap alles open — {titel}': 'Expand all — {titel}',
  'Klap alles dicht — {titel}': 'Collapse all — {titel}',
  'Toon alleen wat ik al heb': 'Show only what I already have',
  'Toon alleen wat ik al heb — {titel}': 'Show only what I already have — {titel}',
  'Je hebt hier nog niets ingevuld. Zet de filter uit om alle voorstellen te zien.':
    'You have not filled anything in here yet. Turn the filter off to see every suggestion.',
  '{naam} bewaard: {bedrag} {periode}.': '{naam} saved: {bedrag} {periode}.',
  '{naam} toevoegen': 'Add {naam}',
  '{naam} wijzigen': 'Edit {naam}',
  'Klik op een kost om te zien wat je al hebt, of voeg er een toe. Het invulvenster vraagt alles in één keer.':
    'Click a cost to see what you already have there, or add one. The form asks for everything in one go.',
  'De kleine abonnementen waar je nooit meer naar omkijkt. Samen zijn ze vaak groter dan je denkt.':
    'The small subscriptions you never look at again. Together they are often bigger than you think.',
  'Toevoegen — {naam}': 'Add — {naam}',
  'Bewerken — {naam}, {details}': 'Edit — {naam}, {details}',
  'Verwijderen — {naam}, {details}': 'Delete — {naam}, {details}',
  'Er staat al een vaste last die zo heet. Is dit een tweede, geef ze dan een eigen naam — dan zie je later welke welke is.':
    'There is already a fixed cost by that name. If this is a second one, give it its own name — then you can tell them apart later.',
  // Ronde 74 — een spaardoel dat weet welke vaste last het dient
  'Waarvoor spaar je? (optioneel)': 'What are you saving for? (optional)',
  'Voor niets in het bijzonder': 'Nothing in particular',
  '{naam} kost {bedrag} en valt de volgende keer op {datum}. Zolang dit doel eraan hangt, vraagt Budget er niet meer apart geld voor opzij te zetten.':
    '{naam} costs {bedrag} and falls due next on {datum}. While this goal is attached to it, Budget no longer asks you to set money aside for it separately.',
  '{naam} kost {bedrag}, maar er komt geen betaling meer.':
    '{naam} costs {bedrag}, but no further payment is coming.',
  'Hang dit doel aan een vaste last die niet elke maand valt — een jaarpremie bijvoorbeeld. Dan weet de app waarvoor je spaart en vraagt ze het geld geen tweede keer.':
    'Attach this goal to a fixed cost that does not fall every month — a yearly premium, for instance. Then the app knows what you are saving for and will not ask for the money twice.',
  'Kost bestaat niet meer': 'Cost no longer exists',
  'De vaste last waarvoor je spaarde, staat niet meer in je vaste lasten. Het doel blijft gewoon lopen.':
    'The fixed cost you were saving for is no longer among your fixed costs. The goal simply carries on.',
  'Voor {naam}, de volgende keer op {datum}.': 'For {naam}, next due on {datum}.',
  'Die kost is {bedrag}; je doelbedrag staat op iets anders.':
    'That cost is {bedrag}; your target amount says something else.',
  'Je doeldatum ligt ná die betaling, dus aan dit tempo ben je te laat.':
    'Your target date falls after that payment, so at this pace you will be late.',
  'Voor {namen} rekent dit met je spaardoel, niet met een deling van het jaarbedrag.':
    'For {namen} this uses your savings goal, not a division of the yearly amount.',
  'De kost waaraan dit doel hangt': 'The cost this goal is attached to',
  'Onbekende kost': 'Unknown cost',
  'Dit doel hangt aan een kost die niet meer in je lijst staat, of die niet meer om vooraf sparen vraagt. Kies "Voor niets in het bijzonder" om de koppeling los te maken.':
    'This goal is attached to a cost that is no longer in your list, or that no longer calls for saving up front. Pick "Nothing in particular" to detach it.',
  'Je spaarde voor {naam}, maar daar komt geen betaling meer van.':
    'You were saving for {naam}, but no further payment is coming for it.',
  'Aan je huidige tempo heb je pas ná die betaling genoeg bij elkaar.':
    'At your current pace you will only have enough after that payment.',
  'Er hangt nog een doel aan diezelfde kost; je spaart er dus dubbel voor.':
    'Another goal is attached to that same cost, so you are saving for it twice.',
  'Er hangen nog {n} doelen aan diezelfde kost; je spaart er dus meervoudig voor.':
    '{n} more goals are attached to that same cost, so you are saving for it several times over.',
  'Je plan rekent hiervoor met je spaardoel {doel}: {bedrag} per maand.':
    'Your plan uses your savings goal {doel} for this: {bedrag} a month.',
  ' · via je spaardoel {doel}': ' · through your savings goal {doel}',
  // Ronde 75 — minder tegelijk
  'Wat wil je zien?': 'What do you want to see?',
  'Zet uit wat je niet gebruikt. Het verdwijnt alleen uit je menu — er gaat niets verloren, en je kan het hier altijd terugzetten.':
    'Switch off what you do not use. It only disappears from your menu — nothing is lost, and you can always bring it back here.',
  'Toon me alleen de basis': 'Show me just the basics',
  'Zet alles weer aan': 'Switch everything back on',
  'Hier staat nog 1 ding in. Het blijft bewaard.': 'There is still 1 thing in here. It stays saved.',
  'Hier staan nog {n} dingen in. Ze blijven bewaard.': 'There are still {n} things in here. They stay saved.',
  'Kosten delen met de andere ouder, geld dat je uitleende, en je garantiebewijzen.':
    'Sharing costs with the other parent, money you lent out, and your proofs of warranty.',
  'Grafieken over waar je geld naartoe ging, en hoe dat evolueert.':
    'Charts showing where your money went, and how that changes over time.',
  'Het bestand van je bank inlezen in plaats van je boekingen zelf in te tikken.':
    'Reading in your bank file instead of typing your entries yourself.',
  'Een maand rondmaken: staat alles erin, en wat hield je over?':
    'Rounding off a month: is everything in, and what did you have left?',
  'De lijst waarin je boekingen ingedeeld worden, aanpassen of uitbreiden.':
    'Adjusting or extending the list your entries get sorted into.',
  'Losse rekenmachines: hoeveel per maand voor een doel, en wat een indexatie doet.':
    'Standalone calculators: how much a month for a goal, and what indexation does.',
  'Een overzicht van de uitgaven die je op je belastingbrief kan zetten.':
    'An overview of the expenses you can put on your tax return.',
  'Wat elk gezinslid je per maand kost.': 'What each family member costs you per month.',
  'Bovenaan kies je wat je in de app wil zien, en zet je de app op je beginscherm. Daarna kleuren, taal en meldingen; dan alles rond het bewaren van je gegevens, je gezinsleden, en helemaal onderaan de knop die alles wist.':
    'At the top you choose what you want to see in the app, and put the app on your home screen. Then colours, language and alerts; then everything about keeping your data safe, your family members, and right at the bottom the button that wipes everything.',
  'Alle pagina\'s staan aan.': 'Every page is switched on.',
  'Eén pagina staat uit.': 'One page is switched off.',
  '{n} pagina\'s staan uit.': '{n} pages are switched off.',
  'Een uitgezette pagina verdwijnt uit je menu, maar blijft bestaan: alles wat erin staat blijft bewaard, en hier zet je haar met één tik terug.':
    'A page you switch off disappears from your menu but keeps existing: everything in it stays saved, and one tap here brings it back.',
  'Potjes voor later: een buffer, een grote aankoop, of sparen voor een jaarafrekening.':
    'Pots for later: a buffer, a big purchase, or saving up for a yearly bill.',
}
const fr: Record<string, string> = {
  // Ronde 66 — dernière relecture : la première étape là où elle manquait encore
  'Naar "Je situatie"': 'Vers « Ta situation »',
  'Eerst een rekening': 'D’abord un compte',
  'Maak je eerste rekening aan': 'Crée ton premier compte',
  'Een boeking moet ergens op staan. Maak eerst een rekening aan — je betaalrekening, je spaarrekening, of gewoon je portemonnee.':
    'Une écriture doit reposer quelque part. Crée d’abord un compte — ton compte courant, ton compte d’épargne, ou tout simplement ton portefeuille.',
  'Vul je vaste inkomsten in': 'Encode tes revenus fixes',
  'De app kent je vaste inkomsten nog niet — je loon bijvoorbeeld. Vul je die in bij "Vast", dan berekent ze wat er te verdelen valt.':
    'L’app ne connaît pas encore tes revenus fixes — ton salaire, par exemple. Encode-les sous « Fixe » et elle calculera ce qu’il reste à répartir.',
  'Nog geen boekingen. Hier komt elke uitgave en elke inkomst te staan die je ingeeft.':
    'Pas encore d’écritures. Chaque dépense et chaque revenu que tu encodes apparaîtra ici.',
  // Ronde 66 — dernière relecture, deuxième série
  'Stel je gezinsleden in': 'Configure les membres de ton foyer',
  'Je hebt nog geen gezinsleden ingesteld. Zodra ze er zijn, kan je ze bij een boeking of bij een gedeelde kost aanduiden — en verschijnt hier per gezinslid wat het kost.':
    'Tu n’as encore configuré aucun membre du foyer. Dès qu’ils existent, tu peux les associer à une écriture ou à un frais partagé — et cette page montrera ce que chacun coûte.',
  'Maak eerst een rekening aan — een vaste kost moet ergens vanaf gaan.':
    'Crée d’abord un compte — une charge fixe doit bien partir de quelque part.',
  'Maak eerst een rekening aan — een vaste kost of inkomst moet ergens vanaf gaan of op binnenkomen.':
    'Crée d’abord un compte — une charge ou un revenu fixe doit bien partir de quelque part, ou y arriver.',
  // Ronde 66 — dernière relecture, troisième série
  'Er staat nog geen enkele boeking in de app. Zodra je er een ingeeft — zelf of via een uittreksel — zie je hier waar je geld naartoe gaat.':
    'Il n’y a pas encore la moindre écriture dans l’app. Dès que tu en saisis une — toi-même ou via un extrait — tu verras ici où va ton argent.',
  'Er staat nog geen enkele boeking in de app, dus valt er voor {jaar} niets samen te tellen. Hieronder zie je alvast waar dit scherm straks naar kijkt.':
    'Il n’y a pas encore la moindre écriture dans l’app, il n’y a donc rien à totaliser pour {jaar}. Ci-dessous, tu vois déjà où cet écran ira chercher.',
  'Er staat nog geen enkele boeking in deze maand. Afsluiten mag, maar er valt dan niets na te kijken — begin met je uittreksel in te lezen.':
    'Il n’y a pas la moindre écriture dans ce mois. Tu peux le clôturer, mais il n’y aura rien à vérifier — commence par importer ton extrait.',
  'Toch afsluiten': 'Clôturer quand même',
  'Bekijk je budgetten': 'Voir tes budgets',
  'Voor {maand} vervalt er geen enkele vaste last.': 'Aucune charge fixe n’échoit en {maand}.',
  // Ronde 66 — dernière relecture, quatrième série
  'Deze tab rekent uit wat er overblijft van je inkomen. Daarvoor moet ze weten wat er binnenkomt en wat er elke maand vastligt — en dat moet ergens vanaf gaan. Begin dus bij een rekening.':
    'Cet onglet calcule ce qu’il reste de tes revenus. Pour cela, il doit savoir ce qui rentre et ce qui est engagé chaque mois — et cela doit bien partir de quelque part. Commence donc par un compte.',
  'Niets om te melden. Zodra er iets je aandacht nodig heeft — een budget dat vol raakt, een garantie die afloopt, een vaste last die nog niet geboekt is — zie je het hier.':
    'Rien à signaler. Dès que quelque chose demande ton attention — un budget qui se remplit, une garantie qui expire, une charge fixe pas encore encodée — tu le verras ici.',
  'Alle budgetten': 'Tous les budgets',
  'Bekijk de boekingen van {naam} in je budget — {bedrag}': 'Voir les écritures de {naam} dans ton budget — {bedrag}',
  'Nog geen doelen. Met het formulier op deze pagina zet je je eerste doel — een buffer, een grote aankoop, of schuldenvrij zijn.':
    'Pas encore d’objectifs. Le formulaire de cette page te permet de fixer le premier — une réserve, un gros achat, ou être sans dettes.',
  'Bekijk alle {n} inkomsten in Analyse ›': 'Voir les {n} catégories de revenus dans Analyse ›',
  'Bekijk alle {n} uitgaven in Analyse ›': 'Voir les {n} catégories de dépenses dans Analyse ›',
  'Bekijk je inkomsten in Analyse ›': 'Voir tes revenus dans Analyse ›',
  'Bekijk je uitgaven in Analyse ›': 'Voir tes dépenses dans Analyse ›',
  'Er staat nog geen enkele boeking in de app. Zodra je er een ingeeft — zelf of via een uittreksel — zie je hier wat er duurder of goedkoper werd.':
    'Il n’y a pas encore la moindre écriture dans l’app. Dès que tu en saisis une — toi-même ou via un extrait — tu verras ici ce qui a augmenté ou diminué.',
  'Deze regeling is nog niet beginnen lopen — er is dus nog niets verschuldigd.':
    'Cet accord n’a pas encore commencé — rien n’est donc dû.',
  // Ronde 66 — dernière relecture, cinquième série
  'Voeg deze categorie toe in {naam}': 'Ajouter cette catégorie dans {naam}',
  'Annuleer nieuwe categorie in {naam}': 'Annuler la nouvelle catégorie dans {naam}',
  'Voeg deze subcategorie toe in {naam}': 'Ajouter cette sous-catégorie dans {naam}',
  'Annuleer nieuwe subcategorie in {naam}': 'Annuler la nouvelle sous-catégorie dans {naam}',
  'Nog geen kosten in dit dossier. Voeg er hieronder een toe; zodra er kosten staan, rekent de app uit wie wie wat verschuldigd is.':
    'Pas encore de frais dans ce dossier. Ajoutes-en un ci-dessous ; dès qu’il y a des frais, l’app calcule qui doit quoi à qui.',
  'Er staat nog geen enkele boeking in deze maand, en er is nog geen rekening om erop te boeken. Afsluiten mag, maar er valt dan niets na te kijken.':
    'Il n’y a pas la moindre écriture dans ce mois, et aucun compte pour en accueillir une. Tu peux le clôturer, mais il n’y aura rien à vérifier.',
  'Kosten delen met een co-ouder': 'Partager des frais avec un coparent',
  'Een lening bijhouden': 'Suivre un prêt',
  'Een aankoop met garantie bijhouden': 'Suivre un achat sous garantie',
  'De app kent nog geen indexcijfer voor {maanden}. Ze kent cijfers tot {laatste}. Vul het ontbrekende cijfer zelf in via "Wijzig de regeling", dan is de berekening volledig.':
    'L’app ne connaît pas encore d’indice pour {maanden}. Elle connaît les indices jusqu’à {laatste}. Encode toi-même l’indice manquant via « Modifier l’accord » et le calcul sera complet.',
  'Vul het indexcijfer in': 'Encode l’indice',
  'Nog geen vaste inkomsten. Zodra je een rekening hebt, vul je hier je loon in.':
    'Pas encore de revenus fixes. Dès que tu as un compte, tu encodes ton salaire ici.',
  // Ronde 66 — dernière relecture, sixième série
  'Afrekening {datum} is overgemaakt': 'Le décompte du {datum} a été viré',
  'Kopieer de afrekening van {datum}': 'Copier le décompte du {datum}',
  'PDF van de afrekening van {datum}': 'PDF du décompte du {datum}',
  'Toon de opbouw van de afrekening van {datum}': 'Afficher le détail du décompte du {datum}',
  'Verberg de opbouw van de afrekening van {datum}': 'Masquer le détail du décompte du {datum}',
  'Elke regel uit dit bestand staat al in de app. Vink zelf aan wat je tóch wil inlezen.':
    'Chaque ligne de ce fichier est déjà dans l’app. Coche toi-même ce que tu veux quand même importer.',
  'Niets aangevinkt. Vink aan wat je wil inlezen.': 'Rien de coché. Coche ce que tu veux importer.',
  'Nog geen bewegingen op deze rekening. Voeg er hieronder een toe.':
    'Pas encore de mouvements sur ce compte. Ajoutes-en un ci-dessous.',
  'Bewerk beweging {naam} van {datum}': 'Modifier le mouvement {naam} du {datum}',
  'Verwijder beweging {naam} van {datum}': 'Supprimer le mouvement {naam} du {datum}',
  'beweging': 'mouvement',
  'Deelbedrag {n}': 'Montant partiel {n}',
  'Je hebt minstens twee rekeningen nodig om over te boeken.': 'Il te faut au moins deux comptes pour faire un virement.',
  // Ronde 67 — créer une nouvelle branche depuis la fenêtre d’écriture
  'Kies eerst een hoofdcategorie.': 'Choisis d’abord une catégorie principale.',
  'Geef je nieuwe hoofdcategorie een naam.': 'Donne un nom à ta nouvelle catégorie principale.',
  'Kies eerst een categorie.': 'Choisis d’abord une catégorie.',
  'Geef je nieuwe categorie een naam.': 'Donne un nom à ta nouvelle catégorie.',
  'Toevoegen is niet gelukt. Je invoer staat er nog — probeer het opnieuw.':
    'L’ajout n’a pas fonctionné. Ce que tu as encodé est toujours là — réessaie.',
  '+ Nieuwe hoofdcategorie…': '+ Nouvelle catégorie principale…',
  'Naam van de nieuwe hoofdcategorie': 'Nom de la nouvelle catégorie principale',
  'bv. Huisraad': 'p. ex. Biens ménagers',
  '+ Nieuwe categorie…': '+ Nouvelle catégorie…',
  'Naam van de nieuwe categorie': 'Nom de la nouvelle catégorie',
  'bv. Meubels en toestellen': 'p. ex. Meubles et appareils',
  'Bezig met toevoegen…': 'Ajout en cours…',
  'Nieuwe subcategorie': 'Nouvelle sous-catégorie',
  'Typ hierboven een naam voor je nieuwe subcategorie.': 'Encode ci-dessus un nom pour ta nouvelle sous-catégorie.',
  'Rond eerst je nieuwe categorie af, of annuleer ze.': 'Termine d’abord ta nouvelle catégorie, ou annule-la.',
  '“{naam}” is toegevoegd en staat nu op deze boeking.': '“{naam}” a été ajoutée et figure maintenant sur cette écriture.',
  'Er bestaat al een hoofdcategorie “{naam}”.': 'Une catégorie principale « {naam} » existe déjà.',
  'Er bestaat hier al een categorie “{naam}”.': 'Une catégorie « {naam} » existe déjà ici.',
  'Er bestaat hier al een subcategorie “{naam}”. Annuleer en kies ze uit de lijst.':
    'Une sous-catégorie « {naam} » existe déjà ici. Annule et choisis-la dans la liste.',
  // Ronde 66 — des textes qui passent par une table et n'étaient donc jamais traduits
  'Overboekingen': 'Virements',
  'Vul een bedrag in.': 'Encode un montant.',
  'Vul een rentevoet van nul of meer in.': 'Encode un taux d’intérêt de zéro ou plus.',
  'Vul een looptijd in hele maanden in (minstens 1).': 'Encode une durée en mois entiers (au moins 1).',
  'Vul een extra bedrag groter dan nul in.': 'Encode un montant supplémentaire supérieur à zéro.',
  'Deze maandlast dekt de interest niet: zo raakt de lening nooit afbetaald.':
    'Cette mensualité ne couvre pas les intérêts : le prêt ne serait jamais remboursé.',
  'Kies een geldige datum.': 'Choisis une date valable.',
  'Kies een streefdatum in de toekomst.': 'Choisis une date cible dans le futur.',
  'Vul een maandbedrag groter dan nul in.': 'Encode un montant mensuel supérieur à zéro.',
  'Zo duurt het langer dan honderd jaar. Verhoog het maandbedrag.':
    'Cela prendrait plus de cent ans. Augmente le montant mensuel.',
  'Vul bij elke aanbieding een hoeveelheid groter dan nul in.':
    'Encode pour chaque offre une quantité supérieure à zéro.',
  'Vergelijk gewicht met gewicht, inhoud met inhoud, of stuks met stuks.':
    'Compare poids avec poids, volume avec volume, ou pièces avec pièces.',
  'Vul minstens twee aanbiedingen in om te vergelijken.': 'Encode au moins deux offres pour comparer.',
  'per kilo': 'par kilo',
  'per liter': 'par litre',
  'per stuk': 'par pièce',
  'Kind': 'Enfant',
  'Ikzelf': 'Moi-même',
  'Wat aan niemand persoonlijk hangt, staat bij "Het gezin". Een kost voor meerdere gezinsleden wordt gelijk verdeeld; zo’n aandeel bestaat niet als aparte boeking, dus die rij klikt niet door.':
    'Ce qui n’est rattaché à personne en particulier se trouve sous « Le foyer ». Un frais pour plusieurs membres du foyer est réparti à parts égales ; une telle part n’existe pas comme écriture distincte, donc cette ligne ne s’ouvre pas.',
  // Ronde 66 — deuxième relecture
  'Wat je met iemand anders moet afrekenen of over tijd moet opvolgen: gedeelde kosten, leningen, en facturen met hun garantiebewijs.':
    'Ce que tu dois régler avec quelqu’un d’autre ou suivre dans le temps : frais partagés, prêts, et factures avec leur garantie.',
  '{n} kost(en) komen weer op "nog niet afgerekend" te staan en tellen dus opnieuw mee in wat er te verrekenen valt.':
    '{n} frais repassent sur « pas encore réglé » et comptent donc à nouveau dans ce qui est à régler.',
  // Ronde 66 — relecture
  'Netto {bedrag} — bekijk de boekingen van deze maand': 'Net {bedrag} — voir les écritures de ce mois',
  'Je uitgaven en inkomsten van de laatste maanden, nieuwste eerst. Zoek, filter, of tik er een aan om ze te wijzigen; oudere haal je onderaan erbij.':
    'Tes dépenses et tes revenus des derniers mois, du plus récent au plus ancien. Cherche, filtre, ou touches-en un pour le modifier ; les plus anciens, tu les fais apparaître en bas.',
  'Nog geen budgetten ingesteld. Met het formulier op deze pagina zet je een grens op een categorie.':
    'Aucun budget fixé. Avec le formulaire de cette page, tu poses une limite sur une catégorie.',
  'Facturen & garantiebewijzen — een aankoop met bon of factuur. De app bewaakt de garantieperiode en waarschuwt je vóór ze afloopt.':
    'Factures & garanties — un achat avec ticket ou facture. L’app surveille la période de garantie et te prévient avant qu’elle n’expire.',
  'Waar je geld staat: je betaal- en spaarrekeningen, je cash, je kredietkaarten en je beleggingen. Tik een rekening aan om te zien wat erop gebeurde.':
    'Où se trouve ton argent : tes comptes à vue et d’épargne, ton cash, tes cartes de crédit et tes placements. Touche un compte pour voir ce qui s’y est passé.',
  'Een hoofdcategorie is een groot gebied van je leven: Voeding, of Woning en vaste lasten.':
    'Une catégorie principale est un grand domaine de ta vie : Alimentation, ou Logement et charges fixes.',
  'Je hoeft niets van dit alles zelf te maken — de app brengt de hele indeling al mee. Vind je iets niet terug, dan zet je het er op de juiste plek bij; hernoemen mag ook, en dat kan je altijd terugdraaien.':
    'Tu ne dois rien créer toi-même — l’app apporte toute la structure. Si tu ne trouves pas quelque chose, ajoute-le au bon endroit ; renommer est possible aussi, et tu peux toujours revenir en arrière.',
  'Waar je geld naartoe ging, wat er duurder werd, en wat er nog aankomt. Kies bovenaan wat je bekijkt en over welke periode, en daaronder je vraag.':
    'Où ton argent est parti, ce qui est devenu plus cher, et ce qui arrive encore. En haut, tu choisis ce que tu regardes et sur quelle période ; en dessous, ta question.',
  'Begin bij "Je geld"': 'Commence par « Ton argent »',
  '{c} cat. · {i} subcat.': '{c} cat. · {i} sous-cat.',
  '{n} subcat.': '{n} sous-cat.',
  '{n} subcategorie(ën) daarin': '{n} sous-catégorie(s) dedans',
  '{naam} verwijderd, met {items} subcategorie(ën)': '{naam} supprimé, avec {items} sous-catégorie(s)',
  '{naam} verwijderd, met {midden} categorie(ën) en {items} subcategorie(ën)':
    '{naam} supprimé, avec {midden} catégorie(s) et {items} sous-catégorie(s)',
  // Ronde 66 — encore une série d'« écriture »
  'Boeking verwijderd': 'Écriture supprimée',
  'Gebaseerd op de omschrijving bij elke boeking': 'Basé sur le libellé de chaque écriture',
  'Bekijk bij Boekingen ›': 'Voir sous Écritures ›',
  'Bewaar de bon of factuur van deze boeking.': 'Conserve le ticket ou la facture de cette écriture.',
  'Koppel aan een boeking (optioneel)': 'Lier à une écriture (facultatif)',
  'Zo verschijnt ze straks in je lijst met boekingen.': 'Voici comment elle apparaîtra dans ta liste d’écritures.',
  'Je rekeningen, boekingen en documenten zitten in de database van deze browser, op dit toestel. Er is geen account nodig en er staat geen kopie op een server van ons — die server bestaat niet.':
    'Tes comptes, tes écritures et tes documents se trouvent dans la base de données de ce navigateur, sur cet appareil. Aucun compte n’est nécessaire et il n’existe aucune copie sur un serveur à nous — ce serveur n’existe pas.',
  'Uitboeken: wis de boeking van {naam}': 'Annuler l’encodage : efface l’écriture de {naam}',
  'Geen boekingen gevonden.': 'Aucune écriture trouvée.',
  'alle boekingen': 'toutes les écritures',
  // Ronde 66 — chaque écran dit ce qu'il est
  // Les phrases sous les titres de page
  'Hoe je er deze maand voor staat: wat er binnenkwam, wat eraf ging, en wat er op je rekeningen staat.':
    'Où tu en es ce mois-ci : ce qui est rentré, ce qui est sorti, et ce qu’il y a sur tes comptes.',
  'De indeling waarmee de app je uitgaven groepeert. Ze is al ingevuld; je kan overal iets eigens bij zetten of hernoemen.':
    'La structure avec laquelle l’app regroupe tes dépenses. Elle est déjà remplie ; tu peux ajouter la tienne partout, ou renommer.',
  'Zet in één keer een hele maand aan boekingen in de app, uit het CSV-bestand van je bank. Jij kiest daarna wat er echt in mag.':
    'Mets tout un mois d’écritures dans l’app en une fois, à partir du fichier CSV de ta banque. C’est toi qui choisis ensuite ce qui entre vraiment.',
  // Les blocs d'explication
  'Wat betekenen deze vier cijfers?': 'Que veulent dire ces quatre chiffres ?',
  'Saldo is de stand van al je rekeningen samen, vandaag. Dat cijfer verandert niet mee met de maand die je bovenaan koos — het is wat er nú staat.':
    'Le solde, c’est l’état de tous tes comptes réunis, aujourd’hui. Ce chiffre ne suit pas le mois choisi en haut — c’est ce qu’il y a maintenant.',
  'Inkomsten, Uitgaven en Netto gaan wél over de gekozen maand. Netto is inkomsten min uitgaven: wat je die maand overhield of tekortkwam. Tik op een van de drie om de boekingen erachter te zien.':
    'Revenus, Dépenses et Net portent bien sur le mois choisi. Le net, c’est les revenus moins les dépenses : ce qu’il t’est resté ou ce qui t’a manqué ce mois-là. Touche l’un des trois pour voir les écritures derrière.',
  'Wat kan je hier bijhouden?': 'Que peux-tu suivre ici ?',
  'Gedeelde kosten — kosten verdelen met een co-ouder of ex-partner. Je legt één keer vast wie welk deel betaalt, geeft de kosten in, en de app rekent uit wie wie wat verschuldigd is. Van een afrekening maakt ze een PDF met de opbouw erbij.':
    'Frais partagés — répartir des frais avec un coparent ou un ex-partenaire. Tu fixes une fois qui paie quelle part, tu encodes les frais, et l’app calcule qui doit quoi à qui. D’un décompte, elle fait un PDF avec le détail.',
  'Lening of krediet — geld dat jij uitleende of zelf leende. De app houdt bij hoeveel er nog openstaat en wat er al terugbetaald is.':
    'Prêt ou crédit — de l’argent que tu as prêté ou emprunté. L’app suit ce qui reste dû et ce qui a déjà été remboursé.',
  'Hoe deze indeling in elkaar zit': 'Comment cette structure fonctionne',
  'Er zijn drie lagen, van breed naar smal:': 'Il y a trois niveaux, du plus large au plus précis :',
  'Een categorie is een stuk daarvan: onder Voeding bijvoorbeeld Broodwaren.':
    'Une catégorie en est une partie : sous Alimentation, par exemple Boulangerie.',
  'Een subcategorie is één ding dat je koopt: onder Broodwaren bijvoorbeeld Stokbrood.':
    'Une sous-catégorie est une chose précise que tu achètes : sous Boulangerie, par exemple Baguette.',
  'Zo vind je dat bestand bij je bank': 'Voici comment trouver ce fichier chez ta banque',
  // Un mot par chose
  'Nieuwe boeking': 'Nouvelle écriture',
  'Boeking bewerken': 'Modifier l’écriture',
  'Boeking toevoegen': 'Ajouter une écriture',
  'Recente boekingen': 'Écritures récentes',
  'Laatste boekingen': 'Dernières écritures',
  'Alle boekingen': 'Toutes les écritures',
  'Nog geen boekingen.': 'Pas encore d’écritures.',
  'Zoek in je boekingen': 'Cherche dans tes écritures',
  '{n} boeking(en) gevonden': '{n} écriture(s) trouvée(s)',
  '{n} boeking(en) getoond': '{n} écriture(s) affichée(s)',
  '{n} boeking(en) verwijderd': '{n} écriture(s) supprimée(s)',
  '{n} boeking(en) gedownload als CSV-bestand.': '{n} écriture(s) téléchargée(s) en fichier CSV.',
  '{n} boekingen in de periode': '{n} écritures sur la période',
  'Toon oudere boekingen ({n} ouder dan {maanden} maanden)': 'Afficher les écritures plus anciennes ({n} de plus de {maanden} mois)',
  '{naam} lijkt al geboekt op {datum} ({bedrag}). Er is niets bijgemaakt — kijk het na in je boekingen.':
    '{naam} semble déjà encodé le {datum} ({bedrag}). Rien n’a été ajouté — vérifie dans tes écritures.',
  'Maak eerst een rekening aan — een boeking moet ergens op staan.':
    'Crée d’abord un compte — une écriture doit être quelque part.',
  'Nog geen boekingen op deze rekening. Ze verschijnen hier zodra je er een ingeeft of een uittreksel inleest.':
    'Pas encore d’écritures sur ce compte. Elles apparaîtront ici dès que tu en encodes une ou que tu importes un extrait.',
  // Les trois niveaux de l'arborescence
  'Naam hoofdcategorie': 'Nom de la catégorie principale',
  'Hoofdcategorie toevoegen': 'Ajouter une catégorie principale',
  'Hoofdcategorie wijzigen': 'Modifier la catégorie principale',
  'Hoofdcategorie bewerken': 'Modifier la catégorie principale',
  'Nieuwe hoofdcategorie': 'Nouvelle catégorie principale',
  'Bewerk hoofdcategorie {naam}': 'Modifier la catégorie principale {naam}',
  'Verwijder hoofdcategorie {naam}': 'Supprimer la catégorie principale {naam}',
  'Je hebt nog geen eigen hoofdcategorieën. De ingebouwde boom staat hieronder — daar kan je op elk niveau iets toevoegen.':
    'Tu n’as pas encore de catégorie principale à toi. L’arborescence intégrée est en dessous — tu peux y ajouter quelque chose à chaque niveau.',
  'Zoek een categorie of subcategorie': 'Cherche une catégorie ou une sous-catégorie',
  'Subcategorie zoeken': 'Chercher une sous-catégorie',
  'Zoek een subcategorie (vanaf 2 letters)…': 'Cherche une sous-catégorie (à partir de 2 lettres)…',
  'Typ om ook subcategorieën te zoeken…': 'Tape pour chercher aussi les sous-catégories…',
  'Je kan een budget ook op één subcategorie zetten — typ dan de naam.':
    'Tu peux aussi mettre un budget sur une seule sous-catégorie — tape alors son nom.',
  'Zet je een budget op een hoofdcategorie, dan telt alles eronder mee. Zet je het op één subcategorie, dan telt alleen die.':
    'Si tu mets un budget sur une catégorie principale, tout ce qui est en dessous compte. Si tu le mets sur une seule sous-catégorie, seule celle-là compte.',
  'Verdeling per subcategorie': 'Répartition par sous-catégorie',
  // À régler
  'Te verrekenen': 'À régler',
  'te verrekenen': 'à régler',
  'Te verrekenen: plus = partner betaalt jou, min = jij betaalt partner.':
    'À régler : plus = le partenaire te paie, moins = tu paies le partenaire.',
  'telt niet mee in wat er te verrekenen valt': 'ne compte pas dans ce qui est à régler',
  // La contribution alimentaire, un seul mot partout
  'Kijkt in: je betalingen op een onderhoudsbijdrage in Dossiers.':
    'Regarde dans : tes paiements sur une contribution alimentaire dans Dossiers.',
  'Voor een onderhoudsbijdrage gebruik je de consumptieprijsindex, en is de aanvangsindex die van de maand vóór de maand waarin het bedrag werd vastgelegd. Hou je er een blijvend bij, doe dat dan in een dossier: daar zoekt de app de indexcijfers zelf op.':
    'Pour une contribution alimentaire, tu utilises l’indice des prix à la consommation, et l’indice de départ est celui du mois précédant le mois où le montant a été fixé. Si tu en suis une dans la durée, fais-le dans un dossier : là, l’app cherche les indices elle-même.',
  'Wil je deze onderhoudsbijdrage blijvend bijhouden, maak dan eerst een dossier aan bij Dossiers.':
    'Pour suivre cette contribution alimentaire dans la durée, crée d’abord un dossier sous Dossiers.',
  // Le premier pas dans un écran vide
  'Nog niets geboekt deze maand.': 'Rien d’encodé ce mois-ci.',
  'Zet je eerste budget': 'Fixe ton premier budget',
  'Maak een rekening aan': 'Crée un compte',
  'Vul je vaste lasten in': 'Encode tes charges fixes',
  'Loop de blokken hieronder door: je rekeningen, je vaste kosten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.':
    'Parcours les blocs ci-dessous : tes comptes, tes charges fixes et tes abonnements. Après dix minutes, tu sais ce qui est fixe chaque mois et ce que tu vaux — avant même d’encoder une seule écriture.',
  'Nog geen gezinsleden ingesteld. Vul hieronder een naam in; daarna kan je er kosten, doelen en garanties aan koppelen.':
    'Aucun membre du foyer encodé. Entre un nom ci-dessous ; ensuite tu pourras y rattacher des frais, des objectifs et des garanties.',
  'Nog geen budgetten ingesteld. Op de Budget-pagina zet je een grens op een categorie.':
    'Aucun budget fixé. Sur la page Budget, tu poses une limite sur une catégorie.',
  // Ronde 65 — troisième relecture
  'Dit verandert er:': 'Voici ce qui change :',
  'Afrekening gemarkeerd als overgemaakt': 'Décompte marqué comme versé',
  'Afrekening weer opengezet': 'Décompte rouvert',
  'Ter controle: {huidig} ligt een eind van {laatste} — het laatste cijfer dat de app zelf kent, in basis {jaar} = 100. Statbel publiceert sinds 2026 ook een kolom in basis 2025 = 100. Staan je twee cijfers allebei in dezelfde reeks en hetzelfde basisjaar, dan klopt de berekening; anders zit het bedrag er tientallen procenten naast.':
    'Pour vérifier : {huidig} est assez loin de {laatste} — le dernier chiffre que l’app connaît elle-même, en base {jaar} = 100. Depuis 2026, Statbel publie aussi une colonne en base 2025 = 100. Si tes deux chiffres sont dans la même série et la même année de base, le calcul est correct ; sinon, le montant se trompe de dizaines de pour cent.',
  // Ronde 65 — deuxième relecture
  'Het terugzetten is niet gelukt. Probeer het opnieuw.': 'La restauration n’a pas fonctionné. Réessaie.',
  'een andere rekening': 'un autre compte',
  // Ronde 65 — relecture
  'De app kan hier niet nakijken waar deze naam nog gebruikt wordt.':
    'L’app ne peut pas vérifier ici où ce nom est encore utilisé.',
  'het cijfer uit je akte': 'le chiffre de ton acte',
  'het cijfer van nu': 'le chiffre actuel',
  'per kwartaal': 'par trimestre',
  'per half jaar': 'par semestre',
  '{n} vaste last(en) verliezen hun categorie.': '{n} charge(s) fixe(s) perdent leur catégorie.',
  '{n} gedeelde kost(en) in een dossier verliezen hun categorie.': '{n} frais partagé(s) dans un dossier perdent leur catégorie.',
  '{n} post(en) op een kindrekening verliezen hun categorie.': '{n} mouvement(s) sur un compte enfant perdent leur catégorie.',
  '{n} dossier(s) hebben hiervoor een eigen verdeelsleutel — die valt terug op de dossierstandaard, en dan verandert je afrekeningsbedrag.':
    '{n} dossier(s) ont une clé de répartition propre pour cela — elle retombe sur la valeur par défaut du dossier, et ton montant de décompte change alors.',
  // Ronde 65 — les erreurs qui se cachent elles-mêmes
  'De periode hierboven geldt op deze tab alleen voor je spaarquote. De rest volgt de maand die je bovenaan koos — behalve "Wat komt eraan", dat vertrekt van de lopende maand.':
    'Sur cet onglet, la période ci-dessus ne vaut que pour ton taux d’épargne. Le reste suit le mois que tu as choisi en haut — sauf « Ce qui arrive », qui part du mois en cours.',
  'Alle overboekingen': 'Tous les virements',
  'Overboekingen van deze rekening': 'Virements de ce compte',
  'per jaar': 'par an',
  'Let op: {n} van deze regels staan al op {rekening}. Staat hierboven wel de juiste rekening?':
    'Attention : {n} de ces lignes se trouvent déjà sur {rekening}. Le bon compte est-il bien sélectionné ci-dessus ?',
  'Er is deze maand nog niets geboekt, dus valt er ook niets te categoriseren.':
    'Rien n’a encore été encodé ce mois-ci, il n’y a donc rien à catégoriser non plus.',
  'Er is deze maand nog niets geboekt, dus valt er nog niets te zeggen over hoe ze geweest is.':
    'Rien n’a encore été encodé ce mois-ci, il n’y a donc rien à dire sur la façon dont il s’est passé.',
  'Om te indexeren heeft de app allebei de cijfers nodig: de aanvangsindex én de huidige. Laat ze allebei leeg om niet te indexeren.':
    'Pour indexer, l’app a besoin des deux chiffres : l’indice de départ et l’indice actuel. Laisse-les vides tous les deux pour ne pas indexer.',
  '"{invoer}" is geen indexcijfer. Vul een getal groter dan nul in, of laat het veld leeg om niet te indexeren.':
    '« {invoer} » n’est pas un indice. Encode un nombre supérieur à zéro, ou laisse le champ vide pour ne pas indexer.',
  // Ronde 65 — rien ne peut casser en silence
  'Deze afrekening verwijderen?': 'Supprimer ce décompte ?',
  'De afrekening van {datum} verwijderen?': 'Supprimer le décompte du {datum} ?',
  'Het bedrag van {bedrag} en de opbouw erachter — welke kosten, welke periode, welk aandeel.':
    'Le montant de {bedrag} et le détail derrière — quels frais, quelle période, quelle part.',
  '{n} gedeelde kost(en) blijven bestaan; alleen hun plek in deze afrekening verdwijnt.':
    '{n} frais partagé(s) restent ; seule leur place dans ce décompte disparaît.',
  'Afrekening verwijderd': 'Décompte supprimé',
  'Gezinslid verwijderen?': 'Supprimer ce membre du foyer ?',
  '{naam} verwijderen?': 'Supprimer {naam} ?',
  'Liever archiveren': 'Plutôt archiver',
  // Ronde 76
  'Vaste post verwijderen?': 'Supprimer le poste fixe ?',
  'Liever opzeggen': 'Plutôt résilier',
  'Hier hangt nog dit aan:': 'Voici ce qui y est encore lié :',
  'Er hangt niets aan deze kost.': 'Rien n’est lié à cette charge.',
  'De app kan hier niet nakijken wat er aan deze kost hangt.': 'L’app ne peut pas vérifier ici ce qui est lié à cette charge.',
  '{n} boeking(en) die je hier inboekte': '{n} écriture(s) que tu as enregistrée(s) ici',
  'Ze blijven staan als gewone boeking; alleen de knop "Uitboeken" verdwijnt, want die hoort bij de kost.': 'Elles restent comme écritures ordinaires ; seul le bouton « Annuler l’écriture » disparaît, car il appartient à la charge.',
  '{n} boeking(en) waarvan je zei dat ze deze kost zijn': '{n} écriture(s) que tu as désignée(s) comme cette charge',
  'Ze blijven staan en tellen daarna weer mee als een gewone boeking — de app mag ze dus opnieuw bij een andere vaste last voorstellen.': 'Elles restent et comptent à nouveau comme des écritures ordinaires — l’app peut donc les proposer pour une autre charge fixe.',
  '{n} spaardoel(en) sparen hiervoor': '{n} objectif(s) d’épargne épargnent pour cette charge',
  'Ze blijven lopen, maar weten daarna niet meer waarvoor.': 'Ils continuent, mais ne savent plus pour quoi.',
  'Zet je hem stop? Vul dan "Loopt tot en met" in — de maand die je daar kiest, is de laatste keer dat hij meetelt. De kost blijft in je historiek staan.': 'Tu l’arrêtes ? Remplis alors « Court jusqu’en » : le mois que tu choisis est la dernière fois qu’elle compte. La charge reste dans ton historique.',
  'Bedenk je je meteen, dan zet "Ongedaan maken" onderaan het scherm de kost terug — mét al deze koppelingen.': 'Si tu changes d’avis tout de suite, « Annuler » en bas de l’écran te rend la charge — avec tous ces liens.',
  'Deze naam wordt nu nog gebruikt in:': 'Ce nom est encore utilisé dans :',
  'Dit gezinslid wordt nergens gebruikt.': 'Ce membre du foyer n’est utilisé nulle part.',
  'Verwijder je het lid, dan blijft het overal waar het al gebruikt is als naamloze verwijzing staan. Archiveren haalt het alleen uit de keuzelijsten en laat elke naam staan.':
    'Si tu le supprimes, il reste partout où il est déjà utilisé sous forme de référence sans nom. Archiver le retire seulement des listes de choix et laisse chaque nom en place.',
  '{n} gedeelde kost(en) in een dossier': '{n} frais partagé(s) dans un dossier',
  '{n} afrekening(en)': '{n} décompte(s)',
  '{n} post(en) op een kindrekening': '{n} mouvement(s) sur un compte enfant',
  '{n} spaardoel(en)': '{n} objectif(s) d’épargne',
  '{n} lening(en)': '{n} prêt(s)',
  '{n} garantie(s)': '{n} garantie(s)',
  'Categorie verwijderen?': 'Supprimer la catégorie ?',
  '{n} categorie(ën) eronder': '{n} catégorie(s) en dessous',
  '{n} boeking(en) blijven bestaan, maar staan daarna zonder categorienaam.':
    '{n} écriture(s) restent, mais sans nom de catégorie ensuite.',
  '{n} budget(ten) hierop verliezen hun categorie.': '{n} budget(s) là-dessus perdent leur catégorie.',
  'Er hangt niets aan deze categorie.': 'Rien n’est rattaché à cette catégorie.',
  '{naam} verwijderd': '{naam} supprimé',
  '{oud} heet nu {nieuw}': '{oud} s’appelle maintenant {nieuw}',
  '{naam} gearchiveerd — ze staat niet meer in de keuzelijsten':
    '{naam} archivé — il ne figure plus dans les listes de choix',
  '{naam} heropend': '{naam} rouvert',
  // Ronde 64 — la page Budget s’explique elle-même
  'Nog niets om te verdelen': 'Rien à répartir pour l’instant',
  'Deze tab rekent uit wat er overblijft van je inkomen. Daarvoor moet ze weten wat er binnenkomt en wat er elke maand vastligt — dat vul je in bij "Vast".':
    'Cet onglet calcule ce qu’il te reste de tes revenus. Pour ça, il doit savoir ce qui rentre et ce qui est fixe chaque mois — tu encodes ça dans « Fixe ».',
  'Naar je vaste inkomsten en lasten': 'Vers tes revenus et charges fixes',
  'Losmaken': 'Détacher',
  'Losmaken: {naam} telt dan weer als niet geboekt': 'Détacher : {naam} compte à nouveau comme non encodé',
  'Je plan voor deze maand: wat er binnenkomt, wat vastligt, en waar je zelf een grens op zet.':
    'Ton plan pour ce mois : ce qui rentre, ce qui est fixe, et là où tu poses toi-même une limite.',
  'Onderdeel van je budget': 'Partie de ton budget',
  'Vast': 'Fixe',
  'Zo werkt dit': 'Comment ça marche',
  'Wat blijft er over? — zo werkt dit': 'Que reste-t-il ? — comment ça marche',
  'Kompal telt op wat er deze maand al binnenkwam plus je vaste inkomsten die nog moeten komen, trekt daar je vaste lasten van af en ook wat je maandelijks opzijzet, en wat overblijft is wat je vrij te verdelen hebt.':
    'Kompal additionne ce qui est déjà rentré ce mois-ci plus les revenus fixes encore à venir, en retire tes charges fixes ainsi que ce que tu mets de côté chaque mois, et ce qui reste est ce que tu peux répartir librement.',
  'Klopt dit cijfer niet? Kijk dan bij "Vast" of je loon en al je vaste lasten erin staan. Deze tab rekent alleen; invullen doe je daar.':
    'Ce chiffre te semble faux ? Alors il manque quelque chose dans « Fixe » — ton salaire, ou une charge fixe que tu n’as pas encore encodée. Cet onglet ne fait que calculer ; c’est là que tu encodes.',
  'Wat ligt vast? — zo werkt dit': 'Qu’est-ce qui est fixe ? — comment ça marche',
  'Hier zet je alles wat elke maand terugkomt: je loon, je huur, je abonnementen. Je geeft het één keer in, en Kompal weet er daarna elke maand van.':
    'Ici tu mets tout ce qui revient chaque mois : ton salaire, ton loyer, tes abonnements. Tu l’encodes une fois, et Kompal s’en souvient ensuite chaque mois.',
  'Zo’n vaste last is nog geen boeking. Betaal je hem, dan tik je die betaling gewoon in zoals elke andere uitgave — herkent Kompal ze als deze vaste last, dan vraagt ze of die betaling erbij hoort. Of je drukt hier op "Boek in" en dan maakt ze de boeking voor je.':
    'Une charge fixe n’est pas encore une écriture. Quand tu la paies, tu encodes ce paiement comme n’importe quelle autre dépense — si Kompal y reconnaît cette charge fixe, elle te demande si elle peut relier les deux. Ou tu cliques ici sur « Comptabiliser » et elle crée l’écriture pour toi.',
  'Pas als er een boeking is, telt het bedrag mee in je budgetten en in de analyse.':
    'Ce n’est qu’une fois l’écriture faite que le montant compte dans tes budgets et dans l’analyse.',
  'Wat wil je beperken? — zo werkt dit': 'Que veux-tu limiter ? — comment ça marche',
  'Een budget is een grens die je zelf op een categorie zet: "aan Voeding wil ik deze maand niet meer dan € 400 uitgeven". Kompal telt er alle boekingen van die categorie in deze maand bij op en laat de balk meelopen.':
    'Un budget est une limite que tu poses toi-même sur une catégorie : « ce mois-ci, je ne veux pas dépenser plus de 400 € en Alimentation ». Kompal additionne toutes les écritures de cette catégorie ce mois-ci et fait avancer la barre.',
  'Een vaste last verbruikt je budget zodra ze geboekt is — precies zoals elke andere uitgave in die categorie.':
    'Une charge fixe consomme ton budget dès qu’elle est encodée — exactement comme n’importe quelle autre dépense de cette catégorie.',
  'Staat het er niet bij? Voeg het zelf toe bij je vaste lasten.':
    'Pas dans la liste ? Ajoute-le toi-même à tes charges fixes.',
  'Naar je vaste lasten': 'Vers tes charges fixes',
  // De vraag "is dit je vaste last?"
  'Hoort dit bij een vaste last?': 'Est-ce que ça correspond à une charge fixe ?',
  'Is dit al betaald?': 'Est-ce déjà payé ?',
  'Je boekte {bedrag} en dat lijkt op je vaste last {naam} ({vast} per maand) — zelfde rekening, zelfde categorie, en die is deze maand nog niet afgepunt.':
    'Tu as encodé {bedrag}, et ça ressemble à ta charge fixe {naam} ({vast} par mois) — même compte, même catégorie, et elle n’a pas encore été pointée ce mois-ci.',
  'Er staat deze maand al een boeking van {bedrag} op {datum} ({omschrijving}) die op {naam} lijkt. Je vaste last staat op {vast}.':
    'Il y a déjà ce mois-ci une écriture de {bedrag} le {datum} ({omschrijving}) qui ressemble à {naam}. Ta charge fixe est fixée à {vast}.',
  'Zeg je ja, dan telt deze boeking als je vaste last van deze maand: ze verdwijnt uit "nog te boeken" en het belletje zwijgt erover. Er wordt niets bijgemaakt en je bedrag verandert niet.':
    'Si tu dis oui, cette écriture compte comme ta charge fixe du mois : elle disparaît de « encore à encoder » et la cloche se tait à son sujet. Rien n’est ajouté et ton montant ne change pas.',
  'Ja, dit is die betaling': 'Oui, c’est ce paiement',
  'Nee, aparte uitgave': 'Non, dépense distincte',
  'Nee, boek {vast} bij': 'Non, ajoute {vast}',
  '{naam} staat nu als betaald voor deze maand.': '{naam} compte maintenant comme payé pour ce mois.',
  // Ronde 63 — tes données ne se perdent pas
  'Laatste synchronisatie: {datum}.': 'Dernière synchronisation : {datum}.',
  'Niet verbonden. Laatste synchronisatie: {datum}.':
    'Non connecté. Dernière synchronisation : {datum}.',
  'Verbonden, maar er ging nog niets naar Drive.':
    'Connecté, mais rien n’est encore parti vers Drive.',
  'Je browser heeft toegezegd deze gegevens niet zomaar te wissen.':
    'Ton navigateur s’est engagé à ne pas effacer ces données n’importe quand.',
  'Je browser mag deze gegevens wissen wanneer je toestel plaats nodig heeft. Zet de app op je beginscherm en maak af en toe een back-up.':
    'Ton navigateur peut effacer ces données quand ton appareil manque de place. Ajoute l’app à ton écran d’accueil et fais une sauvegarde de temps en temps.',
  'Laatste back-up op dit toestel: {datum}.': 'Dernière sauvegarde sur cet appareil : {datum}.',
  'Je maakte op dit toestel nog geen enkele back-up.':
    'Tu n’as encore fait aucune sauvegarde sur cet appareil.',
  'Niet verbonden. Je gegevens staan alleen in deze browser, op dit toestel.':
    'Non connecté. Tes données se trouvent uniquement dans ce navigateur, sur cet appareil.',
  'Veilig bewaren': 'Mettre à l’abri',
  'Waar staan je gegevens?': 'Où sont tes données ?',
  'Kompal bewaart alles in deze browser, op dit toestel. Dat is de reden dat je geen account nodig hebt — en meteen ook de reden dat je er zelf een kopie van moet hebben.':
    'Kompal garde tout dans ce navigateur, sur cet appareil. C’est pour ça que tu n’as besoin d’aucun compte — et aussi pour ça qu’il te faut ta propre copie.',
  'Een browser die opgeruimd wordt, een toestel dat stukgaat of verloren raakt: dan is alles weg. Er zijn twee vangnetten, en één ervan volstaat. Google Drive doet het vanzelf; een back-upbestand doe je zelf, en dat werkt ook zonder Google.':
    'Un navigateur qu’on nettoie, un appareil qui casse ou qui se perd : et tout est parti. Il y a deux filets, et un seul suffit. Google Drive le fait tout seul ; un fichier de sauvegarde, c’est toi qui le fais, et ça marche aussi sans Google.',
  // La cloche (ces trois clés vivent dans meldingen.ts)
  'Je maakte nog nooit een back-up. Je gegevens staan alleen in deze browser.':
    'Tu n’as jamais fait de sauvegarde. Tes données se trouvent uniquement dans ce navigateur.',
  'Je laatste back-up is {dagen} dagen geleden. Je gegevens staan alleen op dit toestel.':
    'Ta dernière sauvegarde date de {dagen} jours. Tes données se trouvent uniquement sur cet appareil.',
  'Er ging al {dagen} dagen niets meer naar Google Drive. Kijk je verbinding na of maak een back-up.':
    'Plus rien n’est parti vers Google Drive depuis {dagen} jours. Vérifie ta connexion ou fais une sauvegarde.',
  // De navigatie en de analysetabs (ronde 60)
  '{onderdeel} staat uit, maar er staat wel iets in.': '{onderdeel} est désactivé, mais il y a quelque chose dedans.',
  'Toon het': 'Afficher',
  'Toon {onderdeel}': 'Afficher {onderdeel}',
  'Onderdeel van de analyse': 'Partie de l’analyse',
  'Verdeling': 'Répartition',
  'Wat verandert': 'Ce qui change',
  'Vooruit': 'À venir',
  'Af en toe': 'De temps en temps',
  // Een dossier verwijderen, met de vraag ervóór (ronde 59)
  '{n} kindrekening(en)': '{n} compte(s) d’enfant',
  'Dit dossier verwijderen?': 'Supprimer ce dossier ?',
  'Nee, behouden': 'Non, le garder',
  'Je staat op het punt {naam} te verwijderen, met alles wat eraan hangt:': 'Tu es sur le point de supprimer {naam}, avec tout ce qui y est rattaché :',
  'Je kan dit meteen daarna nog ongedaan maken met de balk onderaan, maar die blijft niet lang staan.': 'Tu peux encore annuler juste après avec la barre en bas, mais elle ne reste pas longtemps.',
  'Er staat nog niets in dit dossier.': 'Il n’y a encore rien dans ce dossier.',
  '{n} gedeelde kost(en)': '{n} frais partagé(s)',
  '{n} verrekening(en)': '{n} décompte(s)',
  '{n} post(en) op de kindrekening': '{n} mouvement(s) sur le compte de l’enfant',
  '{n} regeling(en) voor de onderhoudsbijdrage': '{n} accord(s) de contribution alimentaire',
  '{n} betaling(en) van de onderhoudsbijdrage': '{n} paiement(s) de la contribution alimentaire',
  '{n} bewaard(e) document(en) — bonnen, scans, overeenkomsten': '{n} document(s) conservé(s) — tickets, scans, conventions',
  // Indexreeksen bij de onderhoudsbijdrage (ronde 58)
  'Kompal rekende de onderhoudsbijdrage van {dossier} vroeger met de gezondheidsindex. De wet noemt de consumptieprijzen, en daar rekent de app nu mee — het bedrag kan daardoor verschillen. Open de regeling en bevestig welke index in je akte staat.': 'Kompal calculait auparavant la contribution alimentaire de {dossier} avec l’indice santé. La loi vise l’indice des prix à la consommation, que l’app utilise désormais ; le montant peut donc différer. Ouvre l’accord et confirme quel indice figure dans ton acte.',
  'Gerekend met de {reeks}.': 'Calculé avec l’{reeks}.',
  'Gerekend met de {reeks}, de wettelijke reeks. Tot augustus 2026 gebruikte Kompal hier de gezondheidsindex; daardoor kan dit bedrag iets verschillen van vroeger. Noemt je akte uitdrukkelijk de gezondheidsindex, zet ze dan om bij "Wijzig de regeling".': 'Calculé avec l’{reeks}, la série prévue par la loi. Jusqu’en août 2026, Kompal utilisait ici l’indice santé ; ce montant peut donc légèrement différer de celui d’avant. Si ton acte mentionne expressément l’indice santé, modifie-le sous « Modifier l’accord ».',
  'Je eigen indexcijfers stonden in de vorige reeks en zijn verwijderd. Zet ze opnieuw met cijfers uit de {nieuw}.': 'Tes propres indices figuraient dans la série précédente et ont été supprimés. Encode-les à nouveau avec des chiffres de l’{nieuw}.',
  'Je eerdere indexcijfers kwamen uit de {oud} en zijn verwijderd. Zet ze opnieuw met cijfers uit de {nieuw}.': 'Tes indices précédents provenaient de l’{oud} et ont été supprimés. Encode-les à nouveau avec des chiffres de l’{nieuw}.',
  'Zodra je bewaart, rekent de app alle bedragen opnieuw met deze reeks. Je eigen indexcijfers stonden in de vorige reeks en worden dan verwijderd.': 'Dès que tu enregistres, l’app recalcule tous les montants avec cette série. Tes propres indices figuraient dans la série précédente et seront supprimés.',
  'Dat cijfer ligt te ver van {laatste} — het laatste dat de app voor de {reeks} kent. Staat het in een ander basisjaar? Statbel publiceert sinds 2026 standaard in basis 2025 = 100; de app rekent in basis {jaar} = 100. Neem het cijfer uit de kolom met basis {jaar}.': 'Ce chiffre est trop éloigné de {laatste}, le dernier que l’app connaît pour l’{reeks}. Serait-il exprimé dans une autre année de base ? Depuis 2026, Statbel publie par défaut en base 2025 = 100 ; l’app calcule en base {jaar} = 100. Prends le chiffre de la colonne base {jaar}.',
  'De app rekent niet met deze regeling. De indexcijfers die je zelf bijzette komen uit de {eigen}, en deze regeling rekent met de {gekozen}. Dat zijn twee verschillende reeksen; ze combineren geeft een bedrag dat niet na te rekenen is. Verwijder je eigen cijfers hieronder en zet ze opnieuw met cijfers uit de {gekozen}.': 'L’app ne calcule pas cet accord. Les indices que tu as ajoutés proviennent de l’{eigen}, alors que cet accord utilise l’{gekozen}. Ce sont deux séries différentes ; les combiner donne un montant que personne ne peut vérifier. Supprime tes propres chiffres ci-dessous et encode-les à nouveau avec des chiffres de l’{gekozen}.',
  'Consumptieprijsindex': 'Indice des prix à la consommation',
  'consumptieprijsindex': 'indice des prix à la consommation',
  'Gezondheidsindex': 'Indice santé',
  'gezondheidsindex': 'indice santé',
  'De wettelijke standaard voor een onderhoudsbijdrage. Artikel 203quater van het oud Burgerlijk Wetboek bindt de bijdrage aan het indexcijfer van de consumptieprijzen.': 'La règle légale pour une contribution alimentaire. L’article 203quater de l’ancien Code civil lie la contribution à l’indice des prix à la consommation.',
  'Dezelfde korf min tabak, alcohol, benzine en diesel. Kies deze alleen wanneer je akte haar uitdrukkelijk noemt; voor huur is zij wél de juiste.': 'Le même panier moins le tabac, l’alcool, l’essence et le diesel. Ne choisis celui-ci que si ton acte le mentionne expressément ; pour un loyer, c’est bien lui qui s’applique.',
  'Welke index staat er in je akte?': 'Quel indice figure dans ton acte ?',
  'Zodra je bewaart, rekent de app alle bedragen opnieuw met deze reeks. Het bedrag kan daardoor veranderen.': 'Dès que tu enregistres, l’app recalcule tous les montants avec cette série. Le montant peut donc changer.',
  'Tot augustus 2026 rekende Kompal hier altijd met de gezondheidsindex. Dat was fout: de wet noemt de consumptieprijzen. Staat er in jouw akte uitdrukkelijk "gezondheidsindex", zet ze dan hierboven om.': 'Jusqu’en août 2026, Kompal utilisait toujours l’indice santé ici. C’était une erreur : la loi vise les prix à la consommation. Si ton acte mentionne expressément « indice santé », modifie-le ci-dessus.',
  'De app rekent met de {reeks} en kent cijfers tot {laatste}, in basis {jaar} = 100.': 'L’app calcule avec l’{reeks} et connaît les chiffres jusqu’à {laatste}, en base {jaar} = 100.',
  'Aanvangsindex {index}: de {reeks} van {maand}, de maand vóór de regeling.': 'Indice de départ {index} : l’{reeks} de {maand}, le mois précédant l’accord.',
  'Dit blad is een berekening op basis van wat er in Financieel Kompas is ingevoerd: het bedrag uit de regeling, de datum ervan en de {reeks}.': 'Cette page est un calcul basé sur ce qui a été encodé dans Financieel Kompas : le montant de l’accord, sa date et l’{reeks}.',
  'De onderhoudsbijdrage die op {datum} werd vastgelegd, volgt de {reeks}. Die aanpassing gebeurt jaarlijks op de verjaardag van de regeling.': 'La contribution alimentaire fixée le {datum} suit l’{reeks}. Cette adaptation a lieu chaque année à la date anniversaire de l’accord.',
  'De onderhoudsbijdrage volgt de {reeks}. Het nieuwe bedrag is telkens: het bedrag uit de regeling, maal de index van de maand vóór de verjaardag, gedeeld door de aanvangsindex.': 'La contribution alimentaire suit l’{reeks}. Le nouveau montant est chaque fois : le montant de l’accord, multiplié par l’indice du mois précédant la date anniversaire, divisé par l’indice de départ.',
  // Contract- en opzegdata bij een vaste last (ronde 57)
  'Je eigen opzegtermijn (optioneel)': 'Ton propre délai de préavis (facultatif)',
  'Eenheid van de opzegtermijn': 'Unité du délai de préavis',
  'maanden': 'mois',
  'dagen': 'jours',
  'Vul een heel aantal maanden in, van 0 tot 24. Zolang dit niet klopt, kan je niet opslaan.': 'Indique un nombre entier de mois, de 0 à 24. Tant que ce n’est pas correct, tu ne peux pas enregistrer.',
  'De app rekent met jouw {n} maand(en).': 'L’app calcule avec tes {n} mois.',
  'De app rekent met de wettelijke {n} maand(en). Staat er in jouw overeenkomst een kortere termijn, vul die dan hier in.': 'L’app calcule avec les {n} mois prévus par la loi. Si ton contrat prévoit un délai plus court, indique-le ici.',
  '⚠ De verlengdatum is onleesbaar. Zet ze opnieuw.': '⚠ La date de reconduction est illisible. Indique-la à nouveau.',
  '⚠ De verlengdatum ({datum}) is voorbij. Zet de nieuwe.': '⚠ La date de reconduction ({datum}) est passée. Indique la nouvelle.',
  'verlengt {datum} · beslisdatum voorbij, opzegtermijn {n} maand(en)': 'reconduction le {datum} · date de décision passée, préavis de {n} mois',
  'verlengt {datum} · beslisdatum voorbij, opzegtermijn {n} dag(en)': 'reconduction le {datum} · date de décision passée, préavis de {n} jour(s)',
  '(wettelijke termijn)': '(délai légal)',
  'De verlengdatum van {naam} is onleesbaar. Zet ze opnieuw, anders kan de app niets uitrekenen.': 'La date de reconduction de {naam} est illisible. Indique-la à nouveau, sinon l’app ne peut rien calculer.',
  'Vandaag is volgens de wettelijke termijn de laatste dag om {naam} op te zeggen. Kijk je eigen contract na.': 'Selon le délai légal, aujourd’hui est le dernier jour pour résilier {naam}. Vérifie ton propre contrat.',
  'Nog {n} dag(en) om te beslissen over {naam}, gerekend met de wettelijke termijn. Kijk je eigen contract na.': 'Encore {n} jour(s) pour décider au sujet de {naam}, calculé avec le délai légal. Vérifie ton propre contrat.',
  'Een huishoudelijke afnemer mag een energiecontract op elk ogenblik beëindigen met één maand opzegtermijn — ook een contract met een vaste prijs. De vraag is dus meestal niet óf je weg kan, maar of je wil dat de volgende periode aan de nieuwe prijs loopt.': 'Un client résidentiel peut mettre fin à un contrat d’énergie à tout moment moyennant un préavis d’un mois — y compris un contrat à prix fixe. La question n’est donc généralement pas de savoir si tu peux partir, mais si tu veux que la période suivante coure au nouveau prix.',
  'De app rekent alleen met de opzegtermijn. Over vergoedingen of boetes zegt ze niets: dat zijn bedragen die van jouw contract afhangen, en die kan ze niet narekenen.': 'L’app ne travaille qu’avec le délai de préavis. Elle ne dit rien des indemnités ou des pénalités : ce sont des montants qui dépendent de ton contrat, et elle ne peut pas les vérifier.',
  'Na de eerste zes maanden kan je een telecomcontract opzeggen zonder opzegvergoeding, hoe lang de looptijd ook is. De opzegtermijn in je contract mag niet meer dan twee maanden bedragen.': 'Après les six premiers mois, tu peux résilier un contrat télécom sans indemnité de rupture, quelle que soit sa durée. Le délai de préavis prévu dans ton contrat ne peut pas dépasser deux mois.',
  'Twee maanden is het WETTELIJKE MAXIMUM. Wat in jouw contract staat, kan korter zijn — kijk het na en pas de termijn hieronder aan. Kreeg je een toestel bij je abonnement, dan mag de operator nog de restwaarde ervan aanrekenen; die staat in de aflossingstabel bij je contract. Zeg je op in de eerste zes maanden, dan betaal je het abonnement nog tot het einde van de zesde maand.': 'Deux mois est le MAXIMUM LÉGAL. Ton contrat peut prévoir moins — vérifie-le et adapte le délai ci-dessous. Si tu as reçu un appareil avec ton abonnement, l’opérateur peut encore t’en facturer la valeur résiduelle ; elle figure dans le tableau d’amortissement joint à ton contrat. Si tu résilies pendant les six premiers mois, tu paies encore l’abonnement jusqu’à la fin du sixième mois.',
  'Voor een niet-levensverzekering geldt sinds 1 oktober 2024 twee maanden: in het eerste jaar zeg je op tegen de jaarlijkse vervaldag met twee maanden vooraf, en vanaf het tweede jaar kan je op elk moment opzeggen met twee maanden opzegtermijn.': 'Pour une assurance non-vie, un délai de deux mois s’applique depuis le 1er octobre 2024 : la première année, tu résilies à l’échéance annuelle deux mois à l’avance, et à partir de la deuxième année tu peux résilier à tout moment moyennant deux mois de préavis.',
  'Dit geldt voor niet-levensverzekeringen zoals auto, woning en familiale, en voor contracten die vanaf 1 oktober 2024 gesloten of stilzwijgend verlengd zijn. Voor een gezondheids- of hospitalisatieverzekering (drie maanden vóór de jaarlijkse vervaldag) en voor levensverzekeringen gelden andere regels: vul de termijn dan zelf in.': 'Cela vaut pour les assurances non-vie comme l’auto, l’habitation et la familiale, et pour les contrats conclus ou reconduits tacitement à partir du 1er octobre 2024. L’assurance soins de santé ou hospitalisation (trois mois avant l’échéance annuelle) et l’assurance vie suivent d’autres règles : indique alors le délai toi-même.',
  'Is je dienstencontract van bepaalde duur stilzwijgend verlengd, dan kan je het op elk ogenblik zonder vergoeding opzeggen. De opzegtermijn uit je contract geldt, maar mag niet meer dan twee maanden bedragen.': 'Si ton contrat de services à durée déterminée a été reconduit tacitement, tu peux le résilier à tout moment sans indemnité. Le délai de préavis de ton contrat s’applique, mais ne peut pas dépasser deux mois.',
  'Deze regel geldt voor DIENSTEN (artikel VI.91 WER) en pas NA een stilzwijgende verlenging. Zit het contract nog in zijn eerste periode, dan telt wat er in de overeenkomst staat. Twee maanden is het wettelijke maximum; korter kan.': 'Cette règle vise les SERVICES (article VI.91 du Code de droit économique) et seulement APRÈS une reconduction tacite. Tant que le contrat est dans sa première période, c’est ce que prévoit le contrat qui compte. Deux mois est le maximum légal ; plus court est possible.',
  'Vul een heel aantal dagen in, van 0 tot 365. Zolang dit niet klopt, kan je niet opslaan.': 'Indique un nombre entier de jours, de 0 à 365. Tant que ce n’est pas correct, tu ne peux pas enregistrer.',
  'Vul hier een heel aantal maanden in, van 1 tot 120 — of laat het leeg.': 'Indique ici un nombre entier de mois, de 1 à 120 — ou laisse vide.',
  'Let op:': 'Attention :',
  'In het contractblok staat een getal dat de app niet kan gebruiken. Pas het aan om op te slaan.': 'Le bloc contrat contient un nombre que l’app ne peut pas utiliser. Corrige-le pour pouvoir enregistrer.',
  'Sla je zo op, dan wis je de verlengdatum en de opzegtermijn van deze post.': 'Si tu enregistres ainsi, tu effaces la date de reconduction et le délai de préavis de cette charge.',
  'Zit hier een contract achter? (optioneel)': 'Y a-t-il un contrat derrière ? (facultatif)',
  'Nee, gewoon een vaste last': 'Non, simplement une charge fixe',
  'Verlengt of loopt af op': 'Se renouvelle ou prend fin le',
  'Om de hoeveel maanden? (optioneel)': 'Tous les combien de mois ? (facultatif)',
  'De app schuift deze datum vanzelf op zodra ze voorbij is.': 'L’app avance cette date d’elle-même dès qu’elle est passée.',
  'Zonder dit getal schuift de app de datum NIET zelf op: ze vraagt je de nieuwe. Ze kan niet weten voor hoe lang er verlengd is.': 'Sans ce nombre, l’app n’avance PAS la date d’elle-même : elle te demande la nouvelle. Elle ne peut pas savoir pour combien de temps le contrat est reconduit.',
  'Zonder termijn toont de app alleen de datum en rekent ze niets uit.': 'Sans délai, l’app affiche seulement la date et ne calcule rien.',
  'De app rekent met jouw {n} dagen.': 'L’app calcule avec tes {n} jours.',
  'verlengt {datum} · geen opzegtermijn ingevuld': 'reconduction le {datum} · aucun délai de préavis indiqué',
  'verlengt {datum} · beslissen vóór {beslis}': 'reconduction le {datum} · à décider avant le {beslis}',
  'De verlengdatum van {naam} is voorbij. Zet de nieuwe datum, anders kan de app niets meer uitrekenen.': 'La date de reconduction de {naam} est passée. Indique la nouvelle date, sinon l’app ne peut plus rien calculer.',
  'Vandaag is de laatste dag om {naam} op te zeggen vóór de verlenging.': 'Aujourd’hui est le dernier jour pour résilier {naam} avant sa reconduction.',
  'Nog {n} dag(en) om te beslissen over {naam} vóór het verlengt.': 'Encore {n} jour(s) pour décider au sujet de {naam} avant sa reconduction.',
  'Energie (elektriciteit of gas)': 'Énergie (électricité ou gaz)',
  'Telecom (internet, gsm of tv)': 'Télécom (internet, mobile ou TV)',
  'Abonnement met stilzwijgende verlenging': 'Abonnement à reconduction tacite',
  'Ander contract': 'Autre contrat',
  'De app kent voor dit soort contract geen wettelijke termijn. Vul zelf in wat er in je overeenkomst staat; zonder termijn toont ze alleen de datum en rekent ze niets uit.': 'L’app ne connaît pas de délai légal pour ce type de contrat. Indique toi-même ce que prévoit ton contrat ; sans délai, elle affiche seulement la date et ne calcule rien.',
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
  'Taal': 'Langue',
  'Laden…': 'Chargement…',
  'Let op: {n} record(s) werden overgeslagen omdat ze niet aan het schema voldeden.':
    'Attention : {n} enregistrement(s) ont été ignorés car non conformes au schéma.',
  'Vorige maand': 'Mois précédent',
  'Volgende maand': 'Mois suivant',
  'Inkomsten': 'Revenus',
  'Uitgaven': 'Dépenses',
  'Netto': 'Net',
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
  // App — categorieën
  'Categorieën': 'Catégories',
  'Verwijder categorie {naam}': 'Supprimer la catégorie {naam}',
  // App — budgetten
  'Budgetten': 'Budgets',
  'voor {maand}': 'pour {maand}',
  'Verwijder budget {naam}': 'Supprimer le budget {naam}',
  // App — transacties
  'Verwijder {oms}': 'Supprimer {oms}',
  'Saldo': 'Solde',
  // App — back-up & drive
  'Back-up & herstel': 'Sauvegarde et restauration',
  'Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.':
    'Un filet de sécurité distinct sur ton appareil, indépendant de Google Drive. Conserve le fichier en lieu sûr ; la restauration ne fait qu’ajouter et n’écrase jamais.',
  'Exporteer back-up': 'Exporter la sauvegarde',
  'Herstel uit back-up': 'Restaurer depuis la sauvegarde',
  'Back-up gedownload.': 'Sauvegarde téléchargée.',
  'Verwijderen is mislukt. Het document staat er nog; probeer het opnieuw.': 'La suppression n’a pas fonctionné. Le document est toujours là ; réessaie.',
  'Inboeken is niet gelukt. Er is niets geboekt.': 'L’enregistrement n’a pas fonctionné. Rien n’a été enregistré.',
  'Verwijderen is niet gelukt. De waardering staat er nog.': 'La suppression n’a pas fonctionné. La valorisation est toujours là.',
  'Verwijderen is niet gelukt. Er is niets weggehaald.': 'La suppression n’a pas fonctionné. Rien n’a été supprimé.',
  'Dat is niet gelukt. Je invoer staat er nog.': 'Ça n’a pas fonctionné. Ce que tu as encodé est toujours là.',
  'Dat is niet gelukt. Er is niets veranderd.': 'Ça n’a pas fonctionné. Rien n’a changé.',
  'Je antwoord is niet bewaard. Er is niets veranderd.': 'Ta réponse n’a pas été enregistrée. Rien n’a changé.',
  'Niets hersteld: dit bestand komt van een nieuwere versie van de app ({n} regels). Werk deze app eerst bij en probeer het dan opnieuw.':
    'Rien n’a été restauré : ce fichier provient d’une version plus récente de l’app ({n} lignes). Mets d’abord cette app à jour, puis réessaie.',
  'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig.':
    'Restauré : {toegevoegd} ajouté(s), {overgeslagen} déjà présent(s), {ongeldig} invalide(s).',
  'Herstellen mislukte: {fout}': 'Échec de la restauration : {fout}',
  'Verbind met Google Drive': 'Se connecter à Google Drive',
  'Synchroniseer nu': 'Synchroniser maintenant',
  'Bezig…': 'En cours…',
  'Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.':
    'Synchronisé : {gepusht} envoyé(s), {opgehaald} reçu(s).',
  'Automatisch gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald.':
    'Synchronisé automatiquement : {gepusht} envoyé(s), {opgehaald} reçu(s).',
  'Verbinden mislukte: {fout}': 'Échec de la connexion : {fout}',
  'Synchroniseren mislukte: {fout}': 'Échec de la synchronisation : {fout}',
  // Undo-meldingen
  'Ongedaan maken': 'Annuler',
  'Rekening verwijderd': 'Compte supprimé',
  'Budget verwijderd': 'Budget supprimé',
  'Dossier verwijderd': 'Dossier supprimé',
  'Kost verwijderd': 'Frais supprimés',
  'Spaardoel verwijderd': 'Objectif d’épargne supprimé',
  'Subcategorie verwijderd': 'Sous-catégorie supprimée',
  // Ronde 76
  '{naam} verwijderd, {n} boeking(en) blijven staan': '{naam} supprimé, {n} écriture(s) restent',
  '{naam} verwijderd, {n} spaardoel(en) blijven lopen': '{naam} supprimé, {n} objectif(s) d’épargne continuent',
  '{naam} verwijderd, {n} boeking(en) blijven staan en {d} spaardoel(en) blijven lopen': '{naam} supprimé, {n} écriture(s) restent et {d} objectif(s) d’épargne continuent',
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
  'Waar staat je geld?': 'Où se trouve ton argent ?',
  'Je betaalrekening, je spaarrekening, je portemonnee. Voeg ze één voor één toe; het formulier blijft staan.': 'Ton compte courant, ton compte d’épargne, ton portefeuille. Ajoute-les un par un ; le formulaire reste en place.',
  'Nog geen rekeningen. Begin met de rekening waar je loon op komt.': 'Pas encore de comptes. Commence par celui où tombe ton salaire.',
  'Een kredietkaart of kredietopening?': 'Une carte de crédit ou une ouverture de crédit ?',
  'Nog geen kredietkaart ingegeven.': 'Aucune carte de crédit saisie.',
  'Een lening, hypotheek of autofinanciering?': 'Un prêt, un crédit logement ou un financement auto ?',
  'Wat je nog moet terugbetalen, gaat af van je vermogen. Wat je hebt uitgeleend, komt erbij.': 'Ce que tu dois encore se soustrait de ton patrimoine. Ce que tu as prêté s’y ajoute.',
  'Nog geen leningen ingegeven.': 'Aucun prêt saisi.',
  'Wat staat er voor later?': 'Qu’y a-t-il pour plus tard ?',
  'Beleggingen, een termijnrekening, pensioensparen. Kies bij Type "Effectenrekening" of "Termijnrekening"; je kan de waarde later bijwerken bij de rekening zelf.': 'Placements, compte à terme, épargne-pension. Choisis « Compte-titres » ou « Compte à terme » sous Type ; tu pourras mettre la valeur à jour plus tard sur le compte lui-même.',
  'Nog niets voor later ingegeven.': 'Rien de prévu pour plus tard.',
  'Je vaste kosten': 'Tes charges fixes',
  'Je sluipende kosten': 'Tes dépenses discrètes',
  'Naar Dossiers': 'Vers Dossiers',
  'Deel je kosten met iemand?': 'Partages-tu des frais avec quelqu’un ?',
  'Bijvoorbeeld met de andere ouder van je kinderen. Kompal houdt dan bij wie wat betaalde en rekent het voor je af.': 'Par exemple avec l’autre parent de tes enfants. Kompal note alors qui a payé quoi et fait le décompte pour toi.',
  'Nog geen dossiers. Maak er hieronder een aan, of sla dit blok over.': 'Pas encore de dossiers. Crées-en un ci-dessous, ou saute ce bloc.',
  '{n}% voor jou': '{n}% pour toi',
  'Uitgeleend geld en aankopen met garantie horen ook bij Dossiers.': 'L’argent prêté et les achats sous garantie relèvent aussi des Dossiers.',
  'bedrag': 'montant',
  'Nog geen inkomsten deze maand.': 'Pas encore de revenus ce mois-ci.',
  'Zodra je een rekening hebt toegevoegd, zie je hier hoe je bezit evolueert.': 'Dès que tu auras ajouté un compte, tu verras ici l’évolution de tes avoirs.',
  'Je hebt nog geen vaste lasten ingesteld. Zonder die weet de app niet wat er nog moet komen.': 'Tu n’as encore défini aucune charge fixe. Sans elles, l’app ne peut pas savoir ce qui doit encore arriver.',
  'Loop "Je situatie" door: je rekeningen, je vaste kosten en je abonnementen. Na tien minuten weet je wat er elke maand vastligt en wat je vermogen is — nog vóór je één boeking ingeeft.':
    'Parcours « Ta situation » : tes comptes, tes charges fixes et tes abonnements. Après dix minutes, tu sauras ce qui est engagé chaque mois et ce que tu possèdes — avant même de saisir une seule écriture.',
  'Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig. Voeg er een toe bij "Je geld".':
    'Pour « combien de temps tu tiens », l’app a besoin d’un compte d’épargne ou d’espèces. Ajoutes-en un dans « Ton argent ».',
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
  'Let op: de boekingen tot en met {datum} zitten al in de waarde die je toen hebt vastgelegd. Ze tellen hieronder wel mee, maar niet meer in het saldo bovenaan.': 'Attention : les écritures jusqu’au {datum} inclus sont déjà comprises dans la valeur que tu as enregistrée alors. Elles comptent encore ci-dessous, mais plus dans le solde en haut.',
  'geldt nu': 'en vigueur',
  // Ce que coûte chaque membre du foyer (ronde 53)
  '{naam} {bedrag} — bekijk de boekingen': '{naam} {bedrag} — voir les écritures',
  'Een rij met een aandeel uit een gedeelde kost klikt niet door: zo’n aandeel is een berekening en bestaat nergens als losse boeking.':
    'Une ligne contenant une part d’un frais partagé ne s’ouvre pas : cette part est un calcul et n’existe nulle part comme écriture distincte.',
  'Let op: {n} gedeelde kost(en) komen op hetzelfde bedrag uit als een losse boeking van rond dezelfde datum (hoogstens {dagen} dagen ernaast). Staat dezelfde uitgave hier twee keer, dan is dit bedrag te hoog. Koppel zo’n boeking aan het dossier in het invoervenster, dan telt ze maar één keer.': 'Attention : {n} frais partagé(s) correspondent au même montant qu’une écriture distincte datée d’à peu près le même jour (au maximum {dagen} jours d’écart). Si la même dépense figure deux fois ici, ce montant est trop élevé. Lie une telle écriture au dossier dans la fenêtre de saisie et elle ne comptera qu’une seule fois.',
  'Wat kost elk gezinslid?': 'Que coûte chaque membre du foyer ?',
  'Wat jij dat jaar uitgaf voor elk gezinslid: je eigen boekingen plus jouw aandeel in de gedeelde kosten.':
    'Ce que tu as dépensé cette année-là pour chaque membre du foyer : tes propres écritures plus ta part des frais partagés.',
  'Jaar': 'Année',
  'Samen in {jaar}': 'Ensemble en {jaar}',
  '{n} boeking(en) en {m} gedeelde kost(en)': '{n} écriture(s) et {m} frais partagé(s)',
  '{jaar} loopt nog: dit bedrag groeit nog aan tot 31 december.':
    '{jaar} n’est pas terminée : ce montant continuera d’augmenter jusqu’au 31 décembre.',
  'In {jaar} staat er nog niets op naam van een gezinslid. Zet een gezinslid bij een boeking, of hang een kost in een dossier aan een kind.':
    'Rien n’est encore attribué à un membre du foyer en {jaar}. Ajoute un membre du foyer à une écriture, ou rattache un frais d’un dossier à un enfant.',
  'Per gezinslid': 'Par membre du foyer',
  '{bedrag} uit je boekingen': '{bedrag} de tes propres écritures',
  '{bedrag} uit gedeelde kosten': '{bedrag} des frais partagés',
  'Wat hier NIET in zit': 'Ce qui n’est PAS compris ici',
  'De onderhoudsbijdrage': 'La contribution alimentaire',
  'Die is niet per kind toe te wijzen zonder een verdeling te verzinnen die in geen enkele akte staat. Je vindt ze op het dossier zelf.':
    'Elle ne peut pas être attribuée par enfant sans inventer une répartition qui ne figure dans aucun acte. Tu la trouves sur le dossier même.',
  'De gezamenlijke pot': 'La cagnotte commune',
  'Daar zit ook geld van de andere ouder in. Meetellen zou "wat kost het mij" te hoog maken.':
    'Elle contient aussi de l’argent de l’autre parent. La compter rendrait « ce que ça me coûte » trop élevé.',
  'Een gedeelde kost telt hier voor JOUW aandeel, ook wanneer de andere ouder ze betaalde — dat aandeel ben je verschuldigd. Betaalde jij ze zelf, dan telt ze ook maar voor jouw aandeel, want de rest komt terug via de afrekening.':
    'Un frais partagé compte ici pour TA part, même si l’autre parent l’a payé — tu dois cette part. Si tu l’as payé toi-même, il ne compte lui aussi que pour ta part, car le reste revient via le décompte.',
  '{n} boeking(en) staan hier als gedeelde kost en niet als boeking, omdat je ze aan een dossier koppelde. Zo telt dezelfde uitgave maar één keer.':
    '{n} écriture(s) figurent ici comme frais partagé et non comme écriture, parce que tu les as rattachées à un dossier. Ainsi la même dépense n’est comptée qu’une fois.',
  // Le fondement de la répartition (ronde 52)
  'Waarop steunt deze verdeling?': 'Sur quoi repose cette répartition ?',
  'Duid de overeenkomst of het vonnis aan waarin de verdeling staat. De bewijsmap verwijst er dan bij elke afspraak naar, met het bijlagenummer erbij.':
    'Indique la convention ou le jugement qui fixe la répartition. Le dossier de preuves y renverra alors à chaque accord, avec le numéro d’annexe.',
  'Document': 'Document',
  'Geen document aangeduid': 'Aucun document indiqué',
  'Het document dat je hier had aangeduid, staat niet meer in de kluis van dit dossier. Kies er een ander, of voeg het opnieuw toe.':
    'Le document que tu avais indiqué ici ne se trouve plus dans le coffre de ce dossier. Choisis-en un autre, ou ajoute-le à nouveau.',
  'De app leest dit document niet en controleert de inhoud ervan niet; ze noemt het alleen als de afspraak die jij aanduidde.':
    'L’app ne lit pas ce document et n’en vérifie pas le contenu ; elle le cite uniquement comme l’accord que tu as indiqué.',
  'Waar hierboven een afspraak staat, komt die uit: {naam} (bijlage {n}). De app heeft dat document niet gelezen; je hebt het zelf aangeduid.':
    'Là où un accord figure ci-dessus, il provient de : {naam} (annexe {n}). L’app n’a pas lu ce document ; c’est toi qui l’as indiqué.',
  'Voor deze afspraken is geen document aangeduid. Voeg de overeenkomst of het vonnis toe aan de documentkluis van dit dossier en duid ze daar aan, dan staat ze hier met haar bijlagenummer.':
    'Aucun document n’a été indiqué pour ces accords. Ajoute la convention ou le jugement au coffre à documents de ce dossier et indique-le là, il apparaîtra ici avec son numéro d’annexe.',
  'Dit document is als PDF-bestand toegevoegd en kan niet als afbeelding worden ingevoegd. Vraag het losse bestand op.':
    'Ce document a été ajouté sous forme de fichier PDF et ne peut pas être inséré comme image. Demande le fichier séparé.',
  // Le tour de nettoyage (ronde 51)
  'Gezinslid': 'Membre du foyer',
  'Inkomsten {bedrag} — toon alleen deze boekingen': 'Revenus {bedrag} — n’afficher que ces écritures',
  'De tegel {naam} klikt nu niet door: met de filters die aanstaan bestaat er geen lijst die precies dat bedrag oplevert. Dat gebeurt bij een gesplitst kassaticket, waar één boeking zowel geld in als geld uit bevat.': 'La tuile {naam} n’ouvre aucune liste pour l’instant : avec les filtres actifs, aucune liste ne donne exactement ce montant. Cela arrive avec un ticket de caisse ventilé, où une même écriture contient de l’argent qui entre et de l’argent qui sort.',
  'De tegels Inkomsten en Uitgaven klikken nu niet door: met de filters die aanstaan bestaat er geen lijst die precies dat bedrag oplevert. Dat gebeurt bij een gesplitst kassaticket, waar één boeking zowel geld in als geld uit bevat.': 'Les tuiles Revenus et Dépenses n’ouvrent aucune liste pour l’instant : avec les filtres actifs, aucune liste ne donne exactement ce montant. Cela arrive avec un ticket de caisse ventilé, où une même écriture contient de l’argent qui entre et de l’argent qui sort.',
  'Uitgaven {bedrag} — toon alleen deze boekingen': 'Dépenses {bedrag} — n’afficher que ces écritures',
  // L’aperçu fiscal annuel (ronde 50)
  'Fiscaal jaaroverzicht {jaar}': 'Aperçu fiscal annuel {jaar}',
  'Meegeven aan je boekhouder': 'À remettre à ton comptable',
  'De PDF leest als een blad: elk bedrag met zijn voorbehoud erbij. De CSV is om zelf mee te rekenen — één rij per boeking.':
    'Le PDF se lit comme une feuille : chaque montant avec sa réserve. Le CSV sert à calculer toi-même — une ligne par écriture.',
  'PDF voor je boekhouder': 'PDF pour ton comptable',
  'PDF voor je boekhouder — bezig…': 'PDF pour ton comptable — en cours…',
  'Het document is gedownload.': 'Le document a été téléchargé.',
  'Het document kon niet gemaakt worden. Probeer het opnieuw.': 'Le document n’a pas pu être créé. Réessaie.',
  'Dit jaar staat niet in de app': 'Cette année ne figure pas dans l’app',
  'Niets gevonden': 'Rien trouvé',
  'Bron': 'Source',
  'Lees de voorwaarden bij de bron': 'Lis les conditions à la source',
  'De lijst is die van België. Waar een post gewestelijk is, staat ze zoals ze in Vlaanderen geldt; in Brussel en Wallonië gelden andere regels.':
    'La liste est celle de la Belgique. Lorsqu’une rubrique est régionale, elle est présentée telle qu’elle s’applique en Flandre ; à Bruxelles et en Wallonie, d’autres règles s’appliquent.',
  '{jaar} loopt nog: deze bedragen groeien nog aan tot 31 december.':
    '{jaar} n’est pas terminée : ces montants continueront d’augmenter jusqu’au 31 décembre.',
  '{jaar} loopt nog: deze bedragen groeien nog aan tot 31 december. Vul je nu je aangifte in, kies dan het jaar ervóór.':
    '{jaar} n’est pas terminée : ces montants continueront d’augmenter jusqu’au 31 décembre. Si tu remplis ta déclaration maintenant, choisis l’année précédente.',
  'Kijkt in: {categorieen}.': 'Cherche dans : {categorieen}.',
  'Twee dingen ziet dit scherm nooit: een overboeking tussen je eigen rekeningen (dat is geen uitgave) en een aflossing die je los van een categorie boekt. Staat je storting of je lening zo in de app, boek ze dan als uitgave met de juiste categorie.':
    'Deux choses que cet écran ne voit jamais : un virement entre tes propres comptes (ce n’est pas une dépense) et un remboursement que tu comptabilises sans catégorie. Si ton versement ou ton emprunt est encodé ainsi, comptabilise-le plutôt comme une dépense avec la bonne catégorie.',
  'Totaal per post': 'Total par rubrique',
  'Komt in aanmerking': 'Montant éligible',
  'Aantal met bon': 'Nombre avec justificatif',
  'Fiscaal jaaroverzicht': 'Aperçu fiscal annuel',
  'Wat je dat jaar uitgaf onder een post die in je belastingaangifte staat, met het vak en de code erbij.':
    'Ce que tu as dépensé cette année-là sous une rubrique qui figure dans ta déclaration, avec la case et le code.',
  'Inkomstenjaar': 'Année de revenus',
  'Wat je in {jaar} betaalde, geef je aan in de aangifte van aanslagjaar {aj}.':
    'Ce que tu as payé en {jaar} se déclare dans la déclaration de l’exercice d’imposition {aj}.',
  'De app verzamelt en telt op. Ze rekent niet uit wat je terugkrijgt: dat hangt af van je volledige aangifte. Dit is geen belastingadvies.':
    'L’app rassemble et additionne. Elle ne calcule pas ce que tu récupères : cela dépend de ta déclaration complète. Ceci n’est pas un conseil fiscal.',
  'Voor aanslagjaar {aj} heeft de app geen lijst. In aanslagjaar 2026 verdween een reeks belastingverminderingen in één keer, dus een lijst uit die tijd zou vandaag posten tonen die niet meer bestaan — en een te korte lijst leest als "er valt niets af te trekken".':
    'L’app n’a pas de liste pour l’exercice d’imposition {aj}. Une série de réductions d’impôt a disparu d’un coup lors de l’exercice 2026 : une liste de cette époque montrerait aujourd’hui des rubriques qui n’existent plus — et une liste trop courte se lit comme « il n’y a rien à déduire ».',
  'De app vond in {jaar} geen boekingen onder een fiscale post. Boek je die uitgaven onder een andere categorie, dan vindt ze hier niets — hieronder staat per post waar ze kijkt.':
    'L’app n’a trouvé aucune écriture sous une rubrique fiscale en {jaar}. Si tu comptabilises ces dépenses sous une autre catégorie, elle ne trouvera rien ici — ci-dessous, tu vois où elle cherche pour chaque rubrique.',
  'Dit bestaat niet meer': 'Cela n’existe plus',
  'Je hebt hier nog boekingen onder staan, maar voor aanslagjaar {aj} valt er niets meer in te vullen.':
    'Tu as encore des écritures ici, mais il n’y a plus rien à remplir pour l’exercice d’imposition {aj}.',
  'Waar de app nog gekeken heeft': 'Où l’app a encore cherché',
  'Onder deze posten vond ze in {jaar} niets. Staat er iets dat je wél betaalde, dan is het waarschijnlijk onder een andere categorie geboekt.':
    'Elle n’a rien trouvé sous ces rubriques en {jaar}. Si l’une d’elles correspond à une dépense réelle, elle a sans doute été comptabilisée sous une autre catégorie.',
  'Exporteer als CSV': 'Exporter en CSV',
  'Het bestand is gedownload.': 'Le fichier a été téléchargé.',
  'Het bestand kon niet gemaakt worden. Probeer het opnieuw.': 'Le fichier n’a pas pu être créé. Réessaie.',
  'Betaald in dit jaar': 'Payé cette année',
  '{n} boeking(en)': '{n} écriture(s)',
  '{n} met bon': '{n} avec justificatif',
  'Toon de {n} boeking(en)': 'Afficher les {n} écriture(s)',
  'Verberg de boekingen': 'Masquer les écritures',
  '{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde en daalt de komende jaren nog. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.':
    '{pct}% de ce montant entre en ligne de compte : {bedrag}. Ce pourcentage correspond à l’année du paiement et diminuera encore dans les années à venir. Le fait de pouvoir réellement demander la déduction dépend des conditions ci-dessous.',
  '{pct}% van dit bedrag komt in aanmerking: {bedrag}. Dat percentage hoort bij het jaar waarin je betaalde. Of je de aftrek ook mag vragen, hangt af van de voorwaarden hieronder.':
    '{pct}% de ce montant entre en ligne de compte : {bedrag}. Ce pourcentage correspond à l’année du paiement. Le fait de pouvoir réellement demander la déduction dépend des conditions ci-dessous.',
  '{vak} · code {codes}': '{vak} · code {codes}',
  '{vak} — de code hangt af van je situatie en staat op je attest':
    '{vak} — le code dépend de ta situation et figure sur ton attestation',
  'Betaling': 'Paiement',
  'Vak VIII': 'Cadre VIII',
  'Vak IX': 'Cadre IX',
  'Vak X': 'Cadre X',
  'Post': 'Rubrique',
  'Vak': 'Cadre',
  'Code': 'Code',
  'Let op': 'Attention',
  'Boeking': 'Écriture',
  'Vervallen': 'Supprimé',
  'waarvan {pct}% aftrekbaar: {bedrag}': 'dont {pct}% déductible : {bedrag}',
  'ja': 'oui',
  'nee': 'non',
  'Betaalde onderhoudsuitkeringen': 'Rentes alimentaires payées',
  'Betalingen voor het pensioensparen': 'Versements d’épargne-pension',
  'Premies van individuele levensverzekeringen (langetermijnsparen)':
    'Primes d’assurance-vie individuelle (épargne à long terme)',
  'Giften': 'Dons',
  'Uitgaven voor kinderoppas': 'Frais de garde d’enfants',
  'Hypothecaire lening voor je eigen woning': 'Emprunt hypothécaire pour ton habitation propre',
  'Dienstencheques': 'Titres-services',
  'Alleen wat je regelmatig betaalt op grond van een wettelijke onderhoudsplicht, aan iemand die niet bij jou woont en in de EER of Zwitserland verblijft.':
    'Uniquement ce que tu paies régulièrement en vertu d’une obligation alimentaire légale, à une personne qui ne vit pas avec toi et réside dans l’EEE ou en Suisse.',
  'Je bent minstens 18, je laatste storting valt in het jaar waarin je 64 wordt, en de begunstigde moet aan de voorwaarden voldoen — een feitelijk samenwonende partner mag het niet zijn.':
    'Tu as au moins 18 ans, ton dernier versement tombe l’année de tes 64 ans, et le bénéficiaire doit remplir les conditions — un partenaire cohabitant de fait n’est pas admis.',
  'Een contract van minstens tien jaar, afgesloten vóór je 65e, met jezelf of een verwante als begunstigde.':
    'Un contrat d’au moins dix ans, souscrit avant tes 65 ans, avec toi-même ou un parent comme bénéficiaire.',
  'Alleen aan een ERKENDE instelling, die je daarvoor een fiscaal attest bezorgt.':
    'Uniquement à une institution AGRÉÉE, qui te délivre une attestation fiscale.',
  'Voor een kind ten laste jonger dan 14 jaar (jonger dan 21 bij een zware handicap), en je moet zelf een beroepsinkomen hebben.':
    'Pour un enfant à charge de moins de 14 ans (moins de 21 ans en cas de handicap lourd), et tu dois avoir des revenus professionnels.',
  'Alleen voor leningen die al liepen: Vlaanderen schafte de woonbonus af voor nieuwe leningen, en de federale regeling verdween met aanslagjaar 2026.':
    'Uniquement pour les emprunts en cours : la Flandre a supprimé le bonus logement pour les nouveaux emprunts, et le régime fédéral a disparu avec l’exercice 2026.',
  'Gold voor cheques die je zelf kocht, met een attest van de uitgever.':
    'S’appliquait aux titres que tu achetais toi-même, avec une attestation de l’émetteur.',
  'Kies je voor fiscaal co-ouderschap (de toeslag op de belastingvrije som delen), dan kan je deze aftrek in de regel niet óók vragen; alleen in het jaar van de feitelijke scheiding zelf kunnen ze samengaan. Dat is een keuze, geen berekening — de app maakt ze niet voor jou. Doen jullie een gezamenlijke aangifte en is de uitkering door jullie samen verschuldigd, dan bestaat daar een aparte code voor.':
    'Si tu optes pour la coparentalité fiscale (partager le supplément de quotité exemptée), tu ne peux en règle générale pas demander aussi cette déduction ; seule l’année de la séparation de fait permet de cumuler les deux. C’est un choix, pas un calcul — l’app ne le fait pas à ta place. Si vous déclarez ensemble et que la rente est due par vous deux, un code distinct existe.',
  'Op je rekeningafschrift ziet een storting voor pensioensparen er hetzelfde uit als een storting voor langetermijnsparen: dezelfde bank, hetzelfde soort bedrag. Welke van de twee het is, staat op het attest van je bank of verzekeraar. Neem het bedrag hieronder dus als geheugensteun, niet als eindcijfer.':
    'Sur ton extrait de compte, un versement d’épargne-pension ressemble exactement à un versement d’épargne à long terme : même banque, même type de montant. Lequel des deux, cela figure sur l’attestation de ta banque ou de ton assureur. Prends donc le montant ci-dessous comme aide-mémoire, pas comme chiffre définitif.',
  'Je maximum hangt af van je beroepsinkomen, en de storting is op je afschrift niet te onderscheiden van pensioensparen. Het attest van je verzekeraar bepaalt het bedrag.':
    'Ton maximum dépend de tes revenus professionnels, et sur ton extrait le versement ne se distingue pas de l’épargne-pension. C’est l’attestation de ton assureur qui détermine le montant.',
  'Twee dingen die de app niet aan een overschrijving kan zien: of de instelling erkend is, en of je bij díe instelling boven de jaarlijkse drempel komt. Die drempel geldt per instelling per jaar, niet over al je giften samen.':
    'Deux choses que l’app ne peut pas déduire d’un virement : si l’institution est agréée, et si tu dépasses le seuil annuel auprès de cette institution-là. Ce seuil s’applique par institution et par an, pas sur l’ensemble de tes dons.',
  'Het maximum geldt PER OPVANGDAG, en een schoolfactuur mengt opvang met maaltijden, uitstappen en materiaal — alleen het opvangdeel telt. Het attest van de opvang splitst dat; je bankboeking niet.':
    'Le maximum s’applique PAR JOUR DE GARDE, et une facture scolaire mêle garde, repas, sorties et matériel — seule la part de garde compte. L’attestation de l’accueil fait cette distinction ; pas ton écriture bancaire.',
  'Je maandelijkse domiciliëring is kapitaal, interest en schuldsaldoverzekering in één bedrag. Alleen het bankattest splitst dat, en alleen die opsplitsing hoort in de aangifte. Het bedrag hieronder is dus wat er van je rekening ging, niet wat je invult.':
    'Ta domiciliation mensuelle réunit capital, intérêts et assurance solde restant dû en un seul montant. Seule l’attestation bancaire fait la distinction, et seule cette ventilation figure dans la déclaration. Le montant ci-dessous est donc ce qui a quitté ton compte, pas ce que tu encodes.',
  'In Vlaanderen geven dienstencheques die je vanaf 2025 kocht geen belastingvoordeel meer, en er worden ook geen attesten meer uitgereikt. In Brussel en Wallonië bestaat de vermindering nog wél — daar gelden andere bedragen.':
    'En Flandre, les titres-services achetés à partir de 2025 ne donnent plus d’avantage fiscal, et aucune attestation n’est plus délivrée. À Bruxelles et en Wallonie, la réduction existe encore — avec d’autres montants.',
  // Passer d’un chiffre à ses opérations (ronde 48/49)
  'Het gezin (zonder gezinslid)': 'Le ménage (sans membre de la famille)',
  'Subcategorieën — brood, koffiekoeken, elektriciteit… Klik je door, dan zie je de volledige boeking, dus een gesplitst kassaticket komt in zijn geheel in beeld.':
    'Sous-catégories — pain, viennoiseries, électricité… En cliquant, tu vois l’écriture complète : un ticket ventilé apparaît donc en entier.',
  'Inkomsten {bedrag} — bekijk de boekingen': 'Revenus {bedrag} — voir les écritures',
  'Uitgaven {bedrag} — bekijk de boekingen': 'Dépenses {bedrag} — voir les écritures',
  'Netto {bedrag} — bekijk alle boekingen van deze maand': 'Net {bedrag} — voir toutes les écritures de ce mois',
  '{maand} — bekijk de boekingen': '{maand} — voir les écritures',
  '{oms} {bedrag} op {datum} — open deze boeking': '{oms} {bedrag} le {datum} — ouvrir cette écriture',
  'Bekijk ze allemaal': 'Voir toutes',
  '{naam} {pct}% {bedrag} — bekijk de boekingen': '{naam} {pct}% {bedrag} — voir les écritures',
  'Uit je boeking van {datum}: {oms} — {bedrag}. Open die boeking.':
    'Issu de ton écriture du {datum} : {oms} — {bedrag}. Ouvrir cette écriture.',
  'Bekijk die boekingen': 'Voir ces écritures',
  'Bekijk die boekingen — er kwam deze maand {gekregen} binnen':
    'Voir ces écritures — {gekregen} sont rentrés ce mois-ci',
  'Netto vermogen {bedrag} — bekijk het op je overzicht': 'Patrimoine net {bedrag} — le voir sur ton aperçu',
  // Deux séries d’indices mélangées (ronde 47)
  'De app rekent niet meer met deze regeling. De indexcijfers die je zelf bijzette staan in basis {eigen} = 100, en de tabel in de app staat nu in basis {tabel} = 100. Dat zijn twee verschillende maatstaven; ze combineren geeft een bedrag dat er tientallen procenten naast zit. Verwijder je eigen cijfers hieronder en zet ze opnieuw met de cijfers uit de huidige reeks.':
    'L’app ne calcule plus avec cet arrangement. Les indices que tu as ajoutés toi-même sont exprimés en base {eigen} = 100, alors que la table de l’app est désormais en base {tabel} = 100. Ce sont deux étalons différents ; les combiner donne un montant erroné de plusieurs dizaines de pour cent. Supprime tes propres indices ci-dessous et réencode-les d’après la série actuelle.',
  'De app rekent niet met deze regeling. Je vulde zelf aanvangsindex {eigen} in, maar voor {maand} kent de app {tabel}. Dat verschil wijst erop dat je cijfer uit een oudere indexreeks komt (de index wordt om de zoveel jaar herbaseerd). Combineren met de tabel geeft een bedrag dat er tientallen procenten naast zit. Klopt {tabel} met je akte, laat het veld dan leeg. Klopt het niet, vul dan ook de cijfers van {maanden} zelf in, uit dezelfde reeks als je akte.':
    'L’app ne calcule pas avec cet arrangement. Tu as encodé toi-même l’indice de départ {eigen}, mais pour {maand} l’app connaît {tabel}. Cet écart indique que ton chiffre provient d’une série d’indices plus ancienne (l’indice est rebasé tous les quelques années). Le combiner avec la table donne un montant erroné de plusieurs dizaines de pour cent. Si {tabel} correspond à ton acte, laisse le champ vide. Sinon, encode aussi toi-même les indices de {maanden}, issus de la même série que ton acte.',
  'De app rekent niet met deze regeling. Je vulde de aanvangsindex zelf in, maar de jaarlijkse cijfers zou de app uit haar eigen tabel halen (basis {tabel} = 100). Staat je akte in een oudere reeks, dan zit het bedrag er tientallen procenten naast. Vul daarom ook de indexcijfers van {maanden} zelf in, uit dezelfde reeks als je akte.':
    'L’app ne calcule pas avec cet arrangement. Tu as encodé toi-même l’indice de départ, mais l’app prendrait les indices annuels dans sa propre table (base {tabel} = 100). Si ton acte utilise une série plus ancienne, le montant est erroné de plusieurs dizaines de pour cent. Encode donc aussi toi-même les indices de {maanden}, issus de la même série que ton acte.',
  'De onderhoudsbijdrage van {dossier} wordt niet meer geïndexeerd: de indexcijfers komen uit twee verschillende reeksen. Open de regeling om het op te lossen.':
    'La contribution alimentaire de {dossier} n’est plus indexée : les indices proviennent de deux séries différentes. Ouvre l’arrangement pour résoudre le problème.',
  'De indexatie kon niet berekend worden omdat de gebruikte indexcijfers niet uit dezelfde reeks komen. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.':
    'L’indexation n’a pas pu être calculée parce que les indices utilisés ne proviennent pas de la même série. Ci-dessous figure donc encore le montant de l’arrangement lui-même : {basis} par mois.',
  'De verjaardagen zijn niet berekend, omdat de gebruikte indexcijfers niet uit dezelfde reeks komen.':
    'Les anniversaires n’ont pas été calculés, parce que les indices utilisés ne proviennent pas de la même série.',
  'het bedrag uit de regeling van {datum}; de indexatie is niet berekend':
    'le montant de l’arrangement du {datum} ; l’indexation n’a pas été calculée',
  'De opbouw is niet berekend, want de indexcijfers komen niet uit dezelfde reeks. Bovenaan de kaart staat wat er moet gebeuren.':
    'Le détail n’a pas été calculé, car les indices ne proviennent pas de la même série. Ce qu’il faut faire est indiqué en haut de la fiche.',
  'De brief staat uit zolang de indexcijfers niet uit dezelfde reeks komen: ze zou een bedrag bevatten dat de app niet kan verantwoorden.':
    'La lettre est désactivée tant que les indices ne proviennent pas de la même série : elle contiendrait un montant que l’app ne peut pas justifier.',
  'Wat er openstaat is niet te berekenen: elke maand zou hier aan het bedrag uit de regeling geteld worden, zonder de indexatie. Het echte bedrag ligt hoger. Los eerst de indexcijfers bovenaan op.':
    'Ce qui reste dû n’est pas calculable : chaque mois serait compté ici au montant de l’arrangement, sans l’indexation. Le montant réel est plus élevé. Résous d’abord les indices en haut.',
  'Je eerdere indexcijfers stonden in basis {oud} = 100 en zijn verwijderd. Zet ze opnieuw met de cijfers uit de huidige reeks.':
    'Tes indices précédents étaient exprimés en base {oud} = 100 et ont été supprimés. Réencode-les avec les chiffres de la série actuelle.',
  'Kies eerst van welke rekening naar welke rekening je overboekt.':
    'Choisis d’abord de quel compte vers quel compte tu transfères.',
  // L’unité d’une ligne du journal (ronde 46)
  'Dit bestand komt van een oudere versie van de app. De bedragen erin zijn niet betrouwbaar te lezen; vraag de andere ouder om een nieuw bestand.':
    'Ce fichier provient d’une version plus ancienne de l’app. Ses montants ne sont pas lisibles de façon fiable ; demande un nouveau fichier à l’autre parent.',
  'Let op: van {n} regel(s) kan de app niet zien in welke eenheid de bedragen staan. Ze zijn daarom NIET ingelezen: als eenheid gelezen zou € 2.400 er als € 24 komen te staan. Er is niets van je huidige gegevens veranderd. Komen die regels van een ander toestel, werk de app daar dan ook bij.':
    'Attention : pour {n} ligne(s), l’app ne peut pas déterminer l’unité des montants. Elles n’ont donc PAS été importées : lues dans la mauvaise unité, 2 400 € s’afficheraient comme 24 €. Rien n’a changé dans tes données actuelles. Si ces lignes viennent d’un autre appareil, mets aussi l’app à jour là-bas.',
  'Let op: {n} regel(s) komen van een toestel met een NIEUWERE versie van de app. Deze app kan ze nog niet lezen, dus ze zijn niet ingelezen. Werk deze app bij (sluit hem helemaal af en open hem opnieuw) en probeer het dan nog eens.':
    'Attention : {n} ligne(s) proviennent d’un appareil avec une version PLUS RÉCENTE de l’app. Cette app ne peut pas encore les lire, elles n’ont donc pas été importées. Mets cette app à jour (ferme-la complètement et rouvre-la) puis réessaie.',
  'Gesynchroniseerd: {gepusht} verstuurd, {opgehaald} opgehaald, {geweigerd} niet leesbaar.':
    'Synchronisé : {gepusht} envoyée(s), {opgehaald} récupérée(s), {geweigerd} illisible(s).',
  'Hersteld: {toegevoegd} toegevoegd, {overgeslagen} al aanwezig, {ongeldig} ongeldig, {verouderd} uit een te oude versie (niet ingelezen).':
    'Restauré : {toegevoegd} ajoutée(s), {overgeslagen} déjà présente(s), {ongeldig} invalide(s), {verouderd} d’une version trop ancienne (non importée).',
  // Rechercher un produit (ronde 45)
  // Échange avec l’autre parent (ronde 44)
  'Categorie (optioneel)': 'Catégorie (facultatif)',
  'Subcategorie (optioneel)': 'Sous-catégorie (facultatif)',
  'minder': 'moins',
  'Intrekken': 'Retirer',
  'Terugdraaien': 'Annuler',
  'Dit is dezelfde': 'C’est le même',
  'Toch niet dezelfde': 'Finalement pas le même',
  'Ingetrokken': 'Retiré',
  'Wat de andere ouder van jouw kosten vindt': 'Ce que l’autre parent pense de tes frais',
  'Ingetrokken. Stuur het bestand door zodat de andere ouder het ziet.':
    'Retiré. Transmets le fichier pour que l’autre parent le voie.',
  'De intrekking is teruggedraaid.': 'Le retrait a été annulé.',
  'Over de {n} kost(en) in dit bestand komen jullie allebei op {bedrag} uit. Je eigen kosten zitten er niet in.':
    'Sur les {n} frais de ce fichier, vous arrivez tous les deux à {bedrag}. Tes propres frais n’y figurent pas.',
  'Vink alleen aan wat echt een andere kost is. Anders telt hetzelfde geld twee keer. Is het dezelfde kost, kies dan "Dit is dezelfde" — anders komt ze elke ronde opnieuw terug.':
    'Ne coche que ce qui est réellement un autre frais. Sinon le même argent compte deux fois. S’il s’agit du même frais, choisis « C’est le même » — sinon il reviendra à chaque tour.',
  '{n} kost(en) liggen hier vast (afgerekend, ingetrokken of in een afrekening) en blijven zoals ze zijn.':
    '{n} frais sont figés ici (réglés, retirés ou dans un décompte) et restent tels quels.',
  'De andere ouder trekt in: {namen}. Ze blijven staan, maar tellen niet meer mee.':
    'L’autre parent retire : {namen}. Ils restent visibles, mais ne comptent plus.',
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
  'Bij jou: {bedrag} op {datum}': 'Chez toi : {bedrag} le {datum}',
  'Er gaan {n} kost(en) mee, samen {bedrag}. Alleen wat nog niet afgerekend is. Je stuurt het bestand door zoals je een foto doorstuurt; de andere ouder leest het in zijn eigen Financieel Kompas in.':
    '{n} frais seront inclus, {bedrag} au total. Uniquement ce qui n’est pas encore réglé. Tu transmets le fichier comme une photo ; l’autre parent le lit dans son propre Financieel Kompas.',
  'Ook de kosten meesturen die de andere ouder betaalde': 'Inclure aussi les frais payés par l’autre parent',
  'Standaard uit: die staan bij hem al, en dan krijgt hij ze van jou terug als vermoedelijke dubbel.':
    'Désactivé par défaut : il les a déjà, et il les recevrait de toi comme doublon présumé.',
  'Bonnen meesturen': 'Inclure les justificatifs',
  'Maakt het bestand een stuk groter. Zonder bonnen blijft het klein genoeg om te mailen.':
    'Cela alourdit fortement le fichier. Sans justificatifs, il reste assez léger pour un e-mail.',
  'De app legt het bestand eerst naast dit dossier. Er verandert niets tot je het bevestigt.':
    'L’app compare d’abord le fichier à ce dossier. Rien ne change tant que tu ne confirmes pas.',
  'Wat je hier antwoordt, reist mee in het volgende bestand dat je klaarzet. Betwist een kost liever dan hem te verwijderen: verwijder je hem, dan komt hij bij de volgende uitwisseling gewoon terug.':
    'Ce que tu réponds ici accompagne le prochain fichier que tu prépares. Conteste un frais plutôt que de le supprimer : si tu le supprimes, il reviendra au prochain échange.',
  'Er staan nog geen kosten van de andere ouder in dit dossier.':
    'Il n’y a pas encore de frais de l’autre parent dans ce dossier.',
  'Uit het dossier "{naam}", klaargezet op {datum}.': 'Du dossier « {naam} », préparé le {datum}.',
  'De andere ouder komt op {hun}, jij op {jouw}. Eén cent verschil, door afronding.':
    'L’autre parent arrive à {hun}, toi à {jouw}. Un centime d’écart, dû à l’arrondi.',
  'Let op: de andere ouder komt op {hun}, jij op {jouw}.':
    'Attention : l’autre parent arrive à {hun}, toi à {jouw}.',
  '{n} kost(en) staan er al en zijn ongewijzigd.': '{n} frais y figurent déjà et sont inchangés.',
  '{n} kost(en) staan in een ander dossier ({naam}) en worden hier niet nog eens ingelezen.':
    '{n} frais figurent dans un autre dossier ({naam}) et ne seront pas relus ici.',
  '{n} antwoord(en) op jouw kosten. Die worden altijd overgenomen.':
    '{n} réponse(s) à tes frais. Elles sont toujours reprises.',
  '{n} antwoord(en) horen bij een kost die hier niet (meer) staat.':
    '{n} réponse(s) concernent un frais qui ne figure plus ici.',
  '{n} kost(en) gebruiken een andere verdeelsleutel dan dit dossier. De app houdt het percentage van de andere ouder aan, zodat jullie hetzelfde bedrag zien.':
    '{n} frais utilisent une autre clé de répartition que ce dossier. L’app retient le pourcentage de l’autre parent, afin que vous voyiez le même montant.',
  '{n} regel(s) in het bestand waren onleesbaar en zijn overgeslagen.':
    '{n} ligne(s) du fichier étaient illisibles et ont été ignorées.',
  '{naam} klaargezet: {n} kost(en).': '{naam} préparé : {n} frais.',
  '{naam} klaargezet: {n} kost(en). {b} bon(nen) waren te groot om mee te sturen.':
    '{naam} préparé : {n} frais. {b} justificatif(s) étaient trop volumineux pour être inclus.',
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
    'Rien à envoyer : il n’y a pas de frais ouverts dans ce dossier.',
  '{n} kost(en) klaar om door te sturen, samen {bedrag}.': '{n} frais prêts à être envoyés, {bedrag} au total.',
  'betwist door de andere ouder': 'contesté par l’autre parent',
  'aanvaard door de andere ouder': 'accepté par l’autre parent',
  'waarvan {n} betwist door de andere ouder': 'dont {n} contesté(s) par l’autre parent',
  // Hausses de prix (ronde 43)
  'Wat werd er duurder?': 'Qu’est-ce qui a augmenté ?',
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
  'Welke maand sluit je af?': 'Quel mois clôtures-tu ?',
  'Er staan nog {n} maanden open. Werk de oudste eerst af, dan sluiten je cijfers op elkaar aan.':
    '{n} mois sont encore ouverts. Commence par le plus ancien : tes chiffres s’enchaîneront.',
  'Stap 1': 'Étape 1',
  'Stap 2': 'Étape 2',
  'Stap 3': 'Étape 3',
  'Staat alles erin?': 'Tout est-il encodé ?',
  'Lees je bankuittreksel in, of tik de laatste boekingen zelf bij.':
    'Importe ton extrait bancaire, ou encode toi-même les dernières écritures.',
  'Er staat nog geen enkele boeking in {maand}.': 'Il n’y a pas encore la moindre écriture en {maand}.',
  '{n} boeking(en) in {maand}.': '{n} écriture(s) en {maand}.',
  'Uittreksel inlezen': 'Importer un extrait',
  'Bekijk de boekingen ›': 'Voir les écritures ›',
  'Waar hoort het bij?': 'À quoi cela se rattache-t-il ?',
  'Wat geen categorie heeft, telt nergens mee — niet in je budget en niet in je analyse.':
    'Ce qui n’a pas de catégorie ne compte nulle part — ni dans ton budget, ni dans ton analyse.',
  'Alles heeft een categorie. Niets te doen.': 'Tout a une catégorie. Rien à faire.',
  '{n} boeking(en) wachten nog op een categorie.': '{n} écriture(s) attendent encore une catégorie.',
  'Nog {n} andere. Werk deze eerst weg; de rest schuift dan vanzelf op.':
    '{n} autres suivent. Traite d’abord celles-ci ; le reste remontera tout seul.',
  'Bekijk ze in de lijst ›': 'Les voir dans la liste ›',
  'Hoe is de maand geweest?': 'Comment s’est passé le mois ?',
  'De cijfers waarvoor je het allemaal deed.': 'Les chiffres pour lesquels tu as fait tout cela.',
  'Je hield {bedrag} over.': 'Il te reste {bedrag}.',
  'Je kwam {bedrag} tekort.': 'Il t’a manqué {bedrag}.',
  'Je kwam precies uit.': 'Tu tombes juste.',
  '{n} budget(ten) gingen over hun grens.': '{n} budget(s) ont dépassé leur limite.',
  '{n} vaste last(en) staan nog niet ingeboekt in deze maand.':
    '{n} charge(s) fixe(s) ne sont pas encore encodées pour ce mois.',
  'Klaar?': 'Terminé ?',
  '{maand} is afgesloten op {datum}.': '{maand} a été clôturé le {datum}.',
  'Toch nog openzetten': 'Rouvrir malgré tout',
  'Er staat nog werk open. Je mag toch afsluiten — de app onthoudt dan wat er bleef liggen.':
    'Il reste du travail. Tu peux clôturer quand même — l’application retiendra ce qui est resté en suspens.',
  'Alles is rond. Sluit de maand af, dan weet je later dat je ernaar gekeken hebt.':
    'Tout est bouclé. Clôture le mois : tu sauras plus tard que tu l’as bien examiné.',
  'Maand afsluiten': 'Clôturer le mois',
  '{maand} is afgesloten.': '{maand} est clôturé.',
  '{maand} staat weer open.': '{maand} est de nouveau ouvert.',
  'Afsluiten is niet gelukt. Probeer het opnieuw.': 'La clôture a échoué. Réessaie.',
  'Heropenen is niet gelukt. Probeer het opnieuw.': 'La réouverture a échoué. Réessaie.',
  'rond': 'bouclé',
  'open': 'ouvert',
  'voorstel: {naam}': 'suggestion : {naam}',
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
    'Le montant de base et l’indice de départ sont repris. Le nouvel indice non : il correspond à un mois précis, et dans ton dossier l’application le recherche désormais elle-même.',
  'Bewaard in {dossier}. De app indexeert dit voortaan zelf op de verjaardag van de regeling.':
    'Enregistré dans {dossier}. L’application indexera désormais elle-même à la date anniversaire de l’accord.',
  'Bewaren is niet gelukt. Probeer het opnieuw.': 'L’enregistrement a échoué. Réessaie.',
  'Let op: voor {maand} kent de app zelf het cijfer {kent}, terwijl jij {getikt} intikte. Jouw cijfer wordt bewaard als "zoals ze in de akte staat". Komt het uit een ouder basisjaar, dan geven de volgende berekeningen een bedrag dat er juist uitziet en het niet is.':
    'Attention : pour {maand}, l’application connaît elle-même l’indice {kent}, alors que tu as encodé {getikt}. Ton chiffre est enregistré comme « tel qu’il figure dans l’acte ». S’il provient d’une année de base plus ancienne, les calculs suivants donneront un montant qui paraît correct sans l’être.',
  'Al je dossiers hebben al een onderhoudsbijdrage. Pas ze daar aan in plaats van hier een tweede te maken.':
    'Tous tes dossiers ont déjà une contribution alimentaire. Modifie-la là plutôt que d’en créer une deuxième ici.',
  'Vul de datum van het vonnis of de overeenkomst in: die bepaalt op welke dag er elk jaar geïndexeerd wordt.':
    'Indique la date du jugement ou de la convention : elle détermine le jour de l’indexation annuelle.',
  // Contribution alimentaire — la notification de la cloche
  'De onderhoudsbijdrage van {dossier} is sinds {datum} geïndexeerd: van {oud} naar {nieuw} per maand.':
    'La contribution alimentaire de {dossier} est indexée depuis le {datum} : de {oud} à {nieuw} par mois.',
  'De onderhoudsbijdrage van {dossier} moest op {datum} geïndexeerd worden, maar het indexcijfer van {maand} is nog niet bekend.':
    'La contribution alimentaire de {dossier} devait être indexée le {datum}, mais l’indice de {maand} n’est pas encore connu.',
  'De onderhoudsbijdrage van {dossier} kan niet geïndexeerd worden: de app kent geen aanvangsindex voor {maand}. Vul ze in bij de regeling, zoals ze in de akte staat.':
    'La contribution alimentaire de {dossier} ne peut pas être indexée : l’application n’a pas d’indice de départ pour {maand}. Encode-le dans l’accord, tel qu’il figure dans l’acte.',
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
    'Cette carte affiche un avoir, pas une dette. Voulais-tu dire que ce montant reste dû ? Corrige-le via Modifier — indique ce que tu dois encore, en montant positif.',
  'De afrekening': 'Le décompte',
  'Afgesloten op {datum}: {bedrag}': 'Arrêté le {datum} : {bedrag}',
  'Volledig betaald.': 'Entièrement payé.',
  'Nog te betalen: {bedrag}. Vul een afboekdag in om te weten wanneer dit van je rekening gaat.':
    'Reste à payer : {bedrag}. Indique un jour de débit pour savoir quand ce montant quittera ton compte.',
  'Nog te betalen: {bedrag}. Dat bedrag ging op {datum} van je betaalrekening — boek het hieronder in.':
    'Reste à payer : {bedrag}. Ce montant a quitté ton compte courant le {datum} — encode-le ci-dessous.',
  'Nog te betalen: {bedrag}, gaat op {datum} van je betaalrekening.':
    'Reste à payer : {bedrag}, sera débité de ton compte courant le {datum}.',
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
    'Ceci indique un avoir, pas une dette. Voulais-tu dire que ce montant reste dû ? Retire alors le signe moins.',
  'Kies bij Type "Kredietkaart". Vul bij het bedrag in wat er nog openstaat, als een gewoon positief getal, en bij de limiet hoeveel je maximaal mag opnemen.':
    'Choisis « Carte de crédit » sous Type. Pour le montant, indique ce qui reste dû, en nombre positif tout simple, et pour la limite le maximum que tu peux utiliser.',
  'Vul een afsluitdag in bij Bewerken, dan rekent de app uit wat er afgesloten is en wanneer het van je rekening gaat.':
    'Indique un jour d’arrêté via Modifier : l’application calcule alors ce qui est arrêté et quand cela quittera ton compte.',
  'Afrekening boeken': 'Encoder le décompte',
  'Sluit': 'Fermer',
  'Van welke rekening': 'Depuis quel compte',
  'Boek de overboeking': 'Encoder le virement',
  'Afrekening kredietkaart': 'Décompte carte de crédit',
  'De afrekening is geboekt als overboeking van {datum}.': 'Le décompte a été encodé comme virement daté du {datum}.',
  'De afrekening kon niet geboekt worden. Probeer het opnieuw.': 'Le décompte n’a pas pu être encodé. Réessaie.',
  'Dit wordt een overboeking, geen uitgave: de aankopen zelf zijn al geboekt op de kaart.':
    'Il s’agit d’un virement, pas d’une dépense : les achats eux-mêmes sont déjà encodés sur la carte.',
  'De laatste keer is {maand}. Daarna telt deze post niet meer mee.': 'La dernière fois est {maand}. Ensuite, ce poste ne compte plus.',
  'De {n} boeking(en) van vóór en op deze dag tellen daarna niet meer apart mee — ze zitten al in dit bedrag. Ze blijven wel gewoon in je lijst staan.': 'Les {n} écriture(s) de ce jour et d’avant ne compteront plus séparément — elles sont déjà comprises dans ce montant. Elles restent dans ta liste.',
  'Er staat al een boeking van {bedrag} op {datum} ({naam}). Is dat dezelfde betaling?': 'Il existe déjà une écriture de {bedrag} le {datum} ({naam}). Est-ce le même paiement ?',
  'Er staat al een waarde voor deze dag ({bedrag}). Die wordt vervangen.': 'Une valeur existe déjà pour ce jour ({bedrag}). Elle sera remplacée.',
  'Geef een bedrag boven nul, of laat het veld leeg.': 'Indique un montant supérieur à zéro, ou laisse le champ vide.',
  'Gekoppeld aan een boeking': 'Lié à une écriture',
  'Gestopt na {maand}': 'Arrêté après {maand}',
  'Ja, koppelen': 'Oui, les lier',
  'Je rekeningen staan op {bezit}, met {teBetalen} nog te betalen.': 'Tes comptes affichent {bezit}, avec {teBetalen} encore à rembourser.',
  'Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen en {teBetalen} nog te betalen.': 'Tes comptes affichent {bezit}, avec {teOntvangen} encore à recevoir et {teBetalen} encore à rembourser.',
  'Je rekeningen staan op {bezit}, met {teOntvangen} nog te ontvangen.': 'Tes comptes affichent {bezit}, avec {teOntvangen} encore à recevoir.',
  'Kies een dag tussen 1 en 28, of laat het veld leeg.': 'Choisis un jour entre 1 et 28, ou laisse le champ vide.',
  'Meer pagina\'s': 'Plus de pages',
  'Notitie': 'Note',
  'Vastgelegd: op {datum} stond er {bedrag}.': 'Enregistré : le {datum}, le solde était de {bedrag}.',
  'gekoppeld': 'lié',
  'nog {bedrag} van je limiet van {limiet} beschikbaar': '{bedrag} encore disponibles sur ta limite de {limiet}',
  'sinds de waarde van {datum}: {saldo}': 'depuis la valeur du {datum} : {saldo}',
  // Ronde 38
  'Kredietkaart of kredietopening': 'Carte de crédit ou ouverture de crédit',
  'Kredietlimiet (€)': 'Limite de crédit (€)',
  '1-28, optioneel': '1-28, facultatif',
  'Waarde bijwerken': 'Mettre la valeur à jour',
  'Voor rekeningen die van waarde veranderen zonder boeking, zoals beleggingen of pensioensparen. Je geschiedenis blijft staan; de app rekent vanaf deze dag verder met het bedrag dat je hier invult.': 'Pour les comptes dont la valeur change sans écriture, comme les placements ou l’épargne-pension. Ton historique reste intact ; à partir de ce jour, l’app poursuit avec le montant que tu indiques ici.',
  'Op welke dag?': 'À quelle date ?',
  'Werkelijke waarde (€)': 'Valeur réelle (€)',
  'Waarde vastleggen': 'Enregistrer la valeur',
  'Vul een datum en een bedrag in.': 'Indique une date et un montant.',
  'Bijwerken is niet gelukt. Probeer het opnieuw.': 'La mise à jour a échoué. Réessaie.',
  'Eerder vastgelegd': 'Enregistré précédemment',
  'Verwijder waardering van {datum}': 'Supprimer la valorisation du {datum}',
  'Waardering verwijderd': 'Valorisation supprimée',
  'Netto vermogen {bedrag}': 'Patrimoine net {bedrag}',
  'Je zet er wel al {bedrag} per maand voor opzij; dat staat op Budget.': 'Tu mets déjà {bedrag} de côté chaque mois pour cela ; tu le vois sur Budget.',
  'Je vaste lasten beginnen pas later. Zodra de eerste betaling er is, staat hier hoelang je toekomt.': 'Tes charges fixes ne commencent que plus tard. Dès que le premier paiement est là, tu vois ici combien de temps tu tiens.',
  'Voor "zo lang kom je toe" heeft de app een spaarrekening of cash nodig, én vaste lasten om ze tegen af te zetten.': 'Pour « combien de temps tu tiens », l’app a besoin d’un compte d’épargne ou de liquidités, et de charges fixes à mettre en face.',
  '{bedrag} telt hier nog niet mee: die kost begint pas later.': '{bedrag} ne compte pas encore ici : ce frais ne commence que plus tard.',
  '{bedrag} telt hier nog niet mee: die kosten beginnen pas later.': '{bedrag} ne compte pas encore ici : ces frais ne commencent que plus tard.',
  '{hoevaak}, vanaf een maand die je nog moet kiezen': '{hoevaak}, à partir d’un mois que tu dois encore choisir',
  '{hoevaak}, vanaf {maand}': '{hoevaak}, à partir de {maand}',
  'Eén oudere boeking valt buiten dit venster van {maanden} maanden.': 'Une écriture plus ancienne tombe en dehors de cette fenêtre de {maanden} mois.',
  '{n} oudere boekingen vallen buiten dit venster van {maanden} maanden.': '{n} écritures plus anciennes tombent en dehors de cette fenêtre de {maanden} mois.',
  'Alle inkomsten in de gekozen periode, per hoofdcategorie. Een gesplitst kassaticket telt per regel mee.': 'Tous les revenus de la période choisie, par catégorie principale. Un ticket ventilé compte ligne par ligne.',
  'Alle uitgaven in de gekozen periode, per hoofdcategorie. Een gesplitst kassaticket telt per regel mee.': 'Toutes les dépenses de la période choisie, par catégorie principale. Un ticket ventilé compte ligne par ligne.',
  'Alle inkomsten in de gekozen periode. Een bedrag voor meerdere gezinsleden is gelijk over hen verdeeld; het totaal telt elke boeking één keer.': 'Tous les revenus de la période choisie. Un montant pour plusieurs membres du ménage est réparti à parts égales entre eux ; le total compte chaque écriture une seule fois.',
  'Alle uitgaven in de gekozen periode. Een kost voor meerdere gezinsleden is gelijk over hen verdeeld; het totaal telt elke boeking één keer.': 'Toutes les dépenses de la période choisie. Un frais pour plusieurs membres du ménage est réparti à parts égales entre eux ; le total compte chaque écriture une seule fois.',
  'Ook de rijen achter “Toon alle” tellen mee.': 'Les lignes derrière « Tout afficher » comptent aussi.',
  'Alle inkomsten in de gekozen periode, per subcategorie geteld — een gesplitst kassaticket dus per regel.': 'Tous les revenus de la période choisie, comptés par sous-catégorie — un ticket ventilé compte donc ligne par ligne.',
  'Alle uitgaven in de gekozen periode, per subcategorie geteld — een gesplitst kassaticket dus per regel.': 'Toutes les dépenses de la période choisie, comptées par sous-catégorie — un ticket ventilé compte donc ligne par ligne.',
  'Alleen inkomsten met een omschrijving; een boeking zonder omschrijving staat hier niet in. Daardoor kan dit totaal lager zijn dan dat van de verdeling per categorie.': 'Uniquement les revenus avec une description ; une écriture sans description n’y figure pas. Ce total peut donc être plus bas que celui de la répartition par catégorie.',
  'Alleen uitgaven met een omschrijving; een boeking zonder omschrijving staat hier niet in. Daardoor kan dit totaal lager zijn dan dat van de verdeling per categorie.': 'Uniquement les dépenses avec une description ; une écriture sans description n’y figure pas. Ce total peut donc être plus bas que celui de la répartition par catégorie.',
  'betwist': 'contesté',
  'Alle kosten in dit dossier die nog niet afgerekend zijn, ongeacht de periode. Wat ingetrokken is telt niet mee; wat al in een afrekening staat die je nog niet als overgemaakt aanvinkte, telt hier nog wel mee.': 'Tous les frais de ce dossier qui ne sont pas encore réglés, quelle que soit la période. Ce qui a été retiré ne compte pas ; ce qui figure déjà dans un décompte que tu n’as pas encore coché comme viré compte encore ici.',
  'Alleen het openstaande kapitaal: hoofdsom min wat er terugbetaald is. Interest zit er niet in, en een afgesloten lening telt niet meer mee.': 'Uniquement le capital restant : le montant prêté moins ce qui a été remboursé. Les intérêts n’y sont pas, et un prêt clôturé ne compte plus.',
  'Alleen het openstaande kapitaal: hoofdsom min wat je al afbetaalde. De interest die je nog betaalt zit er niet in, en een afgesloten lening telt niet meer mee.': 'Uniquement le capital restant : le montant emprunté moins ce que tu as déjà remboursé. Les intérêts que tu paies encore n’y sont pas, et un prêt clôturé ne compte plus.',
  'Omgerekend naar één maand: een jaarpremie van € 1.200 telt hier als € 100. Op Budget staat daarnaast wat er in déze maand effectief vervalt — bij een post per kwartaal of per jaar is dat een ander bedrag.': 'Ramené à un mois : une prime annuelle de 1 200 € compte ici pour 100 €. Budget montre en plus ce qui échoit réellement ce mois-ci — pour un poste trimestriel ou annuel, c’est un autre montant.',
  'Je spaar- en cashrekeningen gedeeld door je vaste lasten per maand. Eten, tanken en andere losse uitgaven komen daar nog bij.': 'Tes comptes d’épargne et de liquidités divisés par tes charges fixes par mois. La nourriture, le carburant et les autres dépenses ponctuelles viennent en plus.',
  '1 maand': '1 mois',
  'Je rekeningen, plus wat men jou nog schuldig is, min wat jij nog schuldig bent. Alleen het openstaande kapitaal van een lening; de interest komt daar nog bij.': 'Tes comptes, plus ce qu’on te doit encore, moins ce que tu dois encore. Uniquement le capital restant d’un prêt ; les intérêts viennent en plus.',
  'Een gesplitst kassaticket telt per regel mee.': 'Un ticket ventilé compte ligne par ligne.',
  'Het eerste bedrag hierboven is het volledige saldo van {rekening} zoals het vandaag staat — niet alleen wat je sinds dit doel opzijzette.': 'Le premier montant ci-dessus est le solde complet de {rekening} tel qu’il est aujourd’hui — pas seulement ce que tu as mis de côté depuis cet objectif.',
  'Deze drie cijfers gaan over de boekingen vanaf {maand}; oudere boekingen tellen niet mee.': 'Ces trois chiffres portent sur les écritures à partir de {maand} ; les écritures plus anciennes ne comptent pas.',
  'Het laatste punt is de stand aan het einde van de maand. Eén boeking van later deze maand telt er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.': 'Le dernier point est la position à la fin du mois. Une écriture datée plus tard ce mois-ci y est déjà comprise, alors que le solde sur ton Aperçu compte jusqu’à aujourd’hui.',
  'Het laatste punt is de stand aan het einde van de maand. {n} boekingen van later deze maand tellen er al in mee, terwijl het saldo op je Overzicht tot vandaag telt.': 'Le dernier point est la position à la fin du mois. {n} écritures datées plus tard ce mois-ci y sont déjà comprises, alors que le solde sur ton Aperçu compte jusqu’à aujourd’hui.',
  'Hierin zit wat er deze maand al geboekt is, plus de terugkerende posten die déze maand vervallen — ook de te late. Losse uitgaven die nog komen — boodschappen, tanken — zitten er niet in.': 'Cela reprend ce qui a déjà été enregistré ce mois-ci, plus les postes récurrents qui échoient ce mois-ci — les retardataires compris. Les dépenses ponctuelles encore à venir — courses, carburant — n’y sont pas.',
  'Eén ervan is betwist door de andere ouder en telt hier toch mee.': 'L’un d’eux est contesté par l’autre parent et compte quand même ici.',
  '{n} ervan zijn betwist door de andere ouder en tellen hier toch mee.': '{n} d’entre eux sont contestés par l’autre parent et comptent quand même ici.',
  '1 betaling valt buiten deze periode en telt niet mee': '1 paiement tombe en dehors de cette période et ne compte pas',
  '{n} betalingen vallen buiten deze periode en tellen niet mee': '{n} paiements tombent en dehors de cette période et ne comptent pas',
  'Alleen de posten in de categorieën uit de lijst “Sluipende kosten” hieronder. Een eigen categorie telt hier niet mee.': 'Uniquement les postes des catégories de la liste « Frais qui grignotent » ci-dessous. Une catégorie que tu as créée toi-même ne compte pas ici.',
  'Er hangt nog een doel aan diezelfde rekening: hetzelfde geld telt bij allebei mee.': 'Un autre objectif est lié à ce même compte : le même argent compte pour les deux.',
  'Er hangen nog {n} doelen aan diezelfde rekening: hetzelfde geld telt bij allemaal mee.': '{n} autres objectifs sont liés à ce même compte : le même argent compte pour tous.',
  'Deze drie cijfers gaan over de {n} boekingen die je filters overhouden, en over niets anders.': 'Ces trois chiffres portent sur les {n} écritures que tes filtres laissent, et sur rien d’autre.',
  'Deze drie cijfers gaan over de ene boeking die je filters overhouden, en over niets anders.': 'Ces trois chiffres portent sur l’unique écriture que tes filtres laissent, et sur rien d’autre.',
  'Het bedrag rechts is dat van {maand}.': 'Le montant à droite est celui de {maand}.',
  'Bekijk de boekingen van {naam} — {bedrag} in {maand}; de doorklik toont {periode}': 'Voir les écritures de {naam} — {bedrag} en {maand} ; le lien affiche {periode}',
  'Bij wat je nog moet betalen telt alleen het openstaande kapitaal mee; de interest komt daar nog bij.':
    'Ce qu’il te reste à payer ne compte que le capital restant ; les intérêts viennent en plus.',
  'Loopt tot en met': 'Court jusqu’en',
  'Laat leeg zolang de post doorloopt. Vul hem in wanneer je opzegt — de post blijft dan gewoon in je historiek staan.': 'Laisse vide tant que le poste continue. Complète-le lors de la résiliation — le poste reste alors dans ton historique.',
  'Gestopt': 'Arrêté',
  '{naam} loopt niet meer vanaf {maand}. Er is niets geboekt.': '{naam} ne court plus à partir de {maand}. Rien n’a été enregistré.',
  'Cash': 'Espèces',
  // Categorieformulier
  // Budgetformulier
  'Budgetcategorie': 'Catégorie de budget',
  'Hoofdcategorieën': 'Catégories principales',
  'Eigen categorieën': 'Catégories personnelles',
  'Maandbudget (€)': 'Budget mensuel (€)',
  'Voor welke maanden geldt dit?': 'Pour quels mois cela vaut-il ?',
  'Alleen {maand}': 'Uniquement {maand}',
  'Je vaste budget blijft staan; deze maand geldt dit bedrag.':
    'Ton budget habituel reste ; ce montant vaut pour ce mois-ci.',
  'Dit bedrag geldt elke maand — behalve de maanden waarvoor je een apart budget zette.':
    'Ce montant vaut chaque mois — sauf les mois pour lesquels tu as défini un budget distinct.',
  'Alleen voor {maand} — je hebt hier geen vast budget voor.':
    'Uniquement pour {maand} — tu n’as pas de budget habituel pour cela.',
  'Alleen voor {maand} — normaal is dit {bedrag}.':
    'Uniquement pour {maand} — normalement c’est {bedrag}.',
  'Verwijder het budget van {naam} voor {maand}': 'Supprime le budget de {naam} pour {maand}',
  'Je hebt ook een apart budget voor:': 'Tu as aussi un budget distinct pour :',
  'Voor deze maand staat er geen budget. Je budgetten gelden voor een andere maand.':
    'Il n’y a pas de budget pour ce mois-ci. Tes budgets valent pour un autre mois.',
  'Budget instellen': 'Définir le budget',
  // Transactieformulier
  'Handelaar / winkel': 'Commerçant / magasin',
  'Bedrag (€)': 'Montant (€)',
  ' — totaal van het ticket': ' — total du ticket',
  'Kassaticket splitsen': 'Ventiler le ticket',
  'Verwijder regel {n}': 'Supprimer la ligne {n}',
  '+ Regel toevoegen': '+ Ajouter une ligne',
  'Verdeeld:': 'Réparti :',
  'van': 'sur',
  '(nog {bedrag})': '(reste {bedrag})',
  'Datum': 'Date',
  'Rekening': 'Compte',
  'Uitgave': 'Dépense',
  'Inkomst': 'Revenu',
  // Categoriekiezer
  'Categorie:': 'Catégorie :',
  'Geen': 'Aucune',
  'wissen': 'effacer',
  'Typ om te zoeken (vanaf 2 letters)…': 'Tape pour rechercher (à partir de 2 lettres)…',
  'eigen': 'perso',
  // Itemzoeker
  // Categorieboom
  'Alle categorieën': 'Toutes les catégories',
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
  'Partner is jou {bedrag} verschuldigd': 'Le partenaire te doit {bedrag}',
  'Jij bent partner {bedrag} verschuldigd': 'Tu dois {bedrag} au partenaire',
  'Niets te verrekenen': 'Rien à régler',
  'Nog geen dossiers. Maak er hieronder een aan.': 'Aucun dossier. Crées-en un ci-dessous.',
  'Gekozen dossier': 'Dossier sélectionné',
  '(jij {p}%)': '(toi {p}%)',
  'Verwijder dossier {naam}': 'Supprimer le dossier {naam}',
  'betaald door {wie}': 'payé par {wie}',
  'jou': 'toi',
  'partner': 'partenaire',
  'Bewerk kost {naam}': 'Modifier les frais {naam}',
  'Verwijder kost {naam}': 'Supprimer les frais {naam}',
  'Dossiernaam': 'Nom du dossier',
  'Aandeel jij (%)': 'Ta part (%)',
  'Dossier toevoegen': 'Ajouter un dossier',
  'Kostomschrijving': 'Description des frais',
  'Kostbedrag (€)': 'Montant des frais (€)',
  'Betaald door:': 'Payé par :',
  'Jij': 'Toi',
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
    'Déconnecté de Google Drive. Tes données restent sur cet appareil.',
  'Geef een naam en een geldig bedrag om op te slaan.': 'Indique un nom et un montant valide pour enregistrer.',
  'Geef een naam en een percentage tussen 0 en 100.': 'Indique un nom et un pourcentage entre 0 et 100.',
  'Kies een categorie en geef een bedrag.': 'Choisis une catégorie et indique un montant.',
  // Ronde 7 : chiffres corrects, clôture des prêts, perspectives
  'Uitgaven per categorie': 'Dépenses par catégorie',
  'Deze rekening heeft nog {n} boeking(en). Archiveer ze in plaats van ze te verwijderen.':
    'Ce compte comporte encore {n} écriture(s). Archive-le au lieu de le supprimer.',
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
    'Les mois antérieurs sont comptés à la contribution non indexée ; seul le mois en cours est indexé. L’indexation ne s’applique donc pas rétroactivement.',
  // Ronde 8 : icônes, filtres et sous-catégories sur place
  'je financieel kompas': 'ta boussole financière',
  'Van {datum}': 'Du {datum}',
  'Tot {datum}': 'Au {datum}',
  'Wis filter {naam}': 'Effacer le filtre {naam}',
  '+ “{naam}” toevoegen aan …': '+ Ajouter « {naam} » à …',
  'Nieuwe subcategorie “{naam}”': 'Nouvelle sous-catégorie « {naam} »',
  'Subcategorie toevoegen': 'Ajouter une sous-catégorie',
  // Ronde 9 : mise en page bureau
  'Budgetstatus': 'État des budgets',
  'Nieuwe rekening': 'Nouveau compte',
  'Rekening bewerken': 'Modifier le compte',
  // Ronde 10 : membres du foyer, types de dossiers et calculatrices
  'Gezinsleden': 'Membres du foyer',
  'Stel je gezinsleden één keer in; je kan er kosten, doelen, leningen en garanties aan koppelen.':
    'Configure tes membres du foyer une seule fois ; tu peux y rattacher des frais, des objectifs, des prêts et des garanties.',
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
    'Indique une banque ou un magasin ci-dessus en texte libre ; s’il s’agit d’un membre du foyer, choisis-le ici.',
  'Van wie is dit?': 'À qui est-ce ?',
  'voor {naam}': 'pour {naam}',
  'Uitgaven per gezinslid': 'Dépenses par membre du foyer',
  'Inkomsten per gezinslid': 'Revenus par membre du foyer',
  'Het gezin': 'La famille',
  'Onbekend gezinslid': 'Membre inconnu',
  'Nieuw dossier': 'Nouveau dossier',
  // Ronde 29 — les sous-onglets de la page Dossiers.
  'Soort dossier': 'Type de dossier',
  'Facturen & garantiebewijzen': 'Factures & garanties',
  'Wat je uitzet, verdwijnt alleen uit beeld — er gaat niets verloren.':
    'Ce que tu désactives disparaît seulement de l’écran — rien n’est perdu.',
  'Wat wil je bijhouden?': 'Que veux-tu suivre ?',
  'Gedeelde kosten': 'Frais partagés',
  'Kosten verdelen met een co-ouder of ex-partner, met een verdeelsleutel en afrekeningen.':
    'Partager les frais avec un coparent ou un ex-partenaire, avec une clé de répartition et des décomptes.',
  'Geld dat jij uitleende of zelf leende, met terugbetalingen en openstaand kapitaal.':
    'De l’argent que tu as prêté ou emprunté, avec les remboursements et le capital restant dû.',
  'Een aankoop met bon of factuur, waarvan de app de garantieperiode bewaakt.':
    'Un achat avec ticket ou facture, dont l’application surveille la période de garantie.',
  'Rekenhulpen': 'Calculatrices',
  'Huur': 'Loyer',
  'Geïndexeerde huur = basishuur × nieuwe index / aanvangsindex (Belgische formule).':
    'Loyer indexé = loyer de base × nouvel indice / indice de départ (formule belge).',
  'Voor huur gebruik je de gezondheidsindex: de aanvangsindex is die van de maand vóór de ondertekening van het huurcontract.':
    'Pour le loyer, utilise l’indice-santé : l’indice de départ est celui du mois précédant la signature du bail.',
  'Dat is {verschil} meer ({procent}).': 'Soit {verschil} de plus ({procent}).',
  'Dat is {verschil} minder ({procent}).': 'Soit {verschil} de moins ({procent}).',
  'Het bedrag blijft gelijk.': 'Le montant reste identique.',
  'Vul een basisbedrag groter dan nul in.': 'Indique un montant de base supérieur à zéro.',
  'Vul twee indexcijfers groter dan nul in.': 'Indique deux indices supérieurs à zéro.',
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
    'Avec {extra} de plus par mois, tu termines {maanden} mois plus tôt et économises {interest} d’intérêts.',
  'Met {extra} extra per maand bespaar je {interest} interest.':
    'Avec {extra} de plus par mois, tu économises {interest} d’intérêts.',
  'Spaardoel': 'Objectif d’épargne',
  'Hoeveel per maand, of wanneer haal je het?': 'Combien par mois, ou quand y arriveras-tu ?',
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
  'Je doel is al bereikt.': 'Ton objectif est déjà atteint.',
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
    'Par exemple une facture scolaire commune sans enfant associé. Si tu décoches, ces frais restent ouverts.',
  '{n} kosten zitten al in een andere afrekening': '{n} frais figurent déjà dans un autre décompte',
  'Kies eerst een categorie en geef een percentage van 0 tot 100.':
    'Choisis d’abord une catégorie et indique un pourcentage de 0 à 100.',
  'Geef een percentage van 0 tot 100 om deze verdeling toe te voegen.':
    'Indique un pourcentage de 0 à 100 pour ajouter cette répartition.',
  'Verdeling per kostensoort': 'Répartition par type de frais',
  'Voor buitengewone kosten (medisch, schools, ontwikkeling) spreken ouders vaak een andere sleutel af dan voor gewone kosten. Leeg laten = de standaard van het dossier ({p}%).':
    'Pour les frais extraordinaires (médicaux, scolaires, développement), les parents conviennent souvent d’une autre clé que pour les frais ordinaires. Laisser vide = la valeur par défaut du dossier ({p}%).',
  'Gewone kosten (% jij)': 'Frais ordinaires (% toi)',
  'Buitengewone kosten (% jij)': 'Frais extraordinaires (% toi)',
  'leeg = {p}%': 'vide = {p}%',
  'Bewaar verdeling per kostensoort': 'Enregistrer la répartition par type',
  'Geef een percentage van 0 tot 100, of laat het veld leeg.':
    'Indique un pourcentage de 0 à 100, ou laisse le champ vide.',
  'Verdeelsleutel': 'Clé de répartition',
  'Totalen': 'Totaux',
  'Totaal kosten': 'Total des frais',
  'Aantal kosten': 'Nombre de frais',
  'Jij betaalde': 'Tu as payé',
  'Partner betaalde': 'Le partenaire a payé',
  'Jouw aandeel': 'Ta part',
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
  'jouw deel': 'ta part',
  'bon toegevoegd': 'reçu joint',
  'geen bon': 'pas de reçu',
  'standaardverdeling van het dossier': 'répartition par défaut du dossier',
  'eigen percentage op de kost': 'pourcentage propre sur le frais',
  'afwijkende verdeling': 'répartition différente',
  'afspraak voor {bron}': 'accord pour {bron}',
  'afspraak voor categorie {bron}': 'accord pour la catégorie {bron}',
  'jij {p}% / partner {q}%': 'toi {p}% / partenaire {q}%',
  'jij {jij} / partner {partner}': 'toi {jij} / partenaire {partner}',
  '{n} kost(en), {bedrag}': '{n} frais, {bedrag}',
  '{n}, waarvan {m} met bon': '{n}, dont {m} avec ticket',
  'blad {n} van {totaal}': 'page {n} sur {totaal}',
  'Let op: bij het genereren stond hier {bedrag}; de verdeling van het dossier is sindsdien gewijzigd.':
    'Attention : lors de la génération, il s’agissait de {bedrag} ; la répartition du dossier a changé depuis.',
  // Ronde 12 : icône et couleur pour les catégories personnelles
  'Voorbeeld': 'Aperçu',
  'Icoon': 'Icône',
  'Kies icoon {icoon}': 'Choisir l’icône {icoon}',
  'Gekozen icoon: {icoon}': 'Icône choisie : {icoon}',
  'Nog geen icoon gekozen.': 'Aucune icône choisie.',
  'Eigen teken': 'Caractère personnel',
  'bv. 🧺': 'p. ex. 🧺',
  'Kies kleur {kleur}': 'Choisir la couleur {kleur}',
  'Gekozen kleur: {kleur}': 'Couleur choisie : {kleur}',
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
  'Overboekingen tellen hier niet mee: die verschuiven enkel geld tussen je eigen rekeningen.':
    'Les virements ne sont pas comptés ici : ils déplacent seulement de l’argent entre tes propres comptes.',
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
  'Langetermijndoelen — buffers, grote aankopen, schuldenvrij.':
    'Objectifs à long terme — réserves, gros achats, sans dettes.',
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
  'Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).':
    'Montant indexé = montant de base × nouvel indice / indice initial (formule belge).',
  'Basisbedrag (€)': 'Montant de base (€)',
  'Aanvangsindex': 'Indice initial',
  'Nieuwe index': 'Nouvel indice',
  'Geïndexeerd bedrag: {bedrag}': 'Montant indexé : {bedrag}',
  // Overboekingen
  'Geld verschuiven tussen je eigen rekeningen (geen inkomst of uitgave).':
    'Déplacer de l’argent entre tes propres comptes (ni revenu ni dépense).',
  'Bewerk overboeking {van} naar {naar}': 'Modifier le virement {van} vers {naar}',
  'Verwijder overboeking {van} naar {naar}': 'Supprimer le virement {van} vers {naar}',
  'Van rekening': 'Du compte',
  'Naar rekening': 'Vers le compte',
  'Kies twee verschillende rekeningen.': 'Choisis deux comptes différents.',
  'Over te boeken bedrag (€)': 'Montant à virer (€)',
  'Datum overboeking': 'Date du virement',
  'Omschrijving': 'Description',
  'Overboeking wijzigen': 'Modifier le virement',
  'Overboeking toevoegen': 'Ajouter un virement',
  'onbekende rekening': 'compte inconnu',
  // Kinderen & dossier-uitbreidingen (Ronde 2)
  'Kinderen': 'Enfants',
  'Voor wie? (optioneel)': 'Pour qui ? (optionnel)',
  'Voor wie?': 'Pour qui ?',
  'Duid je niemand aan, dan telt dit als een uitgave voor het gezin.':
    'Si tu ne sélectionnes personne, cette dépense compte pour la famille.',
  // Ronde 30
  'Selecteer hoofdcategorie (optioneel)': 'Choisir une catégorie principale (facultatif)',
  // Ronde 35
  '({bedrag} te veel)': '({bedrag} de trop)',
  'Melding sluiten': 'Fermer le message',
  'stuks': 'pièces',
  'goedkoopste': 'le moins cher',
  'De opslag van dit toestel zit vol. Verwijder een paar bonnetjes of foto’s en probeer opnieuw.':
    'Le stockage de cet appareil est plein. Supprime quelques reçus ou photos et réessaie.',
  'Opslaan is niet gelukt. Je invoer staat er nog.':
    'L’enregistrement a échoué. Ta saisie est toujours là.',
  'Toon alle maanden — wis het maandfilter': 'Afficher tous les mois — effacer le filtre de mois',
  'Er ging iets mis, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.':
    'Une erreur est survenue, mais tes données sont en sécurité. Le reste de l’application continue de fonctionner.',
  'Er ging iets mis in {naam}, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.':
    'Une erreur est survenue dans {naam}, mais tes données sont en sécurité. Le reste de l’application continue de fonctionner.',
  'Probeer opnieuw': 'Réessayer',
  'Zonder categorie': 'Sans catégorie',
  'Onbekend': 'Inconnu',
  'Bewaard document': 'Document enregistré',
  'Bewaren lukte niet. Je kan het bestand hierboven wel gewoon bekijken.':
    'L\u2019enregistrement a échoué. Tu peux toujours consulter le fichier ci-dessus.',
  'Blijft het vak leeg? Bewaar het bestand hieronder en open het met je eigen pdf-lezer.':
    'Le cadre reste vide ? Enregistre le fichier ci-dessous et ouvre-le avec ton lecteur PDF.',
  'Deze afbeelding kan niet getoond worden. Ze is mogelijk beschadigd bij het bewaren.':
    'Cette image ne peut pas être affichée. Elle a peut-être été endommagée lors de l\u2019enregistrement.',
  'Foto van bon of factuur: {naam}': 'Photo du reçu ou de la facture : {naam}',
  'Pdf-bestand: {naam}': 'Fichier PDF : {naam}',
  'Bewaren op dit toestel': 'Enregistrer sur cet appareil',
  'Bewaren…': 'Enregistrement…',
  'Bon of factuur': 'Reçu ou facture',
  'Contract of bewijs': 'Contrat ou justificatif',
  'De gegevens konden niet geopend worden': 'Impossible d\u2019ouvrir tes données',
  'De regels verdelen meer dan het totaalbedrag. Pas een regel of het totaal aan.':
    'Les lignes dépassent le montant total. Ajuste une ligne ou le total.',
  'Je gegevens zijn niet weg — de app kan de opslag van deze browser alleen niet openen. Dat gebeurt in een privévenster, wanneer de opslag vol zit, of wanneer deze pagina nog een oudere versie van de app is.':
    'Tes données ne sont pas perdues — l\u2019application ne parvient simplement pas à ouvrir le stockage de ce navigateur. Cela arrive en navigation privée, lorsque le stockage est plein, ou lorsque cette page utilise encore une version plus ancienne de l\u2019application.',
  'Opnieuw proberen': 'Réessayer',
  'Technische melding: {fout}': 'Message technique : {fout}',

  // Ronde 32
  'Indexatie-tools': 'Outils d’indexation',
  'Naar Overzicht': 'Vers l’aperçu',
  'Zoek: {term}': 'Recherche : {term}',
  'Zoeken': 'Rechercher',
  'Zoeken en filteren': 'Rechercher et filtrer',
  'Zoeken en filteren · {n}': 'Rechercher et filtrer · {n}',

  // Ronde 31
  '* Deze maand loopt nog, dus die staaf is nog niet volledig.':
    '* Ce mois est en cours, cette barre n’est donc pas complète.',
  'Even veel als de vorige periode. {tip}': 'Autant que la période précédente. {tip}',
  'Gemiddeld {bedrag} per maand': 'En moyenne {bedrag} par mois',
  'Het lijntje loopt over {venster}. Het verschil ernaast vergelijkt {periode} met de vorige even lange periode.':
    'La courbe couvre {venster}. La différence à côté compare {periode} à la période précédente de même durée.',
  'Het lijntje loopt over {venster}. Kies een periode (niet Alles) om er een verschil bij te zien.':
    'La courbe couvre {venster}. Choisis une période (pas Tout) pour voir une différence.',
  'Houdt dit een jaar aan, dan bespaar je {bedrag}. {tip}': 'Si cela dure un an, tu économises {bedrag}. {tip}',
  'Houdt dit een jaar aan, dan kost het {bedrag} extra. {tip}':
    'Si cela dure un an, cela coûte {bedrag} de plus. {tip}',
  'Inkomsten en uitgaven per maand': 'Revenus et dépenses par mois',
  'Nog geen uitgaven in deze vier domeinen.': 'Pas encore de dépenses dans ces quatre domaines.',
  'Nog geen uitgaven in deze vier domeinen. Zodra je boodschappen, energie, telecom of verzekeringen boekt, zie je hier hoeveel ze kosten en of ze stijgen.':
    'Pas encore de dépenses dans ces quatre domaines. Dès que tu enregistres des courses, de l’énergie, des télécoms ou des assurances, tu verras ici ce qu’elles coûtent et si elles augmentent.',
  'Nog niets geboekt in deze maanden.': 'Rien d’enregistré durant ces mois.',
  'Per hoofdcategorie — klik een rij open voor de details erachter.':
    'Par catégorie principale — clique sur une ligne pour voir le détail.',
  'Samen {bedrag} in deze periode.': '{bedrag} au total sur cette période.',
  'Samen {bedrag}. Sterkst gestegen: {naam}, {verschil} meer.':
    '{bedrag} au total. Plus forte hausse : {naam}, {verschil} de plus.',
  'Toon details': 'Afficher le détail',
  'Verberg details': 'Masquer le détail',
  'Verloop per categorie': 'Évolution par catégorie',
  'Verloop van {naam} over {venster}': 'Évolution de {naam} sur {venster}',
  'Vorige periode: {bedrag}. {tip}': 'Période précédente : {bedrag}. {tip}',
  'Waar loopt het op?': 'Où cela s’accumule-t-il ?',
  'in': 'entrées',
  'loopt nog': 'en cours',
  'uit': 'sorties',
  '{label} per categorie: {inhoud}': '{label} par catégorie : {inhoud}',
  'Hoofdcategorie: {naam}': 'Catégorie principale : {naam}',
  'Zet {naam} hoger': 'Monter {naam}',
  'Zet {naam} lager': 'Descendre {naam}',
  '{hoofd} · hele categorie': '{hoofd} · catégorie entière',
  'Eigen verdeling (% jij, optioneel)': 'Répartition personnalisée (% toi, optionnel)',
  'leeg = standaard van het dossier': 'vide = valeur par défaut du dossier',
  'voor {namen}': 'pour {namen}',
  'jij {p}%': 'toi {p}%',
  'Soort kost': 'Type de frais',
  'Gewone kost': 'Frais ordinaires',
  'Buitengewone kost': 'Frais extraordinaires',
  'buitengewoon': 'extraordinaire',
  'Verdeling per categorie': 'Répartition par catégorie',
  'Standaard draag jij {p}%. Stel hier per categorie een afwijkend percentage in.':
    'Par défaut tu supportes {p}%. Définis ici un pourcentage différent par catégorie.',
  'Verwijder verdeling {naam}': 'Supprimer la répartition {naam}',
  'Percentage jij': 'Ton pourcentage',
  // Modulaire afrekening (Ronde 2 · Brok C)
  'Openstaand': 'Dettes en cours',
  'Nieuwe afrekening': 'Nouveau décompte',
  'Kies een periode en (optioneel) kinderen. Dit blokkeert niets — je kan meerdere afrekeningen maken.':
    'Choisis une période et (facultatif) des enfants. Cela ne bloque rien — tu peux faire plusieurs décomptes.',
  'Periode van': 'Période du',
  'Periode tot': 'Période au',
  'Voor welke kinderen? (leeg = allemaal)': 'Pour quels enfants ? (vide = tous)',
  'In deze selectie: {n} kost(en), {saldo}': 'Dans cette sélection : {n} frais, {saldo}',
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
  'Gestort door:': 'Versé par :',
  'Beweging wijzigen': 'Modifier le mouvement',
  'Beweging toevoegen': 'Ajouter un mouvement',
  'Beweging verwijderd': 'Mouvement supprimé',
  'door {wie}': 'par {wie}',
  'Maandbijdrage': 'Contribution mensuelle',
  'Maandbijdrage-afspraak instellen': 'Définir la contribution mensuelle',
  'Afspraak verbergen': 'Masquer la convention',
  'Afspraak bewaren': 'Enregistrer la convention',
  'De afgesproken maandelijkse storting per ouder. Vul een aanvangs- en huidige index in om de bijdrage te indexeren (Belgische formule).':
    'Le versement mensuel convenu par parent. Saisis un index de départ et actuel pour indexer la contribution (formule belge).',
  'Bijdrage jij (€/maand)': 'Ta contribution (€/mois)',
  'Bijdrage partner (€/maand)': 'Contribution du partenaire (€/mois)',
  'Startdatum afspraak': 'Date de début de la convention',
  'Aanvangsindex (optioneel)': 'Index de départ (optionnel)',
  'Huidige index (optioneel)': 'Index actuel (optionnel)',
  'Geïndexeerde bijdrage jij: {bedrag}': 'Ta contribution indexée : {bedrag}',
  'geïndexeerd': 'indexé',
  'jij {jij}': 'toi {jij}',
  'partner {partner}': 'partenaire {partner}',
  'gestort: {bedrag}': 'versé : {bedrag}',
  'gestort {gestort}, loopt {achter} achter': 'versé {gestort}, {achter} de retard',
  'gestort {gestort}, {voor} vooruit': 'versé {gestort}, {voor} en avance',
  'gestort {gestort}, precies bij': 'versé {gestort}, pile à jour',
  // Leningen & kredieten (Ronde 2b · Brok F)
  'Leningen & kredieten': 'Prêts & crédits',
  'Geld dat jij uitleende of zelf leende. Log terugbetalingen; de app houdt het openstaand kapitaal en de geschiedenis bij.':
    'De l’argent que tu as prêté ou emprunté. Enregistre les remboursements ; l’app suit le capital restant et l’historique.',
  'Nog geen leningen. Voeg er hieronder een toe.': 'Aucun prêt pour l’instant. Ajoutes-en un ci-dessous.',
  'Nieuwe lening': 'Nouveau prêt',
  'Lening bewerken': 'Modifier le prêt',
  'Lening toevoegen': 'Ajouter un prêt',
  'Lening wijzigen': 'Modifier le prêt',
  'Lening verwijderd': 'Prêt supprimé',
  'Soort': 'Type',
  'Ik leende uit (iemand is mij verschuldigd)': 'J’ai prêté (on me doit)',
  'Ik leende / een krediet (ik betaal af)': 'J’ai emprunté / un crédit (je rembourse)',
  'Naam': 'Nom',
  'bv. Lening aan broer of Autolening': 'p.ex. Prêt au frère ou Prêt auto',
  'Startbedrag / openstaand kapitaal (€)': 'Montant initial / capital restant (€)',
  'Kredietgever (optioneel)': 'Prêteur (optionnel)',
  'Wie (optioneel)': 'Qui (optionnel)',
  'Startdatum': 'Date de début',
  'Rentevoet % (optioneel)': 'Taux d’intérêt % (optionnel)',
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
  'nog {n} maand(en) tot {datum}': 'encore {n} mois jusqu’au {datum}',
  'termijn verstreken sinds {datum}': 'échéance dépassée depuis {datum}',
  'termijn loopt deze maand af': 'échéance ce mois-ci',
  'Geschiedenis tonen ({n})': 'Afficher l’historique ({n})',
  'Geschiedenis verbergen': 'Masquer l’historique',
  'Aflossing (€)': 'Remboursement (€)',
  'Datum aflossing': 'Date du remboursement',
  'Aflossing toevoegen': 'Ajouter un remboursement',
  'Aflossing verwijderd': 'Remboursement supprimé',
  'Verwijder aflossing {datum}': 'Supprimer le remboursement {datum}',
  // Garanties & facturen (Ronde 2b · Brok G)
  'Hou per aankoop de garantie en de factuur bij. De app berekent de vervaldatum en waarschuwt vóór ze afloopt.':
    'Conserve la garantie et la facture par achat. L’app calcule la date d’expiration et prévient avant la fin.',
  'Nog geen aankopen. Voeg er hieronder een toe.': 'Aucun achat pour l’instant. Ajoutes-en un ci-dessous.',
  'Nieuwe aankoop': 'Nouvel achat',
  'Aankoop bewerken': 'Modifier l’achat',
  'Garantie toevoegen': 'Ajouter une garantie',
  'Garantie wijzigen': 'Modifier la garantie',
  'Garantie verwijderd': 'Garantie supprimée',
  'Niet gekoppeld': 'Non lié',
  'Product': 'Produit',
  'bv. Wasmachine': 'p.ex. Lave-linge',
  'Winkel (optioneel)': 'Magasin (optionnel)',
  'Aankoopdatum': 'Date d’achat',
  'Prijs € (optioneel)': 'Prix € (optionnel)',
  'Garantie in maanden': 'Garantie en mois',
  '24 = wettelijk (2 jaar); tweedehands minstens 12; langere commerciële garantie mag ook.':
    '24 = légal (2 ans) ; occasion au moins 12 ; une garantie commerciale plus longue est possible.',
  'Bewerk garantie {naam}': 'Modifier la garantie {naam}',
  'Verwijder garantie {naam}': 'Supprimer la garantie {naam}',
  'gekocht {datum}': 'acheté {datum}',
  'vervalt {datum}': 'expire {datum}',
  'bon/factuur': 'reçu/facture',
  'aankoopdatum onleesbaar': 'date d’achat illisible',
  'vervaldatum onbekend': 'date d’expiration inconnue',
  'verlopen': 'expiré',
  'nog {n} dag(en)': '{n} jour(s) restant(s)',
  'nog {n} maand(en)': '{n} mois restant(s)',
  // Zoeken & filteren over transacties (Ronde 3 · Brok H)
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
  'Toon enkel recente maanden': 'Afficher uniquement les mois récents',
  // Instellingen (Ronde 3 · Brok I)
  'Instellingen': 'Paramètres',
  // Navigatie / pagina's (Ronde 5 · Brok Q)
  'Hoofdnavigatie': 'Navigation principale',
  'Ga naar de inhoud': 'Aller au contenu',
  'Overzicht': 'Aperçu',
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
  'Uitgaven per winkel': 'Dépenses par magasin',
  'Inkomsten per bron': 'Revenus par source',
  'Toon minder': 'Afficher moins',
  'Toon alle {n} — incl. {m} overige': 'Afficher les {n} — dont {m} autres',
  'Overige ({n})': 'Autres ({n})',
  'Totaal': 'Total',
  'Terug': 'Retour',
  'van het totaal': 'du total',
  'Per subcategorie': 'Par sous-catégorie',
  'Kassaticket gesplitst': 'Ticket ventilé',
  // Vermogensevolutie (Ronde 5 · Brok S)
  'Vermogensevolutie': 'Évolution du patrimoine',
  // Trends & stijgers/dalers (Ronde 5 · Brok T)
  // Vooruitblik & spaarquote (Ronde 5 · Brok V)
  'Vooruitblik & spaarquote': 'Aperçu & taux d’épargne',
  'Spaarquote': 'Taux d’épargne',
  'Nog geen inkomsten in deze periode': 'Pas encore de revenus sur cette période',
  '{saldo} van {inkomsten} inkomsten overgehouden': '{saldo} conservés sur {inkomsten} de revenus',
  'Vooruitblik — {maand}': 'Aperçu — {maand}',
  'spaarquote': 'taux d’épargne',
  'Al geboekt — inkomsten': 'Déjà comptabilisé — revenus',
  'Al geboekt — uitgaven': 'Déjà comptabilisé — dépenses',
  'Nog te komen — inkomsten': 'À venir — revenus',
  'Nog te komen — uitgaven': 'À venir — dépenses',
  // Weergave / thema (Ronde 5 · Brok O)
  'Weergave': 'Apparence',
  'Kies licht of donker, of laat de app de voorkeur van je toestel volgen.':
    'Choisis clair ou sombre, ou laisse l’app suivre la préférence de ton appareil.',
  'Licht': 'Clair',
  'Donker': 'Sombre',
  'Synchronisatie (Google Drive)': 'Synchronisation (Google Drive)',
  'Synchroniseer je gegevens veilig tussen je toestellen via je eigen Google Drive. Enkel een back-uplogboek; je data blijft lokaal-eerst.':
    'Synchronise tes données en toute sécurité entre tes appareils via ton propre Google Drive. Uniquement un journal de sauvegarde ; tes données restent local-first.',
  'Sluiten': 'Fermer',
  // De vraag bij het sluiten van een half ingevuld formulier (ronde 55)
  'Je invoer is nog niet opgeslagen': 'Ta saisie n’est pas encore enregistrée',
  'Je invoer is nog niet opgeslagen. Wil je ze weggooien?': 'Ta saisie n’est pas encore enregistrée. Veux-tu la supprimer ?',
  'Verder invullen': 'Continuer la saisie',
  // De melding dat er een nieuwe versie klaarstaat (ronde 56)
  'Er is een nieuwe versie van de app. Herlaad om ze te gebruiken — je gegevens blijven staan.':
    'Une nouvelle version de l’app est disponible. Recharge pour l’utiliser — tes données restent en place.',
  'Herlaad': 'Recharger',
  'Dit onderdeel kon niet geladen worden. Herlaad de pagina en probeer het opnieuw.':
    'Cette partie n’a pas pu être chargée. Recharge la page et réessaie.',
  'Dit onderdeel kon niet geladen worden omdat je geen verbinding hebt. Probeer het opnieuw zodra je weer online bent.':
    'Cette partie n’a pas pu être chargée car tu es hors ligne. Réessaie dès que tu es de nouveau en ligne.',
  'Weggooien': 'Supprimer',
  // --- Coffre à documents par dossier ---
  'Documentkluis': 'Coffre à documents',
  'Bewaar de ouderschapsovereenkomst, attesten, bonnen en het vonnis van dit dossier op één plek.':
    'Conserve la convention parentale, les attestations, les tickets et le jugement de ce dossier au même endroit.',
  'Nog geen documenten. Voeg er hieronder een toe.': 'Pas encore de documents. Ajoutes-en un ci-dessous.',
  'Nieuw document': 'Nouveau document',
  'Overeenkomst': 'Convention',
  'Attest': 'Attestation',
  'Bon': 'Reçu',
  'Vonnis': 'Jugement',
  'Ander': 'Autre',
  'Bekijken': 'Consulter',
  'Ja, verwijder': 'Oui, supprimer',
  'Verwijder document {naam}': 'Supprimer le document {naam}',
  'Bestand (foto of PDF)': 'Fichier (photo ou PDF)',
  'Gekozen bestand': 'Fichier choisi',
  'Ander bestand kiezen': 'Choisir un autre fichier',
  'Document toevoegen': 'Ajouter le document',
  'bv. Ouderschapsovereenkomst 2026': 'p. ex. Convention parentale 2026',
  'Geef een naam en kies een bestand om op te slaan.': 'Indique un nom et choisis un fichier pour enregistrer.',
  'Dit bestand is te groot (max. 4 MB). Kies een kleinere scan of foto.':
    'Ce fichier est trop volumineux (max. 4 Mo). Choisis un scan ou une photo plus petite.',
  'Dit bestand kon niet gelezen worden. Probeer een andere scan of foto.':
    'Ce fichier n’a pas pu être lu. Essaie un autre scan ou une autre photo.',
  'Opslaan is mislukt. Probeer het opnieuw; je invoer blijft staan.':
    'Échec de l’enregistrement. Réessaie ; ta saisie est conservée.',
  'Dat is niet bewaard — je scherm staat weer zoals het was.':
    'Ce changement n’a pas été enregistré — ton écran est revenu comme avant.',
  'Document verwijderd': 'Document supprimé',
  'Document verwijderd. Het stond in dit dossier als grondslag van de verdeling; die aanduiding is mee weg.': 'Document supprimé. Il était désigné dans ce dossier comme la base de la répartition ; cette désignation disparaît avec lui.',
  'Bewaar de leningovereenkomst en de betalingsbewijzen van deze lening op één plek.':
    'Conserve le contrat de prêt et les preuves de paiement de ce prêt au même endroit.',
  'Bewaar de factuur, het aankoopbewijs, het garantiebewijs en de handleiding van deze aankoop op één plek.':
    'Conserve la facture, la preuve d’achat, le certificat de garantie et le mode d’emploi de cet achat au même endroit.',
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
    'Efface toutes tes données sur cet appareil et repart de zéro.',
  'Ook de logbestanden in je Google Drive-back-up worden opgeruimd, anders komt alles bij de volgende synchronisatie gewoon terug. Ze gaan naar de prullenbak van Drive, dus je kan ze daar nog terughalen.':
    'Les fichiers journaux de ta sauvegarde Google Drive sont également supprimés ; sinon, tout reviendrait à la prochaine synchronisation. Ils vont à la corbeille de Drive, tu peux donc encore les récupérer.',
  'Er is nu geen Google Drive-back-up verbonden. Gebruik je de app op meerdere toestellen, doe dit dan ook daar — anders komt hun data bij een volgende synchronisatie terug.':
    'Aucune sauvegarde Google Drive n’est connectée pour le moment. Si tu utilises l’application sur plusieurs appareils, fais-le aussi sur ceux-ci — sinon leurs données reviendront à la prochaine synchronisation.',
  'Dit kan niet ongedaan gemaakt worden. Maak eerst een back-up als je je gegevens wil bewaren.':
    'Cette action est irréversible. Fais d’abord une sauvegarde si tu souhaites conserver tes données.',
  'Typ {woord} om te bevestigen': 'Tape {woord} pour confirmer',
  'WISSEN': 'EFFACER',
  'Alles wissen': 'Tout effacer',
  'Alles is gewist. Je begint met een schone lei.': 'Tout a été effacé. Tu repars de zéro.',
  'Lokaal is alles gewist, maar de back-up kon niet opgeruimd worden. Verbind opnieuw en probeer het nog eens, anders komt je oude data bij de volgende synchronisatie terug.':
    'Tout a été effacé localement, mais la sauvegarde n’a pas pu être nettoyée. Reconnecte-toi et réessaie, sinon tes anciennes données reviendront à la prochaine synchronisation.',
  'Alles is gewist op dit toestel.': 'Tout a été effacé sur cet appareil.',
  'Wissen is mislukt. Er is niets gewist.': 'L’effacement a échoué. Rien n’a été effacé.',
  // --- Application vide : premiere etape ---
  'Welkom bij Kompal': 'Bienvenue dans Kompal',
  'De app is nog helemaal leeg — alles wat er straks in staat, is van jou.':
    'L’application est encore totalement vide — tout ce qui s’y trouvera sera à toi.',
  'Wil je je gegevens ook op je andere toestellen? Verbind dan later even met Google Drive via Instellingen.':
    'Tu veux tes données sur tes autres appareils ? Connecte-toi plus tard à Google Drive via les Paramètres.',
  'Geef een handelaar en een bedrag om op te slaan.': 'Indique un commerçant et un montant pour enregistrer.',
  'Zo verschijnt dit doel straks in de lijst.': 'Voici comment cet objectif apparaîtra dans la liste.',
  // Ronde 17 — meldingen, balans, besparen en privacy
  'Budget {naam} is overschreden ({pct}%)': 'Le budget {naam} est dépassé ({pct}%)',
  'Budget {naam} is {pct}% verbruikt': 'Le budget {naam} est utilisé à {pct}%',
  'Garantie op {product} verloopt binnen {n} dag(en)': 'La garantie de {product} expire dans {n} jour(s)',
  'Meldingen ({n})': 'Notifications ({n})',
  'Overschot': 'Excédent',
  'Tekort': 'Déficit',
  'In balans': 'Équilibré',
  'Je houdt deze maand {bedrag} over. Dat is het deel dat naar sparen of een doel kan.':
    'Il te reste {bedrag} ce mois-ci. C’est la part que tu peux mettre de côté ou affecter à un objectif.',
  'Je geeft deze maand {bedrag} meer uit dan er binnenkomt. Dat komt uit je spaargeld of van je rekening.':
    'Ce mois-ci, tu dépenses {bedrag} de plus qu’il n’entre. Cela vient de ton épargne ou de ton compte.',
  'Inkomsten en uitgaven zijn deze maand exact gelijk: je houdt niets over, maar komt ook niets tekort.':
    'Revenus et dépenses sont exactement égaux ce mois-ci : rien ne reste, mais rien ne manque non plus.',
  'Telecom en abonnementen': 'Télécom et abonnements',
  'Verzekeringen': 'Assurances',
  'Vergelijk de prijzen van de winkels in je buurt en overloop je kassabonnen.':
    'Compare les prix des magasins de ton quartier et relis tes tickets de caisse.',
  'Pas je verbruik aan en vergelijk de contracten van de leveranciers.':
    'Adapte ta consommation et compare les contrats des fournisseurs.',
  'Vergelijk de pakketten voor internet, tv en gsm — en schrap wat je niet gebruikt.':
    'Compare les formules internet, TV et mobile — et supprime ce que tu n’utilises pas.',
  'Vergelijk je polissen; vooral auto en hospitalisatie schelen vaak veel.':
    'Compare tes polices ; l’auto et l’hospitalisation font souvent une grosse différence.',
  'Het belletje bovenaan waarschuwt je zodra een budget van deze maand tegen zijn grens loopt.':
    'La cloche en haut t’avertit dès qu’un budget de ce mois approche de sa limite.',
  'Waarschuw vanaf': 'Avertir à partir de',
  '{n}% verbruikt': '{n}% utilisé',
  'Een overschreden budget, een garantie die bijna verloopt en een vaste last die nog niet geboekt is, meldt de app altijd — die staan los van deze keuze.':
    'Un budget dépassé, une garantie qui expire bientôt et une charge fixe non enregistrée sont toujours signalés — indépendamment de ce choix.',
  'Je gegevens en je privacy': 'Tes données et ta vie privée',
  'Waar je cijfers staan, en wat de app wel en niet verstuurt.':
    'Où vivent tes chiffres, et ce que l’application envoie ou non.',
  'Alles staat op dit toestel': 'Tout se trouve sur cet appareil',
  'De back-up staat in jouw Google Drive': 'La sauvegarde se trouve dans ton propre Google Drive',
  'Verbind je Drive, dan schrijft de app een logboek in één eigen map in jouw Drive. De app krijgt alleen toegang tot de bestanden die ze zelf maakt, niet tot de rest van je Drive. Die back-up is niet extra versleuteld: wie bij je Google-account kan, kan ze lezen — beveilig dat account dus goed.':
    'Si tu connectes Drive, l’application écrit un journal dans un seul dossier qui lui appartient, dans ton Drive. Elle n’accède qu’aux fichiers qu’elle crée elle-même, pas au reste de ton Drive. Cette sauvegarde n’est pas chiffrée en plus : qui accède à ton compte Google peut la lire — protège donc bien ce compte.',
  'Wat er wél het toestel verlaat': 'Ce qui quitte bel et bien l’appareil',
  'Loopt de app vast, dan wordt een technisch foutrapport verstuurd (welke fout, welke browser) — nooit een bedrag of een naam. Verder gaat er niets weg.':
    'Si l’application plante, un rapport d’erreur technique est envoyé (quelle erreur, quel navigateur) — jamais un montant ni un nom. Rien d’autre ne sort.',
  'Geen advertenties, geen doorverkoop': 'Pas de publicité, pas de revente',
  'Er zit geen advertentie- of volgcode in de app, en je gegevens gaan naar niemand anders.':
    'L’application ne contient aucun code publicitaire ou de pistage, et tes données ne vont à personne d’autre.',
  // Ronde 18 — spaardoelen, buffer en auto-categorisatie
  'Doel gehaald': 'Objectif atteint',
  'Datum voorbij': 'Date dépassée',
  'De doeldatum is verstreken. Zet een nieuwe datum om weer een tempo te kunnen berekenen.':
    'La date cible est dépassée. Fixe une nouvelle date pour obtenir à nouveau un rythme.',
  'Op schema': 'Dans les temps',
  'Achter op schema': 'En retard',
  '{bedrag} per maand nodig ({n} mnd te gaan)': '{bedrag} par mois nécessaires ({n} mois restants)',
  'jouw streefbedrag: {bedrag}': 'ton montant cible : {bedrag}',
  'je tempo: {bedrag} per maand (gemiddeld over {n} maanden)':
    'ton rythme : {bedrag} par mois (moyenne sur {n} mois)',
  'zo klaar rond {datum}': 'à ce rythme, terminé vers {datum}',
  'Zet een doeldatum of een maandbedrag om te zien of je op schema zit.':
    'Fixe une date cible ou un montant mensuel pour voir si tu es dans les temps.',
  'Koppel een rekening of zet een doeldatum om te zien of je op schema zit.':
    'Lie un compte ou fixe une date cible pour voir si tu es dans les temps.',
  '{n} maanden buffer': '{n} mois de réserve',
  '1 maand buffer': '1 mois de réserve',
  'Je vaste lasten zijn {last} per maand. Met {geld} op je spaar- en cashrekeningen kom je zo lang toe zonder inkomen — eten en tanken komen daar nog bij.':
    'Tes charges fixes sont de {last} par mois. Avec {geld} sur tes comptes d’épargne et en liquide, tu tiendrais ce temps-là sans revenu — la nourriture et le carburant viennent en plus.',
  'Vorige keer bij deze handelaar:': 'La dernière fois chez ce commerçant :',
  'Gebruik {naam}, zoals de vorige keer': 'Utiliser {naam}, comme la dernière fois',
  // Ronde 19 — installeren, venster en categorielijsten
  'Op je beginscherm': 'Sur ton écran d’accueil',
  'Je gebruikt Kompal al als app. Zo werkt ze ook zonder internet.':
    'Tu utilises déjà Kompal comme application. Ainsi elle fonctionne aussi sans internet.',
  'Op je beginscherm zetten': 'Ajouter à ton écran d’accueil',
  'Zet Kompal bij je andere apps: ze opent dan zonder browserbalken en werkt ook zonder internet.':
    'Place Kompal à côté de tes autres applications : elle s’ouvre alors sans les barres du navigateur et fonctionne aussi sans internet.',
  'Zet op beginscherm': 'Ajouter à l’écran d’accueil',
  'De app staat nu op je beginscherm.': 'L’application est maintenant sur ton écran d’accueil.',
  'Niet toegevoegd. Je kan het later opnieuw proberen.': 'Non ajoutée. Tu peux réessayer plus tard.',
  'Open deze pagina in Safari (niet in een andere browser).': 'Ouvre cette page dans Safari (pas dans un autre navigateur).',
  'Tik op de drie puntjes rechts van de adresbalk en kies "Deel".':
    'Touche les trois points à droite de la barre d’adresse et choisis « Partager ».',
  'Scroll in die lijst naar onder tot "Zet op beginscherm".':
    'Fais défiler cette liste jusqu’à « Sur l’écran d’accueil ».',
  'Zet de schakelaar "Open as Web App" AAN — anders krijg je enkel een bladwijzer.':
    'Active le commutateur « Open as Web App » — sinon tu n’obtiens qu’un signet.',
  'Tik op "Voeg toe".': 'Touche « Ajouter ».',
  'Je browser biedt hier nu niets aan. Op een telefoon lukt het meestal via het menu van je browser, met een keuze als "Toevoegen aan beginscherm" of "App installeren".':
    'Ton navigateur ne propose rien ici pour le moment. Sur un téléphone, cela passe généralement par le menu du navigateur, avec une option comme « Ajouter à l’écran d’accueil » ou « Installer l’application ».',
  'Toon ze ook': 'Les afficher aussi',
  // Ronde 21 — de invoerpopup
  'Wat wil je boeken?': 'Que veux-tu enregistrer ?',
  'Vaste last': 'Charge fixe',
  'Sparen': 'Épargner',
  'Uitgave toevoegen': 'Ajouter une dépense',
  'Inkomst toevoegen': 'Ajouter un revenu',
  'Vaste last toevoegen': 'Ajouter une charge fixe',
  'Opslaan + volgende': 'Enregistrer + suivant',
  'Komt dit geld binnen of gaat het eruit?': "Cet argent entre-t-il ou sort-il ?",
  'Een vaste last komt elke maand terug. Je boekt ze per maand in, ze wordt niet automatisch afgeschreven.':
    "Une charge fixe revient chaque mois. Tu l’enregistres mois par mois ; elle n’est pas prélevée automatiquement.",
  'Sparen is geld verschuiven tussen je eigen rekeningen. Het is geen uitgave en telt nergens in een budget mee.':
    "Épargner, c’est déplacer de l’argent entre tes propres comptes. Ce n’est pas une dépense et cela ne compte dans aucun budget.",
  // Ronde 22 — invoer completeren
  'Meer opties': "Plus d’options",
  'Meer opties ({n} ingevuld)': "Plus d’options ({n} rempli(s))",
  'Minder opties': "Moins d’options",
  'Delen in een dossier (optioneel)': 'Partager dans un dossier (optionnel)',
  'Niet delen': 'Ne pas partager',
  'Je betaalde deze uitgave zelf. De verdeling volgt de afspraak van het dossier; op de Dossiers-pagina kan je ze voor deze kost nog aanpassen.':
    "Tu as payé cette dépense toi-même. La répartition suit l’accord du dossier ; sur la page Dossiers, tu peux encore l’ajuster pour ce frais.",
  'Deze uitgave zit al in een afrekening van een dossier en wordt hier niet meer gewijzigd.':
    "Cette dépense figure déjà dans un décompte de dossier et n’est plus modifiée ici.",
  'Een inkomst kan geen gedeelde kost zijn. Bewaar je dit zo, dan verdwijnt de koppeling met het dossier.':
    'Un revenu ne peut pas être un frais partagé. Si tu enregistres ainsi, le lien avec le dossier disparaît.',
  'bv. Kassaticket Colruyt': 'p.ex. ticket de caisse Colruyt',
  // Ronde 23 — de Plan-pagina en vaste lasten met andere termijnen
  'Hoe vaak?': 'À quelle fréquence ?',
  'Elke maand': 'Chaque mois',
  'Om de 3 maanden': 'Tous les 3 mois',
  'Om de 6 maanden': 'Tous les 6 mois',
  'Eén keer per jaar': 'Une fois par an',
  'Eerste betaling in': 'Premier paiement en',
  'Hier maandelijks voor opzijzetten': 'Mettre de côté chaque mois pour ceci',
  'In de maanden zonder betaling rekent je plan op {bedrag} opzij.':
    "Les mois sans paiement, ton plan met {bedrag} de côté.",
  'Zonder dit staat het volle bedrag in één keer in je plan, in de maand dat het vervalt.':
    "Sans cela, le montant complet apparaît en une fois dans ton plan, le mois de l’échéance.",
  'Niet deze maand': 'Pas ce mois-ci',
  'volgende keer {datum}': 'prochaine fois le {datum}',
  ' · {bedrag} per maand opzij': ' · {bedrag} par mois de côté',
  ' · {bedrag} per maand omgerekend': ' · {bedrag} par mois une fois réparti',
  'Wat ligt vast, wat blijft over': 'Ce qui est engagé, ce qui reste',
  'Op basis van je vaste lasten en je verwachte inkomsten deze maand.':
    'Sur la base de tes charges fixes et des revenus attendus ce mois-ci.',
  'Verwachte inkomsten': 'Revenus attendus',
  'Vaste lasten deze maand': 'Charges fixes ce mois-ci',
  'Opzij voor later': 'Mis de côté pour plus tard',
  'Te verdelen': 'À répartir',
  'Je budgetten vragen samen {gebudgetteerd} hiervan.': 'Tes budgets en réclament {gebudgetteerd}.',
  'Je budgetten vragen samen {gebudgetteerd} — dat is meer dan er te verdelen valt.':
    "Tes budgets réclament {gebudgetteerd} au total — plus qu’il n’y a à répartir.",
  'Over het hele jaar kosten je vaste lasten gemiddeld {bedrag} per maand.':
    'Sur toute l’année, tes charges fixes reviennent en moyenne à {bedrag} par mois.',
  '{naam} staat nog niet ingeboekt deze maand': "{naam} n’a pas encore été enregistré ce mois-ci",
  // Ronde 24 — de Transacties-pagina
  'Alle maanden': 'Tous les mois',
  'Sorteer op': 'Trier par',
  'Sorteer op {kolom}': 'Trier par {kolom}',
  'Alles selecteren': 'Tout sélectionner',
  'Selecteer {oms}': 'Sélectionner {oms}',
  '{n} geselecteerd': '{n} sélectionné(s)',
  'Selectie wissen': 'Effacer la sélection',
  'Ja, verwijder {n}': 'Oui, supprimer {n}',
  'Gedeeld in een dossier': 'Partagé dans un dossier',
  'gedeeld': 'partagé',
  // Ronde 25 — vaste inkomsten, budgetdiepte en inboeken ongedaan maken
  'Vaste inkomsten': 'Revenus réguliers',
  'Vaste inkomst toevoegen': 'Ajouter un revenu régulier',
  'Je loon en alles wat elke maand binnenkomt. Hierop rekent je plan.':
    "Ton salaire et tout ce qui rentre chaque mois. C’est la base de ton plan.",
  'Nog geen vaste inkomsten. Vul hieronder je loon in, anders weet je plan niet wat er te verdelen valt.':
    "Pas encore de revenus réguliers. Ajoute ton salaire ci-dessous, sinon ton plan ne sait pas ce qu’il y a à répartir.",
  'Nog geen vaste lasten.': 'Pas encore de charges fixes.',
  'Er kwam deze maand {gekregen} binnen — precies je vaste inkomsten.':
    '{gekregen} sont rentrés ce mois-ci — exactement tes revenus réguliers.',
  'Er kwam deze maand {gekregen} binnen — {verschil} meer dan je vaste inkomsten.':
    '{gekregen} sont rentrés ce mois-ci — {verschil} de plus que tes revenus réguliers.',
  'Er kwam deze maand {gekregen} binnen — {verschil} minder dan je vaste inkomsten.':
    '{gekregen} sont rentrés ce mois-ci — {verschil} de moins que tes revenus réguliers.',
  'Uitboeken': 'Annuler l’écriture',
  'Inboeken ongedaan gemaakt': 'Enregistrement annulé',
  '{naam} ingeboekt': '{naam} enregistré',
  // Ronde 26 — de Analyse-pagina
  'Toon details van {naam}': 'Afficher le détail de {naam}',
  // Ronde 27 — een eigen boom en de Categorieën-pagina
  '+ categorie': '+ catégorie',
  'Naam categorie': 'Nom de la catégorie',
  'Nieuwe categorie in {naam}': 'Nouvelle catégorie dans {naam}',
  'Voeg categorie toe aan {naam}': 'Ajouter une catégorie à {naam}',
  'Vouw open om te bekijken. Je kan op elk niveau iets toevoegen.':
    "Déplie pour parcourir. Tu peux ajouter quelque chose à chaque niveau.",
  'Zoek een categorie': 'Rechercher une catégorie',
  'Niets gevonden voor deze zoekterm.': 'Rien trouvé pour cette recherche.',
  // Ronde 36
  'Voorstel: buitengewone kost — {reden}. Je kan dit zelf aanpassen.':
    'Suggestion : frais extraordinaires — {reden}. Tu peux le modifier toi-même.',
  'Deze categorie staat niet op de indicatieve lijst, dus stellen we een gewone kost voor. Je kan dit zelf aanpassen.':
    'Cette catégorie ne figure pas sur la liste indicative ; nous suggérons donc des frais ordinaires. Tu peux le modifier toi-même.',
  'Je koos zelf {soort}; het voorstel was {voorstel}.':
    'Tu as choisi {soort} ; la suggestion était {voorstel}.',
  'Voorstel volgen': 'Suivre la suggestion',
  'Indicatieve lijst uit het KB van 22 april 2019':
    'Liste indicative de l’AR du 22 avril 2019',
  'Medische en paramedische kosten': 'Frais médicaux et paramédicaux',
  'Kosten van de schoolse opleiding': 'Frais de scolarité',
  'Kosten voor ontwikkeling en ontplooiing': 'Frais de développement et d’épanouissement',
  'Staat niet in de indicatieve lijst van buitengewone kosten':
    'Ne figure pas sur la liste indicative des frais extraordinaires',
  'Verrekeningen': 'Décomptes',
  'Wat toon je in dit dossier?': 'Qu’affiches-tu dans ce dossier ?',
  'Garantiebewijs bijhouden': 'Conserver une preuve de garantie',
  'Kompal maakt er een garantiebewijs bij met deze boeking als aankoopbewijs, en verwittigt je voor de garantie afloopt.':
    'Kompal crée une preuve de garantie avec cette écriture comme preuve d’achat, et te prévient avant la fin de la garantie.',
  'Garantie (maanden)': 'Garantie (mois)',
  'Wettelijk minimum op een nieuw product: 24 maanden.': 'Minimum légal sur un produit neuf : 24 mois.',
  'Dit bewijs bestaat al; je past hier alleen de garantieduur aan.':
    'Cette preuve existe déjà ; tu ne modifies ici que la durée de garantie.',
  'Een inkomst heeft geen garantiebewijs. Bewaar je dit zo, dan blijft het bewijs bestaan bij je garanties, maar hangt het niet meer aan deze boeking.':
    'Une recette n’a pas de preuve de garantie. Si tu enregistres ainsi, la preuve reste dans tes garanties mais n’est plus liée à cette écriture.',
  'Vul een aantal maanden in, bijvoorbeeld 24.': 'Indique un nombre de mois, par exemple 24.',
  'garantie': 'garantie',
  'Er hangt een garantiebewijs aan deze boeking': 'Une preuve de garantie est liée à cette écriture',
  'Uit je boeking van {datum}: {oms}': 'De ton écriture du {datum} : {oms}',
  'bon van de boeking': 'justificatif de l’écriture',
  // Ronde 37
  'Inlezen': 'Importer',
  'Bankuittreksel inlezen': 'Importer un extrait bancaire',
  'Kies het CSV-bestand dat je bij je bank downloadt. Het blijft op dit toestel — er wordt niets verstuurd.':
    'Choisis le fichier CSV que tu télécharges chez ta banque. Il reste sur cet appareil — rien n’est envoyé.',
  'Maak eerst een rekening aan; een boeking moet ergens op staan.':
    'Crée d’abord un compte ; une écriture doit bien se rattacher à quelque chose.',
  'Bestand': 'Fichier',
  'Op welke rekening?': 'Sur quel compte ?',
  'Dit bestand bevat geen regels.': 'Ce fichier ne contient aucune ligne.',
  'Dit bestand bevat alleen kolomnamen en geen boekingen.':
    'Ce fichier ne contient que des noms de colonnes et aucune écriture.',
  'Kloppen de kolommen?': 'Les colonnes sont-elles correctes ?',
  'Dit formaat kennen we van de vorige keer — de kolommen staan al goed.':
    'Nous connaissons ce format depuis la dernière fois — les colonnes sont déjà réglées.',
  'Kompal heeft geraden. Klopt er iets niet, zet het dan hier recht; de volgende keer onthoudt ze het.':
    'Kompal a deviné. Si quelque chose ne va pas, corrige-le ici ; la prochaine fois, il s’en souviendra.',
  '{naam} · {n} regels': '{naam} · {n} lignes',
  'Kolom {n}': 'Colonne {n}',
  '(leeg)': '(vide)',
  'Wat staat er in de kolom {naam}?': 'Que contient la colonne {naam} ?',
  'Duid aan welke kolom de datum bevat.': 'Indique quelle colonne contient la date.',
  'Duid aan welke kolom het bedrag bevat.': 'Indique quelle colonne contient le montant.',
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
    'Elles seront placées sur {rekening}. Les catégories sont suggérées à partir de tes écritures précédentes chez le même commerçant.',
  '{n} boeking(en) ingelezen': '{n} écriture(s) importée(s)',
  '{n} boeking(en) ingelezen.': '{n} écriture(s) importée(s).',
  '{n}× geen datum gevonden': '{n}× aucune date trouvée',
  '{n}× geen bedrag gevonden': '{n}× aucun montant trouvé',
  '{n} regels overgeslagen: {redenen}.': '{n} lignes ignorées : {redenen}.',
  'Dit lijkt geen CSV-bestand. Kies bij je bank de export als CSV — een pdf of een Excel-bestand kan Kompal niet lezen.':
    'Cela ne ressemble pas à un fichier CSV. Choisis l’export CSV chez ta banque — Kompal ne peut pas lire un PDF ni un fichier Excel.',
  '{n} regel(s) bovenaan overgeslagen (geen boekingen)': '{n} ligne(s) en haut ignorée(s) (pas des écritures)',
  'Vink aan wat je wil overnemen. Wat al geboekt lijkt, staat standaard uit.':
    'Coche ce que tu veux reprendre. Ce qui semble déjà enregistré est décoché par défaut.',
  '{n} boekingen van {van} t/m {tot}, samen {saldo}': '{n} écritures du {van} au {tot}, {saldo} au total',
  'Alles aan': 'Tout cocher',
  'Alles uit': 'Tout décocher',
  'Zet de {n} vermoedelijke dubbels uit': 'Décocher les {n} doublons probables',
  'Vink minstens één boeking aan.': 'Coche au moins une écriture.',
  'Het inlezen is niet gelukt. Je selectie staat er nog, dus je kan het opnieuw proberen.':
    'L’importation a échoué. Ta sélection est toujours là, tu peux réessayer.',
  'Toon {n} regels meer ({rest} nog niet getoond)': 'Afficher {n} lignes de plus ({rest} pas encore affichées)',
  'de eerste {n} zijn zichtbaar, maar alles wat aanstaat wordt ingelezen':
    'les {n} premières sont visibles, mais tout ce qui est coché sera importé',
  'Boeking zonder omschrijving': 'Écriture sans description',
  'In je bankapp of op de website van je bank zoek je bij je rekeninguittreksels naar "exporteren" of "downloaden". Kies daar het formaat CSV (soms staat er "CSV/Excel"). Kompal kan geen pdf lezen — dat is een afdruk, geen bestand met cijfers erin.':
    'Dans ton application bancaire ou sur le site de ta banque, cherche « exporter » ou « télécharger » près de tes extraits. Choisis-y le format CSV (parfois « CSV/Excel »). Kompal ne peut pas lire un PDF — c\u2019est une impression, pas un fichier avec des chiffres.',
  'Categorie voor de {n} regels zonder voorstel (optioneel)':
    'Catégorie pour les {n} lignes sans suggestion (facultatif)',



  // Ronde 40 — doorklikken, vindbaarheid en de klokken
  'Bekijk de boekingen van {naam} ›': 'Voir les écritures de {naam} ›',
  'Wat er op je rekeningen staat, van {van} tot {tot}': 'Ce qu’il y a sur tes comptes, de {van} à {tot}',
  'over {n} maanden': 'sur {n} mois',
  '{van} t.e.m. {tot}, met je gemiddelde als lijn.': 'De {van} à {tot}, avec ta moyenne en ligne.',
  'dag {dag}': 'jour {dag}',
  'Niets gevonden voor “{term}”': 'Aucun résultat pour « {term} »',
  'Opbouw van een afrekening': 'Détail d’un décompte',
  'Toon opbouw': 'Afficher le détail',
  'Verberg opbouw': 'Masquer le détail',
  'Geen kosten in deze afrekening.': 'Aucun frais dans ce décompte.',
  'Bewerk {oms} — {datum}, {bedrag}': 'Modifier {oms} — {datum}, {bedrag}',
  'Bekijk de boekingen van {naam} — {bedrag}': 'Voir les écritures de {naam} — {bedrag}',
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
  'Het bestand kon niet gedownload worden. Probeer het opnieuw.': 'Le fichier n’a pas pu être téléchargé. Réessaie.',
  'Rapport en print': 'Rapport et impression',
  'De kengetallen, de uitsplitsing per categorie en de volledige boekingenlijst — cijfers en lijsten, geen grafieken.':
    'Les chiffres clés, la répartition par catégorie et la liste complète des écritures — des chiffres et des listes, pas de graphiques.',
  '{periode} als PDF': '{periode} en PDF',
  'Heel {jaar} als PDF': 'Toute l’année {jaar} en PDF',
  'Print deze pagina': 'Imprimer cette page',
  'Het rapport kon niet gemaakt worden. Probeer het opnieuw.': 'Le rapport n’a pas pu être créé. Réessaie.',
  'Jaarrapport {periode}': 'Rapport annuel {periode}',
  'Maandrapport {periode}': 'Rapport mensuel {periode}',
  '{n} boeking(en) in deze periode': '{n} écriture(s) dans cette période',
  'Kengetallen': 'Chiffres clés',
  'Saldo op {datum}': 'Solde au {datum}',
  'Netto is inkomsten min uitgaven in deze periode. Het saldo is de stand van al je rekeningen samen op {datum}.':
    'Le net correspond aux revenus moins les dépenses de cette période. Le solde est l’état de tous tes comptes réunis au {datum}.',
  'Aandeel': 'Part',
  'Een kassaticket dat over meerdere categorieën verdeeld is, staat hierboven per categorie apart — het totaal blijft daardoor gelijk aan de kengetallen.':
    'Un ticket ventilé sur plusieurs catégories figure ci-dessus par catégorie — le total reste donc égal aux chiffres clés.',
  'Per maand': 'Par mois',
  'Boekingen': 'Écritures',
  'Er staan geen boekingen in deze periode.': 'Il n’y a aucune écriture dans cette période.',
  'zonder omschrijving': 'sans description',
  'Bewijsmap': 'Dossier de preuves',
  'Bewijsmap met bonnen van de afrekening van {datum}': 'Dossier de preuves avec justificatifs du décompte du {datum}',
  'Kopieer stuurt een korte samenvatting door. PDF is diezelfde samenvatting als document. De bewijsmap is het volledige dossier: per kost de berekening en elke bon als bijlage.':
    'Copier envoie un bref résumé. Le PDF est ce même résumé sous forme de document. Le dossier de preuves est le dossier complet : le calcul de chaque frais et chaque justificatif en annexe.',
  'Bewijsmap — {naam}': 'Dossier de preuves — {naam}',
  'Datum van de afrekening': 'Date du décompte',
  '{n} kost(en), {m} bijlage(n)': '{n} frais, {m} annexe(s)',
  'Wat dit document is': 'Ce qu’est ce document',
  'Dit document is een overzicht van de kosten en berekeningen zoals ze in Financieel Kompas zijn ingevoerd.':
    'Ce document est un aperçu des frais et des calculs tels qu’ils ont été saisis dans Financieel Kompas.',
  'De bedragen en verdeelsleutels komen uit die invoer. Wie ze invoerde, blijft er verantwoordelijk voor.':
    'Les montants et les clés de répartition proviennent de cette saisie. La personne qui les a saisis en reste responsable.',
  'Dit is geen juridisch advies en geen uitspraak over wie waar recht op heeft. De app rekent; de afspraak of de rechter beslist.':
    'Ceci n’est pas un avis juridique ni une décision sur les droits de chacun. L’application calcule ; l’accord ou le juge décide.',
  'Een bon die als PDF-bestand werd toegevoegd, kan niet als afbeelding in dit document. Die staat als aparte bijlage vermeld en is los op te vragen.':
    'Un justificatif ajouté sous forme de fichier PDF ne peut pas être intégré comme image dans ce document. Il est mentionné en annexe distincte et peut être demandé séparément.',
  'Elke kost is verdeeld volgens een van deze afspraken. Achter elke regel staat op hoeveel kosten ze van toepassing was.':
    'Chaque frais est réparti selon l’un de ces accords. Chaque ligne indique à combien de frais il s’est appliqué.',
  'De kosten, chronologisch': 'Les frais, par ordre chronologique',
  'Per kost: het bedrag, de verdeling die erop is toegepast en waarom die gold. Zo is elke rij na te rekenen.':
    'Par frais : le montant, la répartition appliquée et la raison pour laquelle elle s’appliquait. Chaque ligne est ainsi vérifiable.',
  '{bedrag} x {p}% = {jouw} voor jou, {partner} voor partner': '{bedrag} x {p} % = {jouw} pour toi, {partner} pour le partenaire',
  'zie bijlage {n}': 'voir annexe {n}',
  'Bijlagen': 'Annexes',
  'Bijlage {n}': 'Annexe {n}',
  'toegevoegd op {datum}': 'ajouté le {datum}',
  'Er zijn geen bonnen of documenten toegevoegd aan de kosten van deze afrekening.':
    'Aucun justificatif ni document n’a été ajouté aux frais de ce décompte.',
  'Deze bon is als PDF-bestand toegevoegd en kan niet als afbeelding worden ingevoegd. Vraag het losse bestand op.':
    'Ce justificatif a été ajouté sous forme de fichier PDF et ne peut pas être intégré comme image. Demande le fichier séparé.',
  'Deze bon kon niet worden weergegeven. Het bestand is beschadigd of van een onbekend type.':
    'Ce justificatif n’a pas pu être affiché. Le fichier est endommagé ou d’un type inconnu.',
  // Ronde 41 — na de review: meldingen en wachttoestanden
  'De back-up kon niet gedownload worden. Probeer het opnieuw.': 'La sauvegarde n’a pas pu être téléchargée. Réessaie.',
  'Het rapport van {periode} is gedownload.': 'Le rapport de {periode} a été téléchargé.',
  '{periode} als PDF — bezig…': '{periode} en PDF — en cours…',
  'Heel {jaar} als PDF — bezig…': 'Toute l’année {jaar} en PDF — en cours…',
  'De CSV bevat precies deze rijen, in deze volgorde. Je opent hem met Excel of Numbers.':
    'Le CSV contient exactement ces lignes, dans cet ordre. Tu l’ouvres avec Excel ou Numbers.',
  'De PDF van {datum} is gedownload.': 'Le PDF du {datum} a été téléchargé.',
  'De PDF van {datum} kon niet gemaakt worden. Probeer het opnieuw.':
    'Le PDF du {datum} n’a pas pu être créé. Réessaie.',
  'De bewijsmap van {datum} is gedownload.': 'Le dossier de preuves du {datum} a été téléchargé.',
  'De bewijsmap van {datum} kon niet gemaakt worden. Probeer het opnieuw.':
    'Le dossier de preuves du {datum} n’a pas pu être créé. Réessaie.',
  'Bewijsmap van {datum} — bezig…': 'Dossier de preuves du {datum} — en cours…',
  '{n} van {totaal}': '{n} sur {totaal}',
  // Ronde 42 — de onderhoudsbijdrage
  'Onderhoudsbijdrage': 'Contribution alimentaire',
  'Het vaste maandbedrag uit je vonnis of overeenkomst. De app houdt de jaarlijkse indexatie bij en rekent uit wat er betaald is.':
    'Le montant mensuel fixe de ton jugement ou convention. L’application suit l’indexation annuelle et calcule ce qui a été payé.',
  'Onderhoudsbijdrage instellen': 'Définir la contribution alimentaire',
  'De brief is gedownload.': 'La lettre a été téléchargée.',
  'De brief kon niet gemaakt worden. Probeer het opnieuw.':
    'La lettre n’a pas pu être créée. Réessaie.',
  'Onderhoudsbijdrage verwijderen': 'Supprimer la contribution alimentaire',
  'Bijdrage vandaag': 'Contribution aujourd’hui',
  'gelijk aan het bedrag uit de regeling van {datum}':
    'identique au montant de l’accord du {datum}',
  'geïndexeerd; in de regeling van {datum} stond {basis}':
    'indexé ; l’accord du {datum} indiquait {basis}',
  'Sinds {datum} staat de bijdrage op {bedrag}. Loopt de betaling nog op het oude bedrag, dan is dat sindsdien elke maand een verschil.':
    'Depuis le {datum}, la contribution s’élève à {bedrag}. Si le paiement est resté à l’ancien montant, cela fait une différence chaque mois depuis lors.',
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
    'L’accord exclut l’indexation ; le montant reste donc inchangé.',
  'De eerste verjaardag van de regeling moet nog komen: op {datum}.':
    'Le premier anniversaire de l’accord est encore à venir : le {datum}.',
  'index van {maand} nog niet bekend — bedrag ongewijzigd gelaten':
    'indice de {maand} pas encore connu — montant laissé inchangé',
  'index {index} uit {maand}': 'indice {index} de {maand}',
  'Vul een bedrag groter dan nul in.': 'Saisis un montant supérieur à zéro.',
  'Er staat geen enkele open kost in deze selectie.': 'Il n’y a aucun frais ouvert dans cette sélection.',
  'Geef een naam om op te slaan.': 'Saisis un nom pour enregistrer.',
  'Geef een productnaam en een garantieduur in maanden om op te slaan.':
    'Saisis un nom de produit et une durée de garantie en mois pour enregistrer.',
  'Er staat een getal bij de kredietkaart dat de app niet kan gebruiken. Pas het aan om op te slaan.':
    'Il y a un nombre dans les champs de la carte de crédit que l’app ne peut pas utiliser. Corrige-le pour enregistrer.',
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
    'Choisis un mois et saisis un indice supérieur à zéro.',
  'De regeling': 'L’accord',
  'Bedrag uit de regeling': 'Montant de l’accord',
  'Datum vonnis of overeenkomst': 'Date du jugement ou de la convention',
  'De andere ouder betaalt aan jou': 'L’autre parent te paie',
  'Jij betaalt aan de andere ouder': 'Tu paies l’autre parent',
  'De datum bepaalt twee dingen: de aanvangsindex (de maand ervóór) en de dag waarop er elk jaar geïndexeerd wordt.':
    'La date détermine deux choses : l’indice de départ (le mois précédent) et le jour de l’indexation annuelle.',
  'Jaarlijks indexeren (de wettelijke regel, tenzij de akte iets anders zegt)':
    'Indexer chaque année (la règle légale, sauf mention contraire dans l’acte)',
  'Aanvangsindex uit de akte (optioneel)': 'Indice de départ figurant dans l’acte (facultatif)',
  'leeg = de app zoekt ze zelf op': 'vide = l’application le recherche elle-même',
  'Bewaar de regeling': 'Enregistrer l’accord',
  'Zelf een indexcijfer toevoegen': 'Ajouter toi-même un indice',
  'De app kent cijfers tot {laatste}. Loopt je verjaardag daarop vooruit, vul het cijfer dan hier in — je vindt het bij Statbel.':
    'L’application connaît les chiffres jusqu’en {laatste}. Si ton anniversaire est postérieur, saisis le chiffre ici — tu le trouveras chez Statbel.',
  'Maand': 'Mois',
  'De app kent deze maand al. Vul je hier iets in, dan gaat jouw cijfer voor.':
    'L’application connaît déjà ce mois. Si tu saisis quelque chose ici, ton chiffre prévaut.',
  'Indexcijfer toevoegen': 'Ajouter l’indice',
  'Verwijder je eigen indexcijfer voor {maand}': 'Supprimer ton propre indice pour {maand}',
  '{basis} x {nieuw} / {aanvang} = {uit}': '{basis} x {nieuw} / {aanvang} = {uit}',
  'De aanvangsindex is niet bekend: de app kent geen indexcijfer voor {maand}.':
    'L’indice de départ est inconnu : l’application n’a pas d’indice pour {maand}.',
  'Aanvangsindex {index}, zoals ze in de akte staat.':
    'Indice de départ {index}, tel qu’il figure dans l’acte.',
  'Let op: de indexcijfers van de app staan in basis {jaar} = 100. Staat er in je vonnis een aanvangsindex uit een ouder basisjaar, vul die dan hier in én gebruik ook voor de nieuwe index een cijfer uit datzelfde basisjaar. Twee cijfers uit verschillende basisjaren geven een bedrag dat er juist uitziet en het niet is.':
    'Attention : les indices de l’application utilisent la base {jaar} = 100. Si ton jugement mentionne un indice de départ d’une base plus ancienne, saisis-le ici et utilise également un chiffre de cette même base pour le nouvel indice. Deux chiffres de bases différentes donnent un montant qui semble correct sans l’être.',
  'De indexatie gebeurt in België van rechtswege, jaarlijks op de verjaardag van de regeling — tenzij de akte iets anders bepaalt. Wat er in jouw akte staat, gaat voor op wat hier staat.':
    'En Belgique, l’indexation s’applique de plein droit, chaque année à la date anniversaire de l’accord — sauf disposition contraire de l’acte. Ce que dit ton acte prévaut sur ce qui figure ici.',
  'Dit is geen juridisch advies en geen ingebrekestelling. De app rekent; wat je met het cijfer doet, beslis jij.':
    'Ceci n’est ni un avis juridique ni une mise en demeure. L’application calcule ; ce que tu fais du chiffre t’appartient.',
  'Betaald en verschuldigd zijn precies gelijk.': 'Le payé et le dû sont exactement égaux.',
  'Er staat nog {bedrag} open die jij verschuldigd bent.': 'Il reste {bedrag} que tu dois.',
  'Er staat nog {bedrag} open die aan jou verschuldigd is.': 'Il reste {bedrag} qui t’est dû.',
  'Er is {bedrag} meer betaald dan berekend.': '{bedrag} de plus a été payé que calculé.',
  'Er is {bedrag} meer ontvangen dan berekend.': '{bedrag} de plus a été reçu que calculé.',
  'Onderhoudsbijdrage — {naam}': 'Contribution alimentaire — {naam}',
  'Regeling van': 'Accord du',
  'Bedrag in de regeling': 'Montant de l’accord',
  'De bijdrage vandaag': 'La contribution aujourd’hui',
  'De regeling sluit indexatie uit; het bedrag blijft dus ongewijzigd.':
    'L’accord exclut l’indexation ; le montant reste donc inchangé.',
  'Hoe dit berekend is': 'Comment ce calcul a été fait',
  'De indexcijfers komen van Statbel en staan in basis {jaar} = 100. De app kent cijfers tot {laatste}.':
    'Les indices proviennent de Statbel et utilisent la base {jaar} = 100. L’application connaît les chiffres jusqu’en {laatste}.',
  'Per verjaardag': 'Par anniversaire',
  'Er is nog geen verjaardag van de regeling geweest.':
    'Il n’y a pas encore eu d’anniversaire de l’accord.',
  'Wat er nog ontbreekt': 'Ce qui manque encore',
  'Voor deze maanden is er geen indexcijfer gebruikt: {maanden}. De bedragen van die verjaardagen zijn daarom ongewijzigd gelaten in plaats van geschat.':
    'Aucun indice n’a été utilisé pour ces mois : {maanden}. Les montants de ces anniversaires ont donc été laissés inchangés plutôt qu’estimés.',
  'Wat dit blad is': 'Ce qu’est cette feuille',
  'Onderhoudsbijdrage verwijderd': 'Contribution alimentaire supprimée',
  'Betaling verwijderd': 'Paiement supprimé',
  // Ronde 42 — na de review
  'Nog geen onderhoudsbijdrage ingesteld voor dit dossier. Je hebt het bedrag en de datum uit je vonnis of overeenkomst nodig.':
    'Aucune contribution alimentaire définie pour ce dossier. Tu auras besoin du montant et de la date de ton jugement ou convention.',
  'Bijdrage bij het einde van de regeling': 'Contribution à la fin de l’accord',
  'Deze regeling liep tot {datum}; daarna is er niets meer bijgekomen.':
    'Cet accord a couru jusqu’au {datum} ; rien n’a été ajouté depuis.',
  'De aanvangsindex is geen geldig getal. Laat het veld leeg om de app het cijfer zelf te laten opzoeken.':
    'L’indice de départ n’est pas un nombre valide. Laisse le champ vide pour que l’application recherche elle-même le chiffre.',
  'Loopt tot (optioneel)': 'Court jusqu’au (facultatif)',
  'Voor welke kinderen (optioneel)': 'Pour quels enfants (facultatif)',
  'Per maand geteld vanaf de maand van de regeling, telkens met het bedrag dat op de eerste van die maand gold. Twee gevolgen die je moet kennen voor je dit cijfer gebruikt: de maand van de regeling telt volledig mee, ook als ze halverwege begon, en de maand waarin er geïndexeerd wordt telt nog aan het oude, lagere bedrag. Klopt dat niet met jouw afspraak, corrigeer het dan met een betaling.':
    'Compté mois par mois à partir du mois de l’accord, chaque fois avec le montant en vigueur le premier de ce mois. Deux conséquences à connaître avant d’utiliser ce chiffre : le mois de l’accord compte en entier, même s’il a commencé en cours de mois, et le mois où l’indexation prend effet compte encore à l’ancien montant, plus bas. Si cela ne correspond pas à ton accord, corrige-le par un paiement.',
  'Betaald door de ouder die dit overzicht opmaakte': 'Payé par le parent qui a établi cet aperçu',
  'Betaald aan de ouder die dit overzicht opmaakte': 'Payé au parent qui a établi cet aperçu',
  'Loopt tot': 'Court jusqu’au',
  // Contribution alimentaire — la lettre d’accompagnement
  'Betreft: indexatie van de onderhoudsbijdrage voor {namen}':
    'Objet : indexation de la contribution alimentaire pour {namen}',
  'Betreft: indexatie van de onderhoudsbijdrage': 'Objet : indexation de la contribution alimentaire',
  'De laatste aanpassing viel op {datum}. Vanaf die datum bedraagt de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.':
    'La dernière adaptation est intervenue le {datum}. À partir de cette date, la contribution s’élève à {bedrag} par mois, contre {basis} dans l’accord même.',
  'Volgens deze berekening bedraagt de bijdrage vandaag {bedrag} per maand.':
    'Selon ce calcul, la contribution s’élève aujourd’hui à {bedrag} par mois.',
  'Op het volgende blad staat de volledige berekening: het bedrag uit de regeling, de gebruikte indexcijfers en wat er per verjaardag uit kwam. Zo is elke regel na te rekenen zonder deze app.':
    'La page suivante contient le calcul complet : le montant de l’accord, les indices utilisés et le résultat pour chaque date anniversaire. Chaque ligne peut ainsi être vérifiée sans cette application.',
  'Klopt er iets niet met de gegevens hierboven, laat het dan weten — dan kan de berekening aangepast worden.':
    'Si une donnée ci-dessus est inexacte, dis-le — le calcul sera adapté.',
  'Betreft: de onderhoudsbijdrage voor {namen}': 'Objet : la contribution alimentaire pour {namen}',
  'Betreft: de onderhoudsbijdrage': 'Objet : la contribution alimentaire',
  'De onderhoudsbijdrage die op {datum} werd vastgelegd, wordt volgens de regeling niet geïndexeerd. Het bedrag blijft daarom ongewijzigd.':
    'Selon l’accord, la contribution alimentaire fixée le {datum} n’est pas indexée. Le montant reste donc inchangé.',
  'De aanvangsindex van {maand} is in deze app niet bekend, waardoor de indexatie niet berekend kon worden. Hieronder staat daarom nog het bedrag uit de regeling zelf: {basis} per maand.':
    'L’indice de départ de {maand} n’est pas connu dans cette application, de sorte que l’indexation n’a pas pu être calculée. Le montant ci-dessous est donc encore celui de l’accord même : {basis} par mois.',
  'Deze regeling liep tot {eind}. Bij het einde ervan bedroeg de bijdrage {bedrag} per maand, tegenover {basis} in de regeling zelf.':
    'Cet accord a couru jusqu’au {eind}. À son terme, la contribution s’élevait à {bedrag} par mois, contre {basis} dans l’accord même.',
  'Voor één of meer verjaardagen was er nog geen indexcijfer bekend. Die aanpassing zit dus nog niet in dit bedrag; op het volgende blad staat om welke maanden het gaat.':
    'Pour une ou plusieurs dates anniversaires, aucun indice n’était encore connu. Cette adaptation n’est donc pas comprise dans ce montant ; la page suivante indique de quels mois il s’agit.',
  'Op het volgende blad staat waarop dit gebaseerd is: het bedrag uit de regeling en de gegevens die daarbij horen. Zo is alles na te kijken zonder deze app.':
    'La page suivante indique sur quoi cela repose : le montant de l’accord et les données qui s’y rapportent. Tout peut ainsi être vérifié sans cette application.',
  'Deze brief is opgemaakt met Financieel Kompas. Hij bevat een berekening en geen juridisch standpunt.':
    'Cette lettre a été établie avec Financieel Kompas. Elle contient un calcul et non une position juridique.',
  // Ronde 72 — « Ce qui arrive » : tes charges fixes sur douze mois
  'Wat komt eraan': 'Ce qui arrive',
  'Je vaste lasten per maand, {venster}.': 'Tes charges fixes par mois, {venster}.',
  'Zodra je vaste lasten hebt ingevuld, zie je hier in welke maand ze vervallen.':
    'Dès que tu auras encodé tes charges fixes, tu verras ici le mois où elles tombent.',
  'Elke staaf is wat er die maand aan vaste lasten vervalt, met het volle bedrag — een jaarpremie staat dus één keer voluit en elf maanden op nul. Je inkomsten en je losse uitgaven zoals boodschappen zitten er niet in, en ook niet wat je apart bijhoudt bij Leningen, bij een onderhoudsbijdrage, bij de kindrekening of bij een spaardoel.':
    'Chaque barre représente les charges fixes qui tombent ce mois-là, pour leur montant complet — une prime annuelle apparaît donc une seule fois en entier et à zéro pendant onze mois. Tes revenus et tes dépenses courantes comme les courses ne sont pas comptés, ni ce que tu tiens à part sous Prêts, sous une contribution alimentaire, sous le compte des enfants ou sous un objectif d’épargne.',
  'Alleen wat je bij je vaste lasten invulde, met het volle bedrag in de maand dat het vervalt — geen inkomsten, geen losse uitgaven, en niet wat je apart bijhoudt bij Leningen of bij een onderhoudsbijdrage.':
    'Uniquement ce que tu as encodé comme charges fixes, pour son montant complet dans le mois où il tombe — ni revenus, ni dépenses courantes, ni ce que tu tiens à part sous Prêts ou sous une contribution alimentaire.',
  '{maand}: geen vaste lasten': '{maand} : aucune charge fixe',
  '{maand}: {bedrag} aan vaste lasten': '{maand} : {bedrag} de charges fixes',
  '{maand}: {bedrag} aan vaste lasten — deze maand loopt al':
    '{maand} : {bedrag} de charges fixes — ce mois est déjà entamé',
  'Gemiddeld {bedrag} aan vaste lasten per maand over deze twaalf maanden':
    'En moyenne {bedrag} de charges fixes par mois sur ces douze mois',
  '* {maand} loopt al; een deel van die staaf is wellicht al betaald.':
    '* {maand} est déjà entamé ; une partie de cette barre a peut-être déjà été payée.',
  'Je zwaarste maand is {maand}: {bedrag} aan vaste lasten.':
    'Ton mois le plus lourd est {maand} : {bedrag} de charges fixes.',
  '{n} maanden zijn even zwaar, met {bedrag} aan vaste lasten. De eerste is {maand}.':
    '{n} mois sont aussi lourds les uns que les autres, avec {bedrag} de charges fixes. Le premier est {maand}.',
  'Elke maand kost je evenveel: {bedrag} aan vaste lasten.':
    'Chaque mois te coûte pareil : {bedrag} de charges fixes.',
  'Van wat de app kan plaatsen kost elke maand evenveel: {bedrag}.':
    'De ce que l’application peut situer, chaque mois coûte pareil : {bedrag}.',
  'Van wat de app kan plaatsen is {maand} de zwaarste maand: {bedrag}.':
    'De ce que l’application peut situer, {maand} est le mois le plus lourd : {bedrag}.',
  'Van wat de app kan plaatsen zijn {n} maanden even zwaar, met {bedrag}. De eerste is {maand}.':
    'De ce que l’application peut situer, {n} mois sont aussi lourds les uns que les autres, avec {bedrag}. Le premier est {maand}.',
  'In deze twaalf maanden vervalt er geen enkele vaste last.':
    'Aucune charge fixe ne tombe dans ces douze mois.',
  'In deze twaalf maanden vervalt er geen enkele vaste last waarvan de app de maand kent.':
    'Aucune charge fixe dont l’application connaît le mois ne tombe dans ces douze mois.',
  '{n} vaste last(en) staan hier niet in, omdat de app niet weet in welke maand ze vervallen: {namen}. Ze tellen nergens op deze kaart mee. Vul bij Budget › Vast hun eerste betaling in.':
    '{n} charge(s) fixe(s) ne figurent pas ici, parce que l’application ne sait pas dans quel mois elles tombent : {namen}. Rien sur cette carte ne les compte. Encode leur premier paiement dans Budget › Fixe.',
  'Van wat de app kan plaatsen vervalt er na {maand} niets meer. Van de vaste last(en) waarvan ze de maand niet kent, kan ze niets zeggen.':
    'De ce que l’application peut situer, plus rien ne tombe après {maand}. Des charges fixes dont elle ignore le mois, elle ne peut rien dire.',
  '{n} vaste last(en) staan hier niet in en tellen niet mee in deze cijfers: de app weet niet in welke maand ze vervallen.':
    '{n} charge(s) fixe(s) ne figurent pas ici et ne comptent pas dans ces chiffres : l’application ne sait pas dans quel mois elles tombent.',
  '{namen} en {n} andere': '{namen} et {n} autre(s)',
  'Over wat de app kan plaatsen verandert er verder vooruit niets meer. Van de vaste last(en) waarvan ze de maand niet kent, kan ze niets zeggen.':
    'Pour ce que l’application peut situer, plus rien ne change au-delà. Des charges fixes dont elle ignore le mois, elle ne peut rien dire.',
  '‹ Vorige twaalf maanden': '‹ Douze mois précédents',
  'Volgende twaalf maanden ›': 'Douze mois suivants ›',
  'Verder vooruit verandert er niets meer: vanaf hier herhaalt elk jaar zich.':
    'Plus loin, rien ne change : à partir d’ici chaque année se répète.',
  'Na {maand} vervalt er geen enkele vaste last meer.': 'Après {maand}, plus aucune charge fixe ne tombe.',
  'Verder vooruit verandert er niets meer.': 'Plus loin, rien ne change.',
  'Toon per maand': 'Afficher par mois',
  'Verberg per maand': 'Masquer par mois',
  'geen vaste lasten': 'aucune charge fixe',
  '{n} vaste last(en)': '{n} charge(s) fixe(s)',
  'waaronder {namen}': 'dont {namen}',
  'Bekijk vooruit': 'Voir plus loin',
  // Ronde 73 — la liste de suggestions devient une liste de propositions
  'Nog niets toegevoegd': 'Rien d’ajouté pour l’instant',
  '{n} kosten toegevoegd': '{n} charges ajoutées',
  'Hier heb je nog niets toegevoegd. Gebruik de knop hiernaast.':
    'Tu n’as encore rien ajouté ici. Utilise le bouton à côté.',
  'Je vulde er {gedaan} van de {totaal} in.': 'Tu en as rempli {gedaan} sur {totaal}.',
  'Klap alles open': 'Tout déplier',
  'Klap alles dicht': 'Tout replier',
  'Klap alles open — {titel}': 'Tout déplier — {titel}',
  'Klap alles dicht — {titel}': 'Tout replier — {titel}',
  'Toon alleen wat ik al heb': 'N’afficher que ce que j’ai déjà',
  'Toon alleen wat ik al heb — {titel}': 'N’afficher que ce que j’ai déjà — {titel}',
  'Je hebt hier nog niets ingevuld. Zet de filter uit om alle voorstellen te zien.':
    'Tu n’as encore rien rempli ici. Désactive le filtre pour voir toutes les suggestions.',
  '{naam} bewaard: {bedrag} {periode}.': 'Enregistré : {naam} — {bedrag} {periode}.',
  '{naam} toevoegen': 'Ajouter {naam}',
  '{naam} wijzigen': 'Modifier {naam}',
  'Klik op een kost om te zien wat je al hebt, of voeg er een toe. Het invulvenster vraagt alles in één keer.':
    'Clique sur une charge pour voir ce que tu y as déjà, ou ajoutes-en une. La fenêtre demande tout en une fois.',
  'De kleine abonnementen waar je nooit meer naar omkijkt. Samen zijn ze vaak groter dan je denkt.':
    'Les petits abonnements que tu ne regardes plus jamais. Ensemble, ils pèsent souvent plus lourd que tu ne le crois.',
  'Toevoegen — {naam}': 'Ajouter — {naam}',
  'Bewerken — {naam}, {details}': 'Modifier — {naam}, {details}',
  'Verwijderen — {naam}, {details}': 'Supprimer — {naam}, {details}',
  'Er staat al een vaste last die zo heet. Is dit een tweede, geef ze dan een eigen naam — dan zie je later welke welke is.':
    'Une charge fixe porte déjà ce nom. Si c’est une deuxième, donne-lui un nom à elle — tu les distingueras plus tard.',
  // Ronde 74 — un objectif d’épargne qui sait quelle charge fixe il sert
  'Waarvoor spaar je? (optioneel)': 'Pour quoi épargnes-tu ? (optionnel)',
  'Voor niets in het bijzonder': 'Pour rien en particulier',
  '{naam} kost {bedrag} en valt de volgende keer op {datum}. Zolang dit doel eraan hangt, vraagt Budget er niet meer apart geld voor opzij te zetten.':
    '{naam} coûte {bedrag} et tombe la prochaine fois le {datum}. Tant que cet objectif y est rattaché, Budget ne te demande plus de mettre de l’argent de côté séparément.',
  '{naam} kost {bedrag}, maar er komt geen betaling meer.':
    '{naam} coûte {bedrag}, mais plus aucun paiement ne vient.',
  'Hang dit doel aan een vaste last die niet elke maand valt — een jaarpremie bijvoorbeeld. Dan weet de app waarvoor je spaart en vraagt ze het geld geen tweede keer.':
    'Rattache cet objectif à une charge fixe qui ne tombe pas chaque mois — une prime annuelle, par exemple. L’application sait alors pour quoi tu épargnes et ne redemande pas cet argent une deuxième fois.',
  'Kost bestaat niet meer': 'Cette charge n’existe plus',
  'De vaste last waarvoor je spaarde, staat niet meer in je vaste lasten. Het doel blijft gewoon lopen.':
    'La charge fixe pour laquelle tu épargnais ne figure plus parmi tes charges fixes. L’objectif continue simplement.',
  'Voor {naam}, de volgende keer op {datum}.': 'Pour {naam}, la prochaine fois le {datum}.',
  'Die kost is {bedrag}; je doelbedrag staat op iets anders.':
    'Cette charge est de {bedrag} ; ton montant cible indique autre chose.',
  'Je doeldatum ligt ná die betaling, dus aan dit tempo ben je te laat.':
    'Ta date cible tombe après ce paiement, donc à ce rythme tu seras en retard.',
  'Voor {namen} rekent dit met je spaardoel, niet met een deling van het jaarbedrag.':
    'Pour {namen}, ce calcul suit ton objectif d’épargne, pas une division du montant annuel.',
  'De kost waaraan dit doel hangt': 'La charge à laquelle cet objectif est rattaché',
  'Onbekende kost': 'Charge inconnue',
  'Dit doel hangt aan een kost die niet meer in je lijst staat, of die niet meer om vooraf sparen vraagt. Kies "Voor niets in het bijzonder" om de koppeling los te maken.':
    'Cet objectif est rattaché à une charge qui ne figure plus dans ta liste, ou qui ne demande plus d’épargne préalable. Choisis « Pour rien en particulier » pour le détacher.',
  'Je spaarde voor {naam}, maar daar komt geen betaling meer van.':
    'Tu épargnais pour {naam}, mais plus aucun paiement n’en viendra.',
  'Aan je huidige tempo heb je pas ná die betaling genoeg bij elkaar.':
    'À ton rythme actuel, tu n’auras assez qu’après ce paiement.',
  'Er hangt nog een doel aan diezelfde kost; je spaart er dus dubbel voor.':
    'Un autre objectif est rattaché à cette même charge ; tu épargnes donc en double.',
  'Er hangen nog {n} doelen aan diezelfde kost; je spaart er dus meervoudig voor.':
    '{n} autres objectifs sont rattachés à cette même charge ; tu épargnes donc en multiple.',
  'Je plan rekent hiervoor met je spaardoel {doel}: {bedrag} per maand.':
    'Ton plan suit ici ton objectif d’épargne {doel} : {bedrag} par mois.',
  ' · via je spaardoel {doel}': ' · via ton objectif d’épargne {doel}',
  // Ronde 75 — moins à la fois
  'Wat wil je zien?': 'Que veux-tu voir ?',
  'Zet uit wat je niet gebruikt. Het verdwijnt alleen uit je menu — er gaat niets verloren, en je kan het hier altijd terugzetten.':
    'Désactive ce que tu n’utilises pas. Cela disparaît seulement de ton menu — rien n’est perdu, et tu peux toujours le remettre ici.',
  'Toon me alleen de basis': 'Montre-moi seulement l’essentiel',
  'Zet alles weer aan': 'Tout réactiver',
  'Hier staat nog 1 ding in. Het blijft bewaard.': 'Il y a encore 1 élément ici. Il reste conservé.',
  'Hier staan nog {n} dingen in. Ze blijven bewaard.': 'Il y a encore {n} éléments ici. Ils restent conservés.',
  'Kosten delen met de andere ouder, geld dat je uitleende, en je garantiebewijzen.':
    'Partager des frais avec l’autre parent, l’argent que tu as prêté, et tes preuves de garantie.',
  'Grafieken over waar je geld naartoe ging, en hoe dat evolueert.':
    'Des graphiques sur où ton argent est passé, et comment cela évolue.',
  'Het bestand van je bank inlezen in plaats van je boekingen zelf in te tikken.':
    'Importer le fichier de ta banque au lieu d’encoder tes écritures toi-même.',
  'Een maand rondmaken: staat alles erin, en wat hield je over?':
    'Boucler un mois : tout est-il encodé, et que t’est-il resté ?',
  'De lijst waarin je boekingen ingedeeld worden, aanpassen of uitbreiden.':
    'Adapter ou étendre la liste dans laquelle tes écritures sont classées.',
  'Losse rekenmachines: hoeveel per maand voor een doel, en wat een indexatie doet.':
    'Des calculettes séparées : combien par mois pour un objectif, et ce que fait une indexation.',
  'Een overzicht van de uitgaven die je op je belastingbrief kan zetten.':
    'Un aperçu des dépenses que tu peux porter sur ta déclaration fiscale.',
  'Wat elk gezinslid je per maand kost.': 'Ce que chaque membre du ménage te coûte par mois.',
  'Bovenaan kies je wat je in de app wil zien, en zet je de app op je beginscherm. Daarna kleuren, taal en meldingen; dan alles rond het bewaren van je gegevens, je gezinsleden, en helemaal onderaan de knop die alles wist.':
    'En haut, tu choisis ce que tu veux voir dans l’application et tu l’ajoutes à ton écran d’accueil. Ensuite les couleurs, la langue et les alertes ; puis tout ce qui concerne la conservation de tes données, les membres de ton ménage, et tout en bas le bouton qui efface tout.',
  'Alle pagina\'s staan aan.': 'Toutes les pages sont activées.',
  'Eén pagina staat uit.': 'Une page est désactivée.',
  '{n} pagina\'s staan uit.': '{n} pages sont désactivées.',
  'Een uitgezette pagina verdwijnt uit je menu, maar blijft bestaan: alles wat erin staat blijft bewaard, en hier zet je haar met één tik terug.':
    'Une page désactivée disparaît de ton menu mais continue d’exister : tout ce qu’elle contient reste conservé, et une seule pression ici la remet.',
  'Potjes voor later: een buffer, een grote aankoop, of sparen voor een jaarafrekening.':
    'Des cagnottes pour plus tard : une réserve, un gros achat, ou épargner pour une facture annuelle.',
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

type TaalContextType = {
  taal: Taal
  zetTaal: (t: Taal) => void
  t: Vertaler
  /**
   * Staat er écht een TaalProvider boven me? (ronde 66, slotronde)
   *
   * ⚠ Zonder dit was "geen provider" niet te onderscheiden van "provider met
   * Nederlands gekozen": allebei geven `taal: 'nl'`. Dat verschil telt precies op
   * één plek, en dat is de buitenste ErrorBoundary in main.tsx — die staat bewust
   * buiten de provider, en las daardoor bij de zwaarste crash altijd Nederlands
   * voor, ook voor een Franstalige. Zij valt nu terug op de bewaarde keuze.
   */
  heeftProvider: boolean
}

// Standaardwaarde zodat componenten ook zonder Provider werken (bv. in tests):
// dan is de taal Nederlands en geeft t() de sleutel ongewijzigd terug.
const standaard: TaalContextType = {
  taal: 'nl',
  zetTaal: () => {},
  t: (sleutel, params) => vertaal('nl', sleutel, params),
  heeftProvider: false,
}

const TaalContext = createContext<TaalContextType>(standaard)


export function TaalProvider({ children }: { children: ReactNode }) {
  const [taal, setTaal] = useState<Taal>(leesTaal)

  // Datums en bedragen volgen de taal mee (ronde 54). Dit staat hier en niet in elke
  // component, want `formatEuro` en de datumhelpers worden op honderden plaatsen
  // aangeroepen — zie utils/opmaaktaal.ts.
  //
  // WAAROM TIJDENS HET TEKENEN en niet in het effect hieronder, waar het eerst stond.
  // Een effect draait NA het tekenen. Wisselde je van taal, dan tekenden alle schermen
  // eerst opnieuw — met de nieuwe teksten, maar terwijl `opmaaktaal` nog op de oude
  // stond — en pas daarna liep het effect. Dat zet geen state, dus er volgde geen
  // tweede tekening: je kreeg een Engels scherm met "juli 2026" en "€ 12,50" erin, tot
  // je toevallig iets anders aanraakte. De opmaak liep zo precies één taalwissel achter.
  //
  // Dit is veilig om tijdens het tekenen te doen: het schrijft alleen een waarde weg
  // die van `taal` afgeleid is. Twee keer draaien (React in strikte modus) geeft
  // hetzelfde resultaat.
  zetOpmaaktaal(taal)

  useEffect(() => {
    try {
      localStorage.setItem(TAAL_OPSLAG_SLEUTEL, taal)
    } catch {
      // stil negeren
    }
    document.documentElement.lang = taal
  }, [taal])
  const waarde: TaalContextType = {
    taal,
    zetTaal: setTaal,
    t: (sleutel, params) => vertaal(taal, sleutel, params),
    heeftProvider: true,
  }
  return <TaalContext.Provider value={waarde}>{children}</TaalContext.Provider>
}

// Hook om te vertalen: const { t } = useT().
export function useT(): TaalContextType {
  return useContext(TaalContext)
}
