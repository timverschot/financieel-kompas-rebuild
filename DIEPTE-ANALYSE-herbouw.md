# Diepte-analyse — Financieel Kompas (herbouw)

> Grondige, meervoudige review van de huidige herbouw met het oog op "de nummer 1
> solide en volledige applicatie" worden. Alle observaties komen uit de échte
> bestanden (gelezen op 23 juli 2026), niet uit geheugen. Per onderdeel: wat er
> goed zit, wat een risico of zwakte is, en wat de aanbeveling is.
>
> Leeswijzer prioriteit: **[KRITIEK]** = kan data of correctheid kosten, eerst
> aanpakken · **[BELANGRIJK]** = duidelijke zwakte, inplannen · **[NICE]** =
> verbetering/uitbreiding.

---

## 0. Algemene indruk

De fundering is verrassend volwassen voor een persoonlijk project: een echt
append-only event-log, Zod-validatie op elke lees/schrijf, een zuiver gescheiden
reken-laag met tests, een abstracte sync-backend, error boundaries en
automatische CI. Dat is een uitstekend vertrekpunt.

De grootste winst zit nu **niet** in nog meer features stapelen, maar in het
dichttimmeren van een handvol **correctheids- en dataverlies-risico's** die een
finance-app maken of kraken, en daarna pas de ontbrekende functionaliteit
(categorieën, split-tickets, spaardoelen, analyse …) er bovenop. Hieronder eerst
de fundering, dan het domein, dan features.

---

## 1. Architect — datamodel & structuur

**Sterk**
- Event-sourcing (`events.ts`, `replay.ts`, `lokaal.ts`): elke wijziging is een
  onveranderlijke gebeurtenis; de staat is een *afgeleide*. Dat geeft
  audittrail, ongedaan-maken-potentieel en conflictvrije sync in principe gratis.
- `pasGebeurtenisToe()` schrijft de gebeurtenis én past de staat toe in één
  Dexie-transactie — logboek en staat lopen nooit uit elkaar. Netjes.
- De repository is de enige poort naar de DB; schema-validatie zit consequent op
  schrijven (`parse`) én lezen (`safeParse` met tellen i.p.v. crashen).

**Zwak / risico**
- **[BELANGRIJK] Geldbedragen zijn `number` (drijvende komma).** In `schema.ts`
  staat `bedrag: z.number()`. Overal wordt gesommeerd met `reduce(+t.bedrag)`
  (`overzicht.ts`, `budget.ts`, `App.tsx` saldo). Drijvende-komma-optelling
  drijft af (het klassieke 0,1 + 0,2 ≠ 0,3) en geeft op termijn centen-fouten in
  saldo's, budgetten en afrekeningen. **Aanbeveling:** bedragen opslaan als
  **gehele centen** (integer) of via een decimal-type, en pas bij weergave delen
  door 100. Dit is een schema-migratie, dus best *vóór* de app veel data heeft.
- **[BELANGRIJK] Geen interne overboekingen.** Een transactie is enkel
  positief (inkomst) of negatief (uitgave). Geld van je betaalrekening naar je
  spaarrekening verschijnt nu als "uitgave + inkomst" en vervuilt categorieën en
  het maandnetto. Een echte finance-app heeft een **transfer-type** (twee
  gekoppelde boekingen of één transfer-entiteit) dat buiten inkomsten/uitgaven
  valt. Belangrijk vóór de spaardoelen/vermogens-features.
- **[BELANGRIJK] Geen valuta-veld.** Alles is impliciet EUR (`format.ts`
  hardcodeert `EUR`). Voor nu prima, maar meerdere valuta later vereist een veld
  per rekening/transactie — goedkoop om nu al te reserveren, duur om achteraf in
  te bouwen.
- **[NICE] Entiteiten missen metadata** (aangemaakt/gewijzigd, volgorde). De
  event-tijdstippen bestaan wel, maar op de entiteit zelf zou een
  `aangemaaktOp`/`gewijzigdOp` sorteer- en weergavelogica vereenvoudigen.
- **[NICE] Rekening mist type en status.** Geen onderscheid
  betaal-/spaar-/beleggingsrekening, geen "gearchiveerd/afgesloten"-vlag. Nodig
  voor netto-waarde-grafiek en latere PSD2-inzichten.

---

## 2. Distributed-systems — synchronisatie & conflicten

**Sterk**
- Append-only per toestel: elk toestel schrijft enkel zijn eigen logbestanden op
  Drive, dus toestellen kunnen elkaar niet overschrijven. Solide basisprincipe.
- Pull dedupliceert op event-`id` en revalideert met `LogregelSchema` vóór het
  toepassen. Een half-corrupt bestand kan de rest niet vergiftigen.

**Zwak / risico**
- **[KRITIEK] Last-writer-wins op wandklok-tijd.** `replay.ts` sorteert op
  `tijdstip` (= `Date.now()` van het schrijvende toestel), dan toestelId, dan
  volgnummer. Als de klok van toestel A achterloopt op toestel B, kan een *oudere*
  bewerking een *nieuwere* overschrijven — puur door klokverschil, niet door
  causaliteit. Voor een app die je op gsm + pc gebruikt is dit een reëel
  stille-datafout-risico. **Aanbeveling:** een **logische/​hybride klok**
  (Lamport of Hybrid Logical Clock): bewaar naast de wandklok een teller die het
  hoogst geziene volgnummer meeneemt, zodat causale volgorde altijd wint en de
  wandklok enkel tie-breaker is. Dit is de belangrijkste correctheidszwakte in de
  sync.
- **[KRITIEK] Drive-sync schaalt niet en heeft een verborgen plafond.** In
  `driveBackend.ts`:
  - Elke push maakt een **nieuw** bestand (`log-{toestelId}-{Date.now()}.json`).
    Het aantal bestanden groeit dus onbeperkt; na verloop van tijd honderden/
    duizenden mini-bestanden.
  - `haalOp()` haalt **álle** bestanden op en downloadt ze **serieel** (`for`
    met `await`) bij elke sync — steeds trager naarmate de historie groeit.
  - De bestandslijst gebruikt `pageSize=1000` **zonder** `nextPageToken`. Boven
    1000 logbestanden worden bestanden **stil overgeslagen** → latente
    datafout/verlies. **Aanbeveling:** per toestel naar één (of periodiek
    gecompacteerd) bestand schrijven i.p.v. één-per-push, incrementeel ophalen op
    `modifiedTime > laatstePull`, en paginatie correct afhandelen.
- **[BELANGRIJK] Ingebouwde referentiedata mag geen events worden.** `seed.ts`
  schrijft via de repository, dus elke seed-categorie wordt een *gebeurtenis*.
  Zodra de grote categorie-database (1.100+ items) erbij komt, zou seeden-als-
  events (a) het logboek en de Drive-backup enorm opblazen, en (b) op elk toestel
  **eigen** seed-events met andere id's aanmaken → duizenden duplicaten na sync.
  **Aanbeveling:** de ingebouwde categorieboom als **statische code met vaste,
  deterministische id's** behandelen (geen events); enkel *gebruikersaanpassingen*
  (hernoemen/toevoegen/verwijderen/verbergen) worden events. Dit is een
  ontwerpbeslissing die je best nú neemt, vlak vóór het categoriewerk.
- **[NICE] Event-log wordt nooit gecompacteerd.** `herbouwStaat()` speelt élke
  gebeurtenis opnieuw af bij elke pull. Voor een persoonlijke app duurt dat lang
  goed, maar een **snapshot + compactie**-strategie (periodiek de staat vastleggen
  en oude events archiveren) houdt het jaren later snel.

---

## 3. Betrouwbaarheid — dataverlies-risico (arguably #1)

Voor "solide" is dit belangrijker dan welke feature ook: **kan de gebruiker ooit
zijn data verliezen?** Vandaag: ja, op meerdere manieren.

- **[KRITIEK] IndexedDB kan geëvicteerd worden.** De bron van waarheid staat in
  de browser. Zonder `navigator.storage.persist()` mag de browser die opslag
  wissen onder schijfdruk; **iOS Safari wist IndexedDB zelfs automatisch na ~7
  dagen** zonder gebruik voor niet-geïnstalleerde sites. Er is nergens een
  `persist()`-aanvraag (gecontroleerd: geen enkele hit). **Aanbeveling:** bij
  start `navigator.storage.persist()` vragen en de status tonen.
- **[KRITIEK] Sync is volledig handmatig.** Er is geen auto-sync, geen
  `beforeunload`/visibility-flush (gecontroleerd: geen hits). Data leeft dus enkel
  lokaal tot de gebruiker bewust op "Synchroniseer nu" klikt. Vergeet hij dat en
  wist de browser de opslag → alles weg. v1 hád een beforeunload/visibility-flush;
  dit is een regressie. **Aanbeveling:** automatisch pushen na elke wijziging (met
  debounce) en bij het verlaten van de pagina.
- **[BELANGRIJK] Geen lokale export/import.** Er is geen "download alles als
  bestand"/"herstel uit bestand". Dat is tegelijk je onafhankelijke vangnet
  (los van Google), je data-portabiliteit en een GDPR-pluspunt. **Aanbeveling:**
  JSON-export/import van het volledige event-logboek (en desnoods een leesbare
  CSV-export van transacties).
- **[BELANGRIJK] Auth-regressie t.o.v. v1.** `auth.ts` bewaart het token enkel
  in het geheugen; na een herlaad moet je telkens opnieuw verbinden. v1 had een
  drielaags stille-token-vernieuwing met reconnect-melding. Zonder dat wordt
  auto-sync in de praktijk onbetrouwbaar (token weg = geen backup).
- **[BELANGRIJK] Mislukte Drive-upload wordt aan de gebruiker getoond, maar
  blokkeert stil de backup.** `driveFetch` gooit bij elke niet-OK status. Prima
  dat het niet stil faalt, maar er is geen herstel-/herprobeer-strategie of
  duidelijke "je backup is X dagen oud"-indicator.

---

## 4. Security & privacy

**Sterk**
- OAuth-scope is `drive.file` (alleen eigen app-bestanden) — minimale rechten,
  precies goed.
- Client ID is terecht openbaar; geen secrets in de repo.
- React escapet standaard; **geen** `dangerouslySetInnerHTML` (gecontroleerd) →
  geen voor de hand liggend XSS-oppervlak.

**Zwak / risico**
- **[BELANGRIJK] Backup staat onversleuteld op Drive.** De logbestanden zijn
  platte JSON met je volledige financiële historie. Voor puur persoonlijk gebruik
  in je eigen Drive aanvaardbaar, maar voor een "nummer 1"-app (en zeker richting
  commercialisering) is **client-side encryptie** (bv. een wachtwoord →
  sleutel via WebCrypto, data versleuteld vóór upload) een sterke plus. Minstens
  als optie overwegen.
- **[NICE] Geen Content-Security-Policy / security-headers** op de GitHub-Pages
  build. Beperkt haalbaar op Pages, maar een `<meta>`-CSP kan het scriptoppervlak
  dichttimmeren.
- **[NICE] Afhankelijkheden niet automatisch bewaakt** — zie CI (§8).

---

## 5. Financieel-domein — correctheid

- **[KRITIEK/BELANGRIJK] Geld als float** — zie §1. In een boekhoud-app is dit
  het belangrijkste domeinrisico.
- **[BELANGRIJK] Split-tickets ontbreken** en de aggregaties in `overzicht.ts` en
  `budget.ts` tellen op de moedertransactie. Zodra splitsen erbij komt, moeten
  deze functies de deelbedragen uitsplitsen (het bekende `ovAmountsForTx`-patroon
  uit v1). Nu al zo bouwen dat de aggregatie via één centrale "geef alle
  (categorie, bedrag)-regels voor transactie X"-functie loopt, voorkomt de
  klassieke dubbeltel-bug.
- **[BELANGRIJK] Dossier-verdeelsleutel is één percentage voor het hele
  dossier** (`aandeelJij`). v1 kon per kostensoort een andere verdeling. Voor
  co-ouderscenario's (bv. school 50/50 maar kleding 70/30) is verdeling per
  kost(soort) vaak nodig.
- **[NICE] Budgetten zijn maandelijks, plat, zonder overdracht.** Geen
  jaarbudget, geen "wat overblijft rolt door", geen budget per hoofdcategorie.
- **[NICE] Indexatie** (`indexatie.ts`) is een correcte, geteste formule, maar de
  indexcijfers moeten handmatig ingevoerd worden. Later eventueel de officiële
  Statbel-index ophalen/bijwerken.
- **[NICE] Geen afrondings-/valutabeleid centraal.** `formatEuro` en
  `indexeerBedrag` ronden elk apart; met centen-integers (zie §1) verdwijnt die
  inconsistentie.

---

## 6. QA — tests & kwaliteitsborging

**Sterk**
- 51 tests, groen, en op de juiste plekken: de reken-utils (`overzicht`,
  `budget`, `dossier`, `indexatie`, `format`) en de **sync-motor** (`schema`,
  `migration`, `replay`, `sync`, `repository`) zijn gedekt. De motor testen met
  `fake-indexeddb` is precies goed.
- CI blokkeert deploy als een test faalt.

**Zwak / risico**
- **[BELANGRIJK] Componenten nauwelijks getest.** Enkel `IndexatieCalculator` en
  een `App`-integratietest. De invoerformulieren (Transactie, Rekening, Categorie,
  Budget, Dossier, GedeeldeKost, Terugkerende) hebben geen eigen tests, terwijl
  daar de meeste gebruikersfouten en edge-cases zitten (komma-decimalen, lege
  velden, bewerken vs. toevoegen).
- **[BELANGRIJK] De Drive-backend is niet getest.** Begrijpelijk (echte API),
  maar de multipart-opbouw, paginatie en foutafhandeling zijn net de plekken met
  latente bugs (§2). Een test met een gemockte `fetch` zou veel dekken.
- **[NICE] Geen dekkingsrapport** en geen tests die expliciet de
  klok-skew/LWW-conflictscenario's afdekken (die worden nu impliciet aangenomen).
- **[NICE] Geen end-to-end/rook-test** die de echte gebouwde app in een browser
  opstart.

---

## 7. Performance & schaal

- **[BELANGRIJK] Volledige herlaad bij elke wijziging.** `App.tsx` roept na élke
  schrijfactie `herlaad()`, dat **alle acht** entiteiten opnieuw uit de DB haalt
  en revalideert. Bij honderden transacties per maand is dat merkbaar. Later:
  gerichter herladen of in-memory bijwerken.
- **[BELANGRIJK] Alles-in-één-render.** `App.tsx` (550 regels) rendert elke
  sectie en de volledige transactielijst tegelijk, zonder virtualisatie of
  paginatie. Met jaren aan transacties wordt dat traag. Tabbladen/paginatie lossen
  dit meteen mee op.
- **[NICE] Categorie-zoeken** wordt met 1.100+ items een aandachtspunt: een
  platte `<select>` volstaat niet; een doorzoekbare, geïndexeerde keuzelijst is
  nodig (raakt aan het categoriewerk).
- Drive-schaal: zie §2.

---

## 8. DevOps, CI & observability

**Sterk**
- GitHub Actions: `npm ci` → `npm test` → `npm run build` → deploy. Test-gate
  vóór publicatie. Precies goed, en Timothy heeft lokaal geen Node nodig.

**Zwak / risico**
- **[BELANGRIJK] Geen crash-rapportage.** Sentry stond al op de lijst; zonder
  monitoring weet je niet dat een gebruiker (jij) een crash had. Error boundary
  vangt de UI-crash, maar rapporteert niets.
- **[BELANGRIJK] Geen lint-stap en geen afhankelijkheidsbewaking in CI.** Geen
  ESLint/Prettier-gate, geen `npm audit`/Dependabot. Voor "solide" horen die er
  standaard bij.
- **[NICE] Geen versie-/buildstempel** in de app, dus in een bugmelding weet je
  niet welke build draait.
- **[NICE] Geen preview-deploy per pull request** (kan later, met branches).

---

## 9. UX, toegankelijkheid & mobiel

**Sterk**
- Er zíjn `aria-label`s op knoppen en een `role="progressbar"` met correcte
  waarden op budgetten — toegankelijkheid is niet vergeten.
- Het transactieformulier doet het goed: `inputMode="decimal"`, en het accepteert
  **Belgische komma-decimalen** (`bedrag.replace(',', '.')`). Doordacht.

**Zwak / risico**
- **[BELANGRIJK] Eén lange scroll, inline stijlen, geen designsysteem.** `App.tsx`
  en elk formulier herhalen losse inline-stijlobjecten. Er is geen thema, geen
  herbruikbare knop/kaart/inputs, geen tabbladen. Dit is precies de geplande
  design-pass — maar het is ook een *onderhouds*kwestie: nu elke stijl los, straks
  honderd plekken aanpassen. Overweeg een lichte component-/tokenlaag (kleuren,
  spacing, typografie) vóór de visuele pass.
- **[BELANGRIJK] Geen ongedaan-maken.** Verwijderen gebeurt direct, zonder
  bevestiging of undo-toast. Het event-log maakt undo nochtans triviaal (voeg een
  "hersteld"-gebeurtenis toe). v1 had het undo-toast-patroon.
- **[NICE] Weinig lege-toestand-begeleiding** en geen feedback-momenten (bv. "post
  ingeboekt", "opgeslagen"). 
- **[NICE] Geen dark mode / geen respect voor systeemvoorkeur.**
- **[NICE] Geen toetsenbordnavigatie** in de (toekomstige) categorie-zoeker — v1
  had hier expliciet `useRef`-patronen voor; die les meenemen.

---

## 10. Meertaligheid (i18n)

- **[BELANGRIJK] Volledig NL, hardcoded.** v1 had NL/EN/FR met 449 teksten via
  `tt()` en vertaaltabellen, met de belangrijke regel dat *opgeslagen* waarden
  (categorie-id's, `hoofdtype`, kindnamen) taal-onafhankelijk blijven en enkel de
  *weergave* vertaalt. Als meertaligheid terugkomt, best **vóór** de design-pass
  en **vóór** de UI-teksten zich vermenigvuldigen — anders vertaal je achteraf
  honderden losse strings. Bouw de teksten van meet af via een `t()`-helper, ook
  al is er voorlopig één taal.

---

## 11. PWA / offline / installeerbaarheid

- **[BELANGRIJK] Geen PWA.** Geen manifest, geen service worker, geen
  offline-app-shell, geen "toevoegen aan beginscherm". IndexedDB geeft wél offline
  *data*, maar de app zelf laadt niet betrouwbaar offline, en zonder
  home-screen-installatie geldt op iOS net de 7-daagse eviction (§3). Een PWA
  lost meteen drie dingen op: installeerbaar, offline, én betere
  opslag-persistentie. Met Vite is dit relatief goedkoop (`vite-plugin-pwa`).

---

## 12. Uitbreidingsmogelijkheden (voorbij v1-pariteit)

Naast het terughalen van v1-features (categorieboom, split-tickets, spaardoelen,
analyse/grafieken, barcode, zoeken, instellingen, meertaligheid, dossier-PDF) —
kansen die van "goed" naar "nummer 1" tillen:

- **Rapporten & inzicht:** jaaroverzicht, categorie-trends over de tijd, gemiddelde
  vaste lasten, "waar ging mijn geld heen"-jaarrapport, exporteerbaar als PDF.
- **Vooruitblik/forecast:** op basis van vaste lasten + gemiddelde uitgaven een
  kasstroomprognose ("houd ik deze maand over?").
- **Bonnetjes/OCR:** foto van kassabon → automatisch splitsen (sluit aan op
  split-tickets + categorieboom + barcode).
- **PSD2/bankkoppeling** (later, vereist klein serverstukje): betaalrekeningen
  automatisch inlezen. Staat al in de projectvisie.
- **Dossiers uitbreiden** (staat al in de visie): persoonlijke leningen (openstaand
  kapitaal + terugbetalingen), en garantie-/factuurbeheer met garantieperiode-
  bewaking. De event-log-architectuur leent zich hier goed voor.
- **Zoeken & filteren** over alle transacties (bedrag, periode, categorie, tekst).
- **Multi-user dossiers:** een dossier delen met de co-ouder (elk eigen invoer) —
  natuurlijke uitbreiding van het sync-model, maar vereist gedeelde opslag.
- **AI-adviseur** (stond in v1-visie): samenvatting en tips op basis van je eigen
  cijfers, lokaal opgesteld.

---

## 13. Geprioriteerde aanbeveling (volgorde)

**Ronde A — fundering hard maken (vóór nieuwe features):**
1. **Geld → gehele centen** (schema + migratie + alle aggregaties). *[KRITIEK,
   correctheid]*
2. **Dataverlies dichttimmeren:** `navigator.storage.persist()`, **auto-sync**
   (na wijziging + bij verlaten pagina), en **JSON-export/import**. *[KRITIEK,
   betrouwbaarheid]*
3. **Auth-persistentie/stille vernieuwing** herstellen, zodat auto-sync werkt.
   *[BELANGRIJK]*
4. **Sync-correctheid:** logische/hybride klok i.p.v. pure wandklok-LWW. *[KRITIEK]*
5. **Drive-schaal:** per-toestel-compactie, incrementeel ophalen, paginatie fixen
   (>1000-bestanden-bug). *[KRITIEK, latent]*

**Ronde B — categorie-fundering (blokkeert veel features):**
6. **Ingebouwde categorieboom als statische code** met vaste id's (géén seed-
   events), drie-lagen-schema, doorzoekbare keuzelijst. *[BELANGRIJK]* → daarna
   **split-tickets**, dan **barcode/zoeken**.

**Ronde C — kwaliteit & schaal-hygiëne (mag parallel):**
7. Component-tests + gemockte Drive-tests; ESLint + `npm audit`/Dependabot +
   versiestempel + Sentry in CI. *[BELANGRIJK]*
8. Tabbladen/paginatie + lichte design-token-laag + undo-toast, dán de visuele
   design-pass. *[BELANGRIJK]*
9. i18n-helper invoeren (ook met één taal), PWA (manifest + service worker).
   *[BELANGRIJK/NICE]*

**Ronde D — nieuwe modules:** spaardoelen, analyse/grafieken, rapporten, forecast,
dossier-uitbreidingen (leningen, garanties), PSD2.

---

### Kort samengevat
De motor is goed gebouwd; de risico's zitten in **float-geld**, **dataverlies
(eviction + handmatige sync + geen export)**, **sync-conflicten op wandklok**, en
**Drive-schaal**. Die vier eerst hard maken, dan de categorie-fundering neerzetten,
en pas daarna de featureberg. Zo wordt dit een app waar je jarenlang blind op kan
vertrouwen — de echte betekenis van "nummer 1 en solide".
