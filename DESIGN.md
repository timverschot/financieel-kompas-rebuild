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
  `Balk`) → `src/ui/basis.tsx`.
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
5. **Cijfers altijd monospace en tabulair** (`.bedrag`, `.cijfer`,
   `.stat-waarde`), rechts uitgelijnd.
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
| `knop knop-klein` | compacte maat (13 px) |
| `knop knop-icoon` | vierkante 34 px icoonknop met rand (‹ › ⋯) |
| `knop knop-kaal` | icoonknop zonder rand, voor acties in een lijstrij (✎ ×) |
| `knop knop-gevaar` | verwijderen (terracotta); combineer met kaal/secundair |
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
<Balk label={naam} fractie={0.62} nu={620} max={1000} kleur="var(--positive)" />
```

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

**Invoerformulieren horen in de popup, niet op een pagina.** Toevoegen gaat overal
via `BoekingDialoog` (de ➕). Een formulier dat óók in de popup moet kunnen hangen,
krijgt de prop `onOpgeslagen?: (opties: { blijfOpen: boolean }) => void`: zodra die
meegegeven is, verschijnt de knop "Opslaan + volgende" en weet de popup wanneer ze
zich mag sluiten. Zo hoeft de popup niets over de invoerlogica te weten en bestaat
er van elk formulier precies één versie.

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

## Wat je niet doet

- Geen hexkleuren, geen `#fff`, geen `rgba(...)` behalve in `index.css`.
- Geen eigen kaart-look nabouwen met inline stijlen — gebruik `Kaart`.
- Geen zichtbare tekst, `aria-label` of veldlabel wijzigen: de tests en de
  vertalingen hangen eraan.
- Geen schaduw op gewone kaarten.
