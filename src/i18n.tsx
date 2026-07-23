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
  'gesplitst · {n} categorieën': 'split · {n} categories',
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
  // Spaardoelen
  'Spaardoelen': 'Savings goals',
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
  'Vaste lasten': 'Recurring expenses',
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
  'Eigen verdeling (% jij, optioneel)': 'Custom split (% you, optional)',
  'leeg = standaard van het dossier': 'empty = case default',
  'voor {namen}': 'for {namen}',
  'jij {p}%': 'you {p}%',
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
  'gesplitst · {n} categorieën': 'divisé · {n} catégories',
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
  // Spaardoelen
  'Spaardoelen': 'Objectifs d’épargne',
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
  'Eigen verdeling (% jij, optioneel)': 'Répartition personnalisée (% vous, optionnel)',
  'leeg = standaard van het dossier': 'vide = valeur par défaut du dossier',
  'voor {namen}': 'pour {namen}',
  'jij {p}%': 'vous {p}%',
}
const woordenboeken: Record<Taal, Record<string, string>> = { nl: {}, en, fr }

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
