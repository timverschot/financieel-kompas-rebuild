import type { CSSProperties } from 'react'
import type { Kind } from '../data/schema'
import { KinderenSectie } from './KinderenSectie'
import { useT, TALEN, type Taal } from '../i18n'
import { useThema, THEMAKEUZES } from '../thema'

const knop: CSSProperties = {
  padding: '0.5rem 0.9rem',
  borderRadius: 8,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  cursor: 'pointer',
}
const blok: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '0.75rem',
  marginBottom: '0.9rem',
}
const subkop: CSSProperties = { fontSize: '0.95rem', margin: '0 0 0.4rem' }
const selectStijl: CSSProperties = {
  padding: '0.4rem',
  borderRadius: 6,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text)',
  minWidth: 160,
}

// Het instellingen-scherm: taal, Google Drive-beheer, lokale back-up en het beheer
// van je kinderen — alles op één plek.
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
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{t('Instellingen')}</h2>

      {/* Weergave (licht/donker) */}
      <div style={blok}>
        <h3 style={subkop}>{t('Weergave')}</h3>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
          {t('Kies licht of donker, of laat de app de voorkeur van je toestel volgen.')}
        </p>
        <select
          aria-label={t('Weergave')}
          value={keuze}
          onChange={(e) => zetKeuze(e.target.value as typeof keuze)}
          style={selectStijl}
        >
          {THEMAKEUZES.map((k) => (
            <option key={k.waarde} value={k.waarde}>{t(k.label)}</option>
          ))}
        </select>
      </div>

      {/* Taal */}
      <div style={blok}>
        <h3 style={subkop}>{t('Taal')}</h3>
        <select
          aria-label={t('Taal')}
          value={taal}
          onChange={(e) => zetTaal(e.target.value as Taal)}
          style={selectStijl}
        >
          {TALEN.map((tl) => (
            <option key={tl.waarde} value={tl.waarde}>{tl.label}</option>
          ))}
        </select>
      </div>

      {/* Google Drive */}
      <div style={blok}>
        <h3 style={subkop}>{t('Synchronisatie (Google Drive)')}</h3>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
          {t('Synchroniseer je gegevens veilig tussen je toestellen via je eigen Google Drive. Enkel een back-uplogboek; je data blijft lokaal-eerst.')}
        </p>
        {!verbonden ? (
          <button style={knop} onClick={onVerbind} disabled={bezig}>
            {bezig ? t('Bezig…') : t('Verbind met Google Drive')}
          </button>
        ) : (
          <button style={knop} onClick={onSynchroniseer} disabled={bezig}>
            {bezig ? t('Bezig…') : t('Synchroniseer nu')}
          </button>
        )}
        {statusTekst && <p style={{ color: 'var(--text-muted)', marginTop: '0.6rem', marginBottom: 0 }}>{statusTekst}</p>}
      </div>

      {/* Back-up & herstel */}
      <div style={blok}>
        <h3 style={subkop}>{t('Back-up & herstel')}</h3>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
          {t('Een los vangnet op je eigen toestel, onafhankelijk van Google Drive. Bewaar het bestand op een veilige plek; herstellen voegt enkel toe en overschrijft nooit.')}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={knop} onClick={onExporteer}>{t('Exporteer back-up')}</button>
          <label style={{ ...knop, display: 'inline-block' }}>
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
        {backupTekst && <p style={{ color: 'var(--text-muted)', marginTop: '0.6rem', marginBottom: 0 }}>{backupTekst}</p>}
      </div>

      {/* Kinderen */}
      <div style={blok}>
        <KinderenSectie
          kinderen={kinderen}
          onToevoegen={onKindToevoegen}
          onWijzigen={onKindWijzigen}
          onVerwijderen={onKindVerwijderen}
        />
      </div>
    </section>
  )
}
