import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  // Optionele naam van het onderdeel (bv. "Dossiers"), voor een duidelijker melding.
  naam?: string
}
type State = { hasError: boolean }

// Een error boundary vangt een crash in één onderdeel op, zodat niet de héle
// app onderuitgaat (het probleem van vroeger). Elk belangrijk onderdeel krijgt er
// een, zodat een fout in bv. de grafieken de dossiers niet meesleurt. De gebruiker
// ziet een nette melding met een herstelknop; de data blijft veilig. In Ronde 4
// sturen we de fout hier ook door naar crash-rapportage (Sentry).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const waar = this.props.naam ? ` (${this.props.naam})` : ''
    console.error('Onverwachte fout opgevangen door ErrorBoundary' + waar + ':', error, info)
  }

  private herstel = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            margin: '1rem 0',
            padding: '0.75rem 1rem',
            border: '1px solid #f5c6cb',
            borderRadius: 8,
            background: '#fff5f5',
          }}
        >
          <p style={{ margin: '0 0 0.5rem' }}>
            Er ging iets mis{this.props.naam ? ` in ${this.props.naam}` : ''}, maar je gegevens zijn
            veilig. De rest van de app blijft gewoon werken.
          </p>
          <button
            onClick={this.herstel}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 8,
              border: '1px solid #ccc',
              background: '#f7f7f7',
              cursor: 'pointer',
            }}
          >
            Probeer opnieuw
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
