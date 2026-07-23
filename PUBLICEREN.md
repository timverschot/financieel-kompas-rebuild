# Publiceren met GitHub Desktop — stap voor stap

Je hoeft geen commandoregel te gebruiken en geen Node te installeren. Het bouwen
gebeurt automatisch in de cloud. Dit doe je één keer om alles op te zetten;
daarna is updaten een kwestie van twee knoppen.

## Eenmalige opzet

**1. Installeer GitHub Desktop**
- Ga naar https://desktop.github.com en download het programma.
- Installeer het en meld je aan met je bestaande GitHub-account (hetzelfde
  account waarmee je nu GitHub Pages gebruikt).

**2. Voeg deze map toe als project**
- In GitHub Desktop: menu **File → Add Local Repository**.
- Kies de map: `C:\Users\jaspe\Desktop\PAPA\BUDGETPLANNER 2.0`
- Er verschijnt de melding dat dit nog geen Git-repository is, met de vraag om er
  een te maken. Klik op **"create a repository"**.
- Laat de naam staan (bv. `financieel-kompas`) en klik op **Create Repository**.
  (Het bestand `.gitignore` staat al klaar, zodat overbodige mappen niet
  meegaan.)

**3. Eerste versie vastleggen (commit)**
- Links zie je nu een lijst met alle bestanden.
- Typ linksonder een korte omschrijving, bv. *"Eerste versie: nieuwe fundering"*.
- Klik op **Commit to main**.

**4. Online zetten (publish)**
- Klik bovenaan op **Publish repository**.
- Belangrijk: laat het vinkje **"Keep this code private" UIT** (dus: publiek).
  GitHub Pages is op een gratis account alleen mogelijk bij een publieke repo.
  → Dat je *code* zichtbaar is, is normaal en veilig: jouw budgetgegevens zitten
    níét in de code, die blijven op je eigen toestel.
- Klik op **Publish repository**.

**5. GitHub Pages aanzetten (via Actions)**
- Ga naar github.com, open je nieuwe repository.
- Klik op **Settings → Pages**.
- Bij **Build and deployment → Source** kies je **GitHub Actions**
  (dus niet "Deploy from a branch").

**6. De publicatie starten/herhalen**
- Ga in je repository naar het tabblad **Actions**.
- Je ziet daar "Deploy naar GitHub Pages". Als die de eerste keer faalde omdat
  Pages nog niet aanstond: klik erop en kies **Re-run jobs**.
- Wacht tot er een groen vinkje staat.

**7. Bekijk je live app**
- Ga naar **Settings → Pages**. Bovenaan staat: *"Your site is live at
  https://<jouwnaam>.github.io/financieel-kompas/"*. Klik die link — dat is je
  gepubliceerde app.

## Voortaan updaten (de nieuwe routine)

Telkens ik nieuwe bestanden in je map schrijf:

1. Open GitHub Desktop — je ziet de wijzigingen automatisch.
2. Typ linksonder een korte omschrijving van wat er veranderde.
3. Klik **Commit to main**, daarna bovenaan **Push origin**.
4. Klaar. De app wordt automatisch opnieuw gebouwd, getest en gepubliceerd.
   Faalt een test, dan wordt er niets gepubliceerd — je live app blijft dan
   veilig op de vorige werkende versie.

Dit vervangt je oude "kopieer één HTML in index.html"-manier volledig.
