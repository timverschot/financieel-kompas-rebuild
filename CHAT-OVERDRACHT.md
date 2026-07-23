# Financieel Kompas — overdracht voor een nieuwe chat

> Plak dit in een nieuwe chat om verder te werken zonder alles opnieuw uit te
> leggen. De volledige, actuele broncode staat in de map die je koppelt
> (`BUDGETPLANNER 2.0`). Lees bij twijfel altijd het echte bestand — dit
> document geeft de context, niet de exacte inhoud.

## Wie & wat
- Timothy (geen developer — leg keuzes uit in klare taal, vermijd jargon).
- App: **Financieel Kompas**, een persoonlijke budget-app voor BE/NL.
- We doen een **herbouw** van een oude single-file app naar een solide basis.
- Communicatie in het **Nederlands**.

## Waar staat het
- Lokale map (gekoppeld in de chat): `C:\Users\jaspe\Desktop\PAPA\BUDGETPLANNER 2.0`
- GitHub-repo: `timverschot/financieel-kompas-rebuild` (publiek)
- Live app: https://timverschot.github.io/financieel-kompas-rebuild/
- De oude app draait ongewijzigd apart (repo `financieel-kompas`) — niet aanraken.

## Techniek
- Vite + React (JSX) + **TypeScript** (strict). Tests: **Vitest + Testing
  Library** + `fake-indexeddb`. Publiceren via **GitHub Desktop** → Commit →
  Push; GitHub Actions bouwt, test en deployt automatisch (workflow
  `.github/workflows/deploy.yml`). Timothy heeft geen Node op zijn pc nodig.
- Google Drive Client ID (openbaar, mag in code): staat in `src/config.ts`.

## Architectuur (belangrijk)
- **Lokaal-eerst**: IndexedDB (via **Dexie**) is de bron van waarheid; Google
  Drive is een **append-only backup/sync-logboek** per toestel.
- **Append-only event log**: elke wijziging is een `Gebeurtenis` (bewaard/
  verwijderd per entiteit). `src/data/sync/lokaal.ts` schrijft de gebeurtenis +
  past de staat toe in één Dexie-transactie. `replay.ts` bouwt de staat op uit
  het logboek met last-writer-wins (deterministisch → conflictvrije sync).
- **Zod-schema's** (`src/data/schema.ts`) valideren elke lees/schrijf. Ongeldige
  records worden geweigerd (schrijven) of overgeslagen + geteld (lezen).
- **Repository** (`src/data/repository.ts`) is de enige weg naar de DB: alle
  `bewaarX`/`verwijderX`/`laadX` lopen hierlangs.
- Drive-sync: `src/data/sync/backend.ts` (interface + geheugen-backend),
  `sync.ts` (push/pull), `drive/driveBackend.ts` + `drive/auth.ts` (echte Drive,
  scope `drive.file`).

## Bestandsstructuur (src/)
- `App.tsx` — hoofdscherm (laadt alle entiteiten, rendert alle secties).
- `config.ts` — Google Client ID.
- `data/` — `schema.ts`, `db.ts` (Dexie, versies), `repository.ts`, `seed.ts`.
- `data/sync/` — `events.ts`, `replay.ts`, `lokaal.ts`, `sync.ts`, `backend.ts`,
  `id.ts`, `drive/auth.ts`, `drive/driveBackend.ts`.
- `components/` — één formulier/sectie per feature (TransactieFormulier,
  RekeningFormulier, CategorieFormulier, BudgetFormulier, DossierSectie +
  DossierFormulier + GedeeldeKostFormulier, IndexatieCalculator,
  TerugkerendeSectie + TerugkerendePostFormulier, ErrorBoundary).
- `utils/` — `format.ts`, `budget.ts`, `overzicht.ts`, `dossier.ts`,
  `indexatie.ts` (elk met een `.test.ts`).

## Entiteiten & DB-versies (Dexie)
v1 rekeningen+transacties · v2 events+meta (met backfill) · v3 categorieën ·
v4 budgetten · v5 dossiers+gedeeldeKosten · v6 verrekeningen · **v7
terugkerendePosten** (huidige versie). Nieuwe entiteit = nieuwe `version(n)` in
`db.ts` (bestaande data blijft; optionele velden voor terugwaartse
compatibiliteit).

## Wat werkt (functioneel)
- Maandoverzicht (inkomsten/uitgaven/netto + per categorie), maandnavigatie.
- Rekeningen (toevoegen/bewerken/verwijderen, beginsaldo).
- Categorieën (toevoegen/hernoemen/verwijderen).
- Budgetten per categorie met voortgangsbalken (verwijderbaar).
- Transacties (toevoegen/bewerken/verwijderen; rekening + optionele categorie).
- Vaste lasten (terugkerende posten; 1-klik inboeken per maand, idempotent via
  transactie-id `tk-{postId}-{maand}`; bewerken/verwijderen).
- Dossiers (gedeelde kosten co-ouders): verdeelsleutel, kosten toevoegen/
  bewerken/verwijderen, automatische verrekening, **afrekeningen vastleggen** +
  geschiedenis, dossier verwijderen.
- Alimentatie-indexatie calculator (Belgische formule).
- Google Drive: verbinden + synchroniseren (backup-map "Financieel Kompas
  Backup").
- **51 automatische tests**, alles groen.

## Werkwijze bij een nieuwe feature (belangrijk — volg dit patroon)
1. Nieuwe entiteit? Voeg schema toe in `schema.ts`, event-types in `events.ts`,
   cases in `replay.ts` én `lokaal.ts` (pasStaatToe + tabellenlijsten), een
   `version(n)` in `db.ts`, en `bewaarX/verwijderX/laadX` in `repository.ts`.
   > Let op: Dexie `transaction('rw', [tabellen], ...)` gebruikt een **array**
   > bij meer dan 5 tabellen (staat al zo in lokaal.ts).
2. Zuivere rekenlogica → aparte functie in `utils/` + een `.test.ts` (bv. zoals
   `budget.ts`, `overzicht.ts`, `dossier.ts`, `indexatie.ts`).
3. UI → een component in `components/`; koppel in `App.tsx` (state laden via
   `herlaad()` + de `useEffect`).
4. Schrijf tests; verifieer daarna (zie hieronder). Lever pas op als groen.
5. Timothy pusht via GitHub Desktop en test in de live app.

## Verifiëren (in de sandbox, houdt de map schoon)
```
rm -rf /tmp/fk && mkdir -p /tmp/fk
cp -r "<gekoppelde map>/." /tmp/fk/
cd /tmp/fk && rm -rf node_modules
npm install
npm test        # moet groen zijn
npm run build   # tsc -b && vite build, moet slagen
```
Wijzig je alleen tests, kopieer dan enkel dat bestand naar /tmp/fk en her-run.

## Val­kuilen / lessen (bespaart tijd)
- De **sandbox-klok staat op juli 2026** → seed-transacties (2026-07) vallen in
  "deze maand". Daardoor is het maandoverzicht-**Netto** soms gelijk aan het
  totaal-**Saldo**: query saldo via de Saldo-regel (`getByText('Saldo').closest('p')`),
  niet met een los bedrag.
- Meerdere selects tonen dezelfde optie → gebruik `findAllByRole('option', …)`
  i.p.v. `findByRole` in tests.
- Gebruik **unieke labels** per formulier (bv. "Vaste omschrijving" vs
  "Omschrijving") zodat `getByLabelText` niet ambigu wordt.
- `beforeEach` in `App.test.tsx` moet **alle** tabellen wissen (anders lekt data
  tussen tests).
- Geen `?.`/`??`-verbod meer (dat was de oude app); moderne syntax mag hier.

## Volgende stap (waar we stopten)
Functioneel is de app in grote lijnen af. De volgende geplande fase is de
**design/opmaak-pass**: een consistent, verzorgd, mobielvriendelijk uiterlijk.
Open vraag aan Timothy: teruggrijpen naar de **look van de oude app** (kleuren/
stijl die gebruikers kennen — liefst een screenshot of de kleurcodes) of een
**frisse moderne stijl**? Styling staat nu bewust los van de logica, dus dit kan
netjes in één keer over alle componenten.

Nog open (klein): crash-rapportage via Sentry (vereist een gratis account van
Timothy).
