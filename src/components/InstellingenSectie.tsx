import { useState, type CSSProperties } from 'react'
import type { Gezinsrol, Kind } from '../data/schema'
import { KinderenSectie } from './KinderenSectie'
import { Kaart, PaginaKop } from '../ui/basis'
import { useT, TALEN, type Taal } from '../i18n'
import { useThema, THEMAKEUZES } from '../thema'

// Keuzelijsten blijven smal: ze staan alleen, zonder zichtbaar label ernaast.
const keuzelijst: CSSProperties = { maxWidth: 260, alignSelf: 'flex-start' }
// Klein grijs regeltje binnen een kaart: een status (laatste synchronisatie,
// back-upmelding) of een stukje uitleg. De kaart zorgt zelf voor de tussenruimte.
const statusRegel: CSSProperties = { margin: 0, fontSize: 13, color: 'var(--text-muted)' }

/** Wat `onBeginOpnieuw` teruggeeft: of de Drive-back-up mee opgeruimd raakte. */
export type BeginOpnieuwResultaat = { backupGewist: boolean; backupFout?: string }

// Het instellingen-scherm: taal, Google Drive-beheer, lokale back-up en het beheer
// van je kinderen — alles op één plek. Elk onderdeel staat in een eigen kaart.
export function InstellingenSectie({
  taal,
  zetTaal,
  verbonden,
  bezig,
  statusTekst,
  onVerbind,
  onSynchroniseer,
  backupTekst,
  onExporteer,
  onHerstel,
  kinderen,
  onKindToevoegen,
  onKindWijzigen,
  onKindVerwijderen,
  onBeginOpnieuw,
}: {
  taal: Taal
  zetTaal: (t: Taal) => void
  verbonden: boolean
  bezig: boolean
  statusTekst: string | null
  onVerbind: () => void
  onSynchroniseer: () => void
  backupTekst: string | null
  onExporteer: () => void
  onHerstel: (bestand: File) => void
  kinderen: Kind[]
  onKindToevoegen: (naam: string, rol?: Gezinsrol) => void
  onKindWijzigen: (lid: Kind) => void
  onKindVerwijderen: (id: string) => void
  /**
   * Wist alles. Geeft terug of de back-up mee opgeruimd raakte.
   * Optioneel: zolang het scherm de datalaag nog niet doorgeeft, blijft de
   * kaart "Begin opnieuw" verborgen in plaats van een knop te tonen die niets doet.
   */
  onBeginOpnieuw?: () => Promise<BeginOpnieuwResultaat> | BeginOpnieuwResultaat
}) {
  const { t } = useT()
  const { keuze, zetKeuze } = useThema()

  // "Begin opnieuw": de knop opent eerst een bevestiging waarin je een woord moet
  // typen. Zo kan je nooit met één misklik al je gegevens kwijtraken.
  const BEVESTIGWOORD = t('WISSEN')
  const [bevestigOpen, setBevestigOpen] = useState(false)
  const [getypt, setGetypt] = useState('')
  const [wisBezig, setWisBezig] = useState(false)
  const [wisMelding, setWisMelding] = useState<string | null>(null)
  const woordKlopt = getypt.trim().toUpperCase() === BEVESTIGWOORD.trim().toUpperCase()

  function openBevestiging() {
    setWisMelding(null)
    setGetypt('')
    setBevestigOpen(true)
  }

  function sluitBevestiging() {
    setBevestigOpen(false)
    setGetypt('')
  }

  async function wisAlles() {
    if (!onBeginOpnieuw || !woordKlopt || wisBezig) return
    setWisBezig(true)
    setWisMelding(null)
    try {
      const resultaat = await onBeginOpnieuw()
      if (resultaat.backupGewist) {
        setWisMelding(t('Alles is gewist. Je begint met een schone lei.'))
      } else if (verbonden) {
        setWisMelding(
          t(
            'Lokaal is alles gewist, maar de back-up kon niet opgeruimd worden. Verbind opnieuw en probeer het nog eens, anders komt je oude data bij de volgende synchronisatie terug.',
          ),
        )
      } else {
        setWisMelding(t('Alles is gewist op dit toestel.'))
      }
    } catch {
      setWisMelding(t('Wissen is mislukt. Er is niets gewist.'))
    } finally {
      setWisBezig(false)
      setBevestigOpen(false)
      setGetypt('')
    }
  }

  return (
    <div className="stapel">
      <PaginaKop titel={t('Instellingen')} />

      {/* Weergave (licht/donker) */}
      <Kaart
        titel={t('Weergave')}
        bijschrift={t('Kies licht of donker, of laat de app de voorkeur van je toestel volgen.')}
      >
        <select
          aria-label={t('Weergave')}
          value={keuze}
          onChange={(e) => zetKeuze(e.target.value as typeof keuze)}
          style={keuzelijst}
        >
          {THEMAKEUZES.map((k) => (
            <option key={k.waarde} value={k.waarde}>
              {t(k.label)}
            </option>
          ))}
        </select>
      </Kaart>

      {/* Taal */}
      <Kaart titel={t('Taal')}>
        <select aria-label={t('Taal')} value={taal} onChange={(e) => zetTaal(e.target.value as Taal)} style={keuzelijst}>
          {TALEN.map((tl) => (
            <option key={tl.waarde} value={tl.waarde}>
              {tl.label}
            </option>
          ))}
        </select>
      </Kaart>

      {/* Google Drive */}
      <Kaart
        titel={t('Synchronisatie (Google Drive)')}
        bijschrift={t(
          'Synchroniseer je gegevens veilig tussen je toestellen via je eigen Google Drive. Enkel een back-uplogboek; je data blijft lokaal-eerst.',
        )}
      >
        <div className="knoprij">
          {!verbonden ? (
            <button type="button" className="knop knop-secundair" onClick={onVerbind} disabled={bezig}>
              {bezig ? t('Bezig…') : t('Verbind met Google Drive')}
            </button>
          ) : (
            <button type="button" className="knop knop-secundair" onClick={onSynchroniseer} disabled={bezig}>
              {bezig ? t('Bezig…') : t('Synchroniseer nu')}
            </button>
          )}
        </div>
        {statusTekst && <p style={statusRegel}>{statusTekst}</p>}
      </Kaart>

      {/* Back-up & herstel */}
      <Kaart
        titel={t('Back-up & herstel')}
        bijschrift={t(
          'Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.',
        )}
      >
        <div className="knoprij">
          <button type="button" className="knop knop-secundair" onClick={onExporteer}>
            {t('Exporteer back-up')}
          </button>
          <label className="knop knop-secundair" style={{ cursor: 'pointer' }}>
            {t('Herstel uit back-up')}
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onHerstel(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {backupTekst && <p style={statusRegel}>{backupTekst}</p>}
      </Kaart>

      {/* Kinderen — KinderenSectie is zélf al een kaart, dus geen extra omhulsel. */}
      <KinderenSectie
        kinderen={kinderen}
        onToevoegen={onKindToevoegen}
        onWijzigen={onKindWijzigen}
        onVerwijderen={onKindVerwijderen}
      />

      {/* Begin opnieuw — helemaal onderaan, want het is de zwaarste actie. */}
      {onBeginOpnieuw && (
        <Kaart
          titel={t('Begin opnieuw')}
          bijschrift={t('Wist al je gegevens op dit toestel en begint met een schone lei.')}
        >
          {verbonden ? (
            <p style={statusRegel}>
              {t(
                'Ook de logbestanden in je Google Drive-back-up worden opgeruimd, anders komt alles bij de volgende synchronisatie gewoon terug. Ze gaan naar de prullenbak van Drive, dus je kan ze daar nog terughalen.',
              )}
            </p>
          ) : (
            <p style={statusRegel}>
              {t(
                'Er is nu geen Google Drive-back-up verbonden. Gebruik je de app op meerdere toestellen, doe dit dan ook daar — anders komt hun data bij een volgende synchronisatie terug.',
              )}
            </p>
          )}

          {!bevestigOpen ? (
            <div className="knoprij">
              <button type="button" className="knop knop-secundair knop-gevaar" onClick={openBevestiging}>
                {t('Begin opnieuw…')}
              </button>
            </div>
          ) : (
            <>
              <p style={statusRegel}>
                {t('Dit kan niet ongedaan gemaakt worden. Maak eerst een back-up als je je gegevens wil bewaren.')}
              </p>
              <div className="veldgroep">
                <label className="label-caps" htmlFor="begin-opnieuw-bevestig">
                  {t('Typ WISSEN om te bevestigen')}
                </label>
                <input
                  id="begin-opnieuw-bevestig"
                  type="text"
                  autoComplete="off"
                  value={getypt}
                  onChange={(e) => setGetypt(e.target.value)}
                />
              </div>
              <div className="knoprij">
                <button
                  type="button"
                  className="knop knop-secundair knop-gevaar"
                  onClick={wisAlles}
                  disabled={!woordKlopt || wisBezig}
                >
                  {wisBezig ? t('Bezig…') : t('Alles wissen')}
                </button>
                <button type="button" className="knop knop-ghost" onClick={sluitBevestiging} disabled={wisBezig}>
                  {t('Annuleer')}
                </button>
              </div>
            </>
          )}

          {wisMelding && (
            <p role="status" style={statusRegel}>
              {wisMelding}
            </p>
          )}
        </Kaart>
      )}
    </div>
  )
}
