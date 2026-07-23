import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// Een error boundary vangt een crash in één onderdeel op, zodat niet de héle
// app onderuitgaat (het probleem van vroeger). De gebruiker ziet een nette
// melding; de data blijft veilig. In Fase 4 sturen we de fout hier ook door
// naar crash-rapportage (Sentry).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Onverwachte fout opgevangen door ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            maxWidth: 480,
            margin: '2rem auto',
            padding: '1rem',
            border: '1px solid #f5c6cb',
            borderRadius: 8,
            background: '#fff5f5',
          }}
        >
          <h2>Er ging iets mis</h2>
          <p>
            De app liep tegen een onverwachte fout aan, maar je gegevens zijn veilig. Herlaad de
            pagina om verder te gaan.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
