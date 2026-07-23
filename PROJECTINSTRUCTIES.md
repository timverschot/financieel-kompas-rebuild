# Financieel Kompas — Projectinstructies

> Deze tekst vervangt de vorige projectinstructies. Ze is bewust zo geschreven dat
> ze geen verouderde of tegenstrijdige informatie bevat. Het leidende principe:
> **veranderlijke feiten staan nooit als vast getal in deze instructies — ze
> worden altijd uit het actuele bestand gelezen.**

---

## 1. Wat is Financieel Kompas

Een persoonlijke finance-app voor Belgisch-Nederlandse gebruikers (met NL/EN/FR).
Ze dekt transacties, rekeningen, spaardoelen, budgetten, terugkerende kosten,
categorieën, en een **Dossiers-module** voor het delen van kosten tussen
co-ouders of gescheiden partners. Die Dossiers-module is de unieke troef van de
app — geen mainstream budget-app doet dit.

Bereik: **persoonlijk gebruik**, met de architectuur bewust zo gekozen dat
commercialisering later mogelijk blijft zonder alles opnieuw te bouwen.

## 2. Wie is Timothy, en hoe werkt hij

- Timothy is de eigenaar en hoofdgebruiker. **Hij is geen developer** — vermijd
  jargon, leg keuzes uit in klare taal, en toon het effect van een wijziging.
- Werkwijze: hij bevestigt kort de richting ("Ok ga door"), laat Claude volledig
  uitvoeren, en reviewt nadien. Bij grote features stelt hij graag eerst
  gestructureerde vragen. Hij levert het liefst incrementeel op, met een heldere
  uitleg per wijziging.
- Hij flag­t tel- of naamfouten direct en verwacht erkenning en correctie.

## 3. Belangrijk: de app zit in een overgang tussen twee fases

Er bestaan tijdelijk **twee versies**. Verwar ze nooit:

**(A) De oude app — nog live.**
Eén enkel HTML-bestand, React via CDN met `createElement` (geen JSX),
Tailwind via CDN, Google Drive als opslag, gepubliceerd via GitHub Pages.
Deze blijft ongewijzigd draaien tot de herbouw alles kan.

**(B) De herbouw — de nieuwe canonieke versie (waar we naartoe werken).**
Een echt project met buildstap. Zie sectie 4. Dit is vanaf nu de standaard voor
alle nieuwe ontwikkeling. Wanneer instructies over "de app" gaan zonder verdere
aanduiding, bedoelen we de herbouw.

> De oude-app-beperkingen (zie sectie 5) gelden **niet** voor de herbouw. Pas ze
> daar nooit toe.

## 4. De herbouw — architectuur en principes (canoniek)

- **Buildstap:** Vite. **React met echte JSX.** **TypeScript** (vangt fouten vóór
  de app draait — het antwoord op de crash-pijnpunten uit het verleden).
- **Opslag — lokaal-eerst:**
  - **IndexedDB** in de browser is de échte database en de bron van waarheid
    (snel, offline, met echte garanties).
  - **Google Drive** is uitsluitend een **append-only backup/sync-logboek**. Elk
    toestel schrijft alleen zijn *eigen* logbestanden; toestellen raken nooit
    elkaars bestanden aan, dus ze kunnen elkaar niet overschrijven — ook niet bij
    sporadisch gelijktijdig gebruik. Bij opstart leest elk toestel alle logboeken
    en speelt ze af in de lokale database.
  - Nooit oude data overschrijven; alleen gebeurtenissen toevoegen
    (toegevoegd/gewijzigd/verwijderd). Zo is corruptie hooguit de laatste
    toevoeging, nooit de hele dataset.
- **Datavalidatie:** elk datatype heeft een streng schema dat bij lezen en
  schrijven gecontroleerd wordt. Foute of half-gemigreerde data wordt opgemerkt,
  niet stil doorgevoerd.
- **Migraties:** een echt migratiesysteem zet oude data veilig om naar nieuwe
  vormen (vervangt de oude `x || []`-trucs).
- **Testen + CI:** echte, automatische tests (Vitest + Testing Library). Ze
  draaien via GitHub Actions vóór elke publicatie. **Een versie waarvan een test
  faalt, kan niet live gaan.** Dit vervangt de vroegere handmatige checklist.
- **Crash-robuustheid:** React error boundaries (één fout legt niet de hele app
  plat) + later crash-rapportage (Sentry).
- **Publiceren:** nieuwe GitHub-repo, gepubliceerd via GitHub Desktop; GitHub
  Actions bouwt en deployt automatisch naar GitHub Pages. Timothy heeft geen Node
  op zijn pc nodig. Routine: commit → push → automatisch bouwen/testen/publiceren.

## 5. De oude app — regels die ENKEL daar gelden

Deze punten zijn eigen aan de oude architectuur en zijn **achterhaald in de
herbouw**. Gebruik ze alleen wanneer je expliciet aan de oude app werkt:

- Geen `?.` of `??` (was nodig voor oude iOS zonder transpiler) — in de herbouw
  lost de buildstap dit op, dus moderne syntax mag daar gewoon.
- Handgeschreven `createElement`, nooit JSX via string-manipulatie — in de
  herbouw schrijven we normale JSX.
- De Drive-merge-lijst met `deletedIds`-tombstones — dit is het oude sync-model;
  de herbouw gebruikt het append-only logboek uit sectie 4.
- Handmatige `node --check` / syntaxvalidatie vóór oplevering — vervangen door
  automatische tests in CI.

## 6. Anti-verwarringsregels (belangrijk)

1. **Citeer nooit een veranderlijk aantal als vast feit.** Het aantal
   subcategorieën groeit met de tijd en ligt intussen boven de duizend, maar het
   exacte getal hoort **niet** in deze instructies. Wil je een aantal noemen,
   **tel het dan eerst uit het actuele bestand** (`INITIAL_CATEGORIES` plus de
   toevoegingen via `extendCategories()`). Hetzelfde geldt voor elk cijfer dat
   over tijd verandert.
2. **Het actuele bestand is altijd de enige bron van waarheid** over de
   toestand van de app — nooit het geheugen van een vorige sessie en nooit deze
   instructies.
3. **Verwar de twee fases niet** (sectie 3). Bij twijfel: vraag of het over de
   oude app of de herbouw gaat.
4. **Verzin geen feiten om een gat te vullen.** Weet je iets niet zeker, zeg dat
   en verifieer het in het bestand of vraag het.

## 7. Domeinkennis die blijft gelden (in beide fases)

Dit zijn inhoudelijke lessen over de logica, los van architectuur:

- **Split-ticket-transacties** moeten in élke telling/grafiek/budget uitgesplitst
  worden (in de oude app via `ovAmountsForTx`). Aggregeren op de
  moedertransactie is een bekende fout.
- **Interne opgeslagen waarden** (categorie-ID's, `hoofdtype`, kindnamen zoals
  "Kind 1/2/3") blijven taal-onafhankelijk en identiek in elke taal —
  vergelijkingen hangen ervan af. Alleen de *weergavenaam* wordt vertaald.
- **Grafiekkleuren** (bv. donut) komen uit hetzelfde data-object als de cijfers,
  nooit uit een losse kleurenlijst.
- **Merchant-namen** (Colruyt, Delhaize, Q8, ...) worden nooit vertaald.
- Een mislukte opslag mag de gebruiker nooit zijn invoer kosten.

## 8. Genomen beslissingen (juli 2026)

- Kwaliteit/robuustheid eerst, commercialisering daarna.
- Lokaal-eerst met IndexedDB + Drive als append-only backup (niet naar een
  externe server-database, om het gratis en privé te houden — die deur blijft
  wel open voor later bij grote schaal).
- Parallel herbouwen in een nieuwe repo; oude app blijft ondertussen live.
- TypeScript: ja.
- Publiceren via GitHub Desktop + GitHub Actions.

## 9. Commerciële context (uitgesteld, ter info)

- Als er ooit gecommercialiseerd wordt: het kan zonder eigen server-backend door
  de verkoop uit te besteden aan een winkelplatform (bv. Shopify/Gumroad/Lemon
  Squeezy) en de app lokaal-eerst te houden. Voorbeeld in de markt: debudgetnerd.be.
- Bankkoppeling (PSD2) geeft alleen inzicht in **betaalrekeningen**, niet in
  spaar-/beleggings-/pensioenrekeningen. Voor puur persoonlijk gebruik kan dit
  gratis via een aggregator (bv. Enable Banking, gratis tier voor eigen
  rekeningen), maar het vereist een klein server-stukje om de sleutels veilig te
  bewaren en toestemming die periodiek (~90–180 dagen) hernieuwd moet worden.

## 10. Werkwijze bij oplevering

- Lever werkende, geteste code. Laat de tests slagen vóór je iets als klaar
  beschouwt.
- Leg wijzigingen uit in klare taal; toon wat er concreet verandert en waarom.
- Lees altijd het actuele bestand voor je iets aanpast of een aantal noemt.
