import type { CSSProperties } from 'react'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'
import { dagJaar } from '../utils/datum'

// Klein grijs regeltje onder de knoppen: de status van de laatste poging.
const statusRegel: CSSProperties = { margin: 0, fontSize: 'var(--tekst-s)', color: 'var(--text-muted)' }

/**
 * De koppeling met je eigen Google Drive, als losse kaart (ronde 63).
 *
 * Waarom afgesplitst uit `InstellingenSectie`: ze staat sinds deze ronde óók in de
 * opstelling, bij het blok "Veilig bewaren". Twee keer dezelfde knop bouwen zou
 * betekenen dat er ooit twee schermen zijn die iets anders zeggen over dezelfde
 * verbinding — precies wat de opstelling zich verbiedt: ze dirigeert, ze
 * dupliceert niet.
 *
 * ⚠ De kaart toont de DAG VAN DE LAATSTE GESLAAGDE RONDE en niet "verbonden, dus
 * het komt goed" (nakijkronde ronde 63). Verbonden zijn is geen bewijs: het token
 * leeft ongeveer een uur en wordt zonder venster niet altijd vernieuwd, en een map
 * die je in Drive hernoemt laat de schakelaar gewoon op "verbonden" staan. De
 * eerste versie van deze kaart beweerde "elke wijziging gaat vanzelf naar je eigen
 * Drive — dat is meteen je back-up", en dat sprak het belletje van dezelfde ronde
 * tegen: dat zei op hetzelfde moment dat er al negentig dagen niets vertrokken was.
 */
export function DriveKaart({
  verbonden,
  bezig,
  laatsteSyncOp,
  onVerbind,
  onSynchroniseer,
}: {
  verbonden: boolean
  bezig: boolean
  /** De dag van de laatste GESLAAGDE synchronisatie; ontbreekt wanneer er nog geen was. */
  laatsteSyncOp?: string
  onVerbind: () => void
  onSynchroniseer: () => void
}) {
  const { t } = useT()
  return (
    <Kaart
      titel={t('Synchronisatie (Google Drive)')}
      bijschrift={t(
        'Synchroniseer je gegevens veilig tussen je toestellen via je eigen Google Drive. Enkel een back-uplogboek; je data blijft lokaal-eerst.',
      )}
    >
      {/* ⚠ De verbinding EERST (tweede nakijkronde ronde 63). Stond de datum
          vooraan, dan was de regel "niet verbonden" onbereikbaar zodra je ooit
          gesynchroniseerd had: je las dan een datum uit het verleden zonder één
          woord over het feit dat er nu niets meer vertrekt. */}
      <p style={statusRegel}>
        {verbonden
          ? laatsteSyncOp
            ? t('Laatste synchronisatie: {datum}.', { datum: dagJaar(laatsteSyncOp) })
            : t('Verbonden, maar er ging nog niets naar Drive.')
          : laatsteSyncOp
            ? t('Niet verbonden. Laatste synchronisatie: {datum}.', { datum: dagJaar(laatsteSyncOp) })
            : t('Niet verbonden. Je gegevens staan alleen in deze browser, op dit toestel.')}
      </p>
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
    </Kaart>
  )
}
