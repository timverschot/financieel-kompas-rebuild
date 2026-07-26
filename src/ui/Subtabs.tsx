import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

// Eén rij subtabs met de inhoud van de gekozen tab eronder.
//
// Waarom een eigen bouwsteen en niet gewoon drie knoppen: een tabstrook heeft
// afspraken die je met losse knoppen stil overslaat. Hulpsoftware moet weten dat
// dit één groep is en welke tab gekozen is (`role="tablist"` + `aria-selected`),
// de pijltjestoetsen horen tussen de tabs te lopen in plaats van erdoorheen te
// tabben (rollende tabindex), en de inhoud eronder moet aan de gekozen tab hangen
// (`role="tabpanel"` + `aria-labelledby`). Door dat hier één keer goed te doen,
// krijgt elke volgende tabstrook in de app hetzelfde gedrag gratis.
//
// De strook BREEKT af op een smal scherm (zie `.subtabs` in index.css) — ze
// schuift nooit zijwaarts. Sinds ronde 28 schuift er in de hele app niets meer
// horizontaal weg, en een tabstrook waarvan de derde tab half buiten beeld hangt
// zou precies dat opnieuw introduceren.

export type Subtab<T extends string> = {
  /** Interne, taal-onafhankelijke sleutel. */
  id: T
  /** Emoji vóór het label. Puur decoratief, dus verborgen voor hulpsoftware. */
  teken?: string
  /** Het label, al vertaald door de oproeper. */
  label: string
  /** Optioneel aantal items in deze tab; verschijnt als klein cijfer achteraan. */
  telling?: number
}

export function Subtabs<T extends string>({
  naam,
  tabs,
  actief,
  onKies,
  label,
  children,
}: {
  /** Unieke naam van deze strook; wordt gebruikt om de id's te bouwen. */
  naam: string
  tabs: Subtab<T>[]
  actief: T
  onKies: (id: T) => void
  /** Wat deze groep tabs is, voor hulpsoftware. Al vertaald. */
  label: string
  /** De inhoud van de gekozen tab. */
  children: ReactNode
}) {
  const knoppen = useRef<Record<string, HTMLButtonElement | null>>({})

  // Valt de actieve tab buiten de lijst (kan bij een lege lijst), dan gedragen we
  // ons alsof de eerste gekozen is in plaats van te rekenen met -1.
  const gevonden = tabs.findIndex((tb) => tb.id === actief)
  const index = gevonden === -1 ? 0 : gevonden

  function opToets(e: KeyboardEvent<HTMLDivElement>) {
    if (tabs.length === 0) return
    const laatste = tabs.length - 1
    let doel: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') doel = index === laatste ? 0 : index + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') doel = index === 0 ? laatste : index - 1
    else if (e.key === 'Home') doel = 0
    else if (e.key === 'End') doel = laatste
    if (doel === null) return
    // Zonder dit scrollt de pagina mee bij een pijltje omhoog of omlaag.
    e.preventDefault()
    const id = tabs[doel].id
    onKies(id)
    knoppen.current[id]?.focus()
  }

  const gekozen = tabs[index]?.id ?? actief

  return (
    <>
      <div className="subtabs" role="tablist" aria-label={label} onKeyDown={opToets}>
        {tabs.map((tb) => {
          const aan = tb.id === gekozen
          return (
            <button
              key={tb.id}
              type="button"
              role="tab"
              id={`${naam}-tab-${tb.id}`}
              aria-selected={aan}
              aria-controls={`${naam}-paneel-${tb.id}`}
              // Rollende tabindex: één tab in de tabvolgorde, de rest bereik je
              // met de pijltjes. Zo hoef je niet door elke tab te tabben om bij de
              // inhoud te komen.
              tabIndex={aan ? 0 : -1}
              ref={(el) => {
                knoppen.current[tb.id] = el
              }}
              className={aan ? 'subtab subtab-actief' : 'subtab'}
              onClick={() => onKies(tb.id)}
            >
              {tb.teken && (
                <span className="subtab-teken" aria-hidden>
                  {tb.teken}
                </span>
              )}
              <span className="subtab-label">{tb.label}</span>
              {/* Het aantal staat er zodat je zonder klikken ziet waar iets zit.
                  Nul tonen we niet: een lege lade heeft geen cijfer nodig. */}
              {typeof tb.telling === 'number' && tb.telling > 0 && <span className="subtab-telling">{tb.telling}</span>}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`${naam}-paneel-${gekozen}`} aria-labelledby={`${naam}-tab-${gekozen}`}>
        {children}
      </div>
    </>
  )
}
