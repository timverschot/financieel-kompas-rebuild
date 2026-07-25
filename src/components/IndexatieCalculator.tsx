import { useState } from 'react'
import type { CSSProperties } from 'react'
import { indexeerBedrag } from '../utils/indexatie'
import { formatEuro, invoerNaarCenten } from '../utils/format'
import { Kaart } from '../ui/basis'
import { useT } from '../i18n'

// De uitkomst krijgt een zacht amberen vlak: het is het antwoord van de rekenhulp,
// niet zomaar een regel tekst.
const uitkomst: CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--accent-soft)',
  color: 'var(--accent-ink)',
  fontWeight: 600,
}

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
    <Kaart
      titel={t('Alimentatie-indexatie')}
      bijschrift={t('Geïndexeerd bedrag = basisbedrag × nieuwe index / aanvangsindex (Belgische formule).')}
    >
      <div className="veldrij">
        <div className="veldgroep">
          <label className="label-caps" htmlFor="basisbedrag">
            {t('Basisbedrag (€)')}
          </label>
          <input id="basisbedrag" inputMode="decimal" value={basis} onChange={(e) => setBasis(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="aanvangsindex">
            {t('Aanvangsindex')}
          </label>
          <input id="aanvangsindex" inputMode="decimal" value={aanvang} onChange={(e) => setAanvang(e.target.value)} />
        </div>
        <div className="veldgroep">
          <label className="label-caps" htmlFor="nieuweindex">
            {t('Nieuwe index')}
          </label>
          <input id="nieuweindex" inputMode="decimal" value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
        </div>
      </div>

      {resultaat !== null && (
        <p style={uitkomst}>{t('Geïndexeerd bedrag: {bedrag}', { bedrag: formatEuro(resultaat) })}</p>
      )}
    </Kaart>
  )
}
