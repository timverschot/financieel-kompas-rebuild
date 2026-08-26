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

// De chip "Het gezin": aan zolang je niemand apart aanduidt, en aanklikken zet
// de keuze weer leeg. Zo is "voor ons allemaal" een echte, zichtbare keuze in
// plaats van iets wat je herkent aan een leeg veld.
function GezinChip({ aan, onKies, toevoegingId }: { aan: boolean; onKies: () => void; toevoegingId?: string }) {
  const { t } = useT()
  const eigenId = useId()
  return (
    <button
      type="button"
      id={eigenId}
      className={aan ? 'chip chip-actief' : 'chip'}
      aria-pressed={aan}
      aria-labelledby={toevoegingId ? `${eigenId} ${toevoegingId}` : undefined}
      onClick={onKies}
    >
      {t('Het gezin')}
    </button>
  )
}

/**
 * Eén chip per gezinslid. Een eigen component, want een chip heeft een eigen `useId`
 * nodig om naar zichzelf te kunnen wijzen — en haken mogen niet in een lus staan.
 */
function ChipVanLid({
  naam,
  aan,
  onKies,
  toevoegingId,
}: {
  naam: string
  aan: boolean
  onKies: () => void
  toevoegingId?: string
}) {
  const eigenId = useId()
  return (
    <button
      type="button"
      id={eigenId}
      className={aan ? 'chip chip-actief' : 'chip'}
      aria-pressed={aan}
      aria-labelledby={toevoegingId ? `${eigenId} ${toevoegingId}` : undefined}
      onClick={onKies}
    >
      {naam}
    </button>
  )
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
  metGezin = false,
  naamToevoeging,
}: {
  /** Het zichtbare label, al vertaald door de aanroeper. */
  label: string
  /** De gekozen gezinslid-id's. */
  waarden: string[]
  onWijzig: (persoonIds: string[]) => void
  gezinsleden: Gezinslid[]
  /** Optionele uitleg onder het veld. */
  hint?: string
  /**
   * Toont een extra chip "Het gezin" die aanstaat zolang er niemand apart
   * aangeduid is. Technisch verandert er niets — geen gezinslid gekozen bétekende
   * altijd al "voor iedereen samen" — maar dat stond nergens. In de analyse heette
   * die groep zelfs "Niet toegewezen", alsof je iets vergeten was.
   *
   * Enkel voor een gewone transactie. In een dossier of op een kindrekening is een
   * kost per definitie van iemand, dus daar zou "het gezin" een foute uitweg zijn.
   */
  metGezin?: boolean
  /**
   * Staat deze kiezer met een tweede op één scherm, dan zegt deze toevoeging bij welke
   * van de twee hij hoort — bijvoorbeeld `(gedeelde kost)` (ronde 95).
   *
   * ⚠ EEN GEWONE PROP EN GEEN `aria-labelledby` OP HET COMPONENT (ronde 92): TypeScript
   * controleert attributen met een streepje op een eigen component niet, dus zoiets
   * compileert zonder fout en doet vervolgens niets.
   *
   * ⚠ De chips WIJZEN NAAR ZICHZELF én naar de toevoeging. Zo blijft de zichtbare naam
   * van het gezinslid vooraan en aaneengesloten (WCAG 2.5.3) — wie "Ella" zegt, raakt nog
   * altijd die chip — en staat er alleen achteraan bij uit wélke kiezer hij komt.
   */
  naamToevoeging?: string
}) {
  const labelId = useId()
  const toevoegingId = useId()
  const leden = kiesbareLeden(gezinsleden, waarden)
  if (leden.length === 0) return null

  function schakel(id: string) {
    onWijzig(waarden.includes(id) ? waarden.filter((w) => w !== id) : [...waarden, id])
  }

  return (
    <div
      className="veldgroep"
      role="group"
      aria-labelledby={naamToevoeging ? `${labelId} ${toevoegingId}` : labelId}
    >
      <span className="label-caps" id={labelId}>
        {label}
      </span>
      {naamToevoeging && (
        <span id={toevoegingId} className="alleen-voorlezen">
          {naamToevoeging}
        </span>
      )}
      <div className="knoprij" style={{ gap: 8 }}>
        {metGezin && (
          <GezinChip
            aan={waarden.length === 0}
            onKies={() => onWijzig([])}
            toevoegingId={naamToevoeging ? toevoegingId : undefined}
          />
        )}
        {leden.map((l) => {
          const aan = waarden.includes(l.id)
          return (
            <ChipVanLid
              key={l.id}
              naam={l.naam}
              aan={aan}
              onKies={() => schakel(l.id)}
              toevoegingId={naamToevoeging ? toevoegingId : undefined}
            />
          )
        })}
      </div>
      {hint && <span className="rij-meta">{hint}</span>}
    </div>
  )
}
