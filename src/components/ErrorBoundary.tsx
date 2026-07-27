import { Component, type ErrorInfo, type ReactNode } from 'react'
import { meldFout } from '../sentry'
import { useT } from '../i18n'

/**
 * Het schermpje dat je ziet wanneer een onderdeel vastloopt.
 *
 * Bewust een APARTE component (ronde 35). De ErrorBoundary zelf moet een
 * class-component zijn — alleen die kan een crash opvangen — en in een class kan
 * je de vertaalhaak `useT()` niet gebruiken. Daardoor stond deze tekst als enige
 * in de hele app hardgecodeerd in het Nederlands, terwijl hij op 33 plaatsen
 * gebruikt wordt: een Franstalige gebruiker kreeg bij een crash Nederlands.
 */
function Foutscherm({ naam, onHerstel }: { naam?: string; onHerstel: () => void }) {
  const { t } = useT()
  return (
    <div
      role="alert"
      className="kaart kaart-compact"
      style={{
        background: 'var(--negative-soft)',
        borderColor: 'var(--negative)',
        color: 'var(--text)',
        alignItems: 'flex-start',
      }}
    >
      <p style={{ margin: 0 }}>
        {naam
          ? t('Er ging iets mis in {naam}, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.', {
              naam,
            })
          : t('Er ging iets mis, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.')}
      </p>
      <button type="button" className="knop knop-secundair knop-klein" onClick={onHerstel}>
        {t('Probeer opnieuw')}
      </button>
    </div>
  )
}

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
      return <Foutscherm naam={this.props.naam} onHerstel={this.herstel} />
    }
    return this.props.children
  }
}
