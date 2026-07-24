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
