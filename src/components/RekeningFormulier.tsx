import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { REKENING_TYPES, type Rekening, type RekeningType } from '../data/schema'
import { nieuwId } from '../data/sync/id'
import { invoerNaarCenten, centenNaarInvoer } from '../utils/format'
import { useT } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

// Weergavenaam per type (Nederlandse sleutel; via t() vertaald bij weergave). De
// opgeslagen waarde blijft altijd de taal-onafhankelijke sleutel ('betaal', ...).
export const REKENING_TYPE_LABEL: Record<RekeningType, string> = {
  betaal: 'Betaalrekening',
  spaar: 'Spaarrekening',
  termijn: 'Termijnrekening',
  effecten: 'Effectenrekening',
  cash: 'Cash',
}

// Formulier om een rekening aan te maken of te bewerken: naam, beginsaldo, type,
// rekeningnummer (IBAN) en een vrije rubriek.
export function RekeningFormulier({
  onOpslaan,
  onAnnuleer,
  bewerken,
}: {
  onOpslaan: (r: Rekening) => Promise<void> | void
  onAnnuleer?: () => void
  bewerken?: Rekening | null
}) {
  const { t } = useT()
  const [naam, setNaam] = useState('')
  const [beginsaldo, setBeginsaldo] = useState('')
  const [type, setType] = useState<RekeningType>('betaal')
  const [rekeningnummer, setRekeningnummer] = useState('')
  const [rubriek, setRubriek] = useState('')
  const geldig = naam.trim().length > 0

  useEffect(() => {
    if (bewerken) {
      setNaam(bewerken.naam)
      setBeginsaldo(centenNaarInvoer(bewerken.beginsaldo))
      setType(bewerken.type ?? 'betaal')
      setRekeningnummer(bewerken.rekeningnummer ?? '')
      setRubriek(bewerken.rubriek ?? '')
    } else {
      setNaam('')
      setBeginsaldo('')
      setType('betaal')
      setRekeningnummer('')
      setRubriek('')
    }
  }, [bewerken])

  async function verzend(e: FormEvent) {
    e.preventDefault()
    if (!geldig) return
    const centen = invoerNaarCenten(beginsaldo)
    const nr = rekeningnummer.trim()
    const rub = rubriek.trim()
    await onOpslaan({
      id: bewerken ? bewerken.id : nieuwId(),
      naam: naam.trim(),
      beginsaldo: Number.isFinite(centen) ? centen : 0,
      type,
      ...(nr ? { rekeningnummer: nr } : {}),
      ...(rub ? { rubriek: rub } : {}),
      ...(bewerken?.gearchiveerd ? { gearchiveerd: true } : {}),
    })
  }

  return (
    <form onSubmit={verzend} style={{ marginTop: '0.75rem' }}>
      <div style={rij}>
        <label htmlFor="rekeningnaam">{t('Rekeningnaam')}</label>
        <input id="rekeningnaam" style={veld} value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="rekeningtype">{t('Type')}</label>
        <select id="rekeningtype" style={veld} value={type} onChange={(e) => setType(e.target.value as RekeningType)}>
          {REKENING_TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {t(REKENING_TYPE_LABEL[tp])}
            </option>
          ))}
        </select>
      </div>
      <div style={rij}>
        <label htmlFor="beginsaldo">{t('Beginsaldo (€)')}</label>
        <input
          id="beginsaldo"
          style={veld}
          inputMode="decimal"
          placeholder="0,00"
          value={beginsaldo}
          onChange={(e) => setBeginsaldo(e.target.value)}
        />
      </div>
      <div style={rij}>
        <label htmlFor="rekeningnummer">{t('Rekeningnummer (IBAN)')}</label>
        <input
          id="rekeningnummer"
          style={veld}
          placeholder={t('BE.. (optioneel)')}
          value={rekeningnummer}
          onChange={(e) => setRekeningnummer(e.target.value)}
        />
      </div>
      <div style={rij}>
        <label htmlFor="rubriek">{t('Rubriek')}</label>
        <input
          id="rubriek"
          style={veld}
          placeholder={t('optionele groepsnaam')}
          value={rubriek}
          onChange={(e) => setRubriek(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={!geldig}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: geldig ? '#eef2f7' : '#f2f2f2',
          cursor: geldig ? 'pointer' : 'not-allowed',
        }}
      >
        {bewerken ? t('Rekening wijzigen') : t('Rekening toevoegen')}
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
