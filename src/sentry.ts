import * as Sentry from '@sentry/react'
import type { Integration } from '@sentry/core'

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

/**
 * De onderdelen van Sentry die WEL mogen meedoen.
 *
 * ⚠ RONDE 68 — HIER STOND `integrations: []`, EN DAT DEED NIET WAT HET LEEK.
 *
 * Een lege lijst zet niets uit: Sentry telt de standaardonderdelen en jouw lijst bij
 * elkaar op (`[...standaard, ...jouw lijst]`), dus alle negen standaardonderdelen
 * stonden gewoon aan. Nagemeten door de lijst te laten uitprinten, niet afgeleid uit
 * de documentatie.
 *
 * Eén daarvan is een probleem. Het "kruimelspoor" legt bij ELKE klik vast waaróp je
 * klikte, en neemt daarbij het `aria-label` van de knop mee — dat staat vast in de
 * broncode van Sentry (`allowedAttrs`), los van hoe je het instelt. En die labels
 * dragen in deze app bedragen en namen: "Bewerk Colruyt — 14 aug 2026, € 43,20",
 * "Verwijder gezinslid …" met de naam van een kind erin. Dat spoor gaat mee met elk
 * crashrapport.
 *
 * Instellingen belooft: "een technisch foutrapport (welke fout, welke browser) —
 * nooit een bedrag of een naam". Die belofte hoort te kloppen, dus het spoor van
 * KLIKS en van CONSOLE-meldingen gaat uit. Wat blijft: welke pagina je open had
 * (adressen dragen in deze app bewust geen namen of bedragen — zie ronde 59) en welke
 * netwerkoproepen er liepen, want dat is precies wat een vastgelopen synchronisatie
 * verklaart.
 */
export function onderdelen(standaard: Integration[]): Integration[] {
  return [
    ...standaard.filter((i) => i.name !== 'Breadcrumbs'),
    Sentry.breadcrumbsIntegration({ dom: false, console: false }),
  ]
}

export function zeefKruimel<K extends { category?: string }>(kruimel: K): K | null {
  return kruimel.category?.startsWith('ui.') || kruimel.category === 'console' ? null : kruimel
}

/**
 * De instellingen waarmee Sentry start — apart, zodat een test ze kan nakijken.
 *
 * ⚠ Zonder dit was de BEDRADING ongetest: `onderdelen` en `zeefKruimel` waren elk
 * apart getoetst, maar niets bewees dat ze ook echt aan `Sentry.init` doorgegeven
 * worden. En `startSentry` doet niets in de ontwikkelmodus, dus die kan je niet
 * gewoon aanroepen om het te zien.
 */
export function sentryOpties() {
  return {
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    integrations: onderdelen,
    /**
     * Het tweede slot. Verandert Sentry ooit zijn standaardinstellingen, of komt er
     * een onderdeel bij dat óók kruimels maakt, dan houdt deze regel ze alsnog tegen:
     * alles wat over een klik of een consoleregel gaat, wordt weggegooid vóór het
     * verstuurd wordt.
     *
     * ⚠ Twee sloten en niet één, want dit is een belofte over de gegevens van iemand
     * anders — en die controleer je niet aan de hand van een versienummer.
     */
    beforeBreadcrumb: zeefKruimel,
  }
}

export function startSentry(): void {
  // Niet in de ontwikkelmodus (anders zit je eigen testwerk in de rapporten).
  if (!SENTRY_DSN || import.meta.env.DEV) return
  Sentry.init(sentryOpties())
}

// Meldt een opgevangen fout aan Sentry (no-op zolang er geen DSN is).
export function meldFout(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
