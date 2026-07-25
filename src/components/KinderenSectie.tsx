import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Kind } from '../data/schema'
import { Kaart, Leeg } from '../ui/basis'
import { useT } from '../i18n'

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
    <Kaart titel={t('Kinderen')} bijschrift={t('Stel je kinderen één keer in; je kan gedeelde kosten eraan koppelen.')}>
      {kinderen.length === 0 && <Leeg>{t('Nog geen kinderen ingesteld.')}</Leeg>}

      {kinderen.length > 0 && (
        <ul className="lijst">
          {kinderen.map((k) => (
            <li key={k.id} className="rij">
              {bewerkId === k.id ? (
                <>
                  <input
                    aria-label={t('Nieuwe naam voor {naam}', { naam: k.naam })}
                    style={{ flex: 1, minWidth: 0 }}
                    value={bewerkTekst}
                    onChange={(e) => setBewerkTekst(e.target.value)}
                  />
                  <span className="rij-acties">
                    <button type="button" className="knop knop-secundair knop-klein" onClick={bewaarHernoeming}>
                      {t('Bewaar')}
                    </button>
                    <button type="button" className="knop knop-kaal" onClick={() => setBewerkId(null)}>
                      ×
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span className="rij-midden rij-titel">{k.naam}</span>
                  <span className="rij-acties">
                    <button
                      type="button"
                      className="knop knop-kaal"
                      aria-label={t('Wijzig kind {naam}', { naam: k.naam })}
                      onClick={() => {
                        setBewerkId(k.id)
                        setBewerkTekst(k.naam)
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="knop knop-kaal knop-gevaar"
                      aria-label={t('Verwijder kind {naam}', { naam: k.naam })}
                      onClick={() => onVerwijderen(k.id)}
                    >
                      ×
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={voegToe} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          aria-label={t('Naam kind')}
          style={{ flex: 1, minWidth: 0 }}
          placeholder={t('Naam kind')}
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
        />
        <button type="submit" className="knop knop-secundair" disabled={!nieuw.trim()}>
          {t('Kind toevoegen')}
        </button>
      </form>
    </Kaart>
  )
}
