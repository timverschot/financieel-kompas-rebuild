import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Kind } from '../data/schema'
import { useT } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const miniKnop: CSSProperties = {
  border: '1px solid #ccc',
  background: '#f7f7f7',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.8rem',
  padding: '0.15rem 0.5rem',
}
const kop: CSSProperties = { fontSize: '1rem', marginBottom: '0.25rem' }

// Beheer van de globale lijst kinderen. Deze kinderen zijn herbruikbaar: je kan
// gedeelde kosten aan één of meer kinderen koppelen (zie het kostformulier).
export function KinderenSectie({
  kinderen,
  onToevoegen,
  onWijzigen,
  onVerwijderen,
}: {
  kinderen: Kind[]
  onToevoegen: (naam: string) => void
  onWijzigen: (id: string, naam: string) => void
  onVerwijderen: (id: string) => void
}) {
  const { t } = useT()
  const [nieuw, setNieuw] = useState('')
  const [bewerkId, setBewerkId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState('')

  function voegToe(e: FormEvent) {
    e.preventDefault()
    if (!nieuw.trim()) return
    onToevoegen(nieuw.trim())
    setNieuw('')
  }
  function bewaarHernoeming() {
    if (bewerkId && bewerkTekst.trim()) onWijzigen(bewerkId, bewerkTekst.trim())
    setBewerkId(null)
    setBewerkTekst('')
  }

  return (
    <section>
      <h2 style={kop}>{t('Kinderen')}</h2>
      <p style={{ color: '#888', marginTop: 0 }}>{t('Stel je kinderen één keer in; je kan gedeelde kosten eraan koppelen.')}</p>

      {kinderen.length === 0 && <p style={{ color: '#888' }}>{t('Nog geen kinderen ingesteld.')}</p>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {kinderen.map((k) => (
          <li key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0', borderBottom: '1px solid #f0f0f0' }}>
            {bewerkId === k.id ? (
              <>
                <input aria-label={t('Nieuwe naam voor {naam}', { naam: k.naam })} style={{ ...veld, flex: 1, marginTop: 0 }} value={bewerkTekst} onChange={(e) => setBewerkTekst(e.target.value)} />
                <button type="button" style={miniKnop} onClick={bewaarHernoeming}>{t('Bewaar')}</button>
                <button type="button" style={miniKnop} onClick={() => setBewerkId(null)}>×</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1 }}>{k.naam}</span>
                <button type="button" aria-label={t('Wijzig kind {naam}', { naam: k.naam })} onClick={() => { setBewerkId(k.id); setBewerkTekst(k.naam) }} style={{ border: 'none', background: 'none', color: '#2c6cb0', cursor: 'pointer' }}>✎</button>
                <button type="button" aria-label={t('Verwijder kind {naam}', { naam: k.naam })} onClick={() => onVerwijderen(k.id)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={voegToe} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
        <input aria-label={t('Naam kind')} style={{ ...veld, flex: 1, marginTop: 0 }} placeholder={t('Naam kind')} value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
        <button
          type="submit"
          disabled={!nieuw.trim()}
          style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: nieuw.trim() ? '#eef2f7' : '#f2f2f2', cursor: nieuw.trim() ? 'pointer' : 'not-allowed' }}
        >
          {t('Kind toevoegen')}
        </button>
      </form>
    </section>
  )
}
