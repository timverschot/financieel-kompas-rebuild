import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TaalProvider } from './i18n'
import { ThemaProvider } from './thema'
import { InstellingenProvider } from './instellingen'
import { startSentry } from './sentry'

// Crash-rapportage starten vóór het renderen, zodat ook opstartfouten gemeld worden.
startSentry()

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
