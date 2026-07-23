# Financieel Kompas — nieuwe fundering

Dit is de herbouw van Financieel Kompas op een solide basis: een echte buildstap
(Vite), React met JSX, TypeScript, en automatische tests. De oude single-file app
blijft ongewijzigd werken tot de nieuwe versie alles kan.

## In klare taal: wat staat hier?

- **`src/`** — de eigenlijke app, opgesplitst in nette, kleine bestanden in plaats
  van één groot HTML-bestand.
- **`src/App.tsx`** — voorlopig één voorbeeldscherm (een mini-budgetoverzicht).
- **`src/components/ErrorBoundary.tsx`** — vangt een crash op zodat niet de hele
  app onderuitgaat.
- **`src/App.test.tsx`** — een echte, automatische test.
- **`package.json`** — de lijst met bouwstenen (React, TypeScript, ...).

## De commando's (voor later, wanneer Node op je pc staat)

| Commando | Wat het doet |
|----------|--------------|
| `npm install` | Haalt eenmalig de bouwstenen op. |
| `npm run dev` | Start de app lokaal om te bekijken/testen. |
| `npm test` | Draait alle tests. |
| `npm run build` | Maakt de publiceerbare versie (map `dist/`) voor GitHub Pages. |

De map `node_modules/` en `dist/` horen niet in versiebeheer — daar zorgt
`.gitignore` voor.

## Volgende stappen

- Deployment naar GitHub Pages instellen (automatisch bouwen).
- Fase 1: de data-laag (echte database in de browser + schema-validatie).
