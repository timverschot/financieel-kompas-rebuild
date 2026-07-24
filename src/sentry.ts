import * as Sentry from '@sentry/react'

// Crash-rapportage via Sentry. Wat je moet weten:
//  - De DSN is een openbare, ALLEEN-SCHRIJVEN-sleutel: veilig om in de app te
//    zetten (ze staat sowieso in de gebouwde JavaScript van elke webapp).
//  - Sentry rapporteert enkel technische foutinfo (stapelsporen + wat context zoals
//    browser en URL) — NOOIT je financiële data. Die blijft lokaal in IndexedDB.
//  - Bewust minimaal: enkel crashes, geen performance-tracing, geen sessie-replay,
//    geen persoonlijke gegevens.
//  - Blijft de DSN leeg, dan doet Sentry helemaal niets. Zo kan de app ook zonder
//    account gewoon draaien; je vult de DSN hieronder in zodra je ze hebt.
const SENTRY_DSN = 'https://880230ac0c3c5eeb0928f43b4354d27a@o4511792170401792.ingest.de.sentry.io/4511792178200656'

export function startSentry(): void {
  // Niet in de ontwikkelmodus (anders zit je eigen testwerk in de rapporten).
  if (!SENTRY_DSN || import.meta.env.DEV) return
  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    integrations: [],
  })
}

// Meldt een opgevangen fout aan Sentry (no-op zolang er geen DSN is).
export function meldFout(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
