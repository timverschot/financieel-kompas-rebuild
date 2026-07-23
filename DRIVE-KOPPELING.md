# Google Drive koppelen — stap voor stap (Fase 2b)

Doel: een gratis "toegang" (OAuth Client ID) aanmaken zodat je app veilig een
backup-map in jóuw Google Drive mag gebruiken. Je hebt hiervoor geen server en
geen betaling nodig. Het is eenmalig klikwerk in de Google Cloud Console.

> Belangrijk: de app krijgt alleen de scope `drive.file` — ze kan enkel bij
> bestanden die ze zélf aanmaakt, niet bij de rest van je Drive.
>
> De schermen van Google veranderen soms. Werkt een stap net iets anders?
> Stuur een screenshot, dan wijs ik je verder. Zoek steeds naar de knop of
> sectie die hetzelfde *doel* heeft.

---

## Stap 1 — Project aanmaken

1. Ga naar https://console.cloud.google.com en meld je aan met je Google-account
   (timothyverschoren@gmail.com).
2. Bovenaan, naast het "Google Cloud"-logo, staat een projectkiezer. Klik erop
   en kies **New Project / Nieuw project**.
3. Naam: `Financieel Kompas`. Klik **Create / Maken**.
4. Wacht tot het project klaar is en selecteer het (weer via de projectkiezer
   bovenaan), zodat je erin werkt.

## Stap 2 — De Google Drive API aanzetten

1. Open links het menu (≡) → **APIs & Services → Library / Bibliotheek**.
2. Zoek op **Google Drive API**.
3. Klik erop en klik **Enable / Inschakelen**.

## Stap 3 — Het toestemmingsscherm instellen (nieuwe "Google Auth Platform")

Zie je een scherm **"Google Auth Platform"** met links de tabbladen *Overview,
Branding, Audience, Clients, ...* en de melding "not configured yet"? Dan zit de
"External"-keuze in een wizard, niet los. Doe dit:

1. Klik op de blauwe knop **Get started**.
2. **App Information**: app-naam `Financieel Kompas` + je eigen e-mail als
   support-e-mail → **Next**.
3. **Audience**: kies hier **External**. (Dit is de "gebruikerstype"-keuze.)
   → **Next**.
4. **Contact Information**: je eigen e-mail → **Next**.
5. Ga akkoord met het beleid en klik **Create / Finish**.

## Stap 3b — Jezelf als testgebruiker toevoegen

1. Klik links op het tabblad **Audience**.
2. Zoek de sectie **Test users** en klik **Add users**.
3. Voeg je eigen e-mail toe (timothyverschoren@gmail.com) en bewaar.
4. Laat "Publishing status" op **Testing** staan — dat volstaat voor persoonlijk
   gebruik, zonder verificatie.

## Stap 4 — De OAuth Client ID aanmaken (tabblad "Clients")

1. Klik links op het tabblad **Clients** → **Create client**.
   (In de oudere versie: *APIs & Services → Credentials → Create Credentials →
   OAuth client ID*.)
2. Application type / Toepassingstype: **Web application / Webtoepassing**.
3. Naam: `Financieel Kompas web`.
4. Bij **Authorized JavaScript origins / Geautoriseerde JavaScript-bronnen**,
   klik **Add URI** en voeg exact toe:

   ```
   https://timverschot.github.io
   ```

   (Optioneel, als je later lokaal wil testen, voeg ook toe:
   `http://localhost:5173`)

   Laat "Authorized redirect URIs" leeg — die hebben we niet nodig.
5. Klik **Create**.

## Stap 5 — De Client ID kopiëren en aan mij bezorgen

1. Er verschijnt een venster met je **Client ID**. Die ziet er zo uit:

   ```
   1234567890-abcdefg....apps.googleusercontent.com
   ```

2. Kopieer die volledige Client ID en plak hem in het gesprek.

> De Client ID is niet geheim — hij mag gewoon in de code staan. Er is géén
> "client secret" nodig voor deze opzet. Bezorg me dus enkel de Client ID (niet
> een eventueel secret).

## Wat er daarna gebeurt

Zodra ik je Client ID heb, bouw ik de Drive-backend en de aan-/afmeldknop in de
app. De eerste keer dat je aanmeldt, toont Google een scherm "Google heeft deze
app niet geverifieerd" — dat is normaal voor een persoonlijke app in testmodus.
Je klikt dan op **Geavanceerd → Ga door naar Financieel Kompas**. Daarna maakt de
app een backup-map in je Drive en begint het synchroniseren.
