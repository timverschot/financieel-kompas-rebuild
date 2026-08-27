import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TaalProvider } from './i18n'
import { ThemaProvider } from './thema'
import { InstellingenProvider } from './instellingen'
import { startSentry } from './sentry'
import { startVersiewacht } from './utils/appVersie'

// Crash-rapportage starten vóór het renderen, zodat ook opstartfouten gemeld worden.
startSentry()

// ⚠ RONDE 99 — OOK DIT VÓÓR HET RENDEREN, en om precies dezelfde reden.
//
// `registerSW.js` registreert zich op `window.load` — dus ná de eerste render. Startte het
// wachten pas in het effect van `NieuweVersieBalk`, dan bestond de registratie op dat moment
// vaak nog niet en kwam de app nooit bij `registration.waiting`/`.installing`: er stond een
// nieuwe versie klaar en niets zei het.
//
// ⚠ WAT HIER EERST STOND EN NIET BEWEZEN IS: "bij een F5 kan de service worker het roer al
// overgenomen hebben vóór React iets getekend heeft". Dat is bij het doorlichten van ronde 99
// in een echte browser NIET reproduceerbaar gebleken (zie `utils/appVersie.ts`). De reden
// hierboven is wél nagemeten, en die volstaat.
// ⚠ EN MET EEN VANGNET EROMHEEN (doorlichting ronde 99). Deze regel staat BUITEN de
// ErrorBoundary — die bestaat pas na `createRoot`. Gooit er hier iets (in een sandboxed
// iframe of bij een opake origin gooit de getter `navigator.serviceWorker`), dan wordt
// `createRoot` nooit bereikt en krijg je een wit scherm in plaats van het foutscherm.
// Tot deze ronde draaide dezelfde code in het effect van de balk en ving de
// ErrorBoundary het op; die bescherming mag niet stil wegvallen.
try {
  startVersiewacht()
} catch {
  // Dan blijft de balk stil. De app zelf hoort daar niet op te sneuvelen.
}

// ⚠ Het vangnet staat BEWUST helemaal buitenom, dus ook buiten TaalProvider: valt
// die provider zélf om, dan moet er nog iets zijn dat het opvangt. Dat betekent wel
// dat het foutscherm hier geen vertaalcontext boven zich heeft — het haalt zijn taal
// daarom rechtstreeks uit `opmaaktaal()` in plaats van uit de context. Zie
// components/ErrorBoundary.tsx.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemaProvider>
        <TaalProvider>
          <InstellingenProvider>
            <App />
          </InstellingenProvider>
        </TaalProvider>
      </ThemaProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
