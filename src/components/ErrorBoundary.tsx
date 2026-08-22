import { Component, type ErrorInfo, type ReactNode } from 'react'
import { meldFout } from '../sentry'
import { useT, vertaal } from '../i18n'
import { opmaaktaal } from '../utils/opmaaktaal'

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
  // ⚠ RONDE 66, slotronde — DIT SCHERM MOET OOK ZONDER PROVIDER VERTALEN. De
  // buitenste ErrorBoundary in main.tsx staat met opzet buiten TaalProvider: valt
  // die provider zélf om, dan moet er nog iets zijn dat het opvangt. Daar viel dit
  // scherm terug op de standaardcontext, en las een Franstalige juist bij de
  // zwaarste crash Nederlands — zonder dat een test dat kon zien, want elke test
  // wikkelt haar boom wél in een provider.
  //
  // Staat er wél een provider boven, dan gebruiken we die: alleen zo verandert dit
  // scherm mee wanneer je tijdens dezelfde sessie van taal wisselt. Zo niet, dan is
  // `opmaaktaal()` de bewaarde keuze van de gebruiker.
  const context = useT()
  const t = context.heeftProvider
    ? context.t
    : (sleutel: string, params?: Record<string, string | number>) => vertaal(opmaaktaal(), sleutel, params)
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
          ? // ⚠ RONDE 66 — SLOTRONDE. `naam` ging hier RAUW naar binnen. De zin eromheen
            // werd keurig vertaald, maar het onderdeel erin bleef in elke taal Nederlands:
            // een Franstalige las "Er ging iets mis in Instellingen" met de rest in het
            // Frans. Dat woord is schermtekst en hoort dus ook door t() te gaan; staat er
            // geen vertaling, dan valt het vanzelf terug op het Nederlands — precies zoals
            // het nu al deed.
            t('Er ging iets mis in {naam}, maar je gegevens zijn veilig. De rest van de app blijft gewoon werken.', {
              naam: t(naam),
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
