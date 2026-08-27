/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

/* ⚠ RONDE 100 — DE TESTS DRAAIEN IN BELGISCHE TIJD.
   De bouwmachine van GitHub Actions staat op UTC, en daar valt het verschil tussen "de
   wereldtijd" en "de kalender hier" volledig weg. Gevolg: een fout van het type
   `new Date(x).toISOString()` — die 's nachts een dag te vroeg toont — is op die machine
   ONZICHTBAAR. Precies zo'n fout stond deze ronde in de melding over geweigerde regels,
   en geen enkele test zag hem.

   Hier en niet in `test.env`: Node leest de tijdzone één keer bij het starten van een
   proces. Deze regel draait vóór vitest zijn werkprocessen opstart, en die erven de
   instelling. Europe/Brussels is bovendien gewoon de tijdzone van de gebruiker, dus de
   tests rekenen met dezelfde klok als de app in het echt.

   ⚠ DIT GELDT OOK VOOR DE BOUW, niet alleen voor de tests — deze regel staat op
   moduleniveau. Nagemeten: twee volledige builds, één onder Europe/Brussels en één onder
   een tijdzone van +14, zijn byte-voor-byte identiek (alle 99 bestanden, `sw.js` en
   `versie.json` inbegrepen). `git log -1 --format=%cI` draagt zijn eigen tijdzone in de
   commit, dus ook de bouwdatum uit ronde 99 beweegt niet mee.

   ⚠ `??` en niet hard: zet je zelf `TZ=` vóór de opdracht, dan wint die. Zo blijft een
   ronde met `faketime` of met een andere tijdzone mogelijk. Prijs daarvan: onder `TZ=UTC`
   vallen twee tests van ronde 100 om, want die controleren juist dat een tijdstip van
   23:30 wereldtijd hier de dag erná is. Dat is een luide, begrijpelijke uitkomst — geen
   stille. */
process.env.TZ = process.env.TZ ?? 'Europe/Brussels'

// base: './' zorgt dat de app werkt op GitHub Pages, ongeacht de repo-naam.
// ⚠ RONDE 99 — WELKE VERSIE DRAAI JE? EEN KLEIN BESTAND, GEEN `define`, EN GEEN KLOK.
//
// Instellingen toont een kaart "Deze versie". Waarom die er hoort: Timothy zag na een
// publicatie nog de oude app en had geen enkele manier om na te kijken wélke versie hij
// draaide.
//
// ⚠ EERST STOND HIER EEN `define` MET `new Date()`, EN DAT WAS EEN ECHTE FOUT
// (doorlichting ronde 99). Een `define` vervangt de naam letterlijk in de code, dus de
// tijd belandde in het JS-brok. Gemeten met twee builds van BYTE-IDENTIEKE broncode: élk
// bestand kreeg een andere naam, tot en met `jspdf.es.min-*.js`. Dat is precies het brok
// van 390 kB waarvoor ronde 56 deze hele veiligheidsketting gebouwd is: wie de app open
// had staan, verloor het voor niets — óók bij een CI-run die je opnieuw start op dezelfde
// commit. Een versieregel mag geen publicatie duurder maken dan ze is.
//
// ⚠ EN DE KLOK IS ER OOK UIT, om dezelfde soort reden. Met `new Date()` verschilt
// `versie.json` bij élke build, dus verschilt de service worker, dus zegt de app "er is
// een nieuwe versie" na een CI-run die niets veranderde. Dat is een vals alarm, en een
// balk die vals alarm geeft, leer je negeren.
//
// Nu komt de datum uit de laatste COMMIT. Dezelfde commit geeft dezelfde bytes: twee
// builds van dezelfde broncode zijn identiek, tot en met `sw.js`. En het antwoord is
// zinvoller dan een bouwtijd — het is de versie waar je naar kan wijzen in je
// geschiedenis.
//
// ⚠ Geen git, geen bestand, geen kaart. Liever niets dan een verzonnen datum.
// ⚠ `versie.json` staat ook in `workbox.globPatterns` hieronder, en dat MOET: anders leest
// de app de versie die op de SERVER staat in plaats van die ze zelf draait.
function commitDatum(): string | null {
  try {
    const uit = execSync('git log -1 --format=%cI', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
    const kaal = uit.trim()
    return /^\d{4}-\d{2}-\d{2}T/.test(kaal) ? kaal : null
  } catch {
    return null
  }
}

function versiebestand() {
  return {
    name: 'kompal-versiebestand',
    apply: 'build' as const,
    generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
      const datum = commitDatum()
      if (datum === null) return
      this.emitFile({ type: 'asset', fileName: 'versie.json', source: JSON.stringify({ gebouwd: datum }) })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    versiebestand(),
    // Maakt de app installeerbaar (PWA) en werkt offline: een service worker
    // (via Workbox) cachet de volledige app-shell en speelt hem terug wanneer je
    // offline bent. 'autoUpdate' haalt een nieuwe versie stil binnen bij de
    // volgende start. De data zelf blijft in IndexedDB (los van deze cache).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kompal',
        short_name: 'Kompal',
        description: 'Kompal — je financieel kompas: budgetten, dossiers en afrekeningen. Lokaal-eerst.',
        lang: 'nl',
        theme_color: '#171C23',
        background_color: '#EDE6DA',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Snelkoppelingen op het beginscherm (ronde 59).
        //
        // Houd je het pictogram van Kompal ingedrukt, dan verschijnen deze drie.
        // De eerste is de reden dat ze bestaan: de kernhandeling van deze app is
        // "een bon inboeken", en dat kostte tot nu toe drie tikken vanaf het
        // beginscherm (app openen, wachten tot ze geladen is, op ➕ tikken). Nu is
        // het er één, en je landt meteen in het formulier.
        //
        // ⚠ Ze werken alleen omdat de app sinds deze ronde een ADRES per pagina
        // heeft (zie `utils/route.ts`). Zonder dat is er niets om naar te wijzen.
        //
        // ⚠ En ze staan hier in het NEDERLANDS, in alle talen. Een manifest wordt
        // door het besturingssysteem gelezen op het moment dat je de app
        // installeert, niet door de app zelf; er is geen `t()` die hier bij kan.
        // Meertalige snelkoppelingen zouden een tweede manifest per taal vragen.
        shortcuts: [
          {
            name: 'Transactie toevoegen',
            short_name: 'Toevoegen',
            description: 'Meteen een uitgave of inkomst inboeken',
            url: './#/transacties/nieuw',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Dossiers',
            short_name: 'Dossiers',
            description: 'Gedeelde kosten, leningen en garanties',
            url: './#/dossiers',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Rekeninguittreksel inlezen',
            short_name: 'Inlezen',
            description: 'Een CSV-bestand van je bank inlezen',
            url: './#/importeren',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // ⚠ `json` staat erbij sinds ronde 99, en dat is geen detail. `versie.json` MOET
        // meegecachet worden: anders leest Instellingen de versie die op de SERVER staat
        // in plaats van de versie die je op dit moment draait — en dan zegt de kaart
        // "gebouwd op <vandaag>" terwijl je scherm nog de app van gisteren toont. Precies
        // het misverstand dat deze ronde moest wegnemen.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Ruim genoeg voor de grootste chunk (jspdf ~390KB) en de hoofdbundel.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // ⚠ Nodig sinds ronde 77, en alleen voor `src/index.css.test.ts`. Vitest zet
    // standaard élke CSS-import om in een lege string — ook `import css from
    // './index.css?raw'`. Een test die het opmaakbestand naleest, kreeg dus nul
    // tekens en slaagde stil op niets. Met `include` gaat het uitsluitend om dit ene
    // bestand; alle andere CSS blijft weggelaten, zodat de reeks niet trager wordt.
    css: { include: [/\/src\/index\.css/] },
  },
})
