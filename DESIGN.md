# Kompal — designleidraad (herbouw)

Deze leidraad legt vast hoe schermen in de herbouw eruitzien. De waarden komen
uit het Claude-designsysteem "Kompal Design System". Het doel: elke pagina bouwt
met dezelfde kaart, dezelfde knop, dezelfde lijstrij — zodat de app overal
hetzelfde aanvoelt en een latere designwijziging op één plek gebeurt.

## Waar staat wat

- **Kleuren, radii, schaduwen, lettertypes** → CSS-variabelen in `src/index.css`.
  Nooit een hexkleur in een component; altijd `var(--naam)`.
- **Herbruikbare klassen** (`.kaart`, `.knop`, `.lijst`, `.rij`, `.badge`, …) →
  ook in `src/index.css`.
- **Herbruikbare componenten** (`Kaart`, `PaginaKop`, `Leeg`, `Bedrag`, `Stat`,
  `Kengetal`, `Balk`) → `src/ui/basis.tsx`.
- **`Herkomstregel`** (badge links, één zin ernaast) → `src/ui/Herkomstregel.tsx`.
- `src/ui/tokens.ts` is leeg en achterhaald; niet gebruiken.

## Basisregels uit het designsysteem

1. **Amber is richting en actie.** Nooit voor "goed nieuws" — daarvoor is
   mosgroen (`--positive`).
2. **Hoogstens één gevulde knop per scherm.** De rest is omlijnd
   (`knop-secundair`) of tekst (`knop-ghost`).
3. **Bedragen zijn neutraal**, behalve bij expliciete richting: inkomst groen,
   uitgave terracotta, saldo in dossiers.
4. **Randen zijn 1 px en zacht. Schaduwen alleen op zwevende dingen** (primaire
   knop, FAB, sheet, meldingsbalk). Gewone kaarten hebben géén schaduw.
5. **Cijfers altijd monospace en tabulair** (`.bedrag`, `.stat-waarde`), rechts
   uitgelijnd. (`.cijfer` stond hier ook, maar die klasse werd nergens gebruikt en
   is in ronde 77 weggehaald.)
6. **Koppen in Bricolage** (`.paginakop`, `.kaart-titel`), tekst in IBM Plex Sans.

## Klassen

### Structuur

| Klasse | Waarvoor |
| --- | --- |
| `stapel` | verticale kolom met 16 px tussenruimte tussen kaarten/blokken |
| `kaart` | het standaard inhoudsvlak (crème, 1 px rand, radius 24, padding 20) |
| `kaart-compact` | kleinere variant (radius 18, padding 12/14) |
| `kaart-kop`, `kaart-titel`, `kaart-bijschrift` | kop binnen een kaart |
| `paginakop`, `paginasub` | titel van een pagina |
| `label-caps` | klein hoofdletterlabel (11 px, letterspatie) |
| `scheiding` | dunne scheidingslijn (`<hr className="scheiding" />`) |

### Lijsten

| Klasse | Waarvoor |
| --- | --- |
| `lijst` | `<ul>`-container (rand + radius; binnen een kaart automatisch kaal) |
| `rij` | één regel: flex, 14/16 padding, dunne onderlijn, laatste zonder |
| `rij-midden` | tekstkolom die de rest opvult (titel + meta onder elkaar) |
| `rij-titel`, `rij-meta` | 15 px halfvet / 12 px grijs |
| `rij-acties` | knoppen rechts in de rij |
| `rij-teken` | vierkant initiaal/icoonvlakje links (34 px) |

### Knoppen

| Klasse | Waarvoor |
| --- | --- |
| `knop` | basis (altijd meegeven) |
| `knop knop-primair` | dé hoofdactie van het scherm (amber, met schaduw) |
| `knop knop-secundair` | gewone actie (omlijnd) |
| `knop knop-ghost` | tekstknop |
| `knop knop-klein` | compacte maat (14 px tekst; op een aanraakscherm 44 px raakgebied) |
| `knop knop-icoon` | vierkante 44 px icoonknop met rand (‹ › ⋯) |
| `knop knop-kaal` | icoonknop zonder rand, voor acties in een lijstrij (✎ ×) |
| `knop knop-gevaar` | er gaat iets BEWAARDS weg (terracotta); combineer met kaal/secundair |
| `knop knop-terzijde` | een knop die iets rechtzet naast een regel informatie — gewicht 500, niet rood (ronde 86) |
| `knoprij` | rij knoppen onder een formulier (flex, wrap, 10 px) |

### Formulieren

| Klasse | Waarvoor |
| --- | --- |
| `veldgroep` | label + veld onder elkaar (6 px) |
| `veldrij` | meerdere veldgroepen naast elkaar, wrapt op smal scherm |

`input`, `select` en `textarea` zijn globaal gestyled (radius 14, 1.5 px rand,
11/13 padding, amber focusring). Zet er dus geen eigen rand/padding meer op.
Labels krijgen `className="label-caps"`.

### Status en cijfers

| Klasse | Waarvoor |
| --- | --- |
| `chip`, `chip-actief` | filterchips (pill) |
| `badge` + `badge-ok` / `badge-open` / `badge-laat` / `badge-info` / `badge-neutraal` / `badge-mini` | statuslabels |
| `bedrag`, `bedrag-positief`, `bedrag-negatief`, `bedrag-groot` | bedragen |
| `stat`, `stat-waarde`, `stat-rij` | label-boven-cijfer-blokjes |
| `getal-bron`, `stat-met-bron` | de herkomstzin onder een cijfer; `Stat`/`Kengetal` zetten ze zelf via `bron` |
| `balk`, `balk-vulling` | voortgangsbalk (gebruik liefst `<Balk>`) |
| `leeg` | lege toestand (gebruik liefst `<Leeg>`) |
| `saldotegel` | donkere accenttegel met amberglow, max. één per scherm |

## Componenten uit `src/ui/basis.tsx`

```tsx
<Kaart titel={t('Budgetten')} bijschrift={t('voor juli')} actie={<button …/>}>…</Kaart>
<PaginaKop titel={t('Rekeningen')} bijschrift="…" actie={…} />
<Leeg>{t('Nog geen doelen.')}</Leeg>
<Bedrag centen={1250} richting="in" />        // 'in' | 'uit' | 'auto' | weglaten
<Bedrag centen={saldo} groot />
<Stat label={t('Netto')}>{formatEuro(x)}</Stat>
<Stat label={t('Nog te betalen')} bron={t('Alleen het openstaande kapitaal; interest zit er niet in.')}>
  {formatEuro(x)}
</Stat>
<Balk label={naam} fractie={0.62} nu={620} max={1000} kleur="var(--positive)" />
```

## Elk getal verantwoordt zich (ronde 69)

Een cijfer op het scherm hoort te zeggen **over welke periode het gaat** en **wat er
wel en niet in meegeteld is**. Dat gebeurt met de `bron`-prop van `Stat`/`Kengetal`
(één korte zin onder het cijfer, en bij een doorklikbaar cijfer ook achteraan de
`aria-label`), of met een `rij-meta`-regel onder een blok cijfers.

Drie regels:

1. **Een zin die niet klopt is erger dan geen zin.** Lees eerst de rekenkern; noem
   alleen wat je in de code ziet staan.
2. **Hang de zin aan dezelfde voorwaarde als het cijfer.** Staat er een streepje of
   nul, dan hoort er geen alinea onder over hoe het berekend zou zijn.
3. **Zeg niets wat een zin ernaast al zegt.** Twee zinnen die hetzelfde tellen,
   lezen als twee verschillende feiten.

## Herkomstregel: één badge, één zin

`BalansRegel`, `BufferRegel` en `VermogenRegel` hadden alle drie dezelfde acht regels
opmaak gekopieerd. Ze delen nu `src/ui/Herkomstregel.tsx`:

```tsx
<Herkomstregel badge={t('Overschot')} toon="ok" kaal data-balans="1">
  {t('Je houdt deze maand € 100,00 over.')}
</Herkomstregel>
```

`toon` is `'ok' | 'let-op' | 'info' | 'neutraal'` en kiest de badge-klasse; `kaal`
laat het kaartvlak weg voor gebruik binnen een groter blok.

## Subtabs: altijd `src/ui/Subtabs.tsx`

```tsx
<Subtabs
  naam="dossiers"
  label={t('Soort dossier')}
  actief={tab}
  onKies={setTab}
  tabs={[{ id: 'lening', teken: '📄', label: t('Leningen'), telling: leningen.length }]}
>
  …inhoud van de gekozen tab…
</Subtabs>
```

Heeft een pagina laden, gebruik dan dit component — bouw geen rij losse knoppen.
Het regelt de vier dingen die je met losse knoppen stil overslaat: hulpsoftware ziet
één groep met een gekozen tab (`role="tablist"` + `aria-selected`), de pijltjes lopen
tussen de tabs in plaats van erdoorheen te tabben (rollende tabindex), de inhoud
hangt aan de gekozen tab (`role="tabpanel"` + `aria-labelledby`), en de strook
**breekt af** in plaats van zijwaarts te schuiven.

Dat laatste is geen detail: sinds ronde 28 schuift er in de hele app niets meer
horizontaal weg. Een tabstrook waarvan de derde tab half buiten beeld hangt zou dat
opnieuw introduceren. Gemeten op 390 px: twee tabs op de eerste regel, de derde op
de tweede; vanaf ongeveer 1000 px staan ze samen op één regel.

`telling` is optioneel en verschijnt alleen als ze groter is dan nul — een lege lade
heeft geen cijfer nodig.

## Popups: altijd `src/ui/Dialoog.tsx`

```tsx
<Dialoog titel={t('Uitgave toevoegen')} open={open} onSluiten={() => setOpen(false)}>
  …velden…
</Dialoog>
```

Bouw nooit zelf een popup met `position: fixed`. `Dialoog` regelt de vijf dingen
die een los `div`-je niet doet: Escape sluit (ook vanuit een invoerveld), de
tab-focus blijft binnen de popup, de focus gaat bij het sluiten terug naar de knop
waarmee je ze opende, de pagina eronder scrollt niet mee, en hulpsoftware weet dat
de rest van het scherm even niet bestaat (`aria-modal` + een titel die aan de popup
hangt).

Bij het openen springt de focus naar het **eerste invoerveld** in de inhoud — niet
naar het kruisje in de kop (dan sluit Enter je popup meteen weer) en niet naar een
knop die vóór dat veld staat (dan moet je alsnog tabben voor je kan typen).

Vorm: op een breed scherm een gecentreerde kaart, op een telefoon een blad dat van
onderen komt en de volle breedte neemt. Alleen `.dialoog-inhoud` scrollt.

**Invoerformulieren horen in een venster, niet open op een pagina.** Toevoegen gaat
overal via `BoekingDialoog` (de ➕) of via een eigen `Dialoog`. Een formulier dat in
een venster moet kunnen hangen, krijgt de prop
`onOpgeslagen?: (opties: { blijfOpen: boolean }) => void`: zodra die meegegeven is,
verschijnt de knop "Opslaan + volgende" en weet het venster wanneer het zich mag
sluiten. Zo hoeft het venster niets over de invoerlogica te weten en bestaat er van
elk formulier precies één versie.

⚠ **Sinds ronde 98 volgt ook Budget → Vast deze regel** — dat was de laatste pagina met
een altijd-open formulier, en er stonden er zelfs twee onder elkaar. Wat je nu ziet is een
lijst met één knop erboven ("+ Een vaste last" / "+ Een vaste inkomst") die een venster
opent. **Een knop die zo'n venster opent, wist eerst een oude foutmelding** (`opslag.wis()`,
regel sinds ronde 68) — anders blijft een melding van een vorige poging achter het verse
venster staan.

⚠ **Zo'n venster heeft GEEN eigen "Annuleer"-knop.** Het kruisje en Escape zijn de weg naar
buiten, en die vragen met `bewaakInvoer` eerst of je je invoer mag weggooien. Een derde knop
met dezelfde uitwerking ernaast is de fout van ronde 84 (twee knoppen die hetzelfde doen).

⚠ **Een venster over een record houdt een ID vast, geen kopie** (ronde 76) — maar bij een
formulier waarin je TYPT hoort dat venster **niet vanzelf te sluiten** wanneer dat record
elders verdwijnt (ronde 98). De app haalt elke 45 seconden stil gegevens op; sluiten zou je
halve zin meenemen zonder één woord, en dat is de huisregel recht in het gezicht. Onthoud de
laatst bekende versie zolang het venster openstaat.

## Layout-invariant die je niet mag breken

**`min-width: 0` op elke rasterkolom staat BUITEN elke mediaquery**, bij de
rasterdefinitie zelf (`.raster-hoofd > *`, `.raster-twee > *`,
`.raster-lijst-formulier > *` in `index.css`).

Zonder die regel mag een grid-kolom niet smaller worden dan haar breedste inhoud
— een rij chips, een lange categorienaam — en loopt de pagina buiten het scherm.
De regel stond een tijd lang binnen `@media (min-width: 1024px)`, dus gold ze
alleen op desktop. Gevolg: de pagina Transacties was op een telefoon ruim
2.200 px breed en je moest zijwaarts scrollen om het formulier te zien.

**Dit soort fout kan de testsuite niet vangen.** jsdom rekent geen layout uit, dus
geen enkele component-test ziet dat een pagina te breed wordt. De enige manier om
het te controleren is de gebouwde app in een echte browser openen en per pagina
`document.documentElement.scrollWidth` vergelijken met de schermbreedte. Doe dat bij
elke wijziging aan de rasters of aan brede inhoud (chips, tabellen, lange namen),
op 390 px én op 1440 px.

## Staafgrafieken: drie regels uit ronde 72

**Een referentielijn met `position: absolute` ligt VÓÓR de staven, niet erachter.**
Een positioneerd element wordt na de gewone kinderen getekend, dus de stippellijn
van een gemiddelde komt bovenop de staven te liggen. Je ziet het niet meteen:
zolang de opkomstanimatie loopt heeft elke staaf een `transform` en dekt ze de lijn
wél af — en precies op het moment dat de laatste animatie eindigt, springt de lijn
naar voren over de hele grafiek. Geef de staafkolommen `position: relative` en
`z-index: 1`; dan klopt de volgorde ook onder `prefers-reduced-motion`, waar die
transform er nooit is.

**Boven de zes kolommen wordt een staaf geen knop meer.** `MaandGrafiek` maakt van
elke maandkolom een knop, en dat mag: zes kolommen halen op een telefoon ongeveer
46 px. Twaalf kolommen komen op ongeveer 23 px uit — de helft van de 44 px die deze
app zichzelf oplegt. Zet de doorklik dan in een uitklaplijst eronder, waar de rijen
die maat wél halen, en geef elke kolom een `role="img"` met een volledige
`aria-label` (**met het jaartal erin**, anders klinken twee vensters na elkaar
identiek).

**Twaalf maandnamen naast elkaar passen niet, en dat is nagemeten.** Op een telefoon
van 360 px is er ongeveer 20 px per kolom; "sep" vraagt er 21 en het Franse "sept."
29. Met `overflow: hidden` worden ze aan béíde kanten geklemd — je leest "eptembe" —
zonder beletselteken en zonder dat een test het kan zien. De oplossing die hier staat:
de AFKORTING overal (ook op een breed scherm, waar "september" bij 56 px per kolom
evenmin paste), op een smal scherm alleen om de drie maanden een naam, en
`overflow: visible` zodat die naam over haar naamloze buren mag steken. En denk aan
het PAPIER: `.alleen-smal`/`.alleen-breed` wisselen op 1024 px, en een A4 staand is
maar ~794 px breed, dus zonder een eigen `@media print`-regel krijg je op papier de
smalle versie terwijl daar ruimte zat is.

## Wat je niet doet

- Geen hexkleuren, geen `#fff`, geen `rgba(...)` behalve in `index.css`.
- Geen eigen kaart-look nabouwen met inline stijlen — gebruik `Kaart`.
- Geen zichtbare tekst, `aria-label` of veldlabel wijzigen **zonder de tests en de
  vertalingen mee te nemen** — die hangen eraan (`i18nDekking.test.ts` bewaakt beide
  richtingen, `woordenschat.test.ts` bewaakt de woordkeuze).
- Geen schaduw op gewone kaarten.

## Een veldlabel heet gewoon wat het veld is (ronde 88)

Een invoerveld heet **"Omschrijving"**, **"Bedrag (€)"**, **"Rekening"**, **"Categorie"** —
niet "Vaste omschrijving" of "Vast bedrag". Zet geen voorvoegsel voor een veldnaam om hem
van een gelijknamig veld elders te onderscheiden: dat levert geen Nederlands op ("een
rekening die vást is"?) en het werkt meestal niet, want het staat dan in álle exemplaren
van dat formulier.

Twee formulieren op één scherm houd je uit elkaar met een **naam op het `<form>`** — dat is
in HTML een landmark, en een schermlezer kondigt hem aan (ronde 83). Die naam is een plek of
een vraag, nooit een bevel: *"Nieuwe vaste last"*, niet *"Vaste last invullen"*.

⚠ Wat een landmark NIET oplost: stembediening kent er geen, en de veldenlijst van een
schermlezer somt de bedieningen op zonder hun landmark. Twee velden met dezelfde naam op één
scherm blijven daar dus twee velden met dezelfde naam.

⚠ **De beste oplossing is er geen tweede laten staan** (ronde 98). Drie rondes werkten om
deze botsing heen — 83 (het landmark), 88 (de labels weer normaal), 92 (een verduidelijking
achter élke veldnaam) — tot ronde 98 de oorzaak wegnam door het formulier in een venster te
zetten. Loop je hier tegenaan: vraag eerst of die twee formulieren wel tegelijk op het scherm
horen te staan.

`woordenschat.test.ts` bewaakt deze vier namen.

## `aria-…` op een eigen component doet niets (ronde 92)

Schrijf je `<MijnComponent aria-labelledby="…" />`, dan **compileert dat schoon en
komt het nergens terecht**. `npx tsc --noEmit` geeft nul fouten. Dat is een
gedocumenteerde uitzondering in TypeScript: JSX-attributen waarvan de naam geen
geldige JavaScript-naam is — alles met een koppelteken, dus élke `aria-*` en
`data-*` — worden op een eigen component niet gecontroleerd.

- **Geef de component een eigen prop in camelCase** (`labelledBy`), en zet die
  binnenin op het echte `<input>`, `<select>` of `<button>`. Dán controleert
  TypeScript hem wel.
- Een component die haar overige props doorgeeft (`{...rest}`, zoals `Kaart` in
  `ui/basis.tsx`) is de uitzondering — daar wérkt het.
- **Vertrouw een toegankelijke naam nooit op het oog.** Reken hem in een test uit
  zoals een schermlezer dat doet: de teksten van de elementen waar
  `aria-labelledby` naar wijst, in die volgorde aan elkaar. Alleen zo'n test vond
  dit.

`src/ariaOpComponent.test.ts` bewaakt het voor de hele broncode.

## Een veld dat op één scherm twee keer voorkomt (ronde 92)

Staan er twee exemplaren van hetzelfde formulier op één scherm, dan hebben hun velden
**allebei dezelfde naam**. (Het voorbeeld waar deze regel uit ontstond — Budget → Vast, met
de vaste inkomsten en de vaste lasten onder elkaar — bestaat sinds ronde 98 niet meer; wat
overblijft is de ➕-popup, die een formulier bovenop élk ander scherm kan leggen.) Een naam op het `<form>` (een
landmark, ronde 83) lost dat op voor wie doortabt, maar **niet** voor wie de app
met zijn stem bedient en niet voor wie de veldenlijst van zijn schermlezer opent.

Geef elk veld dan een `aria-labelledby` met **eerst** het bestaande `<label>` en
**daarna** een verborgen span (`.alleen-voorlezen`) die zegt waar het over gaat:
"Omschrijving van deze vaste last".

- **De zichtbare tekst blijft vooraan en aaneengesloten.** Dat is WCAG 2.5.3: wie
  "Omschrijving" zégt, moet het veld raken dat "Omschrijving" heet.
- **Het label blijft een echt `<label htmlFor>`.** Daardoor blijft een klik op het
  woord het veld focussen — en blijft `getByLabelText('Omschrijving')` in de tests
  werken, want die zoekt óók langs de `for`-koppeling. Nagemeten: het scheelde ruim
  vijftig aanroeppunten.
- **Nooit een `aria-label` die zichtbare tekst vervángt.** Op een bediening zónder
  zichtbaar label (de `<form>` zelf, een keuzelijst naast een getal) mag hij wél —
  maar geef zo'n bediening liever een `<label htmlFor>` met de klasse
  `.alleen-voorlezen`: dan blijft de koppeling tussen het woord en het veld bestaan,
  en steunt geen enkele test op een eigenaardigheid van Testing Library.

## Toevoegen staat bovenaan (ronde 36)

In een lange lijst waar je zowel bladert als iets bijmaakt, staat de knop om iets
toe te voegen **bovenaan**, niet onderaan. Anders moet je eerst langs alles
scrollen wat je níét zocht. Zo staan `+ categorie` en `+ subcategorie` in
`components/CategorieBoom.tsx`.

Twee regels horen daarbij:

- **Zeg wat er gebeurd is.** Verschijnt de nieuwe regel niet vlak bij de knop,
  toon dan op de plaats van de knop één regel `rij-meta` met `role="status"`
  ("… toegevoegd, onderaan de lijst."). Zonder die regel duw je op Toevoegen,
  sluit het veld, en zie je niets.
- **Een onherroepelijke actie blijft onderaan.** "Verwijderen" hoort niet het
  eerste te zijn wat je ziet, en al zeker niet pal naast de knop die je het
  vaakst gebruikt.

## Instellingen die je vaak nodig hebt, staan open

Een rij `chip`-schakelaars die bepaalt wat er op een pagina staat (zoals de
onderdelen van een dossier) zit **niet** achter een knop. Wat je niet ziet, ga je
niet gebruiken. Zet er een vraag boven als `label-caps` met een `id`, en verwijs
er vanuit `role="group"` naar met `aria-labelledby` — niet met een `aria-label`,
want dan staat dezelfde tekst twee keer.

### Dichtklappen mag, standaard dicht niet (ronde 90)

Deze regel is in ronde 90 op de proef gesteld en **is blijven staan**. De
chiprij van het Overzicht draagt zes schakelaars, en die is opgemeten in
Chromium: op een breedte van 360 px beslaat ze **269 px in vier rijen**,
tegenover 46 px dichtgeklapt — op de pagina waar je *landt*. Ik leverde ze
daarom eerst dicht op. **Timothy koos uitdrukkelijk voor open**: "kaarten staan
open op startpagina". Zo staat het nu, en zo blijft het tot hij iets anders zegt.

Wat je hieruit meeneemt:

- **Standaard dicht is geen ontwerpvrijheid.** Wil je een chiprij toch dicht
  hebben, dan is dat een vraag aan Timothy, geen keuze die je zelf maakt — hoe
  overtuigend de meting ook is.
- **Kán je ze laten dichtklappen? Ja.** Gebruik dan een echte
  `<details>`/`<summary>` met `open`, dezelfde vorm als `UitlegBlok` — nooit een
  icoonknop en nooit eigen `useState`. De `<summary>` draagt de vráág in gewone
  woorden ("Welke kaarten wil je hier zien?"). Geen `aria-controls`: de browser
  doet het klappen zelf.
- **Meet eerst, kort dan de namen in.** De echte winst zit niet in het
  dichtklappen maar in de chipnamen. Op het Overzicht: met de zes volledige
  kaarttitels 189 px in vijf rijen, met twee namen ingekort 150 px in vier. Op de
  dossierpagina (ronde 93): met alle acht voluit 306 px in acht rijen — een blok
  van 459 px — en met vijf namen ingekort 189 px in vijf, blok 300 px.
- **Maar kort niet blind in.** Twee namen daar bleven met opzet voluit:
  "Verdeling per categorie" zou als "Per categorie" botsen met een gelijknamig
  kopje verderop dat die chip *niet* uitzet, en de naam draagt óók de zin
  "{onderdeel} staat uit, maar er staat wel iets in" — daar moet ze een
  zelfstandig naamwoord blijven.

⚠ Let op bij het testen: jsdom kent `<details>` wel, maar **verbergt de inhoud van
een dicht blok niet**. `getByRole` vindt de chips daar dus ook wanneer een echte
browser ze niet toont — een test kan dus groen staan op knoppen die niemand ziet.
Laat elke test die een chip aanraakt éérst nagaan dat het blok openstaat, en leg
in één test vast wat de beginstand is.


## Een uitzonderingslijst is geen kijklijst (ronde 94)

Wanneer een woord in de ene module iets anders betekent dan in de andere, is de
verleiding om een test te schrijven die de bestanden opsomt **waar ze kijkt**.
Doe dat niet. Zo'n lijst is vanaf haar eerste dag onvolledig, en ze wordt elke
ronde onvollediger: een nieuw bestand valt vanzelf buiten schot, en niets wijst
je daarop.

Zet de controle **omgekeerd**: alles is verdacht, en je somt op wat er met reden
buiten valt.

- Een **bestandslijst** voor modules waar het woord per definitie klopt
  (`DOSSIERMODULE` in `woordenschat.test.ts`), elk met de reden erbij.
- Een **tekstlijst** voor losse zinnen daarbuiten (`KOST_MET_REDEN`), ook elk met
  een reden — meestal "werkwoord".
- Een **taalregel** waar de taal het zelf oplost: staat er "gedeelde kost", dan
  benoemt het bijvoeglijk naamwoord het ding al.

En laat die lijsten zichzelf bewaken: een bestand dat het woord niet meer bevat,
of een reden voor een zin die nergens meer staat, hoort de test te laten falen.
Een dode vrijstelling bewaakt schijn.

⚠ **Lees de BRONBESTANDEN, niet alleen `t('…')`, en niet alleen `.tsx`.** De
verwijder-hulpmodules zetten hun zinnen in een `paren`-array en geven ze later aan
`t()` door; wie op `t('` zoekt, ziet die nooit. Neem élke enkelgequote tekenreeks
(commentaar overgeslagen) en houd over wat ook echt een sleutel in de
vertaaltabel is. En **maak de ontsnappingen ongedaan** (`’` → `’`): anders
valt élke tekst met een ontsnapping stilletjes buiten de controle, want ze wordt
dan niet als schermtekst herkend.

⚠ **En zet er een vangnet naast** dat afdwingt dat élke schermtekst met dat woord
ergens in een bronbestand terug te vinden is. Anders zou een sleutel die alleen
in `i18n.tsx` bestaat door niemand bekeken worden.

## Een negatieve assertie heeft een positieve nodig (ronde 94)

`expect(zin()).not.toMatch(/…/)` bewijst niets zolang niet vaststaat dát er een
zin is. Valt het hele blok weg, dan geeft de hulpfunctie een lege tekenreeks
terug, en een lege tekenreeks bevat de verboden woorden ook niet — de test staat
groen terwijl het scherm leeg is.

Zet er dus altijd eerst een regel naast die vaststelt dat het blok er is **en dat
er tekst in staat**. Het bestaan van het omhullende element alleen is niet genoeg:
in ronde 94 stond `[data-nog-nergens]` er wél, terwijl de `.rij-meta` erin de
zin droeg die verdwijnen kon.

Dezelfde regel geldt voor `queryByText(...)).toBeNull()` in een venster: de KOP
kan er staan terwijl de body niet gerenderd is. Anker op iets uit die body.

## Twee bedieningen op één scherm heten nooit hetzelfde (ronde 95)

Ronde 88 deed de voorvoegsels weg, ronde 92 gaf de dubbele velden een eigen naam, ronde 95
deed hetzelfde voor de dossierpagina. De vorm ligt daarmee vast:

- **Het `<form>` draagt een naam** (`aria-label`). Dat maakt er een landmark van; een
  schermlezer kondigt hem aan zodra de focus erin komt.
- **Elke bediening met een naamgenoot draagt een toevoeging**, via
  `aria-labelledby="<zichtbare tekst> <toevoeging>"` — zichtbare tekst VOORAAN en
  aaneengesloten (WCAG 2.5.3), toevoeging in een `<span class="alleen-voorlezen">`.
- **Een knop of chip wijst naar ZICHZELF** plus de toevoeging: `aria-labelledby="<eigen
  id> <toevoeging>"`. Zo blijft zijn eigen tekst vooraan.
- **Een gedeelde bouwsteen krijgt een camelCase prop** (`naamToevoeging`), nooit een
  `aria-*`-attribuut: dat compileert stil en doet niets (ronde 92).
- **Een groep keuzerondjes is een echte groep** (`role="group"` met de vraag als naam) —
  een kopje in een losse `<span>` erboven is voor hulpsoftware niet aanwezig.

## Wat een bewaking op namen moet toetsen (ronde 95)

Mijn eerste versie van die bewaking was op drie manieren tegelijk te smal, en elke keer
zag ze het zelf niet:

1. **Tel élke bediening.** `input, select, textarea, button, [role="group"]` — knoppen en
   groepen dragen ook een naam.
2. **Toets de BEGINSTAND**, niet de toestand die het beste uitkomt. Een formulier dat van
   soort wisselt, toont in elke stand andere velden; de stand die je overslaat is precies
   de stand waarin de fout staat.
3. **"Geen dubbele namen" is niet genoeg.** Met één toevoeging heten twee bedieningen al
   verschillend. Zet er een tweede regel naast: draagt een naam ergens een naamgenoot, dan
   hoort ÉLK exemplaar ervan een toevoeging te dragen — en binnen een formulier die van
   dát formulier.

⚠ **Reken een toegankelijke naam nooit zelf na.** Gebruik `dom-accessibility-api`,
dezelfde bibliotheek die Testing Library gebruikt. Een zelfgebouwde versie las bij een
omhullend `<label>` gewoon `textContent` en plakte de `<option>`-teksten van een genest
`<select>` erbij — twee bedieningen die identiek heten, kregen zo verschillende
tekenreeksen en glipten erlangs.

⚠ **`expect(tagName).toBe('LABEL')` bewijst niet dat een klik het veld focust.** Haal
`htmlFor` weg en die regel blijft groen; `getByLabelText` óók, want Testing Library matcht
bij een `aria-labelledby` met meerdere verwijzingen élke verwijzing apart. Wil je die
belofte waarmaken, klik dan écht en kijk `document.activeElement` na.

⚠ **En wat `.alleen-voorlezen` DOET, hoort in `index.css.test.ts`.** Zet iemand die regel
om naar `display: none`, dan staat het element niet meer in de toegankelijkheidsboom en
halveert élke naam die ernaar wijst — terwijl elke componenttest groen blijft, want jsdom
rekent geen CSS uit.

## Een getal telt wat het woord ernaast zegt (ronde 96)

Voor je een aantal op het scherm zet, kijk je na WAT de uitdrukking erachter werkelijk
telt. Vier verwarringen zijn in dit project echt gebeurd:

- **categorieën tegenover boekingen** — `CategorieUitgave[]` is één ingang per categorie,
  niet per uitgave. "Bekijk alle 12 uitgaven" ging over twaalf categorieën;
- **boekingen tegenover overboekingen en waarderingen** — die drie zijn in deze app
  verschillende dingen, met hun eigen lijsten. Drie zinnen telden ze bij elkaar op en
  noemden het geheel "boekingen";
- **boekingen tegenover betalingen** — de fiscale post "onderhoudsuitkeringen" leest uit
  de Dossiers-module, niet uit je transacties;
- **overlappende groepjes** — "staat in een ander dossier" was in de code altijd óók
  "staat er al en is ongewijzigd". Twee zinnen onder elkaar lezen als groepen die elkaar
  uitsluiten; is dat niet zo, dan telt hetzelfde ding twee keer.

⚠ **Loopt de vertaling uiteen, dan is dat een aanwijzing.** Het Engels zei
`expense categories` waar het Nederlands "uitgaven" zei. Wie zo'n verschil ziet, heeft
niet een vertaalfout gevonden maar een tekst die twee dingen tegelijk beweert.

⚠ **Zit de indeling in een component, haal ze eruit.** `groepeerVergelijkingen()` in
`utils/uitwisseling.ts` is de vorm: een zuivere functie, beproefd op een verzonnen lijst.
In de kaart zelf was diezelfde regel alleen te toetsen met een half ingelezen bestand — en
dus in de praktijk niet.
