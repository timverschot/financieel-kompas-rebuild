import { useState } from 'react'
import type { CSSProperties } from 'react'
import { indexeerBedrag } from '../utils/indexatie'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { useT } from '../i18n'

const veld: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.4rem',
  marginTop: 2,
  boxSizing: 'border-box',
}
const rij: CSSProperties = { marginBottom: '0.6rem' }

function getal(waarde: string): number {
  return Number.parseFloat(waarde.replace(',', '.'))
}

// Rekenhulp voor de Belgische indexatie van onderhoudsgeld. Rekent live mee;
// bewaart (voorlopig) niets.
export function IndexatieCalculator() {
  const { t } = useT()
  const [basis, setBasis] = useState('')
  const [aanvang, setAanvang] = useState('')
  const [nieuw, setNieuw] = useState('')

  const bCenten = invoerNaarCenten(basis) // basisbedrag in centen
  const a = getal(aanvang)
  const n = getal(nieuw)
  const geldig = [bCenten, a, n].every(Number.isFinite) && bCenten > 0 && a > 0 && n > 0
  const resultaat = geldig ? indexeerBedrag(bCenten, a, n) : null

  return (
    <section>
      <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('Alimentatie-indexatie')}</h2>
      <p style={{ color: '#888', marginTop: 0 }}>
        {t('Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).')}
      </p>

      <div style={rij}>
        <label htmlFor="basisbedrag">{t('Basisbedrag (€)')}</label>
        <input id="basisbedrag" style={veld} inputMode="decimal" value={basis} onChange={(e) => setBasis(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="aanvangsindex">{t('Aanvangsindex')}</label>
        <input id="aanvangsindex" style={veld} inputMode="decimal" value={aanvang} onChange={(e) => setAanvang(e.target.value)} />
      </div>
      <div style={rij}>
        <label htmlFor="nieuweindex">{t('Nieuwe index')}</label>
        <input id="nieuweindex" style={veld} inputMode="decimal" value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
      </div>

      {resultaat !== null && (
        <p style={{ fontWeight: 'bold' }}>{t('Geïndexeerd bedrag: {bedrag}', { bedrag: formatEuro(resultaat) })}</p>
      )}
    </section>
  )
}
