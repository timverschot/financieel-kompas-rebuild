import { Component, type ErrorInfo, type ReactNode } from 'react'
import { meldFout } from '../sentry'

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
    // Meld de fout aan crash-rapportage (no-op zolang er geen Sentry-DSN is ingesteld).
    meldFout(error, { sectie: this.props.naam ?? '(root)', componentStack: info.componentStack })
  }

  private herstel = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="kaart kaart-compact"
          style={{
            background: 'var(--negative-soft)',
            borderColor: 'var(--negative)',
            color: 'var(--text)',
            alignItems: 'flex-start',
          }}
        >
          <p style={{ margin: 0 }}>
            Er ging iets mis{this.props.naam ? ` in ${this.props.naam}` : ''}, maar je gegevens zijn
            veilig. De rest van de app blijft gewoon werken.
          </p>
          <button type="button" className="knop knop-secundair knop-klein" onClick={this.herstel}>
            Probeer opnieuw
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
