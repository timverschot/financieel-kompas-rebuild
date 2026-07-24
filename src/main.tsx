import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TaalProvider } from './i18n'
import { ThemaProvider } from './thema'
import { startSentry } from './sentry'

// Crash-rapportage starten vóór het renderen, zodat ook opstartfouten gemeld worden.
startSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemaProvider>
        <TaalProvider>
          <App />
        </TaalProvider>
      </ThemaProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
