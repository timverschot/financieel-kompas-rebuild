import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { GedeeldeKost } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'

const vandaag = () => new Date().toISOString().slice(0, 10)

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Formulier om een gedeelde kost toe te voegen of te bewerken.
export function GedeeldeKostFormulier({
  dossierId,
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  dossierId: string
  onOpslaan: (k: GedeeldeKost) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: GedeeldeKost | null
}) {
  const { t } = useT()
  const [omschrijving, setOmschrijving] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [datum, setDatum] = useState(vandaag())
  const [betaaldDoor, setBetaaldDoor] = useState<'jij' | 'partner'>('jij')

  useEffect(() => {
    if (bewerken) {
      setOmschrijving(bewerken.omschrijving)
      setBedrag(centenNaarInvoer(bewerken.bedrag))
      setDatum(bewerken.datum)
      setBetaaldDoor(bewerken.betaaldDoor)
    } else {
      setOmschrijving('')
      setBedrag('')
      setDatum(vandaag())
      setBetaaldDoor('jij')
    }
  }, [bewerken])

  const bedragCenten = invoerNaarCenten(bedrag)
  const geldig = omschrijving.trim().length > 0 && Number.isFinite(bedragCenten) && bedragCenten > 0

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      dossierId: bewerken ? bewerken.dossierId : dossierId,
      omschrijving: omschrijving.trim(),
      bedrag: bedragCenten,
      betaaldDoor,
      datum,
    })
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="kostomschrijving">{t('Kostomschrijving')}</label>
        <input id="kostomschrijving" style={veld} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="kostbedrag">{t('Kostbedrag (€)')}</label>
        <input id="kostbedrag" style={veld} inputMode="decimal" placeholder="0,00" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="kostdatum">{t('Datum')}</label>
        <input id="kostdatum" type="date" style={veld} value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <div style={rij}>
        <span style={{ marginRight: '0.75rem' }}>{t('Betaald door:')}</span>
        <label style={{ marginRight: '1rem' }}>
          <input type="radio" name="betaalddoor" checked={betaaldDoor === 'jij'} onChange={() => setBetaaldDoor('jij')} /> {t('Jij')}
        </label>
        <label>
          <input type="radio" name="betaalddoor" checked={betaaldDoor === 'partner'} onChange={() => setBetaaldDoor('partner')} /> {t('Partner')}
        </label>
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef7ee' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        {bewerken ? t('Kost wijzigen') : t('Kost toevoegen')}
      </button>
      {bewerken && onAnnuleer && (
        <button
          type="button"
          onClick={onAnnuleer}
          style={{ marginLeft: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
        >
          {t('Annuleer')}
        </button>
      )}
    </form>
  )
}
