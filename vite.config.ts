/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' zorgt dat de app werkt op GitHub Pages, ongeacht de repo-naam.
export default defineConfig({
  base: './',
  plugins: [
    react(),
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
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
  },
})
