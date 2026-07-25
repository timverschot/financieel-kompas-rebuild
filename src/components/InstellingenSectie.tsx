import type { CSSProperties } from 'react'
import type { Kind } from '../data/schema'
import { KinderenSectie } from './KinderenSectie'
import { Kaart, PaginaKop } from '../ui/basis'
import { useT, TALEN, type Taal } from '../i18n'
import { useThema, THEMAKEUZES } from '../thema'

// Keuzelijsten blijven smal: ze staan alleen, zonder zichtbaar label ernaast.
const keuzelijst: CSSProperties = { maxWidth: 260, alignSelf: 'flex-start' }
// Statusregeltje onder een knop (laatste synchronisatie, back-upmelding).
const statusRegel: CSSProperties = { margin: 0, fontSize: 13, color: 'var(--text-muted)' }

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
  onKindToevoegen: (naam: string) => void
  onKindWijzigen: (id: string, naam: string) => void
  onKindVerwijderen: (id: string) => void
}) {
  const { t } = useT()
  const { keuze, zetKeuze } = useThema()

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
    </div>
  )
}
