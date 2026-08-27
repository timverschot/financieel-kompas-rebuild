// De enige Node-handtekening die dit project gebruikt: `execSync` in `vite.config.ts`,
// om de datum van de laatste commit te lezen (ronde 99).
//
// ⚠ WAAROM GEEN `@types/node`. Dit is een browser-app; Node komt alleen voor in de
// bouwstap. Een pakket van meerdere megabytes toevoegen voor één functie zou de
// afhankelijkhedenlijst en de lockfile laten groeien voor niets — en die lijst is wat een
// volgende `npm ci` in CI moet installeren. Hier staat precies wat wij aanroepen, niets
// meer. Dezelfde aanpak als bij `dom-accessibility-api` in `src/vite-env.d.ts`.
declare module 'node:child_process' {
  export function execSync(
    commando: string,
    opties?: { encoding?: string; stdio?: readonly ('ignore' | 'pipe' | 'inherit')[] },
  ): string
}

// ⚠ RONDE 100 — `process.env.TZ` in `vite.config.ts`, om de tests in Belgische tijd te
// laten draaien. Ook hier alleen wat wij echt aanraken: de omgevingsvariabelen.
declare const process: { env: Record<string, string | undefined> }
