# Referentie — oude app (V1)

`oude-app-v1.html` is een **exacte kopie** van de oude, nog live draaiende app
(V1): één enkel HTML-bestand met React via CDN, Tailwind via CDN en Google Drive
als opslag. Bewaard op 25 juli 2026 als naslagwerk.

Waarom hier: om later te kunnen terugkijken hoe V1 iets deed (bv. de
categorieboom, de Drive-sync met `mergeDatasets`, of `ovAmountsForTx` voor
split-tickets) terwijl we verder bouwen aan de herbouw (Kompal).

Belangrijk:
- Dit bestand hoort **niet** bij de herbouw. Het wordt niet gebouwd, niet getest
  en niet gepubliceerd — het staat bewust buiten `src/`.
- Niets aan de inhoud is gewijzigd; het is de originele broncode van V1.
- De regels die enkel voor de oude app gelden (geen `?.`/`??`, handgeschreven
  `createElement`, het oude Drive-merge-model met `deletedIds`-tombstones) gelden
  **niet** voor de herbouw.
