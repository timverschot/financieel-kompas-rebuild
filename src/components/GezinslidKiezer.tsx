import { useId } from 'react'
import type { Gezinslid } from '../data/schema'
import { useT } from '../i18n'

// Twee kleine, herbruikbare keuzevelden om iets aan een gezinslid te koppelen.
// Ze werken overal hetzelfde, zodat "voor wie is dit?" in elk scherm hetzelfde
// aanvoelt:
//   - GezinslidKiezer  : één persoon (spaardoel, lening, garantie)
//   - GezinsledenKiezer: meerdere personen (een transactie)
//
// Gearchiveerde leden staan bewust NIET in de keuzelijst — je koppelt niets
// nieuws meer aan iemand die je hebt afgesloten. Een al gekoppelde (intussen
// gearchiveerde) persoon blijft wél zichtbaar, anders zou je hem stil verliezen
// door gewoon het formulier te openen en te bewaren.

// De leden die getoond worden: de actieve, plus de eventueel al gekozen persoon.
function kiesbareLeden(gezinsleden: Gezinslid[], gekozen: string[]): Gezinslid[] {
  return gezinsleden.filter((l) => !l.gearchiveerd || gekozen.includes(l.id))
}

export function GezinslidKiezer({
  label,
  waarde,
  onKies,
  gezinsleden,
  hint,
}: {
  /** Het zichtbare label, al vertaald door de aanroeper. */
  label: string
  /** Het gekozen gezinslid-id, of '' voor niemand. */
  waarde: string
  onKies: (persoonId: string) => void
  gezinsleden: Gezinslid[]
  /** Optionele uitleg onder het veld. */
  hint?: string
}) {
  const { t } = useT()
  const veldId = useId()
  const leden = kiesbareLeden(gezinsleden, waarde ? [waarde] : [])

  return (
    <div className="veldgroep">
      <label className="label-caps" htmlFor={veldId}>
        {label}
      </label>
      <select id={veldId} value={waarde} onChange={(e) => onKies(e.target.value)}>
        <option value="">{t('— niemand —')}</option>
        {leden.map((l) => (
          <option key={l.id} value={l.id}>
            {l.naam}
          </option>
        ))}
      </select>
      {hint && <span className="rij-meta">{hint}</span>}
    </div>
  )
}

export function GezinsledenKiezer({
  label,
  waarden,
  onWijzig,
  gezinsleden,
  hint,
}: {
  /** Het zichtbare label, al vertaald door de aanroeper. */
  label: string
  /** De gekozen gezinslid-id's. */
  waarden: string[]
  onWijzig: (persoonIds: string[]) => void
  gezinsleden: Gezinslid[]
  /** Optionele uitleg onder het veld. */
  hint?: string
}) {
  const labelId = useId()
  const leden = kiesbareLeden(gezinsleden, waarden)
  if (leden.length === 0) return null

  function schakel(id: string) {
    onWijzig(waarden.includes(id) ? waarden.filter((w) => w !== id) : [...waarden, id])
  }

  return (
    <div className="veldgroep" role="group" aria-labelledby={labelId}>
      <span className="label-caps" id={labelId}>
        {label}
      </span>
      <div className="knoprij" style={{ gap: 8 }}>
        {leden.map((l) => {
          const aan = waarden.includes(l.id)
          return (
            <button
              key={l.id}
              type="button"
              className={aan ? 'chip chip-actief' : 'chip'}
              aria-pressed={aan}
              onClick={() => schakel(l.id)}
            >
              {l.naam}
            </button>
          )
        })}
      </div>
      {hint && <span className="rij-meta">{hint}</span>}
    </div>
  )
}
