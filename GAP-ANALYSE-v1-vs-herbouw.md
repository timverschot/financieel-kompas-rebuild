# Gap-analyse — wat zat in v1 en ontbreekt (nog) in de herbouw

> Vergelijking tussen de **nieuwste oude-app snapshot**
> (`FinancieelKompas_indexatie.html`, 7580 regels) en de huidige **herbouw**
> (`BUDGETPLANNER 2.0`). Alle cijfers zijn geteld uit de echte bestanden, niet
> uit geheugen. Opgesteld 23 juli 2026.

## Samenvatting in één zin

De herbouw heeft de **datalaag en de kernboekhouding** stevig staan (rekeningen,
transacties, budgetten, vaste lasten, dossiers, indexatie, Drive-sync), maar
mist nog een flink stuk van wat v1 tot een afgewerkte app maakte: de **grote
categorie-database**, **kassaticketten splitsen**, **spaardoelen**, de
**analyse/grafieken**, de **barcode-scanner**, **meertaligheid**, **instellingen**
en de **opmaak**.

## Structuurverschil

- **v1** was een app met tabbladen: Dashboard · Transacties · Rekeningen ·
  Budgetten · Categorieën · Spaardoelen · Analyse · Dossiers · Instellingen · Meer.
- **De herbouw** is momenteel één doorlopende pagina met secties:
  Maandoverzicht · Rekeningen · Categorieën · Budgetten · Vaste lasten ·
  Transacties · Saldo · Dossiers · Indexatie · Drive-knop.

## Wat al werkt in de herbouw (ter referentie)

Maandoverzicht (inkomsten/uitgaven/netto + per categorie) · rekeningen ·
categorieën (plat) · budgetten met voortgangsbalken · transacties · vaste lasten
(idempotent inboeken) · dossiers met verdeelsleutel, afrekeningen + geschiedenis ·
alimentatie-indexatie · Google Drive backup/sync · 51 tests groen.

---

## Ontbrekend of onvolledig — geordend op belang

### 1. Categorie-database — bijna leeg  ⚠️ groot
- **v1:** een **drie-lagen** structuur — hoofdcategorie → categorie → item —
  met per hoofdcategorie een `hoofdtype` (Vaste Uitgaven / Variabele Uitgaven /
  Sparen / Inkomsten), een kleur en een icoon. Items hebben **synoniemen** en een
  **eenheid** (stuks/kg/L). Geteld: **14 hoofdcategorieën, 62 mid-categorieën,
  730 items** in de basis, plus **~416 extra items** via `extendCategories()` →
  samen **ruim 1.100 items**.
- **Herbouw:** categorieën zijn een **platte lijst** met enkel een naam
  (`CategorieSchema` = `id` + `naam`). De seed vult maar **3** categorieën. Geen
  niveaus, geen hoofdtype, geen kleur/icoon, geen synoniemen/eenheden.
- **Nodig:** schema uitbreiden naar de drie-lagen-structuur, de v1-database
  importeren, en de UI (kiezen/zoeken in categorieën) daarop bouwen. Dit is de
  fundering waar split-tickets, barcode en analyse op leunen.

### 2. Kassaticketten splitsen (split-tickets)  ⚠️ kern-feature
- **v1:** één betaling kon over **meerdere categorieën/items** verdeeld worden,
  en werd overal correct uitgesplitst via `ovAmountsForTx` (in élke telling,
  grafiek en budget). Dit is volgens je eigen projectinstructies een verplicht
  patroon.
- **Herbouw:** een transactie heeft **precies één** (optionele) categorie. Geen
  splitsing, geen regelitems, geen hoeveelheden.
- **Nodig:** transactie-schema met deelregels, event-log/replay/repository
  aanpassen, en de uitsplitsing doortrekken in `overzicht.ts` en `budget.ts`.

### 3. Spaardoelen (savings goals)  ❌ volledig weg
- **v1:** een eigen tabblad met spaardoelen.
- **Herbouw:** bestaat niet (geen schema, geen UI).
- **Nodig:** nieuwe entiteit volgens het vaste patroon (schema → events → replay
  → db-versie → repository → utils + tests → component → App).

### 4. Analyse / grafieken  ❌ weg
- **v1:** een Analyse-tab met **donutgrafiek** per categorie, **staafgrafiek**,
  en op Rekeningen een **vermogensevolutie** (meerlijns-SVG, per rekening aan/uit
  te zetten, met carry-forward).
- **Herbouw:** enkel platte lijstjes met bedragen; geen enkele grafiek.
- **Let op:** donutkleuren moeten uit hetzelfde data-object komen als de cijfers
  (bekende valkuil uit v1).

### 5. Barcode-scanner + productherkenning  ❌ weg
- **v1:** streepjescode scannen → Open Food Facts (drie-traps zoekopdracht) →
  automatische subcategorie-match op synoniemen, plus **Nutri-Score** opslag en
  een uitsplitsingskaart.
- **Herbouw:** niets hiervan. Leunt bovendien op de categorie-database (punt 1).

### 6. Zoeken op naam  ❌ weg
- **v1:** transacties/items doorzoekbaar op naam (aparte snapshot
  `zoeken-op-naam`).
- **Herbouw:** geen zoekfunctie.

### 7. Meertaligheid NL/EN/FR  ❌ weg
- **v1:** volledige vertaling via `tt()` — **449 UI-teksten** plus vertaaltabellen
  voor categorieën/subcategorieën/synoniemen. Interne opgeslagen waarden bleven
  Nederlands (vergelijkingen hangen daarvan af).
- **Herbouw:** alles hardcoded Nederlands.

### 8. Instellingen  ❌ weg
- **v1:** een Instellingen-tab (o.a. taalkeuze, Drive-beheer, voorkeuren) en een
  "Meer"-menu.
- **Herbouw:** enkel een losse "Verbind met Google Drive"-knop onderaan.

### 9. Dossiers — deels onvolledig  ⚠️
- **Werkt al:** verdeelsleutel, kosten toevoegen/bewerken, automatische
  verrekening, afrekeningen vastleggen + geschiedenis, dossier verwijderen.
- **Ontbreekt t.o.v. v1:**
  - **Split-percentage per kostensoort** (v1 kon per type kost een andere
    verdeling; de herbouw heeft één `aandeelJij` voor het hele dossier).
  - **PDF-afrekening** (v1 had een offline PDF-generator, lokale download +
    Drive-autosave).
  - **WhatsApp/klembord-samenvatting** van de afrekening.

### 10. Opmaak / design  ❌ (bewust uitgesteld)
- **v1:** warm "Gouden Uur"-palet (Tailwind-config), lettertypes Fraunces +
  Outfit, mobiel-first, PWA-meta (theme-color, apple-mobile-web-app…).
- **Herbouw:** standaard `system-ui`, inline stijlen, geen thema. Dit is de
  geplande design-pass.

### 11. PWA / installeerbaar  ❌
- **v1:** meta-tags voor "toevoegen aan beginscherm", statusbalkkleur, enz.
- **Herbouw:** nog niet (wel makkelijk toe te voegen dankzij Vite).

### 12. Kleiner / techniek
- **Sentry crash-rapportage** — stond al open (vereist gratis account van jou).
- **BTW-velden** voor professionele uitgaven — stond in v1 op de planning, wellicht
  nooit afgewerkt; checken of je dit wil.
- **AI-adviseur-tab** — idee uit v1, niet essentieel.

---

## Voorgestelde volgorde (afhankelijkheden)

1. **Categorie-database** (fundering) — drie-lagen-schema + v1-import.
2. **Split-tickets** — bouwt hierop voort.
3. **Spaardoelen** — losstaand, kan tussendoor.
4. **Analyse/grafieken** — leunt op categorie + split.
5. **Barcode + zoeken** — leunen op categorie-database.
6. **Meertaligheid + Instellingen** — best vóór de design-pass, of samen ermee.
7. **Design-pass** — in één keer over alles.
8. **Dossier-aanvullingen** (per-kost-split, PDF, samenvatting) — apart in te plannen.
9. **PWA + Sentry** — afronding.
